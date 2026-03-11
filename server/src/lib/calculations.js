/**
 * Property Feasibility Study Calculation Engine
 * All monetary values in RM.
 */

/**
 * Calculate GDV for one unit type row.
 * @param {number} unitCount
 * @param {number} avgSizeSqft
 * @param {number} sellingPsf
 */
function calcUnitGDV(unitCount, avgSizeSqft, sellingPsf) {
  if (!unitCount || !avgSizeSqft || !sellingPsf) return 0
  return unitCount * avgSizeSqft * sellingPsf
}

/**
 * Sum GDV across all unit types.
 * @param {Array<{unit_count, avg_size_sqft, selling_psf, category}>} unitTypes
 */
function calcGDV(unitTypes) {
  return (unitTypes || []).reduce((sum, u) => sum + calcUnitGDV(u.unit_count, u.avg_size_sqft, u.selling_psf), 0)
}

/**
 * Gross Construction Cost for a phase.
 * @param {Array} unitTypes
 * @param {object} ca - cost assumptions row
 * @param {number} sharedPoolsTotal - earthworks + landscaping + clubhouse etc from cost pools
 */
function calcGCC(unitTypes, ca, sharedPoolsTotal = 0) {
  let buildingResidential = 0
  let buildingAffordable = 0
  let buildingCommercial = 0

  for (const u of (unitTypes || [])) {
    const area = (u.unit_count || 0) * (u.avg_size_sqft || 0)
    if (u.category === 'Residential') buildingResidential += area * (ca.building_psf_residential || 300)
    else if (u.category === 'Affordable') buildingAffordable += area * (ca.building_psf_affordable || 200)
    else if (u.category === 'Commercial') buildingCommercial += area * (ca.building_psf_commercial || 180)
  }

  const totalUnitCount = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0), 0)
  const buildingWork = buildingResidential + buildingAffordable + buildingCommercial
  const subtotal = buildingWork + sharedPoolsTotal

  const preliminary = subtotal * ((ca.preliminary_pct || 8) / 100)
  const contingency = (subtotal + preliminary) * ((ca.contingency_pct || 5) / 100)
  const commercialArea = (unitTypes || [])
    .filter(u => u.category === 'Commercial')
    .reduce((s, u) => s + (u.unit_count || 0) * (u.avg_size_sqft || 0), 0)
  const sst = commercialArea * (ca.building_psf_commercial || 180) * ((ca.sst_pct || 6) / 100)

  const gcc = buildingWork + sharedPoolsTotal + preliminary + contingency + sst

  return {
    buildingResidential,
    buildingAffordable,
    buildingCommercial,
    buildingWork,
    sharedPools: sharedPoolsTotal,
    preliminary,
    contingency,
    sst,
    gcc,
  }
}

/**
 * Land & other costs.
 */
function calcLandCosts(ca) {
  const landAreaSqft = (ca.land_area_acres || 0) * 43560
  const landCost = landAreaSqft * (ca.land_cost_psf || 0)
  const conversionPremium = landCost * ((ca.land_conversion_prem_pct || 0) / 100)
  const quitRent = (ca.quit_rent_pa || 0) * (ca.quit_rent_years || 0)
  const assessment = (ca.assessment_pa || 0) * (ca.assessment_years || 0)
  return { landCost, conversionPremium, quitRent, assessment, totalLand: landCost + conversionPremium + quitRent + assessment }
}

/**
 * Statutory fees.
 */
function calcStatutoryFees(unitTypes, ca) {
  const totalUnits = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0), 0)
  const strataTitle = totalUnits * (ca.strata_title_per_unit || 5000)
  const planningFees = totalUnits * (ca.planning_fees_per_unit || 1000)
  return { strataTitle, planningFees, total: strataTitle + planningFees }
}

/**
 * Authority contributions.
 */
function calcAuthorityContributions(unitTypes, ca, ndv) {
  const totalUnits = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0), 0)
  const devCharges = ndv * ((ca.dev_charges_pct || 1) / 100)
  const syabas = ndv * ((ca.syabas_pct || 0.25) / 100)
  const iwkJps = ndv * ((ca.iwk_jps_pct || 1) / 100)
  const tnb = totalUnits * (ca.tnb_per_unit || 1750)
  const tmFibre = totalUnits * (ca.tm_fibre_per_unit || 2000)
  const roadDrainage = (ca.land_area_acres || 0) * (ca.road_drainage_per_acre || 6000)
  const schoolContrib = ca.school_contrib_lump || 0
  const isf = ca.isf_lump || 0
  const total = devCharges + syabas + iwkJps + tnb + tmFibre + roadDrainage + schoolContrib + isf
  return { devCharges, syabas, iwkJps, tnb, tmFibre, roadDrainage, schoolContrib, isf, total }
}

/**
 * Professional / consultancy fees.
 */
function calcProfessionalFees(gcc, ca) {
  const consultancy = gcc * ((ca.professional_fees_pct || 6.5) / 100)
  const siteAdmin = gcc * ((ca.site_admin_pct || 2) / 100)
  return { consultancy, siteAdmin, total: consultancy + siteAdmin }
}

/**
 * Marketing expenses.
 */
function calcMarketing(ndv, ca) {
  const general = ndv * ((ca.marketing_pct || 1) / 100)
  return { general, total: general }
}

/**
 * Finance charges.
 */
function calcFinanceCharges(landCost, gcc, ca) {
  const landInterest = landCost * ((ca.land_loan_pct || 70) / 100) * ((ca.finance_rate_pct || 4.55) / 100) * (ca.land_loan_years || 4)
  const constructionInterest = gcc * ((ca.construction_loan_pct || 20) / 100) * ((ca.finance_rate_pct || 4.55) / 100) * (ca.construction_loan_years || 4)
  return { landInterest, constructionInterest, total: landInterest + constructionInterest }
}

/**
 * Overhead expenses.
 */
function calcOverheads(ndv, ca) {
  const projectDept = ndv * ((ca.overhead_project_dept_pct || 1.4) / 100)
  const hq = ndv * ((ca.overhead_hq_pct || 3) / 100)
  const marketingDept = ndv * ((ca.overhead_marketing_pct || 0.5) / 100)
  const corporate = ndv * ((ca.overhead_corporate_pct || 1) / 100)
  const total = projectDept + hq + marketingDept + corporate
  return { projectDept, hq, marketingDept, corporate, total }
}

/**
 * NDV from GDV.
 */
function calcNDV(gdv, ca) {
  const bumiDeduction = gdv * ((ca.bumi_quota_pct || 30) / 100) * ((ca.bumi_discount_pct || 7) / 100)
  const legalFees = gdv * ((ca.legal_fees_pct || 0.4) / 100)
  const earlyBird = gdv * ((ca.early_bird_pct || 9) / 100)
  const ndv = gdv - bumiDeduction - legalFees - earlyBird
  return { bumiDeduction, legalFees, earlyBird, ndv }
}

/**
 * Full phase calculation.
 * @param {Array} unitTypes
 * @param {object} ca - cost_assumptions row
 * @param {number} sharedPoolsTotal - shared cost pools allocated to this phase
 * @returns {object} full financial result
 */
function calcPhase(unitTypes, ca, sharedPoolsTotal = 0) {
  const gdv = calcGDV(unitTypes)
  const ndvResult = calcNDV(gdv, ca)
  const ndv = ndvResult.ndv

  const gccResult = calcGCC(unitTypes, ca, sharedPoolsTotal)
  const { gcc } = gccResult

  const landResult = calcLandCosts(ca)
  const statutory = calcStatutoryFees(unitTypes, ca)
  const authority = calcAuthorityContributions(unitTypes, ca, ndv)
  const professional = calcProfessionalFees(gcc, ca)

  const gdcBeforeMarketing = landResult.totalLand + gcc + statutory.total + authority.total + professional.total

  const marketing = calcMarketing(ndv, ca)
  const gdcAfterMarketing = gdcBeforeMarketing + marketing.total

  const finance = calcFinanceCharges(landResult.landCost, gcc, ca)
  const gdcAfterFinance = gdcAfterMarketing + finance.total

  const overheads = calcOverheads(ndv, ca)
  const totalGDC = gdcAfterFinance + overheads.total

  const ndp = ndv - totalGDC
  const profitMarginPct = ndv > 0 ? (ndp / ndv) * 100 : 0

  const totalUnits = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0), 0)
  const totalSaleableArea = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0) * (u.avg_size_sqft || 0), 0)
  const constPsf = totalSaleableArea > 0 ? gcc / totalSaleableArea : 0
  const netSellingPsf = totalSaleableArea > 0 ? ndv / totalSaleableArea : 0

  return {
    gdv,
    ndvResult,
    ndv,
    gccResult,
    gcc,
    landResult,
    statutory,
    authority,
    professional,
    gdcBeforeMarketing,
    marketing,
    gdcAfterMarketing,
    finance,
    gdcAfterFinance,
    overheads,
    totalGDC,
    ndp,
    profitMarginPct,
    totalUnits,
    totalSaleableArea,
    constPsf,
    netSellingPsf,
  }
}

/**
 * Portfolio summary across phases.
 * @param {Array<{results}>} phases - each with a pre-calculated results object
 */
function calcPortfolio(phases) {
  const totals = phases.reduce((acc, p) => {
    const r = p.results || {}
    acc.gdv += r.gdv || 0
    acc.ndv += r.ndv || 0
    acc.ndp += r.ndp || 0
    acc.gcc += r.gcc || 0
    acc.units += r.totalUnits || 0
    acc.area += r.totalSaleableArea || 0
    return acc
  }, { gdv: 0, ndv: 0, ndp: 0, gcc: 0, units: 0, area: 0 })

  const blendedMargin = totals.ndv > 0 ? (totals.ndp / totals.ndv) * 100 : 0
  const avgConstPsf = totals.area > 0 ? totals.gcc / totals.area : 0

  return { ...totals, blendedMargin, avgConstPsf }
}

module.exports = {
  calcUnitGDV,
  calcGDV,
  calcGCC,
  calcLandCosts,
  calcStatutoryFees,
  calcAuthorityContributions,
  calcProfessionalFees,
  calcMarketing,
  calcFinanceCharges,
  calcOverheads,
  calcNDV,
  calcPhase,
  calcPortfolio,
}

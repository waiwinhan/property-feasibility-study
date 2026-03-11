/**
 * Pure calculation engine — zero hardcoded constants, all inputs from DB
 * NDV-first model: GDV is back-calculated from NDV + deductions
 */

function calculatePhase(unitTypes = [], costAssumptions = {}, allocationAmounts = {}) {
  const ca = costAssumptions

  // ── Revenue ───────────────────────────────────────────────────────────────
  let totalNFA = 0
  let ndv = 0

  for (const ut of unitTypes) {
    const nfa = (ut.unit_count || 0) * (ut.avg_size_sqft || 0)
    const contribution = (ut.unit_count || 0) * (ut.avg_size_sqft || 0) * (ut.selling_psf || 0)
    totalNFA += nfa
    ndv += contribution
  }

  const netSellingPSF = totalNFA > 0 ? ndv / totalNFA : 0

  // ── GDV deductions ────────────────────────────────────────────────────────
  const bumiDiscount = (ca.bumi_discount_pct || 0) / 100 * (ca.bumi_quota_pct || 0) / 100 * ndv
  const legalFees = (ca.legal_fees_pct || 0) / 100 * ndv
  const earlyBird = (ca.early_bird_pct || 0) / 100 * ndv
  const totalDeductions = bumiDiscount + legalFees + earlyBird

  // GDV back-calculated: NDV is net after deductions, so GDV = NDV + deductions
  const gdv = ndv + totalDeductions

  // ── Building Work ─────────────────────────────────────────────────────────
  let residentialNFA = 0, affordableNFA = 0, commercialNFA = 0
  for (const ut of unitTypes) {
    const nfa = (ut.unit_count || 0) * (ut.avg_size_sqft || 0)
    if (ut.category === 'Residential') residentialNFA += nfa
    else if (ut.category === 'Affordable') affordableNFA += nfa
    else if (ut.category === 'Commercial') commercialNFA += nfa
  }

  const buildingWorkResidential = residentialNFA * (ca.building_psf_residential || 0)
  const buildingWorkAffordable  = affordableNFA  * (ca.building_psf_affordable  || 0)
  const buildingWorkCommercial  = commercialNFA  * (ca.building_psf_commercial  || 0)
  const buildingWork = buildingWorkResidential + buildingWorkAffordable + buildingWorkCommercial

  // ── Infrastructure (pool allocations passed in) ───────────────────────────
  const infrastructureTotal = Object.values(allocationAmounts).reduce((s, v) => s + (v || 0), 0)

  // ── CC ────────────────────────────────────────────────────────────────────
  const cc = buildingWork + infrastructureTotal

  // ── Add-ons ───────────────────────────────────────────────────────────────
  const preliminary  = (ca.preliminary_pct  || 0) / 100 * cc
  const contingency  = (ca.contingency_pct  || 0) / 100 * cc
  const sstBase      = buildingWorkCommercial + (allocationAmounts.__commercial_infra || 0)
  const sst          = (ca.sst_pct || 0) / 100 * sstBase

  // ── GCC ───────────────────────────────────────────────────────────────────
  const gcc = cc + preliminary + contingency + sst
  const totalGFA = totalNFA  // simplified: GFA ≈ NFA for now
  const constructionCostPSF = totalGFA > 0 ? gcc / totalGFA : 0

  // ── Land & Related ────────────────────────────────────────────────────────
  const landArea = ca.land_area_acres || 0
  const landCost = landArea * (ca.land_cost_psf || 0) * 43560
  const landConversionPremium = (ca.land_conversion_prem_pct || 0) / 100 * landCost
  const quitRent   = (ca.quit_rent_pa || 0) * (ca.quit_rent_years || 0)
  const assessment = (ca.assessment_pa || 0) * (ca.assessment_years || 0)
  const landRelated = landCost + landConversionPremium + quitRent + assessment

  // ── Statutory ─────────────────────────────────────────────────────────────
  const totalUnits = unitTypes.reduce((s, u) => s + (u.unit_count || 0), 0)
  const strataTitleFees = (ca.strata_title_per_unit || 0) * totalUnits
  const planningFees    = (ca.planning_fees_per_unit || 0) * totalUnits

  // ── Authority Contributions ───────────────────────────────────────────────
  const devCharges    = (ca.dev_charges_pct  || 0) / 100 * ndv
  const syabas        = (ca.syabas_pct       || 0) / 100 * ndv
  const iwkJps        = (ca.iwk_jps_pct      || 0) / 100 * ndv
  const tnb           = (ca.tnb_per_unit      || 0) * totalUnits
  const tmFibre       = (ca.tm_fibre_per_unit || 0) * totalUnits
  const roadDrainage  = (ca.road_drainage_per_acre || 0) * landArea
  const schoolContrib = ca.school_contrib_lump || 0
  const isf           = ca.isf_lump           || 0
  const authorityContribs = devCharges + syabas + iwkJps + tnb + tmFibre + roadDrainage + schoolContrib + isf

  // ── Professional & Site Admin ──────────────────────────────────────────────
  const professionalFees = (ca.professional_fees_pct || 0) / 100 * gcc
  const siteAdmin        = (ca.site_admin_pct        || 0) / 100 * gcc

  // ── Marketing ─────────────────────────────────────────────────────────────
  const marketing = (ca.marketing_pct || 0) / 100 * ndv

  // ── GDC (before marketing) ────────────────────────────────────────────────
  const gdcBeforeMarketing = landRelated + gcc + strataTitleFees + planningFees + authorityContribs + professionalFees + siteAdmin

  // ── GDC (after marketing) ─────────────────────────────────────────────────
  const gdcAfterMarketing = gdcBeforeMarketing + marketing

  // ── Financial Charges ─────────────────────────────────────────────────────
  const landInterest = landCost * (ca.land_loan_pct || 0) / 100 * (ca.finance_rate_pct || 0) / 100 * (ca.land_loan_years || 0)
  const constructionInterest = gcc * (ca.construction_loan_pct || 0) / 100 * (ca.finance_rate_pct || 0) / 100 * (ca.construction_loan_years || 0)
  const financialCharges = landInterest + constructionInterest

  // ── GDC (after finance) ───────────────────────────────────────────────────
  const gdcAfterFinance = gdcAfterMarketing + financialCharges

  // ── GDP (after finance) ───────────────────────────────────────────────────
  const gdpAfterFinance = ndv - gdcAfterFinance

  // ── Overheads ─────────────────────────────────────────────────────────────
  const overheadProjectDept = (ca.overhead_project_dept_pct || 0) / 100 * ndv
  const overheadHQ           = (ca.overhead_hq_pct           || 0) / 100 * ndv
  const overheadMarketingDept= (ca.overhead_marketing_pct    || 0) / 100 * ndv
  const overheadCorporate    = (ca.overhead_corporate_pct    || 0) / 100 * ndv
  const totalOverhead = overheadProjectDept + overheadHQ + overheadMarketingDept + overheadCorporate

  // ── NDP ───────────────────────────────────────────────────────────────────
  const ndp = gdpAfterFinance - totalOverhead
  const profitMarginPct = ndv > 0 ? (ndp / ndv) * 100 : 0

  return {
    // Revenue
    ndv, gdv, netSellingPSF, totalNFA, totalUnits,
    // Deductions
    bumiDiscount, legalFees, earlyBird, totalDeductions,
    // Construction
    buildingWorkResidential, buildingWorkAffordable, buildingWorkCommercial,
    buildingWork, infrastructureTotal, cc,
    preliminary, contingency, sst, gcc, constructionCostPSF,
    // Land
    landCost, landConversionPremium, quitRent, assessment, landRelated,
    // Statutory
    strataTitleFees, planningFees,
    // Authority
    devCharges, syabas, iwkJps, tnb, tmFibre, roadDrainage, schoolContrib, isf, authorityContribs,
    // Prof & Admin
    professionalFees, siteAdmin, marketing,
    // GDC
    gdcBeforeMarketing, gdcAfterMarketing,
    // Finance
    landInterest, constructionInterest, financialCharges,
    gdcAfterFinance, gdpAfterFinance,
    // Overheads
    overheadProjectDept, overheadHQ, overheadMarketingDept, overheadCorporate, totalOverhead,
    // Final
    ndp, profitMarginPct,
  }
}

function calculateProjectTotals(phaseResults = []) {
  const sum = (key) => phaseResults.reduce((s, r) => s + (r[key] || 0), 0)
  const totalNDV = sum('ndv')
  const totalNDP = sum('ndp')
  const totalGCC = sum('gcc')
  const totalNFA = sum('totalNFA')

  return {
    totalGDV: sum('gdv'),
    totalNDV,
    totalNDP,
    totalGCC,
    totalNFA,
    overallMarginPct: totalNDV > 0 ? (totalNDP / totalNDV) * 100 : 0,
    totalConstructionCostPSF: totalNFA > 0 ? totalGCC / totalNFA : 0,
  }
}

module.exports = { calculatePhase, calculateProjectTotals }

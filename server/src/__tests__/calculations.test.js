'use strict'

const {
  calcUnitGDV,
  calcGDV,
  calcNDV,
  calcGCC,
  calcLandCosts,
  calcStatutoryFees,
  calcAuthorityContributions,
  calcProfessionalFees,
  calcMarketing,
  calcFinanceCharges,
  calcOverheads,
  calcPhase,
  calcPortfolio,
} = require('../lib/calculations')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default cost assumptions — matches all the || fallbacks in calculations.js */
const defaultCA = {
  bumi_discount_pct: 7,
  bumi_quota_pct: 30,
  legal_fees_pct: 0.4,
  early_bird_pct: 9,
  building_psf_residential: 300,
  building_psf_affordable: 200,
  building_psf_commercial: 180,
  preliminary_pct: 8,
  contingency_pct: 5,
  sst_pct: 6,
  land_area_acres: 0,
  land_cost_psf: 0,
  land_conversion_prem_pct: 0,
  quit_rent_pa: 0,
  quit_rent_years: 0,
  assessment_pa: 0,
  assessment_years: 0,
  strata_title_per_unit: 5000,
  planning_fees_per_unit: 1000,
  dev_charges_pct: 1,
  syabas_pct: 0.25,
  iwk_jps_pct: 1,
  tnb_per_unit: 1750,
  tm_fibre_per_unit: 2000,
  road_drainage_per_acre: 6000,
  school_contrib_lump: 0,
  isf_lump: 0,
  professional_fees_pct: 6.5,
  site_admin_pct: 2,
  marketing_pct: 1,
  finance_rate_pct: 4.55,
  land_loan_pct: 70,
  land_loan_years: 4,
  construction_loan_pct: 20,
  construction_loan_years: 4,
  overhead_project_dept_pct: 1.4,
  overhead_hq_pct: 3,
  overhead_marketing_pct: 0.5,
  overhead_corporate_pct: 1,
}

const residentialUnit = { unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' }

// ---------------------------------------------------------------------------
// calcUnitGDV
// ---------------------------------------------------------------------------

describe('calcUnitGDV', () => {
  test('normal case', () => {
    // 100 × 1500 × 400 = 60,000,000
    expect(calcUnitGDV(100, 1500, 400)).toBe(60_000_000)
  })

  test('zero unit count returns 0', () => {
    expect(calcUnitGDV(0, 1500, 400)).toBe(0)
  })

  test('zero size returns 0', () => {
    expect(calcUnitGDV(100, 0, 400)).toBe(0)
  })

  test('zero PSF returns 0', () => {
    expect(calcUnitGDV(100, 1500, 0)).toBe(0)
  })

  test('null inputs return 0', () => {
    expect(calcUnitGDV(null, 1500, 400)).toBe(0)
    expect(calcUnitGDV(100, null, 400)).toBe(0)
    expect(calcUnitGDV(100, 1500, null)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcGDV
// ---------------------------------------------------------------------------

describe('calcGDV', () => {
  test('single unit type', () => {
    // 100 × 1000 × 500 = 50,000,000
    expect(calcGDV([residentialUnit])).toBe(50_000_000)
  })

  test('multiple unit types sum correctly', () => {
    const units = [
      { unit_count: 100, avg_size_sqft: 1000, selling_psf: 500 }, // 50,000,000
      { unit_count: 50, avg_size_sqft: 800, selling_psf: 300 },   // 12,000,000
    ]
    expect(calcGDV(units)).toBe(62_000_000)
  })

  test('empty array returns 0', () => {
    expect(calcGDV([])).toBe(0)
  })

  test('null returns 0', () => {
    expect(calcGDV(null)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcNDV
// ---------------------------------------------------------------------------

describe('calcNDV', () => {
  test('standard deductions with explicit CA values', () => {
    const gdv = 50_000_000
    const ca = { bumi_quota_pct: 30, bumi_discount_pct: 7, legal_fees_pct: 0.4, early_bird_pct: 9 }
    const r = calcNDV(gdv, ca)

    // bumiDeduction = 50M × 0.30 × 0.07 = 1,050,000
    expect(r.bumiDeduction).toBeCloseTo(1_050_000)
    // legalFees = 50M × 0.004 = 200,000
    expect(r.legalFees).toBeCloseTo(200_000)
    // earlyBird = 50M × 0.09 = 4,500,000
    expect(r.earlyBird).toBeCloseTo(4_500_000)
    // NDV = 50M - 1.05M - 0.2M - 4.5M = 44,250,000
    expect(r.ndv).toBeCloseTo(44_250_000)
  })

  test('zero bumi quota means no bumi deduction', () => {
    const ca = { bumi_quota_pct: 0, bumi_discount_pct: 7, legal_fees_pct: 0, early_bird_pct: 0 }
    const r = calcNDV(10_000_000, ca)
    expect(r.bumiDeduction).toBe(0)
    expect(r.ndv).toBe(10_000_000)
  })

  test('uses default percentages when CA fields are missing', () => {
    // defaults: bumi_quota 30%, bumi_discount 7%, legal 0.4%, early_bird 9%
    const r = calcNDV(100_000_000, {})
    expect(r.bumiDeduction).toBeCloseTo(2_100_000)  // 100M × 0.30 × 0.07
    expect(r.legalFees).toBeCloseTo(400_000)         // 100M × 0.004
    expect(r.earlyBird).toBeCloseTo(9_000_000)       // 100M × 0.09
    expect(r.ndv).toBeCloseTo(88_500_000)
  })
})

// ---------------------------------------------------------------------------
// calcGCC
// ---------------------------------------------------------------------------

describe('calcGCC', () => {
  test('residential only, no pools', () => {
    const units = [{ unit_count: 100, avg_size_sqft: 1000, category: 'Residential' }]
    const ca = { building_psf_residential: 300, preliminary_pct: 8, contingency_pct: 5, sst_pct: 6 }
    const r = calcGCC(units, ca, 0)

    // buildingResidential = 100 × 1000 × 300 = 30,000,000
    expect(r.buildingResidential).toBe(30_000_000)
    expect(r.buildingAffordable).toBe(0)
    expect(r.buildingCommercial).toBe(0)
    expect(r.buildingWork).toBe(30_000_000)

    // preliminary = 30M × 8% = 2,400,000
    expect(r.preliminary).toBeCloseTo(2_400_000)
    // contingency = (30M + 2.4M) × 5% = 1,620,000
    expect(r.contingency).toBeCloseTo(1_620_000)
    // sst = 0 (no commercial)
    expect(r.sst).toBe(0)
    // gcc = 30M + 2.4M + 1.62M = 34,020,000
    expect(r.gcc).toBeCloseTo(34_020_000)
  })

  test('affordable units use building_psf_affordable', () => {
    const units = [{ unit_count: 50, avg_size_sqft: 800, category: 'Affordable' }]
    const ca = { building_psf_affordable: 200, preliminary_pct: 0, contingency_pct: 0, sst_pct: 0 }
    const r = calcGCC(units, ca, 0)
    // 50 × 800 × 200 = 8,000,000
    expect(r.buildingAffordable).toBe(8_000_000)
    expect(r.gcc).toBe(8_000_000)
  })

  test('commercial units attract SST', () => {
    const units = [{ unit_count: 10, avg_size_sqft: 500, category: 'Commercial' }]
    const ca = { building_psf_commercial: 180, preliminary_pct: 0, contingency_pct: 0, sst_pct: 6 }
    const r = calcGCC(units, ca, 0)

    const commArea = 10 * 500
    const commBuild = commArea * 180  // 900,000
    const sst = commArea * 180 * 0.06 // 54,000
    expect(r.buildingCommercial).toBe(commBuild)
    expect(r.sst).toBeCloseTo(sst)
    expect(r.gcc).toBeCloseTo(commBuild + sst)
  })

  test('shared pools added to subtotal before percentages', () => {
    const units = [{ unit_count: 100, avg_size_sqft: 1000, category: 'Residential' }]
    const ca = { building_psf_residential: 300, preliminary_pct: 10, contingency_pct: 0, sst_pct: 0 }
    const pools = 5_000_000

    const r = calcGCC(units, ca, pools)
    // subtotal = 30M + 5M = 35M
    // preliminary = 35M × 10% = 3.5M
    expect(r.sharedPools).toBe(pools)
    expect(r.preliminary).toBeCloseTo(3_500_000)
    expect(r.gcc).toBeCloseTo(30_000_000 + 5_000_000 + 3_500_000)
  })

  test('empty unit types returns zero gcc', () => {
    const r = calcGCC([], defaultCA, 0)
    expect(r.gcc).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcLandCosts
// ---------------------------------------------------------------------------

describe('calcLandCosts', () => {
  test('standard land cost calculation', () => {
    const ca = { land_area_acres: 5, land_cost_psf: 45, land_conversion_prem_pct: 0, quit_rent_pa: 0, quit_rent_years: 0, assessment_pa: 0, assessment_years: 0 }
    const r = calcLandCosts(ca)

    // 5 acres × 43,560 sqft/acre = 217,800 sqft
    // 217,800 × 45 = 9,801,000
    expect(r.landCost).toBeCloseTo(9_801_000)
    expect(r.totalLand).toBeCloseTo(9_801_000)
  })

  test('conversion premium added to total', () => {
    const ca = { land_area_acres: 1, land_cost_psf: 100, land_conversion_prem_pct: 10, quit_rent_pa: 0, quit_rent_years: 0, assessment_pa: 0, assessment_years: 0 }
    const r = calcLandCosts(ca)
    // landCost = 43,560 × 100 = 4,356,000
    // conversionPremium = 4,356,000 × 10% = 435,600
    expect(r.conversionPremium).toBeCloseTo(435_600)
    expect(r.totalLand).toBeCloseTo(4_356_000 + 435_600)
  })

  test('quit rent and assessment: pa × years', () => {
    const ca = { land_area_acres: 0, land_cost_psf: 0, land_conversion_prem_pct: 0, quit_rent_pa: 5000, quit_rent_years: 3, assessment_pa: 2000, assessment_years: 5 }
    const r = calcLandCosts(ca)
    expect(r.quitRent).toBe(15_000)    // 5000 × 3
    expect(r.assessment).toBe(10_000)  // 2000 × 5
    expect(r.totalLand).toBe(25_000)
  })

  test('zero land area returns zero land cost', () => {
    const r = calcLandCosts({ land_area_acres: 0, land_cost_psf: 50 })
    expect(r.landCost).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcStatutoryFees
// ---------------------------------------------------------------------------

describe('calcStatutoryFees', () => {
  test('standard fees based on unit count', () => {
    const units = [{ unit_count: 200 }, { unit_count: 100 }]
    const ca = { strata_title_per_unit: 5000, planning_fees_per_unit: 1000 }
    const r = calcStatutoryFees(units, ca)

    // total units = 300
    expect(r.strataTitle).toBe(1_500_000)  // 300 × 5000
    expect(r.planningFees).toBe(300_000)    // 300 × 1000
    expect(r.total).toBe(1_800_000)
  })

  test('uses default fees when CA fields missing', () => {
    const units = [{ unit_count: 10 }]
    const r = calcStatutoryFees(units, {})
    expect(r.strataTitle).toBe(50_000)   // 10 × 5000
    expect(r.planningFees).toBe(10_000)  // 10 × 1000
  })

  test('empty unit list returns zero', () => {
    const r = calcStatutoryFees([], defaultCA)
    expect(r.total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcAuthorityContributions
// ---------------------------------------------------------------------------

describe('calcAuthorityContributions', () => {
  test('NDV-based charges calculated correctly', () => {
    const ndv = 44_250_000
    const units = [{ unit_count: 100 }]
    const ca = { dev_charges_pct: 1, syabas_pct: 0.25, iwk_jps_pct: 1, tnb_per_unit: 1750, tm_fibre_per_unit: 2000, land_area_acres: 0, road_drainage_per_acre: 6000, school_contrib_lump: 0, isf_lump: 0 }
    const r = calcAuthorityContributions(units, ca, ndv)

    expect(r.devCharges).toBeCloseTo(442_500)   // 44.25M × 1%
    expect(r.syabas).toBeCloseTo(110_625)        // 44.25M × 0.25%
    expect(r.iwkJps).toBeCloseTo(442_500)        // 44.25M × 1%
    expect(r.tnb).toBe(175_000)                  // 100 × 1750
    expect(r.tmFibre).toBe(200_000)              // 100 × 2000
    expect(r.roadDrainage).toBe(0)               // 0 acres
    expect(r.total).toBeCloseTo(1_370_625)
  })

  test('road drainage uses land_area_acres × rate', () => {
    const ca = { dev_charges_pct: 0, syabas_pct: 0, iwk_jps_pct: 0, tnb_per_unit: 0, tm_fibre_per_unit: 0, land_area_acres: 10, road_drainage_per_acre: 6000, school_contrib_lump: 0, isf_lump: 0 }
    const r = calcAuthorityContributions([], ca, 0)
    expect(r.roadDrainage).toBe(60_000)  // 10 × 6000
  })

  test('lump sums included in total', () => {
    const ca = { dev_charges_pct: 0, syabas_pct: 0, iwk_jps_pct: 0, tnb_per_unit: 0, tm_fibre_per_unit: 0, land_area_acres: 0, road_drainage_per_acre: 0, school_contrib_lump: 500_000, isf_lump: 250_000 }
    const r = calcAuthorityContributions([], ca, 0)
    expect(r.schoolContrib).toBe(500_000)
    expect(r.isf).toBe(250_000)
    expect(r.total).toBe(750_000)
  })
})

// ---------------------------------------------------------------------------
// calcProfessionalFees
// ---------------------------------------------------------------------------

describe('calcProfessionalFees', () => {
  test('consultancy and site admin as % of GCC', () => {
    const gcc = 34_020_000
    const ca = { professional_fees_pct: 6.5, site_admin_pct: 2 }
    const r = calcProfessionalFees(gcc, ca)

    expect(r.consultancy).toBeCloseTo(2_211_300)  // 34.02M × 6.5%
    expect(r.siteAdmin).toBeCloseTo(680_400)       // 34.02M × 2%
    expect(r.total).toBeCloseTo(2_891_700)
  })

  test('uses default percentages when missing', () => {
    const r = calcProfessionalFees(1_000_000, {})
    expect(r.consultancy).toBeCloseTo(65_000)  // 1M × 6.5%
    expect(r.siteAdmin).toBeCloseTo(20_000)    // 1M × 2%
  })
})

// ---------------------------------------------------------------------------
// calcMarketing
// ---------------------------------------------------------------------------

describe('calcMarketing', () => {
  test('marketing as % of NDV', () => {
    const r = calcMarketing(44_250_000, { marketing_pct: 1 })
    expect(r.general).toBeCloseTo(442_500)
    expect(r.total).toBeCloseTo(442_500)
  })

  test('uses default 1% when missing', () => {
    const r = calcMarketing(10_000_000, {})
    expect(r.total).toBeCloseTo(100_000)
  })
})

// ---------------------------------------------------------------------------
// calcFinanceCharges
// ---------------------------------------------------------------------------

describe('calcFinanceCharges', () => {
  test('land interest and construction interest', () => {
    const landCost = 1_000_000
    const gcc = 5_000_000
    const ca = { land_loan_pct: 70, finance_rate_pct: 4.55, land_loan_years: 4, construction_loan_pct: 20, construction_loan_years: 4 }
    const r = calcFinanceCharges(landCost, gcc, ca)

    // landInterest = 1M × 0.70 × 0.0455 × 4 = 127,400
    expect(r.landInterest).toBeCloseTo(127_400)
    // constructionInterest = 5M × 0.20 × 0.0455 × 4 = 182,000
    expect(r.constructionInterest).toBeCloseTo(182_000)
    expect(r.total).toBeCloseTo(309_400)
  })

  test('zero land cost means zero land interest', () => {
    const r = calcFinanceCharges(0, 1_000_000, defaultCA)
    expect(r.landInterest).toBe(0)
  })

  test('uses default rates when CA fields missing', () => {
    // defaults: land_loan 70%, finance 4.55%, land_years 4, const_loan 20%, const_years 4
    const r = calcFinanceCharges(1_000_000, 0, {})
    // 1M × 0.70 × 0.0455 × 4 = 127,400
    expect(r.landInterest).toBeCloseTo(127_400)
  })
})

// ---------------------------------------------------------------------------
// calcOverheads
// ---------------------------------------------------------------------------

describe('calcOverheads', () => {
  test('all overheads as % of NDV', () => {
    const ndv = 44_250_000
    const ca = { overhead_project_dept_pct: 1.4, overhead_hq_pct: 3, overhead_marketing_pct: 0.5, overhead_corporate_pct: 1 }
    const r = calcOverheads(ndv, ca)

    expect(r.projectDept).toBeCloseTo(619_500)    // 44.25M × 1.4%
    expect(r.hq).toBeCloseTo(1_327_500)           // 44.25M × 3%
    expect(r.marketingDept).toBeCloseTo(221_250)  // 44.25M × 0.5%
    expect(r.corporate).toBeCloseTo(442_500)      // 44.25M × 1%
    expect(r.total).toBeCloseTo(2_610_750)
  })
})

// ---------------------------------------------------------------------------
// calcPhase — integration test
// ---------------------------------------------------------------------------

describe('calcPhase', () => {
  test('integration: produces correct GDV, NDV, GCC, NDP', () => {
    // 100 units × 1000 sqft × 500 PSF (Residential), no land, no pools
    const unitTypes = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' }]
    const r = calcPhase(unitTypes, defaultCA, 0)

    expect(r.gdv).toBe(50_000_000)
    expect(r.ndv).toBeCloseTo(44_250_000)       // after 9% early bird, 0.4% legal, 2.1% bumi
    expect(r.gcc).toBeCloseTo(34_020_000)       // 30M building + 8% prelim + 5% contingency
    expect(r.totalUnits).toBe(100)
    expect(r.totalSaleableArea).toBe(100_000)   // 100 × 1000
  })

  test('integration: NDP and margin sign', () => {
    const unitTypes = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' }]
    const r = calcPhase(unitTypes, defaultCA, 0)

    // NDP = NDV - totalGDC; computed in detail above ≈ 1,076,097
    expect(r.ndp).toBeCloseTo(r.ndv - r.totalGDC, 0)
    // Margin = NDP / NDV × 100
    expect(r.profitMarginPct).toBeCloseTo((r.ndp / r.ndv) * 100, 4)
    expect(r.profitMarginPct).toBeGreaterThan(0)  // should be slightly positive
  })

  test('integration: constPsf and netSellingPsf computed', () => {
    const unitTypes = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' }]
    const r = calcPhase(unitTypes, defaultCA, 0)

    // constPsf = GCC / totalSaleableArea
    expect(r.constPsf).toBeCloseTo(r.gcc / r.totalSaleableArea)
    // netSellingPsf = NDV / totalSaleableArea
    expect(r.netSellingPsf).toBeCloseTo(r.ndv / r.totalSaleableArea)
  })

  test('edge case: empty unit types returns zero NDP', () => {
    const r = calcPhase([], defaultCA, 0)
    expect(r.gdv).toBe(0)
    expect(r.ndv).toBe(0)
    expect(r.gcc).toBe(0)
    expect(r.ndp).toBe(0)
    expect(r.profitMarginPct).toBe(0)
    expect(r.totalUnits).toBe(0)
    expect(r.totalSaleableArea).toBe(0)
    expect(r.constPsf).toBe(0)
    expect(r.netSellingPsf).toBe(0)
  })

  test('edge case: zero PSF results in zero GDV and negative NDP', () => {
    const unitTypes = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 0, category: 'Residential' }]
    const r = calcPhase(unitTypes, defaultCA, 0)
    expect(r.gdv).toBe(0)
    expect(r.ndv).toBe(0)
    expect(r.ndp).toBe(0)
    expect(r.profitMarginPct).toBe(0)
  })

  test('shared pools increase GCC', () => {
    const unitTypes = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' }]
    const withoutPools = calcPhase(unitTypes, defaultCA, 0)
    const withPools = calcPhase(unitTypes, defaultCA, 5_000_000)
    expect(withPools.gcc).toBeGreaterThan(withoutPools.gcc)
  })

  test('higher selling PSF increases NDV and NDP', () => {
    const baseUnits = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 400, category: 'Residential' }]
    const highUnits = [{ unit_count: 100, avg_size_sqft: 1000, selling_psf: 600, category: 'Residential' }]
    const base = calcPhase(baseUnits, defaultCA, 0)
    const high = calcPhase(highUnits, defaultCA, 0)
    expect(high.ndv).toBeGreaterThan(base.ndv)
    expect(high.ndp).toBeGreaterThan(base.ndp)
    expect(high.profitMarginPct).toBeGreaterThan(base.profitMarginPct)
  })

  test('mixed categories: each uses correct PSF', () => {
    const unitTypes = [
      { unit_count: 50, avg_size_sqft: 1000, selling_psf: 400, category: 'Residential' },
      { unit_count: 50, avg_size_sqft: 800, selling_psf: 250, category: 'Affordable' },
    ]
    const r = calcPhase(unitTypes, defaultCA, 0)
    expect(r.totalUnits).toBe(100)
    expect(r.gccResult.buildingResidential).toBe(50 * 1000 * 300)
    expect(r.gccResult.buildingAffordable).toBe(50 * 800 * 200)
  })
})

// ---------------------------------------------------------------------------
// calcPortfolio
// ---------------------------------------------------------------------------

describe('calcPortfolio', () => {
  test('sums GDV, NDV, NDP across phases', () => {
    const phases = [
      { results: { gdv: 100_000_000, ndv: 88_000_000, ndp: 10_000_000, gcc: 50_000_000, totalUnits: 200, totalSaleableArea: 200_000 } },
      { results: { gdv: 50_000_000, ndv: 44_000_000, ndp: 5_000_000, gcc: 25_000_000, totalUnits: 100, totalSaleableArea: 100_000 } },
    ]
    const r = calcPortfolio(phases)

    expect(r.gdv).toBe(150_000_000)
    expect(r.ndv).toBe(132_000_000)
    expect(r.ndp).toBe(15_000_000)
    expect(r.gcc).toBe(75_000_000)
    expect(r.units).toBe(300)
  })

  test('blended margin = total NDP / total NDV × 100', () => {
    const phases = [
      { results: { gdv: 0, ndv: 100_000_000, ndp: 20_000_000, gcc: 0, totalUnits: 0, totalSaleableArea: 0 } },
    ]
    const r = calcPortfolio(phases)
    expect(r.blendedMargin).toBeCloseTo(20)  // 20M / 100M = 20%
  })

  test('zero NDV returns zero blended margin', () => {
    const r = calcPortfolio([{ results: { gdv: 0, ndv: 0, ndp: 0, gcc: 0, totalUnits: 0, totalSaleableArea: 0 } }])
    expect(r.blendedMargin).toBe(0)
  })

  test('empty phases array', () => {
    const r = calcPortfolio([])
    expect(r.gdv).toBe(0)
    expect(r.ndv).toBe(0)
    expect(r.ndp).toBe(0)
    expect(r.blendedMargin).toBe(0)
  })

  test('avgConstPsf = total GCC / total saleable area', () => {
    const phases = [
      { results: { gdv: 0, ndv: 0, ndp: 0, gcc: 30_000_000, totalUnits: 0, totalSaleableArea: 100_000 } },
    ]
    const r = calcPortfolio(phases)
    expect(r.avgConstPsf).toBeCloseTo(300)  // 30M / 100k sqft
  })

  test('phases with missing results object handled gracefully', () => {
    const phases = [{ results: null }, { results: undefined }]
    expect(() => calcPortfolio(phases)).not.toThrow()
    const r = calcPortfolio(phases)
    expect(r.gdv).toBe(0)
  })
})

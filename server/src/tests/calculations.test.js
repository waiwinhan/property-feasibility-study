const {
  calcUnitGDV, calcGDV, calcGCC, calcLandCosts, calcStatutoryFees,
  calcAuthorityContributions, calcProfessionalFees, calcMarketing,
  calcFinanceCharges, calcOverheads, calcNDV, calcPhase, calcPortfolio,
} = require('../lib/calculations')

// Reference unit types
const unitTypes = [
  { name: 'Type A', category: 'Residential', unit_count: 80, avg_size_sqft: 2200, selling_psf: 350 },
  { name: 'Type B', category: 'Residential', unit_count: 40, avg_size_sqft: 2500, selling_psf: 380 },
  { name: 'Shop', category: 'Commercial', unit_count: 10, avg_size_sqft: 1500, selling_psf: 500 },
]

// Reference cost assumptions (Excel defaults)
const ca = {
  building_psf_residential: 300, building_psf_affordable: 200, building_psf_commercial: 180,
  preliminary_pct: 8, contingency_pct: 5, sst_pct: 6,
  land_area_acres: 5, land_cost_psf: 50,
  land_conversion_prem_pct: 0, quit_rent_pa: 0, quit_rent_years: 0, assessment_pa: 0, assessment_years: 0,
  strata_title_per_unit: 5000, planning_fees_per_unit: 1000,
  dev_charges_pct: 1, syabas_pct: 0.25, iwk_jps_pct: 1,
  tnb_per_unit: 1750, tm_fibre_per_unit: 2000, road_drainage_per_acre: 6000,
  school_contrib_lump: 0, isf_lump: 0,
  professional_fees_pct: 6.5, site_admin_pct: 2, marketing_pct: 1,
  finance_rate_pct: 4.55, land_loan_pct: 70, land_loan_years: 4,
  construction_loan_pct: 20, construction_loan_years: 4,
  bumi_discount_pct: 7, bumi_quota_pct: 30, legal_fees_pct: 0.4, early_bird_pct: 9,
  overhead_project_dept_pct: 1.4, overhead_hq_pct: 3, overhead_marketing_pct: 0.5, overhead_corporate_pct: 1,
}

describe('calcUnitGDV', () => {
  test('basic multiplication', () => {
    expect(calcUnitGDV(80, 2200, 350)).toBe(80 * 2200 * 350)
  })
  test('returns 0 for null inputs', () => {
    expect(calcUnitGDV(0, 2200, 350)).toBe(0)
    expect(calcUnitGDV(80, 0, 350)).toBe(0)
    expect(calcUnitGDV(80, 2200, 0)).toBe(0)
  })
})

describe('calcGDV', () => {
  test('sums all unit types correctly', () => {
    const expected = 80*2200*350 + 40*2500*380 + 10*1500*500
    expect(calcGDV(unitTypes)).toBe(expected)
  })
  test('returns 0 for empty array', () => {
    expect(calcGDV([])).toBe(0)
  })
})

describe('calcNDV', () => {
  test('NDV < GDV due to deductions', () => {
    const gdv = calcGDV(unitTypes)
    const { ndv } = calcNDV(gdv, ca)
    expect(ndv).toBeLessThan(gdv)
  })
  test('bumi deduction is bumi_quota × bumi_discount × GDV', () => {
    const gdv = 10_000_000
    const { bumiDeduction } = calcNDV(gdv, ca)
    expect(bumiDeduction).toBeCloseTo(gdv * 0.30 * 0.07, 0)
  })
  test('NDV is positive for realistic inputs', () => {
    const gdv = calcGDV(unitTypes)
    const { ndv } = calcNDV(gdv, ca)
    expect(ndv).toBeGreaterThan(0)
  })
})

describe('calcGCC', () => {
  test('GCC > building work alone (adds prelim/contingency)', () => {
    const res = calcGCC(unitTypes, ca, 0)
    expect(res.gcc).toBeGreaterThan(res.buildingWork)
  })
  test('residential building cost = units × sqft × psf', () => {
    const res = calcGCC(unitTypes, ca, 0)
    const expected = (80*2200 + 40*2500) * 300
    expect(res.buildingResidential).toBeCloseTo(expected, 0)
  })
  test('commercial SST applied', () => {
    const res = calcGCC(unitTypes, ca, 0)
    expect(res.sst).toBeGreaterThan(0)
  })
  test('shared pools added to subtotal', () => {
    const r0 = calcGCC(unitTypes, ca, 0)
    const r1 = calcGCC(unitTypes, ca, 500000)
    expect(r1.gcc).toBeGreaterThan(r0.gcc)
  })
})

describe('calcLandCosts', () => {
  test('land cost = acres × 43560 × psf', () => {
    const res = calcLandCosts(ca)
    expect(res.landCost).toBeCloseTo(5 * 43560 * 50, 0)
  })
  test('zero land returns zero', () => {
    const res = calcLandCosts({ ...ca, land_cost_psf: 0 })
    expect(res.landCost).toBe(0)
  })
})

describe('calcStatutoryFees', () => {
  test('strata title × total units', () => {
    const res = calcStatutoryFees(unitTypes, ca)
    const totalUnits = 80 + 40 + 10
    expect(res.strataTitle).toBeCloseTo(totalUnits * 5000, 0)
  })
})

describe('calcAuthority', () => {
  test('dev charges = ndv × pct', () => {
    const ndv = 50_000_000
    const res = calcAuthorityContributions(unitTypes, ca, ndv)
    expect(res.devCharges).toBeCloseTo(ndv * 0.01, 0)
  })
})

describe('calcPhase - integration', () => {
  const result = calcPhase(unitTypes, ca, 700000)

  test('NDP is computed', () => {
    expect(typeof result.ndp).toBe('number')
  })
  test('Margin % = NDP / NDV × 100', () => {
    expect(result.profitMarginPct).toBeCloseTo(result.ndp / result.ndv * 100, 4)
  })
  test('GDV > NDV', () => {
    expect(result.gdv).toBeGreaterThan(result.ndv)
  })
  test('Total units count', () => {
    expect(result.totalUnits).toBe(130)
  })
  test('Construction PSF = GCC / total area', () => {
    const totalArea = 80*2200 + 40*2500 + 10*1500
    expect(result.constPsf).toBeCloseTo(result.gcc / totalArea, 2)
  })
  test('Edge: zero unit count returns 0 GDV', () => {
    const emptyResult = calcPhase([], ca, 0)
    expect(emptyResult.gdv).toBe(0)
    expect(emptyResult.ndv).toBe(0)
  })
})

describe('calcPortfolio', () => {
  test('aggregates phase totals', () => {
    const phases = [
      { results: { gdv: 10_000_000, ndv: 8_000_000, ndp: 1_000_000, gcc: 5_000_000, totalUnits: 50, totalSaleableArea: 100000 } },
      { results: { gdv: 20_000_000, ndv: 16_000_000, ndp: 2_000_000, gcc: 10_000_000, totalUnits: 100, totalSaleableArea: 200000 } },
    ]
    const result = calcPortfolio(phases)
    expect(result.gdv).toBe(30_000_000)
    expect(result.ndv).toBe(24_000_000)
    expect(result.ndp).toBe(3_000_000)
    expect(result.units).toBe(150)
  })
  test('blended margin = total NDP / total NDV', () => {
    const phases = [
      { results: { gdv: 0, ndv: 10_000_000, ndp: 2_000_000, gcc: 0, totalUnits: 0, totalSaleableArea: 0 } },
    ]
    const result = calcPortfolio(phases)
    expect(result.blendedMargin).toBeCloseTo(20, 4)
  })
})

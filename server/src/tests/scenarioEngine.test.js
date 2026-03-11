'use strict'

/**
 * Unit tests for scenario engine pure logic and sensitivity analysis.
 *
 * These tests exercise:
 *  1. applyVariableOverride — verifies scenario isolation (pure function, inlined here)
 *  2. Sensitivity range generation — verifies iteration logic
 *  3. Allocation validation — verifies the pool % check
 *
 * No Supabase / Express required — all logic is pure JS.
 */

const { calcPhase } = require('../lib/calculations')

// ---------------------------------------------------------------------------
// applyVariableOverride (inlined from server/src/routes/scenarios.js)
// The function is pure — only depends on its arguments.
// ---------------------------------------------------------------------------

function applyVariableOverride(scenario, variable, val) {
  if (variable === 'selling_psf') {
    return {
      unitTypes: scenario.unitTypes.map(u => ({ ...u, selling_psf: val })),
      ca: { ...scenario.baseCa, ...scenario.overrides },
    }
  }
  return {
    unitTypes: scenario.unitTypes,
    ca: { ...scenario.baseCa, ...scenario.overrides, [variable]: val },
  }
}

// ---------------------------------------------------------------------------
// Allocation validation (inlined from server/src/routes/projects.js)
// ---------------------------------------------------------------------------

function validateAllocations(pools) {
  const TOLERANCE = 0.1
  return (pools || []).filter(pool => {
    if (!pool.allocations || pool.allocations.length === 0) return false
    const sum = pool.allocations.reduce((s, a) => s + (Number(a.allocation_pct) || 0), 0)
    return Math.abs(sum - 100) > TOLERANCE
  })
}

// ---------------------------------------------------------------------------
// Sensitivity range generator (inlined from server/src/routes/scenarios.js)
// ---------------------------------------------------------------------------

function buildRange(min, max, step) {
  const rows = []
  for (let val = +min; val <= +max + 1e-9; val = Math.round((val + +step) * 1e6) / 1e6) {
    rows.push(val)
    if (rows.length > 500) break
  }
  return rows
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseUnitTypes = [
  { unit_count: 100, avg_size_sqft: 1000, selling_psf: 500, category: 'Residential' },
]

const baseCa = {
  bumi_discount_pct: 7, bumi_quota_pct: 30, legal_fees_pct: 0.4, early_bird_pct: 9,
  building_psf_residential: 300, building_psf_affordable: 200, building_psf_commercial: 180,
  preliminary_pct: 8, contingency_pct: 5, sst_pct: 6,
  land_area_acres: 0, land_cost_psf: 0, land_conversion_prem_pct: 0,
  quit_rent_pa: 0, quit_rent_years: 0, assessment_pa: 0, assessment_years: 0,
  strata_title_per_unit: 5000, planning_fees_per_unit: 1000,
  dev_charges_pct: 1, syabas_pct: 0.25, iwk_jps_pct: 1,
  tnb_per_unit: 1750, tm_fibre_per_unit: 2000,
  road_drainage_per_acre: 6000, school_contrib_lump: 0, isf_lump: 0,
  professional_fees_pct: 6.5, site_admin_pct: 2, marketing_pct: 1,
  finance_rate_pct: 4.55, land_loan_pct: 70, land_loan_years: 4,
  construction_loan_pct: 20, construction_loan_years: 4,
  overhead_project_dept_pct: 1.4, overhead_hq_pct: 3,
  overhead_marketing_pct: 0.5, overhead_corporate_pct: 1,
}

const baseScenario = { unitTypes: baseUnitTypes, baseCa, overrides: {}, poolsTotal: 0 }

// ===========================================================================
// applyVariableOverride — scenario isolation
// ===========================================================================

describe('applyVariableOverride — scenario isolation', () => {
  test('overriding selling_psf mutates unitTypes, not baseCa', () => {
    const { unitTypes, ca } = applyVariableOverride(baseScenario, 'selling_psf', 600)

    // Unit types must have the new PSF
    expect(unitTypes[0].selling_psf).toBe(600)
    // The base scenario unit types must be UNCHANGED (immutability)
    expect(baseScenario.unitTypes[0].selling_psf).toBe(500)
    // CA must be unchanged
    expect(ca.bumi_quota_pct).toBe(baseCa.bumi_quota_pct)
    expect(ca).not.toHaveProperty('selling_psf')
  })

  test('overriding a CA field mutates CA, not unitTypes', () => {
    const { unitTypes, ca } = applyVariableOverride(baseScenario, 'preliminary_pct', 12)

    // CA receives the override
    expect(ca.preliminary_pct).toBe(12)
    // baseScenario.baseCa is NOT mutated
    expect(baseScenario.baseCa.preliminary_pct).toBe(8)
    // UnitTypes are unchanged
    expect(unitTypes[0].selling_psf).toBe(500)
  })

  test('overrides layer on top of baseCa without mutating it', () => {
    const scenarioWithOverrides = {
      ...baseScenario,
      overrides: { marketing_pct: 5 },
    }
    const { ca } = applyVariableOverride(scenarioWithOverrides, 'preliminary_pct', 10)

    // Override from scenario (marketing_pct = 5) is included
    expect(ca.marketing_pct).toBe(5)
    // New variable override (preliminary_pct = 10) is included
    expect(ca.preliminary_pct).toBe(10)
    // Base remains untouched
    expect(baseScenario.baseCa.marketing_pct).toBe(1)
    expect(baseScenario.baseCa.preliminary_pct).toBe(8)
  })

  test('two sequential overrides do not bleed into each other', () => {
    const first = applyVariableOverride(baseScenario, 'preliminary_pct', 10)
    const second = applyVariableOverride(baseScenario, 'contingency_pct', 8)

    // First should not have contingency_pct override
    expect(first.ca.preliminary_pct).toBe(10)
    expect(first.ca.contingency_pct).toBe(baseCa.contingency_pct) // original 5

    // Second should not have preliminary_pct override
    expect(second.ca.contingency_pct).toBe(8)
    expect(second.ca.preliminary_pct).toBe(baseCa.preliminary_pct) // original 8
  })

  test('selling_psf override applies to all unit types in multi-type phase', () => {
    const multiType = {
      unitTypes: [
        { unit_count: 50, avg_size_sqft: 1000, selling_psf: 400, category: 'Residential' },
        { unit_count: 30, avg_size_sqft: 800, selling_psf: 250, category: 'Affordable' },
      ],
      baseCa,
      overrides: {},
    }
    const { unitTypes } = applyVariableOverride(multiType, 'selling_psf', 500)
    expect(unitTypes[0].selling_psf).toBe(500)
    expect(unitTypes[1].selling_psf).toBe(500)
    // Original untouched
    expect(multiType.unitTypes[0].selling_psf).toBe(400)
    expect(multiType.unitTypes[1].selling_psf).toBe(250)
  })
})

// ===========================================================================
// Sensitivity engine — range generation
// ===========================================================================

describe('Sensitivity range generation', () => {
  test('generates correct values from min to max with step', () => {
    const range = buildRange(400, 600, 100)
    expect(range).toEqual([400, 500, 600])
  })

  test('floating-point steps work correctly (e.g. 0.5 increments)', () => {
    const range = buildRange(1, 2, 0.5)
    expect(range).toHaveLength(3)
    expect(range[0]).toBeCloseTo(1)
    expect(range[1]).toBeCloseTo(1.5)
    expect(range[2]).toBeCloseTo(2)
  })

  test('single value when min === max', () => {
    const range = buildRange(500, 500, 50)
    expect(range).toEqual([500])
  })

  test('caps at ~500 entries to prevent runaway loops', () => {
    // Guard is `if (rows.length > 500) break` so max length is 501
    const range = buildRange(0, 10000, 1)
    expect(range.length).toBeLessThanOrEqual(501)
    expect(range.length).toBeLessThan(10001)
  })
})

// ===========================================================================
// Sensitivity engine — calcPhase impact
// ===========================================================================

describe('Sensitivity engine — calcPhase responds correctly to overrides', () => {
  const poolsTotal = 0

  test('varying selling_psf linearly increases NDV', () => {
    const results = [400, 500, 600].map(psf => {
      const { unitTypes, ca } = applyVariableOverride(baseScenario, 'selling_psf', psf)
      return calcPhase(unitTypes, ca, poolsTotal)
    })

    expect(results[0].ndv).toBeLessThan(results[1].ndv)
    expect(results[1].ndv).toBeLessThan(results[2].ndv)
    expect(results[0].ndp).toBeLessThan(results[1].ndp)
    expect(results[1].ndp).toBeLessThan(results[2].ndp)
  })

  test('varying preliminary_pct increases GCC and reduces NDP', () => {
    const low = applyVariableOverride(baseScenario, 'preliminary_pct', 5)
    const high = applyVariableOverride(baseScenario, 'preliminary_pct', 15)

    const rLow = calcPhase(low.unitTypes, low.ca, poolsTotal)
    const rHigh = calcPhase(high.unitTypes, high.ca, poolsTotal)

    expect(rHigh.gcc).toBeGreaterThan(rLow.gcc)
    expect(rHigh.ndp).toBeLessThan(rLow.ndp)
    expect(rHigh.profitMarginPct).toBeLessThan(rLow.profitMarginPct)
  })

  test('selling_psf override does not affect GCC (cost-side unchanged)', () => {
    const low = applyVariableOverride(baseScenario, 'selling_psf', 300)
    const high = applyVariableOverride(baseScenario, 'selling_psf', 800)

    const rLow = calcPhase(low.unitTypes, low.ca, poolsTotal)
    const rHigh = calcPhase(high.unitTypes, high.ca, poolsTotal)

    // GCC driven by building PSF, not selling PSF
    expect(rLow.gcc).toBeCloseTo(rHigh.gcc)
  })

  test('two-variable: combinations produce a matrix of distinct margins', () => {
    const psfValues = [400, 500, 600]
    const contingencyValues = [0, 5, 10]

    const matrix = psfValues.map(psf => {
      return contingencyValues.map(cont => {
        const step1 = applyVariableOverride(baseScenario, 'selling_psf', psf)
        const step2 = applyVariableOverride(
          { ...baseScenario, unitTypes: step1.unitTypes },
          'contingency_pct',
          cont,
        )
        const r = calcPhase(step2.unitTypes, { ...step1.ca, ...step2.ca }, poolsTotal)
        return r.profitMarginPct
      })
    })

    // Higher selling PSF → higher margin along each row
    for (let col = 0; col < 3; col++) {
      expect(matrix[1][col]).toBeGreaterThan(matrix[0][col])
      expect(matrix[2][col]).toBeGreaterThan(matrix[1][col])
    }
    // Higher contingency → lower margin along each column
    for (let row = 0; row < 3; row++) {
      expect(matrix[row][0]).toBeGreaterThanOrEqual(matrix[row][1])
      expect(matrix[row][1]).toBeGreaterThanOrEqual(matrix[row][2])
    }
  })
})

// ===========================================================================
// Allocation validation
// ===========================================================================

describe('Allocation validation — Σ ≠ 100% correctly blocked', () => {
  test('valid allocation (sums to exactly 100) passes', () => {
    const pools = [
      { name: 'Road Works', allocations: [{ phase_id: 1, allocation_pct: 60 }, { phase_id: 2, allocation_pct: 40 }] },
    ]
    expect(validateAllocations(pools)).toHaveLength(0)
  })

  test('allocation summing to 99 is rejected', () => {
    const pools = [
      { name: 'Road Works', allocations: [{ phase_id: 1, allocation_pct: 60 }, { phase_id: 2, allocation_pct: 39 }] },
    ]
    const invalid = validateAllocations(pools)
    expect(invalid).toHaveLength(1)
    expect(invalid[0].name).toBe('Road Works')
  })

  test('allocation summing to 101 is rejected', () => {
    const pools = [
      { name: 'Utilities', allocations: [{ phase_id: 1, allocation_pct: 60 }, { phase_id: 2, allocation_pct: 41 }] },
    ]
    expect(validateAllocations(pools)).toHaveLength(1)
  })

  test('within ±0.1 tolerance is accepted', () => {
    const pools = [
      { name: 'Misc', allocations: [{ phase_id: 1, allocation_pct: 99.95 }, { phase_id: 2, allocation_pct: 0.05 }] },
    ]
    expect(validateAllocations(pools)).toHaveLength(0)
  })

  test('pool with no allocations is skipped (not validated)', () => {
    const pools = [{ name: 'Empty Pool', allocations: [] }]
    expect(validateAllocations(pools)).toHaveLength(0)
  })

  test('multiple pools: only invalid pools are returned', () => {
    const pools = [
      { name: 'Good Pool', allocations: [{ phase_id: 1, allocation_pct: 100 }] },
      { name: 'Bad Pool',  allocations: [{ phase_id: 1, allocation_pct: 50 }] },
    ]
    const invalid = validateAllocations(pools)
    expect(invalid).toHaveLength(1)
    expect(invalid[0].name).toBe('Bad Pool')
  })

  test('null allocations array is treated same as empty', () => {
    const pools = [{ name: 'Null Pool', allocations: null }]
    expect(validateAllocations(pools)).toHaveLength(0)
  })

  test('non-numeric allocation values are treated as 0', () => {
    const pools = [
      { name: 'Bad Data', allocations: [{ phase_id: 1, allocation_pct: 'abc' }, { phase_id: 2, allocation_pct: 50 }] },
    ]
    // 0 + 50 = 50 ≠ 100 → invalid
    expect(validateAllocations(pools)).toHaveLength(1)
  })
})

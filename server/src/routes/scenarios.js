const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { calcPhase } = require('../lib/calculations')
const asyncHandler = require('../lib/asyncHandler')

// GET /api/scenarios/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*, scenario_results(*), scenario_cost_assumptions(*)')
    .eq('id', req.params.id)
    .single()
  if (error) throw error
  res.json(data)
}))

// PUT /api/scenarios/:id  (update + recalculate)
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, colour_tag, notes, is_base, overrides } = req.body

  const updates = {}
  if (name !== undefined) updates.name = name
  if (colour_tag !== undefined) updates.colour_tag = colour_tag
  if (notes !== undefined) updates.notes = notes

  if (Object.keys(updates).length > 0) {
    await supabase.from('scenarios').update(updates).eq('id', req.params.id)
  }

  // Update cost assumption overrides
  if (overrides) {
    const { data: existing } = await supabase.from('scenario_cost_assumptions').select('id').eq('scenario_id', req.params.id).single()
    if (existing) {
      await supabase.from('scenario_cost_assumptions').update(overrides).eq('scenario_id', req.params.id)
    } else {
      await supabase.from('scenario_cost_assumptions').insert({ ...overrides, scenario_id: req.params.id })
    }
  }

  // Recalculate
  const results = await recalcScenario(req.params.id)
  res.json({ ok: true, results })
}))

// DELETE /api/scenarios/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { data } = await supabase.from('scenarios').select('is_base').eq('id', req.params.id).single()
  if (data?.is_base) return res.status(400).json({ error: 'Cannot delete the base case scenario' })
  await supabase.from('scenarios').delete().eq('id', req.params.id)
  res.status(204).end()
}))

// POST /api/scenarios/:id/clone
router.post('/:id/clone', asyncHandler(async (req, res) => {
  const { data: src } = await supabase.from('scenarios').select('*').eq('id', req.params.id).single()
  if (!src) return res.status(404).json({ error: 'Not found' })

  const { id: oldId, created_at, updated_at, is_base, ...srcData } = src
  const { data: newScenario } = await supabase.from('scenarios')
    .insert({ ...srcData, name: `${src.name} (Copy)`, is_base: false })
    .select().single()

  const { data: ca } = await supabase.from('scenario_cost_assumptions').select('*').eq('scenario_id', oldId).single()
  if (ca) {
    const { id, scenario_id, ...caData } = ca
    await supabase.from('scenario_cost_assumptions').insert({ ...caData, scenario_id: newScenario.id })
  }

  res.status(201).json(newScenario)
}))

// POST /api/scenarios/:id/set-base
router.post('/:id/set-base', asyncHandler(async (req, res) => {
  const { data: scenario } = await supabase.from('scenarios').select('phase_id').eq('id', req.params.id).single()
  if (!scenario) return res.status(404).json({ error: 'Not found' })

  // Demote current base
  await supabase.from('scenarios').update({ is_base: false }).eq('phase_id', scenario.phase_id).eq('is_base', true)
  // Promote new base
  await supabase.from('scenarios').update({ is_base: true }).eq('id', req.params.id)

  res.json({ ok: true })
}))

// POST /api/scenarios/:id/sensitivity  (single-variable)
router.post('/:id/sensitivity', asyncHandler(async (req, res) => {
  const { variable, min, max, step } = req.body
  if (!variable || min == null || max == null || step == null) {
    return res.status(400).json({ error: 'variable, min, max, step required' })
  }

  const scenario = await getScenarioData(req.params.id)
  const rows = []
  for (let val = +min; val <= +max + 1e-9; val = Math.round((val + +step) * 1e6) / 1e6) {
    const { unitTypes, ca } = applyVariableOverride(scenario, variable, val)
    const result = calcPhase(unitTypes, ca, scenario.poolsTotal)
    rows.push({ value: val, ndp: result.ndp, margin: result.profitMarginPct, ndv: result.ndv })
    if (rows.length > 500) break
  }

  res.json({ variable, rows })
}))

// POST /api/scenarios/:id/sensitivity/two-variable  (heat map)
router.post('/:id/sensitivity/two-variable', asyncHandler(async (req, res) => {
  const { rowVar, rowMin, rowMax, rowStep, colVar, colMin, colMax, colStep } = req.body

  const scenario = await getScenarioData(req.params.id)
  const rowVals = [], colVals = []
  for (let v = +rowMin; v <= +rowMax + 1e-9; v = Math.round((v + +rowStep) * 1e6) / 1e6) { rowVals.push(v); if (rowVals.length > 50) break }
  for (let v = +colMin; v <= +colMax + 1e-9; v = Math.round((v + +colStep) * 1e6) / 1e6) { colVals.push(v); if (colVals.length > 50) break }

  const matrix = rowVals.map(rv => ({
    rowValue: rv,
    cols: colVals.map(cv => {
      const step1 = applyVariableOverride(scenario, rowVar, rv)
      const step2 = applyVariableOverride({ ...scenario, unitTypes: step1.unitTypes }, colVar, cv)
      const r = calcPhase(step2.unitTypes, { ...step1.ca, ...step2.ca }, scenario.poolsTotal)
      return { colValue: cv, margin: r.profitMarginPct, ndp: r.ndp }
    })
  }))

  res.json({ rowVar, colVar, rowVals, colVals, matrix })
}))

/** Apply a variable override, handling selling_psf as a unit-type field override. */
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

async function getScenarioData(scenarioId) {
  const { data: scenario } = await supabase.from('scenarios').select('*, scenario_cost_assumptions(*)').eq('id', scenarioId).single()
  const { data: phase } = await supabase.from('phases').select('project_id').eq('id', scenario.phase_id).single()
  const [{ data: unitTypes }, { data: baseCa }] = await Promise.all([
    supabase.from('unit_types').select('*').eq('phase_id', scenario.phase_id),
    supabase.from('cost_assumptions').select('*').eq('phase_id', scenario.phase_id).single(),
  ])
  const overrides = scenario.scenario_cost_assumptions?.[0] || {}
  let poolsTotal = 0
  if (phase?.project_id) {
    const { data: allocs } = await supabase.from('construction_cost_allocations')
      .select('allocation_pct, construction_cost_pools(pool_total)')
      .eq('phase_id', scenario.phase_id)
    for (const a of (allocs || [])) poolsTotal += (a.construction_cost_pools?.pool_total || 0) * (a.allocation_pct || 0) / 100
  }
  return { scenario, unitTypes: unitTypes || [], baseCa: baseCa || {}, overrides, poolsTotal }
}

async function recalcScenario(scenarioId) {
  const scenario = await getScenarioData(scenarioId)
  const ca = { ...scenario.baseCa, ...scenario.overrides }
  const results = calcPhase(scenario.unitTypes, ca, scenario.poolsTotal)

  const { data: existing } = await supabase.from('scenario_results').select('id').eq('scenario_id', scenarioId).single()
  if (existing) {
    await supabase.from('scenario_results').update({ results, updated_at: new Date().toISOString() }).eq('scenario_id', scenarioId)
  } else {
    await supabase.from('scenario_results').insert({ scenario_id: scenarioId, results })
  }
  return results
}

module.exports = router

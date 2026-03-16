const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { calcPhase } = require('../lib/calculations')
const asyncHandler = require('../lib/asyncHandler')
const clonePhaseChildren = require('../lib/clonePhaseChildren')

// GET /api/phases/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('phases').select('*').eq('id', req.params.id).single()
  if (error) throw error
  res.json(data)
}))

// PATCH /api/phases/:id
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name', 'dev_type', 'launch_date', 'vp_date', 'land_area_acres', 'sort_order', 'is_active', 'construction_start_date', 'construction_end_date']
  const updates = {}
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k]

  const { data, error } = await supabase.from('phases').update(updates).eq('id', req.params.id).select().single()
  if (error) throw error
  res.json(data)
}))

// DELETE /api/phases/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('phases').delete().eq('id', req.params.id)
  if (error) throw error
  res.status(204).end()
}))

// POST /api/phases/:id/duplicate
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const { data: src, error: e1 } = await supabase.from('phases').select('*').eq('id', req.params.id).single()
  if (e1) throw e1

  const { id: oldId, created_at, updated_at, ...phaseData } = src
  const { data: newPhase, error: e2 } = await supabase.from('phases').insert({
    ...phaseData,
    name: `${src.name} (Copy)`,
    sort_order: (src.sort_order || 0) + 0.5,
  }).select().single()
  if (e2) throw e2

  await clonePhaseChildren(oldId, newPhase.id)
  res.status(201).json(newPhase)
}))

// GET /api/phases/:id/unit-types
router.get('/:id/unit-types', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('unit_types').select('*').eq('phase_id', req.params.id).order('sort_order')
  if (error) throw error
  res.json(data || [])
}))

// PUT /api/phases/:id/unit-types  (upsert all rows for phase)
router.put('/:id/unit-types', asyncHandler(async (req, res) => {
  const { rows } = req.body
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be array' })

  // Delete old rows
  await supabase.from('unit_types').delete().eq('phase_id', req.params.id)

  // Insert new rows
  if (rows.length > 0) {
    const toInsert = rows.map((r, idx) => ({
      phase_id: req.params.id,
      name: r.name || `Unit Type ${idx + 1}`,
      category: r.category || 'Residential',
      avg_size_sqft: r.avg_size_sqft || 0,
      unit_count: r.unit_count || 0,
      selling_psf: r.selling_psf || 0,
      sort_order: idx,
    }))
    await supabase.from('unit_types').insert(toInsert)
  }

  // Recalculate phase
  await recalcPhase(req.params.id)

  const { data } = await supabase.from('unit_types').select('*').eq('phase_id', req.params.id).order('sort_order')
  res.json(data || [])
}))

// GET /api/phases/:id/cost-assumptions
router.get('/:id/cost-assumptions', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('cost_assumptions').select('*').eq('phase_id', req.params.id).single()
  if (error && error.code !== 'PGRST116') throw error
  res.json(data || {})
}))

// PATCH /api/phases/:id/cost-assumptions
router.patch('/:id/cost-assumptions', asyncHandler(async (req, res) => {
  const { data: result, error } = await supabase
    .from('cost_assumptions')
    .upsert({ ...req.body, phase_id: req.params.id }, { onConflict: 'phase_id' })
    .select().single()
  if (error) throw error

  await recalcPhase(req.params.id)
  res.json(result)
}))

// POST /api/phases/:id/calculate
router.post('/:id/calculate', asyncHandler(async (req, res) => {
  const result = await recalcPhase(req.params.id)
  res.json(result)
}))

// GET /api/phases/:id/scenarios
router.get('/:id/scenarios', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*, scenario_results(*), scenario_cost_assumptions(*)')
    .eq('phase_id', req.params.id)
    .order('created_at')
  if (error) throw error
  res.json(data || [])
}))

// POST /api/phases/:id/scenarios
router.post('/:id/scenarios', asyncHandler(async (req, res) => {
  const { name, colour_tag, notes, is_base } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

  const { data, error } = await supabase
    .from('scenarios')
    .insert({ phase_id: req.params.id, name: name.trim(), colour_tag, notes, is_base: is_base || false })
    .select().single()
  if (error) throw error
  res.status(201).json(data)
}))

async function recalcPhase(phaseId) {
  const [{ data: unitTypes }, { data: ca }, { data: phase }] = await Promise.all([
    supabase.from('unit_types').select('*').eq('phase_id', phaseId).order('sort_order'),
    supabase.from('cost_assumptions').select('*').eq('phase_id', phaseId).single(),
    supabase.from('phases').select('project_id').eq('id', phaseId).single(),
  ])

  // Get shared pool total allocated to this phase
  let sharedPoolsTotal = 0
  if (phase?.project_id) {
    const { data: allocs } = await supabase
      .from('construction_cost_allocations')
      .select('allocation_pct, construction_cost_pools(pool_total)')
      .eq('phase_id', phaseId)
    for (const alloc of (allocs || [])) {
      const poolTotal = alloc.construction_cost_pools?.pool_total || 0
      sharedPoolsTotal += poolTotal * ((alloc.allocation_pct || 0) / 100)
    }
  }

  const results = calcPhase(unitTypes || [], ca || {}, sharedPoolsTotal)

  const totalUnits = (unitTypes || []).reduce((s, u) => s + (u.unit_count || 0), 0)
  await supabase.from('phases').update({
    unit_count: totalUnits,
    total_gdv: results.gdv,
    total_ndv: results.ndv,
    total_gcc: results.gcc,
    total_ndp: results.ndp,
    profit_margin_pct: results.profitMarginPct,
    financial_results: results,
  }).eq('id', phaseId)

  return results
}

module.exports = router

const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { calcPhase, calcPortfolio } = require('../lib/calculations')
const asyncHandler = require('../lib/asyncHandler')

// GET /api/projects
router.get('/', asyncHandler(async (req, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*, phases(id, name, total_ndv, total_gdv, total_ndp, profit_margin_pct, unit_count)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  const enriched = projects.map(p => {
    const phases = p.phases || []
    const portfolio = calcPortfolio(phases.map(ph => ({
      results: { gdv: ph.total_gdv || 0, ndv: ph.total_ndv || 0, ndp: ph.total_ndp || 0, gcc: 0, totalUnits: ph.unit_count || 0, totalSaleableArea: 0 }
    })))
    return {
      ...p,
      total_gdv: portfolio.gdv,
      total_ndv: portfolio.ndv,
      total_ndp: portfolio.ndp,
      profit_margin_pct: portfolio.blendedMargin,
      phase_count: phases.length,
      phases: undefined,
    }
  })

  res.json(enriched)
}))

// GET /api/projects/deleted  — must be before /:id
router.get('/deleted', asyncHandler(async (req, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, status, deleted_at, created_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  res.json(projects || [])
}))

// GET /api/projects/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'Project not found' })
  res.json(data)
}))

// POST /api/projects
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, status = 'Active' } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

  const { data, error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), description, status })
    .select()
    .single()
  if (error) throw error
  res.status(201).json(data)
}))

// PATCH /api/projects/:id
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'status', 'land_area_acres', 'launch_date', 'completed_date']
  const updates = {}
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k]

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) throw error
  res.json(data)
}))

// DELETE /api/projects/:id  — soft delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', req.params.id)
  if (error) throw error
  res.status(204).end()
}))

// POST /api/projects/:id/restore
router.post('/:id/restore', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .update({ deleted_at: null })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) throw error
  res.json(data)
}))

// DELETE /api/projects/:id/permanent  — hard delete
router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id)
  if (error) throw error
  res.status(204).end()
}))

// POST /api/projects/:id/clone
router.post('/:id/clone', asyncHandler(async (req, res) => {
  const { data: src, error: e1 } = await supabase.from('projects').select('*').eq('id', req.params.id).single()
  if (e1) throw e1

  const { data: newProject, error: e2 } = await supabase
    .from('projects')
    .insert({ name: `${src.name} (Copy)`, description: src.description, status: 'Active' })
    .select().single()
  if (e2) throw e2

  const { data: phases } = await supabase.from('phases').select('*').eq('project_id', req.params.id).order('sort_order')
  for (const phase of (phases || [])) {
    const { id: oldPhaseId, project_id, created_at, updated_at, ...phaseData } = phase
    const { data: newPhase } = await supabase.from('phases').insert({ ...phaseData, project_id: newProject.id }).select().single()
    if (newPhase) {
      const { data: unitTypes } = await supabase.from('unit_types').select('*').eq('phase_id', oldPhaseId)
      for (const ut of (unitTypes || [])) {
        const { id, phase_id, ...utData } = ut
        await supabase.from('unit_types').insert({ ...utData, phase_id: newPhase.id })
      }
      const { data: ca } = await supabase.from('cost_assumptions').select('*').eq('phase_id', oldPhaseId).single()
      if (ca) {
        const { id, phase_id, ...caData } = ca
        await supabase.from('cost_assumptions').insert({ ...caData, phase_id: newPhase.id })
      }
    }
  }

  res.status(201).json(newProject)
}))

// GET /api/projects/:id/phases
router.get('/:id/phases', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', req.params.id)
    .order('sort_order')
  if (error) throw error
  res.json(data || [])
}))

// POST /api/projects/:id/phases
router.post('/:id/phases', asyncHandler(async (req, res) => {
  const { name, dev_type, launch_date, vp_date, construction_start_date, construction_end_date } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

  const { count } = await supabase.from('phases').select('*', { count: 'exact', head: true }).eq('project_id', req.params.id)

  const { data: phase, error } = await supabase
    .from('phases')
    .insert({ 
      project_id: req.params.id, 
      name: name.trim(), 
      dev_type, 
      launch_date, 
      vp_date,
      construction_start_date,
      construction_end_date,
      sort_order: count || 0 
    })
    .select().single()
  if (error) throw error

  // Create default cost assumptions
  await supabase.from('cost_assumptions').insert({ phase_id: phase.id })

  res.status(201).json(phase)
}))

// PATCH /api/projects/:id/phases/reorder
router.patch('/:id/phases/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body // array of phase IDs in new order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' })

  await Promise.all(order.map((phaseId, idx) =>
    supabase.from('phases').update({ sort_order: idx }).eq('id', phaseId).eq('project_id', req.params.id)
  ))

  res.json({ ok: true })
}))

// GET /api/projects/:id/cost-allocation
router.get('/:id/cost-allocation', asyncHandler(async (req, res) => {
  const { data: pools, error } = await supabase
    .from('construction_cost_pools')
    .select('*, construction_cost_allocations(*)')
    .eq('project_id', req.params.id)
  if (error) throw error
  res.json(pools || [])
}))

// PUT /api/projects/:id/cost-allocation
router.put('/:id/cost-allocation', asyncHandler(async (req, res) => {
  const { pools } = req.body
  // pools = [{ id?, name, pool_total, allocations: [{ phase_id, allocation_pct }] }]

  // Validate: each pool's allocations must sum to 100 (±0.1 tolerance)
  const invalid = (pools || []).filter(pool => {
    if (!pool.allocations || pool.allocations.length === 0) return false
    const sum = pool.allocations.reduce((s, a) => s + (Number(a.allocation_pct) || 0), 0)
    return Math.abs(sum - 100) > 0.1
  })
  if (invalid.length > 0) {
    return res.status(400).json({
      error: 'Allocation percentages must sum to 100% for each pool.',
      pools: invalid.map(p => ({ name: p.name, sum: p.allocations.reduce((s, a) => s + (Number(a.allocation_pct) || 0), 0) })),
    })
  }

  const result = []
  for (const pool of (pools || [])) {
    let poolId = pool.id
    if (poolId) {
      const { data } = await supabase.from('construction_cost_pools').update({ name: pool.name, pool_total: pool.pool_total }).eq('id', poolId).select().single()
      result.push(data)
    } else {
      const { data } = await supabase.from('construction_cost_pools').insert({ project_id: req.params.id, name: pool.name, pool_total: pool.pool_total }).select().single()
      poolId = data.id
      result.push(data)
    }
    if (poolId && pool.allocations) {
      for (const alloc of pool.allocations) {
        await supabase.from('construction_cost_allocations').upsert({ pool_id: poolId, phase_id: alloc.phase_id, allocation_pct: alloc.allocation_pct }, { onConflict: 'pool_id,phase_id' })
      }
    }
  }
  res.json(result)
}))

const { generateExcel } = require('../services/excelExport')
const { generateCSV } = require('../services/csvExport')
const { generateTemplate, parseImport } = require('../services/excelImport')
const { generateDashboardPdf, generateFeasibilityPdf, PdfUnavailableError } = require('../services/pdfExport')

// GET /api/projects/import/template
router.get('/import/template', asyncHandler(async (req, res) => {
  const buffer = await generateTemplate()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="feasibility_import_template.xlsx"')
  res.send(buffer)
}))

// POST /api/projects/import/preview  { fileBase64: "..." }
router.post('/import/preview', asyncHandler(async (req, res) => {
  const { fileBase64 } = req.body
  if (!fileBase64) return res.status(400).json({ error: 'fileBase64 is required' })

  const buffer = Buffer.from(fileBase64, 'base64')
  const parsed = await parseImport(buffer)

  const totalUnits = parsed.phases.reduce((s, ph) => s + ph.unitTypes.reduce((ss, ut) => ss + (ut.unit_count || 0), 0), 0)
  const totalUnitTypes = parsed.phases.reduce((s, ph) => s + ph.unitTypes.length, 0)

  res.json({
    phases: parsed.phases,
    summary: {
      phaseCount: parsed.phases.length,
      unitTypeCount: totalUnitTypes,
      totalUnits,
    },
  })
}))

// POST /api/projects/import  { projectName, status, phases: [...] }
router.post('/import', asyncHandler(async (req, res) => {
  const { projectName, status = 'Active', phases = [] } = req.body
  if (!projectName?.trim()) return res.status(400).json({ error: 'projectName is required' })
  if (!phases.length) return res.status(400).json({ error: 'At least one phase is required' })

  // Create project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({ name: projectName.trim(), status })
    .select().single()
  if (projErr) throw projErr

  // Create phases + unit types
  for (let i = 0; i < phases.length; i++) {
    const ph = phases[i]
    const { data: phase, error: phErr } = await supabase
      .from('phases')
      .insert({
        project_id: project.id,
        name: ph.name,
        dev_type: ph.dev_type || 'Residential',
        launch_date: ph.launch_date || null,
        land_area_acres: ph.land_area_acres || null,
        sort_order: i,
      })
      .select().single()
    if (phErr) throw phErr

    // Default cost assumptions
    const caInsert = { phase_id: phase.id }
    if (ph.land_cost_psf) caInsert.land_cost_psf = ph.land_cost_psf
    await supabase.from('cost_assumptions').insert(caInsert)

    // Unit types
    if (ph.unitTypes?.length) {
      const rows = ph.unitTypes.map(ut => ({
        phase_id: phase.id,
        name: ut.name,
        category: ut.category || 'Residential',
        unit_count: ut.unit_count || 0,
        avg_size_sqft: ut.avg_size_sqft || 0,
        selling_psf: ut.selling_psf || 0,
      }))
      await supabase.from('unit_types').insert(rows)
    }
  }

  res.status(201).json(project)
}))

router.get('/:id/export/excel', asyncHandler(async (req, res) => {
  const { buffer, filename } = await generateExcel(req.params.id)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}))

router.get('/:id/export/csv', asyncHandler(async (req, res) => {
  const { csv, filename } = await generateCSV(req.params.id)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csv)
}))

// GET /api/projects/:id/export/pdf/dashboard
router.get('/:id/export/pdf/dashboard', asyncHandler(async (req, res) => {
  try {
    const buffer = await generateDashboardPdf(req.params.id)
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="dashboard_${req.params.id}_${date}.pdf"`)
    res.send(buffer)
  } catch (err) {
    if (err.code === 'PDF_UNAVAILABLE') {
      return res.status(501).json({ error: err.message })
    }
    throw err
  }
}))

// GET /api/projects/:id/export/pdf/feasibility
router.get('/:id/export/pdf/feasibility', asyncHandler(async (req, res) => {
  try {
    const buffer = await generateFeasibilityPdf(req.params.id)
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="feasibility_${req.params.id}_${date}.pdf"`)
    res.send(buffer)
  } catch (err) {
    if (err.code === 'PDF_UNAVAILABLE') {
      return res.status(501).json({ error: err.message })
    }
    throw err
  }
}))

module.exports = router

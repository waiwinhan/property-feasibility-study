const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const asyncHandler = require('../lib/asyncHandler')

// GET /api/settings
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('app_settings').select('*').single()
  if (error && error.code !== 'PGRST116') throw error
  res.json(data || { company_name: 'Wai Property Feasibility Study', hurdle_rate_pct: 15 })
}))

// PATCH /api/settings
router.patch('/', asyncHandler(async (req, res) => {
  const { data: existing } = await supabase.from('app_settings').select('id').single()
  const allowed = ['company_name', 'hurdle_rate_pct', 'logo_url']
  const updates = {}
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k]

  let result
  if (existing) {
    const { data, error } = await supabase.from('app_settings').update(updates).eq('id', existing.id).select().single()
    if (error) throw error
    result = data
  } else {
    const { data, error } = await supabase.from('app_settings').insert(updates).select().single()
    if (error) throw error
    result = data
  }
  res.json(result)
}))

module.exports = router

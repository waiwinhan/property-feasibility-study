const supabase = require('./supabase')

/**
 * Copy unit_types and cost_assumptions from oldPhaseId to newPhaseId.
 */
async function clonePhaseChildren(oldPhaseId, newPhaseId) {
  const [{ data: unitTypes }, { data: ca }] = await Promise.all([
    supabase.from('unit_types').select('*').eq('phase_id', oldPhaseId),
    supabase.from('cost_assumptions').select('*').eq('phase_id', oldPhaseId).single(),
  ])

  const tasks = []

  if (unitTypes?.length) {
    const rows = unitTypes.map(({ id, phase_id, ...rest }) => ({ ...rest, phase_id: newPhaseId }))
    tasks.push(supabase.from('unit_types').insert(rows))
  }

  if (ca) {
    const { id, phase_id, ...caData } = ca
    tasks.push(supabase.from('cost_assumptions').insert({ ...caData, phase_id: newPhaseId }))
  }

  await Promise.all(tasks)
}

module.exports = clonePhaseChildren

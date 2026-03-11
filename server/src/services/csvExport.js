const supabase = require('../lib/supabase')

async function generateCSV(projectId) {
  const { data: phases } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single()

  const headers = ['Phase Name', 'Dev Type', 'Launch Date', 'Units', 'GDV', 'NDV', 'GCC', 'Const PSF', 'NDP', 'Margin %']

  const formatN = (n) => n != null ? Number(n).toFixed(0) : ''
  const formatPct = (n) => n != null ? Number(n).toFixed(2) : ''

  const rows = (phases || []).filter(p => p.is_active !== false).map(p => {
    const r = p.financial_results || {}
    return [
      p.name,
      p.dev_type || '',
      p.launch_date || '',
      p.unit_count || '',
      formatN(p.total_gdv),
      formatN(p.total_ndv),
      formatN(p.total_gcc),
      formatN(r.constPsf),
      formatN(p.total_ndp),
      formatPct(p.profit_margin_pct),
    ]
  })

  // TOTAL row
  const actPhs = (phases || []).filter(p => p.is_active !== false)
  const totGDV = actPhs.reduce((s, p) => s + (p.total_gdv || 0), 0)
  const totNDV = actPhs.reduce((s, p) => s + (p.total_ndv || 0), 0)
  const totGCC = actPhs.reduce((s, p) => s + (p.total_gcc || 0), 0)
  const totNDP = actPhs.reduce((s, p) => s + (p.total_ndp || 0), 0)
  const totMargin = totNDV > 0 ? (totNDP / totNDV) * 100 : 0
  rows.push(['TOTAL', '', '', actPhs.reduce((s, p) => s + (p.unit_count || 0), 0), formatN(totGDV), formatN(totNDV), formatN(totGCC), '', formatN(totNDP), formatPct(totMargin)])

  const escape = (v) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
  return { csv, filename: `${project?.name || 'feasibility'}_export.csv` }
}

module.exports = { generateCSV }

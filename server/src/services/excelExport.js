const ExcelJS = require('exceljs')
const supabase = require('../lib/supabase')

/** Fetch a logo URL and return { buffer, extension } or null on failure. */
async function fetchLogoImage(logoUrl) {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    let extension = 'png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpeg'
    else if (contentType.includes('gif')) extension = 'gif'
    else if (contentType.includes('svg')) return null // ExcelJS doesn't support SVG
    const arrayBuf = await res.arrayBuffer()
    return { buffer: Buffer.from(arrayBuf), extension }
  } catch {
    return null
  }
}

async function generateExcel(projectId) {
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  const { data: phases } = await supabase.from('phases').select('*, cost_assumptions(*), unit_types(*)').eq('project_id', projectId).order('sort_order')
  const { data: settings } = await supabase.from('app_settings').select('*').limit(1).single()
  const companyName = settings?.company_name || 'Wai Property Feasibility Study'
  const hurdleRate = settings?.hurdle_rate_pct || 15
  const activePhs = (phases || []).filter(p => p.is_active !== false)
  const logoImage = await fetchLogoImage(settings?.logo_url)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Wai Property Feasibility Study'
  wb.created = new Date()

  const ws = wb.addWorksheet('Feasibility Study', {
    pageSetup: { paperSize: 8, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.24, right: 0.24, top: 0.51, bottom: 0.51 } },
  })

  // Column definitions
  const labelCols = [
    { key: 'item', width: 6.7 }, { key: 'ref', width: 21.1 }, { key: 'desc', width: 51.2 },
    { key: 'rate', width: 17.1 }, { key: 'unit', width: 18.3 }, { key: 'basis', width: 28.0 },
    { key: 'notes', width: 22.8 },
  ]
  const phaseCols = []
  activePhs.forEach((ph, i) => {
    phaseCols.push({ key: `ph${i}`, width: 15.7, phaseId: ph.id, idx: i })
    phaseCols.push({ key: `sp${i}`, width: 3.7 }) // spacer
  })
  phaseCols.push({ key: 'total', width: 18.1 })
  ws.columns = [...labelCols, ...phaseCols].map(c => ({ key: c.key, width: c.width }))

  const phColStart = labelCols.length + 1 // 1-based column for first phase

  function phCol(phaseIdx) { return phColStart + phaseIdx * 2 }
  function totalCol() { return phColStart + activePhs.length * 2 }

  const arial = { name: 'Arial', size: 10 }
  const bold = { name: 'Arial', size: 10, bold: true }
  const boldItalic = { name: 'Arial', size: 10, bold: true, italic: true }

  const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }  // light blue
  const TOTAL_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }  // light orange
  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }  // dark navy
  const thinBorder  = { style: 'thin', color: { argb: 'FFB4B4B4' } }
  const thickBorder = { style: 'medium', color: { argb: 'FF1F3864' } }

  function applyBorderBottom(row, col, thick = false) {
    const cell = row.getCell(col)
    cell.border = { ...(cell.border || {}), bottom: thick ? thickBorder : thinBorder }
  }

  function rm(val) { return val != null ? Math.round(Number(val)) : null }
  function pct(val) { return val != null ? Number(val) / 100 : null }

  // Row 1 — Logo (col A) + Company name + project name (header row)
  const r1 = ws.addRow([null, null, companyName + '   |   ' + (project?.name || 'Feasibility Study')])
  r1.getCell(3).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  r1.height = 40
  // Fill entire row with navy
  r1.eachCell({ includeEmpty: true }, cell => { cell.fill = HEADER_FILL })

  // Embed logo in top-left corner if available
  if (logoImage) {
    const imageId = wb.addImage({ buffer: logoImage.buffer, extension: logoImage.extension })
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 130, height: 36 },
      editAs: 'oneCell',
    })
  }

  // Row 2 — Phase names
  const phNamesRow = ws.addRow([null, null, null, null, null, null, null,
    ...activePhs.flatMap(ph => [ph.name, null]), null
  ])
  phNamesRow.height = 18
  activePhs.forEach((ph, i) => {
    const cell = phNamesRow.getCell(phCol(i))
    cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F3864' } }
  })

  ws.addRow([]) // row 3 spacer

  // Section A - GDV
  const aHeaderRow = ws.addRow([null, null, 'SECTION A — GROSS DEVELOPMENT VALUE'])
  aHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  aHeaderRow.eachCell({ includeEmpty: true }, cell => { cell.fill = SECTION_FILL; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } } })

  // Launch dates
  const launchRow = ws.addRow([null, null, 'Launch Date', null, null, null, null,
    ...activePhs.flatMap(ph => [ph.launch_date ? new Date(ph.launch_date).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }) : 'TBD', null]), null
  ])

  ws.addRow([]) // spacer

  // Unit types per phase
  const maxUnitRows = Math.max(...activePhs.map(ph => (ph.unit_types || []).length), 1)
  for (let u = 0; u < maxUnitRows; u++) {
    const rowData = [null, null, activePhs[0]?.unit_types?.[u]?.name || '', null, null, null, null]
    activePhs.forEach(ph => {
      const ut = (ph.unit_types || [])[u]
      rowData.push(ut ? rm((ut.unit_count || 0) * (ut.avg_size_sqft || 0) * (ut.selling_psf || 0)) : null)
      rowData.push(null) // spacer
    })
    rowData.push(null) // total
    ws.addRow(rowData)
  }

  ws.addRow([]) // spacer

  // GDV Total
  const gdvRow = activePhs.map(ph => rm(ph.total_gdv || 0))
  const totalGDV = gdvRow.reduce((s, v) => s + (v || 0), 0)
  const gdvDataRow = ws.addRow([null, null, 'GROSS DEVELOPMENT VALUE', null, null, null, null,
    ...gdvRow.flatMap(v => [v, null]), rm(totalGDV)
  ])
  gdvDataRow.font = bold
  gdvDataRow.eachCell({ includeEmpty: true }, cell => { cell.fill = SECTION_FILL })

  ws.addRow([]) // spacer

  // NDV deductions
  activePhs.forEach((ph, i) => {
    const ca = (ph.cost_assumptions || [])[0] || ph.cost_assumptions || {}
    const r = ph.financial_results || {}
  })

  const totalNDV = activePhs.reduce((s, p) => s + (p.total_ndv || 0), 0)
  const ndvRow = ws.addRow([null, null, 'NET DEVELOPMENT VALUE (NDV)', null, null, null, null,
    ...activePhs.flatMap(ph => [rm(ph.total_ndv), null]), rm(totalNDV)
  ])
  ndvRow.font = bold
  ndvRow.eachCell({ includeEmpty: true }, cell => { cell.fill = SECTION_FILL })

  ws.addRow([]) // spacer

  // Section B - GDC
  const bHeaderRow = ws.addRow([null, null, 'SECTION B — GROSS DEVELOPMENT COST'])
  bHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  bHeaderRow.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } } })

  // GCC
  const gccDataRow = ws.addRow([null, null, 'GROSS CONSTRUCTION COST (GCC)', null, null, null, null,
    ...activePhs.flatMap(ph => [rm(ph.total_gcc), null]), rm(activePhs.reduce((s, p) => s + (p.total_gcc || 0), 0))
  ])
  gccDataRow.font = bold
  gccDataRow.eachCell({ includeEmpty: true }, cell => { cell.fill = SECTION_FILL })

  ws.addRow([]) // spacer

  // NDP
  const totalNDP = activePhs.reduce((s, p) => s + (p.total_ndp || 0), 0)
  const ndpDataRow = ws.addRow([null, null, 'NET DEVELOPMENT PROFIT (NDP)', null, null, null, null,
    ...activePhs.flatMap(ph => [rm(ph.total_ndp), null]), rm(totalNDP)
  ])
  ndpDataRow.font = { name: 'Arial', size: 11, bold: true }
  ndpDataRow.height = 18
  ndpDataRow.eachCell({ includeEmpty: true }, cell => { cell.fill = TOTAL_FILL })

  // Margin %
  const totalNDVForMargin = totalNDV > 0 ? totalNDV : 1
  const marginDataRow = ws.addRow([null, null, `% NDP/NDV (PROFIT MARGIN)  [Hurdle: ${hurdleRate}%]`, null, null, null, null,
    ...activePhs.flatMap(ph => [pct(ph.profit_margin_pct), null]),
    pct(totalNDV > 0 ? totalNDP / totalNDV * 100 : 0)
  ])
  marginDataRow.font = { name: 'Arial', size: 11, bold: true, italic: true }
  marginDataRow.height = 18
  marginDataRow.eachCell({ includeEmpty: true }, cell => { cell.fill = TOTAL_FILL })

  // Format margin cells as percentage
  activePhs.forEach((ph, i) => {
    const cell = marginDataRow.getCell(phCol(i))
    cell.numFmt = '0.00%'
  })
  marginDataRow.getCell(totalCol()).numFmt = '0.00%'

  // Format RM cells
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === 'number' && cell.numFmt !== '0.00%') {
        cell.numFmt = '#,##0'
        cell.alignment = { horizontal: 'right' }
      }
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  const safeName = (project?.name || 'Feasibility').replace(/[^a-z0-9]/gi, '_')
  const date = new Date().toISOString().slice(0, 10)
  return { buffer, filename: `${safeName}_${date}.xlsx` }
}

module.exports = { generateExcel }

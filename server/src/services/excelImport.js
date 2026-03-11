const ExcelJS = require('exceljs')

const PHASES_SHEET = 'Phases'
const UNITS_SHEET = 'Unit Types'

async function generateTemplate() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Wai Property Feasibility Study'

  // Instructions sheet
  const info = wb.addWorksheet('Instructions')
  const titleRow = info.addRow(['Wai Property Feasibility Study — Import Template'])
  titleRow.getCell(1).font = { name: 'Arial', size: 13, bold: true }
  info.addRow([])
  info.addRow(['HOW TO USE:'])
  info.addRow(['1. Fill in the "Phases" sheet — one row per project phase.'])
  info.addRow(['2. Fill in the "Unit Types" sheet — one row per unit type.'])
  info.addRow(['3. The "Phase Name" column in Unit Types MUST exactly match a name in Phases.'])
  info.addRow(['4. Delete the example data rows (keep the header row).'])
  info.addRow(['5. Upload this file using "Import from Excel" on the Portfolio page.'])
  info.addRow([])
  info.addRow(['FIELD NOTES:'])
  info.addRow(['• Dev Type: Residential / Mixed / Commercial'])
  info.addRow(['• Category: Residential / Affordable / Commercial'])
  info.addRow(['• Launch Date: YYYY-MM-DD or DD/MM/YYYY format'])
  info.addRow(['• Leave numeric cells blank (not 0) if unknown.'])
  info.columnWidths = [70]
  info.getColumn(1).width = 70

  // Phases sheet
  const ws1 = wb.addWorksheet(PHASES_SHEET)
  ws1.columns = [
    { key: 'name',              width: 28 },
    { key: 'dev_type',          width: 18 },
    { key: 'launch_date',       width: 16 },
    { key: 'land_area_acres',   width: 20 },
    { key: 'land_cost_psf',     width: 20 },
  ]
  const phHdr = ws1.addRow(['Phase Name', 'Dev Type', 'Launch Date', 'Land Area (acres)', 'Land Cost PSF (RM)'])
  phHdr.font = { name: 'Arial', bold: true }
  phHdr.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } }
  })
  // Example rows
  const ex1 = ws1.addRow(['Phase 1', 'Residential', '2025-01-01', 5.5, 45])
  const ex2 = ws1.addRow(['Phase 2', 'Residential', '2026-06-01', 4.2, 45])
  ;[ex1, ex2].forEach(r => r.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    cell.font = { name: 'Arial', italic: true, color: { argb: 'FF7F7F7F' } }
  }))
  ws1.addRow(['← DELETE example rows before importing'])

  // Unit Types sheet
  const ws2 = wb.addWorksheet(UNITS_SHEET)
  ws2.columns = [
    { key: 'phase_name',      width: 28 },
    { key: 'name',            width: 25 },
    { key: 'category',        width: 18 },
    { key: 'unit_count',      width: 12 },
    { key: 'avg_size_sqft',   width: 16 },
    { key: 'selling_psf',     width: 18 },
  ]
  const utHdr = ws2.addRow(['Phase Name', 'Unit Type Name', 'Category', 'Units', 'Size (sqft)', 'Selling PSF (RM)'])
  utHdr.font = { name: 'Arial', bold: true }
  utHdr.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } }
  })
  // Example rows
  ;[
    ['Phase 1', 'Type A - 22x70', 'Residential', 200, 1540, 380],
    ['Phase 1', 'Type B - 22x80', 'Residential', 100, 1760, 420],
    ['Phase 2', 'Type C - 20x65', 'Affordable',  300, 1300, 300],
  ].forEach(row => {
    const r = ws2.addRow(row)
    r.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
      cell.font = { name: 'Arial', italic: true, color: { argb: 'FF7F7F7F' } }
    })
  })
  ws2.addRow(['← DELETE example rows before importing'])

  const buffer = await wb.xlsx.writeBuffer()
  return buffer
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return val.toISOString().slice(0, 10)
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

async function parseImport(buffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)

  // --- Phases ---
  const ws1 = wb.getWorksheet(PHASES_SHEET) || wb.worksheets.find(s => s.name !== 'Instructions') || wb.worksheets[0]
  if (!ws1) throw new Error('Could not find a Phases worksheet.')

  const phases = []
  let phaseHeaders = null

  ws1.eachRow((row) => {
    const vals = []
    row.eachCell({ includeEmpty: true }, (cell, colNum) => { vals[colNum - 1] = cell.value })
    const strs = vals.map(v => v == null ? '' : String(v).trim())

    if (!phaseHeaders) {
      // Detect header row by looking for "phase name" column
      const lower = strs.map(s => s.toLowerCase())
      if (lower.some(s => s.includes('phase name') || s.includes('phase'))) {
        phaseHeaders = lower
      }
      return
    }

    if (strs.every(s => s === '')) return // blank row
    if (strs[0].startsWith('←')) return  // instruction row

    const get = (keywords) => {
      for (const kw of keywords) {
        const idx = phaseHeaders.findIndex(h => h.includes(kw))
        if (idx >= 0) return vals[idx]
      }
      return null
    }

    const name = String(get(['phase name', 'phase']) || '').trim()
    if (!name) return

    phases.push({
      name,
      dev_type: String(get(['dev type', 'type']) || 'Residential').trim() || 'Residential',
      launch_date: parseDate(get(['launch date', 'launch', 'date'])),
      land_area_acres: num(get(['land area', 'area'])),
      land_cost_psf: num(get(['land cost psf', 'land cost', 'land psf'])),
      unitTypes: [],
    })
  })

  if (phases.length === 0) throw new Error('No phase data found. Ensure the "Phases" sheet has a header row and at least one data row.')

  // --- Unit Types ---
  const ws2 = wb.getWorksheet(UNITS_SHEET) || wb.worksheets.find(s => s !== ws1 && s.name !== 'Instructions')
  if (ws2) {
    let utHeaders = null

    ws2.eachRow((row) => {
      const vals = []
      row.eachCell({ includeEmpty: true }, (cell, colNum) => { vals[colNum - 1] = cell.value })
      const strs = vals.map(v => v == null ? '' : String(v).trim())

      if (!utHeaders) {
        const lower = strs.map(s => s.toLowerCase())
        if (lower.some(s => s.includes('phase') || s.includes('unit type'))) {
          utHeaders = lower
        }
        return
      }

      if (strs.every(s => s === '')) return
      if (strs[0].startsWith('←')) return

      const get = (keywords) => {
        for (const kw of keywords) {
          const idx = utHeaders.findIndex(h => h.includes(kw))
          if (idx >= 0) return vals[idx]
        }
        return null
      }

      const phaseName = String(get(['phase name', 'phase']) || '').trim()
      const phase = phases.find(p => p.name.toLowerCase() === phaseName.toLowerCase())
      if (!phase) return

      const name = String(get(['unit type name', 'unit type', 'name']) || '').trim()
      if (!name) return

      phase.unitTypes.push({
        name,
        category: String(get(['category', 'cat']) || 'Residential').trim() || 'Residential',
        unit_count: Math.max(0, parseInt(get(['units', 'unit count', 'count'])) || 0),
        avg_size_sqft: Math.max(0, num(get(['size (sqft)', 'size', 'sqft', 'avg size'])) || 0),
        selling_psf: Math.max(0, num(get(['selling psf', 'selling', 'psf'])) || 0),
      })
    })
  }

  return { phases }
}

module.exports = { generateTemplate, parseImport }

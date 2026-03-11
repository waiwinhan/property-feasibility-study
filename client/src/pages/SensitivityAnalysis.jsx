import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, TrendingUp, Download } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { cn, formatRM, formatPct, marginColor } from '../lib/utils'
import Button from '../components/ui/Button'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import apiClient from '../api/client'
import { projectsApi } from '../api/projects'

const HURDLE = 15
const VARIABLES = [
  { key: 'selling_psf', label: 'Selling Price PSF', step: 10, hint: 'RM/sqft' },
  { key: 'building_psf_residential', label: 'Residential Construction PSF', step: 10, hint: 'RM/sqft' },
  { key: 'building_psf_affordable', label: 'Affordable Construction PSF', step: 10, hint: 'RM/sqft' },
  { key: 'land_cost_psf', label: 'Land Cost PSF', step: 5, hint: 'RM/sqft' },
  { key: 'professional_fees_pct', label: 'Professional Fees', step: 0.5, hint: '%' },
  { key: 'marketing_pct', label: 'Marketing Fees', step: 0.25, hint: '%' },
  { key: 'bumi_discount_pct', label: 'Bumi Discount', step: 1, hint: '%' },
  { key: 'bumi_quota_pct', label: 'Bumi Quota', step: 5, hint: '%' },
]

// Preset ranges used for tornado chart (min/max extremes per variable)
const TORNADO_RANGES = {
  selling_psf:               { min: 200, max: 600 },
  building_psf_residential:  { min: 150, max: 450 },
  building_psf_affordable:   { min: 100, max: 350 },
  land_cost_psf:             { min: 20,  max: 150 },
  professional_fees_pct:     { min: 2,   max: 8   },
  marketing_pct:             { min: 1,   max: 5   },
  bumi_discount_pct:         { min: 0,   max: 12  },
  bumi_quota_pct:            { min: 0,   max: 40  },
}

export default function SensitivityAnalysis() {
  const { id: projectId, phaseId } = useParams()
  const navigate = useNavigate()

  const heatmapRef = useRef(null)
  const [mode, setMode] = useState('single') // 'single' | 'heatmap' | 'tornado'
  const [variable, setVariable] = useState('selling_psf')
  const [min, setMin] = useState(200)
  const [max, setMax] = useState(600)
  const [step, setStep] = useState(20)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // Heat map state
  const [rowVar, setRowVar] = useState('selling_psf')
  const [colVar, setColVar] = useState('building_psf_residential')
  const [rowMin, setRowMin] = useState(200)
  const [rowMax, setRowMax] = useState(500)
  const [rowStep, setRowStep] = useState(50)
  const [colMin, setColMin] = useState(200)
  const [colMax, setColMax] = useState(400)
  const [colStep, setColStep] = useState(50)
  const [heatmap, setHeatmap] = useState(null)

  // Tornado state
  const [tornadoData, setTornadoData] = useState([])

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', phaseId],
    queryFn: () => apiClient.get(`/phases/${phaseId}/scenarios`).then(r => r.data),
  })

  const baseScenario = scenarios.find(s => s.is_base) || scenarios[0]

  async function runSingle() {
    if (!baseScenario) return
    setLoading(true)
    try {
      const res = await apiClient.post(`/scenarios/${baseScenario.id}/sensitivity`, { variable, min: +min, max: +max, step: +step })
      setRows(res.data.rows)
    } finally { setLoading(false) }
  }

  async function runHeatmap() {
    if (!baseScenario) return
    setLoading(true)
    try {
      const res = await apiClient.post(`/scenarios/${baseScenario.id}/sensitivity/two-variable`, {
        rowVar, rowMin: +rowMin, rowMax: +rowMax, rowStep: +rowStep,
        colVar, colMin: +colMin, colMax: +colMax, colStep: +colStep,
      })
      setHeatmap(res.data)
    } finally { setLoading(false) }
  }

  async function runTornado() {
    if (!baseScenario) return
    setLoading(true)
    try {
      const results = await Promise.all(
        VARIABLES.map(async (v) => {
          const r = TORNADO_RANGES[v.key]
          const res = await apiClient.post(`/scenarios/${baseScenario.id}/sensitivity`, {
            variable: v.key, min: r.min, max: r.max, step: r.max - r.min,
          })
          const pts = res.data.rows
          const low = pts[0]?.margin ?? 0
          const high = pts[pts.length - 1]?.margin ?? 0
          return { key: v.key, label: v.label, low, high, range: Math.abs(high - low) }
        })
      )
      setTornadoData(results.sort((a, b) => b.range - a.range))
    } finally { setLoading(false) }
  }

  function exportHeatmapPng() {
    if (!heatmap) return
    const CELL_W = 72, CELL_H = 28, HDR_W = 110, SCALE = 2
    const cols = heatmap.colVals.length
    const rws = heatmap.matrix.length
    const W = HDR_W + cols * CELL_W
    const H = (rws + 1) * CELL_H
    const canvas = document.createElement('canvas')
    canvas.width = W * SCALE; canvas.height = H * SCALE
    const ctx = canvas.getContext('2d')
    ctx.scale(SCALE, SCALE)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    ctx.font = '11px system-ui, sans-serif'

    // Header row
    ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, 0, W, CELL_H)
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText('↓Row \\ Col→', 6, CELL_H / 2)
    heatmap.colVals.forEach((cv, i) => {
      ctx.fillStyle = '#f9fafb'; ctx.fillRect(HDR_W + i * CELL_W, 0, CELL_W, CELL_H)
      ctx.fillStyle = '#374151'; ctx.textAlign = 'center'
      ctx.fillText(String(cv), HDR_W + i * CELL_W + CELL_W / 2, CELL_H / 2)
    })

    // Data rows
    heatmap.matrix.forEach((row, ri) => {
      const y = (ri + 1) * CELL_H
      ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, y, HDR_W, CELL_H)
      ctx.fillStyle = '#374151'; ctx.textAlign = 'left'
      ctx.fillText(String(row.rowValue), 6, y + CELL_H / 2)
      row.cols.forEach((cell, ci) => {
        const x = HDR_W + ci * CELL_W
        const m = cell.margin
        ctx.fillStyle = m >= 15 ? '#dcfce7' : m >= 12 ? '#fefce8' : m >= 0 ? '#fef2f2' : '#fecaca'
        ctx.fillRect(x, y, CELL_W, CELL_H)
        ctx.fillStyle = m >= 15 ? '#166534' : m >= 12 ? '#92400e' : m >= 0 ? '#991b1b' : '#7f1d1d'
        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(m != null ? m.toFixed(1) + '%' : '—', x + CELL_W / 2, y + CELL_H / 2)
        ctx.font = '11px system-ui, sans-serif'
      })
    })

    // Grid lines
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5
    for (let r = 0; r <= rws + 1; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL_H); ctx.lineTo(W, r * CELL_H); ctx.stroke()
    }
    ctx.beginPath(); ctx.moveTo(HDR_W, 0); ctx.lineTo(HDR_W, H); ctx.stroke()
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(HDR_W + c * CELL_W, 0); ctx.lineTo(HDR_W + c * CELL_W, H); ctx.stroke()
    }

    canvas.toBlob(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `heatmap_${heatmap.rowVar}_x_${heatmap.colVar}.png`
      link.click()
    })
  }

  // Find break-even: interpolate between the last row with margin < 0 and first with margin >= 0
  const breakEvenValue = (() => {
    const crossIdx = rows.findIndex(r => r.margin >= 0)
    if (crossIdx <= 0) return null
    const before = rows[crossIdx - 1]
    const after = rows[crossIdx]
    if (before.margin === after.margin) return null
    // Linear interpolation: value where margin = 0
    return before.value + (0 - before.margin) * (after.value - before.value) / (after.margin - before.margin)
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(`/project/${projectId}/phase/${phaseId}/scenarios`)} className="hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Scenarios
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">Sensitivity Analysis</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sensitivity Analysis</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'single', label: 'Single Variable' },
            { key: 'heatmap', label: 'Heat Map (2-Var)' },
            { key: 'tornado', label: 'Tornado Chart' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {!baseScenario && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Create a Base Case scenario first to run sensitivity analysis.
        </div>
      )}

      {mode === 'single' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Configuration</h3></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Variable</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={variable} onChange={e => setVariable(e.target.value)}>
                    {VARIABLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
                {[['Min', min, setMin], ['Max', max, setMax], ['Step', step, setStep]].map(([label, val, setVal]) => (
                  <div key={label}>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={val} onChange={e => setVal(e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button onClick={runSingle} disabled={!baseScenario || loading}>
                  {loading ? <><Spinner className="w-3.5 h-3.5" /> Running…</> : <><TrendingUp className="w-4 h-4" /> Run Analysis</>}
                </Button>
              </div>
            </CardBody>
          </Card>

          {rows.length > 0 && (
            <>
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-gray-700">Margin % vs {VARIABLES.find(v => v.key === variable)?.label}</h3></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rows} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="value" tickFormatter={v => v.toFixed(0)} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [n === 'margin' ? formatPct(v) : formatRM(v, true), n === 'margin' ? 'Margin' : 'NDP']} labelFormatter={v => `Value: ${v}`} />
                      <ReferenceLine y={HURDLE} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Hurdle ${HURDLE}%`, position: 'right', fontSize: 10, fill: '#ef4444' }} />
                      <ReferenceLine y={0} stroke="#374151" />
                      {breakEvenValue != null && (
                        <ReferenceLine x={breakEvenValue} stroke="#6b7280" strokeDasharray="3 3"
                          label={{ value: `BE: ${breakEvenValue.toFixed(0)}`, position: 'top', fontSize: 10, fill: '#6b7280' }} />
                      )}
                      <Line type="monotone" dataKey="margin" stroke="#3b82f6" dot={false} strokeWidth={2} name="margin" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Value</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">NDV</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">NDP</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => (
                      <tr key={i} className={cn('hover:bg-gray-50', r.margin >= HURDLE ? '' : r.margin >= 0 ? 'bg-amber-50/30' : 'bg-red-50/30')}>
                        <td className="px-4 py-2 font-medium">{r.value.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatRM(r.ndv, true)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatRM(r.ndp, true)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={cn('font-semibold', marginColor(r.margin))}>{formatPct(r.margin)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'tornado' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Tornado Chart — Variable Impact Ranking</h3>
              <p className="text-xs text-gray-400 mt-0.5">Shows the margin % range for each variable moved across its full preset range. Widest range = highest sensitivity.</p>
            </CardHeader>
            <CardBody>
              <Button onClick={runTornado} disabled={!baseScenario || loading}>
                {loading ? <><Spinner className="w-3.5 h-3.5" /> Running…</> : <><TrendingUp className="w-4 h-4" /> Run Tornado Analysis</>}
              </Button>
              {tornadoData.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  Using preset ranges: Selling PSF 200–600, Res Build 150–450, Land PSF 20–150, etc.
                </div>
              )}
            </CardBody>
          </Card>

          {tornadoData.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-gray-700">Impact on Margin % (pp range)</h3></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={tornadoData.length * 42 + 40}>
                  <BarChart data={tornadoData.map(d => ({
                    name: d.label.length > 28 ? d.label.slice(0, 28) + '…' : d.label,
                    range: +d.range.toFixed(2),
                    positive: d.high > d.low,
                  }))} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(1)}pp`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={200} />
                    <Tooltip formatter={(v, name, props) => [
                      `${v.toFixed(2)} pp`,
                      `${props.payload.positive ? '↑ improves' : '↓ worsens'} margin when raised`,
                    ]} />
                    <Bar dataKey="range" barSize={18} radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: v => `${v.toFixed(1)}pp` }}>
                      {tornadoData.map((d, i) => (
                        <Cell key={i} fill={d.high > d.low ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Higher value → better margin</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Higher value → worse margin</span>
                </div>
                <div className="mt-4 divide-y divide-gray-100 text-sm">
                  {tornadoData.map(d => (
                    <div key={d.key} className="flex items-center gap-3 py-2">
                      <div className="w-5 h-2 rounded" style={{ background: d.high > d.low ? '#22c55e' : '#ef4444' }} />
                      <span className="flex-1 text-gray-700">{d.label}</span>
                      <span className="text-gray-400 text-xs">{d.low.toFixed(1)}% → {d.high.toFixed(1)}%</span>
                      <span className="font-semibold text-gray-800 w-16 text-right">{d.range.toFixed(2)} pp</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {mode === 'heatmap' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Two-Variable Heat Map</h3></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Row Variable', var: rowVar, setVar: setRowVar, min: rowMin, setMin: setRowMin, max: rowMax, setMax: setRowMax, step: rowStep, setStep: setRowStep },
                  { label: 'Column Variable', var: colVar, setVar: setColVar, min: colMin, setMin: setColMin, max: colMax, setMax: setColMax, step: colStep, setStep: setColStep },
                ].map(({ label, var: v, setVar, min: mn, setMin: setMn, max: mx, setMax: setMx, step: st, setStep: setSt }) => (
                  <div key={label} className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={v} onChange={e => setVar(e.target.value)}>
                      {VARIABLES.map(vr => <option key={vr.key} value={vr.key}>{vr.label}</option>)}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      {[['Min', mn, setMn], ['Max', mx, setMx], ['Step', st, setSt]].map(([l, val, set]) => (
                        <div key={l}><label className="text-xs text-gray-500">{l}</label>
                          <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5" value={val} onChange={e => set(e.target.value)} /></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button onClick={runHeatmap} disabled={!baseScenario || loading}>
                  {loading ? <><Spinner className="w-3.5 h-3.5" /> Running…</> : 'Generate Heat Map'}
                </Button>
              </div>
            </CardBody>
          </Card>

          {heatmap && (
            <div ref={heatmapRef} className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Margin % — {VARIABLES.find(v => v.key === heatmap.rowVar)?.label} (rows) × {VARIABLES.find(v => v.key === heatmap.colVar)?.label} (cols)
                </span>
                <button onClick={exportHeatmapPng}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-md">
                  <Download className="w-3.5 h-3.5" /> PNG
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">↓Row \ Col→</th>
                    {heatmap.colVals.map(cv => <th key={cv} className="px-3 py-2 text-center font-medium text-gray-600">{cv}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.matrix.map(row => (
                    <tr key={row.rowValue} className="border-b border-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700 bg-gray-50">{row.rowValue}</td>
                      {row.cols.map(cell => (
                        <td key={cell.colValue} className={cn('px-3 py-2 text-center font-semibold',
                          cell.margin >= HURDLE ? 'bg-green-100 text-green-800' :
                          cell.margin >= HURDLE - 3 ? 'bg-amber-50 text-amber-700' :
                          cell.margin >= 0 ? 'bg-red-50 text-red-700' : 'bg-red-200 text-red-900'
                        )}>
                          {formatPct(cell.margin)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, TrendingUp, DollarSign, BarChart2, Layers, Printer } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from 'recharts'
import { projectsApi, phasesApi } from '../api/projects'
import { cn, formatRM, formatPct, marginColor, marginBg } from '../lib/utils'
import { useCountUp } from '../lib/animations'
import Spinner from '../components/ui/Spinner'
import { Card, CardHeader, CardBody } from '../components/ui/Card'

const HURDLE = 15

export default function ProjectDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isPrint = searchParams.get('print') === 'true'

  const { data: project } = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id) })
  const { data: phases = [], isLoading } = useQuery({ queryKey: ['phases', id], queryFn: () => phasesApi.list(id) })

  const activePhs = phases.filter(p => p.is_active !== false)

  const totals = activePhs.reduce((acc, p) => {
    acc.gdv += p.total_gdv || 0
    acc.ndv += p.total_ndv || 0
    acc.ndp += p.total_ndp || 0
    acc.gcc += p.total_gcc || 0
    acc.units += p.unit_count || 0
    return acc
  }, { gdv: 0, ndv: 0, ndp: 0, gcc: 0, units: 0 })

  const blendedMargin = totals.ndv > 0 ? (totals.ndp / totals.ndv) * 100 : null

  // Animated KPI values
  const animGdv = useCountUp(totals.gdv)
  const animNdv = useCountUp(totals.ndv)
  const animNdp = useCountUp(totals.ndp)
  const animMargin = useCountUp(blendedMargin ?? 0)
  const animUnits = useCountUp(totals.units)

  const marginChartData = activePhs.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    margin: +(p.profit_margin_pct || 0).toFixed(1),
    ndp: p.total_ndp || 0,
    ndv: p.total_ndv || 0,
  }))

  const ndpChartData = activePhs.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    ndp: Math.round((p.total_ndp || 0) / 1_000_000 * 10) / 10,
  }))

  const gdvNdvChartData = activePhs.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    gdv: Math.round((p.total_gdv || 0) / 1_000_000 * 10) / 10,
    ndv: Math.round((p.total_ndv || 0) / 1_000_000 * 10) / 10,
  }))

  // Waterfall: NDV → GCC → Other Costs → NDP
  const M = 1_000_000
  const r1 = v => Math.round(v / M * 10) / 10
  const otherCosts = Math.max(totals.ndv - totals.gcc - totals.ndp, 0)
  const waterfallData = [
    { name: 'NDV', spacer: 0, value: r1(totals.ndv), color: '#3b82f6' },
    { name: 'Const Cost', spacer: r1(totals.ndv - totals.gcc), value: r1(totals.gcc), color: '#ef4444' },
    { name: 'Other Costs', spacer: r1(totals.ndp), value: r1(otherCosts), color: '#f97316' },
    { name: 'NDP', spacer: 0, value: r1(totals.ndp), color: '#22c55e' },
  ]

  // Phase Gantt — phases with launch dates, sorted by date
  const phasesWithDates = [...activePhs]
    .filter(p => p.launch_date)
    .sort((a, b) => new Date(a.launch_date) - new Date(b.launch_date))
  const ganttData = (() => {
    if (phasesWithDates.length === 0) return []
    const t0 = new Date(phasesWithDates[0].launch_date).getTime()
    const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44
    return phasesWithDates.map(p => {
      const offset = Math.round((new Date(p.launch_date).getTime() - t0) / MS_MONTH)
      const label = new Date(p.launch_date).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
      return { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, spacer: offset, bar: 2, label }
    })
  })()

  const psfChartData = activePhs
    .filter(p => p.financial_results?.constPsf > 0)
    .map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      psf: Math.round(p.financial_results.constPsf * 100) / 100,
    }))
  const avgPsf = psfChartData.length > 0
    ? psfChartData.reduce((s, r) => s + r.psf, 0) / psfChartData.length
    : null

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      {!isPrint && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-gray-900">Portfolio</button>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => navigate(`/project/${id}`)} className="hover:text-gray-900">{project?.name}</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Dashboard</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{project?.name} — Dashboard</h1>
        {!isPrint ? (
          <button
            onClick={() => { setSearchParams({ print: 'true' }); setTimeout(() => window.print(), 300) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        ) : (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            ← Exit Print View
          </button>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total GDV', value: formatRM(animGdv, true), icon: DollarSign },
          { label: 'Total NDV', value: formatRM(animNdv, true), icon: TrendingUp },
          { label: 'Total NDP', value: formatRM(animNdp, true), icon: TrendingUp },
          { label: 'Blended Margin', value: formatPct(animMargin), icon: BarChart2, margin: blendedMargin },
          { label: 'Total Units', value: Math.round(animUnits), icon: Layers },
        ].map(({ label, value, icon: Icon, margin }) => (
          <Card key={label}>
            <CardBody className="py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-brand-500" />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className={cn('text-xl font-bold', margin != null ? marginColor(margin) : 'text-gray-900')}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', !isPrint && 'print:hidden')}>
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">NDP Margin by Phase (%)</h3></CardHeader>
          <CardBody>
            {marginChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={marginChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Margin']} />
                  <ReferenceLine y={HURDLE} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${HURDLE}%`, position: 'right', fontSize: 10, fill: '#ef4444' }} />
                  <Bar dataKey="margin" radius={[4,4,0,0]}>
                    {marginChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.margin >= HURDLE ? '#22c55e' : entry.margin >= HURDLE - 3 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">GDV vs NDV by Phase (RM M)</h3></CardHeader>
          <CardBody>
            {gdvNdvChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gdvNdvChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                  <Tooltip formatter={(v, n) => [`RM ${v}M`, n.toUpperCase()]} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="gdv" name="GDV" fill="#94a3b8" radius={[3,3,0,0]} />
                  <Bar dataKey="ndv" name="NDV" fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Construction PSF chart */}
      {psfChartData.length > 0 && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">Construction Cost PSF by Phase (RM/sqft)</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={psfChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `RM ${v}`} />
                <Tooltip formatter={(v) => [`RM ${v.toFixed(2)}/sqft`, 'Const PSF']} />
                {avgPsf != null && (
                  <ReferenceLine y={avgPsf} stroke="#6b7280" strokeDasharray="4 4"
                    label={{ value: `Avg RM ${avgPsf.toFixed(0)}`, position: 'right', fontSize: 10, fill: '#6b7280' }} />
                )}
                <Bar dataKey="psf" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Cost Waterfall */}
      {totals.ndv > 0 && (
        <Card className={!isPrint ? 'print:hidden' : ''}>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">Project Cost Waterfall (RM M)</h3>
            <p className="text-xs text-gray-400 mt-0.5">NDV → Construction Cost → Other Costs → NDP</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={waterfallData} margin={{ top: 10, right: 60, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                <Tooltip
                  formatter={(v, name) => name === 'spacer' ? null : [`RM ${v}M`, '']}
                  labelFormatter={label => label}
                />
                <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" />
                <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 justify-center flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-blue-500" /> NDV (Revenue)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-red-500" /> Construction Cost</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-orange-500" /> Other Costs</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-green-500" /> NDP (Profit)</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Phase Launch Timeline */}
      {ganttData.length > 0 && (
        <Card className={!isPrint ? 'print:hidden' : ''}>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">Phase Launch Timeline</h3>
            <p className="text-xs text-gray-400 mt-0.5">Months from first launch date</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={Math.max(100, ganttData.length * 44)}>
              <BarChart data={ganttData} layout="vertical" margin={{ top: 4, right: 100, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `M${v}`} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                <Tooltip
                  formatter={(v, name, props) => name === 'spacer' ? null : [props.payload.label, 'Launch']}
                  labelFormatter={l => l}
                />
                <Bar dataKey="spacer" stackId="g" fill="transparent" stroke="none" />
                <Bar dataKey="bar" stackId="g" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18}
                  label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v, entry) => entry?.payload?.label || '' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Phase table */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-700">Phase Breakdown</h3></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Phase</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Units</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">GDV</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">NDV</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">GCC</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">NDP</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activePhs.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/project/${id}/study?phase=${p.id}`)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.unit_count ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRM(p.total_gdv, true)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRM(p.total_ndv, true)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRM(p.total_gcc, true)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRM(p.total_ndp, true)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-semibold', marginColor(p.profit_margin_pct))}>{formatPct(p.profit_margin_pct)}</span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right">{totals.units}</td>
                <td className="px-4 py-3 text-right">{formatRM(totals.gdv, true)}</td>
                <td className="px-4 py-3 text-right">{formatRM(totals.ndv, true)}</td>
                <td className="px-4 py-3 text-right">{formatRM(totals.gcc, true)}</td>
                <td className="px-4 py-3 text-right">{formatRM(totals.ndp, true)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={cn('font-bold text-base', marginColor(blendedMargin))}>{formatPct(blendedMargin)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

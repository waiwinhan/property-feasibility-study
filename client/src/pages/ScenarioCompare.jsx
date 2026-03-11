import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { projectsApi, phasesApi } from '../api/projects'
import { cn, formatRM, formatPct, marginColor } from '../lib/utils'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import apiClient from '../api/client'

const HURDLE = 15

export default function ScenarioCompare() {
  const { id: projectId, phaseId } = useParams()
  const navigate = useNavigate()

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })
  const { data: phase } = useQuery({ queryKey: ['phase', phaseId], queryFn: () => apiClient.get(`/phases/${phaseId}`).then(r => r.data) })
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios', phaseId],
    queryFn: () => apiClient.get(`/phases/${phaseId}/scenarios`).then(r => r.data),
  })

  const withResults = scenarios.filter(s => s.scenario_results?.[0]?.results)
  const base = scenarios.find(s => s.is_base)

  // Grouped bar chart: NDV, GCC, NDP per scenario (RM M)
  const barMetrics = ['ndv', 'gcc', 'ndp']
  const barLabels = { ndv: 'NDV', gcc: 'GCC', ndp: 'NDP' }
  const groupedData = barMetrics.map(field => {
    const row = { metric: barLabels[field] }
    withResults.forEach(s => {
      const v = s.scenario_results[0].results[field]
      row[s.name] = v != null ? Math.round(v / 1_000_000 * 10) / 10 : 0
    })
    return row
  })

  // Radar chart: Margin %, Bumi Quota, Bumi Discount, Prof Fees, Contingency per scenario
  // Normalise each metric 0–100 relative to max across scenarios
  const radarFields = [
    { key: 'profitMarginPct', label: 'Margin %' },
  ]
  const caFields = [
    { key: 'bumi_quota_pct', label: 'Bumi Quota' },
    { key: 'bumi_discount_pct', label: 'Bumi Disc' },
    { key: 'professional_fees_pct', label: 'Prof Fees' },
    { key: 'contingency_pct', label: 'Contingency' },
    { key: 'marketing_pct', label: 'Marketing' },
  ]

  const radarData = radarFields.map(({ key, label }) => {
    const row = { subject: label }
    withResults.forEach(s => { row[s.name] = +(s.scenario_results[0]?.results?.[key] || 0).toFixed(1) })
    return row
  })
  caFields.forEach(({ key, label }) => {
    const row = { subject: label }
    withResults.forEach(s => {
      const ca = s.scenario_cost_assumptions?.[0] || {}
      row[s.name] = +(ca[key] || 0).toFixed(1)
    })
    radarData.push(row)
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/')} className="hover:text-gray-900">Portfolio</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => navigate(`/project/${projectId}`)} className="hover:text-gray-900">{project?.name}</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => navigate(`/project/${projectId}/phase/${phaseId}/scenarios`)} className="hover:text-gray-900">{phase?.name} — Scenarios</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">Compare</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900">Scenario Comparison — {phase?.name}</h1>

      {withResults.length < 2 ? (
        <Card>
          <CardBody className="text-center py-12 text-gray-500">
            <p>At least 2 scenarios with calculated results are needed to compare.</p>
            <button onClick={() => navigate(-1)} className="mt-3 text-brand-600 hover:underline text-sm">← Back to Scenarios</button>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Scenario summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {scenarios.map(s => {
              const res = s.scenario_results?.[0]?.results
              const margin = res?.profitMarginPct
              const baseRes = base?.scenario_results?.[0]?.results
              const delta = res && baseRes && !s.is_base ? res.profitMarginPct - baseRes.profitMarginPct : null
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.colour_tag }} />
                    <span className="text-xs font-semibold text-gray-900 truncate">{s.name}</span>
                    {s.is_base && <Badge className="bg-amber-100 text-amber-700 ml-auto text-xs">Base</Badge>}
                  </div>
                  {res ? (
                    <>
                      <div className={cn('text-lg font-bold', marginColor(margin))}>{formatPct(margin)}</div>
                      <div className="text-xs text-gray-500">NDP {formatRM(res.ndp, true)}</div>
                      {delta != null && (
                        <div className={cn('text-xs font-medium', delta > 0 ? 'text-green-600' : 'text-red-600')}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}pp vs Base
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No results</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grouped bar chart */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">NDV / GCC / NDP Comparison (RM M)</h3></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={groupedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                  <Tooltip formatter={(v) => [`RM ${v}M`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {withResults.map(s => (
                    <Bar key={s.id} dataKey={s.name} fill={s.colour_tag} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Radar chart */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Assumption Profile</h3></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  {withResults.map(s => (
                    <Radar key={s.id} name={s.name} dataKey={s.name}
                      stroke={s.colour_tag} fill={s.colour_tag} fillOpacity={0.15} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Full comparison table */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Full Metrics Table</h3></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-36">Metric</th>
                    {scenarios.map(s => (
                      <th key={s.id} className="px-4 py-2.5 text-right font-medium text-gray-700">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.colour_tag }} />
                          {s.name}
                          {s.is_base && <Badge className="bg-amber-100 text-amber-600">Base</Badge>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'GDV', field: 'gdv', fmt: v => formatRM(v, true) },
                    { label: 'NDV', field: 'ndv', fmt: v => formatRM(v, true) },
                    { label: 'GCC', field: 'gcc', fmt: v => formatRM(v, true) },
                    { label: 'NDP', field: 'ndp', fmt: v => formatRM(v, true), bold: true },
                    { label: 'Margin %', field: 'profitMarginPct', fmt: v => formatPct(v), bold: true, colour: true },
                    { label: 'Units', field: 'totalUnits', fmt: v => v },
                    { label: 'Const PSF', field: 'constPsf', fmt: v => v != null ? `RM ${v.toFixed(2)}` : '—' },
                  ].map(({ label, field, fmt, bold, colour }) => {
                    const baseRes = base?.scenario_results?.[0]?.results
                    return (
                      <tr key={label} className={cn(bold && 'bg-gray-50/50')}>
                        <td className={cn('px-4 py-2.5', bold ? 'font-semibold text-gray-800' : 'text-gray-600')}>{label}</td>
                        {scenarios.map(s => {
                          const res = s.scenario_results?.[0]?.results
                          const val = res?.[field]
                          const baseVal = baseRes?.[field]
                          const delta = val != null && baseVal != null && !s.is_base ? val - baseVal : null
                          return (
                            <td key={s.id} className={cn('px-4 py-2.5 text-right', bold ? 'font-bold' : '')}>
                              <div className={colour ? marginColor(val) : 'text-gray-900'}>{val != null ? fmt(val) : '—'}</div>
                              {delta != null && (
                                <div className={cn('text-xs', delta > 0 ? 'text-green-600' : 'text-red-600')}>
                                  {delta > 0 ? '+' : ''}{fmt(delta)}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Plus, Copy, Trash2, Star, TrendingUp, BarChart2 } from 'lucide-react'
import { cn, formatRM, formatPct, marginColor } from '../lib/utils'
import Button from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import apiClient from '../api/client'
import { projectsApi, phasesApi } from '../api/projects'

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316']

export default function ScenarioManager() {
  const { id: projectId, phaseId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState(COLORS[0])
  const [cloneFrom, setCloneFrom] = useState('')
  const [activeScenario, setActiveScenario] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [colourPickerId, setColourPickerId] = useState(null)

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })
  const { data: phase } = useQuery({ queryKey: ['phase', phaseId], queryFn: () => apiClient.get(`/phases/${phaseId}`).then(r => r.data) })
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios', phaseId],
    queryFn: () => apiClient.get(`/phases/${phaseId}/scenarios`).then(r => r.data),
  })

  async function createScenario() {
    if (!newName.trim()) return
    if (cloneFrom) {
      await apiClient.post(`/scenarios/${cloneFrom}/clone`, { name: newName, colour_tag: newColour })
    } else {
      await apiClient.post(`/phases/${phaseId}/scenarios`, { name: newName, colour_tag: newColour })
    }
    qc.invalidateQueries(['scenarios', phaseId])
    setShowNew(false)
    setNewName('')
    setCloneFrom('')
  }

  async function deleteScenario(id) {
    await apiClient.delete(`/scenarios/${id}`)
    qc.invalidateQueries(['scenarios', phaseId])
  }

  async function updateColour(id, colour) {
    await apiClient.patch(`/scenarios/${id}`, { colour_tag: colour })
    qc.invalidateQueries(['scenarios', phaseId])
    setColourPickerId(null)
  }

  async function setBase(id) {
    await apiClient.post(`/scenarios/${id}/set-base`)
    qc.invalidateQueries(['scenarios', phaseId])
  }

  async function saveScenario() {
    if (!activeScenario) return
    setSaving(true)
    try {
      const nameChanged = editName.trim() && editName.trim() !== activeScenario.name
      const notesChanged = editNotes !== (activeScenario.notes || '')
      if (nameChanged || notesChanged) {
        await apiClient.patch(`/scenarios/${activeScenario.id}`, {
          name: editName.trim() || activeScenario.name,
          notes: editNotes,
        })
      }
      await apiClient.put(`/scenarios/${activeScenario.id}`, { overrides })
      qc.invalidateQueries(['scenarios', phaseId])
    } finally {
      setSaving(false)
    }
  }

  function openScenario(s) {
    setActiveScenario(s)
    setEditName(s.name)
    setEditNotes(s.notes || '')
    const ca = s.scenario_cost_assumptions?.[0] || {}
    const { id, scenario_id, ...rest } = ca
    setOverrides(rest)
  }

  const O = ({ label, field, pct }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" step="any"
          className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm"
          value={overrides[field] ?? ''}
          onChange={e => setOverrides(p => ({ ...p, [field]: parseFloat(e.target.value) || null }))}
          placeholder="—"
        />
        {pct && <span className="text-xs text-gray-400">%</span>}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/')} className="hover:text-gray-900">Portfolio</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => navigate(`/project/${projectId}`)} className="hover:text-gray-900">{project?.name}</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">{phase?.name} — Scenarios</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Scenarios</h1>
        <div className="flex gap-2">
          {scenarios.length >= 2 && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${projectId}/phase/${phaseId}/scenarios/compare`)}>
              <TrendingUp className="w-4 h-4" /> Compare
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${projectId}/phase/${phaseId}/sensitivity`)}>
            <BarChart2 className="w-4 h-4" /> Sensitivity
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Scenario</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>
      ) : scenarios.length === 0 ? (
        <EmptyState icon={BarChart2} title="No scenarios yet" description="Create a Base Case to start comparing options."
          action={<Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Scenario</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(s => {
            const res = s.scenario_results?.[0]?.results
            const margin = res?.profitMarginPct
            return (
              <Card key={s.id} className={cn('cursor-pointer hover:shadow-md transition-shadow', activeScenario?.id === s.id && 'ring-2 ring-brand-500')}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="relative flex-shrink-0 mt-0.5">
                        <button
                          className="w-3.5 h-3.5 rounded-full ring-1 ring-offset-1 ring-gray-300 hover:ring-gray-500 transition-all"
                          style={{ background: s.colour_tag }}
                          title="Change colour"
                          onClick={e => { e.stopPropagation(); setColourPickerId(colourPickerId === s.id ? null : s.id) }}
                        />
                        {colourPickerId === s.id && (
                          <div className="absolute left-0 top-5 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1.5">
                            {COLORS.map(c => (
                              <button key={c} onClick={e => { e.stopPropagation(); updateColour(s.id, c) }}
                                className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110', c === s.colour_tag ? 'border-gray-900' : 'border-transparent')}
                                style={{ background: c }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-tight truncate">{s.name}</h3>
                    </div>
                    {s.is_base && <Badge className="bg-amber-100 text-amber-700">Base</Badge>}
                  </div>
                  {res && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-xs text-gray-400">NDV</p><p className="font-medium">{formatRM(res.ndv, true)}</p></div>
                      <div><p className="text-xs text-gray-400">NDP</p><p className="font-medium">{formatRM(res.ndp, true)}</p></div>
                      <div><p className="text-xs text-gray-400">Margin</p><p className={cn('font-bold', marginColor(margin))}>{formatPct(margin)}</p></div>
                      <div><p className="text-xs text-gray-400">GCC</p><p className="font-medium">{formatRM(res.gcc, true)}</p></div>
                    </div>
                  )}
                  {s.notes && <p className="text-xs text-gray-500 italic">{s.notes}</p>}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="secondary" onClick={() => openScenario(s)} className="flex-1 text-xs">Edit</Button>
                    {!s.is_base && (
                      <Button size="sm" variant="ghost" onClick={() => setBase(s.id)} title="Set as base">
                        <Star className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setCloneFrom(s.id); setShowNew(true) }} title="Clone">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {!s.is_base && (
                      <Button size="sm" variant="ghost" onClick={() => deleteScenario(s.id)} title="Delete" className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Scenario edit panel */}
      {activeScenario && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Edit Scenario</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveScenario(null)}>Close</Button>
              <Button size="sm" onClick={saveScenario} disabled={saving}>{saving ? 'Saving…' : 'Save & Calculate'}</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Optional notes about this scenario…"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Override assumptions below — leave blank to inherit from base phase.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Construction PSF</h4>
              <O label="Residential PSF" field="building_psf_residential" />
              <O label="Affordable PSF" field="building_psf_affordable" />
              <O label="Commercial PSF" field="building_psf_commercial" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Costs</h4>
              <O label="Land Cost PSF" field="land_cost_psf" />
              <O label="Professional Fees %" field="professional_fees_pct" pct />
              <O label="Marketing %" field="marketing_pct" pct />
              <O label="Contingency %" field="contingency_pct" pct />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">GDV Deductions</h4>
              <O label="Bumi Quota %" field="bumi_quota_pct" pct />
              <O label="Bumi Discount %" field="bumi_discount_pct" pct />
              <O label="Early Bird %" field="early_bird_pct" pct />
            </div>
          </div>
        </div>
      )}

      {/* Scenario comparison table */}
      {scenarios.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Comparison</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left font-medium text-gray-500 w-40">Metric</th>
                {scenarios.map(s => (
                  <th key={s.id} className="px-4 py-2.5 text-right font-medium text-gray-700">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.colour_tag }} />
                      {s.name}
                      {s.is_base && <Badge className="bg-amber-100 text-amber-600 ml-1">Base</Badge>}
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
              ].map(({ label, field, fmt, bold, colour }) => {
                const baseRes = scenarios.find(s => s.is_base)?.scenario_results?.[0]?.results
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
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setCloneFrom('') }} title="New Scenario">
        <div className="space-y-4">
          <Input label="Scenario Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Base Case, Optimistic, Conservative" autoFocus />
          {cloneFrom && <p className="text-sm text-brand-600">Cloning from: {scenarios.find(s => s.id === cloneFrom)?.name}</p>}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Colour</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewColour(c)}
                  className={cn('w-6 h-6 rounded-full border-2', newColour === c ? 'border-gray-900' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowNew(false); setCloneFrom('') }}>Cancel</Button>
            <Button onClick={createScenario} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

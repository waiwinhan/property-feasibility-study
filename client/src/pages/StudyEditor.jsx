import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Save, Plus, Trash2, BarChart2, ChevronDown, ChevronUp, Monitor, Calculator } from 'lucide-react'
import { projectsApi, phasesApi, unitTypesApi, costAssumptionsApi, allocationApi } from '../api/projects'
import { cn, formatRM, formatPct, formatPSF, marginColor } from '../lib/utils'
import { useIsMobile } from '../lib/animations'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import apiClient from '../api/client'

const CATEGORIES = ['Residential', 'Affordable', 'Commercial - Serviced Apartment', 'Commercial - Shoplot/Retail']
const CATEGORY_COLORS = { 
  Residential: 'text-blue-600 bg-blue-50', 
  Affordable: 'text-emerald-600 bg-emerald-50', 
  'Commercial - Serviced Apartment': 'text-amber-600 bg-amber-50',
  'Commercial - Shoplot/Retail': 'text-orange-600 bg-orange-50'
 }
const BUMI_APPLICABLE_CATEGORIES = ['Residential', 'Affordable', 'Commercial - Serviced Apartment']

const DEFAULT_CA = {
  building_psf_residential: 300, building_psf_affordable: 200, building_psf_commercial: 180,
  preliminary_pct: 8, contingency_pct: 5, sst_pct: 6,
  land_area_acres: 0, land_cost_psf: 0, land_conversion_prem_pct: 0,
  quit_rent_pa: 0, quit_rent_years: 0, assessment_pa: 0, assessment_years: 0,
  strata_title_per_unit: 5000, planning_fees_per_unit: 1000,
  dev_charges_pct: 1, syabas_pct: 0.25, iwk_jps_pct: 1,
  tnb_per_unit: 1750, tm_fibre_per_unit: 2000, road_drainage_per_acre: 6000,
  school_contrib_lump: 0, isf_lump: 0,
  professional_fees_pct: 6.5, site_admin_pct: 2, marketing_pct: 1,
  finance_rate_pct: 4.55, land_loan_pct: 70, land_loan_years: 4,
  construction_loan_pct: 20, construction_loan_years: 4,
  bumi_discount_pct: 7, bumi_quota_pct: 30, legal_fees_pct: 0.4, early_bird_pct: 9,
  overhead_project_dept_pct: 1.4, overhead_hq_pct: 3, overhead_marketing_pct: 0.5, overhead_corporate_pct: 1,
}

export default function StudyEditor() {
  const { id: projectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMobile = useIsMobile()

  const [selectedPhaseId, setSelectedPhaseId] = useState(searchParams.get('phase') || null)
  const [unitRows, setUnitRows] = useState([])
  const [caForm, setCaForm] = useState(DEFAULT_CA)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [results, setResults] = useState(null)
  const phaseHeaderSaveRef = useRef(null)

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })
  const { data: phases = [] } = useQuery({ queryKey: ['phases', projectId], queryFn: () => phasesApi.list(projectId) })

  // Select first phase if none selected
  useEffect(() => {
    if (!selectedPhaseId && phases.length > 0) setSelectedPhaseId(phases[0].id)
  }, [phases, selectedPhaseId])

  const selectedPhase = phases.find(p => p.id === selectedPhaseId)

  // Load unit types when phase changes
  const { data: unitTypes = [] } = useQuery({
    queryKey: ['unit-types', selectedPhaseId],
    queryFn: () => unitTypesApi.list(selectedPhaseId),
    enabled: !!selectedPhaseId,
  })
  const { data: ca } = useQuery({
    queryKey: ['cost-assumptions', selectedPhaseId],
    queryFn: () => costAssumptionsApi.get(selectedPhaseId),
    enabled: !!selectedPhaseId,
  })

  useEffect(() => { setUnitRows(unitTypes.length > 0 ? unitTypes : [emptyRow()]) }, [unitTypes])
  useEffect(() => { if (ca) setCaForm({ ...DEFAULT_CA, ...ca }); setIsDirty(false) }, [ca])
  useEffect(() => { if (selectedPhase?.financial_results) setResults(selectedPhase.financial_results) }, [selectedPhase])

  function emptyRow() { return { name: '', category: 'Residential', avg_size_sqft: '', unit_count: '', selling_psf: '' } }

  function setUnitRow(idx, field, val) {
    setUnitRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
    setIsDirty(true)
  }
  function addRow() { setUnitRows(prev => [...prev, emptyRow()]); setIsDirty(true) }
  function removeRow(idx) { setUnitRows(prev => prev.filter((_, i) => i !== idx)); setIsDirty(true) }
  function setCaField(field, val) { setCaForm(prev => ({ ...prev, [field]: val })); setIsDirty(true) }

  async function saveAll() {
    if (!selectedPhaseId) return
    setSaving(true)
    try {
      if (phaseHeaderSaveRef.current) await phaseHeaderSaveRef.current()
      const rows = unitRows.filter(r => r.name || r.unit_count || r.avg_size_sqft)
      await unitTypesApi.upsert(selectedPhaseId, rows.map(r => ({
        ...r,
        avg_size_sqft: parseFloat(r.avg_size_sqft) || 0,
        unit_count: parseInt(r.unit_count) || 0,
        selling_psf: parseFloat(r.selling_psf) || 0,
      })))
      await costAssumptionsApi.update(selectedPhaseId, caForm)
      const calcRes = await apiClient.post(`/phases/${selectedPhaseId}/calculate`)
      setResults(calcRes.data)
      qc.invalidateQueries(['phases', projectId])
      setLastSaved(new Date())
      setIsDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(`/project/${projectId}`)} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <span className="font-medium text-gray-900">{project?.name}</span>
          <ChevronRight className="w-3 h-3" />
          <span>Feasibility Study</span>
        </div>
        <div className="flex-1" />
        {isMobile ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-1.5 text-xs">
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            Read-only on mobile — use desktop to edit
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            {saving && <span className="text-gray-400 flex items-center gap-1"><Spinner className="w-3.5 h-3.5" /> Saving…</span>}
            {!saving && lastSaved && <span className="text-gray-400">Saved {lastSaved.toLocaleTimeString()}</span>}
            {isDirty && !saving && <span className="text-amber-500">Unsaved</span>}
            <Button size="sm" onClick={saveAll} disabled={saving}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Phase selector sidebar */}
        <div className="w-48 shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto hidden md:block">
          <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phases</div>
          {phases.map(phase => (
            <button
              key={phase.id}
              onClick={() => { setSelectedPhaseId(phase.id); setIsDirty(false) }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm border-l-2 transition-colors',
                selectedPhaseId === phase.id
                  ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
                  : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <div className="truncate">{phase.name}</div>
              {phase.profit_margin_pct != null && (
                <div className={cn('text-xs', marginColor(phase.profit_margin_pct))}>
                  {formatPct(phase.profit_margin_pct)}
                </div>
              )}
            </button>
          ))}
          {phases.length > 1 && (
            <button
              onClick={() => { setSelectedPhaseId('__total__'); setIsDirty(false) }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm border-l-2 transition-colors border-t border-gray-200 mt-1',
                selectedPhaseId === '__total__'
                  ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
                  : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <div>Total (All Phases)</div>
            </button>
          )}
        </div>

        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPhaseId ? (
            <div className="flex items-center justify-center h-full text-gray-400">Select a phase to begin editing</div>
          ) : selectedPhaseId === '__total__' ? (
            <TotalTab phases={phases} />
          ) : (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Input panel */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <PhaseHeader phase={selectedPhase} readOnly={isMobile} saveRef={phaseHeaderSaveRef} onSave={(data) => phasesApi.update(selectedPhaseId, data).then(() => qc.invalidateQueries(['phases', projectId]))} onLandAreaChange={(val) => setCaField('land_area_acres', parseFloat(val) || 0)} />


                <GDVTab unitRows={unitRows} setUnitRow={setUnitRow} addRow={addRow} removeRow={removeRow} caForm={caForm} setCaField={setCaField} readOnly={isMobile} />
                <div className="my-6 border-t border-gray-200" />
                <CostsTab caForm={caForm} setCaField={setCaField} projectId={projectId} readOnly={isMobile} unitRows={unitRows} />
              </div>

              {/* Financial Summary sidebar */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto">
                <FinancialSummary results={results} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PhaseHeader({ phase, onSave, readOnly, saveRef, onLandAreaChange }) {
  const [devType, setDevType] = useState(phase?.dev_type || '')
  const [launchDate, setLaunchDate] = useState(phase?.launch_date || '')
  const [vpDate, setVpDate] = useState(phase?.vp_date || '')
  const [landArea, setLandArea] = useState(phase?.land_area_acres ?? '')
  const [constructionStart, setConstructionStart] = useState(phase?.construction_start_date || '')
  const [constructionEnd, setConstructionEnd] = useState(phase?.construction_end_date || '')

  function handleLandAreaChange(val) {
    setLandArea(val)
    if (onLandAreaChange) onLandAreaChange(val)
  }

  // Calculate months between two dates
  const calculateMonths = (start, end) => {
    if (!start || !end) return null
    const startDate = new Date(start)
    const endDate = new Date(end)
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
    return months > 0 ? months : 0
  }

  const monthsToDeliver = calculateMonths(launchDate, vpDate)
  const constructionMonths = calculateMonths(constructionStart, constructionEnd)

  // Sync when phase changes
  useEffect(() => {
    setDevType(phase?.dev_type || '')
    setLaunchDate(phase?.launch_date || '')
    setVpDate(phase?.vp_date || '')
    const la = phase?.land_area_acres ?? ''
    setLandArea(la)
    if (onLandAreaChange) onLandAreaChange(la)
    setConstructionStart(phase?.construction_start_date || '')
    setConstructionEnd(phase?.construction_end_date || '')
  }, [phase?.id])

  // Expose save function to parent
  useEffect(() => {
    if (saveRef) {
      saveRef.current = () => onSave({
        dev_type: devType,
        launch_date: launchDate || null,
        vp_date: vpDate || null,
        land_area_acres: parseFloat(landArea) || null,
        construction_start_date: constructionStart || null,
        construction_end_date: constructionEnd || null,
      })
    }
  })

  return (
    <div className="mb-5 pb-4 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{phase?.name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Development Type</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 bg-white"
            value={devType}
            disabled={readOnly}
            onChange={e => setDevType(e.target.value)}
          >
            <option value="">Select type...</option>
            <option value="Residential">Residential</option>
            <option value="Affordable">Affordable</option>
            <option value="Mixed Development">Mixed Development</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Launch Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={launchDate}
            disabled={readOnly}
            onChange={e => setLaunchDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">VP Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={vpDate}
            disabled={readOnly}
            onChange={e => setVpDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Months to Deliver</label>
          <div className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-700">
            {monthsToDeliver !== null ? `${monthsToDeliver} months` : '—'}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Land Area (acres)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="0.00"
            value={landArea}
            disabled={readOnly}
            onChange={e => handleLandAreaChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Construction Start</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={constructionStart}
            disabled={readOnly}
            onChange={e => setConstructionStart(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Construction End</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={constructionEnd}
            disabled={readOnly}
            onChange={e => setConstructionEnd(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Construction Months</label>
          <div className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-700">
            {constructionMonths !== null ? `${constructionMonths} months` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function GDVTab({ unitRows, setUnitRow, addRow, removeRow, caForm, setCaField, readOnly }) {
  const hasBumiApplicableUnits = unitRows.some(row => BUMI_APPLICABLE_CATEGORIES.includes(row.category))

  // Group rows by category
  const rowsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = unitRows.filter((row, idx) => row.category === cat)
    return acc
  }, {})

  // Calculate subtotals for each category
  const calculateSubtotal = (rows) => {
    return rows.reduce((acc, row) => {
      const units = parseInt(row.unit_count) || 0
      const size = parseFloat(row.avg_size_sqft) || 0
      const psf = parseFloat(row.selling_psf) || 0
      acc.units += units
      acc.netArea += units * size
      acc.ndv += units * size * psf
      return acc
    }, { units: 0, netArea: 0, ndv: 0 })
  }

  // Calculate grand total
  const grandTotal = calculateSubtotal(unitRows)
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Section A — Net Development Value</h3>
        {!readOnly && <Button size="sm" variant="secondary" onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add Row</Button>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 min-w-[140px]">Unit Type</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 min-w-[210px]">Category</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-24">Units</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-28">Size (sqft)</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-36">NDV PSF (RM)</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-40">NDV</th>
              <th className="px-2 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {CATEGORIES.map(cat => {
              const catRows = rowsByCategory[cat]
              if (catRows.length === 0) return null
              
              const subtotal = calculateSubtotal(catRows)
              
              return (
                <React.Fragment key={`cat-${cat}`}>
                  {catRows.map((row, idx) => {
                    const rowIndex = unitRows.indexOf(row)
                    const ndv = (parseInt(row.unit_count) || 0) * (parseFloat(row.avg_size_sqft) || 0) * (parseFloat(row.selling_psf) || 0)
                    return (
                      <tr key={`${cat}-${idx}`} className="hover:bg-gray-50 group">
                        <td className="px-3 py-2">
                          <input
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                            value={row.name}
                            disabled={readOnly}
                            onChange={e => setUnitRow(rowIndex, 'name', e.target.value)}
                            placeholder="e.g. 3-Sty Superlink"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full min-w-[200px] bg-transparent border-0 focus:outline-none text-sm disabled:cursor-default truncate"
                            value={row.category}
                            disabled={readOnly}
                            onChange={e => setUnitRow(rowIndex, 'category', e.target.value)}
                            title={row.category}
                          >
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0"
                            className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                            value={row.unit_count} disabled={readOnly} onChange={e => setUnitRow(rowIndex, 'unit_count', e.target.value)} placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="any"
                            className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                            value={row.avg_size_sqft} disabled={readOnly} onChange={e => setUnitRow(rowIndex, 'avg_size_sqft', e.target.value)} placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <span className="text-xs text-gray-400 shrink-0">RM</span>
                            <input type="number" min="0" step="any"
                              className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                              value={row.selling_psf} disabled={readOnly} onChange={e => setUnitRow(rowIndex, 'selling_psf', e.target.value)} placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600 font-medium whitespace-nowrap">
                          {ndv > 0 ? formatRM(ndv) : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {!readOnly && (
                            <button onClick={() => removeRow(rowIndex)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Subtotal row for this category */}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={2} className="px-3 py-2 text-sm font-semibold text-gray-600">{cat} Subtotal</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-gray-700">{subtotal.units.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-gray-700">{subtotal.netArea.toLocaleString()}</td>
                    <td></td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-gray-800 whitespace-nowrap">{formatRM(subtotal.ndv)}</td>
                    <td></td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td colSpan={2} className="px-3 py-2.5 text-sm font-bold text-gray-900">Grand Total</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">{grandTotal.units.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">{grandTotal.netArea.toLocaleString()}</td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900 whitespace-nowrap">{formatRM(grandTotal.ndv)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* GDV Deductions */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 border-b border-gray-200">GDV Deductions</div>
        <div className="px-4 py-1">
          {[
            ...hasBumiApplicableUnits ? [
              { label: 'Bumi Quota %', field: 'bumi_quota_pct' },
              { label: 'Bumi Discount %', field: 'bumi_discount_pct' },
            ] : [],
            { label: 'Legal Fees %', field: 'legal_fees_pct' },
            { label: 'Discount / Rebate %', field: 'early_bird_pct' },
          ].map(({ label, field }) => (
            <div key={field} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <label className="text-sm text-gray-600">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number" step="any"
                  className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                  value={caForm?.[field] ?? ''}
                  disabled={readOnly}
                  onChange={e => setCaField(field, parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CostsTab({ caForm, setCaField, projectId, readOnly, unitRows = [] }) {
  const [expanded, setExpanded] = useState({
    building: true, land: true, statutory: false, authority: false, professional: false, finance: false, overheads: false,
  })

  // Compute net saleable area per category from Section A
  const calcArea = (catFilter) => unitRows.reduce((sum, r) => {
    if (catFilter(r.category)) sum += (parseInt(r.unit_count) || 0) * (parseFloat(r.avg_size_sqft) || 0)
    return sum
  }, 0)
  const residentialArea = calcArea(c => c === 'Residential')
  const affordableArea  = calcArea(c => c === 'Affordable')
  const commercialArea  = calcArea(c => c.startsWith('Commercial'))
  const { data: pools = [] } = useQuery({
    queryKey: ['allocation', projectId],
    queryFn: () => allocationApi.get(projectId),
    enabled: !!projectId,
  })
  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  // Construction cost calculations (mirrors server calcGCC logic)
  const totalBuildingCost = residentialArea * (caForm.building_psf_residential || 0)
                          + affordableArea  * (caForm.building_psf_affordable  || 0)
                          + commercialArea  * (caForm.building_psf_commercial  || 0)
  const infrastructureCost = pools.reduce((s, p) => s + (p.pool_total || 0), 0)
  const subtotalBC         = totalBuildingCost + infrastructureCost
  const prelimAmount       = subtotalBC * ((caForm.preliminary_pct || 0) / 100)
  const contingencyAmount  = (subtotalBC + prelimAmount) * ((caForm.contingency_pct || 0) / 100)
  const sstAmount          = commercialArea * (caForm.building_psf_commercial || 0) * ((caForm.sst_pct || 0) / 100)
  const totalConstructionCost = totalBuildingCost + infrastructureCost + prelimAmount + contingencyAmount + sstAmount
  const totalArea          = residentialArea + affordableArea + commercialArea
  const tccPsf             = totalArea > 0 ? totalConstructionCost / totalArea : 0

  const N = ({ label, field, pct, decimals = 2 }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number" step="any"
          className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
          value={caForm[field] ?? ''}
          disabled={readOnly}
          onChange={e => setCaField(field, parseFloat(e.target.value) || 0)}
        />
        {pct && <span className="text-xs text-gray-400">%</span>}
      </div>
    </div>
  )

  const Section = ({ title, skey, children }) => (
    <div className="rounded-lg border border-gray-200 overflow-hidden mb-3">
      <button
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
        onClick={() => toggle(skey)}
      >
        {title}
        {expanded[skey] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded[skey] && <div className="px-4 py-1">{children}</div>}
    </div>
  )

  const [poolsExpanded, setPoolsExpanded] = useState(true)

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Section B — Gross Development Cost</h3>

      {/* Infrastructure / Cost Pool Summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 mb-4">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          onClick={() => setPoolsExpanded(v => !v)}
        >
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Infrastructure Cost Pools</span>
          <div className="flex items-center gap-3">
            <Link
              to={`/project/${projectId}/cost-allocation`}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              onClick={e => e.stopPropagation()}
            >
              Edit allocation →
            </Link>
            {poolsExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        {poolsExpanded && (
          <div className="px-4 pb-3">
            {pools.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No pools defined. <Link to={`/project/${projectId}/cost-allocation`} className="text-brand-600 hover:underline">Set up cost allocation</Link>.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {pools.map(pool => (
                  <div key={pool.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-700">{pool.name}</span>
                    <span className="font-medium text-gray-900">{formatRM(pool.pool_total)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1.5 text-sm font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">{formatRM(pools.reduce((s, p) => s + (p.pool_total || 0), 0), true)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Section title="Total Construction Cost" skey="building">
        <div className="-mx-4 mb-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium text-gray-500">Item</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Size (sqft)</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Rate</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">RM Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Building cost per category */}
              {[
                { label: 'Residential', field: 'building_psf_residential', area: residentialArea },
                { label: 'Affordable',  field: 'building_psf_affordable',  area: affordableArea },
                { label: 'Commercial',  field: 'building_psf_commercial',  area: commercialArea },
              ].map(({ label, field, area }) => {
                const psf = caForm[field] || 0
                const total = area * psf
                return (
                  <tr key={label} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-600">{label}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{area > 0 ? area.toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">RM</span>
                        <input type="number" step="any" min="0"
                          className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                          value={caForm[field] ?? ''} disabled={readOnly}
                          onChange={e => setCaField(field, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                      {total > 0 ? formatRM(total) : '—'}
                    </td>
                  </tr>
                )
              })}

              {/* Total Building Cost subtotal */}
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                <td className="px-4 py-2 text-gray-700">Total Building Cost</td>
                <td className="px-4 py-2 text-right text-gray-600">{totalArea > 0 ? totalArea.toLocaleString() : '—'}</td>
                <td></td>
                <td className="px-4 py-2 text-right text-gray-900 whitespace-nowrap">{formatRM(totalBuildingCost)}</td>
              </tr>

              {/* Infrastructure cost pools */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-600">Infrastructure Cost Pools</td>
                <td></td>
                <td></td>
                <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                  {infrastructureCost > 0 ? formatRM(infrastructureCost) : '—'}
                </td>
              </tr>

              {/* Preliminary */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-600">Preliminary</td>
                <td></td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input type="number" step="any"
                      className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                      value={caForm.preliminary_pct ?? ''} disabled={readOnly}
                      onChange={e => setCaField('preliminary_pct', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                  {prelimAmount > 0 ? formatRM(prelimAmount) : '—'}
                </td>
              </tr>

              {/* Contingency */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-600">Contingency</td>
                <td></td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input type="number" step="any"
                      className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                      value={caForm.contingency_pct ?? ''} disabled={readOnly}
                      onChange={e => setCaField('contingency_pct', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                  {contingencyAmount > 0 ? formatRM(contingencyAmount) : '—'}
                </td>
              </tr>

              {/* SST */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-600">SST (Commercial)</td>
                <td></td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input type="number" step="any"
                      className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                      value={caForm.sst_pct ?? ''} disabled={readOnly}
                      onChange={e => setCaField('sst_pct', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                  {sstAmount > 0 ? formatRM(sstAmount) : '—'}
                </td>
              </tr>

              {/* Total Construction Cost */}
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-2.5 font-bold text-blue-900">Total Construction Cost</td>
                <td></td>
                <td></td>
                <td className="px-4 py-2.5 text-right font-bold text-blue-900 whitespace-nowrap">{formatRM(totalConstructionCost)}</td>
              </tr>

              {/* TCC PSF */}
              <tr className="bg-gray-50 border-t border-gray-200">
                <td className="px-4 py-2 font-medium text-gray-700">TCC PSF (RM)</td>
                <td className="px-4 py-2 text-right text-xs text-gray-400">{totalArea > 0 ? `${totalArea.toLocaleString()} sqft` : ''}</td>
                <td></td>
                <td className="px-4 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                  {tccPsf > 0 ? formatPSF(tccPsf) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Land & Other Costs" skey="land">
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <label className="text-sm text-gray-600">Land Area (acres)</label>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-1 min-w-[7rem] text-right justify-end">
            {caForm.land_area_acres > 0 ? caForm.land_area_acres : '—'}
          </div>
        </div>
        <N label="Land Cost PSF" field="land_cost_psf" />
        <N label="Conversion Premium %" field="land_conversion_prem_pct" pct />
        <N label="Quit Rent (RM/yr)" field="quit_rent_pa" />
        <N label="Quit Rent Years" field="quit_rent_years" />
        <N label="Assessment (RM/yr)" field="assessment_pa" />
        <N label="Assessment Years" field="assessment_years" />
      </Section>

      <Section title="Statutory Fees" skey="statutory">
        <N label="Strata Title / unit" field="strata_title_per_unit" />
        <N label="Planning Fees / unit" field="planning_fees_per_unit" />
      </Section>

      <Section title="Authority Contributions" skey="authority">
        <N label="Dev Charges %" field="dev_charges_pct" pct />
        <N label="SYABAS %" field="syabas_pct" pct />
        <N label="IWK & JPS %" field="iwk_jps_pct" pct />
        <N label="TNB / unit" field="tnb_per_unit" />
        <N label="TM Fibre / unit" field="tm_fibre_per_unit" />
        <N label="Road & Drainage / acre" field="road_drainage_per_acre" />
        <N label="School Contribution (lump)" field="school_contrib_lump" />
        <N label="ISF (lump)" field="isf_lump" />
      </Section>

      <Section title="Professional & Marketing Fees" skey="professional">
        <N label="Professional Fees %" field="professional_fees_pct" pct />
        <N label="Site Admin %" field="site_admin_pct" pct />
        <N label="Marketing %" field="marketing_pct" pct />
      </Section>

      <Section title="Finance Charges" skey="finance">
        <N label="Finance Rate %" field="finance_rate_pct" pct />
        <N label="Land Loan %" field="land_loan_pct" pct />
        <N label="Land Loan Years" field="land_loan_years" />
        <N label="Construction Loan %" field="construction_loan_pct" pct />
        <N label="Construction Loan Years" field="construction_loan_years" />
      </Section>

      <Section title="Overheads" skey="overheads">
        <N label="Project Dept %" field="overhead_project_dept_pct" pct />
        <N label="Head Office %" field="overhead_hq_pct" pct />
        <N label="Marketing Dept %" field="overhead_marketing_pct" pct />
        <N label="Corporate %" field="overhead_corporate_pct" pct />
      </Section>
    </div>
  )
}

function TotalTab({ phases }) {
  const HURDLE = 15
  const active = phases.filter(p => p.is_active !== false)

  const totals = active.reduce((acc, p) => {
    acc.gdv += p.total_gdv || 0
    acc.ndv += p.total_ndv || 0
    acc.gcc += p.total_gcc || 0
    acc.ndp += p.total_ndp || 0
    acc.units += p.unit_count || 0
    return acc
  }, { gdv: 0, ndv: 0, gcc: 0, ndp: 0, units: 0 })

  const blendedMargin = totals.ndv > 0 ? (totals.ndp / totals.ndv) * 100 : null

  const kpis = [
    { label: 'Total GDV', value: formatRM(totals.gdv) },
    { label: 'Total NDV', value: formatRM(totals.ndv) },
    { label: 'Total GCC', value: formatRM(totals.gcc) },
    { label: 'Total NDP', value: formatRM(totals.ndp) },
    { label: 'Blended Margin', value: formatPct(blendedMargin), color: marginColor(blendedMargin) },
    { label: 'Total Units', value: totals.units },
  ]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Total — All Active Phases</h2>
        <p className="text-sm text-gray-500">{active.length} phase{active.length !== 1 ? 's' : ''} included</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={cn('text-lg font-bold', color || 'text-gray-900')}>{value ?? '—'}</div>
          </div>
        ))}
      </div>

      {blendedMargin != null && (
        <div className={cn(
          'rounded-xl p-4 border-l-4 text-sm font-medium',
          blendedMargin >= HURDLE
            ? 'bg-green-50 border-green-500 text-green-800'
            : blendedMargin >= HURDLE - 3
              ? 'bg-amber-50 border-amber-500 text-amber-800'
              : 'bg-red-50 border-red-500 text-red-800'
        )}>
          Blended margin {formatPct(blendedMargin)} is {blendedMargin >= HURDLE ? 'above' : 'below'} the {HURDLE}% hurdle rate
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Phase Breakdown</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500">Phase</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">Units</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">GDV</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">NDV</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">GCC</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">NDP</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {active.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{p.unit_count ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_gdv)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_ndv)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_gcc)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatRM(p.total_ndp)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn('font-semibold', marginColor(p.profit_margin_pct))}>{formatPct(p.profit_margin_pct)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td className="px-4 py-2.5 text-gray-900">Total</td>
              <td className="px-4 py-2.5 text-right">{totals.units}</td>
              <td className="px-4 py-2.5 text-right">{formatRM(totals.gdv)}</td>
              <td className="px-4 py-2.5 text-right">{formatRM(totals.ndv)}</td>
              <td className="px-4 py-2.5 text-right">{formatRM(totals.gcc)}</td>
              <td className="px-4 py-2.5 text-right font-bold">{formatRM(totals.ndp)}</td>
              <td className="px-4 py-2.5 text-right">
                <span className={cn('font-bold text-base', marginColor(blendedMargin))}>{formatPct(blendedMargin)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function FinancialSummary({ results }) {
  if (!results) return (
    <div className="p-6 text-center text-gray-400 text-sm">
      <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>Enter data and save to see results</p>
    </div>
  )

  const r = results
  const margin = r.profitMarginPct

  const rows = [
    { label: 'GDV', value: r.gdv, highlight: false },
    { label: 'Bumi Deduction', value: r.ndvResult?.bumiDeduction, neg: true },
    { label: 'Legal Fees', value: r.ndvResult?.legalFees, neg: true },
    { label: 'Discount / Rebate', value: r.ndvResult?.earlyBird, neg: true },
    { label: 'NDV', value: r.ndv, highlight: true, bold: true, divider: true },
    { label: 'Land Cost', value: r.landResult?.totalLand, neg: true },
    { label: 'GCC', value: r.gcc, neg: true },
    { label: 'Statutory', value: r.statutory?.total, neg: true },
    { label: 'Authority', value: r.authority?.total, neg: true },
    { label: 'Professional', value: r.professional?.total, neg: true },
    { label: 'Marketing', value: r.marketing?.total, neg: true },
    { label: 'Finance', value: r.finance?.total, neg: true },
    { label: 'Overheads', value: r.overheads?.total, neg: true },
    { label: 'Total GDC', value: r.totalGDC, neg: true, bold: true, divider: true },
    { label: 'NDP', value: r.ndp, highlight: true, bold: true, divider: true },
  ]

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h3>

      {/* Key KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'NDV', value: formatRM(r.ndv) },
          { label: 'NDP', value: formatRM(r.ndp) },
          { label: 'Margin', value: formatPct(margin), color: marginColor(margin) },
          { label: 'Const PSF', value: formatPSF(r.constPsf) },
          { label: 'Units', value: r.totalUnits },
          { label: 'Net PSF', value: formatPSF(r.netSellingPsf) },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg p-2 border border-gray-100">
            <div className="text-xs text-gray-400">{label}</div>
            <div className={cn('text-sm font-bold', color || 'text-gray-900')}>{value}</div>
          </div>
        ))}
      </div>

      {/* Waterfall table */}
      <div className="space-y-0.5">
        {rows.map(({ label, value, highlight, bold, neg, divider }) => (
          <div key={label} className={cn('flex justify-between text-xs py-1', divider && 'border-t border-gray-200 mt-1 pt-1.5')}>
            <span className={cn(bold ? 'font-semibold text-gray-800' : 'text-gray-500')}>{label}</span>
            <span className={cn(
              bold ? 'font-bold' : 'font-medium',
              highlight ? (margin >= 15 ? 'text-green-600' : margin >= 12 ? 'text-amber-500' : 'text-red-600') : neg ? 'text-gray-600' : 'text-gray-900'
            )}>
              {value != null ? formatRM(value) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
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

const TABS = ['GDV', 'Costs']
const CATEGORIES = ['Residential', 'Affordable', 'Commercial']
const CATEGORY_COLORS = { Residential: 'text-blue-600 bg-blue-50', Affordable: 'text-emerald-600 bg-emerald-50', Commercial: 'text-amber-600 bg-amber-50' }

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

  const [activeTab, setActiveTab] = useState('GDV')
  const [selectedPhaseId, setSelectedPhaseId] = useState(searchParams.get('phase') || null)
  const [unitRows, setUnitRows] = useState([])
  const [caForm, setCaForm] = useState(DEFAULT_CA)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [results, setResults] = useState(null)
  const autoSaveTimer = useRef(null)

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
    triggerAutoSave()
  }
  function addRow() { setUnitRows(prev => [...prev, emptyRow()]); setIsDirty(true) }
  function removeRow(idx) { setUnitRows(prev => prev.filter((_, i) => i !== idx)); triggerAutoSave() }
  function setCaField(field, val) { setCaForm(prev => ({ ...prev, [field]: val })); triggerAutoSave() }

  function triggerAutoSave() {
    setIsDirty(true)
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(saveAll, 2000)
  }

  async function saveAll() {
    if (!selectedPhaseId) return
    setSaving(true)
    try {
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
          <span>Study Editor</span>
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
                <PhaseHeader phase={selectedPhase} readOnly={isMobile} onSave={(data) => phasesApi.update(selectedPhaseId, data).then(() => qc.invalidateQueries(['phases', projectId]))} />


                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                  {TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                        activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'GDV' && (
                  <GDVTab unitRows={unitRows} setUnitRow={setUnitRow} addRow={addRow} removeRow={removeRow} caForm={caForm} setCaField={setCaField} readOnly={isMobile} />
                )}
                {activeTab === 'Costs' && (
                  <CostsTab caForm={caForm} setCaField={setCaField} projectId={projectId} readOnly={isMobile} />
                )}
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

function PhaseHeader({ phase, onSave, readOnly }) {
  const [devType, setDevType] = useState(phase?.dev_type || '')
  const [launchDate, setLaunchDate] = useState(phase?.launch_date || '')
  const [landArea, setLandArea] = useState(phase?.land_area_acres ?? '')
  const timer = useRef(null)

  // Sync when phase changes
  useEffect(() => {
    setDevType(phase?.dev_type || '')
    setLaunchDate(phase?.launch_date || '')
    setLandArea(phase?.land_area_acres ?? '')
  }, [phase?.id])

  function schedule(updates) {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSave(updates), 800)
  }

  return (
    <div className="mb-5 pb-4 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{phase?.name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Dev Type</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="e.g. 2-Storey Superlink"
            value={devType}
            disabled={readOnly}
            onChange={e => { setDevType(e.target.value); schedule({ dev_type: e.target.value }) }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Launch Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={launchDate}
            disabled={readOnly}
            onChange={e => { setLaunchDate(e.target.value); schedule({ launch_date: e.target.value || null }) }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Land Area (acres)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="0.00"
            value={landArea}
            disabled={readOnly}
            onChange={e => { setLandArea(e.target.value); schedule({ land_area_acres: parseFloat(e.target.value) || null }) }}
          />
        </div>
      </div>
    </div>
  )
}

function GDVTab({ unitRows, setUnitRow, addRow, removeRow, caForm, setCaField, readOnly }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Section A — Gross Development Value</h3>
        {!readOnly && <Button size="sm" variant="secondary" onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add Row</Button>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-40">Unit Type</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-32">Category</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-24">Units</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-28">Size (sqft)</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-32">Selling PSF (RM)</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-32">GDV</th>
              <th className="px-2 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {unitRows.map((row, idx) => {
              const gdv = (parseInt(row.unit_count) || 0) * (parseFloat(row.avg_size_sqft) || 0) * (parseFloat(row.selling_psf) || 0)
              return (
                <tr key={idx} className="hover:bg-gray-50 group">
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                      value={row.name}
                      disabled={readOnly}
                      onChange={e => setUnitRow(idx, 'name', e.target.value)}
                      placeholder="e.g. 3-Sty Superlink"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full bg-transparent border-0 focus:outline-none text-sm disabled:cursor-default"
                      value={row.category}
                      disabled={readOnly}
                      onChange={e => setUnitRow(idx, 'category', e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0"
                      className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                      value={row.unit_count} disabled={readOnly} onChange={e => setUnitRow(idx, 'unit_count', e.target.value)} placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="any"
                      className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                      value={row.avg_size_sqft} disabled={readOnly} onChange={e => setUnitRow(idx, 'avg_size_sqft', e.target.value)} placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-xs text-gray-400 shrink-0">RM</span>
                      <input type="number" min="0" step="any"
                        className="w-full bg-transparent border-0 focus:outline-none text-right focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:cursor-default"
                        value={row.selling_psf} disabled={readOnly} onChange={e => setUnitRow(idx, 'selling_psf', e.target.value)} placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 font-medium">
                    {gdv > 0 ? formatRM(gdv, true) : '—'}
                  </td>
                  <td className="px-2 py-2">
                    {!readOnly && (
                      <button onClick={() => removeRow(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td colSpan={2} className="px-3 py-2.5 text-sm font-semibold text-gray-700">Total</td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold">
                {unitRows.reduce((s, r) => s + (parseInt(r.unit_count) || 0), 0)}
              </td>
              <td colSpan={2}></td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">
                {formatRM(unitRows.reduce((s, r) =>
                  s + (parseInt(r.unit_count) || 0) * (parseFloat(r.avg_size_sqft) || 0) * (parseFloat(r.selling_psf) || 0), 0
                ), true)}
              </td>
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
            { label: 'Bumi Quota %', field: 'bumi_quota_pct' },
            { label: 'Bumi Discount %', field: 'bumi_discount_pct' },
            { label: 'Legal Fees %', field: 'legal_fees_pct' },
            { label: 'Early Bird Discount %', field: 'early_bird_pct' },
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

function CostsTab({ caForm, setCaField, projectId, readOnly }) {
  const [expanded, setExpanded] = useState({
    building: true, land: true, statutory: false, authority: false, professional: false, finance: false, overheads: false,
  })
  const { data: pools = [] } = useQuery({
    queryKey: ['allocation', projectId],
    queryFn: () => allocationApi.get(projectId),
    enabled: !!projectId,
  })
  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

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

  return (
    <div className="space-y-1 max-w-xl">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Section B — Gross Development Cost</h3>

      {/* Infrastructure / Cost Pool Summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Infrastructure Cost Pools</span>
          <Link to={`/project/${projectId}/cost-allocation`} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
            Edit allocation →
          </Link>
        </div>
        {pools.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No pools defined. <Link to={`/project/${projectId}/cost-allocation`} className="text-brand-600 hover:underline">Set up cost allocation</Link>.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {pools.map(pool => (
              <div key={pool.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-gray-700">{pool.name}</span>
                <span className="font-medium text-gray-900">{formatRM(pool.pool_total, true)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5 text-sm font-semibold">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900">{formatRM(pools.reduce((s, p) => s + (p.pool_total || 0), 0), true)}</span>
            </div>
          </div>
        )}
      </div>

      <Section title="Building PSF" skey="building">
        <N label="Residential PSF" field="building_psf_residential" />
        <N label="Affordable PSF" field="building_psf_affordable" />
        <N label="Commercial PSF" field="building_psf_commercial" />
        <N label="Preliminary %" field="preliminary_pct" pct />
        <N label="Contingency %" field="contingency_pct" pct />
        <N label="SST % (Commercial)" field="sst_pct" pct />
      </Section>

      <Section title="Land & Other Costs" skey="land">
        <N label="Land Area (acres)" field="land_area_acres" />
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
    { label: 'Total GDV', value: formatRM(totals.gdv, true) },
    { label: 'Total NDV', value: formatRM(totals.ndv, true) },
    { label: 'Total GCC', value: formatRM(totals.gcc, true) },
    { label: 'Total NDP', value: formatRM(totals.ndp, true) },
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
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_gdv, true)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_ndv, true)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatRM(p.total_gcc, true)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatRM(p.total_ndp, true)}</td>
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
              <td className="px-4 py-2.5 text-right">{formatRM(totals.gdv, true)}</td>
              <td className="px-4 py-2.5 text-right">{formatRM(totals.ndv, true)}</td>
              <td className="px-4 py-2.5 text-right">{formatRM(totals.gcc, true)}</td>
              <td className="px-4 py-2.5 text-right font-bold">{formatRM(totals.ndp, true)}</td>
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
    { label: 'Early Bird', value: r.ndvResult?.earlyBird, neg: true },
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
          { label: 'NDV', value: formatRM(r.ndv, true) },
          { label: 'NDP', value: formatRM(r.ndp, true) },
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
              {value != null ? formatRM(value, true) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

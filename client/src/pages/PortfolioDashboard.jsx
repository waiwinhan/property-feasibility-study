import { useState } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, TrendingUp, DollarSign, BarChart2, Search, Upload, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { projectsApi, phasesApi } from '../api/projects'
import { formatRM, formatPct, statusColor, marginColor, cn } from '../lib/utils'
import { useCountUp } from '../lib/animations'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import ImportModal from '../components/ImportModal'

const STATUS_TABS = ['All', 'Active', 'On Hold', 'Completed', 'Archived']
const SORT_OPTIONS = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'ndp', label: 'NDP ↓' },
  { value: 'margin', label: 'Margin % ↓' },
]
const HURDLE = 15

export default function PortfolioDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('updated')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmPermanentId, setConfirmPermanentId] = useState(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const { data: deletedProjects = [] } = useQuery({
    queryKey: ['projects-deleted'],
    queryFn: projectsApi.listDeleted,
    enabled: showDeleted,
  })

  const createMut = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (proj) => {
      qc.invalidateQueries(['projects'])
      setShowNew(false)
      setNewName('')
      navigate(`/project/${proj.id}`)
    },
  })

  const deleteMut = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['projects']); qc.invalidateQueries(['projects-deleted']); setConfirmDeleteId(null) },
  })

  const restoreMut = useMutation({
    mutationFn: projectsApi.restore,
    onSuccess: () => { qc.invalidateQueries(['projects']); qc.invalidateQueries(['projects-deleted']) },
  })

  const permanentDeleteMut = useMutation({
    mutationFn: projectsApi.permanentDelete,
    onSuccess: () => { qc.invalidateQueries(['projects-deleted']); setConfirmPermanentId(null) },
  })

  const filtered = projects
    .filter(p => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'ndp') return (b.total_ndp || 0) - (a.total_ndp || 0)
      if (sort === 'margin') return (b.profit_margin_pct || 0) - (a.profit_margin_pct || 0)
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    })

  const active = projects.filter(p => p.status === 'Active')

  // Fetch phases for all active projects to build cross-project Gantt
  const phaseQueries = useQueries({
    queries: active.map(p => ({
      queryKey: ['phases', p.id],
      queryFn: () => phasesApi.list(p.id),
    })),
  })
  const ganttData = (() => {
    const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44
    const rows = active
      .map((p, i) => {
        const phases = phaseQueries[i]?.data || []
        const dated = phases.filter(ph => ph.launch_date).sort((a, b) => new Date(a.launch_date) - new Date(b.launch_date))
        if (dated.length === 0) return null
        return {
          name: p.name.length > 22 ? p.name.slice(0, 22) + '…' : p.name,
          earliest: new Date(dated[0].launch_date),
          latest: new Date(dated[dated.length - 1].launch_date),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.earliest - b.earliest)
    if (rows.length < 2) return []
    const t0 = rows[0].earliest.getTime()
    return rows.map(r => ({
      name: r.name,
      spacer: Math.round((r.earliest.getTime() - t0) / MS_MONTH),
      bar: Math.max(1, Math.round((r.latest.getTime() - r.earliest.getTime()) / MS_MONTH) + 1),
      startLabel: r.earliest.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }),
    }))
  })()

  const totalGDV = active.reduce((s, p) => s + (p.total_gdv || 0), 0)
  const totalNDP = active.reduce((s, p) => s + (p.total_ndp || 0), 0)
  const totalNDV = active.reduce((s, p) => s + (p.total_ndv || 0), 0)
  const blendedMargin = totalNDV > 0 ? (totalNDP / totalNDV) * 100 : null

  const animGdv = useCountUp(totalGDV)
  const animNdp = useCountUp(totalNDP)
  const animMargin = useCountUp(blendedMargin ?? 0)
  const animActive = useCountUp(active.length)

  const chartData = active
    .filter(p => p.total_ndv > 0)
    .map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, margin: +(p.profit_margin_pct || 0).toFixed(1) }))
    .sort((a, b) => b.margin - a.margin)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}><Upload className="w-4 h-4" /> Import</Button>
          <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Project</Button>
        </div>
      </div>

      {/* KPI Summary */}
      {active.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total GDV', value: formatRM(animGdv, true), icon: DollarSign },
            { label: 'Total NDP', value: formatRM(animNdp, true), icon: TrendingUp },
            { label: 'Blended Margin', value: formatPct(animMargin), icon: BarChart2, margin: blendedMargin },
            { label: 'Active Projects', value: Math.round(animActive), icon: FolderOpen },
          ].map(({ label, value, icon: Icon, margin }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-3 py-3">
                <div className="p-2 bg-brand-50 rounded-lg"><Icon className="w-4 h-4 text-brand-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={cn('text-lg font-bold', margin != null ? marginColor(margin) : 'text-gray-900')}>{value}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* NDP Margin Comparison Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">NDP Margin by Project (Active)</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Margin']} />
                <ReferenceLine x={HURDLE} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${HURDLE}%`, position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.margin >= HURDLE ? '#22c55e' : entry.margin >= HURDLE - 3 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Cross-Project Launch Timeline */}
      {ganttData.length >= 2 && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">Cross-Project Launch Timeline</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={Math.max(100, ganttData.length * 44)}>
              <BarChart data={ganttData} layout="vertical" margin={{ top: 4, right: 120, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `M${v}`} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={170} />
                <Tooltip
                  formatter={(v, name, props) => name === 'spacer' ? null : [`${v} month span`, props.payload.name]}
                  labelFormatter={l => l}
                />
                <Bar dataKey="spacer" stackId="g" fill="transparent" stroke="none" />
                <Bar dataKey="bar" stackId="g" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18}
                  label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v, entry) => entry?.payload?.startLabel || '' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setStatusFilter(tab)}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen}
          title={projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          description={projects.length === 0 ? 'Create your first feasibility study project.' : 'Try a different filter.'}
          action={projects.length === 0 && <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Project</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/project/${project.id}`)}
              onDelete={() => setConfirmDeleteId(project.id)}
            />
          ))}
        </div>
      )}

      {/* Deleted Projects */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDeleted(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-600 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gray-400" />
            Deleted Projects
            {deletedProjects.length > 0 && (
              <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-0.5">{deletedProjects.length}</span>
            )}
          </span>
          {showDeleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDeleted && (
          <div className="divide-y divide-gray-100">
            {deletedProjects.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400 italic">No deleted projects.</p>
            ) : (
              deletedProjects.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      Deleted {new Date(p.deleted_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restoreMut.mutate(p.id)}
                      disabled={restoreMut.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 border border-brand-200 hover:border-brand-400 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button
                      onClick={() => setConfirmPermanentId(p.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors"
                      title="Delete forever"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Project">
        <form onSubmit={e => { e.preventDefault(); if (newName.trim()) createMut.mutate({ name: newName.trim() }) }} className="space-y-4">
          <Input label="Project Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Taman Wai Residence" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" disabled={!newName.trim() || createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create Project'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmPermanentId} onClose={() => setConfirmPermanentId(null)} title="Delete Forever">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Permanently delete <strong>{deletedProjects.find(p => p.id === confirmPermanentId)?.name}</strong>? This cannot be undone — all phases, unit types, and cost data will be lost.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmPermanentId(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => permanentDeleteMut.mutate(confirmPermanentId)}
              disabled={permanentDeleteMut.isPending}
            >
              {permanentDeleteMut.isPending ? 'Deleting…' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Project">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Move <strong>{projects.find(p => p.id === confirmDeleteId)?.name}</strong> to deleted projects? You can restore it later.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMut.mutate(confirmDeleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ProjectCard({ project, onClick, onDelete }) {
  const margin = project.profit_margin_pct
  return (
    <Card className="hover:shadow-md hover:border-brand-200 transition-all group">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2 cursor-pointer" onClick={onClick}>{project.name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={statusColor(project.status)}>{project.status}</Badge>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm cursor-pointer" onClick={onClick}>
          <div><p className="text-gray-500 text-xs">GDV</p><p className="font-medium">{formatRM(project.total_gdv, true)}</p></div>
          <div><p className="text-gray-500 text-xs">NDP</p><p className="font-medium">{formatRM(project.total_ndp, true)}</p></div>
          <div><p className="text-gray-500 text-xs">Margin</p><p className={cn('font-semibold', marginColor(margin))}>{formatPct(margin)}</p></div>
          <div><p className="text-gray-500 text-xs">Phases</p><p className="font-medium">{project.phase_count || 0}</p></div>
        </div>
        {project.updated_at && (
          <p className="text-xs text-gray-400 cursor-pointer" onClick={onClick}>Updated {new Date(project.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        )}
      </CardBody>
    </Card>
  )
}

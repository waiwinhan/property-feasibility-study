import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronRight, Settings2, BarChart2, FileText, ArrowLeft, MoreVertical, GripVertical, Pencil, Copy, Trash2, EyeOff, Eye } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { projectsApi, phasesApi } from '../api/projects'
import { formatRM, formatPct, marginColor, cn } from '../lib/utils'
import Button from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import Input from '../components/ui/Input'

const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed', 'Archived']

export default function ProjectOverview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [phaseName, setPhaseName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef(null)

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
  })
  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: ['phases', id],
    queryFn: () => phasesApi.list(id),
  })

  const updateProject = useMutation({
    mutationFn: (data) => projectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries(['project', id]),
  })
  const addPhase = useMutation({
    mutationFn: (data) => phasesApi.create(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['phases', id])
      setShowAddPhase(false)
      setPhaseName('')
    },
  })
  const reorderPhases = useMutation({
    mutationFn: (order) => phasesApi.reorder(id, order),
    onSuccess: () => qc.invalidateQueries(['phases', id]),
  })
  const cloneProject = useMutation({
    mutationFn: () => projectsApi.clone(id),
    onSuccess: (newProject) => navigate(`/project/${newProject.id}`),
  })

  function onDragEnd(result) {
    if (!result.destination) return
    const items = Array.from(phases)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    reorderPhases.mutate(items.map(p => p.id))
  }

  function startEditName() {
    setNameInput(project.name)
    setEditingName(true)
    setTimeout(() => { nameInputRef.current?.select() }, 0)
  }

  function saveNameEdit() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== project.name) updateProject.mutate({ name: trimmed })
    setEditingName(false)
  }

  if (loadingProject) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
  if (!project) return <div className="text-center py-20 text-gray-500">Project not found.</div>

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/')} className="hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Portfolio
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 group/name">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={saveNameEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveNameEdit(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-brand-500 focus:outline-none bg-transparent w-full max-w-lg"
                autoFocus
              />
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <button
                  onClick={startEditName}
                  className="opacity-0 group-hover/name:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-all rounded"
                  title="Rename project"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={project.status}
            onChange={e => updateProject.mutate({ status: e.target.value })}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${id}/dashboard`)}>
            <BarChart2 className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${id}/study`)}>
            <FileText className="w-4 h-4" /> Study Editor
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${id}/cost-allocation`)}>
          <Settings2 className="w-4 h-4" /> Manage Cost Allocation
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${id}/export`)}>
          Export
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cloneProject.mutate()}
          disabled={cloneProject.isPending}
          title="Duplicate this project with all phases and settings"
        >
          <Copy className="w-4 h-4" /> {cloneProject.isPending ? 'Cloning…' : 'Clone Project'}
        </Button>
      </div>

      {/* Phases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Phases</h2>
          <Button size="sm" onClick={() => setShowAddPhase(true)}>
            <Plus className="w-4 h-4" /> Add Phase
          </Button>
        </div>

        {loadingPhases ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : phases.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12 text-gray-500">
              <p className="mb-3">No phases yet. Add the first phase to get started.</p>
              <Button size="sm" onClick={() => setShowAddPhase(true)}><Plus className="w-4 h-4" /> Add Phase</Button>
            </CardBody>
          </Card>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="phases">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {phases.map((phase, idx) => (
                    <Draggable key={phase.id} draggableId={String(phase.id)} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(snapshot.isDragging && 'opacity-80')}
                        >
                          <PhaseCard
                            phase={phase}
                            projectId={id}
                            dragHandleProps={provided.dragHandleProps}
                            onOpen={() => navigate(`/project/${id}/study?phase=${phase.id}`)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Add Phase Modal */}
      <Modal open={showAddPhase} onClose={() => setShowAddPhase(false)} title="Add Phase">
        <form
          onSubmit={e => {
            e.preventDefault()
            if (phaseName.trim()) addPhase.mutate({ name: phaseName.trim() })
          }}
          className="space-y-4"
        >
          <Input
            label="Phase Name"
            value={phaseName}
            onChange={e => setPhaseName(e.target.value)}
            placeholder="e.g. Phase 1A — Superlink"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddPhase(false)}>Cancel</Button>
            <Button type="submit" disabled={!phaseName.trim() || addPhase.isPending}>
              {addPhase.isPending ? 'Adding…' : 'Add Phase'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function PhaseCard({ phase, projectId, dragHandleProps, onOpen }) {
  const qc = useQueryClient()
  const margin = phase.profit_margin_pct
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(phase.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickOut(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    if (menuOpen) document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [menuOpen])

  const updatePhase = useMutation({
    mutationFn: (data) => phasesApi.update(phase.id, data),
    onSuccess: () => qc.invalidateQueries(['phases', projectId]),
  })
  const deletePhase = useMutation({
    mutationFn: () => phasesApi.delete(phase.id),
    onSuccess: () => qc.invalidateQueries(['phases', projectId]),
  })
  const duplicatePhase = useMutation({
    mutationFn: () => phasesApi.duplicate(phase.id),
    onSuccess: () => qc.invalidateQueries(['phases', projectId]),
  })

  function commitRename() {
    const trimmed = renameVal.trim()
    if (trimmed && trimmed !== phase.name) updatePhase.mutate({ name: trimmed })
    setRenaming(false)
  }

  const inactive = phase.is_active === false

  return (
    <>
      <Card className={cn('hover:shadow-sm transition-shadow', inactive && 'opacity-60')}>
        <CardBody className="flex items-center gap-3 py-3">
          <div {...dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {renaming ? (
              <input
                autoFocus
                className="w-full border border-brand-400 rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenameVal(phase.name); setRenaming(false) } }}
              />
            ) : (
              <p className={cn('font-medium text-gray-900 truncate', inactive && 'line-through text-gray-400')}>
                {phase.name}
                {inactive && <span className="ml-2 text-xs font-normal no-underline text-gray-400">(inactive)</span>}
              </p>
            )}
            {phase.dev_type && <p className="text-xs text-gray-500">{phase.dev_type}</p>}
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-6 text-right text-sm">
            <div>
              <p className="text-xs text-gray-400">Units</p>
              <p className="font-medium">{phase.unit_count ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">NDV</p>
              <p className="font-medium">{formatRM(phase.total_ndv, true)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Margin</p>
              <p className={cn('font-semibold', marginColor(margin))}>{formatPct(margin)}</p>
            </div>
          </div>
          {/* Kebab menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => { setRenaming(true); setMenuOpen(false) }}>
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => { duplicatePhase.mutate(); setMenuOpen(false) }}>
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => { updatePhase.mutate({ is_active: !inactive }); setMenuOpen(false) }}>
                  {inactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {inactive ? 'Set Active' : 'Set Inactive'}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
                  onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
          <button onClick={onOpen} className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </CardBody>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Phase">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{phase.name}</strong>? This will permanently remove all unit types, cost assumptions, and scenarios for this phase.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { deletePhase.mutate(); setConfirmDelete(false) }} disabled={deletePhase.isPending}>
              {deletePhase.isPending ? 'Deleting…' : 'Delete Phase'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

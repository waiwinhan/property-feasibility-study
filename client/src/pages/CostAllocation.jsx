import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Save, Plus, Trash2, AlertCircle, CheckCircle, SplitSquareHorizontal, Ruler, Hash } from 'lucide-react'
import { projectsApi, phasesApi, allocationApi } from '../api/projects'
import { cn, formatRM } from '../lib/utils'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import apiClient from '../api/client'

export default function CostAllocation() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })
  const { data: phases = [], isLoading: loadingPhases } = useQuery({ queryKey: ['phases', projectId], queryFn: () => phasesApi.list(projectId) })
  const { data: pools = [], isLoading: loadingPools } = useQuery({ queryKey: ['cost-allocation', projectId], queryFn: () => allocationApi.get(projectId) })

  const [matrix, setMatrix] = useState([]) // [{id, name, pool_total, is_default, allocations: {phaseId: pct}}]
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showAddPool, setShowAddPool] = useState(false)
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolTotal, setNewPoolTotal] = useState('')

  const activePhs = phases.filter(p => p.is_active !== false)

  useEffect(() => {
    if (pools.length > 0 && activePhs.length > 0) {
      setMatrix(pools.map(pool => {
        const allocs = {}
        for (const ph of activePhs) {
          const existing = (pool.construction_cost_allocations || []).find(a => a.phase_id === ph.id)
          allocs[ph.id] = existing ? +(existing.allocation_pct || 0) : 0
        }
        return { id: pool.id, name: pool.name, pool_total: pool.pool_total, is_default: pool.is_default, allocations: allocs }
      }))
    } else if (pools.length === 0 && activePhs.length > 0) {
      // Seed defaults
      setMatrix([
        { id: null, name: 'Earthworks', pool_total: 700000, is_default: true, allocations: Object.fromEntries(activePhs.map(p => [p.id, 0])) },
        { id: null, name: 'Landscaping', pool_total: 125000, is_default: true, allocations: Object.fromEntries(activePhs.map(p => [p.id, 0])) },
        { id: null, name: 'Clubhouse', pool_total: 1000000, is_default: true, allocations: Object.fromEntries(activePhs.map(p => [p.id, 0])) },
      ])
    }
  }, [pools, phases])

  function setAlloc(poolIdx, phaseId, val) {
    setMatrix(prev => prev.map((row, i) =>
      i === poolIdx ? { ...row, allocations: { ...row.allocations, [phaseId]: Math.max(0, Math.min(100, parseFloat(val) || 0)) } } : row
    ))
  }

  function setPoolTotal(poolIdx, val) {
    setMatrix(prev => prev.map((row, i) => i === poolIdx ? { ...row, pool_total: parseFloat(val) || 0 } : row))
  }

  function distributeEvenly(poolIdx) {
    const n = activePhs.length
    if (!n) return
    const base = Math.floor(100 / n * 10) / 10
    const remainder = +(100 - base * (n - 1)).toFixed(1)
    setMatrix(prev => prev.map((row, i) => {
      if (i !== poolIdx) return row
      const allocs = {}
      activePhs.forEach((ph, j) => { allocs[ph.id] = j === n - 1 ? remainder : base })
      return { ...row, allocations: allocs }
    }))
  }

  function distributeByProportion(poolIdx, getVal) {
    const values = activePhs.map(getVal)
    const total = values.reduce((s, v) => s + v, 0)
    if (!total) return
    let remaining = 100
    setMatrix(prev => prev.map((row, i) => {
      if (i !== poolIdx) return row
      const allocs = {}
      activePhs.forEach((ph, j) => {
        if (j === activePhs.length - 1) {
          allocs[ph.id] = +remaining.toFixed(1)
        } else {
          const pct = +((values[j] / total) * 100).toFixed(1)
          allocs[ph.id] = pct
          remaining -= pct
        }
      })
      return { ...row, allocations: allocs }
    }))
  }

  function clearRow(poolIdx) {
    setMatrix(prev => prev.map((row, i) => {
      if (i !== poolIdx) return row
      return { ...row, allocations: Object.fromEntries(activePhs.map(p => [p.id, 0])) }
    }))
  }

  function removeRow(poolIdx) {
    setMatrix(prev => prev.filter((_, i) => i !== poolIdx))
  }

  function addPool() {
    if (!newPoolName.trim()) return
    setMatrix(prev => [...prev, {
      id: null, name: newPoolName.trim(), pool_total: parseFloat(newPoolTotal) || 0,
      is_default: false, allocations: Object.fromEntries(activePhs.map(p => [p.id, 0]))
    }])
    setNewPoolName('')
    setNewPoolTotal('')
    setShowAddPool(false)
  }

  function rowTotal(row) {
    return Object.values(row.allocations).reduce((s, v) => s + v, 0)
  }

  function allBalanced() {
    return matrix.every(row => Math.abs(rowTotal(row) - 100) < 0.01 || Object.values(row.allocations).every(v => v === 0))
  }

  async function saveAll() {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        pools: matrix.map(row => ({
          id: row.id || undefined,
          name: row.name,
          pool_total: row.pool_total,
          allocations: activePhs.map(ph => ({ phase_id: ph.id, allocation_pct: row.allocations[ph.id] || 0 })),
        }))
      }
      await allocationApi.update(projectId, payload)
      qc.invalidateQueries(['cost-allocation', projectId])
      qc.invalidateQueries(['phases', projectId])
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loadingPhases || loadingPools

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-14 z-30">
        <button onClick={() => navigate(`/project/${projectId}`)} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <span className="font-medium text-gray-900">{project?.name}</span>
          <ChevronRight className="w-3 h-3" />
          <span>Cost Allocation</span>
        </div>
        <div className="flex-1" />
        {!allBalanced() && (
          <div className="flex items-center gap-1.5 text-amber-600 text-sm bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Some pools not at 100%</span>
          </div>
        )}
        <Button onClick={() => setShowAddPool(true)} variant="secondary" size="sm">
          <Plus className="w-4 h-4" /> Add Pool
        </Button>
        <Button onClick={saveAll} disabled={saving} size="sm">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save All'}
        </Button>
      </div>

      <div className="max-w-full px-4 sm:px-6 py-6">
        {saveError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
            <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setSaveError(null)}>✕</button>
          </div>
        )}
        <p className="text-sm text-gray-500 mb-6">
          Allocate shared infrastructure costs across phases. Each row must total 100% before saving.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 w-52 min-w-[13rem]">Cost Item</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-36 min-w-[9rem]">Pool Total (RM)</th>
                  {activePhs.map(ph => (
                    <th key={ph.id} className="px-3 py-3 text-center font-medium text-gray-600 w-32 min-w-[8rem]">
                      <div className="truncate text-xs">{ph.name}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-24 sticky right-0 bg-gray-50">Total</th>
                  <th className="px-2 py-3 w-24 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrix.map((row, rIdx) => {
                  const total = rowTotal(row)
                  const balanced = Math.abs(total - 100) < 0.01
                  const hasData = total > 0
                  return (
                    <tr key={rIdx} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50 w-52">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        {row.is_default && <div className="text-xs text-gray-400">Default</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min="0" step="1000"
                          className="w-32 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          value={row.pool_total}
                          onChange={e => setPoolTotal(rIdx, e.target.value)}
                        />
                      </td>
                      {activePhs.map(ph => {
                        const pct = row.allocations[ph.id] || 0
                        const rm = row.pool_total * pct / 100
                        return (
                          <td key={ph.id} className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number" min="0" max="100" step="0.1"
                                className="w-20 text-center border border-gray-200 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                                value={pct || ''}
                                placeholder="0"
                                onChange={e => setAlloc(rIdx, ph.id, e.target.value)}
                              />
                              <div className="text-xs text-gray-400">{rm > 0 ? formatRM(rm, true) : '—'}</div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-center sticky right-0 bg-white group-hover:bg-gray-50">
                        <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
                          balanced ? 'bg-green-50 text-green-700' : hasData ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        )}>
                          {balanced ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {total.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button title="Distribute evenly" onClick={() => distributeEvenly(rIdx)} className="p-1 text-gray-400 hover:text-brand-600 rounded">
                            <SplitSquareHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button title="Distribute by land area" onClick={() => distributeByProportion(rIdx, ph => ph.land_area_acres || 0)} className="p-1 text-gray-400 hover:text-emerald-600 rounded">
                            <Ruler className="w-3.5 h-3.5" />
                          </button>
                          <button title="Distribute by unit count" onClick={() => distributeByProportion(rIdx, ph => ph.unit_count || 0)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Hash className="w-3.5 h-3.5" />
                          </button>
                          <button title="Clear" onClick={() => clearRow(rIdx)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <span className="text-xs">✕</span>
                          </button>
                          {!row.is_default && (
                            <button title="Delete" onClick={() => removeRow(rIdx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50">Total Pool</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {formatRM(matrix.reduce((s, r) => s + r.pool_total, 0), true)}
                  </td>
                  {activePhs.map(ph => {
                    const total = matrix.reduce((s, r) => s + r.pool_total * (r.allocations[ph.id] || 0) / 100, 0)
                    return <td key={ph.id} className="px-3 py-3 text-center font-medium">{formatRM(total, true)}</td>
                  })}
                  <td colSpan={2} className="sticky right-0 bg-gray-50"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAddPool} onClose={() => setShowAddPool(false)} title="Add Cost Pool">
        <div className="space-y-4">
          <Input label="Pool Name" value={newPoolName} onChange={e => setNewPoolName(e.target.value)} placeholder="e.g. Swimming Pool" autoFocus />
          <Input label="Pool Total (RM)" type="number" value={newPoolTotal} onChange={e => setNewPoolTotal(e.target.value)} placeholder="500000" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddPool(false)}>Cancel</Button>
            <Button onClick={addPool} disabled={!newPoolName.trim()}>Add Pool</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileSpreadsheet, FileText, Download, Table, LayoutDashboard } from 'lucide-react'
import { projectsApi } from '../api/projects'
import apiClient from '../api/client'
import { Card, CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function ExportCentre() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) })

  async function downloadFile(type) {
    setLoading(l => ({ ...l, [type]: true }))
    setErrors(e => ({ ...e, [type]: null }))
    try {
      const urlMap = {
        excel: `/projects/${projectId}/export/excel`,
        csv: `/projects/${projectId}/export/csv`,
        'pdf-dashboard': `/projects/${projectId}/export/pdf/dashboard`,
        'pdf-feasibility': `/projects/${projectId}/export/pdf/feasibility`,
      }
      const mimeMap = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        'pdf-dashboard': 'application/pdf',
        'pdf-feasibility': 'application/pdf',
      }
      const extMap = { excel: 'xlsx', csv: 'csv', 'pdf-dashboard': 'pdf', 'pdf-feasibility': 'pdf' }

      const response = await apiClient.get(urlMap[type], { responseType: 'blob' })

      // 501 JSON error blob (PDF unavailable in non-Docker env)
      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const json = JSON.parse(text)
        throw new Error(json.error || 'Export unavailable')
      }

      const blob = new Blob([response.data], { type: mimeMap[type] })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      const today = new Date().toISOString().slice(0, 10)
      const safeName = (project?.name || 'export').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')
      link.download = match ? match[1] : `${safeName}_${today}.${extMap[type]}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      setErrors(e => ({ ...e, [type]: err.message }))
    } finally {
      setLoading(l => ({ ...l, [type]: false }))
    }
  }

  const exports = [
    {
      type: 'excel',
      icon: FileSpreadsheet,
      title: 'Excel Export',
      description: 'Full feasibility study — all phases side-by-side. Matches original Excel template layout.',
      ext: '.xlsx',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      type: 'csv',
      icon: Table,
      title: 'CSV Export',
      description: 'Phase summary table — GDV, NDV, GCC, NDP, margin for all phases and total. UTF-8 with BOM.',
      ext: '.csv',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      type: 'pdf-dashboard',
      icon: LayoutDashboard,
      title: 'Dashboard PDF',
      description: 'Management dashboard — charts, KPIs, and margin gauges. Requires Docker with Chromium.',
      ext: '.pdf',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      type: 'pdf-feasibility',
      icon: FileText,
      title: 'Feasibility Study PDF',
      description: 'Study editor view — all phases and cost assumptions. Requires Docker with Chromium.',
      ext: '.pdf',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/project/${projectId}`)} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Centre</h1>
          <p className="text-sm text-gray-500">{project?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {exports.map(({ type, icon: Icon, title, description, ext, color, bg }) => (
          <Card key={type} className="hover:shadow-md transition-shadow">
            <CardBody className="space-y-4">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
              {errors[type] && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{errors[type]}</p>
              )}
              <Button
                onClick={() => downloadFile(type)}
                disabled={loading[type]}
                variant="secondary"
                className="w-full"
              >
                {loading[type]
                  ? <><Spinner className="w-4 h-4" /> Generating…</>
                  : <><Download className="w-4 h-4" /> Download {ext}</>}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

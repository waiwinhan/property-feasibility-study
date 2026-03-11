import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Upload, Download, CheckCircle, AlertCircle, X, FileSpreadsheet } from 'lucide-react'
import { Modal } from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Spinner from './ui/Spinner'
import { importApi } from '../api/projects'

export default function ImportModal({ open, onClose }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef(null)

  const [step, setStep] = useState('upload') // upload | review | importing
  const [preview, setPreview] = useState(null) // { phases, summary }
  const [projectName, setProjectName] = useState('')
  const [status, setStatus] = useState('Active')
  const [parseError, setParseError] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileBase64, setFileBase64] = useState(null)
  const [isParsing, setIsParsing] = useState(false)

  function reset() {
    setStep('upload')
    setPreview(null)
    setProjectName('')
    setStatus('Active')
    setParseError(null)
    setFileName('')
    setFileBase64(null)
    setIsParsing(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setIsParsing(true)
    try {
      const b64 = await readFileAsBase64(file)
      setFileBase64(b64)
      const result = await importApi.preview(b64)
      setPreview(result)
      // Auto-fill project name from filename
      const auto = file.name.replace(/\.(xlsx|xls)$/i, '').replace(/[_-]+/g, ' ').trim()
      setProjectName(auto || 'Imported Project')
      setStep('review')
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to parse file'
      setParseError(msg)
    } finally {
      setIsParsing(false)
    }
  }

  const saveMut = useMutation({
    mutationFn: () => importApi.save({ projectName: projectName.trim(), status, phases: preview.phases }),
    onSuccess: (proj) => {
      qc.invalidateQueries(['projects'])
      handleClose()
      navigate(`/project/${proj.id}`)
    },
  })

  function handleDownloadTemplate() {
    importApi.downloadTemplate().then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'feasibility_import_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import from Excel">
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a filled import template to create a new project. Download the template first if you don't have one.
          </p>

          {/* Download template */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center gap-3 p-3 border border-dashed border-brand-300 rounded-lg bg-brand-50 hover:bg-brand-100 transition-colors text-left"
          >
            <Download className="w-5 h-5 text-brand-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-brand-700">Download Import Template</p>
              <p className="text-xs text-brand-500">feasibility_import_template.xlsx</p>
            </div>
          </button>

          {/* File drop zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-gray-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="w-6 h-6" />
                <p className="text-sm text-gray-500">Parsing file…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400">.xlsx files only</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Could not parse file</p>
                <p>{parseError}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}

      {step === 'review' && preview && (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
            <span className="font-medium truncate">{fileName}</span>
            <CheckCircle className="w-4 h-4 text-green-600 ml-auto shrink-0" />
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Phases', value: preview.summary.phaseCount },
              { label: 'Unit Types', value: preview.summary.unitTypeCount },
              { label: 'Total Units', value: preview.summary.totalUnits.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Phase list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phases found</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {preview.phases.map((ph, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                  <span className="font-medium text-gray-800">{ph.name}</span>
                  <span className="text-xs text-gray-500">{ph.unitTypes.length} unit type{ph.unitTypes.length !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project settings */}
          <Input
            label="Project Name"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {['Active', 'On Hold', 'Completed', 'Archived'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {saveMut.error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveMut.error?.response?.data?.error || saveMut.error?.message || 'Import failed'}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">
              ← Upload different file
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={!projectName.trim() || saveMut.isPending}
              >
                {saveMut.isPending ? 'Importing…' : 'Import Project'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      // result is data:...;base64,<actual-base64>
      const base64 = e.target.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

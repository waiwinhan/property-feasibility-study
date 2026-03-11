import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Building2, Upload, Image } from 'lucide-react'
import { settingsApi } from '../api/projects'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'

export default function Settings() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [form, setForm] = useState({ company_name: '', hurdle_rate_pct: 15 })
  const [logoPreview, setLogoPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (settings) {
      setForm({ company_name: settings.company_name || '', hurdle_rate_pct: settings.hurdle_rate_pct ?? 15 })
      if (settings.logo_url) setLogoPreview(settings.logo_url)
    }
  }, [settings])

  const saveMut = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => qc.invalidateQueries(['settings']),
  })

  function handleLogoFile(file) {
    if (!file) return
    if (!['image/png', 'image/svg+xml', 'image/jpeg'].includes(file.type)) { alert('PNG, SVG or JPEG only'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target.result
      setLogoPreview(dataUrl)
      setForm(p => ({ ...p, logo_url: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-gray-700">Company</h2></CardHeader>
        <CardBody className="space-y-5">
          <Input label="Company Name" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="e.g. Wai Property Sdn Bhd" />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Hurdle Rate (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" min="0" max="100"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.hurdle_rate_pct} onChange={e => setForm(p => ({ ...p, hurdle_rate_pct: parseFloat(e.target.value) || 0 }))} />
              <span className="text-sm text-gray-500">% — used for margin traffic-light colouring</span>
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Company Logo</label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleLogoFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-12 mx-auto object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Image className="w-8 h-8" />
                  <p className="text-sm">Drag & drop logo or click to browse</p>
                  <p className="text-xs">PNG, SVG, JPEG — max 2MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={e => handleLogoFile(e.target.files[0])} />
            </div>
            {logoPreview && (
              <button className="text-xs text-red-500 hover:text-red-700" onClick={() => { setLogoPreview(null); setForm(p => ({ ...p, logo_url: null })) }}>Remove logo</button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          <Save className="w-4 h-4" /> {saveMut.isPending ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
      {saveMut.isSuccess && <p className="text-sm text-green-600 text-center">Settings saved.</p>}
    </div>
  )
}

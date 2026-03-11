import { Outlet, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Settings, BarChart2, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { settingsApi, projectsApi } from '../api/projects'
import { cn } from '../lib/utils'

export default function Layout() {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })
  const companyName = settings?.company_name || 'Wai Feasibility'
  const logoUrl = settings?.logo_url
  const { id: currentProjectId } = useParams()
  const navigate = useNavigate()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)
  const [searchParams] = useSearchParams()
  const isPrint = searchParams.get('print') === 'true'

  useEffect(() => {
    function onClickOut(e) { if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false) }
    if (switcherOpen) document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [switcherOpen])

  const currentProject = projects.find(p => p.id === currentProjectId)

  return (
    <div className="min-h-screen flex flex-col">
      <header className={cn(
        'bg-white border-b border-gray-200 h-14 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-40 shadow-sm',
        isPrint && 'hidden'
      )}>
        <NavLink to="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            : <BarChart2 className="w-5 h-5" />}
          <span className="hidden sm:block text-sm font-semibold">{companyName}</span>
        </NavLink>
        <nav className="flex items-center gap-1 flex-1 min-w-0">
          <NavLink to="/" end className={({ isActive }) =>
            cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}>
            Portfolio
          </NavLink>
          {/* Project switcher — shown when inside a project */}
          {currentProject && (
            <div className="relative flex items-center min-w-0" ref={switcherRef}>
              <span className="text-gray-300 mx-1">/</span>
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors max-w-[180px]"
              >
                <span className="truncate">{currentProject.name}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              </button>
              {switcherOpen && (
                <div className="absolute left-0 top-9 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Switch Project</div>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { navigate(`/project/${p.id}`); setSwitcherOpen(false) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left',
                        p.id === currentProjectId ? 'text-brand-700 font-medium bg-brand-50/50' : 'text-gray-700'
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
        <NavLink to="/settings" className={({ isActive }) =>
          cn('p-2 rounded-md transition-colors shrink-0', isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')}>
          <Settings className="w-4 h-4" />
        </NavLink>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

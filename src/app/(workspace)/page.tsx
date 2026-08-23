'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { createProject, deleteProject } from '@/app/projects/actions'
import { DEMO_PROJECT, DEMO_CAMERAS, DEMO_DEVICES } from '@/lib/demoData'

export default function ProjectsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({})
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({})

  const handleDeleteProject = async (projId: string, projName: string) => {
    const confirmDelete = window.confirm(`⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el proyecto "${projName}"?\n\nEsta acción borrará de la base de datos todas las cámaras, nodos de fibra, switches, BOM y tareas asociadas. Esta acción NO se puede deshacer.`)
    if (!confirmDelete) return

    setDeletingId(projId)
    const res = await deleteProject(projId)
    setDeletingId(null)

    if (res.error) {
      showToast(`Error al eliminar: ${res.error}`)
    } else {
      setProjects(prev => prev.filter(p => p.id !== projId))
      showToast(`Proyecto "${projName}" eliminado correctamente de la base de datos.`)
    }
  }
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  // Create project form transition & error
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    async function loadProjectsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        let projectsQuery = supabase.from('projects').select('*').order('updated_at', { ascending: false })

        if (user) {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('profile_id', user.id)

          const orgIds = memberships?.map((m) => m.organization_id) || []
          if (orgIds.length > 0) {
            projectsQuery = supabase
              .from('projects')
              .select('*')
              .in('organization_id', orgIds)
              .order('updated_at', { ascending: false })
          }
        }

        const { data: projectsData } = await projectsQuery
        let projectsList = (projectsData && projectsData.length > 0) ? projectsData : [DEMO_PROJECT]
        projectsList.sort((a, b) => {
          const timeA = new Date(a.updated_at || a.created_at).getTime()
          const timeB = new Date(b.updated_at || b.created_at).getTime()
          return timeB - timeA
        })
        setProjects(projectsList)

        // Fetch camera and device counts
        const { data: cameras } = await supabase
          .from('camera_locations')
          .select('project_id')

        const { data: devices } = await supabase
          .from('network_devices')
          .select('project_id')

        // Compute counts maps
        const camsMap: Record<string, number> = { [DEMO_PROJECT.id]: DEMO_CAMERAS.length }
        cameras?.forEach((c: any) => {
          camsMap[c.project_id] = (camsMap[c.project_id] || 0) + 1
        })
        setCameraCounts(camsMap)

        const devsMap: Record<string, number> = { [DEMO_PROJECT.id]: DEMO_DEVICES.length }
        devices?.forEach((d: any) => {
          devsMap[d.project_id] = (devsMap[d.project_id] || 0) + 1
        })
        setDeviceCounts(devsMap)
      } catch (err) {
        console.error('Failed to load projects list:', err)
        setProjects([DEMO_PROJECT])
      } finally {
        setLoading(false)
      }
    }
    loadProjectsData()
  }, [supabase])

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const res = await createProject(formData)
      if (res?.error) {
        setCreateError(res.error)
      } else {
        setIsCreateOpen(false)
        showToast('Project created successfully!')
      }
    })
  }

  // Filter projects based on query and status selection
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const projectStatus = p.status || 'Active'
    const matchesStatus = statusFilter === 'All' || 
      projectStatus.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex-1 flex bg-slate-950 items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full px-6 py-8 flex-1 overflow-y-auto h-full scrollbar-thin bg-[#0c0f1d] text-slate-100 relative">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-slate-750 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-200 text-xs font-bold font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2.5xl font-black text-white tracking-tight leading-none">Projects</h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">Manage and configure your infrastructure deployments</p>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Project
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Project
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-850">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        {/* Status Dropdown */}
        <div className="sm:w-44 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
          >
            <option value="All" className="bg-slate-950">All</option>
            <option value="Active" className="bg-slate-950">Active</option>
            <option value="Attention" className="bg-slate-950">Attention</option>
            <option value="Draft" className="bg-slate-950">Draft</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center bg-slate-900/10 max-w-xl mx-auto mt-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <h3 className="text-base font-semibold text-white">No projects matching filters</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Try adjusting your search query or filter to see existing projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const camCount = cameraCounts[project.id] || 0
            const devCount = deviceCounts[project.id] || 0
            const status = project.status || 'Active'

            return (
              <div
                key={project.id}
                className="group bg-slate-900/40 border border-slate-850 hover:border-slate-750 rounded-2xl transition-all hover:bg-slate-900/60 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {/* Top Section */}
                <div className="p-6 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      status.toLowerCase() === 'active' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-550'
                    }`}>
                      {status}
                    </span>
                    <span className="text-[10px] text-slate-550 font-mono">
                      Updated {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-lg group-hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-3 min-h-[48px]">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Bottom counts and open actions */}
                <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-850/50 flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-mono font-bold text-slate-450">
                    <span className="flex items-center gap-1" title="Camera locations count">
                      <span className="text-sky-400 font-extrabold">{camCount}</span> Cams
                    </span>
                    <span className="flex items-center gap-1" title="Network switches / devices count">
                      <span className="text-indigo-400 font-extrabold">{devCount}</span> Devs
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {project.id !== 'demo-metro-cctv' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        disabled={deletingId === project.id}
                        title="Delete project and all DB records"
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs transition active:scale-95 disabled:opacity-50"
                      >
                        {deletingId === project.id ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        )}
                      </button>
                    )}

                    <Link
                      href={`/projects/${project.id}/overview`}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-indigo-600 text-slate-350 hover:text-white rounded-lg text-[10.5px] font-extrabold transition flex items-center gap-1"
                    >
                      Open Project
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <form onSubmit={handleCreateSubmit} className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Create New Project</h3>
              <p className="text-[11px] text-slate-450 mt-1">Configure coordinates and details for your infrastructure grid.</p>
            </div>
            
            {createError && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-450 p-2.5 rounded-xl text-xs font-semibold">
                {createError}
              </div>
            )}

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Project Name</label>
                <input required type="text" name="name" placeholder="e.g. CCTV Head Office Deployment" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Description</label>
                <textarea name="description" placeholder="Brief summary of the site infrastructure..." className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 h-16 resize-none" />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Latitude</label>
                  <input required type="number" step="0.000001" name="latitude" defaultValue="37.7749" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Longitude</label>
                  <input required type="number" step="0.000001" name="longitude" defaultValue="-122.4194" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Zoom</label>
                  <input required type="number" name="zoom" defaultValue="15" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md">
                {isPending && <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />}
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Project Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsImportOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Project Import Center — Coming Soon</h3>
              <p className="text-[11px] text-slate-450 mt-1">This panel will map spreadsheets, spreadsheets columns, or coordinate sets.</p>
            </div>
            
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 text-[10.5px] leading-relaxed text-slate-400">
              <p>The import engine will support:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-550">
                <li><strong className="text-slate-350">Bill of Materials</strong> - CSV imports containing manufacturers, quantities, part numbers.</li>
                <li><strong className="text-slate-350">Map Coordinates</strong> - Excel/WGS84 sheets mapping node placements (cameras, switches).</li>
                <li><strong className="text-slate-350">Keyed Notes & Plan Sheets</strong> - PDF plan mappings to locate cabinets and conduit boxes.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsImportOpen(false)} className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-300 rounded-xl text-xs font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

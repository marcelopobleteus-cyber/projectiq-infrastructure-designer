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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({})
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({})

  const handleDeleteProject = async (projId: string, projName: string) => {
    const confirmDelete = window.confirm(`⚠️ Permanently DELETE the project "${projName}"?\n\nThis will permanently delete every camera, fiber node, switch, BOM line and task in this project. This CANNOT be undone.`)
    if (!confirmDelete) return

    setDeletingId(projId)
    setOpenMenuId(null)
    const res = await deleteProject(projId)
    setDeletingId(null)

    if (res.error) {
      showToast(`Error al eliminar: ${res.error}`)
    } else {
      setProjects(prev => prev.filter(p => p.id !== projId))
      showToast(`Project "${projName}" deleted successfully.`)
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
      <div className="flex-1 flex bg-[var(--bg)] items-center justify-center p-8 font-sans">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full px-6 py-8 flex-1 overflow-y-auto h-full scrollbar-thin bg-[var(--bg)] text-[var(--text-primary)] font-sans relative">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)] px-4 py-3 rounded-xl shadow-xl text-xs font-bold font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">Projects</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Manage and configure your infrastructure deployments</p>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Project
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold rounded-lg transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Project
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border)] shadow-xs">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        {/* Status Dropdown */}
        <div className="sm:w-44 flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 rounded-lg text-xs">
          <span className="text-[var(--text-tertiary)] font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-semibold"
          >
            <option value="All" className="bg-white">All</option>
            <option value="Active" className="bg-white">Active</option>
            <option value="Attention" className="bg-white">Attention</option>
            <option value="Draft" className="bg-white">Draft</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl mx-auto mt-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">No projects matching filters</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
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
                className="group bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl transition-all shadow-xs flex flex-col justify-between overflow-hidden"
              >
                {/* Top Section */}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      status.toLowerCase() === 'active' 
                        ? 'bg-[var(--success-soft)] border-emerald-200 text-[var(--success)]' 
                        : 'bg-[var(--warn-soft)] border-amber-200 text-[var(--warn)]'
                    }`}>
                      {status}
                    </span>
                    
                    {/* Destructive Actions Menu (Three-Dot ⋯ Dropdown) */}
                    {project.id !== 'demo-metro-cctv' && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === project.id ? null : project.id)
                          }}
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-md hover:bg-[var(--surface-hover)] transition cursor-pointer"
                          title="Opciones"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>

                        {openMenuId === project.id && (
                          <div className="absolute right-0 top-full mt-1 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-lg shadow-lg p-1 z-30 w-36">
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              disabled={deletingId === project.id}
                              className="w-full text-left px-3 py-1.5 text-xs text-[var(--danger)] font-semibold hover:bg-red-50 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {deletingId === project.id ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              )}
                              Delete project
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-[var(--text-primary)] text-base group-hover:text-[var(--accent-text)] transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 min-h-[42px]">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Bottom counts and open actions */}
                <div className="px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-between">
                  <div className="flex gap-3 text-xs font-mono font-bold text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1" title="Camera locations count">
                      <span className="text-[var(--accent-text)] font-extrabold">{camCount}</span> Cams
                    </span>
                    <span className="flex items-center gap-1" title="Network devices count">
                      <span className="text-[var(--text-primary)] font-extrabold">{devCount}</span> Devs
                    </span>
                  </div>

                  <Link
                    href={`/projects/${project.id}/overview`}
                    className="px-3 py-1.5 bg-[var(--surface-1)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    Open Project
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <form onSubmit={handleCreateSubmit} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Create New Project</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Configure coordinates and details for your infrastructure grid.</p>
            </div>
            
            {createError && (
              <div className="bg-red-50 border border-red-200 text-[var(--danger)] p-2.5 rounded-lg text-xs font-semibold">
                {createError}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Project Name</label>
                <input required type="text" name="name" placeholder="e.g. CCTV Head Office Deployment" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Description</label>
                <textarea name="description" placeholder="Brief summary of the site infrastructure..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-16 resize-none" />
              </div>
              
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-sans">Latitude</label>
                  <input required type="number" step="0.000001" name="latitude" defaultValue="37.7749" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-sans">Longitude</label>
                  <input required type="number" step="0.000001" name="longitude" defaultValue="-122.4194" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-sans">Zoom</label>
                  <input required type="number" name="zoom" defaultValue="15" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
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
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setIsImportOpen(false)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Project Import Center</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">This panel will map spreadsheets, coordinate sets, or BOMs.</p>
            </div>
            
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg space-y-2 text-xs text-[var(--text-secondary)]">
              <p>The import engine supports:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Bill of Materials</strong> - CSV imports containing manufacturers, quantities, part numbers.</li>
                <li><strong>Map Coordinates</strong> - Excel/WGS84 sheets mapping node placements.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsImportOpen(false)} className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

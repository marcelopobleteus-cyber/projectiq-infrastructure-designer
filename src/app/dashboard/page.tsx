'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { createProject } from '@/app/projects/actions'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    attentionProjects: 0,
    openTasksCount: 0,
  })
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  
  // Create project form error & transition
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's organizations
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('profile_id', user.id)

        const orgIds = memberships?.map((m) => m.organization_id) || []

        if (orgIds.length > 0) {
          // Fetch projects
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .in('organization_id', orgIds)
            .order('created_at', { ascending: false })

          const projectsList = projectsData || []
          setRecentProjects(projectsList.slice(0, 3))

          const total = projectsList.length
          const active = projectsList.filter((p: any) => p.status === 'active' || p.status === 'Active' || !p.status).length
          const attention = Math.ceil(total * 0.1) // 10% need attention placeholder

          // Fetch open tasks across projects if available
          const { data: tasksData } = await supabase
            .from('camera_tasks')
            .select('*')
            .neq('status', 'Complete')
            .limit(5)

          const openTasks = tasksData || []
          setRecentTasks(openTasks)

          setStats({
            totalProjects: total,
            activeProjects: active,
            attentionProjects: attention,
            openTasksCount: openTasks.length,
          })
        }
      } catch (err) {
        console.error('Failed to load global dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
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

  const handleOpenLastProject = () => {
    if (recentProjects.length > 0) {
      router.push(`/projects/${recentProjects[0].id}/overview`)
    } else {
      showToast('No projects available to open.')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex bg-[var(--bg)] items-center justify-center p-8 font-sans">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full px-6 py-8 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full overflow-y-auto scrollbar-thin relative">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)] px-4 py-3 rounded-xl shadow-xl text-xs font-bold font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Welcome Title */}
      <div>
        <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
          Global Dashboard
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
          High-level overview of your company infrastructure deployments and team workload.
        </p>
      </div>

      {/* Grid Stats Row (Stat Cards Spec: uppercase eyebrow, large mono value, background surface-1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects Card */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between h-28 shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{stats.totalProjects}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">deployed</span>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between h-28 shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Active Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--success)] font-mono">{stats.activeProjects}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">running</span>
          </div>
        </div>

        {/* Needs Attention Card (Uses --warn amber) */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between h-28 shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Attention Needed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--warn)] font-mono">{stats.attentionProjects}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">items</span>
          </div>
        </div>

        {/* Total Open Tasks Card (Primary metric highlighted with accent-border outline) */}
        <div className="bg-[var(--surface-1)] border border-[var(--accent-border)] p-5 rounded-xl flex flex-col justify-between h-28 shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Open Tasks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--accent-text)] font-mono">{stats.openTasksCount}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">assigned</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left major / Right minor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recent Projects & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects Card */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">Recent Projects</h2>
              <Link href="/projects" className="text-xs text-[var(--accent-text)] hover:underline font-bold transition">View all →</Link>
            </div>
            
            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] font-mono py-4">No projects created yet.</p>
              ) : (
                recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/overview`}
                    className="flex justify-between items-center p-3 bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg transition group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">{p.name}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">{p.description || 'No description provided.'}</p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Cross-Project Open Tasks */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">Open Tasks Across Projects</h2>
              <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-secondary)] font-bold px-2 py-0.5 rounded-full font-mono">{recentTasks.length} total</span>
            </div>
            
            <div className="space-y-2">
              {recentTasks.length === 0 ? (
                <div className="p-6 text-center text-[var(--text-tertiary)] text-xs font-mono border border-dashed border-[var(--border)] rounded-lg bg-[var(--surface-2)]">
                  All clean! No open tasks assigned.
                </div>
              ) : (
                recentTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="flex justify-between items-center p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg hover:border-[var(--border-strong)] cursor-pointer transition"
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-mono">{t.task_type || 'Task'}</span>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{t.title}</h4>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      t.priority === 'High' ? 'bg-red-50 border-red-200 text-[var(--danger)]' : 'bg-[var(--surface-3)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions & System Status */}
        <div className="space-y-6">
          {/* Recommended Action Callout / CTA Card (Spec: --accent-soft background, --accent-border border) */}
          <div className="bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-xl p-5 space-y-3.5 shadow-xs">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent-text)] flex items-center gap-1.5">
              <span>🚀</span> Quick Actions
            </h2>
            
            <div className="flex flex-col gap-2">
              <Link
                href="/projects/create"
                className="w-full py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Project
              </Link>
              
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="w-full py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import Project
              </button>

              <button
                type="button"
                onClick={handleOpenLastProject}
                className={`w-full py-2 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  recentProjects.length > 0
                    ? 'bg-[var(--surface-1)] border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-tertiary)] cursor-not-allowed'
                }`}
                disabled={recentProjects.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {recentProjects.length > 0 ? 'Open Last Project' : 'No projects available'}
              </button>
            </div>
          </div>

          {/* System Status / Activity */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 space-y-3.5 shadow-xs">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] pb-2 border-b border-[var(--border)]">System Activity</h2>
            
            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Design System Standardized</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Light background surface and brand orange accents deployed.</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Map Engine Hybrid Active</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">OpenStreetMap and Esri High-Res Satellite fallback live.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

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

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-mono">{selectedTask.task_type || 'General Task'}</span>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">{selectedTask.title}</h3>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                selectedTask.priority === 'High' ? 'bg-red-50 border-red-200 text-[var(--danger)]' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]'
              }`}>
                {selectedTask.priority}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Status</span>
                <p className="text-[var(--text-primary)] font-semibold">{selectedTask.status || 'Open / Pending'}</p>
              </div>

              {selectedTask.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Task Notes</span>
                  <p className="text-[var(--text-secondary)] font-medium leading-relaxed bg-[var(--surface-2)] p-3 border border-[var(--border)] rounded-lg">{selectedTask.notes}</p>
                </div>
              )}

              <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] font-mono text-[var(--text-secondary)] flex justify-between">
                <span>Task Reference:</span>
                <span className="text-[var(--text-primary)] font-bold">{selectedTask.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedTask(null)} className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition">
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

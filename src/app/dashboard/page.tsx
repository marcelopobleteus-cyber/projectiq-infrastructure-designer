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
      <div className="flex-1 flex bg-slate-950 items-center justify-center p-8">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full px-6 py-8 font-sans text-slate-100 bg-[#0c0f1d] min-h-full overflow-y-auto scrollbar-thin relative">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-slate-800 text-sky-400 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-200 text-xs font-bold font-mono">
          {toastMessage}
        </div>
      )}

      {/* Welcome Title */}
      <div>
        <h1 className="text-2.5xl font-black text-white tracking-tight leading-none">
          Global Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          High-level overview of your company infrastructure deployments and team workload.
        </p>
      </div>

      {/* Grid Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{stats.totalProjects}</span>
            <span className="text-[10px] text-slate-400">deployed</span>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{stats.activeProjects}</span>
            <span className="text-[10px] text-slate-400">running</span>
          </div>
        </div>

        {/* Needs Attention Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attention Needed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500 font-mono">{stats.attentionProjects}</span>
            <span className="text-[10px] text-slate-400">items</span>
          </div>
        </div>

        {/* Total Open Tasks Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Tasks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400 font-mono">{stats.openTasksCount}</span>
            <span className="text-[10px] text-slate-400">assigned</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left major / Right minor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recent Projects & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects Card */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-350">Recent Projects</h2>
              <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-350 font-bold transition">View all</Link>
            </div>
            
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-4">No projects created yet.</p>
              ) : (
                recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/overview`}
                    className="flex justify-between items-center p-3.5 bg-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl hover:bg-slate-950/90 transition group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{p.name}</h4>
                      <p className="text-[10px] text-slate-450 mt-1 line-clamp-1">{p.description || 'No description provided.'}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Cross-Project Open Tasks */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-350">Open Tasks Across Projects</h2>
              <span className="text-[10px] bg-slate-800 text-slate-350 font-bold px-2 py-0.5 rounded-full font-mono">{recentTasks.length} total</span>
            </div>
            
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-850/60 rounded-xl bg-slate-950/10">
                  All clean! No open tasks assigned.
                </div>
              ) : (
                recentTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="flex justify-between items-center p-3 bg-slate-950/20 border border-slate-900 rounded-xl hover:border-slate-800 cursor-pointer hover:bg-slate-950/40 transition"
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-550 tracking-wider font-mono">{t.task_type || 'Task'}</span>
                      <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{t.title}</h4>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      t.priority === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-450' : 'bg-slate-800 border-slate-700 text-slate-450'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions & Help */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400 pb-2 border-b border-indigo-900/20">Quick Actions</h2>
            
            <div className="flex flex-col gap-2">
              {/* Action 1 */}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Project
              </button>
              
              {/* Action 2 */}
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import Project
              </button>

              {/* Action 3 */}
              <button
                type="button"
                onClick={handleOpenLastProject}
                className={`w-full py-2.5 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer ${
                  recentProjects.length > 0
                    ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-350 hover:text-white'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                }`}
                disabled={recentProjects.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {recentProjects.length > 0 ? 'Open Last Project' : 'No projects available'}
              </button>
            </div>
          </div>

          {/* System Status / Activity */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850">Recent System Activity</h2>
            
            <div className="space-y-3.5 text-[11px] text-slate-450">
              <div className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-200">Global Settings Renamed</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Renamed Command Center tabs to Dashboard.</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-200">Map Workspace Stabilized</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Fixed duplicate layer initialization issue.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

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
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
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

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest font-mono">{selectedTask.task_type || 'General Task'}</span>
                <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider mt-0.5">{selectedTask.title}</h3>
              </div>
              <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase border ${
                selectedTask.priority === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-450' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {selectedTask.priority}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500">Status</span>
                <p className="text-slate-350 font-semibold">{selectedTask.status || 'Open / Pending'}</p>
              </div>

              {selectedTask.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">Task Notes</span>
                  <p className="text-slate-400 font-medium leading-relaxed bg-slate-950/40 p-3 border border-slate-900 rounded-xl">{selectedTask.notes}</p>
                </div>
              )}

              <div className="p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Task Reference:</span>
                <span className="text-slate-300 font-bold">{selectedTask.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedTask(null)} className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-350 rounded-xl text-xs font-bold transition">
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

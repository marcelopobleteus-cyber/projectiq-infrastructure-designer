import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import ProjectGridClient from './ProjectGridClient'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  let projects: any[] = []
  if (user) {
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)

    const orgIds = memberships?.map((m) => m.organization_id) || []
    if (orgIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('organization_id', orgIds)
        .order('updated_at', { ascending: false })
      projects = data || []
    }
  }

  // A workspace with no projects shows an empty state — nothing else.
  //
  // This used to fall back to querying every project with NO organization filter, and
  // then to injecting DEMO_PROJECT ("Atlanta Beltline Fiber & CCTV Infrastructure Grid")
  // when even that came back empty. A client opening their brand-new workspace was shown
  // a project that was not theirs, with nothing marking it as a sample — which reads as a
  // data leak between tenants. DEMO_PROJECT also carries the non-UUID id
  // 'demo-metro-cctv', the source of "invalid input syntax for type uuid" in production.

  const projectIds = projects.map(p => p.id)
  let taskStatsMap: Record<string, { total: number; complete: number }> = {}
  let lastUpdatedMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    const { data: taskRows } = await supabase
      .from('camera_tasks')
      .select('project_id, status')
      .in('project_id', projectIds)

    for (const t of taskRows || []) {
      if (!t.project_id) continue
      if (!taskStatsMap[t.project_id]) {
        taskStatsMap[t.project_id] = { total: 0, complete: 0 }
      }
      taskStatsMap[t.project_id].total += 1
      if (t.status === 'Complete') {
        taskStatsMap[t.project_id].complete += 1
      }
    }

    try {
      const { data: activityRows } = await supabase
        .from('activity_log')
        .select('project_id, created_at, actor_id, profiles(full_name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      for (const a of activityRows || []) {
        if (a.project_id && !lastUpdatedMap[a.project_id]) {
          const actorName = (a.profiles as any)?.full_name || 'System Admin'
          lastUpdatedMap[a.project_id] = actorName
        }
      }
    } catch (e) {
      console.warn('Activity log fetch notice:', e)
    }
  }

  const enrichedProjects = projects.map(p => {
    const stats = taskStatsMap[p.id] || { total: 0, complete: 0 }
    let status = p.status
    if (!status) {
      if (stats.total === 0) status = 'planning'
      else if (stats.complete === stats.total) status = 'completed'
      else status = 'in_progress'
    }
    return {
      ...p,
      status,
      tasksTotal: stats.total,
      tasksComplete: stats.complete,
      lastUpdatedBy: lastUpdatedMap[p.id] || 'Marcelo Poblete'
    }
  })

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-8 flex-1 overflow-y-auto h-full scrollbar-thin bg-[var(--bg)] font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Projects</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage and configure your infrastructure deployments</p>
        </div>
        <Link
          href="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg transition-all shadow-xs active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Project
        </Link>
      </div>

      <ProjectGridClient initialProjects={enrichedProjects} />
    </div>
  )
}

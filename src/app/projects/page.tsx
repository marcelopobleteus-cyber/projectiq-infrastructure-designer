import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
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

  if (projects.length === 0) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    projects = (data && data.length > 0) ? data : [DEMO_PROJECT]
  }

  // Ensure strict descending order by last updated timestamp (updated_at || created_at)
  projects.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at).getTime()
    const timeB = new Date(b.updated_at || b.created_at).getTime()
    return timeB - timeA
  })

  return (
    <div className="space-y-8 relative z-10 w-full px-6 py-8 flex-1 overflow-y-auto h-full scrollbar-thin">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Projects</h2>
          <p className="text-sm text-slate-400 mt-1">Manage and configure your infrastructure deployments</p>
        </div>
        <Link
          href="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Project
        </Link>
      </div>

      <ProjectGridClient initialProjects={projects} />
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

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
        .order('created_at', { ascending: false })
      projects = data || []
    }
  }

  if (projects.length === 0) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    projects = data || []
  }

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

      {projects.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center bg-slate-900/20 backdrop-blur-sm max-w-xl mx-auto mt-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-slate-400 border border-slate-700/50 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <h3 className="text-base font-semibold text-white">No projects found</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            You don't have any infrastructure design projects yet. Create your first project to get started.
          </p>
          <Link
            href="/projects/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-6"
          >
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block p-6 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all hover:bg-slate-900/80 shadow-sm"
            >
              <h3 className="font-semibold text-white text-lg group-hover:text-indigo-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2 min-h-[40px]">
                {project.description || 'No description provided.'}
              </p>
              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {project.default_latitude.toFixed(4)}, {project.default_longitude.toFixed(4)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

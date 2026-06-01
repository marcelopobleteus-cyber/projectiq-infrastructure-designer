import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectLocationsPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  const coordinatesStr = `${Number(project.default_latitude).toFixed(6)}, ${Number(project.default_longitude).toFixed(6)}`

  return (
    <div className="space-y-6 relative z-10 w-full max-w-7xl mx-auto px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Project Locations</h2>
          <p className="text-xs text-slate-400 mt-1">Manage and configure multiple physical sites under this project</p>
        </div>
        <button
          disabled
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed hover:bg-slate-900 flex items-center gap-1.5"
          title="Multiple sites configuration is coming soon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Location
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-indigo-950/15 border border-indigo-900/30 rounded-2xl p-4 text-xs flex gap-3 text-indigo-400">
        <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <p className="font-bold">Multi-Site Architecture Enabled</p>
          <p className="text-slate-400 mt-1">ProjectIQ currently runs on a single primary layout grid. Future releases will support nesting multiple sites and sub-grids (e.g. separate server rooms, secondary yards) under a single project.</p>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                <th className="py-3 px-6">Location Name</th>
                <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              <tr className="hover:bg-slate-855/10 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-200">
                  Primary Location Layout (Default)
                </td>
                <td className="py-4 px-4 font-mono text-slate-350">
                  {coordinatesStr}
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                    Active Grid
                  </span>
                </td>
                <td className="py-4 px-4 font-mono text-slate-400">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-[10px] text-slate-550 italic bg-slate-950/50 border border-slate-850 px-2 py-1 rounded-md font-mono">
                    Default Site
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

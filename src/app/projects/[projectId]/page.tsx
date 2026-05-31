import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-10">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{project.name}</h2>
          <p className="text-sm text-slate-400 mt-1">Infrastructure details and spatial mapping</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">About Project</h3>
            <p className="text-sm text-slate-350 leading-relaxed">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 15 9 18 3 15 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Design Canvas Placeholder</h4>
              <p className="text-sm text-slate-400 mt-1">
                Google Maps and camera placement will be implemented in Sprint 2.
              </p>
            </div>
          </div>
        </div>

        {/* Location Parameters */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6 h-fit">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Coordinates</h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-850">
              <span className="text-slate-400">Latitude</span>
              <span className="font-mono text-white">{project.default_latitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-850">
              <span className="text-slate-400">Longitude</span>
              <span className="font-mono text-white">{project.default_longitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Default Zoom</span>
              <span className="font-mono text-white">{project.default_zoom}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

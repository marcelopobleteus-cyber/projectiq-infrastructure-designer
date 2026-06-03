import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCameraLocations } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import OverviewEditPanel from './OverviewEditPanel'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectOverviewPage({ params }: PageProps) {
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

  // Load actual numbers
  let camerasCount = 0
  let devicesCount = 0
  let switchesCount = 0
  try {
    const cameras = await getCameraLocations(projectId)
    const devices = await getNetworkDevices(projectId)
    camerasCount = cameras.length
    devicesCount = devices.length
    switchesCount = devices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch').length
  } catch (err) {
    console.error('Failed to load summary stats:', err)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const shortcuts = [
    { label: 'Spatial Editor (Maps)', href: `/projects/${projectId}/maps`, desc: 'Configure CCTV markers and device placements' },
    { label: 'Switch Grid (Network)', href: `/projects/${projectId}/network`, desc: 'Manage RJ45 port assignments and PoE warnings' },
    { label: 'Bill of Materials (BOM)', href: `/projects/${projectId}/bom`, desc: 'Hardware inventory sheet and pricing sheets' },
    { label: 'Field Installation (Tasks)', href: `/projects/${projectId}/tasks`, desc: 'Task lists, statuses and installation boards' },
    { label: 'Design Documents', href: `/projects/${projectId}/documents`, desc: 'Access permits, drawings and system schematics' },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{project.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Status dashboard and general project metadata</p>
        </div>
      </div>

      {/* Edit Panel */}
      <OverviewEditPanel
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? null,
          default_latitude: Number(project.default_latitude),
          default_longitude: Number(project.default_longitude),
          default_zoom: project.default_zoom,
        }}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />

      {/* Main Grid: Info Sheet & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        {/* Info Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Project Name</span>
                <span className="text-sm font-bold text-white">{project.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Prepared For / Client</span>
                <span className="text-sm font-bold text-slate-200">Not Assigned</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Default Coordinates</span>
                <span className="text-sm font-mono text-slate-200">{Number(project.default_latitude).toFixed(6)}, {Number(project.default_longitude).toFixed(6)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">System Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 uppercase tracking-wide">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Created Date</span>
                <span className="text-slate-350">{formatDate(project.created_at)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Last Modified</span>
                <span className="text-slate-350">{formatDate(project.updated_at || project.created_at)}</span>
              </div>
            </div>

            <div className="border-t border-slate-850 pt-4 space-y-1.5">
              <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] uppercase">Notes & Description</span>
              <p className="text-xs text-slate-300 bg-slate-950/40 border border-slate-850 p-3 rounded-xl min-h-[60px] italic">
                {project.description || 'No notes or description provided for this project.'}
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Workspace Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortcuts.map((sh, idx) => (
                <Link
                  key={idx}
                  href={sh.href}
                  className="p-3 bg-slate-950/45 hover:bg-slate-950 border border-slate-850 hover:border-indigo-500/30 rounded-xl transition-all block group"
                >
                  <span className="font-bold text-xs text-white group-hover:text-indigo-400 transition-colors block">{sh.label}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">{sh.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Counts & Activity Panel (1/3 width) */}
        <div className="space-y-6">
          {/* Module Counters */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Infrastructure Counts</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Cameras</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">{camerasCount}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Net Devices</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">{devicesCount}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Fiber routes</span>
                <span className="text-2xl font-black text-slate-500 font-mono mt-1 block">0</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Power Nodes</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">{switchesCount}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-center col-span-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Installation Tasks</span>
                <span className="text-lg font-bold text-slate-500 mt-1 block">0 Tasks Assigned</span>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Recent Activity</h3>
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex gap-2.5 items-start text-[11px] leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-slate-300 font-semibold">Project schema initialized</p>
                  <p className="text-[9px] text-slate-500 font-mono">System auto-log</p>
                </div>
              </div>
              {switchesCount > 0 && (
                <div className="flex gap-2.5 items-start text-[11px] leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-slate-300">Network switches provisioned in database</p>
                    <p className="text-[9px] text-slate-500 font-mono">Infrastructure setup</p>
                  </div>
                </div>
              )}
              {camerasCount > 0 && (
                <div className="flex gap-2.5 items-start text-[11px] leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-slate-300">CCTV camera nodes mapped to layout</p>
                    <p className="text-[9px] text-slate-500 font-mono">Camera setup</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

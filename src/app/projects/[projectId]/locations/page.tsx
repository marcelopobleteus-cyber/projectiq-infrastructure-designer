import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'

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

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details
  let { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    project = { ...DEMO_PROJECT, id: projectId } as any
  }

  const coordinatesStr = `${Number(project.default_latitude).toFixed(6)}, ${Number(project.default_longitude).toFixed(6)}`

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Project Locations & Topology</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Manage and configure physical site coordinates and primary sub-grids</p>
        </div>
        <button
          disabled
          className="px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-tertiary)] text-xs font-bold rounded-lg cursor-not-allowed flex items-center gap-1.5"
          title="Multiple sites configuration is coming soon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Location
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-xl p-4 text-xs flex gap-3 text-[var(--text-primary)] shadow-xs">
        <svg className="shrink-0 mt-0.5 text-[var(--accent-text)]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <p className="font-extrabold text-[var(--accent-text)]">Multi-Site Architecture Enabled</p>
          <p className="text-[var(--text-secondary)] mt-1">NextQ currently runs on a single primary layout grid. Future releases will support nesting multiple sites and sub-grids (e.g. separate server rooms, secondary yards) under a single project.</p>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--surface-2)] text-[var(--text-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-6 font-bold">Location Name</th>
                <th className="py-2.5 px-4 font-bold">Coordinates (Lat, Lng)</th>
                <th className="py-2.5 px-4 font-bold">Status</th>
                <th className="py-2.5 px-4 font-bold">Created Date</th>
                <th className="py-2.5 px-6 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="py-3 px-6 font-bold text-[var(--text-primary)]">
                  Primary Location Layout (Default)
                </td>
                <td className="py-3 px-4 font-mono text-[var(--accent-text)] font-extrabold">
                  {coordinatesStr}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    Active Grid
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-6 text-right">
                  <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-1 rounded-md font-mono font-bold">
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

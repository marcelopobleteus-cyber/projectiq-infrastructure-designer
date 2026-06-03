import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectReportsPage({ params }: PageProps) {
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

  const reportsList = [
    {
      name: 'System Coverage & Cam List',
      code: 'R-CAM-01',
      category: 'CCTV / Physical Security',
      description: 'Tabular configuration of cameras, resolutions, lenses, status, and coordinate placement details.',
      lastGenerated: 'Pending Placement Sync',
      type: 'PDF / CSV',
    },
    {
      name: 'PoE Power Budget & Port Assignment',
      code: 'R-NET-02',
      category: 'Network / Switch Matrix',
      description: 'Power-over-Ethernet (PoE) budget calculations, switch port mappings, and active load verification reports.',
      lastGenerated: 'Auto-calculating',
      type: 'PDF / JSON',
    },
    {
      name: 'Hardware Bill of Materials (BOM)',
      code: 'R-BOM-03',
      category: 'Procurement / Costing',
      description: 'Procurement sheet containing item quantities, manufacturers, part numbers, and status indicators.',
      lastGenerated: 'Live Sync',
      type: 'XLSX / PDF',
    },
    {
      name: 'Fiber Splice & Route Configuration',
      code: 'R-FIB-04',
      category: 'Fiber Optic / Telecom',
      description: 'Conduit assignments, handhole nodes, and core-to-core fiber splice trace sheets.',
      lastGenerated: 'Architectural Mock',
      type: 'CAD / CSV',
    },
    {
      name: 'UPS Power Backup & Battery calculations',
      code: 'R-PWR-05',
      category: 'Power / Auxiliary',
      description: 'Calculations for power draw limits, battery backup duration, and auxiliary Solar panels limits.',
      lastGenerated: 'Pending Spec',
      type: 'PDF / XLS',
    },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Project Reports</h2>
          <p className="text-xs text-slate-400 mt-1">Export detailed specifications, engineering sheets, and sign-offs</p>
        </div>
        <button
          disabled
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed flex items-center gap-1.5"
          title="Print layout will be enabled during build validation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Export All Packages
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-950/20 text-indigo-400 border border-indigo-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Engineering Compliance Verification</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            All reports are dynamically updated from active canvas camera nodes, switch port matrices, and RLS tables. Print layouts will generate PDF sheets complying with Axis Site Designer & Bentley systems format.
          </p>
        </div>
      </div>

      {/* Reports Grid/Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                <th className="py-3 px-6">Report Code</th>
                <th className="py-3 px-4">Report Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Formats</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {reportsList.map((rep, idx) => (
                <tr key={idx} className="hover:bg-slate-855/15 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-indigo-400">
                    {rep.code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-200">
                    <div>
                      {rep.name}
                      <p className="text-[10px] text-slate-450 font-normal mt-0.5">{rep.description}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-350">
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-950 border border-slate-850 font-mono text-slate-400">
                      {rep.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {rep.type}
                  </td>
                  <td className="py-3.5 px-4 text-slate-450 font-mono">
                    {rep.lastGenerated}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      disabled
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-500 border border-slate-850 rounded-lg text-[10px] font-bold cursor-not-allowed transition-all"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

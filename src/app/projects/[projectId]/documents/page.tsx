import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDocumentsPage({ params }: PageProps) {
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

  const categories = [
    { name: 'Drawings', count: 1, size: '2.4 MB' },
    { name: 'Photos', count: 0, size: '0 B' },
    { name: 'Permits', count: 1, size: '480 KB' },
    { name: 'RFDS', count: 0, size: '0 B' },
    { name: 'CDs', count: 0, size: '0 B' },
    { name: 'Reports', count: 0, size: '0 B' },
    { name: 'As-Builts', count: 0, size: '0 B' },
  ]

  const mockFiles = [
    { name: 'site_layout_cad_export_v1.0.dwg', category: 'Drawings', size: '2.4 MB', date: 'May 31, 2026' },
    { name: 'municipality_construction_permit_signed.pdf', category: 'Permits', size: '480 KB', date: 'May 31, 2026' },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-slate-300 flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 shrink-0">
        <h2 className="text-xl font-black text-white tracking-tight">Project Documents</h2>
        <p className="text-xs text-slate-400 mt-1">Manage blueprints, permits, calculations, photos, and files in Supabase Storage</p>
      </div>

      {/* Main Workspace: Folders & Files */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
        
        {/* Left Folders Column */}
        <div className="space-y-4 flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1 shrink-0">Categories</span>
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-4 shadow-xl flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-slate-950/60 border border-transparent hover:border-slate-850 text-xs text-slate-400 hover:text-white transition-all group"
              >
                <span className="flex items-center gap-2">
                  <svg className="text-slate-500 group-hover:text-indigo-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  {cat.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-450">
                  {cat.count} files
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Files Explorer & Upload */}
        <div className="md:col-span-3 flex flex-col gap-6 overflow-hidden h-full">
          {/* Files List Table */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-850 bg-slate-950/20 shrink-0">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">All Project Files</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-2.5 px-6">File Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Size</th>
                    <th className="py-2.5 px-4">Uploaded</th>
                    <th className="py-2.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-855">
                  {mockFiles.map((file, idx) => (
                    <tr key={idx} className="hover:bg-slate-855/15 transition-colors">
                      <td className="py-3 px-6 font-semibold text-slate-200 truncate max-w-xs" title={file.name}>
                        {file.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {file.category}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {file.size}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {file.date}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          disabled
                          className="px-2 py-0.75 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-500 text-[10px] font-semibold rounded cursor-not-allowed transition-all"
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

          {/* Upload Box Dropzone */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-5 shadow-xl shrink-0 flex flex-col items-center justify-center border-dashed border-2 border-slate-800 text-center min-h-[110px] hover:border-indigo-500/30 transition-all cursor-not-allowed">
            <svg className="text-slate-500 mb-1" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p className="text-xs font-bold text-slate-300">Upload Site Documentation</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Drag & drop files or click to browse. Max size 20MB.</p>
          </div>
        </div>

      </div>

    </div>
  )
}

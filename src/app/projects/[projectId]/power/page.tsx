import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectPowerPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
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
    { name: 'AC Feeds', count: 0, desc: 'Alternating Current mains connection points' },
    { name: 'DC Systems', count: 0, desc: 'Direct Current transformers and rails' },
    { name: 'UPS Units', count: 0, desc: 'Uninterruptible Power Supplies and battery backups' },
    { name: 'Solar Arrays', count: 0, desc: 'Photovoltaic panels, solar regulators, and cells' },
    { name: 'PoE Allocations', count: 0, desc: 'Switch Power over Ethernet budgets and warning logs' },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-black text-white tracking-tight">Power Distribution Systems</h2>
        <p className="text-xs text-slate-400 mt-1">Design AC grid hookups, UPS backups, Solar energy arrays, and PoE loads</p>
      </div>

      {/* Info Warning */}
      <div className="bg-amber-950/10 border border-amber-900/35 rounded-2xl p-4 text-xs flex gap-3 text-amber-400">
        <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <p className="font-bold">Power data is not mapped yet.</p>
          <p className="text-slate-400 mt-1">Power load calculations, active voltage drop estimates, and solar battery storage sizing calculations will be fully activated in Sprint 4. No calculations are running currently.</p>
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{cat.name}</span>
            <span className="text-xl font-black text-white font-mono block">{cat.count}</span>
            <p className="text-[10px] text-slate-450 pt-1 leading-normal">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Mock Power Schema */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Power Architecture Schematic</h3>
          <span className="text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-500 font-mono">CAD LAYOUT PLACEHOLDER</span>
        </div>
        
        {/* SVG Drawing mockup */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 flex items-center justify-center min-h-[220px] relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-10" width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Power Grid Schematic</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                UPS load curves, voltage dropdown matrix, solar panel peak ratings, and panel schedules will be visually configured here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

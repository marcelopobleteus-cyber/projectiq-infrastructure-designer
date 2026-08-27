import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'

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

  let { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    project = { ...DEMO_PROJECT, id: projectId } as any
  }

  const categories = [
    { name: 'AC Feeds', count: 0, desc: 'Alternating Current mains connection points' },
    { name: 'DC Systems', count: 0, desc: 'Direct Current transformers and rails' },
    { name: 'UPS Units', count: 0, desc: 'Uninterruptible Power Supplies and battery backups' },
    { name: 'Solar Arrays', count: 0, desc: 'Photovoltaic panels, solar regulators, and cells' },
    { name: 'PoE Allocations', count: 0, desc: 'Switch Power over Ethernet budgets and warning logs' },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Power Distribution Systems</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Design AC grid hookups, UPS backups, Solar energy arrays, and PoE loads</p>
      </div>

      {/* Info Warning (Amber Warning Spec) */}
      <div className="bg-[var(--warn-soft)] border border-amber-200 rounded-xl p-4 text-xs flex gap-3 text-[var(--warn)] shadow-xs">
        <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <p className="font-extrabold">Power data is not mapped yet.</p>
          <p className="text-[var(--text-secondary)] mt-1">Power load calculations, active voltage drop estimates, and solar battery storage sizing calculations will be fully activated in Sprint 4. No calculations are running currently.</p>
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {categories.map((cat, idx) => (
          <div key={idx} className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl space-y-1 shadow-xs">
            <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">{cat.name}</span>
            <span className="text-xl font-black text-[var(--text-primary)] font-mono block">{cat.count}</span>
            <p className="text-[10.5px] text-[var(--text-secondary)] pt-1 leading-normal">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Mock Power Schema */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h3 className="text-xs font-extrabold text-[var(--accent-text)] uppercase tracking-wider">Power Architecture Schematic</h3>
          <span className="text-[9.5px] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-tertiary)] font-mono font-bold">CAD LAYOUT PLACEHOLDER</span>
        </div>
        
        {/* SVG Drawing mockup */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-8 flex items-center justify-center min-h-[220px] relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="w-12 h-12 bg-[var(--surface-1)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--accent-text)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Power Grid Schematic</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                UPS load curves, voltage dropdown matrix, solar panel peak ratings, and panel schedules will be visually configured here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

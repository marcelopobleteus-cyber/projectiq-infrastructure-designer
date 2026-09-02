import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import MobileAppShell from '@/components/mobile/MobileAppShell'

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planificación',
  in_progress: 'En Progreso',
  on_hold: 'En Pausa',
  completed: 'Completado',
  closed: 'Cerrado',
}

const STATUS_DOT: Record<string, string> = {
  planning: 'bg-slate-400',
  in_progress: 'bg-[var(--accent)]',
  on_hold: 'bg-amber-500',
  completed: 'bg-emerald-500',
  closed: 'bg-slate-500',
}

export default async function MobileProjectsPage() {
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
        .select('id, name, description, status, disciplines, updated_at')
        .in('organization_id', orgIds)
        .order('updated_at', { ascending: false })
      projects = data || []
    }
  }

  return (
    <MobileAppShell title="Proyectos" subtitle="Selecciona en qué proyecto trabajas">
      <div className="space-y-3 font-sans">
        {projects.length === 0 ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm font-bold text-[var(--text-primary)]">Sin proyectos asignados</p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Cuando tu organización te asigne un proyecto, aparecerá aquí.
            </p>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4"
            >
              <Link href={`/mobile/projects/${p.id}/overview`} className="block active:opacity-70 transition-opacity">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight truncate">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)]`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status] || 'bg-slate-400'}`} />
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </div>

                {p.disciplines?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.disciplines.map((d: string) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent-text)] text-[9.5px] font-bold uppercase tracking-wide"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                <Link
                  href={`/mobile/projects/${p.id}/time`}
                  className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wide"
                >
                  ⏱ Marcar Entrada →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileAppShell>
  )
}

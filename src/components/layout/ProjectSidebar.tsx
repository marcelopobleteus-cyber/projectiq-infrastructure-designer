'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { updateProjectDisciplines } from '@/app/projects/actions'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
  disciplines: string[]
}

const ALL_DISCIPLINES: { id: string; name: string; href: string; icon: React.ReactNode; ready: boolean }[] = [
  {
    id: 'cctv', name: 'CCTV & Videovigilancia', href: 'cameras', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  },
  {
    id: 'fiber', name: 'Fibra Óptica (OSP/ISP)', href: 'fiber', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
  },
  {
    id: 'conduit', name: 'Canalización & Ductos', href: 'fiber', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h6a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4h2"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="18" r="2"/></svg>,
  },
  {
    id: 'networking', name: 'Networking & Switches', href: 'network', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>,
  },
  {
    id: 'wireless', name: 'Enlaces Wireless & PTP', href: 'wireless', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
  },
  {
    id: 'power', name: 'Energía & Subestaciones', href: 'power', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  },
  {
    id: 'lighting', name: 'Alumbrado Público (En desarrollo)', href: '', ready: false,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.6.55 1 1.36 1 2.5h6c0-1.14.4-1.95 1-2.5A6 6 0 0 0 12 2z"/></svg>,
  },
]

export default function ProjectSidebar({ projectId, projectName, disciplines }: ProjectSidebarProps) {
  const pathname = usePathname()
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [activeDisciplines, setActiveDisciplines] = useState<string[]>(disciplines)
  const [isPending, startTransition] = useTransition()

  const toggleDiscipline = (discId: string) => {
    const next = activeDisciplines.includes(discId)
      ? activeDisciplines.filter(id => id !== discId)
      : [...activeDisciplines, discId]

    if (next.length === 0) return

    setActiveDisciplines(next)
    startTransition(async () => {
      const res = await updateProjectDisciplines(projectId, next)
      if (res?.error) setActiveDisciplines(activeDisciplines)
    })
    setShowAddMenu(false)
  }

  const getDisciplineBadge = () => {
    if (activeDisciplines.length === 1) {
      const disc = ALL_DISCIPLINES.find(d => d.id === activeDisciplines[0])
      return { title: disc?.name || 'Proyecto Especializado' }
    }
    return { title: `Multi-Disciplina (${activeDisciplines.length} módulos)` }
  }

  const badge = getDisciplineBadge()

  const designItems = ALL_DISCIPLINES
    .filter(d => activeDisciplines.includes(d.id))
    .map(d => ({
      id: d.id,
      label: d.name,
      href: d.ready ? `/projects/${projectId}/${d.href}` : '#',
      active: d.ready && pathname === `/projects/${projectId}/${d.href}`,
      disabled: !d.ready,
      icon: d.icon,
    }))

  const categories = [
    {
      label: 'VISTA PRINCIPAL',
      items: [
        {
          id: 'overview',
          label: 'Dashboard del Proyecto',
          href: `/projects/${projectId}/overview`,
          active: pathname === `/projects/${projectId}/overview` || pathname === `/projects/${projectId}`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          ),
        },
        {
          id: 'maps',
          label: 'Mapa GIS Interactivo',
          href: `/projects/${projectId}/maps`,
          active: pathname === `/projects/${projectId}/maps`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          ),
        },
        {
          id: 'topology',
          label: 'Matriz & Topología',
          href: `/projects/${projectId}/locations`,
          active: pathname === `/projects/${projectId}/locations`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M12 6v12"/><path d="M6 12h12"/></svg>
          ),
        },
      ]
    },
    {
      label: 'MÓDULOS DEL PROYECTO',
      items: designItems
    },
    {
      label: 'OPERACIÓN & ENTREGABLES',
      items: [
        {
          id: 'bom',
          label: 'Cómputo Métrico (BOM)',
          href: `/projects/${projectId}/bom`,
          active: pathname === `/projects/${projectId}/bom`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          ),
        },
        {
          id: 'tasks',
          label: 'Ordenes de Trabajo',
          href: `/projects/${projectId}/tasks`,
          active: pathname === `/projects/${projectId}/tasks`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          ),
        },
        {
          id: 'reports-proj',
          label: 'Reportes Ejecutivos PDF',
          href: `/projects/${projectId}/reports`,
          active: pathname === `/projects/${projectId}/reports`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          ),
        },
      ]
    },
    {
      label: 'SOPORTE',
      items: [
        {
          id: 'help',
          label: 'Centro de Ayuda',
          href: `/projects/${projectId}/help`,
          active: pathname === `/projects/${projectId}/help`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ),
        },
      ]
    }
  ]

  return (
    <aside className="w-[222px] bg-[var(--bg)] border-r border-[var(--border)] flex flex-col shrink-0 h-full overflow-hidden relative z-10 font-sans select-none">
      {/* Brand logo identity header */}
      <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[var(--text-primary)] tracking-wider">NextQ Suite</span>
          <span className="text-[10px] text-[var(--accent-text)] font-mono font-bold bg-[var(--accent-soft)] px-1.5 py-0.5 rounded border border-[var(--accent-border)]">v2.0</span>
        </div>

        {/* Specialty Discipline Indicator Badge */}
        <div className="flex items-center justify-between gap-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10.5px] text-[var(--text-secondary)] font-medium truncate">
          <span className="truncate">{badge.title}</span>
          {isPending && <span className="w-2.5 h-2.5 rounded-full border border-[var(--accent)] border-t-transparent animate-spin shrink-0" />}
        </div>
      </div>

      {/* Action Buttons: Add Module / Disciplines */}
      <div className="p-3 shrink-0 space-y-1.5 relative border-b border-[var(--border)] bg-[var(--surface-1)]">
        {/* Dynamic + Unir Módulo Button */}
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-1.5 px-3 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Unir Módulo / Disciplina
        </button>

        {/* Dropdown menu for adding/removing modules */}
        {showAddMenu && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-xl shadow-lg p-2 z-50 space-y-1">
            <div className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1 border-b border-[var(--border)]">
              Activar Módulos en este Proyecto
            </div>
            {ALL_DISCIPLINES.map(d => {
              const active = activeDisciplines.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => d.ready && toggleDiscipline(d.id)}
                  disabled={!d.ready}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                    !d.ready
                      ? 'text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                      : active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}>{d.icon}</span>
                    <span>{d.name}</span>
                  </span>
                  {active && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)] shrink-0"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block px-2.5 mb-1">
              {cat.label}
            </span>
            <div className="space-y-0.5">
              {cat.items.map((sec: any) => (
                sec.disabled ? (
                  <div
                    key={sec.id}
                    title={`${sec.label} — módulo en desarrollo`}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] text-[var(--text-tertiary)] cursor-not-allowed opacity-50"
                  >
                    <span>{sec.icon}</span>
                    <span className="truncate">{sec.label}</span>
                  </div>
                ) : (
                  <Link
                    key={sec.id}
                    href={sec.href}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all border-l-2 ${
                      sec.active
                        ? 'bg-[var(--surface-2)] border-l-[var(--accent)] text-[var(--text-primary)] font-semibold'
                        : 'bg-transparent border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <span className={sec.active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}>
                      {sec.icon}
                    </span>
                    <span className="truncate">{sec.label}</span>
                  </Link>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

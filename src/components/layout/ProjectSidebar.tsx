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

// Canonical discipline ids — must match PROJECT_TYPES in /projects/create and the
// `disciplines` column on public.projects. 'conduit' and 'lighting' are valid tags
// today (a project can be created and saved as one) but have no dedicated workspace
// yet, so their nav entries render disabled until that module ships.
const ALL_DISCIPLINES: { id: string; name: string; href: string; icon: React.ReactNode; ready: boolean }[] = [
  {
    id: 'cctv', name: 'CCTV & Videovigilancia', href: 'cameras', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  },
  {
    id: 'fiber', name: 'Fibra Óptica (OSP/ISP)', href: 'fiber', ready: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
  },
  {
    id: 'conduit', name: 'Canalización & Ductos', href: '', ready: false,
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
    id: 'lighting', name: 'Alumbrado Público', href: '', ready: false,
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

    if (next.length === 0) return // at least one discipline must stay active

    setActiveDisciplines(next) // optimistic
    startTransition(async () => {
      const res = await updateProjectDisciplines(projectId, next)
      if (res?.error) setActiveDisciplines(activeDisciplines) // roll back on failure
    })
    setShowAddMenu(false)
  }

  const isCctvActive = activeDisciplines.includes('cctv')
  const isFiberActive = activeDisciplines.includes('fiber')
  const isConduitActive = activeDisciplines.includes('conduit')
  const isNetworkingActive = activeDisciplines.includes('networking')
  const isWirelessActive = activeDisciplines.includes('wireless')
  const isPowerActive = activeDisciplines.includes('power')
  const isLightingActive = activeDisciplines.includes('lighting')

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
      label: 'Vista Principal',
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
      label: 'Módulos del Proyecto',
      items: designItems
    },
    {
      label: 'Operación & Entregables',
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
      label: 'Soporte',
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
    <aside className="w-[240px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden relative z-10 font-sans">
      {/* Brand logo identity header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-sky-400 tracking-wider">NextQ</span>
          <span className="text-[10px] text-slate-500 font-medium">Infrastructure Suite</span>
        </div>

        {/* Specialty Discipline Indicator Badge */}
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-sky-950/60 border border-sky-800/40 rounded-xl text-[11px] text-sky-300 font-semibold truncate shadow-inner">
          <span className="truncate">{badge.title}</span>
          {isPending && <span className="w-2.5 h-2.5 rounded-full border border-sky-400 border-t-transparent animate-spin shrink-0" />}
        </div>
      </div>

      {/* Action Buttons: New Project & Add Module */}
      <div className="p-3 pb-0 shrink-0 space-y-2 relative">
        <Link href="/projects/create" className="w-full py-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 text-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Proyecto
        </Link>

        {/* Dynamic + Unir Módulo Button */}
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-1.5 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 active:scale-98"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Unir Módulo / Disciplina
        </button>

        {/* Dropdown menu for adding/removing modules */}
        {showAddMenu && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-800">
              Activar Módulos en este Proyecto
            </div>
            {ALL_DISCIPLINES.map(d => {
              const active = activeDisciplines.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiscipline(d.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                    active
                      ? 'bg-sky-500/20 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={active ? 'text-sky-400' : 'text-slate-500'}>{d.icon}</span>
                    <span>{d.name}</span>
                    {!d.ready && (
                      <span className="text-[8.5px] font-bold uppercase tracking-wide text-slate-600 border border-slate-700 rounded px-1">
                        pronto
                      </span>
                    )}
                  </span>
                  {active && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 shrink-0"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin select-none">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block px-3 mb-1">
              {cat.label}
            </span>
            <div className="space-y-0.5">
              {cat.items.map((sec: any) => (
                sec.disabled ? (
                  <div
                    key={sec.id}
                    title={`${sec.label} — módulo en desarrollo`}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] text-slate-600 cursor-not-allowed border border-transparent"
                  >
                    <span className="text-slate-700">{sec.icon}</span>
                    {sec.label}
                  </div>
                ) : (
                  <Link
                    key={sec.id}
                    href={sec.href}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] transition-all border ${
                      sec.active
                        ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 font-semibold shadow-inner shadow-sky-950/10'
                        : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={sec.active ? 'text-sky-400' : 'text-slate-500'}>
                      {sec.icon}
                    </span>
                    {sec.label}
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

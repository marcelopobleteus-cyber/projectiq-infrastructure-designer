'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
}

const ALL_DISCIPLINES = [
  { id: 'fiber', name: 'Fibra Óptica (OSP/ISP)', icon: '🧵', defaultPath: 'fiber' },
  { id: 'cameras', name: 'CCTV & Videovigilancia', icon: '🎥', defaultPath: 'cameras' },
  { id: 'network', name: 'Networking & Switches', icon: '🔌', defaultPath: 'network' },
  { id: 'wireless', name: 'Enlaces Wireless & PTP', icon: '📡', defaultPath: 'wireless' },
  { id: 'power', name: 'Energía & Subestaciones', icon: '⚡', defaultPath: 'power' },
]

export default function ProjectSidebar({ projectId, projectName }: ProjectSidebarProps) {
  const pathname = usePathname()
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Determine initial discipline from projectId tag or default to master for demo
  const getInitialDisciplines = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`proj_disciplines_${projectId}`)
      if (saved) {
        try { return JSON.parse(saved) } catch (e) {}
      }
    }
    if (projectId.includes('fiber')) return ['fiber']
    if (projectId.includes('cctv')) return ['cameras']
    if (projectId.includes('network')) return ['network']
    if (projectId.includes('wireless')) return ['wireless']
    if (projectId.includes('power')) return ['power']
    if (projectId.includes('lighting')) return ['power']
    if (projectId.includes('conduit')) return ['fiber']
    return ['fiber', 'cameras', 'network', 'wireless', 'power'] // Demo/Master default
  }

  const [activeDisciplines, setActiveDisciplines] = useState<string[]>(getInitialDisciplines)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`proj_disciplines_${projectId}`, JSON.stringify(activeDisciplines))
    }
  }, [projectId, activeDisciplines])

  const toggleDiscipline = (discId: string) => {
    if (activeDisciplines.includes(discId)) {
      if (activeDisciplines.length > 1) {
        setActiveDisciplines(activeDisciplines.filter(id => id !== discId))
      }
    } else {
      setActiveDisciplines([...activeDisciplines, discId])
    }
    setShowAddMenu(false)
  }

  const isFiberActive = activeDisciplines.includes('fiber')
  const isCamerasActive = activeDisciplines.includes('cameras')
  const isNetworkActive = activeDisciplines.includes('network')
  const isWirelessActive = activeDisciplines.includes('wireless')
  const isPowerActive = activeDisciplines.includes('power')

  // Dynamic Discipline Title
  const getDisciplineBadge = () => {
    if (activeDisciplines.length === 1) {
      const disc = ALL_DISCIPLINES.find(d => d.id === activeDisciplines[0])
      return { icon: disc?.icon || '📁', title: disc?.name || 'Proyecto Especializado' }
    }
    return { icon: '🌐', title: `Multi-Disciplina (${activeDisciplines.length} Módulos)` }
  }

  const badge = getDisciplineBadge()

  const designItems = [
    ...(isFiberActive ? [{
      id: 'fiber',
      label: 'Fibra Óptica (Pathways)',
      href: `/projects/${projectId}/fiber`,
      active: pathname === `/projects/${projectId}/fiber`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
      ),
    }] : []),
    ...(isCamerasActive ? [{
      id: 'cameras',
      label: 'CCTV & Cámaras 4K',
      href: `/projects/${projectId}/cameras`,
      active: pathname === `/projects/${projectId}/cameras`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
    }] : []),
    ...(isNetworkActive ? [{
      id: 'network',
      label: 'Networking & Switches',
      href: `/projects/${projectId}/network`,
      active: pathname === `/projects/${projectId}/network`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
      ),
    }] : []),
    ...(isWirelessActive ? [{
      id: 'wireless',
      label: 'Wireless Backhaul',
      href: `/projects/${projectId}/wireless`,
      active: pathname === `/projects/${projectId}/wireless`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
      ),
    }] : []),
    ...(isPowerActive ? [{
      id: 'power',
      label: 'Power & Subestaciones',
      href: `/projects/${projectId}/power`,
      active: pathname === `/projects/${projectId}/power`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      ),
    }] : []),
  ]

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
          <div className="flex items-center gap-1.5 truncate">
            <span className="shrink-0">{badge.icon}</span>
            <span className="truncate">{badge.title}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: New Project & Add Module */}
      <div className="p-3 pb-0 shrink-0 space-y-2 relative">
        <Link href="/projects/create" className="w-full py-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 text-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Nuevo Proyecto
        </Link>

        {/* Dynamic + Unir Módulo Button */}
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-1.5 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 active:scale-98"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Unir Módulo / Disciplina
        </button>

        {/* Dropdown menu for adding/removing modules */}
        {showAddMenu && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-800">
              Activar Módulos en este Proyecto:
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
                    <span>{d.icon}</span>
                    <span>{d.name}</span>
                  </span>
                  {active && <span className="text-sky-400 font-bold">✓</span>}
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
              {cat.items.map((sec) => (
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

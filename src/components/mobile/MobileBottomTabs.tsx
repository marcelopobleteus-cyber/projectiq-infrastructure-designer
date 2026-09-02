'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileBottomTabsProps {
  projectId?: string
  onToggleDrawer: () => void
  isDrawerOpen: boolean
}

export default function MobileBottomTabs({
  projectId,
  onToggleDrawer,
  isDrawerOpen,
}: MobileBottomTabsProps) {
  const pathname = usePathname()

  const clockIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )

  const tabs = projectId
    ? [
        {
          id: 'overview',
          label: 'Resumen',
          href: `/mobile/projects/${projectId}/overview`,
          active: pathname.includes('/overview'),
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          ),
        },
        {
          id: 'time',
          label: 'Fichaje',
          href: `/mobile/projects/${projectId}/time`,
          active: pathname.includes('/time'),
          icon: clockIcon,
        },
        {
          id: 'tasks',
          label: 'Tareas',
          href: `/mobile/projects/${projectId}/tasks`,
          active: pathname.includes('/tasks'),
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          ),
        },
      ]
    : [
        {
          id: 'projects',
          label: 'Proyectos',
          href: '/mobile/projects',
          active: pathname === '/mobile/projects',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          ),
        },
        {
          id: 'time',
          label: 'Fichaje',
          href: '/mobile/time',
          active: pathname === '/mobile/time',
          icon: clockIcon,
        },
        {
          id: 'reports',
          label: 'Reportes',
          href: '/mobile/reports',
          active: pathname === '/mobile/reports',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          ),
        },
      ]

  return (
    <nav className="h-16 bg-[var(--surface-1)] border-t border-[var(--border)] fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 shrink-0 font-sans shadow-xl">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
            tab.active
              ? 'text-[var(--accent-text)] font-extrabold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {tab.icon}
          <span className="text-[10px] tracking-tight font-medium leading-none">{tab.label}</span>
        </Link>
      ))}

      <button
        type="button"
        onClick={onToggleDrawer}
        className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer ${
          isDrawerOpen ? 'text-[var(--accent-text)] font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <span className="text-[10px] tracking-tight font-medium leading-none">Menú</span>
      </button>
    </nav>
  )
}

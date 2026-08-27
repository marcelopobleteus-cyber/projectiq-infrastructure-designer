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
  const defaultProjectId = projectId || 'demo-metro-cctv'

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      href: `/mobile/projects/${defaultProjectId}/overview`,
      active: pathname.includes('/overview') || pathname === '/mobile/projects',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ),
    },
    {
      id: 'cameras',
      label: 'Cámaras',
      href: `/mobile/projects/${defaultProjectId}/cameras`,
      active: pathname.includes('/cameras'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
    },
    {
      id: 'tasks',
      label: 'Tareas',
      href: `/mobile/projects/${defaultProjectId}/tasks`,
      active: pathname.includes('/tasks'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
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

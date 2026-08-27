'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProjectTopBarProps {
  projectId: string
  projectName: string
  extraActionsSlot?: React.ReactNode
}

export default function ProjectTopBar({
  projectId,
  projectName,
  extraActionsSlot,
}: ProjectTopBarProps) {
  const pathname = usePathname()

  const tabs = [
    {
      label: 'Dashboard',
      href: `/projects/${projectId}/overview`,
      active: pathname.endsWith('/overview') || pathname.endsWith(projectId),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      )
    },
    {
      label: 'Layout & Map',
      href: `/projects/${projectId}/maps`,
      active: pathname.endsWith('/maps'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      )
    },
    {
      label: 'Bill of Materials',
      href: `/projects/${projectId}/bom`,
      active: pathname.endsWith('/bom'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      )
    },
    {
      label: 'Tasks & Field',
      href: `/projects/${projectId}/tasks`,
      active: pathname.endsWith('/tasks'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      )
    },
    {
      label: 'Reports',
      href: `/projects/${projectId}/reports`,
      active: pathname.endsWith('/reports'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      )
    }
  ]

  return (
    <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--surface-1)] shrink-0 w-full relative z-20 font-sans">
      {/* Project Switcher & Name */}
      <div className="flex items-center gap-4 min-w-0">
        <Link href="/projects" className="flex items-center gap-2 group min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] font-bold text-xs shrink-0">
            NQ
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] leading-none">Project</span>
            <span className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors truncate">
              {projectName}
            </span>
          </div>
        </Link>

        <span className="inline-flex items-center gap-1.5 bg-[var(--success-soft)] border border-emerald-200 text-[var(--success)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          Active Workspace
        </span>
      </div>

      {/* Centered Navigation Tabs (Underlined in Orange) */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              tab.active
                ? 'border-b-[var(--accent)] text-[var(--text-primary)] font-bold'
                : 'border-b-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-b-[var(--border)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Action Utilities (Export + Orange Primary Action) */}
      <div className="flex items-center gap-3 shrink-0">
        {extraActionsSlot && (
          <div className="flex items-center gap-2">
            {extraActionsSlot}
          </div>
        )}

        <Link
          href={`/projects/${projectId}/reports`}
          className="px-3 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-semibold text-xs rounded-lg transition"
        >
          Export
        </Link>

        <Link
          href={`/projects/${projectId}/overview`}
          className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs rounded-lg shadow-xs transition"
        >
          Project Actions
        </Link>
      </div>
    </header>
  )
}

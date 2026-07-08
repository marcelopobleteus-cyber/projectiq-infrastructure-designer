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
      label: 'Map',
      href: `/projects/${projectId}/maps`,
      active: pathname.endsWith('/maps'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      )
    },
    {
      label: 'Topology',
      href: `/projects/${projectId}/locations`,
      active: pathname.endsWith('/locations'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><line x1="6" y1="9" x2="12" y2="12"/><line x1="18" y1="9" x2="12" y2="12"/></svg>
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
    <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0c0f1d] shrink-0 w-full relative z-20">
      {/* Project Selector & Status */}
      <div className="flex items-center gap-3">
        <Link href="/projects" className="flex flex-col group">
          <span className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-wider group-hover:text-slate-400 transition-colors">Project</span>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
              {projectName}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400 group-hover:text-sky-450 mt-0.5 transition-colors"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </Link>

        <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8.5px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase mt-3">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      </div>

      {/* Centered Navigation Tabs */}
      <div className="flex items-center bg-slate-950 border border-slate-850 p-0.5 rounded-xl">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              tab.active
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Action Utilities */}
      <div className="flex items-center gap-4">
        {extraActionsSlot && (
          <div className="flex items-center gap-2">
            {extraActionsSlot}
          </div>
        )}

        {/* User / Notification Actions */}
        <div className="flex items-center gap-2.5 text-slate-400">
          <button className="hover:text-white transition-colors" title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <button className="hover:text-white transition-colors" title="Help & Documentation">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button className="hover:text-white transition-colors" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>

          {/* Profile Circle Avatar */}
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-slate-750 hover:text-white transition">
            MA
          </div>
        </div>
      </div>
    </header>
  )
}

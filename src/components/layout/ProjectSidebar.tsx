'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
}

export default function ProjectSidebar({ projectId, projectName }: ProjectSidebarProps) {
  const pathname = usePathname()

  const sections = [
    {
      id: 'overview',
      label: 'Overview',
      href: `/projects/${projectId}/overview`,
      active: pathname === `/projects/${projectId}/overview` || pathname === `/projects/${projectId}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      ),
    },
    {
      id: 'locations',
      label: 'Locations',
      href: `/projects/${projectId}/locations`,
      active: pathname === `/projects/${projectId}/locations`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ),
    },
    {
      id: 'maps',
      label: 'Maps',
      href: `/projects/${projectId}/maps`,
      active: pathname === `/projects/${projectId}/maps`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      ),
    },
    {
      id: 'coordinate-viewer',
      label: 'Coordinate Viewer',
      href: `/projects/${projectId}/coordinate-viewer`,
      active: pathname === `/projects/${projectId}/coordinate-viewer`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
      ),
    },
    {
      id: 'cameras',
      label: 'Cameras',
      href: `/projects/${projectId}/cameras`,
      active: pathname === `/projects/${projectId}/cameras`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
    },
    {
      id: 'network',
      label: 'Network',
      href: `/projects/${projectId}/network`,
      active: pathname === `/projects/${projectId}/network`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
      ),
    },
    {
      id: 'fiber',
      label: 'Fiber',
      href: `/projects/${projectId}/fiber`,
      active: pathname === `/projects/${projectId}/fiber`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
      ),
    },
    {
      id: 'power',
      label: 'Power',
      href: `/projects/${projectId}/power`,
      active: pathname === `/projects/${projectId}/power`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      ),
    },
    {
      id: 'bom',
      label: 'BOM',
      href: `/projects/${projectId}/bom`,
      active: pathname === `/projects/${projectId}/bom`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      href: `/projects/${projectId}/tasks`,
      active: pathname === `/projects/${projectId}/tasks`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      href: `/projects/${projectId}/documents`,
      active: pathname === `/projects/${projectId}/documents`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      href: `/projects/${projectId}/reports`,
      active: pathname === `/projects/${projectId}/reports`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
    },
  ]

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden relative z-10 font-sans">
      {/* Active Project Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/20">
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Project</p>
        <h3 className="font-bold text-sm text-white truncate mt-0.5" title={projectName}>
          {projectName}
        </h3>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-1 scrollbar-thin">
        {sections.map((sec) => (
          <Link
            key={sec.id}
            href={sec.href}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
              sec.active
                ? 'bg-indigo-650/10 border-indigo-500/20 text-white font-semibold shadow-inner shadow-indigo-950/10'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span className={sec.active ? 'text-indigo-400' : 'text-slate-450'}>
              {sec.icon}
            </span>
            {sec.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}

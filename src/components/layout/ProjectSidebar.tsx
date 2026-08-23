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

  const categories = [
    {
      label: 'Project',
      items: [
        {
          id: 'overview',
          label: 'Project Dashboard',
          href: `/projects/${projectId}/overview`,
          active: pathname === `/projects/${projectId}/overview` || pathname === `/projects/${projectId}`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          ),
        },
        {
          id: 'maps',
          label: 'Map Workspace',
          href: `/projects/${projectId}/maps`,
          active: pathname === `/projects/${projectId}/maps`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          ),
        },
        {
          id: 'topology',
          label: 'Topology Workspace',
          href: `/projects/${projectId}/locations`,
          active: pathname === `/projects/${projectId}/locations`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M12 6v12"/><path d="M6 12h12"/></svg>
          ),
        },
      ]
    },
    {
      label: 'Design',
      items: [
        {
          id: 'cameras',
          label: 'Cameras',
          href: `/projects/${projectId}/cameras`,
          active: pathname === `/projects/${projectId}/cameras`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          ),
        },
        {
          id: 'network',
          label: 'Network',
          href: `/projects/${projectId}/network`,
          active: pathname === `/projects/${projectId}/network`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
          ),
        },
        {
          id: 'fiber',
          label: 'Fiber Pathways',
          href: `/projects/${projectId}/fiber`,
          active: pathname === `/projects/${projectId}/fiber`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
          ),
        },
        {
          id: 'wireless',
          label: 'Wireless Backhaul',
          href: `/projects/${projectId}/wireless`,
          active: pathname === `/projects/${projectId}/wireless`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
          ),
        },
        {
          id: 'power',
          label: 'Power Grid',
          href: `/projects/${projectId}/power`,
          active: pathname === `/projects/${projectId}/power`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          ),
        },
      ]
    },
    {
      label: 'Execution',
      items: [
        {
          id: 'tasks',
          label: 'Tasks',
          href: `/projects/${projectId}/tasks`,
          active: pathname === `/projects/${projectId}/tasks`,
          icon: (
            <svg xmlns="http://www.w3.org/2050/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          ),
        },
        {
          id: 'checklists',
          label: 'Field Checklists',
          href: '#',
          active: false,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          ),
        },
      ]
    },
    {
      label: 'Inventory',
      items: [
        {
          id: 'equipment',
          label: 'Project Equipment',
          href: `/projects/${projectId}/coordinate-viewer`,
          active: pathname === `/projects/${projectId}/coordinate-viewer`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          ),
        },
        {
          id: 'bom',
          label: 'Bill of Materials',
          href: `/projects/${projectId}/bom`,
          active: pathname === `/projects/${projectId}/bom`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          ),
        },
      ]
    },
    {
      label: 'Delivery',
      items: [
        {
          id: 'reports-proj',
          label: 'Reports',
          href: `/projects/${projectId}/reports`,
          active: pathname === `/projects/${projectId}/reports`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          ),
        },
        {
          id: 'closeout',
          label: 'Closeout Reports',
          href: '#',
          active: false,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ),
        },
        {
          id: 'documentation',
          label: 'Documentation',
          href: `/projects/${projectId}/documents`,
          active: pathname === `/projects/${projectId}/documents`,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          ),
        },
      ]
    },
    {
      label: 'Settings',
      items: [
        {
          id: 'project-settings',
          label: 'Project Settings',
          href: `/projects/${projectId}/overview`,
          active: false,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          ),
        },
        {
          id: 'users-permissions',
          label: 'Users & Permissions',
          href: '#',
          active: false,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ),
        },
        {
          id: 'project-help',
          label: 'Help & Guides',
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
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 shrink-0 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-sky-400 tracking-wider">NextQ</span>
          <span className="text-[10px] text-slate-500 font-medium">Infrastructure Designer</span>
        </div>
      </div>

      {/* New Project Button */}
      <div className="p-3 pb-0 shrink-0">
        <Link href="/projects/create" className="w-full py-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 text-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </Link>
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

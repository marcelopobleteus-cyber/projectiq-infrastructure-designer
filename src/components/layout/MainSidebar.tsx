'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MainSidebarProps {
  userEmail?: string | null
  userName?: string | null
  onSignOut: () => void
}

export default function MainSidebar({ userEmail, userName, onSignOut }: MainSidebarProps) {
  const pathname = usePathname()

  // Match UUID format for projectId: /projects/ce20138e-9000-42ea-99f7-afd713d08903
  const projectMatch = pathname.match(/^\/projects\/([a-fA-F0-9-]{36})/)
  const projectId = projectMatch ? projectMatch[1] : null

  const items = [
    {
      id: 'projects',
      label: 'Projects',
      icon: (
        <svg xmlns="http://www.w3.org/2051/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      ),
      href: '/projects',
      enabled: true,
      active: pathname === '/projects' || pathname === '/projects/create',
    },
    {
      id: 'map',
      label: 'Map Layout',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      ),
      href: projectId ? `/projects/${projectId}` : '#',
      enabled: !!projectId,
      active: projectId ? pathname === `/projects/${projectId}` : false,
    },
    {
      id: 'cameras',
      label: 'Cameras',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
      href: '#', // Toggled via contexts
      enabled: false, // Under map context sidebar
      active: false,
    },
    {
      id: 'network',
      label: 'Network Matrix',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
      ),
      href: projectId ? `/projects/${projectId}/network` : '#',
      enabled: !!projectId,
      active: projectId ? pathname === `/projects/${projectId}/network` : false,
    },
    {
      id: 'power',
      label: 'Power / PoE',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      ),
      href: '#',
      enabled: false,
      active: false,
    },
    {
      id: 'bom',
      label: 'Materials / BOM',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      ),
      href: '#',
      enabled: false,
      active: false,
    },
    {
      id: 'tasks',
      label: 'Field Tasks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      ),
      href: '#',
      enabled: false,
      active: false,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
      href: '#',
      enabled: false,
      active: false,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      ),
      href: '#',
      enabled: false,
      active: false,
    },
  ]

  return (
    <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full py-4 relative z-20">
      {/* Top Section / Logo */}
      <div className="flex flex-col items-center gap-6">
        <Link href="/projects" title="ProjectIQ" className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm tracking-wider hover:bg-indigo-600/25 transition-all">
          IQ
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2 w-full px-2">
          {items.map((item) => {
            if (!item.enabled) {
              return (
                <div
                  key={item.id}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-650 cursor-not-allowed opacity-40 group relative"
                  title={`${item.label} (Requires active project)`}
                >
                  {item.icon}
                  {/* Tooltip */}
                  <span className="absolute left-16 bg-slate-950 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {item.label} <span className="text-[10px] text-slate-500 block">(Requires active project)</span>
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${
                  item.active
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-semibold'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40 hover:border-slate-800'
                }`}
              >
                {/* Active Indicator Line */}
                {item.active && (
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-indigo-500 rounded-r-md" />
                )}
                {item.icon}
                {/* Tooltip */}
                <span className="absolute left-16 bg-slate-950 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Section / Sign Out */}
      <div className="flex flex-col items-center gap-4 px-2">
        <div className="group relative">
          <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs cursor-default">
            {userName ? userName.substring(0, 2).toUpperCase() : 'US'}
          </div>
          {/* Profile Details Tooltip */}
          <span className="absolute left-16 bottom-0 bg-slate-950 text-slate-200 text-xs font-semibold p-3 rounded-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
            <p className="text-white font-bold">{userName || 'User'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{userEmail}</p>
          </span>
        </div>

        <button
          onClick={onSignOut}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-950/15 hover:border-rose-900/30 border border-transparent transition-all group relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="absolute left-16 bg-slate-950 text-rose-450 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  )
}

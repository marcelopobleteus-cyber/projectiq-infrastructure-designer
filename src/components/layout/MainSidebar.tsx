'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MainSidebarProps {
  userEmail?: string | null
  userName?: string | null
  isPlatformAdmin?: boolean
  onSignOut: () => void
}

export default function MainSidebar({ userEmail, userName, isPlatformAdmin, onSignOut }: MainSidebarProps) {
  const pathname = usePathname()

  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      ),
      href: '/dashboard',
      enabled: true,
      active: pathname === '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      ),
      href: '/projects',
      enabled: true,
      active: pathname.startsWith('/projects'),
    },
    {
      id: 'catalog',
      label: 'Equipment Catalog',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      ),
      href: '/equipment-catalog',
      enabled: true,
      active: pathname.startsWith('/equipment-catalog'),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
      href: '/reports',
      enabled: true,
      active: pathname === '/reports',
    },
    {
      id: 'time-tracking',
      label: 'Time Tracking',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ),
      href: '/time-tracking',
      enabled: true,
      active: pathname === '/time-tracking',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      ),
      href: '/settings',
      enabled: true,
      active: pathname === '/settings',
    },
    ...(isPlatformAdmin
      ? [
          {
            id: 'admin',
            label: 'Platform Admin',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            ),
            href: '/admin',
            enabled: true,
            active: pathname.startsWith('/admin'),
            highlight: true,
          },
        ]
      : []),
  ]

  return (
    <aside className="w-16 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col justify-between shrink-0 h-full py-4 relative z-20 font-sans select-none">
      {/* Top Section / Brand Icon */}
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/dashboard"
          title="NextQ Infrastructure Designer"
          className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm hover:bg-[var(--accent-hover)] transition-all"
        >
          NQ
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 w-full px-2">
          {items.map((item) => {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative ${
                  item.active
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold border-l-2 border-l-[var(--accent)]'
                    : item.highlight
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.icon}
                {/* Tooltip */}
                <span className="absolute left-16 bg-[var(--surface-1)] text-[var(--text-primary)] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Section / Sign Out */}
      <div className="flex flex-col items-center gap-3 px-2">
        <div className="group relative">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs cursor-default">
            {userName ? userName.substring(0, 2).toUpperCase() : 'US'}
          </div>
          {/* Profile Details Tooltip */}
          <span className="absolute left-16 bottom-0 bg-[var(--surface-1)] text-[var(--text-primary)] text-xs font-semibold p-3 rounded-xl border border-[var(--border)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
            <p className="text-[var(--text-primary)] font-bold">{userName || 'User'}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{userEmail}</p>
            {isPlatformAdmin && (
              <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 mt-1">Platform Admin</p>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-rose-50 border border-transparent transition-all group relative cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="absolute left-16 bg-[var(--surface-1)] text-[var(--danger)] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  )
}

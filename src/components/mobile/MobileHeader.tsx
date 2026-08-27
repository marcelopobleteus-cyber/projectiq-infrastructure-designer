'use client'

import React from 'react'
import Link from 'next/link'

interface MobileHeaderProps {
  title?: string
  subtitle?: string
  onToggleDrawer: () => void
  isDrawerOpen: boolean
}

export default function MobileHeader({
  title = 'NextQ Mobile',
  subtitle,
  onToggleDrawer,
  isDrawerOpen,
}: MobileHeaderProps) {
  return (
    <header className="h-14 bg-[var(--surface-1)] border-b border-[var(--border)] px-4 flex items-center justify-between sticky top-0 z-40 shrink-0 font-sans shadow-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/mobile/projects" className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
          NQ
        </Link>
        <div className="min-w-0">
          <h1 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleDrawer}
        aria-label="Abrir menú de navegación"
        className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        {isDrawerOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>
    </header>
  )
}

'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

export default function ProjectsContentArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Only make it scrollable for catalog/creation lists (e.g. /projects or /projects/create).
  // For nested project details (e.g., /projects/[id]/...), the nested layout will manage its own scrolling.
  const isCatalogPage = pathname === '/projects' || pathname === '/projects/' || pathname?.startsWith('/projects/create')

  return (
    <div className={`flex-1 flex flex-col bg-slate-950 ${isCatalogPage ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {children}
    </div>
  )
}

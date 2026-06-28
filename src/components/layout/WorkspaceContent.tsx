'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

export default function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Full-screen apps (fiber map, maps workspace, network switch ports matrix) should be overflow-hidden
  // Other text/list/table pages (overview, locations, bom, tasks, documents, reports, etc.) should allow vertical scrolling
  const isMapOrCanvas = pathname?.endsWith('/fiber') || pathname?.endsWith('/maps') || pathname?.endsWith('/network')

  return (
    <div className={`flex-1 flex flex-col relative bg-background h-full w-full ${isMapOrCanvas ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {children}
    </div>
  )
}

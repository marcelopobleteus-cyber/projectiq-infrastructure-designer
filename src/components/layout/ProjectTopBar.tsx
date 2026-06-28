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
  
  const isNetwork = pathname.endsWith('/network')
  const view = isNetwork ? 'network' : 'map'
  const breadcrumbText = isNetwork ? 'Network Matrix' : 'Map Layout'

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/60 dark:bg-slate-900/30 backdrop-blur-md shrink-0 w-full relative z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2.5 text-xs">
        <Link href="/design-review/projects" className="text-muted-foreground hover:text-foreground transition-colors">
          Projects
        </Link>
        <span className="text-slate-350 dark:text-slate-650">/</span>
        <span className="text-muted-foreground truncate max-w-40 font-medium" title={projectName}>
          {projectName}
        </span>
        <span className="text-slate-350 dark:text-slate-650">/</span>
        <span className="text-indigo-650 dark:text-indigo-400 font-semibold uppercase tracking-wide">
          {breadcrumbText}
        </span>
      </div>

      {/* Nav & Extra Actions */}
      <div className="flex items-center gap-4">
        

        {extraActionsSlot && (
          <div className="flex items-center gap-2">
            {extraActionsSlot}
          </div>
        )}
      </div>
    </header>
  )
}

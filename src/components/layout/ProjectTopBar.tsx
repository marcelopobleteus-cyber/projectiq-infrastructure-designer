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
    <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-md shrink-0 w-full relative z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2.5 text-xs">
        <Link href="/design-review/projects" className="text-slate-400 hover:text-white transition-colors">
          Projects
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 truncate max-w-40 font-medium" title={projectName}>
          {projectName}
        </span>
        <span className="text-slate-600">/</span>
        <span className="text-indigo-400 font-semibold uppercase tracking-wide">
          {breadcrumbText}
        </span>
      </div>

      {/* Nav & Extra Actions */}
      <div className="flex items-center gap-4">
        {/* Toggle between Map View and Network View */}
        <div className="flex items-center bg-slate-950/80 border border-slate-850 p-1 rounded-xl">
          <Link
            href={`/projects/${projectId}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              view === 'map'
                ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400'
                : 'border border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Map View
          </Link>
          <Link
            href={`/projects/${projectId}/network`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              view === 'network'
                ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400'
                : 'border border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Network View
          </Link>
        </div>

        {extraActionsSlot && (
          <div className="flex items-center gap-2">
            {extraActionsSlot}
          </div>
        )}
      </div>
    </header>
  )
}

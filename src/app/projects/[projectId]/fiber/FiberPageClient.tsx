'use client'

import React, { useState } from 'react'
import FiberMapCanvas from './FiberMapCanvas'
import FiberConnectivityDiagram from './FiberConnectivityDiagram'

interface FiberPageClientProps {
  projectId: string
  initialData: any
  fiberCatalog: any[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
}

export default function FiberPageClient({
  projectId,
  initialData,
  fiberCatalog,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
}: FiberPageClientProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'diagram'>('map')

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full font-sans bg-[var(--bg)]">
      {/* Tab Navigation Header */}
      <div className="bg-[var(--surface-1)] border-b border-[var(--border)] px-6 py-2 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              activeTab === 'map'
                ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--accent-border)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setActiveTab('diagram')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              activeTab === 'diagram'
                ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--accent-border)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent'
            }`}
          >
            Connectivity Diagram
          </button>
        </div>

        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
          Fiber Workspace Mode
        </div>
      </div>

      {/* Conditionally Render Active View */}
      <div className="flex-1 flex overflow-hidden h-full w-full">
        {activeTab === 'map' ? (
          <FiberMapCanvas
            projectId={projectId}
            initialData={initialData}
            fiberCatalog={fiberCatalog}
            defaultLatitude={defaultLatitude}
            defaultLongitude={defaultLongitude}
            defaultZoom={defaultZoom}
          />
        ) : (
          <FiberConnectivityDiagram
            nodes={initialData?.nodes ?? []}
            cables={initialData?.cables ?? []}
            strands={initialData?.strands ?? []}
            enclosures={initialData?.enclosures ?? []}
            spliceRecords={initialData?.spliceRecords ?? []}
          />
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Database } from '@/types/supabase'
import NetworkPortCanvas from './NetworkPortCanvas'
import NetworkTopologyDiagram from './NetworkTopologyDiagram'

type NetworkDevice = Database['public']['Tables']['network_devices']['Row']
type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']

interface NetworkPageClientProps {
  projectId: string
  networkDevices: NetworkDevice[]
  cameras: CameraLocation[]
  cameraModels: CameraModel[]
}

export default function NetworkPageClient({
  projectId,
  networkDevices,
  cameras,
  cameraModels,
}: NetworkPageClientProps) {
  const [activeTab, setActiveTab] = useState<'ports' | 'topology'>('ports')

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full font-sans bg-[var(--bg)]">
      {/* Tab Navigation Header */}
      <div className="bg-[var(--surface-1)] border-b border-[var(--border)] px-6 py-2 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ports')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              activeTab === 'ports'
                ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--accent-border)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent'
            }`}
          >
            Port Matrix
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              activeTab === 'topology'
                ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--accent-border)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent'
            }`}
          >
            Topology Diagram
          </button>
        </div>

        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
          Network Workspace Mode
        </div>
      </div>

      {/* Conditionally Render Active View */}
      <div className="flex-1 flex overflow-hidden h-full w-full">
        {activeTab === 'ports' ? (
          <NetworkPortCanvas
            projectId={projectId}
            networkDevices={networkDevices}
            cameras={cameras}
            cameraModels={cameraModels}
          />
        ) : (
          <NetworkTopologyDiagram
            projectId={projectId}
            networkDevices={networkDevices}
            cameras={cameras}
            cameraModels={cameraModels}
          />
        )}
      </div>
    </div>
  )
}

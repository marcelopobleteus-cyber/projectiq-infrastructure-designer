'use client'

import React from 'react'

interface ContextSidebarProps {
  view: 'map' | 'network' | 'other'
  projectTitle: string
  camerasCount?: number
  devicesCount?: number
  poeWarningsCount?: number
  
  // Map specific callbacks/controls
  activeLayer?: 'hybrid' | 'roadmap' | 'satellite'
  onLayerChange?: (layer: 'hybrid' | 'roadmap' | 'satellite') => void
  showCameras?: boolean
  onToggleShowCameras?: () => void
  showDevices?: boolean
  onToggleShowDevices?: () => void
  
  // Custom sidebar contents/list slots
  cameraListSlot?: React.ReactNode
  deviceListSlot?: React.ReactNode
  poeListSlot?: React.ReactNode
}

export default function ContextSidebar({
  view,
  projectTitle,
  camerasCount = 0,
  devicesCount = 0,
  poeWarningsCount = 0,
  activeLayer = 'hybrid',
  onLayerChange,
  showCameras = true,
  onToggleShowCameras,
  showDevices = true,
  onToggleShowDevices,
  cameraListSlot,
  deviceListSlot,
  poeListSlot,
}: ContextSidebarProps) {
  return (
    <aside className="w-60 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col shrink-0 h-full overflow-hidden relative z-10 font-sans">
      {/* Context Title Header */}
      <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <p className="text-[10px] text-[var(--accent-text)] font-bold uppercase tracking-wider font-mono">Active Project</p>
        <h3 className="font-extrabold text-xs text-[var(--text-primary)] truncate mt-0.5" title={projectTitle}>{projectTitle}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-5 scrollbar-thin">
        {view === 'map' && (
          <>
            {/* Map Layer Controls */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Map Layers</h4>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                {(['hybrid', 'roadmap', 'satellite'] as const).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => onLayerChange?.(layer)}
                    className={`py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all capitalize cursor-pointer ${
                      activeLayer === layer
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {layer === 'roadmap' ? 'Road' : layer === 'hybrid' ? 'Hybrid' : 'Sat'}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Filters */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Filters & Layers</h4>
              <div className="space-y-1">
                <button
                  onClick={onToggleShowCameras}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg text-left text-xs text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${showCameras ? 'bg-[var(--success)]' : 'bg-[var(--pending)]'}`} />
                    Camera Locations
                  </span>
                  <span className="font-bold text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded-md font-mono">
                    {camerasCount}
                  </span>
                </button>

                <button
                  onClick={onToggleShowDevices}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg text-left text-xs text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${showDevices ? 'bg-[var(--accent)]' : 'bg-[var(--pending)]'}`} />
                    Network Devices
                  </span>
                  <span className="font-bold text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded-md font-mono">
                    {devicesCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Camera Locations List */}
            {cameraListSlot && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Placed Cameras</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {cameraListSlot}
                </div>
              </div>
            )}

            {/* Network Devices List */}
            {deviceListSlot && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Network Nodes</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {deviceListSlot}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'network' && (
          <>
            {/* Devices Summary */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Network Devices</h4>
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Total Switches:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{devicesCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Active Warnings:</span>
                  <span className={`font-bold font-mono ${poeWarningsCount > 0 ? 'text-[var(--warn)]' : 'text-[var(--text-secondary)]'}`}>
                    {poeWarningsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Switch List Slot */}
            {deviceListSlot && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Select Switch</h4>
                <div className="space-y-1">
                  {deviceListSlot}
                </div>
              </div>
            )}

            {/* PoE summary slot */}
            {poeListSlot && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PoE Power Budgets</h4>
                <div className="space-y-1">
                  {poeListSlot}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

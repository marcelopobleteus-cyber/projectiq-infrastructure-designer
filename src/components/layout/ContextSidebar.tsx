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
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden relative z-10">
      {/* Context Title Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/20">
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Active Project</p>
        <h3 className="font-bold text-sm text-white truncate mt-0.5" title={projectTitle}>{projectTitle}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {view === 'map' && (
          <>
            {/* Map Layer Controls */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map Layers</h4>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl">
                {(['hybrid', 'roadmap', 'satellite'] as const).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => onLayerChange?.(layer)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all capitalize ${
                      activeLayer === layer
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {layer === 'roadmap' ? 'Road' : layer === 'hybrid' ? 'Hybrid' : 'Sat'}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Filters */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters & Layers</h4>
              <div className="space-y-1.5">
                <button
                  onClick={onToggleShowCameras}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl text-left text-xs text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${showCameras ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                    Camera Locations
                  </span>
                  <span className="font-semibold text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                    {camerasCount}
                  </span>
                </button>

                <button
                  onClick={onToggleShowDevices}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl text-left text-xs text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${showDevices ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    Network Devices
                  </span>
                  <span className="font-semibold text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                    {devicesCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Camera Locations List */}
            {cameraListSlot && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placed Cameras</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {cameraListSlot}
                </div>
              </div>
            )}

            {/* Network Devices List */}
            {deviceListSlot && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Nodes</h4>
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
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Devices</h4>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Switches:</span>
                  <span className="font-bold text-white">{devicesCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Active Warnings:</span>
                  <span className={`font-bold ${poeWarningsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
                    {poeWarningsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Switch List Slot */}
            {deviceListSlot && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Switch</h4>
                <div className="space-y-1.5">
                  {deviceListSlot}
                </div>
              </div>
            )}

            {/* PoE summary/VLAN toggle placeholders */}
            {poeListSlot && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PoE Power Budgets</h4>
                <div className="space-y-1.5">
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

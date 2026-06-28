'use client'

import React from 'react'
import { LAYERS, CATEGORY_MAPPINGS } from '@/lib/layers/layerRegistry'

interface LayerControlPanelProps {
  isLayerPanelOpen: boolean
  setIsLayerPanelOpen: (open: boolean) => void
  layerVisibility: Record<string, boolean>
  setLayerVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export default function LayerControlPanel({
  isLayerPanelOpen,
  setIsLayerPanelOpen,
  layerVisibility,
  setLayerVisibility
}: LayerControlPanelProps) {
  const activeLayersCount = LAYERS.filter(
    l => layerVisibility[l.id] && (l.status === 'Active' || l.status === 'Partial')
  ).length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="text-[8px] font-bold px-1.5 py-0.25 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded shrink-0">Active</span>
      case 'Partial':
        return <span className="text-[8px] font-bold px-1.5 py-0.25 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded shrink-0">Partial</span>
      case 'Planned':
        return <span className="text-[8px] font-bold px-1.5 py-0.25 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded shrink-0">Planned</span>
      case 'Future':
        return <span className="text-[8px] font-bold px-1.5 py-0.25 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded shrink-0">Future</span>
      default:
        return null
    }
  }

  return (
    <>
      {!isLayerPanelOpen ? (
        <button
          type="button"
          onClick={() => setIsLayerPanelOpen(true)}
          className="absolute top-16 right-4 z-20 w-10 h-10 bg-slate-900/95 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-white rounded-xl shadow-xl flex items-center justify-center pointer-events-auto transition-all duration-200"
          title="Workspace Layers"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          {activeLayersCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-indigo-650 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-slate-900">
              {activeLayersCount}
            </span>
          )}
        </button>
      ) : (
        <div className="absolute top-16 right-4 z-20 w-80 max-h-[calc(100%-6rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all duration-200 overflow-hidden font-sans">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-2.5 shrink-0">
            <div>
              <h4 className="font-bold text-white text-xs tracking-tight flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
                Workspace Layers
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Toggle OSP disciplines visibility</p>
            </div>
            <button
              type="button"
              onClick={() => setIsLayerPanelOpen(false)}
              className="p-1 rounded bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Scrollable Layer Groups */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 scrollbar-thin max-h-[360px]">
            {Object.entries(CATEGORY_MAPPINGS).map(([category, layerIds]) => {
              return (
                <div key={category} className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{category}</span>
                  <div className="space-y-1 bg-slate-950/30 p-1.5 rounded-xl border border-slate-850/60">
                    {layerIds.map(id => {
                      const layer = LAYERS.find(l => l.id === id)
                      if (!layer) return null

                      const isInteractive = layer.status === 'Active' || layer.status === 'Partial'
                      const isChecked = layerVisibility[id] ?? false

                      return (
                        <div key={id} className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                          isInteractive 
                            ? 'hover:bg-slate-850/50' 
                            : 'opacity-40 italic cursor-not-allowed pointer-events-none select-none'
                        }`}>
                          {isInteractive ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setLayerVisibility(prev => ({
                                  ...prev,
                                  [id]: !isChecked
                                }))
                              }}
                              className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer shrink-0"
                            />
                          ) : (
                            <div className="w-3 h-3 rounded border border-slate-850 bg-slate-900/40 shrink-0 mt-0.5" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[10px] font-semibold truncate flex items-center gap-1.5 ${
                                isInteractive ? 'text-slate-200' : 'text-slate-400'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isInteractive ? layer.color : '#475569' }} />
                                {layer.name}
                              </span>
                              {getStatusBadge(layer.status)}
                            </div>
                            <span className={`block text-[8.5px] leading-snug mt-0.25 ${
                              isInteractive ? 'text-slate-500' : 'text-slate-600'
                            }`}>{layer.description}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800 mt-2.5 flex justify-between items-center text-[9px] text-slate-500 shrink-0">
            <span>Active: {activeLayersCount}/{LAYERS.length}</span>
            <button
              type="button"
              onClick={() => {
                const defaults: Record<string, boolean> = {}
                LAYERS.forEach(l => {
                  defaults[l.id] = l.defaultVisible
                })
                setLayerVisibility(defaults)
              }}
              className="hover:text-white font-bold transition-colors"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      )}
    </>
  )
}

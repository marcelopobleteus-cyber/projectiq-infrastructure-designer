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
        return <span className="text-[8px] font-bold px-1.5 py-0.25 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 border border-[var(--accent)]/20 text-[var(--accent-text)] rounded shrink-0">Planned</span>
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
          className="absolute top-16 right-4 z-20 w-10 h-10 bg-[var(--surface-1)]/95 border border-[var(--border)] hover:border-slate-700 text-[var(--text-secondary)] hover:text-white rounded-xl shadow-xl flex items-center justify-center pointer-events-auto transition-all duration-200"
          title="Workspace Layers"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          {activeLayersCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[var(--border)]">
              {activeLayersCount}
            </span>
          )}
        </button>
      ) : (
        <div className="absolute top-16 right-4 z-20 w-80 max-h-[calc(100%-6rem)] bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all duration-200 overflow-hidden font-sans">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-2.5 mb-2.5 shrink-0">
            <div>
              <h4 className="font-bold text-white text-xs tracking-tight flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-text)]">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
                Workspace Layers
              </h4>
              <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Toggle OSP disciplines visibility</p>
            </div>
            <button
              type="button"
              onClick={() => setIsLayerPanelOpen(false)}
              className="p-1 rounded bg-[var(--surface-2)] hover:bg-slate-850 text-[var(--text-secondary)] hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Scrollable Layer Groups */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 scrollbar-thin max-h-[360px]">
            {Object.entries(CATEGORY_MAPPINGS).map(([category, layerIds]) => {
              return (
                <div key={category} className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-[var(--accent-text)] uppercase tracking-wider">{category}</span>
                  <div className="space-y-1 bg-[var(--surface-2)]/30 p-1.5 rounded-xl border border-[var(--border)]/60">
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
                              className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer shrink-0"
                            />
                          ) : (
                            <div className="w-3 h-3 rounded border border-[var(--border)] bg-[var(--surface-1)] shrink-0 mt-0.5" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[10px] font-semibold truncate flex items-center gap-1.5 ${
                                isInteractive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isInteractive ? layer.color : '#475569' }} />
                                {layer.name}
                              </span>
                              {getStatusBadge(layer.status)}
                            </div>
                            <span className={`block text-[8.5px] leading-snug mt-0.25 ${
                              isInteractive ? 'text-[var(--text-tertiary)]' : 'text-slate-600'
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
          <div className="pt-2 border-t border-[var(--border)] mt-2.5 flex justify-between items-center text-[9px] text-[var(--text-tertiary)] shrink-0">
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

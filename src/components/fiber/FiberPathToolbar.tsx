'use client'

import React from 'react'
import { Database } from '@/types/supabase'

type FiberNode = Database['public']['Tables']['fiber_nodes']['Row']

interface FiberPathToolbarProps {
  isDrawMode: boolean
  onToggleDrawMode: () => void
  pathNodes: FiberNode[]
  onUndo: () => void
  onClear: () => void
  onConfigure: () => void
  fiberNodeCount: number
  isConfiguring: boolean
}

export default function FiberPathToolbar({
  isDrawMode,
  onToggleDrawMode,
  pathNodes,
  onUndo,
  onClear,
  onConfigure,
  fiberNodeCount,
  isConfiguring,
}: FiberPathToolbarProps) {
  const hasNodes = pathNodes.length > 0
  const canConfigure = pathNodes.length >= 2

  return (
    <div
      className={`
        absolute top-4 right-16 z-50
        bg-[var(--surface-1)]/90 backdrop-blur-xl border rounded-2xl shadow-2xl
        transition-all duration-200
        ${isDrawMode
          ? 'border-[var(--accent)]/50 ring-1 ring-indigo-500/20'
          : 'border-slate-700/60'
        }
      `}
      style={{ width: 260 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]/60">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDrawMode ? '#818cf8' : '#64748b'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17L9 11L13 15L21 7" />
          <circle cx="3" cy="17" r="2" />
          <circle cx="21" cy="7" r="2" />
        </svg>
        <span className={`text-[11px] font-bold tracking-wide uppercase ${isDrawMode ? 'text-indigo-300' : 'text-[var(--text-secondary)]'}`}>
          Fiber Path Design
        </span>

        {/* Node count badge */}
        <span className="ml-auto text-[9px] bg-slate-800 border border-slate-700 text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full font-mono">
          {fiberNodeCount} node{fiberNodeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3">
        {/* Draw Route toggle */}
        <button
          id="fiber-draw-route-toggle"
          onClick={onToggleDrawMode}
          className={`
            w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-[11px] tracking-wide
            transition-all border shadow-lg
            ${isDrawMode
              ? 'bg-[var(--accent)] text-white border-[var(--accent)] text-white hover:bg-[var(--accent)] text-white hover:shadow-indigo-500/10'
              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/40 hover:text-indigo-300'
            }
          `}
        >
          {isDrawMode ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
              Exit Design Mode
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 17L9 11L13 15L21 7" /><circle cx="3" cy="17" r="2" /><circle cx="21" cy="7" r="2" /></svg>
              Design Fiber Route
            </>
          )}
        </button>

        {/* Selection state — only shown in draw mode */}
        {isDrawMode && (
          <div className="space-y-3">
            {/* Ordered node path list */}
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 select-none">
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold block">
                Selected Path Sequence ({pathNodes.length})
              </span>

              {pathNodes.length === 0 ? (
                <div className="text-[11px] text-[var(--text-tertiary)] italic py-4 text-center bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
                  Click nodes on the map in order
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pathNodes.map((node, index) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)] text-white/20 text-[var(--accent-text)] text-[9px] font-bold font-mono">
                        {index + 1}
                      </span>
                      <span className="font-mono text-white font-medium truncate flex-1">{node.node_tag}</span>
                      <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-tight">{node.node_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Path controls */}
            {hasNodes && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="fiber-draw-undo-node"
                  type="button"
                  onClick={onUndo}
                  className="px-2.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] hover:border-slate-700 text-[var(--text-secondary)] hover:text-white text-[10px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                  Undo Last
                </button>
                <button
                  id="fiber-draw-clear-path"
                  type="button"
                  onClick={onClear}
                  className="px-2.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] hover:border-red-900/50 text-[var(--text-secondary)] hover:text-red-400 text-[10px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                >
                  ✕ Clear Path
                </button>
              </div>
            )}

            {/* Configure Button */}
            {canConfigure && (
              <button
                id="fiber-draw-configure-route"
                type="button"
                onClick={onConfigure}
                disabled={isConfiguring}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/30 disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white font-bold text-[11px] rounded-xl transition-all shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {isConfiguring ? 'Drawer Open' : 'Configure Route'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useMemo, useState } from 'react'
import { Database } from '@/types/supabase'
import { ASSET_CONDITION_LABELS, WORK_SCOPE_LABELS, type AssetCondition, type WorkScope } from '@/lib/assetCondition'

type ConduitStructure = Database['public']['Tables']['conduit_structures']['Row'] & {
  fiber_nodes?: { node_tag: string; node_type: string } | { node_tag: string; node_type: string }[] | null
}
type ConduitRun = Database['public']['Tables']['conduit_runs']['Row'] & {
  fiber_routes?: { route_id_tag: string; route_purpose: string; installation_type: string } | { route_id_tag: string; route_purpose: string; installation_type: string }[] | null
}

interface ConduitPageClientProps {
  projectId: string
  structures: ConduitStructure[]
  runs: ConduitRun[]
}

// Supabase returns a joined one-to-one relation as either an object or a
// single-item array depending on how the FK is declared — normalize both.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  handhole: 'Handhole',
  manhole: 'Manhole',
  pull_box: 'Pull Box',
  vault: 'Vault',
}

function ConditionPill({ condition }: { condition: AssetCondition }) {
  const styles: Record<AssetCondition, string> = {
    new: 'text-[var(--success)] bg-[var(--success-soft,rgba(34,197,94,0.1))] border-[var(--success)]/30',
    existing: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    unknown: 'text-[var(--text-tertiary)] bg-[var(--surface-2)] border-[var(--border)]',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${styles[condition]}`}>
      {ASSET_CONDITION_LABELS[condition]}
    </span>
  )
}

function ScopePill({ scope }: { scope: WorkScope }) {
  const buys = scope === 'install' || scope === 'replace'
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
        buys
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          : 'text-[var(--text-secondary)] bg-[var(--surface-2)] border-[var(--border)]'
      }`}
    >
      {WORK_SCOPE_LABELS[scope]}
    </span>
  )
}

export default function ConduitPageClient({ structures, runs }: ConduitPageClientProps) {
  const [tab, setTab] = useState<'runs' | 'structures'>('runs')

  const metrics = useMemo(() => {
    const totalLengthFt = runs.reduce((acc, r) => acc + Number(r.length_feet || 0), 0)
    const newStructures = structures.filter(s => s.asset_condition === 'new').length
    const existingStructures = structures.filter(s => s.asset_condition === 'existing').length
    const newRuns = runs.filter(r => r.asset_condition === 'new').length
    const existingRuns = runs.filter(r => r.asset_condition === 'existing').length
    return {
      totalRuns: runs.length,
      totalStructures: structures.length,
      totalLengthFt,
      newStructures,
      existingStructures,
      newRuns,
      existingRuns,
    }
  }, [structures, runs])

  const summaryCards = [
    { label: 'Duct Bank Runs', value: metrics.totalRuns },
    { label: 'Total Length', value: `${metrics.totalLengthFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft` },
    { label: 'Structures', value: metrics.totalStructures },
    { label: 'New (Runs / Structures)', value: `${metrics.newRuns} / ${metrics.newStructures}` },
    { label: 'Existing (Runs / Structures)', value: `${metrics.existingRuns} / ${metrics.existingStructures}` },
  ]

  return (
    <div className="space-y-4 relative z-10 w-full h-full px-6 py-4 flex-1 flex flex-col overflow-hidden bg-[var(--bg)] font-sans">
      <div>
        <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Conduit & Duct Bank</h1>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          Civil-works layer mirrored from the Fiber module — every duct run and structure below is generated
          automatically when a matching fiber route or node is created.
        </p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {summaryCards.map((m, idx) => (
          <div
            key={idx}
            className="border rounded-xl p-3 flex flex-col justify-between h-20 shadow-xs text-[var(--text-primary)] border-[var(--border)] bg-[var(--surface-1)]"
          >
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {m.label}
            </span>
            <span className="text-xl font-black tracking-tight font-mono mt-1">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setTab('runs')}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
            tab === 'runs'
              ? 'border-[var(--accent)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Duct Bank Runs ({runs.length})
        </button>
        <button
          onClick={() => setTab('structures')}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
            tab === 'structures'
              ? 'border-[var(--accent)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Structures ({structures.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        {tab === 'runs' ? (
          runs.length === 0 ? (
            <EmptyState
              title="No duct bank runs yet"
              subtitle="Create a fiber route with a new or existing conduit condition in the Fiber module — a matching run shows up here automatically."
            />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--surface-2)] text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left font-bold px-3 py-2">Run Tag</th>
                  <th className="text-left font-bold px-3 py-2">Fiber Route</th>
                  <th className="text-left font-bold px-3 py-2">Install Method</th>
                  <th className="text-right font-bold px-3 py-2">Diameter (in)</th>
                  <th className="text-right font-bold px-3 py-2">Length (ft)</th>
                  <th className="text-left font-bold px-3 py-2">Condition</th>
                  <th className="text-left font-bold px-3 py-2">Work Scope</th>
                  <th className="text-left font-bold px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {runs.map(run => {
                  const route = one(run.fiber_routes)
                  return (
                    <tr key={run.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{run.run_tag}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{route?.route_id_tag ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] capitalize">{run.install_method}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">{run.diameter_inches}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                        {Number(run.length_feet).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-2">
                        <ConditionPill condition={run.asset_condition} />
                      </td>
                      <td className="px-3 py-2">
                        <ScopePill scope={run.work_scope} />
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{run.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        ) : structures.length === 0 ? (
          <EmptyState
            title="No conduit structures yet"
            subtitle="Add a Manhole, Handhole, Pull Box or Vault node in the Fiber module — the matching civil structure shows up here automatically."
          />
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--surface-2)] text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-3 py-2">Structure Tag</th>
                <th className="text-left font-bold px-3 py-2">Type</th>
                <th className="text-left font-bold px-3 py-2">Fiber Node</th>
                <th className="text-left font-bold px-3 py-2">Size</th>
                <th className="text-right font-bold px-3 py-2">Depth (ft)</th>
                <th className="text-left font-bold px-3 py-2">Condition</th>
                <th className="text-left font-bold px-3 py-2">Work Scope</th>
                <th className="text-left font-bold px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {structures.map(s => {
                const node = one(s.fiber_nodes)
                return (
                  <tr key={s.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{s.structure_tag}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {STRUCTURE_TYPE_LABELS[s.structure_type] ?? s.structure_type}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{node?.node_tag ?? '—'}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{s.size_description ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                      {s.depth_ft ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <ConditionPill condition={s.asset_condition} />
                    </td>
                    <td className="px-3 py-2">
                      <ScopePill scope={s.work_scope} />
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{s.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16 gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)] mb-1">
        <path d="M4 6h6a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4h2" />
        <circle cx="4" cy="6" r="2" />
        <circle cx="20" cy="18" r="2" />
      </svg>
      <span className="text-xs font-bold text-[var(--text-primary)]">{title}</span>
      <span className="text-[11px] text-[var(--text-tertiary)] max-w-sm">{subtitle}</span>
    </div>
  )
}

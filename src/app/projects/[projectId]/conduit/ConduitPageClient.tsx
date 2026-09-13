'use client'

import React, { useMemo, useState } from 'react'
import { Database } from '@/types/supabase'
import { ASSET_CONDITION_LABELS, WORK_SCOPE_LABELS, type AssetCondition, type WorkScope } from '@/lib/assetCondition'

type ConduitStructure = Database['public']['Tables']['conduit_structures']['Row'] & {
  fiber_nodes?: { node_tag: string; node_type: string } | { node_tag: string; node_type: string }[] | null
}
type ConduitRunRoute = {
  route_id_tag: string
  route_purpose: string
  installation_type: string
  fill_percentage: number | null
  spare_capacity: number | null
}
type ConduitRun = Database['public']['Tables']['conduit_runs']['Row'] & {
  fiber_routes?: ConduitRunRoute | ConduitRunRoute[] | null
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

// NEC-style conduit fill guidance for communications cable: 40% is the
// conventional ceiling that keeps a duct pullable without excessive
// friction. Anything above that is flagged, not blocked — the field crew
// makes the final call, this is a heads-up.
const FILL_WARN_THRESHOLD = 40

function FillBar({ percentage }: { percentage: number | null }) {
  if (percentage === null) {
    return <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
  }
  const clamped = Math.min(percentage, 100)
  const over = percentage > FILL_WARN_THRESHOLD
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`font-mono text-[10.5px] font-bold ${over ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  handhole: 'Handhole',
  manhole: 'Manhole',
  pull_box: 'Pull Box',
  vault: 'Vault',
}

/**
 * Duct bank cross-section — the dedicated design view the ductery gap
 * analysis called out (`claude/gaps-fibra-ducteria-networking.md`, gap #1).
 * Draws each way in the bank to scale; way 1 carries the route's recorded
 * fill % (area-proportional, not linear — area scales with r²), the rest
 * are shown as open/spare capacity for a future pull.
 */
function DuctCrossSection({ run, route }: { run: ConduitRun; route: ConduitRunRoute | null }) {
  const ways = Math.max(1, run.ways ?? 1)
  const diameterIn = Number(run.diameter_inches) || 2
  const fillPct = route?.fill_percentage ?? 0

  const cellSize = 96
  const padding = 16
  const width = ways * cellSize + padding * 2
  const height = cellSize + padding * 2 + 28
  const outerR = cellSize / 2 - 6

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 180 }}>
        {Array.from({ length: ways }).map((_, i) => {
          const cx = padding + cellSize * i + cellSize / 2
          const cy = padding + outerR + 6
          const isOccupied = i === 0
          // Area, not radius, scales with fill % — a 40% fill duct doesn't
          // look 40% "full" if you just shrink the radius linearly.
          const innerR = isOccupied ? outerR * Math.sqrt(Math.min(fillPct, 100) / 100) : 0
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={outerR} fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
              {isOccupied && innerR > 0 && (
                <circle cx={cx} cy={cy} r={innerR} fill={fillPct > FILL_WARN_THRESHOLD ? '#f59e0b' : '#10b981'} opacity="0.75" />
              )}
              <text x={cx} y={cy + outerR + 16} textAnchor="middle" className="fill-[var(--text-tertiary)]" style={{ fontSize: 9, fontWeight: 700 }}>
                Way {i + 1}
              </text>
              <text x={cx} y={cy + 4} textAnchor="middle" className="fill-[var(--text-secondary)]" style={{ fontSize: 8, fontFamily: 'monospace' }}>
                {isOccupied ? `${fillPct.toFixed(0)}%` : 'spare'}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="text-[10.5px] text-[var(--text-secondary)] space-y-1 font-mono">
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Ways in bank</span><span>{ways}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Diameter / way</span><span>{diameterIn}&quot;</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Install method</span><span className="capitalize">{run.install_method}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Route fill (Way 1)</span><span>{route ? `${fillPct.toFixed(0)}%` : '—'}</span></div>
      </div>
      {ways === 1 && (
        <p className="text-[10px] text-[var(--text-tertiary)] leading-snug">
          Single-way bank — no spare duct for a future pull without opening the trench again.
        </p>
      )}
    </div>
  )
}

/** Parses the "WxLxD" (inches) shorthand used for structure size_description. */
function parseBoxDims(desc: string | null): { w: number; l: number; d: number } | null {
  if (!desc) return null
  const parts = desc.toLowerCase().split('x').map(p => parseFloat(p.trim()))
  if (parts.length < 2 || parts.some(n => Number.isNaN(n))) return null
  return { w: parts[0], l: parts[1], d: parts[2] ?? parts[1] }
}

function StructureCrossSection({ structure }: { structure: ConduitStructure }) {
  const dims = parseBoxDims(structure.size_description)
  const maxSide = dims ? Math.max(dims.w, dims.l) : null
  const boxSize = 140

  return (
    <div className="space-y-2">
      {dims && maxSide ? (
        <svg viewBox="0 0 180 160" className="w-full" style={{ maxHeight: 160 }}>
          {(() => {
            const w = (dims.w / maxSide) * boxSize
            const l = (dims.l / maxSide) * boxSize
            const x = (180 - w) / 2
            const y = (160 - l) / 2 - 6
            return (
              <>
                <rect x={x} y={y} width={w} height={l} rx={3} fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
                <text x={90} y={y - 6} textAnchor="middle" className="fill-[var(--text-secondary)]" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {dims.w}&quot;
                </text>
                <text x={x - 6} y={y + l / 2} textAnchor="end" className="fill-[var(--text-secondary)]" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {dims.l}&quot;
                </text>
                <text x={90} y={y + l + 20} textAnchor="middle" className="fill-[var(--text-tertiary)]" style={{ fontSize: 9, fontWeight: 700 }}>
                  Plan view (top-down)
                </text>
              </>
            )
          })()}
        </svg>
      ) : (
        <div className="h-24 flex items-center justify-center text-[10.5px] text-[var(--text-tertiary)]">
          No parseable size on file
        </div>
      )}
      <div className="text-[10.5px] text-[var(--text-secondary)] space-y-1 font-mono">
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Size (W x L x D)</span><span>{structure.size_description ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Depth</span><span>{structure.depth_ft ? `${structure.depth_ft} ft` : '—'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-tertiary)] font-sans">Cover rating</span><span>{structure.cover_rating ?? '—'}</span></div>
      </div>
    </div>
  )
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null)

  const switchTab = (next: 'runs' | 'structures') => {
    setTab(next)
    setSelectedRunId(null)
    setSelectedStructureId(null)
  }

  const selectedRun = runs.find(r => r.id === selectedRunId) ?? null
  const selectedStructure = structures.find(s => s.id === selectedStructureId) ?? null

  const metrics = useMemo(() => {
    const totalLengthFt = runs.reduce((acc, r) => acc + Number(r.length_feet || 0), 0)
    const newStructures = structures.filter(s => s.asset_condition === 'new').length
    const existingStructures = structures.filter(s => s.asset_condition === 'existing').length
    const newRuns = runs.filter(r => r.asset_condition === 'new').length
    const existingRuns = runs.filter(r => r.asset_condition === 'existing').length

    const fillValues = runs
      .map(r => one(r.fiber_routes)?.fill_percentage)
      .filter((v): v is number => v !== null && v !== undefined)
    const avgFill = fillValues.length ? fillValues.reduce((a, b) => a + b, 0) / fillValues.length : null
    const overFillCount = fillValues.filter(v => v > FILL_WARN_THRESHOLD).length

    return {
      totalRuns: runs.length,
      totalStructures: structures.length,
      totalLengthFt,
      newStructures,
      existingStructures,
      newRuns,
      existingRuns,
      avgFill,
      overFillCount,
    }
  }, [structures, runs])

  const summaryCards = [
    { label: 'Duct Bank Runs', value: metrics.totalRuns },
    { label: 'Total Length', value: `${metrics.totalLengthFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft` },
    { label: 'Structures', value: metrics.totalStructures },
    {
      label: 'Avg. Conduit Fill',
      value: metrics.avgFill === null ? '—' : `${metrics.avgFill.toFixed(0)}%`,
      warn: metrics.overFillCount > 0,
    },
    { label: 'New (Runs / Structures)', value: `${metrics.newRuns} / ${metrics.newStructures}` },
    { label: 'Existing (Runs / Structures)', value: `${metrics.existingRuns} / ${metrics.existingStructures}` },
  ]

  return (
    <div className="space-y-4 relative z-10 w-full h-full px-6 py-4 flex-1 flex flex-col overflow-hidden bg-[var(--bg)] font-sans">
      <div>
        <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Conduit & Duct Bank</h1>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          Civil-works layer mirrored from the Fiber module — every duct run and structure below is generated
          automatically when a matching fiber route or node is created. Fill % is flagged above{' '}
          {FILL_WARN_THRESHOLD}% (the conventional pullability ceiling for communications cable) — it&apos;s a
          heads-up for the field crew, not a hard limit.
        </p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {summaryCards.map((m, idx) => (
          <div
            key={idx}
            className={`border rounded-xl p-3 flex flex-col justify-between h-20 shadow-xs ${
              'warn' in m && m.warn
                ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                : 'text-[var(--text-primary)] border-[var(--border)] bg-[var(--surface-1)]'
            }`}
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
          onClick={() => switchTab('runs')}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
            tab === 'runs'
              ? 'border-[var(--accent)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Duct Bank Runs ({runs.length})
        </button>
        <button
          onClick={() => switchTab('structures')}
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
      <div className="flex-1 min-h-0 flex gap-3">
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
                  <th className="text-left font-bold px-3 py-2">Fill %</th>
                  <th className="text-left font-bold px-3 py-2">Condition</th>
                  <th className="text-left font-bold px-3 py-2">Work Scope</th>
                  <th className="text-left font-bold px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {runs.map(run => {
                  const route = one(run.fiber_routes)
                  return (
                    <tr
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedRunId === run.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{run.run_tag}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{route?.route_id_tag ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] capitalize">{run.install_method}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">{run.diameter_inches}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                        {Number(run.length_feet).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-2">
                        <FillBar percentage={route?.fill_percentage ?? null} />
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
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStructureId(s.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedStructureId === s.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]'
                    }`}
                  >
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

      {/* Cross-section detail panel — the dedicated design view for the
          selected run/structure, drawn to scale from real fields. */}
      {(selectedRun || selectedStructure) && (
        <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Cross-Section
              </span>
              <span className="text-sm font-black text-[var(--text-primary)]">
                {selectedRun?.run_tag ?? selectedStructure?.structure_tag}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedRunId(null)
                setSelectedStructureId(null)
              }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {selectedRun && <DuctCrossSection run={selectedRun} route={one(selectedRun.fiber_routes)} />}
          {selectedStructure && <StructureCrossSection structure={selectedStructure} />}
        </div>
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

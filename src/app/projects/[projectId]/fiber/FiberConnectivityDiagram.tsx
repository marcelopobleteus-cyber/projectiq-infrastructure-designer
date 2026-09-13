'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { fiberColorHex } from '@/lib/fiberColors'

/**
 * Fiber Connectivity Diagram — the logical/unifilar view called for in
 * claude/plan-diagramas-conectividad.md (Node -> Enclosure -> Splices ->
 * Destination) and grounded in claude/plan-estandar-planos-fibra.md: the
 * only real standard here is the TIA-598 color code (reused from
 * src/lib/fiberColors.ts, shared with the map canvas), so every other
 * symbol on this page is NextQ's own convention — documented once in the
 * legend, same pattern as the Network Topology diagram.
 */

const NODE_W = 132
const NODE_H = 46
const COL_GAP = 190
const ROW_GAP = 78
const MARGIN = 60
const ZOOM_MIN = 0.4
const ZOOM_MAX = 6
// Nodes that are physically civil structures (handholes/manholes/pull
// boxes) belong to the Ductería module visually — Fiber only needs to know
// "there's a splice point here", not which kind of civil box it sits in.
// Grouping them under one generic type keeps the Fiber legend/icon set
// scoped to fiber concerns, per Marcelo's request to stop mixing the two.
const CIVIL_STRUCTURE_TYPES = new Set(['Manhole', 'Handhole', 'Pull Box'])

const NODE_TYPE_META: Record<string, { label: string; accent: string }> = {
  Structure: { label: 'Structure (see Ductería)', accent: '#64748b' },
  Cabinet: { label: 'Cabinet', accent: '#2563eb' },
  Pole: { label: 'Pole', accent: '#854d0e' },
  Building: { label: 'Building', accent: '#7c3aed' },
  'Existing Fiber Source': { label: 'Source', accent: '#16a34a' },
  'Camera Location': { label: 'Camera', accent: '#ea580c' },
  Custom: { label: 'Custom', accent: '#94a3b8' },
}

function nodeTypeKey(nodeType: string): string {
  return CIVIL_STRUCTURE_TYPES.has(nodeType) ? 'Structure' : nodeType
}

function nodeIconPath(nodeType: string): string[] {
  switch (nodeTypeKey(nodeType)) {
    case 'Cabinet':
      return ['M4 3h16v18H4z', 'M8 7h8', 'M8 11h8', 'M8 15h8']
    case 'Existing Fiber Source':
      return ['M12 2v6', 'M12 16v6', 'M4.9 4.9l4.2 4.2', 'M14.9 14.9l4.2 4.2', 'M2 12h6', 'M16 12h6', 'M4.9 19.1l4.2-4.2', 'M14.9 9.1l4.2-4.2']
    case 'Camera Location':
      return ['M23 7l-7 5 7 5V7z', 'M1 5h15v14H1z']
    case 'Building':
      return ['M4 22V4h11v18', 'M15 9h5v13h-5', 'M7 8h1', 'M7 12h1', 'M7 16h1']
    case 'Pole':
      return ['M12 2v20', 'M6 6h12', 'M8 10h8']
    default:
      // Structure (Manhole/Handhole/Pull Box) — a plain dot, deliberately
      // generic: the civil detail lives in the Ductería module, not here.
      return ['M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0']
  }
}

interface FiberConnectivityDiagramProps {
  nodes: any[]
  cables: any[]
  strands: any[]
  enclosures: any[]
  spliceRecords: any[]
}

export default function FiberConnectivityDiagram({
  nodes,
  cables,
  strands,
  enclosures,
  spliceRecords,
}: FiberConnectivityDiagramProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panDrag, setPanDrag] = useState<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null)
  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const strandsById = useMemo(() => new Map(strands.map(s => [s.id, s])), [strands])
  const cablesById = useMemo(() => new Map(cables.map(c => [c.id, c])), [cables])
  const enclosuresById = useMemo(() => new Map(enclosures.map(e => [e.id, e])), [enclosures])

  const enclosuresByNode = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const e of enclosures) {
      const list = map.get(e.node_id) ?? []
      list.push(e)
      map.set(e.node_id, list)
    }
    return map
  }, [enclosures])

  const strandsByCable = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const s of strands) {
      const list = map.get(s.cable_id) ?? []
      list.push(s)
      map.set(s.cable_id, list)
    }
    return map
  }, [strands])

  const spliceCountByEnclosure = useMemo(() => {
    const map = new Map<string, number>()
    for (const rec of spliceRecords) {
      map.set(rec.enclosure_id, (map.get(rec.enclosure_id) ?? 0) + 1)
    }
    return map
  }, [spliceRecords])

  // ─── Layered layout: BFS depth from nodes with no incoming cable ───────
  const { positions, canvasWidth, canvasHeight } = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.id))
    const outgoing = new Map<string, string[]>()
    const incomingCount = new Map<string, number>()
    nodeIds.forEach(id => incomingCount.set(id, 0))

    for (const c of cables) {
      if (!c.from_node_id || !c.to_node_id) continue
      if (!nodeIds.has(c.from_node_id) || !nodeIds.has(c.to_node_id)) continue
      const list = outgoing.get(c.from_node_id) ?? []
      list.push(c.to_node_id)
      outgoing.set(c.from_node_id, list)
      incomingCount.set(c.to_node_id, (incomingCount.get(c.to_node_id) ?? 0) + 1)
    }

    const depth = new Map<string, number>()
    const roots = nodes.filter(n => (incomingCount.get(n.id) ?? 0) === 0)
    const queue: { id: string; d: number }[] = roots.map(n => ({ id: n.id, d: 0 }))
    const visited = new Set<string>()
    while (queue.length) {
      const { id, d } = queue.shift()!
      if (visited.has(id) && (depth.get(id) ?? 0) >= d) continue
      visited.add(id)
      depth.set(id, Math.max(depth.get(id) ?? 0, d))
      for (const next of outgoing.get(id) ?? []) {
        queue.push({ id: next, d: d + 1 })
      }
    }
    const reachedMaxDepth = Math.max(0, ...Array.from(depth.values()))
    // Nodes never reached (isolated, or only referenced as a `to` in a
    // cycle) go in one extra trailing column rather than vanishing.
    for (const n of nodes) {
      if (!depth.has(n.id)) depth.set(n.id, reachedMaxDepth + 1)
    }

    const byDepth = new Map<number, any[]>()
    for (const n of nodes) {
      const d = depth.get(n.id) ?? 0
      const list = byDepth.get(d) ?? []
      list.push(n)
      byDepth.set(d, list)
    }

    const positions = new Map<string, { x: number; y: number }>()
    let maxRows = 1
    for (const [d, list] of byDepth.entries()) {
      list.forEach((n, i) => {
        positions.set(n.id, {
          x: MARGIN + d * COL_GAP + NODE_W / 2,
          y: MARGIN + i * ROW_GAP + NODE_H / 2,
        })
      })
      maxRows = Math.max(maxRows, list.length)
    }

    const maxDepth = Math.max(0, ...Array.from(byDepth.keys()))
    return {
      positions,
      canvasWidth: MARGIN * 2 + (maxDepth + 1) * COL_GAP,
      canvasHeight: MARGIN * 2 + maxRows * ROW_GAP,
    }
  }, [nodes, cables])

  // Auto-fit the initial view: with many isolated nodes (sparse cable
  // data) the layout stacks into one tall column, and starting at zoom=1
  // squeezes the whole thing into the viewport — unreadable. Instead, start
  // zoomed in enough to read ~14 rows, and let the user pan/scroll-zoom
  // through the rest. Runs once per canvas size (i.e. once data loads).
  const didAutoFit = useRef(false)
  useEffect(() => {
    if (didAutoFit.current) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0 || canvasHeight === 0) return
    didAutoFit.current = true
    const targetVisibleRows = 14
    const targetVbHeight = targetVisibleRows * ROW_GAP
    const fitZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rect.height / Math.min(canvasHeight, targetVbHeight)))
    setZoom(fitZoom)
    setPan({ x: 0, y: 0 })
  }, [canvasHeight])

  const vbWidth = canvasWidth / zoom
  const vbHeight = canvasHeight / zoom

  const clientToSvg = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: pan.x + ((clientX - rect.left) / rect.width) * vbWidth,
      y: pan.y + ((clientY - rect.top) / rect.height) * vbHeight,
    }
  }

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const before = clientToSvg(clientX, clientY)
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
    const nextVbW = canvasWidth / nextZoom
    const nextVbH = canvasHeight / nextZoom
    const rect = containerRef.current?.getBoundingClientRect()
    const fracX = rect ? (clientX - rect.left) / rect.width : 0.5
    const fracY = rect ? (clientY - rect.top) / rect.height : 0.5
    setZoom(nextZoom)
    setPan({ x: before.x - fracX * nextVbW, y: before.y - fracY * nextVbH })
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setPanDrag({ startX: e.clientX, startY: e.clientY, origin: pan })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panDrag) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = ((e.clientX - panDrag.startX) / rect.width) * vbWidth
    const dy = ((e.clientY - panDrag.startY) / rect.height) * vbHeight
    setPan({ x: panDrag.origin.x - dx, y: panDrag.origin.y - dy })
  }
  const handleMouseUp = () => setPanDrag(null)

  const resetView = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    const targetVbHeight = 14 * ROW_GAP
    const fitZoom = rect && rect.height > 0 && canvasHeight > 0
      ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rect.height / Math.min(canvasHeight, targetVbHeight)))
      : 1
    setZoom(fitZoom)
    setPan({ x: 0, y: 0 })
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null
  const selectedCable = cables.find(c => c.id === selectedCableId) ?? null

  return (
    <div className="flex-1 min-h-0 flex gap-3 p-4">
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 min-w-0 relative rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {selectedEnclosureId && (
          <FusionSpliceDiagram
            enclosure={enclosuresById.get(selectedEnclosureId)}
            records={spliceRecords.filter(r => r.enclosure_id === selectedEnclosureId)}
            strandsById={strandsById}
            cablesById={cablesById}
            onClose={() => setSelectedEnclosureId(null)}
          />
        )}
        {nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-8">
            <span className="text-xs font-bold text-[var(--text-primary)]">No fiber nodes yet</span>
            <span className="text-[11px] text-[var(--text-tertiary)] max-w-sm">
              Add nodes and routes on the Map tab — this diagram redraws automatically from that data.
            </span>
          </div>
        ) : (
          <svg
            viewBox={`${pan.x} ${pan.y} ${vbWidth} ${vbHeight}`}
            className="w-full h-full select-none"
            style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 23px), var(--surface-1)' }}
          >
            {/* Cables */}
            {cables.map(cable => {
              const from = positions.get(cable.from_node_id)
              const to = positions.get(cable.to_node_id)
              if (!from || !to) return null
              const isSelected = cable.id === selectedCableId
              const cableStrands = strandsByCable.get(cable.id) ?? []
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2
              return (
                <g key={cable.id} onClick={() => { setSelectedCableId(cable.id); setSelectedNodeId(null) }} className="cursor-pointer">
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isSelected ? 'var(--accent)' : 'var(--border-strong, #475569)'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <rect x={midX - 34} y={midY - 10} width={68} height={20} rx={4} fill="var(--surface-2)" stroke="var(--border)" />
                  <text x={midX} y={midY + 4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} className="fill-[var(--text-secondary)]">
                    {cable.cable_tag ?? `${cableStrands.length}F`}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = positions.get(node.id)
              if (!pos) return null
              const meta = NODE_TYPE_META[nodeTypeKey(node.node_type)] ?? NODE_TYPE_META.Custom
              const nodeEnclosures = enclosuresByNode.get(node.id) ?? []
              const isSelected = node.id === selectedNodeId
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x - NODE_W / 2}, ${pos.y - NODE_H / 2})`}
                  onClick={() => { setSelectedNodeId(node.id); setSelectedCableId(null) }}
                  className="cursor-pointer"
                >
                  <rect
                    width={NODE_W} height={NODE_H} rx={8}
                    fill="var(--surface-2)"
                    stroke={isSelected ? 'var(--accent)' : meta.accent}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <svg x={8} y={(NODE_H - 18) / 2} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={meta.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {nodeIconPath(node.node_type).map((d, i) => <path key={i} d={d} />)}
                  </svg>
                  <text x={32} y={18} style={{ fontSize: 10.5, fontWeight: 700 }} className="fill-[var(--text-primary)]">
                    {node.node_tag}
                  </text>
                  <text x={32} y={32} style={{ fontSize: 8.5 }} className="fill-[var(--text-tertiary)]">
                    {meta.label}
                  </text>
                  {nodeEnclosures.length > 0 && (
                    <g>
                      <circle cx={NODE_W - 11} cy={11} r={9} fill="#f59e0b" stroke="var(--surface-2)" strokeWidth={2} />
                      <text x={NODE_W - 11} y={14.5} textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 800 }} fill="#1c1000">
                        E
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        {/* Zoom / reset toolbar — same right-edge dock language as the
            Network Topology diagram, so the two feel like one product. */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1 shadow-lg">
          <button onClick={() => zoomAt(containerRef.current!.getBoundingClientRect().left + 200, containerRef.current!.getBoundingClientRect().top + 200, 1.2)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer" title="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button onClick={() => zoomAt(containerRef.current!.getBoundingClientRect().left + 200, containerRef.current!.getBoundingClientRect().top + 200, 0.8)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer" title="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button onClick={resetView} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer" title="Reset view">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 16v-4h4"/></svg>
          </button>
        </div>

        {/* Legend — the "cuadro de convenciones" our own standards research
            says every fiber plan needs, since symbology itself isn't
            governed by any standard. */}
        <div className="absolute bottom-3 left-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-2.5 shadow-lg text-[10px] space-y-1.5 max-w-[220px]">
          <span className="block font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-[9px]">Legend</span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(NODE_TYPE_META).map(([type, meta]) => (
              <div key={type} className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={meta.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  {nodeIconPath(type).map((d, i) => <path key={i} d={d} />)}
                </svg>
                <span className="text-[var(--text-secondary)]">{meta.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border)]">
            <span className="w-4 h-4 rounded-full bg-amber-500 shrink-0 flex items-center justify-center text-[7px] font-black text-[#1c1000]">E</span>
            <span className="text-[var(--text-secondary)]">Splice enclosure at this node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[var(--text-tertiary)] shrink-0" />
            <span className="text-[var(--text-secondary)]">Fiber cable (route)</span>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {(selectedNode || selectedCable) && (
        <div className="w-80 shrink-0 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 space-y-3">
          {selectedNode && (
            <NodeDetail
              node={selectedNode}
              enclosures={enclosuresByNode.get(selectedNode.id) ?? []}
              spliceCountByEnclosure={spliceCountByEnclosure}
              onClose={() => setSelectedNodeId(null)}
              onViewFusion={(enclosureId) => setSelectedEnclosureId(enclosureId)}
            />
          )}
          {selectedCable && (
            <CableDetail
              cable={selectedCable}
              strands={strandsByCable.get(selectedCable.id) ?? []}
              onClose={() => setSelectedCableId(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function NodeDetail({ node, enclosures, spliceCountByEnclosure, onClose, onViewFusion }: { node: any; enclosures: any[]; spliceCountByEnclosure: Map<string, number>; onClose: () => void; onViewFusion: (enclosureId: string) => void }) {
  return (
    <div className="space-y-3">
      <PanelHeader eyebrow="Node" title={node.node_tag} onClose={onClose} />
      <div className="text-[10.5px] text-[var(--text-secondary)] space-y-1 font-mono">
        <Row label="Type" value={node.node_type} />
        <Row label="Status" value={node.status} />
      </div>
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
          Enclosures ({enclosures.length})
        </span>
        {enclosures.length === 0 ? (
          <p className="text-[10.5px] text-[var(--text-tertiary)]">No enclosure at this node.</p>
        ) : (
          <div className="space-y-2">
            {enclosures.map(e => (
              <div key={e.id} className="border border-[var(--border)] rounded-lg p-2 bg-[var(--surface-2)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">{e.enclosure_tag}</span>
                  <span className="text-[9.5px] text-[var(--text-tertiary)] capitalize">{e.enclosure_type}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                  <span>Capacity {e.capacity}</span>
                  <span>{spliceCountByEnclosure.get(e.id) ?? 0} splices</span>
                </div>
                {(spliceCountByEnclosure.get(e.id) ?? 0) > 0 && (
                  <button
                    onClick={() => onViewFusion(e.id)}
                    className="w-full text-[9.5px] font-bold uppercase tracking-wide text-[var(--accent)] hover:underline cursor-pointer text-left pt-0.5"
                  >
                    View fusion diagram →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CableDetail({ cable, strands, onClose }: { cable: any; strands: any[]; onClose: () => void }) {
  const sorted = [...strands].sort((a, b) => a.strand_number - b.strand_number)
  return (
    <div className="space-y-3">
      <PanelHeader eyebrow="Fiber Cable" title={cable.cable_tag} onClose={onClose} />
      <div className="text-[10.5px] text-[var(--text-secondary)] space-y-1 font-mono">
        <Row label="Type" value={cable.cable_type} />
        <Row label="Fiber count" value={String(cable.fiber_count)} />
        <Row label="Length" value={`${cable.length_ft ?? '—'} ft`} />
        <Row label="Status" value={cable.status ?? '—'} />
      </div>
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
          Strands — TIA-598 color code
        </span>
        <div className="grid grid-cols-2 gap-1">
          {sorted.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 border border-[var(--border)] rounded px-1.5 py-1 bg-[var(--surface-2)]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--border)]" style={{ backgroundColor: fiberColorHex(s.fiber_color) }} />
              <span className="text-[9.5px] font-mono text-[var(--text-secondary)] truncate">
                #{s.strand_number} {s.fiber_color}
              </span>
            </div>
          ))}
        </div>
        {sorted.length === 0 && <p className="text-[10.5px] text-[var(--text-tertiary)]">No strands recorded on this cable yet.</p>}
      </div>
    </div>
  )
}

/**
 * Fusion Splice Diagram — per-strand splice detail for one enclosure,
 * styled after the standard OSP splice-closure diagram convention (as seen
 * in tools like OZmap): each side cable drawn as a numbered, color-coded
 * strand stub, with a straight line per splice colored by the source
 * strand's TIA-598 color. Multiple splice records sharing the same input
 * strand read as a splitter fan-out with no extra graphic needed.
 */
function FusionSpliceDiagram({
  enclosure,
  records,
  strandsById,
  cablesById,
  onClose,
}: {
  enclosure: any
  records: any[]
  strandsById: Map<string, any>
  cablesById: Map<string, any>
  onClose: () => void
}) {
  const ROW_H = 22
  const GROUP_GAP = 20
  const TOP = 56
  const LEFT_X = 140
  const RIGHT_X = 560
  const STUB_LEN = 26

  const { leftGroups, rightGroups, leftY, rightY, height } = useMemo(() => {
    const leftCableOrder: string[] = []
    const rightCableOrder: string[] = []
    const leftStrandsByCable = new Map<string, Set<string>>()
    const rightStrandsByCable = new Map<string, Set<string>>()

    for (const r of records) {
      if (r.from_cable_id && r.from_strand_id) {
        if (!leftStrandsByCable.has(r.from_cable_id)) {
          leftStrandsByCable.set(r.from_cable_id, new Set())
          leftCableOrder.push(r.from_cable_id)
        }
        leftStrandsByCable.get(r.from_cable_id)!.add(r.from_strand_id)
      }
      if (r.to_cable_id && r.to_strand_id) {
        if (!rightStrandsByCable.has(r.to_cable_id)) {
          rightStrandsByCable.set(r.to_cable_id, new Set())
          rightCableOrder.push(r.to_cable_id)
        }
        rightStrandsByCable.get(r.to_cable_id)!.add(r.to_strand_id)
      }
    }

    const buildGroups = (order: string[], map: Map<string, Set<string>>) =>
      order.map(cableId => ({
        cableId,
        strandIds: Array.from(map.get(cableId) ?? []).sort((a, b) => {
          const sa = strandsById.get(a)?.strand_number ?? 0
          const sb = strandsById.get(b)?.strand_number ?? 0
          return sa - sb
        }),
      }))

    const leftGroups = buildGroups(leftCableOrder, leftStrandsByCable)
    const rightGroups = buildGroups(rightCableOrder, rightStrandsByCable)

    const assignY = (groups: { cableId: string; strandIds: string[] }[]) => {
      const y = new Map<string, number>()
      let cursor = TOP
      for (const g of groups) {
        cursor += GROUP_GAP
        for (const sid of g.strandIds) {
          y.set(sid, cursor)
          cursor += ROW_H
        }
      }
      return { y, bottom: cursor }
    }

    const left = assignY(leftGroups)
    const right = assignY(rightGroups)

    return {
      leftGroups,
      rightGroups,
      leftY: left.y,
      rightY: right.y,
      height: Math.max(left.bottom, right.bottom, 200) + 24,
    }
  }, [records, strandsById])

  return (
    <div className="absolute inset-0 z-10 bg-[var(--surface-1)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Fusion Splice Diagram
          </span>
          <span className="text-sm font-black text-[var(--text-primary)]">
            {enclosure?.enclosure_tag ?? 'Enclosure'}
            {enclosure?.enclosure_type ? ` — ${enclosure.enclosure_type}` : ''}
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {records.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">No splice records at this enclosure yet.</p>
        ) : (
          <svg width={RIGHT_X + 140} height={height} className="select-none">
            {/* Cable group labels + stub ticks */}
            {leftGroups.map(g => {
              const cable = cablesById.get(g.cableId)
              const firstY = leftY.get(g.strandIds[0]) ?? TOP
              return (
                <g key={g.cableId}>
                  <text x={LEFT_X - STUB_LEN - 6} y={firstY - 10} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 700 }} className="fill-[var(--text-primary)]">
                    {cable?.cable_tag ?? 'Cable'}
                  </text>
                  {g.strandIds.map(sid => {
                    const s = strandsById.get(sid)
                    const y = leftY.get(sid)!
                    return (
                      <g key={sid}>
                        <line x1={LEFT_X - STUB_LEN} y1={y} x2={LEFT_X} y2={y} stroke="var(--border-strong, #475569)" strokeWidth={1.5} />
                        <circle cx={LEFT_X} cy={y} r={7} fill="var(--surface-2)" stroke={fiberColorHex(s?.fiber_color)} strokeWidth={2} />
                        <text x={LEFT_X} y={y + 3} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 700 }} className="fill-[var(--text-primary)]">
                          {s?.strand_number ?? ''}
                        </text>
                        <text x={LEFT_X - STUB_LEN - 6} y={y + 3} textAnchor="end" style={{ fontSize: 8.5 }} className="fill-[var(--text-tertiary)]">
                          {s?.fiber_color ?? ''}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {rightGroups.map(g => {
              const cable = cablesById.get(g.cableId)
              const firstY = rightY.get(g.strandIds[0]) ?? TOP
              return (
                <g key={g.cableId}>
                  <text x={RIGHT_X + STUB_LEN + 6} y={firstY - 10} textAnchor="start" style={{ fontSize: 10.5, fontWeight: 700 }} className="fill-[var(--text-primary)]">
                    {cable?.cable_tag ?? 'Cable'}
                  </text>
                  {g.strandIds.map(sid => {
                    const s = strandsById.get(sid)
                    const y = rightY.get(sid)!
                    return (
                      <g key={sid}>
                        <line x1={RIGHT_X} y1={y} x2={RIGHT_X + STUB_LEN} y2={y} stroke="var(--border-strong, #475569)" strokeWidth={1.5} />
                        <circle cx={RIGHT_X} cy={y} r={7} fill="var(--surface-2)" stroke={fiberColorHex(s?.fiber_color)} strokeWidth={2} />
                        <text x={RIGHT_X} y={y + 3} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 700 }} className="fill-[var(--text-primary)]">
                          {s?.strand_number ?? ''}
                        </text>
                        <text x={RIGHT_X + STUB_LEN + 6} y={y + 3 + 12} textAnchor="start" style={{ fontSize: 8.5 }} className="fill-[var(--text-tertiary)]">
                          {s?.fiber_color ?? ''}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Splice lines */}
            {records.map(r => {
              const y1 = leftY.get(r.from_strand_id)
              const y2 = rightY.get(r.to_strand_id)
              if (y1 === undefined || y2 === undefined) return null
              const fromStrand = strandsById.get(r.from_strand_id)
              const color = fiberColorHex(fromStrand?.fiber_color)
              return (
                <path
                  key={r.id}
                  d={`M ${LEFT_X} ${y1} C ${(LEFT_X + RIGHT_X) / 2} ${y1}, ${(LEFT_X + RIGHT_X) / 2} ${y2}, ${RIGHT_X} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={r.splice_status === 'Spliced' ? 1 : 0.4}
                  strokeDasharray={r.splice_status === 'Spliced' ? undefined : '4 3'}
                />
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

function PanelHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{eyebrow}</span>
        <span className="text-sm font-black text-[var(--text-primary)]">{title}</span>
      </div>
      <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-tertiary)] font-sans">{label}</span>
      <span>{value}</span>
    </div>
  )
}

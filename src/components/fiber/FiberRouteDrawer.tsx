'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Database } from '@/types/supabase'
import type { InstallationType, RoutePurpose } from '@/app/projects/actions-fiber'

type FiberNode = Database['public']['Tables']['fiber_nodes']['Row']
type FiberRoute = Database['public']['Tables']['fiber_routes']['Row']
type FiberRouteSegment = Database['public']['Tables']['fiber_route_segments']['Row']
type FiberCable = Database['public']['Tables']['fiber_cables']['Row']
type FiberCatalogItem = Database['public']['Tables']['fiber_catalog']['Row']

// Client-side haversine distance in feet (display only)
function haversineDisplayFeet(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 3.28084
}

// Props definition
interface FiberRouteDrawerProps {
  pathNodes: FiberNode[]
  fiberNodes: FiberNode[]
  existingRoute: FiberRoute | null
  existingRoutes: FiberRoute[]
  existingRouteSegments: FiberRouteSegment[]
  fiberCables: FiberCable[]
  fiberCatalog: FiberCatalogItem[]
  onSubmit: (params: {
    orderedNodeIds: string[]
    routeIdTag: string
    installationType: InstallationType
    routePurpose?: RoutePurpose
    conduitDiameterInches?: number
    slackPercentage?: number
    cableCatalogId?: string
    notes?: string
  }) => Promise<void>
  onClose: () => void
  onDelete?: (routeId: string) => Promise<void>
  isSaving: boolean
  submitError: string | null
  // Callback to return the prepared BOM data object to parent component (Step 8)
  onBomDataPrepared?: (bomData: {
    totalMeasuredDistance: number
    slackAdjustedCableLength: number
    selectedCableCatalogId: string | null
    fiberCount: number
    costPerFoot: number
    estimatedCableCost: number
    segmentCount: number
    conduitDiameter: number
    installationType: string
  }) => void
}

export default function FiberRouteDrawer({
  pathNodes,
  fiberNodes,
  existingRoute,
  existingRoutes,
  existingRouteSegments,
  fiberCables,
  fiberCatalog,
  onSubmit,
  onClose,
  onDelete,
  isSaving,
  submitError,
  onBomDataPrepared,
}: FiberRouteDrawerProps) {

  // Auto-suggest next tag tag
  const suggestRouteTag = useCallback((): string => {
    if (existingRoute) return existingRoute.route_id_tag
    const tagNums = existingRoutes
      .map(r => {
        const match = r.route_id_tag.match(/R-(\d+)/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(n => n > 0)
    const next = tagNums.length > 0 ? Math.max(...tagNums) + 1 : 1
    return `R-${String(next).padStart(3, '0')}`
  }, [existingRoute, existingRoutes])

  // Form states
  const [routeIdTag, setRouteIdTag] = useState<string>('')
  const [installationType, setInstallationType] = useState<InstallationType>('underground')
  const [routePurpose, setRoutePurpose] = useState<RoutePurpose>('camera_backbone')
  const [conduitDiameterInches, setConduitDiameterInches] = useState<number>(2.0)
  const [slackPercentage, setSlackPercentage] = useState<number>(10.0)
  const [notes, setNotes] = useState<string>('')
  const [cableCatalogId, setCableCatalogId] = useState<string>('none')
  const [formError, setFormError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialize form
  useEffect(() => {
    setRouteIdTag(suggestRouteTag())
    setInstallationType(existingRoute ? (existingRoute.installation_type as InstallationType) : 'underground')
    setRoutePurpose(existingRoute ? ((existingRoute.route_purpose ?? 'camera_backbone') as RoutePurpose) : 'camera_backbone')
    setConduitDiameterInches(existingRoute ? (existingRoute.conduit_diameter_inches ?? 2.0) : 2.0)
    setSlackPercentage(existingRoute ? (existingRoute.slack_percentage ?? 10.0) : 10.0)
    setNotes('')
    setCableCatalogId('none')
    setFormError(null)
  }, [existingRoute, suggestRouteTag])

  const isCreating = existingRoute === null

  // ── Route & Segment calculations ──────────────────────────────────────────
  const segments = isCreating
    ? pathNodes.slice(0, -1).map((node, i) => {
        const nextNode = pathNodes[i + 1]
        const length = Math.round(haversineDisplayFeet(node.latitude, node.longitude, nextNode.latitude, nextNode.longitude))
        return {
          index: i,
          startTag: node.node_tag,
          endTag: nextNode.node_tag,
          lengthFeet: length,
        }
      })
    : existingRouteSegments
        .filter(s => s.route_id === existingRoute.id)
        .sort((a, b) => a.segment_index - b.segment_index)
        .map(s => {
          const startNode = fiberNodes.find(
            n => Math.abs(n.latitude - s.start_latitude) < 0.00001 && Math.abs(n.longitude - s.start_longitude) < 0.00001
          )
          const endNode = fiberNodes.find(
            n => Math.abs(n.latitude - s.end_latitude) < 0.00001 && Math.abs(n.longitude - s.end_longitude) < 0.00001
          )
          return {
            index: s.segment_index,
            startTag: startNode ? startNode.node_tag : `(${s.start_latitude.toFixed(4)}, ${s.start_longitude.toFixed(4)})`,
            endTag: endNode ? endNode.node_tag : `(${s.end_latitude.toFixed(4)}, ${s.end_longitude.toFixed(4)})`,
            lengthFeet: Math.round(s.length_feet),
          }
        })

  const distanceFt = isCreating
    ? segments.reduce((sum, s) => sum + s.lengthFeet, 0)
    : (existingRoute?.measured_length_feet ? Math.round(existingRoute.measured_length_feet) : 0)

  const installedFt = Math.round(distanceFt * (1 + slackPercentage / 100))

  // Find linked cable (existing route details view)
  const linkedCable = isCreating ? null : fiberCables.find(c => c.route_id === existingRoute?.id)

  // Find selected catalog item details
  const selectedCatalogItem = cableCatalogId !== 'none'
    ? fiberCatalog.find(c => c.id === cableCatalogId)
    : null

  // ── Conduit Fill calculations (Estimate) ────────────────────────────────────
  const conduitFillEstimate: number | null = (() => {
    const cableDiam = selectedCatalogItem?.diameter_mm
    if (!cableDiam || !conduitDiameterInches) return null
    // Convert cable diameter from mm to inches
    const cableDiamIn = cableDiam / 25.4
    // Fill ratio = (cable outer diam)^2 / (conduit inner diam)^2 * 100
    // Labeled strictly as estimate
    const ratio = (cableDiamIn ** 2) / (conduitDiameterInches ** 2) * 100
    return Math.min(Number(ratio.toFixed(1)), 100)
  })()

  // ── BOM Structured Data preparation callback (Step 8) ──────────────────────
  useEffect(() => {
    if (onBomDataPrepared) {
      onBomDataPrepared({
        totalMeasuredDistance: distanceFt,
        slackAdjustedCableLength: installedFt,
        selectedCableCatalogId: selectedCatalogItem ? selectedCatalogItem.id : null,
        fiberCount: selectedCatalogItem ? selectedCatalogItem.fiber_count : 0,
        costPerFoot: selectedCatalogItem ? selectedCatalogItem.cost_per_foot : 0,
        estimatedCableCost: selectedCatalogItem ? Number((selectedCatalogItem.cost_per_foot * installedFt).toFixed(2)) : 0,
        segmentCount: segments.length,
        conduitDiameter: conduitDiameterInches,
        installationType,
      })
    }
  }, [distanceFt, installedFt, selectedCatalogItem, segments.length, conduitDiameterInches, installationType, onBomDataPrepared])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!routeIdTag.trim()) {
      setFormError('Route ID tag is required.')
      return
    }
    if (conduitDiameterInches <= 0 || conduitDiameterInches > 48) {
      setFormError('Conduit diameter must be between 0.1 and 48 inches.')
      return
    }
    if (slackPercentage < 0 || slackPercentage > 100) {
      setFormError('Slack percentage must be between 0 and 100.')
      return
    }
    if (isCreating && pathNodes.length < 2) {
      setFormError('Must select at least two fiber nodes.')
      return
    }

    await onSubmit({
      orderedNodeIds: pathNodes.map(n => n.id),
      routeIdTag: routeIdTag.trim(),
      installationType,
      routePurpose,
      conduitDiameterInches,
      slackPercentage,
      cableCatalogId: cableCatalogId !== 'none' ? cableCatalogId : undefined,
      notes: notes.trim() || undefined,
    })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!existingRoute || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(existingRoute.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const isOpen = (isCreating && pathNodes.length >= 2) || !isCreating

  return (
    <div
      className={`
        absolute top-0 right-0 h-full w-80 z-40
        bg-[var(--surface-1)]/95 backdrop-blur-xl border-l border-[var(--border)]
        flex flex-col shadow-2xl
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div>
          <h3 className="text-[13px] font-bold text-white tracking-tight">
            {isCreating ? 'New Fiber Route' : `Route ${existingRoute?.route_id_tag ?? ''}`}
          </h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {isCreating ? 'Fiber Path Design Mode' : 'Route Details'}
          </p>
        </div>
        <button
          id="fiber-route-drawer-close"
          onClick={onClose}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* ── Distance & Summary metrics ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0 space-y-2">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[var(--text-tertiary)] uppercase tracking-widest font-bold">Path Summary</span>
          <span className="font-mono bg-slate-800 border border-slate-700 text-white px-2 py-0.5 rounded text-[9px]">
            {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {distanceFt !== null && (
          <div className="flex items-center gap-6 text-[11px] font-mono">
            <div>
              <span className="text-[var(--text-tertiary)] block text-[9px] uppercase font-sans">Measured</span>
              <span className="text-white font-bold text-xs">{distanceFt.toLocaleString()} ft</span>
            </div>
            <div>
              <span className="text-[var(--accent-text)] block text-[9px] uppercase font-sans">Slack-Adjusted</span>
              <span className="text-indigo-300 font-bold text-xs">{installedFt.toLocaleString()} ft</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

        {/* Selected nodes list sequence */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-xl space-y-1.5 select-none">
          <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold block">
            Node Sequence Path
          </span>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
            {segments.map((seg) => (
              <div key={seg.index} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] text-white" />
                <span className="font-mono text-white truncate max-w-[90px]">{seg.startTag}</span>
                <span className="text-slate-600">➔</span>
                <span className="font-mono text-white truncate max-w-[90px]">{seg.endTag}</span>
                <span className="ml-auto font-mono text-[9.5px] text-[var(--text-tertiary)]">{seg.lengthFeet} ft</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route ID Tag */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            Route ID Tag *
          </label>
          <input
            id="fiber-route-drawer-tag"
            type="text"
            value={routeIdTag}
            onChange={e => setRouteIdTag(e.target.value)}
            placeholder="e.g. R-001"
            maxLength={50}
            disabled={!isCreating}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] font-mono rounded-lg
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
              disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600"
          />
        </div>

        {/* Installation Type */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            Installation Type *
          </label>
          <select
            id="fiber-route-drawer-install-type"
            value={installationType}
            onChange={e => setInstallationType(e.target.value as InstallationType)}
            disabled={!isCreating}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="underground">Underground (Conduit)</option>
            <option value="aerial">Aerial</option>
            <option value="direct_buried">Direct Buried</option>
          </select>
        </div>

        {/* Route Purpose */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            Route Purpose
          </label>
          <select
            id="fiber-route-drawer-purpose"
            value={routePurpose}
            onChange={e => setRoutePurpose(e.target.value as RoutePurpose)}
            disabled={!isCreating}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="camera_backbone">Camera Backbone</option>
            <option value="camera_drop">Camera Drop</option>
            <option value="network_backbone">Network Backbone</option>
            <option value="spare">Spare / Reserve</option>
          </select>
        </div>

        {/* Conduit Diameter */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            Conduit Diameter (inches)
          </label>
          <input
            id="fiber-route-drawer-conduit"
            type="number"
            min={0.5}
            max={48}
            step={0.25}
            value={conduitDiameterInches}
            onChange={e => setConduitDiameterInches(parseFloat(e.target.value) || 2.0)}
            disabled={!isCreating}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Slack Percentage */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            Slack Percentage (%)
          </label>
          <input
            id="fiber-route-drawer-slack"
            type="number"
            min={0}
            max={100}
            step={1}
            value={slackPercentage}
            onChange={e => setSlackPercentage(parseFloat(e.target.value) || 10.0)}
            disabled={!isCreating}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* ── Cable Catalog Attachment (Step 4) ───────────────────────────────── */}
        {isCreating && (
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
              Link Cable Catalog Item
            </label>
            {fiberCatalog.length === 0 ? (
              <div className="text-[11px] text-amber-400 bg-amber-950/20 border border-amber-900/30 px-3 py-2 rounded-lg font-medium">
                No cable catalog items available.
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  id="fiber-route-drawer-catalog"
                  value={cableCatalogId}
                  onChange={e => setCableCatalogId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">No Cable Assigned (Route Only)</option>
                  {fiberCatalog.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.manufacturer} {item.part_number} ({item.fiber_count}F, {item.mode})
                    </option>
                  ))}
                </select>

                {/* Cable Selection Summary Card */}
                {selectedCatalogItem ? (
                  <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Manufacturer</span>
                      <span className="text-white font-medium">{selectedCatalogItem.manufacturer}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Model/Part #</span>
                      <span className="text-white font-mono">{selectedCatalogItem.part_number}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Fiber Count</span>
                      <span className="text-white font-bold">{selectedCatalogItem.fiber_count} Cores</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Fiber Mode</span>
                      <span className="text-white font-medium">{selectedCatalogItem.mode} ({selectedCatalogItem.grade})</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Diameter</span>
                      <span className="text-white font-mono">{selectedCatalogItem.diameter_mm} mm</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                      <span>Unit Cost</span>
                      <span className="text-white font-mono">${Number(selectedCatalogItem.cost_per_foot).toFixed(2)}/ft</span>
                    </div>
                    {/* Estimated Cost */}
                    <div className="flex justify-between pt-1 border-t border-[var(--border)] text-[var(--accent-text)] font-semibold">
                      <span>Est. Cable Cost</span>
                      <span className="font-mono">${(selectedCatalogItem.cost_per_foot * installedFt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* Estimated Conduit Fill percentage (Disclaimer Label) */}
                    {conduitFillEstimate !== null && (
                      <div className="pt-2 border-t border-[var(--border)] space-y-1 select-none">
                        <div className="flex justify-between text-indigo-300">
                          <span>Est. Conduit Fill</span>
                          <span className="font-mono font-bold">{conduitFillEstimate}%</span>
                        </div>
                        <span className="text-[8px] text-[var(--text-tertiary)] block leading-tight font-medium italic">
                          Estimated conduit fill only. Final fill requires verified conduit internal diameter and existing occupancy.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-amber-500/80 italic">
                    ⚠ Route will be created without a cable assignment.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Existing route linked cable details view */}
        {existingRoute && !isCreating && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-xl space-y-2 select-none">
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold block">
              Cable Infrastructure
            </span>
            {linkedCable ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Cable Tag</span>
                  <span className="text-white font-mono font-bold">{linkedCable.cable_tag}</span>
                </div>
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Manufacturer</span>
                  <span className="text-white font-medium">{linkedCable.manufacturer ?? 'Generic'}</span>
                </div>
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Model/Part #</span>
                  <span className="text-white font-mono">{linkedCable.model ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Strand Count</span>
                  <span className="text-[var(--accent-text)] font-mono font-bold">{linkedCable.strand_count ?? linkedCable.fiber_count} Cores</span>
                </div>
                <div className="flex justify-between text-[var(--text-tertiary)]">
                  <span>Cable Status</span>
                  <span className="text-emerald-400 font-bold">{linkedCable.install_status}</span>
                </div>
              </div>
            ) : (
              <div className="text-[11.5px] text-[var(--text-tertiary)] italic py-1">
                No cable attached to this route conduit.
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {isCreating && (
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
              Notes
            </label>
            <textarea
              id="fiber-route-drawer-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional route notes…"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-slate-700 text-white text-[12px] rounded-lg
                focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-[var(--accent)]
                resize-none placeholder:text-slate-600"
            />
          </div>
        )}

        {/* Existing route metadata details */}
        {existingRoute && !isCreating && (
          <div className="space-y-1.5 text-[11px] bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-xl">
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold block mb-1">
              Conduit Metadata
            </span>
            <div className="flex justify-between text-[var(--text-tertiary)]">
              <span>Installation</span>
              <span className="text-white capitalize">{existingRoute.installation_type?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-[var(--text-tertiary)]">
              <span>Purpose</span>
              <span className="text-white capitalize">{existingRoute.route_purpose?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-[var(--text-tertiary)]">
              <span>Conduit size</span>
              <span className="text-white font-mono">{existingRoute.conduit_diameter_inches ?? '—'} in</span>
            </div>
            <div className="flex justify-between text-[var(--text-tertiary)]">
              <span>Slack pct</span>
              <span className="text-white font-mono">{existingRoute.slack_percentage ?? 10}%</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {(formError || submitError) && (
          <div className="px-3 py-2.5 bg-red-950/40 border border-red-500/30 rounded-xl text-[11px] text-red-300">
            {formError ?? submitError}
          </div>
        )}
      </form>

      {/* ── Footer Actions ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--border)] shrink-0 space-y-2">

        {/* Save */}
        {isCreating && (
          <button
            id="fiber-route-drawer-save"
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || pathNodes.length < 2}
            className="w-full py-2.5 bg-[var(--accent)] text-white hover:bg-[var(--accent)] text-white text-white font-bold text-[12px] rounded-xl
              transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving Route…' : 'Save Route'}
          </button>
        )}

        {/* Delete */}
        {!isCreating && onDelete && (
          <button
            id="fiber-route-drawer-delete"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-2 bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 hover:border-red-500/60
              text-red-400 hover:text-red-300 font-semibold text-[11px] rounded-xl transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting…' : `Delete Route`}
          </button>
        )}

        {/* Cancel / Close */}
        <button
          id="fiber-route-drawer-cancel"
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:border-slate-700 text-[var(--text-secondary)]
            hover:text-white font-medium text-[11px] rounded-xl transition-all"
        >
          {isCreating ? 'Cancel' : 'Close'}
        </button>
      </div>
    </div>
  )
}

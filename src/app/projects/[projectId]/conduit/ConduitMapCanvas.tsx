'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Ductería's own map. Deliberately NOT the combined project map: per
 * claude/plan-separacion-modulos.md this module shows civil works only —
 * structures (handholes, manholes, pull boxes, vaults) and duct runs. No
 * cameras, no fiber objects.
 *
 * A run has no geometry of its own: it mirrors the fiber route it was created
 * with, so the line is drawn from that route's segments (passed in as
 * `segments`), which keeps one trace instead of two that can drift apart.
 */

interface ConduitMapCanvasProps {
  structures: any[]
  runs: any[]
  segments: {
    route_id: string
    segment_index: number
    start_latitude: number
    start_longitude: number
    end_latitude: number
    end_longitude: number
  }[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  selectedStructureId: string | null
  selectedRunId: string | null
  onSelectStructure: (id: string | null) => void
  onSelectRun: (id: string | null) => void
}

const STRUCTURE_LABEL: Record<string, string> = {
  handhole: 'Handhole',
  manhole: 'Manhole',
  pull_box: 'Pull Box',
  vault: 'Vault',
}

// New civil work vs. reused existing infrastructure — the distinction that
// drives whether it lands in the BOM, so it earns the colour difference.
const NEW_COLOR = '#0284c7'
const EXISTING_COLOR = '#64748b'
const SELECTED_COLOR = '#f97316'

function conditionColor(condition: string | null | undefined, selected: boolean) {
  if (selected) return SELECTED_COLOR
  return condition === 'existing' ? EXISTING_COLOR : NEW_COLOR
}

export default function ConduitMapCanvas({
  structures,
  runs,
  segments,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  selectedStructureId,
  selectedRunId,
  onSelectStructure,
  onSelectRun,
}: ConduitMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const layerIdsRef = useRef<string[]>([])
  const [basemap, setBasemap] = useState<'street' | 'satellite'>('street')

  // Keep the newest selection available to the marker click handlers without
  // re-creating every marker on each selection change.
  const onSelectStructureRef = useRef(onSelectStructure)
  const onSelectRunRef = useRef(onSelectRun)
  useEffect(() => {
    onSelectStructureRef.current = onSelectStructure
    onSelectRunRef.current = onSelectRun
  }, [onSelectStructure, onSelectRun])

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || map) return
    const instance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          base: {
            type: 'raster',
            tiles:
              basemap === 'satellite'
                ? ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
                : ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: [defaultLongitude || -84.42, defaultLatitude || 33.75],
      zoom: defaultZoom || 15,
    })
    instance.addControl(new maplibregl.NavigationControl(), 'top-right')
    instance.on('load', () => setMap(instance))
    return () => {
      instance.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Basemap switch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const src = map.getSource('base') as maplibregl.RasterTileSource | undefined
    if (!src) return
    src.setTiles(
      basemap === 'satellite'
        ? ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
        : ['https://tile.opentopomap.org/{z}/{x}/{y}.png']
    )
  }, [basemap, map])

  // ── Draw runs + structures ────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    layerIdsRef.current.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(id)) map.removeSource(id)
    })
    layerIdsRef.current = []

    const segmentsByRoute = new Map<string, ConduitMapCanvasProps['segments']>()
    for (const s of segments) {
      const list = segmentsByRoute.get(s.route_id) ?? []
      list.push(s)
      segmentsByRoute.set(s.route_id, list)
    }

    // Duct runs
    for (const run of runs) {
      const segs = run.route_id ? segmentsByRoute.get(run.route_id) : undefined
      if (!segs || segs.length === 0) continue

      const coordinates: [number, number][] = []
      segs
        .slice()
        .sort((a, b) => a.segment_index - b.segment_index)
        .forEach((s, i) => {
          if (i === 0) coordinates.push([Number(s.start_longitude), Number(s.start_latitude)])
          coordinates.push([Number(s.end_longitude), Number(s.end_latitude)])
        })
      if (coordinates.length < 2) continue

      const isSelected = run.id === selectedRunId
      const layerId = `conduit-run-${run.id}`
      map.addSource(layerId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
      })
      map.addLayer({
        id: layerId,
        type: 'line',
        source: layerId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': conditionColor(run.asset_condition, isSelected),
          'line-width': isSelected ? 7 : 4,
          'line-opacity': 0.9,
          // Existing duct that is only being reused is drawn dashed, the same
          // way a plan distinguishes proposed from as-built.
          ...(run.asset_condition === 'existing' ? { 'line-dasharray': [2, 1.5] as [number, number] } : {}),
        },
      })
      layerIdsRef.current.push(layerId)

      map.on('click', layerId, () => onSelectRunRef.current(run.id))
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
    }

    // Structures
    for (const st of structures) {
      if (st.latitude === null || st.longitude === null) continue
      const isSelected = st.id === selectedStructureId
      const color = conditionColor(st.asset_condition, isSelected)
      const label = STRUCTURE_LABEL[st.structure_type] ?? st.structure_type

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.title = `${st.structure_tag} — ${label}`
      el.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 32 : 26}" height="${isSelected ? 40 : 34}" viewBox="0 0 24 32">
          <rect x="3" y="4" width="18" height="14" rx="2" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <rect x="7" y="8" width="10" height="6" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="1.5"/>
          <rect x="0" y="20" width="24" height="8" rx="1.5" fill="#0f172a" opacity="0.85"/>
          <text x="12" y="26" fill="#ffffff" font-size="6" font-family="sans-serif" font-weight="bold" text-anchor="middle">${st.structure_tag}</text>
        </svg>
      `
      el.addEventListener('click', evt => {
        evt.stopPropagation()
        onSelectStructureRef.current(st.id)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([Number(st.longitude), Number(st.latitude)])
        .addTo(map)
      markersRef.current.push(marker)
    }
  }, [map, structures, runs, segments, selectedStructureId, selectedRunId])

  // Center on the selected item when it is picked from a table.
  useEffect(() => {
    if (!map) return
    if (selectedStructureId) {
      const st = structures.find(s => s.id === selectedStructureId)
      if (st && st.latitude !== null && st.longitude !== null) {
        map.flyTo({ center: [Number(st.longitude), Number(st.latitude)], zoom: 19 })
      }
    }
  }, [selectedStructureId, structures, map])

  const structuresWithCoords = structures.filter(s => s.latitude !== null && s.longitude !== null).length
  const runsWithGeometry = runs.filter(r => r.route_id && segments.some(s => s.route_id === r.route_id)).length

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      <div className="absolute top-3 left-3 flex items-center gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1 shadow-lg">
        {(['street', 'satellite'] as const).map(b => (
          <button
            key={b}
            onClick={() => setBasemap(b)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
              basemap === b ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-2.5 shadow-lg text-[10px] space-y-1.5 max-w-[230px]">
        <span className="block font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-[9px]">Legend</span>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 shrink-0" style={{ backgroundColor: NEW_COLOR }} />
          <span className="text-[var(--text-secondary)]">New duct run (billed)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: EXISTING_COLOR }} />
          <span className="text-[var(--text-secondary)]">Existing duct, reused</span>
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border)]">
          <svg width="12" height="12" viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="12" rx="2" fill={NEW_COLOR} stroke="#fff" strokeWidth="2" />
          </svg>
          <span className="text-[var(--text-secondary)]">Structure (handhole / manhole / pull box)</span>
        </div>
        <div className="pt-1 border-t border-[var(--border)] text-[var(--text-tertiary)] font-mono">
          {structuresWithCoords} structures · {runsWithGeometry} runs drawn
        </div>
      </div>
    </div>
  )
}

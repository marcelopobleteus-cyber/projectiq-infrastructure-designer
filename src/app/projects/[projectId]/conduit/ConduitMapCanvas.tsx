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
  /**
   * Ductería places its own civil works now. When a type is armed, the next
   * click on the map drops one there; until then the map behaves as before.
   */
  placingType: string | null
  onPlace: (latitude: number, longitude: number) => void
  /** Dragging a structure to its surveyed position writes the new coordinates. */
  onMoveStructure: (id: string, latitude: number, longitude: number) => void
  readOnly?: boolean
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
  placingType,
  onPlace,
  onMoveStructure,
  readOnly = false,
}: ConduitMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const layerIdsRef = useRef<string[]>([])
  // Same basemap vocabulary as the general project map, so switching modules
  // doesn't change how the map behaves.
  const [activeLayer, setActiveLayer] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap')
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)

  // Keep the newest selection available to the marker click handlers without
  // re-creating every marker on each selection change.
  const onSelectStructureRef = useRef(onSelectStructure)
  const onSelectRunRef = useRef(onSelectRun)
  const onPlaceRef = useRef(onPlace)
  const onMoveStructureRef = useRef(onMoveStructure)
  const placingTypeRef = useRef(placingType)
  useEffect(() => {
    onSelectStructureRef.current = onSelectStructure
    onSelectRunRef.current = onSelectRun
    onPlaceRef.current = onPlace
    onMoveStructureRef.current = onMoveStructure
    placingTypeRef.current = placingType
  }, [onSelectStructure, onSelectRun, onPlace, onMoveStructure, placingType])

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || map) return
    // Two sources toggled by visibility, matching ProjectMapCanvas exactly —
    // including the per-source maxzoom. Swapping tiles on a single source (the
    // first cut here) left satellite stuck with the street source's zoom
    // ceiling, so it couldn't zoom in as far as the general map does.
    const instance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          street: {
            type: 'raster',
            tiles: [
              'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 17,
            attribution: '© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors',
          },
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 20,
            attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
          },
        },
        layers: [
          { id: 'street-layer', type: 'raster', source: 'street', layout: { visibility: 'visible' } },
          { id: 'satellite-layer', type: 'raster', source: 'satellite', layout: { visibility: 'none' } },
        ],
      },
      center: [defaultLongitude || -84.42, defaultLatitude || 33.75],
      zoom: defaultZoom || 15,
      attributionControl: { compact: true, customAttribution: 'NextQ Designer' },
    })
    instance.on('load', () => setMap(instance))

    // Placement. Reading the armed type from a ref keeps this handler
    // registered once for the life of the map instead of being torn down and
    // rebuilt every time the toolbar selection changes.
    instance.on('click', evt => {
      if (!placingTypeRef.current) return
      onPlaceRef.current(evt.lngLat.lat, evt.lngLat.lng)
    })
    return () => {
      instance.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The map mounts inside a tab that was display:none until it was picked, so
  // MapLibre can latch onto a stale container size and draw its canvas larger
  // than the pane — tiles overflow and every marker lands off-screen. Watching
  // the container and calling resize() keeps the canvas matched to the pane,
  // and also covers the sidebar collapsing and window resizes.
  useEffect(() => {
    const el = mapContainerRef.current
    if (!map || !el) return
    map.resize()
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])

  // ── Basemap switch ────────────────────────────────────────────────────────
  const handleLayerChange = (layer: 'roadmap' | 'satellite' | 'hybrid') => {
    setActiveLayer(layer)
    if (map && map.getLayer('street-layer') && map.getLayer('satellite-layer')) {
      const showSatellite = layer === 'satellite' || layer === 'hybrid'
      map.setLayoutProperty('street-layer', 'visibility', showSatellite ? 'none' : 'visible')
      map.setLayoutProperty('satellite-layer', 'visibility', showSatellite ? 'visible' : 'none')
    }
  }

  const fitToElements = () => {
    if (!map) return
    const points: [number, number][] = []
    structures.forEach(s => {
      if (s.latitude !== null && s.longitude !== null) points.push([Number(s.longitude), Number(s.latitude)])
    })
    segments.forEach(s => {
      points.push([Number(s.start_longitude), Number(s.start_latitude)])
      points.push([Number(s.end_longitude), Number(s.end_latitude)])
    })
    if (points.length === 0) return
    const bounds = points.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(points[0], points[0]))
    map.fitBounds(bounds, { padding: 60, maxZoom: 18 })
  }

  // Crosshair while a type is armed, so it is obvious the next click places.
  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor = placingType ? 'crosshair' : ''
  }, [map, placingType])

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

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        draggable: !readOnly,
      })
        .setLngLat([Number(st.longitude), Number(st.latitude)])
        .addTo(map)

      if (!readOnly) {
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLngLat()
          onMoveStructureRef.current(st.id, lat, lng)
        })
      }

      markersRef.current.push(marker)
    }
  }, [map, structures, runs, segments, selectedStructureId, selectedRunId, readOnly])

  // Frame the civil works on first open. The project's default centre/zoom is
  // a project-wide setting and can easily leave the duct bank off-screen.
  const didFitRef = useRef(false)
  useEffect(() => {
    if (!map || didFitRef.current) return
    const points: [number, number][] = []
    structures.forEach(s => {
      if (s.latitude !== null && s.longitude !== null) points.push([Number(s.longitude), Number(s.latitude)])
    })
    segments.forEach(s => {
      points.push([Number(s.start_longitude), Number(s.start_latitude)])
      points.push([Number(s.end_longitude), Number(s.end_latitude)])
    })
    if (points.length === 0) return
    didFitRef.current = true
    const bounds = points.reduce(
      (b, p) => b.extend(p),
      new maplibregl.LngLatBounds(points[0], points[0])
    )
    map.fitBounds(bounds, { padding: 60, maxZoom: 18, duration: 0 })
  }, [map, structures, segments])

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
    <div className="relative w-full h-full overflow-hidden">
      {/* Absolutely positioned so the canvas can never push the pane wider
          than it is — the other half of the sizing fix above. */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Same right-edge icon toolbar as the general project map, so the map
          controls are identical everywhere instead of one style per module. */}
      <div className="absolute top-4 right-4 bottom-4 z-20 flex items-start">
        {layersPanelOpen && (
          <div className="mr-2 w-56 bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl p-2.5 flex flex-col gap-1.5 text-[10px] font-bold text-[var(--text-primary)] font-sans pointer-events-auto max-h-full overflow-y-auto">
            <div className="text-[9px] text-[var(--accent-text)] uppercase tracking-wider border-b border-[var(--border)] pb-1 mb-0.5">
              Basemap
            </div>
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-lg">
              {([
                { key: 'roadmap', label: 'Road' },
                { key: 'satellite', label: 'Sat' },
                { key: 'hybrid', label: 'Hybrid' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleLayerChange(opt.key)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeLayer === opt.key
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`${opt.label} basemap`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 p-1.5 bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl pointer-events-auto">
          <button
            onClick={() => setLayersPanelOpen(v => !v)}
            title="Basemap & layers"
            className={`p-2 rounded-lg transition-colors ${
              layersPanelOpen
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="M2 12l10 5 10-5" /><path d="M2 17l10 5 10-5" /></svg>
          </button>

          <div className="w-full h-px bg-[var(--border)]" />

          <button
            onClick={() => map?.zoomIn()}
            title="Zoom in"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button
            onClick={() => map?.zoomOut()}
            title="Zoom out"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>

          <div className="w-full h-px bg-[var(--border)]" />

          <button
            onClick={fitToElements}
            title="Fit map to all elements"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          </button>
        </div>
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

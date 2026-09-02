'use client'

import React, { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface Camera {
  id: string
  camera_id_tag: string
  latitude: number
  longitude: number
  status: string
  communication_type?: string
  camera_model_id?: string
  address_reference?: string | null
  structure_reference?: string | null
  notes?: string | null
}

interface FiberNode {
  id: string
  node_type: string
  latitude: number
  longitude: number
  name?: string
  status?: string
}

interface NetworkDevice {
  id: string
  name: string
  device_type: string
  latitude?: number | null
  longitude?: number | null
  status?: string
}

interface FiberRoute {
  id: string
  path_coordinates?: Array<{ lat: number; lng: number }>
  install_status?: string
  route_type?: string
}

interface LeafletMapProps {
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  cameras?: Camera[]
  fiberNodes?: FiberNode[]
  networkDevices?: NetworkDevice[]
  fiberRoutes?: FiberRoute[]
  selectedCamera?: Camera | null
  onSelectCamera?: (camera: Camera | null) => void
  onCameraDragEnd?: (camera: Camera, newLat: number, newLng: number) => void
  showCameras?: boolean
  showFiberNodes?: boolean
  showFiberRoutes?: boolean
  showNetworkDevices?: boolean
  onToggleMapEngine?: () => void
  activeEngineLabel?: string
}

export default function LeafletMapContainer({
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  cameras = [],
  fiberNodes = [],
  networkDevices = [],
  fiberRoutes = [],
  selectedCamera,
  onSelectCamera,
  onCameraDragEnd,
  showCameras = true,
  showFiberNodes = true,
  showFiberRoutes = true,
  showNetworkDevices = true,
  onToggleMapEngine,
  activeEngineLabel = 'OpenStreetMap (Free)',
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const polylinesRef = useRef<Record<string, any>>({})
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'satellite' | 'dark'>('dark')
  const tileLayerRef = useRef<any>(null)
  const [L, setL] = useState<any>(null)

  // Dynamically import Leaflet client-side
  useEffect(() => {
    import('leaflet').then(leaflet => {
      // Fix Leaflet default icon paths in Next.js bundlers
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })
      setL(leaflet)
    })
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!L || !mapRef.current || leafletMapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [defaultLatitude, defaultLongitude],
      zoom: defaultZoom,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Define Tile Layers
    const tileUrls = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      streets: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }

    const initialLayer = L.tileLayer(tileUrls.dark, {
      maxZoom: 19,
      attribution: '&copy; CartoDB & OpenStreetMap',
    }).addTo(map)

    tileLayerRef.current = initialLayer
    leafletMapInstanceRef.current = map

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove()
        leafletMapInstanceRef.current = null
      }
    }
  }, [L, defaultLatitude, defaultLongitude, defaultZoom])

  // Switch Tile Layers
  const handleSwitchTileLayer = (layerType: 'streets' | 'satellite' | 'dark') => {
    if (!L || !leafletMapInstanceRef.current) return
    setActiveTileLayer(layerType)

    if (tileLayerRef.current) {
      leafletMapInstanceRef.current.removeLayer(tileLayerRef.current)
    }

    const tileConfigs = {
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attr: '&copy; CartoDB & OpenStreetMap',
      },
      streets: {
        url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
        attr: '&copy; OpenStreetMap contributors',
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '&copy; Esri World Imagery (Free High-Res Satellite)',
      },
    }

    const cfg = tileConfigs[layerType]
    const newLayer = L.tileLayer(cfg.url, { maxZoom: 19, attribution: cfg.attr }).addTo(leafletMapInstanceRef.current)
    tileLayerRef.current = newLayer
  }

  // Create SVG Marker Icon
  const createSvgIcon = (color: string, label: string, isSelected: boolean) => {
    if (!L) return null
    const size = isSelected ? 36 : 28
    const svgHtml = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; items-center: center; justify-content: center;">
        <div style="position: absolute; inset: 0; background-color: ${color}; opacity: ${isSelected ? '0.4' : '0.25'}; rounded: 9999px; border-radius: 50%; ${isSelected ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}"></div>
        <div style="width: ${size - 8}px; height: ${size - 8}px; background-color: ${color}; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
          <span style="font-size: 9px; font-weight: 900; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${label.substring(0, 4)}</span>
        </div>
      </div>
    `
    return L.divIcon({
      html: svgHtml,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  // Synchronize Camera Markers
  useEffect(() => {
    if (!L || !leafletMapInstanceRef.current) return
    const map = leafletMapInstanceRef.current

    // Clear old camera markers if showCameras is false
    if (!showCameras) {
      Object.keys(markersRef.current).forEach(id => {
        if (id.startsWith('cam-')) {
          map.removeLayer(markersRef.current[id])
          delete markersRef.current[id]
        }
      })
      return
    }

    cameras.forEach(cam => {
      const markerId = `cam-${cam.id}`
      const isSelected = selectedCamera?.id === cam.id
      const colorMap: Record<string, string> = {
        planned: '#f59e0b',
        in_progress: '#3b82f6',
        complete: '#10b981',
        issue: '#ef4444',
      }
      const color = colorMap[cam.status] || '#6b7280'
      const icon = createSvgIcon(color, cam.camera_id_tag, isSelected)

      if (markersRef.current[markerId]) {
        // Update existing marker
        const marker = markersRef.current[markerId]
        marker.setLatLng([cam.latitude, cam.longitude])
        if (icon) marker.setIcon(icon)
      } else {
        // Create new marker
        const marker = L.marker([cam.latitude, cam.longitude], {
          icon: icon || undefined,
          draggable: true,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #1e293b; font-size: 13px;">${cam.camera_id_tag}</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Status: ${cam.status}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${cam.latitude.toFixed(5)}, ${cam.longitude.toFixed(5)}</div>
          </div>
        `)

        marker.on('click', () => {
          if (onSelectCamera) onSelectCamera(cam)
        })

        marker.on('dragend', (e: any) => {
          const latLng = e.target.getLatLng()
          if (onCameraDragEnd) {
            onCameraDragEnd(cam, latLng.lat, latLng.lng)
          }
        })

        markersRef.current[markerId] = marker
      }
    })
  }, [L, cameras, selectedCamera, showCameras, onSelectCamera, onCameraDragEnd])

  // Synchronize Fiber Routes (Polylines)
  useEffect(() => {
    if (!L || !leafletMapInstanceRef.current) return
    const map = leafletMapInstanceRef.current

    if (!showFiberRoutes) {
      Object.keys(polylinesRef.current).forEach(id => {
        map.removeLayer(polylinesRef.current[id])
        delete polylinesRef.current[id]
      })
      return
    }

    fiberRoutes.forEach(route => {
      if (!route.path_coordinates || route.path_coordinates.length < 2) return
      const routeId = `route-${route.id}`
      const coords = route.path_coordinates.map(c => [c.lat, c.lng])
      const color = route.install_status === 'Installed' ? '#10b981' : '#3b82f6'

      if (polylinesRef.current[routeId]) {
        polylinesRef.current[routeId].setLatLngs(coords)
      } else {
        const polyline = L.polyline(coords, {
          color,
          weight: 4,
          opacity: 0.8,
          dashArray: route.install_status === 'Planned' ? '6, 6' : undefined,
        }).addTo(map)

        polylinesRef.current[routeId] = polyline
      }
    })
  }, [L, fiberRoutes, showFiberRoutes])

  return (
    <div className="relative w-full h-full bg-[var(--surface-2)] overflow-hidden">
      {/* Map Element */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Top Banner: Hybrid Engine Indicator */}
      <div className="absolute top-4 left-4 z-10 bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border)] px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-[var(--text-primary)]">Motor de Mapa:</span>
          <span className="text-emerald-400 font-semibold">{activeEngineLabel}</span>
        </div>

        {onToggleMapEngine && (
          <button
            onClick={onToggleMapEngine}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[var(--text-primary)] font-bold rounded-lg text-[10px] transition cursor-pointer"
          >
            Cambiar a Google Maps
          </button>
        )}
      </div>

      {/* Top Right: Tile Layer Switcher (Streets, Dark, Satellite) */}
      <div className="absolute top-4 right-4 z-10 bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border)] p-1.5 rounded-xl shadow-xl flex gap-1">
        <button
          onClick={() => handleSwitchTileLayer('dark')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTileLayer === 'dark'
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-slate-800'
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => handleSwitchTileLayer('streets')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTileLayer === 'streets'
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-slate-800'
          }`}
        >
          Calles
        </button>
        <button
          onClick={() => handleSwitchTileLayer('satellite')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTileLayer === 'satellite'
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-slate-800'
          }`}
        >
          Esri Satellite (Free)
        </button>
      </div>
    </div>
  )
}

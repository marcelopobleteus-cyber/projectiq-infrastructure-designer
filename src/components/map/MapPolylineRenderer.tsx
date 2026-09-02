'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { Database } from '@/types/supabase'

type FiberNode = Database['public']['Tables']['fiber_nodes']['Row']
type FiberRoute = Database['public']['Tables']['fiber_routes']['Row']
type FiberRouteSegment = Database['public']['Tables']['fiber_route_segments']['Row']
type FiberCable = Database['public']['Tables']['fiber_cables']['Row']
type CameraFiberAssignment = Database['public']['Tables']['camera_fiber_assignments']['Row']
type CameraLocation = Database['public']['Tables']['camera_locations']['Row']

interface MapPolylineRendererProps {
  map: maplibregl.Map | null
  fiberNodes: FiberNode[]
  fiberRoutes: FiberRoute[]
  fiberRouteSegments: FiberRouteSegment[]
  fiberCables: FiberCable[]
  fiberAssignments: CameraFiberAssignment[]
  cameras: CameraLocation[]
  showFiberRoutes: boolean
  projectId: string
  // Optional: when defined, clicking a route polyline opens the route drawer
  onRouteClick?: (route: FiberRoute) => void
  // Optional: temporary path nodes for active route design preview
  previewNodes?: FiberNode[]
}

// Module-scope so different renderer instances on the same map don't collide.
let polylineRendererInstanceId = 0

export default function MapPolylineRenderer({
  map,
  fiberNodes,
  fiberRoutes,
  fiberRouteSegments,
  fiberCables,
  fiberAssignments,
  cameras,
  showFiberRoutes,
  projectId,
  onRouteClick,
  previewNodes,
}: MapPolylineRendererProps) {
  const instanceIdRef = useRef(0)
  if (instanceIdRef.current === 0) {
    polylineRendererInstanceId += 1
    instanceIdRef.current = polylineRendererInstanceId
  }
  const routeLayerIdsRef = useRef<string[]>([])
  const previewLayerIdRef = useRef<string | null>(null)
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null)

  const addLine = (
    mapInstance: maplibregl.Map,
    id: string,
    coordinates: [number, number][],
    color: string,
    opts: { width?: number; dashed?: boolean; opacity?: number } = {}
  ) => {
    const { width = 4, dashed = false, opacity = 0.8 } = opts
    if (mapInstance.getLayer(id)) mapInstance.removeLayer(id)
    if (mapInstance.getSource(id)) mapInstance.removeSource(id)
    mapInstance.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
    })
    mapInstance.addLayer({
      id,
      type: 'line',
      source: id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': width,
        'line-opacity': opacity,
        ...(dashed ? { 'line-dasharray': [2, 2] } : {})
      }
    })
  }

  const removeLines = (mapInstance: maplibregl.Map | null, ids: string[]) => {
    if (!mapInstance) return
    ids.forEach(id => {
      if (mapInstance.getLayer(id)) mapInstance.removeLayer(id)
      if (mapInstance.getSource(id)) mapInstance.removeSource(id)
    })
  }

  useEffect(() => {
    if (!map) return

    const getStatusColor = (status: string | null) => {
      const s = status ? status.toLowerCase() : ''
      if (s === 'planned') return '#eab308'
      if (s === 'pulled' || s === 'in progress' || s === 'needs survey' || s === 'needs retest' || s === 'splicing pending' || s === 'testing pending' || s === 'fiber pulled') return '#3b82f6'
      if (s === 'installed' || s === 'complete' || s === 'passed' || s === 'tested' || s === 'spliced' || s === 'connected') return '#10b981'
      if (s === 'blocked' || s === 'failed' || s === 'damaged' || s === 'removed') return '#ef4444'
      return '#64748b'
    }

    const getRouteColor = (route: FiberRoute) => {
      const cable = fiberCables.find(c => c.route_id === route.id)
      if (!cable) return '#eab308'
      if (cable.test_status === 'Passed') return '#10b981'
      if (cable.install_status === 'Installed') return '#10b981'
      if (cable.install_status === 'Pulled') return '#3b82f6'
      if (cable.install_status === 'Blocked' || cable.install_status === 'Damaged') return '#ef4444'
      return '#eab308'
    }

    // 1. Clear old route layers
    removeLines(map, routeLayerIdsRef.current)
    routeLayerIdsRef.current = []

    if (!showFiberRoutes) return

    const showHoverPopup = (lngLat: maplibregl.LngLat, content: string) => {
      if (hoverPopupRef.current) hoverPopupRef.current.remove()
      hoverPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(lngLat)
        .setHTML(content)
        .addTo(map)
    }
    const hideHoverPopup = () => {
      if (hoverPopupRef.current) {
        hoverPopupRef.current.remove()
        hoverPopupRef.current = null
      }
    }

    // 2. Draw conduits
    fiberRoutes.forEach(route => {
      const segs = fiberRouteSegments.filter(s => s.route_id === route.id)
      const points: [number, number][] = []
      segs.forEach(s => {
        if (s.start_latitude !== null && s.start_longitude !== null) {
          points.push([s.start_longitude, s.start_latitude])
        }
        if (s.end_latitude !== null && s.end_longitude !== null) {
          points.push([s.end_longitude, s.end_latitude])
        }
      })

      if (points.length === 0) return

      const layerId = `poly-r${instanceIdRef.current}-route-${route.id}`
      addLine(map, layerId, points, getRouteColor(route), { width: 4, opacity: 0.8 })

      map.on('mousemove', layerId, (e: maplibregl.MapMouseEvent) => {
        const cable = fiberCables.find(c => c.route_id === route.id)
        const content = `
          <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; min-width: 150px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
              Route: ${route.route_id_tag}
            </div>
            <div><strong>Length:</strong> ${route.measured_length_feet} ft</div>
            <div><strong>Conduit Size:</strong> ${route.conduit_diameter_inches} in</div>
            <div><strong>Cable:</strong> ${cable ? `${cable.cable_tag} (${cable.fiber_count}F)` : 'No cable'}</div>
            ${onRouteClick
              ? `<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; color: #818cf8; font-size: 9px; font-weight: bold;">Click route to view/delete details</div>`
              : `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex;">
              <a href="/projects/${projectId}/fiber?selectedRouteId=${route.id}" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1;">Edit Route</a>
            </div>`
            }
          </div>
        `
        showHoverPopup(e.lngLat, content)
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        hideHoverPopup()
        map.getCanvas().style.cursor = ''
      })

      // Wire route click: open details drawer when callback is provided
      if (onRouteClick) {
        map.on('click', layerId, () => {
          onRouteClick(route)
        })
      }

      routeLayerIdsRef.current.push(layerId)
    })

    // 3. Draw drop cables (dashed)
    fiberAssignments.forEach(assignment => {
      if (!assignment.source_node_id || !assignment.camera_id) return
      const node = fiberNodes.find(n => n.id === assignment.source_node_id)
      const camera = cameras.find(c => c.id === assignment.camera_id)

      if (node && camera) {
        const layerId = `poly-r${instanceIdRef.current}-drop-${assignment.id}`
        addLine(
          map,
          layerId,
          [[node.longitude, node.latitude], [camera.longitude, camera.latitude]],
          getStatusColor(assignment.fiber_path_status),
          { width: 2, dashed: true, opacity: 0.85 }
        )

        map.on('mousemove', layerId, (e: maplibregl.MapMouseEvent) => {
          const content = `
            <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a;">
              <strong>Camera Drop: ${camera.camera_id_tag}</strong><br/>
              Status: ${assignment.fiber_path_status || 'N/A'}<br/>
              Splicing: ${assignment.splice_status || 'N/A'}<br/>
              Testing: ${assignment.test_status || 'N/A'}
            </div>
          `
          showHoverPopup(e.lngLat, content)
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', layerId, () => {
          hideHoverPopup()
          map.getCanvas().style.cursor = ''
        })

        routeLayerIdsRef.current.push(layerId)
      }
    })

    return () => {
      hideHoverPopup()
    }
  }, [
    map,
    fiberNodes,
    fiberRoutes,
    fiberRouteSegments,
    fiberCables,
    fiberAssignments,
    showFiberRoutes,
    cameras,
    projectId,
    onRouteClick,
  ])

  // Draw temporary preview polyline connecting selected nodes in sequence order
  useEffect(() => {
    if (!map) return

    if (previewLayerIdRef.current) {
      removeLines(map, [previewLayerIdRef.current])
      previewLayerIdRef.current = null
    }

    if (!previewNodes || previewNodes.length < 2) return

    const points: [number, number][] = previewNodes.map(n => [n.longitude, n.latitude])
    const layerId = `poly-r${instanceIdRef.current}-preview`
    addLine(map, layerId, points, '#818cf8', { width: 3, dashed: true, opacity: 0.9 })
    previewLayerIdRef.current = layerId

    return () => {
      removeLines(map, [layerId])
    }
  }, [map, previewNodes])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeLines(map, routeLayerIdsRef.current)
      if (previewLayerIdRef.current) removeLines(map, [previewLayerIdRef.current])
      if (hoverPopupRef.current) hoverPopupRef.current.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

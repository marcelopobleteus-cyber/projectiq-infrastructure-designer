'use client'

import { useEffect, useRef } from 'react'
import { Database } from '@/types/supabase'

type FiberNode = Database['public']['Tables']['fiber_nodes']['Row']
type FiberRoute = Database['public']['Tables']['fiber_routes']['Row']
type FiberRouteSegment = Database['public']['Tables']['fiber_route_segments']['Row']
type FiberCable = Database['public']['Tables']['fiber_cables']['Row']
type CameraFiberAssignment = Database['public']['Tables']['camera_fiber_assignments']['Row']
type CameraLocation = Database['public']['Tables']['camera_locations']['Row']

interface MapPolylineRendererProps {
  map: google.maps.Map | null
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
  const fiberRoutePolylinesRef = useRef<google.maps.Polyline[]>([])

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

    // 1. Clear old route polylines
    fiberRoutePolylinesRef.current.forEach(p => p.setMap(null))
    fiberRoutePolylinesRef.current = []

    if (!showFiberRoutes) return

    const winObj = window as unknown as { _mapInfoWindow?: google.maps.InfoWindow }
    let infoWindow = winObj._mapInfoWindow
    if (!infoWindow && typeof google !== 'undefined') {
      infoWindow = new google.maps.InfoWindow()
      winObj._mapInfoWindow = infoWindow
    }

    // 2. Draw conduits
    fiberRoutes.forEach(route => {
      const segs = fiberRouteSegments.filter(s => s.route_id === route.id)
      const points: google.maps.LatLngLiteral[] = []
      segs.forEach(s => {
        if (s.start_latitude !== null && s.start_longitude !== null) {
          points.push({ lat: s.start_latitude, lng: s.start_longitude })
        }
        if (s.end_latitude !== null && s.end_longitude !== null) {
          points.push({ lat: s.end_latitude, lng: s.end_longitude })
        }
      })

      if (points.length === 0) return

      const strokeCol = getRouteColor(route)
      const poly = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: strokeCol,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      })

      poly.addListener('mouseover', (e: google.maps.PolyMouseEvent) => {
        const cable = fiberCables.find(c => c.route_id === route.id)
        const content = `
          <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; min-width: 150px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-b: 1px solid #e2e8f0; padding-bottom: 2px;">
              Route: ${route.route_id_tag}
            </div>
            <div><strong>Length:</strong> ${route.measured_length_feet} ft</div>
            <div><strong>Conduit Size:</strong> ${route.conduit_diameter_inches} in</div>
            <div><strong>Cable:</strong> ${cable ? `${cable.cable_tag} (${cable.fiber_count}F)` : 'No cable'}</div>
            ${onRouteClick
              ? `<div style="margin-top: 6px; padding-top: 4px; border-t: 1px solid #e2e8f0; color: #818cf8; font-size: 9px; font-weight: bold;">Click route to view/delete details</div>`
              : `<div style="margin-top: 8px; padding-top: 6px; border-t: 1px solid #e2e8f0; display: flex;">
              <a href="/projects/${projectId}/fiber?selectedRouteId=${route.id}" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1;">Editar Ruta</a>
            </div>`
            }
          </div>
        `
        if (infoWindow && e.latLng) {
          infoWindow.setContent(content)
          infoWindow.setPosition(e.latLng)
          infoWindow.open(map)
        }
      })

      // Wire route click: open details drawer when callback is provided
      if (onRouteClick) {
        poly.addListener('click', () => {
          onRouteClick(route)
        })
      }

      fiberRoutePolylinesRef.current.push(poly)
    })

    // 3. Draw drop cables (dashed)
    fiberAssignments.forEach(assignment => {
      if (!assignment.source_node_id || !assignment.camera_id) return
      const node = fiberNodes.find(n => n.id === assignment.source_node_id)
      const camera = cameras.find(c => c.id === assignment.camera_id)

      if (node && camera) {
        const symbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.8,
          scale: 2
        }
        const poly = new google.maps.Polyline({
          path: [
            { lat: node.latitude, lng: node.longitude },
            { lat: camera.latitude, lng: camera.longitude }
          ],
          geodesic: true,
          strokeColor: getStatusColor(assignment.fiber_path_status),
          strokeOpacity: 0,
          icons: [{
            icon: symbol,
            offset: '0',
            repeat: '10px'
          }],
          map: map
        })

        poly.addListener('mouseover', (e: google.maps.PolyMouseEvent) => {
          const content = `
            <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a;">
              <strong>Camera Drop: ${camera.camera_id_tag}</strong><br/>
              Status: ${assignment.fiber_path_status || 'N/A'}<br/>
              Splicing: ${assignment.splice_status || 'N/A'}<br/>
              Testing: ${assignment.test_status || 'N/A'}
            </div>
          `
          if (infoWindow && e.latLng) {
            infoWindow.setContent(content)
            infoWindow.setPosition(e.latLng)
            infoWindow.open(map)
          }
        })

        poly.addListener('mouseout', () => {
          if (infoWindow) infoWindow.close()
        })

        fiberRoutePolylinesRef.current.push(poly)
      }
    })
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

  const previewPolylineRef = useRef<google.maps.Polyline | null>(null)

  // Draw temporary preview polyline connecting selected nodes in sequence order
  useEffect(() => {
    if (!map) return

    if (previewPolylineRef.current) {
      previewPolylineRef.current.setMap(null)
      previewPolylineRef.current = null
    }

    if (!previewNodes || previewNodes.length < 2) return

    const points = previewNodes.map(n => ({ lat: n.latitude, lng: n.longitude }))
    const symbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 0.8,
      scale: 2
    }

    const poly = new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: '#818cf8', // Indigo preview color
      strokeOpacity: 0,
      icons: [{
        icon: symbol,
        offset: '0',
        repeat: '10px'
      }],
      strokeWeight: 3,
      map: map
    })

    previewPolylineRef.current = poly

    return () => {
      if (poly) poly.setMap(null)
    }
  }, [map, previewNodes])

  // Cleanup on unmount
  useEffect(() => {
    const currentPolylines = fiberRoutePolylinesRef.current
    const currentPreviewPolyline = previewPolylineRef.current
    return () => {
      currentPolylines.forEach(p => p.setMap(null))
      if (currentPreviewPolyline) currentPreviewPolyline.setMap(null)
    }
  }, [])

  return null
}

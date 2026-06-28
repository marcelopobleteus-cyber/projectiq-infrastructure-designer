'use client'

import React, { useEffect, useRef } from 'react'
import { Database } from '@/types/supabase'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type NetworkDevice = Database['public']['Tables']['network_devices']['Row']
type FiberNode = Database['public']['Tables']['fiber_nodes']['Row']
type FiberCable = Database['public']['Tables']['fiber_cables']['Row']
type CameraFiberAssignment = Database['public']['Tables']['camera_fiber_assignments']['Row']

interface MapAssetMarkerRendererProps {
  map: google.maps.Map | null
  cameras: CameraLocation[]
  selectedCamera: CameraLocation | null
  setSelectedCamera: (cam: CameraLocation | null) => void
  showCameras: boolean
  networkDevices: NetworkDevice[]
  selectedDevice: NetworkDevice | null
  setSelectedDevice: (dev: NetworkDevice | null) => void
  showDevices: boolean
  showFiberNodes: boolean
  fiberNodes: FiberNode[]
  fiberCables: FiberCable[]
  fiberAssignments: CameraFiberAssignment[]
  projectId: string

  // Event handlers
  onCameraDragEnd: (id: string, lat: number, lng: number) => Promise<void>
  onDeviceDragEnd: (id: string, lat: number, lng: number) => Promise<void>

  // Fiber Path Design — optional: when defined, clicking a fiber node calls this callback
  onFiberNodeClick?: (node: FiberNode) => void

  // Hover states
  setHoveredCamera: (cam: CameraLocation | null) => void
  setHoverPosition: (pos: { x: number; y: number } | null) => void
  isHoveringCardRef: React.MutableRefObject<boolean>
  mapRef: React.RefObject<HTMLDivElement | null>
  mapRectRef: React.MutableRefObject<DOMRect | null>
}

export default function MapAssetMarkerRenderer({
  map,
  cameras,
  selectedCamera,
  setSelectedCamera,
  showCameras,
  networkDevices,
  selectedDevice,
  setSelectedDevice,
  showDevices,
  showFiberNodes,
  fiberNodes,
  fiberCables,
  fiberAssignments,
  projectId,
  onCameraDragEnd,
  onDeviceDragEnd,
  onFiberNodeClick,
  setHoveredCamera,
  setHoverPosition,
  isHoveringCardRef,
  mapRef,
  mapRectRef
}: MapAssetMarkerRendererProps) {
  const cameraMarkersRef = useRef<{ [id: string]: google.maps.Marker }>({})
  const deviceMarkersRef = useRef<{ [id: string]: google.maps.Marker }>({})
  const fiberNodeMarkersRef = useRef<{ [id: string]: google.maps.Marker }>({})

  const cameraMarkerStateRef = useRef<{ [id: string]: { isSelected: boolean; status: string; tag: string } }>({})
  const deviceMarkerStateRef = useRef<{ [id: string]: { isSelected: boolean; deviceType: string; name: string } }>({})
  
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Color helpers
  const getCameraStatusColor = (status: Database['public']['Enums']['camera_status']): string => {
    if (status === 'in_progress') return '#3b82f6'
    if (status === 'complete') return '#22c55e'
    if (status === 'issue') return '#ef4444'
    return '#eab308'
  }

  const getNetworkDeviceColor = (type: Database['public']['Enums']['device_type']): string => {
    if (type === 'nvr') return '#8b5cf6'
    if (type === 'router') return '#06b6d4'
    if (type === 'UPS') return '#10b981'
    if (type === 'Wireless Radio') return '#f97316'
    if (type === 'Industrial Switch') return '#3b82f6'
    if (type === 'switch') return '#2563eb'
    if (type === 'Media Converter') return '#ec4899'
    return '#64748b'
  }

  const getStatusColor = (status: string | null) => {
    const s = status ? status.toLowerCase() : ''
    if (s === 'planned') return '#eab308'
    if (s === 'pulled' || s === 'in progress' || s === 'needs survey' || s === 'needs retest' || s === 'splicing pending' || s === 'testing pending' || s === 'fiber pulled') return '#3b82f6'
    if (s === 'installed' || s === 'complete' || s === 'passed' || s === 'tested' || s === 'spliced' || s === 'connected') return '#10b981'
    if (s === 'blocked' || s === 'failed' || s === 'damaged' || s === 'removed') return '#ef4444'
    return '#64748b'
  }

  // 1. Sync Cameras
  useEffect(() => {
    if (!map) return

    const createCameraMarkerIcon = (
      status: Database['public']['Enums']['camera_status'],
      tag: string,
      isSelected = false
    ) => {
      const color = getCameraStatusColor(status)
      const ringAttr = isSelected ? `stroke="white" stroke-width="3"` : ''
      const shortTag = tag.length > 9 ? tag.substring(0, 9) : tag

      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 46 60">`,
        `<defs><filter id="ds" x="-40%" y="-40%" width="180%" height="180%">`,
        `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter></defs>`,
        `<circle cx="23" cy="23" r="22" fill="${color}" filter="url(#ds)" ${ringAttr}/>`,
        `<circle cx="23" cy="23" r="16" fill="#0f172a"/>`,
        `<rect x="10" y="17" width="14" height="11" rx="2.5" fill="${color}"/>`,
        `<circle cx="17" cy="22.5" r="4" fill="#0f172a"/>`,
        `<circle cx="17" cy="22.5" r="2" fill="${color}" opacity="0.32"/>`,
        `<path d="M25 18.5L34 15v15L25 26.5V18.5z" fill="${color}"/>`,
        `<rect x="1" y="47" width="44" height="12" rx="6" fill="#0f172a" opacity="0.93"/>`,
        `<text x="23" y="57" text-anchor="middle" font-family="Courier New,monospace" `,
        `font-size="8" font-weight="bold" fill="white" letter-spacing="0.4">${shortTag}</text>`,
        `</svg>`,
      ].join('')

      return {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(46, 60),
        anchor: new google.maps.Point(23, 23),
      }
    }

    Object.keys(cameraMarkersRef.current).forEach(id => {
      const cam = cameras.find(c => c.id === id)
      if (!cam || !showCameras) {
        cameraMarkersRef.current[id].setMap(null)
        delete cameraMarkersRef.current[id]
      }
    })

    if (!showCameras) return

    cameras.forEach(cam => {
      const isSelected = selectedCamera?.id === cam.id
      const position = { lat: cam.latitude, lng: cam.longitude }

      const prevState = cameraMarkerStateRef.current[cam.id]
      const needsIconUpdate = !prevState ||
        prevState.isSelected !== isSelected ||
        prevState.status !== cam.status ||
        prevState.tag !== cam.camera_id_tag

      if (cameraMarkersRef.current[cam.id]) {
        const marker = cameraMarkersRef.current[cam.id]
        marker.setPosition(position)
        if (needsIconUpdate) {
          const icon = createCameraMarkerIcon(cam.status, cam.camera_id_tag, isSelected)
          marker.setIcon(icon)
          marker.setTitle(`${cam.camera_id_tag} (${cam.status})`)
          cameraMarkerStateRef.current[cam.id] = { isSelected, status: cam.status, tag: cam.camera_id_tag }
        }
      } else {
        const icon = createCameraMarkerIcon(cam.status, cam.camera_id_tag, isSelected)
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon,
          title: `${cam.camera_id_tag} (${cam.status})`,
        })

        cameraMarkerStateRef.current[cam.id] = { isSelected, status: cam.status, tag: cam.camera_id_tag }

        marker.addListener('click', () => {
          setSelectedCamera(cam)
        })

        marker.addListener('mouseover', (e: google.maps.MapMouseEvent) => {
          const domEvent = (e as unknown as { domEvent: MouseEvent }).domEvent
          let rect = mapRectRef.current
          if (!rect && mapRef.current) {
            rect = mapRef.current.getBoundingClientRect()
            mapRectRef.current = rect
          }
          if (rect) {
            setHoverPosition({ x: domEvent.clientX - rect.left, y: domEvent.clientY - rect.top })
          }
          setHoveredCamera(cam)
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        })

        marker.addListener('mouseout', () => {
          hoverTimerRef.current = setTimeout(() => {
            if (!isHoveringCardRef.current) {
              setHoveredCamera(null)
              setHoverPosition(null)
            }
          }, 350)
        })

        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition()
          if (!newPos) return

          const newLat = newPos.lat()
          const newLng = newPos.lng()

          await onCameraDragEnd(cam.id, newLat, newLng)
        })

        cameraMarkersRef.current[cam.id] = marker
      }
    })
  }, [cameras, map, selectedCamera, showCameras, onCameraDragEnd, isHoveringCardRef, mapRectRef, mapRef, setHoverPosition, setHoveredCamera, setSelectedCamera])

  // 2. Sync Devices
  useEffect(() => {
    if (!map) return

    const getNetworkMarkerIcon = (type: Database['public']['Enums']['device_type'], isSelected = false) => {
      const color = getNetworkDeviceColor(type)
      return {
        path: 'M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm3 2h14v2H5V7zm0 4h14v2H5v-2zm0 4h14v2H5v-2z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: isSelected ? '#ffffff' : '#0f172a',
        strokeWeight: isSelected ? 3 : 1.5,
        scale: isSelected ? 1.3 : 1.1,
        anchor: new google.maps.Point(12, 12),
      }
    }

    Object.keys(deviceMarkersRef.current).forEach(id => {
      const dev = networkDevices.find(d => d.id === id)
      const hasCoords = dev && dev.latitude !== null && dev.longitude !== null
      if (!dev || !hasCoords || !showDevices) {
        deviceMarkersRef.current[id].setMap(null)
        delete deviceMarkersRef.current[id]
      }
    })

    if (!showDevices) return

    networkDevices.forEach(dev => {
      if (dev.latitude === null || dev.longitude === null) return
      
      const isSelected = selectedDevice?.id === dev.id
      const position = { lat: dev.latitude, lng: dev.longitude }

      const prevState = deviceMarkerStateRef.current[dev.id]
      const needsIconUpdate = !prevState ||
        prevState.isSelected !== isSelected ||
        prevState.deviceType !== dev.device_type ||
        prevState.name !== dev.name

      if (deviceMarkersRef.current[dev.id]) {
        const marker = deviceMarkersRef.current[dev.id]
        marker.setPosition(position)
        if (needsIconUpdate) {
          const icon = getNetworkMarkerIcon(dev.device_type, isSelected)
          marker.setIcon(icon)
          marker.setTitle(`${dev.name} (${dev.device_type})`)
          deviceMarkerStateRef.current[dev.id] = { isSelected, deviceType: dev.device_type, name: dev.name }
        }
      } else {
        const icon = getNetworkMarkerIcon(dev.device_type, isSelected)
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon,
          title: `${dev.name} (${dev.device_type})`,
        })

        deviceMarkerStateRef.current[dev.id] = { isSelected, deviceType: dev.device_type, name: dev.name }

        marker.addListener('click', () => {
          setSelectedDevice(dev)
        })

        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition()
          if (!newPos) return

          const newLat = newPos.lat()
          const newLng = newPos.lng()

          await onDeviceDragEnd(dev.id, newLat, newLng)
        })

        deviceMarkersRef.current[dev.id] = marker
      }
    })
  }, [networkDevices, map, selectedDevice, showDevices, onDeviceDragEnd, setSelectedDevice])

  // 3. Sync Fiber Nodes
  useEffect(() => {
    if (!map) return

    Object.keys(fiberNodeMarkersRef.current).forEach(id => {
      fiberNodeMarkersRef.current[id].setMap(null)
      delete fiberNodeMarkersRef.current[id]
    })

    if (!showFiberNodes) return

    const winObj = window as unknown as { _mapInfoWindow?: google.maps.InfoWindow }
    let infoWindow = winObj._mapInfoWindow
    if (!infoWindow && typeof google !== 'undefined') {
      infoWindow = new google.maps.InfoWindow()
      winObj._mapInfoWindow = infoWindow
    }

    fiberNodes.forEach(node => {
      const statusColor = getStatusColor(node.status)
      let svgShape = ''
      const typeLower = node.node_type ? node.node_type.toLowerCase() : ''
      
      if (typeLower === 'manhole') {
        svgShape = `
          <circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2"/>
          <line x1="12" y1="2" x2="12" y2="22" stroke="#ffffff" stroke-width="1"/>
          <line x1="2" y1="12" x2="22" y2="12" stroke="#ffffff" stroke-width="1"/>
        `
      } else if (typeLower === 'handhole') {
        svgShape = `
          <rect x="4" y="6" width="16" height="12" rx="1.5" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="8" y="9" width="8" height="6" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="1.5"/>
        `
      } else if (typeLower === 'pull box') {
        svgShape = `
          <rect x="6" y="4" width="12" height="16" rx="2" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
        `
      } else if (typeLower === 'cabinet') {
        svgShape = `
          <rect x="3" y="3" width="18" height="18" rx="2" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="6" y="6" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="1.5"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="#ffffff" stroke-width="1"/>
          <line x1="18" y1="6" x2="6" y2="18" stroke="#ffffff" stroke-width="1"/>
        `
      } else if (typeLower === 'pole') {
        svgShape = `
          <rect x="10" y="2" width="4" height="20" fill="${statusColor}" stroke="#ffffff" stroke-width="1"/>
          <line x1="4" y1="6" x2="20" y2="6" stroke="#ffffff" stroke-width="2"/>
          <line x1="6" y1="11" x2="18" y2="11" stroke="#ffffff" stroke-width="2"/>
        `
      } else if (typeLower === 'building') {
        svgShape = `
          <polygon points="12,2 2,10 5,10 5,20 19,20 19,10 22,10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="9" y="13" width="6" height="7" fill="#ffffff"/>
        `
      } else if (typeLower === 'existing fiber source') {
        svgShape = `
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="${statusColor}" stroke="#ffffff" stroke-width="1.5"/>
        `
      } else {
        svgShape = `
          <circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="#ffffff"/>
        `
      }

      // Draw mode ring: add indigo outer ring to make nodes visibly clickable
      const drawModeRing = onFiberNodeClick
        ? `<circle cx="12" cy="12" r="13" fill="none" stroke="#818cf8" stroke-width="2" stroke-dasharray="3 2" opacity="0.8"/>`
        : ''

      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 24 34">
          <g transform="translate(0, 0)">
            ${drawModeRing}
            ${svgShape}
          </g>
          <rect x="0" y="25" width="24" height="8" rx="1.5" fill="#0f172a" opacity="0.85"/>
          <text x="12" y="31" fill="#ffffff" font-size="6" font-family="sans-serif" font-weight="bold" text-anchor="middle">
            ${node.node_tag}
          </text>
        </svg>
      `

      const marker = new google.maps.Marker({
        position: { lat: node.latitude, lng: node.longitude },
        map: map,
        draggable: false,
        title: `${node.node_tag} (${node.node_type})`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
          scaledSize: new google.maps.Size(30, 42),
          anchor: new google.maps.Point(15, 15)
        }
      })

      // Wire click: Fiber Path Design draw mode takes priority when callback is provided
      marker.addListener('click', () => {
        if (onFiberNodeClick) {
          onFiberNodeClick(node)
        }
        // When onFiberNodeClick is undefined, no click action fires (existing behavior)
      })

      marker.addListener('mouseover', () => {
        const cables = fiberCables.filter(c => c.from_node_id === node.id || c.to_node_id === node.id)
        const served = fiberAssignments.filter(a => a.source_node_id === node.id)
        const servedTags = served.map(a => {
          const cam = cameras.find(c => c.id === a.camera_id)
          return cam ? cam.camera_id_tag : 'Unknown'
        }).join(', ')

        const content = `
          <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 200px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-b: 1px solid #e2e8f0; padding-bottom: 2px;">
              ${node.node_tag}
            </div>
            <div><strong>Type:</strong> ${node.node_type}</div>
            <div><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${node.status}</span></div>
            <div><strong>Cables:</strong> ${cables.length > 0 ? cables.map(c => c.cable_tag).join(', ') : 'None'}</div>
            <div><strong>Served Cams:</strong> ${servedTags || 'None'}</div>
            ${!onFiberNodeClick ? `<div style="margin-top: 8px; padding-top: 6px; border-t: 1px solid #e2e8f0; display: flex;">
              <a href="/projects/${projectId}/fiber?selectedNodeId=${node.id}" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1;">Editar Nodo</a>
            </div>` : `<div style="margin-top: 6px; padding-top: 4px; border-t: 1px solid #e2e8f0; color: #818cf8; font-size: 9px; font-weight: bold;">Click to select as route endpoint</div>`}
          </div>
        `
        if (infoWindow) {
          infoWindow.setContent(content)
          infoWindow.open(map, marker)
        }
      })

      fiberNodeMarkersRef.current[node.id] = marker
    })
  }, [fiberNodes, map, showFiberNodes, fiberCables, fiberAssignments, cameras, projectId, onFiberNodeClick])

  // Cleanup on unmount
  useEffect(() => {
    const currentCameraMarkers = cameraMarkersRef.current
    const currentDeviceMarkers = deviceMarkersRef.current
    const currentFiberNodeMarkers = fiberNodeMarkersRef.current
    return () => {
      Object.keys(currentCameraMarkers).forEach(id => {
        const marker = currentCameraMarkers[id]
        if (marker) marker.setMap(null)
      })
      Object.keys(currentDeviceMarkers).forEach(id => {
        const marker = currentDeviceMarkers[id]
        if (marker) marker.setMap(null)
      })
      Object.keys(currentFiberNodeMarkers).forEach(id => {
        const marker = currentFiberNodeMarkers[id]
        if (marker) marker.setMap(null)
      })
    }
  }, [])

  return null
}

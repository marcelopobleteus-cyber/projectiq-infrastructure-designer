'use client'

import React, { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/utils/supabase/client'
import { 
  createFiberNode, 
  deleteFiberNode, 
  createFiberRoute, 
  deleteFiberRoute, 
  createSpliceRecord,
  updateCameraFiberAssignment,
  createFiberEnclosure,
  deleteSpliceRecord,
  clearSplicesForCables
} from '../../actions-fiber'

interface FiberMapCanvasProps {
  projectId: string
  initialData: {
    nodes: any[]
    enclosures: any[]
    routes: any[]
    segments: any[]
    cables: any[]
    strands: any[]
    splices: any[]
    assignments: any[]
    cameras: any[]
    spliceRecords?: any[]
    assignmentStrands?: any[]
    cabinets?: any[]
    fdus?: any[]
    fpps?: any[]
    patchCords?: any[]
    networkDevices?: any[]
  }
  fiberCatalog: any[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  googleMapsApiKey?: string
}

export default function FiberMapCanvas({
  projectId,
  initialData,
  fiberCatalog,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  googleMapsApiKey
}: FiberMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Map drawing mode state
  // Modes: 'select' (default), 'Manhole', 'Handhole', 'Pull Box', 'Cabinet', 'Pole', 'Building', 'Existing Fiber Source', 'Camera Location', 'Custom', 'draw_route'
  const [toolMode, setToolMode] = useState<'select' | 'Manhole' | 'Handhole' | 'Pull Box' | 'Cabinet' | 'Pole' | 'Building' | 'Existing Fiber Source' | 'Camera Location' | 'Custom' | 'draw_route'>('select')
  const [tempRoutePoints, setTempRoutePoints] = useState<google.maps.LatLngLiteral[]>([])
  const [tempPolyline, setTempPolyline] = useState<google.maps.Polyline | null>(null)

  // Sidebar States
  const [activeTab, setActiveTab] = useState<'catalog' | 'properties' | 'splice' | 'cameras' | 'lists'>('properties')
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)

  // Form States for Node creation/editing
  const [nodeIdTag, setNodeIdTag] = useState('')
  const [nodeSize, setNodeSize] = useState('24x36x36')
  const [nodeElevation, setNodeElevation] = useState(0)
  const [nodeSlack, setNodeSlack] = useState(20)
  const [nodeNotes, setNodeNotes] = useState('')
  const [nodeClosureType, setNodeClosureType] = useState<'Dome Closure' | 'Inline Closure' | 'Patch Panel' | 'ODF'>('Dome Closure')
  const [nodeCapacity, setNodeCapacity] = useState(24)

  // Form States for Route creation
  const [routeIdTag, setRouteIdTag] = useState('')
  const [conduitDiameter, setConduitDiameter] = useState(2.0)
  const [routeSlackPercentage, setRouteSlackPercentage] = useState(10.0)
  const [installationType, setInstallationType] = useState<'underground' | 'aerial' | 'direct_buried'>('underground')
  const [selectedCatalogCableId, setSelectedCatalogCableId] = useState('')
  const [routeFiberCount, setRouteFiberCount] = useState(12)

  // Splicing States
  const [spliceCableA, setSpliceCableA] = useState('')
  const [spliceCableB, setSpliceCableB] = useState('')
  const [spliceConfig, setSpliceConfig] = useState<{ [fiberNumA: number]: number }>({})

  // Camera Assignment States
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [selectedAssignCableId, setSelectedAssignCableId] = useState('')
  const [assignTxCore, setAssignTxCore] = useState(1)
  const [assignRxCore, setAssignRxCore] = useState(2)
  const [assignLinkRole, setAssignLinkRole] = useState<'primary' | 'backup'>('primary')

  // Notification Messages
  const [notifyMessage, setNotifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Keep references to Google Maps markers & polylines to redraw them on data updates
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylinesRef = useRef<google.maps.Polyline[]>([])

  // Fiber colors list (TLA/EIA color codes)
  const fiberColors = [
    { name: 'Blue', hex: '#2563eb' },
    { name: 'Orange', hex: '#ea580c' },
    { name: 'Green', hex: '#16a34a' },
    { name: 'Brown', hex: '#854d0e' },
    { name: 'Slate', hex: '#64748b' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#dc2626' },
    { name: 'Black', hex: '#000000' },
    { name: 'Yellow', hex: '#ca8a04' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Rose', hex: '#db2777' },
    { name: 'Aqua', hex: '#0d9488' }
  ]

  const getFiberColor = (num: number) => {
    const idx = (num - 1) % fiberColors.length
    return fiberColors[idx]
  }

  // 1. Initial Google Maps API Loader (safe for SSR)
  useEffect(() => {
    if (typeof window === 'undefined') return

    setOptions({
      key: googleMapsApiKey || '',
      v: 'weekly'
    })

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker')
    ])
      .then(() => {
        setGoogleLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err)
        setErrorMessage('Google Maps API key is missing or invalid. Check credentials on Vercel.')
      })
  }, [googleMapsApiKey])

  // 2. Initialize Google Map instance
  useEffect(() => {
    if (!googleLoaded || !mapRef.current || map) return

    try {
      const gMap = new google.maps.Map(mapRef.current, {
        center: { lat: defaultLatitude || 33.7490, lng: defaultLongitude || -84.3880 },
        zoom: defaultZoom || 15,
        mapTypeId: 'hybrid',
        tilt: 0,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] }
        ]
      })

      // Clicking the map in node creation mode
      gMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()

        setTempRoutePoints(prev => {
          if (prev.length > 0 && prev[prev.length - 1].lat === lat && prev[prev.length - 1].lng === lng) {
            return prev
          }
          return [...prev, { lat, lng }]
        })
      })

      setMap(gMap)
    } catch (err) {
      console.error('Error creating map canvas:', err)
    }
  }, [googleLoaded, defaultLatitude, defaultLongitude, defaultZoom, map])

  // 3. Clear/Redraw markers and routes when database data updates
  useEffect(() => {
    if (!map || !googleLoaded) return

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Clear old polylines
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    const getStatusColor = (status: string) => {
      const s = status ? status.toLowerCase() : ''
      if (s === 'planned') return '#eab308'      // Yellow
      if (s === 'pulled' || s === 'in progress' || s === 'needs survey' || s === 'needs retest' || s === 'splicing pending' || s === 'testing pending' || s === 'fiber pulled') return '#3b82f6' // Blue
      if (s === 'installed' || s === 'complete' || s === 'passed' || s === 'tested' || s === 'spliced' || s === 'connected') return '#10b981'  // Green
      if (s === 'blocked' || s === 'failed' || s === 'damaged' || s === 'removed') return '#ef4444' // Red
      return '#64748b' // Gray (Existing, Unknown)
    }

    const getRouteColor = (route: any) => {
      const cable = initialData.cables.find(c => c.route_id === route.id)
      if (!cable) return '#eab308' // Planned (Yellow)
      if (cable.test_status === 'Passed') return '#10b981' // Green
      if (cable.install_status === 'Installed') return '#10b981' // Green
      if (cable.install_status === 'Pulled') return '#3b82f6' // Blue
      if (cable.install_status === 'Blocked' || cable.install_status === 'Damaged') return '#ef4444' // Red
      return '#eab308' // Planned (Yellow)
    }

    let infoWindow = (window as any)._mapInfoWindow
    if (!infoWindow && typeof google !== 'undefined') {
      infoWindow = new google.maps.InfoWindow();
      (window as any)._mapInfoWindow = infoWindow
    }

    // Draw Routes (conduits)
    initialData.routes.forEach(route => {
      // Find segments matching this route
      const routeSegs = initialData.segments.filter(s => s.route_id === route.id)
      const points: google.maps.LatLngLiteral[] = []

      routeSegs.forEach(seg => {
        points.push({ lat: seg.start_latitude, lng: seg.start_longitude })
        points.push({ lat: seg.end_latitude, lng: seg.end_longitude })
      })

      if (points.length === 0) return

      const strokeCol = getRouteColor(route)

      // Draw Polyline path
      const poly = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: strokeCol,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      })

      // Highlight selected route
      if (selectedRoute && selectedRoute.id === route.id) {
        poly.setOptions({ strokeColor: '#38bdf8', strokeWeight: 6 })
      }

      poly.addListener('click', () => {
        setSelectedRoute(route)
        setSelectedNode(null)
        setActiveTab('properties')
      })

      poly.addListener('mouseover', (e: google.maps.PolyMouseEvent) => {
        const cable = initialData.cables.find(c => c.route_id === route.id)
        const fromNode = initialData.nodes.find(n => n.id === cable?.from_node_id)
        const toNode = initialData.nodes.find(n => n.id === cable?.to_node_id)

        const contentString = `
          <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-b: 1px solid #e2e8f0; padding-bottom: 2px;">
              Route: ${route.route_id_tag}
            </div>
            <div><strong>Measured Length:</strong> ${route.measured_length_feet} ft</div>
            <div><strong>Installed Length:</strong> ${route.installed_length_feet} ft</div>
            <div><strong>Type:</strong> ${route.installation_type}</div>
            <div><strong>Conduit Size:</strong> ${route.conduit_diameter_inches} in</div>
            <div><strong>Fill:</strong> ${route.fill_percentage}%</div>
            ${cable ? `
              <div style="margin-top: 6px; border-t: 1px dashed #cbd5e1; padding-top: 4px;">
                <strong>Cable:</strong> ${cable.cable_tag} (${cable.fiber_count}F)<br/>
                <strong>Install Status:</strong> ${cable.install_status}<br/>
                <strong>Test Status:</strong> ${cable.test_status}<br/>
                <strong>From:</strong> ${fromNode ? fromNode.node_tag : 'Start'}<br/>
                <strong>To:</strong> ${toNode ? toNode.node_tag : 'End'}
              </div>
            ` : '<div><em>No Cable Installed</em></div>'}
          </div>
        `

        if (infoWindow && e.latLng) {
          infoWindow.setContent(contentString)
          infoWindow.setPosition(e.latLng)
          infoWindow.open(map)
        }
      })

      poly.addListener('mouseout', () => {
        if (infoWindow) infoWindow.close()
      })

      polylinesRef.current.push(poly)
    })

    // Draw Nodes (markers)
    initialData.nodes.forEach(node => {
      const statusColor = getStatusColor(node.status)
      let svgShape = `<circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>`
      
      const typeLower = node.node_type ? node.node_type.toLowerCase() : ''
      if (typeLower === 'cabinet') {
        svgShape = `<rect x="3" y="3" width="18" height="18" rx="2" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>`
      } else if (typeLower === 'pole') {
        svgShape = `<polygon points="12,2 22,20 2,20" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>`
      } else if (typeLower === 'building' || typeLower === 'existing fiber source') {
        svgShape = `<polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>`
      }

      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          ${svgShape}
          <text x="12" y="15" fill="#ffffff" font-size="8" font-family="sans-serif" font-weight="bold" text-anchor="middle">
            ${node.node_tag.substring(0, 3)}
          </text>
        </svg>
      `

      const marker = new google.maps.Marker({
        position: { lat: node.latitude, lng: node.longitude },
        map: map,
        draggable: true,
        title: `${node.node_tag} (${node.node_type.toUpperCase()})`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
          scaledSize: new google.maps.Size(26, 26),
          anchor: new google.maps.Point(13, 13)
        }
      })

      // Click to select node
      marker.addListener('click', () => {
        setSelectedNode(node)
        setSelectedRoute(null)
        setActiveTab('properties')

        // Initialize form states
        setNodeIdTag(node.node_tag)
        setNodeSize(node.size_description || '24x36x36')
        setNodeElevation(Number(node.elevation_ft || 0))
        setNodeSlack(Number(node.slack_loop_ft || 0))
        setNodeNotes(node.notes || '')

        const enclosure = initialData.enclosures.find((e: any) => e.node_id === node.id)
        if (enclosure) {
          setNodeClosureType(enclosure.enclosure_type)
          setNodeCapacity(enclosure.capacity || 12)
        }
      })

      // Hover card for node
      marker.addListener('mouseover', () => {
        const nodeEnclosures = initialData.enclosures.filter((e: any) => e.node_id === node.id)
        const nodeCables = initialData.cables.filter((c: any) => c.from_node_id === node.id || c.to_node_id === node.id)
        const servedAssignments = initialData.assignments.filter((a: any) => a.source_node_id === node.id)
        
        const servedCamTags = servedAssignments.map((a: any) => {
          const cam = initialData.cameras.find((c: any) => c.id === a.camera_id)
          return cam ? cam.camera_id_tag : 'Unknown'
        }).join(', ')

        const contentString = `
          <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-b: 1px solid #e2e8f0; padding-bottom: 2px;">
              ${node.node_tag}
            </div>
            <div><strong>Type:</strong> ${node.node_type}</div>
            <div><strong>Status:</strong> <span style="color: ${getStatusColor(node.status)}; font-weight: bold;">${node.status}</span></div>
            <div><strong>Cables:</strong> ${nodeCables.length > 0 ? nodeCables.map((c: any) => c.cable_tag).join(', ') : 'None'}</div>
            <div><strong>Enclosures:</strong> ${nodeEnclosures.length}</div>
            <div><strong>Served Cameras:</strong> ${servedCamTags || 'None'}</div>
          </div>
        `
        
        if (infoWindow) {
          infoWindow.setContent(contentString)
          infoWindow.open(map, marker)
        }
      })

      marker.addListener('mouseout', () => {
        if (infoWindow) infoWindow.close()
      })

      // Drag node coordinates persist
      marker.addListener('dragend', async () => {
        const pos = marker.getPosition()
        if (!pos) return

        try {
          const supabase = await createClient()
          const { error } = await supabase
            .from('fiber_nodes')
            .update({
              latitude: pos.lat(),
              longitude: pos.lng()
            })
            .eq('id', node.id)

          if (error) {
            showNotification('error', `Failed to move node: ${error.message}`)
          } else {
            showNotification('success', `Moved node ${node.node_tag}`)
            window.location.reload()
          }
        } catch (err) {
          console.error(err)
        }
      })

      markersRef.current.push(marker)
    })

    // Draw Cabinets
    if (initialData.cabinets) {
      initialData.cabinets.forEach((cab: any) => {
        const position = { lat: cab.latitude, lng: cab.longitude }

        const hostedSwitches = (initialData.networkDevices || []).filter((d: any) => d.cabinet_id === cab.id)
        const hostedFdus = (initialData.fdus || []).filter((f: any) => f.cabinet_id === cab.id)
        const hostedFpps = (initialData.fpps || []).filter((f: any) => f.cabinet_id === cab.id)
        
        const fduIds = hostedFdus.map((f: any) => f.id)
        const fppIds = hostedFpps.map((f: any) => f.id)
        const hostedPatchCords = (initialData.patchCords || []).filter((pc: any) => 
          (pc.from_fdu_id && fduIds.includes(pc.from_fdu_id)) ||
          (pc.from_fpp_id && fppIds.includes(pc.from_fpp_id)) ||
          (pc.to_fpp_id && fppIds.includes(pc.to_fpp_id))
        )

        const switchNames = hostedSwitches.map((s: any) => s.name).join(', ') || 'None'
        const fduTags = hostedFdus.map((f: any) => f.fdu_tag).join(', ') || 'None'
        const fppTags = hostedFpps.map((f: any) => f.fpp_tag).join(', ') || 'None'
        const patchCordCount = hostedPatchCords.length

        const tooltipContent = `
          <div style="padding: 10px; color: #0f172a; font-family: sans-serif; font-size: 11px; line-height: 1.5; min-width: 180px;">
            <strong style="color: #4f46e5; font-size: 12px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              Cabinet: ${cab.cabinet_tag}
            </strong>
            <div style="margin-bottom: 3px;"><strong>Type:</strong> ${cab.cabinet_type}</div>
            <div style="margin-bottom: 5px;"><strong>Status:</strong> ${cab.status}</div>
            <div style="margin-top: 5px; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
              <strong>Switches:</strong> ${switchNames}<br/>
              <strong>FDUs:</strong> ${fduTags}<br/>
              <strong>FPPs:</strong> ${fppTags}<br/>
              <strong>Patch Cords:</strong> ${patchCordCount} active
            </div>
            ${cab.notes ? `<div style="margin-top: 5px; font-style: italic; color: #64748b;">${cab.notes}</div>` : ''}
          </div>
        `

        const svgPin = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="3" fill="#64748b" stroke="#ffffff" stroke-width="2"/>
            <rect x="6" y="6" width="12" height="12" rx="1" fill="#1e293b"/>
          </svg>
        `

        const marker = new google.maps.Marker({
          position,
          map: map,
          draggable: false,
          title: cab.cabinet_tag,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
            scaledSize: new google.maps.Size(20, 20),
            anchor: new google.maps.Point(10, 10)
          }
        })

        marker.addListener('mouseover', () => {
          if (infoWindow) {
            infoWindow.setContent(tooltipContent)
            infoWindow.open(map, marker)
          }
        })

        marker.addListener('mouseout', () => {
          if (infoWindow) infoWindow.close()
        })

        markersRef.current.push(marker)
      })
    }

    // Draw Drop Cables
    initialData.assignments.forEach(assignment => {
      if (!assignment.source_node_id || !assignment.camera_id) return

      const sourceNode = initialData.nodes.find(n => n.id === assignment.source_node_id)
      const camera = initialData.cameras.find(c => c.id === assignment.camera_id)

      if (sourceNode && camera) {
        const dropLineSymbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.8,
          scale: 2
        }

        const poly = new google.maps.Polyline({
          path: [
            { lat: sourceNode.latitude, lng: sourceNode.longitude },
            { lat: camera.latitude, lng: camera.longitude }
          ],
          geodesic: true,
          strokeColor: getStatusColor(assignment.fiber_path_status),
          strokeOpacity: 0,
          icons: [{
            icon: dropLineSymbol,
            offset: '0',
            repeat: '10px'
          }],
          map: map
        })

        // Hover tooltip for drop cable
        poly.addListener('mouseover', (e: google.maps.PolyMouseEvent) => {
          const cable = initialData.cables.find(c => c.id === assignment.drop_cable_id)
          const contentString = `
            <div style="padding: 8px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-b: 1px solid #e2e8f0; padding-bottom: 2px;">
                Camera Drop: ${camera.camera_id_tag}
              </div>
              <div><strong>Path Status:</strong> <span style="color: ${getStatusColor(assignment.fiber_path_status)}; font-weight: bold;">${assignment.fiber_path_status}</span></div>
              <div><strong>Splice Status:</strong> ${assignment.splice_status}</div>
              <div><strong>Test Status:</strong> ${assignment.test_status}</div>
              ${cable ? `
                <div style="margin-top: 4px; border-t: 1px dashed #cbd5e1; padding-top: 4px;">
                  <strong>Cable Tag:</strong> ${cable.cable_tag}<br/>
                  <strong>Length:</strong> ${cable.length_ft} ft
                </div>
              ` : ''}
            </div>
          `
          if (infoWindow && e.latLng) {
            infoWindow.setContent(contentString)
            infoWindow.setPosition(e.latLng)
            infoWindow.open(map)
          }
        })

        poly.addListener('mouseout', () => {
          if (infoWindow) infoWindow.close()
        })

        polylinesRef.current.push(poly)
      }
    })
  }, [map, googleLoaded, initialData, selectedRoute])

  // 4. Temporary Polyline drawing synchronization
  useEffect(() => {
    if (!map || !googleLoaded) return

    if (tempPolyline) {
      tempPolyline.setMap(null)
    }

    if (tempRoutePoints.length > 1) {
      const poly = new google.maps.Polyline({
        path: tempRoutePoints,
        strokeColor: '#f43f5e',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map: map
      })
      setTempPolyline(poly)
    } else {
      setTempPolyline(null)
    }
  }, [tempRoutePoints, map, googleLoaded])

  // Helper notification handler
  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotifyMessage({ type, text })
    setTimeout(() => {
      setNotifyMessage(null)
    }, 4000)
  }

  // Handle map click events based on active mode
  const handleMapCanvasClick = async (lat: number, lng: number) => {
    if (toolMode === 'select' || toolMode === 'draw_route') return

    // Auto calculate tag names
    const typeLabel = 
      toolMode === 'Manhole' ? 'MH'
      : toolMode === 'Handhole' ? 'HH'
      : toolMode === 'Pull Box' ? 'PB'
      : toolMode === 'Cabinet' ? 'CAB'
      : toolMode === 'Pole' ? 'POL'
      : toolMode === 'Building' ? 'BLDG'
      : toolMode === 'Existing Fiber Source' ? 'EXT'
      : toolMode === 'Camera Location' ? 'CAM'
      : 'NODE'

    const matchCount = initialData.nodes.filter((n: any) => n.node_type === toolMode).length + 1
    const tag = `${typeLabel}-${String(matchCount).padStart(3, '0')}`

    const defaultSlack =
      toolMode === 'Handhole' || toolMode === 'Cabinet' ? 20.0
      : toolMode === 'Building' ? 10.0
      : 0.0

    const defaultSize =
      toolMode === 'Handhole' ? '24x36x36'
      : toolMode === 'Manhole' ? '48x48x48'
      : toolMode === 'Pull Box' ? '12x12x6'
      : toolMode === 'Cabinet' ? 'Outdoor NEMA'
      : 'Standard'

    const res = await createFiberNode({
      projectId,
      nodeTag: tag,
      nodeType: toolMode,
      latitude: lat,
      longitude: lng,
      elevationFt: 0.0,
      sizeDescription: defaultSize,
      slackLoopFt: defaultSlack,
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Created OSP Node ${tag}`)
      setToolMode('select')
      window.location.reload()
    }
  }

  // Execute drawing route polyline completion
  const handleFinishRoute = async () => {
    if (tempRoutePoints.length < 2) {
      showNotification('error', 'Draw at least 2 points to create a route.')
      return
    }

    const routeCount = initialData.routes.length + 1
    const tag = `R-${String(routeCount).padStart(3, '0')}`

    // Construct segment lines
    const segments: any[] = []
    for (let i = 0; i < tempRoutePoints.length - 1; i++) {
      segments.push({
        startLat: tempRoutePoints[i].lat,
        startLng: tempRoutePoints[i].lng,
        endLat: tempRoutePoints[i + 1].lat,
        endLng: tempRoutePoints[i + 1].lng,
        slackFeet: 0.0
      })
    }

    const res = await createFiberRoute({
      projectId,
      routeIdTag: tag,
      conduitDiameterInches: conduitDiameter,
      slackPercentage: routeSlackPercentage,
      installationType: installationType,
      segments,
      cableCatalogId: selectedCatalogCableId || undefined,
      fiberCount: routeFiberCount
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Installed Conduit & Fiber route ${tag}`)
      setTempRoutePoints([])
      setToolMode('select')
      window.location.reload()
    }
  }

  // Delete node handler
  const handleDeleteNode = async (id: string, tag: string) => {
    if (!confirm(`Are you sure you want to delete ${tag}? This will cascade delete its automatic BOM parts.`)) return

    const res = await deleteFiberNode({ id, projectId })
    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Deleted node ${tag}`)
      setSelectedNode(null)
      window.location.reload()
    }
  }

  // Delete route handler
  const handleDeleteRoute = async (id: string, tag: string) => {
    if (!confirm(`Are you sure you want to delete Route ${tag}? This will cascade delete its installed cables and BOM quantities.`)) return

    const res = await deleteRoute({ id })
    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Deleted route ${tag}`)
      setSelectedRoute(null)
      window.location.reload()
    }
  }

  async function deleteRoute(params: { id: string }) {
    return await deleteFiberRoute({ id: params.id, projectId })
  }

  // Node details save handler
  const handleSaveNodeDetails = async () => {
    if (!selectedNode) return

    try {
      const supabase = await createClient()
      
      // Update fiber_nodes
      const { error: nodeErr } = await supabase
        .from('fiber_nodes')
        .update({
          node_tag: nodeIdTag,
          size_description: nodeSize,
          elevation_ft: nodeElevation,
          slack_loop_ft: nodeSlack,
          notes: nodeNotes
        })
        .eq('id', selectedNode.id)

      if (nodeErr) {
        showNotification('error', `Failed to update node: ${nodeErr.message}`)
        return
      }

      // If splice enclosure, update enclosures table
      if (selectedNode.node_type === 'Splice Enclosure' || selectedNode.node_type === 'Cabinet') {
        const { error: encErr } = await supabase
          .from('fiber_enclosures')
          .update({
            enclosure_type: nodeClosureType,
            capacity: nodeCapacity,
          })
          .eq('node_id', selectedNode.id)

        if (encErr) {
          showNotification('error', `Failed to update enclosure details: ${encErr.message}`)
          return
        }
      }

      showNotification('success', 'Node specifications saved!')
      window.location.reload()
    } catch (err) {
      console.error(err)
    }
  }

  // Splice matrix load/save handlers
  const handleLoadSpliceConfig = () => {
    if (!selectedNode || !spliceCableA || !spliceCableB) return

    const nodeSplices = initialData.splices.filter(
      s => s.node_id === selectedNode.id && s.cable_a_id === spliceCableA && s.cable_b_id === spliceCableB
    )

    const config: { [fiberNumA: number]: number } = {}
    nodeSplices.forEach(s => {
      config[s.fiber_number_a] = s.fiber_number_b
    })

    setSpliceConfig(config)
  }

  // Triggers splice configuration load on dropdown change
  useEffect(() => {
    handleLoadSpliceConfig()
  }, [spliceCableA, spliceCableB])

  const handleSaveSplices = async () => {
    if (!selectedNode || !spliceCableA || !spliceCableB) return

    try {
      let enclosure = initialData.enclosures.find((e: any) => e.node_id === selectedNode.id)
      if (!enclosure) {
        const tag = `ENC-${selectedNode.node_tag}`
        const res = await createFiberEnclosure({
          projectId,
          enclosureTag: tag,
          nodeId: selectedNode.id,
          enclosureType: 'Splice Enclosure',
          capacity: 24
        })
        if (res.error) {
          showNotification('error', `Failed to create enclosure: ${res.error}`)
          return
        }
        enclosure = res.data
      }

      // First, clear existing splices between these two cables in this enclosure
      const clearRes = await clearSplicesForCables({
        projectId,
        enclosureId: enclosure.id,
        cableIdA: spliceCableA,
        cableIdB: spliceCableB
      })
      if (clearRes.error) {
        showNotification('error', `Failed to clear old splices: ${clearRes.error}`)
        return
      }

      // Now create new splice records from spliceConfig
      let successCount = 0
      for (const coreNumStr of Object.keys(spliceConfig)) {
        const coreNumA = parseInt(coreNumStr, 10)
        const coreNumB = spliceConfig[coreNumA]

        if (!coreNumB) continue // open/unused

        // Find matching strands
        const strandA = initialData.strands.find((s: any) => s.cable_id === spliceCableA && s.strand_number === coreNumA)
        const strandB = initialData.strands.find((s: any) => s.cable_id === spliceCableB && s.strand_number === coreNumB)

        if (strandA && strandB) {
          const res = await createSpliceRecord({
            projectId,
            enclosureId: enclosure.id,
            fromCableId: spliceCableA,
            fromStrandId: strandA.id,
            toCableId: spliceCableB,
            toStrandId: strandB.id
          })
          if (res.error) {
            console.error(`Splice error for Core ${coreNumA} -> ${coreNumB}:`, res.error)
          } else {
            successCount++
          }
        }
      }

      showNotification('success', `Applied ${successCount} splices inside ${enclosure.enclosure_tag}`)
      window.location.reload()
    } catch (err) {
      console.error(err)
      showNotification('error', 'An unexpected error occurred while saving splices.')
    }
  }

  // Camera fiber patching handler
  const handleAssignCameraFiber = async () => {
    if (!selectedCameraId || !selectedAssignCableId) {
      showNotification('error', 'Choose both camera and fiber cable.')
      return
    }

    if (!selectedNode) {
      showNotification('error', 'Select a node on the map first.')
      return
    }

    const res = await updateCameraFiberAssignment({
      cameraId: selectedCameraId,
      projectId,
      sourceNodeId: selectedNode.id,
      enclosureId: selectedNode.id,
      backboneCableId: selectedAssignCableId,
      fiberPathStatus: 'Planned'
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Camera fiber assignment updated`)
      window.location.reload()
    }
  }

  const handleRemoveCameraFiber = async (camId: string, _linkRole: string) => {
    if (!confirm('Are you sure you want to remove this camera fiber assignment?')) return

    const res = await updateCameraFiberAssignment({
      cameraId: camId,
      projectId,
      fiberPathStatus: 'Planned',
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', 'Fiber assignment cleared.')
      window.location.reload()
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full font-sans relative">
      
      {/* Alert notifications banner */}
      {notifyMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl border text-xs font-bold z-50 shadow-xl backdrop-blur-md transition-all flex items-center gap-2 ${
          notifyMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-450 border-emerald-500/20' 
            : 'bg-rose-950/90 text-rose-450 border-rose-500/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${notifyMessage.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {notifyMessage.text}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden h-full">
        
        {/* Left Side: OSP Google Map Editor */}
        <div className="flex-1 relative h-full flex flex-col min-w-0">
          
          {/* Map Toolbar Overlay */}
          <div className="absolute top-3 left-3 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl flex items-center gap-1.5 font-sans">
            <button
              onClick={() => { setToolMode('select'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'select' ? 'bg-indigo-600 text-white shadow-inner shadow-indigo-950/20' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Select
            </button>
            <div className="w-px h-4 bg-slate-800" />
            
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-850 p-0.5 rounded-lg">
              <select
                id="toolbar-node-type-select"
                defaultValue="Handhole"
                onChange={(e) => {
                  const newMode = e.target.value as any
                  setToolMode(newMode)
                  setTempRoutePoints([])
                }}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wide px-1.5 py-1 text-slate-350 focus:outline-none"
              >
                <option value="Manhole" className="bg-slate-900">Manhole</option>
                <option value="Handhole" className="bg-slate-900">Handhole</option>
                <option value="Pull Box" className="bg-slate-900">Pull Box</option>
                <option value="Cabinet" className="bg-slate-900">Cabinet</option>
                <option value="Pole" className="bg-slate-900">Pole</option>
                <option value="Building" className="bg-slate-900">Building</option>
                <option value="Existing Fiber Source" className="bg-slate-900">Existing Fiber Source</option>
                <option value="Camera Location" className="bg-slate-900">Camera Location</option>
                <option value="Custom" className="bg-slate-900">Custom</option>
              </select>
              <button
                onClick={() => {
                  const selectEl = document.getElementById('toolbar-node-type-select') as HTMLSelectElement
                  const val = selectEl ? (selectEl.value as any) : 'Handhole'
                  setToolMode(val)
                  setTempRoutePoints([])
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                  toolMode !== 'select' && toolMode !== 'draw_route' ? 'bg-emerald-600 text-white shadow shadow-emerald-800' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                + Place Node
              </button>
            </div>

            <div className="w-px h-4 bg-slate-800" />
            <button
              onClick={() => { setToolMode('draw_route'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'draw_route' ? 'bg-rose-600 text-white' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Draw Route
            </button>

            {/* Route draw active buttons */}
            {toolMode === 'draw_route' && tempRoutePoints.length > 1 && (
              <>
                <button
                  onClick={handleFinishRoute}
                  className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-lg text-[10px] font-bold uppercase"
                >
                  Finish Route
                </button>
                <button
                  onClick={() => setTempRoutePoints([])}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg text-[10px] font-bold uppercase"
                >
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Map canvas container */}
          <div className="w-full h-full min-h-0 bg-slate-950 flex-1 relative">
            {errorMessage ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-rose-450 bg-rose-950/10 font-mono text-xs max-w-md mx-auto relative z-10 border border-dashed border-rose-900/30 rounded-2xl my-auto">
                <svg className="mb-2 shrink-0 animate-bounce" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errorMessage}
              </div>
            ) : (
              <div 
                ref={mapRef} 
                className={`w-full h-full flex-1 ${toolMode !== 'select' ? 'cursor-crosshair' : ''}`}
                onClick={() => {
                  // Fallback map click if google click listener fails
                }}
              />
            )}
          </div>
        </div>

        {/* Right Side: Tabbed Config Drawer */}
        <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 h-full overflow-hidden z-10 font-sans">
          
          {/* Navigation tab bar */}
          <div className="flex border-b border-slate-850 shrink-0">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-3 text-center text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'properties' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Props
            </button>
            <button
              onClick={() => setActiveTab('splice')}
              className={`flex-1 py-3 text-center text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'splice' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
              disabled={!selectedNode || (selectedNode.node_type !== 'Splice Enclosure' && selectedNode.node_type !== 'Cabinet' && selectedNode.node_type !== 'Handhole')}
              title={(!selectedNode || (selectedNode.node_type !== 'Splice Enclosure' && selectedNode.node_type !== 'Cabinet' && selectedNode.node_type !== 'Handhole')) ? 'Select a Splice Enclosure on the map first' : ''}
            >
              Splice
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`flex-1 py-3 text-center text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'cameras' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Cameras
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 py-3 text-center text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'lists' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-3 text-center text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'catalog' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Catalog
            </button>
          </div>

          {/* Scrollable Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            
            {/* TABS 1: Properties Drawer */}
            {activeTab === 'properties' && (
              <div className="space-y-4">
                
                {/* 1. Default (No selection) - Fiber Dashboard */}
                {!selectedNode && !selectedRoute && (
                  <div className="space-y-4 font-sans">
                    <div className="border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">OSP Fiber Dashboard</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Real-time status of the 35-camera fiber rollout</p>
                    </div>

                    {/* Calculated stats variables */}
                    {(() => {
                      const totalCams = initialData.cameras.length
                      const fiberCams = initialData.cameras.filter(c => c.communication_type === 'fiber').length
                      const ethCams = totalCams - fiberCams
                      const assignedCams = initialData.assignments.length
                      const dropsPlanned = initialData.assignments.filter(a => a.fiber_path_status === 'Planned').length
                      const dropsPulled = initialData.assignments.filter(a => a.fiber_path_status !== 'Planned' && a.fiber_path_status !== 'Blocked').length
                      const splicesPending = initialData.assignments.filter(a => a.splice_status === 'Not Spliced' || a.splice_status === 'Failed' || a.splice_status === 'Needs Rework').length
                      const splicesComplete = initialData.assignments.filter(a => a.splice_status === 'Spliced').length
                      const testsPending = initialData.assignments.filter(a => a.test_status === 'Not Tested' || a.test_status === 'Needs Retest').length
                      const testsPassed = initialData.assignments.filter(a => a.test_status === 'Passed').length
                      const blockedPaths = initialData.assignments.filter(a => a.fiber_path_status === 'Blocked').length

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total Cameras</div>
                              <div className="text-xl font-bold text-white mt-0.5">{totalCams}</div>
                              <div className="text-[9px] text-slate-450 mt-1">{fiberCams} Fiber • {ethCams} Ethernet</div>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Fiber Paths</div>
                              <div className="text-xl font-bold text-indigo-400 mt-0.5">{assignedCams}</div>
                              <div className="text-[9px] text-slate-450 mt-1 font-mono">
                                {fiberCams > 0 ? Math.round((assignedCams / fiberCams) * 100) : 0}% Assigned
                              </div>
                            </div>
                          </div>

                          {/* Progress bars / Rollout Status */}
                          <div className="bg-slate-950/20 border border-slate-850 p-3 rounded-xl space-y-3.5">
                            <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider border-b border-slate-850 pb-1.5">Rollout Execution</h5>
                            
                            {/* Pulling Drop Cables */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">Fiber Drops Pulled</span>
                                <span className="font-mono text-white font-bold">{dropsPulled} / {assignedCams}</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${assignedCams > 0 ? (dropsPulled / assignedCams) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Splicing */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">Strands Spliced</span>
                                <span className="font-mono text-white font-bold">{splicesComplete} / {assignedCams}</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${assignedCams > 0 ? (splicesComplete / assignedCams) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Testing */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">OTDR Tests Passed</span>
                                <span className="font-mono text-white font-bold">{testsPassed} / {assignedCams}</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${assignedCams > 0 ? (testsPassed / assignedCams) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Detailed Statistics list */}
                          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-2 text-[11px]">
                            <div className="flex justify-between text-slate-400">
                              <span>Planned Drops (Not Pulled):</span>
                              <span className="font-bold text-yellow-500">{dropsPlanned}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Splicing Pending:</span>
                              <span className="font-bold text-blue-400">{splicesPending}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>OTDR Retests Required:</span>
                              <span className="font-bold text-amber-500">
                                {initialData.assignments.filter(a => a.test_status === 'Needs Retest').length}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Blocked Fiber Paths:</span>
                              <span className="font-bold text-red-500">{blockedPaths}</span>
                            </div>
                          </div>

                          <div className="text-center p-3 border border-indigo-500/10 bg-indigo-950/20 rounded-xl">
                            <p className="text-[10px] text-indigo-300 leading-normal">
                              Select any <strong>Fiber Node</strong> marker or <strong>Conduit Route</strong> on the map to configure splices, enclosures, physical specs, and camera loops.
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* 2. Fiber Node specifications */}
                {selectedNode && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-2 flex justify-between items-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-950/40 text-indigo-400 border border-indigo-500/10">
                        {selectedNode.node_type.replace('_', ' ')}
                      </span>
                      <button 
                        onClick={() => handleDeleteNode(selectedNode.id, selectedNode.node_tag)}
                        className="text-[10px] text-rose-450 hover:underline font-bold"
                      >
                        Delete Node
                      </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Node Tag/ID</label>
                        <input
                          type="text"
                          value={nodeIdTag}
                          onChange={e => setNodeIdTag(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Dimensions (Size)</label>
                        <input
                          type="text"
                          value={nodeSize}
                          onChange={e => setNodeSize(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Elevation (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={nodeElevation}
                            onChange={e => setNodeElevation(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Slack Loop (ft)</label>
                          <input
                            type="number"
                            value={nodeSlack}
                            onChange={e => setNodeSlack(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Enclosure detail parameters */}
                      {selectedNode.node_type === 'splice_enclosure' && (
                        <>
                          <div className="border-t border-slate-850 pt-3.5 space-y-3.5">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Closure Type</label>
                              <select
                                value={nodeClosureType}
                                onChange={e => setNodeClosureType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="Dome Closure">Dome Closure</option>
                                <option value="Inline Closure">Inline Closure</option>
                                <option value="Patch Panel">Patch Panel</option>
                                <option value="ODF">ODF</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Port Capacity (Cores)</label>
                              <input
                                type="number"
                                value={nodeCapacity}
                                onChange={e => setNodeCapacity(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Notes</label>
                        <textarea
                          rows={3}
                          value={nodeNotes}
                          onChange={e => setNodeNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-[11px] focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleSaveNodeDetails}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                      >
                        Save Specifications
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Fiber Route Conduit pathway details */}
                {selectedRoute && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-2 flex justify-between items-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-950/40 text-rose-400 border border-rose-500/10">
                        Pathway Route
                      </span>
                      <button 
                        onClick={() => handleDeleteRoute(selectedRoute.id, selectedRoute.route_id_tag)}
                        className="text-[10px] text-rose-450 hover:underline font-bold"
                      >
                        Delete Route
                      </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Measured Path</span>
                          <span className="text-sm font-black text-white font-mono">{selectedRoute.measured_length_feet} ft</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Installed Length</span>
                          <span className="text-sm font-black text-white font-mono">{selectedRoute.installed_length_feet} ft</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Conduit Size</span>
                          <span className="text-sm font-bold text-slate-200">{selectedRoute.conduit_diameter_inches}-inch</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px]">Fill Percentage</span>
                          <span className="text-sm font-bold text-slate-200">{selectedRoute.fill_percentage}%</span>
                        </div>
                      </div>

                      {/* Fill percentage warning alert */}
                      {Number(selectedRoute.fill_percentage) > 40.0 && (
                        <div className="bg-rose-950/20 border border-rose-900/40 text-rose-450 p-3 rounded-xl text-[10px] leading-normal flex gap-2">
                          <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <div>
                            <p className="font-bold">TIA/EIA Max Fill Exceeded</p>
                            <p className="text-slate-400 mt-0.5">Conduit fill exceeds the 40% standard capacity limit. Consider utilizing larger conduit diameters or higher fiber counts.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TABS 2: Splice Matrix Editor */}
            {activeTab === 'splice' && selectedNode && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Visual Splice Matrix</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Patch fiber cores inside {selectedNode.node_tag}</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Select cables */}
                  <div>
                    <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Cable A (Left)</label>
                    <select
                      value={spliceCableA}
                      onChange={e => setSpliceCableA(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                    >
                      <option value="">Select Cable...</option>
                      {initialData.cables.map(c => (
                        <option key={c.id} value={c.id}>{c.cable_id_tag} ({c.fiber_count} Cores)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Cable B (Right)</label>
                    <select
                      value={spliceCableB}
                      onChange={e => setSpliceCableB(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                    >
                      <option value="">Select Cable...</option>
                      {initialData.cables.map(c => (
                        <option key={c.id} value={c.id}>{c.cable_id_tag} ({c.fiber_count} Cores)</option>
                      ))}
                    </select>
                  </div>

                  {/* Splicing Core list */}
                  {spliceCableA && spliceCableB && (
                    <div className="border border-slate-850 rounded-xl p-3 bg-slate-950/40 space-y-3">
                      <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850 pb-1.5">
                        <span>Cable A Core</span>
                        <span>Cable B Core Target</span>
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Array.from({ length: initialData.cables.find(c => c.id === spliceCableA)?.fiber_count || 12 }).map((_, idx) => {
                          const coreNum = idx + 1
                          const col = getFiberColor(coreNum)
                          return (
                            <div key={coreNum} className="flex justify-between items-center gap-4 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: col.hex }} 
                                  title={col.name}
                                />
                                <span className="font-mono text-slate-300">Core {coreNum}</span>
                              </div>

                              <select
                                value={spliceConfig[coreNum] || ''}
                                onChange={e => {
                                  const val = e.target.value ? parseInt(e.target.value, 10) : 0
                                  setSpliceConfig(prev => ({
                                    ...prev,
                                    [coreNum]: val
                                  }))
                                }}
                                className="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-[10px] text-white focus:outline-none"
                              >
                                <option value="">Open / Unused</option>
                                {Array.from({ length: initialData.cables.find(c => c.id === spliceCableB)?.fiber_count || 12 }).map((_, bIdx) => (
                                  <option key={bIdx + 1} value={bIdx + 1}>Core {bIdx + 1}</option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>

                      <button
                        onClick={handleSaveSplices}
                        className="w-full py-2 bg-emerald-650 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all mt-2"
                      >
                        Apply Splicing Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABS 3: Camera Fiber Assignment Tab */}
            {activeTab === 'cameras' && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">CCTV Fiber Assignments</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Patch camera channels to OSP fiber transmission cores</p>
                </div>

                {/* Form to assign camera */}
                <div className="space-y-3.5 text-xs border border-slate-850 p-3.5 rounded-xl bg-slate-950/20">
                  <h5 className="font-bold text-white text-[10px] uppercase tracking-wide border-b border-slate-850 pb-1.5 mb-2">New Core Patch</h5>
                  
                  <div>
                    <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Target Camera</label>
                    <select
                      value={selectedCameraId}
                      onChange={e => setSelectedCameraId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                    >
                      <option value="">Select Camera...</option>
                      {initialData.cameras.map(cam => (
                        <option key={cam.id} value={cam.id}>{cam.camera_id_tag} ({cam.status})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Installed Fiber Cable</label>
                    <select
                      value={selectedAssignCableId}
                      onChange={e => setSelectedAssignCableId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                    >
                      <option value="">Select Cable...</option>
                      {initialData.cables.map(cab => (
                        <option key={cab.id} value={cab.id}>{cab.cable_id_tag} ({cab.fiber_count} Cores)</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">TX Core</label>
                      <input
                        type="number"
                        min="1"
                        value={assignTxCore}
                        onChange={e => setAssignTxCore(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">RX Core</label>
                      <input
                        type="number"
                        min="1"
                        value={assignRxCore}
                        onChange={e => setAssignRxCore(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 block font-semibold uppercase tracking-wide text-[9px] mb-1">Link Role (Redundancy)</label>
                    <select
                      value={assignLinkRole}
                      onChange={e => setAssignLinkRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                    >
                      <option value="primary">Primary Route Link</option>
                      <option value="backup">Backup Redundant Link</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAssignCameraFiber}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Patch Core Assignment
                  </button>
                </div>

                {/* Assignments List */}
                <div className="space-y-2 pt-2">
                  <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-wide">Active Patch Connections</h5>
                  {initialData.assignments.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No camera fiber patched yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {initialData.assignments.map(ass => {
                        const camera = initialData.cameras.find(c => c.id === ass.camera_id)
                        const cableId = ass.drop_cable_id || ass.backbone_cable_id
                        const cable = initialData.cables.find(c => c.id === cableId)
                        
                        const assignmentStrands = initialData.assignmentStrands || []
                        const txStrandJoin = assignmentStrands.find((js: any) => js.camera_fiber_assignment_id === ass.id && js.strand_role === 'TX')
                        const rxStrandJoin = assignmentStrands.find((js: any) => js.camera_fiber_assignment_id === ass.id && js.strand_role === 'RX')
                        const txStrand = txStrandJoin ? initialData.strands.find((s: any) => s.id === txStrandJoin.strand_id) : null
                        const rxStrand = rxStrandJoin ? initialData.strands.find((s: any) => s.id === rxStrandJoin.strand_id) : null
                        
                        return (
                          <div key={ass.id} className="border border-slate-850 bg-slate-950/40 p-2.5 rounded-xl flex items-center justify-between text-[10px] leading-relaxed">
                            <div>
                              <p className="font-bold text-white">
                                {camera?.camera_id_tag || 'Unknown'} 
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-indigo-950 text-indigo-400">
                                  Patched
                                </span>
                              </p>
                              <p className="text-slate-450 mt-0.5">
                                Cable: {cable?.cable_id_tag || 'CAB-N/A'} | Cores: TX-{txStrand ? txStrand.strand_number : 'N/A'} / RX-{rxStrand ? rxStrand.strand_number : 'N/A'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveCameraFiber(ass.camera_id, '')}
                              className="text-rose-450 hover:underline font-bold"
                            >
                              Unpatch
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABS 4: Cable Catalog List */}
            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fiber Cable Specifications</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Available cable configurations in OSP database catalog</p>
                </div>

                <div className="space-y-3">
                  {fiberCatalog.map(cab => (
                    <div key={cab.id} className="border border-slate-850 rounded-xl p-3 bg-slate-950/40 space-y-1.5 text-[11px] hover:border-indigo-500/20 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{cab.manufacturer} {cab.part_number}</span>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                          {cab.grade}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 text-slate-450 font-mono text-[10px]">
                        <div>Mode: {cab.mode}</div>
                        <div>Cores: {cab.fiber_count}</div>
                        <div>Weight: {cab.weight_kg_km} kg/km</div>
                        <div>Diameter: {cab.diameter_mm} mm</div>
                        <div className="col-span-2 text-indigo-400 font-bold mt-0.5">Cost: ${(Number(cab.cost_per_meter)/3.28084).toFixed(3)}/ft</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS 5: Directory & Infrastructure Lists */}
            {activeTab === 'lists' && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Infrastructure Directory</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quick lookup and navigation of project fiber assets</p>
                </div>

                <div className="space-y-4">
                  {/* Nodes Section */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Fiber Nodes ({initialData.nodes.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.nodes.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic">No nodes placed.</div>
                      ) : (
                        initialData.nodes.map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              setSelectedNode(n)
                              setSelectedRoute(null)
                              setActiveTab('properties')
                              if (map) {
                                map.setCenter({ lat: n.latitude, lng: n.longitude })
                                map.setZoom(17)
                              }
                              setNodeIdTag(n.node_tag)
                              setNodeSize(n.size_description || '24x36x36')
                              setNodeElevation(Number(n.elevation_ft || 0))
                              setNodeSlack(Number(n.slack_loop_ft || 0))
                              setNodeNotes(n.notes || '')
                              const enclosure = initialData.enclosures.find((e: any) => e.node_id === n.id)
                              if (enclosure) {
                                setNodeClosureType(enclosure.enclosure_type)
                                setNodeCapacity(enclosure.capacity || 12)
                              }
                            }}
                            className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors flex justify-between items-center text-[11px]"
                          >
                            <span className="font-bold text-white font-mono">{n.node_tag}</span>
                            <span className="text-slate-450 text-[10px]">{n.node_type}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cables Section */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Fiber Cables ({initialData.cables.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.cables.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic">No cables created.</div>
                      ) : (
                        initialData.cables.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              const route = initialData.routes.find((r: any) => r.id === c.route_id)
                              if (route) {
                                setSelectedRoute(route)
                                setSelectedNode(null)
                                setActiveTab('properties')
                                const segs = initialData.segments.filter((s: any) => s.route_id === route.id)
                                if (segs.length > 0 && map) {
                                  map.setCenter({ lat: segs[0].start_latitude, lng: segs[0].start_longitude })
                                  map.setZoom(16)
                                }
                              }
                            }}
                            className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors flex justify-between items-center text-[11px]"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-white font-mono">{c.cable_tag}</span>
                              <span className="text-[9px] text-slate-550">{c.cable_type} • {c.fiber_count} Cores • {c.length_ft} ft</span>
                            </div>
                            <span className="text-indigo-400 text-[10px] font-bold">{c.install_status}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Enclosures Section */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                      Enclosures ({initialData.enclosures.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.enclosures.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic">No enclosures.</div>
                      ) : (
                        initialData.enclosures.map(enc => {
                          const parentNode = initialData.nodes.find(n => n.id === enc.node_id)
                          return (
                            <button
                              key={enc.id}
                              onClick={() => {
                                if (parentNode) {
                                  setSelectedNode(parentNode)
                                  setSelectedRoute(null)
                                  setActiveTab('properties')
                                  if (map) {
                                    map.setCenter({ lat: parentNode.latitude, lng: parentNode.longitude })
                                    map.setZoom(17)
                                  }
                                }
                              }}
                              className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors flex justify-between items-center text-[11px]"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-white font-mono">{enc.enclosure_tag}</span>
                                <span className="text-[9px] text-slate-550">Node: {parentNode?.node_tag || 'Unknown'} • Splices: {enc.splice_count}</span>
                              </div>
                              <span className="text-emerald-400 text-[10px] font-bold">{enc.enclosure_type}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Assignments Section */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                      Camera Assignments ({initialData.assignments.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.assignments.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic">No assignments.</div>
                      ) : (
                        initialData.assignments.map(ass => {
                          const camera = initialData.cameras.find(c => c.id === ass.camera_id)
                          const node = initialData.nodes.find(n => n.id === ass.source_node_id)
                          return (
                            <button
                              key={ass.id}
                              onClick={() => {
                                if (camera && map) {
                                  map.setCenter({ lat: camera.latitude, lng: camera.longitude })
                                  map.setZoom(17)
                                }
                              }}
                              className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors flex justify-between items-center text-[11px]"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-white font-mono">{camera?.camera_id_tag || 'Unknown'}</span>
                                <span className="text-[9px] text-slate-550">Node: {node?.node_tag || 'None'}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-indigo-400 text-[10px] font-bold">{ass.fiber_path_status}</span>
                                <span className="text-[8px] text-slate-550">S: {ass.splice_status} | T: {ass.test_status}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>

    </div>
  )
}

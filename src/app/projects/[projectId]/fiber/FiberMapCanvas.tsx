'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/utils/supabase/client'
import { 
  createFiberNode, 
  deleteFiberNode, 
  createFiberRoute, 
  deleteFiberRoute, 
  updateFiberRoute,
  createSpliceRecord,
  updateCameraFiberAssignment,
  createFiberEnclosure,
  deleteSpliceRecord,
  clearSplicesForCables,
  createSpliceTray,
  getFiberDesignData,
  clearStrandAssignmentsForCamera,
  assignStrandToCamera,
  assignCameraFiberTechnicianMode,
  completeCameraFiberSplices
} from '../../actions-fiber'

const haversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getNodeCustomColor = (node: any) => {
  if (node && node.notes && node.notes.startsWith('[COLOR:')) {
    const match = node.notes.match(/^\[COLOR:([^\]]+)\]/)
    if (match) return match[1]
  }
  return ''
}

const getNodeActualNotes = (notes: string | null) => {
  if (!notes) return ''
  return notes.replace(/^\[COLOR:[^\]]+\]\s*/, '')
}

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
    bufferTubes?: any[]
    cablePassThroughs?: any[]
    spliceTrays?: any[]
    fiberAssignments?: any[]
    fiberAssignmentStrands?: any[]
  }
  fiberCatalog: any[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  googleMapsApiKey?: string
}

export default function FiberMapCanvas({
  projectId,
  initialData: propInitialData,
  fiberCatalog,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  googleMapsApiKey
}: FiberMapCanvasProps) {
  const router = useRouter()
  const [initialData, setInitialData] = useState(propInitialData)

  useEffect(() => {
    setInitialData(propInitialData)
  }, [propInitialData])

  const loadDesignData = async () => {
    try {
      const data = await getFiberDesignData(projectId)
      setInitialData(data)
      setSelectedNode((currNode: any) => {
        if (!currNode) return null
        return data.nodes.find((n: any) => n.id === currNode.id) || null
      })
      setSelectedRoute((currRoute: any) => {
        if (!currRoute) return null
        return data.routes.find((r: any) => r.id === currRoute.id) || null
      })
    } catch (err) {
      console.error('Failed to load fiber design data:', err)
    }
  }
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'roadmap' | 'satellite'>('hybrid')

  const handleLayerChange = (layer: 'hybrid' | 'roadmap' | 'satellite') => {
    setActiveLayer(layer)
    if (map) {
      map.setMapTypeId(layer)
    }
  }

  // Map drawing mode state
  // Modes: 'select' (default), 'Manhole', 'Handhole', 'Pull Box', 'Cabinet', 'Pole', 'Building', 'Existing Fiber Source', 'Camera Location', 'Custom', 'draw_route'
  const [toolMode, setToolMode] = useState<'select' | 'Manhole' | 'Handhole' | 'Pull Box' | 'Cabinet' | 'Pole' | 'Building' | 'Existing Fiber Source' | 'Camera Location' | 'Custom' | 'draw_route'>('select')
  const [tempRoutePoints, setTempRoutePoints] = useState<google.maps.LatLngLiteral[]>([])
  const [tempPolyline, setTempPolyline] = useState<google.maps.Polyline | null>(null)

  // Refs to avoid stale closures in map click listener
  const toolModeRef = useRef(toolMode)
  useEffect(() => {
    toolModeRef.current = toolMode
  }, [toolMode])

  const handleMapCanvasClickRef = useRef<any>(null)

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

  const [nodeColor, setNodeColor] = useState('')
  const [routeColor, setRouteColor] = useState('')
  const [routeNotes, setRouteNotes] = useState('')
  const [nodeLat, setNodeLat] = useState<number>(0)
  const [nodeLng, setNodeLng] = useState<number>(0)
  const [editedRoutePoints, setEditedRoutePoints] = useState<google.maps.LatLngLiteral[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  const getRouteCustomColor = (route: any) => {
    const cable = initialData.cables.find(c => c.route_id === route.id)
    if (cable && cable.notes && cable.notes.startsWith('[COLOR:')) {
      const match = cable.notes.match(/^\[COLOR:([^\]]+)\]/)
      if (match) return match[1]
    }
    return ''
  }

  const getRouteActualNotes = (notes: string | null) => {
    if (!notes) return ''
    return notes.replace(/^\[COLOR:[^\]]+\]\s*/, '')
  }

  // Splicing States
  const [spliceCableA, setSpliceCableA] = useState('')
  const [spliceCableB, setSpliceCableB] = useState('')
  const [spliceConfig, setSpliceConfig] = useState<{ [fiberNumA: number]: number }>({})

  // Splice Tray & Loss States
  const [selectedTrayId, setSelectedTrayId] = useState('')
  const [newTrayNumber, setNewTrayNumber] = useState(1)
  const [newTrayCapacity, setNewTrayCapacity] = useState(12)
  const [globalSpliceLoss, setGlobalSpliceLoss] = useState('0.020')
  const [globalSpliceType, setGlobalSpliceType] = useState<'Fusion' | 'Mechanical' | 'Pass Through'>('Fusion')
  const [spliceLosses, setSpliceLosses] = useState<{ [coreNum: number]: string }>({})
  const [spliceTypes, setSpliceTypes] = useState<{ [coreNum: number]: 'Fusion' | 'Mechanical' | 'Pass Through' }>({})

  // Camera Assignment States
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [selectedAssignCableId, setSelectedAssignCableId] = useState('')
  const [assignTxCore, setAssignTxCore] = useState(1)
  const [assignRxCore, setAssignRxCore] = useState(2)
  const [assignLinkRole, setAssignLinkRole] = useState<'primary' | 'backup'>('primary')

  // Field Technician Mode Wizard States
  const [techMode, setTechMode] = useState<boolean>(true)
  const [wizardStep, setWizardStep] = useState<number>(1)
  const [techSourceNodeId, setTechSourceNodeId] = useState('')
  const [techEnclosureId, setTechEnclosureId] = useState('')
  const [techBackboneCableId, setTechBackboneCableId] = useState('')
  const [techBufferTubeId, setTechBufferTubeId] = useState('') // selected fiber_buffer_tubes.id
  const [techTxStrandId, setTechTxStrandId] = useState('')
  const [techRxStrandId, setTechRxStrandId] = useState('')
  const [techCabinetId, setTechCabinetId] = useState('')
  const [techLoading, setTechLoading] = useState(false)

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

    const apiKey = googleMapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

    setOptions({
      key: apiKey,
      v: 'weekly'
    })

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('geometry'),
      importLibrary('drawing')
    ])
      .then(() => {
        setGoogleLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err)
        setErrorMessage('Google Maps API key is missing or invalid. Check credentials on Vercel.')
      })
  }, [googleMapsApiKey])

  // Synchronize form color and notes states on selection changes
  useEffect(() => {
    if (selectedNode) {
      const color = getNodeCustomColor(selectedNode)
      const actualNotes = getNodeActualNotes(selectedNode.notes)
      setNodeColor(color)
      setNodeNotes(actualNotes)
      setNodeLat(selectedNode.latitude)
      setNodeLng(selectedNode.longitude)
    } else {
      setNodeColor('')
      setNodeNotes('')
      setNodeLat(0)
      setNodeLng(0)
    }
  }, [selectedNode])

  useEffect(() => {
    if (selectedRoute) {
      const color = getRouteCustomColor(selectedRoute)
      const cable = initialData.cables.find(c => c.route_id === selectedRoute.id)
      const actualNotes = getRouteActualNotes(cable?.notes || '')
      setRouteColor(color)
      setRouteNotes(actualNotes)

      // Sync route coordinates
      const routeSegs = initialData.segments.filter(s => s.route_id === selectedRoute.id)
      const sortedSegs = [...routeSegs].sort((a, b) => a.segment_index - b.segment_index)
      const points: google.maps.LatLngLiteral[] = []
      sortedSegs.forEach((seg, idx) => {
        if (idx === 0) {
          points.push({ lat: seg.start_latitude, lng: seg.start_longitude })
        }
        points.push({ lat: seg.end_latitude, lng: seg.end_longitude })
      })
      setEditedRoutePoints(points)
    } else {
      setRouteColor('')
      setRouteNotes('')
      setEditedRoutePoints([])
    }
  }, [selectedRoute, initialData.cables, initialData.segments])

  // Handle selectedNodeId / selectedRouteId from query parameters on load
  useEffect(() => {
    if (typeof window === 'undefined' || !googleLoaded) return
    const params = new URLSearchParams(window.location.search)
    const nodeId = params.get('selectedNodeId')
    const routeId = params.get('selectedRouteId')

    if (nodeId && initialData.nodes.length > 0) {
      const node = initialData.nodes.find((n: any) => n.id === nodeId)
      if (node) {
        setSelectedNode(node)
        setSelectedRoute(null)
        setActiveTab('properties')
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
        if (map) {
          map.panTo({ lat: Number(node.latitude), lng: Number(node.longitude) })
          map.setZoom(18)
        }
      }
    } else if (routeId && initialData.routes.length > 0) {
      const route = initialData.routes.find((r: any) => r.id === routeId)
      if (route) {
        setSelectedRoute(route)
        setSelectedNode(null)
        setActiveTab('properties')
        setRouteIdTag(route.route_id_tag || '')
        setConduitDiameter(Number(route.conduit_diameter_inches || 2.0))
        setRouteSlackPercentage(Number(route.slack_percentage || 10.0))
        setInstallationType(route.installation_type || 'underground')
        const seg = initialData.segments.find((s: any) => s.route_id === route.id)
        if (seg && map) {
          map.panTo({ lat: Number(seg.start_latitude), lng: Number(seg.start_longitude) })
          map.setZoom(18)
        }
      }
    }
  }, [map, initialData, googleLoaded])

  // Register global select functions for InfoWindow clicks
  useEffect(() => {
    if (typeof window === 'undefined') return

    (window as any).selectNodeForEditing = (nodeId: string) => {
      const node = initialData.nodes.find((n: any) => n.id === nodeId)
      if (node) {
        setSelectedNode(node)
        setSelectedRoute(null)
        setActiveTab('properties')
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
        const iw = (window as any)._mapInfoWindow
        if (iw) iw.close()
      }
    };

    (window as any).selectRouteForEditing = (routeId: string) => {
      const route = initialData.routes.find((r: any) => r.id === routeId)
      if (route) {
        setSelectedRoute(route)
        setSelectedNode(null)
        setActiveTab('properties')
        setRouteIdTag(route.route_id_tag || '')
        setConduitDiameter(Number(route.conduit_diameter_inches || 2.0))
        setRouteSlackPercentage(Number(route.slack_percentage || 10.0))
        setInstallationType(route.installation_type || 'underground')
        const iw = (window as any)._mapInfoWindow
        if (iw) iw.close()
      }
    };

    return () => {
      delete (window as any).selectNodeForEditing
      delete (window as any).selectRouteForEditing
    }
  }, [initialData])

  // 2. Initialize Google Map instance
  useEffect(() => {
    if (!googleLoaded || !mapRef.current || map) return

    try {
      const gMap = new google.maps.Map(mapRef.current, {
        center: { lat: defaultLatitude || 33.7490, lng: defaultLongitude || -84.3880 },
        zoom: defaultZoom || 15,
        mapTypeId: activeLayer,
        tilt: 0,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      })

      // Clicking the map in node creation / route drawing mode
      gMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        const iw = (window as any)._mapInfoWindow
        if (iw) iw.close()

        if (!e.latLng) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
 
        const currentMode = toolModeRef.current
        if (currentMode === 'select') return

        if (currentMode === 'draw_route') {
          let finalLat = lat
          let finalLng = lng

          let closestNode = null
          let minDistance = Infinity
          initialData.nodes.forEach(n => {
            const dist = haversineDistanceMeters(lat, lng, n.latitude, n.longitude)
            if (dist < minDistance) {
              minDistance = dist
              closestNode = n
            }
          })

          if (closestNode && minDistance < 15) {
            finalLat = closestNode.latitude
            finalLng = closestNode.longitude
          }

          setTempRoutePoints(prev => {
            if (prev.length > 0 && prev[prev.length - 1].lat === finalLat && prev[prev.length - 1].lng === finalLng) {
              return prev
            }
            return [...prev, { lat: finalLat, lng: finalLng }]
          })
        } else {
          if (handleMapCanvasClickRef.current) {
            handleMapCanvasClickRef.current(lat, lng)
          }
        }
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
      const customCol = getRouteCustomColor(route)
      if (customCol) return customCol

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
        strokeWeight: 2.5,
        map: map
      })

      // Highlight selected route
      if (selectedRoute && selectedRoute.id === route.id) {
        poly.setOptions({ strokeColor: '#38bdf8', strokeWeight: 4, editable: true })

        // Track path edits dynamically
        const path = poly.getPath()
        const updatePoints = () => {
          const newPoints: google.maps.LatLngLiteral[] = []
          for (let i = 0; i < path.getLength(); i++) {
            const xy = path.getAt(i)
            newPoints.push({ lat: xy.lat(), lng: xy.lng() })
          }
          setEditedRoutePoints(newPoints)
          if (endMarker && newPoints.length > 0) {
            endMarker.setPosition(newPoints[newPoints.length - 1])
          }
        }

        let endMarker: google.maps.Marker | null = null
        if (points.length > 0) {
          const lastPoint = points[points.length - 1]
          endMarker = new google.maps.Marker({
            position: lastPoint,
            map: map,
            draggable: true,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            },
            title: 'Arrastra para extender ruta',
            zIndex: 9999
          })

          endMarker.addListener('dragstart', () => {
            const currentPath = poly.getPath()
            const len = currentPath.getLength()
            if (len > 0) {
              const lastVal = currentPath.getAt(len - 1)
              currentPath.push(new google.maps.LatLng(lastVal.lat(), lastVal.lng()))
              updatePoints()
            }
          })

          endMarker.addListener('drag', () => {
            const pos = endMarker?.getPosition()
            if (pos) {
              const currentPath = poly.getPath()
              const len = currentPath.getLength()
              if (len > 0) {
                currentPath.setAt(len - 1, pos)
                updatePoints()
              }
            }
          })

          endMarker.addListener('dragend', () => {
            const pos = endMarker?.getPosition()
            if (pos) {
              let finalLat = pos.lat()
              let finalLng = pos.lng()

              let closestNode = null
              let minDistance = Infinity
              initialData.nodes.forEach(n => {
                const dist = haversineDistanceMeters(pos.lat(), pos.lng(), n.latitude, n.longitude)
                if (dist < minDistance) {
                  minDistance = dist
                  closestNode = n
                }
              })

              if (closestNode && minDistance < 15) {
                finalLat = closestNode.latitude
                finalLng = closestNode.longitude
                endMarker?.setPosition({ lat: finalLat, lng: finalLng })
              }

              const currentPath = poly.getPath()
              const len = currentPath.getLength()
              if (len > 0) {
                currentPath.setAt(len - 1, new google.maps.LatLng(finalLat, finalLng))
                updatePoints()
              }
            }
          })

          markersRef.current.push(endMarker)
        }

        path.addListener('set_at', updatePoints)
        path.addListener('insert_at', updatePoints)
        path.addListener('remove_at', updatePoints)
      }

      poly.addListener('click', (e: google.maps.PolyMouseEvent) => {
        setSelectedRoute(route)
        setSelectedNode(null)
        setActiveTab('properties')

        // Initialize route form states
        setRouteIdTag(route.route_id_tag || '')
        setConduitDiameter(Number(route.conduit_diameter_inches || 2.0))
        setRouteSlackPercentage(Number(route.slack_percentage || 10.0))
        setInstallationType(route.installation_type || 'underground')

        const cable = initialData.cables.find(c => c.route_id === route.id)
        const fromNode = initialData.nodes.find(n => n.id === cable?.from_node_id)
        const toNode = initialData.nodes.find(n => n.id === cable?.to_node_id)

        const contentString = `
          <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
              Route: ${route.route_id_tag}
            </div>
            <div><strong>Measured Length:</strong> ${route.measured_length_feet} ft</div>
            <div><strong>Installed Length:</strong> ${route.installed_length_feet} ft</div>
            <div><strong>Type:</strong> ${route.installation_type}</div>
            <div><strong>Conduit Size:</strong> ${route.conduit_diameter_inches} in</div>
            <div><strong>Fill:</strong> ${route.fill_percentage}%</div>
            ${cable ? `
              <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                <strong>Cable:</strong> ${cable.cable_tag} (${cable.fiber_count}F)<br/>
                <strong>Install Status:</strong> ${cable.install_status}<br/>
                <strong>Test Status:</strong> ${cable.test_status}<br/>
                <strong>From:</strong> ${fromNode ? fromNode.node_tag : 'Start'}<br/>
                <strong>To:</strong> ${toNode ? toNode.node_tag : 'End'}
              </div>
            ` : '<div style="margin-top: 4px;"><em>No Cable Installed</em></div>'}
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex;">
              <button onclick="window.selectRouteForEditing('${route.id}')" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; border: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1; cursor: pointer;">Editar Ruta</button>
            </div>
          </div>
        `

        if (infoWindow && e.latLng) {
          infoWindow.setContent(contentString)
          infoWindow.setPosition(e.latLng)
          infoWindow.open(map)
        }
      })

      polylinesRef.current.push(poly)
    })

    // Draw Nodes (markers)
    initialData.nodes.forEach(node => {
      const customNodeColor = getNodeCustomColor(node)
      const statusColor = customNodeColor || getStatusColor(node.status)
      let svgShape = ''
      const typeLower = node.node_type ? node.node_type.toLowerCase() : ''
      
      if (typeLower === 'manhole') {
        // circular underground access icon
        svgShape = `
          <circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2"/>
          <line x1="12" y1="2" x2="12" y2="22" stroke="#ffffff" stroke-width="1"/>
          <line x1="2" y1="12" x2="22" y2="12" stroke="#ffffff" stroke-width="1"/>
        `
      } else if (typeLower === 'handhole') {
        // small rectangular handhole icon
        svgShape = `
          <rect x="4" y="6" width="16" height="12" rx="1.5" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="8" y="9" width="8" height="6" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="1.5"/>
        `
      } else if (typeLower === 'pull box') {
        // pull box icon
        svgShape = `
          <rect x="6" y="4" width="12" height="16" rx="2" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
        `
      } else if (typeLower === 'cabinet') {
        // cabinet icon
        svgShape = `
          <rect x="3" y="3" width="18" height="18" rx="2" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="6" y="6" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="1.5"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="#ffffff" stroke-width="1"/>
          <line x1="18" y1="6" x2="6" y2="18" stroke="#ffffff" stroke-width="1"/>
        `
      } else if (typeLower === 'pole') {
        // utility pole icon
        svgShape = `
          <rect x="10" y="2" width="4" height="20" fill="${statusColor}" stroke="#ffffff" stroke-width="1"/>
          <line x1="4" y1="6" x2="20" y2="6" stroke="#ffffff" stroke-width="2"/>
          <line x1="6" y1="11" x2="18" y2="11" stroke="#ffffff" stroke-width="2"/>
        `
      } else if (typeLower === 'building') {
        // building icon
        svgShape = `
          <polygon points="12,2 2,10 5,10 5,20 19,20 19,10 22,10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <rect x="9" y="13" width="6" height="7" fill="#ffffff"/>
        `
      } else if (typeLower === 'existing fiber source') {
        // fiber source star icon
        svgShape = `
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="${statusColor}" stroke="#ffffff" stroke-width="1.5"/>
        `
      } else {
        // Fallback / Camera Location
        svgShape = `
          <circle cx="12" cy="12" r="10" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="#ffffff"/>
        `
      }
 
      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 24 34">
          <g transform="translate(0, 0)">
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
        draggable: true,
        title: `${node.node_tag} (${node.node_type.toUpperCase()})`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
          scaledSize: new google.maps.Size(30, 42),
          anchor: new google.maps.Point(15, 15)
        }
      })

      // Click to select node
      marker.addListener('click', () => {
        const currentMode = toolModeRef.current
        if (currentMode === 'draw_route') {
          setTempRoutePoints(prev => {
            if (prev.length > 0 && prev[prev.length - 1].lat === node.latitude && prev[prev.length - 1].lng === node.longitude) {
              return prev
            }
            return [...prev, { lat: node.latitude, lng: node.longitude }]
          })
          return
        }

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

        // Open InfoWindow on click
        const nodeEnclosures = initialData.enclosures.filter((e: any) => e.node_id === node.id)
        const nodeCables = initialData.cables.filter((c: any) => c.from_node_id === node.id || c.to_node_id === node.id)
        const servedAssignments = initialData.assignments.filter((a: any) => a.source_node_id === node.id)
        
        const servedCamTags = servedAssignments.map((a: any) => {
          const cam = initialData.cameras.find((c: any) => c.id === a.camera_id)
          return cam ? cam.camera_id_tag : 'Unknown'
        }).join(', ')

        const contentString = `
          <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
              ${node.node_tag}
            </div>
            <div><strong>Type:</strong> ${node.node_type}</div>
            <div><strong>Status:</strong> <span style="color: ${getStatusColor(node.status)}; font-weight: bold;">${node.status}</span></div>
            <div><strong>Cables:</strong> ${nodeCables.length > 0 ? nodeCables.map((c: any) => c.cable_tag).join(', ') : 'None'}</div>
            <div><strong>Enclosures:</strong> ${nodeEnclosures.length}</div>
            <div><strong>Served Cameras:</strong> ${servedCamTags || 'None'}</div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex;">
              <button onclick="window.selectNodeForEditing('${node.id}')" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; border: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1; cursor: pointer;">Editar Nodo</button>
            </div>
          </div>
        `
        
        if (infoWindow) {
          infoWindow.setContent(contentString)
          infoWindow.open(map, marker)
        }
      })

      // Drag node coordinates persist
      marker.addListener('dragend', async () => {
        const pos = marker.getPosition()
        if (!pos) return

        const newLat = pos.lat()
        const newLng = pos.lng()

        try {
          const supabase = await createClient()
          const { error } = await supabase
            .from('fiber_nodes')
            .update({
              latitude: newLat,
              longitude: newLng
            })
            .eq('id', node.id)

          if (error) {
            showNotification('error', `Failed to move node: ${error.message}`)
            marker.setPosition({ lat: node.latitude, lng: node.longitude })
          } else {
            showNotification('success', `Moved node ${node.node_tag} to new coordinates.`)
            node.latitude = newLat
            node.longitude = newLng
            if (selectedNode && selectedNode.id === node.id) {
              setNodeLat(newLat)
              setNodeLng(newLng)
            }
            await loadDesignData()
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

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(tooltipContent)
            infoWindow.open(map, marker)
          }
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

        // Click tooltip for drop cable
        poly.addListener('click', (e: google.maps.PolyMouseEvent) => {
          const cable = initialData.cables.find(c => c.id === assignment.drop_cable_id)
          const contentString = `
            <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 220px;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
                Camera Drop: ${camera.camera_id_tag}
              </div>
              <div><strong>Path Status:</strong> <span style="color: ${getStatusColor(assignment.fiber_path_status)}; font-weight: bold;">${assignment.fiber_path_status}</span></div>
              <div><strong>Splice Status:</strong> ${assignment.splice_status}</div>
              <div><strong>Test Status:</strong> ${assignment.test_status}</div>
              ${cable ? `
                <div style="margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
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
        strokeWeight: 2,
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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal(null)
      }
    })
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

    // Find the maximum index suffix among existing nodes of the same type/prefix to prevent collisions after deletions
    let maxNodeNum = 0
    initialData.nodes.forEach((n: any) => {
      if (n.node_type === toolMode && n.node_tag && n.node_tag.startsWith(`${typeLabel}-`)) {
        const parts = n.node_tag.split('-')
        const numPart = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(numPart) && numPart > maxNodeNum) {
          maxNodeNum = numPart
        }
      }
    })
    const tag = `${typeLabel}-${String(maxNodeNum + 1).padStart(3, '0')}`

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
      await loadDesignData()
    }
  }

  // Synchronize handleMapCanvasClick ref to avoid stale closures
  useEffect(() => {
    handleMapCanvasClickRef.current = handleMapCanvasClick
  }, [handleMapCanvasClick])

  // Execute drawing route polyline completion
  const handleFinishRoute = async () => {
    if (tempRoutePoints.length < 2) {
      showNotification('error', 'Draw at least 2 points to create a route.')
      return
    }

    // Find the maximum index suffix among existing routes to prevent collisions after deletions
    let maxRouteNum = 0
    initialData.routes.forEach((r: any) => {
      if (r.route_id_tag && r.route_id_tag.startsWith('R-')) {
        const parts = r.route_id_tag.split('-')
        const numPart = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(numPart) && numPart > maxRouteNum) {
          maxRouteNum = numPart
        }
      }
    })
    const tag = `R-${String(maxRouteNum + 1).padStart(3, '0')}`

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
      await loadDesignData()
    }
  }

  // Delete node handler
  const handleDeleteNode = async (id: string, tag: string) => {
    triggerConfirm(
      'Confirm Node Deletion',
      `Are you sure you want to delete ${tag}? This will cascade delete its automatic BOM parts.`,
      async () => {
        const res = await deleteFiberNode({ id, projectId })
        if (res.error) {
          showNotification('error', res.error)
        } else {
          showNotification('success', `Deleted node ${tag}`)
          setSelectedNode(null)
          await loadDesignData()
        }
      }
    )
  }

  // Delete route handler
  const handleDeleteRoute = async (id: string, tag: string) => {
    triggerConfirm(
      'Confirm Route Deletion',
      `Are you sure you want to delete Route ${tag}? This will cascade delete its installed cables and BOM quantities.`,
      async () => {
        const res = await deleteRoute({ id })
        if (res.error) {
          showNotification('error', res.error)
        } else {
          showNotification('success', `Deleted route ${tag}`)
          setSelectedRoute(null)
          await loadDesignData()
        }
      }
    )
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
      const finalNotes = nodeColor ? `[COLOR:${nodeColor}]` + (nodeNotes ? ` ${nodeNotes}` : '') : nodeNotes
      const { error: nodeErr } = await supabase
        .from('fiber_nodes')
        .update({
          node_tag: nodeIdTag,
          size_description: nodeSize,
          elevation_ft: nodeElevation,
          slack_loop_ft: nodeSlack,
          notes: finalNotes,
          latitude: nodeLat,
          longitude: nodeLng
        })
        .eq('id', selectedNode.id)

      if (nodeErr) {
        showNotification('error', `Failed to update node: ${nodeErr.message}`)
        return
      }

      // Sync corresponding cabinet details if type was Cabinet
      if (selectedNode.node_type === 'Cabinet') {
        const { error: cabUpdateErr } = await supabase
          .from('cabinets')
          .update({
            cabinet_tag: nodeIdTag,
            notes: nodeNotes,
          })
          .eq('project_id', projectId)
          .eq('cabinet_tag', selectedNode.node_tag)

        if (cabUpdateErr) {
          console.error('Failed to update corresponding cabinet:', cabUpdateErr.message)
        }
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

      if (map) {
        map.panTo({ lat: nodeLat, lng: nodeLng })
      }

      showNotification('success', 'Node specifications saved!')
      await loadDesignData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveRouteDetails = async () => {
    if (!selectedRoute) return

    // Construct segments array from editedRoutePoints
    const segmentsPayload = []
    if (editedRoutePoints && editedRoutePoints.length > 1) {
      for (let i = 0; i < editedRoutePoints.length - 1; i++) {
        segmentsPayload.push({
          startLat: editedRoutePoints[i].lat,
          startLng: editedRoutePoints[i].lng,
          endLat: editedRoutePoints[i + 1].lat,
          endLng: editedRoutePoints[i + 1].lng
        })
      }
    }

    const res = await updateFiberRoute({
      id: selectedRoute.id,
      projectId,
      routeIdTag,
      conduitDiameterInches: conduitDiameter,
      slackPercentage: routeSlackPercentage,
      installationType: installationType,
      segments: segmentsPayload.length > 0 ? segmentsPayload : undefined
    })

    if (res.error) {
      showNotification('error', res.error)
      return
    }

    try {
      const supabase = await createClient()
      const cable = initialData.cables.find(c => c.route_id === selectedRoute.id)
      if (cable) {
        const finalNotes = routeColor ? `[COLOR:${routeColor}]` + (routeNotes ? ` ${routeNotes}` : '') : routeNotes
        const { error: cableNotesErr } = await supabase
          .from('fiber_cables')
          .update({
            notes: finalNotes
          })
          .eq('id', cable.id)

        if (cableNotesErr) {
          console.error('Failed to update cable custom notes/color:', cableNotesErr.message)
        }
      }
    } catch (err) {
      console.error(err)
    }

    showNotification('success', 'Pathway specifications saved!')
    await loadDesignData()
  }

  // Splice matrix load/save handlers
  const handleLoadSpliceConfig = () => {
    if (!selectedNode || !spliceCableA || !spliceCableB) return

    const enclosure = initialData.enclosures.find((e: any) => e.node_id === selectedNode.id)
    if (!enclosure) return

    const nodeSplices = initialData.splices.filter((s: any) =>
      s.enclosure_id === enclosure.id &&
      ((s.from_cable_id === spliceCableA && s.to_cable_id === spliceCableB) ||
       (s.from_cable_id === spliceCableB && s.to_cable_id === spliceCableA))
    )

    const config: { [fiberNumA: number]: number } = {}
    const losses: { [fiberNumA: number]: string } = {}
    const types: { [fiberNumA: number]: 'Fusion' | 'Mechanical' | 'Pass Through' } = {}

    nodeSplices.forEach((s: any) => {
      const strandA = initialData.strands.find((st: any) => st.cable_id === spliceCableA && (st.id === s.from_strand_id || st.id === s.to_strand_id))
      const strandB = initialData.strands.find((st: any) => st.cable_id === spliceCableB && (st.id === s.from_strand_id || st.id === s.to_strand_id))
      
      if (strandA && strandB) {
        config[strandA.strand_number] = strandB.strand_number
        losses[strandA.strand_number] = s.splice_loss_db !== null ? s.splice_loss_db.toString() : ''
        types[strandA.strand_number] = s.splice_type
        if (s.tray_id) {
          setSelectedTrayId(s.tray_id)
        }
      }
    })

    setSpliceConfig(config)
    setSpliceLosses(losses)
    setSpliceTypes(types)
  }

  // Triggers splice configuration load on dropdown change or data update
  useEffect(() => {
    handleLoadSpliceConfig()
  }, [spliceCableA, spliceCableB, initialData])

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
          const lossValue = spliceLosses[coreNumA] ? parseFloat(spliceLosses[coreNumA]) : (globalSpliceLoss ? parseFloat(globalSpliceLoss) : 0.020)
          const typeValue = spliceTypes[coreNumA] || globalSpliceType

          const res = await createSpliceRecord({
            projectId,
            enclosureId: enclosure.id,
            fromCableId: spliceCableA,
            fromStrandId: strandA.id,
            toCableId: spliceCableB,
            toStrandId: strandB.id,
            trayId: selectedTrayId || null,
            spliceLossDb: isNaN(lossValue) ? 0.020 : lossValue,
            spliceType: typeValue
          })
          if (res.error) {
            console.error(`Splice error for Core ${coreNumA} -> ${coreNumB}:`, res.error)
            showNotification('error', `Failed to splice Core ${coreNumA} -> ${coreNumB}: ${res.error}`)
            return // abort to avoid partial capacity failures
          } else {
            successCount++
          }
        }
      }

      showNotification('success', `Applied ${successCount} splices inside ${enclosure.enclosure_tag}`)
      await loadDesignData()
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

    // Find the enclosure in selected node (if any)
    const nodeEnclosure = initialData.enclosures.find((e: any) => e.node_id === selectedNode.id)

    // Find if the selected cable is drop or backbone
    const selectedCable = initialData.cables.find(c => c.id === selectedAssignCableId)
    const isDrop = selectedCable?.cable_type === 'Drop'

    const res = await updateCameraFiberAssignment({
      cameraId: selectedCameraId,
      projectId,
      sourceNodeId: selectedNode.id,
      enclosureId: nodeEnclosure ? nodeEnclosure.id : null,
      backboneCableId: isDrop ? null : selectedAssignCableId,
      dropCableId: isDrop ? selectedAssignCableId : null,
      fiberPathStatus: 'Planned'
    })

    if (res.error) {
      showNotification('error', res.error)
      return
    }

    // Clear previous strand assignments first
    await clearStrandAssignmentsForCamera({
      projectId,
      cameraId: selectedCameraId
    })

    // Assign selected strands if cores are provided and valid
    if (res.data) {
      const assignmentId = res.data.id

      // Find the TX strand matching selected cable and core number
      const txStrand = initialData.strands.find(s => s.cable_id === selectedAssignCableId && s.strand_number === assignTxCore)
      if (txStrand) {
        const txRes = await assignStrandToCamera({
          projectId,
          cameraFiberAssignmentId: assignmentId,
          cameraId: selectedCameraId,
          strandId: txStrand.id,
          strandRole: 'TX'
        })
        if (txRes.error) {
          showNotification('error', `Saved assignment but failed to assign TX strand: ${txRes.error}`)
          return
        }
      }

      // Find the RX strand matching selected cable and core number
      const rxStrand = initialData.strands.find(s => s.cable_id === selectedAssignCableId && s.strand_number === assignRxCore)
      if (rxStrand) {
        const rxRes = await assignStrandToCamera({
          projectId,
          cameraFiberAssignmentId: assignmentId,
          cameraId: selectedCameraId,
          strandId: rxStrand.id,
          strandRole: 'RX'
        })
        if (rxRes.error) {
          showNotification('error', `Saved assignment but failed to assign RX strand: ${rxRes.error}`)
          return
        }
      }
    }

    showNotification('success', `Camera fiber assignment and strand patching updated`)
    await loadDesignData()
  }

  const handleRemoveCameraFiber = async (camId: string, _linkRole: string) => {
    triggerConfirm(
      'Remove Fiber Assignment',
      'Are you sure you want to remove this camera fiber assignment?',
      async () => {
        const res = await updateCameraFiberAssignment({
          cameraId: camId,
          projectId,
          fiberPathStatus: 'Planned',
        })

        if (res.error) {
          showNotification('error', res.error)
        } else {
          showNotification('success', 'Fiber assignment cleared.')
          await loadDesignData()
        }
      }
    )
  }

  // Field Technician Mode Event Handlers
  const handleSaveTechAssignment = async () => {
    if (!selectedCameraId || !techSourceNodeId || !techEnclosureId || !techBackboneCableId || !techTxStrandId || !techRxStrandId || !techCabinetId) {
      showNotification('error', 'Please complete all steps in the wizard first.')
      return
    }

    setTechLoading(true)
    try {
      const res = await assignCameraFiberTechnicianMode({
        projectId,
        cameraId: selectedCameraId,
        sourceNodeId: techSourceNodeId,
        enclosureId: techEnclosureId,
        backboneCableId: techBackboneCableId,
        txStrandId: techTxStrandId,
        rxStrandId: techRxStrandId,
        cabinetId: techCabinetId
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Camera assignment created and planned splices generated!')
        await loadDesignData()
        // Reset wizard
        setWizardStep(1)
        setTechSourceNodeId('')
        setTechEnclosureId('')
        setTechBackboneCableId('')
        setTechBufferTubeId('')
        setTechTxStrandId('')
        setTechRxStrandId('')
        setTechCabinetId('')
      }
    } catch (err: any) {
      showNotification('error', `An unexpected error occurred: ${err.message}`)
    } finally {
      setTechLoading(false)
    }
  }

  const handleCompleteSplices = async (location: 'mainhole' | 'cabinet') => {
    if (!selectedCameraId) return
    setTechLoading(true)
    try {
      const res = await completeCameraFiberSplices({
        projectId,
        cameraId: selectedCameraId,
        location
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', `${location === 'mainhole' ? 'Mainhole' : 'Cabinet'} splices marked as completed!`)
        await loadDesignData()
      }
    } catch (err: any) {
      showNotification('error', `An unexpected error occurred: ${err.message}`)
    } finally {
      setTechLoading(false)
    }
  }

  const handleRemoveTechAssignment = async (camId: string) => {
    triggerConfirm(
      'Clear Assignment & Splices',
      'Are you sure you want to remove this camera fiber assignment and clear all OSP splices?',
      async () => {
        setTechLoading(true)
        try {
          const supabase = createClient()
          await supabase.from('fiber_splice_records').delete().eq('assigned_camera_id', camId)
          await clearStrandAssignmentsForCamera({ projectId, cameraId: camId })
          await supabase.from('camera_fiber_assignments').delete().eq('camera_id', camId)
          showNotification('success', 'Camera assignment and splices cleared.')
          await loadDesignData()
        } catch (err: any) {
          showNotification('error', `Failed to remove assignment: ${err.message}`)
        } finally {
          setTechLoading(false)
        }
      }
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full font-sans relative">
      
      {/* Alert notifications banner */}
      {notifyMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl border text-xs font-bold z-50 shadow-xl backdrop-blur-md transition-all flex items-center gap-2 ${
          notifyMessage.type === 'success' 
            ? 'bg-emerald-900/95 text-emerald-50 border-emerald-500/30' 
            : 'bg-rose-900/95 text-rose-50 border-rose-500/30'
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
            {/* Map layer toggle UI */}
            {!errorMessage && (
              <div className="absolute top-3 right-3 z-10 flex bg-slate-950/70 border border-slate-805 rounded-xl p-1 gap-1 backdrop-blur-md">
                {(['hybrid', 'roadmap', 'satellite'] as const).map(layer => (
                  <button
                    key={layer}
                    onClick={() => handleLayerChange(layer)}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                      activeLayer === layer
                        ? 'bg-indigo-650 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {layer === 'roadmap' ? 'Road' : layer === 'hybrid' ? 'Hybrid' : 'Sat'}
                  </button>
                ))}
              </div>
            )}

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
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'properties' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Props
            </button>
            <button
              onClick={() => setActiveTab('splice')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'splice' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
              disabled={!selectedNode || (selectedNode.node_type !== 'Splice Enclosure' && selectedNode.node_type !== 'Cabinet' && selectedNode.node_type !== 'Handhole')}
              title={(!selectedNode || (selectedNode.node_type !== 'Splice Enclosure' && selectedNode.node_type !== 'Cabinet' && selectedNode.node_type !== 'Handhole')) ? 'Select a Splice Enclosure on the map first' : ''}
            >
              Splice
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'cameras' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Cameras
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'lists' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
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
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">OSP Fiber Dashboard</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time status of the 35-camera fiber rollout</p>
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
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Cameras</div>
                              <div className="text-xl font-bold text-white mt-0.5">{totalCams}</div>
                              <div className="text-xs text-slate-450 mt-1">{fiberCams} Fiber • {ethCams} Ethernet</div>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fiber Paths</div>
                              <div className="text-xl font-bold text-indigo-400 mt-0.5">{assignedCams}</div>
                              <div className="text-xs text-slate-450 mt-1 font-mono">
                                {fiberCams > 0 ? Math.round((assignedCams / fiberCams) * 100) : 0}% Assigned
                              </div>
                            </div>
                          </div>

                          {/* Progress bars / Rollout Status */}
                          <div className="bg-slate-950/20 border border-slate-850 p-3 rounded-xl space-y-3.5">
                            <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-850 pb-1.5">Rollout Execution</h5>
                            
                            {/* Pulling Drop Cables */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
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
                              <div className="flex justify-between items-center text-xs">
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
                              <div className="flex justify-between items-center text-xs">
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
                            <p className="text-xs text-indigo-300 leading-normal">
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
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-950/40 text-indigo-400 border border-indigo-500/10">
                        {selectedNode.node_type.replace('_', ' ')}
                      </span>
                      <button 
                        onClick={() => handleDeleteNode(selectedNode.id, selectedNode.node_tag)}
                        className="text-xs text-rose-450 hover:underline font-bold"
                      >
                        Delete Node
                      </button>
                    </div>

                    <div className="space-y-3.5 text-sm">
                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Node Tag/ID</label>
                        <input
                          type="text"
                          value={nodeIdTag}
                          onChange={e => setNodeIdTag(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Latitude</label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={nodeLat}
                            onChange={e => setNodeLat(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Longitude</label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={nodeLng}
                            onChange={e => setNodeLng(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Dimensions (Size)</label>
                        <input
                          type="text"
                          value={nodeSize}
                          onChange={e => setNodeSize(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Elevation (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={nodeElevation}
                            onChange={e => setNodeElevation(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Slack Loop (ft)</label>
                          <input
                            type="number"
                            value={nodeSlack}
                            onChange={e => setNodeSlack(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Enclosure detail parameters */}
                      {selectedNode.node_type === 'splice_enclosure' && (
                        <>
                          <div className="border-t border-slate-850 pt-3.5 space-y-3.5">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Closure Type</label>
                              <select
                                value={nodeClosureType}
                                onChange={e => setNodeClosureType(e.target.value as any)}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="Dome Closure">Dome Closure</option>
                                <option value="Inline Closure">Inline Closure</option>
                                <option value="Patch Panel">Patch Panel</option>
                                <option value="ODF">ODF</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Port Capacity (Cores)</label>
                              <input
                                type="number"
                                value={nodeCapacity}
                                onChange={e => setNodeCapacity(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1.5">Custom Icon Color</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[
                            { name: 'Default', value: '' },
                            { name: 'Blue', value: '#3b82f6' },
                            { name: 'Green', value: '#10b981' },
                            { name: 'Red', value: '#ef4444' },
                            { name: 'Yellow', value: '#eab308' },
                            { name: 'Orange', value: '#f97316' },
                            { name: 'Purple', value: '#a855f7' },
                            { name: 'Pink', value: '#ec4899' },
                            { name: 'Sky', value: '#0ea5e9' }
                          ].map(col => (
                            <button
                              key={col.value || 'default'}
                              type="button"
                              onClick={() => setNodeColor(col.value)}
                              className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${
                                nodeColor === col.value
                                  ? 'border-white scale-110 shadow-lg'
                                  : 'border-slate-800 hover:border-slate-650'
                              }`}
                              style={{
                                backgroundColor: col.value || '#475569'
                              }}
                              title={col.name}
                            >
                              {nodeColor === col.value && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Notes</label>
                        <textarea
                          rows={3}
                          value={nodeNotes}
                          onChange={e => setNodeNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-[11px] focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleSaveNodeDetails}
                        className="w-full py-2.5.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
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
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-950/40 text-rose-400 border border-rose-500/10">
                        Pathway Route
                      </span>
                      <button 
                        onClick={() => handleDeleteRoute(selectedRoute.id, selectedRoute.route_id_tag)}
                        className="text-xs text-rose-450 hover:underline font-bold"
                      >
                        Delete Route
                      </button>
                    </div>

                    <div className="space-y-3.5 text-sm">
                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Route Tag/ID</label>
                        <input
                          type="text"
                          value={routeIdTag}
                          onChange={e => setRouteIdTag(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Conduit Size (inches)</label>
                          <select
                            value={conduitDiameter}
                            onChange={e => setConduitDiameter(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          >
                            <option value={0.75}>0.75 in</option>
                            <option value={1.0}>1.0 in</option>
                            <option value={1.25}>1.25 in</option>
                            <option value={1.5}>1.5 in</option>
                            <option value={2.0}>2.0 in</option>
                            <option value={3.0}>3.0 in</option>
                            <option value={4.0}>4.0 in</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Installation Type</label>
                          <select
                            value={installationType}
                            onChange={e => setInstallationType(e.target.value as any)}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                          >
                            <option value="underground">Underground</option>
                            <option value="aerial">Aerial</option>
                            <option value="direct_buried">Direct Buried</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Slack Loop (%)</label>
                        <input
                          type="number"
                          value={routeSlackPercentage}
                          onChange={e => setRouteSlackPercentage(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[10px]">Measured</span>
                          <span className="text-[11px] font-black text-white font-mono">{selectedRoute.measured_length_feet} ft</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[10px]">Installed</span>
                          <span className="text-[11px] font-black text-white font-mono">{selectedRoute.installed_length_feet} ft</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wide text-[10px]">Conduit Fill</span>
                          <span className="text-[11px] font-bold text-slate-200 font-mono">{selectedRoute.fill_percentage}%</span>
                        </div>
                      </div>

                      {/* Fill percentage warning alert */}
                      {Number(selectedRoute.fill_percentage) > 40.0 && (
                        <div className="bg-rose-950/20 border border-rose-900/40 text-rose-450 p-3 rounded-xl text-xs leading-normal flex gap-2">
                          <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <div>
                            <p className="font-bold">TIA/EIA Max Fill Exceeded</p>
                            <p className="text-slate-400 mt-0.5">Conduit fill exceeds the 40% standard capacity limit. Consider utilizing larger conduit diameters or higher fiber counts.</p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1.5">Custom Route Color (Fiber Type)</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[
                            { name: 'Default', value: '' },
                            { name: 'Blue', value: '#3b82f6' },
                            { name: 'Green', value: '#10b981' },
                            { name: 'Red', value: '#ef4444' },
                            { name: 'Yellow', value: '#eab308' },
                            { name: 'Orange', value: '#f97316' },
                            { name: 'Purple', value: '#a855f7' },
                            { name: 'Pink', value: '#ec4899' },
                            { name: 'Sky', value: '#0ea5e9' }
                          ].map(col => (
                            <button
                              key={col.value || 'default'}
                              type="button"
                              onClick={() => setRouteColor(col.value)}
                              className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${
                                routeColor === col.value
                                  ? 'border-white scale-110 shadow-lg'
                                  : 'border-slate-800 hover:border-slate-650'
                              }`}
                              style={{
                                backgroundColor: col.value || '#eab308'
                              }}
                              title={col.name}
                            >
                              {routeColor === col.value && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Route Notes</label>
                        <textarea
                          rows={2}
                          value={routeNotes}
                          onChange={e => setRouteNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-[11px] focus:outline-none"
                          placeholder="Fiber type, cable model, installation notes..."
                        />
                      </div>

                      <button
                        onClick={handleSaveRouteDetails}
                        className="w-full py-2.5.5 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
                      >
                        Save Pathway Specifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TABS 2: Splice Matrix Editor */}
            {activeTab === 'splice' && selectedNode && (() => {
              const enclosure = initialData.enclosures.find((e: any) => e.node_id === selectedNode.id)
              const trays = enclosure ? (initialData.spliceTrays || []).filter((t: any) => t.enclosure_id === enclosure.id) : []
              return (
                <div className="space-y-4">
                  <div className="border-b border-slate-850 pb-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Visual Splice Matrix</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Patch fiber cores inside {selectedNode.node_tag}</p>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    {/* Splice Trays Configuration */}
                    <div className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-850 space-y-3">
                      <span className="block text-xs font-bold text-slate-200 uppercase tracking-wider">Splice Trays</span>
                      {enclosure ? (
                        <>
                          <div>
                            <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Select Active Tray</label>
                            <select
                              value={selectedTrayId}
                              onChange={e => setSelectedTrayId(e.target.value)}
                              className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                            >
                              <option value="">No Tray (Loose Splice)</option>
                              {trays.map((t: any) => {
                                const count = (initialData.splices || []).filter((s: any) => s.tray_id === t.id).length
                                return (
                                  <option key={t.id} value={t.id}>
                                    Tray {t.tray_number} ({count} / {t.capacity} Splices)
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                          
                          <div className="border-t border-slate-900 pt-2.5 space-y-2">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Create Splice Tray</span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-slate-500 block text-[10px] mb-0.5">Tray Number</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newTrayNumber}
                                  onChange={e => setNewTrayNumber(parseInt(e.target.value, 10))}
                                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 block text-[10px] mb-0.5">Capacity</label>
                                <select
                                  value={newTrayCapacity}
                                  onChange={e => setNewTrayCapacity(parseInt(e.target.value, 10))}
                                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                >
                                  <option value={12}>12 Splices</option>
                                  <option value={24}>24 Splices</option>
                                  <option value={48}>48 Splices</option>
                                </select>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const res = await createSpliceTray({
                                  projectId,
                                  enclosureId: enclosure.id,
                                  trayNumber: newTrayNumber,
                                  capacity: newTrayCapacity
                                })
                                if (res.error) {
                                  showNotification('error', res.error)
                                } else {
                                  showNotification('success', `Splice Tray ${newTrayNumber} created!`)
                                  await loadDesignData()
                                }
                              }}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Add Splice Tray
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Select cables to automatically generate enclosure and trays.</p>
                      )}
                    </div>

                    {/* Splicing Defaults Card */}
                    <div className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-850 space-y-2">
                      <span className="block text-xs font-bold text-slate-200 uppercase tracking-wider">Splicing Defaults</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-500 block text-[10px] mb-0.5">Splice Loss (dB)</label>
                          <input
                            type="text"
                            value={globalSpliceLoss}
                            onChange={e => setGlobalSpliceLoss(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            placeholder="0.020"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block text-[10px] mb-0.5">Splice Type</label>
                          <select
                            value={globalSpliceType}
                            onChange={e => setGlobalSpliceType(e.target.value as any)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white"
                          >
                            <option value="Fusion">Fusion</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Pass Through">Pass Through</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Select cables */}
                    <div>
                      <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Cable A (Left)</label>
                      <select
                        value={spliceCableA}
                        onChange={e => setSpliceCableA(e.target.value)}
                        className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                      >
                        <option value="">Select Cable...</option>
                        {initialData.cables.map(c => (
                          <option key={c.id} value={c.id}>{c.cable_id_tag} ({c.fiber_count} Cores)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Cable B (Right)</label>
                      <select
                        value={spliceCableB}
                        onChange={e => setSpliceCableB(e.target.value)}
                        className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
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
                        <div className="flex justify-between items-center text-xs uppercase font-bold text-slate-500 border-b border-slate-850 pb-1.5">
                          <span>Cable A Core</span>
                          <span>Cable B Target & Details</span>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                          {Array.from({ length: initialData.cables.find(c => c.id === spliceCableA)?.fiber_count || 12 }).map((_, idx) => {
                            const coreNum = idx + 1
                            const col = getFiberColor(coreNum)
                            return (
                              <div key={coreNum} className="flex justify-between items-center gap-2 text-[11px] border-b border-slate-900/40 pb-2">
                                <div className="flex items-center gap-1.5 shrink-0 w-24">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                                    style={{ backgroundColor: col.hex }} 
                                    title={col.name}
                                  />
                                  <span className="font-mono text-slate-300">Core {coreNum}</span>
                                </div>

                                <div className="flex items-center gap-1.5 grow justify-end">
                                  <select
                                    value={spliceConfig[coreNum] || ''}
                                    onChange={e => {
                                      const val = e.target.value ? parseInt(e.target.value, 10) : 0
                                      setSpliceConfig(prev => ({
                                        ...prev,
                                        [coreNum]: val
                                      }))
                                    }}
                                    className="px-1.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none w-28"
                                  >
                                    <option value="">Open / Unused</option>
                                    {Array.from({ length: initialData.cables.find(c => c.id === spliceCableB)?.fiber_count || 12 }).map((_, bIdx) => (
                                      <option key={bIdx + 1} value={bIdx + 1}>Core {bIdx + 1}</option>
                                    ))}
                                  </select>

                                  {spliceConfig[coreNum] && (
                                    <>
                                      <input
                                        type="text"
                                        placeholder={globalSpliceLoss}
                                        value={spliceLosses[coreNum] || ''}
                                        onChange={e => setSpliceLosses(prev => ({ ...prev, [coreNum]: e.target.value }))}
                                        className="w-10 px-1 py-0.5 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none text-center"
                                        title="Splice Loss (dB)"
                                      />
                                      <select
                                        value={spliceTypes[coreNum] || globalSpliceType}
                                        onChange={e => setSpliceTypes(prev => ({ ...prev, [coreNum]: e.target.value as any }))}
                                        className="px-1 py-0.5 bg-slate-950 border border-slate-850 rounded text-xs text-white focus:outline-none w-10"
                                        title="Splice Type"
                                      >
                                        <option value="Fusion">F</option>
                                        <option value="Mechanical">M</option>
                                        <option value="Pass Through">PT</option>
                                      </select>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <button
                          onClick={handleSaveSplices}
                          className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all mt-2"
                        >
                          Apply Splicing Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* TABS 3: Camera Fiber Assignment Tab */}
            {activeTab === 'cameras' && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">CCTV Fiber Assignments</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Patch camera channels to OSP fiber transmission cores</p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-sm font-semibold">
                  <button
                    onClick={() => {
                      setTechMode(true)
                      setWizardStep(1)
                    }}
                    className={`flex-1 py-2 rounded-lg text-center transition-all ${
                      techMode 
                        ? 'bg-indigo-600 text-white font-bold shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Field Tech Mode
                  </button>
                  <button
                    onClick={() => setTechMode(false)}
                    className={`flex-1 py-2 rounded-lg text-center transition-all ${
                      !techMode 
                        ? 'bg-indigo-600 text-white font-bold shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Advanced Mode
                  </button>
                </div>

                {techMode ? (
                  // FIELD TECHNICIAN WIZARD OR ACTIVE SUMMARY
                  (() => {
                    const activeAssignment = (initialData.assignments || []).find(
                      (ass: any) => ass.camera_id === selectedCameraId
                    )

                    if (activeAssignment) {
                      const camera = initialData.cameras.find(c => c.id === selectedCameraId)
                      const sourceNode = initialData.nodes.find(n => n.id === activeAssignment.source_node_id)
                      const enclosure = initialData.enclosures.find(e => e.id === activeAssignment.enclosure_id)
                      const backboneCable = initialData.cables.find(c => c.id === activeAssignment.backbone_cable_id)
                      const dropCable = initialData.cables.find(c => c.id === activeAssignment.drop_cable_id)
                      const cabinet = (initialData.cabinets || []).find((c: any) => c.id === activeAssignment.assigned_cabinet_id)

                      // Find strands assigned to this camera
                      const assStrands = (initialData.assignmentStrands || []).filter(
                        (s: any) => s.camera_fiber_assignment_id === activeAssignment.id
                      )

                      // Find Backbone TX / RX strands
                      const txStrandJoin = assStrands.find((s: any) => s.strand_role === 'TX')
                      const rxStrandJoin = assStrands.find((s: any) => s.strand_role === 'RX')
                      const txStrand = txStrandJoin ? initialData.strands.find((s: any) => s.id === txStrandJoin.strand_id) : null
                      const rxStrand = rxStrandJoin ? initialData.strands.find((s: any) => s.id === rxStrandJoin.strand_id) : null

                      // Find Buffer Tube of Backbone TX/RX
                      const txTube = txStrand ? (initialData.bufferTubes || []).find((t: any) => t.id === txStrand.buffer_tube_id) : null

                      // Query splice statuses for this camera
                      const mhSplices = (initialData.splices || []).filter(
                        (s: any) => s.enclosure_id === activeAssignment.enclosure_id && s.assigned_camera_id === selectedCameraId
                      )
                      const mhComplete = mhSplices.length > 0 && mhSplices.every((s: any) => s.splice_status === 'Completed')

                      const cabinetEnclosure = cabinet ? (initialData.enclosures || []).find((e: any) => e.cabinet_id === cabinet.id) : null
                      const cabSplices = cabinetEnclosure 
                        ? (initialData.splices || []).filter((s: any) => s.enclosure_id === cabinetEnclosure.id && s.assigned_camera_id === selectedCameraId)
                        : []
                      const cabComplete = cabSplices.length > 0 && cabSplices.every((s: any) => s.splice_status === 'Completed')

                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Target Camera</label>
                            <select
                              value={selectedCameraId}
                              onChange={e => {
                                setSelectedCameraId(e.target.value)
                                setWizardStep(1)
                              }}
                              className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                            >
                              <option value="">Select Camera...</option>
                              {initialData.cameras.map(cam => (
                                <option key={cam.id} value={cam.id}>{cam.camera_id_tag} ({cam.status})</option>
                              ))}
                            </select>
                          </div>

                          <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-3.5 text-sm text-slate-350">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-1">
                              <span className="font-bold text-white text-xs uppercase tracking-wider">{camera?.camera_id_tag} Fiber Summary</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                                activeAssignment.fiber_path_status === 'Fiber Pair Complete' 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-950/80 text-amber-400 border border-amber-500/20'
                              }`}>
                                {activeAssignment.fiber_path_status || 'Fiber Pair Assigned'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">Backbone Cable</span>
                                <span className="font-mono text-white font-bold">{backboneCable?.cable_tag || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">Buffer Tube</span>
                                <span className="text-white font-semibold">
                                  {txTube ? `Tube ${String(txTube.tube_number).padStart(2, '0')} - ${txTube.tube_color}` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">TX Fiber (Backbone)</span>
                                <span className="text-white font-semibold inline-flex items-center gap-1.5 mt-0.5">
                                  {txStrand ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full border border-slate-800" style={{ backgroundColor: getFiberColor(txStrand.strand_number).hex }} />
                                      Fiber {txStrand.strand_number} - {getFiberColor(txStrand.strand_number).name}
                                    </>
                                  ) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">RX Fiber (Backbone)</span>
                                <span className="text-white font-semibold inline-flex items-center gap-1.5 mt-0.5">
                                  {rxStrand ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full border border-slate-800" style={{ backgroundColor: getFiberColor(rxStrand.strand_number).hex }} />
                                      Fiber {rxStrand.strand_number} - {getFiberColor(rxStrand.strand_number).name}
                                    </>
                                  ) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">Drop Cable</span>
                                <span className="font-mono text-white font-bold">{dropCable?.cable_tag || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 font-semibold uppercase text-[10px]">CCTV Cabinet</span>
                                <span className="text-white font-semibold">{cabinet?.cabinet_tag || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="border-t border-slate-850 pt-3 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="block font-bold text-white text-xs uppercase tracking-wider">Mainhole Splices</span>
                                  <span className="text-xs text-slate-400 font-medium">Splice at MH Enclosure: {enclosure?.enclosure_tag || sourceNode?.node_tag}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                                    mhComplete 
                                      ? 'bg-emerald-950 text-emerald-450 border border-emerald-500/20' 
                                      : 'bg-amber-950 text-amber-450 border border-amber-500/20'
                                  }`}>
                                    {mhComplete ? 'Complete' : 'Pending'}
                                  </span>
                                  {!mhComplete && (
                                    <button
                                      onClick={() => handleCompleteSplices('mainhole')}
                                      disabled={techLoading}
                                      className="px-2 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] font-bold transition-all"
                                    >
                                      Complete
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                                <div>
                                  <span className="block font-bold text-white text-xs uppercase tracking-wider">Cabinet Splices</span>
                                  <span className="text-xs text-slate-400 font-medium">Splice at Cabinet: {cabinet?.cabinet_tag}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                                    cabComplete 
                                      ? 'bg-emerald-950 text-emerald-450 border border-emerald-500/20' 
                                      : 'bg-amber-950 text-amber-450 border border-amber-500/20'
                                  }`}>
                                    {cabComplete ? 'Complete' : 'Pending'}
                                  </span>
                                  {!cabComplete && (
                                    <button
                                      onClick={() => handleCompleteSplices('cabinet')}
                                      disabled={techLoading}
                                      className="px-2 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] font-bold transition-all"
                                    >
                                      Complete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={() => handleRemoveTechAssignment(selectedCameraId)}
                                disabled={techLoading}
                                className="w-full py-2.5 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 border border-rose-900/20 hover:border-rose-900/40 rounded-xl text-sm font-bold transition-all"
                              >
                                Clear Assignment & Splices
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // WIZARD FLOW
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                          <span className="font-bold text-white text-sm uppercase tracking-wider">
                            Step {wizardStep} of 8: {
                              wizardStep === 1 ? 'Select Camera' :
                              wizardStep === 2 ? 'Select Source Node' :
                              wizardStep === 3 ? 'Select Enclosure' :
                              wizardStep === 4 ? 'Select Backbone Cable' :
                              wizardStep === 5 ? 'Select Buffer Tube' :
                              wizardStep === 6 ? 'Select TX/RX Fiber Pair' :
                              wizardStep === 7 ? 'Select Cabinet' :
                              'Save Assignment'
                            }
                          </span>
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tech Guide</span>
                        </div>

                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full transition-all duration-300" 
                            style={{ width: `${(wizardStep / 8) * 100}%` }}
                          />
                        </div>

                        {/* STEP 1: Select Camera */}
                        {wizardStep === 1 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Target Camera</label>
                              <select
                                value={selectedCameraId}
                                onChange={e => setSelectedCameraId(e.target.value)}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="">Select Camera...</option>
                                {initialData.cameras.map(cam => (
                                  <option key={cam.id} value={cam.id}>{cam.camera_id_tag} ({cam.status})</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => {
                                if (!selectedCameraId) {
                                  showNotification('error', 'Select a camera to continue.')
                                  return
                                }
                                setWizardStep(2)
                              }}
                              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                            >
                              Next Step: Source Node →
                            </button>
                          </div>
                        )}

                        {/* STEP 2: Select Mainhole / Source Node */}
                        {wizardStep === 2 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Source Node / Manhole / Handhole</label>
                              <select
                                value={techSourceNodeId}
                                onChange={e => {
                                  setTechSourceNodeId(e.target.value)
                                  setTechEnclosureId('')
                                  setTechBackboneCableId('')
                                  setTechBufferTubeId('')
                                  setTechTxStrandId('')
                                  setTechRxStrandId('')
                                }}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="">Select Source Node...</option>
                                {initialData.nodes
                                  .filter((n: any) => ['Manhole', 'Handhole', 'Pull Box', 'Existing Fiber Source'].includes(n.node_type))
                                  .map((n: any) => (
                                    <option key={n.id} value={n.id}>{n.node_tag} ({n.node_type})</option>
                                  ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(1)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techSourceNodeId) {
                                    showNotification('error', 'Select a source node to continue.')
                                    return
                                  }
                                  setWizardStep(3)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Select Mainhole Enclosure */}
                        {wizardStep === 3 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Select splice enclosure</label>
                              <select
                                value={techEnclosureId}
                                onChange={e => setTechEnclosureId(e.target.value)}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="">Select Enclosure...</option>
                                {initialData.enclosures
                                  .filter((e: any) => e.node_id === techSourceNodeId)
                                  .map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.enclosure_tag} ({e.enclosure_type})</option>
                                  ))}
                              </select>
                              {initialData.enclosures.filter((e: any) => e.node_id === techSourceNodeId).length === 0 && (
                                <p className="text-xs text-rose-400 mt-1 font-semibold">No enclosures found at the selected node.</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(2)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techEnclosureId) {
                                    showNotification('error', 'Select an enclosure to continue.')
                                    return
                                  }
                                  setWizardStep(4)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: Select Backbone Cable */}
                        {wizardStep === 4 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Backbone Cable</label>
                              <select
                                value={techBackboneCableId}
                                onChange={e => {
                                  setTechBackboneCableId(e.target.value)
                                  setTechBufferTubeId('')
                                  setTechTxStrandId('')
                                  setTechRxStrandId('')
                                }}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="">Select Backbone Cable...</option>
                                {initialData.cables
                                  .filter((c: any) => c.cable_type === 'Backbone')
                                  .map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.cable_tag} ({c.fiber_count} Strands)</option>
                                  ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(3)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techBackboneCableId) {
                                    showNotification('error', 'Select a backbone cable to continue.')
                                    return
                                  }
                                  setWizardStep(5)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 5: Select Buffer Tube */}
                        {wizardStep === 5 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-2">Select Buffer Tube</label>
                              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                                {(initialData.bufferTubes || [])
                                  .filter((t: any) => t.cable_id === techBackboneCableId)
                                  .map((t: any) => {
                                    const count = (initialData.strands || []).filter((s: any) => s.buffer_tube_id === t.id && s.assigned_camera_id).length
                                    const total = (initialData.strands || []).filter((s: any) => s.buffer_tube_id === t.id).length
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                          setTechBufferTubeId(t.id)
                                          setTechTxStrandId('')
                                          setTechRxStrandId('')
                                        }}
                                        className={`p-2.5 rounded-xl border text-left text-xs leading-relaxed transition-all flex flex-col justify-between ${
                                          techBufferTubeId === t.id
                                            ? 'border-indigo-500 bg-indigo-950/20 text-white shadow-md font-semibold'
                                            : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                        }`}
                                      >
                                        <span className="font-bold flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded border border-slate-800" style={{ backgroundColor: getFiberColor(t.tube_number).hex }} />
                                          Tube {String(t.tube_number).padStart(2, '0')} - {t.tube_color}
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1 font-semibold block">
                                          Util: {count} / {total} Cores Assigned
                                        </span>
                                      </button>
                                    )
                                  })}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(4)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techBufferTubeId) {
                                    showNotification('error', 'Select a buffer tube to continue.')
                                    return
                                  }
                                  setWizardStep(6)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 6: Select TX/RX Fiber Pair */}
                        {wizardStep === 6 && (
                          <div className="space-y-4 text-sm">
                            <div className="space-y-3">
                              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Cores in Selected Tube</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">TX Core (Transmit)</label>
                                  <select
                                    value={techTxStrandId}
                                    onChange={e => setTechTxStrandId(e.target.value)}
                                    className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none text-xs"
                                  >
                                    <option value="">Select TX Core...</option>
                                    {initialData.strands
                                      .filter((s: any) => s.buffer_tube_id === techBufferTubeId)
                                      .map((s: any) => {
                                        const color = getFiberColor(s.strand_number)
                                        const isAssigned = s.assigned_camera_id && s.assigned_camera_id !== selectedCameraId
                                        const camName = isAssigned ? initialData.cameras.find(c => c.id === s.assigned_camera_id)?.camera_id_tag : ''
                                        return (
                                          <option key={s.id} value={s.id} disabled={!!isAssigned}>
                                            Fiber {s.strand_number} - {color.name} {isAssigned ? `(Assigned: ${camName})` : '(Available)'}
                                          </option>
                                        )
                                      })}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">RX Core (Receive)</label>
                                  <select
                                    value={techRxStrandId}
                                    onChange={e => setTechRxStrandId(e.target.value)}
                                    className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none text-xs"
                                  >
                                    <option value="">Select RX Core...</option>
                                    {initialData.strands
                                      .filter((s: any) => s.buffer_tube_id === techBufferTubeId)
                                      .map((s: any) => {
                                        const color = getFiberColor(s.strand_number)
                                        const isAssigned = s.assigned_camera_id && s.assigned_camera_id !== selectedCameraId
                                        const camName = isAssigned ? initialData.cameras.find(c => c.id === s.assigned_camera_id)?.camera_id_tag : ''
                                        return (
                                          <option key={s.id} value={s.id} disabled={!!isAssigned}>
                                            Fiber {s.strand_number} - {color.name} {isAssigned ? `(Assigned: ${camName})` : '(Available)'}
                                          </option>
                                        )
                                      })}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(5)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techTxStrandId || !techRxStrandId) {
                                    showNotification('error', 'Select both TX and RX cores.')
                                    return
                                  }
                                  if (techTxStrandId === techRxStrandId) {
                                    showNotification('error', 'TX and RX cores must be different strands.')
                                    return
                                  }
                                  setWizardStep(7)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 7: Select Cabinet */}
                        {wizardStep === 7 && (
                          <div className="space-y-3.5 text-sm">
                            <div>
                              <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Select Target CCTV Cabinet</label>
                              <select
                                value={techCabinetId}
                                onChange={e => setTechCabinetId(e.target.value)}
                                className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                              >
                                <option value="">Select Cabinet...</option>
                                {(initialData.cabinets || []).map((cab: any) => (
                                  <option key={cab.id} value={cab.id}>{cab.cabinet_tag} ({cab.cabinet_type})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setWizardStep(6)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  if (!techCabinetId) {
                                    showNotification('error', 'Select a cabinet to continue.')
                                    return
                                  }
                                  setWizardStep(8)
                                }}
                                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                Next Step →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 8: Save Assignment Summary */}
                        {wizardStep === 8 && (() => {
                          const cam = initialData.cameras.find(c => c.id === selectedCameraId)
                          const node = initialData.nodes.find(n => n.id === techSourceNodeId)
                          const enclosure = initialData.enclosures.find(e => e.id === techEnclosureId)
                          const cable = initialData.cables.find(c => c.id === techBackboneCableId)
                          const txS = initialData.strands.find(s => s.id === techTxStrandId)
                          const rxS = initialData.strands.find(s => s.id === techRxStrandId)
                          const cab = (initialData.cabinets || []).find((c: any) => c.id === techCabinetId)
                          const tube = txS ? (initialData.bufferTubes || []).find((t: any) => t.id === txS.buffer_tube_id) : null

                          return (
                            <div className="space-y-4 text-sm">
                              <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-3 text-[11px] text-slate-350">
                                <span className="block font-bold text-white uppercase text-xs tracking-wider border-b border-slate-850 pb-1.5">
                                  Assignment Summary
                                </span>

                                <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Camera</span>
                                    <span className="text-white font-bold">{cam?.camera_id_tag}</span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Cabinet</span>
                                    <span className="text-white font-bold">{cab?.cabinet_tag}</span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Mainhole Node</span>
                                    <span className="text-white font-semibold">{node?.node_tag}</span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Mainhole Enclosure</span>
                                    <span className="text-white font-semibold">{enclosure?.enclosure_tag}</span>
                                  </div>
                                  <div className="col-span-2 font-mono">
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px] font-sans">Backbone Cable</span>
                                    <span className="text-white font-semibold">{cable?.cable_tag}</span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Buffer Tube</span>
                                    <span className="text-white font-semibold">
                                      {tube ? `Tube ${String(tube.tube_number).padStart(2, '0')} - ${tube.tube_color}` : ''}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-semibold uppercase text-[10px]">Fiber Core Pairs</span>
                                    <span className="text-white font-semibold block mt-0.5">
                                      TX: Fiber {txS?.strand_number} ({getFiberColor(txS?.strand_number || 1).name})
                                    </span>
                                    <span className="text-white font-semibold block">
                                      RX: Fiber {rxS?.strand_number} ({getFiberColor(rxS?.strand_number || 2).name})
                                    </span>
                                  </div>
                                  <div className="col-span-2 border-t border-slate-900 pt-2 text-xs leading-normal text-slate-400">
                                    * Creates Drop Cable: <strong className="text-white font-mono">DROP-{cam?.camera_id_tag}-6F</strong><br />
                                    * Creates Jumper: <strong className="text-white font-mono">PIGTAIL-{cam?.camera_id_tag}</strong><br />
                                    * Creates 4 planned splice records (2 at mainhole, 2 at cabinet)
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWizardStep(7)}
                                  disabled={techLoading}
                                  className="flex-1 py-2.5.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all"
                                >
                                  ← Back
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveTechAssignment}
                                  disabled={techLoading}
                                  className="flex-1 py-2.5.5 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-1.5"
                                >
                                  {techLoading ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : 'Save Assignment ✓'}
                                </button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })()
                ) : (
                  // ORIGINAL ADVANCED MODE
                  <>
                    {/* Form to assign camera */}
                    <div className="space-y-3.5 text-sm border border-slate-850 p-3.5 rounded-xl bg-slate-950/20">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wide border-b border-slate-850 pb-1.5 mb-2">New Core Patch</h5>
                      
                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Target Camera</label>
                        <select
                          value={selectedCameraId}
                          onChange={e => setSelectedCameraId(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        >
                          <option value="">Select Camera...</option>
                          {initialData.cameras.map(cam => (
                            <option key={cam.id} value={cam.id}>{cam.camera_id_tag} ({cam.status})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Installed Fiber Cable</label>
                        <select
                          value={selectedAssignCableId}
                          onChange={e => setSelectedAssignCableId(e.target.value)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        >
                          <option value="">Select Cable...</option>
                          {initialData.cables.map(cab => (
                            <option key={cab.id} value={cab.id}>{cab.cable_id_tag} ({cab.fiber_count} Cores)</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">TX Core</label>
                          <input
                            type="number"
                            min="1"
                            value={assignTxCore}
                            onChange={e => setAssignTxCore(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">RX Core</label>
                          <input
                            type="number"
                            min="1"
                            value={assignRxCore}
                            onChange={e => setAssignRxCore(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-500 block font-semibold uppercase tracking-wide text-xs mb-1">Link Role (Redundancy)</label>
                        <select
                          value={assignLinkRole}
                          onChange={e => setAssignLinkRole(e.target.value as any)}
                          className="w-full px-3.5 py-2.5.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none"
                        >
                          <option value="primary">Primary Route Link</option>
                          <option value="backup">Backup Redundant Link</option>
                        </select>
                      </div>

                      <button
                        onClick={handleAssignCameraFiber}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                      >
                        Patch Core Assignment
                      </button>
                    </div>

                    {/* Assignments List */}
                    <div className="space-y-2 pt-2">
                      <h5 className="font-bold text-slate-400 text-xs uppercase tracking-wide">Active Patch Connections</h5>
                      {initialData.assignments.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No camera fiber patched yet.</p>
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
                              <div key={ass.id} className="border border-slate-850 bg-slate-950/40 p-2.5 rounded-xl flex items-center justify-between text-xs leading-relaxed">
                                <div>
                                  <p className="font-bold text-white">
                                    {camera?.camera_id_tag || 'Unknown'} 
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-indigo-950 text-indigo-400">
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
                  </>
                )}
              </div>
            )}

            {/* TABS 4: Cable Catalog List */}
            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Fiber Cable Specifications</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Available cable configurations in OSP database catalog</p>
                </div>

                <div className="space-y-3">
                  {fiberCatalog.map(cab => (
                    <div key={cab.id} className="border border-slate-850 rounded-xl p-3 bg-slate-950/40 space-y-1.5 text-[11px] hover:border-indigo-500/20 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{cab.manufacturer} {cab.part_number}</span>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                          {cab.grade}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 text-slate-450 font-mono text-xs">
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
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Infrastructure Directory</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Quick lookup and navigation of project fiber assets</p>
                </div>

                <div className="space-y-4">
                  {/* Nodes Section */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Fiber Nodes ({initialData.nodes.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.nodes.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No nodes placed.</div>
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
                            <span className="text-slate-450 text-xs">{n.node_type}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cables Section */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Fiber Cables ({initialData.cables.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.cables.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No cables created.</div>
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
                              <span className="text-xs text-slate-550">{c.cable_type} • {c.fiber_count} Cores • {c.length_ft} ft</span>
                            </div>
                            <span className="text-indigo-400 text-xs font-bold">{c.install_status}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Enclosures Section */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wide">
                      Enclosures ({initialData.enclosures.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.enclosures.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No enclosures.</div>
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
                                <span className="text-xs text-slate-550">Node: {parentNode?.node_tag || 'Unknown'} • Splices: {enc.splice_count}</span>
                              </div>
                              <span className="text-emerald-400 text-xs font-bold">{enc.enclosure_type}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Assignments Section */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wide">
                      Camera Assignments ({initialData.assignments.length})
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {initialData.assignments.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No assignments.</div>
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
                                <span className="text-xs text-slate-550">Node: {node?.node_tag || 'None'}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-indigo-400 text-xs font-bold">{ass.fiber_path_status}</span>
                                <span className="text-[10px] text-slate-550">S: {ass.splice_status} | T: {ass.test_status}</span>
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

      {/* Confirm Modal Backdrop & Dialog */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="17"/></svg>
              </span>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{confirmModal.title}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

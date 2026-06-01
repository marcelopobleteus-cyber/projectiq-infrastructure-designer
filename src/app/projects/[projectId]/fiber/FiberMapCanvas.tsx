'use client'

import React, { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/utils/supabase/client'
import { 
  createFiberNode, 
  deleteFiberNode, 
  createFiberRoute, 
  deleteFiberRoute, 
  saveFiberSplices, 
  assignCameraFiber, 
  removeCameraFiber 
} from '../../actions-fiber'

interface FiberMapCanvasProps {
  projectId: string
  initialData: {
    nodes: any[]
    enclosures: any[]
    routes: any[]
    segments: any[]
    cables: any[]
    splices: any[]
    assignments: any[]
    cameras: any[]
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
  // Modes: 'select' (default), 'handhole', 'pull_box', 'splice_enclosure', 'draw_route'
  const [toolMode, setToolMode] = useState<'select' | 'handhole' | 'pull_box' | 'splice_enclosure' | 'draw_route'>('select')
  const [tempRoutePoints, setTempRoutePoints] = useState<google.maps.LatLngLiteral[]>([])
  const [tempPolyline, setTempPolyline] = useState<google.maps.Polyline | null>(null)

  // Sidebar States
  const [activeTab, setActiveTab] = useState<'catalog' | 'properties' | 'splice' | 'cameras'>('properties')
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

      // Draw Polyline path
      const poly = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: '#818cf8',
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

      polylinesRef.current.push(poly)
    })

    // Draw Nodes (markers)
    initialData.nodes.forEach(node => {
      let iconColor = '#10b981' // Green for handhole
      let shape = 'circle'
      if (node.node_type === 'pull_box') {
        iconColor = '#64748b' // Slate for pull box
        shape = 'square'
      } else if (node.node_type === 'splice_enclosure') {
        iconColor = '#6366f1' // Indigo for splice enclosure
        shape = 'hex'
      }

      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${iconColor}" stroke="#ffffff" stroke-width="2"/>
          <text x="12" y="15" fill="#ffffff" font-size="9" font-family="monospace" font-weight="bold" text-anchor="middle">
            ${node.node_id_tag.substring(0, 3)}
          </text>
        </svg>
      `

      const marker = new google.maps.Marker({
        position: { lat: node.latitude, lng: node.longitude },
        map: map,
        draggable: true,
        title: `${node.node_id_tag} (${node.node_type.toUpperCase()})`,
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
        setNodeIdTag(node.node_id_tag)
        setNodeSize(node.size_dims)
        setNodeElevation(Number(node.elevation_m))
        setNodeSlack(Number(node.slack_feet))
        setNodeNotes(node.notes || '')

        const enclosure = initialData.enclosures.find(e => e.id === node.id)
        if (enclosure) {
          setNodeClosureType(enclosure.closure_type)
          setNodeCapacity(enclosure.capacity)
        }
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
            showNotification('success', `Moved node ${node.node_id_tag}`)
            // Revalidate page dynamically by reloading or updating local data
            window.location.reload()
          }
        } catch (err) {
          console.error(err)
        }
      })

      markersRef.current.push(marker)
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
    const typeLabel = toolMode === 'handhole' ? 'HH' : toolMode === 'pull_box' ? 'PB' : 'SE'
    const matchCount = initialData.nodes.filter(n => n.node_type === toolMode).length + 1
    const tag = `${typeLabel}-${String(matchCount).padStart(3, '0')}`

    const res = await createFiberNode({
      projectId,
      nodeIdTag: tag,
      nodeType: toolMode,
      latitude: lat,
      longitude: lng,
      elevationM: 0.0,
      sizeDims: toolMode === 'handhole' ? '24x36x36' : toolMode === 'pull_box' ? '12x12x6' : 'Dome Closure',
      slackFeet: toolMode === 'handhole' ? 20.0 : 0.0,
      closureType: toolMode === 'splice_enclosure' ? 'Dome Closure' : undefined,
      capacity: toolMode === 'splice_enclosure' ? 24 : undefined
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
          node_id_tag: nodeIdTag,
          size_dims: nodeSize,
          elevation_m: nodeElevation,
          slack_feet: nodeSlack,
          notes: nodeNotes
        })
        .eq('id', selectedNode.id)

      if (nodeErr) {
        showNotification('error', `Failed to update node: ${nodeErr.message}`)
        return
      }

      // If splice enclosure, update enclosures table
      if (selectedNode.node_type === 'splice_enclosure') {
        const { error: encErr } = await supabase
          .from('fiber_enclosures')
          .update({
            closure_type: nodeClosureType,
            capacity: nodeCapacity,
            spare_fibers: nodeCapacity - (initialData.splices.filter(s => s.node_id === selectedNode.id).length)
          })
          .eq('id', selectedNode.id)

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

    const splicesToSave = Object.keys(spliceConfig).map(numAStr => {
      const numA = parseInt(numAStr, 10)
      const numB = spliceConfig[numA]
      return {
        cableAId: spliceCableA,
        cableBId: spliceCableB,
        fiberNumA: numA,
        fiberNumB: numB,
        color: getFiberColor(numA).name.toLowerCase(),
        status: 'active' as const
      }
    })

    const res = await saveFiberSplices({
      projectId,
      nodeId: selectedNode.id,
      splices: splicesToSave
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', 'Splice matrix core patching saved successfully!')
      window.location.reload()
    }
  }

  // Camera fiber patching handler
  const handleAssignCameraFiber = async () => {
    if (!selectedCameraId || !selectedAssignCableId) {
      showNotification('error', 'Choose both camera and fiber cable.')
      return
    }

    if (!selectedNode) {
      showNotification('error', 'Select a splice enclosure on the map first.')
      return
    }

    const res = await assignCameraFiber({
      projectId,
      cameraId: selectedCameraId,
      cableId: selectedAssignCableId,
      enclosureId: selectedNode.id,
      txCore: assignTxCore,
      rxCore: assignRxCore,
      linkRole: assignLinkRole
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', `Patched camera to cores ${assignTxCore}/${assignRxCore}`)
      window.location.reload()
    }
  }

  // Unpatch camera fiber handler
  const handleRemoveCameraFiber = async (camId: string, linkRole: 'primary' | 'backup') => {
    if (!confirm('Are you sure you want to unpatch this camera fiber assignment?')) return

    const res = await removeCameraFiber({
      projectId,
      cameraId: camId,
      linkRole
    })

    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', 'Fiber core assignment unpatched.')
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
          <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-850 p-1.5 rounded-xl shadow-xl flex items-center gap-1">
            <button
              onClick={() => { setToolMode('select'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'select' ? 'bg-indigo-650 text-white shadow-inner shadow-indigo-950/20' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Select
            </button>
            <div className="w-px h-4 bg-slate-800" />
            <button
              onClick={() => { setToolMode('handhole'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'handhole' ? 'bg-emerald-650 text-white shadow-inner shadow-emerald-950/20' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              + Place Handhole
            </button>
            <button
              onClick={() => { setToolMode('pull_box'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'pull_box' ? 'bg-slate-750 text-white' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              + Pull Box
            </button>
            <button
              onClick={() => { setToolMode('splice_enclosure'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'splice_enclosure' ? 'bg-indigo-650 text-white' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              + Splice Enclosure
            </button>
            <div className="w-px h-4 bg-slate-800" />
            <button
              onClick={() => { setToolMode('draw_route'); setTempRoutePoints([]) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                toolMode === 'draw_route' ? 'bg-rose-650 text-white' : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Draw Route
            </button>

            {/* Route draw active buttons */}
            {toolMode === 'draw_route' && tempRoutePoints.length > 1 && (
              <>
                <button
                  onClick={handleFinishRoute}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white rounded-lg text-[10px] font-bold uppercase"
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
              className={`flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'properties' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setActiveTab('splice')}
              className={`flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'splice' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
              disabled={!selectedNode || selectedNode.node_type !== 'splice_enclosure'}
              title={(!selectedNode || selectedNode.node_type !== 'splice_enclosure') ? 'Select a Splice Enclosure on the map first' : ''}
            >
              Splice
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'cameras' ? 'border-indigo-500 text-white bg-slate-950/20' : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              Cameras
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
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
                
                {/* 1. Default (No selection) */}
                {!selectedNode && !selectedRoute && (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <svg className="mx-auto text-slate-650" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                    <p className="text-xs uppercase tracking-wider font-bold">No Node Selected</p>
                    <p className="text-[10px] text-slate-450 max-w-[220px] mx-auto leading-normal">
                      Click a handhole marker or route path polyline on the map to view/edit technical specs.
                    </p>
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
                        onClick={() => handleDeleteNode(selectedNode.id, selectedNode.node_id_tag)}
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
                  <p className="text-[10px] text-slate-400 mt-0.5">Patch fiber cores inside {selectedNode.node_id_tag}</p>
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
                        const cable = initialData.cables.find(c => c.id === ass.cable_id)
                        
                        return (
                          <div key={ass.id} className="border border-slate-850 bg-slate-950/40 p-2.5 rounded-xl flex items-center justify-between text-[10px] leading-relaxed">
                            <div>
                              <p className="font-bold text-white">
                                {camera?.camera_id_tag || 'Unknown'} 
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${
                                  ass.link_role === 'primary' ? 'bg-indigo-950 text-indigo-400' : 'bg-rose-950 text-rose-400'
                                }`}>
                                  {ass.link_role}
                                </span>
                              </p>
                              <p className="text-slate-450 mt-0.5">
                                Cable: {cable?.cable_id_tag || 'CAB-N/A'} | Cores: TX-{ass.tx_core} / RX-{ass.rx_core}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveCameraFiber(ass.camera_id, ass.link_role as any)}
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

          </div>
        </aside>
      </div>

    </div>
  )
}

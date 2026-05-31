'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Database } from '@/types/supabase'
import {
  createCameraLocation,
  updateCameraCoordinates,
  updateCameraDetails,
  deleteCameraLocation
} from '../actions-sprint2'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']

interface ProjectMapCanvasProps {
  projectId: string
  initialCameras: CameraLocation[]
  cameraModels: CameraModel[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  googleMapsApiKey: string | undefined
}

export default function ProjectMapCanvas({
  projectId,
  initialCameras,
  cameraModels,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  googleMapsApiKey
}: ProjectMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [cameras, setCameras] = useState<CameraLocation[]>(initialCameras)
  const [selectedCamera, setSelectedCamera] = useState<CameraLocation | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Side panel form states
  const [tag, setTag] = useState('')
  const [modelId, setModelId] = useState('')
  const [status, setStatus] = useState<Database['public']['Enums']['camera_status']>('planned')
  const [commType, setCommType] = useState<Database['public']['Enums']['comm_type']>('copper')
  const [powerType, setPowerType] = useState<Database['public']['Enums']['power_type']>('poe')
  const [addressRef, setAddressRef] = useState('')
  const [structureRef, setStructureRef] = useState('')
  const [notes, setNotes] = useState('')
  
  const [panelMessage, setPanelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Map markers dictionary
  const markersRef = useRef<{ [id: string]: google.maps.Marker }>({})
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)

  // Update cameras state if initialCameras prop changes
  useEffect(() => {
    setCameras(initialCameras)
  }, [initialCameras])

  // Sync side panel inputs when selected camera changes
  useEffect(() => {
    if (selectedCamera) {
      setTag(selectedCamera.camera_id_tag)
      setModelId(selectedCamera.camera_model_id)
      setStatus(selectedCamera.status)
      setCommType(selectedCamera.communication_type)
      setPowerType(selectedCamera.power_type)
      setAddressRef(selectedCamera.address_reference || '')
      setStructureRef(selectedCamera.structure_reference || '')
      setNotes(selectedCamera.notes || '')
      setPanelMessage(null)
    } else {
      setTag('')
      setModelId('')
      setStatus('planned')
      setCommType('copper')
      setPowerType('poe')
      setAddressRef('')
      setStructureRef('')
      setNotes('')
      setPanelMessage(null)
    }
  }, [selectedCamera])

  // Colored SVG pins generator
  const getMarkerIcon = (status: Database['public']['Enums']['camera_status'], isSelected = false) => {
    let color = '#64748b' // Gray for planned (planned is gray)
    if (status === 'in_progress') color = '#eab308' // Yellow
    if (status === 'complete') color = '#22c55e' // Green
    if (status === 'issue') color = '#ef4444' // Red

    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: isSelected ? '#ffffff' : '#0f172a',
      strokeWeight: isSelected ? 3 : 1.5,
      scale: isSelected ? 1.6 : 1.4,
      anchor: new google.maps.Point(12, 22),
    }
  }

  // Load Google Maps API and initialize map
  useEffect(() => {
    if (!googleMapsApiKey || !mapRef.current) return

    setOptions({
      key: googleMapsApiKey,
      v: 'weekly',
    })

    importLibrary('maps').then((mapsLib) => {
      if (!mapRef.current) return
      
      const newMap = new mapsLib.Map(mapRef.current, {
        center: { lat: defaultLatitude, lng: defaultLongitude },
        zoom: defaultZoom,
        mapTypeId: 'hybrid', //Satellite/hybrid as default
        tilt: 0,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      setMap(newMap)
    }).catch(err => {
      console.error('Failed to load Google Maps API:', err)
    })
  }, [googleMapsApiKey, defaultLatitude, defaultLongitude, defaultZoom])

  // Synchronize Markers on Map when cameras list changes
  useEffect(() => {
    if (!map) return

    // Remove obsolete markers
    const currentCameraIds = new Set(cameras.map(c => c.id))
    Object.keys(markersRef.current).forEach(id => {
      if (!currentCameraIds.has(id)) {
        markersRef.current[id].setMap(null)
        delete markersRef.current[id]
      }
    })

    // Add or Update markers
    cameras.forEach(cam => {
      const isSelected = selectedCamera?.id === cam.id
      const position = { lat: cam.latitude, lng: cam.longitude }
      const icon = getMarkerIcon(cam.status, isSelected)

      if (markersRef.current[cam.id]) {
        // Update existing marker position, icon, and title
        const marker = markersRef.current[cam.id]
        marker.setPosition(position)
        marker.setIcon(icon)
        marker.setTitle(`${cam.camera_id_tag} (${cam.status})`)
      } else {
        // Create new marker
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon,
          title: `${cam.camera_id_tag} (${cam.status})`,
        })

        // Click marker to select
        marker.addListener('click', () => {
          setSelectedCamera(cam)
        })

        // Drag marker to update coordinates
        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition()
          if (!newPos) return

          const newLat = newPos.lat()
          const newLng = newPos.lng()

          // Optimistically update coordinates locally
          setCameras(prev => prev.map(c => c.id === cam.id ? { ...c, latitude: newLat, longitude: newLng } : c))
          if (selectedCamera?.id === cam.id) {
            setSelectedCamera(prev => prev ? { ...prev, latitude: newLat, longitude: newLng } : null)
          }

          // Trigger server update
          const result = await updateCameraCoordinates({
            id: cam.id,
            projectId,
            latitude: newLat,
            longitude: newLng
          })

          if (result.error) {
            alert(result.error)
            // Rollback on error
            setCameras(cameras)
          }
        })

        markersRef.current[cam.id] = marker
      }
    })
  }, [cameras, map, selectedCamera, projectId])

  // Setup click listener for Adding Cameras on Map Click
  useEffect(() => {
    if (!map) return

    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }

    if (addMode) {
      // Set crosshair cursor on add mode
      map.setOptions({ draggableCursor: 'crosshair' })

      clickListenerRef.current = map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng
        if (!latLng) return

        const lat = latLng.lat()
        const lng = latLng.lng()

        startTransition(async () => {
          const result = await createCameraLocation({
            projectId,
            latitude: lat,
            longitude: lng
          })

          if (result.error) {
            alert(result.error)
          } else if (result.success && result.data) {
            // Update camera list with the new camera
            setCameras(prev => [...prev, result.data as CameraLocation])
            setSelectedCamera(result.data as CameraLocation)
          }
        })
      })
    } else {
      // Revert to default grab cursor
      map.setOptions({ draggableCursor: null })
    }

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
  }, [addMode, map, projectId])

  // Toolbar Actions
  const handleRefresh = async () => {
    // Basic reload simulation by triggering parent revalidation or reading state
    window.location.reload()
  }

  const handleFitToCameras = () => {
    if (!map || cameras.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    cameras.forEach(cam => {
      bounds.extend({ lat: cam.latitude, lng: cam.longitude })
    })
    map.fitBounds(bounds)

    // Limit maximum zoom when fitting single or very close markers
    const listener = map.addListener('bounds_changed', () => {
      if (map.getZoom()! > 20) {
        map.setZoom(20)
      }
      google.maps.event.removeListener(listener)
    })
  }

  // Side Panel Edit Form Save Handler
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCamera) return

    setPanelMessage(null)

    const details = {
      camera_id_tag: tag,
      camera_model_id: modelId,
      status,
      communication_type: commType,
      power_type: powerType,
      address_reference: addressRef || null,
      structure_reference: structureRef || null,
      notes: notes || null,
    }

    startTransition(async () => {
      const result = await updateCameraDetails({
        id: selectedCamera.id,
        projectId,
        details
      })

      if (result.error) {
        setPanelMessage({ type: 'error', text: result.error })
      } else if (result.success && result.data) {
        setPanelMessage({ type: 'success', text: 'Camera settings saved successfully!' })
        // Update local list
        setCameras(prev => prev.map(c => c.id === selectedCamera.id ? (result.data as CameraLocation) : c))
        setSelectedCamera(result.data as CameraLocation)
      }
    })
  }

  const handleDeleteCamera = async () => {
    if (!selectedCamera) return
    if (!confirm(`Are you sure you want to delete ${selectedCamera.camera_id_tag}?`)) return

    startTransition(async () => {
      const result = await deleteCameraLocation({
        id: selectedCamera.id,
        projectId
      })

      if (result.error) {
        setPanelMessage({ type: 'error', text: result.error })
      } else {
        // Remove from local state
        setCameras(prev => prev.filter(c => c.id !== selectedCamera.id))
        setSelectedCamera(null)
      }
    })
  }

  // Return warning banner if Google Maps API Key is missing
  if (!googleMapsApiKey) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/50" />
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Google Maps API Key Missing</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            The active coordinate layout requires a Google Maps API Key to render project satellite and camera locations.
          </p>
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 mt-6 text-left max-w-lg mx-auto font-mono text-xs text-slate-350 space-y-2">
            <div>1. Open your local project directory configuration.</div>
            <div>2. Add the following to your <span className="text-amber-400">.env.local</span> file:</div>
            <div className="p-2 bg-slate-950 border border-slate-850 rounded-lg text-white mt-1 select-all select-none">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
            </div>
            <div className="mt-2">3. Reload this page once the key has been configured.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddMode(!addMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all shadow-md ${
              addMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10 scale-[0.98]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
            }`}
          >
            {addMode ? (
              <>
                <svg className="animate-pulse" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Exit Add Mode
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Add Camera Mode
              </>
            )}
          </button>
          
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-all"
            title="Refresh Cameras"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></svg>
          </button>

          <button
            onClick={handleFitToCameras}
            disabled={cameras.length === 0}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all"
            title="Fit map to all cameras"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            <span className="text-slate-400">Total Cameras:</span>
            <span className="font-bold text-white font-mono">{cameras.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Map & Details Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Canvas */}
        <div className="lg:col-span-2 relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner h-[600px] flex items-center justify-center">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          
          {addMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-md text-slate-950 text-xs px-4 py-2 rounded-full font-semibold shadow-lg z-10 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              Click anywhere on the map to place a camera
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
                <svg className="animate-spin text-indigo-500" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-sm font-medium text-white">Updating map data...</span>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Camera Configuration */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[600px] overflow-hidden">
          {selectedCamera ? (
            <form onSubmit={handleSaveDetails} className="flex flex-col h-full justify-between">
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="flex justify-between items-start border-b border-slate-850 pb-4 mb-2">
                  <div>
                    <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getMarkerIcon(selectedCamera.status).fillColor }} />
                      {selectedCamera.camera_id_tag} Details
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Edit camera hardware & spatial metadata</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCamera(null)}
                    className="p-1 rounded bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {panelMessage && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    panelMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {panelMessage.text}
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Camera Tag
                    </label>
                    <input
                      type="text"
                      required
                      value={tag}
                      onChange={e => setTag(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Camera Model
                    </label>
                    <select
                      value={modelId}
                      onChange={e => setModelId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    >
                      {cameraModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.manufacturer} - {model.model_number} ({model.resolution})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Comm Type
                      </label>
                      <select
                        value={commType}
                        onChange={e => setCommType(e.target.value as Database['public']['Enums']['comm_type'])}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs"
                      >
                        <option value="copper">Copper</option>
                        <option value="fiber">Fiber</option>
                        <option value="wireless">Wireless</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Power Type
                      </label>
                      <select
                        value={powerType}
                        onChange={e => setPowerType(e.target.value as Database['public']['Enums']['power_type'])}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs"
                      >
                        <option value="poe">PoE</option>
                        <option value="poe+">PoE+</option>
                        <option value="local">Local</option>
                        <option value="solar">Solar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Installation Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as Database['public']['Enums']['camera_status'])}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    >
                      <option value="planned">Planned (Gray)</option>
                      <option value="in_progress">In Progress (Yellow)</option>
                      <option value="complete">Complete (Green)</option>
                      <option value="issue">Issue (Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Address Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100 Main St North Entrance"
                      value={addressRef}
                      onChange={e => setAddressRef(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Structure Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Utility Pole #24, Light Mast"
                      value={structureRef}
                      onChange={e => setStructureRef(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Installation Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Field description, obstruction details..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-3 text-[10px] text-slate-400 font-mono">
                    <div>Lat: {selectedCamera.latitude.toFixed(6)}</div>
                    <div>Lng: {selectedCamera.longitude.toFixed(6)}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCamera}
                  disabled={isPending}
                  className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-medium rounded-xl transition-all active:scale-[0.98] text-xs focus:outline-none disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] text-xs focus:outline-none"
                >
                  {isPending ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 p-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">No Camera Selected</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Select an existing camera pin on the map to display and configure its layout specifications, or enable <span className="text-indigo-400 font-medium">Add Camera Mode</span> to insert a new node.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

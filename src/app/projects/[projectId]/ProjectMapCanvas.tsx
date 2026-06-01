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
import {
  createNetworkDevice,
  updateNetworkDeviceCoordinates,
  updateNetworkDeviceDetails,
  deleteNetworkDevice,
  getSwitchPorts,
  assignCameraToPort,
  unassignCameraFromPort
} from '../actions-sprint3'
import ContextSidebar from '@/components/layout/ContextSidebar'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']
type NetworkDevice = Database['public']['Tables']['network_devices']['Row']
type SwitchPort = Database['public']['Tables']['switch_ports']['Row']

// Extended SwitchPort type with joined camera model details
interface SwitchPortWithCamera extends SwitchPort {
  assigned_camera?: {
    id: string
    camera_id_tag: string
    status: Database['public']['Enums']['camera_status']
    camera_models?: {
      id: string
      manufacturer: string
      model_number: string
      default_poe_draw: number
    } | null
  } | null
}

interface ProjectMapCanvasProps {
  projectId: string
  initialCameras: CameraLocation[]
  initialNetworkDevices: NetworkDevice[]
  cameraModels: CameraModel[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  googleMapsApiKey: string | undefined
}

export default function ProjectMapCanvas({
  projectId,
  initialCameras,
  initialNetworkDevices,
  cameraModels,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  googleMapsApiKey
}: ProjectMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'roadmap' | 'satellite'>('hybrid')
  
  // Elements states
  const [cameras, setCameras] = useState<CameraLocation[]>(initialCameras)
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>(initialNetworkDevices)
  const [showCameras, setShowCameras] = useState(true)
  const [showDevices, setShowDevices] = useState(true)
  
  // Selected drawers
  const [selectedCamera, setSelectedCamera] = useState<CameraLocation | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null)
  
  // Adding modes
  const [addCameraMode, setAddCameraMode] = useState(false)
  const [addDeviceMode, setAddDeviceMode] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Switch ports state for assignments (loaded on selecting a switch or camera)
  const [switchPorts, setSwitchPorts] = useState<SwitchPortWithCamera[]>([])
  const [loadingPorts, setLoadingPorts] = useState(false)

  // Camera side panel form states
  const [cameraTag, setCameraTag] = useState('')
  const [cameraModelId, setCameraModelId] = useState('')
  const [cameraStatus, setCameraStatus] = useState<Database['public']['Enums']['camera_status']>('planned')
  const [cameraCommType, setCameraCommType] = useState<Database['public']['Enums']['comm_type']>('copper')
  const [cameraPowerType, setCameraPowerType] = useState<Database['public']['Enums']['power_type']>('poe')
  const [cameraAddressRef, setCameraAddressRef] = useState('')
  const [cameraStructureRef, setCameraStructureRef] = useState('')
  const [cameraNotes, setCameraNotes] = useState('')
  const [assignedSwitchId, setAssignedSwitchId] = useState('')
  const [assignedPortId, setAssignedPortId] = useState('')
  const [cameraPanelMessage, setCameraPanelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Network device side panel form states
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState<Database['public']['Enums']['device_type']>('switch')
  const [deviceBrand, setDeviceBrand] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [deviceIp, setDeviceIp] = useState('')
  const [deviceRackUnit, setDeviceRackUnit] = useState('')
  const [deviceTotalPorts, setDeviceTotalPorts] = useState(8)
  const [devicePoeBudget, setDevicePoeBudget] = useState(120)
  const [deviceLocRef, setDeviceLocRef] = useState('')
  const [devicePanelMessage, setDevicePanelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Map markers dictionaries
  const cameraMarkersRef = useRef<{ [id: string]: google.maps.Marker }>({})
  const deviceMarkersRef = useRef<{ [id: string]: google.maps.Marker }>({})
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)

  // Sync props to state
  useEffect(() => {
    setCameras(initialCameras)
  }, [initialCameras])

  useEffect(() => {
    setNetworkDevices(initialNetworkDevices)
  }, [initialNetworkDevices])

  // Fetch switch ports helper
  const loadSwitchPorts = async (switchId: string) => {
    setLoadingPorts(true)
    try {
      const ports = await getSwitchPorts(switchId)
      setSwitchPorts(ports as SwitchPortWithCamera[])
    } catch (err) {
      console.error('Failed to load switch ports:', err)
    } finally {
      setLoadingPorts(false)
    }
  }

  // Load ports when selected camera changes
  useEffect(() => {
    if (selectedCamera) {
      setSelectedDevice(null)
      setCameraTag(selectedCamera.camera_id_tag)
      setCameraModelId(selectedCamera.camera_model_id)
      setCameraStatus(selectedCamera.status)
      setCameraCommType(selectedCamera.communication_type)
      setCameraPowerType(selectedCamera.power_type)
      setCameraAddressRef(selectedCamera.address_reference || '')
      setCameraStructureRef(selectedCamera.structure_reference || '')
      setCameraNotes(selectedCamera.notes || '')
      setAssignedSwitchId(selectedCamera.assigned_network_device_id || '')
      setCameraPanelMessage(null)

      // Find if this camera is assigned to a switch port
      if (selectedCamera.assigned_network_device_id) {
        loadSwitchPorts(selectedCamera.assigned_network_device_id).then(() => {
          // Find port number assigned
          const port = switchPorts.find(p => p.assigned_camera_location_id === selectedCamera.id)
          setAssignedPortId(port?.id || '')
        })
      } else {
        setSwitchPorts([])
        setAssignedPortId('')
      }
    }
  }, [selectedCamera])

  // Reload ports list when camera's assigned switch changes in dropdown
  useEffect(() => {
    if (assignedSwitchId && selectedCamera) {
      loadSwitchPorts(assignedSwitchId)
    } else {
      setSwitchPorts([])
      setAssignedPortId('')
    }
  }, [assignedSwitchId])

  // Sync network device sidebar fields
  useEffect(() => {
    if (selectedDevice) {
      setSelectedCamera(null)
      setDeviceName(selectedDevice.name)
      setDeviceType(selectedDevice.device_type)
      setDeviceBrand(selectedDevice.manufacturer || '')
      setDeviceModel(selectedDevice.model_number || '')
      setDeviceIp(selectedDevice.ip_address || '')
      setDeviceRackUnit(selectedDevice.rack_unit || '')
      setDeviceTotalPorts(selectedDevice.total_ports || 8)
      setDevicePoeBudget(selectedDevice.poe_budget_watts || 0)
      setDeviceLocRef(selectedDevice.location_reference || '')
      setDevicePanelMessage(null)

      if (selectedDevice.device_type === 'switch') {
        loadSwitchPorts(selectedDevice.id)
      } else {
        setSwitchPorts([])
      }
    }
  }, [selectedDevice])

  // Map layer controls
  const handleLayerChange = (layer: 'hybrid' | 'roadmap' | 'satellite') => {
    setActiveLayer(layer)
    if (map) {
      map.setMapTypeId(layer)
    }
  }

  // Colored SVG pins generator for Cameras
  const getCameraMarkerIcon = (status: Database['public']['Enums']['camera_status'], isSelected = false) => {
    let color = '#64748b' // Gray for planned
    if (status === 'in_progress') color = '#eab308' // Yellow
    if (status === 'complete') color = '#22c55e' // Green
    if (status === 'issue') color = '#ef4444' // Red

    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: isSelected ? '#ffffff' : '#0f172a',
      strokeWeight: isSelected ? 3 : 1.5,
      scale: isSelected ? 1.5 : 1.3,
      anchor: typeof google !== 'undefined' && google.maps ? new google.maps.Point(12, 22) : undefined,
    }
  }

  // Styled SVG pins generator for Network Devices
  const getNetworkMarkerIcon = (type: Database['public']['Enums']['device_type'], isSelected = false) => {
    let color = '#2563eb' // Blue for switch
    if (type === 'nvr') color = '#8b5cf6' // Purple
    if (type === 'cabinet_device') color = '#f97316' // Orange
    if (type === 'router') color = '#06b6d4' // Cyan
    if (type === 'other') color = '#64748b' // Slate

    // Server-rack visual SVG path
    return {
      path: 'M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm3 2h14v2H5V7zm0 4h14v2H5v-2zm0 4h14v2H5v-2z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: isSelected ? '#ffffff' : '#0f172a',
      strokeWeight: isSelected ? 3 : 1.5,
      scale: isSelected ? 1.3 : 1.1,
      anchor: typeof google !== 'undefined' && google.maps ? new google.maps.Point(12, 12) : undefined,
    }
  }

  // Initialize Map
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
        mapTypeId: activeLayer,
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

  // Synchronize Camera Markers
  useEffect(() => {
    if (!map) return

    // Remove hidden or obsolete camera markers
    Object.keys(cameraMarkersRef.current).forEach(id => {
      const cam = cameras.find(c => c.id === id)
      if (!cam || !showCameras) {
        cameraMarkersRef.current[id].setMap(null)
        delete cameraMarkersRef.current[id]
      }
    })

    if (!showCameras) return

    // Add or Update camera markers
    cameras.forEach(cam => {
      const isSelected = selectedCamera?.id === cam.id
      const position = { lat: cam.latitude, lng: cam.longitude }
      const icon = getCameraMarkerIcon(cam.status, isSelected)

      if (cameraMarkersRef.current[cam.id]) {
        const marker = cameraMarkersRef.current[cam.id]
        marker.setPosition(position)
        marker.setIcon(icon)
        marker.setTitle(`${cam.camera_id_tag} (${cam.status})`)
      } else {
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon,
          title: `${cam.camera_id_tag} (${cam.status})`,
        })

        marker.addListener('click', () => {
          setSelectedCamera(cam)
        })

        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition()
          if (!newPos) return

          const newLat = newPos.lat()
          const newLng = newPos.lng()

          setCameras(prev => prev.map(c => c.id === cam.id ? { ...c, latitude: newLat, longitude: newLng } : c))
          if (selectedCamera?.id === cam.id) {
            setSelectedCamera(prev => prev ? { ...prev, latitude: newLat, longitude: newLng } : null)
          }

          const result = await updateCameraCoordinates({
            id: cam.id,
            projectId,
            latitude: newLat,
            longitude: newLng
          })

          if (result.error) {
            alert(result.error)
            setCameras(cameras) // Rollback
          }
        })

        cameraMarkersRef.current[cam.id] = marker
      }
    })
  }, [cameras, map, selectedCamera, showCameras, projectId])

  // Synchronize Network Device Markers
  useEffect(() => {
    if (!map) return

    // Remove hidden/obsolete markers
    Object.keys(deviceMarkersRef.current).forEach(id => {
      const dev = networkDevices.find(d => d.id === id)
      const hasCoords = dev && dev.latitude !== null && dev.longitude !== null
      if (!dev || !hasCoords || !showDevices) {
        deviceMarkersRef.current[id].setMap(null)
        delete deviceMarkersRef.current[id]
      }
    })

    if (!showDevices) return

    // Add or Update markers
    networkDevices.forEach(dev => {
      if (dev.latitude === null || dev.longitude === null) return
      
      const isSelected = selectedDevice?.id === dev.id
      const position = { lat: dev.latitude, lng: dev.longitude }
      const icon = getNetworkMarkerIcon(dev.device_type, isSelected)

      if (deviceMarkersRef.current[dev.id]) {
        const marker = deviceMarkersRef.current[dev.id]
        marker.setPosition(position)
        marker.setIcon(icon)
        marker.setTitle(`${dev.name} (${dev.device_type})`)
      } else {
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon,
          title: `${dev.name} (${dev.device_type})`,
        })

        marker.addListener('click', () => {
          setSelectedDevice(dev)
        })

        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition()
          if (!newPos) return

          const newLat = newPos.lat()
          const newLng = newPos.lng()

          setNetworkDevices(prev => prev.map(d => d.id === dev.id ? { ...d, latitude: newLat, longitude: newLng } : d))
          if (selectedDevice?.id === dev.id) {
            setSelectedDevice(prev => prev ? { ...prev, latitude: newLat, longitude: newLng } : null)
          }

          const result = await updateNetworkDeviceCoordinates({
            id: dev.id,
            projectId,
            latitude: newLat,
            longitude: newLng
          })

          if (result.error) {
            alert(result.error)
            setNetworkDevices(networkDevices) // Rollback
          }
        })

        deviceMarkersRef.current[dev.id] = marker
      }
    })
  }, [networkDevices, map, selectedDevice, showDevices, projectId])

  // Setup click listeners for map addition modes
  useEffect(() => {
    if (!map) return

    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }

    if (addCameraMode || addDeviceMode) {
      map.setOptions({ draggableCursor: 'crosshair' })

      clickListenerRef.current = map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng
        if (!latLng) return

        const lat = latLng.lat()
        const lng = latLng.lng()

        startTransition(async () => {
          if (addCameraMode) {
            const result = await createCameraLocation({
              projectId,
              latitude: lat,
              longitude: lng
            })

            if (result.error) {
              alert(result.error)
            } else if (result.success && result.data) {
              setCameras(prev => [...prev, result.data as CameraLocation])
              setSelectedCamera(result.data as CameraLocation)
              setAddCameraMode(false) // Exit mode on creation
            }
          } else if (addDeviceMode) {
            const result = await createNetworkDevice({
              projectId,
              deviceType: 'switch', // Default type is switch
              totalPorts: 8,
              poeBudgetWatts: 120,
              latitude: lat,
              longitude: lng
            })

            if (result.error) {
              alert(result.error)
            } else if (result.success && result.data) {
              setNetworkDevices(prev => [...prev, result.data as NetworkDevice])
              setSelectedDevice(result.data as NetworkDevice)
              setAddDeviceMode(false) // Exit mode on creation
            }
          }
        })
      })
    } else {
      map.setOptions({ draggableCursor: null })
    }

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
  }, [addCameraMode, addDeviceMode, map, projectId])

  // Toolbar Actions
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleFitToElements = () => {
    if (!map) return
    const bounds = new google.maps.LatLngBounds()
    let count = 0

    if (showCameras) {
      cameras.forEach(c => {
        bounds.extend({ lat: c.latitude, lng: c.longitude })
        count++
      })
    }

    if (showDevices) {
      networkDevices.forEach(d => {
        if (d.latitude !== null && d.longitude !== null) {
          bounds.extend({ lat: d.latitude, lng: d.longitude })
          count++
        }
      })
    }

    if (count === 0) return

    map.fitBounds(bounds)
    const listener = map.addListener('bounds_changed', () => {
      if (map.getZoom()! > 20) {
        map.setZoom(20)
      }
      google.maps.event.removeListener(listener)
    })
  }

  // Camera settings form save
  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCamera) return
    setCameraPanelMessage(null)

    const details = {
      camera_id_tag: cameraTag,
      camera_model_id: cameraModelId,
      status: cameraStatus,
      communication_type: cameraCommType,
      power_type: cameraPowerType,
      address_reference: cameraAddressRef || null,
      structure_reference: cameraStructureRef || null,
      notes: cameraNotes || null,
    }

    startTransition(async () => {
      // 1. Update details
      const detailResult = await updateCameraDetails({
        id: selectedCamera.id,
        projectId,
        details
      })

      if (detailResult.error) {
        setCameraPanelMessage({ type: 'error', text: detailResult.error })
        return
      }

      // 2. Handle switch port assignment updates
      if (assignedPortId) {
        const assignResult = await assignCameraToPort({
          cameraLocationId: selectedCamera.id,
          switchPortId: assignedPortId,
          projectId
        })
        if (assignResult.error) {
          setCameraPanelMessage({ type: 'error', text: `Saved details but assignment failed: ${assignResult.error}` })
          return
        }
      } else {
        // Clear assignment if unassigned is chosen
        const unassignResult = await unassignCameraFromPort({
          cameraLocationId: selectedCamera.id,
          projectId
        })
        if (unassignResult.error) {
          setCameraPanelMessage({ type: 'error', text: `Saved details but unassignment failed: ${unassignResult.error}` })
          return
        }
      }

      // Reload lists locally
      setCameras(prev => prev.map(c => c.id === selectedCamera.id ? { 
        ...c, 
        ...details,
        assigned_network_device_id: assignedSwitchId || null 
      } : c))
      setSelectedCamera(prev => prev ? { 
        ...prev, 
        ...details,
        assigned_network_device_id: assignedSwitchId || null 
      } : null)
      setCameraPanelMessage({ type: 'success', text: 'Camera details and port assignment updated!' })
    })
  }

  // Camera delete handler
  const handleDeleteCameraClick = async () => {
    if (!selectedCamera) return
    if (!confirm(`Are you sure you want to delete ${selectedCamera.camera_id_tag}?`)) return

    startTransition(async () => {
      // Clear assignment first to update local ports if needed
      await unassignCameraFromPort({ cameraLocationId: selectedCamera.id, projectId })
      
      const result = await deleteCameraLocation({
        id: selectedCamera.id,
        projectId
      })

      if (result.error) {
        setCameraPanelMessage({ type: 'error', text: result.error })
      } else {
        setCameras(prev => prev.filter(c => c.id !== selectedCamera.id))
        setSelectedCamera(null)
      }
    })
  }

  // Network device settings form save
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDevice) return
    setDevicePanelMessage(null)

    const details = {
      name: deviceName,
      device_type: deviceType,
      manufacturer: deviceBrand || null,
      model_number: deviceModel || null,
      total_ports: deviceType === 'switch' ? deviceTotalPorts : null,
      poe_budget_watts: deviceType === 'switch' ? devicePoeBudget : 0,
      location_reference: deviceLocRef || null,
      ip_address: deviceIp || null,
      rack_unit: deviceRackUnit || null,
    }

    startTransition(async () => {
      const result = await updateNetworkDeviceDetails({
        id: selectedDevice.id,
        projectId,
        details
      })

      if (result.error) {
        setDevicePanelMessage({ type: 'error', text: result.error })
      } else if (result.success && result.data) {
        setNetworkDevices(prev => prev.map(d => d.id === selectedDevice.id ? (result.data as NetworkDevice) : d))
        setSelectedDevice(result.data as NetworkDevice)
        setDevicePanelMessage({ type: 'success', text: 'Network device configuration saved!' })
      }
    })
  }

  // Network device delete handler
  const handleDeleteDeviceClick = async () => {
    if (!selectedDevice) return
    if (!confirm(`Are you sure you want to delete ${selectedDevice.name}?`)) return

    startTransition(async () => {
      const result = await deleteNetworkDevice({
        id: selectedDevice.id,
        projectId
      })

      if (result.error) {
        setDevicePanelMessage({ type: 'error', text: result.error })
      } else {
        setNetworkDevices(prev => prev.filter(d => d.id !== selectedDevice.id))
        setSelectedDevice(null)
      }
    })
  }

  // Quick port unassignment inside side panel
  const handleDisconnectPort = async (camId: string) => {
    if (!selectedDevice) return
    startTransition(async () => {
      const result = await unassignCameraFromPort({ cameraLocationId: camId, projectId })
      if (result.error) {
        alert(result.error)
      } else {
        // Reload ports
        loadSwitchPorts(selectedDevice.id)
        // Refresh local cameras representation
        setCameras(prev => prev.map(c => c.id === camId ? { ...c, assigned_network_device_id: null } : c))
      }
    })
  }

  // Render warnings or warnings fallbacks
  if (!googleMapsApiKey) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/50" />
          <h3 className="text-xl font-bold text-white tracking-tight">Google Maps API Key Missing</h3>
          <p className="text-sm text-slate-400 mt-2">Enter your API key in .env.local to load visual layout designer.</p>
        </div>
      </div>
    )
  }

  // Calculate PoE warnings for context sidebar list
  const getPoeWarningsCount = () => {
    let count = 0
    networkDevices.forEach(d => {
      if (d.device_type === 'switch') {
        const switchCameras = cameras.filter(c => c.assigned_network_device_id === d.id)
        const totalDraw = switchCameras.reduce((acc, cam) => {
          const model = cameraModels.find(m => m.id === cam.camera_model_id)
          return acc + Number(model?.default_poe_draw || 7.50)
        }, 0)
        if (totalDraw > d.poe_budget_watts) count++
      }
    })
    return count
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      {/* 1. Contextual Sidebar */}
      <ContextSidebar
        view="map"
        projectTitle="Spatial Grid Plan"
        camerasCount={cameras.length}
        devicesCount={networkDevices.length}
        activeLayer={activeLayer}
        onLayerChange={handleLayerChange}
        showCameras={showCameras}
        onToggleShowCameras={() => setShowCameras(!showCameras)}
        showDevices={showDevices}
        onToggleShowDevices={() => setShowDevices(!showDevices)}
        
        // Element List Slots in Sidebar
        cameraListSlot={
          cameras.map(cam => (
            <button
              key={cam.id}
              onClick={() => {
                setSelectedCamera(cam)
                if (map) map.panTo({ lat: cam.latitude, lng: cam.longitude })
              }}
              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                selectedCamera?.id === cam.id
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCameraMarkerIcon(cam.status).fillColor }} />
                {cam.camera_id_tag}
              </span>
              {cam.assigned_network_device_id && (
                <span className="text-[9px] bg-slate-950 border border-slate-850 text-indigo-400 px-1 py-0.25 rounded">
                  Connected
                </span>
              )}
            </button>
          ))
        }

        deviceListSlot={
          networkDevices.map(dev => (
            <button
              key={dev.id}
              onClick={() => {
                setSelectedDevice(dev)
                if (dev.latitude !== null && dev.longitude !== null && map) {
                  map.panTo({ lat: dev.latitude, lng: dev.longitude })
                }
              }}
              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                selectedDevice?.id === dev.id
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getNetworkMarkerIcon(dev.device_type).fillColor }} />
                {dev.name}
              </span>
              <span className="text-[9px] text-slate-500 capitalize">{dev.device_type}</span>
            </button>
          ))
        }
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col overflow-hidden relative h-full">
        
        {/* Map Toolbar */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0 relative z-10 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddCameraMode(!addCameraMode)
                setAddDeviceMode(false)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-[11px] tracking-wide transition-all border ${
                addCameraMode
                  ? 'bg-amber-600 border-amber-500 hover:bg-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {addCameraMode ? 'Exit Add Camera' : 'Add Camera Mode'}
            </button>

            <button
              onClick={() => {
                setAddDeviceMode(!addDeviceMode)
                setAddCameraMode(false)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-[11px] tracking-wide transition-all border ${
                addDeviceMode
                  ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {addDeviceMode ? 'Exit Add Device' : 'Add Network Device'}
            </button>

            <button
              onClick={handleRefresh}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              title="Refresh Layout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></svg>
            </button>

            <button
              onClick={handleFitToElements}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              title="Fit map to all elements"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
            </button>
          </div>

          {/* Info Badge */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl font-mono">
            <span>Cameras: <span className="text-white font-bold">{cameras.length}</span></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>Devices: <span className="text-white font-bold">{networkDevices.length}</span></span>
          </div>
        </div>

        {/* Map Canvas Viewport */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          
          {(addCameraMode || addDeviceMode) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500/90 backdrop-blur-md text-slate-950 text-xs px-4 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              Click anywhere on the map to place a {addCameraMode ? 'Camera Node' : 'Network Switch'}
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                <svg className="animate-spin text-indigo-500" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-sm font-medium text-white">Updating spatial layout...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sliding Config Drawers (Right side) */}
      {selectedCamera && (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col justify-between shrink-0 h-full p-6 relative z-10 overflow-hidden shadow-2xl">
          <form onSubmit={handleSaveCamera} className="flex flex-col h-full justify-between">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              <div className="flex justify-between items-start border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCameraMarkerIcon(selectedCamera.status).fillColor }} />
                    {selectedCamera.camera_id_tag} Specs
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Edit camera properties and switch connection</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCamera(null)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {cameraPanelMessage && (
                <div className={`p-3 rounded-xl border text-[11px] ${
                  cameraPanelMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {cameraPanelMessage.text}
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Camera Tag</label>
                  <input
                    type="text" required value={cameraTag} onChange={e => setCameraTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Camera Model</label>
                  <select
                    value={cameraModelId} onChange={e => setCameraModelId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {cameraModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.manufacturer} - {model.model_number} ({model.resolution})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignment selection */}
                <div className="border border-slate-850 p-3 rounded-xl bg-slate-950/20 space-y-2.5">
                  <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Switch Assignment</span>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Target Switch</label>
                    <select
                      value={assignedSwitchId} onChange={e => setAssignedSwitchId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-white text-[11px] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {networkDevices.filter(d => d.device_type === 'switch').map(sw => (
                        <option key={sw.id} value={sw.id}>{sw.name} ({sw.manufacturer || 'Generic'})</option>
                      ))}
                    </select>
                  </div>

                  {assignedSwitchId && (
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 mb-1">Available Ports</label>
                      {loadingPorts ? (
                        <span className="text-[10px] text-slate-500 block animate-pulse">Loading port matrix...</span>
                      ) : (
                        <select
                          value={assignedPortId} onChange={e => setAssignedPortId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-white text-[11px] focus:outline-none"
                        >
                          <option value="">Choose Port...</option>
                          {switchPorts.map(p => {
                            const isAssigned = p.assigned_camera_location_id !== null
                            const isThisCamera = p.assigned_camera_location_id === selectedCamera.id
                            
                            // Only list unassigned ports OR the port currently assigned to this camera
                            if (isAssigned && !isThisCamera) return null

                            return (
                              <option key={p.id} value={p.id}>
                                Port {p.port_number} - {p.port_type.toUpperCase()} ({isThisCamera ? 'This Camera' : 'Available'})
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Comm Type</label>
                    <select
                      value={cameraCommType} onChange={e => setCameraCommType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="copper">Copper</option>
                      <option value="fiber">Fiber</option>
                      <option value="wireless">Wireless</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Power Type</label>
                    <select
                      value={cameraPowerType} onChange={e => setCameraPowerType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="poe">PoE</option>
                      <option value="poe+">PoE+</option>
                      <option value="local">Local</option>
                      <option value="solar">Solar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={cameraStatus} onChange={e => setCameraStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="planned">Planned (Gray)</option>
                    <option value="in_progress">In Progress (Yellow)</option>
                    <option value="complete">Complete (Green)</option>
                    <option value="issue">Issue (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location Ref</label>
                  <input
                    type="text" placeholder="Pole, Wall name..." value={cameraStructureRef} onChange={e => setCameraStructureRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    rows={2} placeholder="Obstructions, special notes..." value={cameraNotes} onChange={e => setCameraNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 mt-4 flex gap-3">
              <button
                type="button" onClick={handleDeleteCameraClick} disabled={isPending}
                className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold rounded-xl text-xs"
              >
                Delete
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex-[2] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/10"
              >
                {isPending ? 'Saving...' : 'Save Specs'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedDevice && (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col justify-between shrink-0 h-full p-6 relative z-10 overflow-hidden shadow-2xl">
          <form onSubmit={handleSaveDevice} className="flex flex-col h-full justify-between">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              <div className="flex justify-between items-start border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNetworkMarkerIcon(selectedDevice.device_type).fillColor }} />
                    {selectedDevice.name} Settings
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Edit network node specs and ports matrix</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {devicePanelMessage && (
                <div className={`p-3 rounded-xl border text-[11px] ${
                  devicePanelMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {devicePanelMessage.text}
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Device Name</label>
                  <input
                    type="text" required value={deviceName} onChange={e => setDeviceName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Device Type</label>
                  <select
                    value={deviceType} onChange={e => setDeviceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="switch">Switch</option>
                    <option value="cabinet_device">Cabinet Device</option>
                    <option value="nvr">NVR</option>
                    <option value="router">Router</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Brand</label>
                    <input
                      type="text" placeholder="e.g. Cisco" value={deviceBrand} onChange={e => setDeviceBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Model</label>
                    <input
                      type="text" placeholder="e.g. C1000" value={deviceModel} onChange={e => setDeviceModel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                {deviceType === 'switch' && (
                  <div className="grid grid-cols-2 gap-3 border border-slate-850 p-3 rounded-xl bg-slate-950/20">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Ports</label>
                      <input
                        type="number" min={1} max={96} value={deviceTotalPorts} onChange={e => setDeviceTotalPorts(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PoE Budget (W)</label>
                      <input
                        type="number" min={0} value={devicePoeBudget} onChange={e => setDevicePoeBudget(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IP Address</label>
                    <input
                      type="text" placeholder="10.0.0.1" value={deviceIp} onChange={e => setDeviceIp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rack Unit</label>
                    <input
                      type="text" placeholder="e.g. RU 4" value={deviceRackUnit} onChange={e => setDeviceRackUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location Ref</label>
                  <input
                    type="text" placeholder="MDF Room, Rack cabinet..." value={deviceLocRef} onChange={e => setDeviceLocRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>

                {/* Show switch ports matrix quick summary list inside panel */}
                {deviceType === 'switch' && (
                  <div className="space-y-2 border-t border-slate-850 pt-4">
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Ports Status Matrix</span>
                    {loadingPorts ? (
                      <div className="text-[10px] text-slate-500 animate-pulse">Loading ports details...</div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                        {switchPorts.map(port => {
                          const camera = port.assigned_camera ?? null
                          const isAssigned = camera !== null

                          return (
                            <div key={port.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-[10px]">
                              <span className="font-semibold text-slate-300">
                                Port {port.port_number} ({port.port_type.toUpperCase()})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isAssigned ? (
                                  <>
                                    <span className="text-emerald-400 font-bold">{camera.camera_id_tag}</span>
                                    <span className="text-slate-500">({camera.camera_models?.default_poe_draw || 7.5}W)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDisconnectPort(camera.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400"
                                      title="Unassign camera"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-slate-600 italic">Available</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 mt-4 flex gap-3">
              <button
                type="button" onClick={handleDeleteDeviceClick} disabled={isPending}
                className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold rounded-xl text-xs"
              >
                Delete
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex-[2] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/10"
              >
                {isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

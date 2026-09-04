'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Database } from '@/types/supabase'
import {
  createCameraLocation,
  updateCameraCoordinates,
  updateCameraDetails,
  deleteCameraLocation,
  getCameraTasks,
  getCameraTaskHistory,
  createCameraTask,
  updateCameraTaskStatus,
  deleteCameraTask,
  generateScopeTemplateTasks,
  getProjectCameraTasks,
  getProfiles,
  generateMissingProjectChecklists
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
import {
  getFiberDesignData,
  updateCameraFiberAssignment,
  assignStrandToCamera,
  generateFiberTasksForCamera,
  clearStrandAssignmentsForCamera
} from '../actions-fiber'
import { getDetailedConnectivity, setDetailedConnectivityInNotes, getCameraReadiness } from '@/lib/workflow/projectWorkflowRegistry'
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
}

export default function ProjectMapCanvas({
  projectId,
  initialCameras,
  initialNetworkDevices,
  cameraModels,
  defaultLatitude,
  defaultLongitude,
  defaultZoom
}: ProjectMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapRectRef = useRef<DOMRect | null>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'roadmap' | 'satellite'>('roadmap')
  
  // Elements states
  const [cameras, setCameras] = useState<CameraLocation[]>(initialCameras)
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>(initialNetworkDevices)
  const [showCameras, setShowCameras] = useState(true)
  const [showDevices, setShowDevices] = useState(true)
  
  // Fiber Overlay & States
  const [showFiberNodes, setShowFiberNodes] = useState(true)
  const [showFiberRoutes, setShowFiberRoutes] = useState(true)
  const [fiberNodes, setFiberNodes] = useState<any[]>([])
  const [fiberRoutes, setFiberRoutes] = useState<any[]>([])
  const [fiberRouteSegments, setFiberRouteSegments] = useState<any[]>([])
  const [fiberCables, setFiberCables] = useState<any[]>([])
  const [fiberStrands, setFiberStrands] = useState<any[]>([])
  const [fiberEnclosures, setFiberEnclosures] = useState<any[]>([])
  const [fiberAssignments, setFiberAssignments] = useState<any[]>([])
  const [fiberAssignmentStrands, setFiberAssignmentStrands] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [fdus, setFdus] = useState<any[]>([])
  const [fpps, setFpps] = useState<any[]>([])
  const [patchCords, setPatchCords] = useState<any[]>([])
  const [allSwitchPorts, setAllSwitchPorts] = useState<any[]>([])
  
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
  
  // Commercial UX: connectivity method state
  const [cameraDetailedConn, setCameraDetailedConn] = useState('Unknown')
  // Drawer accordion toggles
  const [isSpecsOpen, setIsSpecsOpen] = useState(true)
  const [isChecklistOpen, setIsChecklistOpen] = useState(true)
  const [isChainOpen, setIsChainOpen] = useState(true)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Wireless form states
  const [isWirelessSpecsOpen, setIsWirelessSpecsOpen] = useState(true)
  const [wirelessRadio, setWirelessRadio] = useState('')
  const [wirelessFrequency, setWirelessFrequency] = useState('')
  const [wirelessSignal, setWirelessSignal] = useState('')
  const [wirelessCapacity, setWirelessCapacity] = useState('')
  const [wirelessLatency, setWirelessLatency] = useState('')
  const [wirelessLos, setWirelessLos] = useState('')
  const [wirelessValidation, setWirelessValidation] = useState('')

  // Helper to get brackets values
  const getBracketValue = (notes: string, key: string, defaultValue = ''): string => {
    const regex = new RegExp(`\\[${key}:\\s*([^\\]]+)\\]`, 'i')
    const match = notes.match(regex)
    return match ? match[1].trim() : defaultValue
  }

  // Helper to set bracket values
  const setBracketValue = (notes: string, key: string, value: string): string => {
    let cleanNotes = notes || ''
    const regex = new RegExp(`\\[${key}:\\s*[^\\]]+\\]`, 'i')
    const newValue = value.trim() ? `[${key}: ${value.trim()}]` : ''
    
    if (regex.test(cleanNotes)) {
      if (newValue) {
        cleanNotes = cleanNotes.replace(regex, newValue)
      } else {
        cleanNotes = cleanNotes.replace(regex, '').trim()
      }
    } else if (newValue) {
      cleanNotes = cleanNotes.trim() ? `${cleanNotes} ${newValue}` : newValue
    }
    return cleanNotes
  }
  
  // Fiber form states
  const [cameraSourceNodeId, setCameraSourceNodeId] = useState('')
  const [cameraEnclosureId, setCameraEnclosureId] = useState('')
  const [cameraDropCableId, setCameraDropCableId] = useState('')
  const [cameraBackboneCableId, setCameraBackboneCableId] = useState('')
  const [cameraFiberPathStatus, setCameraFiberPathStatus] = useState('Planned')
  const [cameraSpliceStatus, setCameraSpliceStatus] = useState('Not Spliced')
  const [cameraTestStatus, setCameraTestStatus] = useState('Not Tested')
  const [assignedStrandTxId, setAssignedStrandTxId] = useState('')
  const [assignedStrandRxId, setAssignedStrandRxId] = useState('')
  const [cameraNotes, setCameraNotes] = useState('')
  const [assignedSwitchId, setAssignedSwitchId] = useState('')
  const [assignedPortId, setAssignedPortId] = useState('')
  const [connectivityPathType, setConnectivityPathType] = useState('Fiber -> Camera')
  const [assignedCabinetId, setAssignedCabinetId] = useState('')
  const [assignedSwitchPortId, setAssignedSwitchPortId] = useState('')
  const [assignedSfpPortId, setAssignedSfpPortId] = useState('')
  const [assignedFppId, setAssignedFppId] = useState('')
  const [assignedFduId, setAssignedFduId] = useState('')
  const [cameraPanelMessage, setCameraPanelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Camera Tasks & History states
  const [cameraTasks, setCameraTasks] = useState<any[]>([])
  const [cameraTaskHistory, setCameraTaskHistory] = useState<any[]>([])
  const [allCameraTasks, setAllCameraTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskType, setNewTaskType] = useState('Cabling')
  const [newTaskPriority, setNewTaskPriority] = useState('Medium')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isInitializingChecklist, setIsInitializingChecklist] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])

  // Full Checklist Modal state
  const [isFullChecklistOpen, setIsFullChecklistOpen] = useState(false)
  const [activeModalTaskId, setActiveModalTaskId] = useState<string | null>(null)

  // Backfill states
  const [isBackfillPreviewOpen, setIsBackfillPreviewOpen] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [backfillPreviewData, setBackfillPreviewData] = useState<any>(null)
  const [backfillLog, setBackfillLog] = useState<any>(null)

  // Hover info card state
  const [hoveredCamera, setHoveredCamera] = useState<CameraLocation | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)


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
  const cameraMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({})
  const deviceMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({})
  const cameraMarkerStateRef = useRef<{ [id: string]: { isSelected: boolean; status: string; tag: string } }>({})
  const deviceMarkerStateRef = useRef<{ [id: string]: { isSelected: boolean; deviceType: string; name: string } }>({})
  const fiberNodeMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({})
  // Layer ids of GeoJSON line layers currently on the map for fiber routes/drop cables and wireless links
  const fiberRouteLayerIdsRef = useRef<string[]>([])
  const wirelessRouteLayerIdsRef = useRef<string[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const clickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoveringCardRef = useRef(false)

  // ── Line-layer helpers: MapLibre has no Polyline object, so each "polyline" is a
  // GeoJSON source + line layer pair we add/remove by id. ──
  const addLineLayer = (
    mapInstance: maplibregl.Map,
    id: string,
    coordinates: [number, number][],
    color: string,
    opts: { width?: number; dashed?: boolean; opacity?: number } = {}
  ) => {
    const { width = 4, dashed = false, opacity = 0.85 } = opts
    if (mapInstance.getLayer(id)) mapInstance.removeLayer(id)
    if (mapInstance.getSource(id)) mapInstance.removeSource(id)
    mapInstance.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates }
      }
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
    return id
  }

  const removeLineLayers = (mapInstance: maplibregl.Map | null, ids: string[]) => {
    if (!mapInstance) return
    ids.forEach(id => {
      if (mapInstance.getLayer(id)) mapInstance.removeLayer(id)
      if (mapInstance.getSource(id)) mapInstance.removeSource(id)
    })
  }


  // Sync props to state
  useEffect(() => {
    setCameras(initialCameras)
  }, [initialCameras])

  useEffect(() => {
    setNetworkDevices(initialNetworkDevices)
  }, [initialNetworkDevices])

  useEffect(() => {
    getProfiles().then(data => {
      setProfiles(data)
    }).catch(err => {
      console.error('Failed to load profiles:', err)
    })
  }, [])

  const loadFiberData = async () => {
    try {
      const data = await getFiberDesignData(projectId)
      setFiberNodes(data.nodes)
      setFiberRoutes(data.routes)
      setFiberRouteSegments(data.segments)
      setFiberCables(data.cables)
      setFiberStrands(data.strands)
      setFiberEnclosures(data.enclosures)
      setFiberAssignments(data.assignments)
      setFiberAssignmentStrands(data.assignmentStrands ?? [])
      setCabinets(data.cabinets ?? [])
      setFdus(data.fdus ?? [])
      setFpps(data.fpps ?? [])
      setPatchCords(data.patchCords ?? [])
      setAllSwitchPorts(data.switchPorts ?? [])
      if (data.networkDevices) setNetworkDevices(data.networkDevices)
    } catch (err) {
      console.error('Failed to load fiber data:', err)
    }
  }

  useEffect(() => {
    loadFiberData()
  }, [projectId, cameras])

  // Load all camera tasks for the project to display stats in hover cards
  useEffect(() => {
    getProjectCameraTasks(projectId).then(tasks => {
      setAllCameraTasks(tasks)
    }).catch(err => {
      console.error('Failed to load project camera tasks:', err)
    })
  }, [projectId])

  const loadCameraTasksAndHistory = async (cameraId: string) => {
    setLoadingTasks(true)
    try {
      const [tasks, history] = await Promise.all([
        getCameraTasks(cameraId),
        getCameraTaskHistory(cameraId)
      ])
      setCameraTasks(tasks)
      setCameraTaskHistory(history)
      
      // Update allCameraTasks state for hover card sync
      setAllCameraTasks(prev => {
        const filtered = prev.filter(t => t.camera_id !== cameraId)
        return [...filtered, ...tasks]
      })
    } catch (err) {
      console.error('Failed to load camera tasks or history:', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  const getCameraTaskStats = (cameraId: string) => {
    const tasks = allCameraTasks.filter(t => t.camera_id === cameraId)
    const total = tasks.length
    if (total === 0) return null

    const complete = tasks.filter(t => t.status === 'Complete').length
    const blocked = tasks.filter(t => t.status === 'Blocked').length
    const failedQa = tasks.filter(t => t.status === 'Failed QA').length
    const needsRework = tasks.filter(t => t.status === 'Needs Rework').length
    const open = tasks.filter(t => t.status === 'Not Started' || t.status === 'In Progress' || !t.status).length
    const ratio = Math.round((complete / total) * 100)

    const completedTasks = tasks
      .filter(t => t.status === 'Complete' && t.completed_at)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    const lastCompleted = completedTasks.length > 0 ? completedTasks[0].title : null

    return { total, complete, blocked, failedQa, needsRework, open, ratio, lastCompleted }
  }

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

  const handleDetailedConnChange = (val: string) => {
    setCameraDetailedConn(val)
    if (val === 'Fiber') {
      setCameraCommType('fiber')
    } else if (val === 'Ethernet / Copper') {
      setCameraCommType('copper')
    } else if (val === 'Wireless PTP' || val === 'Wireless PTMP' || val === 'Wi-Fi Bridge') {
      setCameraCommType('wireless')
    } else {
      setCameraCommType('copper') // Default fallback to copper for database enum compatibility
    }
  }

  // Load ports and fiber assignment when selected camera changes
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
      const notesStr = selectedCamera.notes || ''
      setWirelessRadio(getBracketValue(notesStr, 'Radio', 'TBD'))
      setWirelessFrequency(getBracketValue(notesStr, 'Frequency', '5.8 GHz'))
      setWirelessSignal(getBracketValue(notesStr, 'Signal', '-65 dBm'))
      setWirelessCapacity(getBracketValue(notesStr, 'Capacity', '500 Mbps'))
      setWirelessLatency(getBracketValue(notesStr, 'Latency', '2 ms'))
      setWirelessLos(getBracketValue(notesStr, 'LoS', 'Clear'))
      setWirelessValidation(getBracketValue(notesStr, 'LinkStatus', 'Pending'))
      setCameraDetailedConn(getDetailedConnectivity(selectedCamera.communication_type, selectedCamera.notes || ''))

      // Load tasks and history
      loadCameraTasksAndHistory(selectedCamera.id)

      // Populate fiber details
      const assignment = fiberAssignments.find(a => a.camera_id === selectedCamera.id)
      if (assignment) {
        setCameraSourceNodeId(assignment.source_node_id || '')
        setCameraEnclosureId(assignment.enclosure_id || '')
        setCameraDropCableId(assignment.drop_cable_id || '')
        setCameraBackboneCableId(assignment.backbone_cable_id || '')
        setCameraFiberPathStatus(assignment.fiber_path_status || 'Planned')
        setCameraSpliceStatus(assignment.splice_status || 'Not Spliced')
        setCameraTestStatus(assignment.test_status || 'Not Tested')
        setConnectivityPathType(assignment.connectivity_path_type || 'Fiber -> Camera')
        setAssignedCabinetId(assignment.assigned_cabinet_id || '')
        setAssignedSwitchId(assignment.assigned_switch_id || '')
        setAssignedSwitchPortId(assignment.assigned_switch_port_id || '')
        setAssignedSfpPortId(assignment.assigned_sfp_port_id || '')
        setAssignedFppId(assignment.assigned_fpp_id || '')
        setAssignedFduId(assignment.assigned_fdu_id || '')

        // Find assigned strands
        const txJoin = fiberAssignmentStrands.find(j => j.camera_fiber_assignment_id === assignment.id && j.strand_role === 'TX')
        const rxJoin = fiberAssignmentStrands.find(j => j.camera_fiber_assignment_id === assignment.id && j.strand_role === 'RX')
        setAssignedStrandTxId(txJoin?.strand_id || '')
        setAssignedStrandRxId(rxJoin?.strand_id || '')
      } else {
        setCameraSourceNodeId('')
        setCameraEnclosureId('')
        setCameraDropCableId('')
        setCameraBackboneCableId('')
        setCameraFiberPathStatus('Planned')
        setCameraSpliceStatus('Not Spliced')
        setCameraTestStatus('Not Tested')
        setAssignedStrandTxId('')
        setAssignedStrandRxId('')
        setConnectivityPathType('Fiber -> Camera')
        setAssignedCabinetId('')
        setAssignedSwitchId('')
        setAssignedSwitchPortId('')
        setAssignedSfpPortId('')
        setAssignedFppId('')
        setAssignedFduId('')
        setWirelessRadio('')
        setWirelessFrequency('')
        setWirelessSignal('')
        setWirelessCapacity('')
        setWirelessLatency('')
        setWirelessLos('')
        setWirelessValidation('')
      }

      // Find if this camera is assigned to a switch port (for copper comm type or fallback)
      const targetSwitchId = selectedCamera.assigned_network_device_id || (assignment && assignment.assigned_switch_id)
      if (targetSwitchId) {
        loadSwitchPorts(targetSwitchId).then(() => {
          // Find port number assigned
          const port = switchPorts.find(p => p.assigned_camera_location_id === selectedCamera.id)
          setAssignedPortId(port?.id || '')
        })
      } else {
        setSwitchPorts([])
        setAssignedPortId('')
      }
    }
  }, [selectedCamera, fiberAssignments, fiberAssignmentStrands])

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

      if (selectedDevice.device_type === 'switch' || selectedDevice.device_type === 'Industrial Switch') {
        loadSwitchPorts(selectedDevice.id)
      } else {
        setSwitchPorts([])
      }
    }
  }, [selectedDevice])

  // Map layer controls — 'roadmap' shows the OSM street basemap, 'hybrid' & 'satellite'
  // both show the Esri satellite imagery basemap (kept as two values for compat with
  // the existing 3-way sidebar control).
  const handleLayerChange = (layer: 'hybrid' | 'roadmap' | 'satellite') => {
    setActiveLayer(layer)
    if (map && map.getLayer('street-layer') && map.getLayer('satellite-layer')) {
      const showSatellite = layer === 'satellite' || layer === 'hybrid'
      map.setLayoutProperty('street-layer', 'visibility', showSatellite ? 'none' : 'visible')
      map.setLayoutProperty('satellite-layer', 'visibility', showSatellite ? 'visible' : 'none')
    }
  }

  // ── Color helpers (no map-library dependency – safe to call in JSX render) ──

  const getCameraStatusColor = (status: Database['public']['Enums']['camera_status']): string => {
    if (status === 'in_progress') return '#3b82f6'   // Blue
    if (status === 'complete') return '#22c55e'       // Green
    if (status === 'issue') return '#ef4444'          // Red
    return '#eab308'                                  // Yellow - planned (default)
  }

  const getNetworkDeviceColor = (type: Database['public']['Enums']['device_type']): string => {
    if (type === 'nvr') return '#8b5cf6'
    if (type === 'router') return '#06b6d4'
    if (type === 'UPS') return '#10b981'
    if (type === 'Wireless Radio') return '#f97316'
    if (type === 'Industrial Switch') return '#3b82f6'
    if (type === 'switch') return '#2563eb'
    if (type === 'Media Converter') return '#ec4899'
    return '#64748b' // other / default
  }

  // ── Camera marker: custom SVG with CCTV body, lens, video module, and label ──
  // Builds an HTML element for a maplibregl.Marker. Visual anchor (the circle's center,
  // at svg-space (23,23)) is offset from the element's true center (23,30) because the
  // label pill extends below — the marker element is created with a matching pixel
  // offset so the circle (not the whole 46x60 box) sits on the coordinate.
  const CAMERA_ICON_SIZE: [number, number] = [46, 60]
  const CAMERA_ICON_OFFSET: [number, number] = [0, 7] // elementCenterY(30) - anchorY(23)

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
      // Outer circle (status color)
      `<circle cx="23" cy="23" r="22" fill="${color}" filter="url(#ds)" ${ringAttr}/>`,
      // Dark inner circle
      `<circle cx="23" cy="23" r="16" fill="#0f172a"/>`,
      // Camera body rectangle
      `<rect x="10" y="17" width="14" height="11" rx="2.5" fill="${color}"/>`,
      // Lens outer ring
      `<circle cx="17" cy="22.5" r="4" fill="#0f172a"/>`,
      // Lens inner (glint effect)
      `<circle cx="17" cy="22.5" r="2" fill="${color}" opacity="0.32"/>`,
      // Video feed module (right arrow)
      `<path d="M25 18.5L34 15v15L25 26.5V18.5z" fill="${color}"/>`,
      // Label pill
      `<rect x="1" y="47" width="44" height="12" rx="6" fill="#0f172a" opacity="0.93"/>`,
      // Label text
      `<text x="23" y="57" text-anchor="middle" font-family="Courier New,monospace" `,
      `font-size="8" font-weight="bold" fill="white" letter-spacing="0.4">${shortTag}</text>`,
      `</svg>`,
    ].join('')

    return svg
  }

  const buildMarkerElement = (svg: string, size: [number, number], cursor = 'pointer'): HTMLDivElement => {
    const el = document.createElement('div')
    el.style.width = `${size[0]}px`
    el.style.height = `${size[1]}px`
    el.style.cursor = cursor
    el.innerHTML = svg
    const svgEl = el.firstElementChild as SVGElement | null
    if (svgEl) {
      svgEl.style.width = '100%'
      svgEl.style.height = '100%'
      svgEl.style.display = 'block'
    }
    return el
  }

  // ── Network device marker: SVG rack-icon, replacing Google's vector Symbol path ──
  const NETWORK_ICON_BASE_SIZE = 24
  const getNetworkMarkerIcon = (type: Database['public']['Enums']['device_type'], isSelected = false) => {
    const color = getNetworkDeviceColor(type)
    const scale = isSelected ? 1.3 : 1.1
    const size = Math.round(NETWORK_ICON_BASE_SIZE * scale)
    const strokeColor = isSelected ? '#ffffff' : '#0f172a'
    const strokeWidth = isSelected ? 1.5 : 0.9
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">`,
      `<path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm3 2h14v2H5V7zm0 4h14v2H5v-2zm0 4h14v2H5v-2z" `,
      `fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`,
      `</svg>`
    ].join('')
    return { svg, size: [size, size] as [number, number] }
  }



  // Initialize Map (MapLibre GL, free raster tile sources — no API key required)
  useEffect(() => {
    if (!mapRef.current) return

    const showSatelliteInitially = activeLayer === 'satellite' || activeLayer === 'hybrid'

    const newMap = new maplibregl.Map({
      container: mapRef.current,
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
            attribution: '© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors'
          },
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 20,
            attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
          }
        },
        layers: [
          {
            id: 'street-layer',
            type: 'raster',
            source: 'street',
            layout: { visibility: showSatelliteInitially ? 'none' : 'visible' }
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            layout: { visibility: showSatelliteInitially ? 'visible' : 'none' }
          }
        ]
      },
      center: [defaultLongitude, defaultLatitude],
      zoom: defaultZoom,
      attributionControl: { compact: true }
    })

    newMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    newMap.on('click', () => {
      if (popupRef.current) popupRef.current.remove()
    })

    newMap.on('load', () => {
      setMap(newMap)
    })

    return () => {
      newMap.remove()
      setMap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLatitude, defaultLongitude, defaultZoom])

  // Synchronize Camera Markers
  useEffect(() => {
    if (!map) return

    // Remove hidden or obsolete camera markers
    Object.keys(cameraMarkersRef.current).forEach(id => {
      const cam = cameras.find(c => c.id === id)
      if (!cam || !showCameras) {
        cameraMarkersRef.current[id].remove()
        delete cameraMarkersRef.current[id]
        delete cameraMarkerStateRef.current[id]
      }
    })

    if (!showCameras) return

    // Add or Update camera markers
    cameras.forEach(cam => {
      const isSelected = selectedCamera?.id === cam.id

      const prevState = cameraMarkerStateRef.current[cam.id]
      const needsIconUpdate = !prevState ||
        prevState.isSelected !== isSelected ||
        prevState.status !== cam.status ||
        prevState.tag !== cam.camera_id_tag

      if (cameraMarkersRef.current[cam.id]) {
        const marker = cameraMarkersRef.current[cam.id]
        marker.setLngLat([cam.longitude, cam.latitude])
        if (needsIconUpdate) {
          const svg = createCameraMarkerIcon(cam.status, cam.camera_id_tag, isSelected)
          marker.getElement().innerHTML = svg
          marker.getElement().title = `${cam.camera_id_tag} (${cam.status})`
          cameraMarkerStateRef.current[cam.id] = { isSelected, status: cam.status, tag: cam.camera_id_tag }
        }
      } else {
        const svg = createCameraMarkerIcon(cam.status, cam.camera_id_tag, isSelected)
        const el = buildMarkerElement(svg, CAMERA_ICON_SIZE)
        el.title = `${cam.camera_id_tag} (${cam.status})`
        const marker = new maplibregl.Marker({
          element: el,
          draggable: true,
          anchor: 'center',
          offset: CAMERA_ICON_OFFSET
        })
          .setLngLat([cam.longitude, cam.latitude])
          .addTo(map)

        cameraMarkerStateRef.current[cam.id] = { isSelected, status: cam.status, tag: cam.camera_id_tag }

        el.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          setSelectedCamera(cam)

          let rect = mapRectRef.current
          if (!rect && mapRef.current) {
            rect = mapRef.current.getBoundingClientRect()
            mapRectRef.current = rect
          }
          if (rect) {
            setHoverPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          } else {
            setHoverPosition({ x: 300, y: 200 })
          }
          setHoveredCamera(cam)
        })

        marker.on('dragend', async () => {
          const newPos = marker.getLngLat()
          const newLat = newPos.lat
          const newLng = newPos.lng

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
        deviceMarkersRef.current[id].remove()
        delete deviceMarkersRef.current[id]
        delete deviceMarkerStateRef.current[id]
      }
    })

    if (!showDevices) return

    // Add or Update markers
    networkDevices.forEach(dev => {
      if (dev.latitude === null || dev.longitude === null) return

      const isSelected = selectedDevice?.id === dev.id

      const prevState = deviceMarkerStateRef.current[dev.id]
      const needsIconUpdate = !prevState ||
        prevState.isSelected !== isSelected ||
        prevState.deviceType !== dev.device_type ||
        prevState.name !== dev.name

      if (deviceMarkersRef.current[dev.id]) {
        const marker = deviceMarkersRef.current[dev.id]
        marker.setLngLat([dev.longitude, dev.latitude])
        if (needsIconUpdate) {
          const icon = getNetworkMarkerIcon(dev.device_type, isSelected)
          const el = marker.getElement()
          el.innerHTML = icon.svg
          el.style.width = `${icon.size[0]}px`
          el.style.height = `${icon.size[1]}px`
          el.title = `${dev.name} (${dev.device_type})`
          deviceMarkerStateRef.current[dev.id] = { isSelected, deviceType: dev.device_type, name: dev.name }
        }
      } else {
        const icon = getNetworkMarkerIcon(dev.device_type, isSelected)
        const el = buildMarkerElement(icon.svg, icon.size)
        el.title = `${dev.name} (${dev.device_type})`
        const marker = new maplibregl.Marker({
          element: el,
          draggable: true,
          anchor: 'center'
        })
          .setLngLat([dev.longitude, dev.latitude])
          .addTo(map)

        deviceMarkerStateRef.current[dev.id] = { isSelected, deviceType: dev.device_type, name: dev.name }

        el.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          setSelectedDevice(dev)
        })

        marker.on('dragend', async () => {
          const newPos = marker.getLngLat()
          const newLat = newPos.lat
          const newLng = newPos.lng

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

  // Synchronize Wireless Links
  useEffect(() => {
    if (!map) return

    // 1. Clear old wireless line layers
    removeLineLayers(map, wirelessRouteLayerIdsRef.current)
    wirelessRouteLayerIdsRef.current = []

    // 2. Draw wireless links
    cameras.forEach(cam => {
      const method = getDetailedConnectivity(cam.communication_type, cam.notes)
      const isWireless = ['Wireless PTP', 'Wireless PTMP', 'Wi-Fi Bridge', 'LTE / 5G'].includes(method)
      if (!isWireless) return

      // LTE/5G has no physical link line on map (per design guidelines)
      if (method === 'LTE / 5G') return

      if (!cam.assigned_network_device_id) return
      const dev = networkDevices.find(d => d.id === cam.assigned_network_device_id)
      if (!dev || dev.latitude === null || dev.longitude === null) return

      let color = '#a855f7' // default wireless purple
      if (method === 'Wireless PTP') color = '#a855f7' // PtP: purple
      else if (method === 'Wireless PTMP') color = '#8b5cf6' // PtMP: purple/blue
      else if (method === 'Wi-Fi Bridge') color = '#6366f1' // Wi-Fi Bridge: blue

      // If camera or link has status issues, make it red
      if (cam.status === 'issue' || (cam.notes && cam.notes.toLowerCase().includes('issue'))) {
        color = '#ef4444' // Fault/issue: red dashed line
      }

      const layerId = `wireless-link-${cam.id}`
      addLineLayer(
        map,
        layerId,
        [[cam.longitude, cam.latitude], [dev.longitude, dev.latitude]],
        color,
        { width: 2, dashed: true, opacity: 0.85 }
      )

      map.on('click', layerId, (e: maplibregl.MapMouseEvent) => {
        const content = `
          <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; min-width: 160px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
              Wireless Link: ${cam.camera_id_tag}
            </div>
            <div><strong>Type:</strong> ${method}</div>
            <div><strong>Destination:</strong> ${dev.name}</div>
            <div><strong>Frequency:</strong> 5.8 GHz (Planned)</div>
            <div><strong>Status:</strong> ${cam.status === 'issue' ? 'Degraded (Line of Sight blocked)' : 'Planned'}</div>
          </div>
        `
        if (popupRef.current) popupRef.current.remove()
        popupRef.current = new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(content)
          .addTo(map)
      })
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })

      wirelessRouteLayerIdsRef.current.push(layerId)
    })

    return () => {
      removeLineLayers(map, wirelessRouteLayerIdsRef.current)
    }
  }, [map, cameras, networkDevices])

  // Synchronize Fiber Map Elements
  useEffect(() => {
    if (!map) return

    // 1. Clear old route line layers
    removeLineLayers(map, fiberRouteLayerIdsRef.current)
    fiberRouteLayerIdsRef.current = []

    // 2. Clear old node markers
    Object.keys(fiberNodeMarkersRef.current).forEach(id => {
      fiberNodeMarkersRef.current[id].remove()
      delete fiberNodeMarkersRef.current[id]
    })

    const getStatusColor = (status: string) => {
      const s = status ? status.toLowerCase() : ''
      if (s === 'planned') return '#eab308'
      if (s === 'pulled' || s === 'in progress' || s === 'needs survey' || s === 'needs retest' || s === 'splicing pending' || s === 'testing pending' || s === 'fiber pulled') return '#3b82f6'
      if (s === 'installed' || s === 'complete' || s === 'passed' || s === 'tested' || s === 'spliced' || s === 'connected') return '#10b981'
      if (s === 'blocked' || s === 'failed' || s === 'damaged' || s === 'removed') return '#ef4444'
      return '#64748b'
    }

    const getRouteColor = (route: any) => {
      const cable = fiberCables.find(c => c.route_id === route.id)
      if (!cable) return '#eab308'
      if (cable.test_status === 'Passed') return '#10b981'
      if (cable.install_status === 'Installed') return '#10b981'
      if (cable.install_status === 'Pulled') return '#3b82f6'
      if (cable.install_status === 'Blocked' || cable.install_status === 'Damaged') return '#ef4444'
      return '#eab308'
    }

    // 3. Draw Nodes if enabled
    if (showFiberNodes) {
      fiberNodes.forEach(node => {
        const statusColor = getStatusColor(node.status)
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

        const el = buildMarkerElement(svgPin, [30, 42])
        el.title = `${node.node_tag} (${node.node_type})`
        const marker = new maplibregl.Marker({
          element: el,
          draggable: false,
          anchor: 'center',
          offset: [0, 6] // elementCenterY(21) - anchorY(15)
        })
          .setLngLat([node.longitude, node.latitude])
          .addTo(map)

        // Click Card
        el.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          const cables = fiberCables.filter((c: any) => c.from_node_id === node.id || c.to_node_id === node.id)
          const served = fiberAssignments.filter((a: any) => a.source_node_id === node.id)
          const servedTags = served.map((a: any) => {
            const cam = cameras.find((c: any) => c.id === a.camera_id)
            return cam ? cam.camera_id_tag : 'Unknown'
          }).join(', ')

          const content = `
            <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; max-width: 200px;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
                ${node.node_tag}
              </div>
              <div><strong>Type:</strong> ${node.node_type}</div>
              <div><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${node.status}</span></div>
              <div><strong>Cables:</strong> ${cables.length > 0 ? cables.map((c: any) => c.cable_tag).join(', ') : 'None'}</div>
              <div><strong>Served Cams:</strong> ${servedTags || 'None'}</div>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex;">
                <a href="/projects/${projectId}/fiber?selectedNodeId=${node.id}" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1;">Edit Node</a>
              </div>
            </div>
          `
          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new maplibregl.Popup({ closeButton: true })
            .setLngLat([node.longitude, node.latitude])
            .setHTML(content)
            .addTo(map)
        })

        fiberNodeMarkersRef.current[node.id] = marker
      })
    }

    // 4. Draw Routes and Drop Cables if enabled
    if (showFiberRoutes) {
      // Draw conduits
      fiberRoutes.forEach(route => {
        const segs = fiberRouteSegments.filter(s => s.route_id === route.id)
        const points: [number, number][] = []
        segs.forEach(s => {
          points.push([s.start_longitude, s.start_latitude])
          points.push([s.end_longitude, s.end_latitude])
        })

        if (points.length === 0) return

        const strokeCol = getRouteColor(route)
        const layerId = `fiber-route-${route.id}`
        addLineLayer(map, layerId, points, strokeCol, { width: 4, opacity: 0.8 })

        map.on('click', layerId, (e: maplibregl.MapMouseEvent) => {
          const cable = fiberCables.find(c => c.route_id === route.id)
          const content = `
            <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; min-width: 150px;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
                Route: ${route.route_id_tag}
              </div>
              <div><strong>Length:</strong> ${route.measured_length_feet} ft</div>
              <div><strong>Conduit Size:</strong> ${route.conduit_diameter_inches} in</div>
              <div><strong>Cable:</strong> ${cable ? `${cable.cable_tag} (${cable.fiber_count}F)` : 'No cable'}</div>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex;">
                <a href="/projects/${projectId}/fiber?selectedRouteId=${route.id}" style="display: inline-block; padding: 4px 8px; background-color: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 9px; text-align: center; flex: 1;">Edit Route</a>
              </div>
            </div>
          `
          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new maplibregl.Popup({ closeButton: true })
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map)
        })
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })

        fiberRouteLayerIdsRef.current.push(layerId)
      })

      // Draw drop cables (dashed)
      fiberAssignments.forEach(assignment => {
        if (!assignment.source_node_id || !assignment.camera_id) return
        const node = fiberNodes.find(n => n.id === assignment.source_node_id)
        const camera = cameras.find(c => c.id === assignment.camera_id)

        if (node && camera) {
          const layerId = `fiber-drop-${assignment.id}`
          addLineLayer(
            map,
            layerId,
            [[node.longitude, node.latitude], [camera.longitude, camera.latitude]],
            getStatusColor(assignment.fiber_path_status),
            { width: 2, dashed: true, opacity: 0.85 }
          )

          map.on('click', layerId, (e: maplibregl.MapMouseEvent) => {
            const content = `
              <div style="padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; min-width: 150px;">
                <strong>Camera Drop: ${camera.camera_id_tag}</strong><br/>
                Status: ${assignment.fiber_path_status}<br/>
                Splicing: ${assignment.splice_status}<br/>
                Testing: ${assignment.test_status}
              </div>
            `
            if (popupRef.current) popupRef.current.remove()
            popupRef.current = new maplibregl.Popup({ closeButton: true })
              .setLngLat(e.lngLat)
              .setHTML(content)
              .addTo(map)
          })
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })

          fiberRouteLayerIdsRef.current.push(layerId)
        }
      })
    }

    return () => {
      removeLineLayers(map, fiberRouteLayerIdsRef.current)
    }
  }, [map, fiberNodes, fiberRoutes, fiberRouteSegments, fiberCables, fiberAssignments, showFiberNodes, showFiberRoutes, cameras])

  // Setup click listeners for map addition modes
  useEffect(() => {
    if (!map) return

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current)
      clickHandlerRef.current = null
    }

    if (addCameraMode || addDeviceMode) {
      map.getCanvas().style.cursor = 'crosshair'

      const handler = (e: maplibregl.MapMouseEvent) => {
        const lat = e.lngLat.lat
        const lng = e.lngLat.lng

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
              deviceType: 'switch', // Default type is PoE switch
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
      }

      map.on('click', handler)
      clickHandlerRef.current = handler
    } else {
      map.getCanvas().style.cursor = ''
    }

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }
    }
  }, [addCameraMode, addDeviceMode, map, projectId])

  // Toolbar Actions
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleFitToElements = () => {
    if (!map) return
    const bounds = new maplibregl.LngLatBounds()
    let count = 0

    if (showCameras) {
      cameras.forEach(c => {
        bounds.extend([c.longitude, c.latitude])
        count++
      })
    }

    if (showDevices) {
      networkDevices.forEach(d => {
        if (d.latitude !== null && d.longitude !== null) {
          bounds.extend([d.longitude, d.latitude])
          count++
        }
      })
    }

    if (count === 0) return

    map.fitBounds(bounds, { padding: 60, maxZoom: 20, duration: 500 })
  }

  // Camera settings form save
  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCamera) return
    setCameraPanelMessage(null)

    const updatedNotesObj = setDetailedConnectivityInNotes(cameraDetailedConn, cameraNotes)
    
    // Serialise wireless parameters into notes
    let finalNotes = updatedNotesObj.notes || ''
    const isWirelessVal = ['Wireless PTP', 'Wireless PTMP', 'Wi-Fi Bridge', 'LTE / 5G'].includes(cameraDetailedConn)
    if (isWirelessVal) {
      finalNotes = setBracketValue(finalNotes, 'Radio', wirelessRadio)
      finalNotes = setBracketValue(finalNotes, 'Frequency', wirelessFrequency)
      finalNotes = setBracketValue(finalNotes, 'Signal', wirelessSignal)
      finalNotes = setBracketValue(finalNotes, 'Capacity', wirelessCapacity)
      finalNotes = setBracketValue(finalNotes, 'Latency', wirelessLatency)
      finalNotes = setBracketValue(finalNotes, 'LoS', wirelessLos)
      finalNotes = setBracketValue(finalNotes, 'LinkStatus', wirelessValidation)
    }

    const details = {
      camera_id_tag: cameraTag,
      camera_model_id: cameraModelId,
      status: cameraStatus,
      communication_type: updatedNotesObj.commType,
      power_type: cameraPowerType,
      address_reference: cameraAddressRef || null,
      structure_reference: cameraStructureRef || null,
      notes: finalNotes || null,
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

      // 3. Handle OSP Fiber updates
      if (cameraCommType === 'fiber') {
        const fiberAssignResult = await updateCameraFiberAssignment({
          cameraId: selectedCamera.id,
          projectId,
          sourceNodeId: cameraSourceNodeId || undefined,
          enclosureId: cameraEnclosureId || undefined,
          backboneCableId: cameraBackboneCableId || undefined,
          dropCableId: cameraDropCableId || undefined,
          spliceStatus: cameraSpliceStatus as any,
          testStatus: cameraTestStatus as any,
          fiberPathStatus: cameraFiberPathStatus as any,
          notes: cameraNotes || undefined,
          connectivityPathType,
          assignedCabinetId: assignedCabinetId || null,
          assignedSwitchId: assignedSwitchId || null,
          assignedSwitchPortId: assignedSwitchPortId || null,
          assignedSfpPortId: assignedSfpPortId || null,
          assignedFppId: assignedFppId || null,
          assignedFduId: assignedFduId || null,
          assignedUplinkFiberStrandId: assignedStrandTxId || null,
        })

        if (fiberAssignResult.error) {
          setCameraPanelMessage({ type: 'error', text: `Saved details but fiber assignment failed: ${fiberAssignResult.error}` })
          return
        }

        // Clear old strand assignments first
        await clearStrandAssignmentsForCamera({
          projectId,
          cameraId: selectedCamera.id
        })

        // Assign selected strands
        if (fiberAssignResult.data) {
          const assignmentId = fiberAssignResult.data.id
          if (assignedStrandTxId) {
            const txRes = await assignStrandToCamera({
              projectId,
              cameraFiberAssignmentId: assignmentId,
              cameraId: selectedCamera.id,
              strandId: assignedStrandTxId,
              strandRole: 'TX'
            })
            if (txRes.error) {
              setCameraPanelMessage({ type: 'error', text: `Failed to assign TX strand: ${txRes.error}` })
              return
            }
          }
          if (assignedStrandRxId) {
            const rxRes = await assignStrandToCamera({
              projectId,
              cameraFiberAssignmentId: assignmentId,
              cameraId: selectedCamera.id,
              strandId: assignedStrandRxId,
              strandRole: 'RX'
            })
            if (rxRes.error) {
              setCameraPanelMessage({ type: 'error', text: `Failed to assign RX strand: ${rxRes.error}` })
              return
            }
          }
        }

        // Reload fiber data
        await loadFiberData()
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
      setCameraPanelMessage({ type: 'success', text: 'Camera details and fiber/port assignments updated!' })
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

  // Camera Tasks event handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCamera || !newTaskTitle.trim()) return
    setIsCreatingTask(true)
    try {
      const res = await createCameraTask({
        projectId,
        cameraId: selectedCamera.id,
        title: newTaskTitle,
        taskType: newTaskType,
        priority: newTaskPriority
      })
      if (res.success && res.data) {
        setNewTaskTitle('')
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error creating task:', err)
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleToggleTaskStatus = async (task: any) => {
    if (!selectedCamera) return
    const newStatus = task.status === 'Complete' ? 'Not Started' : 'Complete'
    try {
      const res = await updateCameraTaskStatus({
        projectId,
        taskId: task.id,
        status: newStatus
      })
      if (res.success) {
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error toggling task status:', err)
    }
  }

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    if (!selectedCamera) return
    try {
      const res = await updateCameraTaskStatus({
        projectId,
        taskId,
        status
      })
      if (res.success) {
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error updating task status:', err)
    }
  }

  const handleTaskPriorityChange = async (taskId: string, priority: string) => {
    if (!selectedCamera) return
    try {
      const res = await updateCameraTaskStatus({
        projectId,
        taskId,
        priority
      })
      if (res.success) {
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error updating task priority:', err)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedCamera) return
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      const res = await deleteCameraTask({
        projectId,
        taskId
      })
      if (res.success) {
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const handleInitializeChecklist = async () => {
    if (!selectedCamera) return
    setIsInitializingChecklist(true)
    try {
      const res = await generateScopeTemplateTasks({
        projectId,
        cameraId: selectedCamera.id,
        communicationType: selectedCamera.communication_type
      })
      if (res.success) {
        await loadCameraTasksAndHistory(selectedCamera.id)
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error initializing checklist:', err)
    } finally {
      setIsInitializingChecklist(false)
    }
  }

  const handleNormalizeCameraStatus = async () => {
    if (!selectedCamera) return
    if (cameraTasks.length === 0) {
      alert("No checklist generated for this camera. Please initialize the checklist first.")
      return
    }

    // Recommended status logic
    let recommendedStatus: 'planned' | 'in_progress' | 'complete' | 'issue' = 'planned'
    const hasIssue = cameraTasks.some(t => t.status === 'Blocked' || t.status === 'Failed QA' || t.status === 'Needs Rework')
    const completeCount = cameraTasks.filter(t => t.status === 'Complete').length
    const totalCount = cameraTasks.length

    if (hasIssue) {
      recommendedStatus = 'issue'
    } else if (completeCount === totalCount) {
      recommendedStatus = 'complete'
    } else if (completeCount > 0) {
      recommendedStatus = 'in_progress'
    } else {
      recommendedStatus = 'planned'
    }

    const recommendedLabel = recommendedStatus === 'in_progress' ? 'In Progress' :
                            recommendedStatus === 'complete' ? 'Complete' :
                            recommendedStatus === 'issue' ? 'Issue' : 'Planned'

    const confirmMsg = `${selectedCamera.camera_id_tag} is marked Complete but checklist progress is ${completeCount}/${totalCount}.\n\nRecommended status: ${recommendedLabel}.\n\nProceed with status change?`
    
    if (!window.confirm(confirmMsg)) {
      return
    }

    setCameraStatus(recommendedStatus)

    const details = {
      camera_id_tag: cameraTag,
      camera_model_id: cameraModelId,
      status: recommendedStatus,
      communication_type: cameraCommType,
      power_type: cameraPowerType,
      address_reference: cameraAddressRef || null,
      structure_reference: cameraStructureRef || null,
      notes: cameraNotes || null,
    }

    startTransition(async () => {
      const result = await updateCameraDetails({
        id: selectedCamera.id,
        projectId,
        details
      })

      if (result.error) {
        setCameraPanelMessage({ type: 'error', text: result.error })
      } else {
        setCameras(prev => prev.map(c => c.id === selectedCamera.id ? { 
          ...c, 
          status: recommendedStatus
        } : c))
        setSelectedCamera(prev => prev ? { 
          ...prev, 
          status: recommendedStatus
        } : null)
        setCameraPanelMessage({ type: 'success', text: `Camera status normalized to ${recommendedLabel}!` })
      }
    })
  }

  const handleBackfillPreview = async () => {
    setIsBackfilling(true)
    setBackfillLog(null)
    try {
      const res = await generateMissingProjectChecklists(projectId, true)
      if (res.error) {
        alert(res.error)
      } else {
        setBackfillPreviewData(res)
        setIsBackfillPreviewOpen(true)
      }
    } catch (err) {
      console.error('Error running backfill preview:', err)
      alert('Error running backfill preview.')
    } finally {
      setIsBackfilling(false)
    }
  }

  const handleBackfillConfirm = async () => {
    setIsBackfilling(true)
    try {
      const res = await generateMissingProjectChecklists(projectId, false)
      if (res.error) {
        alert(res.error)
      } else {
        setBackfillLog(res)
        // Refresh project camera tasks to update all hover states
        const updatedTasks = await getProjectCameraTasks(projectId)
        setAllCameraTasks(updatedTasks)
        // If a camera is currently selected, reload its tasks too
        if (selectedCamera) {
          await loadCameraTasksAndHistory(selectedCamera.id)
        }
      }
    } catch (err) {
      console.error('Error executing backfill:', err)
      alert('Error executing backfill.')
    } finally {
      setIsBackfilling(false)
    }
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
      total_ports: (deviceType === 'switch' || deviceType === 'Industrial Switch') ? deviceTotalPorts : null,
      poe_budget_watts: (deviceType === 'switch' || deviceType === 'Industrial Switch') ? devicePoeBudget : 0,
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

  // Calculate PoE warnings for context sidebar list
  const getPoeWarningsCount = () => {
    let count = 0
    networkDevices.forEach(d => {
      if (d.device_type === 'switch' || d.device_type === 'Industrial Switch') {
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

  const completeCount = cameraTasks.filter(t => t.status === 'Complete').length
  const totalCount = cameraTasks.length
  const isCompleteButTasksOpen = cameraStatus === 'complete' && (totalCount === 0 || completeCount < totalCount)

  return (
    <div className="relative h-full w-full">
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
                if (map) map.panTo([cam.longitude, cam.latitude])
              }}
              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                selectedCamera?.id === cam.id
                  ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/15 border border-[var(--accent)]/30 text-white'
                  : 'hover:bg-slate-800 text-[var(--text-secondary)] hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCameraStatusColor(cam.status) }} />
                {cam.camera_id_tag}
              </span>
              {cam.assigned_network_device_id && (
                <span className="text-[9px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent-text)] px-1 py-0.25 rounded">
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
                  map.panTo([dev.longitude, dev.latitude])
                }
              }}
              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                selectedDevice?.id === dev.id
                  ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/15 border border-[var(--accent)]/30 text-white'
                  : 'hover:bg-slate-800 text-[var(--text-secondary)] hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getNetworkDeviceColor(dev.device_type) }} />
                {dev.name}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] capitalize">{dev.device_type}</span>
            </button>
          ))
        }
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col overflow-hidden relative h-full">
        
        {/* Map Toolbar */}
        <div className="p-4 bg-[var(--surface-1)] border-b border-[var(--border)] flex items-center justify-between shrink-0 relative z-10 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddCameraMode(!addCameraMode)
                setAddDeviceMode(false)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-[11px] tracking-wide transition-all border ${
                addCameraMode
                  ? 'bg-amber-600 border-amber-500 hover:bg-amber-500 text-white'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] hover:border-slate-700 hover:text-white'
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
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] hover:border-slate-700 hover:text-white'
              }`}
            >
              {addDeviceMode ? 'Exit Add Device' : 'Add Network Device'}
            </button>

            <button
              onClick={handleBackfillPreview}
              disabled={isBackfilling}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:text-[var(--accent-text)] disabled:opacity-50 text-[var(--text-primary)] rounded-xl font-semibold text-[11px] tracking-wide transition-all"
            >
              {isBackfilling ? 'Analyzing...' : 'Preview Missing Checklists'}
            </button>

            <button
              onClick={handleRefresh}
              className="flex items-center justify-center p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-slate-700"
              title="Refresh Layout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></svg>
            </button>

            <button
              onClick={handleFitToElements}
              className="flex items-center justify-center p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-slate-700"
              title="Fit map to all elements"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
            </button>
          </div>

          {/* Info Badge */}
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-xl font-mono">
            <span>Cameras: <span className="text-white font-bold">{cameras.length}</span></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>Devices: <span className="text-white font-bold">{networkDevices.length}</span></span>
          </div>
        </div>

        {/* Map Canvas Viewport */}
        <div className="flex-1 relative bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
          <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full"
            onMouseEnter={() => {
              if (mapRef.current) {
                mapRectRef.current = mapRef.current.getBoundingClientRect()
              }
            }}
          />

          {/* Basemap Toggle: Street (OpenStreetMap) / Satellite (Esri World Imagery) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 p-1 bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl">
            <button
              onClick={() => handleLayerChange('roadmap')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeLayer === 'roadmap'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Street basemap (OpenStreetMap)"
            >
              Street
            </button>
            <button
              onClick={() => handleLayerChange('satellite')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeLayer === 'satellite' || activeLayer === 'hybrid'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Satellite basemap (Esri World Imagery)"
            >
              Satellite
            </button>
          </div>

          {/* OSP Fiber Layer Overlay Checkboxes */}
          <div className="absolute top-4 right-4 z-20 bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border)] p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 text-[10px] font-bold text-[var(--text-primary)] font-sans pointer-events-auto">
            <div className="text-[9px] text-[var(--accent-text)] uppercase tracking-wider border-b border-[var(--border)] pb-1 mb-0.5">Fiber Layers</div>
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showFiberNodes}
                onChange={() => setShowFiberNodes(!showFiberNodes)}
                className="rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
              />
              Nodes (HH/MH/ENC)
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showFiberRoutes}
                onChange={() => setShowFiberRoutes(!showFiberRoutes)}
                className="rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
              />
              Conduit & Drops
            </label>
          </div>

          {/* ── Camera Hover Info Card ── */}
          {hoveredCamera && hoverPosition && (() => {
            const displayCam = cameras.find(c => c.id === hoveredCamera.id) ?? hoveredCamera
            const camModel = cameraModels.find(m => m.id === displayCam.camera_model_id)
            const connSwitch = displayCam.assigned_network_device_id
              ? networkDevices.find(d => d.id === displayCam.assigned_network_device_id)
              : null
            const statusMap: Record<string, { label: string; cls: string }> = {
              planned:     { label: 'Planned',       cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
              in_progress: { label: 'In Progress',   cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
              complete:    { label: 'Complete',       cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
              issue:       { label: 'Issue / Alert', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
              unknown:     { label: 'Unknown / TBD',  cls: 'text-[var(--text-secondary)] bg-slate-400/10 border-slate-400/20' },
            }
            const statusInfo = statusMap[displayCam.status] ?? statusMap.unknown
            const mapW = mapRef.current?.offsetWidth ?? 600
            const cardW = 276
            const rawX = hoverPosition.x + 24
            const cardX = rawX + cardW > mapW ? hoverPosition.x - cardW - 12 : rawX
            const cardY = Math.max(hoverPosition.y - 110, 8)
            const accentColor = getCameraStatusColor(displayCam.status)
            const stats = getCameraTaskStats(displayCam.id)

            return (
              <div
                key={displayCam.id}
                id="camera-hover-card"
                className="absolute z-30 bg-[var(--surface-1)] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                style={{ left: cardX, top: cardY, width: `${cardW}px` }}
                onMouseEnter={() => {
                  isHoveringCardRef.current = true
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                }}
                onMouseLeave={() => {
                  isHoveringCardRef.current = false
                  setHoveredCamera(null)
                  setHoverPosition(null)
                }}
              >
                {/* Status accent bar */}
                <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />

                {/* Header */}
                <div className="px-4 pt-3 pb-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}>
                        <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white tracking-tight truncate">{displayCam.camera_id_tag}</h4>
                      <p className="text-[9px] text-[var(--text-tertiary)] font-mono">{displayCam.latitude.toFixed(5)}, {displayCam.longitude.toFixed(5)}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Info fields */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Model</span>
                      <span className="block text-[10px] text-[var(--text-primary)] mt-0.5 truncate">
                        {camModel ? `${camModel.manufacturer} ${camModel.model_number}` : <span className="italic text-slate-600">Not Assigned</span>}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">IP Address</span>
                      <span className="block text-[10px] italic text-slate-600 mt-0.5">Not Assigned</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Comm Type</span>
                      <span className="block text-[10px] text-[var(--text-primary)] mt-0.5 capitalize">{displayCam.communication_type}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Power</span>
                      <span className="block text-[10px] text-[var(--text-primary)] mt-0.5 uppercase">{displayCam.power_type}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Connected Switch</span>
                      <span className="block text-[10px] mt-0.5">
                        {connSwitch
                          ? <span className="text-[var(--accent-text)]">{connSwitch.name}</span>
                          : <span className="italic text-slate-600">Not Assigned</span>}
                      </span>
                    </div>
                    {(displayCam.structure_reference || displayCam.address_reference) && (
                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Location Ref</span>
                        <span className="block text-[10px] text-[var(--text-primary)] mt-0.5">
                          {displayCam.structure_reference || displayCam.address_reference}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Stats inside Hover Card */}
                {stats && (
                  <div className="mx-4 pb-3 pt-2.5 border-t border-[var(--border)]/60 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <span>Task Progress</span>
                      <span className="text-[var(--text-primary)] font-mono">{stats.ratio}% ({stats.complete}/{stats.total})</span>
                    </div>
                    <div className="w-full bg-[var(--surface-2)] rounded-full h-1">
                      <div className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white h-1 rounded-full" style={{ width: `${stats.ratio}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-[var(--text-secondary)] font-mono mt-1 leading-snug">
                      <span>Open: <span className="text-white font-bold">{stats.open}</span></span>
                      <span>•</span>
                      <span>Blocked: <span className="text-red-400 font-bold">{stats.blocked}</span></span>
                      <span>•</span>
                      <span>QA Fail: <span className="text-amber-500 font-bold">{stats.failedQa}</span></span>
                      <span>•</span>
                      <span>Rework: <span className="text-orange-400 font-bold">{stats.needsRework}</span></span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 pb-3 pt-1 flex gap-2 border-t border-[var(--border)]/60">
                  <button
                    id="hover-card-edit-btn"
                    onClick={() => {
                      setSelectedCamera(displayCam)
                      setHoveredCamera(null)
                      setHoverPosition(null)
                    }}
                    className="flex-1 py-1.5 text-[10px] font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white rounded-lg transition-colors"
                  >
                    Edit Camera
                  </button>
                  <button
                    onClick={() => {
                      if (map) map.panTo([displayCam.longitude, displayCam.latitude])
                      setHoveredCamera(null)
                      setHoverPosition(null)
                    }}
                    className="py-1.5 px-3 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-[var(--text-primary)] rounded-lg transition-colors"
                  >
                    Center
                  </button>
                </div>
              </div>
            )
          })()}

          {(addCameraMode || addDeviceMode) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/90 backdrop-blur-md text-slate-950 text-xs px-4 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[var(--surface-2)] animate-ping" />
              Click anywhere on the map to place a {addCameraMode ? 'Camera Node' : 'Network Switch'}
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 bg-[var(--surface-2)] backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-6 py-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-xl">
                <svg className="animate-spin text-[var(--accent-text)]" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-sm font-medium text-white">Updating spatial layout...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sliding Config Drawers (Right side) */}
      {selectedCamera && (() => {
        // Calculate camera readiness state based on current parameters
        const readiness = getCameraReadiness(
          {
            id: selectedCamera.id,
            latitude: selectedCamera.latitude,
            longitude: selectedCamera.longitude,
            communication_type: cameraCommType,
            power_type: cameraPowerType,
            notes: cameraNotes,
            assigned_network_device_id: assignedSwitchId,
          },
          fiberAssignments,
          allSwitchPorts,
          cameraTasks
        )

        const totalCount = cameraTasks.length
        const completeCount = cameraTasks.filter(t => t.status === 'Complete').length

        return (
          <div className="absolute top-4 right-4 bottom-4 w-80 max-h-[calc(100%-2rem)] bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl flex flex-col justify-between p-6 z-30 overflow-hidden shadow-2xl">
            <form onSubmit={handleSaveCamera} className="flex flex-col h-full justify-between overflow-hidden">
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin pb-4">
                
                {/* Header Section */}
                <div className="flex justify-between items-start border-b border-[var(--border)] pb-4 shrink-0">
                  <div>
                    <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: getCameraStatusColor(cameraStatus) }} />
                      {cameraTag || selectedCamera.camera_id_tag || 'Camera'} Specs
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">ID: {selectedCamera.id.substring(0, 8)}...</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCamera(null)}
                    className="p-1.5 rounded bg-[var(--surface-2)] hover:bg-slate-850 text-[var(--text-secondary)] hover:text-white transition-colors"
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

                {/* 1. Connectivity Method Selector (Guided First) */}
                <div className="space-y-1.5 bg-[var(--accent-soft)] border border-indigo-900/30 p-3.5 rounded-xl shadow-inner">
                  <label className="block text-[10px] font-black text-[var(--accent-text)] uppercase tracking-wider">Connectivity Backhaul</label>
                  <select
                    value={cameraDetailedConn}
                    onChange={e => handleDetailedConnChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-white text-xs focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer hover:border-slate-700 transition"
                  >
                    <option value="Fiber">Fiber (Spliced Drop)</option>
                    <option value="Ethernet / Copper">Ethernet / Copper (Local PoE)</option>
                    <option value="Wireless PTP">Wireless PTP (Radio Link)</option>
                    <option value="Wireless PTMP">Wireless PTMP (Sector Client)</option>
                    <option value="Wi-Fi Bridge">Wi-Fi Bridge (Mesh Client)</option>
                    <option value="LTE / 5G">LTE / 5G (Cellular Modem)</option>
                    <option value="Existing Network">Existing Third-Party Link</option>
                    <option value="Unknown">Unknown / TBD</option>
                  </select>
                </div>

                {/* 2. Asset Readiness Checklist */}
                <div className="bg-[var(--surface-2)]/25 border border-[var(--border)] rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Readiness Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-wider ${
                      readiness.overallStatus === 'Ready'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : readiness.overallStatus === 'Needs Attention'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {readiness.overallStatus}
                    </span>
                  </div>
                  {readiness.overallStatus !== 'Ready' ? (
                    <div className="bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border)] text-[10px] text-amber-400/90 font-medium flex items-start gap-1.5">
                      <span className="text-[8px] mt-0.5 text-amber-500">⚠️</span>
                      <span>{readiness.nextAction}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] p-2 rounded-lg border border-[var(--border)]/60 flex items-center gap-1.5 font-medium">
                      <span className="text-emerald-400">✓</span>
                      <span>All engineering preconditions satisfied.</span>
                    </div>
                  )}
                </div>

                {/* 3. Accordion: Specs (Device & Local Details) */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/10">
                  <button
                    type="button"
                    onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                    className="w-full flex justify-between items-center p-3.5 bg-[var(--surface-2)] text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]"
                  >
                    <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--accent-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                      Specs & Details
                    </span>
                    <span className="text-[var(--text-secondary)]">{isSpecsOpen ? '▲' : '▼'}</span>
                  </button>

                  {isSpecsOpen && (
                    <div className="p-3.5 space-y-3.5 bg-[var(--surface-1)]">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Camera Tag</label>
                        <input
                          type="text" required value={cameraTag} onChange={e => setCameraTag(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Camera Model</label>
                        <select
                          value={cameraModelId} onChange={e => setCameraModelId(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                        >
                          <option value="">Select Model...</option>
                          {cameraModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.manufacturer} - {model.model_number} ({model.resolution || 'Resolution TBD'}, {model.default_poe_draw}W)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Status</label>
                          <select
                            value={cameraStatus} onChange={e => setCameraStatus(e.target.value as any)}
                            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                          >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="complete">Complete</option>
                            <option value="issue">Issue</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Power Type</label>
                          <select
                            value={cameraPowerType} onChange={e => setCameraPowerType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                          >
                            <option value="poe">PoE (Standard)</option>
                            <option value="poe_plus">PoE+ (30W)</option>
                            <option value="poe_bt">PoE++ (60W/90W)</option>
                            <option value="dc_12v">12V DC Local</option>
                            <option value="dc_24v">24V DC Local</option>
                            <option value="ac_24v">24V AC Local</option>
                            <option value="solar">Solar/Battery</option>
                            <option value="other">Other / TBD</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Address Reference</label>
                        <input
                          type="text" value={cameraAddressRef} onChange={e => setCameraAddressRef(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                          placeholder="e.g., 100 Main St Pole 4"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Structure Reference</label>
                        <input
                          type="text" value={cameraStructureRef} onChange={e => setCameraStructureRef(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                          placeholder="e.g., Pole 4B, Wall Mount"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea
                          value={cameraNotes} onChange={e => setCameraNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] min-h-[50px] resize-y"
                          placeholder="General specs, mounting requirements..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Accordion: Checklist (Camera Checklist) */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/10">
                  <button
                    type="button"
                    onClick={() => setIsChecklistOpen(!isChecklistOpen)}
                    className="w-full flex justify-between items-center p-3.5 bg-[var(--surface-2)] text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]"
                  >
                    <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--accent-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                      Guided Checklist
                    </span>
                    <div className="flex items-center gap-2">
                      {totalCount > 0 && (
                        <span className="text-[9.5px] text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.25 rounded-full font-bold">
                          {completeCount}/{totalCount}
                        </span>
                      )}
                      <span className="text-[var(--text-secondary)]">{isChecklistOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isChecklistOpen && (
                    <div className="p-3.5 space-y-3.5 bg-[var(--surface-1)]">
                      {loadingTasks ? (
                        <div className="text-xs text-[var(--text-tertiary)] animate-pulse">Loading checklist...</div>
                      ) : cameraTasks.length === 0 ? (
                        <div className="bg-[var(--surface-2)] border border-[var(--border)] p-3 rounded-xl text-center space-y-2">
                          <p className="text-[11px] text-[var(--text-secondary)]">No tasks checklist generated for this camera.</p>
                          <button
                            type="button"
                            onClick={handleInitializeChecklist}
                            disabled={isInitializingChecklist}
                            className="py-1.5 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition"
                          >
                            {isInitializingChecklist ? 'Initializing...' : `Initialize Checklist`}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Progress Bar */}
                          <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                            <div
                              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.round((completeCount / Math.max(totalCount, 1)) * 100)}%`
                              }}
                            />
                          </div>

                          {/* Task List (flows naturally in drawer scroll) */}
                          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                            {cameraTasks.map(task => (
                              <div key={task.id} className="group border border-[var(--border)]/80 bg-[var(--surface-2)] p-2.5 rounded-xl flex flex-col gap-2 hover:border-slate-700/60 transition-all">
                                <div className="flex items-start gap-2.5 justify-between">
                                  <label className="flex items-start gap-2 cursor-pointer select-none grow">
                                    <input
                                      type="checkbox"
                                      checked={task.status === 'Complete'}
                                      onChange={() => handleToggleTaskStatus(task)}
                                      className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-2)] text-indigo-600 focus:ring-indigo-500 w-3 h-3 shrink-0"
                                    />
                                    <span className={`text-[11px] font-bold text-[var(--text-primary)] leading-snug group-hover:text-white transition-colors ${task.status === 'Complete' ? 'line-through text-[var(--text-tertiary)] group-hover:text-[var(--text-tertiary)] font-medium' : ''}`}>
                                      {task.title}
                                    </span>
                                  </label>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-[var(--text-tertiary)] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 shrink-0"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-[var(--border)]/60 pt-2 mt-0.5">
                                  <span className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--surface-2)] border border-[var(--border)] px-1 py-0.5 rounded shrink-0">{task.task_type}</span>
                                  
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Status Select */}
                                    <select
                                      value={task.status}
                                      onChange={e => handleTaskStatusChange(task.id, e.target.value)}
                                      className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] rounded px-1.5 py-0.5 text-[9px] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                                    >
                                      <option value="Not Started">Not Started</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Blocked">Blocked</option>
                                      <option value="Complete">Complete</option>
                                      <option value="Failed QA">Failed QA</option>
                                      <option value="Needs Rework">Needs Rework</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>

                                    {/* Priority Select */}
                                    <select
                                      value={task.priority}
                                      onChange={e => handleTaskPriorityChange(task.id, e.target.value)}
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold focus:outline-none border border-[var(--border)] cursor-pointer ${
                                        task.priority === 'Critical' ? 'bg-red-500/10 text-red-400' :
                                        task.priority === 'High' ? 'bg-amber-500/10 text-amber-400' :
                                        task.priority === 'Medium' ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 text-[var(--accent-text)]' :
                                        'bg-slate-500/10 text-[var(--text-secondary)]'
                                      }`}
                                    >
                                      <option value="Low" className="bg-[var(--surface-2)] text-white">Low</option>
                                      <option value="Medium" className="bg-[var(--surface-2)] text-white">Medium</option>
                                      <option value="High" className="bg-[var(--surface-2)] text-white">High</option>
                                      <option value="Critical" className="bg-[var(--surface-2)] text-white">Critical</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Manual Task Inline Form */}
                          <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-xl space-y-2">
                            <span className="block text-[8.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Add Custom Task</span>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Task title..."
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] text-xs grow focus:outline-none focus:border-[var(--accent)]"
                              />
                              <button
                                type="button"
                                onClick={handleCreateTask}
                                disabled={isCreatingTask || !newTaskTitle.trim()}
                                className="px-2 py-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-900 text-white text-xs font-semibold rounded-lg shrink-0"
                              >
                                Add
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={newTaskType}
                                onChange={e => setNewTaskType(e.target.value)}
                                className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                              >
                                <option value="Cabling">Cabling</option>
                                <option value="Mounting">Mounting</option>
                                <option value="Site Survey">Site Survey</option>
                                <option value="Fiber">Fiber</option>
                                <option value="Wireless">Wireless</option>
                                <option value="Testing">Testing</option>
                                <option value="Documentation">Documentation</option>
                                <option value="Configuration">Configuration</option>
                                <option value="Switch Assignment">Switch Assignment</option>
                                <option value="IP Addressing">IP Addressing</option>
                                <option value="Power">Power</option>
                                <option value="Photos">Photos</option>
                                <option value="Closeout">Closeout</option>
                              </select>
                              <select
                                value={newTaskPriority}
                                onChange={e => setNewTaskPriority(e.target.value)}
                                className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => setIsFullChecklistOpen(true)}
                              className="text-[9.5px] text-[var(--accent-text)] hover:text-indigo-300 font-bold transition underline"
                            >
                              Open Full Project Checklist
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wireless Backhaul Specs Accordion */}
                {['Wireless PTP', 'Wireless PTMP', 'Wi-Fi Bridge', 'LTE / 5G'].includes(cameraDetailedConn) && (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/10">
                    <button
                      type="button"
                      onClick={() => setIsWirelessSpecsOpen(!isWirelessSpecsOpen)}
                      className="w-full flex justify-between items-center p-3.5 bg-[var(--surface-2)] text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]"
                    >
                      <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-[var(--accent-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                        Wireless Backhaul Specs
                      </span>
                      <span className="text-[var(--text-secondary)]">{isWirelessSpecsOpen ? '▲' : '▼'}</span>
                    </button>

                    {isWirelessSpecsOpen && (
                      <div className="p-3.5 space-y-3.5 bg-[var(--surface-1)]">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Radio / Antenna</label>
                            <select
                              value={wirelessRadio}
                              onChange={e => setWirelessRadio(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="TBD">TBD / Planned</option>
                              <option value="Base Station (AP)">Base Station (AP)</option>
                              <option value="Subscriber Module (SM)">Subscriber Module (SM)</option>
                              <option value="Wi-Fi Bridge Terminal">Wi-Fi Bridge Terminal</option>
                              <option value="LTE/5G Cellular Gateway">LTE/5G Gateway</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Link Target</label>
                            <select
                              value={assignedSwitchId}
                              onChange={e => setAssignedSwitchId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Receiver...</option>
                              {networkDevices.map(dev => (
                                <option key={dev.id} value={dev.id}>
                                  {dev.name} ({dev.device_type})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Frequency</label>
                            <select
                              value={wirelessFrequency}
                              onChange={e => setWirelessFrequency(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="5.8 GHz">5.8 GHz</option>
                              <option value="60 GHz">60 GHz (V-Band)</option>
                              <option value="2.4 GHz">2.4 GHz</option>
                              <option value="5.1-5.7 GHz (DFS)">5.1-5.7 GHz (DFS)</option>
                              <option value="CBRS Band 48">CBRS Band 48</option>
                              <option value="LTE/5G Licensed">LTE/5G Licensed</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Signal Strength</label>
                            <input
                              type="text"
                              value={wirelessSignal}
                              onChange={e => setWirelessSignal(e.target.value)}
                              placeholder="e.g., -65 dBm"
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Link Capacity</label>
                            <input
                              type="text"
                              value={wirelessCapacity}
                              onChange={e => setWirelessCapacity(e.target.value)}
                              placeholder="e.g., 500 Mbps"
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Latency</label>
                            <input
                              type="text"
                              value={wirelessLatency}
                              onChange={e => setWirelessLatency(e.target.value)}
                              placeholder="e.g., 2 ms"
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Line of Sight (LoS)</label>
                            <select
                              value={wirelessLos}
                              onChange={e => setWirelessLos(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="Clear">Clear LoS</option>
                              <option value="Partially Obstructed">Partially Obstructed</option>
                              <option value="Blocked">Blocked</option>
                              <option value="TBD">TBD / Unverified</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Link Validation</label>
                            <select
                              value={wirelessValidation}
                              onChange={e => setWirelessValidation(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="Validated">Validated</option>
                              <option value="Pending">Pending Validation</option>
                              <option value="Failed">Failed / Degraded</option>
                              <option value="N/A">Not Applicable</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Accordion: Connectivity Chain */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/10">
                  <button
                    type="button"
                    onClick={() => setIsChainOpen(!isChainOpen)}
                    className="w-full flex justify-between items-center p-3.5 bg-[var(--surface-2)] text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]"
                  >
                    <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--accent-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                      Connectivity Chain
                    </span>
                    <span className="text-[var(--text-secondary)]">{isChainOpen ? '▲' : '▼'}</span>
                  </button>

                  {isChainOpen && (
                    <div className="p-3.5 space-y-3.5 bg-[var(--surface-1)]">
                      {cameraCommType === 'fiber' ? (
                        <>
                          <div className="text-[10px] text-[var(--accent-text)] font-bold border-b border-[var(--border)] pb-1.5">OSP Fiber Properties</div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Source Fiber Node</label>
                            <select
                              value={cameraSourceNodeId} onChange={e => setCameraSourceNodeId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Node...</option>
                              {fiberNodes.map(node => (
                                <option key={node.id} value={node.id}>
                                  {node.node_tag} ({node.node_type})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Fiber Enclosure</label>
                            <select
                              value={cameraEnclosureId} onChange={e => setCameraEnclosureId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Enclosure...</option>
                              {fiberEnclosures
                                .filter(enc => !cameraSourceNodeId || enc.node_id === cameraSourceNodeId)
                                .map(enc => (
                                  <option key={enc.id} value={enc.id}>
                                    {enc.enclosure_tag} ({enc.model_type || 'splice tray'})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Drop Cable</label>
                            <select
                              value={cameraDropCableId} onChange={e => setCameraDropCableId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Cable...</option>
                              {fiberCables
                                .filter(cab => cab.cable_type === 'Drop')
                                .map(cab => (
                                  <option key={cab.id} value={cab.id}>
                                    {cab.cable_tag} ({cab.fiber_count}F, {cab.install_status})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Backbone Cable</label>
                            <select
                              value={cameraBackboneCableId} onChange={e => setCameraBackboneCableId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Backbone...</option>
                              {fiberCables
                                .filter(cab => cab.cable_type === 'Backbone')
                                .map(cab => (
                                  <option key={cab.id} value={cab.id}>
                                    {cab.cable_tag} ({cab.fiber_count}F, {cab.install_status})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)]/60 pt-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">TX Strand</label>
                              <select
                                value={assignedStrandTxId} onChange={e => setAssignedStrandTxId(e.target.value)}
                                className="w-full px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                              >
                                <option value="">None</option>
                                {fiberStrands
                                  .filter(st => {
                                    const cable = fiberCables.find(c => c.id === st.cable_id)
                                    return cable && (st.cable_id === cameraDropCableId || st.cable_id === cameraBackboneCableId)
                                  })
                                  .map(st => (
                                    <option key={st.id} value={st.id}>
                                      Strand {st.strand_number} ({st.color_name || 'Standard'})
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">RX Strand</label>
                              <select
                                value={assignedStrandRxId} onChange={e => setAssignedStrandRxId(e.target.value)}
                                className="w-full px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                              >
                                <option value="">None</option>
                                {fiberStrands
                                  .filter(st => {
                                    const cable = fiberCables.find(c => c.id === st.cable_id)
                                    return cable && (st.cable_id === cameraDropCableId || st.cable_id === cameraBackboneCableId)
                                  })
                                  .map(st => (
                                    <option key={st.id} value={st.id}>
                                      Strand {st.strand_number} ({st.color_name || 'Standard'})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3 border-t border-[var(--border)]/60 pt-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Fiber Path Status</label>
                              <select
                                value={cameraFiberPathStatus} onChange={e => setCameraFiberPathStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                              >
                                <option value="Planned">Planned</option>
                                <option value="Pulled">Pulled</option>
                                <option value="Spliced">Spliced</option>
                                <option value="Tested">Tested</option>
                                <option value="Connected">Connected</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Splice Status</label>
                                <select
                                  value={cameraSpliceStatus} onChange={e => setCameraSpliceStatus(e.target.value)}
                                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                                >
                                  <option value="Not Spliced">Not Spliced</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Complete">Complete</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Test Status</label>
                                <select
                                  value={cameraTestStatus} onChange={e => setCameraTestStatus(e.target.value)}
                                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                                >
                                  <option value="Not Tested">Not Tested</option>
                                  <option value="Passed">Passed</option>
                                  <option value="Failed">Failed</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-[var(--accent-text)] font-bold border-b border-[var(--border)] pb-1.5">Copper / Switch Port Properties</div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Assigned Switch</label>
                            <select
                              value={assignedSwitchId}
                              onChange={e => setAssignedSwitchId(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                            >
                              <option value="">Select Switch...</option>
                              {networkDevices
                                .filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch')
                                .map(sw => (
                                  <option key={sw.id} value={sw.id}>
                                    {sw.name} ({sw.ip_address || 'No IP'})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Switch Port</label>
                            <select
                              value={assignedPortId}
                              onChange={e => setAssignedPortId(e.target.value)}
                              disabled={loadingPorts || !assignedSwitchId}
                              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">{loadingPorts ? 'Loading Ports...' : 'Select Port...'}</option>
                              {switchPorts.map(port => {
                                const isAssignedToOther = port.assigned_camera_location_id && port.assigned_camera_location_id !== selectedCamera.id
                                const displayName = isAssignedToOther
                                  ? `Port ${port.port_number} - Assigned to ${port.assigned_camera?.camera_id_tag || 'another camera'}`
                                  : `Port ${port.port_number}`
                                return (
                                  <option key={port.id} value={port.id} disabled={!!isAssignedToOther}>
                                    {displayName}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Accordion: History / Audit Log */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/10">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full flex justify-between items-center p-3.5 bg-[var(--surface-2)] text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]"
                  >
                    <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--accent-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      History & Audit Log
                    </span>
                    <span className="text-[var(--text-secondary)]">{isHistoryOpen ? '▲' : '▼'}</span>
                  </button>

                  {isHistoryOpen && (
                    <div className="p-3.5 space-y-2 bg-[var(--surface-1)] max-h-48 overflow-y-auto scrollbar-thin">
                      {cameraTaskHistory.length === 0 ? (
                        <div className="text-[10px] text-[var(--text-tertiary)] italic">No history logged yet.</div>
                      ) : (
                        <div className="space-y-2.5 text-[10px]">
                          {cameraTaskHistory.map(h => (
                            <div key={h.id} className="border-l-2 border-slate-700 pl-2.5 py-0.5 space-y-0.5">
                              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                                <span className="font-semibold text-[var(--text-primary)]">{h.event_type.replace('_', ' ')}</span>
                                <span>{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[var(--text-secondary)] text-[9.5px] leading-snug">{h.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons (Sticky Bottom) */}
              <div className="pt-4 border-t border-[var(--border)] mt-4 flex gap-3 shrink-0">
                <button
                  type="button" onClick={handleDeleteCameraClick} disabled={isPending}
                  className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold rounded-xl text-xs transition"
                >
                  Delete
                </button>
                <button
                  type="submit" disabled={isPending}
                  className="flex-[2] py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/10 transition"
                >
                  {isPending ? 'Saving...' : 'Save Specs'}
                </button>
              </div>
            </form>
          </div>
        )
      })()}
      
      {selectedDevice && (
        <div className="absolute top-4 right-4 bottom-4 w-80 max-h-[calc(100%-2rem)] bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl flex flex-col justify-between p-6 z-30 overflow-hidden shadow-2xl">
          <form onSubmit={handleSaveDevice} className="flex flex-col h-full justify-between">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              <div className="flex justify-between items-start border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNetworkDeviceColor(selectedDevice.device_type) }} />
                    {selectedDevice.name} Settings
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Edit network node specs and ports matrix</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  className="p-1 rounded bg-[var(--surface-2)] hover:bg-slate-850 text-[var(--text-secondary)] hover:text-white"
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
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Device Name</label>
                  <input
                    type="text" required value={deviceName} onChange={e => setDeviceName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Device Type</label>
                  <select
                    value={deviceType} onChange={e => setDeviceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none"
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
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Brand</label>
                    <input
                      type="text" placeholder="e.g. Cisco" value={deviceBrand} onChange={e => setDeviceBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Model</label>
                    <input
                      type="text" placeholder="e.g. C1000" value={deviceModel} onChange={e => setDeviceModel(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                {(deviceType === 'switch' || deviceType === 'Industrial Switch') && (
                  <div className="grid grid-cols-2 gap-3 border border-[var(--border)] p-3 rounded-xl bg-[var(--surface-2)]">
                    <div>
                      <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Total Ports</label>
                      <input
                        type="number" min={1} max={96} value={deviceTotalPorts} onChange={e => setDeviceTotalPorts(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">PoE Budget (W)</label>
                      <input
                        type="number" min={0} value={devicePoeBudget} onChange={e => setDevicePoeBudget(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">IP Address</label>
                    <input
                      type="text" placeholder="10.0.0.1" value={deviceIp} onChange={e => setDeviceIp(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Rack Unit</label>
                    <input
                      type="text" placeholder="e.g. RU 4" value={deviceRackUnit} onChange={e => setDeviceRackUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Location Ref</label>
                  <input
                    type="text" placeholder="MDF Room, Rack cabinet..." value={deviceLocRef} onChange={e => setDeviceLocRef(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white text-xs"
                  />
                </div>

                {/* Show switch ports matrix quick summary list inside panel */}
                {(deviceType === 'switch' || deviceType === 'Industrial Switch') && (
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <span className="block text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider">Ports Status Matrix</span>
                    {loadingPorts ? (
                      <div className="text-[10px] text-[var(--text-tertiary)] animate-pulse">Loading ports details...</div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                        {switchPorts.map(port => {
                          const camera = port.assigned_camera ?? null
                          const isAssigned = camera !== null

                          return (
                            <div key={port.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px]">
                              <span className="font-semibold text-[var(--text-primary)]">
                                Port {port.port_number} ({port.port_type.toUpperCase()})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isAssigned ? (
                                  <>
                                    <span className="text-emerald-400 font-bold">{camera.camera_id_tag}</span>
                                    <span className="text-[var(--text-tertiary)]">({camera.camera_models?.default_poe_draw || 7.5}W)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDisconnectPort(camera.id)}
                                      className="p-1 text-[var(--text-tertiary)] hover:text-rose-400"
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

            <div className="pt-4 border-t border-[var(--border)] mt-4 flex gap-3">
              <button
                type="button" onClick={handleDeleteDeviceClick} disabled={isPending}
                className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold rounded-xl text-xs"
              >
                Delete
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex-[2] py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/10"
              >
                {isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>

    {/* Backfill Preview Modal */}
    {isBackfillPreviewOpen && backfillPreviewData && (
      <div className="fixed inset-0 bg-[var(--surface-2)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Checklist Backfill Preview</h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Dry-run summary of legacy project upgrade actions</p>
            </div>
            <button
              onClick={() => setIsBackfillPreviewOpen(false)}
              className="p-1 rounded bg-[var(--surface-2)] hover:bg-slate-850 text-[var(--text-secondary)] hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            {!backfillLog ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] p-3 rounded-xl">
                    <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Cameras Scanned</span>
                    <span className="text-base font-bold text-white font-mono">{backfillPreviewData.cameras_scanned}</span>
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] p-3 rounded-xl">
                    <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Missing Checklists</span>
                    <span className="text-base font-bold text-white font-mono">{backfillPreviewData.cameras_missing_checklists}</span>
                  </div>
                </div>

                <div className="border border-[var(--border)] p-4 rounded-xl bg-[var(--surface-2)] space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Existing checklist tasks:</span>
                    <span className="font-mono text-[var(--text-primary)]">{backfillPreviewData.existing_tasks_found}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Template tasks to create:</span>
                    <span className="font-mono text-emerald-400 font-bold">+{backfillPreviewData.tasks_to_create}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Tasks skipped (already exist):</span>
                    <span className="font-mono text-[var(--text-tertiary)]">{backfillPreviewData.tasks_skipped}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Sync repairs to perform:</span>
                    <span className="font-mono text-amber-400 font-bold">{backfillPreviewData.sync_repairs_required}</span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-2.5 flex justify-between font-bold">
                    <span className="text-[var(--text-primary)]">Est. Project Tasks added:</span>
                    <span className="font-mono text-[var(--accent-text)]">+{backfillPreviewData.estimated_project_tasks_added}</span>
                  </div>
                </div>

                <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]/60 leading-normal">
                  <p className="font-bold text-[var(--text-primary)] mb-1">Preview/Dry Run Mode</p>
                  Confirming this action will safely generate missing checklist items and link unlinked tasks. No changes are applied yet.
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                  <div className="text-emerald-400 font-bold text-sm">Checklist Generation Successful!</div>
                  <p className="text-[10px] text-[var(--text-secondary)]">The project checklist upgrade is complete.</p>
                </div>

                <div className="border border-[var(--border)] p-4 rounded-xl bg-[var(--surface-2)] space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Cameras Processed:</span>
                    <span className="font-mono text-[var(--text-primary)] font-bold">{backfillLog.cameras_scanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Tasks Created:</span>
                    <span className="font-mono text-emerald-400 font-bold">+{backfillLog.tasks_created}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Sync repairs resolved:</span>
                    <span className="font-mono text-amber-400 font-bold">{backfillLog.sync_repaired}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Skipped (duplicates):</span>
                    <span className="font-mono text-[var(--text-tertiary)]">{backfillLog.tasks_skipped}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Execution time:</span>
                    <span className="font-mono text-[var(--accent-text)] font-bold">{backfillLog.duration_ms}ms</span>
                  </div>
                </div>

                {backfillLog.errors && backfillLog.errors.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-1">
                    <div className="font-bold text-[10px] uppercase">Errors Encountered:</div>
                    <ul className="list-disc list-inside text-[9.5px] space-y-0.5">
                      {backfillLog.errors.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex gap-3">
            {!backfillLog ? (
              <>
                <button
                  onClick={() => setIsBackfillPreviewOpen(false)}
                  className="flex-1 py-2 px-4 bg-[var(--surface-2)] hover:bg-slate-850 border border-[var(--border)] text-[var(--text-secondary)] font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackfillConfirm}
                  disabled={isBackfilling}
                  className="flex-[2] py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  {isBackfilling ? 'Processing...' : 'Confirm Generate Missing Checklists'}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsBackfillPreviewOpen(false)
                  window.location.reload()
                }}
                className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white font-bold rounded-xl text-xs transition"
              >
                Reload Page & Apply
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Fullscreen Split-Pane Checklist Modal */}
    {isFullChecklistOpen && selectedCamera && (
      <div className="fixed inset-0 bg-[var(--surface-2)]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl h-[80vh] bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCameraStatusColor(cameraStatus) }} />
                <h3 className="text-base font-black text-white tracking-tight">{selectedCamera.camera_id_tag} Full Checklist</h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold font-mono bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded-full uppercase">{cameraCommType}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Detailed task controls, due dates, assignee configuration, and audit logs.</p>
            </div>
            <button
              onClick={() => setIsFullChecklistOpen(false)}
              className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-slate-700 text-[var(--text-secondary)] hover:text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Modal Split-Pane Content */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Pane: Tasks Sidebar */}
            <div className="w-2/5 border-r border-[var(--border)]/60 overflow-y-auto p-4 space-y-2.5 bg-[var(--surface-2)]/10">
              <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">Tasks Checklist</span>
              {cameraTasks.length === 0 ? (
                <div className="text-center p-8 italic text-[var(--text-tertiary)] text-xs">No tasks found.</div>
              ) : (
                cameraTasks.map(task => {
                  const isActive = task.id === (activeModalTaskId || cameraTasks[0]?.id)
                  return (
                    <button
                      key={task.id}
                      onClick={() => setActiveModalTaskId(task.id)}
                      className={`w-full flex items-center justify-between text-left p-3 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 border-[var(--accent)]/40 text-white shadow-sm'
                          : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'Complete'}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleToggleTaskStatus(task)
                          }}
                          className="rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                        />
                        <span className={`text-[12px] font-bold truncate leading-snug ${task.status === 'Complete' ? 'line-through text-[var(--text-tertiary)]' : ''}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          task.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          task.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          task.priority === 'Medium' ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 text-[var(--accent-text)] border border-[var(--accent)]/20' :
                          'bg-slate-500/10 text-[var(--text-secondary)] border border-[var(--border)]/30'
                        }`}>
                          {task.priority[0]}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          task.status === 'Complete' ? 'bg-emerald-500' :
                          task.status === 'In Progress' ? 'bg-blue-500' :
                          task.status === 'Blocked' ? 'bg-rose-500' :
                          task.status === 'Failed QA' ? 'bg-amber-500' :
                          task.status === 'Needs Rework' ? 'bg-orange-500' : 'bg-slate-500'
                        }`} />
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Right Pane: Selected Task Form details & History */}
            <div className="w-3/5 overflow-y-auto p-6 bg-[var(--surface-1)] flex flex-col justify-between">
              {(() => {
                const activeTask = cameraTasks.find(t => t.id === (activeModalTaskId || cameraTasks[0]?.id))
                if (!activeTask) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] italic text-xs">
                      Select a task from the sidebar to view details.
                    </div>
                  )
                }

                const taskHistory = cameraTaskHistory.filter(h => h.camera_task_id === activeTask.id)

                return (
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Title & Type */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-white leading-tight">{activeTask.title}</h4>
                          <span className="inline-block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded">
                            {activeTask.task_type}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] font-bold bg-[var(--surface-2)] px-2.5 py-1 rounded-xl border border-[var(--border)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeTask.status === 'Complete'}
                              onChange={() => handleToggleTaskStatus(activeTask)}
                              className="rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span>Complete</span>
                          </label>
                        </div>
                      </div>

                      {/* Controls Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-b border-[var(--border)]/60 py-4 mt-2">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</label>
                          <select
                            value={activeTask.status}
                            onChange={(e) => handleTaskStatusChange(activeTask.id, e.target.value)}
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Blocked">Blocked</option>
                            <option value="Complete">Complete</option>
                            <option value="Failed QA">Failed QA</option>
                            <option value="Needs Rework">Needs Rework</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Priority</label>
                          <select
                            value={activeTask.priority}
                            onChange={(e) => handleTaskPriorityChange(activeTask.id, e.target.value)}
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Assigned To</label>
                          <select
                            value={activeTask.assigned_to || ''}
                            onChange={async (e) => {
                              const val = e.target.value || null
                              startTransition(async () => {
                                await updateCameraTaskStatus({
                                  projectId,
                                  taskId: activeTask.id,
                                  assignedTo: val
                                })
                                await loadCameraTasksAndHistory(selectedCamera.id)
                              })
                            }}
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {profiles.map(p => (
                              <option key={p.id} value={p.id}>{p.full_name || 'Generic Profile'}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Due Date</label>
                          <input
                            type="date"
                            value={activeTask.due_date ? activeTask.due_date.substring(0, 10) : ''}
                            onChange={async (e) => {
                              const val = e.target.value ? new Date(e.target.value).toISOString() : null
                              startTransition(async () => {
                                await updateCameraTaskStatus({
                                  projectId,
                                  taskId: activeTask.id,
                                  dueDate: val
                                })
                                await loadCameraTasksAndHistory(selectedCamera.id)
                              })
                            }}
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Task Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Add task description or remarks..."
                          defaultValue={activeTask.notes || ''}
                          onBlur={async (e) => {
                            const val = e.target.value.trim() || null
                            if (val !== activeTask.notes) {
                              startTransition(async () => {
                                await updateCameraTaskStatus({
                                  projectId,
                                  taskId: activeTask.id,
                                  notes: val
                                })
                                await loadCameraTasksAndHistory(selectedCamera.id)
                              })
                            }
                          }}
                          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Task History Timeline */}
                    <div className="border-t border-[var(--border)] pt-4 mt-2">
                      <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">Task Activity Log</span>
                      {taskHistory.length === 0 ? (
                        <div className="text-[10px] text-[var(--text-tertiary)] italic">No activity logged for this task yet.</div>
                      ) : (
                        <div className="space-y-3 max-h-[150px] overflow-y-auto scrollbar-thin pr-1 text-[10px]">
                          {taskHistory.map(h => (
                            <div key={h.id} className="border-l-2 border-[var(--border)] pl-3.5 py-0.5 space-y-0.5 relative">
                              <div className="absolute left-[-5px] top-[6px] w-2.5 h-2.5 rounded-full bg-[var(--surface-1)] border border-[var(--border)]" />
                              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                                <span className="font-bold text-[var(--text-primary)] uppercase text-[9px] tracking-wide">{h.event_type.replace('_', ' ')}</span>
                                <span>{new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              <p className="text-[var(--text-secondary)] text-[10px] leading-snug">{h.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

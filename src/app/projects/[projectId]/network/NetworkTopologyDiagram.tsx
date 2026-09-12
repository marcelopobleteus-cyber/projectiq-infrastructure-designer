'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Database } from '@/types/supabase'

type NetworkDevice = Database['public']['Tables']['network_devices']['Row']
type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']

interface NetworkTopologyDiagramProps {
  projectId: string
  networkDevices: NetworkDevice[]
  cameras: CameraLocation[]
  cameraModels: CameraModel[]
}

interface NodePosition {
  x: number
  y: number
  isCustom?: boolean
}

interface PositionsMap {
  [nodeId: string]: NodePosition
}

// Layout constants — shared between the position algorithm and the camera
// grid so columns and camera clusters always agree on spacing (this is what
// keeps icons from overlapping regardless of how many devices/cameras exist).
const CANVAS_MARGIN = 70
const NODE_COL_GAP = 46
const CAM_W = 40
const CAM_GAP = 16
const DEV_W = 70
const CAMS_PER_ROW = 4
const CAM_ROW_GAP = 52
const LEVEL_GAP = 100

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.5

type NodeKind = 'gateway' | 'switch' | 'wireless' | 'camera'

function iconPathsFor(kind: NodeKind): string[] {
  switch (kind) {
    case 'gateway':
      return [
        'M 12 2 A 10 10 0 1 0 22 12 A 10 10 0 0 0 12 2 Z',
        'M 2 12 H 22',
        'M 12 2 A 15.3 15.3 0 0 1 12 22 A 15.3 15.3 0 0 1 12 2 Z',
      ]
    case 'wireless':
      // Signal/radio-wave icon — matches the Wireless Links iconography used
      // elsewhere in the app (landing page, map asset markers).
      return [
        'M 12 20 H 12.01',
        'M 8.111 16.404 A 5.5 5.5 0 0 1 15.889 16.404',
        'M 5.283 13.576 A 9.5 9.5 0 0 1 18.717 13.576',
      ]
    case 'camera':
      return ['M 23 7 L 16 12 L 23 17 Z', 'M 1 5 H 15 V 19 H 1 Z']
    case 'switch':
    default:
      return [
        'M 2 5 H 22 V 9 H 2 V 5 Z',
        'M 2 15 H 22 V 19 H 2 V 15 Z',
        'M 6 7 H 7',
        'M 10 7 H 11',
        'M 6 17 H 7',
        'M 10 17 H 11',
      ]
  }
}

const WIRELESS_ACCENT = '#f97316'

export default function NetworkTopologyDiagram({
  projectId,
  networkDevices,
  cameras,
  cameraModels,
}: NetworkTopologyDiagramProps) {
  const canvasRef = useRef<SVGSVGElement | null>(null)

  // State for node positions
  const [positions, setPositions] = useState<PositionsMap>({})
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)

  // Pan / zoom state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panDrag, setPanDrag] = useState<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number; scaleX: number; scaleY: number } | null>(null)

  // Group-select ("marquee") state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  // 1. Separate devices by role
  const routers = useMemo(() => networkDevices.filter(d => d.device_type === 'router'), [networkDevices])
  const nvrs = useMemo(() => networkDevices.filter(d => d.device_type === 'nvr'), [networkDevices])
  const switches = useMemo(() => networkDevices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch'), [networkDevices])
  const wirelessDevices = useMemo(() => networkDevices.filter(d => d.device_type === 'Wireless Radio'), [networkDevices])
  const others = useMemo(
    () => networkDevices.filter(d => !['router', 'nvr', 'switch', 'Industrial Switch', 'Wireless Radio'].includes(d.device_type)),
    [networkDevices]
  )
  const deviceById = useMemo(() => new Map(networkDevices.map(d => [d.id, d])), [networkDevices])

  // 2. Generate default non-overlapping positions.
  // Every "distribution" node (switch or wireless radio) gets its own reserved
  // horizontal column sized to how many cameras hang off it, laid out left to
  // right — instead of dividing the fixed canvas evenly, which is what caused
  // icons to stack on top of each other once a project had more than a
  // handful of switches/cameras.
  const { positions: defaultPositions, canvasWidth, canvasHeight } = useMemo(() => {
    const pos: PositionsMap = {}

    const camsByDevice = new Map<string, CameraLocation[]>()
    const unassignedCams: CameraLocation[] = []
    cameras.forEach(cam => {
      if (cam.assigned_network_device_id) {
        const list = camsByDevice.get(cam.assigned_network_device_id) || []
        list.push(cam)
        camsByDevice.set(cam.assigned_network_device_id, list)
      } else {
        unassignedCams.push(cam)
      }
    })

    const colWidthForCount = (count: number) => {
      if (count === 0) return DEV_W + NODE_COL_GAP
      const perRow = Math.min(count, CAMS_PER_ROW)
      return Math.max(DEV_W + NODE_COL_GAP, perRow * (CAM_W + CAM_GAP) + NODE_COL_GAP)
    }

    const distributionNodes = [...switches, ...wirelessDevices]

    let cursor = CANVAS_MARGIN
    const columns: Array<{ id: string; x: number; colWidth: number; cams: CameraLocation[] }> = []
    distributionNodes.forEach(node => {
      const camList = camsByDevice.get(node.id) || []
      const colWidth = colWidthForCount(camList.length)
      const x = cursor + colWidth / 2
      columns.push({ id: node.id, x, colWidth, cams: camList })
      cursor += colWidth
    })

    const unassignedColWidth = unassignedCams.length > 0 ? colWidthForCount(unassignedCams.length) : 0
    const unassignedX = cursor + unassignedColWidth / 2
    if (unassignedCams.length > 0) cursor += unassignedColWidth

    const canvasWidth = Math.max(1000, cursor + CANVAS_MARGIN)

    // Level 0: Router / Gateway
    let y = 70
    const gatewayId = routers.length > 0 ? `device-${routers[0].id}` : 'default-gateway'
    pos[gatewayId] = { x: canvasWidth / 2, y }
    y += LEVEL_GAP

    // Level 1: NVRs
    if (nvrs.length > 0) {
      nvrs.forEach((n, idx) => {
        pos[`device-${n.id}`] = {
          x: nvrs.length === 1 ? canvasWidth / 2 : (idx + 1) * (canvasWidth / (nvrs.length + 1)),
          y,
        }
      })
      y += LEVEL_GAP
    }

    // Level 2: Switches + Wireless Radios (each in its own reserved column)
    const distributionY = y
    columns.forEach(col => {
      pos[`device-${col.id}`] = { x: col.x, y: distributionY }
    })
    y += LEVEL_GAP

    // Level 2b: Other equipment (patch panels, UPS, media converters, etc.)
    if (others.length > 0) {
      others.forEach((o, idx) => {
        pos[`device-${o.id}`] = {
          x: others.length === 1 ? canvasWidth / 2 : (idx + 1) * (canvasWidth / (others.length + 1)),
          y,
        }
      })
      y += LEVEL_GAP
    }

    // Level 3: Cameras, gridded within their parent's column
    const cameraTopY = y + 20
    let maxRows = 0
    columns.forEach(col => {
      const count = col.cams.length
      if (count === 0) return
      const rows = Math.ceil(count / CAMS_PER_ROW)
      maxRows = Math.max(maxRows, rows)
      col.cams.forEach((cam, idx) => {
        const rowIdx = Math.floor(idx / CAMS_PER_ROW)
        const rowStart = rowIdx * CAMS_PER_ROW
        const rowCount = Math.min(count - rowStart, CAMS_PER_ROW)
        const colIdx = idx - rowStart
        const rowWidth = rowCount * (CAM_W + CAM_GAP) - CAM_GAP
        const startX = col.x - rowWidth / 2 + CAM_W / 2
        pos[`camera-${cam.id}`] = {
          x: startX + colIdx * (CAM_W + CAM_GAP),
          y: cameraTopY + rowIdx * CAM_ROW_GAP,
        }
      })
    })

    if (unassignedCams.length > 0) {
      const count = unassignedCams.length
      const rows = Math.ceil(count / CAMS_PER_ROW)
      maxRows = Math.max(maxRows, rows)
      unassignedCams.forEach((cam, idx) => {
        const rowIdx = Math.floor(idx / CAMS_PER_ROW)
        const rowStart = rowIdx * CAMS_PER_ROW
        const rowCount = Math.min(count - rowStart, CAMS_PER_ROW)
        const colIdx = idx - rowStart
        const rowWidth = rowCount * (CAM_W + CAM_GAP) - CAM_GAP
        const startX = unassignedX - rowWidth / 2 + CAM_W / 2
        pos[`camera-${cam.id}`] = {
          x: startX + colIdx * (CAM_W + CAM_GAP),
          y: cameraTopY + rowIdx * CAM_ROW_GAP,
        }
      })
    }

    const canvasHeight = Math.max(560, cameraTopY + Math.max(1, maxRows) * CAM_ROW_GAP + 40)

    return { positions: pos, canvasWidth, canvasHeight }
  }, [routers, nvrs, switches, wirelessDevices, others, cameras])

  // 3. Load layout from localStorage or fallback to default layout
  useEffect(() => {
    const storageKey = `topology-layout-${projectId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const merged = { ...defaultPositions, ...parsed }
        setPositions(merged)
      } catch (err) {
        console.error('Failed to parse saved layout, using default:', err)
        setPositions(defaultPositions)
      }
    } else {
      setPositions(defaultPositions)
    }
  }, [defaultPositions, projectId])

  // 4. Save layout to localStorage
  const savePositions = (updated: PositionsMap) => {
    const storageKey = `topology-layout-${projectId}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  // --- Coordinate helpers (account for pan + zoom) ---
  const vbWidth = canvasWidth / zoom
  const vbHeight = canvasHeight / zoom

  const clientToSvg = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const scaleX = vbWidth / rect.width
    const scaleY = vbHeight / rect.height
    return { x: pan.x + (clientX - rect.left) * scaleX, y: pan.y + (clientY - rect.top) * scaleY }
  }

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
    if (newZoom === zoom) return
    const ratioX = (clientX - rect.left) / rect.width
    const ratioY = (clientY - rect.top) / rect.height
    const focusX = pan.x + ratioX * vbWidth
    const focusY = pan.y + ratioY * vbHeight
    const newVbW = canvasWidth / newZoom
    const newVbH = canvasHeight / newZoom
    setZoom(newZoom)
    setPan({ x: focusX - ratioX * newVbW, y: focusY - ratioY * newVbH })
  }

  const handleZoomButton = (factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1)
  }

  // Handle node drag interactions (single node, or the whole group when the
  // dragged node is part of a multi-selection made with the select tool)
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (selectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(nodeId)) next.delete(nodeId)
        else next.add(nodeId)
        return next
      })
      setActiveNodeId(nodeId)
      return
    }

    const svgPoint = clientToSvg(e.clientX, e.clientY)
    const nodePos = positions[nodeId] || { x: svgPoint.x, y: svgPoint.y }
    setDraggingNode({ id: nodeId, offsetX: svgPoint.x - nodePos.x, offsetY: svgPoint.y - nodePos.y })
    setActiveNodeId(nodeId)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only fires when the background (not a node) is pressed, since node
    // handlers call stopPropagation().
    const svgPoint = clientToSvg(e.clientX, e.clientY)
    if (selectMode) {
      setMarquee({ x0: svgPoint.x, y0: svgPoint.y, x1: svgPoint.x, y1: svgPoint.y })
      return
    }
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setPanDrag({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      scaleX: vbWidth / rect.width,
      scaleY: vbHeight / rect.height,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNode) {
      const svgPoint = clientToSvg(e.clientX, e.clientY)
      const newX = Math.max(30, Math.min(canvasWidth - 30, svgPoint.x - draggingNode.offsetX))
      const newY = Math.max(30, Math.min(canvasHeight - 30, svgPoint.y - draggingNode.offsetY))

      const current = positions[draggingNode.id] || { x: newX, y: newY }
      const deltaX = newX - current.x
      const deltaY = newY - current.y

      const movingGroup = selectedIds.has(draggingNode.id) && selectedIds.size > 1

      setPositions(prev => {
        const updated = { ...prev }
        if (movingGroup) {
          selectedIds.forEach(id => {
            const p = prev[id]
            if (!p) return
            updated[id] = {
              x: Math.max(30, Math.min(canvasWidth - 30, p.x + deltaX)),
              y: Math.max(30, Math.min(canvasHeight - 30, p.y + deltaY)),
              isCustom: true,
            }
          })
        } else {
          updated[draggingNode.id] = { x: newX, y: newY, isCustom: true }
        }
        return updated
      })
      return
    }

    if (panDrag) {
      const dx = (e.clientX - panDrag.startClientX) * panDrag.scaleX
      const dy = (e.clientY - panDrag.startClientY) * panDrag.scaleY
      setPan({ x: panDrag.startPanX - dx, y: panDrag.startPanY - dy })
      return
    }

    if (marquee) {
      const svgPoint = clientToSvg(e.clientX, e.clientY)
      setMarquee({ ...marquee, x1: svgPoint.x, y1: svgPoint.y })
    }
  }

  const handleMouseUp = () => {
    if (draggingNode) {
      savePositions(positions)
      setDraggingNode(null)
    }
    if (panDrag) {
      setPanDrag(null)
    }
    if (marquee) {
      const minX = Math.min(marquee.x0, marquee.x1)
      const maxX = Math.max(marquee.x0, marquee.x1)
      const minY = Math.min(marquee.y0, marquee.y1)
      const maxY = Math.max(marquee.y0, marquee.y1)
      const ids = Object.entries(positions)
        .filter(([, p]) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
        .map(([id]) => id)
      setSelectedIds(new Set(ids))
      setMarquee(null)
    }
  }

  const handleResetLayout = () => {
    if (confirm('Are you sure you want to reset the visual layout to the default structure?')) {
      setPositions(defaultPositions)
      const storageKey = `topology-layout-${projectId}`
      localStorage.removeItem(storageKey)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(v => {
      if (v) setSelectedIds(new Set())
      return !v
    })
  }

  // Helper to draw clean bezier path connecting nodes
  const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = y2 - y1
    return `M ${x1} ${y1} C ${x1} ${y1 + dy / 2}, ${x2} ${y2 - dy / 2}, ${x2} ${y2}`
  }

  // Get current active selection details
  const selectedNodeDetails = useMemo(() => {
    if (!activeNodeId) return null

    if (activeNodeId.startsWith('device-')) {
      const id = activeNodeId.replace('device-', '')
      const dev = networkDevices.find(d => d.id === id)
      if (!dev) return null

      const switchCams = cameras.filter(c => c.assigned_network_device_id === dev.id)
      const poeUsed = switchCams.reduce((acc, cam) => {
        const model = cameraModels.find(m => m.id === cam.camera_model_id)
        return acc + Number(model?.default_poe_draw || 7.50)
      }, 0)

      return {
        type: 'device',
        name: dev.name,
        device_type: dev.device_type,
        ip_address: dev.ip_address,
        manufacturer: dev.manufacturer,
        model_number: dev.model_number,
        total_ports: dev.total_ports,
        poe_budget_watts: dev.poe_budget_watts,
        poe_used: dev.poe_budget_watts ? poeUsed : 0,
        status: dev.status,
        location: dev.location_reference,
        connectedCount: switchCams.length,
        connectedDevices: switchCams.map(c => c.camera_id_tag),
        isWireless: dev.device_type === 'Wireless Radio',
      }
    } else if (activeNodeId.startsWith('camera-')) {
      const id = activeNodeId.replace('camera-', '')
      const cam = cameras.find(c => c.id === id)
      if (!cam) return null

      const model = cameraModels.find(m => m.id === cam.camera_model_id)
      const sw = networkDevices.find(d => d.id === cam.assigned_network_device_id)

      return {
        type: 'camera',
        name: cam.camera_id_tag,
        device_type: 'Camera',
        ip_address: 'Assigned via DHCP',
        manufacturer: model?.manufacturer || 'Generic',
        model_number: model?.model_number || 'IP Camera',
        poe_draw: model?.default_poe_draw || 7.50,
        status: cam.status,
        location: cam.address_reference || cam.structure_reference || 'Map Coordinate',
        parentSwitch: sw ? sw.name : 'Unassigned',
        isWireless: cam.communication_type === 'wireless',
      }
    } else if (activeNodeId === 'default-gateway') {
      return {
        type: 'gateway',
        name: 'Core Router / Gateway',
        device_type: 'router',
        ip_address: '10.0.0.1',
        manufacturer: 'Cisco / Juniper',
        model_number: 'Enterprise Gateway',
        status: 'Active',
        location: 'Main Server Rack',
        connectedCount: switches.length + wirelessDevices.length,
        connectedDevices: [...switches, ...wirelessDevices].map(s => s.name),
        isWireless: false,
      }
    }
    return null
  }, [activeNodeId, networkDevices, cameras, cameraModels, switches, wirelessDevices])

  // Compute connections list (edges) to draw in background
  const connections = useMemo(() => {
    const list: Array<{
      id: string
      fromX: number
      fromY: number
      toX: number
      toY: number
      fromNodeId: string
      toNodeId: string
      isActive: boolean
      isWireless: boolean
    }> = []

    const gatewayId = routers.length > 0 ? `device-${routers[0].id}` : 'default-gateway'
    const gatePos = positions[gatewayId]

    if (gatePos) {
      nvrs.forEach((nvr) => {
        const nvrId = `device-${nvr.id}`
        const nPos = positions[nvrId]
        if (nPos) {
          list.push({
            id: `link-gateway-nvr-${nvr.id}`,
            fromX: gatePos.x,
            fromY: gatePos.y,
            toX: nPos.x,
            toY: nPos.y,
            fromNodeId: gatewayId,
            toNodeId: nvrId,
            isActive: hoveredNodeId === gatewayId || hoveredNodeId === nvrId,
            isWireless: false,
          })
        }
      })

      // Link switches and wireless radios directly to the Core Gateway.
      //
      // There used to be a branch here that linked a switch to a parent switch via
      // `sw.assigned_switch_id`. That column does not exist on `network_devices`, so the
      // value was always undefined and the branch never ran. It was removed rather than
      // left as dead code. To support switch-to-switch links, add the column in a
      // migration and reinstate this with a way to assign the parent in the UI.
      ;[...switches, ...wirelessDevices].forEach((sw) => {
        const swId = `device-${sw.id}`
        const swPos = positions[swId]
        if (swPos) {
          list.push({
            id: `link-gateway-switch-${sw.id}`,
            fromX: gatePos.x,
            fromY: gatePos.y,
            toX: swPos.x,
            toY: swPos.y,
            fromNodeId: gatewayId,
            toNodeId: swId,
            isActive: hoveredNodeId === gatewayId || hoveredNodeId === swId,
            isWireless: sw.device_type === 'Wireless Radio',
          })
        }
      })
    }

    // Link cameras to their assigned device (switch or wireless radio)
    cameras.forEach((cam) => {
      if (cam.assigned_network_device_id) {
        const swId = `device-${cam.assigned_network_device_id}`
        const camId = `camera-${cam.id}`
        const swPos = positions[swId]
        const camPos = positions[camId]
        const parentDev = deviceById.get(cam.assigned_network_device_id)

        if (swPos && camPos) {
          list.push({
            id: `link-switch-camera-${cam.id}`,
            fromX: swPos.x,
            fromY: swPos.y,
            toX: camPos.x,
            toY: camPos.y,
            fromNodeId: swId,
            toNodeId: camId,
            isActive: hoveredNodeId === swId || hoveredNodeId === camId,
            isWireless: cam.communication_type === 'wireless' || parentDev?.device_type === 'Wireless Radio',
          })
        }
      }
    })

    return list
  }, [positions, routers, nvrs, switches, wirelessDevices, cameras, hoveredNodeId, deviceById])

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full w-full bg-[var(--surface-2)] font-sans">

      {/* Topology Canvas Left Column */}
      <div className="flex-1 flex flex-col overflow-hidden h-full p-6 relative">

        {/* Canvas Toolbar Controls */}
        <div className="flex items-center justify-between mb-4 z-20">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Logical Network Topology</h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {selectMode
                ? 'Drag a box to select a group of nodes, then drag any of them to move the group together.'
                : 'Drag to pan the canvas, or drag a node to reposition it. Scroll to zoom.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="px-2 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent-text)] text-[10px] font-bold">
                {selectedIds.size} selected
              </span>
            )}
            <button
              onClick={handleResetLayout}
              className="px-2.5 py-1 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-[10px] font-bold transition-all"
            >
              Reset Layout
            </button>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl overflow-hidden relative shadow-inner select-none">
          <svg
            ref={canvasRef}
            width="100%"
            height="100%"
            viewBox={`${pan.x} ${pan.y} ${vbWidth} ${vbHeight}`}
            className={`w-full h-full ${selectMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid Pattern Definition */}
            <defs>
              <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(71, 85, 105, 0.18)" />
              </pattern>
            </defs>
            <rect x={-2000} y={-2000} width={canvasWidth + 4000} height={canvasHeight + 4000} fill="url(#canvas-grid)" />

            {/* Connection Lines (Edges) */}
            <g>
              {connections.map((link) => (
                <path
                  key={link.id}
                  d={getCurvePath(link.fromX, link.fromY, link.toX, link.toY)}
                  fill="none"
                  stroke={link.isWireless ? WIRELESS_ACCENT : link.isActive ? '#6366f1' : '#1e293b'}
                  strokeWidth={link.isActive ? 2.5 : 1.5}
                  strokeDasharray={link.isWireless ? '6 4' : undefined}
                  className="transition-all duration-200"
                  style={{
                    filter: link.isActive ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' : 'none'
                  }}
                />
              ))}
            </g>

            {/* Marquee selection rectangle */}
            {marquee && (
              <rect
                x={Math.min(marquee.x0, marquee.x1)}
                y={Math.min(marquee.y0, marquee.y1)}
                width={Math.abs(marquee.x1 - marquee.x0)}
                height={Math.abs(marquee.y1 - marquee.y0)}
                fill="rgba(99, 102, 241, 0.12)"
                stroke="#6366f1"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )}

            {/* Nodes Layer */}
            <g>
              {Object.entries(positions).map(([id, pos]) => {
                const isCamera = id.startsWith('camera-')
                const isGateway = id === 'default-gateway'
                const isDevice = id.startsWith('device-')

                let name = 'Unknown'
                let typeLabel = ''
                let status = 'Planned'
                let isWirelessNode = false
                let kind: NodeKind = 'switch'

                if (isGateway) {
                  name = 'Gateway Router'
                  typeLabel = 'router'
                  status = 'Active'
                  kind = 'gateway'
                } else if (isDevice) {
                  const devId = id.replace('device-', '')
                  const dev = networkDevices.find(d => d.id === devId)
                  if (dev) {
                    name = dev.name
                    typeLabel = dev.device_type
                    status = dev.status
                    isWirelessNode = dev.device_type === 'Wireless Radio'
                    kind = isWirelessNode ? 'wireless' : 'switch'
                  }
                  if (routers.some(r => `device-${r.id}` === id)) kind = 'gateway'
                } else if (isCamera) {
                  const camId = id.replace('camera-', '')
                  const cam = cameras.find(c => c.id === camId)
                  if (cam) {
                    name = cam.camera_id_tag
                    typeLabel = 'camera'
                    status = cam.status
                    isWirelessNode = cam.communication_type === 'wireless'
                  }
                  kind = 'camera'
                }

                const iconPaths = iconPathsFor(kind)
                const isActive = activeNodeId === id
                const isHovered = hoveredNodeId === id
                const isSelected = selectedIds.has(id)

                let statusColor = '#94a3b8' // gray
                if (status === 'Installed' || status === 'Active' || status === 'complete') statusColor = '#10b981' // green
                else if (status === 'Planned' || status === 'planned') statusColor = '#3b82f6' // blue
                else if (status === 'Blocked' || status === 'issue') statusColor = '#f43f5e' // red
                else if (status === 'in_progress') statusColor = '#f59e0b' // amber

                const borderColor = isSelected
                  ? '#6366f1'
                  : isActive
                  ? '#6366f1'
                  : isHovered
                  ? '#475569'
                  : isWirelessNode
                  ? WIRELESS_ACCENT
                  : '#1e293b'

                return (
                  <g
                    key={id}
                    transform={`translate(${pos.x - (isCamera ? 20 : 35)}, ${pos.y - 20})`}
                    className="cursor-pointer"
                    onMouseDown={(e) => handleMouseDown(id, e)}
                    onMouseEnter={() => setHoveredNodeId(id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {/* Background Rect Card */}
                    <rect
                      width={isCamera ? 40 : 70}
                      height={40}
                      rx={8}
                      fill={isActive || isSelected ? '#0f172a' : '#020617'}
                      stroke={borderColor}
                      strokeWidth={isActive || isSelected ? 2 : 1}
                      strokeDasharray={isSelected ? '3 2' : undefined}
                      className="transition-all duration-150"
                      style={{
                        filter: (isActive || isHovered || isSelected) ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.25))' : 'none'
                      }}
                    />

                    {/* SVG Icon representation */}
                    <g
                      transform={`translate(${isCamera ? 12 : 27}, 8) scale(0.65)`}
                      stroke={isActive ? '#818cf8' : isWirelessNode ? WIRELESS_ACCENT : '#64748b'}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {iconPaths.map((p, idx) => (
                        <path key={idx} d={p} />
                      ))}
                    </g>

                    {/* Node Tag text */}
                    <text
                      x={isCamera ? 20 : 35}
                      y={32}
                      textAnchor="middle"
                      fill={isActive ? '#ffffff' : '#94a3b8'}
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="transition-colors duration-150"
                    >
                      {name.length > 10 ? `${name.substring(0, 8)}..` : name}
                    </text>

                    {/* Node status dot */}
                    <circle
                      cx={isCamera ? 34 : 64}
                      cy={6}
                      r="3"
                      fill={statusColor}
                    />
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Icon dock: zoom, reset view, group-select — docked to the right edge like the map toolbar */}
          <div className="absolute top-3 right-3 bottom-3 z-20 flex items-start pointer-events-none">
            <div className="flex flex-col items-center gap-1 p-1.5 bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl pointer-events-auto">
              <button
                onClick={() => handleZoomButton(1.25)}
                title="Zoom in"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>
              </button>
              <button
                onClick={() => handleZoomButton(0.8)}
                title="Zoom out"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" /></svg>
              </button>
              <button
                onClick={handleResetView}
                title="Reset zoom & pan"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
              </button>
              <div className="w-full h-px bg-[var(--border)]" />
              <button
                onClick={toggleSelectMode}
                title="Select a group of nodes"
                className={`p-1.5 rounded-lg transition-all ${selectMode ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="4 3" /></svg>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-20 bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl px-3 py-2.5 text-[10px] font-sans pointer-events-none">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{iconPathsFor('gateway').map((p, i) => <path key={i} d={p} />)}</svg>
                Gateway / Router
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{iconPathsFor('switch').map((p, i) => <path key={i} d={p} />)}</svg>
                Switch
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={WIRELESS_ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{iconPathsFor('wireless').map((p, i) => <path key={i} d={p} />)}</svg>
                Wireless Radio
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{iconPathsFor('camera').map((p, i) => <path key={i} d={p} />)}</svg>
                Camera
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] col-span-2">
                <svg width="18" height="10" viewBox="0 0 18 10"><line x1="0" y1="5" x2="18" y2="5" stroke="#1e293b" strokeWidth="2" /></svg>
                Wired link
                <svg width="18" height="10" viewBox="0 0 18 10" className="ml-2"><line x1="0" y1="5" x2="18" y2="5" stroke={WIRELESS_ACCENT} strokeWidth="2" strokeDasharray="4 3" /></svg>
                Wireless link
              </div>
            </div>
            <div className="border-t border-[var(--border)] mt-2 pt-1.5 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><span className="w-2 h-2 rounded-full bg-emerald-500" />Active</span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><span className="w-2 h-2 rounded-full bg-blue-500" />Planned</span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><span className="w-2 h-2 rounded-full bg-amber-500" />In Progress</span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><span className="w-2 h-2 rounded-full bg-rose-500" />Blocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Side Panel Right Column */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--surface-2)] p-6 flex flex-col h-full overflow-y-auto scrollbar-thin no-print">
        {selectedNodeDetails ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-[var(--surface-1)] text-[var(--accent-text)] border border-[var(--accent)]/10">
                  {selectedNodeDetails.device_type}
                </span>
                {selectedNodeDetails.isWireless && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    Wireless
                  </span>
                )}
                <span className={`w-2 h-2 rounded-full ${
                  selectedNodeDetails.status === 'Installed' || selectedNodeDetails.status === 'Active' || selectedNodeDetails.status === 'complete'
                    ? 'bg-emerald-500'
                    : selectedNodeDetails.status === 'Planned' || selectedNodeDetails.status === 'planned'
                    ? 'bg-blue-500'
                    : selectedNodeDetails.status === 'Blocked' || selectedNodeDetails.status === 'issue'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`} />
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-mono">{selectedNodeDetails.status}</span>
              </div>
              <h4 className="text-lg font-black text-[var(--text-primary)] mt-2 tracking-tight">{selectedNodeDetails.name}</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{selectedNodeDetails.location || 'No physical location notes.'}</p>
            </div>

            <div className="border-t border-[var(--border)] pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-tertiary)]">IP Address</span>
                <span className="font-mono text-[var(--text-primary)] font-bold">{selectedNodeDetails.ip_address || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-tertiary)]">Manufacturer</span>
                <span className="text-[var(--text-secondary)]">{selectedNodeDetails.manufacturer || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-tertiary)]">Model Number</span>
                <span className="text-[var(--text-secondary)]">{selectedNodeDetails.model_number || 'N/A'}</span>
              </div>

              {selectedNodeDetails.type === 'device' && selectedNodeDetails.total_ports && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-tertiary)]">Total Ports</span>
                    <span className="font-mono text-[var(--text-secondary)]">{selectedNodeDetails.total_ports} ports</span>
                  </div>
                  {selectedNodeDetails.poe_budget_watts ? (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--text-tertiary)]">PoE Power Utilization</span>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {selectedNodeDetails.poe_used}W / {selectedNodeDetails.poe_budget_watts}W
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (selectedNodeDetails.poe_used / selectedNodeDetails.poe_budget_watts) > 1
                              ? 'bg-rose-500'
                              : 'bg-[var(--accent)] text-white'
                          }`}
                          style={{
                            width: `${Math.min(100, (selectedNodeDetails.poe_used / selectedNodeDetails.poe_budget_watts) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {selectedNodeDetails.type === 'camera' && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-tertiary)]">PoE Power Draw</span>
                  <span className="font-mono text-[var(--accent-text)] font-bold">{(selectedNodeDetails as any).poe_draw} W</span>
                </div>
              )}
            </div>

            {selectedNodeDetails.connectedCount ? (
              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <h5 className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
                  Connected Elements ({selectedNodeDetails.connectedCount})
                </h5>
                <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">
                  {selectedNodeDetails.connectedDevices?.map((tag: string, idx: number) => (
                    <div key={idx} className="px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)]/60 rounded-lg text-xs font-mono font-bold text-[var(--text-primary)]">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedNodeDetails.type === 'camera' && (selectedNodeDetails as any).parentSwitch ? (
              <div className="border-t border-[var(--border)] pt-4 space-y-1.5">
                <h5 className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Connected Switch Uplink</h5>
                <div className="px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)]/60 rounded-lg text-xs font-mono font-bold text-[var(--text-primary)]">
                  {(selectedNodeDetails as any).parentSwitch}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-650 p-6">
            <svg className="w-8 h-8 text-slate-800 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.085 1.085l-.04.04m-2.122 0A2.25 2.25 0 119.75 9H12v2.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
            <h5 className="text-xs font-bold text-[var(--text-secondary)]">No element selected</h5>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 max-w-[180px]">Click any node in the topology diagram to view detailed network and power specifications.</p>
          </div>
        )}
      </div>
    </div>
  )
}

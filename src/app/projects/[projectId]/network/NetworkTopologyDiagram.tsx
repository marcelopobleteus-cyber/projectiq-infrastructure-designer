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

export default function NetworkTopologyDiagram({
  projectId,
  networkDevices,
  cameras,
  cameraModels,
}: NetworkTopologyDiagramProps) {
  const canvasRef = useRef<SVGSVGElement | null>(null)
  
  // State for positions
  const [positions, setPositions] = useState<PositionsMap>({})
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ id: string; startX: number; startY: number } | null>(null)

  // 1. Separate devices by type
  const routers = useMemo(() => networkDevices.filter(d => d.device_type === 'router'), [networkDevices])
  const nvrs = useMemo(() => networkDevices.filter(d => d.device_type === 'nvr'), [networkDevices])
  const switches = useMemo(() => networkDevices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch'), [networkDevices])
  const others = useMemo(() => networkDevices.filter(d => d.device_type !== 'router' && d.device_type !== 'nvr' && d.device_type !== 'switch' && d.device_type !== 'Industrial Switch'), [networkDevices])

  // 2. Generate default hierarchical positions
  const defaultPositions = useMemo(() => {
    const pos: PositionsMap = {}
    const canvasWidth = 1000
    const canvasHeight = 600

    // Level 0: Routers
    const routerCount = routers.length
    const routerY = 60
    if (routerCount > 0) {
      routers.forEach((r, idx) => {
        pos[`device-${r.id}`] = {
          x: routerCount === 1 ? canvasWidth / 2 : (idx + 1) * (canvasWidth / (routerCount + 1)),
          y: routerY
        }
      })
    } else {
      // Create a default Core Gateway node if none defined
      pos['default-gateway'] = { x: canvasWidth / 2, y: routerY }
    }

    // Level 1: NVRs & Core equipment
    const nvrCount = nvrs.length
    const nvrY = 150
    nvrs.forEach((n, idx) => {
      pos[`device-${n.id}`] = {
        x: nvrCount === 1 ? canvasWidth / 3 : (idx + 1) * (canvasWidth / (nvrCount + 1)),
        y: nvrY
      }
    })

    // Level 2: Switches
    const switchCount = switches.length
    const switchY = 270
    switches.forEach((sw, idx) => {
      pos[`device-${sw.id}`] = {
        x: switchCount === 1 ? canvasWidth / 2 : (idx + 0.5) * (canvasWidth / switchCount),
        y: switchY
      }
    })

    // Level 3: Others (patch panels, UPS, etc.)
    const otherCount = others.length
    const otherY = 380
    others.forEach((o, idx) => {
      pos[`device-${o.id}`] = {
        x: otherCount === 1 ? canvasWidth / 2 : (idx + 1) * (canvasWidth / (otherCount + 1)),
        y: otherY
      }
    })

    // Level 4: Cameras (clustered below their parent switch)
    const switchMap = new Map<string, CameraLocation[]>()
    const unassignedCams: CameraLocation[] = []

    cameras.forEach((cam) => {
      if (cam.assigned_network_device_id) {
        const list = switchMap.get(cam.assigned_network_device_id) || []
        list.push(cam)
        switchMap.set(cam.assigned_network_device_id, list)
      } else {
        unassignedCams.push(cam)
      }
    })

    const cameraY = 490

    // Position cameras under their switch
    switches.forEach((sw) => {
      const swPos = pos[`device-${sw.id}`] || { x: canvasWidth / 2, y: switchY }
      const swCams = switchMap.get(sw.id) || []
      const M = swCams.length

      if (M > 0) {
        swCams.forEach((cam, cIdx) => {
          // Center the cameras relative to parent switch X
          const spacing = Math.min(80, canvasWidth / (M + 1))
          const offset = (cIdx - (M - 1) / 2) * spacing
          pos[`camera-${cam.id}`] = {
            x: swPos.x + offset,
            y: cameraY
          }
        })
      }
    })

    // Position unassigned cameras on the bottom right/left
    const U = unassignedCams.length
    if (U > 0) {
      unassignedCams.forEach((cam, idx) => {
        pos[`camera-${cam.id}`] = {
          x: (idx + 1) * (canvasWidth / (U + 1)),
          y: cameraY + 40 // Slightly offset lower
        }
      })
    }

    return pos
  }, [routers, nvrs, switches, others, cameras])

  // 3. Load layout from localStorage or fallback to default layout
  useEffect(() => {
    const storageKey = `topology-layout-${projectId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Merge saved positions with default positions for any new elements
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

  // Handle drag interactions
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const nodePos = positions[nodeId] || { x: mouseX, y: mouseY }

    setDraggingNode({
      id: nodeId,
      startX: mouseX - nodePos.x,
      startY: mouseY - nodePos.y
    })
    setActiveNodeId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Boundary constraints within the SVG canvas width (1000px) and height (600px)
    const newX = Math.max(30, Math.min(970, mouseX - draggingNode.startX))
    const newY = Math.max(30, Math.min(570, mouseY - draggingNode.startY))

    const updated = {
      ...positions,
      [draggingNode.id]: { x: newX, y: newY, isCustom: true }
    }
    setPositions(updated)
  }

  const handleMouseUp = () => {
    if (draggingNode) {
      savePositions(positions)
      setDraggingNode(null)
    }
  }

  const handleResetLayout = () => {
    if (confirm('Are you sure you want to reset the visual layout to the default structure?')) {
      setPositions(defaultPositions)
      const storageKey = `topology-layout-${projectId}`
      localStorage.removeItem(storageKey)
    }
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

      // Calculate PoE draw if it is a switch
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
        connectedDevices: switchCams.map(c => c.camera_id_tag)
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
        parentSwitch: sw ? sw.name : 'Unassigned'
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
        connectedCount: switches.length,
        connectedDevices: switches.map(s => s.name)
      }
    }
    return null
  }, [activeNodeId, networkDevices, cameras, cameraModels, switches])

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
    }> = []

    // Gateway ID
    const gatewayId = routers.length > 0 ? `device-${routers[0].id}` : 'default-gateway'
    const gatePos = positions[gatewayId]

    // Link NVRs to Gateway
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
            isActive: hoveredNodeId === gatewayId || hoveredNodeId === nvrId
          })
        }
      })

      // Link main switches directly to Router or NVR.
      //
      // There used to be a branch here that linked a switch to a parent switch via
      // `sw.assigned_switch_id`. That column does not exist on `network_devices`, so the
      // value was always undefined and the branch never ran. It was removed rather than
      // left as dead code. To support switch-to-switch links, add the column in a
      // migration and reinstate this with a way to assign the parent in the UI.
      switches.forEach((sw) => {
        const swId = `device-${sw.id}`
        const swPos = positions[swId]
        if (swPos) {
          // Link switch to Core Gateway
          list.push({
            id: `link-gateway-switch-${sw.id}`,
            fromX: gatePos.x,
            fromY: gatePos.y,
            toX: swPos.x,
            toY: swPos.y,
            fromNodeId: gatewayId,
            toNodeId: swId,
            isActive: hoveredNodeId === gatewayId || hoveredNodeId === swId
          })
        }
      })
    }

    // Link cameras to switches
    cameras.forEach((cam) => {
      if (cam.assigned_network_device_id) {
        const swId = `device-${cam.assigned_network_device_id}`
        const camId = `camera-${cam.id}`
        const swPos = positions[swId]
        const camPos = positions[camId]

        if (swPos && camPos) {
          list.push({
            id: `link-switch-camera-${cam.id}`,
            fromX: swPos.x,
            fromY: swPos.y,
            toX: camPos.x,
            toY: camPos.y,
            fromNodeId: swId,
            toNodeId: camId,
            isActive: hoveredNodeId === swId || hoveredNodeId === camId
          })
        }
      }
    })

    return list
  }, [positions, routers, nvrs, switches, cameras, hoveredNodeId])

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full w-full bg-[var(--surface-2)] font-sans">
      
      {/* Topology Canvas Left Column */}
      <div className="flex-1 flex flex-col overflow-hidden h-full p-6 relative">
        
        {/* Canvas Toolbar Controls */}
        <div className="flex items-center justify-between mb-4 z-20">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Logical Network Topology</h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Drag and position switches or cameras to arrange the visual diagram.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetLayout}
              className="px-2.5 py-1 bg-[var(--surface-1)] hover:bg-slate-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-[10px] font-bold transition-all"
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
            viewBox="0 0 1000 600"
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid Pattern Definition */}
            <defs>
              <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(71, 85, 105, 0.18)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#canvas-grid)" />

            {/* Connection Lines (Edges) */}
            <g>
              {connections.map((link) => (
                <path
                  key={link.id}
                  d={getCurvePath(link.fromX, link.fromY, link.toX, link.toY)}
                  fill="none"
                  stroke={link.isActive ? '#6366f1' : '#1e293b'}
                  strokeWidth={link.isActive ? 2.5 : 1.5}
                  className="transition-all duration-200"
                  style={{
                    filter: link.isActive ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' : 'none'
                  }}
                />
              ))}
            </g>

            {/* Nodes Layer */}
            <g>
              {Object.entries(positions).map(([id, pos]) => {
                const isCamera = id.startsWith('camera-')
                const isGateway = id === 'default-gateway'
                const isDevice = id.startsWith('device-')

                let name = 'Unknown'
                let typeLabel = ''
                let status = 'Planned'
                let iconPaths: string[] = []

                if (isGateway) {
                  name = 'Gateway Router'
                  typeLabel = 'router'
                  status = 'Active'
                  // Globe Path
                  iconPaths = [
                    'M 12 2 A 10 10 0 1 0 22 12 A 10 10 0 0 0 12 2 Z',
                    'M 2 12 H 22',
                    'M 12 2 A 15.3 15.3 0 0 1 12 22 A 15.3 15.3 0 0 1 12 2 Z'
                  ]
                } else if (isDevice) {
                  const devId = id.replace('device-', '')
                  const dev = networkDevices.find(d => d.id === devId)
                  if (dev) {
                    name = dev.name
                    typeLabel = dev.device_type
                    status = dev.status
                  }
                  // Server / Switch path
                  iconPaths = [
                    'M 2 5 H 22 V 9 H 2 V 5 Z',
                    'M 2 15 H 22 V 19 H 2 V 15 Z',
                    'M 6 7 H 7',
                    'M 10 7 H 11',
                    'M 6 17 H 7',
                    'M 10 17 H 11'
                  ]
                } else if (isCamera) {
                  const camId = id.replace('camera-', '')
                  const cam = cameras.find(c => c.id === camId)
                  if (cam) {
                    name = cam.camera_id_tag
                    typeLabel = 'camera'
                    status = cam.status
                  }
                  // Camera Path
                  iconPaths = [
                    'M 23 7 L 16 12 L 23 17 Z',
                    'M 1 5 H 15 V 19 H 1 Z'
                  ]
                }

                const isActive = activeNodeId === id
                const isHovered = hoveredNodeId === id
                
                // Color codes
                let statusColor = '#94a3b8' // gray
                if (status === 'Installed' || status === 'Active' || status === 'complete') statusColor = '#10b981' // green
                else if (status === 'Planned' || status === 'planned') statusColor = '#3b82f6' // blue
                else if (status === 'Blocked' || status === 'issue') statusColor = '#f43f5e' // red
                else if (status === 'in_progress') statusColor = '#f59e0b' // amber

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
                      fill={isActive ? '#0f172a' : '#020617'}
                      stroke={isActive ? '#6366f1' : isHovered ? '#475569' : '#1e293b'}
                      strokeWidth={isActive ? 2 : 1}
                      className="transition-all duration-150"
                      style={{
                        filter: (isActive || isHovered) ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.25))' : 'none'
                      }}
                    />

                    {/* SVG Icon representation */}
                    <g transform={`translate(${isCamera ? 12 : 27}, 8) scale(0.65)`} stroke={isActive ? '#818cf8' : '#64748b'} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
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

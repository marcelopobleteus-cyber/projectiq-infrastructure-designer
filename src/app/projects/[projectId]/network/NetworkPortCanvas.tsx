'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { Database } from '@/types/supabase'
import { getSwitchPorts, assignCameraToPort, unassignCameraFromPort } from '../../actions-sprint3'
import ContextSidebar from '@/components/layout/ContextSidebar'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']
type NetworkDevice = Database['public']['Tables']['network_devices']['Row']
type SwitchPort = Database['public']['Tables']['switch_ports']['Row']

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

interface NetworkPortCanvasProps {
  projectId: string
  networkDevices: NetworkDevice[]
  cameras: CameraLocation[]
  cameraModels: CameraModel[]
}

export default function NetworkPortCanvas({
  projectId,
  networkDevices,
  cameras,
  cameraModels
}: NetworkPortCanvasProps) {
  const [switches, setSwitches] = useState<NetworkDevice[]>([])
  const [selectedSwitchId, setSelectedSwitchId] = useState<string>('')
  const [ports, setPorts] = useState<SwitchPortWithCamera[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Track select menus state for quick assignments
  const [quickAssignCam, setQuickAssignCam] = useState<{ [portId: string]: string }>({})

  // Filter out switches only
  useEffect(() => {
    const sws = networkDevices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch')
    setSwitches(sws)
    if (sws.length > 0 && !selectedSwitchId) {
      setSelectedSwitchId(sws[0].id)
    }
  }, [networkDevices])

  // Fetch ports when selected switch changes
  const loadPorts = async () => {
    if (!selectedSwitchId) return
    setLoading(true)
    try {
      const data = await getSwitchPorts(selectedSwitchId)
      setPorts(data as SwitchPortWithCamera[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPorts()
  }, [selectedSwitchId])

  const selectedSwitch = switches.find(s => s.id === selectedSwitchId)

  // Calculate PoE draw for a specific switch
  const getPoeUsage = (switchId: string) => {
    const sw = switches.find(s => s.id === switchId)
    if (!sw) return { used: 0, budget: 0, percentage: 0 }
    
    // Find all cameras assigned to this switch ID
    const switchCameras = cameras.filter(c => c.assigned_network_device_id === switchId)
    const used = switchCameras.reduce((acc, cam) => {
      const model = cameraModels.find(m => m.id === cam.camera_model_id)
      return acc + Number(model?.default_poe_draw || 7.50)
    }, 0)

    const budget = sw.poe_budget_watts || 0
    const percentage = budget > 0 ? (used / budget) * 100 : 0
    return { used, budget, percentage }
  }

  // Count warning switches
  const getWarningsCount = () => {
    let count = 0
    switches.forEach(sw => {
      const { used, budget } = getPoeUsage(sw.id)
      if (used > budget) count++
    })
    return count
  }

  // Unassign quick action
  const handleQuickUnassign = async (camId: string) => {
    if (!confirm('Are you sure you want to disconnect this camera from the port?')) return
    startTransition(async () => {
      const result = await unassignCameraFromPort({ cameraLocationId: camId, projectId })
      if (result.error) {
        alert(result.error)
      } else {
        loadPorts()
        // Optimistically reload window parameters or refresh page cache (via revalidatePath on server)
        window.location.reload()
      }
    })
  }

  // Assign quick action
  const handleQuickAssign = async (portId: string) => {
    const camId = quickAssignCam[portId]
    if (!camId) return

    startTransition(async () => {
      const result = await assignCameraToPort({
        cameraLocationId: camId,
        switchPortId: portId,
        projectId
      })

      if (result.error) {
        alert(result.error)
      } else {
        setQuickAssignCam(prev => ({ ...prev, [portId]: '' }))
        loadPorts()
        window.location.reload()
      }
    })
  }

  // Get available unassigned cameras for dropdown
  const unassignedCameras = cameras.filter(c => c.assigned_network_device_id === null)

  // Calculate statistics of ports
  const totalPortsCount = ports.length
  const usedPortsCount = ports.filter(p => p.assigned_camera_location_id !== null).length
  const availablePortsCount = totalPortsCount - usedPortsCount

  const currentPoe = selectedSwitchId ? getPoeUsage(selectedSwitchId) : { used: 0, budget: 0, percentage: 0 }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      {/* Context Sidebar */}
      <ContextSidebar
        view="network"
        projectTitle="Switch Matrix design"
        devicesCount={switches.length}
        poeWarningsCount={getWarningsCount()}
        deviceListSlot={
          switches.map(sw => {
            const poe = getPoeUsage(sw.id)
            const isExceeded = poe.used > poe.budget
            
            return (
              <button
                key={sw.id}
                onClick={() => setSelectedSwitchId(sw.id)}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                  selectedSwitchId === sw.id
                    ? 'bg-[var(--accent)] text-white/10 border-[var(--accent)]/30 text-[var(--text-primary)] font-semibold'
                    : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="truncate pr-1">
                  <span className="block font-medium truncate">{sw.name}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">IP: {sw.ip_address || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isExceeded && (
                    <span className="text-amber-500 animate-pulse" title="PoE budget exceeded!">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                  )}
                  <span className="text-[9px] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md font-mono">
                    {poe.used.toFixed(0)}W
                  </span>
                </div>
              </button>
            )
          })
        }
        poeListSlot={
          switches.map(sw => {
            const poe = getPoeUsage(sw.id)
            const isExceeded = poe.used > poe.budget
            
            return (
              <div key={sw.id} className="border border-[var(--border)] p-2.5 rounded-xl bg-[var(--surface-2)] text-[10px] space-y-1">
                <div className="flex justify-between font-semibold text-[var(--text-secondary)]">
                  <span>{sw.name}</span>
                  <span className={isExceeded ? 'text-amber-400' : 'text-[var(--text-secondary)]'}>
                    {poe.used.toFixed(1)}W / {poe.budget}W
                  </span>
                </div>
                <div className="w-full bg-[var(--surface-1)] rounded-full h-1 border border-[var(--border)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isExceeded ? 'bg-amber-500' : 'bg-[var(--accent)] text-white'}`}
                    style={{ width: `${Math.min(poe.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })
        }
      />

      {/* Main Workspace content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {selectedSwitch ? (
          <>
            {/* Selected Switch summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--surface-1)] backdrop-blur-md border border-[var(--border)] p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)] text-white/40" />
              
              {/* Hardware Summary */}
              <div className="space-y-1">
                <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold">Switch Node</span>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{selectedSwitch.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  {selectedSwitch.manufacturer || 'Generic'} - {selectedSwitch.model_number || 'Standard Switch'}
                </p>
                <div className="pt-2 flex gap-4 text-[10px] text-[var(--text-tertiary)] font-mono">
                  <span>IP: {selectedSwitch.ip_address || 'Unassigned'}</span>
                  <span>Rack Unit: {selectedSwitch.rack_unit || 'Unplaced'}</span>
                </div>
              </div>

              {/* Ports allocation */}
              <div className="space-y-2.5">
                <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold">Ports Allocation</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2 rounded-xl text-center">
                    <span className="block text-[9px] text-[var(--text-tertiary)] font-semibold uppercase">Total</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] font-mono">{totalPortsCount}</span>
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2 rounded-xl text-center">
                    <span className="block text-[9px] text-[var(--text-tertiary)] font-semibold uppercase">Connected</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">{usedPortsCount}</span>
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] p-2 rounded-xl text-center">
                    <span className="block text-[9px] text-[var(--text-tertiary)] font-semibold uppercase">Available</span>
                    <span className="text-lg font-bold text-[var(--text-secondary)] font-mono">{availablePortsCount}</span>
                  </div>
                </div>
              </div>

              {/* Power / PoE budget */}
              <div className="space-y-2">
                <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold">PoE Budget Allocation</span>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[var(--text-secondary)]">Total Draw:</span>
                    <span className={`font-bold ${currentPoe.used > currentPoe.budget ? 'text-amber-400' : 'text-emerald-450'}`}>
                      {currentPoe.used.toFixed(1)}W / {currentPoe.budget}W
                    </span>
                  </div>
                  <div className="w-full bg-[var(--surface-2)] border border-[var(--border)] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${currentPoe.used > currentPoe.budget ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(currentPoe.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {currentPoe.used > currentPoe.budget && (
                  <div className="p-2 border border-amber-500/20 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-semibold flex items-center gap-1.5 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Warning: Switch exceeds configured PoE power budget!
                  </div>
                )}
              </div>
            </div>

            {/* Visual switch faceplate Ports Matrix */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl shadow-lg space-y-4">
              <span className="block text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-black">Visual Ports Matrix (RJ45 Grid)</span>
              
              {loading ? (
                <div className="h-36 flex items-center justify-center text-xs text-[var(--text-tertiary)] animate-pulse">Loading visual ports...</div>
              ) : ports.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-xs text-[var(--text-tertiary)]">No ports configured for this switch.</div>
              ) : (
                <div className="flex flex-col items-center bg-[var(--surface-2)] border border-[var(--border)] p-6 rounded-2xl">
                  {/* Two rows of RJ45 ports */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 w-full max-w-4xl">
                    {/* Row 1: Odd ports */}
                    {ports.filter(p => p.port_number % 2 !== 0).map(port => {
                      const isAssigned = port.assigned_camera_location_id !== null
                      return (
                        <div
                          key={port.id}
                          className={`aspect-square border rounded-xl flex flex-col justify-between p-1.5 transition-all group relative cursor-help ${
                            isAssigned
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450 hover:bg-emerald-500/15 hover:border-emerald-500/50'
                              : 'bg-[var(--surface-1)] border-[var(--border)] text-slate-550 hover:border-slate-700'
                          }`}
                        >
                          {/* Status LED Dot */}
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] font-mono leading-none">{port.port_number}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-400 shadow-[0_0_4px_#22c55e]' : 'bg-slate-750'}`} />
                          </div>

                          <div className="text-center font-bold text-[9px] uppercase tracking-wide truncate max-w-full">
                            {isAssigned ? port.assigned_camera?.camera_id_tag : 'RJ45'}
                          </div>

                          {/* Float Tooltip Details */}
                          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[var(--surface-2)] text-[var(--text-primary)] text-[10px] p-3 rounded-xl border border-[var(--border)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-2xl w-48 space-y-1.5">
                            <p className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1">Port {port.port_number} ({port.port_type.toUpperCase()})</p>
                            <p>Speed: <span className="font-mono text-[var(--text-primary)]">{port.speed_mbps} Mbps</span></p>
                            <p>VLAN: <span className="font-mono text-[var(--text-primary)]">{port.vlan_id}</span></p>
                            <p>PoE: <span className="font-mono text-[var(--text-primary)]">{port.poe_enabled ? `${port.poe_budget_watts}W Max (Enabled)` : 'Disabled'}</span></p>
                            {isAssigned ? (
                              <div className="border-t border-[var(--border)] pt-1 mt-1 text-emerald-400 font-medium">
                                <p>Assigned Camera: {port.assigned_camera?.camera_id_tag}</p>
                                <p className="text-[9px] text-[var(--text-secondary)]">
                                  Model: {port.assigned_camera?.camera_models?.manufacturer} - {port.assigned_camera?.camera_models?.model_number} ({port.assigned_camera?.camera_models?.default_poe_draw}W)
                                </p>
                              </div>
                            ) : (
                              <p className="text-[var(--text-tertiary)] italic mt-0.5">Available / Unassigned</p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Row 2: Even ports */}
                    {ports.filter(p => p.port_number % 2 === 0).map(port => {
                      const isAssigned = port.assigned_camera_location_id !== null
                      return (
                        <div
                          key={port.id}
                          className={`aspect-square border rounded-xl flex flex-col justify-between p-1.5 transition-all group relative cursor-help ${
                            isAssigned
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450 hover:bg-emerald-500/15 hover:border-emerald-500/50'
                              : 'bg-[var(--surface-1)] border-[var(--border)] text-slate-550 hover:border-slate-700'
                          }`}
                        >
                          {/* Status LED Dot */}
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] font-mono leading-none">{port.port_number}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-400 shadow-[0_0_4px_#22c55e]' : 'bg-slate-750'}`} />
                          </div>

                          <div className="text-center font-bold text-[9px] uppercase tracking-wide truncate max-w-full">
                            {isAssigned ? port.assigned_camera?.camera_id_tag : 'RJ45'}
                          </div>

                          {/* Float Tooltip Details */}
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[var(--surface-2)] text-[var(--text-primary)] text-[10px] p-3 rounded-xl border border-[var(--border)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-2xl w-48 space-y-1.5">
                            <p className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1">Port {port.port_number} ({port.port_type.toUpperCase()})</p>
                            <p>Speed: <span className="font-mono text-[var(--text-primary)]">{port.speed_mbps} Mbps</span></p>
                            <p>VLAN: <span className="font-mono text-[var(--text-primary)]">{port.vlan_id}</span></p>
                            <p>PoE: <span className="font-mono text-[var(--text-primary)]">{port.poe_enabled ? `${port.poe_budget_watts}W Max (Enabled)` : 'Disabled'}</span></p>
                            {isAssigned ? (
                              <div className="border-t border-[var(--border)] pt-1 mt-1 text-emerald-400 font-medium">
                                <p>Assigned Camera: {port.assigned_camera?.camera_id_tag}</p>
                                <p className="text-[9px] text-[var(--text-secondary)]">
                                  Model: {port.assigned_camera?.camera_models?.manufacturer} - {port.assigned_camera?.camera_models?.model_number} ({port.assigned_camera?.camera_models?.default_poe_draw}W)
                                </p>
                              </div>
                            ) : (
                              <p className="text-[var(--text-tertiary)] italic mt-0.5">Available / Unassigned</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ports details tabular matrix */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
                <h4 className="font-black text-xs text-[var(--text-primary)] uppercase tracking-wider">Ports Allocation Matrix Table</h4>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-[var(--text-tertiary)] animate-pulse">Loading ports table...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--surface-2)] text-[var(--text-secondary)] font-mono border-b border-[var(--border)] uppercase text-[9px] tracking-wider">
                        <th className="py-3 px-6">Port</th>
                        <th className="py-3 px-4">Media</th>
                        <th className="py-3 px-4">Speed</th>
                        <th className="py-3 px-4">VLAN</th>
                        <th className="py-3 px-4">PoE Alloc</th>
                        <th className="py-3 px-4">Link Status</th>
                        <th className="py-3 px-6">Assignment</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {ports.map((port) => {
                        const camera = port.assigned_camera ?? null
                        const isAssigned = camera !== null
                        
                        return (
                          <tr key={port.id} className="hover:bg-slate-850/20 transition-colors">
                            <td className="py-3.5 px-6 font-bold text-[var(--text-primary)]">Port {port.port_number}</td>
                            <td className="py-3.5 px-4 uppercase font-mono text-[10px] text-[var(--text-secondary)]">{port.port_type}</td>
                            <td className="py-3.5 px-4 font-mono text-[var(--text-primary)]">{port.speed_mbps}M</td>
                            <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">{port.vlan_id}</td>
                            <td className="py-3.5 px-4">
                              {port.poe_enabled ? (
                                <span className="font-mono text-[var(--accent-text)]">{port.poe_budget_watts}W (PoE)</span>
                              ) : (
                                <span className="text-slate-650">Disabled</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isAssigned 
                                  ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                  : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-tertiary)]'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${isAssigned ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                                {isAssigned ? 'Active' : 'Down'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              {isAssigned ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-emerald-400 text-xs">{camera.camera_id_tag}</span>
                                  <span className="block text-[9px] text-[var(--text-secondary)] font-mono">
                                    Model PoE: {camera.camera_models?.default_poe_draw}W
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600 italic">Available / Unassigned</span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              {isAssigned ? (
                                <button
                                  onClick={() => handleQuickUnassign(camera.id)}
                                  disabled={isPending}
                                  className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-350 text-[10px] font-semibold transition-all"
                                >
                                  Unassign
                                </button>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={quickAssignCam[port.id] || ''}
                                    onChange={e => setQuickAssignCam(prev => ({ ...prev, [port.id]: e.target.value }))}
                                    className="px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-[10px] text-[var(--text-primary)] focus:outline-none"
                                  >
                                    <option value="">Choose camera...</option>
                                    {unassignedCameras.map(c => (
                                      <option key={c.id} value={c.id}>{c.camera_id_tag}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleQuickAssign(port.id)}
                                    disabled={!quickAssignCam[port.id] || isPending}
                                    className="px-2.5 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)] text-white disabled:bg-[var(--surface-2)] disabled:border-[var(--border)] disabled:text-slate-600 text-[10px] border border-[var(--accent)]/20 font-semibold text-[var(--text-primary)] transition-all"
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-lg p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
            </div>
            <div>
              <h4 className="font-bold text-[var(--text-primary)] text-sm">No Network Switches Configured</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-sm mx-auto leading-relaxed">
                Configure switches in the **Map Layout** workspace using **Add Network Device** mode first to populate the ports matrix layout.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

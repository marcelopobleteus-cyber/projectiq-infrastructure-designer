'use client'

import React from 'react'

interface ConnectivityChainStatusProps {
  selectedCamera: any
  cameraModels: any[]
  networkDevices: any[]
  allSwitchPorts: any[]
  switchPorts: any[]
  fdus: any[]
  fpps: any[]
  fiberStrands: any[]
  fiberEnclosures: any[]
  spliceRecords: any[]
  fiberCables: any[]
  cabinets: any[]
  assignedSwitchId: string
  assignedSwitchPortId: string
  assignedPortId: string
  assignedSfpPortId: string
  assignedFduId: string
  assignedFppId: string
  assignedStrandTxId: string
  assignedStrandRxId: string
  cameraEnclosureId: string
  cameraDropCableId: string
  cameraBackboneCableId: string
  assignedCabinetId: string
}

export default function ConnectivityChainStatus({
  selectedCamera,
  cameraModels,
  networkDevices,
  allSwitchPorts,
  switchPorts,
  fdus,
  fpps,
  fiberStrands,
  fiberEnclosures,
  spliceRecords,
  fiberCables,
  cabinets,
  assignedSwitchId,
  assignedSwitchPortId,
  assignedPortId,
  assignedSfpPortId,
  assignedFduId,
  assignedFppId,
  assignedStrandTxId,
  assignedStrandRxId,
  cameraEnclosureId,
  cameraDropCableId,
  cameraBackboneCableId,
  assignedCabinetId
}: ConnectivityChainStatusProps) {
  const getStatusConfig = (status: 'Mapped' | 'Partial' | 'Missing' | 'Issue') => {
    switch (status) {
      case 'Mapped':
        return {
          dotClass: 'border-emerald-500 bg-emerald-950 text-emerald-400',
          textClass: 'text-white',
          badge: <span className="text-[7px] font-bold px-1 py-0.25 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded uppercase tracking-wider shrink-0">Mapped</span>
        }
      case 'Partial':
        return {
          dotClass: 'border-amber-500 bg-amber-950 text-amber-400',
          textClass: 'text-[var(--text-primary)]',
          badge: <span className="text-[7px] font-bold px-1 py-0.25 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded uppercase tracking-wider shrink-0">Partial</span>
        }
      case 'Issue':
        return {
          dotClass: 'border-red-500 bg-red-950 text-red-400 animate-pulse',
          textClass: 'text-red-300 font-semibold',
          badge: <span className="text-[7px] font-bold px-1 py-0.25 bg-red-500/10 border border-red-500/20 text-red-400 rounded uppercase tracking-wider shrink-0">Issue</span>
        }
      case 'Missing':
      default:
        return {
          dotClass: 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-tertiary)]',
          textClass: 'text-[var(--text-tertiary)] italic',
          badge: <span className="text-[7px] font-bold px-1 py-0.25 bg-slate-850 border border-[var(--border)] text-[var(--text-tertiary)] rounded uppercase tracking-wider shrink-0">Missing</span>
        }
    }
  }

  // 1. Edge Device Status
  const edgeStatus = selectedCamera.status === 'issue' ? 'Issue' : selectedCamera.camera_model_id ? 'Mapped' : 'Partial'
  const edgeConf = getStatusConfig(edgeStatus)
  const camModel = cameraModels.find(m => m.id === selectedCamera.camera_model_id)

  // 2. Switch Status
  const connSwitch = networkDevices.find(d => d.id === assignedSwitchId)
  const connPort = allSwitchPorts.find(p => p.id === assignedSwitchPortId || p.id === assignedPortId) || switchPorts.find(p => p.id === assignedPortId)
  const connSfp = allSwitchPorts.find(p => p.id === assignedSfpPortId)
  const hasSwitch = !!connSwitch
  const hasPort = !!(connPort || connSfp)
  const switchStatus = !hasSwitch ? 'Missing' : hasPort ? 'Mapped' : 'Partial'
  const switchConf = getStatusConfig(switchStatus)

  // 3. Patch Status
  const connFdu = fdus.find(f => f.id === assignedFduId)
  const connFpp = fpps.find(f => f.id === assignedFppId)
  const patchStatus = (connFdu || connFpp) ? 'Mapped' : 'Missing'
  const patchConf = getStatusConfig(patchStatus)

  // 4. Fiber Strands Status
  const txStrand = fiberStrands.find(s => s.id === assignedStrandTxId)
  const rxStrand = fiberStrands.find(s => s.id === assignedStrandRxId)
  const strandsStatus = (txStrand && rxStrand) ? 'Mapped' : (txStrand || rxStrand) ? 'Partial' : 'Missing'
  const strandsConf = getStatusConfig(strandsStatus)

  // 5. Splices Status
  const enc = fiberEnclosures.find(e => e.id === cameraEnclosureId)
  const txSplices = spliceRecords.filter(r => r.from_strand_id === assignedStrandTxId || r.to_strand_id === assignedStrandTxId)
  const rxSplices = spliceRecords.filter(r => r.from_strand_id === assignedStrandRxId || r.to_strand_id === assignedStrandRxId)
  const splicesCount = txSplices.length + rxSplices.length
  const splicesStatus = splicesCount > 0 ? 'Mapped' : (assignedStrandTxId || assignedStrandRxId) ? 'Issue' : 'Missing'
  const splicesConf = getStatusConfig(splicesStatus)

  // 6. Cable Route Status
  const drop = fiberCables.find(c => c.id === cameraDropCableId)
  const backbone = fiberCables.find(c => c.id === cameraBackboneCableId)
  const routeStatus = (drop && backbone) ? 'Mapped' : (drop || backbone) ? 'Partial' : 'Missing'
  const routeConf = getStatusConfig(routeStatus)

  // 7. Cabinet Status
  const cab = cabinets.find(c => c.id === assignedCabinetId)
  const cabinetStatus = cab ? 'Mapped' : 'Missing'
  const cabinetConf = getStatusConfig(cabinetStatus)

  return (
    <>
      {/* Edge Device Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${edgeConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Edge Device</span>
          {edgeConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${edgeConf.textClass}`}>
          {selectedCamera.camera_id_tag} {camModel ? `(${camModel.manufacturer} ${camModel.model_number})` : ''}
        </span>
      </div>

      {/* Switch Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${switchConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Switch / PoE Port</span>
          {switchConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${switchConf.textClass}`}>
          {hasSwitch ? (
            `${connSwitch.name} ${connPort ? `(Port ${connPort.port_number})` : connSfp ? `(SFP Port ${connSfp.port_number})` : ''}`
          ) : (
            'Not assigned yet'
          )}
        </span>
      </div>

      {/* Patch / Termination Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${patchConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Patch / Termination</span>
          {patchConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${patchConf.textClass}`}>
          {(connFdu || connFpp) ? (
            [connFdu?.fdu_tag, connFpp?.fpp_tag].filter(Boolean).join(' / ')
          ) : (
            'Not assigned yet'
          )}
        </span>
      </div>

      {/* Fiber Strands Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${strandsConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Fiber Strands</span>
          {strandsConf.badge}
        </div>
        <div className={`space-y-0.5 text-xs font-semibold ${strandsConf.textClass}`}>
          {strandsStatus !== 'Missing' ? (
            <>
              {txStrand && <div>TX: Core {txStrand.strand_number} ({txStrand.fiber_color})</div>}
              {rxStrand && <div>RX: Core {rxStrand.strand_number} ({rxStrand.fiber_color})</div>}
            </>
          ) : (
            'Not assigned yet'
          )}
        </div>
      </div>

      {/* Splices Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${splicesConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Splices</span>
          {splicesConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${splicesConf.textClass}`}>
          {splicesStatus !== 'Missing' ? (
            `${enc ? `${enc.enclosure_tag} Enclosure` : 'Splice Record mapped'} (${splicesCount} active splices)`
          ) : (
            strandsStatus !== 'Missing' ? 'Strands assigned but not spliced yet' : 'No connection mapped yet'
          )}
        </span>
      </div>

      {/* Cable Route Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${routeConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Cable Route</span>
          {routeConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${routeConf.textClass}`}>
          {routeStatus !== 'Missing' ? (
            [drop && `${drop.cable_tag} (Drop)`, backbone && `${backbone.cable_tag} (Backbone)`].filter(Boolean).join(' ➔ ')
          ) : (
            'Not assigned yet'
          )}
        </span>
      </div>

      {/* Cabinet Node */}
      <div className="relative text-[10px] space-y-0.5">
        <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${cabinetConf.dotClass}`} style={{ borderWidth: '2px' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="block text-slate-550 font-bold uppercase text-[8px] tracking-wider">Cabinet</span>
          {cabinetConf.badge}
        </div>
        <span className={`block text-xs font-semibold ${cabinetConf.textClass}`}>
          {cab ? (
            `${cab.cabinet_tag} (${cab.cabinet_type})`
          ) : (
            'Not assigned yet'
          )}
        </span>
      </div>
    </>
  )
}

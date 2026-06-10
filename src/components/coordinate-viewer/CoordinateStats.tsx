import React from 'react'
import { CoordinatePoint } from '@/app/projects/actions-coordinate-viewer'

interface CoordinateStatsProps {
  points: CoordinatePoint[]
}

export default function CoordinateStats({ points }: CoordinateStatsProps) {
  const totalDevices = points.length
  
  // Calculate unique locations based on lat/lng rounded to 6 decimals
  const uniqueLocsSet = new Set(
    points.map(p => `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`)
  )
  const uniqueLocations = uniqueLocsSet.size

  const camerasCount = points.filter(p => p.device_type === 'CAM' || (p.device_id && p.device_id.startsWith('CAM'))).length
  const switchesCount = points.filter(p => p.device_type === 'SWITCH' || (p.device_id && p.device_id.startsWith('SWITCH'))).length

  // Calculate unique VLANs list
  const vlans = Array.from(new Set(points.map(p => p.vlan).filter(Boolean))).sort()
  const vlanString = vlans.length > 0 ? vlans.join(', ') : 'None'

  const stats = [
    {
      label: 'Total Devices',
      value: totalDevices,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      ),
      color: 'text-indigo-400 border-indigo-950/40 bg-indigo-950/20',
    },
    {
      label: 'Unique Locations',
      value: uniqueLocations,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ),
      color: 'text-emerald-400 border-emerald-950/40 bg-emerald-950/20',
    },
    {
      label: 'Cameras (CAM)',
      value: camerasCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
      color: 'text-blue-400 border-blue-950/40 bg-blue-950/20',
    },
    {
      label: 'Switches (SWITCH)',
      value: switchesCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
      ),
      color: 'text-cyan-400 border-cyan-950/40 bg-cyan-950/20',
    },
    {
      label: 'VLANs Present',
      value: vlanString,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      ),
      color: 'text-amber-400 border-amber-950/40 bg-amber-500/5',
      isVlanCard: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
      {stats.map((s, idx) => (
        <div
          key={idx}
          className={`border rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:border-slate-800 ${
            s.isVlanCard ? 'col-span-2 md:col-span-1 lg:col-span-1' : ''
          } ${s.color}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
            <span className="opacity-75">{s.icon}</span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`font-mono text-white tracking-tight ${
              s.isVlanCard && s.value.length > 6 ? 'text-sm font-semibold' : 'text-2xl font-black'
            }`}>
              {s.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

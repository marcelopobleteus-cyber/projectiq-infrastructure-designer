import React from 'react'
import { CoordinatePoint } from '@/app/projects/actions-coordinate-viewer'

interface CoordinateListProps {
  points: CoordinatePoint[]
  selectedPoint: CoordinatePoint | null
  onSelectPoint: (point: CoordinatePoint) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterType: 'ALL' | 'CAM' | 'SWITCH'
  setFilterType: (type: 'ALL' | 'CAM' | 'SWITCH') => void
}

export default function CoordinateList({
  points,
  selectedPoint,
  onSelectPoint,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType
}: CoordinateListProps) {
  
  // Filter the list based on query and device type filter
  const filteredPoints = points.filter(p => {
    const matchesSearch =
      p.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ip_address && p.ip_address.includes(searchQuery)) ||
      (p.vlan && p.vlan.includes(searchQuery)) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const typeMatch =
      filterType === 'ALL' ||
      (filterType === 'CAM' && (p.device_type === 'CAM' || p.device_id.startsWith('CAM'))) ||
      (filterType === 'SWITCH' && (p.device_type === 'SWITCH' || p.device_id.startsWith('SWITCH')))

    return matchesSearch && typeMatch
  })

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-850/80 space-y-3 shrink-0">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            placeholder="Search Device ID, IP, VLAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex gap-1.5">
          {(['ALL', 'CAM', 'SWITCH'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filterType === type
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 font-bold'
                  : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              {type === 'ALL' ? 'All Devices' : type === 'CAM' ? 'Cameras' : 'Switches'}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {filteredPoints.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No coordinate points found matching search criteria.
          </div>
        ) : (
          filteredPoints.map((point) => {
            const isCam = point.device_type === 'CAM' || point.device_id.startsWith('CAM')
            const isSelected = selectedPoint?.id === point.id

            return (
              <div
                key={point.id}
                onClick={() => onSelectPoint(point)}
                className={`p-3 border rounded-xl cursor-pointer transition-all duration-200 group flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-650/10 border-indigo-500/40 shadow-inner shadow-indigo-950/20'
                    : 'bg-slate-950/35 border-slate-850 hover:bg-slate-950/50 hover:border-slate-800'
                }`}
              >
                {/* ID and Type row */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black tracking-tight transition-colors ${
                    isSelected ? 'text-indigo-400' : 'text-white group-hover:text-indigo-400'
                  }`}>
                    {point.device_id}
                  </span>
                  
                  {/* Badge */}
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                    isCam
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {isCam ? 'Camera' : 'Switch'}
                  </span>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600 font-sans font-semibold">IP:</span>
                    <span className="text-slate-300 truncate">{point.ip_address || 'None'}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-slate-600 font-sans font-semibold">VLAN:</span>
                    <span className="text-slate-350">{point.vlan || 'N/A'}</span>
                  </div>
                </div>

                {/* Coordinates short row */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-900/60">
                  <span>Lat: {Number(point.latitude).toFixed(5)}</span>
                  <span>Lng: {Number(point.longitude).toFixed(5)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

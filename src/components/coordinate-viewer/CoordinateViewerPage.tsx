'use client'

import React, { useState } from 'react'
import { CoordinatePoint } from '@/app/projects/actions-coordinate-viewer'
import CoordinateStats from './CoordinateStats'
import CoordinateList from './CoordinateList'
import CoordinateMap from './CoordinateMap'

interface CoordinateViewerPageProps {
  projectId: string
  projectName: string
  initialPoints: CoordinatePoint[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  googleMapsApiKey: string | undefined
}

export default function CoordinateViewerPage({
  projectId,
  projectName,
  initialPoints,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  googleMapsApiKey
}: CoordinateViewerPageProps) {
  const [points, setPoints] = useState<CoordinatePoint[]>(initialPoints)
  const [selectedPoint, setSelectedPoint] = useState<CoordinatePoint | null>(null)
  
  // Search & Type Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'CAM' | 'SWITCH'>('ALL')

  // Map Filter Options
  const [showCameras, setShowCameras] = useState(true)
  const [showSwitches, setShowSwitches] = useState(true)
  const [groupSameLocation, setGroupSameLocation] = useState(true)

  const handleMarkerSelect = (point: CoordinatePoint | null) => {
    setSelectedPoint(point)
  }

  return (
    <div className="space-y-4 px-6 py-4 flex-1 flex flex-col overflow-hidden h-full font-sans text-slate-300">
      
      {/* Page Header and Actions */}
      <div className="border-b border-slate-900 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">WST SEG6 Coordinate Viewer</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Read-only visual layout of camera and switch coordinate imports for project <span className="text-indigo-400 font-semibold">{projectName}</span>
          </p>
        </div>

        {/* Read-Only Promotion Placeholder Button */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-slate-950/70 border border-slate-850 px-3 py-1.5 rounded-xl text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Visual Layer Only
          </span>

          {/* Planned Asset Promotion Utility (Read-Only) */}
          <button
            disabled
            title="Asset promotion is planned for next sprint"
            className="px-4 py-2 bg-slate-950/50 text-slate-500 border border-slate-850/80 rounded-xl text-xs font-bold transition-all cursor-not-allowed flex items-center gap-1.5 shadow-sm hover:border-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Promote to Project Camera Assets
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <CoordinateStats points={points} />

      {/* Map Control Toggle Panel */}
      <div className="bg-slate-900/20 backdrop-blur-md border border-slate-850 rounded-2xl px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="font-bold uppercase tracking-wider text-[10px]">Map Options</span>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCameras}
              onChange={(e) => setShowCameras(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded bg-slate-950 border-slate-800"
            />
            Show Cameras
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSwitches}
              onChange={(e) => setShowSwitches(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded bg-slate-950 border-slate-800"
            />
            Show Switches
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none border-l border-slate-800 pl-6">
            <input
              type="checkbox"
              checked={groupSameLocation}
              onChange={(e) => setGroupSameLocation(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded bg-slate-950 border-slate-800"
            />
            Group Co-located Devices
          </label>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left list container (4 cols) */}
        <div className="lg:col-span-4 h-full min-h-[300px] lg:min-h-0 flex flex-col">
          <CoordinateList
            points={points}
            selectedPoint={selectedPoint}
            onSelectPoint={setSelectedPoint}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
          />
        </div>

        {/* Right map container (8 cols) */}
        <div className="lg:col-span-8 h-full min-h-[400px] lg:min-h-0">
          <CoordinateMap
            points={points}
            selectedPoint={selectedPoint}
            onMarkerClick={handleMarkerSelect}
            googleMapsApiKey={googleMapsApiKey}
            defaultLatitude={defaultLatitude}
            defaultLongitude={defaultLongitude}
            defaultZoom={defaultZoom}
            showCameras={showCameras}
            showSwitches={showSwitches}
            groupSameLocation={groupSameLocation}
          />
        </div>
      </div>
    </div>
  )
}

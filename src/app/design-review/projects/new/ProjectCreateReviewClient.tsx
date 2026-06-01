'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createProjectReview } from '../../actions-review'

interface ProjectCreateReviewClientProps {
  googleMapsApiKey?: string
  isModal?: boolean
  onClose?: () => void
}

export default function ProjectCreateReviewClient({ 
  googleMapsApiKey,
  isModal = false,
  onClose
}: ProjectCreateReviewClientProps) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [region, setRegion] = useState('')
  const [notes, setNotes] = useState('')
  const [latitude, setLatitude] = useState(37.7749) // Default San Francisco
  const [longitude, setLongitude] = useState(-122.4194)
  const [zoom, setZoom] = useState(16)
  
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const autocompleteInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  
  const [map, setMap] = useState<any>(null)
  const markerRef = useRef<any>(null)
  const [placesError, setPlacesError] = useState(false)

  // Initialize Google Places and Maps
  useEffect(() => {
    if (!googleMapsApiKey) {
      setPlacesError(true)
      return
    }

    try {
      setOptions({
        key: googleMapsApiKey,
        v: 'weekly',
      })

      Promise.all([
        importLibrary('places'),
        importLibrary('maps'),
        importLibrary('marker')
      ]).then(([placesLib, mapsLib]) => {
        // 1. Initialize Autocomplete
        if (autocompleteInputRef.current) {
          const autocomplete = new (placesLib as any).Autocomplete(autocompleteInputRef.current, {
            fields: ['geometry', 'formatted_address'],
            types: ['geocode', 'establishment']
          })

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              const newLat = Number(lat.toFixed(6))
              const newLng = Number(lng.toFixed(6))
              setLatitude(newLat)
              setLongitude(newLng)
              setError(null)

              // Update Map
              if (map) {
                map.setCenter({ lat: newLat, lng: newLng })
                if (markerRef.current) {
                  markerRef.current.setPosition({ lat: newLat, lng: newLng })
                }
              }
            }
          })
        }

        // 2. Initialize Map
        if (mapRef.current && !map) {
          const newMap = new mapsLib.Map(mapRef.current, {
            center: { lat: latitude, lng: longitude },
            zoom: zoom,
            mapTypeId: 'hybrid',
            tilt: 0,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          })

          const newMarker = new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: newMap,
            draggable: true
          })

          // Listen for drag end
          newMarker.addListener('dragend', () => {
            const pos = newMarker.getPosition()
            if (pos) {
              setLatitude(Number(pos.lat().toFixed(6)))
              setLongitude(Number(pos.lng().toFixed(6)))
            }
          })

          setMap(newMap)
          markerRef.current = newMarker
        }
      }).catch(err => {
        console.error('Failed to load Google libraries:', err)
        setPlacesError(true)
      })
    } catch (e) {
      console.error('Error loading Google libraries:', e)
      setPlacesError(true)
    }
  }, [googleMapsApiKey, map])

  // Sync zoom level adjustments
  useEffect(() => {
    if (map) {
      map.setZoom(zoom)
    }
  }, [zoom, map])

  // Sync manual input changes to map
  const handleManualCoordChange = (newLat: number, newLng: number) => {
    if (map && markerRef.current) {
      if (newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
        map.setCenter({ lat: newLat, lng: newLng })
        markerRef.current.setPosition({ lat: newLat, lng: newLng })
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (latitude < -90 || latitude > 90) {
      setError('Latitude must be between -90 and 90')
      return
    }

    if (longitude < -180 || longitude > 180) {
      setError('Longitude must be between -180 and 180')
      return
    }

    if (zoom < 0 || zoom > 22) {
      setError('Zoom level must be between 0 and 22')
      return
    }

    startTransition(async () => {
      const result = await createProjectReview({
        name,
        notes,
        latitude,
        longitude,
        zoom
      })

      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const isPlacesConfigured = !!googleMapsApiKey && !placesError

  if (isModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm z-[100] p-4 overflow-y-auto">
        <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden my-8">
          {/* Top cyan gradient border accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
          
          {/* Close button in top-right of modal */}
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors z-25 cursor-pointer"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Side: Form */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Location Setup</h2>
                <p className="text-xs text-slate-400 mt-1">Configure layout origin bounds and region meta descriptors for the site map grid.</p>
              </div>

              {/* Warning Banner for missing Google Places Configuration */}
              {!isPlacesConfigured && (
                <div className="p-4 border border-amber-500/10 bg-amber-500/5 text-amber-450 rounded-xl text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Map Configuration Notice
                  </div>
                  <p>Location search requires Google Places configuration. You can still enter coordinates manually.</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Project Name */}
                <div>
                  <label htmlFor="projectName" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                    Project Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="e.g. London Office Deployment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                  />
                </div>

                {/* 2. Location Search input */}
                <div>
                  <label htmlFor="locationSearch" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1">
                    Location Search (Google Places)
                  </label>
                  <div className="relative">
                    <input
                      id="locationSearch"
                      ref={autocompleteInputRef}
                      type="text"
                      disabled={!isPlacesConfigured}
                      placeholder={isPlacesConfigured ? "Search for an address or city..." : "Location search disabled"}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </span>
                  </div>
                </div>

                {/* 3. Country/Region & Client (UI-Only placeholders for review) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="countryRegion" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                        Country / Region
                      </label>
                      <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded font-mono font-bold text-slate-600 shrink-0">UI Only</span>
                    </div>
                    <input
                      id="countryRegion"
                      type="text"
                      placeholder="e.g. United Kingdom"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/30 border border-slate-850 rounded-xl text-xs text-slate-400 placeholder-slate-650 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="preparedFor" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                        Prepared for / Client
                      </label>
                      <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded font-mono font-bold text-slate-600 shrink-0">UI Only</span>
                    </div>
                    <input
                      id="preparedFor"
                      type="text"
                      placeholder="e.g. Axis Client"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/30 border border-slate-850 rounded-xl text-xs text-slate-400 placeholder-slate-650 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 4. Coordinates (Lat, Lng, Zoom) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-b border-slate-850/60 py-3">
                  <div>
                    <label htmlFor="latitude" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Latitude <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      required
                      value={latitude}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setLatitude(val)
                        handleManualCoordChange(val, longitude)
                      }}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="longitude" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Longitude <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      required
                      value={longitude}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setLongitude(val)
                        handleManualCoordChange(latitude, val)
                      }}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="zoom" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Zoom <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="zoom"
                      type="number"
                      required
                      min="0"
                      max="22"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* 5. Notes */}
                <div>
                  <label htmlFor="notes" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Provide any description remarks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 font-sans">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 hover:text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-[0.98]"
                  >
                    {isPending ? 'Saving Setup...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side: Map Canvas */}
            <div className="relative w-full h-80 md:h-auto border-t md:border-t-0 md:border-l border-slate-850/80 bg-slate-950 overflow-hidden min-h-[350px]">
              {isPlacesConfigured ? (
                <div ref={mapRef} className="w-full h-full absolute inset-0" />
              ) : (
                <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-950 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-655 mb-3"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interactive Map Blocked</h4>
                  <p className="text-[10px] text-slate-550 mt-1 max-w-xs leading-relaxed">
                    Map preview and location search are disabled. Google Places/Maps configuration key is missing or not configured.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/design-review/projects"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
            title="Back to Projects"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <div className="h-4 w-[1px] bg-slate-850" />
          <span className="text-[10px] bg-slate-900 border border-slate-880 text-slate-450 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
            Review Mode
          </span>
          <span className="text-xs font-semibold text-slate-350">Configure Location</span>
        </div>
      </header>

      {/* Workspace Panel Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex items-center justify-center scrollbar-thin">
        <div className="w-full max-w-4xl bg-slate-900/65 backdrop-blur-md border border-slate-850 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Top cyan gradient border accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-550 to-indigo-500" />
          
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Side: Form */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Location Setup</h2>
                <p className="text-xs text-slate-400 mt-1">Configure layout origin bounds and region meta descriptors for the site map grid.</p>
              </div>

              {/* Warning Banner for missing Google Places Configuration */}
              {!isPlacesConfigured && (
                <div className="p-4 border border-amber-500/10 bg-amber-500/5 text-amber-450 rounded-xl text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Map Configuration Notice
                  </div>
                  <p>Location search requires Google Places configuration. You can still enter coordinates manually.</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Project Name */}
                <div>
                  <label htmlFor="projectName" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                    Project Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    required
                    placeholder="e.g. London Office Deployment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                  />
                </div>

                {/* 2. Location Search input */}
                <div>
                  <label htmlFor="locationSearch" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1">
                    Location Search (Google Places)
                  </label>
                  <div className="relative">
                    <input
                      id="locationSearch"
                      ref={autocompleteInputRef}
                      type="text"
                      disabled={!isPlacesConfigured}
                      placeholder={isPlacesConfigured ? "Search for an address or city..." : "Location search disabled"}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </span>
                  </div>
                </div>

                {/* 3. Country/Region & Client (UI-Only placeholders for review) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="countryRegion" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                        Country / Region
                      </label>
                      <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded font-mono font-bold text-slate-600 shrink-0">UI Only</span>
                    </div>
                    <input
                      id="countryRegion"
                      type="text"
                      placeholder="e.g. United Kingdom"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/30 border border-slate-850 rounded-xl text-xs text-slate-400 placeholder-slate-650 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="preparedFor" className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                        Prepared for / Client
                      </label>
                      <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded font-mono font-bold text-slate-600 shrink-0">UI Only</span>
                    </div>
                    <input
                      id="preparedFor"
                      type="text"
                      placeholder="e.g. Axis Client"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/30 border border-slate-850 rounded-xl text-xs text-slate-400 placeholder-slate-655 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 4. Coordinates (Lat, Lng, Zoom) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-b border-slate-850/60 py-3">
                  <div>
                    <label htmlFor="latitude" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Latitude <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      required
                      value={latitude}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setLatitude(val)
                        handleManualCoordChange(val, longitude)
                      }}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="longitude" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Longitude <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      required
                      value={longitude}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setLongitude(val)
                        handleManualCoordChange(latitude, val)
                      }}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="zoom" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                      Zoom <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      id="zoom"
                      type="number"
                      required
                      min="0"
                      max="22"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* 5. Notes */}
                <div>
                  <label htmlFor="notes" className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Provide any description remarks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 font-sans">
                  <Link
                    href="/design-review/projects"
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 hover:text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-[0.98]"
                  >
                    {isPending ? 'Saving Setup...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side: Map Canvas */}
            <div className="relative w-full h-80 md:h-auto border-t md:border-t-0 md:border-l border-slate-850/80 bg-slate-950 overflow-hidden min-h-[350px]">
              {isPlacesConfigured ? (
                <div ref={mapRef} className="w-full h-full absolute inset-0" />
              ) : (
                <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-950 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-650 mb-3"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interactive Map Blocked</h4>
                  <p className="text-[10px] text-slate-550 mt-1 max-w-xs leading-relaxed">
                    Map preview and location search are disabled. Google Places/Maps configuration key is missing or not configured.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

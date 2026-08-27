'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { updateProjectMetadata, deleteProject } from '../../actions'

interface ProjectData {
  id: string
  name: string
  description: string | null
  default_latitude: number
  default_longitude: number
  default_zoom: number
}

interface OverviewEditPanelProps {
  project: ProjectData
  googleMapsApiKey: string | undefined
}

export default function OverviewEditPanel({ project, googleMapsApiKey }: OverviewEditPanelProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [placesAvailable, setPlacesAvailable] = useState(!!googleMapsApiKey)
  const [placesLoaded, setPlacesLoaded] = useState(false)

  // Editable fields — initialized from server data
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [lat, setLat] = useState(Number(project.default_latitude).toFixed(6))
  const [lng, setLng] = useState(Number(project.default_longitude).toFixed(6))
  const [zoom, setZoom] = useState(String(project.default_zoom || 16))
  const [addressDisplay, setAddressDisplay] = useState('')

  const addressInputRef = useRef<HTMLInputElement>(null)

  // Load Google Places library when the edit panel opens
  useEffect(() => {
    if (!isOpen || !googleMapsApiKey || placesLoaded) return

    setOptions({ key: googleMapsApiKey, v: 'weekly' })

    importLibrary('places')
      .then((placesLib: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lib = placesLib as any
        if (!addressInputRef.current) return

        const autocomplete = new lib.Autocomplete(addressInputRef.current, {
          types: ['geocode', 'establishment'],
          fields: ['geometry', 'formatted_address', 'name'],
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry?.location) {
            setLat(place.geometry.location.lat().toFixed(6))
            setLng(place.geometry.location.lng().toFixed(6))
            setAddressDisplay(place.formatted_address || place.name || '')
          }
        })

        setPlacesLoaded(true)
        setPlacesAvailable(true)
      })
      .catch(() => {
        setPlacesAvailable(false)
      })
  }, [isOpen, googleMapsApiKey, placesLoaded])

  const validate = (): string | null => {
    if (!name.trim()) return 'Project name is required.'
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    const zoomN = parseInt(zoom, 10)
    if (isNaN(latN) || latN < -90 || latN > 90) return 'Latitude must be between -90 and 90.'
    if (isNaN(lngN) || lngN < -180 || lngN > 180) return 'Longitude must be between -180 and 180.'
    if (isNaN(zoomN) || zoomN < 1 || zoomN > 22) return 'Zoom must be between 1 and 22.'
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }
    setMessage(null)
    setSaving(true)

    const result = await updateProjectMetadata(project.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      default_latitude: parseFloat(lat),
      default_longitude: parseFloat(lng),
      default_zoom: parseInt(zoom, 10),
    })

    setSaving(false)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Project settings saved. Refreshing data...' })
      setTimeout(() => {
        setIsOpen(false)
        setMessage(null)
        router.refresh()
      }, 1200)
    }
  }

  const handleCancel = () => {
    setName(project.name)
    setDescription(project.description || '')
    setLat(Number(project.default_latitude).toFixed(6))
    setLng(Number(project.default_longitude).toFixed(6))
    setZoom(String(project.default_zoom || 16))
    setAddressDisplay('')
    setMessage(null)
    setIsOpen(false)
  }

  return (
    <div>
      {/* Toggle button */}
      <div className="flex justify-end mb-4">
        <button
          id="edit-project-btn"
          onClick={() => (isOpen ? handleCancel() : setIsOpen(true))}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs tracking-wide transition-all border ${
            isOpen
              ? 'bg-slate-100 dark:bg-[var(--surface-2)] border-slate-200 dark:border-[var(--border)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-[var(--accent)] hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white shadow-md shadow-indigo-600/20'
          }`}
        >
          {isOpen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel Edit
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Project
            </>
          )}
        </button>
      </div>

      {/* Edit panel */}
      {isOpen && (
        <div
          id="overview-edit-panel"
          className="bg-white dark:bg-[var(--surface-1)] backdrop-blur-md border border-slate-200 dark:border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-5 mb-6 text-slate-800 dark:text-slate-100"
        >
          {/* Panel header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[var(--border)]">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white animate-pulse shrink-0" />
            <h3 className="text-xs font-bold text-indigo-600 dark:text-[var(--accent-text)] uppercase tracking-wider">Edit Project Settings</h3>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Places warning */}
          {!placesAvailable && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Google Places is not configured. You can still enter latitude and longitude manually.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Project Name <span className="text-[var(--accent-text)]">*</span>
              </label>
              <input
                id="edit-project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown CCTV Phase 1"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Address Search */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Address Search
                <span className="ml-2 text-[var(--text-secondary)] dark:text-slate-600 normal-case font-normal">auto-fills coordinates below</span>
              </label>
              <div className="relative">
                <input
                  id="edit-address-search"
                  ref={addressInputRef}
                  type="text"
                  value={addressDisplay}
                  onChange={(e) => setAddressDisplay(e.target.value)}
                  placeholder={placesAvailable ? 'Search address or place...' : 'Google Places not configured'}
                  disabled={!googleMapsApiKey}
                  className="w-full px-3 py-2.5 pl-9 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] dark:text-slate-600 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
              <p className="text-[9px] text-[var(--text-tertiary)] dark:text-slate-600 mt-1">
                Address is resolved for geocoding only — not stored in the database. Coordinates are what get saved.
              </p>
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Default Latitude <span className="text-[var(--text-secondary)] dark:text-slate-600 font-normal">(-90 to 90)</span>
              </label>
              <input
                id="edit-latitude"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Default Longitude <span className="text-[var(--text-secondary)] dark:text-slate-600 font-normal">(-180 to 180)</span>
              </label>
              <input
                id="edit-longitude"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Default Zoom */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Default Zoom <span className="text-[var(--text-secondary)] dark:text-slate-600 font-normal">(1–22)</span>
              </label>
              <input
                id="edit-zoom"
                type="number"
                min="1"
                max="22"
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Prepared For / Client — schema not yet supported */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Prepared For / Client{' '}
                <span className="text-[var(--text-secondary)] dark:text-slate-700 font-normal normal-case">(future schema)</span>
              </label>
              <input
                type="text"
                disabled
                placeholder="Not yet configurable"
                className="w-full px-3 py-2.5 bg-slate-100/50 dark:bg-[var(--surface-2)]/30 border border-slate-200 dark:border-[var(--border)] rounded-xl text-[var(--text-secondary)] dark:text-slate-700 text-xs cursor-not-allowed"
              />
            </div>

            {/* Notes / Description */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Notes / Description
              </label>
              <textarea
                id="edit-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project scope, objectives, special notes..."
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
            <button
              type="button"
              onClick={async () => {
                const confirmDelete = window.confirm(`⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el proyecto "${project.name}"?\n\nEsta acción borrará de la base de datos todas las cámaras, nodos de fibra, switches, BOM y órdenes de trabajo asociadas. Esta acción NO se puede deshacer.`)
                if (!confirmDelete) return
                setSaving(true)
                const res = await deleteProject(project.id)
                setSaving(false)
                if (res.error) {
                  setMessage({ type: 'error', text: res.error })
                } else {
                  router.push('/projects')
                }
              }}
              disabled={saving}
              className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Delete Project
            </button>
            
            <div className="flex-1 flex gap-3">
              <button
                id="edit-cancel-btn"
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[var(--surface-2)] hover:bg-slate-200 dark:hover:bg-[var(--surface-1)] border border-slate-200 dark:border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-[var(--text-primary)] font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="edit-save-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:bg-indigo-800 disabled:text-[var(--accent-text)] text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Project Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

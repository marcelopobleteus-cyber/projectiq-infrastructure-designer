'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createProject } from '../actions'

// Canonical discipline ids — must match ALL_DISCIPLINES in ProjectSidebar.tsx
// and DISCIPLINE_LABELS in overview/PortfolioSection.tsx. A project can carry
// any combination of these; there is no single "type" per project anymore.
const DISCIPLINE_OPTIONS = [
  { id: 'cctv', title: 'CCTV & Videovigilancia', subtitle: 'Cámaras 4K PTZ, LPR, VLANs, NVRs y Cobertura FOV', icon: '🎥', color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400', ready: true },
  { id: 'fiber', title: 'Fibra Óptica (OSP / ISP)', subtitle: 'Trazados SMF 24F/48F, Manholes, Empalmes y FDUs', icon: '🧵', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', ready: true },
  { id: 'networking', title: 'Networking & Switches', subtitle: 'Switches Industriales PoE, Racks, Patch Cords & Ports', icon: '🔌', color: 'border-purple-500/50 bg-purple-500/10 text-purple-400', ready: true },
  { id: 'wireless', title: 'Enlaces Wireless & PTP', subtitle: 'Antenas Punto a Punto, PtMP, LoS y Cobertura Wi-Fi', icon: '📡', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400', ready: true },
  { id: 'power', title: 'Energía & Subestaciones', subtitle: 'Acometidas AC, Transformadores, UPS y Carga Watts', icon: '⚡', color: 'border-red-500/50 bg-red-500/10 text-red-400', ready: true },
  { id: 'conduit', title: 'Canalizaciones & Ductos', subtitle: 'Banco de Ductos, Tubería PVC/HDPE y Handholes', icon: '🛠️', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400', ready: false },
  { id: 'lighting', title: 'Alumbrado Público & Privado', subtitle: 'Smart Lighting, Postes, Luminarias LED & Fotocélulas', icon: '💡', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400', ready: false },
]

const READY_IDS = DISCIPLINE_OPTIONS.filter(d => d.ready).map(d => d.id)
const ALL_IDS = DISCIPLINE_OPTIONS.map(d => d.id)

export default function CreateProjectPage() {
  const [error, setError] = useState<string | null>(null)
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(READY_IDS)
  const [isPending, startTransition] = useTransition()

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (selectedDisciplines.length === 0) {
      setError('Elegí al menos una disciplina para el proyecto.')
      return
    }

    const formData = new FormData(event.currentTarget)
    selectedDisciplines.forEach(d => formData.append('disciplines', d))

    startTransition(async () => {
      const res = await createProject(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-10 py-6">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create New Infrastructure Project</h2>
          <p className="text-sm text-slate-400 mt-1">Select one or more infrastructure disciplines & site geographical coordinates</p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Discipline Multi-Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Disciplinas del Proyecto
                <span className="ml-2 text-slate-500 normal-case font-normal">elegí una o varias</span>
              </label>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <button type="button" onClick={() => setSelectedDisciplines(ALL_IDS)} className="text-indigo-400 hover:text-indigo-300">
                  Todas
                </button>
                <span className="text-slate-700">·</span>
                <button type="button" onClick={() => setSelectedDisciplines([])} className="text-slate-500 hover:text-slate-300">
                  Ninguna
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISCIPLINE_OPTIONS.map(pt => {
                const isSelected = selectedDisciplines.includes(pt.id)
                return (
                  <button
                    type="button"
                    key={pt.id}
                    onClick={() => toggleDiscipline(pt.id)}
                    aria-pressed={isSelected}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? `${pt.color} ring-1 ring-sky-500/30`
                        : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-md border shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-xl shrink-0">{pt.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {pt.title}
                        {!pt.ready && (
                          <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 tracking-wide">
                            En desarrollo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {pt.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedDisciplines.some(d => !READY_IDS.includes(d)) && (
              <p className="text-[10.5px] text-amber-400 mt-2">
                Las disciplinas marcadas &ldquo;En desarrollo&rdquo; se guardan en el proyecto, pero su módulo de trabajo todavía no está construido en la app.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Beltline Fiber Ring & CCTV Deployment"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description & Scope
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Provide summary of project scope, engineering requirements, or client notes..."
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="latitude" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                required
                defaultValue="33.7490"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                required
                defaultValue="-84.3880"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="zoom" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Zoom
              </label>
              <input
                id="zoom"
                name="zoom"
                type="number"
                required
                defaultValue="15"
                min="0"
                max="22"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-4">
            <Link
              href="/projects"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
            >
              {isPending ? 'Creating...' : 'Create Infrastructure Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

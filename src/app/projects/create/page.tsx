'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createProject } from '../actions'

const PROJECT_TYPES = [
  { id: 'master', title: 'Infraestructura Integral', subtitle: 'Master Multi-Disciplina (CCTV, Fibra, Energía, Lighting)', icon: '🌐', color: 'border-sky-500/50 bg-sky-500/10 text-sky-400' },
  { id: 'cctv', title: 'CCTV & Videovigilancia', subtitle: 'Cámaras 4K PTZ, LPR, VLANs, NVRs y Cobertura FOV', icon: '🎥', color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' },
  { id: 'fiber', title: 'Fibra Óptica (OSP / ISP)', subtitle: 'Trazados SMF 24F/48F, Manholes, Empalmes y FDUs', icon: '🧵', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
  { id: 'conduit', title: 'Canalizaciones & Ductos', subtitle: 'Banco de Ductos, Tubería PVC/HDPE y Handholes', icon: '🛠️', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
  { id: 'networking', title: 'Networking & Switches', subtitle: 'Switches Industriales PoE, Racks, Patch Cords & Ports', icon: '🔌', color: 'border-purple-500/50 bg-purple-500/10 text-purple-400' },
  { id: 'wireless', title: 'Enlaces Wireless & PTP', subtitle: 'Antenas Punto a Punto, PtMP, LoS y Cobertura Wi-Fi', icon: '📡', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' },
  { id: 'power', title: 'Energía & Subestaciones', subtitle: 'Acometidas AC, Transformadores, UPS y Carga Watts', icon: '⚡', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
  { id: 'lighting', title: 'Alumbrado Público & Privado', subtitle: 'Smart Lighting, Postes, Luminarias LED & Fotocélulas', icon: '💡', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
]

export default function CreateProjectPage() {
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>('master')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    formData.append('project_type', selectedType)

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
          <p className="text-sm text-slate-400 mt-1">Select project specialty domain & site geographical coordinates</p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Specialty Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Select Infrastructure Specialty Discipline
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROJECT_TYPES.map(pt => {
                const isSelected = selectedType === pt.id
                return (
                  <button
                    type="button"
                    key={pt.id}
                    onClick={() => setSelectedType(pt.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? `${pt.color} ring-1 ring-sky-500/30`
                        : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{pt.icon}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {pt.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {pt.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
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

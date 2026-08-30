'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { createProject } from '../actions'
import { createClient } from '@/utils/supabase/client'

// Canonical discipline ids — must match ALL_DISCIPLINES in ProjectSidebar.tsx
// and DISCIPLINE_LABELS in overview/PortfolioSection.tsx.
const DISCIPLINE_OPTIONS = [
  { id: 'cctv', title: 'CCTV & Videovigilancia', subtitle: 'Cámaras 4K PTZ, LPR, VLANs, NVRs y Cobertura FOV', icon: '📹', color: 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent-text)]', ready: true },
  { id: 'fiber', title: 'Fibra Óptica (OSP / ISP)', subtitle: 'Trazados SMF 24F/48F, Manholes, Empalmes y FDUs', icon: '🌐', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', ready: true },
  { id: 'networking', title: 'Networking & Switches', subtitle: 'Switches Industriales PoE, Racks, Patch Cords & Ports', icon: '🖧', color: 'border-purple-500/50 bg-purple-500/10 text-purple-400', ready: true },
  { id: 'wireless', title: 'Enlaces Wireless & PTP', subtitle: 'Antenas Punto a Punto, PtMP, LoS y Cobertura Wi-Fi', icon: '📡', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400', ready: true },
  { id: 'power', title: 'Energía & Subestaciones', subtitle: 'Acometidas AC, Transformadores, UPS y Carga Watts', icon: '⚡', color: 'border-red-500/50 bg-red-500/10 text-red-400', ready: true },
  { id: 'conduit', title: 'Canalizaciones & Ductos', subtitle: 'Banco de Ductos, Tubería PVC/HDPE y Handholes', icon: '🏗️', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400', ready: false },
  { id: 'lighting', title: 'Alumbrado Público & Privado', subtitle: 'Smart Lighting, Postes, Luminarias LED & Fotocélulas', icon: '💡', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400', ready: false },
]

const READY_IDS = DISCIPLINE_OPTIONS.filter(d => d.ready).map(d => d.id)
const ALL_IDS = DISCIPLINE_OPTIONS.map(d => d.id)

export default function CreateProjectPage() {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [purchasedModuleIds, setPurchasedModuleIds] = useState<string[] | null>(null)
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(READY_IDS)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadOrgPurchasedModules() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('profile_id', user.id)
          .limit(1)
          .single()

        if (member?.organization_id) {
          const { data: orgMods } = await supabase
            .from('organization_modules')
            .select('module_id, status')
            .eq('organization_id', member.organization_id)
            .eq('status', 'active')

          if (orgMods && orgMods.length > 0) {
            const allowed = orgMods.map((m: any) => m.module_id)
            setPurchasedModuleIds(allowed)
            setSelectedDisciplines(prev => prev.filter(id => allowed.includes(id)))
          }
        }
      } catch (err) {
        console.warn('Notice loading organization modules:', err)
      }
    }
    loadOrgPurchasedModules()
  }, [supabase])

  const toggleDiscipline = (id: string) => {
    if (purchasedModuleIds !== null && !purchasedModuleIds.includes(id)) {
      return // Gated by subscription
    }
    setSelectedDisciplines(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const selectAllAllowed = () => {
    if (purchasedModuleIds !== null) {
      setSelectedDisciplines(ALL_IDS.filter(id => purchasedModuleIds.includes(id)))
    } else {
      setSelectedDisciplines(ALL_IDS)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (selectedDisciplines.length === 0) {
      setError('Elige al menos una disciplina contratada para el proyecto.')
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Create Infrastructure Project</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Configure project metadata, engineering scope, and default map coordinates.</p>
        </div>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Disciplines Selection with Commercial Gating */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Disciplinas del Proyecto
                <span className="ml-2 text-[var(--text-tertiary)] normal-case font-normal">elige una o varias según tu plan contratado</span>
              </label>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <button type="button" onClick={selectAllAllowed} className="text-[var(--accent-text)] hover:text-indigo-300">
                  Todas las contratadas
                </button>
                <span className="text-slate-700">•</span>
                <button type="button" onClick={() => setSelectedDisciplines([])} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  Ninguna
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISCIPLINE_OPTIONS.map(pt => {
                const isPurchased = purchasedModuleIds === null || purchasedModuleIds.includes(pt.id)
                const isSelected = selectedDisciplines.includes(pt.id)

                return (
                  <button
                    type="button"
                    key={pt.id}
                    onClick={() => toggleDiscipline(pt.id)}
                    disabled={!isPurchased}
                    aria-pressed={isSelected}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative ${
                      !isPurchased
                        ? 'opacity-50 border-[var(--border)] bg-[var(--surface-2)] cursor-not-allowed text-[var(--text-tertiary)]'
                        : isSelected
                        ? `${pt.color} ring-1 ring-indigo-500/30`
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-slate-700 hover:bg-[var(--surface-1)] cursor-pointer'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-md border shrink-0 flex items-center justify-center ${
                        !isPurchased
                          ? 'border-slate-700 bg-slate-800'
                          : isSelected
                          ? 'bg-[var(--accent)] text-white border-indigo-400'
                          : 'border-slate-600'
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
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                        {pt.title}
                        {!isPurchased && (
                          <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wide">
                            No contratado
                          </span>
                        )}
                        {isPurchased && !pt.ready && (
                          <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-[var(--text-secondary)] tracking-wide">
                            En desarrollo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
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
            <label htmlFor="name" className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Beltline Fiber Ring & CCTV Deployment"
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Description & Scope
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Provide summary of project scope, engineering requirements, or client notes..."
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="latitude" className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                Default Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                required
                defaultValue="33.7490"
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                Default Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                required
                defaultValue="-84.3880"
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="zoom" className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
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
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-4">
            <Link
              href="/projects"
              className="px-5 py-2.5 bg-[var(--surface-1)] hover:bg-slate-850 border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold rounded-xl transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
            >
              {isPending ? 'Creating...' : 'Create Infrastructure Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

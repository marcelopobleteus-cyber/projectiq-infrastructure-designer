'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { createProject } from '../actions'
import { createClient } from '@/utils/supabase/client'
import { PROJECT_SECTIONS, disciplinesForSection, type ProjectSection } from '@/lib/disciplines'

export default function CreateProjectPage() {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [purchasedModuleIds, setPurchasedModuleIds] = useState<string[] | null>(null)
  const [section, setSection] = useState<ProjectSection>('its')
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const sectionDisciplines = useMemo(() => disciplinesForSection(section), [section])
  const readyIds = useMemo(() => sectionDisciplines.filter(d => d.ready).map(d => d.id), [sectionDisciplines])
  const allIdsInSection = useMemo(() => sectionDisciplines.map(d => d.id), [sectionDisciplines])

  // Switching section resets the discipline picks to that section's ready-by-default set.
  useEffect(() => {
    setSelectedDisciplines(prev => {
      const carried = prev.filter(id => allIdsInSection.includes(id))
      return carried.length > 0 ? carried : readyIds
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

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
      setSelectedDisciplines(allIdsInSection.filter(id => purchasedModuleIds.includes(id)))
    } else {
      setSelectedDisciplines(allIdsInSection)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (selectedDisciplines.length === 0) {
      setError('Pick at least one module for this project.')
      return
    }

    const formData = new FormData(event.currentTarget)
    formData.append('project_section', section)
    selectedDisciplines.forEach(d => formData.append('disciplines', d))

    startTransition(async () => {
      const res = await createProject(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  // Construction / Maintenance sub-headers only apply to the Tower section today.
  const constructionItems = sectionDisciplines.filter(d => d.group === 'construction')
  const maintenanceItems = sectionDisciplines.filter(d => d.group === 'maintenance')
  const ungroupedItems = sectionDisciplines.filter(d => !d.group)

  const renderDisciplineCard = (pt: (typeof sectionDisciplines)[number]) => {
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
                Not purchased
              </span>
            )}
            {isPurchased && !pt.ready && (
              <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-[var(--text-secondary)] tracking-wide">
                Under construction
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
            {pt.subtitle}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Create Infrastructure Project</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Choose the product line, engineering scope, and default map coordinates.</p>
        </div>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Step 1 — Product line / section */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Product Line
              <span className="ml-2 text-[var(--text-tertiary)] normal-case font-normal">what kind of project is this?</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROJECT_SECTIONS.map(s => {
                const isActive = section === s.id
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    aria-pressed={isActive}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-indigo-500/30'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-slate-700 hover:bg-[var(--surface-1)]'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-xs font-bold ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'}`}>{s.title}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] leading-tight">{s.subtitle}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2 — Modules within the chosen section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Project Modules
                <span className="ml-2 text-[var(--text-tertiary)] normal-case font-normal">pick one or more, according to your plan</span>
              </label>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <button type="button" onClick={selectAllAllowed} className="text-[var(--accent-text)] hover:text-indigo-300">
                  Select all purchased
                </button>
                <span className="text-slate-700">•</span>
                <button type="button" onClick={() => setSelectedDisciplines([])} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  Clear
                </button>
              </div>
            </div>

            {ungroupedItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ungroupedItems.map(renderDisciplineCard)}
              </div>
            )}

            {constructionItems.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Construction</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {constructionItems.map(renderDisciplineCard)}
                </div>
              </div>
            )}

            {maintenanceItems.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Maintenance</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {maintenanceItems.map(renderDisciplineCard)}
                </div>
              </div>
            )}

            {selectedDisciplines.some(d => !sectionDisciplines.find(sd => sd.id === d)?.ready) && (
              <p className="text-[10.5px] text-amber-400 mt-3">
                Modules marked &ldquo;Under construction&rdquo; are saved to the project so its full scope is visible, but their work module is not built in the app yet.
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
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
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
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
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
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
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
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
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
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-4">
            <Link
              href="/projects"
              className="px-5 py-2.5 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold rounded-xl transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-[var(--accent)] text-white disabled:opacity-50 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
            >
              {isPending ? 'Creating...' : 'Create Infrastructure Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

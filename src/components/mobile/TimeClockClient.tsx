'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clockIn, clockOut } from '@/app/mobile/time/actions'

export interface TimeClockProject {
  id: string
  name: string
}

export interface OpenTimeEntry {
  id: string
  project_id: string
  project_name: string
  clock_in: string
}

export interface TimeEntryHistoryItem {
  id: string
  project_id: string
  project_name: string
  clock_in: string
  clock_out: string
  work_description: string | null
}

interface TimeClockClientProps {
  projects: TimeClockProject[]
  openEntry: OpenTimeEntry | null
  history: TimeEntryHistoryItem[]
  lockedProjectId?: string
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function TimeClockClient({ projects, openEntry, history, lockedProjectId }: TimeClockClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedProjectId, setSelectedProjectId] = useState(lockedProjectId || projects[0]?.id || '')
  const [now, setNow] = useState(() => Date.now())
  const [showClockOutModal, setShowClockOutModal] = useState(false)
  const [workDescription, setWorkDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!openEntry) return
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [openEntry])

  const elapsedMs = useMemo(() => {
    if (!openEntry) return 0
    return now - new Date(openEntry.clock_in).getTime()
  }, [openEntry, now])

  const totalHistoryMs = useMemo(() => {
    return history.reduce((sum, h) => sum + (new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime()), 0)
  }, [history])

  const handleClockIn = () => {
    if (!selectedProjectId) {
      setError('Selecciona un proyecto antes de marcar entrada.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await clockIn(selectedProjectId)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleClockOutSubmit = () => {
    if (!openEntry) return
    setError(null)
    startTransition(async () => {
      const res = await clockOut(openEntry.id, workDescription, openEntry.project_id)
      if (res?.error) {
        setError(res.error)
      } else {
        setShowClockOutModal(false)
        setWorkDescription('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Clock in/out card */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        {openEntry ? (
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En terreno
            </span>
            <div>
              <p className="text-3xl font-black text-[var(--text-primary)] tabular-nums tracking-tight">
                {formatDuration(elapsedMs)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Desde las {formatClock(openEntry.clock_in)} · {openEntry.project_name}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowClockOutModal(true)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Marcar Salida
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
                Proyecto
              </label>
              {lockedProjectId ? (
                <div className="px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-primary)]">
                  {projects.find((p) => p.id === lockedProjectId)?.name || 'Proyecto'}
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-primary)]"
                >
                  {projects.length === 0 && <option value="">Sin proyectos disponibles</option>}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              disabled={isPending || !selectedProjectId}
              onClick={handleClockIn}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Marcar Entrada
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
      </div>

      {/* History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Últimos fichajes
          </h3>
          {history.length > 0 && (
            <span className="text-[10px] font-bold text-[var(--accent-text)]">
              Total: {formatDuration(totalHistoryMs)}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 text-center">
            <p className="text-xs text-[var(--text-secondary)]">Aún no hay fichajes registrados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{h.project_name}</span>
                  <span className="text-[10px] font-bold text-[var(--accent-text)] tabular-nums">
                    {formatDuration(new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime())}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {formatDay(h.clock_in)} · {formatClock(h.clock_in)} – {formatClock(h.clock_out)}
                </p>
                {h.work_description && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-1.5 mt-1.5">
                    {h.work_description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clock-out modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isPending && setShowClockOutModal(false)}
          />
          <div className="relative w-full max-w-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">
                ¿Qué trabajo hiciste?
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Describe brevemente la tarea realizada antes de marcar salida.
              </p>
            </div>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Ej: Instalación de 4 cámaras en poste P-12, tendido de fibra en cámara de registro..."
              rows={4}
              autoFocus
              className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowClockOutModal(false)}
                className="flex-1 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleClockOutSubmit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {isPending ? 'Guardando...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

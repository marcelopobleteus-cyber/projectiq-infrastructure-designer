'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clockIn, clockOut } from '@/app/mobile/time/actions'
import type { TimeClockData } from '@/app/mobile/time/data'

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function TimeClockClient({ projects, openEntry, history }: TimeClockData) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '')
  const [now, setNow] = useState(() => Date.now())
  const [description, setDescription] = useState('')
  const [showClockOut, setShowClockOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!openEntry) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [openEntry])

  const elapsedMs = useMemo(
    () => (openEntry ? now - new Date(openEntry.clock_in).getTime() : 0),
    [openEntry, now]
  )

  const weekTotalMs = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return history
      .filter((h) => new Date(h.clock_in).getTime() >= weekAgo)
      .reduce((sum, h) => sum + (new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime()), 0)
  }, [history])

  function handleClockIn() {
    if (!selectedProjectId) {
      setError('Selecciona un proyecto antes de marcar entrada.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await clockIn(selectedProjectId)
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  function handleClockOut() {
    if (!openEntry) return
    setError(null)
    startTransition(async () => {
      const res = await clockOut(openEntry.id, description, openEntry.project_id)
      if (res?.error) setError(res.error)
      else {
        setShowClockOut(false)
        setDescription('')
        router.refresh()
      }
    })
  }

  if (projects.length === 0) {
    return (
      <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl text-center text-sm text-[var(--text-secondary)]">
        No tienes proyectos asignados todavía.
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Status card */}
      {openEntry ? (
        <div className="bg-[var(--surface-1)] border border-[var(--accent)]/40 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Turno en curso</span>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{openEntry.project_name}</p>
            <p className="text-3xl font-black text-[var(--text-primary)] tabular-nums mt-1">
              {formatDuration(elapsedMs)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Entrada a las {formatClock(openEntry.clock_in)}</p>
          </div>
          {!showClockOut ? (
            <button
              onClick={() => setShowClockOut(true)}
              disabled={isPending}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase tracking-wide disabled:opacity-50"
            >
              Marcar Salida
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿Qué se hizo en este turno? (opcional)"
                rows={3}
                className="w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClockOut(false)}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50"
                >
                  {isPending ? 'Guardando…' : 'Confirmar Salida'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-2xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sin turno activo</p>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleClockIn}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm uppercase tracking-wide disabled:opacity-50"
          >
            {isPending ? 'Marcando…' : 'Marcar Entrada'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3">{error}</div>
      )}

      {/* Week summary */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-2xl flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Horas últimos 7 días
        </span>
        <span className="text-sm font-black text-[var(--text-primary)] tabular-nums">
          {formatDuration(weekTotalMs)}
        </span>
      </div>

      {/* History */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-1">
          Historial reciente
        </p>
        {history.length === 0 ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-2xl text-center text-xs text-[var(--text-secondary)]">
            Todavía no tienes turnos registrados.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="bg-[var(--surface-1)] border border-[var(--border)] p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{h.project_name}</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                    {formatDuration(new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime())}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatDay(h.clock_in)} · {formatClock(h.clock_in)} – {formatClock(h.clock_out)}
                  </span>
                </div>
                {h.work_description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{h.work_description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

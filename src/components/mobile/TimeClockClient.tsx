'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clockIn, clockOut, pauseEntry, resumeEntry } from '@/app/mobile/time/actions'
import type { TimeClockData } from '@/app/mobile/time/data'

const OFFICE_VALUE = 'office'

function formatDuration(totalMinutes: number): string {
  const total = Math.max(0, Math.floor(totalMinutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })
}

function dayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MonthCalendar({ monthDays, weekTotalMinutes }: { monthDays: TimeClockData['monthDays']; weekTotalMinutes: number }) {
  const today = new Date()
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const minutesByDay = useMemo(() => new Map(monthDays.map((d) => [d.date, d.minutesWorked])), [monthDays])

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const todayKey = dayKeyFromDate(today)

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] capitalize">
          {monthLabel}
        </span>
        <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">
          This week: {formatDuration(weekTotalMinutes)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-3">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-[9px] font-bold text-[var(--text-secondary)] uppercase">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const key = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
          const worked = minutesByDay.get(key)
          const isToday = key === todayKey
          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative ${
                isToday ? 'bg-[var(--accent)] text-white font-black' : 'text-[var(--text-primary)]'
              }`}
            >
              {d}
              {worked !== undefined && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-emerald-500'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimeClockClient({ projects, costCodes, openEntry, history, monthDays }: TimeClockData) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedProjectId, setSelectedProjectId] = useState<string>(OFFICE_VALUE)
  const [selectedCostCodeId, setSelectedCostCodeId] = useState<string>('')
  const [now, setNow] = useState(() => Date.now())
  const [description, setDescription] = useState('')
  const [showClockOut, setShowClockOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!openEntry) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [openEntry])

  const isPaused = !!openEntry?.paused_at

  const elapsedMinutes = useMemo(() => {
    if (!openEntry) return 0
    const grossMs = now - new Date(openEntry.clock_in).getTime()
    let pausedMinutes = openEntry.paused_minutes
    if (openEntry.paused_at) {
      pausedMinutes += Math.max(0, Math.round((now - new Date(openEntry.paused_at).getTime()) / 60000))
    }
    return Math.max(0, Math.floor(grossMs / 60000) - pausedMinutes)
  }, [openEntry, now])

  const weekTotalMinutes = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const historyTotal = history
      .filter((h) => new Date(h.clock_in).getTime() >= weekAgo)
      .reduce((sum, h) => {
        const gross = new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime()
        return sum + Math.max(0, Math.floor(gross / 60000) - h.paused_minutes)
      }, 0)
    return historyTotal + (openEntry && new Date(openEntry.clock_in).getTime() >= weekAgo ? elapsedMinutes : 0)
  }, [history, openEntry, elapsedMinutes])

  function handleClockIn() {
    setError(null)
    startTransition(async () => {
      const projectId = selectedProjectId === OFFICE_VALUE ? null : selectedProjectId
      const res = await clockIn(projectId, selectedCostCodeId || null)
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  function handlePauseResume() {
    if (!openEntry) return
    setError(null)
    startTransition(async () => {
      const res = isPaused ? await resumeEntry(openEntry.id) : await pauseEntry(openEntry.id)
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

  return (
    <div className="space-y-4 font-sans">
      <MonthCalendar monthDays={monthDays} weekTotalMinutes={weekTotalMinutes} />

      {/* Status card */}
      {openEntry ? (
        <div className="bg-[var(--surface-1)] border border-[var(--accent)]/40 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isPaused ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isPaused ? 'Paused' : 'Shift in progress'}
            </span>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{openEntry.project_name}</p>
            <p className="text-3xl font-black text-[var(--text-primary)] tabular-nums mt-1">
              {formatDuration(elapsedMinutes)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Clocked in at {formatClock(openEntry.clock_in)}</p>
          </div>
          {!showClockOut ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePauseResume}
                disabled={isPending}
                className={`h-12 rounded-xl font-bold text-sm uppercase tracking-wide disabled:opacity-50 ${
                  isPaused ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
                }`}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => setShowClockOut(true)}
                disabled={isPending}
                className="h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase tracking-wide disabled:opacity-50"
              >
                Clock Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on this shift? (optional)"
                rows={3}
                className="w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClockOut(false)}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : 'Confirm Clock Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-2xl space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">No active shift</p>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value={OFFICE_VALUE}>Office</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Cost Code</label>
            <select
              value={selectedCostCodeId}
              onChange={(e) => setSelectedCostCodeId(e.target.value)}
              className="w-full h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Unassigned</option>
              {costCodes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleClockIn}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm uppercase tracking-wide disabled:opacity-50"
          >
            {isPending ? 'Clocking in…' : 'Clock In'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3">{error}</div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-1">
          Recent History
        </p>
        {history.length === 0 ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-2xl text-center text-xs text-[var(--text-secondary)]">
            No shifts logged yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const grossMinutes = Math.floor((new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime()) / 60000)
              const netMinutesTotal = Math.max(0, grossMinutes - h.paused_minutes)
              return (
                <div key={h.id} className="bg-[var(--surface-1)] border border-[var(--border)] p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{h.project_name}</span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                      {formatDuration(netMinutesTotal)}
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

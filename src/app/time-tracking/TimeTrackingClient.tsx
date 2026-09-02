'use client'

import React, { useMemo, useState, useTransition } from 'react'
import type { TimeTrackingData, TimeTrackingEntry } from './actions'
import {
  updateTimeEntry,
  deleteTimeEntry,
  createCostCode,
  renameCostCode,
  setCostCodeActive,
} from './actions'

function netMinutes(clockIn: string, clockOut: string | null, pausedMinutes: number): number {
  const start = new Date(clockIn).getTime()
  const end = clockOut ? new Date(clockOut).getTime() : Date.now()
  return Math.max(0, Math.floor((end - start) / 60000) - pausedMinutes)
}

function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time, no timezone suffix.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TimeTrackingClient({
  currentUserRole,
  organizationId,
  organizationName,
  projects,
  employees,
  costCodes,
  entries,
}: TimeTrackingData) {
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor'

  const [projectFilter, setProjectFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editingEntry, setEditingEntry] = useState<TimeTrackingEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeTrackingEntry | null>(null)
  const [showCostCodes, setShowCostCodes] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (projectFilter === 'office' && e.project_id !== null) return false
      else if (projectFilter !== 'all' && projectFilter !== 'office' && e.project_id !== projectFilter) return false
      if (employeeFilter !== 'all' && e.profile_id !== employeeFilter) return false
      if (statusFilter === 'open' && e.clock_out) return false
      if (statusFilter === 'closed' && !e.clock_out) return false
      if (dateFrom && new Date(e.clock_in) < new Date(dateFrom)) return false
      if (dateTo && new Date(e.clock_in) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [entries, projectFilter, employeeFilter, statusFilter, dateFrom, dateTo])

  const summary = useMemo(() => {
    const openCount = filtered.filter((e) => !e.clock_out).length
    const totalMinutes = filtered.reduce((sum, e) => sum + netMinutes(e.clock_in, e.clock_out, e.paused_minutes), 0)
    const todayStr = new Date().toDateString()
    const activeToday = new Set(
      filtered.filter((e) => new Date(e.clock_in).toDateString() === todayStr).map((e) => e.profile_id)
    ).size
    return { openCount, totalHours: totalMinutes / 60, activeToday }
  }, [filtered])

  function handleExportCsv() {
    const header = ['Empleado', 'Email', 'Proyecto', 'Centro de Costo', 'Entrada', 'Salida', 'Horas', 'Descripción']
    const rows = filtered.map((e) => [
      e.employee_name,
      e.employee_email,
      e.project_name,
      e.cost_code_name,
      e.clock_in,
      e.clock_out || '',
      (netMinutes(e.clock_in, e.clock_out, e.paused_minutes) / 60).toFixed(2),
      (e.work_description || '').replace(/"/g, '""'),
    ])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fichajes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function submitEdit(clockIn: string, clockOut: string, projectId: string | null, costCodeId: string | null, description: string) {
    if (!editingEntry) return
    setError(null)
    startTransition(async () => {
      const res = await updateTimeEntry(editingEntry.id, {
        clock_in: new Date(clockIn).toISOString(),
        clock_out: clockOut ? new Date(clockOut).toISOString() : null,
        project_id: projectId,
        cost_code_id: costCodeId,
        work_description: description.trim() || null,
      })
      if (res?.error) setError(res.error)
      else setEditingEntry(null)
    })
  }

  function confirmDelete() {
    if (!deletingEntry) return
    setError(null)
    startTransition(async () => {
      const res = await deleteTimeEntry(deletingEntry.id)
      if (res?.error) setError(res.error)
      else setDeletingEntry(null)
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="p-6 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-wider">Time Tracking</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Fichajes de terreno · {organizationName}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCostCodes(true)}
            className="h-9 px-4 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Centros de Costo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Turnos abiertos ahora
            </p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{summary.openCount}</p>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Horas en el filtro actual
            </p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{summary.totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Empleados activos hoy
            </p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{summary.activeToday}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Proyecto</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Todos</option>
              <option value="office">Office</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Empleado</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Todos</option>
              <option value="open">Abiertos</option>
              <option value="closed">Cerrados</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
            />
          </div>
          <button
            onClick={handleExportCsv}
            className="ml-auto h-9 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold uppercase tracking-wide"
          >
            Exportar CSV
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3">{error}</div>}

        {/* Table */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wide text-[10px]">
                <th className="text-left font-bold px-4 py-3">Empleado</th>
                <th className="text-left font-bold px-4 py-3">Proyecto</th>
                <th className="text-left font-bold px-4 py-3">Centro de Costo</th>
                <th className="text-left font-bold px-4 py-3">Entrada</th>
                <th className="text-left font-bold px-4 py-3">Salida</th>
                <th className="text-left font-bold px-4 py-3">Horas</th>
                <th className="text-left font-bold px-4 py-3">Descripción</th>
                {canEdit && <th className="text-right font-bold px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-10 text-[var(--text-secondary)]">
                    No hay fichajes que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]">
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{e.employee_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{e.project_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{e.cost_code_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(e.clock_in)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {e.clock_out ? (
                        formatDateTime(e.clock_out)
                      ) : (
                        <span className="text-emerald-500 font-bold">En curso</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--text-primary)] font-semibold whitespace-nowrap">
                      {formatDuration(netMinutes(e.clock_in, e.clock_out, e.paused_minutes))}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate" title={e.work_description || ''}>
                      {e.work_description || '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingEntry(e)}
                          className="text-[var(--accent-text)] font-bold hover:underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingEntry(e)}
                          className="text-red-400 font-bold hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingEntry && (
        <EditModal
          entry={editingEntry}
          projects={projects}
          costCodes={costCodes}
          isPending={isPending}
          onCancel={() => setEditingEntry(null)}
          onSubmit={submitEdit}
        />
      )}

      {/* Delete confirm */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">¿Eliminar este fichaje?</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {deletingEntry.employee_name} · {deletingEntry.project_name} · {formatDateTime(deletingEntry.clock_in)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingEntry(null)}
                className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost codes management */}
      {showCostCodes && (
        <CostCodesModal
          organizationId={organizationId}
          costCodes={costCodes}
          onClose={() => setShowCostCodes(false)}
        />
      )}
    </div>
  )
}

function EditModal({
  entry,
  projects,
  costCodes,
  isPending,
  onCancel,
  onSubmit,
}: {
  entry: TimeTrackingEntry
  projects: TimeTrackingData['projects']
  costCodes: TimeTrackingData['costCodes']
  isPending: boolean
  onCancel: () => void
  onSubmit: (clockIn: string, clockOut: string, projectId: string | null, costCodeId: string | null, description: string) => void
}) {
  const [clockIn, setClockIn] = useState(toLocalInputValue(entry.clock_in))
  const [clockOut, setClockOut] = useState(entry.clock_out ? toLocalInputValue(entry.clock_out) : '')
  const [projectId, setProjectId] = useState(entry.project_id || 'office')
  const [costCodeId, setCostCodeId] = useState(entry.cost_code_id || '')
  const [description, setDescription] = useState(entry.work_description || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          Editar fichaje · {entry.employee_name}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Proyecto</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
              >
                <option value="office">Office</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Centro de Costo</label>
              <select
                value={costCodeId}
                onChange={(e) => setCostCodeId(e.target.value)}
                className="h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
              >
                <option value="">Sin asignar</option>
                {costCodes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{!c.is_active ? ' (inactivo)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Entrada</label>
            <input
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 text-xs text-[var(--text-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Salida (vacío = turno abierto)
            </label>
            <input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 text-xs text-[var(--text-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onSubmit(clockIn, clockOut, projectId === 'office' ? null : projectId, costCodeId || null, description)
            }
            disabled={isPending || !clockIn}
            className="flex-1 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CostCodesModal({
  organizationId,
  costCodes,
  onClose,
}: {
  organizationId: string
  costCodes: TimeTrackingData['costCodes']
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const res = await createCostCode(organizationId, newName)
      if (res?.error) setError(res.error)
      else setNewName('')
    })
  }

  function handleRename(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await renameCostCode(id, renameValue)
      if (res?.error) setError(res.error)
      else setRenamingId(null)
    })
  }

  function handleToggleActive(id: string, isActive: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await setCostCodeActive(id, !isActive)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Centros de Costo</h3>
          <button onClick={onClose} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Cerrar
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3">{error}</div>}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {costCodes.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-4">Todavía no hay centros de costo.</p>
          ) : (
            costCodes.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2">
                {renamingId === c.id ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 h-8 rounded-md bg-[var(--surface-1)] border border-[var(--border)] px-2 text-xs text-[var(--text-primary)]"
                    />
                    <button
                      onClick={() => handleRename(c.id)}
                      disabled={isPending}
                      className="text-xs font-bold text-[var(--accent-text)]"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="text-xs text-[var(--text-secondary)]"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-xs font-semibold ${c.is_active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] line-through'}`}>
                      {c.name}
                    </span>
                    <button
                      onClick={() => {
                        setRenamingId(c.id)
                        setRenameValue(c.name)
                      }}
                      className="text-xs font-bold text-[var(--accent-text)]"
                    >
                      Renombrar
                    </button>
                    <button
                      onClick={() => handleToggleActive(c.id, c.is_active)}
                      disabled={isPending}
                      className="text-xs font-bold text-[var(--text-secondary)]"
                    >
                      {c.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo centro de costo"
            className="flex-1 h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 text-xs text-[var(--text-primary)]"
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="h-10 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

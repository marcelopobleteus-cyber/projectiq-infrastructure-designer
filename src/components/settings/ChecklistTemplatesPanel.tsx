'use client'

/**
 * Editor de plantillas de checklist.
 *
 * Las 13 tareas por camara venian fijas en el codigo y no habia forma de
 * ajustarlas sin un deploy. Aqui la organizacion arma su propia lista por tipo
 * de conectividad; mientras no guarde nada, sigue usando la del sistema.
 *
 * Regla que no se puede romper: templateKey de una tarea existente nunca se
 * reescribe al editar el titulo. Esa clave es lo que evita que se vuelva a
 * crear una tarea que la cuadrilla ya cerro en campo.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  getChecklistTemplates,
  saveChecklistTemplate,
  resetChecklistTemplate,
} from '@/app/settings/actions'
import {
  COMMUNICATION_TYPES,
  TASK_TYPES,
  buildTemplateKey,
  type ChecklistTemplateItem,
  type CommunicationType,
} from '@/lib/checklistTemplates'

interface LoadedTemplate {
  items: ChecklistTemplateItem[]
  isSystemDefault: boolean
}

export default function ChecklistTemplatesPanel({
  active,
  showToast,
}: {
  active: boolean
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void
}) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [saved, setSaved] = useState<Record<string, LoadedTemplate>>({})
  const [draft, setDraft] = useState<ChecklistTemplateItem[] | null>(null)
  const [commType, setCommType] = useState<CommunicationType>('copper')
  const [busy, setBusy] = useState(false)
  const requested = useRef(false)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    const res = await getChecklistTemplates()
    if (res.error) {
      setLoadError(res.error)
    } else {
      const map: Record<string, LoadedTemplate> = {}
      for (const t of res.templates) {
        map[t.communicationType] = { items: t.items, isSystemDefault: t.isSystemDefault }
      }
      setSaved(map)
      setCanEdit(res.canEdit)
    }
    setLoading(false)
  }

  // Carga diferida al abrir la pestana, con guardia en un ref (no en las
  // dependencias) por la misma razon que en Labor Rates: tener el estado de
  // carga en deps hace que el efecto se cancele a si mismo.
  useEffect(() => {
    if (!active || requested.current) return
    requested.current = true
    load()
  }, [active])

  const current = saved[commType]
  const items = draft ?? current?.items ?? []
  const dirty = draft !== null

  // Cambiar de tipo con cambios sin guardar los perderia en silencio, asi que
  // se bloquea y se dice que hacer. Sin confirm() nativo: Chrome lo suprime
  // tras el primero y devuelve false sin avisar.
  const switchType = (t: CommunicationType) => {
    if (t === commType) return
    if (dirty) {
      showToast('Save or discard your changes before switching connectivity type.', 'info')
      return
    }
    setCommType(t)
  }

  const update = (index: number, patch: Partial<ChecklistTemplateItem>) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it))
    setDraft(next)
  }

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [row] = next.splice(index, 1)
    next.splice(target, 0, row)
    setDraft(next)
  }

  const remove = (index: number) => {
    setDraft(items.filter((_, i) => i !== index))
  }

  const addTask = () => {
    const taken = new Set(items.map(i => i.templateKey))
    setDraft([
      ...items,
      { title: '', taskType: 'Site Survey', templateKey: buildTemplateKey(commType, `task ${items.length + 1}`, taken) },
    ])
  }

  const handleSave = async () => {
    if (!draft) return
    // La clave se completa recien al guardar, con el titulo final: al agregar
    // la fila el titulo todavia estaba vacio.
    const taken = new Set<string>()
    const withKeys = draft.map(it => {
      const existed = current?.items.some(o => o.templateKey === it.templateKey)
      const key = existed ? it.templateKey : buildTemplateKey(commType, it.title || 'task', taken)
      taken.add(key)
      return { ...it, title: it.title.trim(), templateKey: key }
    })

    setBusy(true)
    const res = await saveChecklistTemplate({ communicationType: commType, items: withKeys })
    setBusy(false)

    if (res.error) {
      showToast(res.error, 'error')
      return
    }
    setDraft(null)
    await load()
    showToast('Checklist saved. It applies to checklists generated from now on.')
  }

  const handleReset = async () => {
    setBusy(true)
    const res = await resetChecklistTemplate(commType)
    setBusy(false)
    if (res.error) {
      showToast(res.error, 'error')
      return
    }
    setDraft(null)
    await load()
    showToast('Restored the system checklist.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Camera Checklists</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          The task list a camera gets when its checklist is generated. One list per connectivity
          type — edit it so it matches how your crews actually work.
        </p>
      </div>

      <div className="bg-[var(--surface-1)] border-l-2 border-l-[var(--accent)] border border-[var(--border)] p-4 rounded-xl">
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          <span className="font-bold text-[var(--text-primary)]">Changes apply to new checklists only.</span>{' '}
          Cameras that already have tasks keep them — nothing a crew has completed is removed or renamed.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-tertiary)]">Loading checklists…</p>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
          <p className="text-xs text-[var(--danger)] font-semibold">{loadError}</p>
        </div>
      ) : (
        <>
          {/* Selector de tipo de conectividad */}
          <div className="flex flex-wrap gap-1.5">
            {COMMUNICATION_TYPES.map(t => {
              const isActive = t.value === commType
              const custom = saved[t.value] && !saved[t.value].isSystemDefault
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => switchType(t.value)}
                  disabled={busy}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    isActive
                      ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--accent-text)]'
                      : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {t.label}
                  {custom && <span className="ml-1.5 text-[9px] uppercase font-mono text-[var(--text-tertiary)]">Custom</span>}
                </button>
              )
            })}
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {items.length} task{items.length === 1 ? '' : 's'} per camera
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                {current?.isSystemDefault && !dirty ? 'System default' : 'Your checklist'}
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {items.map((item, index) => (
                <div key={item.templateKey || index} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] w-5 shrink-0">{index + 1}</span>

                  <input
                    type="text"
                    value={item.title}
                    placeholder="Task title"
                    onChange={e => update(index, { title: e.target.value })}
                    disabled={!canEdit || busy}
                    className="flex-1 min-w-0 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />

                  <select
                    value={item.taskType}
                    onChange={e => update(index, { taskType: e.target.value })}
                    disabled={!canEdit || busy}
                    className="w-40 shrink-0 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  >
                    {(TASK_TYPES.includes(item.taskType) ? TASK_TYPES : [item.taskType, ...TASK_TYPES]).map(t => (
                      <option key={t} value={t} className="text-[var(--text-primary)] bg-[var(--surface-1)]">
                        {t}
                      </option>
                    ))}
                  </select>

                  {canEdit && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || busy}
                        title="Move up"
                        className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1 || busy}
                        title="Move down"
                        className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer text-xs"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={busy}
                        title="Remove task"
                        className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canEdit ? (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <button
                  type="button"
                  onClick={addTask}
                  disabled={busy}
                  className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  + Add task
                </button>

                {dirty && (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={busy}
                      className="px-3.5 py-2 bg-[var(--accent)] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                    >
                      {busy ? 'Saving…' : 'Save checklist'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(null)}
                      disabled={busy}
                      className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Discard
                    </button>
                  </>
                )}

                {!dirty && current && !current.isSystemDefault && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={busy}
                    className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-bold rounded-lg transition cursor-pointer ml-auto"
                  >
                    Restore system checklist
                  </button>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <p className="text-[11px] text-[var(--text-tertiary)]">Only owners and admins can change checklists.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

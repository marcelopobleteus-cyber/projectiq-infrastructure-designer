'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { linkProjectToParent, type PortfolioData } from '../../actions'

interface PortfolioSectionProps {
  projectId: string
  portfolio: PortfolioData
}

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const DISCIPLINE_LABELS: Record<string, string> = {
  cctv: 'CCTV',
  fiber: 'Fibra',
  conduit: 'Conduit',
  networking: 'Networking',
  wireless: 'Wireless',
  power: 'Power',
  lighting: 'Alumbrado',
}

function DisciplineBadges({ disciplines }: { disciplines: string[] }) {
  if (!disciplines.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {disciplines.map(d => (
        <span
          key={d}
          className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] tracking-wide"
        >
          {DISCIPLINE_LABELS[d] || d}
        </span>
      ))}
    </div>
  )
}

export default function PortfolioSection({ projectId, portfolio }: PortfolioSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedParent, setSelectedParent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showLinker, setShowLinker] = useState(false)

  const handleLink = () => {
    if (!selectedParent) return
    setError(null)
    startTransition(async () => {
      const result = await linkProjectToParent(projectId, selectedParent)
      if (result.error) {
        setError(result.error)
      } else {
        setShowLinker(false)
        setSelectedParent('')
        router.refresh()
      }
    })
  }

  const handleUnlink = () => {
    setError(null)
    startTransition(async () => {
      const result = await linkProjectToParent(projectId, null)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  // Case 1: this project is a sub-project of another
  if (portfolio.parent) {
    return (
      <div className="bg-indigo-50/60 dark:bg-[var(--accent-soft)] border border-indigo-150/60 dark:border-indigo-900/30 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 text-xs">
          <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-[var(--accent-text)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-medium">Parte de:</span>
          <Link
            href={`/projects/${portfolio.parent.id}/overview`}
            className="font-bold text-[var(--accent-text)] dark:text-[var(--accent-text)] hover:underline"
          >
            {portfolio.parent.name}
          </Link>
        </div>
        <button
          onClick={handleUnlink}
          disabled={isPending}
          className="text-[10.5px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
        >
          {isPending ? 'Unlinking…' : 'Unlink'}
        </button>
        {error && <span className="text-[10.5px] text-red-600 dark:text-red-400 basis-full">{error}</span>}
      </div>
    )
  }

  // Case 2: this project is a parent — show the consolidated rollup
  if (portfolio.children.length > 0) {
    const totalBom = portfolio.children.reduce((s, c) => s + c.bomTotal, 0)
    const totalTasks = portfolio.children.reduce((s, c) => s + c.tasksTotal, 0)
    const totalTasksComplete = portfolio.children.reduce((s, c) => s + c.tasksComplete, 0)

    return (
      <div className="bg-white dark:bg-[var(--surface-1)] border border-slate-100 dark:border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-black text-[#0A1F44] dark:text-[var(--accent-text)] uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Portfolio Consolidado — {portfolio.children.length} sub-proyecto{portfolio.children.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] font-semibold mt-0.5">
              BOM y avance agregados de todos los proyectos vinculados a este como padre
            </p>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <span className="text-[9px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider block">BOM Total</span>
              <span className="text-lg font-black text-[#0A1F44] dark:text-white font-mono">{currency(totalBom)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider block">Tareas</span>
              <span className="text-lg font-black text-[#0A1F44] dark:text-white font-mono">
                {totalTasksComplete}/{totalTasks}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {portfolio.children.map(child => (
            <Link
              key={child.id}
              href={`/projects/${child.id}/overview`}
              className="p-4 bg-slate-50/60 dark:bg-[var(--surface-2)] border border-slate-100 dark:border-[var(--border)] rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-900/50 transition space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-xs text-slate-800 dark:text-white leading-snug">{child.name}</span>
                <svg className="w-3 h-3 text-[var(--text-secondary)] dark:text-slate-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <DisciplineBadges disciplines={child.disciplines} />
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                <div>
                  <span className="text-[8.5px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider block">BOM</span>
                  <span className="text-xs font-black text-slate-700 dark:text-[var(--text-primary)] font-mono">{currency(child.bomTotal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider block">Tareas</span>
                  <span className="text-xs font-black text-slate-700 dark:text-[var(--text-primary)] font-mono">
                    {child.tasksComplete}/{child.tasksTotal}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Case 3: standalone project, no parent and no children — offer to link it
  return (
    <div className="border border-dashed border-slate-200 dark:border-[var(--border)] rounded-2xl px-5 py-3.5">
      {!showLinker ? (
        <button
          onClick={() => setShowLinker(true)}
          className="text-[10.5px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:text-[var(--accent-text)] dark:hover:text-[var(--accent-text)] transition flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Vincular a un proyecto padre
        </button>
      ) : (
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedParent}
            onChange={e => setSelectedParent(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-lg text-xs text-slate-700 dark:text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">Elegir proyecto padre...</option>
            {portfolio.linkableParents.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={!selectedParent || isPending}
            className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-40 text-white text-xs font-bold rounded-lg transition"
          >
            {isPending ? 'Vinculando...' : 'Vincular'}
          </button>
          <button
            onClick={() => { setShowLinker(false); setError(null) }}
            className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]"
          >
            Cancel
          </button>
          {portfolio.linkableParents.length === 0 && (
            <span className="text-[10.5px] text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] basis-full">
              No other root projects are available in this organization yet.
            </span>
          )}
          {error && <span className="text-[10.5px] text-red-600 dark:text-red-400 basis-full">{error}</span>}
        </div>
      )}
    </div>
  )
}

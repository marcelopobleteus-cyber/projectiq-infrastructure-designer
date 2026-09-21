'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import type { GlobalFinancialData, GlobalCustomerGroup } from './actions'

const TERM_LABEL: Record<string, string> = {
  due_on_receipt: 'Due on receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export default function FinancialOverviewClient({ data }: { data: GlobalFinancialData }) {
  const { groups, totals } = data
  const [query, setQuery] = useState('')
  const [onlyOwing, setOnlyOwing] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .filter(g => !onlyOwing || g.receivable > 0)
      .map(g => {
        if (!q) return g
        const hit =
          g.customerName.toLowerCase().includes(q) ||
          g.projects.some(p =>
            p.projectName.toLowerCase().includes(q) ||
            (p.jobNumber ?? '').toLowerCase().includes(q) ||
            (p.contractNumber ?? '').toLowerCase().includes(q)
          )
        return hit ? g : null
      })
      .filter(Boolean) as GlobalCustomerGroup[]
  }, [groups, query, onlyOwing])

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: string[][] = [[
      'Customer', 'Project', 'Job Number', 'Contract Number', 'Payment Terms',
      'Contract Amount', 'Invoiced', 'Collected', 'Receivable', 'Left To Bill',
      'Overdue', 'Oldest Due Date', 'Days Late',
    ]]
    for (const g of filtered) {
      for (const p of g.projects) {
        rows.push([
          g.customerName, p.projectName, p.jobNumber ?? '', p.contractNumber ?? '',
          p.paymentTerms ? (TERM_LABEL[p.paymentTerms] ?? p.paymentTerms) : '',
          p.contractAmount.toFixed(2), p.invoiced.toFixed(2), p.paid.toFixed(2),
          p.receivable.toFixed(2), p.remainingToBill.toFixed(2),
          p.overdue.toFixed(2), p.oldestDueDate ?? '', p.daysLate ? String(p.daysLate) : '',
        ])
      }
    }
    const csv = rows.map(r => r.map(esc).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `contracts-receivables-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const card = 'bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl'
  const field = 'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]'
  const th = 'text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]'

  const metrics = [
    { label: 'Contracts', value: money(totals.contractAmount), tone: '' },
    { label: 'Invoiced', value: money(totals.invoiced), tone: '' },
    { label: 'Collected', value: money(totals.paid), tone: 'text-emerald-400' },
    { label: 'Receivable', value: money(totals.receivable), tone: totals.receivable > 0 ? 'text-amber-400' : '' },
    { label: 'Past due', value: money(totals.overdue), tone: totals.overdue > 0 ? 'text-red-400' : '' },
  ]

  return (
    <div className="w-full h-full px-6 py-4 flex-1 flex flex-col overflow-y-auto bg-[var(--bg)] font-sans space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Contracts &amp; Receivables</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 max-w-3xl">
            Every contract you hold, grouped by customer. Sorted by what is past due first, so the top of this
            list is what to chase today. Invoices are issued in your accounting system — this tracks them.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer"
        >
          Export CSV
        </button>
      </div>

      {data.error && (
        <div className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-red-500/10 border border-red-500/25 text-red-400">
          {data.error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map(m => (
          <div key={m.label} className={`${card} p-3 h-20 flex flex-col justify-between`}>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{m.label}</span>
            <span className={`text-lg font-black tracking-tight font-mono ${m.tone || 'text-[var(--text-primary)]'}`}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by customer, project, job or contract number…"
          className={`${field} max-w-md`}
        />
        <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={onlyOwing} onChange={e => setOnlyOwing(e.target.checked)} />
          Only with a balance owing
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} px-4 py-10 text-center text-xs text-[var(--text-tertiary)]`}>
          {groups.length === 0
            ? 'No contracts recorded yet. Open a project and add its contract under Financial.'
            : 'Nothing matches that filter.'}
        </div>
      ) : filtered.map(g => {
        const key = g.customerId ?? '__none__'
        const isCollapsed = collapsed[key]
        return (
          <div key={key} className={`${card} overflow-hidden`}>
            <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCollapsed({ ...collapsed, [key]: !isCollapsed })}
                  className="text-[var(--text-tertiary)] cursor-pointer"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div>
                  {g.customerId ? (
                    <Link href="/customers" className="text-sm font-black text-[var(--text-primary)] hover:text-[var(--accent-text)]">
                      {g.customerName}
                    </Link>
                  ) : (
                    <span className="text-sm font-black text-[var(--text-tertiary)]">{g.customerName}</span>
                  )}
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {g.projects.length} project{g.projects.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[11px] font-mono tabular-nums">
                <span className="text-[var(--text-tertiary)]">Invoiced <span className="font-bold text-[var(--text-primary)]">{money(g.invoiced)}</span></span>
                <span className="text-[var(--text-tertiary)]">Collected <span className="font-bold text-emerald-400">{money(g.paid)}</span></span>
                <span className="text-[var(--text-tertiary)]">Receivable <span className={`font-bold ${g.receivable > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>{money(g.receivable)}</span></span>
                {g.overdue > 0 && (
                  <span className="px-2 py-0.5 rounded-md border border-red-500/25 bg-red-500/10 text-red-400 font-bold">
                    {money(g.overdue)} · {g.daysLate}d late
                  </span>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-[var(--text-secondary)]">
                  <thead className="border-b border-[var(--border)]">
                    <tr>
                      <th className={th}>Project</th>
                      <th className={th}>Contract</th>
                      <th className={th}>Terms</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={`${th} text-right`}>Invoiced</th>
                      <th className={`${th} text-right`}>Collected</th>
                      <th className={`${th} text-right`}>Receivable</th>
                      <th className={th}>Oldest due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-medium">
                    {g.projects.map(p => (
                      <tr key={p.projectId} className="hover:bg-[var(--surface-hover)]">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.projectId}/financial`} className="font-bold text-sm text-[var(--text-primary)] hover:text-[var(--accent-text)]">
                            {p.projectName}
                          </Link>
                          {p.jobNumber && <div className="text-[11px] text-[var(--text-tertiary)] font-mono">{p.jobNumber}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono">{p.contractNumber || '—'}</td>
                        <td className="px-4 py-3">{p.paymentTerms ? (TERM_LABEL[p.paymentTerms] ?? p.paymentTerms) : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{money(p.contractAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{money(p.invoiced)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-400">{money(p.paid)}</td>
                        <td className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${p.receivable > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                          {money(p.receivable)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {fmtDate(p.oldestDueDate)}
                          {p.daysLate > 0 && <span className="ml-2 text-red-400 font-bold">{p.daysLate}d</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

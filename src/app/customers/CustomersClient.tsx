'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveCustomer, deleteCustomer, type CustomerItem, type CustomerInput } from './actions'

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const EMPTY: CustomerInput = {
  name: '', contactName: '', contactEmail: '', contactPhone: '', address: '', notes: '', status: 'active',
}

export default function CustomersClient({
  initialCustomers,
  canWrite,
}: {
  initialCustomers: CustomerItem[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ id: string | null; form: CustomerInput } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerItem | null>(null)

  const customers = initialCustomers
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contactName ?? '').toLowerCase().includes(q) ||
      (c.contactEmail ?? '').toLowerCase().includes(q)
    )
  }, [customers, query])

  const totals = useMemo(() => ({
    active: customers.filter(c => c.status === 'active').length,
    withProjects: customers.filter(c => c.projectCount > 0).length,
    receivable: Math.round(customers.reduce((s, c) => s + c.receivable, 0) * 100) / 100,
  }), [customers])

  const save = async () => {
    if (!editing) return
    setBusy(true)
    const res = await saveCustomer(editing.id, editing.form)
    setBusy(false)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setNotice({ text: editing.id ? 'Customer updated.' : 'Customer created.', kind: 'ok' })
    setEditing(null)
    router.refresh()
  }

  const remove = async () => {
    if (!confirmDelete) return
    setBusy(true)
    const res = await deleteCustomer(confirmDelete.id)
    setBusy(false)
    setConfirmDelete(null)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setNotice({ text: 'Customer removed.', kind: 'ok' })
    router.refresh()
  }

  const card = 'bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl'
  const field = 'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]'
  const label = 'block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1'
  const th = 'text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]'

  return (
    <div className="w-full h-full px-6 py-4 flex-1 flex flex-col overflow-y-auto bg-[var(--bg)] font-sans space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Customers</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 max-w-3xl">
            The companies you build for. A customer lives here once and every job points at it, so you can pull up
            all the work for one client and fix their contact details in a single place.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setEditing({ id: null, form: { ...EMPTY } })}
            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--accent)] text-white cursor-pointer"
          >
            + New customer
          </button>
        )}
      </div>

      {notice && (
        <div
          onClick={() => setNotice(null)}
          className={`px-4 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer ${
            notice.kind === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/25 text-red-400'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Customers', value: String(customers.length), tone: '' },
          { label: 'Active', value: String(totals.active), tone: '' },
          { label: 'With projects', value: String(totals.withProjects), tone: '' },
          { label: 'Receivable', value: money(totals.receivable), tone: totals.receivable > 0 ? 'text-amber-400' : '' },
        ].map(m => (
          <div key={m.label} className={`${card} p-3 h-20 flex flex-col justify-between`}>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{m.label}</span>
            <span className={`text-lg font-black tracking-tight font-mono ${m.tone || 'text-[var(--text-primary)]'}`}>{m.value}</span>
          </div>
        ))}
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by company, contact or email…"
        className={`${field} max-w-md`}
      />

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[var(--text-secondary)]">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Contact</th>
                <th className={th}>Phone</th>
                <th className={`${th} text-right`}>Projects</th>
                <th className={`${th} text-right`}>Receivable</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    {customers.length === 0 ? 'No customers yet.' : 'Nothing matches that search.'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm text-[var(--text-primary)]">{c.name}</div>
                      {c.address && <div className="text-[11px] text-[var(--text-tertiary)]">{c.address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.contactName && <div>{c.contactName}</div>}
                      {c.contactEmail && (
                        <div className="font-mono text-[11px] text-[var(--text-tertiary)]">{c.contactEmail}</div>
                      )}
                      {!c.contactName && !c.contactEmail && <span className="text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">{c.contactPhone || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                      {c.projectCount > 0 ? (
                        <Link href={`/projects?customer=${c.id}`} className="hover:text-[var(--accent-text)]">
                          {c.projectCount}
                        </Link>
                      ) : '0'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {c.invoiced > 0 ? (
                        <>
                          <div className={`font-bold ${c.receivable > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                            {money(c.receivable)}
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">
                            {money(c.paid)} of {money(c.invoiced)}
                          </div>
                        </>
                      ) : <span className="text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        c.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border-[var(--border)]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing({
                              id: c.id,
                              form: {
                                name: c.name,
                                contactName: c.contactName ?? '',
                                contactEmail: c.contactEmail ?? '',
                                contactPhone: c.contactPhone ?? '',
                                address: c.address ?? '',
                                notes: c.notes ?? '',
                                status: c.status,
                              },
                            })}
                            className="text-[11px] font-bold text-[var(--accent-text)] hover:underline cursor-pointer mr-3"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(c)}
                            className="text-[11px] font-bold text-[var(--danger)] hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                {editing.id ? 'Edit customer' : 'New customer'}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className={label}>Company name</label>
                <input
                  className={field}
                  value={editing.form.name}
                  onChange={e => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })}
                  placeholder="Mastec AL"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Contact name</label>
                  <input
                    className={field}
                    value={editing.form.contactName}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, contactName: e.target.value } })}
                  />
                </div>
                <div>
                  <label className={label}>Phone</label>
                  <input
                    className={field}
                    value={editing.form.contactPhone}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, contactPhone: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Email</label>
                <input
                  className={field}
                  value={editing.form.contactEmail}
                  onChange={e => setEditing({ ...editing, form: { ...editing.form, contactEmail: e.target.value } })}
                />
              </div>
              <div>
                <label className={label}>Address</label>
                <input
                  className={field}
                  value={editing.form.address}
                  onChange={e => setEditing({ ...editing, form: { ...editing.form, address: e.target.value } })}
                />
              </div>
              <div>
                <label className={label}>Status</label>
                <select
                  className={field}
                  value={editing.form.status}
                  onChange={e => setEditing({ ...editing, form: { ...editing.form, status: e.target.value as 'active' | 'inactive' } })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={label}>Notes</label>
                <textarea
                  className={field}
                  rows={2}
                  value={editing.form.notes}
                  onChange={e => setEditing({ ...editing, form: { ...editing.form, notes: e.target.value } })}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] text-white cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-md p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-black text-[var(--text-primary)]">Remove {confirmDelete.name}?</h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
              {confirmDelete.projectCount > 0
                ? `${confirmDelete.projectCount} project${confirmDelete.projectCount > 1 ? 's' : ''} point at this customer. They are kept — they just end up with no customer assigned. If you only want it out of the way, set it to Inactive instead.`
                : 'No projects point at this customer.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 cursor-pointer disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

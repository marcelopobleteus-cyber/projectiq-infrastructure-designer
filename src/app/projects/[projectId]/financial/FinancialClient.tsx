'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveContract, saveInvoice, deleteInvoice, addPayment, deletePayment,
  type FinancialData, type InvoiceRow, type InvoiceStatus, type PaymentMethod, type PaymentTerms,
} from './actions'

const TERM_LABEL: Record<PaymentTerms, string> = {
  due_on_receipt: 'Due on receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', partial: 'Partial', paid: 'Paid', void: 'Void',
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border-[var(--border)]',
  sent: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  partial: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  void: 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border-[var(--border)] line-through',
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  check: 'Check', ach: 'ACH', wire: 'Wire', card: 'Card', cash: 'Cash', other: 'Other',
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

const today = () => new Date().toISOString().slice(0, 10)

type InvoiceForm = {
  invoiceNumber: string; issueDate: string; dueDate: string
  amount: string; description: string; status: InvoiceStatus
}

const EMPTY_INVOICE = (): InvoiceForm => ({
  invoiceNumber: '', issueDate: today(), dueDate: '', amount: '', description: '', status: 'sent',
})

export default function FinancialClient({
  projectId, projectName, jobNumber, customerName, data,
}: {
  projectId: string
  projectName: string
  jobNumber: string | null
  customerName: string | null
  data: FinancialData
}) {
  const router = useRouter()
  const { canWrite, contract, invoices, totals } = data

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [contractForm, setContractForm] = useState<null | {
    contractNumber: string; amount: string; paymentTerms: PaymentTerms; signedDate: string; notes: string
  }>(null)
  const [invoiceForm, setInvoiceForm] = useState<null | { id: string | null; form: InvoiceForm }>(null)
  const [payFor, setPayFor] = useState<null | InvoiceRow>(null)
  const [payForm, setPayForm] = useState({ amount: '', receivedAt: today(), method: 'check' as PaymentMethod, reference: '', notes: '' })
  const [confirmInvoice, setConfirmInvoice] = useState<InvoiceRow | null>(null)

  const card = 'bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl'
  const field = 'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]'
  const label = 'block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1'
  const th = 'text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]'
  const btn = 'px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer'

  const openContract = () => setContractForm({
    contractNumber: contract?.contractNumber ?? '',
    amount: contract ? String(contract.amount) : '',
    paymentTerms: contract?.paymentTerms ?? 'net_30',
    signedDate: contract?.signedDate ?? '',
    notes: contract?.notes ?? '',
  })

  const submitContract = async () => {
    if (!contractForm) return
    setBusy(true)
    const res = await saveContract(projectId, {
      contractNumber: contractForm.contractNumber,
      amount: Number(contractForm.amount || 0),
      paymentTerms: contractForm.paymentTerms,
      signedDate: contractForm.signedDate,
      notes: contractForm.notes,
    })
    setBusy(false)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setContractForm(null)
    setNotice({ text: 'Contract saved.', kind: 'ok' })
    router.refresh()
  }

  const submitInvoice = async () => {
    if (!invoiceForm) return
    setBusy(true)
    const res = await saveInvoice(invoiceForm.id, projectId, {
      invoiceNumber: invoiceForm.form.invoiceNumber,
      issueDate: invoiceForm.form.issueDate,
      dueDate: invoiceForm.form.dueDate,
      amount: Number(invoiceForm.form.amount || 0),
      description: invoiceForm.form.description,
      status: invoiceForm.form.status,
    })
    setBusy(false)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setInvoiceForm(null)
    setNotice({ text: invoiceForm.id ? 'Invoice updated.' : 'Invoice added.', kind: 'ok' })
    router.refresh()
  }

  const submitPayment = async () => {
    if (!payFor) return
    setBusy(true)
    const res = await addPayment(payFor.id, projectId, {
      amount: Number(payForm.amount || 0),
      receivedAt: payForm.receivedAt,
      method: payForm.method,
      reference: payForm.reference,
      notes: payForm.notes,
    })
    setBusy(false)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setPayFor(null)
    setPayForm({ amount: '', receivedAt: today(), method: 'check', reference: '', notes: '' })
    setNotice({ text: 'Payment recorded.', kind: 'ok' })
    router.refresh()
  }

  const removeInvoice = async () => {
    if (!confirmInvoice) return
    setBusy(true)
    const res = await deleteInvoice(confirmInvoice.id, projectId)
    setBusy(false)
    setConfirmInvoice(null)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    setNotice({ text: 'Invoice removed.', kind: 'ok' })
    router.refresh()
  }

  const removePayment = async (paymentId: string) => {
    setBusy(true)
    const res = await deletePayment(paymentId, projectId)
    setBusy(false)
    if (res.error) { setNotice({ text: res.error, kind: 'error' }); return }
    router.refresh()
  }

  /** CSV plano de facturas y pagos. Se abre en Excel y sirve para cualquier contable. */
  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: string[][] = [[
      'Project', 'Job Number', 'Customer', 'Record', 'Invoice Number', 'Issue Date', 'Due Date',
      'Amount', 'Status', 'Payment Date', 'Method', 'Reference', 'Description',
    ]]
    for (const i of invoices) {
      rows.push([
        projectName, jobNumber ?? '', customerName ?? '', 'Invoice', i.invoiceNumber ?? '',
        i.issueDate, i.dueDate ?? '', i.amount.toFixed(2), STATUS_LABEL[i.status], '', '', '', i.description ?? '',
      ])
      for (const p of i.payments) {
        rows.push([
          projectName, jobNumber ?? '', customerName ?? '', 'Payment', i.invoiceNumber ?? '',
          '', '', p.amount.toFixed(2), '', p.receivedAt, METHOD_LABEL[p.method], p.reference ?? '', p.notes ?? '',
        ])
      }
    }
    const csv = rows.map(r => r.map(esc).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-${(jobNumber || projectName).replace(/[^A-Za-z0-9_-]+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const metrics = useMemo(() => ([
    { label: 'Contract', value: money(totals.contractAmount), tone: '' },
    { label: 'Invoiced', value: money(totals.invoiced), tone: '' },
    { label: 'Collected', value: money(totals.paid), tone: 'text-emerald-400' },
    { label: 'Receivable', value: money(totals.receivable), tone: totals.receivable > 0 ? 'text-amber-400' : '' },
    { label: 'Left to bill', value: money(totals.remainingToBill), tone: totals.remainingToBill < 0 ? 'text-red-400' : '' },
  ]), [totals])

  return (
    <div className="w-full h-full px-6 py-4 flex-1 flex flex-col overflow-y-auto bg-[var(--bg)] font-sans space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Financial</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 max-w-3xl">
            What was agreed, what was billed and what came in. Invoices are issued in your accounting system —
            this tracks them so nothing sits unpaid without you noticing.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className={`${btn} bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]`}>
            Export CSV
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => setInvoiceForm({ id: null, form: EMPTY_INVOICE() })}
              className={`${btn} bg-[var(--accent)] text-white`}
            >
              + New invoice
            </button>
          )}
        </div>
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

      {totals.overdue > 0 && (
        <div className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-red-500/10 border border-red-500/25 text-red-400">
          {money(totals.overdue)} past due across {invoices.filter(i => i.daysLate > 0).length} invoice(s).
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

      {/* Contrato */}
      <div className={`${card} p-4`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[var(--text-tertiary)]">Contract</h2>
            {contract ? (
              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-xs text-[var(--text-secondary)]">
                <div><span className="text-[var(--text-tertiary)]">No. </span><span className="font-bold text-[var(--text-primary)]">{contract.contractNumber || '—'}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Amount </span><span className="font-bold font-mono text-[var(--text-primary)]">{money(contract.amount)}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Terms </span><span className="font-bold text-[var(--text-primary)]">{TERM_LABEL[contract.paymentTerms]}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Signed </span><span className="font-bold text-[var(--text-primary)]">{fmtDate(contract.signedDate)}</span></div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                No contract recorded. The amount and payment terms set here drive every invoice due date.
              </p>
            )}
            {contract?.notes && <p className="mt-2 text-[11px] text-[var(--text-tertiary)] max-w-2xl">{contract.notes}</p>}
          </div>
          {canWrite && (
            <button type="button" onClick={openContract} className={`${btn} bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]`}>
              {contract ? 'Edit contract' : 'Add contract'}
            </button>
          )}
        </div>
      </div>

      {/* Facturas */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[var(--text-secondary)]">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
              <tr>
                <th className={th}>Invoice</th>
                <th className={th}>Issued</th>
                <th className={th}>Due</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Paid</th>
                <th className={`${th} text-right`}>Balance</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    No invoices recorded for this project yet.
                  </td>
                </tr>
              ) : invoices.map(i => (
                <React.Fragment key={i.id}>
                  <tr className="hover:bg-[var(--surface-hover)]">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === i.id ? null : i.id)}
                        className="font-bold text-sm text-[var(--text-primary)] cursor-pointer text-left"
                      >
                        {i.invoiceNumber || 'Untitled'}
                      </button>
                      {i.description && <div className="text-[11px] text-[var(--text-tertiary)]">{i.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono">{fmtDate(i.issueDate)}</td>
                    <td className="px-4 py-3 font-mono">
                      {fmtDate(i.dueDate)}
                      {i.daysLate > 0 && <span className="ml-2 text-red-400 font-bold">{i.daysLate}d late</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{money(i.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-400">{money(i.paid)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">{money(i.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${STATUS_STYLE[i.status]}`}>
                        {STATUS_LABEL[i.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canWrite && (
                        <>
                          <button type="button" onClick={() => { setPayFor(i); setPayForm({ amount: String(i.balance > 0 ? i.balance : ''), receivedAt: today(), method: 'check', reference: '', notes: '' }) }} className="text-[11px] font-bold text-[var(--accent-text)] cursor-pointer">Payment</button>
                          <button type="button" onClick={() => setInvoiceForm({ id: i.id, form: { invoiceNumber: i.invoiceNumber ?? '', issueDate: i.issueDate, dueDate: i.dueDate ?? '', amount: String(i.amount), description: i.description ?? '', status: i.status } })} className="ml-3 text-[11px] font-bold text-[var(--text-secondary)] cursor-pointer">Edit</button>
                          <button type="button" onClick={() => setConfirmInvoice(i)} className="ml-3 text-[11px] font-bold text-red-400 cursor-pointer">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expanded === i.id && (
                    <tr className="bg-[var(--surface-2)]/40">
                      <td colSpan={8} className="px-4 py-3">
                        {i.payments.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-tertiary)]">No payments recorded against this invoice.</p>
                        ) : (
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-[var(--text-tertiary)]">
                                <th className="text-left py-1 font-bold uppercase tracking-wider text-[9.5px]">Received</th>
                                <th className="text-left py-1 font-bold uppercase tracking-wider text-[9.5px]">Method</th>
                                <th className="text-left py-1 font-bold uppercase tracking-wider text-[9.5px]">Reference</th>
                                <th className="text-right py-1 font-bold uppercase tracking-wider text-[9.5px]">Amount</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {i.payments.map(p => (
                                <tr key={p.id}>
                                  <td className="py-1 font-mono">{fmtDate(p.receivedAt)}</td>
                                  <td className="py-1">{METHOD_LABEL[p.method]}</td>
                                  <td className="py-1">{p.reference || '—'}</td>
                                  <td className="py-1 text-right font-mono tabular-nums">{money(p.amount)}</td>
                                  <td className="py-1 text-right">
                                    {canWrite && (
                                      <button type="button" onClick={() => removePayment(p.id)} className="text-red-400 font-bold cursor-pointer">Remove</button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal contrato */}
      {contractForm && (
        <Modal title={contract ? 'Edit contract' : 'Add contract'} onClose={() => setContractForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Contract number</label><input className={field} value={contractForm.contractNumber} onChange={e => setContractForm({ ...contractForm, contractNumber: e.target.value })} /></div>
            <div><label className={label}>Amount (USD)</label><input className={field} type="number" step="0.01" value={contractForm.amount} onChange={e => setContractForm({ ...contractForm, amount: e.target.value })} /></div>
            <div>
              <label className={label}>Payment terms</label>
              <select className={field} value={contractForm.paymentTerms} onChange={e => setContractForm({ ...contractForm, paymentTerms: e.target.value as PaymentTerms })}>
                {(Object.keys(TERM_LABEL) as PaymentTerms[]).map(t => <option key={t} value={t}>{TERM_LABEL[t]}</option>)}
              </select>
            </div>
            <div><label className={label}>Signed date</label><input className={field} type="date" value={contractForm.signedDate} onChange={e => setContractForm({ ...contractForm, signedDate: e.target.value })} /></div>
            <div className="col-span-2"><label className={label}>Notes</label><textarea rows={3} className={field} value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
          </div>
          <ModalActions busy={busy} onCancel={() => setContractForm(null)} onSave={submitContract} />
        </Modal>
      )}

      {/* Modal factura */}
      {invoiceForm && (
        <Modal title={invoiceForm.id ? 'Edit invoice' : 'New invoice'} onClose={() => setInvoiceForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Invoice number</label><input className={field} value={invoiceForm.form.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, invoiceNumber: e.target.value } })} /></div>
            <div><label className={label}>Amount (USD)</label><input className={field} type="number" step="0.01" value={invoiceForm.form.amount} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, amount: e.target.value } })} /></div>
            <div><label className={label}>Issue date</label><input className={field} type="date" value={invoiceForm.form.issueDate} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, issueDate: e.target.value } })} /></div>
            <div>
              <label className={label}>Due date</label>
              <input className={field} type="date" value={invoiceForm.form.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, dueDate: e.target.value } })} />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Leave blank to derive it from the contract terms.</p>
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={field} value={invoiceForm.form.status} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, status: e.target.value as InvoiceStatus } })}>
                {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className={label}>Description</label><input className={field} value={invoiceForm.form.description} onChange={e => setInvoiceForm({ ...invoiceForm, form: { ...invoiceForm.form, description: e.target.value } })} /></div>
          </div>
          <ModalActions busy={busy} onCancel={() => setInvoiceForm(null)} onSave={submitInvoice} />
        </Modal>
      )}

      {/* Modal pago */}
      {payFor && (
        <Modal title={`Record payment — ${payFor.invoiceNumber || 'invoice'}`} onClose={() => setPayFor(null)}>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
            Outstanding balance {money(payFor.balance)}. Partial payments are fine — the status follows the total received.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Amount (USD)</label><input className={field} type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div><label className={label}>Received</label><input className={field} type="date" value={payForm.receivedAt} onChange={e => setPayForm({ ...payForm, receivedAt: e.target.value })} /></div>
            <div>
              <label className={label}>Method</label>
              <select className={field} value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value as PaymentMethod })}>
                {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>
            <div><label className={label}>Reference</label><input className={field} placeholder="Check or wire number" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} /></div>
            <div className="col-span-2"><label className={label}>Notes</label><input className={field} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} /></div>
          </div>
          <ModalActions busy={busy} onCancel={() => setPayFor(null)} onSave={submitPayment} saveLabel="Record payment" />
        </Modal>
      )}

      {/* Confirmar borrado */}
      {confirmInvoice && (
        <Modal title="Delete invoice" onClose={() => setConfirmInvoice(null)}>
          <p className="text-xs text-[var(--text-secondary)]">
            This removes {confirmInvoice.invoiceNumber || 'the invoice'} for {money(confirmInvoice.amount)}
            {confirmInvoice.payments.length > 0 && ` and its ${confirmInvoice.payments.length} recorded payment(s)`}. This cannot be undone.
          </p>
          <ModalActions busy={busy} onCancel={() => setConfirmInvoice(null)} onSave={removeInvoice} saveLabel="Delete" danger />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-black text-[var(--text-primary)] mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({
  busy, onCancel, onSave, saveLabel = 'Save', danger = false,
}: { busy: boolean; onCancel: () => void; onSave: () => void; saveLabel?: string; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button type="button" onClick={onCancel} disabled={busy} className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer disabled:opacity-50">
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={busy} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg text-white cursor-pointer disabled:opacity-50 ${danger ? 'bg-red-600' : 'bg-[var(--accent)]'}`}>
        {busy ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

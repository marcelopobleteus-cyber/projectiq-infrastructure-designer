'use server'

/**
 * Capa financiera simple de un proyecto: contrato -> facturas -> pagos.
 *
 * Deliberadamente NO hay AIA/G702, SOV, retencion ni ordenes de cambio. Lo unico
 * que persigue este modulo es responder tres preguntas: cuanto se acordo, cuanto
 * se facturo y cuanto se pago. La factura legal se emite donde el usuario lleva
 * su contabilidad; aqui solo se registra que existe, por cuanto y cuando vence.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'net_60'
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void'
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'card' | 'cash' | 'other'

const TERM_DAYS: Record<PaymentTerms, number> = {
  due_on_receipt: 0,
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
}

export interface ContractRow {
  id: string
  contractNumber: string | null
  amount: number
  paymentTerms: PaymentTerms
  signedDate: string | null
  notes: string | null
}

export interface PaymentRow {
  id: string
  amount: number
  receivedAt: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
}

export interface InvoiceRow {
  id: string
  invoiceNumber: string | null
  issueDate: string
  dueDate: string | null
  amount: number
  description: string | null
  status: InvoiceStatus
  paid: number
  balance: number
  daysLate: number
  payments: PaymentRow[]
}

export interface FinancialData {
  canWrite: boolean
  contract: ContractRow | null
  invoices: InvoiceRow[]
  totals: {
    contractAmount: number
    invoiced: number
    paid: number
    receivable: number
    remainingToBill: number
    overdue: number
  }
  error?: string
}

async function callerContext(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, orgId: null as string | null, canWrite: false }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { supabase, orgId: null as string | null, canWrite: false }

  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('profile_id', user.id)
    .single()

  if (!member) return { supabase, orgId: null as string | null, canWrite: false }

  const role = member.role as string
  return {
    supabase,
    orgId: project.organization_id as string,
    canWrite: role === 'owner' || role === 'admin' || role === 'editor',
  }
}

/** Vencimiento derivado de los terminos. Un solo lugar que lo calcula. */
export async function dueDateFor(issueDate: string, terms: PaymentTerms): Promise<string> {
  const d = new Date(`${issueDate}T00:00:00`)
  d.setDate(d.getDate() + TERM_DAYS[terms])
  return d.toISOString().slice(0, 10)
}

function daysBetween(dueDate: string | null): number {
  if (!dueDate) return 0
  const due = new Date(`${dueDate}T00:00:00`).getTime()
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  const diff = Math.floor((today - due) / 86400000)
  return diff > 0 ? diff : 0
}

const money = (v: unknown) => Math.round(Number(v || 0) * 100) / 100

export async function getProjectFinancials(projectId: string): Promise<FinancialData> {
  const empty: FinancialData['totals'] = {
    contractAmount: 0, invoiced: 0, paid: 0, receivable: 0, remainingToBill: 0, overdue: 0,
  }

  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) {
    return { canWrite: false, contract: null, invoices: [], totals: empty, error: 'No access to this project.' }
  }

  const [{ data: contractRow }, { data: invoiceRows, error: invErr }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, contract_number, amount, payment_terms, signed_date, notes')
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, amount, description, status')
      .eq('project_id', projectId)
      .order('issue_date', { ascending: false }),
  ])

  if (invErr) {
    return { canWrite, contract: null, invoices: [], totals: empty, error: invErr.message }
  }

  const invoiceIds = (invoiceRows ?? []).map(r => r.id)
  type RawPayment = {
    id: string; invoice_id: string; amount: number | string; received_at: string
    method: string; reference: string | null; notes: string | null
  }
  let paymentRows: RawPayment[] = []
  if (invoiceIds.length) {
    const { data } = await supabase
      .from('payments')
      .select('id, invoice_id, amount, received_at, method, reference, notes')
      .in('invoice_id', invoiceIds)
      .order('received_at', { ascending: false })
    paymentRows = data ?? []
  }

  const byInvoice = new Map<string, PaymentRow[]>()
  for (const p of paymentRows) {
    const list = byInvoice.get(p.invoice_id) ?? []
    list.push({
      id: p.id,
      amount: money(p.amount),
      receivedAt: p.received_at,
      method: p.method as PaymentMethod,
      reference: p.reference,
      notes: p.notes,
    })
    byInvoice.set(p.invoice_id, list)
  }

  const invoices: InvoiceRow[] = (invoiceRows ?? []).map(r => {
    const payments = byInvoice.get(r.id) ?? []
    // Se redondea cada pago antes de sumar, no la suma: asi el total cuadra con
    // lo que da sumar los montos a mano.
    const paid = money(payments.reduce((s, p) => s + p.amount, 0))
    const amount = money(r.amount)
    const balance = money(amount - paid)
    const open = r.status !== 'void' && r.status !== 'draft' && balance > 0
    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      issueDate: r.issue_date,
      dueDate: r.due_date,
      amount,
      description: r.description,
      status: r.status as InvoiceStatus,
      paid,
      balance,
      daysLate: open ? daysBetween(r.due_date) : 0,
      payments,
    }
  })

  const live = invoices.filter(i => i.status !== 'void')
  const invoiced = money(live.reduce((s, i) => s + i.amount, 0))
  const paid = money(live.reduce((s, i) => s + i.paid, 0))
  const contractAmount = money(contractRow?.amount)

  return {
    canWrite,
    contract: contractRow
      ? {
          id: contractRow.id,
          contractNumber: contractRow.contract_number,
          amount: contractAmount,
          paymentTerms: contractRow.payment_terms as PaymentTerms,
          signedDate: contractRow.signed_date,
          notes: contractRow.notes,
        }
      : null,
    invoices,
    totals: {
      contractAmount,
      invoiced,
      paid,
      receivable: money(invoiced - paid),
      remainingToBill: money(contractAmount - invoiced),
      overdue: money(live.filter(i => i.daysLate > 0).reduce((s, i) => s + i.balance, 0)),
    },
  }
}

export async function saveContract(
  projectId: string,
  input: { contractNumber: string; amount: number; paymentTerms: PaymentTerms; signedDate: string; notes: string },
): Promise<{ error?: string }> {
  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) return { error: 'No access to this project.' }
  if (!canWrite) return { error: 'Your role cannot edit financial records.' }
  if (!Number.isFinite(input.amount) || input.amount < 0) return { error: 'The contract amount is not valid.' }

  const payload = {
    organization_id: orgId,
    project_id: projectId,
    contract_number: input.contractNumber.trim() || null,
    amount: input.amount,
    payment_terms: input.paymentTerms,
    signed_date: input.signedDate || null,
    notes: input.notes.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('contracts')
    .upsert(payload, { onConflict: 'project_id' })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/financial`)
  return {}
}

export async function saveInvoice(
  invoiceId: string | null,
  projectId: string,
  input: {
    invoiceNumber: string
    issueDate: string
    dueDate: string
    amount: number
    description: string
    status: InvoiceStatus
  },
): Promise<{ error?: string }> {
  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) return { error: 'No access to this project.' }
  if (!canWrite) return { error: 'Your role cannot edit financial records.' }
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: 'Enter an invoice amount greater than zero.' }
  if (!input.issueDate) return { error: 'The issue date is required.' }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, payment_terms')
    .eq('project_id', projectId)
    .maybeSingle()

  // Si no se escribio vencimiento, se deriva de los terminos del contrato.
  const due = input.dueDate
    || (contract ? await dueDateFor(input.issueDate, contract.payment_terms as PaymentTerms) : null)

  const payload = {
    organization_id: orgId,
    project_id: projectId,
    contract_id: contract?.id ?? null,
    invoice_number: input.invoiceNumber.trim() || null,
    issue_date: input.issueDate,
    due_date: due,
    amount: input.amount,
    description: input.description.trim() || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  }

  const { error } = invoiceId
    ? await supabase.from('invoices').update(payload).eq('id', invoiceId)
    : await supabase.from('invoices').insert(payload)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/financial`)
  return {}
}

export async function deleteInvoice(invoiceId: string, projectId: string): Promise<{ error?: string }> {
  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) return { error: 'No access to this project.' }
  if (!canWrite) return { error: 'Your role cannot edit financial records.' }

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/financial`)
  return {}
}

export async function addPayment(
  invoiceId: string,
  projectId: string,
  input: { amount: number; receivedAt: string; method: PaymentMethod; reference: string; notes: string },
): Promise<{ error?: string }> {
  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) return { error: 'No access to this project.' }
  if (!canWrite) return { error: 'Your role cannot edit financial records.' }
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: 'Enter a payment amount greater than zero.' }

  const { error } = await supabase.from('payments').insert({
    organization_id: orgId,
    invoice_id: invoiceId,
    amount: input.amount,
    received_at: input.receivedAt,
    method: input.method,
    reference: input.reference.trim() || null,
    notes: input.notes.trim() || null,
  })
  if (error) return { error: error.message }

  // El estado de la factura se deduce de los pagos, no se escribe a mano: evita
  // que quede marcada "paid" con saldo pendiente.
  const { data: inv } = await supabase.from('invoices').select('amount, status').eq('id', invoiceId).single()
  const { data: pays } = await supabase.from('payments').select('amount').eq('invoice_id', invoiceId)
  if (inv && inv.status !== 'void') {
    const total = money((pays ?? []).reduce((s, p) => s + money(p.amount), 0))
    const next = total >= money(inv.amount) ? 'paid' : total > 0 ? 'partial' : inv.status
    await supabase.from('invoices').update({ status: next }).eq('id', invoiceId)
  }

  revalidatePath(`/projects/${projectId}/financial`)
  return {}
}

export async function deletePayment(paymentId: string, projectId: string): Promise<{ error?: string }> {
  const { supabase, orgId, canWrite } = await callerContext(projectId)
  if (!orgId) return { error: 'No access to this project.' }
  if (!canWrite) return { error: 'Your role cannot edit financial records.' }

  const { data: pay } = await supabase.from('payments').select('invoice_id').eq('id', paymentId).single()
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }

  if (pay) {
    const { data: inv } = await supabase.from('invoices').select('amount, status').eq('id', pay.invoice_id).single()
    const { data: pays } = await supabase.from('payments').select('amount').eq('invoice_id', pay.invoice_id)
    if (inv && inv.status !== 'void') {
      const total = money((pays ?? []).reduce((s, p) => s + money(p.amount), 0))
      const next = total >= money(inv.amount) ? 'paid' : total > 0 ? 'partial' : 'sent'
      await supabase.from('invoices').update({ status: next }).eq('id', pay.invoice_id)
    }
  }

  revalidatePath(`/projects/${projectId}/financial`)
  return {}
}

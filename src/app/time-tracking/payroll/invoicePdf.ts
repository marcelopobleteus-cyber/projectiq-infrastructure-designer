'use server'

/**
 * Factura de labor en PDF.
 *
 * Toma las horas del periodo (las mismas que alimentan la pantalla de nomina) y
 * arma una linea por semana. El dibujo vive en src/lib/laborInvoicePdf.ts.
 *
 * Los montos se calculan UNA vez aqui y se le pasan ya listos al dibujante, para
 * que no existan dos formas de llegar al total.
 */

import { createClient } from '@/utils/supabase/server'
import { buildLaborInvoicePdf, type InvoiceLine, type InvoiceParty } from '@/lib/laborInvoicePdf'

export interface InvoiceOptions {
  customerId: string | null
  invoiceNumber: string
  invoiceDate: string
  paymentTerms: string
  projectOrPo: string
  /** Descripcion del reembolso; vacia = sin linea de reembolso. */
  reimbursementLabel: string
  reimbursementAmount: number
  otherOrTax: number
  notes: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

function fmt(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
}

function weekEnd(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 6)
  return dt.toISOString().slice(0, 10)
}

/** Sugiere NQ-<año><mes><dia>-01 a partir de la fecha de factura. */
export async function suggestInvoiceNumber(invoiceDate: string): Promise<string> {
  const compact = invoiceDate.replace(/-/g, '').slice(0, 8)
  return `NQ-${compact.slice(0, 4)}-${compact.slice(4, 8)}-01`
}

export async function generateLaborInvoicePdf(
  from: string,
  to: string,
  options: InvoiceOptions,
): Promise<{ base64?: string; fileName?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .limit(1)

  const membership = memberRows?.[0]
  if (!membership) return { error: 'No organization for the current user.' }
  // Una factura expone tarifas y costo de labor, asi que se limita igual que la nomina.
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only owners and admins can issue an invoice.' }
  }

  const orgId = membership.organization_id

  const [{ data: org }, weeksRes, customerRes] = await Promise.all([
    supabase.from('organizations').select('name, address, contact_phone, contact_email').eq('id', orgId).single(),
    supabase.rpc('payroll_summary', { p_organization_id: orgId, p_from: from, p_to: to }),
    options.customerId
      ? supabase.from('customers')
          .select('name, address, contact_name, contact_phone, contact_email')
          .eq('id', options.customerId).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ])

  const weeks = weeksRes.data ?? []
  if (weeks.length === 0) {
    return { error: `No hours recorded between ${fmt(from)} and ${fmt(to)}.` }
  }

  // Una linea por semana, sumando a toda la cuadrilla. La tarifa se muestra solo
  // cuando es la misma para todos; con tarifas distintas un unico numero mentiria.
  const byWeek = new Map<string, { hours: number; labor: number; rates: Set<number> }>()
  for (const w of weeks) {
    const key = String(w.week_start)
    const cur = byWeek.get(key) ?? { hours: 0, labor: 0, rates: new Set<number>() }
    cur.hours = round2(cur.hours + Number(w.total_hours || 0))
    cur.labor = round2(cur.labor + Number(w.total_cost || 0))
    if (w.hourly_rate != null) cur.rates.add(Number(w.hourly_rate))
    byWeek.set(key, cur)
  }

  const lines: InvoiceLine[] = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      description: `${fmt(week)} - ${fmt(weekEnd(week))} - Crew Labor`,
      hours: v.hours,
      rate: v.rates.size === 1 ? [...v.rates][0] : 0,
      labor: v.labor,
      reimbursement: 0,
      lineTotal: v.labor,
    }))

  const laborSubtotal = round2(lines.reduce((s, l) => s + l.labor, 0))

  const reimbursements = round2(options.reimbursementAmount || 0)
  if (reimbursements > 0 && options.reimbursementLabel.trim()) {
    lines.push({
      description: options.reimbursementLabel.trim(),
      hours: 0, rate: 0, labor: 0,
      reimbursement: reimbursements,
      lineTotal: reimbursements,
    })
  }

  const otherOrTax = round2(options.otherOrTax || 0)
  const balanceDue = round2(laborSubtotal + reimbursements + otherOrTax)

  // Se corta SOLO por salto de linea. Cortar tambien por coma partia
  // "Acworth, GA 30102" en dos renglones; el dibujante ya envuelve lo que no cabe.
  const splitAddress = (a: string | null | undefined): string[] =>
    (a ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 4)

  const fromParty: InvoiceParty = {
    name: org?.name ?? 'Organization',
    addressLines: splitAddress(org?.address),
    phone: org?.contact_phone ?? null,
    email: org?.contact_email ?? null,
    website: null,
  }

  const customer = customerRes.data
  const billTo: InvoiceParty = customer
    ? {
        name: customer.name,
        addressLines: splitAddress(customer.address),
        phone: customer.contact_phone,
        email: customer.contact_email,
      }
    : { name: 'Customer not selected', addressLines: [] }

  const bytes = await buildLaborInvoicePdf({
    invoiceNumber: options.invoiceNumber.trim() || 'DRAFT',
    invoiceDate: options.invoiceDate,
    paymentTerms: options.paymentTerms,
    projectOrPo: options.projectOrPo,
    billTo,
    from: fromParty,
    lines,
    laborSubtotal,
    reimbursements,
    otherOrTax,
    balanceDue,
    notes: options.notes,
  })

  const safe = (options.invoiceNumber.trim() || 'invoice').replace(/[^A-Za-z0-9_-]+/g, '-')
  return {
    base64: Buffer.from(bytes).toString('base64'),
    fileName: `${safe}.pdf`,
  }
}

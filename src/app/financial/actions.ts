'use server'

/**
 * Vista global de contratos y cobranza.
 *
 * La pantalla por proyecto responde "como va ESTE trabajo". Esta responde la
 * pregunta del que cobra: "quien me debe, cuanto, y hace cuantos dias". Por eso
 * agrupa por cliente y no por proyecto, y por eso el orden por defecto es el
 * monto vencido y no el nombre.
 *
 * Todo sale de la vista `project_financial_summary`, que ya suma facturas y
 * pagos en la base; aqui solo se agrupa.
 */

import { createClient } from '@/utils/supabase/server'

export interface GlobalProjectRow {
  projectId: string
  projectName: string
  jobNumber: string | null
  contractNumber: string | null
  paymentTerms: string | null
  contractAmount: number
  invoiced: number
  paid: number
  receivable: number
  remainingToBill: number
  overdue: number
  oldestDueDate: string | null
  daysLate: number
}

export interface GlobalCustomerGroup {
  customerId: string | null
  customerName: string
  projects: GlobalProjectRow[]
  contractAmount: number
  invoiced: number
  paid: number
  receivable: number
  overdue: number
  daysLate: number
}

export interface GlobalFinancialData {
  groups: GlobalCustomerGroup[]
  totals: {
    contractAmount: number
    invoiced: number
    paid: number
    receivable: number
    overdue: number
  }
  error?: string
}

const money = (v: unknown) => Math.round(Number(v || 0) * 100) / 100

function daysSince(dueDate: string | null): number {
  if (!dueDate) return 0
  const due = new Date(`${dueDate}T00:00:00`).getTime()
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  const diff = Math.floor((today - due) / 86400000)
  return diff > 0 ? diff : 0
}

export async function getGlobalFinancials(): Promise<GlobalFinancialData> {
  const empty = { contractAmount: 0, invoiced: 0, paid: 0, receivable: 0, overdue: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { groups: [], totals: empty, error: 'Not signed in.' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .limit(1)

  const orgId = member?.[0]?.organization_id
  if (!orgId) return { groups: [], totals: empty, error: 'No organization for the current user.' }

  const [{ data: summary, error }, { data: projects }, { data: customers }, { data: contracts }, { data: openInvoices }] =
    await Promise.all([
      supabase
        .from('project_financial_summary')
        .select('project_id, customer_id, contract_amount, invoiced, paid, receivable, remaining_to_bill, overdue')
        .eq('organization_id', orgId),
      supabase.from('projects').select('id, name, job_number').eq('organization_id', orgId),
      supabase.from('customers').select('id, name').eq('organization_id', orgId),
      supabase.from('contracts').select('project_id, contract_number, payment_terms').eq('organization_id', orgId),
      // La factura abierta mas antigua de cada proyecto da los dias de atraso.
      supabase
        .from('invoices')
        .select('project_id, due_date, status')
        .eq('organization_id', orgId)
        .not('status', 'in', '("void","draft","paid")')
        .not('due_date', 'is', null)
        .order('due_date'),
    ])

  if (error) return { groups: [], totals: empty, error: error.message }

  const projectById = new Map((projects ?? []).map(p => [p.id, p]))
  const customerById = new Map((customers ?? []).map(c => [c.id, c.name]))
  const contractByProject = new Map((contracts ?? []).map(c => [c.project_id, c]))

  const oldestDue = new Map<string, string>()
  for (const inv of openInvoices ?? []) {
    if (!inv.due_date) continue
    const cur = oldestDue.get(inv.project_id)
    if (!cur || inv.due_date < cur) oldestDue.set(inv.project_id, inv.due_date)
  }

  const groups = new Map<string, GlobalCustomerGroup>()

  for (const s of summary ?? []) {
    // La vista expone project_id como nullable (viene de un left join), asi que
    // se descarta antes de usarlo como clave.
    const projectId = s.project_id
    if (!projectId) continue
    const project = projectById.get(projectId)
    if (!project) continue

    // Un proyecto sin nada financiero cargado no aporta a una pantalla de
    // cobranza; solo ensucia la lista.
    const contractAmount = money(s.contract_amount)
    const invoiced = money(s.invoiced)
    if (contractAmount === 0 && invoiced === 0) continue

    const contract = contractByProject.get(projectId)
    const due = oldestDue.get(projectId) ?? null
    const overdue = money(s.overdue)

    const row: GlobalProjectRow = {
      projectId,
      projectName: project.name,
      jobNumber: project.job_number,
      contractNumber: contract?.contract_number ?? null,
      paymentTerms: contract?.payment_terms ?? null,
      contractAmount,
      invoiced,
      paid: money(s.paid),
      receivable: money(s.receivable),
      remainingToBill: money(s.remaining_to_bill),
      overdue,
      oldestDueDate: due,
      daysLate: overdue > 0 ? daysSince(due) : 0,
    }

    const key = s.customer_id ?? '__none__'
    const group = groups.get(key) ?? {
      customerId: s.customer_id ?? null,
      customerName: s.customer_id ? (customerById.get(s.customer_id) ?? 'Unknown customer') : 'No customer assigned',
      projects: [],
      contractAmount: 0, invoiced: 0, paid: 0, receivable: 0, overdue: 0, daysLate: 0,
    }

    group.projects.push(row)
    group.contractAmount = money(group.contractAmount + row.contractAmount)
    group.invoiced = money(group.invoiced + row.invoiced)
    group.paid = money(group.paid + row.paid)
    group.receivable = money(group.receivable + row.receivable)
    group.overdue = money(group.overdue + row.overdue)
    group.daysLate = Math.max(group.daysLate, row.daysLate)
    groups.set(key, group)
  }

  // Primero quien esta mas atrasado, luego quien debe mas. Es el orden en que
  // se persigue la plata.
  const list = [...groups.values()].sort((a, b) =>
    b.overdue - a.overdue || b.receivable - a.receivable || a.customerName.localeCompare(b.customerName)
  )
  for (const g of list) {
    g.projects.sort((a, b) => b.overdue - a.overdue || b.receivable - a.receivable)
  }

  return {
    groups: list,
    totals: {
      contractAmount: money(list.reduce((s, g) => s + g.contractAmount, 0)),
      invoiced: money(list.reduce((s, g) => s + g.invoiced, 0)),
      paid: money(list.reduce((s, g) => s + g.paid, 0)),
      receivable: money(list.reduce((s, g) => s + g.receivable, 0)),
      overdue: money(list.reduce((s, g) => s + g.overdue, 0)),
    },
  }
}

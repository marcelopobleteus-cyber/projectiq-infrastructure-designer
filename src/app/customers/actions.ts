'use server'

/**
 * Directorio de clientes.
 *
 * Los clientes se repiten entre proyectos, asi que viven en su propia tabla y
 * el proyecto apunta a uno. Eso permite listar todo lo de un cliente y corregir
 * sus datos en un solo lugar.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export interface CustomerItem {
  id: string
  name: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive'
  projectCount: number
  /** Suma de la capa financiera de todos sus proyectos. */
  invoiced: number
  paid: number
  receivable: number
}

async function callerOrg(): Promise<{ orgId: string | null; canWrite: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { orgId: null, canWrite: false }

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .limit(1)

  const m = data?.[0]
  return {
    orgId: m?.organization_id ?? null,
    canWrite: m?.role === 'owner' || m?.role === 'admin' || m?.role === 'editor',
  }
}

export async function getCustomers(): Promise<{ customers: CustomerItem[]; canWrite: boolean; error?: string }> {
  const { orgId, canWrite } = await callerOrg()
  if (!orgId) return { customers: [], canWrite: false, error: 'No organization for the current user.' }

  const supabase = await createClient()
  const [{ data: rows, error }, { data: projectRows }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, contact_name, contact_email, contact_phone, address, notes, status')
      .eq('organization_id', orgId)
      .order('name'),
    supabase.from('projects').select('customer_id').eq('organization_id', orgId),
  ])

  // El resumen financiero se lee de la vista: sumarlo aqui en JS obligaria a
  // traer todas las facturas y pagos de la organizacion.
  const { data: finRows } = await supabase
    .from('project_financial_summary')
    .select('customer_id, invoiced, paid, receivable')
    .eq('organization_id', orgId)

  if (error) return { customers: [], canWrite, error: error.message }

  const round2 = (v: unknown) => Math.round(Number(v || 0) * 100) / 100
  const fin = new Map<string, { invoiced: number; paid: number; receivable: number }>()
  ;(finRows ?? []).forEach(r => {
    if (!r.customer_id) return
    const cur = fin.get(r.customer_id) ?? { invoiced: 0, paid: 0, receivable: 0 }
    cur.invoiced = round2(cur.invoiced + round2(r.invoiced))
    cur.paid = round2(cur.paid + round2(r.paid))
    cur.receivable = round2(cur.receivable + round2(r.receivable))
    fin.set(r.customer_id, cur)
  })

  const counts = new Map<string, number>()
  ;(projectRows ?? []).forEach(p => {
    if (p.customer_id) counts.set(p.customer_id, (counts.get(p.customer_id) ?? 0) + 1)
  })

  return {
    canWrite,
    customers: (rows ?? []).map(c => ({
      id: c.id,
      name: c.name,
      contactName: c.contact_name,
      contactEmail: c.contact_email,
      contactPhone: c.contact_phone,
      address: c.address,
      notes: c.notes,
      status: c.status === 'inactive' ? 'inactive' : 'active',
      projectCount: counts.get(c.id) ?? 0,
      invoiced: fin.get(c.id)?.invoiced ?? 0,
      paid: fin.get(c.id)?.paid ?? 0,
      receivable: fin.get(c.id)?.receivable ?? 0,
    })),
  }
}

export interface CustomerInput {
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  notes?: string
  status?: 'active' | 'inactive'
}

export async function saveCustomer(
  id: string | null,
  input: CustomerInput
): Promise<{ success?: boolean; id?: string; error?: string }> {
  const { orgId, canWrite } = await callerOrg()
  if (!orgId) return { error: 'No organization for the current user.' }
  if (!canWrite) return { error: 'Only owners, admins and editors can manage customers.' }

  const name = input.name.trim()
  if (!name) return { error: 'The customer name is required.' }

  const supabase = await createClient()
  const payload = {
    organization_id: orgId,
    name,
    contact_name: input.contactName?.trim() || null,
    contact_email: input.contactEmail?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
    status: input.status ?? 'active',
    updated_at: new Date().toISOString(),
  }

  const res = id
    ? await supabase.from('customers').update(payload).eq('id', id).select('id').single()
    : await supabase.from('customers').insert(payload).select('id').single()

  if (res.error) {
    // El nombre es unico por organizacion: un duplicado es lo que evita tener
    // dos "Mastec AL" y perder la mitad de los proyectos al filtrar.
    if (res.error.code === '23505') {
      return { error: `There is already a customer named "${name}".` }
    }
    return { error: res.error.message }
  }

  revalidatePath('/customers')
  revalidatePath('/projects')
  return { success: true, id: res.data?.id }
}

export async function deleteCustomer(id: string): Promise<{ success?: boolean; error?: string }> {
  const { orgId, canWrite } = await callerOrg()
  if (!orgId) return { error: 'No organization for the current user.' }
  if (!canWrite) return { error: 'Only owners, admins and editors can manage customers.' }

  const supabase = await createClient()
  // projects.customer_id es ON DELETE SET NULL: los proyectos sobreviven, solo
  // se quedan sin cliente asignado.
  const { error } = await supabase.from('customers').delete().eq('id', id).eq('organization_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/customers')
  revalidatePath('/projects')
  return { success: true }
}

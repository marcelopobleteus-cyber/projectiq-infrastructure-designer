'use server'

/**
 * Comprobante de pago por labor, en PDF.
 *
 * Aqui solo se buscan los datos y se comprueba quien puede pedirlo; el dibujo
 * vive en src/lib/payStatementPdf.ts para poder generarlo y revisarlo sin
 * levantar la aplicacion.
 *
 * NO es una liquidacion de sueldo legal: muestra lo devengado (bruto) y no
 * incluye retenciones ni impuestos, porque el sistema no los lleva.
 */

import { createClient } from '@/utils/supabase/server'
import { buildStatementPdf } from '@/lib/payStatementPdf'

export async function generatePayStatementPdf(
  profileId: string,
  from: string,
  to: string
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

  const isManager = membership.role === 'owner' || membership.role === 'admin'
  // Un empleado puede bajar su propio comprobante; el de otro, solo owner/admin.
  if (profileId !== user.id && !isManager) {
    return { error: 'Only owners and admins can issue a statement for another employee.' }
  }

  const orgId = membership.organization_id

  const [{ data: org }, { data: profile }, weeksRes, detailRes] = await Promise.all([
    supabase.from('organizations').select('name, address').eq('id', orgId).single(),
    supabase.from('profiles').select('full_name, first_name, last_name, email, title, time_zone').eq('id', profileId).single(),
    supabase.rpc('payroll_summary', { p_organization_id: orgId, p_from: from, p_to: to }),
    supabase.rpc('payroll_employee_detail', { p_organization_id: orgId, p_profile_id: profileId, p_from: from, p_to: to }),
  ])

  if (!profile) return { error: 'Employee not found.' }

  const weeks = (weeksRes.data ?? []).filter(w => w.profile_id === profileId)
  if (weeks.length === 0) {
    return { error: 'No hours for this employee in the selected period.' }
  }

  const employeeName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.full_name ||
    profile.email ||
    'Employee'

  const bytes = await buildStatementPdf({
    organizationName: org?.name ?? 'Company',
    organizationAddress: org?.address ?? null,
    employeeName,
    employeeTitle: profile.title,
    timeZone: profile.time_zone || 'America/New_York',
    from,
    to,
    weeks: weeks.map(w => ({
      week_start: w.week_start,
      employment_type: w.employment_type,
      regular_hours: Number(w.regular_hours),
      overtime_hours: Number(w.overtime_hours),
      total_hours: Number(w.total_hours),
      hourly_rate: w.hourly_rate === null ? null : Number(w.hourly_rate),
      total_cost: w.total_cost === null ? null : Number(w.total_cost),
    })),
    days: (detailRes.data ?? []).map(d => ({
      work_day: d.work_day,
      project_name: d.project_name,
      clock_in: d.clock_in,
      clock_out: d.clock_out,
      paused_minutes: Number(d.paused_minutes),
      hours: Number(d.hours),
    })),
  })

  const safeName = employeeName.replace(/[^A-Za-z0-9]+/g, '_')
  return {
    base64: Buffer.from(bytes).toString('base64'),
    fileName: `statement_${safeName}_${from}_${to}.pdf`,
  }
}

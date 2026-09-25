'use server'

/**
 * Reportes de nomina para administracion.
 *
 * Las reglas de negocio (semana lunes-domingo en la zona del empleado,
 * sobretiempo solo W2 sobre 40 h, tarifas visibles solo para owner/admin) viven
 * en las funciones payroll_summary y payroll_employee_detail de la base, no
 * aqui: asi un reporte no puede mostrar un numero distinto al del timecard.
 */

import { createClient } from '@/utils/supabase/server'
import { federalHolidaysBetween } from '@/lib/usFederalHolidays'

export interface PayrollWeekRow {
  profileId: string
  employeeName: string
  weekStart: string
  employmentType: 'w2' | '1099'
  regularHours: number
  overtimeHours: number
  totalHours: number
  hourlyRate: number | null
  regularCost: number | null
  overtimeCost: number | null
  totalCost: number | null
}

export interface PayrollDetailRow {
  entryId: string
  workDay: string
  weekStart: string
  projectName: string
  clockIn: string
  clockOut: string
  pausedMinutes: number
  hours: number
  workDescription: string | null
}

async function callerOrg(): Promise<{ orgId: string | null; isManager: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { orgId: null, isManager: false }

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .limit(1)

  const m = data?.[0]
  return {
    orgId: m?.organization_id ?? null,
    isManager: m?.role === 'owner' || m?.role === 'admin',
  }
}

export async function getPayrollSummary(
  from: string,
  to: string
): Promise<{ rows?: PayrollWeekRow[]; error?: string }> {
  const { orgId, isManager } = await callerOrg()
  if (!orgId) return { error: 'No organization for the current user.' }
  if (!isManager) return { error: 'Payroll reports are limited to owners and admins.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('payroll_summary', {
    p_organization_id: orgId,
    p_from: from,
    p_to: to,
  })

  if (error) return { error: error.message }

  const rows: PayrollWeekRow[] = (data ?? []).map(r => ({
    profileId: r.profile_id,
    employeeName: r.employee_name,
    weekStart: r.week_start,
    employmentType: r.employment_type === '1099' ? '1099' : 'w2',
    regularHours: Number(r.regular_hours),
    overtimeHours: Number(r.overtime_hours),
    totalHours: Number(r.total_hours),
    hourlyRate: r.hourly_rate === null ? null : Number(r.hourly_rate),
    regularCost: r.regular_cost === null ? null : Number(r.regular_cost),
    overtimeCost: r.overtime_cost === null ? null : Number(r.overtime_cost),
    totalCost: r.total_cost === null ? null : Number(r.total_cost),
  }))

  return { rows }
}

export async function getPayrollEmployeeDetail(
  profileId: string,
  from: string,
  to: string
): Promise<{ rows?: PayrollDetailRow[]; error?: string }> {
  const { orgId } = await callerOrg()
  if (!orgId) return { error: 'No organization for the current user.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('payroll_employee_detail', {
    p_organization_id: orgId,
    p_profile_id: profileId,
    p_from: from,
    p_to: to,
  })

  if (error) return { error: error.message }

  const rows: PayrollDetailRow[] = (data ?? []).map(r => ({
    entryId: r.entry_id,
    workDay: r.work_day,
    weekStart: r.week_start,
    projectName: r.project_name,
    clockIn: r.clock_in,
    clockOut: r.clock_out,
    pausedMinutes: Number(r.paused_minutes),
    hours: Number(r.hours),
    workDescription: r.work_description,
  }))

  return { rows }
}

/** Un dia habil del periodo sin horas cargadas. */
export interface PeriodGap {
  /** ISO yyyy-mm-dd */
  day: string
  /** Nombre del feriado federal, o null si fue simplemente un dia sin trabajo. */
  holiday: string | null
}

/**
 * Dias habiles del periodo que quedaron sin horas.
 *
 * Existe porque un hueco en la nomina tiene dos causas muy distintas: un feriado
 * federal, en el que el prime no trabaja por obligacion, o una ausencia. Sin
 * distinguirlas hay que ir a buscar el calendario cada vez que se revisa un
 * periodo, y es justo cuando se cuela una jornada inventada.
 *
 * Fines de semana quedan fuera: la jornada es de lunes a viernes.
 */
export async function getPeriodGaps(
  from: string,
  to: string,
): Promise<{ gaps?: PeriodGap[]; error?: string }> {
  const { orgId } = await callerOrg()
  if (!orgId) return { error: 'No organization for the current user.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('clock_in')
    .eq('organization_id', orgId)
    .not('clock_out', 'is', null)
    .gte('clock_in', `${from}T00:00:00Z`)
    .lte('clock_in', `${to}T23:59:59Z`)

  if (error) return { error: error.message }

  // El dia se compara en hora local, igual que lo hace payroll_summary: un turno
  // que empieza a las 7 AM de Georgia es 11:00 UTC, y en UTC seria otro dia.
  const worked = new Set(
    (data ?? []).map(e =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(e.clock_in as string)),
    ),
  )

  const byDate = new Map(federalHolidaysBetween(from, to).map(h => [h.date, h.name]))

  const gaps: PeriodGap[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10)
    const weekday = cursor.getUTCDay()
    if (weekday >= 1 && weekday <= 5 && !worked.has(day)) {
      gaps.push({ day, holiday: byDate.get(day) ?? null })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return { gaps }
}

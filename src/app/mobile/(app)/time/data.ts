import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

export interface TimeClockProject {
  id: string
  name: string
}

export interface TimeClockCostCode {
  id: string
  name: string
}

export interface OpenTimeEntry {
  id: string
  project_id: string | null
  project_name: string
  clock_in: string
  paused_at: string | null
  paused_minutes: number
}

export interface TimeEntryHistoryItem {
  id: string
  project_id: string | null
  project_name: string
  clock_in: string
  clock_out: string
  work_description: string | null
  paused_minutes: number
}

export interface MonthDaySummary {
  /** YYYY-MM-DD, local calendar day of clock_in */
  date: string
  minutesWorked: number
}

export interface TimeClockData {
  projects: TimeClockProject[]
  costCodes: TimeClockCostCode[]
  openEntry: OpenTimeEntry | null
  history: TimeEntryHistoryItem[]
  monthDays: MonthDaySummary[]
}

const EMPTY: TimeClockData = { projects: [], costCodes: [], openEntry: null, history: [], monthDays: [] }

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function netMinutes(clockIn: string, clockOut: string | null, pausedMinutes: number): number {
  const start = new Date(clockIn).getTime()
  const end = clockOut ? new Date(clockOut).getTime() : Date.now()
  return Math.max(0, Math.floor((end - start) / 60000) - pausedMinutes)
}

// Mirrors the org-resolution used by /projects and /settings: a technician only
// clocks in against projects that belong to an organization they're a member of.
export async function getTimeClockData(): Promise<TimeClockData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return EMPTY
  if (!user) return EMPTY

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)

  const orgIds = memberships?.map((m) => m.organization_id) || []
  if (orgIds.length === 0) return EMPTY

  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, name')
    .in('organization_id', orgIds)
    .order('name', { ascending: true })

  const projects: TimeClockProject[] = (projectRows || []).map((p) => ({ id: p.id, name: p.name }))
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))
  projectNameById.set('office', 'Office')

  const { data: costCodeRows } = await supabase
    .from('cost_codes')
    .select('id, name')
    .in('organization_id', orgIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const costCodes: TimeClockCostCode[] = (costCodeRows || []).map((c) => ({ id: c.id, name: c.name }))

  const { data: openRows } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in, paused_at, paused_minutes')
    .eq('profile_id', user.id)
    .is('clock_out', null)
    .limit(1)

  const openRow = openRows?.[0]
  const openEntry: OpenTimeEntry | null = openRow
    ? {
        id: openRow.id,
        project_id: openRow.project_id,
        project_name: openRow.project_id ? projectNameById.get(openRow.project_id) || 'Project' : 'Office',
        clock_in: openRow.clock_in,
        paused_at: openRow.paused_at,
        paused_minutes: openRow.paused_minutes,
      }
    : null

  const { data: historyRows } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in, clock_out, work_description, paused_minutes')
    .eq('profile_id', user.id)
    .not('clock_out', 'is', null)
    .order('clock_in', { ascending: false })
    .limit(20)

  const history: TimeEntryHistoryItem[] = (historyRows || []).map((h) => ({
    id: h.id,
    project_id: h.project_id,
    project_name: h.project_id ? projectNameById.get(h.project_id) || 'Project' : 'Office',
    clock_in: h.clock_in,
    clock_out: h.clock_out as string,
    work_description: h.work_description,
    paused_minutes: h.paused_minutes,
  }))

  // Current calendar month window, for the month-view dots + weekly total.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const { data: monthRows } = await supabase
    .from('time_entries')
    .select('clock_in, clock_out, paused_minutes')
    .eq('profile_id', user.id)
    .gte('clock_in', monthStart.toISOString())
    .lt('clock_in', nextMonthStart.toISOString())

  const minutesByDay = new Map<string, number>()
  for (const row of monthRows || []) {
    const key = dayKey(row.clock_in)
    const minutes = netMinutes(row.clock_in, row.clock_out, row.paused_minutes)
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + minutes)
  }
  const monthDays: MonthDaySummary[] = Array.from(minutesByDay.entries()).map(([date, minutesWorked]) => ({
    date,
    minutesWorked,
  }))

  return { projects, costCodes, openEntry, history, monthDays }
}

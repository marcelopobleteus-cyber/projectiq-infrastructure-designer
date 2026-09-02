import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

export interface TimeClockProject {
  id: string
  name: string
}

export interface OpenTimeEntry {
  id: string
  project_id: string
  project_name: string
  clock_in: string
}

export interface TimeEntryHistoryItem {
  id: string
  project_id: string
  project_name: string
  clock_in: string
  clock_out: string
  work_description: string | null
}

export interface TimeClockData {
  projects: TimeClockProject[]
  openEntry: OpenTimeEntry | null
  history: TimeEntryHistoryItem[]
}

const EMPTY: TimeClockData = { projects: [], openEntry: null, history: [] }

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

  const { data: openRows } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in')
    .eq('profile_id', user.id)
    .is('clock_out', null)
    .limit(1)

  const openRow = openRows?.[0]
  const openEntry: OpenTimeEntry | null = openRow
    ? {
        id: openRow.id,
        project_id: openRow.project_id,
        project_name: projectNameById.get(openRow.project_id) || 'Proyecto',
        clock_in: openRow.clock_in,
      }
    : null

  const { data: historyRows } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in, clock_out, work_description')
    .eq('profile_id', user.id)
    .not('clock_out', 'is', null)
    .order('clock_in', { ascending: false })
    .limit(20)

  const history: TimeEntryHistoryItem[] = (historyRows || []).map((h) => ({
    id: h.id,
    project_id: h.project_id,
    project_name: projectNameById.get(h.project_id) || 'Proyecto',
    clock_in: h.clock_in,
    clock_out: h.clock_out as string,
    work_description: h.work_description,
  }))

  return { projects, openEntry, history }
}

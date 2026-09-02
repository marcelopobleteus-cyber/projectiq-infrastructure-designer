import { createClient } from '@/utils/supabase/server'
import type { OpenTimeEntry, TimeClockProject, TimeEntryHistoryItem } from '@/components/mobile/TimeClockClient'

export async function loadTimeClockData(userId: string) {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', userId)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  let projects: TimeClockProject[] = []
  if (orgIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .in('organization_id', orgIds)
      .order('name', { ascending: true })
    projects = data || []
  }

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))

  const { data: openRow } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in')
    .eq('profile_id', userId)
    .is('clock_out', null)
    .maybeSingle()

  let openEntry: OpenTimeEntry | null = null
  if (openRow) {
    let projectName = projectNameById.get(openRow.project_id)
    if (!projectName) {
      const { data: p } = await supabase.from('projects').select('name').eq('id', openRow.project_id).single()
      projectName = p?.name || 'Proyecto'
    }
    openEntry = { id: openRow.id, project_id: openRow.project_id, project_name: projectName, clock_in: openRow.clock_in }
  }

  const { data: historyRows } = await supabase
    .from('time_entries')
    .select('id, project_id, clock_in, clock_out, work_description')
    .eq('profile_id', userId)
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

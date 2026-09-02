'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

export interface TimeTrackingProject {
  id: string
  name: string
}

export interface TimeTrackingEmployee {
  id: string
  name: string
  email: string
}

export interface TimeTrackingCostCode {
  id: string
  name: string
  is_active: boolean
}

export interface TimeTrackingEntry {
  id: string
  project_id: string | null
  project_name: string
  profile_id: string
  employee_name: string
  employee_email: string
  cost_code_id: string | null
  cost_code_name: string
  clock_in: string
  clock_out: string | null
  paused_minutes: number
  work_description: string | null
}

export interface TimeTrackingData {
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer'
  organizationId: string
  organizationName: string
  projects: TimeTrackingProject[]
  employees: TimeTrackingEmployee[]
  costCodes: TimeTrackingCostCode[]
  entries: TimeTrackingEntry[]
}

const EMPTY: TimeTrackingData = {
  currentUserRole: 'viewer',
  organizationId: '',
  organizationName: 'Company Workspace',
  projects: [],
  employees: [],
  costCodes: [],
  entries: [],
}

// Same org-resolution shape as getOrganizationTeamData in /settings, kept
// deterministic (oldest membership wins) so a multi-org user always lands on
// the same workspace here too.
export async function getTimeTrackingData(): Promise<TimeTrackingData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return EMPTY
  if (!user) return EMPTY

  const { data: membershipRows } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const membership = membershipRows?.[0]
  if (!membership) return EMPTY

  const orgId = membership.organization_id
  const currentUserRole = (membership.role as TimeTrackingData['currentUserRole']) || 'viewer'

  const { data: orgRow } = await supabase.from('organizations').select('name').eq('id', orgId).limit(1)
  const organizationName = orgRow?.[0]?.name || 'Company Workspace'

  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  const projects: TimeTrackingProject[] = (projectRows || []).map((p) => ({ id: p.id, name: p.name }))
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))

  const { data: costCodeRows } = await supabase
    .from('cost_codes')
    .select('id, name, is_active')
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: true })

  const costCodes: TimeTrackingCostCode[] = (costCodeRows || []).map((c) => ({
    id: c.id,
    name: c.name,
    is_active: c.is_active,
  }))
  const costCodeNameById = new Map(costCodes.map((c) => [c.id, c.name]))

  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('profile_id, profiles(id, full_name, email)')
    .eq('organization_id', orgId)

  const employees: TimeTrackingEmployee[] = (memberRows || []).map((m: any) => ({
    id: m.profile_id,
    name: m.profiles?.full_name || m.profiles?.email || 'No name',
    email: m.profiles?.email || '',
  }))
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  // Last 90 days is enough for review/payroll purposes and keeps this page fast;
  // the filters below operate on this window client-side.
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data: entryRows } = await supabase
    .from('time_entries')
    .select('id, project_id, profile_id, cost_code_id, clock_in, clock_out, paused_minutes, work_description')
    .eq('organization_id', orgId)
    .gte('clock_in', since.toISOString())
    .order('clock_in', { ascending: false })
    .limit(1000)

  const entries: TimeTrackingEntry[] = (entryRows || []).map((e) => {
    const emp = employeeById.get(e.profile_id)
    return {
      id: e.id,
      project_id: e.project_id,
      project_name: e.project_id ? projectNameById.get(e.project_id) || 'Project' : 'Office',
      profile_id: e.profile_id,
      employee_name: emp?.name || 'Former member',
      employee_email: emp?.email || '',
      cost_code_id: e.cost_code_id,
      cost_code_name: e.cost_code_id ? costCodeNameById.get(e.cost_code_id) || 'Unassigned' : 'Unassigned',
      clock_in: e.clock_in,
      clock_out: e.clock_out,
      paused_minutes: e.paused_minutes,
      work_description: e.work_description,
    }
  })

  return { currentUserRole, organizationId: orgId, organizationName, projects, employees, costCodes, entries }
}

export async function updateTimeEntry(
  entryId: string,
  updates: {
    clock_in?: string
    clock_out?: string | null
    project_id?: string | null
    cost_code_id?: string | null
    work_description?: string | null
  }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('time_entries').update(updates).eq('id', entryId)

  if (error) return { error: 'Could not update the entry. Check that you have editor permission.' }

  revalidatePath('/time-tracking')
  return { error: null }
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId)

  if (error) return { error: 'Could not delete the entry. Check that you have editor permission.' }

  revalidatePath('/time-tracking')
  return { error: null }
}

export async function createCostCode(organizationId: string, name: string) {
  const supabase = await createClient()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'The name cannot be empty.' }

  const { data: existing } = await supabase
    .from('cost_codes')
    .select('sort_order')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from('cost_codes')
    .insert({ organization_id: organizationId, name: trimmed, sort_order: nextSortOrder })

  if (error) {
    if (error.code === '23505') return { error: 'A cost code with that name already exists.' }
    return { error: 'Could not create the cost code.' }
  }

  revalidatePath('/time-tracking')
  return { error: null }
}

export async function renameCostCode(costCodeId: string, name: string) {
  const supabase = await createClient()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'The name cannot be empty.' }

  const { error } = await supabase.from('cost_codes').update({ name: trimmed }).eq('id', costCodeId)

  if (error) {
    if (error.code === '23505') return { error: 'A cost code with that name already exists.' }
    return { error: 'Could not rename the cost code.' }
  }

  revalidatePath('/time-tracking')
  return { error: null }
}

export async function setCostCodeActive(costCodeId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('cost_codes').update({ is_active: isActive }).eq('id', costCodeId)

  if (error) return { error: 'Could not update the cost code.' }

  revalidatePath('/time-tracking')
  return { error: null }
}

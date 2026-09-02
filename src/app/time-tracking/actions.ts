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

export interface TimeTrackingEntry {
  id: string
  project_id: string
  project_name: string
  profile_id: string
  employee_name: string
  employee_email: string
  clock_in: string
  clock_out: string | null
  work_description: string | null
}

export interface TimeTrackingData {
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer'
  organizationName: string
  projects: TimeTrackingProject[]
  employees: TimeTrackingEmployee[]
  entries: TimeTrackingEntry[]
}

const EMPTY: TimeTrackingData = {
  currentUserRole: 'viewer',
  organizationName: 'Company Workspace',
  projects: [],
  employees: [],
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

  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('profile_id, profiles(id, full_name, email)')
    .eq('organization_id', orgId)

  const employees: TimeTrackingEmployee[] = (memberRows || []).map((m: any) => ({
    id: m.profile_id,
    name: m.profiles?.full_name || m.profiles?.email || 'Sin nombre',
    email: m.profiles?.email || '',
  }))
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  // Last 90 days is enough for review/payroll purposes and keeps this page fast;
  // the filters below operate on this window client-side.
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data: entryRows } = await supabase
    .from('time_entries')
    .select('id, project_id, profile_id, clock_in, clock_out, work_description')
    .eq('organization_id', orgId)
    .gte('clock_in', since.toISOString())
    .order('clock_in', { ascending: false })
    .limit(1000)

  const entries: TimeTrackingEntry[] = (entryRows || []).map((e) => {
    const emp = employeeById.get(e.profile_id)
    return {
      id: e.id,
      project_id: e.project_id,
      project_name: projectNameById.get(e.project_id) || 'Proyecto',
      profile_id: e.profile_id,
      employee_name: emp?.name || 'Ex-miembro',
      employee_email: emp?.email || '',
      clock_in: e.clock_in,
      clock_out: e.clock_out,
      work_description: e.work_description,
    }
  })

  return { currentUserRole, organizationName, projects, employees, entries }
}

export async function updateTimeEntry(
  entryId: string,
  updates: { clock_in?: string; clock_out?: string | null; work_description?: string | null }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('time_entries').update(updates).eq('id', entryId)

  if (error) return { error: 'No se pudo actualizar el registro. Verifica que tengas permiso de editor.' }

  revalidatePath('/time-tracking')
  return { error: null }
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId)

  if (error) return { error: 'No se pudo eliminar el registro. Verifica que tengas permiso de editor.' }

  revalidatePath('/time-tracking')
  return { error: null }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Clock a technician in. projectId is null for "Office" — a pseudo-project,
// never a real row in `projects`, that's picked when there's no site to
// assign that shift to. RLS (migration 037/038) still enforces one open
// entry per profile and organization membership.
export async function clockIn(projectId: string | null, costCodeId: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  let organizationId: string | null = null

  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project) return { error: 'Project not found.' }
    organizationId = project.organization_id
  } else {
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
    organizationId = membershipRows?.[0]?.organization_id || null
  }

  if (!organizationId) return { error: 'Could not find your organization.' }

  const { error } = await supabase.from('time_entries').insert({
    project_id: projectId,
    cost_code_id: costCodeId,
    organization_id: organizationId,
    profile_id: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'You already have an open shift. Clock out before starting a new one.' }
    }
    return { error: 'Could not clock in. Please try again.' }
  }

  revalidatePath('/field/time')
  return { error: null }
}

export async function pauseEntry(entryId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('time_entries')
    .update({ paused_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('profile_id', user.id)
    .is('paused_at', null)

  if (error) return { error: 'Could not pause the shift.' }

  revalidatePath('/field/time')
  return { error: null }
}

export async function resumeEntry(entryId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { data: entry } = await supabase
    .from('time_entries')
    .select('paused_at, paused_minutes')
    .eq('id', entryId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!entry?.paused_at) return { error: 'This shift is not paused.' }

  const pausedMs = Date.now() - new Date(entry.paused_at).getTime()
  const addedMinutes = Math.max(0, Math.round(pausedMs / 60000))

  const { error } = await supabase
    .from('time_entries')
    .update({ paused_at: null, paused_minutes: entry.paused_minutes + addedMinutes })
    .eq('id', entryId)
    .eq('profile_id', user.id)

  if (error) return { error: 'Could not resume the shift.' }

  revalidatePath('/field/time')
  return { error: null }
}

export async function clockOut(entryId: string, workDescription: string, projectId?: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (!entryId) return { error: 'Invalid time entry.' }

  // Closing out while paused folds the open pause into paused_minutes first,
  // so the stored total always reflects time actually worked.
  const { data: entry } = await supabase
    .from('time_entries')
    .select('paused_at, paused_minutes')
    .eq('id', entryId)
    .eq('profile_id', user.id)
    .maybeSingle()

  let pausedMinutes = entry?.paused_minutes ?? 0
  if (entry?.paused_at) {
    const pausedMs = Date.now() - new Date(entry.paused_at).getTime()
    pausedMinutes += Math.max(0, Math.round(pausedMs / 60000))
  }

  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_out: new Date().toISOString(),
      work_description: workDescription?.trim() || null,
      paused_at: null,
      paused_minutes: pausedMinutes,
    })
    .eq('id', entryId)
    .eq('profile_id', user.id)

  if (error) {
    return { error: 'Could not clock out. Please try again.' }
  }

  revalidatePath('/field/time')
  if (projectId) revalidatePath(`/field/projects/${projectId}/overview`)
  return { error: null }
}

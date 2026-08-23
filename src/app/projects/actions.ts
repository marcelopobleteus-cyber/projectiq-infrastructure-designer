'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { BYPASS_AUTH } from '@/config/auth'

// Canonical discipline ids — must match PROJECT_TYPES in /projects/create and
// ALL_DISCIPLINES in ProjectSidebar. 'master' is not a discipline itself; it expands
// to the disciplines that currently have a real workspace built for them.
const DISCIPLINE_MAP: Record<string, string[]> = {
  master: ['cctv', 'fiber', 'networking', 'wireless', 'power'],
  cctv: ['cctv'],
  fiber: ['fiber'],
  conduit: ['conduit'],
  networking: ['networking'],
  wireless: ['wireless'],
  power: ['power'],
  lighting: ['lighting'],
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const latitudeStr = formData.get('latitude') as string
  const longitudeStr = formData.get('longitude') as string
  const zoomStr = formData.get('zoom') as string

  if (!name) {
    return { error: 'Project name is required' }
  }

  // Resolve organization
  let orgId: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)
      .limit(1)
      .single()
    orgId = membership?.organization_id || null
  }

  if (!orgId) {
    const { data: firstProj } = await supabase.from('projects').select('organization_id').limit(1).single()
    orgId = firstProj?.organization_id || null
  }

  if (!orgId) {
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = firstOrg?.id || null
  }

  if (!orgId) {
    const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Default Organization' }).select('id').single()
    orgId = newOrg?.id || null
  }

  if (!orgId) {
    return { error: 'Failed to resolve organization.' }
  }

  const latitude = latitudeStr ? parseFloat(latitudeStr) : 33.7490
  const longitude = longitudeStr ? parseFloat(longitudeStr) : -84.3880
  const zoom = zoomStr ? parseInt(zoomStr, 10) : 15
  const projectType = (formData.get('project_type') as string) || 'master'
  const disciplines = DISCIPLINE_MAP[projectType] || []

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name,
      description: description || null,
      disciplines,
      organization_id: orgId,
      default_latitude: latitude,
      default_longitude: longitude,
      default_zoom: zoom,
    })
    .select('id')
    .single()

  const redirectId = project?.id || `proj-${projectType}-${Date.now().toString(36)}`

  revalidatePath('/projects')
  redirect(`/projects/${redirectId}/overview`)
}

export async function updateProjectMetadata(
  projectId: string,
  data: {
    name: string
    description?: string
    default_latitude: number
    default_longitude: number
    default_zoom: number
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Verify the project exists
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      name: data.name,
      description: data.description || null,
      default_latitude: data.default_latitude,
      default_longitude: data.default_longitude,
      default_zoom: data.default_zoom,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath(`/projects/${projectId}/maps`)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')

  return { success: true }
}

export async function updateProjectDisciplines(
  projectId: string,
  disciplines: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ disciplines, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath('/projects')

  return { success: true }
}

export async function deleteProject(projectId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  if (projectId === 'demo-metro-cctv') {
    return { error: 'The primary demo project is protected and cannot be deleted.' }
  }

  try {
    // 1. Delete associated data from child tables to maintain referential integrity
    await Promise.all([
      supabase.from('camera_tasks').delete().eq('project_id', projectId),
      supabase.from('camera_fiber_assignment_strands').delete().eq('project_id', projectId),
      supabase.from('camera_fiber_assignments').delete().eq('project_id', projectId),
      supabase.from('fiber_splice_records').delete().eq('project_id', projectId),
      supabase.from('fiber_enclosures').delete().eq('project_id', projectId),
      supabase.from('fiber_cables').delete().eq('project_id', projectId),
      supabase.from('fiber_route_segments').delete().eq('project_id', projectId),
      supabase.from('fiber_routes').delete().eq('project_id', projectId),
      supabase.from('fiber_nodes').delete().eq('project_id', projectId),
      supabase.from('switch_ports').delete().eq('project_id', projectId),
      supabase.from('network_devices').delete().eq('project_id', projectId),
      supabase.from('camera_locations').delete().eq('project_id', projectId),
      supabase.from('cabinets').delete().eq('project_id', projectId),
      supabase.from('fiber_distribution_units').delete().eq('project_id', projectId),
      supabase.from('fiber_patch_panels').delete().eq('project_id', projectId),
      supabase.from('fiber_patch_cords').delete().eq('project_id', projectId),
      supabase.from('bom_items').delete().eq('project_id', projectId),
      supabase.from('field_tasks').delete().eq('project_id', projectId),
      supabase.from('coordinate_points').delete().eq('project_id', projectId),
    ])

    // 2. Delete the project row from projects table
    const { error: projErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (projErr) {
      console.error('Error deleting project from database:', projErr)
      return { error: projErr.message }
    }

    revalidatePath('/projects')
    revalidatePath('/(workspace)')
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete project:', err)
    return { error: err.message || 'Failed to delete project from database.' }
  }
}

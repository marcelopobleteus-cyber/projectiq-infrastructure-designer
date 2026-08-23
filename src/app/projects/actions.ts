'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { BYPASS_AUTH } from '@/config/auth'

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

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name,
      description: description ? `[Type:${projectType}] ${description}` : `[Type:${projectType}]`,
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

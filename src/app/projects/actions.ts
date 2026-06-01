'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'


export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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

  // Determine current user's organization (Correction 4)
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .limit(1)
    .single()

  if (memberError || !membership) {
    return { error: 'Failed to resolve organization. Please try logging out and in again.' }
  }

  const latitude = latitudeStr ? parseFloat(latitudeStr) : 0.0
  const longitude = longitudeStr ? parseFloat(longitudeStr) : 0.0
  const zoom = zoomStr ? parseInt(zoomStr, 10) : 15

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      organization_id: membership.organization_id,
      default_latitude: latitude,
      default_longitude: longitude,
      default_zoom: zoom,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: projectError?.message || 'Failed to create project.' }
  }

  revalidatePath('/projects')
  redirect(`/projects/${project.id}`)
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

  if (!user) return { error: 'Not authenticated' }

  // Verify the project belongs to an org the user is a member of
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', project.organization_id)
    .eq('profile_id', user.id)
    .single()

  if (!membership) return { error: 'Access denied' }

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

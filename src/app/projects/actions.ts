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

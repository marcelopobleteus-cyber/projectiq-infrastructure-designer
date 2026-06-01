'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProjectReview(params: {
  name: string
  notes: string
  latitude: number
  longitude: number
  zoom: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated. Please log in.' }
  }

  if (!params.name || !params.name.trim()) {
    return { error: 'Project name is required' }
  }

  if (params.latitude < -90 || params.latitude > 90) {
    return { error: 'Latitude must be between -90 and 90' }
  }

  if (params.longitude < -180 || params.longitude > 180) {
    return { error: 'Longitude must be between -180 and 180' }
  }

  // Resolve user's organization from membership
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .limit(1)
    .single()

  if (memberError || !membership) {
    return { error: 'Failed to resolve organization membership. Try logging out and in again.' }
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: params.name,
      description: params.notes || null, // Map Notes to projects.description
      organization_id: membership.organization_id,
      default_latitude: params.latitude,
      default_longitude: params.longitude,
      default_zoom: params.zoom || 16,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: projectError?.message || 'Failed to create project record.' }
  }

  revalidatePath('/projects')
  revalidatePath('/design-review/projects')
  redirect(`/projects/${project.id}`)
}

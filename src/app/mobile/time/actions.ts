'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function clockIn(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { error: 'Proyecto no encontrado.' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .eq('organization_id', project.organization_id)
    .maybeSingle()

  if (!membership) {
    return { error: 'No perteneces a la organización de este proyecto.' }
  }

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('profile_id', user.id)
    .is('clock_out', null)
    .maybeSingle()

  if (openEntry) {
    return { error: 'Ya tienes un fichaje abierto. Marca salida antes de entrar a otro proyecto.' }
  }

  const { error } = await supabase.from('time_entries').insert({
    project_id: projectId,
    organization_id: project.organization_id,
    profile_id: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mobile/time')
  revalidatePath(`/mobile/projects/${projectId}/time`)
  return { success: true }
}

export async function clockOut(entryId: string, workDescription: string, projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_out: new Date().toISOString(),
      work_description: workDescription.trim() || null,
    })
    .eq('id', entryId)
    .eq('profile_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mobile/time')
  revalidatePath(`/mobile/projects/${projectId}/time`)
  return { success: true }
}

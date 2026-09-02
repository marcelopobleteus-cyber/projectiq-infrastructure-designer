'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Clock a technician in against a project. RLS (migration 037) already enforces
// one open entry per profile and organization membership, so failures here are
// surfaced as-is rather than re-checked client-side.
export async function clockIn(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Debes iniciar sesión.' }
  if (!projectId) return { error: 'Selecciona un proyecto.' }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return { error: 'Proyecto no encontrado.' }

  const { error } = await supabase.from('time_entries').insert({
    project_id: projectId,
    organization_id: project.organization_id,
    profile_id: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya tienes un fichaje abierto. Marca salida antes de iniciar uno nuevo.' }
    }
    return { error: 'No se pudo marcar entrada. Intenta de nuevo.' }
  }

  revalidatePath('/mobile/time')
  return { error: null }
}

export async function clockOut(entryId: string, workDescription: string, projectId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Debes iniciar sesión.' }
  if (!entryId) return { error: 'Fichaje no válido.' }

  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_out: new Date().toISOString(),
      work_description: workDescription?.trim() || null,
    })
    .eq('id', entryId)
    .eq('profile_id', user.id)

  if (error) {
    return { error: 'No se pudo marcar salida. Intenta de nuevo.' }
  }

  revalidatePath('/mobile/time')
  if (projectId) revalidatePath(`/mobile/projects/${projectId}/overview`)
  return { error: null }
}

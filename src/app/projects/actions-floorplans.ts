'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

const BUCKET = 'floor-plans'

async function assertProjectAccess(supabase: any, projectId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { ok: false, error: 'Not authenticated' as const }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()
  if (!project) return { ok: false, error: 'Project not found' as const }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()
    if (!membership && !BYPASS_AUTH) return { ok: false, error: 'Access denied' as const }
  }
  return { ok: true as const }
}

export async function getFloorPlans(projectId: string, module: 'cameras' | 'fiber') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_floor_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('module', module)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch floor plans:', error.message)
    return []
  }
  return data ?? []
}

export async function getFloorPlanFileUrl(filePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60) // 1 hora

  if (error) {
    console.error('Failed to sign floor plan URL:', error.message)
    return null
  }
  return data.signedUrl
}

export async function uploadFloorPlan(params: {
  projectId: string
  module: 'cameras' | 'fiber'
  floorLabel: string
  fileType: 'pdf' | 'image'
  fileBase64: string // data URL o base64 puro
  fileName: string
  imageWidthPx?: number
  imageHeightPx?: number
}) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, params.projectId)
  if (!access.ok) return { error: access.error }

  const { data: { user } } = await supabase.auth.getUser()

  // Decodificar base64 (con o sin prefijo data:)
  const base64Data = params.fileBase64.includes(',')
    ? params.fileBase64.split(',')[1]
    : params.fileBase64
  const buffer = Buffer.from(base64Data, 'base64')

  const ext = params.fileName.split('.').pop() || (params.fileType === 'pdf' ? 'pdf' : 'png')
  const filePath = `${params.projectId}/${params.module}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: params.fileType === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    })

  if (uploadError) {
    console.error('Floor plan upload failed:', uploadError.message)
    return { error: uploadError.message }
  }

  // sort_order = siguiente disponible
  const { data: existing } = await supabase
    .from('project_floor_plans')
    .select('sort_order')
    .eq('project_id', params.projectId)
    .eq('module', params.module)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('project_floor_plans')
    .insert({
      project_id: params.projectId,
      module: params.module,
      floor_label: params.floorLabel || `Floor ${nextSortOrder + 1}`,
      sort_order: nextSortOrder,
      file_path: filePath,
      file_type: params.fileType,
      image_width_px: params.imageWidthPx ?? null,
      image_height_px: params.imageHeightPx ?? null,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save floor plan record:', error.message)
    return { error: error.message }
  }

  revalidatePath(`/projects/${params.projectId}/maps`)
  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { data }
}

export async function updateFloorPlanCalibration(params: {
  floorPlanId: string
  projectId: string
  pointA: { x: number; y: number }
  pointB: { x: number; y: number }
  realDistanceM: number
}) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, params.projectId)
  if (!access.ok) return { error: access.error }

  const { error } = await supabase
    .from('project_floor_plans')
    .update({
      scale_calibration: {
        point_a: params.pointA,
        point_b: params.pointB,
        real_distance_m: params.realDistanceM,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.floorPlanId)

  if (error) {
    console.error('Failed to save calibration:', error.message)
    return { error: error.message }
  }

  revalidatePath(`/projects/${params.projectId}/maps`)
  return { success: true }
}

export async function deleteFloorPlan(floorPlanId: string, projectId: string) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, projectId)
  if (!access.ok) return { error: access.error }

  const { data: plan } = await supabase
    .from('project_floor_plans')
    .select('file_path')
    .eq('id', floorPlanId)
    .single()

  const { error } = await supabase
    .from('project_floor_plans')
    .delete()
    .eq('id', floorPlanId)

  if (error) {
    console.error('Failed to delete floor plan:', error.message)
    return { error: error.message }
  }

  if (plan?.file_path) {
    await supabase.storage.from(BUCKET).remove([plan.file_path])
  }

  revalidatePath(`/projects/${projectId}/maps`)
  return { success: true }
}

export async function setCanvasMode(params: {
  projectId: string
  module: 'cameras' | 'fiber'
  mode: 'map' | 'uploaded_plan'
}) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, params.projectId)
  if (!access.ok) return { error: access.error }

  const column = params.module === 'cameras' ? 'camera_canvas_mode' : 'fiber_canvas_mode'
  const { error } = await supabase
    .from('projects')
    .update({ [column]: params.mode })
    .eq('id', params.projectId)

  if (error) {
    console.error('Failed to set canvas mode:', error.message)
    return { error: error.message }
  }

  revalidatePath(`/projects/${params.projectId}/maps`)
  return { success: true }
}

export async function placeCameraOnPlan(params: {
  projectId: string
  floorPlanId: string
  planX: number
  planY: number
  cameraModelId?: string
}) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, params.projectId)
  if (!access.ok) return { error: access.error }

  let modelId = params.cameraModelId
  if (!modelId) {
    const { data: models } = await supabase.from('camera_models').select('id').limit(1)
    if (!models || models.length === 0) return { error: 'No camera models available' }
    modelId = models[0].id
  }

  const { count } = await supabase
    .from('camera_locations')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', params.projectId)

  const { data, error } = await supabase
    .from('camera_locations')
    .insert({
      project_id: params.projectId,
      camera_model_id: modelId,
      camera_id_tag: `CAM-${String((count ?? 0) + 1).padStart(3, '0')}`,
      // Coordenadas de mapa quedan en 0 — esta cámara vive en el plano, no en GPS.
      latitude: 0,
      longitude: 0,
      floor_plan_id: params.floorPlanId,
      plan_x: params.planX,
      plan_y: params.planY,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to place camera on plan:', error.message)
    return { error: error.message }
  }

  revalidatePath(`/projects/${params.projectId}/maps`)
  return { data }
}

export async function updateCameraPlanPosition(params: {
  cameraId: string
  projectId: string
  planX: number
  planY: number
}) {
  const supabase = await createClient()
  const access = await assertProjectAccess(supabase, params.projectId)
  if (!access.ok) return { error: access.error }

  const { error } = await supabase
    .from('camera_locations')
    .update({ plan_x: params.planX, plan_y: params.planY })
    .eq('id', params.cameraId)

  if (error) {
    console.error('Failed to update camera plan position:', error.message)
    return { error: error.message }
  }

  revalidatePath(`/projects/${params.projectId}/maps`)
  return { success: true }
}

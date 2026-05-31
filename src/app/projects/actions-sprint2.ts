'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'

type CameraLocationInsert = Database['public']['Tables']['camera_locations']['Insert']
type CameraLocationUpdate = Database['public']['Tables']['camera_locations']['Update']

export async function getCameraModels() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_models')
    .select('*')
    .order('manufacturer', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch camera models: ${error.message}`)
  }
  return data
}

export async function getCameraLocations(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_locations')
    .select('*')
    .eq('project_id', projectId)
    .order('camera_id_tag', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch camera locations: ${error.message}`)
  }
  return data
}

export async function createCameraLocation(params: {
  projectId: string
  latitude: number
  longitude: number
  cameraModelId?: string
}) {
  const supabase = await createClient()

  // 1. Get first available camera model if none specified
  let modelId = params.cameraModelId
  if (!modelId) {
    const { data: models, error: modelError } = await supabase
      .from('camera_models')
      .select('id')
      .limit(1)

    if (modelError || !models || models.length === 0) {
      return { error: 'No camera models available in database to assign.' }
    }
    modelId = models[0].id
  }

  // 2. Fetch existing camera tags to calculate the next CAM-xxx tag
  const { data: existingLocations, error: locError } = await supabase
    .from('camera_locations')
    .select('camera_id_tag')
    .eq('project_id', params.projectId)

  if (locError) {
    return { error: `Failed to fetch existing locations: ${locError.message}` }
  }

  let nextNum = 1
  if (existingLocations && existingLocations.length > 0) {
    const regex = /^CAM-(\d+)$/i
    let maxNum = 0
    for (const loc of existingLocations) {
      const match = loc.camera_id_tag.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) {
          maxNum = num
        }
      }
    }
    nextNum = maxNum + 1
  }

  const nextTag = `CAM-${String(nextNum).padStart(3, '0')}`

  // 3. Insert the new camera location with defaults
  const newCamera: CameraLocationInsert = {
    project_id: params.projectId,
    camera_id_tag: nextTag,
    latitude: params.latitude,
    longitude: params.longitude,
    camera_model_id: modelId,
    status: 'planned',
    communication_type: 'copper',
    power_type: 'poe',
  }

  const { data, error } = await supabase
    .from('camera_locations')
    .insert(newCamera)
    .select()
    .single()

  if (error) {
    return { error: `Failed to create camera location: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function updateCameraCoordinates(params: {
  id: string
  projectId: string
  latitude: number
  longitude: number
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('camera_locations')
    .update({
      latitude: params.latitude,
      longitude: params.longitude,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update coordinates: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function updateCameraDetails(params: {
  id: string
  projectId: string
  details: {
    camera_id_tag: string
    camera_model_id: string
    status: Database['public']['Enums']['camera_status']
    communication_type: Database['public']['Enums']['comm_type']
    power_type: Database['public']['Enums']['power_type']
    address_reference: string | null
    structure_reference: string | null
    notes: string | null
  }
}) {
  const supabase = await createClient()

  // Check unique camera_id_tag within project (except current camera)
  const { data: duplicate, error: checkError } = await supabase
    .from('camera_locations')
    .select('id')
    .eq('project_id', params.projectId)
    .eq('camera_id_tag', params.details.camera_id_tag)
    .neq('id', params.id)
    .limit(1)

  if (checkError) {
    return { error: `Database error during validation: ${checkError.message}` }
  }

  if (duplicate && duplicate.length > 0) {
    return { error: `Tag "${params.details.camera_id_tag}" is already in use by another camera in this project.` }
  }

  const { data, error } = await supabase
    .from('camera_locations')
    .update({
      camera_id_tag: params.details.camera_id_tag,
      camera_model_id: params.details.camera_model_id,
      status: params.details.status,
      communication_type: params.details.communication_type,
      power_type: params.details.power_type,
      address_reference: params.details.address_reference,
      structure_reference: params.details.structure_reference,
      notes: params.details.notes,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update camera details: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

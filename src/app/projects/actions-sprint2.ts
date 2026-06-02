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

export async function deleteCameraLocation(params: {
  id: string
  projectId: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('camera_locations')
    .delete()
    .eq('id', params.id)

  if (error) {
    return { error: `Failed to delete camera: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true }
}

export async function getCameraTasks(cameraId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_tasks')
    .select('*')
    .eq('camera_id', cameraId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch camera tasks: ${error.message}`)
  }
  return data
}

export async function getCameraTaskHistory(cameraId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_task_history')
    .select('*')
    .eq('camera_id', cameraId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch camera task history: ${error.message}`)
  }
  return data
}

export async function createCameraTask(params: {
  projectId: string
  cameraId: string
  title: string
  taskType: string
  priority: string
  dueDate?: string | null
}) {
  const supabase = await createClient()
  
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', params.projectId)
    .single()

  if (projError || !project) {
    return { error: `Failed to resolve organization: ${projError?.message || 'Project not found'}` }
  }

  const { data, error } = await supabase
    .from('camera_tasks')
    .insert({
      project_id: params.projectId,
      organization_id: project.organization_id,
      camera_id: params.cameraId,
      title: params.title,
      task_type: params.taskType,
      priority: params.priority,
      due_date: params.dueDate || null,
      status: 'Not Started'
    })
    .select()
    .single()

  if (error) {
    return { error: `Failed to create task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function updateCameraTaskStatus(params: {
  projectId: string
  taskId: string
  status?: string
  notes?: string | null
  priority?: string
  assignedTo?: string | null
  dueDate?: string | null
}) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('camera_tasks')
    .update({
      status: params.status !== undefined ? params.status : undefined,
      notes: params.notes !== undefined ? params.notes : undefined,
      priority: params.priority,
      assigned_to: params.assignedTo !== undefined ? params.assignedTo : undefined,
      due_date: params.dueDate !== undefined ? params.dueDate : undefined
    })
    .eq('id', params.taskId)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function deleteCameraTask(params: {
  projectId: string
  taskId: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('camera_tasks')
    .delete()
    .eq('id', params.taskId)

  if (error) {
    return { error: `Failed to delete task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true }
}

export async function generateScopeTemplateTasks(params: {
  projectId: string
  cameraId: string
  communicationType: string
}) {
  const supabase = await createClient()

  // Fetch organization_id from project
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', params.projectId)
    .single()

  if (!project) {
    return { error: 'Failed to resolve organization: Project not found' }
  }

  // 1. Define checklists based on communication type
  let templates: { title: string; taskType: string; templateKey: string }[] = []

  const comm = (params.communicationType || '').toLowerCase()

  if (comm === 'copper') {
    templates = [
      { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'copper_verify_location' },
      { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'copper_install_mount' },
      { title: 'Pull Cat6 cable', taskType: 'Cabling', templateKey: 'copper_pull_cat6' },
      { title: 'Terminate cable', taskType: 'Cabling', templateKey: 'copper_terminate_cable' },
      { title: 'Label cable', taskType: 'Documentation', templateKey: 'copper_label_cable' },
      { title: 'Connect to switch', taskType: 'Switch Assignment', templateKey: 'copper_connect_switch' },
      { title: 'Assign switch port', taskType: 'Switch Assignment', templateKey: 'copper_assign_port' },
      { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'copper_configure_ip' },
      { title: 'Configure camera credentials', taskType: 'Configuration', templateKey: 'copper_configure_credentials' },
      { title: 'Aim and focus camera', taskType: 'Configuration', templateKey: 'copper_aim_focus' },
      { title: 'Verify live video', taskType: 'Testing', templateKey: 'copper_verify_video' },
      { title: 'Verify recording', taskType: 'Testing', templateKey: 'copper_verify_recording' },
      { title: 'Take completion photos', taskType: 'Photos', templateKey: 'copper_completion_photos' },
      { title: 'Mark camera as tested', taskType: 'Closeout', templateKey: 'copper_mark_tested' }
    ]
  } else if (comm === 'fiber') {
    templates = [
      { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'fiber_verify_location' },
      { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'fiber_install_mount' },
      { title: 'Install fiber drop', taskType: 'Fiber', templateKey: 'fiber_install_drop' },
      { title: 'Install enclosure if required', taskType: 'Fiber', templateKey: 'fiber_install_enclosure' },
      { title: 'Splice fiber', taskType: 'Fiber', templateKey: 'fiber_splice_fiber' },
      { title: 'Test fiber', taskType: 'Testing', templateKey: 'fiber_test_fiber' },
      { title: 'Install media converter or fiber switch', taskType: 'Power', templateKey: 'fiber_install_converter' },
      { title: 'Connect camera', taskType: 'Cabling', templateKey: 'fiber_connect_camera' },
      { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'fiber_configure_ip' },
      { title: 'Verify live video', taskType: 'Testing', templateKey: 'fiber_verify_video' },
      { title: 'Upload fiber test results', taskType: 'Documentation', templateKey: 'fiber_upload_results' },
      { title: 'Take completion photos', taskType: 'Photos', templateKey: 'fiber_completion_photos' },
      { title: 'Mark camera as tested', taskType: 'Closeout', templateKey: 'fiber_mark_tested' }
    ]
  } else if (comm === 'wireless') {
    templates = [
      { title: 'Verify line of sight', taskType: 'Site Survey', templateKey: 'wireless_verify_los' },
      { title: 'Install wireless radio', taskType: 'Wireless', templateKey: 'wireless_install_radio' },
      { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'wireless_install_mount' },
      { title: 'Align antenna', taskType: 'Wireless', templateKey: 'wireless_align_antenna' },
      { title: 'Configure wireless bridge', taskType: 'Wireless', templateKey: 'wireless_configure_bridge' },
      { title: 'Test RSSI / signal level', taskType: 'Testing', templateKey: 'wireless_test_rssi' },
      { title: 'Test throughput', taskType: 'Testing', templateKey: 'wireless_test_throughput' },
      { title: 'Connect camera to network', taskType: 'Cabling', templateKey: 'wireless_connect_network' },
      { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'wireless_configure_ip' },
      { title: 'Verify live video', taskType: 'Testing', templateKey: 'wireless_verify_video' },
      { title: 'Take completion photos', taskType: 'Photos', templateKey: 'wireless_completion_photos' },
      { title: 'Mark wireless link as pending field survey or complete', taskType: 'Closeout', templateKey: 'wireless_mark_closeout' }
    ]
  } else {
    // default/existing
    templates = [
      { title: 'Verify network source', taskType: 'Site Survey', templateKey: 'existing_verify_source' },
      { title: 'Confirm available switch port', taskType: 'Switch Assignment', templateKey: 'existing_confirm_port' },
      { title: 'Confirm VLAN/network access', taskType: 'Configuration', templateKey: 'existing_confirm_vlan' },
      { title: 'Connect camera', taskType: 'Cabling', templateKey: 'existing_connect_camera' },
      { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'existing_configure_ip' },
      { title: 'Verify live video', taskType: 'Testing', templateKey: 'existing_verify_video' },
      { title: 'Verify recording', taskType: 'Testing', templateKey: 'existing_verify_recording' },
      { title: 'Take completion photos', taskType: 'Photos', templateKey: 'existing_completion_photos' }
    ]
  }

  // 2. Perform bulk insertion
  const insertRows = templates.map(t => ({
    project_id: params.projectId,
    organization_id: project.organization_id,
    camera_id: params.cameraId,
    title: t.title,
    task_type: t.taskType,
    template_key: t.templateKey,
    status: 'Not Started',
    priority: 'Medium'
  }))

  const { data, error } = await supabase
    .from('camera_tasks')
    .insert(insertRows)
    .select()

  if (error) {
    if (error.code === '23505') {
      return { success: true, message: 'Checklist already initialized.' }
    }
    return { error: `Failed to generate template tasks: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function createFieldTask(params: {
  projectId: string
  title: string
  description?: string | null
  status: string
}) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('field_tasks')
    .insert({
      project_id: params.projectId,
      title: params.title,
      description: params.description || null,
      status: params.status as any
    })
    .select()
    .single()

  if (error) {
    return { error: `Failed to create field task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/tasks`)
  return { success: true, data }
}

export async function updateFieldTask(params: {
  projectId: string
  taskId: string
  title: string
  description?: string | null
  status: string
  assignedTo?: string | null
  dueDate?: string | null
}) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('field_tasks')
    .update({
      title: params.title,
      description: params.description || null,
      status: params.status as any,
      assigned_to: params.assignedTo || null,
      due_date: params.dueDate || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.taskId)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update field task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/tasks`)
  return { success: true, data }
}

export async function deleteFieldTask(params: {
  projectId: string
  taskId: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('field_tasks')
    .delete()
    .eq('id', params.taskId)

  if (error) {
    return { error: `Failed to delete field task: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/tasks`)
  return { success: true }
}

export async function getProjectCameraTasks(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_tasks')
    .select('*')
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to fetch project camera tasks: ${error.message}`)
  }
  return data
}

export async function getFieldTasksWithCamera(projectId: string) {
  const supabase = await createClient()
  
  // Fetch all field tasks for this project
  const { data: fieldTasks, error: ftError } = await supabase
    .from('field_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (ftError) {
    throw new Error(`Failed to fetch field tasks: ${ftError.message}`)
  }

  // Fetch all camera tasks for this project to map camera tags
  const { data: cameraTasks, error: ctError } = await supabase
    .from('camera_tasks')
    .select('project_task_id, camera_id, title, status, priority, camera_locations(camera_id_tag)')
    .eq('project_id', projectId)

  if (ctError) {
    throw new Error(`Failed to fetch camera tasks for mapping: ${ctError.message}`)
  }

  // Create a map from project_task_id to camera details
  const cameraMap = new Map<string, { camera_id_tag: string; camera_id: string }>()
  for (const ct of cameraTasks || []) {
    if (ct.project_task_id) {
      const tag = (ct.camera_locations as any)?.camera_id_tag || 'CAM-???'
      cameraMap.set(ct.project_task_id, {
        camera_id_tag: tag,
        camera_id: ct.camera_id
      })
    }
  }

  // Combine them
  const combined = (fieldTasks || []).map(ft => {
    const camera = cameraMap.get(ft.id) || null
    return {
      ...ft,
      camera
    }
  })

  return combined
}

export async function getProfiles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`)
  }
  return data
}


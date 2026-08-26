'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_CAMERAS, DEMO_TASKS } from '@/lib/demoData'

type CameraLocationInsert = Database['public']['Tables']['camera_locations']['Insert']
type CameraLocationUpdate = Database['public']['Tables']['camera_locations']['Update']

export async function getCameraModels() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camera_models')
    .select('*')
    .order('manufacturer', { ascending: true })

  if (error) {
    console.error('Failed to fetch camera models:', error)
    return []
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

  if (projectId === 'demo-metro-cctv' && (error || !data || data.length === 0)) {
    return DEMO_CAMERAS as any
  }
  return data ?? []
}

export async function createCameraLocation(params: {
  projectId: string
  latitude: number
  longitude: number
  cameraModelId?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', params.projectId)
    .single()

  if (projError || !project) {
    return { error: `Failed to resolve organization: ${projError?.message || 'Project not found'}` }
  }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Fetch organization_id from project
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', params.projectId)
    .single()

  if (!project) {
    return { error: 'Failed to resolve organization: Project not found' }
  }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  // 1. Define checklists based on communication type
  let templates: { title: string; taskType: string; templateKey: string }[] = []

  const comm = (params.communicationType || '').toLowerCase()

  if (comm === 'copper') {
    templates = [
      { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'copper_verify_location' },
      { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'copper_install_mount' },
      { title: 'Pull Cat6 cable', taskType: 'Cabling', templateKey: 'copper_pull_cat6' },
      { title: 'Terminate Cat6', taskType: 'Cabling', templateKey: 'copper_terminate_cat6' },
      { title: 'Label Cat6', taskType: 'Documentation', templateKey: 'copper_label_cat6' },
      { title: 'Connect to switch', taskType: 'Switch Assignment', templateKey: 'copper_connect_switch' },
      { title: 'Assign switch port', taskType: 'Switch Assignment', templateKey: 'copper_assign_port' },
      { title: 'Verify PoE', taskType: 'Power', templateKey: 'copper_verify_poe' },
      { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'copper_configure_ip' },
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
      { title: 'Install media converter or fiber switch', taskType: 'Power', templateKey: 'fiber_install_converter_switch' },
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
      { title: 'Confirm mounting height', taskType: 'Site Survey', templateKey: 'wireless_confirm_height' },
      { title: 'Install wireless radio placeholder', taskType: 'Wireless', templateKey: 'wireless_install_radio' },
      { title: 'Assign wireless source/destination placeholder', taskType: 'Wireless', templateKey: 'wireless_assign_endpoints' },
      { title: 'Field survey required', taskType: 'Site Survey', templateKey: 'wireless_field_survey' },
      { title: 'Verify wireless path design later', taskType: 'Wireless', templateKey: 'wireless_verify_path' }
    ]
  } else if (comm === 'existing') {
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
  } else {
    // Unknown/TBD
    templates = [
      { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'unknown_verify_location' },
      { title: 'Complete field survey', taskType: 'Site Survey', templateKey: 'unknown_field_survey' },
      { title: 'Confirm connectivity method', taskType: 'Site Survey', templateKey: 'unknown_confirm_connectivity' },
      { title: 'Confirm power source', taskType: 'Site Survey', templateKey: 'unknown_confirm_power' },
      { title: 'Confirm network source', taskType: 'Site Survey', templateKey: 'unknown_confirm_network' }
    ]
  }

  // Fetch existing tasks to prevent duplicates
  const { data: existingTasks } = await supabase
    .from('camera_tasks')
    .select('template_key')
    .eq('camera_id', params.cameraId)

  const existingKeys = new Set((existingTasks || []).map(t => t.template_key).filter(Boolean))

  // Filter templates to only insert missing ones
  const missingTemplates = templates.filter(t => !existingKeys.has(t.templateKey))

  if (missingTemplates.length === 0) {
    return { success: true, message: 'Checklist already initialized.', data: [] }
  }

  // 2. Perform bulk insertion
  const insertRows = missingTemplates.map(t => ({
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
      return { success: true, message: 'Checklist already initialized.', data: [] }
    }
    return { error: `Failed to generate template tasks: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

export async function generateMissingProjectChecklists(projectId: string, dryRun: boolean) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if ((authError || !user) && !BYPASS_AUTH) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const startTime = Date.now()

  // 2. Fetch project details to verify existence and get organization_id
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .single()

  if (projError || !project) {
    return { error: `Project not found or access denied: ${projError?.message || ''}` }
  }

  // 3. Verify user belongs to project's organization
  const { data: orgMember, error: orgError } = await supabase
    .from('organization_members')
    .select('profile_id')
    .eq('organization_id', project.organization_id)
    .eq('profile_id', user.id)
    .limit(1)
    .single()

  if (orgError || !orgMember) {
    return { error: 'Unauthorized. You do not have access to this project\'s organization.' }
  }

  // 4. Fetch all camera locations for the project
  const { data: cameras, error: camError } = await supabase
    .from('camera_locations')
    .select('id, camera_id_tag, status, communication_type')
    .eq('project_id', projectId)

  if (camError || !cameras) {
    return { error: `Failed to fetch cameras: ${camError?.message || ''}` }
  }

  // 5. Fetch all existing camera tasks for the project
  const { data: existingCameraTasks, error: taskError } = await supabase
    .from('camera_tasks')
    .select('id, camera_id, template_key, project_task_id, title, status, notes, assigned_to, due_date')
    .eq('project_id', projectId)

  if (taskError) {
    return { error: `Failed to fetch existing tasks: ${taskError.message}` }
  }

  // Map camera tasks by camera_id
  const cameraTaskMap = new Map<string, any[]>()
  for (const t of existingCameraTasks || []) {
    const list = cameraTaskMap.get(t.camera_id) || []
    list.push(t)
    cameraTaskMap.set(t.camera_id, list)
  }

  // Fetch all field tasks for the project for matching duplicate checks
  const { data: fieldTasks, error: ftError } = await supabase
    .from('field_tasks')
    .select('id, title, status, description, assigned_to, due_date')
    .eq('project_id', projectId)

  if (ftError) {
    return { error: `Failed to fetch project field tasks: ${ftError.message}` }
  }

  // Parser helper
  function parseFieldTaskTitle(title: string) {
    const regex = /^\[([^\]]+)\](?:\[([^\]]+)\])?\s*(.*)$/i
    const m = title.match(regex)
    if (m) {
      const camTag = m[1].toUpperCase()
      const isStatusPrefix = m[2] !== undefined
      const cleanTitle = (isStatusPrefix ? m[3] : (m[2] || m[3] || '')).trim()
      const statusPrefix = isStatusPrefix ? m[2].trim() : null
      return { camTag, cleanTitle, statusPrefix }
    }
    return null
  }

  // Parse all field tasks into a searchable structure
  const parsedFieldTasks = (fieldTasks || []).map(ft => {
    const parsed = parseFieldTaskTitle(ft.title)
    return {
      id: ft.id,
      title: ft.title,
      status: ft.status,
      parsed
    }
  })

  // Track results
  let camerasScanned = cameras.length
  let camerasMissingChecklists = 0
  let existingTasksFound = existingCameraTasks ? existingCameraTasks.length : 0
  let tasksToCreate: any[] = []
  let tasksSkipped = 0
  let syncRepairsRequired: any[] = []
  let estimatedProjectTasksAdded = 0
  let syncRepaired = 0
  let errors: string[] = []

  // Loop through cameras to identify missing tasks and unlinked tasks
  for (const cam of cameras) {
    // 1. Determine templates list based on comm_type
    let templates: { title: string; taskType: string; templateKey: string }[] = []
    const comm = (cam.communication_type || '').toLowerCase()

    if (comm === 'copper') {
      templates = [
        { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'copper_verify_location' },
        { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'copper_install_mount' },
        { title: 'Pull Cat6 cable', taskType: 'Cabling', templateKey: 'copper_pull_cat6' },
        { title: 'Terminate Cat6', taskType: 'Cabling', templateKey: 'copper_terminate_cat6' },
        { title: 'Label Cat6', taskType: 'Documentation', templateKey: 'copper_label_cat6' },
        { title: 'Connect to switch', taskType: 'Switch Assignment', templateKey: 'copper_connect_switch' },
        { title: 'Assign switch port', taskType: 'Switch Assignment', templateKey: 'copper_assign_port' },
        { title: 'Verify PoE', taskType: 'Power', templateKey: 'copper_verify_poe' },
        { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'copper_configure_ip' },
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
        { title: 'Install media converter or fiber switch', taskType: 'Power', templateKey: 'fiber_install_converter_switch' },
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
        { title: 'Confirm mounting height', taskType: 'Site Survey', templateKey: 'wireless_confirm_height' },
        { title: 'Install wireless radio placeholder', taskType: 'Wireless', templateKey: 'wireless_install_radio' },
        { title: 'Assign wireless source/destination placeholder', taskType: 'Wireless', templateKey: 'wireless_assign_endpoints' },
        { title: 'Field survey required', taskType: 'Site Survey', templateKey: 'wireless_field_survey' },
        { title: 'Verify wireless path design later', taskType: 'Wireless', templateKey: 'wireless_verify_path' }
      ]
    } else if (comm === 'existing') {
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
    } else {
      templates = [
        { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'unknown_verify_location' },
        { title: 'Complete field survey', taskType: 'Site Survey', templateKey: 'unknown_field_survey' },
        { title: 'Confirm connectivity method', taskType: 'Site Survey', templateKey: 'unknown_confirm_connectivity' },
        { title: 'Confirm power source', taskType: 'Site Survey', templateKey: 'unknown_confirm_power' },
        { title: 'Confirm network source', taskType: 'Site Survey', templateKey: 'unknown_confirm_network' }
      ]
    }

    const currentTasks = cameraTaskMap.get(cam.id) || []
    if (currentTasks.length === 0) {
      camerasMissingChecklists++
    }

    const existingKeys = new Set(currentTasks.map(t => t.template_key).filter(Boolean))

    // Determine missing template tasks
    const missing = templates.filter(t => !existingKeys.has(t.templateKey))
    tasksSkipped += templates.length - missing.length

    for (const m of missing) {
      tasksToCreate.push({
        project_id: projectId,
        organization_id: project.organization_id,
        camera_id: cam.id,
        title: m.title,
        task_type: m.taskType,
        template_key: m.templateKey,
        status: 'Not Started',
        priority: 'Medium'
      })
      estimatedProjectTasksAdded++
    }

    // Identify current tasks missing sync
    const unlinked = currentTasks.filter(t => t.project_task_id === null)
    for (const t of unlinked) {
      // Clean title
      const cleanTitle = t.title.replace(/^(\[[^\]]+\]\s*)+/, '').trim()
      
      // Determine mapped status
      let v_task_status: 'pending' | 'in_progress' | 'completed' | 'blocked' = 'pending'
      if (t.status === 'In Progress') {
        v_task_status = 'in_progress'
      } else if (t.status === 'Blocked') {
        v_task_status = 'blocked'
      } else if (t.status === 'Complete') {
        v_task_status = 'completed'
      }

      // Check if a matching field_task exists in project
      const match = parsedFieldTasks.find(p => 
        p.status === v_task_status &&
        p.parsed &&
        p.parsed.camTag === cam.camera_id_tag.toUpperCase() &&
        p.parsed.cleanTitle.toLowerCase() === cleanTitle.toLowerCase()
      )

      syncRepairsRequired.push({
        cameraTask: t,
        cameraTag: cam.camera_id_tag,
        cleanTitle,
        mappedStatus: v_task_status,
        matchedFieldTaskId: match ? match.id : null
      })

      if (!match) {
        estimatedProjectTasksAdded++
      }
    }
  }

  // If dryRun is true, we just return the counts
  if (dryRun) {
    const duration_ms = Date.now() - startTime
    return {
      success: true,
      dryRun: true,
      cameras_scanned: camerasScanned,
      cameras_missing_checklists: camerasMissingChecklists,
      existing_tasks_found: existingTasksFound,
      tasks_to_create: tasksToCreate.length,
      tasks_skipped: tasksSkipped,
      sync_repairs_required: syncRepairsRequired.length,
      estimated_project_tasks_added: estimatedProjectTasksAdded,
      sync_repaired: 0,
      errors: [],
      duration_ms
    }
  }

  // Execution Phase (dryRun = false)
  let tasksCreatedCount = 0

  // 1. Create missing checklist tasks
  if (tasksToCreate.length > 0) {
    const { error: insErr } = await supabase
      .from('camera_tasks')
      .insert(tasksToCreate)

    if (insErr) {
      errors.push(`Failed to insert camera tasks: ${insErr.message}`)
    } else {
      tasksCreatedCount = tasksToCreate.length
    }
  }

  // 2. Perform sync repairs
  for (const repair of syncRepairsRequired) {
    const t = repair.cameraTask
    const camTag = repair.cameraTag
    const cleanTitle = repair.cleanTitle
    const v_task_status = repair.mappedStatus

    if (repair.matchedFieldTaskId) {
      // Link existing field task
      const { error: updErr } = await supabase
        .from('camera_tasks')
        .update({ project_task_id: repair.matchedFieldTaskId })
        .eq('id', t.id)

      if (updErr) {
        errors.push(`Failed to link camera task ${t.id} to field task ${repair.matchedFieldTaskId}: ${updErr.message}`)
      } else {
        syncRepaired++
      }
    } else {
      // Create a new field task
      // Construct title formatted as [CAM-XXX] Title or [CAM-XXX][Status] Title
      let v_title = `[${camTag}] ${cleanTitle}`
      if (t.status === 'Failed QA') {
        v_title = `[${camTag}][Failed QA] ${cleanTitle}`
      } else if (t.status === 'Needs Rework') {
        v_title = `[${camTag}][Needs Rework] ${cleanTitle}`
      } else if (t.status === 'Cancelled') {
        v_title = `[${camTag}][Cancelled] ${cleanTitle}`
      }

      const { data: ft, error: ftErr } = await supabase
        .from('field_tasks')
        .insert({
          project_id: projectId,
          title: v_title,
          description: t.notes,
          status: v_task_status,
          assigned_to: t.assigned_to,
          due_date: t.due_date
        })
        .select('id')
        .single()

      if (ftErr || !ft) {
        errors.push(`Failed to create new field task for camera task ${t.id}: ${ftErr?.message || ''}`)
      } else {
        // Link it back
        const { error: linkErr } = await supabase
          .from('camera_tasks')
          .update({ project_task_id: ft.id })
          .eq('id', t.id)

        if (linkErr) {
          errors.push(`Failed to link camera task ${t.id} to new field task ${ft.id}: ${linkErr.message}`)
        } else {
          syncRepaired++
        }
      }
    }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/tasks`)

  const duration_ms = Date.now() - startTime

  return {
    success: true,
    dryRun: false,
    cameras_scanned: camerasScanned,
    cameras_missing_checklists: camerasMissingChecklists,
    existing_tasks_found: existingTasksFound,
    tasks_created: tasksCreatedCount,
    tasks_skipped: tasksSkipped,
    sync_repairs_required: syncRepairsRequired.length,
    sync_repaired: syncRepaired,
    errors,
    duration_ms
  }
}

export async function createFieldTask(params: {
  projectId: string
  title: string
  description?: string | null
  status: string
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', params.projectId).single()
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

  if (projectId === 'demo-metro-cctv' && (ftError || !fieldTasks || fieldTasks.length === 0)) {
    return DEMO_TASKS as any
  }

  // Fetch all camera tasks for this project to map camera tags
  const { data: cameraTasks } = await supabase
    .from('camera_tasks')
    .select('project_task_id, camera_id, title, status, priority, camera_locations(camera_id_tag)')
    .eq('project_id', projectId)

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

export async function updateThemePreference(theme: string) {
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
    return { error: 'Invalid theme preference value.' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ theme_preference: theme })
    .eq('id', user.id)

  if (error) {
    return { error: `Failed to update theme preference: ${error.message}` }
  }

  return { success: true }
}

export async function getThemePreference() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return 'system'
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('theme_preference')
      .eq('id', user.id)
      .single()

    if (error || !data || !data.theme_preference) {
      return 'system'
    }

    return data.theme_preference as 'light' | 'dark' | 'system'
  } catch (err) {
    console.error('Error fetching theme preference:', err)
    return 'system'
  }
}



'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'
import { DEMO_DEVICES } from '@/lib/demoData'
import { BYPASS_AUTH } from '@/config/auth'

type NetworkDeviceInsert = Database['public']['Tables']['network_devices']['Insert']
type NetworkDeviceUpdate = Database['public']['Tables']['network_devices']['Update']
type SwitchPortInsert = Database['public']['Tables']['switch_ports']['Insert']

// Fetch all network devices for a project
export async function getNetworkDevices(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', projectId).single()
  if (!project && projectId !== 'demo-metro-cctv') return { error: 'Project not found' }

  if (user && project) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { data, error } = await supabase
    .from('network_devices')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  if (projectId === 'demo-metro-cctv' && (error || !data || data.length === 0)) {
    return DEMO_DEVICES as any
  }
  return data ?? []
}

// Fetch all switch ports for a network device, with assigned camera details
export async function getSwitchPorts(networkDeviceId: string) {
  const supabase = await createClient()

  const { data: dev } = await supabase.from('network_devices').select('project_id').eq('id', networkDeviceId).single()
  if (!dev) throw new Error('Network device not found')

  const projectId = dev.project_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) throw new Error('Not authenticated')

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', projectId).single()
  if (!project) throw new Error('Project not found')

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) throw new Error('Access denied')
  }

  const { data, error } = await supabase
    .from('switch_ports')
    .select(`
      *,
      assigned_camera:camera_locations(
        id,
        camera_id_tag,
        status,
        camera_models(
          id,
          manufacturer,
          model_number,
          default_poe_draw
        )
      )
    `)
    .eq('network_device_id', networkDeviceId)
    .order('port_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch switch ports: ${error.message}`)
  }
  return data
}

// Create a network device and auto-generate switch ports if it is a switch
export async function createNetworkDevice(params: {
  projectId: string
  deviceType: Database['public']['Enums']['device_type']
  name?: string
  manufacturer?: string
  modelNumber?: string
  totalPorts?: number
  poeBudgetWatts?: number
  latitude?: number
  longitude?: number
  locationReference?: string
  ipAddress?: string
  rackUnit?: string
  cabinetId?: string | null
  status?: string
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

  // 1. Generate name sequence if not provided
  let name = params.name
  if (!name) {
    const { data: existing, error: countError } = await supabase
      .from('network_devices')
      .select('name')
      .eq('project_id', params.projectId)
      .eq('device_type', params.deviceType)

    if (countError) {
      return { error: `Failed to count existing devices: ${countError.message}` }
    }

    let prefix = 'DEV'
    if (params.deviceType === 'switch' || params.deviceType === 'Industrial Switch') prefix = 'SW'
    else if (params.deviceType === 'nvr') prefix = 'NVR'
    else if (params.deviceType === 'router') prefix = 'RTR'
    else if (params.deviceType === 'UPS') prefix = 'UPS'
    else if (params.deviceType === 'Media Converter') prefix = 'MC'
    else if (params.deviceType === 'Wireless Radio') prefix = 'RAD'

    let maxNum = 0
    const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i')
    existing.forEach(d => {
      const match = d.name.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    name = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`
  }

  // 2. Set default parameters for switch ports
  const isSwitch = params.deviceType === 'switch' || params.deviceType === 'Industrial Switch'
  const totalPorts = params.totalPorts || (isSwitch ? 8 : null)
  const poeBudgetWatts = params.poeBudgetWatts !== undefined ? params.poeBudgetWatts : (isSwitch ? 120 : 0)

  // 3. Insert device
  const newDevice: any = {
    project_id: params.projectId,
    name,
    device_type: params.deviceType,
    manufacturer: params.manufacturer || null,
    model_number: params.modelNumber || null,
    total_ports: totalPorts,
    poe_budget_watts: poeBudgetWatts,
    latitude: params.latitude !== undefined ? params.latitude : null,
    longitude: params.longitude !== undefined ? params.longitude : null,
    location_reference: params.locationReference || null,
    ip_address: params.ipAddress || null,
    rack_unit: params.rackUnit || null,
    cabinet_id: params.cabinetId === '' ? null : params.cabinetId,
    status: params.status || 'Planned',
  }

  const { data: device, error: insertError } = await supabase
    .from('network_devices')
    .insert(newDevice)
    .select()
    .single()

  if (insertError) {
    return { error: `Failed to create network device: ${insertError.message}` }
  }

  // 4. If device is a switch, generate ports automatically
  if (isSwitch && totalPorts && totalPorts > 0) {
    const ports: SwitchPortInsert[] = []
    for (let i = 1; i <= totalPorts; i++) {
      // Determine if port should be SFP or RJ45 (e.g. ports 7 and 8 are SFP for 8-port switches)
      const isSfpPort = totalPorts >= 4 && i >= totalPorts - 1
      ports.push({
        network_device_id: device.id,
        port_number: i,
        port_name: isSfpPort ? `SFP Port ${i - (totalPorts - 2)}` : `Port ${i}`,
        port_type: isSfpPort ? 'sfp' : 'rj45',
        speed_mbps: isSfpPort ? 10000 : 1000,
        poe_budget_watts: isSfpPort ? 0 : 30,
        poe_enabled: !isSfpPort,
        vlan_id: 1,
        status: 'down',
        assigned_device_type: 'unassigned',
        assigned_camera_location_id: null,
      })
    }

    const { error: portsError } = await supabase
      .from('switch_ports')
      .insert(ports)

    if (portsError) {
      return { error: `Device created, but failed to generate switch ports: ${portsError.message}` }
    }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/network`)
  return { success: true, data: device }
}

// Update coordinates on drag-and-drop
export async function updateNetworkDeviceCoordinates(params: {
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
    .from('network_devices')
    .update({
      latitude: params.latitude,
      longitude: params.longitude,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update network coordinates: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true, data }
}

// Edit network device settings and handle port scale warnings
export async function updateNetworkDeviceDetails(params: {
  id: string
  projectId: string
  details: {
    name: string
    device_type: Database['public']['Enums']['device_type']
    manufacturer: string | null
    model_number: string | null
    total_ports: number | null
    poe_budget_watts: number
    location_reference: string | null
    ip_address: string | null
    rack_unit: string | null
    cabinet_id?: string | null
    status?: string
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

  // 1. Fetch current device
  const { data: current, error: fetchError } = await supabase
    .from('network_devices')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError) {
    return { error: `Failed to fetch device details: ${fetchError.message}` }
  }

  const oldTotal = current.total_ports || 0
  const newTotal = params.details.total_ports || 0
  const isSwitch = params.details.device_type === 'switch' || params.details.device_type === 'Industrial Switch'

  // 2. Port adjustment logic (only applicable if device type is a switch)
  if (isSwitch) {
    if (newTotal > oldTotal) {
      // Add missing ports
      const newPorts: SwitchPortInsert[] = []
      for (let i = oldTotal + 1; i <= newTotal; i++) {
        const isSfpPort = newTotal >= 4 && i >= newTotal - 1
        newPorts.push({
          network_device_id: params.id,
          port_number: i,
          port_name: isSfpPort ? `SFP Port ${i - (newTotal - 2)}` : `Port ${i}`,
          port_type: isSfpPort ? 'sfp' : 'rj45',
          speed_mbps: isSfpPort ? 10000 : 1000,
          poe_budget_watts: isSfpPort ? 0 : 30,
          poe_enabled: !isSfpPort,
          vlan_id: 1,
          status: 'down',
          assigned_device_type: 'unassigned',
          assigned_camera_location_id: null,
        })
      }

      const { error: insertPortsError } = await supabase
        .from('switch_ports')
        .insert(newPorts)

      if (insertPortsError) {
        return { error: `Failed to insert new ports: ${insertPortsError.message}` }
      }
    } else if (newTotal < oldTotal) {
      // Verify if any ports to be deleted have camera assignments
      const { data: assignedPorts, error: checkPortsError } = await supabase
        .from('switch_ports')
        .select('port_number')
        .eq('network_device_id', params.id)
        .gt('port_number', newTotal)
        .not('assigned_camera_location_id', 'is', null)

      if (checkPortsError) {
        return { error: `Failed to validate port scaling bounds: ${checkPortsError.message}` }
      }

      if (assignedPorts && assignedPorts.length > 0) {
        const portNums = assignedPorts.map(p => p.port_number).join(', ')
        return {
          error: `Cannot reduce ports to ${newTotal} because Port(s) [${portNums}] have active camera assignments. Please unassign them first.`
        }
      }

      // Delete unassigned excess ports
      const { error: deleteError } = await supabase
        .from('switch_ports')
        .delete()
        .eq('network_device_id', params.id)
        .gt('port_number', newTotal)

      if (deleteError) {
        return { error: `Failed to delete scale-down switch ports: ${deleteError.message}` }
      }
    }
  }

  // 3. Update network device
  const { data: updated, error: updateError } = await supabase
    .from('network_devices')
    .update({
      name: params.details.name,
      device_type: params.details.device_type,
      manufacturer: params.details.manufacturer,
      model_number: params.details.model_number,
      total_ports: isSwitch ? newTotal : null,
      poe_budget_watts: isSwitch ? params.details.poe_budget_watts : 0,
      location_reference: params.details.location_reference,
      ip_address: params.details.ip_address,
      rack_unit: params.details.rack_unit,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return { error: `Failed to update network device: ${updateError.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/network`)
  return { success: true, data: updated }
}

// Delete a network device (cascade deletes its ports in DB)
export async function deleteNetworkDevice(params: {
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

  // Verify if any ports are currently assigned to cameras (to prevent breaking assignments)
  const { data: assigned, error: checkError } = await supabase
    .from('switch_ports')
    .select('port_number')
    .eq('network_device_id', params.id)
    .not('assigned_camera_location_id', 'is', null)

  if (checkError) {
    return { error: `Failed to validate delete constraints: ${checkError.message}` }
  }

  if (assigned && assigned.length > 0) {
    return { error: 'Cannot delete device while ports have camera assignments. Please unassign them first.' }
  }

  const { error } = await supabase
    .from('network_devices')
    .delete()
    .eq('id', params.id)

  if (error) {
    return { error: `Failed to delete network device: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/network`)
  return { success: true }
}

// Transactional camera port assignment via Supabase RPC
export async function assignCameraToPort(params: {
  cameraLocationId: string
  switchPortId: string
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
  
  // Call transactional database function
  const { error } = await (supabase as any).rpc('assign_camera_to_switch_port', {
    camera_id: params.cameraLocationId,
    switch_port_id: params.switchPortId,
  })

  if (error) {
    return { error: `Assignment failed: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/network`)
  return { success: true }
}

// Transactional camera port unassignment via Supabase RPC
export async function unassignCameraFromPort(params: {
  cameraLocationId: string
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

  // Call transactional database function
  const { error } = await (supabase as any).rpc('unassign_camera_from_switch_port', {
    camera_id: params.cameraLocationId,
  })

  if (error) {
    return { error: `Unassignment failed: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/network`)
  return { success: true }
}

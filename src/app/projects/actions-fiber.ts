'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export type FiberNodeType =
  | 'Manhole'
  | 'Handhole'
  | 'Pull Box'
  | 'Cabinet'
  | 'Pole'
  | 'Building'
  | 'Existing Fiber Source'
  | 'Camera Location'
  | 'Custom'

export type FiberNodeStatus = 'Planned' | 'Existing' | 'Installed' | 'Blocked' | 'Needs Survey' | 'Removed'
export type FiberCableType = 'Backbone' | 'Drop' | 'Existing' | 'Spare' | 'Temporary' | 'Custom'
export type FiberInstallStatus = 'Planned' | 'Pulled' | 'Installed' | 'Blocked' | 'Damaged' | 'Removed'
export type FiberTestStatus = 'Not Tested' | 'Passed' | 'Failed' | 'Needs Retest'
export type FiberSpliceStatus = 'Not Spliced' | 'Spliced' | 'Failed' | 'Needs Rework'
export type FiberPathStatus =
  | 'Planned'
  | 'Fiber Pulled'
  | 'Splicing Pending'
  | 'Spliced'
  | 'Testing Pending'
  | 'Tested'
  | 'Connected'
  | 'Complete'
  | 'Blocked'
export type EnclosureType =
  | 'Splice Enclosure'
  | 'Patch Panel'
  | 'Cabinet Enclosure'
  | 'Wall Mount'
  | 'Underground Closure'
  | 'Custom'
export type StrandRole = 'TX' | 'RX' | 'Spare' | 'Data' | 'Custom'
export type InstallationType = 'underground' | 'aerial' | 'direct_buried'
export type RoutePurpose = 'camera_backbone' | 'camera_drop' | 'network_backbone' | 'power_monitoring' | 'spare'

// ─── Haversine helper ───────────────────────────────────────────────────────

function haversineDistanceFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 3.28084
}

// ─── 1. Get fiber design data ────────────────────────────────────────────────

export async function getFiberDesignData(projectId: string) {
  const supabase = await createClient()

  const [
    nodesRes,
    routesRes,
    segmentsRes,
    cablesRes,
    strandsRes,
    enclosuresRes,
    spliceRecordsRes,
    assignmentsRes,
    assignmentStrandsRes,
    camerasRes,
    catalogRes,
    cabinetsRes,
    fdusRes,
    fppsRes,
    patchCordsRes,
    switchPortsRes,
    networkDevicesRes,
  ] = await Promise.all([
    supabase.from('fiber_nodes').select('*').eq('project_id', projectId).order('node_tag'),
    supabase.from('fiber_routes').select('*').eq('project_id', projectId).order('route_id_tag'),
    supabase.from('fiber_route_segments').select('*').eq('project_id', projectId).order('segment_index'),
    supabase.from('fiber_cables').select('*').eq('project_id', projectId).order('cable_tag'),
    supabase.from('fiber_strands').select('*').eq('project_id', projectId).order('strand_number'),
    supabase.from('fiber_enclosures').select('*').eq('project_id', projectId).order('enclosure_tag'),
    supabase.from('fiber_splice_records').select('*').eq('project_id', projectId),
    supabase.from('camera_fiber_assignments').select('*').eq('project_id', projectId),
    supabase.from('camera_fiber_assignment_strands').select('*').eq('project_id', projectId),
    supabase.from('camera_locations').select('id, camera_id_tag, status, latitude, longitude, communication_type').eq('project_id', projectId).order('camera_id_tag'),
    supabase.from('fiber_catalog').select('*').order('manufacturer').order('fiber_count'),
    supabase.from('cabinets').select('*').eq('project_id', projectId).order('cabinet_tag'),
    supabase.from('fiber_distribution_units').select('*').eq('project_id', projectId).order('fdu_tag'),
    supabase.from('fiber_patch_panels').select('*').eq('project_id', projectId).order('fpp_tag'),
    supabase.from('fiber_patch_cords').select('*').eq('project_id', projectId).order('patch_cord_tag'),
    supabase.from('switch_ports').select('*, network_devices!inner(project_id)').eq('network_devices.project_id', projectId),
    supabase.from('network_devices').select('*').eq('project_id', projectId).order('name'),
  ])

  if (nodesRes.error) throw new Error(`Nodes: ${nodesRes.error.message}`)
  if (routesRes.error) throw new Error(`Routes: ${routesRes.error.message}`)

  return {
    nodes: nodesRes.data ?? [],
    routes: routesRes.data ?? [],
    segments: segmentsRes.data ?? [],
    cables: cablesRes.data ?? [],
    strands: strandsRes.data ?? [],
    enclosures: enclosuresRes.data ?? [],
    spliceRecords: spliceRecordsRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    assignmentStrands: assignmentStrandsRes.data ?? [],
    cameras: camerasRes.data ?? [],
    catalog: catalogRes.data ?? [],
    cabinets: cabinetsRes.data ?? [],
    fdus: fdusRes.data ?? [],
    fpps: fppsRes.data ?? [],
    patchCords: patchCordsRes.data ?? [],
    switchPorts: (switchPortsRes.data ?? []) as any[],
    networkDevices: networkDevicesRes.data ?? [],
  }
}

// ─── 2. Get fiber dashboard summary ─────────────────────────────────────────

export async function getFiberDashboardSummary(projectId: string) {
  const supabase = await createClient()

  const [totalCamerasRes, assignmentsRes, enclosuresRes, splicesRes] = await Promise.all([
    supabase.from('camera_locations').select('id, communication_type').eq('project_id', projectId),
    supabase.from('camera_fiber_assignments').select('id, fiber_path_status, test_status, splice_status').eq('project_id', projectId),
    supabase.from('fiber_enclosures').select('id, splice_count').eq('project_id', projectId),
    supabase.from('fiber_splice_records').select('id, splice_status, test_status').eq('project_id', projectId),
  ])

  const fiberCameras = (totalCamerasRes.data ?? []).filter(c => c.communication_type === 'fiber')
  const assignments = assignmentsRes.data ?? []
  const splices = splicesRes.data ?? []

  return {
    totalFiberCameras: fiberCameras.length,
    fiberDrops: assignments.length,
    splicedCount: splices.filter(s => s.splice_status === 'Spliced').length,
    testedPassed: splices.filter(s => s.test_status === 'Passed').length,
    blockedPaths: assignments.filter(a => a.fiber_path_status === 'Blocked').length,
    completedPaths: assignments.filter(a => a.fiber_path_status === 'Complete').length,
    totalSplices: splices.length,
    totalEnclosures: (enclosuresRes.data ?? []).length,
  }
}

// ─── 3. Create fiber node ────────────────────────────────────────────────────

export async function createFiberNode(params: {
  projectId: string
  nodeTag: string
  nodeType: FiberNodeType
  latitude: number
  longitude: number
  address?: string
  status?: FiberNodeStatus
  elevationFt?: number
  structureDepthFt?: number
  sizeDescription?: string
  slackLoopFt?: number
  notes?: string
}) {
  const supabase = await createClient()

  const defaultSlack =
    params.nodeType === 'Handhole' || params.nodeType === 'Cabinet' ? 20.0
    : params.nodeType === 'Building' ? 10.0
    : 0.0

  const { data: newNode, error: nodeErr } = await supabase
    .from('fiber_nodes')
    .insert({
      project_id: params.projectId,
      // organization_id filled by trigger
      organization_id: '', // placeholder — trigger will override via set_fiber_organization_id_from_project
      node_tag: params.nodeTag,
      node_type: params.nodeType,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      status: params.status ?? 'Planned',
      elevation_ft: params.elevationFt ?? 0.0,
      structure_depth_ft: params.structureDepthFt ?? 0.0,
      size_description: params.sizeDescription ?? '24x36x36',
      slack_loop_ft: params.slackLoopFt ?? defaultSlack,
      notes: params.notes,
    })
    .select()
    .single()

  if (nodeErr) return { error: `Failed to create fiber node: ${nodeErr.message}` }

  // If the node type is Cabinet, auto-create a cabinet record
  if (params.nodeType === 'Cabinet') {
    const { error: cabErr } = await supabase
      .from('cabinets')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger overrides
        cabinet_tag: params.nodeTag,
        cabinet_type: 'Fiber Cabinet',
        latitude: params.latitude,
        longitude: params.longitude,
        status: params.status ?? 'Planned',
        notes: params.notes,
      })
    if (cabErr) {
      console.error('Failed to auto-create cabinet for node:', cabErr.message)
    }
  }

  // Auto BOM by node type
  const bomByType: Record<string, { part_number: string; description: string; unit_cost: number }> = {
    'Handhole': { part_number: 'HH-BOX', description: `Handhole Box (${params.sizeDescription ?? '24x36x36'})`, unit_cost: 850.00 },
    'Manhole': { part_number: 'MH-COVER', description: 'Concrete Manhole with Cast Iron Cover', unit_cost: 2400.00 },
    'Pull Box': { part_number: 'PB-BOX', description: `Pull Box (${params.sizeDescription ?? '12x12x6'})`, unit_cost: 150.00 },
    'Cabinet': { part_number: 'CAB-OUTDOOR', description: `Outdoor Equipment Cabinet`, unit_cost: 1200.00 },
    'Building': { part_number: 'BLDG-ENTRY-KIT', description: `Building Entrance Transition Kit`, unit_cost: 250.00 },
  }

  const bom = bomByType[params.nodeType]
  if (bom) {
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Fiber',
      part_number: bom.part_number,
      description: bom.description,
      quantity: 1.0,
      unit: 'pcs',
      unit_cost: bom.unit_cost,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned',
    })
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: newNode }
}

// ─── 4. Update fiber node ────────────────────────────────────────────────────

export async function updateFiberNode(params: {
  id: string
  projectId: string
  status?: FiberNodeStatus
  address?: string
  elevationFt?: number
  structureDepthFt?: number
  sizeDescription?: string
  slackLoopFt?: number
  notes?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fiber_nodes')
    .update({
      status: params.status,
      address: params.address,
      elevation_ft: params.elevationFt,
      structure_depth_ft: params.structureDepthFt,
      size_description: params.sizeDescription,
      slack_loop_ft: params.slackLoopFt,
      notes: params.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return { error: `Failed to update fiber node: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

// ─── 5. Delete fiber node ────────────────────────────────────────────────────

export async function deleteFiberNode(params: { id: string; projectId: string }) {
  const supabase = await createClient()

  // Find node first to check type and tag
  const { data: node } = await supabase
    .from('fiber_nodes')
    .select('node_type, node_tag')
    .eq('id', params.id)
    .single()

  const { error } = await supabase.from('fiber_nodes').delete().eq('id', params.id)
  if (error) return { error: `Failed to delete node: ${error.message}` }

  // Clean up cabinet if type was Cabinet
  if (node && node.node_type === 'Cabinet') {
    await supabase
      .from('cabinets')
      .delete()
      .eq('project_id', params.projectId)
      .eq('cabinet_tag', node.node_tag)
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

// ─── 6. Create fiber enclosure ───────────────────────────────────────────────

export async function createFiberEnclosure(params: {
  projectId: string
  enclosureTag: string
  nodeId: string
  enclosureType: EnclosureType
  capacity?: number
  notes?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_enclosures')
    .insert({
      project_id: params.projectId,
      organization_id: '', // trigger fills
      enclosure_tag: params.enclosureTag,
      node_id: params.nodeId,
      enclosure_type: params.enclosureType,
      capacity: params.capacity ?? 12,
      installed_status: 'Planned',
      splice_count: 0,
      notes: params.notes,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create enclosure: ${error.message}` }

  // Auto BOM
  await supabase.from('bom_items').insert({
    project_id: params.projectId,
    category: 'Fiber',
    part_number: 'SE-CLOSURE',
    description: `${params.enclosureType} (${params.capacity ?? 12}-Port)`,
    quantity: 1.0,
    unit: 'pcs',
    unit_cost: 450.00,
    source: 'catalog',
    manufacturer: 'Generic',
    fiber_node_id: params.nodeId,
    status: 'Planned',
  })

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data }
}

// ─── 7. Create fiber route ───────────────────────────────────────────────────

export async function createFiberRoute(params: {
  projectId: string
  routeIdTag: string
  installationType: InstallationType
  routePurpose?: RoutePurpose
  conduitDiameterInches?: number
  slackPercentage?: number
  segments: {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    slackFeet?: number
  }[]
  cableCatalogId?: string
  fiberCount?: number
}) {
  const supabase = await createClient()

  const slackPct = params.slackPercentage ?? 10.0
  let measuredLength = 0
  const segmentInserts: {
    segment_index: number
    start_latitude: number
    start_longitude: number
    end_latitude: number
    end_longitude: number
    length_feet: number
    slack_feet: number
  }[] = []

  params.segments.forEach((seg, idx) => {
    const lenFt = haversineDistanceFeet(seg.startLat, seg.startLng, seg.endLat, seg.endLng)
    measuredLength += lenFt
    segmentInserts.push({
      segment_index: idx,
      start_latitude: seg.startLat,
      start_longitude: seg.startLng,
      end_latitude: seg.endLat,
      end_longitude: seg.endLng,
      length_feet: Number(lenFt.toFixed(2)),
      slack_feet: seg.slackFeet ?? 0.0,
    })
  })

  const segmentSlack = params.segments.reduce((s, seg) => s + (seg.slackFeet ?? 0), 0)
  const installedLength = measuredLength * (1 + slackPct / 100) + segmentSlack

  // Insert route
  const { data: newRoute, error: routeErr } = await supabase
    .from('fiber_routes')
    .insert({
      project_id: params.projectId,
      organization_id: '', // trigger fills
      route_id_tag: params.routeIdTag,
      measured_length_feet: Number(measuredLength.toFixed(2)),
      slack_percentage: slackPct,
      installed_length_feet: Number(installedLength.toFixed(2)),
      conduit_diameter_inches: params.conduitDiameterInches ?? 2.0,
      fill_percentage: 0.0,
      spare_capacity: 100.0,
      installation_type: params.installationType,
      route_purpose: params.routePurpose ?? 'camera_backbone',
    })
    .select()
    .single()

  if (routeErr) return { error: `Failed to create route: ${routeErr.message}` }

  // Insert segments
  const finalSegments = segmentInserts.map(s => ({
    ...s,
    project_id: params.projectId,
    organization_id: '', // trigger fills
    route_id: newRoute.id,
  }))

  const { error: segErr } = await supabase.from('fiber_route_segments').insert(finalSegments)
  if (segErr) console.error('Segment insert error:', segErr.message)

  // Auto-create backbone cable from catalog
  let cableCost = 0.50
  let cableName = 'OSP Fiber Cable'
  let cablePart = 'FIBER-OSP'
  let cableBrand = 'Generic'

  if (params.cableCatalogId) {
    const { data: catalogItem } = await supabase
      .from('fiber_catalog')
      .select('*')
      .eq('id', params.cableCatalogId)
      .single()

    if (catalogItem) {
      const fCount = params.fiberCount ?? catalogItem.fiber_count
      const cableTag = `BB-${params.routeIdTag}`

      const { error: cableErr } = await supabase
        .from('fiber_cables')
        .insert({
          project_id: params.projectId,
          organization_id: '', // trigger fills
          route_id: newRoute.id,
          cable_tag: cableTag,
          cable_type: 'Backbone',
          fiber_count: fCount,
          length_ft: Number(installedLength.toFixed(2)),
          install_status: 'Planned',
          test_status: 'Not Tested',
        })

      if (!cableErr) {
        // Update route fill percentage
        const condDiaMm = (params.conduitDiameterInches ?? 2.0) * 25.4
        const fill = Math.min((catalogItem.diameter_mm ** 2 / condDiaMm ** 2) * 100, 100)
        await supabase
          .from('fiber_routes')
          .update({ fill_percentage: Number(fill.toFixed(2)), spare_capacity: Number((100 - fill).toFixed(2)) })
          .eq('id', newRoute.id)
      }

      cableCost = catalogItem.cost_per_foot
      cableName = `${catalogItem.manufacturer} ${catalogItem.grade} ${catalogItem.mode} ${fCount}F Cable`
      cablePart = catalogItem.part_number
      cableBrand = catalogItem.manufacturer
    }
  }

  // BOM generation
  const bomItems = [
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'HDPE-COND',
      description: `HDPE Conduit (${params.conduitDiameterInches ?? 2.0}-in)`,
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 1.50,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned',
    },
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'INNER-1.25',
      description: '1.25-in Corrugated Innerduct',
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 0.75,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned',
    },
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'MULE-WP1250',
      description: 'Mule Tape 1250 lbs Pull Tape',
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 0.15,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned',
    },
  ]

  if (params.cableCatalogId) {
    bomItems.push({
      project_id: params.projectId,
      category: 'Fiber',
      part_number: cablePart,
      description: cableName,
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: Number(cableCost.toFixed(2)),
      source: 'catalog' as const,
      manufacturer: cableBrand,
      fiber_route_id: newRoute.id,
      status: 'Planned',
    })
  }

  await supabase.from('bom_items').insert(bomItems)

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: newRoute }
}

// ─── 8. Delete fiber route ───────────────────────────────────────────────────

export async function deleteFiberRoute(params: { id: string; projectId: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('fiber_routes').delete().eq('id', params.id)
  if (error) return { error: `Failed to delete route: ${error.message}` }
  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

// ─── 9. Create drop cable for a camera ──────────────────────────────────────

export async function createDropCable(params: {
  projectId: string
  cameraId: string
  cameraTag: string
  fromNodeId: string
  toNodeId: string
  fiberCount: number
  lengthFt: number
  notes?: string
}) {
  const supabase = await createClient()

  const cableTag = `DROP-${params.cameraTag}-${params.fiberCount}F`

  const { data: newCable, error: cableErr } = await supabase
    .from('fiber_cables')
    .insert({
      project_id: params.projectId,
      organization_id: '', // trigger fills
      cable_tag: cableTag,
      cable_type: 'Drop',
      fiber_count: params.fiberCount,
      from_node_id: params.fromNodeId,
      to_node_id: params.toNodeId,
      length_ft: params.lengthFt,
      install_status: 'Planned',
      test_status: 'Not Tested',
      notes: params.notes,
    })
    .select()
    .single()

  if (cableErr) return { error: `Failed to create drop cable: ${cableErr.message}` }

  // BOM for drop cable
  await supabase.from('bom_items').insert({
    project_id: params.projectId,
    category: 'Fiber',
    part_number: 'DROP-CBL-SM',
    description: `SM Drop Cable ${params.fiberCount}F (${params.cameraTag})`,
    quantity: params.lengthFt,
    unit: 'ft',
    unit_cost: 0.45,
    source: 'catalog',
    manufacturer: 'Generic',
    status: 'Planned',
  })

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: newCable }
}

// ─── 10. Preview bulk fiber drops ───────────────────────────────────────────

export async function previewBulkFiberDrops(params: {
  projectId: string
  sourceNodeId: string
  enclosureId: string
  cameraIds: string[]
  fiberCountPerDrop?: number
  slackFactor?: number
}) {
  const supabase = await createClient()

  const fiberCount = params.fiberCountPerDrop ?? 6
  const slackFactor = params.slackFactor ?? 1.10

  // Get cameras
  const { data: cameras } = await supabase
    .from('camera_locations')
    .select('id, camera_id_tag, latitude, longitude')
    .in('id', params.cameraIds)

  // Get source node
  const { data: sourceNode } = await supabase
    .from('fiber_nodes')
    .select('id, node_tag, latitude, longitude')
    .eq('id', params.sourceNodeId)
    .single()

  if (!cameras || !sourceNode) return { error: 'Could not load cameras or source node' }

  // Check which cameras already have assignments
  const { data: existingAssignments } = await supabase
    .from('camera_fiber_assignments')
    .select('camera_id')
    .in('camera_id', params.cameraIds)

  const alreadyAssigned = new Set((existingAssignments ?? []).map(a => a.camera_id))

  const preview = cameras.map(cam => {
    const distanceFt = haversineDistanceFeet(
      sourceNode.latitude, sourceNode.longitude,
      cam.latitude, cam.longitude
    )
    const estimatedLengthFt = Math.round(distanceFt * slackFactor)
    const cableTag = `DROP-${cam.camera_id_tag}-${fiberCount}F`
    const nodeTag = `NODE-CAM-${cam.id.slice(0, 4)}`

    return {
      cameraId: cam.id,
      cameraTag: cam.camera_id_tag,
      cableTag,
      nodeTag,
      estimatedLengthFt,
      straightLineDistanceFt: Math.round(distanceFt),
      fiberCount,
      alreadyAssigned: alreadyAssigned.has(cam.id),
      estimatedCost: estimatedLengthFt * 0.45,
    }
  })

  return { success: true, preview }
}

// ─── 11. Confirm bulk fiber drops ────────────────────────────────────────────

export async function confirmBulkFiberDrops(params: {
  projectId: string
  sourceNodeId: string
  enclosureId: string
  drops: {
    cameraId: string
    cameraTag: string
    cableTag: string
    nodeTag: string
    estimatedLengthFt: number
    fiberCount: number
  }[]
}) {
  const supabase = await createClient()

  const results: { cameraId: string; success: boolean; error?: string }[] = []

  for (const drop of params.drops) {
    // 1. Create Camera Location Node
    const { data: camNode, error: nodeErr } = await supabase
      .from('fiber_nodes')
      .insert({
        project_id: params.projectId,
        organization_id: '', // trigger fills
        node_tag: drop.nodeTag,
        node_type: 'Camera Location',
        latitude: 0, // will be updated from camera coords below
        longitude: 0,
        status: 'Planned',
        size_description: 'Pole Mount Transition',
        slack_loop_ft: 10.0,
        notes: `Auto-created for camera ${drop.cameraTag}`,
      })
      .select()
      .single()

    if (nodeErr) {
      // If conflict (node already exists), query it
      const { data: existing } = await supabase
        .from('fiber_nodes')
        .select('id')
        .eq('project_id', params.projectId)
        .eq('node_tag', drop.nodeTag)
        .single()

      if (!existing) {
        results.push({ cameraId: drop.cameraId, success: false, error: `Node error: ${nodeErr.message}` })
        continue
      }
    }

    // Update node coords from camera
    const { data: cam } = await supabase
      .from('camera_locations')
      .select('latitude, longitude')
      .eq('id', drop.cameraId)
      .single()

    if (cam && camNode) {
      await supabase
        .from('fiber_nodes')
        .update({ latitude: cam.latitude, longitude: cam.longitude })
        .eq('id', camNode.id)
    }

    const toNodeId = camNode?.id ?? (
      await supabase.from('fiber_nodes').select('id').eq('project_id', params.projectId).eq('node_tag', drop.nodeTag).single()
    ).data?.id

    if (!toNodeId) {
      results.push({ cameraId: drop.cameraId, success: false, error: 'Could not resolve camera location node' })
      continue
    }

    // 2. Create drop cable
    const { data: dropCable, error: cableErr } = await supabase
      .from('fiber_cables')
      .insert({
        project_id: params.projectId,
        organization_id: '', // trigger fills
        cable_tag: drop.cableTag,
        cable_type: 'Drop',
        fiber_count: drop.fiberCount,
        from_node_id: params.sourceNodeId,
        to_node_id: toNodeId,
        length_ft: drop.estimatedLengthFt,
        install_status: 'Planned',
        test_status: 'Not Tested',
      })
      .select()
      .single()

    if (cableErr) {
      results.push({ cameraId: drop.cameraId, success: false, error: `Cable: ${cableErr.message}` })
      continue
    }

    // 3. Create camera fiber assignment
    const { error: assignErr } = await supabase
      .from('camera_fiber_assignments')
      .upsert({
        project_id: params.projectId,
        organization_id: '', // trigger fills
        camera_id: drop.cameraId,
        source_node_id: params.sourceNodeId,
        enclosure_id: params.enclosureId,
        drop_cable_id: dropCable.id,
        splice_status: 'Not Spliced',
        test_status: 'Not Tested',
        fiber_path_status: 'Planned',
      }, { onConflict: 'camera_id' })

    if (assignErr) {
      results.push({ cameraId: drop.cameraId, success: false, error: `Assignment: ${assignErr.message}` })
      continue
    }

    results.push({ cameraId: drop.cameraId, success: true })
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, results }
}

// ─── 12. Create splice record ────────────────────────────────────────────────

export async function createSpliceRecord(params: {
  projectId: string
  enclosureId: string
  fromCableId: string
  fromStrandId: string
  toCableId: string
  toStrandId: string
  assignedCameraId?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_splice_records')
    .insert({
      project_id: params.projectId,
      organization_id: '', // trigger fills
      enclosure_id: params.enclosureId,
      from_cable_id: params.fromCableId,
      from_strand_id: params.fromStrandId,
      to_cable_id: params.toCableId,
      to_strand_id: params.toStrandId,
      assigned_camera_id: params.assignedCameraId,
      splice_status: 'Not Spliced',
      test_status: 'Not Tested',
      notes: params.notes,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create splice record: ${error.message}` }

  // Update strand statuses
  await supabase
    .from('fiber_strands')
    .update({ splice_status: 'Spliced', updated_at: new Date().toISOString() })
    .in('id', [params.fromStrandId, params.toStrandId])

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

// ─── 13. Update splice record status ────────────────────────────────────────

export async function updateSpliceStatus(params: {
  id: string
  projectId: string
  spliceStatus: FiberSpliceStatus
  testStatus?: FiberTestStatus
  notes?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fiber_splice_records')
    .update({
      splice_status: params.spliceStatus,
      test_status: params.testStatus,
      notes: params.notes,
      completed_at: params.spliceStatus === 'Spliced' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return { error: `Failed to update splice: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

// ─── 14. Update camera fiber assignment ─────────────────────────────────────

export async function updateCameraFiberAssignment(params: {
  cameraId: string
  projectId: string
  sourceNodeId?: string | null
  enclosureId?: string | null
  backboneCableId?: string | null
  dropCableId?: string | null
  spliceStatus?: FiberSpliceStatus
  testStatus?: FiberTestStatus
  fiberPathStatus?: FiberPathStatus
  notes?: string | null
  connectivityPathType?: string
  assignedCabinetId?: string | null
  assignedSwitchId?: string | null
  assignedSwitchPortId?: string | null
  assignedSfpPortId?: string | null
  assignedFppId?: string | null
  assignedFduId?: string | null
  assignedUplinkFiberStrandId?: string | null
}) {
  const supabase = await createClient()

  // Prepare payload
  const payload: any = {
    project_id: params.projectId,
    organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
    camera_id: params.cameraId,
    source_node_id: params.sourceNodeId === '' ? null : params.sourceNodeId,
    enclosure_id: params.enclosureId === '' ? null : params.enclosureId,
    backbone_cable_id: params.backboneCableId === '' ? null : params.backboneCableId,
    drop_cable_id: params.dropCableId === '' ? null : params.dropCableId,
    notes: params.notes,
    updated_at: new Date().toISOString(),
  }

  if (params.spliceStatus !== undefined) payload.splice_status = params.spliceStatus
  if (params.testStatus !== undefined) payload.test_status = params.testStatus
  if (params.fiberPathStatus !== undefined) payload.fiber_path_status = params.fiberPathStatus
  if (params.connectivityPathType !== undefined) payload.connectivity_path_type = params.connectivityPathType
  if (params.assignedCabinetId !== undefined) payload.assigned_cabinet_id = params.assignedCabinetId === '' ? null : params.assignedCabinetId
  if (params.assignedSwitchId !== undefined) payload.assigned_switch_id = params.assignedSwitchId === '' ? null : params.assignedSwitchId
  if (params.assignedSwitchPortId !== undefined) payload.assigned_switch_port_id = params.assignedSwitchPortId === '' ? null : params.assignedSwitchPortId
  if (params.assignedSfpPortId !== undefined) payload.assigned_sfp_port_id = params.assignedSfpPortId === '' ? null : params.assignedSfpPortId
  if (params.assignedFppId !== undefined) payload.assigned_fpp_id = params.assignedFppId === '' ? null : params.assignedFppId
  if (params.assignedFduId !== undefined) payload.assigned_fdu_id = params.assignedFduId === '' ? null : params.assignedFduId

  const { data, error } = await supabase
    .from('camera_fiber_assignments')
    .upsert(payload, { onConflict: 'camera_id' })
    .select()
    .single()

  if (error) return { error: `Failed to update fiber assignment: ${error.message}` }

  // Clear previous copper port associations for this camera
  await supabase
    .from('switch_ports')
    .update({
      assigned_camera_location_id: null,
      assigned_device_type: 'unused',
      updated_at: new Date().toISOString()
    })
    .eq('assigned_camera_location_id', params.cameraId)

  // Clear previous fiber strand port links for this camera's SFP port
  if (params.assignedSfpPortId && params.assignedUplinkFiberStrandId) {
    await supabase
      .from('switch_ports')
      .update({
        assigned_fiber_strand_id: null,
        assigned_fiber_cable_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('assigned_fiber_strand_id', params.assignedUplinkFiberStrandId)
  }

  // Update switch copper port to camera if selected
  if (params.assignedSwitchPortId && params.assignedSwitchPortId !== '') {
    await supabase
      .from('switch_ports')
      .update({
        assigned_camera_location_id: params.cameraId,
        assigned_device_type: 'camera',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.assignedSwitchPortId)
  }

  // Update switch SFP port with uplink strand if selected
  if (params.assignedSfpPortId && params.assignedSfpPortId !== '') {
    await supabase
      .from('switch_ports')
      .update({
        assigned_fiber_strand_id: params.assignedUplinkFiberStrandId === '' ? null : params.assignedUplinkFiberStrandId,
        assigned_fiber_cable_id: params.dropCableId || params.backboneCableId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.assignedSfpPortId)
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/cameras`)
  return { success: true, data }
}

// ─── 15. Assign strand to camera assignment ──────────────────────────────────

export async function assignStrandToCamera(params: {
  projectId: string
  cameraFiberAssignmentId: string
  cameraId: string
  strandId: string
  strandRole: StrandRole
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('camera_fiber_assignment_strands')
    .upsert({
      project_id: params.projectId,
      organization_id: '', // trigger fills
      camera_fiber_assignment_id: params.cameraFiberAssignmentId,
      camera_id: params.cameraId,
      strand_id: params.strandId,
      strand_role: params.strandRole,
    }, { onConflict: 'strand_id' })
    .select()
    .single()

  if (error) return { error: `Failed to assign strand: ${error.message}` }

  // Update the strand's assigned_camera_id
  await supabase
    .from('fiber_strands')
    .update({ assigned_camera_id: params.cameraId, updated_at: new Date().toISOString() })
    .eq('id', params.strandId)

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

// ─── 16. Generate fiber tasks for a camera ───────────────────────────────────

export async function generateFiberTasksForCamera(params: {
  projectId: string
  organizationId?: string
  cameraId: string
  cameraTag: string
}) {
  const supabase = await createClient()

  let orgId = params.organizationId
  if (!orgId) {
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', params.projectId)
      .single()
    if (project) {
      orgId = project.organization_id
    }
  }

  if (!orgId) {
    return { error: 'Failed to resolve organization: Project not found' }
  }


  const fiberTaskTemplates = [
    {
      title: `[${params.cameraTag}] Pull Drop Cable`,
      task_type: 'installation',
      template_key: 'fiber_pull_drop',
      priority: 'high',
    },
    {
      title: `[${params.cameraTag}] Splice Fiber Strands`,
      task_type: 'splicing',
      template_key: 'fiber_splice_fiber',
      priority: 'high',
    },
    {
      title: `[${params.cameraTag}] Test Fiber Path (OTDR / Continuity)`,
      task_type: 'testing',
      template_key: 'fiber_test_fiber',
      priority: 'medium',
    },
  ]

  // Check if tasks already exist for this camera
  const { data: existingTasks } = await supabase
    .from('camera_tasks')
    .select('template_key')
    .eq('camera_id', params.cameraId)
    .in('template_key', fiberTaskTemplates.map(t => t.template_key))

  const existingKeys = new Set((existingTasks ?? []).map(t => t.template_key))
  const tasksToCreate = fiberTaskTemplates.filter(t => !existingKeys.has(t.template_key))

  if (tasksToCreate.length === 0) {
    return { success: true, created: 0, skipped: fiberTaskTemplates.length }
  }

  const taskInserts = tasksToCreate.map(t => ({
    project_id: params.projectId,
    organization_id: orgId,
    camera_id: params.cameraId,
    title: t.title,
    task_type: t.task_type,
    template_key: t.template_key,
    priority: t.priority,
    status: 'To Do',
  }))

  const { error } = await supabase.from('camera_tasks').insert(taskInserts)
  if (error) return { error: `Failed to generate fiber tasks: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/tasks`)
  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, created: tasksToCreate.length, skipped: existingKeys.size }
}

// ─── 17. Fetch fiber catalog ─────────────────────────────────────────────────

export async function getFiberCatalog() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fiber_catalog')
    .select('*')
    .order('manufacturer')
    .order('fiber_count')

  if (error) throw new Error(`Failed to fetch fiber catalog: ${error.message}`)
  return data
}

// ─── 18. Update cable status ─────────────────────────────────────────────────

export async function updateCableStatus(params: {
  id: string
  projectId: string
  installStatus?: FiberInstallStatus
  testStatus?: FiberTestStatus
  notes?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fiber_cables')
    .update({
      install_status: params.installStatus,
      test_status: params.testStatus,
      notes: params.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return { error: `Failed to update cable: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

// ─── 19. Delete fiber cable ───────────────────────────────────────────────────

export async function deleteFiberCable(params: { id: string; projectId: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('fiber_cables').delete().eq('id', params.id)
  if (error) return { error: `Failed to delete cable: ${error.message}` }
  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

export async function deleteSpliceRecord(params: {
  id: string
  projectId: string
}) {
  const supabase = await createClient()
  
  // Find the strands involved before deleting to reset their status
  const { data: splice } = await supabase
    .from('fiber_splice_records')
    .select('from_strand_id, to_strand_id')
    .eq('id', params.id)
    .single()

  const { error } = await supabase.from('fiber_splice_records').delete().eq('id', params.id)
  if (error) return { error: `Failed to delete splice record: ${error.message}` }

  if (splice) {
    await supabase
      .from('fiber_strands')
      .update({ splice_status: 'Not Spliced', updated_at: new Date().toISOString() })
      .in('id', [splice.from_strand_id, splice.to_strand_id])
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

export async function clearSplicesForCables(params: {
  projectId: string
  enclosureId: string
  cableIdA: string
  cableIdB: string
}) {
  const supabase = await createClient()
  
  // Get all matching splices first to reset strand statuses
  const { data: splices } = await supabase
    .from('fiber_splice_records')
    .select('id, from_strand_id, to_strand_id')
    .eq('enclosure_id', params.enclosureId)
    .or(`and(from_cable_id.eq.${params.cableIdA},to_cable_id.eq.${params.cableIdB}),and(from_cable_id.eq.${params.cableIdB},to_cable_id.eq.${params.cableIdA})`)

  const { error } = await supabase
    .from('fiber_splice_records')
    .delete()
    .eq('enclosure_id', params.enclosureId)
    .or(`and(from_cable_id.eq.${params.cableIdA},to_cable_id.eq.${params.cableIdB}),and(from_cable_id.eq.${params.cableIdB},to_cable_id.eq.${params.cableIdA})`)

  if (error) return { error: `Failed to clear splices: ${error.message}` }

  if (splices && splices.length > 0) {
    const strandIds = splices.flatMap(s => [s.from_strand_id, s.to_strand_id])
    await supabase
      .from('fiber_strands')
      .update({ splice_status: 'Not Spliced', updated_at: new Date().toISOString() })
      .in('id', strandIds)
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

export async function clearStrandAssignmentsForCamera(params: {
  projectId: string
  cameraId: string
}) {
  const supabase = await createClient()

  // Find existing strand assignments
  const { data: existing } = await supabase
    .from('camera_fiber_assignment_strands')
    .select('strand_id')
    .eq('camera_id', params.cameraId)

  if (existing && existing.length > 0) {
    const strandIds = existing.map(e => e.strand_id)
    // Reset assigned_camera_id to null
    await supabase
      .from('fiber_strands')
      .update({ assigned_camera_id: null, updated_at: new Date().toISOString() })
      .in('id', strandIds)

    // Delete assignment strands
    await supabase
      .from('camera_fiber_assignment_strands')
      .delete()
      .eq('camera_id', params.cameraId)
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

// ─── 19. Cabinets, FDUs, FPPs, and Patch Cords CRUD ───────────────────────────

export async function createCabinet(params: {
  projectId: string
  cabinetTag: string
  cabinetType: 'CCTV Cabinet' | 'Traffic Cabinet' | 'Fiber Cabinet' | 'Custom Cabinet'
  latitude: number
  longitude: number
  status?: 'Planned' | 'Installed' | 'Existing' | 'Blocked' | 'Needs Survey' | 'Removed'
  notes?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cabinets')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
      cabinet_tag: params.cabinetTag,
      cabinet_type: params.cabinetType,
      latitude: params.latitude,
      longitude: params.longitude,
      status: params.status || 'Planned',
      notes: params.notes,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create cabinet: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

export async function deleteCabinet(id: string, projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cabinets')
    .delete()
    .eq('id', id)

  if (error) return { error: `Failed to delete cabinet: ${error.message}` }

  revalidatePath(`/projects/${projectId}/fiber`)
  return { success: true }
}

export async function createFDU(params: {
  projectId: string
  fduTag: string
  cabinetId: string | null
  fiberCapacity: number
  assignedBackboneCableId?: string | null
  status?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_distribution_units')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      fdu_tag: params.fduTag,
      cabinet_id: params.cabinetId === '' ? null : params.cabinetId,
      fiber_capacity: params.fiberCapacity,
      assigned_backbone_cable_id: params.assignedBackboneCableId === '' ? null : params.assignedBackboneCableId,
      status: params.status || 'Planned',
    })
    .select()
    .single()

  if (error) return { error: `Failed to create FDU: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

export async function createFPP(params: {
  projectId: string
  fppTag: string
  cabinetId: string | null
  portCount: number
  assignedFduId?: string | null
  status?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_patch_panels')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      fpp_tag: params.fppTag,
      cabinet_id: params.cabinetId === '' ? null : params.cabinetId,
      port_count: params.portCount,
      assigned_fdu_id: params.assignedFduId === '' ? null : params.assignedFduId,
      status: params.status || 'Planned',
    })
    .select()
    .single()

  if (error) return { error: `Failed to create FPP: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

export async function createPatchCord(params: {
  projectId: string
  patchCordTag: string
  jumperType: 'LC-LC Jumper' | 'LC-SC Jumper' | 'SC-SC Jumper' | 'Patch Cord' | 'Custom'
  lengthFeet: number
  connectorA?: 'LC' | 'SC' | 'ST' | 'FC' | 'MPO' | 'Custom'
  connectorB?: 'LC' | 'SC' | 'ST' | 'FC' | 'MPO' | 'Custom'
  polarity?: 'A-to-A' | 'A-to-B' | 'Straight' | 'Custom'
  fromFduId?: string | null
  fromFppId?: string | null
  toFppId?: string | null
  toPortId?: string | null
  status?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_patch_cords')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      patch_cord_tag: params.patchCordTag,
      jumper_type: params.jumperType,
      length_feet: params.lengthFeet,
      connector_a: params.connectorA || null,
      connector_b: params.connectorB || null,
      polarity: params.polarity || null,
      from_fdu_id: params.fromFduId === '' ? null : params.fromFduId,
      from_fpp_id: params.fromFppId === '' ? null : params.fromFppId,
      to_fpp_id: params.toFppId === '' ? null : params.toFppId,
      to_port_id: params.toPortId === '' ? null : params.toPortId,
      status: params.status || 'Planned',
      notes: params.notes,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create Patch Cord: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}



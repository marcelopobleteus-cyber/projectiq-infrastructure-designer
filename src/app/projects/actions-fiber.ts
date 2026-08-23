'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

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
  | 'Fiber Pair Assigned'
  | 'Mainhole Splicing Pending'
  | 'Cabinet Splicing Pending'
  | 'Mainhole Splices Complete'
  | 'Cabinet Splices Complete'
  | 'Fiber Pair Complete'
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

// ─── 1a. Create fiber route by node IDs (Fiber Path Design) ─────────────────

export async function createFiberRouteByNodes(params: {
  projectId: string
  fromNodeId: string
  toNodeId: string
  routeIdTag: string
  installationType: InstallationType
  routePurpose?: RoutePurpose
  conduitDiameterInches?: number
  slackPercentage?: number
  notes?: string
}): Promise<{ success: true; data: { id: string; route_id_tag: string; measured_length_feet: number } } | { success: false; error: string }> {
  const supabase = await createClient()

  // 1. Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) {
    return { success: false, error: 'Not authenticated.' }
  }

  // 2. Verify user has access to this project's organization
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', params.projectId)
    .single()

  if (!project) {
    return { success: false, error: 'Project not found or access denied.' }
  }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) {
      return { success: false, error: 'Access denied: you are not a member of this project organization.' }
    }
  }

  // 3. Validate endpoints are different
  if (params.fromNodeId === params.toNodeId) {
    return { success: false, error: 'Cannot create a route: From Node and To Node must be different.' }
  }

  // 4. Fetch both nodes and validate they exist, belong to this project and organization
  const { data: nodes, error: nodesErr } = await supabase
    .from('fiber_nodes')
    .select('id, node_tag, node_type, latitude, longitude, project_id, organization_id')
    .in('id', [params.fromNodeId, params.toNodeId])

  if (nodesErr) {
    return { success: false, error: `Failed to fetch nodes: ${nodesErr.message}` }
  }

  if (!nodes || nodes.length !== 2) {
    return { success: false, error: 'Cannot create route: one or both selected nodes do not exist.' }
  }

  const fromNode = nodes.find(n => n.id === params.fromNodeId)
  const toNode = nodes.find(n => n.id === params.toNodeId)

  if (!fromNode || !toNode) {
    return { success: false, error: 'Cannot create route: one or both selected nodes do not exist.' }
  }

  // 5. Verify both nodes belong to the same project
  if (fromNode.project_id !== params.projectId || toNode.project_id !== params.projectId) {
    return { success: false, error: 'Cannot create route: nodes do not belong to this project.' }
  }

  // 6. Verify both nodes belong to the same organization
  if (fromNode.organization_id !== project.organization_id || toNode.organization_id !== project.organization_id) {
    return { success: false, error: 'Cannot create route: nodes belong to a different organization.' }
  }

  // 7. Validate coordinates — reject zero/null coordinates
  const hasValidCoords = (lat: number | null, lng: number | null) =>
    lat !== null && lng !== null &&
    lat !== 0 && lng !== 0 &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180

  if (!hasValidCoords(fromNode.latitude, fromNode.longitude)) {
    return { success: false, error: `Cannot create route: node ${fromNode.node_tag} is missing valid coordinates.` }
  }

  if (!hasValidCoords(toNode.latitude, toNode.longitude)) {
    return { success: false, error: `Cannot create route: node ${toNode.node_tag} is missing valid coordinates.` }
  }

  // 8. Validate metadata
  const conduitDiam = params.conduitDiameterInches ?? 2.0
  const slackPct = params.slackPercentage ?? 10.0

  if (conduitDiam <= 0 || conduitDiam > 48) {
    return { success: false, error: 'Conduit diameter must be between 0.1 and 48 inches.' }
  }

  if (slackPct < 0 || slackPct > 100) {
    return { success: false, error: 'Slack percentage must be between 0 and 100.' }
  }

  if (!params.routeIdTag || params.routeIdTag.trim().length === 0) {
    return { success: false, error: 'Route ID tag is required.' }
  }

  // 9. Check for duplicate route between these exact endpoints (warn, not block)
  const { data: existingSegments } = await supabase
    .from('fiber_route_segments')
    .select('route_id, start_latitude, start_longitude, end_latitude, end_longitude')
    .eq('project_id', params.projectId)

  const hasDuplicate = (existingSegments ?? []).some(seg => {
    const matchForward =
      Math.abs(seg.start_latitude - fromNode.latitude) < 0.00001 &&
      Math.abs(seg.start_longitude - fromNode.longitude) < 0.00001 &&
      Math.abs(seg.end_latitude - toNode.latitude) < 0.00001 &&
      Math.abs(seg.end_longitude - toNode.longitude) < 0.00001
    const matchReverse =
      Math.abs(seg.start_latitude - toNode.latitude) < 0.00001 &&
      Math.abs(seg.start_longitude - toNode.longitude) < 0.00001 &&
      Math.abs(seg.end_latitude - fromNode.latitude) < 0.00001 &&
      Math.abs(seg.end_longitude - fromNode.longitude) < 0.00001
    return matchForward || matchReverse
  })

  if (hasDuplicate) {
    return { success: false, error: `A route segment already exists between ${fromNode.node_tag} and ${toNode.node_tag}. Delete the existing route first or select different endpoints.` }
  }

  // 10. Compute haversine distance
  const measuredLength = Number(
    haversineDistanceFeet(fromNode.latitude, fromNode.longitude, toNode.latitude, toNode.longitude).toFixed(2)
  )
  const installedLength = Number((measuredLength * (1 + slackPct / 100)).toFixed(2))

  // 11. Insert fiber_routes
  const { data: newRoute, error: routeErr } = await supabase
    .from('fiber_routes')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills from project
      route_id_tag: params.routeIdTag.trim(),
      measured_length_feet: measuredLength,
      slack_percentage: slackPct,
      installed_length_feet: installedLength,
      conduit_diameter_inches: conduitDiam,
      fill_percentage: 0.0,
      spare_capacity: 100.0,
      installation_type: params.installationType,
      route_purpose: params.routePurpose ?? 'camera_backbone',
    })
    .select('id, route_id_tag, measured_length_feet')
    .single()

  if (routeErr || !newRoute) {
    return { success: false, error: `Failed to create route: ${routeErr?.message ?? 'unknown error'}` }
  }

  // 12. Insert one fiber_route_segments row
  const { error: segErr } = await supabase
    .from('fiber_route_segments')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
      route_id: newRoute.id,
      segment_index: 0,
      start_latitude: fromNode.latitude,
      start_longitude: fromNode.longitude,
      end_latitude: toNode.latitude,
      end_longitude: toNode.longitude,
      length_feet: measuredLength,
      slack_feet: 0.0,
    })

  if (segErr) {
    // Clean up the orphaned route if segment insert fails
    await supabase.from('fiber_routes').delete().eq('id', newRoute.id)
    return { success: false, error: `Route created but segment insert failed: ${segErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}`)
  revalidatePath(`/projects/${params.projectId}/fiber`)



  return { success: true, data: newRoute }
}

// ─── 1b. Create fiber route by ordered node IDs (Phase 1.3B) ────────────────

export async function createFiberRouteByOrderedNodes(params: {
  projectId: string
  orderedNodeIds: string[]
  routeIdTag: string
  installationType: InstallationType
  routePurpose?: RoutePurpose
  conduitDiameterInches?: number
  slackPercentage?: number
  cableCatalogId?: string
  notes?: string
}): Promise<{ success: true; data: { id: string; route_id_tag: string; measured_length_feet: number }; warning?: string } | { success: false; error: string }> {
  const supabase = await createClient()

  // 1. Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) {
    return { success: false, error: 'Not authenticated.' }
  }

  // 2. Verify user has access to this project's organization
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', params.projectId)
    .single()

  if (!project) {
    return { success: false, error: 'Project not found or access denied.' }
  }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) {
      return { success: false, error: 'Access denied: you are not a member of this project organization.' }
    }
  }

  // 3. Verify orderedNodeIds has at least 2 elements
  if (!params.orderedNodeIds || params.orderedNodeIds.length < 2) {
    return { success: false, error: 'Cannot create route: must select at least two fiber nodes.' }
  }

  // 4. Verify orderedNodeIds has no duplicate elements
  const uniqueIds = new Set(params.orderedNodeIds)
  if (uniqueIds.size !== params.orderedNodeIds.length) {
    return { success: false, error: 'Cannot create route: loops or visiting the same node multiple times is not supported.' }
  }

  // 5. Fetch all nodes in orderedNodeIds
  const { data: nodes, error: nodesErr } = await supabase
    .from('fiber_nodes')
    .select('id, node_tag, node_type, latitude, longitude, project_id, organization_id')
    .in('id', params.orderedNodeIds)

  if (nodesErr) {
    return { success: false, error: `Failed to fetch nodes: ${nodesErr.message}` }
  }

  if (!nodes || nodes.length !== params.orderedNodeIds.length) {
    return { success: false, error: 'Cannot create route: one or more selected nodes do not exist.' }
  }

  // 6. Map fetched nodes to the original input order
  const orderedNodes = params.orderedNodeIds.map(id => nodes.find(n => n.id === id)!)

  // 7. Verify all nodes belong to this project and organization
  for (const node of orderedNodes) {
    if (node.project_id !== params.projectId) {
      return { success: false, error: `Cannot create route: node ${node.node_tag} does not belong to this project.` }
    }
    if (node.organization_id !== project.organization_id) {
      return { success: false, error: `Cannot create route: node ${node.node_tag} belongs to a different organization.` }
    }
  }

  // 8. Validate coordinates — reject zero/null coordinates
  const hasValidCoords = (lat: number | null, lng: number | null) =>
    lat !== null && lng !== null &&
    lat !== 0 && lng !== 0 &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180

  for (const node of orderedNodes) {
    if (!hasValidCoords(node.latitude, node.longitude)) {
      return { success: false, error: `Cannot create route: node ${node.node_tag} is missing valid coordinates.` }
    }
  }

  // 9. Validate metadata
  const conduitDiam = params.conduitDiameterInches ?? 2.0
  const slackPct = params.slackPercentage ?? 10.0

  if (conduitDiam <= 0 || conduitDiam > 48) {
    return { success: false, error: 'Conduit diameter must be between 0.1 and 48 inches.' }
  }

  if (slackPct < 0 || slackPct > 100) {
    return { success: false, error: 'Slack percentage must be between 0 and 100.' }
  }

  if (!params.routeIdTag || params.routeIdTag.trim().length === 0) {
    return { success: false, error: 'Route ID tag is required.' }
  }

  // 10. Duplicate Checks
  // A. Tag uniqueness
  const { data: existingRoutes, error: tagCheckErr } = await supabase
    .from('fiber_routes')
    .select('id, route_id_tag, route_purpose')
    .eq('project_id', params.projectId)

  if (tagCheckErr) {
    return { success: false, error: `Failed to query existing routes: ${tagCheckErr.message}` }
  }

  const isTagDuplicate = (existingRoutes ?? []).some(
    r => r.route_id_tag.toLowerCase() === params.routeIdTag.trim().toLowerCase()
  )
  if (isTagDuplicate) {
    return { success: false, error: `A route with the tag "${params.routeIdTag}" already exists in this project.` }
  }

  // B. Exact duplicate full path check (ordered nodes sequence, same purpose)
  const { data: existingSegments, error: segsQueryErr } = await supabase
    .from('fiber_route_segments')
    .select('route_id, start_latitude, start_longitude, end_latitude, end_longitude, segment_index')
    .eq('project_id', params.projectId)

  if (segsQueryErr) {
    return { success: false, error: `Failed to query route segments: ${segsQueryErr.message}` }
  }

  const segmentsByRoute: Record<string, typeof existingSegments> = {}
  for (const seg of existingSegments ?? []) {
    if (!segmentsByRoute[seg.route_id]) {
      segmentsByRoute[seg.route_id] = []
    }
    segmentsByRoute[seg.route_id].push(seg)
  }

  for (const routeId in segmentsByRoute) {
    segmentsByRoute[routeId].sort((a, b) => a.segment_index - b.segment_index)
  }

  let hasExactDuplicateFullPath = false
  for (const routeId in segmentsByRoute) {
    const routeSegs = segmentsByRoute[routeId]
    const routeInfo = existingRoutes.find(r => r.id === routeId)
    if (!routeInfo) continue

    if (routeSegs.length !== orderedNodes.length - 1) continue

    let matchForward = true
    let matchReverse = true

    for (let i = 0; i < routeSegs.length; i++) {
      const seg = routeSegs[i]
      const nodeA = orderedNodes[i]
      const nodeB = orderedNodes[i + 1]
      const revNodeA = orderedNodes[orderedNodes.length - 1 - i]
      const revNodeB = orderedNodes[orderedNodes.length - 2 - i]

      const coordMatch = (lat1: number, lng1: number, lat2: number, lng2: number) =>
        Math.abs(lat1 - lat2) < 0.00001 && Math.abs(lng1 - lng2) < 0.00001

      if (!coordMatch(seg.start_latitude, seg.start_longitude, nodeA.latitude, nodeA.longitude) ||
          !coordMatch(seg.end_latitude, seg.end_longitude, nodeB.latitude, nodeB.longitude)) {
        matchForward = false
      }

      if (!coordMatch(seg.start_latitude, seg.start_longitude, revNodeA.latitude, revNodeA.longitude) ||
          !coordMatch(seg.end_latitude, seg.end_longitude, revNodeB.latitude, revNodeB.longitude)) {
        matchReverse = false
      }
    }

    if (matchForward || matchReverse) {
      if (routeInfo.route_purpose === (params.routePurpose ?? 'camera_backbone')) {
        hasExactDuplicateFullPath = true
        break
      }
    }
  }

  if (hasExactDuplicateFullPath) {
    return { success: false, error: 'A route with the exact same sequence of nodes and purpose already exists.' }
  }

  // C. Shared segment warning check (permit but warn)
  let hasSharedSegment = false
  for (let i = 0; i < orderedNodes.length - 1; i++) {
    const nodeA = orderedNodes[i]
    const nodeB = orderedNodes[i + 1]

    const segmentExists = (existingSegments ?? []).some(seg => {
      const coordMatch = (lat1: number, lng1: number, lat2: number, lng2: number) =>
        Math.abs(lat1 - lat2) < 0.00001 && Math.abs(lng1 - lng2) < 0.00001
      
      const matchForward = coordMatch(seg.start_latitude, seg.start_longitude, nodeA.latitude, nodeA.longitude) &&
                           coordMatch(seg.end_latitude, seg.end_longitude, nodeB.latitude, nodeB.longitude)
      const matchReverse = coordMatch(seg.start_latitude, seg.start_longitude, nodeB.latitude, nodeB.longitude) &&
                           coordMatch(seg.end_latitude, seg.end_longitude, nodeA.latitude, nodeA.longitude)
      return matchForward || matchReverse
    })

    if (segmentExists) {
      hasSharedSegment = true
    }
  }

  // 11. Compute Total Measured Length
  let measuredLength = 0
  for (let i = 0; i < orderedNodes.length - 1; i++) {
    measuredLength += haversineDistanceFeet(
      orderedNodes[i].latitude, orderedNodes[i].longitude,
      orderedNodes[i + 1].latitude, orderedNodes[i + 1].longitude
    )
  }
  measuredLength = Number(measuredLength.toFixed(2))
  const installedLength = Number((measuredLength * (1 + slackPct / 100)).toFixed(2))

  // ── TRANSACTION ROLLBACK SIMULATION ──
  // If route creation succeeds but segment or cable insert fails, we manually delete
  // the created parent route, which cascades to delete segments, and we clean up cable if needed.
  let createdRouteId: string | null = null

  try {
    // A. Insert parent route
    const { data: newRoute, error: routeErr } = await supabase
      .from('fiber_routes')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
        route_id_tag: params.routeIdTag.trim(),
        measured_length_feet: measuredLength,
        slack_percentage: slackPct,
        installed_length_feet: installedLength,
        conduit_diameter_inches: conduitDiam,
        fill_percentage: 0.0,
        spare_capacity: 100.0,
        installation_type: params.installationType,
        route_purpose: params.routePurpose ?? 'camera_backbone',
      })
      .select('id, route_id_tag, measured_length_feet')
      .single()

    if (routeErr || !newRoute) {
      throw new Error(`Failed to create parent route record: ${routeErr?.message ?? 'unknown error'}`)
    }

    createdRouteId = newRoute.id

    // B. Insert ordered segments
    const segmentInserts = orderedNodes.slice(0, -1).map((node, i) => {
      const nextNode = orderedNodes[i + 1]
      const segLength = Number(
        haversineDistanceFeet(node.latitude, node.longitude, nextNode.latitude, nextNode.longitude).toFixed(2)
      )
      return {
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
        route_id: newRoute.id,
        segment_index: i,
        start_latitude: node.latitude,
        start_longitude: node.longitude,
        end_latitude: nextNode.latitude,
        end_longitude: nextNode.longitude,
        length_feet: segLength,
        slack_feet: 0.0,
      }
    })

    const { error: segmentsErr } = await supabase
      .from('fiber_route_segments')
      .insert(segmentInserts)

    if (segmentsErr) {
      throw new Error(`Failed to insert route segments: ${segmentsErr.message}`)
    }

    // C. Insert cable from catalog if catalog item was chosen
    if (params.cableCatalogId) {
      const { data: catalogItem, error: catErr } = await supabase
        .from('fiber_catalog')
        .select('*')
        .eq('id', params.cableCatalogId)
        .single()

      if (catErr || !catalogItem) {
        throw new Error('Selected cable catalog item not found in catalog.')
      }

      const cableTag = `CBL-${newRoute.route_id_tag}`
      const { error: cableErr } = await supabase
        .from('fiber_cables')
        .insert({
          project_id: params.projectId,
          organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
          route_id: newRoute.id,
          cable_tag: cableTag,
          cable_type: 'Backbone',
          fiber_count: catalogItem.fiber_count,
          strand_count: catalogItem.fiber_count,
          length_ft: installedLength,
          install_status: 'Planned',
          test_status: 'Not Tested',
          manufacturer: catalogItem.manufacturer,
          model: catalogItem.part_number, // Map catalog part_number to cables model field
          from_node_id: orderedNodes[0].id,
          to_node_id: orderedNodes[orderedNodes.length - 1].id,
          notes: params.notes,
        })

      if (cableErr) {
        throw new Error(`Cable creation failed: ${cableErr.message}`)
      }
    }

    // D. Revalidate paths
    revalidatePath(`/projects/${params.projectId}/maps`)
    revalidatePath(`/projects/${params.projectId}/fiber`)
    revalidatePath(`/projects/${params.projectId}/bom`)
    revalidatePath(`/projects/${params.projectId}/overview`)

    return {
      success: true,
      data: newRoute,
      warning: hasSharedSegment ? 'One or more segments in this path share existing routes. Shared infrastructure allowed.' : undefined
    }
  } catch (err: any) {
    // Rollback cleanup: remove the created parent route if inserts failed.
    // (Existing postgres schema triggers/cascades will clean up segments on delete of parent route).
    if (createdRouteId) {
      await supabase.from('fiber_routes').delete().eq('id', createdRouteId)
    }
    return { success: false, error: err.message ?? 'Failed to create route or cable.' }
  }
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
    bufferTubesRes,
    cablePassThroughsRes,
    spliceTraysRes,
    fiberAssignmentsRes,
    fiberAssignmentStrandsRes,
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
    supabase.from('fiber_buffer_tubes').select('*').eq('project_id', projectId).order('tube_number'),
    supabase.from('fiber_cable_pass_throughs').select('*').eq('project_id', projectId).order('sequence_order'),
    supabase.from('splice_trays').select('*').eq('project_id', projectId).order('tray_number'),
    supabase.from('fiber_assignments').select('*').eq('project_id', projectId),
    supabase.from('fiber_assignment_strands').select('*').eq('project_id', projectId),
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
    splices: spliceRecordsRes.data ?? [],
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
    bufferTubes: bufferTubesRes.data ?? [],
    cablePassThroughs: cablePassThroughsRes.data ?? [],
    spliceTrays: spliceTraysRes.data ?? [],
    fiberAssignments: fiberAssignmentsRes.data ?? [],
    fiberAssignmentStrands: fiberAssignmentStrandsRes.data ?? [],
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
      organization_id: '00000000-0000-0000-0000-000000000000', // placeholder — trigger will override via set_fiber_organization_id_from_project
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
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
    organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
          organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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

export async function deleteFiberRoute(params: { id: string; projectId: string }): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Verify user authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) {
    return { success: false, error: 'Not authenticated.' }
  }

  // 2. Fetch linked cables for this route
  const { data: cables, error: cablesQueryErr } = await supabase
    .from('fiber_cables')
    .select('id')
    .eq('route_id', params.id)

  if (cablesQueryErr) {
    return { success: false, error: `Failed to query route cables: ${cablesQueryErr.message}` }
  }

  const cableIds = (cables ?? []).map(c => c.id)

  // 3. Check BOM references
  const { count: bomCount, error: bomCheckErr } = await supabase
    .from('bom_items')
    .select('id', { count: 'exact', head: true })
    .eq('fiber_route_id', params.id)

  if (bomCheckErr) {
    return { success: false, error: `Failed to check BOM dependencies: ${bomCheckErr.message}` }
  }

  if (bomCount && bomCount > 0) {
    return { success: false, error: 'This route cannot be deleted because it has active BOM references.' }
  }

  if (cableIds.length > 0) {
    // 4. Check active camera assignments
    const { count: backboneCount } = await supabase
      .from('camera_fiber_assignments')
      .select('id', { count: 'exact', head: true })
      .in('backbone_cable_id', cableIds)

    const { count: dropCount } = await supabase
      .from('camera_fiber_assignments')
      .select('id', { count: 'exact', head: true })
      .in('drop_cable_id', cableIds)

    // 5. Check active general fiber assignments
    const { count: fiberAssignCount } = await supabase
      .from('fiber_assignments')
      .select('id', { count: 'exact', head: true })
      .in('cable_id', cableIds)

    if (
      (backboneCount && backboneCount > 0) ||
      (dropCount && dropCount > 0) ||
      (fiberAssignCount && fiberAssignCount > 0)
    ) {
      return { success: false, error: 'This route cannot be deleted because it has assigned strands, splices, or linked field work.' }
    }

    // 6. Check active splices
    const { count: spliceFromCount } = await supabase
      .from('fiber_splice_records')
      .select('id', { count: 'exact', head: true })
      .in('from_cable_id', cableIds)

    const { count: spliceToCount } = await supabase
      .from('fiber_splice_records')
      .select('id', { count: 'exact', head: true })
      .in('to_cable_id', cableIds)

    if (
      (spliceFromCount && spliceFromCount > 0) ||
      (spliceToCount && spliceToCount > 0)
    ) {
      return { success: false, error: 'This route cannot be deleted because it has active strands, splices, or linked field work.' }
    }
  }

  // 7. Explicitly delete linked cables first (to prevent orphaned strands/tubes)
  if (cableIds.length > 0) {
    const { error: cablesDeleteErr } = await supabase
      .from('fiber_cables')
      .delete()
      .in('id', cableIds)

    if (cablesDeleteErr) {
      return { success: false, error: `Failed to delete linked cables: ${cablesDeleteErr.message}` }
    }
  }

  // 8. Delete the parent route (automatically cascades to delete ordered segments)
  const { error: routeDeleteErr } = await supabase
    .from('fiber_routes')
    .delete()
    .eq('id', params.id)

  if (routeDeleteErr) {
    return { success: false, error: `Failed to delete route: ${routeDeleteErr.message}` }
  }

  // 9. Revalidate paths
  revalidatePath(`/projects/${params.projectId}/maps`)
  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  revalidatePath(`/projects/${params.projectId}/overview`)

  return { success: true }
}

// ─── 8.1 Update fiber route ──────────────────────────────────────────────────

export async function updateFiberRoute(params: {
  id: string
  projectId: string
  routeIdTag?: string
  conduitDiameterInches?: number
  slackPercentage?: number
  installationType?: 'underground' | 'aerial' | 'direct_buried'
  segments?: {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
  }[]
}) {
  const supabase = await createClient()

  // First, find the route to get its current values
  const { data: route, error: fetchErr } = await supabase
    .from('fiber_routes')
    .select('measured_length_feet')
    .eq('id', params.id)
    .single()

  if (fetchErr) return { error: `Route not found: ${fetchErr.message}` }

  let measuredLength = Number(route.measured_length_feet || 0)

  // If new segments coordinates are provided, update segments table
  if (params.segments && params.segments.length > 0) {
    // Delete existing segments
    const { error: delErr } = await supabase
      .from('fiber_route_segments')
      .delete()
      .eq('route_id', params.id)

    if (delErr) console.error('Failed to delete old segments:', delErr.message)

    // Insert new segments and recalculate length
    measuredLength = 0
    const segmentInserts = params.segments.map((seg, idx) => {
      const lenFt = haversineDistanceFeet(seg.startLat, seg.startLng, seg.endLat, seg.endLng)
      measuredLength += lenFt
      return {
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        route_id: params.id,
        segment_index: idx,
        start_latitude: seg.startLat,
        start_longitude: seg.startLng,
        end_latitude: seg.endLat,
        end_longitude: seg.endLng,
        length_feet: Number(lenFt.toFixed(2)),
        slack_feet: 0.0
      }
    })

    const { error: insErr } = await supabase
      .from('fiber_route_segments')
      .insert(segmentInserts)

    if (insErr) {
      console.error('Failed to insert new segments:', insErr.message)
      return { error: `Failed to update route segments: ${insErr.message}` }
    }
  }

  // Re-calculate installed length if slack percentage is updated or if segments were updated
  let installedLength = undefined
  const slackPct = params.slackPercentage !== undefined ? params.slackPercentage : 10.0
  if (measuredLength !== undefined) {
    const { data: segments } = await supabase
      .from('fiber_route_segments')
      .select('slack_feet')
      .eq('route_id', params.id)

    const segmentSlack = segments ? segments.reduce((sum, seg) => sum + (seg.slack_feet ?? 0), 0) : 0
    installedLength = Number((measuredLength * (1 + slackPct / 100) + segmentSlack).toFixed(2))
  }

  const { error } = await supabase
    .from('fiber_routes')
    .update({
      route_id_tag: params.routeIdTag,
      conduit_diameter_inches: params.conduitDiameterInches,
      slack_percentage: params.slackPercentage,
      measured_length_feet: Number(measuredLength.toFixed(2)),
      installed_length_feet: installedLength,
      installation_type: params.installationType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return { error: `Failed to update route: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
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
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
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
  trayId?: string | null
  spliceLossDb?: number | null
  spliceType?: 'Fusion' | 'Mechanical' | 'Pass Through'
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_splice_records')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
      enclosure_id: params.enclosureId,
      from_cable_id: params.fromCableId,
      from_strand_id: params.fromStrandId,
      to_cable_id: params.toCableId,
      to_strand_id: params.toStrandId,
      assigned_camera_id: params.assignedCameraId,
      splice_status: 'Spliced',
      test_status: 'Not Tested',
      notes: params.notes,
      tray_id: params.trayId,
      splice_loss_db: params.spliceLossDb,
      splice_type: params.spliceType || 'Fusion',
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

  // 1. Insert into legacy table
  const { data, error } = await supabase
    .from('camera_fiber_assignment_strands')
    .upsert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
      camera_fiber_assignment_id: params.cameraFiberAssignmentId,
      camera_id: params.cameraId,
      strand_id: params.strandId,
      strand_role: params.strandRole,
    }, { onConflict: 'strand_id' })
    .select()
    .single()

  if (error) return { error: `Failed to assign strand: ${error.message}` }

  // 2. Also insert into normalized unified tables
  // 2a. Find or create unified fiber assignment for this camera
  let { data: unifiedAssignment } = await supabase
    .from('fiber_assignments')
    .select('id')
    .eq('camera_id', params.cameraId)
    .single()

  if (!unifiedAssignment) {
    const { data: newUA, error: newUAErr } = await supabase
      .from('fiber_assignments')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
        camera_id: params.cameraId,
        purpose: 'Camera',
      })
      .select('id')
      .single()

    if (!newUAErr && newUA) {
      unifiedAssignment = newUA
    }
  }

  if (unifiedAssignment) {
    // 2b. Insert into fiber_assignment_strands
    await supabase
      .from('fiber_assignment_strands')
      .upsert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000', // trigger fills
        assignment_id: unifiedAssignment.id,
        strand_id: params.strandId,
        strand_role: params.strandRole,
      }, { onConflict: 'strand_id' })
  }

  // 3. Update the strand's assigned_camera_id
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

  // 1. Clear legacy assignments
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

  // 2. Clear normalized unified assignments
  const { data: unifiedAssignments } = await supabase
    .from('fiber_assignments')
    .select('id')
    .eq('camera_id', params.cameraId)

  if (unifiedAssignments && unifiedAssignments.length > 0) {
    const assignmentIds = unifiedAssignments.map(ua => ua.id)
    
    // Get strands linked to these unified assignments
    const { data: unifiedStrands } = await supabase
      .from('fiber_assignment_strands')
      .select('strand_id')
      .in('assignment_id', assignmentIds)
      
    if (unifiedStrands && unifiedStrands.length > 0) {
      const strandIds = unifiedStrands.map(us => us.strand_id)
      await supabase
        .from('fiber_strands')
        .update({ assigned_camera_id: null, updated_at: new Date().toISOString() })
        .in('id', strandIds)
    }

    // Delete from join table first, then parent table
    await supabase
      .from('fiber_assignment_strands')
      .delete()
      .in('assignment_id', assignmentIds)

    await supabase
      .from('fiber_assignments')
      .delete()
      .in('id', assignmentIds)
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

// ─── 17. Create Splice Tray ──────────────────────────────────────────────────
export async function createSpliceTray(params: {
  projectId: string
  enclosureId: string
  trayNumber: number
  capacity: number
  notes?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('splice_trays')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger overrides
      enclosure_id: params.enclosureId,
      tray_number: params.trayNumber,
      capacity: params.capacity,
      notes: params.notes,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create splice tray: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

// ─── 18. Assign Duplex Fiber Pair ─────────────────────────────────────────────
export async function assignDuplexFiberPair(params: {
  projectId: string
  cameraId?: string | null
  switchId?: string | null
  cabinetId?: string | null
  purpose: 'Camera' | 'Switch Uplink' | 'Spare' | 'Future Expansion' | 'Wireless Backhaul' | 'Custom'
  notes?: string
  strands: Array<{
    strandId: string
    strandRole: 'TX' | 'RX' | 'BiDi' | 'Primary' | 'Secondary' | 'Spare' | 'Custom'
  }>
}) {
  const supabase = await createClient()

  // 1. Create fiber assignment
  const { data: assignment, error: assignErr } = await supabase
    .from('fiber_assignments')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger overrides
      camera_id: params.cameraId === '' ? null : params.cameraId,
      switch_id: params.switchId === '' ? null : params.switchId,
      cabinet_id: params.cabinetId === '' ? null : params.cabinetId,
      purpose: params.purpose,
      notes: params.notes,
    })
    .select()
    .single()

  if (assignErr) return { error: `Failed to create assignment: ${assignErr.message}` }

  // 2. Insert assignment strands
  const strandPayloads = params.strands.map(s => ({
    project_id: params.projectId,
    organization_id: '00000000-0000-0000-0000-000000000000', // trigger overrides
    assignment_id: assignment.id,
    strand_id: s.strandId,
    strand_role: s.strandRole,
  }))

  const { error: strandsErr } = await supabase
    .from('fiber_assignment_strands')
    .insert(strandPayloads)

  if (strandsErr) {
    // Rollback parent record
    await supabase.from('fiber_assignments').delete().eq('id', assignment.id)
    return { error: `Failed to create assignment strands: ${strandsErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, assignment }
}

// ─── 19. Create Cable Pass-Through ───────────────────────────────────────────
export async function createCablePassThrough(params: {
  projectId: string
  cableId: string
  nodeId: string
  sequenceOrder: number
  hasSlackLoop?: boolean
  slackLengthFt?: number
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fiber_cable_pass_throughs')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger overrides
      cable_id: params.cableId,
      node_id: params.nodeId,
      sequence_order: params.sequenceOrder,
      has_slack_loop: params.hasSlackLoop || false,
      slack_length_ft: params.slackLengthFt || 0.00,
    })
    .select()
    .single()

  if (error) return { error: `Failed to create cable pass-through: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true, data }
}

// ─── 20. Field Technician Mode Splicing and Assignment Actions ───────────────

export async function assignCameraFiberTechnicianMode(params: {
  projectId: string
  cameraId: string
  sourceNodeId: string
  enclosureId: string // mainhole enclosure ID
  backboneCableId: string
  txStrandId: string // backbone TX strand ID
  rxStrandId: string // backbone RX strand ID
  cabinetId: string // selected cabinet ID
}) {
  const supabase = await createClient()

  // 1. Fetch camera details
  const { data: camera, error: cameraErr } = await supabase
    .from('camera_locations')
    .select('camera_id_tag, latitude, longitude')
    .eq('id', params.cameraId)
    .single()

  if (cameraErr || !camera) {
    return { error: `Failed to find camera: ${cameraErr?.message || 'Not found'}` }
  }

  // 2. Fetch cabinet details
  const { data: cabinet, error: cabinetErr } = await supabase
    .from('cabinets')
    .select('cabinet_tag, latitude, longitude')
    .eq('id', params.cabinetId)
    .single()

  if (cabinetErr || !cabinet) {
    return { error: `Failed to find cabinet: ${cabinetErr?.message || 'Not found'}` }
  }

  // 3. Resolve Cabinet Node
  let cabinetNode = null
  const { data: existingNode } = await supabase
    .from('fiber_nodes')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('node_tag', cabinet.cabinet_tag)
    .eq('node_type', 'Cabinet')
    .maybeSingle()

  if (existingNode) {
    cabinetNode = existingNode
  } else {
    const { data: newNode, error: nodeErr } = await supabase
      .from('fiber_nodes')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        node_tag: cabinet.cabinet_tag,
        node_type: 'Cabinet',
        latitude: cabinet.latitude,
        longitude: cabinet.longitude,
        status: 'Planned',
        size_description: 'Cabinet Mount Transition',
        slack_loop_ft: 10.0,
        notes: `Cabinet node for ${cabinet.cabinet_tag}`
      })
      .select()
      .single()

    if (nodeErr) return { error: `Failed to create cabinet node: ${nodeErr.message}` }
    cabinetNode = newNode
  }

  // 4. Resolve Drop Cable
  const dropCableTag = `DROP-${camera.camera_id_tag}-6F`
  let dropCable = null
  const { data: existingDrop } = await supabase
    .from('fiber_cables')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('cable_tag', dropCableTag)
    .maybeSingle()

  if (existingDrop) {
    dropCable = existingDrop
  } else {
    const { data: newCable, error: cableErr } = await supabase
      .from('fiber_cables')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        cable_tag: dropCableTag,
        cable_type: 'Drop',
        fiber_count: 6,
        from_node_id: params.sourceNodeId,
        to_node_id: cabinetNode.id,
        length_ft: 150.0,
        install_status: 'Planned',
        test_status: 'Not Tested',
        notes: `Drop cable for camera ${camera.camera_id_tag}`
      })
      .select()
      .single()

    if (cableErr) return { error: `Failed to create drop cable: ${cableErr.message}` }
    dropCable = newCable

    // Insert BOM item for this Drop Cable
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'DROP-CBL-SM',
      description: `SM Drop Cable 6F (${camera.camera_id_tag})`,
      quantity: 150,
      unit: 'ft',
      unit_cost: 0.45,
      source: 'catalog',
      manufacturer: 'Generic',
      status: 'Planned',
    })
  }

  // 5. Resolve Cabinet Splice Enclosure
  const cabinetEnclosureTag = `ENC-${cabinet.cabinet_tag}`
  let cabinetEnclosure = null
  const { data: existingEnclosure } = await supabase
    .from('fiber_enclosures')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('enclosure_tag', cabinetEnclosureTag)
    .maybeSingle()

  if (existingEnclosure) {
    cabinetEnclosure = existingEnclosure
  } else {
    const { data: newEnclosure, error: enclosureErr } = await supabase
      .from('fiber_enclosures')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        enclosure_tag: cabinetEnclosureTag,
        enclosure_type: 'Splice Enclosure',
        node_id: cabinetNode.id,
        cabinet_id: params.cabinetId,
        capacity: 12,
        installed_status: 'Planned'
      })
      .select()
      .single()

    if (enclosureErr) return { error: `Failed to create cabinet enclosure: ${enclosureErr.message}` }
    cabinetEnclosure = newEnclosure
  }

  // 6. Ensure Splice Trays exist
  let mainholeTray = null
  const { data: existingMhTray } = await supabase
    .from('splice_trays')
    .select('*')
    .eq('enclosure_id', params.enclosureId)
    .eq('tray_number', 1)
    .maybeSingle()

  if (existingMhTray) {
    mainholeTray = existingMhTray
  } else {
    const { data: newTray, error: trayErr } = await supabase
      .from('splice_trays')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        enclosure_id: params.enclosureId,
        tray_number: 1,
        capacity: 12
      })
      .select()
      .single()

    if (trayErr) return { error: `Failed to create Mainhole Splice Tray: ${trayErr.message}` }
    mainholeTray = newTray
  }

  let cabinetTray = null
  const { data: existingCabTray } = await supabase
    .from('splice_trays')
    .select('*')
    .eq('enclosure_id', cabinetEnclosure.id)
    .eq('tray_number', 1)
    .maybeSingle()

  if (existingCabTray) {
    cabinetTray = existingCabTray
  } else {
    const { data: newTray, error: trayErr } = await supabase
      .from('splice_trays')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        enclosure_id: cabinetEnclosure.id,
        tray_number: 1,
        capacity: 12
      })
      .select()
      .single()

    if (trayErr) return { error: `Failed to create Cabinet Splice Tray: ${trayErr.message}` }
    cabinetTray = newTray
  }

  // 7. Resolve Cabinet Pigtail Cable
  const pigtailCableTag = `PIGTAIL-${camera.camera_id_tag}`
  let pigtailCable = null
  const { data: existingPigtail } = await supabase
    .from('fiber_cables')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('cable_tag', pigtailCableTag)
    .maybeSingle()

  if (existingPigtail) {
    pigtailCable = existingPigtail
  } else {
    const { data: newPigtail, error: pigtailErr } = await supabase
      .from('fiber_cables')
      .insert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        cable_tag: pigtailCableTag,
        cable_type: 'Custom',
        fiber_count: 2,
        from_node_id: cabinetNode.id,
        to_node_id: cabinetNode.id,
        length_ft: 10.0,
        install_status: 'Planned',
        test_status: 'Not Tested',
        notes: `Cabinet pigtail for camera ${camera.camera_id_tag}`
      })
      .select()
      .single()

    if (pigtailErr) return { error: `Failed to create cabinet pigtail cable: ${pigtailErr.message}` }
    pigtailCable = newPigtail
  }

  // 8. Fetch strands for drop and pigtail cables
  const { data: dropStrands, error: dropStrandsErr } = await supabase
    .from('fiber_strands')
    .select('*')
    .eq('cable_id', dropCable.id)
    .order('strand_number')

  if (dropStrandsErr || !dropStrands || dropStrands.length < 2) {
    return { error: 'Failed to retrieve drop cable strands' }
  }

  const { data: pigtailStrands, error: pigtailStrandsErr } = await supabase
    .from('fiber_strands')
    .select('*')
    .eq('cable_id', pigtailCable.id)
    .order('strand_number')

  if (pigtailStrandsErr || !pigtailStrands || pigtailStrands.length < 2) {
    return { error: 'Failed to retrieve cabinet pigtail strands' }
  }

  // 9. Save Camera Fiber Assignment
  // Clear any existing assignments first
  await clearStrandAssignmentsForCamera({
    projectId: params.projectId,
    cameraId: params.cameraId
  })

  // Upsert camera fiber assignment
  const { data: assignment, error: assignErr } = await supabase
    .from('camera_fiber_assignments')
    .upsert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      camera_id: params.cameraId,
      source_node_id: params.sourceNodeId,
      enclosure_id: params.enclosureId,
      backbone_cable_id: params.backboneCableId,
      drop_cable_id: dropCable.id,
      assigned_cabinet_id: params.cabinetId,
      fiber_path_status: 'Fiber Pair Assigned',
      splice_status: 'Not Spliced',
      updated_at: new Date().toISOString()
    }, { onConflict: 'camera_id' })
    .select()
    .single()

  if (assignErr) return { error: `Failed to save camera fiber assignment: ${assignErr.message}` }

  // Insert unified fiber assignment
  const { data: unifiedAssignment, error: unifiedErr } = await supabase
    .from('fiber_assignments')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      camera_id: params.cameraId,
      cabinet_id: params.cabinetId,
      purpose: 'Camera',
      notes: `Field tech mode assignment for camera ${camera.camera_id_tag}`
    })
    .select()
    .single()

  if (unifiedErr) return { error: `Failed to create unified assignment: ${unifiedErr.message}` }

  // Link the 6 strands
  const strandLinks = [
    { id: params.txStrandId, role: 'TX' },
    { id: params.rxStrandId, role: 'RX' },
    { id: dropStrands[0].id, role: 'TX' },
    { id: dropStrands[1].id, role: 'RX' },
    { id: pigtailStrands[0].id, role: 'TX' },
    { id: pigtailStrands[1].id, role: 'RX' }
  ]

  for (const link of strandLinks) {
    // Legacy join table
    await supabase
      .from('camera_fiber_assignment_strands')
      .upsert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        camera_fiber_assignment_id: assignment.id,
        camera_id: params.cameraId,
        strand_id: link.id,
        strand_role: link.role
      }, { onConflict: 'strand_id' })

    // Normalized join table
    await supabase
      .from('fiber_assignment_strands')
      .upsert({
        project_id: params.projectId,
        organization_id: '00000000-0000-0000-0000-000000000000',
        assignment_id: unifiedAssignment.id,
        strand_id: link.id,
        strand_role: link.role
      }, { onConflict: 'strand_id' })

    // Update strand's assigned camera
    await supabase
      .from('fiber_strands')
      .update({
        assigned_camera_id: params.cameraId,
        updated_at: new Date().toISOString()
      })
      .eq('id', link.id)
  }

  // 10. Clear any old splices for this camera to prevent duplicates
  await supabase
    .from('fiber_splice_records')
    .delete()
    .eq('project_id', params.projectId)
    .eq('assigned_camera_id', params.cameraId)

  // 11. Create the 4 Planned splices
  const splicesPayload = [
    // Mainhole Splice 1: Backbone TX -> Drop TX
    {
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      enclosure_id: params.enclosureId,
      from_cable_id: params.backboneCableId,
      from_strand_id: params.txStrandId,
      to_cable_id: dropCable.id,
      to_strand_id: dropStrands[0].id,
      assigned_camera_id: params.cameraId,
      splice_status: 'Planned',
      tray_id: mainholeTray.id,
      splice_type: 'Fusion'
    },
    // Mainhole Splice 2: Backbone RX -> Drop RX
    {
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      enclosure_id: params.enclosureId,
      from_cable_id: params.backboneCableId,
      from_strand_id: params.rxStrandId,
      to_cable_id: dropCable.id,
      to_strand_id: dropStrands[1].id,
      assigned_camera_id: params.cameraId,
      splice_status: 'Planned',
      tray_id: mainholeTray.id,
      splice_type: 'Fusion'
    },
    // Cabinet Splice 1: Drop TX -> Pigtail TX
    {
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      enclosure_id: cabinetEnclosure.id,
      from_cable_id: dropCable.id,
      from_strand_id: dropStrands[0].id,
      to_cable_id: pigtailCable.id,
      to_strand_id: pigtailStrands[0].id,
      assigned_camera_id: params.cameraId,
      splice_status: 'Planned',
      tray_id: cabinetTray.id,
      splice_type: 'Fusion'
    },
    // Cabinet Splice 2: Drop RX -> Pigtail RX
    {
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000',
      enclosure_id: cabinetEnclosure.id,
      from_cable_id: dropCable.id,
      from_strand_id: dropStrands[1].id,
      to_cable_id: pigtailCable.id,
      to_strand_id: pigtailStrands[1].id,
      assigned_camera_id: params.cameraId,
      splice_status: 'Planned',
      tray_id: cabinetTray.id,
      splice_type: 'Fusion'
    }
  ]

  const { error: spliceErr } = await supabase
    .from('fiber_splice_records')
    .insert(splicesPayload)

  if (spliceErr) {
    return { error: `Failed to create splices: ${spliceErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/cameras`)
  revalidatePath(`/projects/${params.projectId}/bom`)

  return { success: true, data: assignment }
}

export async function completeCameraFiberSplices(params: {
  projectId: string
  cameraId: string
  location: 'mainhole' | 'cabinet'
}) {
  const supabase = await createClient()

  // 1. Get current assignment
  const { data: assignment, error: assignErr } = await supabase
    .from('camera_fiber_assignments')
    .select('*')
    .eq('camera_id', params.cameraId)
    .single()

  if (assignErr || !assignment) {
    return { error: `Failed to find assignment: ${assignErr?.message || 'Not found'}` }
  }

  // 2. Resolve target enclosure
  if (!assignment.enclosure_id) {
    return { error: 'Mainhole enclosure is not assigned to this camera' }
  }

  let targetEnclosureId: string = assignment.enclosure_id
  if (params.location === 'cabinet') {
    if (!assignment.assigned_cabinet_id) {
      return { error: 'Cabinet is not assigned to this camera' }
    }
    const { data: cabEnclosure } = await supabase
      .from('fiber_enclosures')
      .select('id')
      .eq('cabinet_id', assignment.assigned_cabinet_id)
      .eq('project_id', params.projectId)
      .maybeSingle()

    if (!cabEnclosure) return { error: 'Cabinet enclosure not found' }
    targetEnclosureId = cabEnclosure.id
  }

  // 3. Update splice records in target enclosure for this camera to 'Completed'
  const { error: updateSpliceErr } = await supabase
    .from('fiber_splice_records')
    .update({
      splice_status: 'Completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('enclosure_id', targetEnclosureId)
    .eq('assigned_camera_id', params.cameraId)

  if (updateSpliceErr) {
    return { error: `Failed to complete splices: ${updateSpliceErr.message}` }
  }

  // 4. Retrieve all splices for this camera to compute overall status
  const { data: cameraSplices } = await supabase
    .from('fiber_splice_records')
    .select('*')
    .eq('assigned_camera_id', params.cameraId)
    .eq('project_id', params.projectId)

  const mainholeSplices = (cameraSplices || []).filter(s => s.enclosure_id === assignment.enclosure_id)
  const cabinetSplices = (cameraSplices || []).filter(s => s.enclosure_id !== assignment.enclosure_id)

  const mainholeDone = mainholeSplices.length > 0 && mainholeSplices.every(s => s.splice_status === 'Completed')
  const cabinetDone = cabinetSplices.length > 0 && cabinetSplices.every(s => s.splice_status === 'Completed')

  let newPathStatus: FiberPathStatus = 'Fiber Pair Assigned'
  if (mainholeDone && cabinetDone) {
    newPathStatus = 'Fiber Pair Complete'
  } else if (mainholeDone) {
    newPathStatus = 'Mainhole Splices Complete'
  } else if (cabinetDone) {
    newPathStatus = 'Cabinet Splices Complete'
  }

  // Update assignment status
  const { error: updateAssignErr } = await supabase
    .from('camera_fiber_assignments')
    .update({
      fiber_path_status: newPathStatus,
      splice_status: (mainholeDone && cabinetDone) ? 'Spliced' : 'Not Spliced',
      updated_at: new Date().toISOString()
    })
    .eq('camera_id', params.cameraId)

  if (updateAssignErr) {
    return { error: `Failed to update assignment status: ${updateAssignErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/cameras`)

  return { success: true }
}





'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'

type FiberNodeInsert = Database['public']['Tables']['fiber_nodes']['Insert']
type FiberRouteInsert = Database['public']['Tables']['fiber_routes']['Insert']
type FiberRouteSegmentInsert = Database['public']['Tables']['fiber_route_segments']['Insert']
type FiberCableInsert = Database['public']['Tables']['fiber_cables']['Insert']

// 1. Fetch fiber catalog items
export async function getFiberCatalog() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fiber_catalog')
    .select('*')
    .order('manufacturer', { ascending: true })
    .order('fiber_count', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch fiber catalog: ${error.message}`)
  }
  return data
}

// 2. Fetch all fiber components for a project
export async function getFiberDesignData(projectId: string) {
  const supabase = await createClient()

  const [
    nodesRes,
    enclosuresRes,
    routesRes,
    segmentsRes,
    cablesRes,
    splicesRes,
    assignmentsRes,
    camerasRes
  ] = await Promise.all([
    supabase.from('fiber_nodes').select('*').eq('project_id', projectId).order('node_id_tag', { ascending: true }),
    supabase.from('fiber_enclosures').select('*'),
    supabase.from('fiber_routes').select('*').eq('project_id', projectId).order('route_id_tag', { ascending: true }),
    supabase.from('fiber_route_segments').select('*').order('segment_index', { ascending: true }),
    supabase.from('fiber_cables').select('*').eq('project_id', projectId),
    supabase.from('fiber_splices').select('*'),
    supabase.from('camera_fiber_assignments').select('*'),
    supabase.from('camera_locations').select('id, camera_id_tag, status').eq('project_id', projectId)
  ])

  if (nodesRes.error) throw new Error(`Nodes fetch error: ${nodesRes.error.message}`)
  if (routesRes.error) throw new Error(`Routes fetch error: ${routesRes.error.message}`)

  return {
    nodes: nodesRes.data || [],
    enclosures: enclosuresRes.data || [],
    routes: routesRes.data || [],
    segments: segmentsRes.data || [],
    cables: cablesRes.data || [],
    splices: splicesRes.data || [],
    assignments: assignmentsRes.data || [],
    cameras: camerasRes.data || []
  }
}

// 3. Create a fiber node and its automatic BOM items
export async function createFiberNode(params: {
  projectId: string
  nodeIdTag: string
  nodeType: 'handhole' | 'pull_box' | 'splice_enclosure' | 'cabinet' | 'building_entry'
  latitude: number
  longitude: number
  elevationM?: number
  sizeDims?: string
  slackFeet?: number
  closureType?: 'Dome Closure' | 'Inline Closure' | 'Patch Panel' | 'ODF'
  capacity?: number
  notes?: string
}) {
  const supabase = await createClient()

  // Set default slack values
  const defaultSlack = (params.nodeType === 'handhole' || params.nodeType === 'cabinet') 
    ? 20.0 
    : params.nodeType === 'building_entry' 
      ? 10.0 
      : 0.0
  const slackVal = params.slackFeet !== undefined ? params.slackFeet : defaultSlack

  const defaultSize = params.nodeType === 'handhole' 
    ? '24x36x36' 
    : params.nodeType === 'pull_box' 
      ? '12x12x6' 
      : params.nodeType === 'cabinet' 
        ? 'Outdoor Cabinet' 
        : params.nodeType === 'building_entry' 
          ? 'Wall Transition Box' 
          : 'Dome Closure'

  const { data: newNode, error: nodeErr } = await supabase
    .from('fiber_nodes')
    .insert({
      project_id: params.projectId,
      node_id_tag: params.nodeIdTag,
      node_type: params.nodeType,
      latitude: params.latitude,
      longitude: params.longitude,
      elevation_m: params.elevationM || 0.0,
      size_dims: params.sizeDims || defaultSize,
      slack_feet: slackVal,
      notes: params.notes || ''
    })
    .select()
    .single()

  if (nodeErr) {
    return { error: `Failed to create fiber node: ${nodeErr.message}` }
  }

  // If node type is a splice enclosure, create its sub-specs
  if (params.nodeType === 'splice_enclosure') {
    const cType = params.closureType || 'Dome Closure'
    const cap = params.capacity || 12

    const { error: encErr } = await supabase
      .from('fiber_enclosures')
      .insert({
        id: newNode.id,
        closure_type: cType,
        capacity: cap,
        used_fibers: 0,
        spare_fibers: cap
      })

    if (encErr) {
      console.error('Failed to create enclosure specifications:', encErr)
    }

    // Auto BOM for Splice Enclosure
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Network',
      part_number: 'SE-CLOSURE',
      description: `Splice Enclosure (${cType}, ${cap}-Core Max)`,
      quantity: 1.00,
      unit: 'pcs',
      unit_cost: 450.00,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned'
    })
  } else if (params.nodeType === 'handhole') {
    // Auto BOM for Handhole
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Miscellaneous',
      part_number: 'HH-BOX',
      description: `Outside Plant Utility Handhole Box (${params.sizeDims || '24x36x36'})`,
      quantity: 1.00,
      unit: 'pcs',
      unit_cost: 850.00,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned'
    })
  } else if (params.nodeType === 'pull_box') {
    // Auto BOM for Pull Box
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Miscellaneous',
      part_number: 'PB-BOX',
      description: `Pull Box Outlet Fitting (${params.sizeDims || '12x12x6'})`,
      quantity: 1.00,
      unit: 'pcs',
      unit_cost: 150.00,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned'
    })
  } else if (params.nodeType === 'cabinet') {
    // Auto BOM for Cabinet
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Miscellaneous',
      part_number: 'CAB-OUTDOOR',
      description: `Outdoor Equipment Cabinet (${params.sizeDims || 'Outdoor Cabinet'})`,
      quantity: 1.00,
      unit: 'pcs',
      unit_cost: 1200.00,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned'
    })
  } else if (params.nodeType === 'building_entry') {
    // Auto BOM for Building Entry transition
    await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Miscellaneous',
      part_number: 'BLDG-ENTRY-KIT',
      description: `Building Entrance Transition Box (${params.sizeDims || 'Wall Transition Box'})`,
      quantity: 1.00,
      unit: 'pcs',
      unit_cost: 250.00,
      source: 'catalog',
      manufacturer: 'Generic',
      fiber_node_id: newNode.id,
      status: 'Planned'
    })
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: newNode }
}

// 4. Delete fiber node
export async function deleteFiberNode(params: {
  id: string
  projectId: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fiber_nodes')
    .delete()
    .eq('id', params.id)

  if (error) {
    return { error: `Failed to delete node: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

// Geodesic math formula: Haversine distance in feet
function getHaversineDistanceFeet(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const dMeters = R * c
  return dMeters * 3.28084 // Convert to feet
}

export async function createFiberRoute(params: {
  projectId: string
  routeIdTag: string
  conduitDiameterInches?: number
  slackPercentage?: number
  installationType: 'underground' | 'aerial' | 'direct_buried'
  segments: {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    slackFeet?: number
  }[]
  cableCatalogId?: string
  fiberCount?: number
  routePurpose?: 'camera_backbone' | 'camera_drop' | 'network_backbone' | 'power_monitoring' | 'spare'
}) {
  const supabase = await createClient()

  // 1. Calculate measured length by summing segments
  let measuredLength = 0
  const segmentInserts: any[] = []

  params.segments.forEach((seg, idx) => {
    const lenFeet = getHaversineDistanceFeet(seg.startLat, seg.startLng, seg.endLat, seg.endLng)
    measuredLength += lenFeet

    segmentInserts.push({
      segment_index: idx,
      start_latitude: seg.startLat,
      start_longitude: seg.startLng,
      end_latitude: seg.endLat,
      end_longitude: seg.endLng,
      length_feet: Number(lenFeet.toFixed(2)),
      slack_feet: seg.slackFeet || 0.0
    })
  })

  const slackPercent = params.slackPercentage !== undefined ? params.slackPercentage : 10.0
  const segmentSlackSum = params.segments.reduce((acc, s) => acc + (s.slackFeet || 0), 0)

  // installed_length_feet = (measured * (1 + slack% / 100)) + segment slack
  const installedLength = (measuredLength * (1 + slackPercent / 100)) + segmentSlackSum

  // 2. Insert fiber route
  const { data: newRoute, error: routeErr } = await supabase
    .from('fiber_routes')
    .insert({
      project_id: params.projectId,
      route_id_tag: params.routeIdTag,
      measured_length_feet: Number(measuredLength.toFixed(2)),
      slack_percentage: slackPercent,
      installed_length_feet: Number(installedLength.toFixed(2)),
      conduit_diameter_inches: params.conduitDiameterInches || 2.0,
      fill_percentage: 0.0, // Calculated on cable installation
      spare_capacity: 100.0,
      installation_type: params.installationType,
      route_purpose: params.routePurpose || 'camera_backbone'
    })
    .select()
    .single()

  if (routeErr) {
    return { error: `Failed to create fiber route: ${routeErr.message}` }
  }

  // 3. Insert consecutive segments
  const finalSegments = segmentInserts.map(s => ({
    ...s,
    route_id: newRoute.id
  }))

  const { error: segErr } = await supabase
    .from('fiber_route_segments')
    .insert(finalSegments)

  if (segErr) {
    console.error('Failed to create route segments:', segErr)
  }

  // 4. Install Cable & Calculate Fill if catalog ID is provided
  let cableId = null
  let cableCost = 0.50 // fallback per foot
  let cableName = 'Generic Cable'
  let cablePart = 'N/A'
  let cableBrand = 'Generic'

  if (params.cableCatalogId) {
    const { data: catalogItem } = await supabase
      .from('fiber_catalog')
      .select('*')
      .eq('id', params.cableCatalogId)
      .single()

    if (catalogItem) {
      const fCount = params.fiberCount || catalogItem.fiber_count
      
      const { data: newCable, error: cableErr } = await supabase
        .from('fiber_cables')
        .insert({
          project_id: params.projectId,
          route_id: newRoute.id,
          cable_id_tag: `CAB-${params.routeIdTag}`,
          catalog_id: catalogItem.id,
          fiber_count: fCount
        })
        .select()
        .single()

      if (newCable) {
        cableId = newCable.id
        cableName = `${catalogItem.manufacturer} ${catalogItem.grade} ${catalogItem.mode} Cable`
        cablePart = catalogItem.part_number
        cableBrand = catalogItem.manufacturer
        // Convert catalog cost per meter to cost per foot
        cableCost = Number(catalogItem.cost_per_meter) / 3.28084

        // Conduit Fill Percentage formula: fill = (cable_dia / (conduit_dia * 25.4))^2 * 100
        const cableDia = Number(catalogItem.diameter_mm)
        const condDiaInches = params.conduitDiameterInches || 2.0
        const condDiaMm = condDiaInches * 25.4
        const fill = Math.min(((cableDia * cableDia) / (condDiaMm * condDiaMm)) * 100, 100.0)
        const spare = 100.0 - fill

        // Update route fill specs
        await supabase
          .from('fiber_routes')
          .update({
            fill_percentage: Number(fill.toFixed(2)),
            spare_capacity: Number(spare.toFixed(2))
          })
          .eq('id', newRoute.id)
      }
    }
  }

  // 5. Automated BOM Engineering Generation (using installed_length_feet)
  const bomItemsToInsert = [
    // Protective conduit duct
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'HDPE-COND',
      description: `HDPE Conduit Duct (${params.conduitDiameterInches || 2.0}-inch)`,
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 1.50,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned'
    },
    // Innerduct
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'INNER-1.25',
      description: '1.25-inch Corrugated Flexible Innerduct',
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 0.75,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned'
    },
    // Mule tape pull tape
    {
      project_id: params.projectId,
      category: 'Fiber',
      part_number: 'MULE-WP1250',
      description: 'Mule tape Cable Pulling Tape (1250 lbs)',
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: 0.15,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned'
    },
    // Future expansion anchors: Grounding Kits & Cable Wrap labels (architecture proofing)
    {
      project_id: params.projectId,
      category: 'Power',
      part_number: 'COND-GK-01',
      description: 'OSP Conduit Grounding Kit / Bond strap',
      quantity: 2.00,
      unit: 'pcs',
      unit_cost: 35.00,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned'
    },
    {
      project_id: params.projectId,
      category: 'Miscellaneous',
      part_number: 'CBL-LBL-01',
      description: 'Optical wrap marker tags',
      quantity: 4.00,
      unit: 'pcs',
      unit_cost: 2.50,
      source: 'catalog' as const,
      manufacturer: 'Generic',
      fiber_route_id: newRoute.id,
      status: 'Planned'
    }
  ]

  // Add the OSP Fiber Cable itself if catalog item was installed
  if (params.cableCatalogId) {
    bomItemsToInsert.push({
      project_id: params.projectId,
      category: 'Fiber',
      part_number: cablePart,
      description: `${cableName} (${params.fiberCount || 12} Cores)`,
      quantity: Number(installedLength.toFixed(2)),
      unit: 'ft',
      unit_cost: Number(cableCost.toFixed(2)),
      source: 'catalog' as const,
      manufacturer: cableBrand,
      fiber_route_id: newRoute.id,
      status: 'Planned'
    })
  }

  await supabase
    .from('bom_items')
    .insert(bomItemsToInsert)

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: newRoute }
}

// 6. Delete fiber route
export async function deleteFiberRoute(params: {
  id: string
  projectId: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fiber_routes')
    .delete()
    .eq('id', params.id)

  if (error) {
    return { error: `Failed to delete route: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

export async function saveFiberSplices(params: {
  projectId: string
  nodeId: string
  splices: {
    cableAId: string
    cableBId: string
    fiberNumA: number
    fiberNumB: number
    color?: string
    status?: 'planned' | 'installed' | 'tested' | 'abandoned'
  }[]
}) {
  const supabase = await createClient()

  // Rebuild splices in transaction
  // Delete old splices
  await supabase
    .from('fiber_splices')
    .delete()
    .eq('node_id', params.nodeId)

  if (params.splices.length > 0) {
    const spliceInserts = params.splices.map(s => ({
      node_id: params.nodeId,
      cable_a_id: s.cableAId,
      cable_b_id: s.cableBId,
      fiber_number_a: s.fiberNumA,
      fiber_number_b: s.fiberNumB,
      color: s.color || 'blue',
      status: s.status || 'planned'
    }))

    const { error: spliceErr } = await supabase
      .from('fiber_splices')
      .insert(spliceInserts)

    if (spliceErr) {
      return { error: `Failed to save splices: ${spliceErr.message}` }
    }
  }

  // Update enclosure ports counts
  const used = params.splices.filter(s => s.status === 'installed' || s.status === 'tested').length
  const { data: enclosure } = await supabase
    .from('fiber_enclosures')
    .select('capacity')
    .eq('id', params.nodeId)
    .single()

  if (enclosure) {
    const spare = Math.max(enclosure.capacity - used, 0)
    await supabase
      .from('fiber_enclosures')
      .update({
        used_fibers: used,
        spare_fibers: spare
      })
      .eq('id', params.nodeId)
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  return { success: true }
}

// 8. Assign a Camera to a Fiber cable link channel (supports redundant backup route patching)
export async function assignCameraFiber(params: {
  projectId: string
  cameraId: string
  cableId: string
  enclosureId: string
  txCore: number
  rxCore: number
  linkRole: 'primary' | 'backup'
}) {
  const supabase = await createClient()

  // Check unique constraints for cores (no core double assignment on the same cable)
  const { data: duplicate } = await supabase
    .from('camera_fiber_assignments')
    .select('id, camera_id')
    .eq('cable_id', params.cableId)
    .or(`tx_core.eq.${params.txCore},rx_core.eq.${params.rxCore},tx_core.eq.${params.rxCore},rx_core.eq.${params.txCore}`)
    .limit(1)

  if (duplicate && duplicate.length > 0 && duplicate[0].camera_id !== params.cameraId) {
    return { error: 'One or more of the selected fiber cores are already patched to another camera.' }
  }

  // Insert or update camera assignment
  const { error } = await supabase
    .from('camera_fiber_assignments')
    .upsert({
      camera_id: params.cameraId,
      cable_id: params.cableId,
      enclosure_id: params.enclosureId,
      tx_core: params.txCore,
      rx_core: params.rxCore,
      link_role: params.linkRole
    }, {
      onConflict: 'camera_id,link_role'
    })

  if (error) {
    return { error: `Failed to patch camera fiber assignment: ${error.message}` }
  }

  // Update camera status to in_progress or complete
  await supabase
    .from('camera_locations')
    .update({ status: 'in_progress' })
    .eq('id', params.cameraId)

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/cameras`)
  return { success: true }
}

// 9. Remove camera fiber assignment
export async function removeCameraFiber(params: {
  projectId: string
  cameraId: string
  linkRole: 'primary' | 'backup'
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('camera_fiber_assignments')
    .delete()
    .eq('camera_id', params.cameraId)
    .eq('link_role', params.linkRole)

  if (error) {
    return { error: `Failed to unpatch camera fiber assignment: ${error.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/cameras`)
  return { success: true }
}

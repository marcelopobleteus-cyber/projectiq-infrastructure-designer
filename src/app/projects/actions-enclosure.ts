'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { AssetCondition, WorkScope } from '@/lib/assetCondition'
import { defaultScopeFor, scopeBuysMaterial } from '@/lib/assetCondition'

/**
 * Caja de campo de camara.
 *
 * Es el punto de demarcacion fibra/cobre en el poste:
 *   la fibra de 12 llega y se ocupan los primeros 2 o 4 hilos, en orden de
 *   color (TIA-598-C: 1 Blue, 2 Orange, 3 Green, 4 Brown)
 *   se empalman por fusion contra pigtails, guardados en una bandeja
 *   los pigtails van al SFP del switch PoE de 4 puertos
 *   del switch sale Ethernet a un surge protector en linea
 *   del surge protector sale Ethernet a la camara, en el mismo poste
 *   la fuente alimenta el switch; la luz azul es indicacion publica
 *
 * Colocar una caja crea de una vez: el cabinet, el switch con sus puertos,
 * la bandeja de empalme, y las lineas de BOM del kit. A mano son cinco pasos
 * y por eso en los proyectos reales la cadena quedo sin armar.
 */

/** Limite fisico de Ethernet sobre cobre: 100 m. */
export const MAX_ETHERNET_DROP_FT = 328

export interface EnclosureKitSummary {
  id: string
  code: string
  name: string
  description: string | null
  cameraCapacity: number
  switchPortCount: number
  poeBudgetWatts: number
  itemCount: number
  materialCost: number
}

export async function getEnclosureKits(): Promise<{ kits: EnclosureKitSummary[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('enclosure_kits')
    .select('*, enclosure_kit_items(quantity, unit_cost)')
    .order('code')

  if (error) return { kits: [], error: error.message }

  const kits = (data ?? []).map((k: any) => ({
    id: k.id,
    code: k.code,
    name: k.name,
    description: k.description,
    cameraCapacity: k.camera_capacity,
    switchPortCount: k.switch_port_count,
    poeBudgetWatts: k.poe_budget_watts,
    itemCount: (k.enclosure_kit_items ?? []).length,
    materialCost: (k.enclosure_kit_items ?? []).reduce(
      (s: number, i: any) => s + Number(i.quantity) * Number(i.unit_cost), 0
    ),
  }))

  return { kits }
}

export interface PlaceKitResult {
  success?: boolean
  cabinetId?: string
  switchId?: string
  bomLinesCreated?: number
  portsCreated?: number
  /** Componentes existentes que se reutilizan: no generan material. */
  reusedComponents?: number
  warning?: string
  error?: string
}

/**
 * Coloca una caja de campo a partir de un kit.
 *
 * assetCondition existente/reuse NO genera material: la caja ya estaba y solo
 * se le trabaja adentro. Se crean igual el cabinet y el switch para poder
 * modelar la conectividad, pero sin lineas de compra.
 */
export async function placeEnclosureKit(params: {
  projectId: string
  kitId: string
  latitude: number
  longitude: number
  cabinetTag?: string
  /** Poste donde se monta, si ya existe como nodo. */
  mountedOnNodeId?: string
  mountType?: 'pole' | 'pedestal' | 'wall' | 'strand' | 'ground' | 'other'
  /** Condicion por defecto para todo el kit. */
  assetCondition?: AssetCondition
  workScope?: WorkScope
  /**
   * Condicion POR COMPONENTE, indexada por part_number.
   *
   * Una caja de campo son once cosas y no todas comparten historia: en las
   * actualizaciones la caja ya estaba y solo se cambio el switch, o al reves.
   * Sin esto habria que elegir una sola condicion para las once y cualquier
   * eleccion seria falsa para varias.
   */
  componentConditions?: Record<string, { assetCondition: AssetCondition; workScope?: WorkScope }>
  /** Componentes que el cliente provee, por part_number. */
  ownerFurnished?: Record<string, { suppliedBy?: string }>
}): Promise<PlaceKitResult> {
  const supabase = await createClient()

  const assetCondition = params.assetCondition ?? 'new'
  const workScope = params.workScope ?? defaultScopeFor(assetCondition)

  /** Resuelve los tres ejes para un componente concreto del kit. */
  const resolveComponent = (partNumber: string, defaultCondition?: AssetCondition) => {
    const override = params.componentConditions?.[partNumber]
    const cond = override?.assetCondition ?? defaultCondition ?? assetCondition
    const scope = override?.workScope ?? (override ? defaultScopeFor(cond) : workScope)
    const owner = params.ownerFurnished?.[partNumber]
    return {
      assetCondition: cond,
      workScope: scope,
      buysMaterial: scopeBuysMaterial(scope),
      supplyResponsibility: (owner ? 'owner' : 'contractor') as 'owner' | 'contractor',
      suppliedBy: owner?.suppliedBy ?? null,
    }
  }

  const { data: kit, error: kitErr } = await supabase
    .from('enclosure_kits')
    .select('*, enclosure_kit_items(*)')
    .eq('id', params.kitId)
    .maybeSingle()

  if (kitErr || !kit) return { error: kitErr?.message ?? 'Kit not found' }

  const items = ((kit as any).enclosure_kit_items ?? []) as any[]

  // La caja misma sigue la condicion de su propio componente, no la del kit:
  // "actualizacion de camaras en caja existente" es caja existente + switch nuevo.
  const enclosureItem = items.find(i => i.role === 'enclosure')
  const enclosureCond = resolveComponent(
    enclosureItem?.part_number ?? '__enclosure__',
    enclosureItem?.default_asset_condition
  )

  // Tag correlativo, sin colisionar tras borrados
  let tag = params.cabinetTag?.trim() || ''
  if (!tag) {
    const { data: existing } = await supabase
      .from('cabinets')
      .select('cabinet_tag')
      .eq('project_id', params.projectId)

    let maxNum = 0
    for (const c of existing ?? []) {
      const m = /^CAB-(\d+)$/.exec(c.cabinet_tag ?? '')
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
    }
    tag = `CAB-${String(maxNum + 1).padStart(3, '0')}`
  }

  // ── 1. La caja ────────────────────────────────────────────────────────────
  const { data: cabinet, error: cabErr } = await supabase
    .from('cabinets')
    .insert({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger lo reemplaza
      cabinet_tag: tag,
      cabinet_type: 'Camera Field Enclosure',
      latitude: params.latitude,
      longitude: params.longitude,
      status: 'Planned',
      kit_id: kit.id,
      mounted_on_node_id: params.mountedOnNodeId ?? null,
      mount_type: params.mountType ?? 'pole',
      asset_condition: enclosureCond.assetCondition,
      work_scope: enclosureCond.workScope,
      supply_responsibility: enclosureCond.supplyResponsibility,
      supplied_by: enclosureCond.suppliedBy,
    })
    .select()
    .single()

  if (cabErr) return { error: `Failed to create enclosure: ${cabErr.message}` }

  // ── 2. El switch y sus puertos ────────────────────────────────────────────
  const switchItem = items.find(i => i.role === 'switch')
  let switchId: string | undefined
  let portsCreated = 0

  if (switchItem) {
    // El switch puede ser existente aunque la caja sea nueva, o al reves.
    const swCond = resolveComponent(switchItem.part_number, switchItem.default_asset_condition)
    const { data: device, error: devErr } = await supabase
      .from('network_devices')
      .insert({
        project_id: params.projectId,
        name: `${tag}-SW`,
        device_type: 'switch',
        model_number: switchItem.part_number,
        manufacturer: switchItem.manufacturer ?? 'Generic',
        total_ports: kit.switch_port_count,
        poe_budget_watts: kit.poe_budget_watts,
        latitude: params.latitude,
        longitude: params.longitude,
        cabinet_id: cabinet.id,
        status: 'Planned',
        asset_condition: swCond.assetCondition,
        work_scope: swCond.workScope,
        supply_responsibility: swCond.supplyResponsibility,
        supplied_by: swCond.suppliedBy,
      })
      .select()
      .single()

    if (devErr) {
      // La caja ya existe; se informa en vez de dejar un estado a medias en silencio.
      return {
        success: true,
        cabinetId: cabinet.id,
        warning: `Enclosure created, but the switch failed: ${devErr.message}`,
      }
    }

    switchId = device.id

    // El switch es "de 4 puertos" de cara al usuario: esos 4 son RJ45 PoE.
    // El uplink de fibra va aparte, como puerto SFP adicional — ahi entran
    // los pigtails empalmados a la fibra del main haul.
    const poePorts = Array.from({ length: kit.switch_port_count }, (_, idx) => ({
      network_device_id: device.id,
      port_number: idx + 1,
      port_name: `Port ${idx + 1}`,
      port_type: 'rj45' as const,
      assigned_device_type: 'unassigned' as const,
      poe_enabled: true,
      speed_mbps: 1000,
      status: 'available',
    }))

    const sfpPorts = Array.from({ length: kit.sfp_uplink_count ?? 1 }, (_, idx) => ({
      network_device_id: device.id,
      port_number: kit.switch_port_count + idx + 1,
      port_name: `SFP Uplink ${idx + 1}`,
      port_type: 'sfp' as const,
      assigned_device_type: 'uplink' as const,
      poe_enabled: false,
      speed_mbps: 1000,
      status: 'available',
    }))

    const ports = [...poePorts, ...sfpPorts]

    const { error: portErr } = await supabase.from('switch_ports').insert(ports)
    if (portErr) console.error('Failed to create switch ports:', portErr.message)
    else portsCreated = ports.length
  }

  // ── 3. La bandeja de empalme dentro de la caja ────────────────────────────
  // La cajita de empalme dentro del gabinete, con su bandeja. Ahi se guardan
  // los empalmes de fusion contra los pigtails.
  //
  // fiber_enclosures.node_id es obligatorio: el cierre cuelga de un nodo del
  // recorrido de fibra. Sin poste asociado no se crea — es preferible a
  // inventar un nodo que despues aparezca suelto en el mapa.
  const trayItem = items.find(i => i.role === 'splice_tray')
  let spliceWarning: string | undefined

  if (trayItem) {
    if (!params.mountedOnNodeId) {
      spliceWarning = 'Splice tray not created: the enclosure is not attached to a pole or node.'
    } else {
      const { data: fiberEnc, error: encErr } = await supabase
        .from('fiber_enclosures')
        .insert({
          project_id: params.projectId,
          organization_id: '00000000-0000-0000-0000-000000000000', // trigger lo reemplaza
          enclosure_tag: `${tag}-FE`,
          enclosure_type: 'Termination',
          capacity: 12,
          node_id: params.mountedOnNodeId,
          cabinet_id: cabinet.id,
          latitude: params.latitude,
          longitude: params.longitude,
          installed_status: 'Planned',
          role: 'field_termination',
          asset_condition: enclosureCond.assetCondition,
          work_scope: enclosureCond.workScope,
        })
        .select()
        .single()

      if (encErr) {
        console.error('Failed to create fiber enclosure:', encErr.message)
        spliceWarning = `Splice tray not created: ${encErr.message}`
      } else {
        const { error: trayErr } = await supabase.from('splice_trays').insert({
          project_id: params.projectId,
          organization_id: '00000000-0000-0000-0000-000000000000', // trigger lo reemplaza
          enclosure_id: fiberEnc.id,
          tray_number: 1,
          capacity: 12,
        })
        if (trayErr) console.error('Failed to create splice tray:', trayErr.message)
      }
    }
  }

  // ── 4. BOM del kit ────────────────────────────────────────────────────────
  // Una caja existente que solo se interviene no genera compra de material.
  // Cada componente resuelve sus tres ejes por separado. Un componente
  // existente que se reutiliza NO genera linea de material; uno provisto por
  // el cliente si la genera, pero fuera de lo facturable.
  let bomLinesCreated = 0
  let reusedComponents = 0
  const rows: any[] = []

  for (const i of items) {
    const c = resolveComponent(i.part_number, i.default_asset_condition)
    if (!c.buysMaterial) { reusedComponents++; continue }

    rows.push({
      project_id: params.projectId,
      category: i.role === 'switch' || i.role === 'accessory' ? 'Network' : 'Fiber',
      module: 'enclosure' as const,
      subcategory: i.role,
      asset_condition: c.assetCondition,
      work_scope: c.workScope,
      supply_responsibility: c.supplyResponsibility,
      supplied_by: c.suppliedBy,
      part_number: i.part_number,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unit_cost: i.unit_cost,
      source: 'catalog' as const,
      manufacturer: i.manufacturer ?? 'Generic',
      status: 'Planned',
      cabinet_id: cabinet.id,
    })
  }

  if (rows.length > 0) {
    const { error: bomErr } = await supabase.from('bom_items').insert(rows as any)
    if (bomErr) console.error('Failed to create kit BOM:', bomErr.message)
    else bomLinesCreated = rows.length
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)

  return {
    success: true,
    cabinetId: cabinet.id,
    switchId,
    bomLinesCreated,
    portsCreated,
    reusedComponents,
    warning: [
      reusedComponents > 0
        ? `${reusedComponents} of ${items.length} components are existing and reused: no material, labor only.`
        : null,
      spliceWarning ?? null,
    ].filter(Boolean).join(' ') || undefined,
  }
}

export interface DropValidation {
  cameraTag: string
  distanceFt: number
  ok: boolean
  reason?: string
}

/**
 * Conecta una camara a una caja: la asigna a un puerto PoE libre y registra
 * el largo del UTP.
 *
 * Valida el limite de 100 m de Ethernet. Pasado ese largo el enlace no
 * funciona en terreno, asi que se rechaza en vez de dejarlo cotizado: un
 * error asi se descubre con la cuadrilla en el poste.
 */
export async function assignCameraToEnclosure(params: {
  projectId: string
  cameraLocationId: string
  cabinetId: string
  /** Largo real del UTP. Si se omite se estima por distancia en linea recta. */
  dropCableFt?: number
}): Promise<{ success?: boolean; portNumber?: number; error?: string; warning?: string }> {
  const supabase = await createClient()

  const { data: camera } = await supabase
    .from('camera_locations')
    .select('id, camera_id_tag, latitude, longitude')
    .eq('id', params.cameraLocationId)
    .maybeSingle()

  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('id, cabinet_tag, latitude, longitude')
    .eq('id', params.cabinetId)
    .maybeSingle()

  if (!camera || !cabinet) return { error: 'Camera or enclosure not found' }

  // Distancia en linea recta como piso: el tendido real siempre es mayor
  // (sube el poste, baja a la caja, holguras).
  const straightFt = haversineFeet(
    Number(camera.latitude), Number(camera.longitude),
    Number(cabinet.latitude), Number(cabinet.longitude)
  )
  const dropFt = params.dropCableFt ?? Number((straightFt * 1.3 + 30).toFixed(1))

  if (dropFt > MAX_ETHERNET_DROP_FT) {
    return {
      error: `The drop is ${dropFt.toFixed(0)} ft and Ethernet over copper dies at ${MAX_ETHERNET_DROP_FT} ft (100 m). ` +
             `${camera.camera_id_tag} needs a closer enclosure, or an extender / media converter.`,
    }
  }

  // Puerto PoE libre en el switch de esa caja
  const { data: device } = await supabase
    .from('network_devices')
    .select('id')
    .eq('cabinet_id', params.cabinetId)
    .eq('device_type', 'switch')
    .maybeSingle()

  if (!device) return { error: 'That enclosure has no switch to connect to.' }

  const { data: freePorts } = await supabase
    .from('switch_ports')
    .select('id, port_number')
    .eq('network_device_id', device.id)
    .eq('poe_enabled', true)
    .is('assigned_camera_location_id', null)
    .order('port_number')
    .limit(1)

  const port = freePorts?.[0]
  if (!port) {
    return { error: `The switch in ${cabinet.cabinet_tag} has no free PoE ports.` }
  }

  const { error: portErr } = await supabase
    .from('switch_ports')
    .update({
      assigned_camera_location_id: params.cameraLocationId,
      assigned_device_type: 'camera',
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', port.id)

  if (portErr) return { error: `Failed to assign port: ${portErr.message}` }

  const { error: camErr } = await supabase
    .from('camera_locations')
    .update({
      served_by_cabinet_id: params.cabinetId,
      assigned_network_device_id: device.id,
      drop_cable_ft: dropFt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.cameraLocationId)

  if (camErr) return { error: `Port assigned, but the camera update failed: ${camErr.message}` }

  revalidatePath(`/projects/${params.projectId}/fiber`)
  revalidatePath(`/projects/${params.projectId}/bom`)

  return {
    success: true,
    portNumber: port.port_number,
    warning: params.dropCableFt === undefined
      ? `Drop estimated at ${dropFt.toFixed(0)} ft from map distance. Confirm the real length in the field.`
      : undefined,
  }
}

function haversineFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 20925525 // radio terrestre en pies
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}


/**
 * Norma de colores TIA-598-C para los 12 hilos de un buffer tube.
 * El orden no es decorativo: es como la cuadrilla identifica cada hilo en
 * terreno, y es el orden en que se ocupan.
 */
export const STRAND_COLORS = [
  'Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White',
  'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua',
] as const

export function strandColor(n: number): string {
  // Mas alla de 12 los colores se repiten por tubo; el numero manda.
  return STRAND_COLORS[(n - 1) % 12] ?? `Strand ${n}`
}

export interface StrandUse {
  strandNumber: number
  color: string
  strandId: string | null
  role: 'spliced' | 'spare'
}

export interface FiberAllocation {
  /** Hilos del drop: siempre empieza en 1, el cable es dedicado a esta caja. */
  drop: StrandUse[]
  /** Par correlativo en el backbone compartido. */
  backbonePair: { a: number; b: number; colorA: string; colorB: string } | null
  splicesCreated: number
  pigtailsPlaced: number
}

/**
 * Asigna la fibra de una camara siguiendo la regla real de terreno.
 *
 * Son DOS numeraciones distintas y confundirlas es el error caro:
 *
 *   DROP — cable dedicado a la caja. Siempre hilos 1 y 2 (Blue, Orange).
 *   La numeracion se reinicia en cada drop porque cada camara tiene el suyo.
 *
 *   BACKBONE — 144F compartido por todo el tramo. Par correlativo:
 *   camara 1 -> 1,2   camara 2 -> 3,4   camara 3 -> 5,6 ...
 *
 * Ademas separa material de mano de obra: se instalan `pigtail_count`
 * pigtails (4) pero solo se fusionan `strands_spliced` hilos (2). Los
 * demas quedan de reserva, con pigtail puesto y sin fusionar — que es
 * exactamente lo que quedo en el Beltline.
 */
export async function allocateCameraFiber(params: {
  projectId: string
  cameraLocationId: string
  cabinetId: string
  /** Cable dedicado que llega a la caja. */
  dropCableId: string
  /** Backbone compartido del tramo. Si se omite solo se asigna el drop. */
  backboneCableId?: string
}): Promise<{
  success?: boolean
  allocation?: FiberAllocation
  error?: string
  warning?: string
}> {
  const supabase = await createClient()

  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('id, cabinet_tag, kit_id')
    .eq('id', params.cabinetId)
    .maybeSingle()

  if (!cabinet) return { error: 'Enclosure not found' }

  const { data: camera } = await supabase
    .from('camera_locations')
    .select('id, camera_id_tag')
    .eq('id', params.cameraLocationId)
    .maybeSingle()

  if (!camera) return { error: 'Camera not found' }

  // Cuantos pigtails y cuantas fusiones manda el kit
  let pigtailCount = 4
  let splicedCount = 2
  if (cabinet.kit_id) {
    const { data: kit } = await supabase
      .from('enclosure_kits')
      .select('pigtail_count, strands_spliced')
      .eq('id', cabinet.kit_id)
      .maybeSingle()
    pigtailCount = kit?.pigtail_count ?? 4
    splicedCount = kit?.strands_spliced ?? 2
  }

  // Bandeja donde viven las fusiones
  const { data: fiberEnc } = await supabase
    .from('fiber_enclosures')
    .select('id')
    .eq('cabinet_id', params.cabinetId)
    .maybeSingle()

  if (!fiberEnc) {
    return { error: 'That enclosure has no splice tray to hold the fusions.' }
  }

  const { data: tray } = await supabase
    .from('splice_trays')
    .select('id')
    .eq('enclosure_id', fiberEnc.id)
    .order('tray_number')
    .limit(1)
    .maybeSingle()

  // ── DROP: hilos 1..pigtailCount, de los cuales se fusionan los primeros ──
  const { data: dropStrands } = await supabase
    .from('fiber_strands')
    .select('id, strand_number, assigned_camera_id')
    .eq('cable_id', params.dropCableId)
    .lte('strand_number', pigtailCount)
    .order('strand_number')

  if (!dropStrands?.length) {
    return { error: 'That drop has no strands loaded. Generate the cable strands first.' }
  }

  const drop: StrandUse[] = []
  const conflicts: string[] = []

  for (let n = 1; n <= pigtailCount; n++) {
    const s = dropStrands.find(x => x.strand_number === n)
    const role: 'spliced' | 'spare' = n <= splicedCount ? 'spliced' : 'spare'
    const color = strandColor(n)

    if (!s) {
      conflicts.push(`strand ${n} (${color}) does not exist in the drop`)
      drop.push({ strandNumber: n, color, strandId: null, role })
      continue
    }

    if (s.assigned_camera_id && s.assigned_camera_id !== params.cameraLocationId) {
      conflicts.push(`strand ${n} (${color}) is already taken by another camera`)
      drop.push({ strandNumber: n, color, strandId: s.id, role })
      continue
    }

    await supabase
      .from('fiber_strands')
      .update({
        assigned_camera_id: params.cameraLocationId,
        assigned_purpose: role === 'spliced'
          ? `${camera.camera_id_tag} active`
          : `${camera.camera_id_tag} spare`,
        splice_status: 'Not Spliced',
        updated_at: new Date().toISOString(),
      })
      .eq('id', s.id)

    drop.push({ strandNumber: n, color, strandId: s.id, role })
  }

  // ── BACKBONE: siguiente par correlativo libre ──────────────────────────
  let backbonePair: FiberAllocation['backbonePair'] = null

  if (params.backboneCableId) {
    const { data: cable } = await supabase
      .from('fiber_cables')
      .select('fiber_count')
      .eq('id', params.backboneCableId)
      .maybeSingle()

    const capacity = Number(cable?.fiber_count ?? 0)

    const { data: taken } = await supabase
      .from('camera_locations')
      .select('backbone_strand_a')
      .eq('backbone_cable_id', params.backboneCableId)
      .not('backbone_strand_a', 'is', null)

    const used = new Set((taken ?? []).map(t => Number(t.backbone_strand_a)))

    // Primer par libre: 1-2, 3-4, 5-6 ...
    let a = 0
    for (let candidate = 1; candidate <= capacity - 1; candidate += 2) {
      if (!used.has(candidate)) { a = candidate; break }
    }

    if (a === 0) {
      conflicts.push(`the backbone has no free pairs (${capacity} strands, ${used.size} cameras assigned)`)
    } else {
      const b = a + 1
      const { error: camErr } = await supabase
        .from('camera_locations')
        .update({
          backbone_cable_id: params.backboneCableId,
          backbone_strand_a: a,
          backbone_strand_b: b,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.cameraLocationId)

      if (camErr) conflicts.push(`could not reserve the backbone pair: ${camErr.message}`)
      else backbonePair = { a, b, colorA: strandColor(a), colorB: strandColor(b) }
    }
  }

  // ── Fusiones: solo los hilos que realmente se empalman ─────────────────
  const toSplice = drop.filter(s => s.role === 'spliced' && s.strandId)
  let splicesCreated = 0

  if (toSplice.length > 0) {
    const rows = toSplice.map(s => ({
      project_id: params.projectId,
      organization_id: '00000000-0000-0000-0000-000000000000', // trigger lo reemplaza
      enclosure_id: fiberEnc.id,
      tray_id: tray?.id ?? null,
      from_cable_id: params.dropCableId,
      from_strand_id: s.strandId as string,
      assigned_camera_id: params.cameraLocationId,
      splice_type: 'Fusion' as const,
      splice_status: 'Not Spliced',
      notes: backbonePair
        ? `${camera.camera_id_tag}: drop strand ${s.strandNumber} (${s.color}) <-> backbone strand ${s.strandNumber === 1 ? backbonePair.a : backbonePair.b}`
        : `${camera.camera_id_tag}: drop strand ${s.strandNumber} (${s.color})`,
    }))

    const { error: splErr } = await supabase.from('fiber_splice_records').insert(rows as any)
    if (splErr) return { error: `Strands reserved, but the splice records failed: ${splErr.message}` }
    splicesCreated = rows.length
  }

  revalidatePath(`/projects/${params.projectId}/fiber`)

  const spares = drop.filter(s => s.role === 'spare').length
  const notes: string[] = []
  if (spares > 0) {
    notes.push(`${spares} pigtails left as spares, not fused.`)
  }
  if (conflicts.length > 0) {
    notes.push(`Review before dispatching the crew: ${conflicts.join(', ')}.`)
  }

  return {
    success: true,
    allocation: { drop, backbonePair, splicesCreated, pigtailsPlaced: pigtailCount },
    warning: notes.length > 0 ? notes.join(' ') : undefined,
  }
}

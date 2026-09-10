/**
 * Construccion del BOM del proyecto.
 *
 * Esto vivia dentro de la pagina del BOM. Se extrajo aqui porque el PDF del
 * proyecto tiene que mostrar EXACTAMENTE los mismos numeros que la pantalla:
 * si cada uno arma su propia lista, tarde o temprano el PDF que ve el cliente
 * y la pantalla que ve la cuadrilla dejan de coincidir, y nadie se entera
 * hasta que alguien compra de menos.
 *
 * La logica se movio sin cambios de comportamiento.
 */

export interface ProjectBomItem {
  id: string
  description: string
  manufacturer: string
  partNumber: string
  category: string
  module?: string | null
  subcategory?: string | null
  /** Quien compra el material. 'owner' = OFCI, lo provee el cliente. */
  supplyResponsibility?: 'contractor' | 'owner' | 'other_contractor'
  suppliedBy?: string | null
  materialReceived?: boolean
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  status: string
  isDatabase?: boolean
}

export function buildProjectBom(input: {
  cameras: any[]
  cameraModels: any[]
  devices: any[]
  dbBomItems: any[]
}): ProjectBomItem[] {
  const { cameras, cameraModels, devices, dbBomItems } = input

  const mergedItems: ProjectBomItem[] = []

  // 1. Add Network Devices dynamically
  devices.forEach(dev => {
    mergedItems.push({
      id: dev.id,
      description: `${dev.name} (${dev.device_type.toUpperCase().replace('_', ' ')})`,
      manufacturer: dev.manufacturer || 'Generic',
      partNumber: dev.model_number || 'N/A',
      category: 'Network',
      quantity: 1,
      unit: 'pcs',
      unitCost: 0,
      totalCost: 0,
      status: 'Planned',
    })
  })

  // 2. Add Camera Locations dynamically.
  // Se agrupan por modelo Y por quien provee: una camara puesta por el
  // cliente (OFCI) no puede ir en la misma linea que una que compramos
  // nosotros, porque una entra en lo facturable y la otra no.
  const cameraGroups: {
    [key: string]: { qty: number; model: any; supply: string; suppliedBy: string | null; received: boolean }
  } = {}

  cameras.forEach(cam => {
    const supply = cam.supply_responsibility || 'contractor'
    const key = `${cam.camera_model_id}::${supply}`
    if (!cameraGroups[key]) {
      cameraGroups[key] = {
        qty: 0,
        model: cameraModels.find(m => m.id === cam.camera_model_id),
        supply,
        suppliedBy: cam.supplied_by || null,
        received: cam.material_received ?? false,
      }
    }
    cameraGroups[key].qty++
    // Un solo item sin recibir basta para que el grupo cuente como pendiente.
    if (!(cam.material_received ?? false)) cameraGroups[key].received = false
  })

  Object.entries(cameraGroups).forEach(([key, group]) => {
    const modelName = group.model ? `${group.model.manufacturer} ${group.model.model_number} CCTV Camera` : 'CCTV Camera'
    const estCost = group.model?.estimated_cost ? Number(group.model.estimated_cost) : 0
    mergedItems.push({
      id: key,
      description: modelName,
      manufacturer: group.model?.manufacturer || 'Generic',
      partNumber: group.model?.model_number || 'N/A',
      category: 'Camera',
      module: 'cctv',
      subcategory: 'camera',
      supplyResponsibility: group.supply as ProjectBomItem['supplyResponsibility'],
      suppliedBy: group.suppliedBy,
      materialReceived: group.received,
      quantity: group.qty,
      unit: 'pcs',
      unitCost: estCost,
      totalCost: group.qty * estCost,
      status: 'Planned',
    })
  })

  // 3. Add Database BOM Items
  let totalConduitFeet = 0
  let totalCableFeet = 0
  let totalNodePcs = 0
  let totalEnclosurePcs = 0

  dbBomItems.forEach(item => {
    const qty = Number(item.quantity)
    const cost = Number(item.unit_cost)
    mergedItems.push({
      id: item.id,
      description: item.description,
      manufacturer: item.manufacturer || 'Generic',
      partNumber: item.part_number || 'N/A',
      category: item.category,
      module: item.module || null,
      subcategory: item.subcategory || null,
      supplyResponsibility: (item.supply_responsibility || 'contractor') as ProjectBomItem['supplyResponsibility'],
      suppliedBy: item.supplied_by || null,
      materialReceived: item.material_received ?? false,
      quantity: qty,
      unit: item.unit,
      unitCost: cost,
      totalCost: qty * cost,
      status: item.status || 'Planned',
      isDatabase: true
    })

    // Roll-up de mano de obra OSP.
    // Usa la clasificacion real (module/subcategory, migracion
    // bom_module_categorization). El bloque heuristico por texto queda solo
    // como fallback para filas antiguas que todavia no tengan module.
    if (item.module) {
      // Solo 'duct' mide la zanja. El innerduct y el mule tape van DENTRO
      // del mismo ducto ('duct_accessory'): sumarlos cobraria tres veces
      // la misma excavacion.
      if (item.module === 'conduit' && item.subcategory === 'duct' && item.unit === 'ft') {
        totalConduitFeet += qty
      } else if (item.module === 'conduit' && item.subcategory === 'structure') {
        totalNodePcs += qty
      } else if (item.module === 'fiber' && item.subcategory === 'cable' && item.unit === 'ft') {
        totalCableFeet += qty
      } else if (item.module === 'fiber' && item.subcategory === 'splice') {
        totalEnclosurePcs += qty
      }
    } else if (item.category.toLowerCase() === 'fiber') {
      const descLower = (item.description || '').toLowerCase()
      const partLower = (item.part_number || '').toLowerCase()

      if (item.unit === 'ft') {
        if (descLower.includes('conduit') || partLower.includes('cond')) {
          totalConduitFeet += qty
        } else if (descLower.includes('cable') || partLower.includes('bb-') || partLower.includes('drop-') || descLower.includes('fiber')) {
          totalCableFeet += qty
        }
      } else if (item.unit === 'pcs') {
        if (descLower.includes('handhole') || descLower.includes('manhole') || descLower.includes('pull box') || partLower.includes('hh-') || partLower.includes('mh-') || partLower.includes('pb-')) {
          totalNodePcs += qty
        } else if (descLower.includes('enclosure') || descLower.includes('closure') || partLower.includes('se-')) {
          totalEnclosurePcs += qty
        }
      }
    }
  })

  // 4. Add Calculated OSP Labor Items.
  // Tarifas de REFERENCIA de mercado 2026 para el sureste de EE.UU.
  // (HDD para fibra 15-50 USD/ft con mediana de despliegue ~18; empalme en
  // camara subterranea 80-130 USD; set de estructura precast ~950 USD).
  // No son la tarifa de NGT: se ajustan en Settings > Labor Rates.
  if (totalConduitFeet > 0 || totalCableFeet > 0 || totalNodePcs > 0 || totalEnclosurePcs > 0) {
    if (totalConduitFeet > 0) {
      mergedItems.push({
        id: 'labor-osp-conduit-install',
        description: 'OSP Conduit Trench & Directional Bore Labor',
        manufacturer: 'Local Subcontractor',
        partNumber: 'LAB-OSP-CONDUIT',
        category: 'Labor',
        quantity: totalConduitFeet,
        unit: 'ft',
        unitCost: 18.00,
        totalCost: totalConduitFeet * 18.00,
        status: 'Planned',
      })
    }
    if (totalCableFeet > 0) {
      mergedItems.push({
        id: 'labor-osp-cable-pull',
        description: 'OSP Fiber Cable Pulling & Tension Labor',
        manufacturer: 'Local Subcontractor',
        partNumber: 'LAB-OSP-CABLE-PULL',
        category: 'Labor',
        quantity: totalCableFeet,
        unit: 'ft',
        unitCost: 2.75,
        totalCost: totalCableFeet * 2.75,
        status: 'Planned',
      })
    }
    if (totalNodePcs > 0) {
      mergedItems.push({
        id: 'labor-osp-node-set',
        description: 'Manhole / Handhole Excavation & Placement Labor',
        manufacturer: 'Local Subcontractor',
        partNumber: 'LAB-OSP-NODE-SET',
        category: 'Labor',
        quantity: totalNodePcs,
        unit: 'pcs',
        unitCost: 950.00,
        totalCost: totalNodePcs * 950.00,
        status: 'Planned',
      })
    }
    if (totalEnclosurePcs > 0) {
      const estimatedSpliceCount = totalEnclosurePcs * 12
      mergedItems.push({
        id: 'labor-osp-splicing',
        description: 'Fusion Splicing, Tray Management & OTDR Testing Labor',
        manufacturer: 'Fiber Tech',
        partNumber: 'LAB-OSP-SPLICING',
        category: 'Labor',
        quantity: estimatedSpliceCount,
        unit: 'splices',
        unitCost: 95.00,
        totalCost: estimatedSpliceCount * 95.00,
        status: 'Planned',
      })
    }
  }
  return mergedItems
}

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import BOMClientView from './BOMClientView'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectBOMPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details
  let { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    project = { ...DEMO_PROJECT, id: projectId } as any
  }

  let cameras: any[] = []
  let cameraModels: any[] = []
  let devices: any[] = []
  let dbBomItems: any[] = []

  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
    devices = await getNetworkDevices(projectId)
    
    const { data: dbItems } = await supabase
      .from('bom_items')
      .select('*')
      .eq('project_id', projectId)
    
    dbBomItems = dbItems || []
  } catch (err) {
    console.error('Failed to load BOM items:', err)
  }

  const mergedItems: any[] = []

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

  // 2. Add Camera Locations (grouped by model) dynamically
  const cameraGroups: { [modelId: string]: { qty: number; model: any; status: string } } = {}
  cameras.forEach(cam => {
    if (!cameraGroups[cam.camera_model_id]) {
      const model = cameraModels.find(m => m.id === cam.camera_model_id)
      cameraGroups[cam.camera_model_id] = {
        qty: 0,
        model,
        status: cam.status,
      }
    }
    cameraGroups[cam.camera_model_id].qty++
  })

  Object.keys(cameraGroups).forEach(modelId => {
    const group = cameraGroups[modelId]
    const modelName = group.model ? `${group.model.manufacturer} ${group.model.model_number} CCTV Camera` : 'CCTV Camera'
    const estCost = group.model?.estimated_cost ? Number(group.model.estimated_cost) : 0
    mergedItems.push({
      id: modelId,
      description: modelName,
      manufacturer: group.model?.manufacturer || 'Generic',
      partNumber: group.model?.model_number || 'N/A',
      category: 'Camera',
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
      quantity: qty,
      unit: item.unit,
      unitCost: cost,
      totalCost: qty * cost,
      status: item.status || 'Planned',
      isDatabase: true
    })

    if (item.category.toLowerCase() === 'fiber') {
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

  // 4. Add Calculated OSP Labor Items
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
        unitCost: 8.50,
        totalCost: totalConduitFeet * 8.50,
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
        unitCost: 2.50,
        totalCost: totalCableFeet * 2.50,
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
        unitCost: 750.00,
        totalCost: totalNodePcs * 750.00,
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
        unitCost: 45.00,
        totalCost: estimatedSpliceCount * 45.00,
        status: 'Planned',
      })
    }
  }

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] flex-1 flex flex-col overflow-hidden min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4 shrink-0">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Bill of Materials (BOM)</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Export hardware listings, quantities, and device details for procurement</p>
      </div>

      {/* Main Table view */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <BOMClientView
          projectId={projectId}
          items={mergedItems}
        />
      </div>
    </div>
  )
}

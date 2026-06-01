import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
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

  if (!user) {
    redirect('/login')
  }

  // Load project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  // Fetch actual cameras, devices, and OSP database BOM items
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

  // Prepare BOM list
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

  // 3. Add Database BOM Items (Fiber paths, handholes, conduits, etc.)
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
  })

  return (
    <div className="space-y-6 relative z-10 w-full max-w-7xl mx-auto px-6 py-4 font-sans text-slate-300 flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 shrink-0">
        <h2 className="text-xl font-black text-white tracking-tight">Bill of Materials (BOM)</h2>
        <p className="text-xs text-slate-400 mt-1">Export hardware listings, quantities, and device details for procurement</p>
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

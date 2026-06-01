import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'

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

  // Fetch actual cameras and devices
  let cameras: any[] = []
  let cameraModels: any[] = []
  let devices: any[] = []
  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
    devices = await getNetworkDevices(projectId)
  } catch (err) {
    console.error('Failed to load BOM items:', err)
  }

  // Prepare BOM list
  const bomItems: any[] = []

  // 1. Add Network Devices
  devices.forEach(dev => {
    bomItems.push({
      id: dev.id,
      name: `${dev.name} (${dev.device_type.toUpperCase().replace('_', ' ')})`,
      manufacturer: dev.manufacturer || 'Generic',
      partNumber: dev.model_number || 'N/A',
      qty: 1,
      status: 'Active',
    })
  })

  // 2. Add Camera Locations (grouped by model)
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
    const modelName = group.model ? `${group.model.resolution} CCTV Camera` : 'CCTV Camera'
    bomItems.push({
      id: modelId,
      name: modelName,
      manufacturer: group.model?.manufacturer || 'Generic',
      partNumber: group.model?.model_number || 'N/A',
      qty: group.qty,
      status: 'Planned',
    })
  })

  return (
    <div className="space-y-6 relative z-10 w-full max-w-7xl mx-auto px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-black text-white tracking-tight">Bill of Materials (BOM)</h2>
        <p className="text-xs text-slate-400 mt-1">Export hardware listings, quantities, and device details for procurement</p>
      </div>

      {bomItems.length === 0 ? (
        <div className="border border-dashed border-slate-850 rounded-2xl p-16 text-center bg-slate-900/10 backdrop-blur-sm max-w-xl mx-auto mt-6 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 text-slate-555">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Empty BOM</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              No equipment has been placed in the project. Create camera or switch nodes to generate the procurement sheet.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-6">Item Description</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Part Number</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {bomItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-855/15 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-200">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-350">
                      {item.manufacturer}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-350">
                      {item.partNumber}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-white">
                      {item.qty}
                    </td>
                    <td className="py-3.5 px-4 italic text-slate-500 font-mono">
                      Cost Not Assigned
                    </td>
                    <td className="py-3.5 px-4 italic text-slate-500 font-mono">
                      Cost Not Assigned
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700/50">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

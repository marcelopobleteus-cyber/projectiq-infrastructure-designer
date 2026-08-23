import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectCamerasPage({ params }: PageProps) {
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

  // Load actual cameras and camera models
  let cameras: any[] = []
  let cameraModels: any[] = []
  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
  } catch (err) {
    console.error('Failed to load cameras page details:', err)
  }

  const getStatusBadge = (status: string) => {
    let colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    let text = 'Unknown / TBD'
    let dotColor = 'bg-slate-500'

    if (status === 'planned') {
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      text = 'Planned'
      dotColor = 'bg-amber-500'
    } else if (status === 'in_progress') {
      colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      text = 'In Progress'
      dotColor = 'bg-blue-500'
    } else if (status === 'complete') {
      colorClass = 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
      text = 'Complete'
      dotColor = 'bg-emerald-500'
    } else if (status === 'issue') {
      colorClass = 'bg-rose-500/10 text-rose-450 border-rose-500/20'
      text = 'Issue'
      dotColor = 'bg-rose-500'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${colorClass}`}>
        <span className={`w-1 h-1 rounded-full ${dotColor}`} />
        {text}
      </span>
    )
  }

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-slate-300">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-black text-white tracking-tight">Cameras Inventory</h2>
        <p className="text-xs text-slate-400 mt-1">Directory of all camera placements, configurations and locations</p>
      </div>

      {cameras.length === 0 ? (
        <div className="border border-dashed border-slate-850 rounded-2xl p-16 text-center bg-slate-900/10 backdrop-blur-sm max-w-xl mx-auto mt-6 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 text-slate-555">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Cameras Placed</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              No cameras have been mapped to the spatial grid yet. Navigate to the Maps page to configure camera nodes.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-6">Camera ID</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Comm Type</th>
                  <th className="py-3 px-4">Power Type</th>
                  <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                  <th className="py-3 px-4">Location Reference</th>
                  <th className="py-3 px-4">Updated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {cameras.map((cam) => {
                  const model = cameraModels.find(m => m.id === cam.camera_model_id)
                  const modelName = model ? `${model.manufacturer} ${model.model_number}` : 'Unknown'
                  const coordinates = `${cam.latitude.toFixed(6)}, ${cam.longitude.toFixed(6)}`
                  const locationRef = cam.structure_reference || cam.address_reference || '-'
                  const dateStr = cam.updated_at || cam.created_at

                  return (
                    <tr key={cam.id} className="hover:bg-slate-855/15 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-200">
                        {cam.camera_id_tag}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {modelName}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(cam.status)}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-350">
                        {cam.communication_type}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-slate-350">
                        {cam.power_type}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {coordinates}
                      </td>
                      <td className="py-3.5 px-4 text-slate-350">
                        {locationRef}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(dateStr).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

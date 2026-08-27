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
  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
  } catch (err) {
    console.error('Failed to load cameras page details:', err)
  }

  const getStatusBadge = (status: string) => {
    let colorClass = 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border-[var(--border)]'
    let text = 'Planned'
    let dotColor = 'bg-[var(--pending)]'

    if (status === 'planned') {
      colorClass = 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
      text = 'Planned'
      dotColor = 'bg-[var(--pending)]'
    } else if (status === 'in_progress') {
      colorClass = 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent-border)]'
      text = 'In Progress'
      dotColor = 'bg-[var(--accent)]'
    } else if (status === 'complete') {
      colorClass = 'bg-[var(--success-soft)] text-[var(--success)] border-emerald-200'
      text = 'Complete'
      dotColor = 'bg-[var(--success)]'
    } else if (status === 'issue') {
      colorClass = 'bg-red-50 text-[var(--danger)] border-red-200'
      text = 'Issue'
      dotColor = 'bg-[var(--danger)]'
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {text}
      </span>
    )
  }

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">CCTV Cameras Inventory</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Directory of all camera placements, configurations and locations</p>
      </div>

      {cameras.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl mx-auto mt-4 space-y-3">
          <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">No Cameras Placed</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
            No cameras have been mapped to the spatial grid yet. Navigate to the Maps page to configure camera nodes.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-6 font-bold">Camera ID</th>
                  <th className="py-2.5 px-4 font-bold">Model</th>
                  <th className="py-2.5 px-4 font-bold">Status</th>
                  <th className="py-2.5 px-4 font-bold">Comm Type</th>
                  <th className="py-2.5 px-4 font-bold">Power Type</th>
                  <th className="py-2.5 px-4 font-bold">Coordinates (Lat, Lng)</th>
                  <th className="py-2.5 px-4 font-bold">Location Reference</th>
                  <th className="py-2.5 px-4 font-bold">Updated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {cameras.map((cam) => {
                  const model = cameraModels.find(m => m.id === cam.camera_model_id)
                  const modelName = model ? `${model.manufacturer} ${model.model_number}` : 'Unknown'
                  const coordinates = `${cam.latitude.toFixed(6)}, ${cam.longitude.toFixed(6)}`
                  const locationRef = cam.structure_reference || cam.address_reference || '-'
                  const dateStr = cam.updated_at || cam.created_at

                  return (
                    <tr key={cam.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="py-3 px-6 font-bold text-[var(--accent-text)] font-mono">
                        {cam.camera_id_tag}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)] font-semibold">
                        {modelName}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(cam.status)}
                      </td>
                      <td className="py-3 px-4 capitalize text-[var(--text-secondary)]">
                        {cam.communication_type}
                      </td>
                      <td className="py-3 px-4 uppercase text-[var(--text-secondary)] font-mono">
                        {cam.power_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                        {coordinates}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {locationRef}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-tertiary)]">
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

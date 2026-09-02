import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import ProjectMapCanvas from '../ProjectMapCanvas'
import { Database } from '@/types/supabase'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']
type NetworkDevice = Database['public']['Tables']['network_devices']['Row']

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectMapsPage({ params }: PageProps) {
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

  // Fetch camera models, locations, and network devices
  let cameraModels: CameraModel[] = []
  let cameras: CameraLocation[] = []
  let networkDevices: NetworkDevice[] = []
  try {
    cameraModels = await getCameraModels()
    cameras = await getCameraLocations(projectId)
    networkDevices = await getNetworkDevices(projectId)
  } catch (error) {
    console.error('Failed to load project details for map:', error)
  }

  // Calculate project metrics
  const totalCameras = cameras.length
  const totalNetworkDevices = networkDevices.length
  const totalSwitches = networkDevices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch').length
  const assignedCamerasCount = cameras.filter(c => c.assigned_network_device_id !== null).length
  const unassignedCamerasCount = totalCameras - assignedCamerasCount

  let poeWarningsCount = 0
  networkDevices.forEach(device => {
    if (device.device_type === 'switch' || device.device_type === 'Industrial Switch') {
      const switchCameras = cameras.filter(c => c.assigned_network_device_id === device.id)
      const totalDraw = switchCameras.reduce((acc, cam) => {
        const model = cameraModels.find(m => m.id === cam.camera_model_id)
        return acc + Number(model?.default_poe_draw || 7.50)
      }, 0)
      if (totalDraw > device.poe_budget_watts) {
        poeWarningsCount++
      }
    }
  })

  const metrics = [
    {
      label: 'Total Cameras',
      value: totalCameras,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      ),
      color: 'text-[var(--accent-text)] border-[var(--border)] bg-[var(--surface-1)]',
    },
    {
      label: 'Network Devices',
      value: totalNetworkDevices,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M12 8v8"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/></svg>
      ),
      color: 'text-[var(--text-primary)] border-[var(--border)] bg-[var(--surface-1)]',
    },
    {
      label: 'Switches',
      value: totalSwitches,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="9" x2="6.01" y2="9"/><line x1="10" y1="9" x2="10.01" y2="9"/><line x1="14" y1="9" x2="14.01" y2="9"/><line x1="18" y1="9" x2="18.01" y2="9"/><line x1="6" y1="15" x2="18" y2="15"/></svg>
      ),
      color: 'text-[var(--text-primary)] border-[var(--border)] bg-[var(--surface-1)]',
    },
    {
      label: 'Assigned Cameras',
      value: assignedCamerasCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
      color: 'text-[var(--success)] border-[var(--border)] bg-[var(--surface-1)]',
    },
    {
      label: 'Unassigned Cameras',
      value: unassignedCamerasCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ),
      color: 'text-[var(--text-tertiary)] border-[var(--border)] bg-[var(--surface-1)]',
    },
    {
      label: 'PoE Warnings',
      value: poeWarningsCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ),
      color: poeWarningsCount > 0 ? 'text-[var(--warn)] border-amber-200 bg-[var(--warn-soft)]' : 'text-[var(--text-tertiary)] border-[var(--border)] bg-[var(--surface-1)]',
    },
  ]

  return (
    <div className="space-y-4 relative z-10 w-full h-full px-6 py-4 flex-1 flex flex-col overflow-hidden bg-[var(--bg)] font-sans">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`border rounded-xl p-3 flex flex-col justify-between h-20 shadow-xs ${m.color}`}
          >
            <div className="flex items-center justify-between text-[var(--text-tertiary)]">
              <span className="text-[9.5px] font-bold uppercase tracking-wider">{m.label}</span>
              {m.icon}
            </div>
            <span className="text-xl font-black tracking-tight text-[var(--text-primary)] font-mono mt-1">
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Map Canvas Component */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <ProjectMapCanvas
          projectId={projectId}
          initialCameras={cameras}
          initialNetworkDevices={networkDevices}
          cameraModels={cameraModels}
          defaultLatitude={Number(project.default_latitude)}
          defaultLongitude={Number(project.default_longitude)}
          defaultZoom={project.default_zoom}
        />
      </div>
    </div>
  )
}

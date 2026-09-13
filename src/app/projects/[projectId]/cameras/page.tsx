import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import CamerasPageClient from './CamerasPageClient'

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
  // The map component needs the device list to render; in the CCTV scope the
  // network overlay starts off, so this is only what it needs to mount.
  let networkDevices: any[] = []
  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
    networkDevices = await getNetworkDevices(projectId)
  } catch (err) {
    console.error('Failed to load cameras page details:', err)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full">
      <CamerasPageClient
        projectId={projectId}
        cameras={cameras}
        cameraModels={cameraModels}
        networkDevices={networkDevices}
        defaultLatitude={Number(project!.default_latitude)}
        defaultLongitude={Number(project!.default_longitude)}
        defaultZoom={project!.default_zoom}
      />
    </div>
  )
}

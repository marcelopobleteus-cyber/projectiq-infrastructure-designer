import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getNetworkDevices } from '../../actions-sprint3'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import NetworkPortCanvas from './NetworkPortCanvas'
import { Database } from '@/types/supabase'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']
type NetworkDevice = Database['public']['Tables']['network_devices']['Row']

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectNetworkPage({ params }: PageProps) {
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

  // Load project devices, cameras, and camera models
  let networkDevices: NetworkDevice[] = []
  let cameras: CameraLocation[] = []
  let cameraModels: CameraModel[] = []
  try {
    networkDevices = await getNetworkDevices(projectId)
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
  } catch (error) {
    console.error('Failed to load network design data:', error)
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      <NetworkPortCanvas
        projectId={projectId}
        networkDevices={networkDevices}
        cameras={cameras}
        cameraModels={cameraModels}
      />
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCameraLocations, getCameraModels } from '../actions-sprint2'
import ProjectMapCanvas from './ProjectMapCanvas'
import { Database } from '@/types/supabase'

type CameraLocation = Database['public']['Tables']['camera_locations']['Row']
type CameraModel = Database['public']['Tables']['camera_models']['Row']

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
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

  // Fetch camera models and locations
  let cameraModels: CameraModel[] = []
  let cameras: CameraLocation[] = []
  try {
    cameraModels = await getCameraModels()
    cameras = await getCameraLocations(projectId)
  } catch (error) {
    console.error('Failed to load project details for map:', error)
  }

  return (
    <div className="space-y-6 relative z-10 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{project.name}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {project.description || 'Infrastructure details and spatial mapping'}
            </p>
          </div>
        </div>
      </div>

      {/* Map Canvas Component */}
      <ProjectMapCanvas
        projectId={projectId}
        initialCameras={cameras}
        cameraModels={cameraModels}
        defaultLatitude={Number(project.default_latitude)}
        defaultLongitude={Number(project.default_longitude)}
        defaultZoom={project.default_zoom}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getProjectCoordinatePoints, CoordinatePoint } from '../../actions-coordinate-viewer'
import CoordinateViewerPage from '@/components/coordinate-viewer/CoordinateViewerPage'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectCoordinateViewerPage({ params }: PageProps) {
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

  // Fetch coordinate points
  let points: CoordinatePoint[] = []
  try {
    points = await getProjectCoordinatePoints(projectId)
  } catch (error) {
    console.error('Failed to load coordinate points:', error)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <CoordinateViewerPage
        projectId={projectId}
        projectName={project.name}
        initialPoints={points}
        defaultLatitude={Number(project.default_latitude)}
        defaultLongitude={Number(project.default_longitude)}
        defaultZoom={project.default_zoom}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </div>
  )
}

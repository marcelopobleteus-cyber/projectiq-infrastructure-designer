import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getFiberCatalog, getFiberDesignData } from '../../actions-fiber'
import FiberMapCanvas from './FiberMapCanvas'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectFiberPage({ params }: PageProps) {
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

  // Fetch catalog and design data
  let catalog: any[] = []
  let initialData: any = {
    nodes: [],
    enclosures: [],
    routes: [],
    segments: [],
    cables: [],
    splices: [],
    assignments: [],
    cameras: []
  }

  try {
    catalog = await getFiberCatalog()
    initialData = await getFiberDesignData(projectId)
  } catch (err) {
    console.error('Failed to load fiber design data:', err)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full">
      <FiberMapCanvas
        projectId={projectId}
        initialData={initialData}
        fiberCatalog={catalog}
        defaultLatitude={Number(project.default_latitude)}
        defaultLongitude={Number(project.default_longitude)}
        defaultZoom={project.default_zoom}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </div>
  )
}

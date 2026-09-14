import { notFound, redirect } from 'next/navigation'
import { getCachedProject, getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getFiberDesignData } from '../../actions-fiber'
import FiberPageClient from './FiberPageClient'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectFiberPage({ params }: PageProps) {
  const { projectId } = await params

  const user = await getCachedUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details
  let project = await getCachedProject(projectId)

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
    // getFiberDesignData already fetches fiber_catalog as part of its parallel
    // batch, so calling getFiberCatalog() first was a second, identical query —
    // and a sequential one, blocking the batch behind it. Take it from the batch.
    initialData = await getFiberDesignData(projectId)
    catalog = initialData.catalog ?? []
  } catch (err) {
    console.error('Failed to load fiber design data:', err)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full">
      <FiberPageClient
        projectId={projectId}
        initialData={initialData}
        fiberCatalog={catalog}
        defaultLatitude={Number(project.default_latitude)}
        defaultLongitude={Number(project.default_longitude)}
        defaultZoom={project.default_zoom}
      />
    </div>
  )
}

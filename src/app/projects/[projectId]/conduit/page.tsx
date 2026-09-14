import { redirect } from 'next/navigation'
import { getCachedProject, getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getConduitData } from '../../actions-fiber'
import ConduitPageClient from './ConduitPageClient'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectConduitPage({ params }: PageProps) {
  const { projectId } = await params

  const user = await getCachedUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  let project = await getCachedProject(projectId)

  if (!project) {
    project = { ...DEMO_PROJECT, id: projectId } as any
  }

  type ConduitData = Awaited<ReturnType<typeof getConduitData>>
  let structures: ConduitData['structures'] = []
  let runs: ConduitData['runs'] = []
  let segments: ConduitData['segments'] = []

  try {
    const data = await getConduitData(projectId)
    structures = data.structures
    runs = data.runs
    segments = data.segments
  } catch (err) {
    console.error('Failed to load conduit data:', err)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full">
      <ConduitPageClient
        projectId={projectId}
        structures={structures}
        runs={runs}
        segments={segments}
        defaultLatitude={Number(project!.default_latitude)}
        defaultLongitude={Number(project!.default_longitude)}
        defaultZoom={project!.default_zoom}
      />
    </div>
  )
}

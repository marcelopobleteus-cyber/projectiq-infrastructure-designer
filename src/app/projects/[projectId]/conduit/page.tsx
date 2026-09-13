import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { getConduitData } from '../../actions-fiber'
import ConduitPageClient from './ConduitPageClient'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectConduitPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  let structures: Awaited<ReturnType<typeof getConduitData>>['structures'] = []
  let runs: Awaited<ReturnType<typeof getConduitData>>['runs'] = []

  try {
    const data = await getConduitData(projectId)
    structures = data.structures
    runs = data.runs
  } catch (err) {
    console.error('Failed to load conduit data:', err)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full">
      <ConduitPageClient projectId={projectId} structures={structures} runs={runs} />
    </div>
  )
}

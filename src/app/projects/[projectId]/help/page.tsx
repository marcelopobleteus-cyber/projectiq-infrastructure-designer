import { notFound, redirect } from 'next/navigation'
import { getCachedProject, getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import HelpCenterClient from './HelpCenterClient'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectHelpPage({ params }: PageProps) {
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

  return (
    <HelpCenterClient
      projectId={projectId}
      projectName={project.name}
    />
  )
}

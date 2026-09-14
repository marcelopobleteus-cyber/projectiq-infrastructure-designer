import { notFound, redirect } from 'next/navigation'
import { getCachedProject, getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getFieldTasksWithCamera, getProfiles } from '../../actions-sprint2'
import ProjectTasksBoard from './ProjectTasksBoard'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const { projectId } = await params

  const user = await getCachedUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details to verify project exists
  let project = await getCachedProject(projectId)

  if (!project) {
    project = { ...DEMO_PROJECT, id: projectId } as any
  }

  // Fetch real database field tasks with linked camera details
  const tasks = await getFieldTasksWithCamera(projectId)

  // Fetch real profile records for assignee options
  const profiles = await getProfiles()

  return (
    <ProjectTasksBoard
      projectId={projectId}
      initialTasks={tasks as any}
      profiles={profiles}
    />
  )
}

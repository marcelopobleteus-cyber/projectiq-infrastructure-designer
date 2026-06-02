import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getFieldTasksWithCamera, getProfiles } from '../../actions-sprint2'
import ProjectTasksBoard from './ProjectTasksBoard'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load project details to verify project exists
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
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

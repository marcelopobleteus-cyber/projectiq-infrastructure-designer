import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProjectTopBar from '@/components/layout/ProjectTopBar'
import WorkspaceContent from '@/components/layout/WorkspaceContent'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load project details to show name in top bar
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Shared breadcrumbs header bar */}
      <ProjectTopBar
        projectId={projectId}
        projectName={project.name}
      />

      {/* Main Workspace Workspace */}
      <WorkspaceContent>
        {children}
      </WorkspaceContent>
    </div>
  )
}

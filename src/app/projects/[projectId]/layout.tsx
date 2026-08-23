import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import ProjectTopBar from '@/components/layout/ProjectTopBar'
import WorkspaceContent from '@/components/layout/WorkspaceContent'
import ProjectSidebar from '@/components/layout/ProjectSidebar'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params
  console.log("LAYOUT RENDERED FOR PROJECT:", projectId)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details to show name in top bar
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) {
    console.error('ERROR LOADING PROJECT in layout.tsx:', error)
  }

  if (!project) {
    notFound()
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      {/* Secondary Project Navigation Sidebar */}
      <ProjectSidebar
        projectId={projectId}
        projectName={project.name}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Shared breadcrumbs header bar */}
        <ProjectTopBar
          projectId={projectId}
          projectName={project.name}
        />

        {/* Main Workspace Content */}
        <WorkspaceContent>
          {children}
        </WorkspaceContent>
      </div>
    </div>
  )
}

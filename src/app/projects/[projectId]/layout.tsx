import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  // Load project details to show name in top bar
  let project: any = null

  if (projectId === 'demo-metro-cctv') {
    project = DEMO_PROJECT as any
  } else {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!data) {
      notFound()
    }

    if (user) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', data.organization_id)
        .eq('profile_id', user.id)
        .single()

      if (!membership && !BYPASS_AUTH) {
        notFound()
      }
    }

    project = data
  }

  // disciplines is the authoritative source for which modules this project shows.
  // An empty array (unset, or a legacy project predating the column) falls back to
  // the disciplines that currently have a real workspace built for them.
  const disciplines = project.disciplines?.length
    ? project.disciplines
    : ['cctv', 'fiber', 'networking', 'wireless', 'power']

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      {/* Secondary Project Navigation Sidebar */}
      <ProjectSidebar
        projectId={projectId}
        projectName={project.name}
        disciplines={disciplines}
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

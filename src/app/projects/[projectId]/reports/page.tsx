import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getFiberDesignData } from '../../actions-fiber'
import ReportsClient from './ReportsClient'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectReportsPage({ params }: PageProps) {
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

  // Load active fiber nodes and routes data
  let fiberData = { nodes: [], routes: [] }
  try {
    const data = await getFiberDesignData(projectId)
    fiberData = {
      nodes: data.nodes || [],
      routes: data.routes || [],
    }
  } catch (err) {
    console.error('Failed to load fiber design data:', err)
  }

  return (
    <ReportsClient
      projectId={projectId}
      projectName={project.name}
      fiberData={fiberData}
    />
  )
}

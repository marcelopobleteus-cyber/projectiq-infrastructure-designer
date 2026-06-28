import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCameraLocations, getProjectCameraTasks } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import { getFiberDesignData } from '../../actions-fiber'
import { getWorkflowSteps } from '@/lib/workflow/projectWorkflowRegistry'
import OverviewEditPanel from './OverviewEditPanel'
import OverviewDashboard from './OverviewDashboard'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  // Load all actual summary stats
  let camerasCount = 0
  let camerasWithConnectivityCount = 0
  let nodesCount = 0
  let routesCount = 0
  let cablesCount = 0
  let enclosuresCount = 0
  let networkDevicesCount = 0
  let switchesCount = 0
  let powerPointsCount = 0
  let fieldTasksCount = 0
  let openIssuesCount = 0
  let hasBOMItems = false

  try {
    const cameras = await getCameraLocations(projectId)
    camerasCount = cameras.length
    camerasWithConnectivityCount = cameras.filter(c => c.notes && c.notes.includes('[Connectivity: ')).length

    const fiberData = await getFiberDesignData(projectId)
    nodesCount = fiberData.nodes.length
    routesCount = fiberData.routes.length
    cablesCount = fiberData.cables.length
    enclosuresCount = fiberData.enclosures.length

    const devices = await getNetworkDevices(projectId)
    networkDevicesCount = devices.length
    switchesCount = devices.filter(d => d.device_type === 'switch' || d.device_type === 'Industrial Switch').length
    powerPointsCount = switchesCount // default power nodes to switch locations

    const tasks = await getProjectCameraTasks(projectId)
    fieldTasksCount = tasks.length
    openIssuesCount = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length

    const { count: bomCount } = await supabase
      .from('bom_items')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
    hasBOMItems = (bomCount ?? 0) > 0
  } catch (err) {
    console.error('Failed to load project command center stats:', err)
  }

  const projectHasCoords = project.default_latitude !== null && project.default_longitude !== null && Number(project.default_latitude) !== 0

  const stats = {
    camerasCount,
    camerasWithConnectivityCount,
    nodesCount,
    routesCount,
    cablesCount,
    enclosuresCount,
    networkDevicesCount,
    switchesCount,
    powerPointsCount,
    fieldTasksCount,
    openIssuesCount,
    projectHasCoords,
    hasBOMItems,
    hasDocuments: true,
  }

  // Load workflow registry
  const steps = getWorkflowSteps(stats)

  // Calculate project progress percentage based on active/partial steps
  const activeSteps = steps.filter(s => s.phaseAvailability === 'Active' || s.phaseAvailability === 'Partial')
  const completedActiveSteps = activeSteps.filter(s => s.status === 'Complete')
  const progressPercent = activeSteps.length > 0 ? Math.round((completedActiveSteps.length / activeSteps.length) * 100) : 0

  // Determine next recommended action
  const nextRecommendedStep = steps.find(s => s.status !== 'Complete' && s.phaseAvailability !== 'Planned' && s.phaseAvailability !== 'Future')

  // Collect critical missing items list
  const criticalIssues: string[] = []
  if (!projectHasCoords) {
    criticalIssues.push('Project center coordinates are not set in the metadata.')
  }
  if (camerasCount === 0) {
    criticalIssues.push('No CCTV cameras placed on the map.')
  }
  if (camerasCount > 0 && camerasWithConnectivityCount < camerasCount) {
    criticalIssues.push(`${camerasCount - camerasWithConnectivityCount} cameras are missing connectivity method assignments.`)
  }
  if (camerasCount > 0 && routesCount === 0) {
    criticalIssues.push('Fiber routes have not been designed for camera connectivity.')
  }
  if (routesCount > 0 && cablesCount === 0) {
    criticalIssues.push('Fiber cables are not assigned to route pathways.')
  }
  if (fieldTasksCount === 0) {
    criticalIssues.push('No technician tasks assigned for camera installs.')
  }
  if (!hasBOMItems) {
    criticalIssues.push('No Bill of Materials items generated.')
  }

  return (
    <div className="w-full max-h-full overflow-y-auto scrollbar-thin bg-background text-foreground">
      <OverviewDashboard
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? null,
          default_latitude: Number(project.default_latitude),
          default_longitude: Number(project.default_longitude),
          default_zoom: project.default_zoom || 16,
        }}
        stats={stats}
        steps={steps}
        criticalIssues={criticalIssues}
        progressPercent={progressPercent}
        completedActiveSteps={completedActiveSteps.length}
        activeSteps={activeSteps.length}
        nextRecommendedStep={nextRecommendedStep}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </div>
  )
}

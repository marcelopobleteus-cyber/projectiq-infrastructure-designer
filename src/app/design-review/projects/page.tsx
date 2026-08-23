import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import ProjectReviewListClient from './ProjectReviewListClient'

export default async function DesignReviewProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  let rawProjects: any[] = []
  if (user) {
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)

    const orgIds = memberships?.map((m) => m.organization_id) || []
    if (orgIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })
      rawProjects = data || []
    }
  }

  if (rawProjects.length === 0) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    rawProjects = data || []
  }

  // Fetch camera and device counts to map them
  const { data: cameraCounts } = await supabase
    .from('camera_locations')
    .select('project_id')

  const { data: deviceCounts } = await supabase
    .from('network_devices')
    .select('project_id')

  const cameraCountMap: { [key: string]: number } = {}
  cameraCounts?.forEach((cam) => {
    cameraCountMap[cam.project_id] = (cameraCountMap[cam.project_id] || 0) + 1
  })

  const deviceCountMap: { [key: string]: number } = {}
  deviceCounts?.forEach((dev) => {
    deviceCountMap[dev.project_id] = (deviceCountMap[dev.project_id] || 0) + 1
  })

  // Format projects data for the client
  const projects = rawProjects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at,
    updated_at: p.updated_at,
    cameraCount: cameraCountMap[p.id] || 0,
    deviceCount: deviceCountMap[p.id] || 0,
  }))

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full">
      <ProjectReviewListClient 
        initialProjects={projects} 
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  )
}

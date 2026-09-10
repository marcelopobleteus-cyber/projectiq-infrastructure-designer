import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { DEMO_PROJECT } from '@/lib/demoData'
import { getCameraLocations, getCameraModels } from '../../actions-sprint2'
import { getNetworkDevices } from '../../actions-sprint3'
import BOMClientView from './BOMClientView'
import { buildProjectBom } from '@/lib/bom/buildProjectBom'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectBOMPage({ params }: PageProps) {
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

  let cameras: any[] = []
  let cameraModels: any[] = []
  let devices: any[] = []
  let dbBomItems: any[] = []

  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
    devices = await getNetworkDevices(projectId)
    
    const { data: dbItems } = await supabase
      .from('bom_items')
      .select('*')
      .eq('project_id', projectId)
    
    dbBomItems = dbItems || []
  } catch (err) {
    console.error('Failed to load BOM items:', err)
  }

  const mergedItems = buildProjectBom({ cameras, cameraModels, devices, dbBomItems })

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] flex-1 flex flex-col overflow-hidden min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4 shrink-0">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Bill of Materials (BOM)</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Export hardware listings, quantities, and device details for procurement</p>
      </div>

      {/* Main Table view */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <BOMClientView
          projectId={projectId}
          items={mergedItems}
        />
      </div>
    </div>
  )
}

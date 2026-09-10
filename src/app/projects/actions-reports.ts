'use server'

/**
 * Datos reales para los PDF del proyecto.
 *
 * El boton de exportar PDF era un mock: mostraba un toast y no generaba nada.
 * Este action junta lo que el documento necesita en una sola llamada, para
 * que el PDF no invente ni un numero.
 *
 * El BOM se arma con buildProjectBom, la MISMA funcion que usa la pantalla
 * del BOM. Es a proposito: si el PDF calculara lo suyo, el total impreso y el
 * total en pantalla podrian separarse sin que nadie lo note.
 */

import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { buildProjectBom, type ProjectBomItem } from '@/lib/bom/buildProjectBom'
import { getCameraLocations, getCameraModels } from './actions-sprint2'
import { getNetworkDevices } from './actions-sprint3'

export interface ProjectReportCamera {
  tag: string
  model: string
  lens: string | null
  resolution: string | null
  mountingHeightFt: number | null
  ipAddress: string | null
  communicationType: string | null
  status: string
  /** 'Floor plan' o coordenadas, segun donde este colocada */
  placement: string
}

export interface ProjectReportData {
  generatedAt: string
  organizationName: string
  project: {
    id: string
    name: string
    description: string | null
    status: string
    disciplines: string[]
  }
  cameras: ProjectReportCamera[]
  cameraTotals: {
    total: number
    byStatus: { status: string; count: number }[]
    onFloorPlan: number
    onMap: number
    unplaced: number
  }
  tasks: {
    total: number
    completed: number
    inProgress: number
    notStarted: number
    blocked: number
    percentComplete: number
  }
  network: {
    deviceCount: number
    switches: number
    poeBudgetWatts: number
  }
  bom: {
    items: ProjectBomItem[]
    totalCost: number
    /** Costo excluyendo lo que provee el cliente (OFCI): lo realmente facturable */
    contractorCost: number
    ownerSuppliedCost: number
  }
}

export async function getProjectReportData(
  projectId: string
): Promise<{ data?: ProjectReportData; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, disciplines, organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found.' }

  // La pertenencia se comprueba aqui y no solo por RLS: si algun dia una
  // policy se afloja, el PDF no debe ser la puerta por la que se escapa el
  // proyecto de otra organizacion.
  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', project.organization_id)
    .maybeSingle()

  let cameras: any[] = []
  let cameraModels: any[] = []
  let devices: any[] = []
  let dbBomItems: any[] = []

  try {
    cameras = await getCameraLocations(projectId)
    cameraModels = await getCameraModels()
    devices = await getNetworkDevices(projectId)
    const { data: items } = await supabase
      .from('bom_items')
      .select('*')
      .eq('project_id', projectId)
    dbBomItems = items || []
  } catch (err) {
    return { error: 'Could not load project data for the report.' }
  }

  const { data: taskRows } = await supabase
    .from('camera_tasks')
    .select('status')
    .eq('project_id', projectId)

  // --- Camaras ---
  const modelById = new Map(cameraModels.map((m: any) => [m.id, m]))

  const reportCameras: ProjectReportCamera[] = cameras.map((cam: any) => {
    const model = modelById.get(cam.camera_model_id)
    const onPlan = !!cam.floor_plan_id
    const hasCoords = cam.latitude !== 0 && cam.longitude !== 0
    return {
      tag: cam.camera_id_tag || '—',
      model: model ? `${model.manufacturer} ${model.model_number}` : 'Not selected',
      lens: cam.lens || null,
      resolution: cam.resolution || null,
      mountingHeightFt: cam.mounting_height_ft ?? null,
      ipAddress: cam.ip_address || null,
      communicationType: cam.communication_type || null,
      status: cam.status || 'planned',
      placement: onPlan
        ? 'Floor plan'
        : hasCoords
          ? `${Number(cam.latitude).toFixed(5)}, ${Number(cam.longitude).toFixed(5)}`
          : 'Unplaced',
    }
  })

  const statusCounts = new Map<string, number>()
  for (const c of reportCameras) {
    statusCounts.set(c.status, (statusCounts.get(c.status) || 0) + 1)
  }

  // --- Tareas ---
  const tasks = taskRows || []
  const countBy = (s: string) => tasks.filter(t => t.status === s).length
  const completed = countBy('Complete')
  const total = tasks.length

  // --- BOM (misma funcion que la pantalla) ---
  const bomItems = buildProjectBom({ cameras, cameraModels, devices, dbBomItems })
  const totalCost = bomItems.reduce((sum, i) => sum + (i.totalCost || 0), 0)
  const ownerSuppliedCost = bomItems
    .filter(i => i.supplyResponsibility === 'owner')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0)

  return {
    data: {
      generatedAt: new Date().toISOString(),
      organizationName: org?.name || 'NextQ',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        disciplines: project.disciplines || [],
      },
      cameras: reportCameras,
      cameraTotals: {
        total: reportCameras.length,
        byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
        onFloorPlan: reportCameras.filter(c => c.placement === 'Floor plan').length,
        onMap: reportCameras.filter(c => c.placement !== 'Floor plan' && c.placement !== 'Unplaced').length,
        unplaced: reportCameras.filter(c => c.placement === 'Unplaced').length,
      },
      tasks: {
        total,
        completed,
        inProgress: countBy('In Progress'),
        notStarted: countBy('Not Started'),
        blocked: countBy('Blocked'),
        percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      network: {
        deviceCount: devices.length,
        switches: devices.filter((d: any) => (d.device_type || '').toLowerCase().includes('switch')).length,
        poeBudgetWatts: devices.reduce((sum: number, d: any) => sum + (d.poe_budget_watts || 0), 0),
      },
      bom: {
        items: bomItems,
        totalCost,
        contractorCost: totalCost - ownerSuppliedCost,
        ownerSuppliedCost,
      },
    },
  }
}

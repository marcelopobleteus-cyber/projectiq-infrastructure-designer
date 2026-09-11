'use server'

/**
 * Datos reales para la pantalla de "Global Reports" (nivel organizacion).
 *
 * Antes esta pantalla era enteramente mock: las tarjetas "Ready" abrian un
 * modal con texto de ejemplo fijo ("COMPLETED / SEED DATA") sin tocar la
 * base de datos. Para quien la mira parece que "no muestra nada" real.
 *
 * Esta funcion junta metricas reales de todos los proyectos de la
 * organizacion del usuario que llama.
 */

import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

export interface OrgProjectSummary {
  id: string
  name: string
  status: string
  cameraCount: number
  taskPercentComplete: number
}

export interface OrgReportsSummary {
  organizationName: string
  generatedAt: string
  projectCount: number
  projectsByStatus: { status: string; count: number }[]
  totalCameras: number
  totalNetworkDevices: number
  totalBomCost: number
  tasks: {
    total: number
    completed: number
    percentComplete: number
  }
  projects: OrgProjectSummary[]
  activeShareLinks: number
}

async function resolveOrgId(): Promise<{ organizationId?: string; organizationName?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(name)')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!membership) return { error: 'No organization found for this user.' }
    const orgName = (membership as any).organizations?.name as string | undefined
    return { organizationId: membership.organization_id, organizationName: orgName }
  }

  // BYPASS_AUTH local dev: primera organizacion que exista.
  const { data: org } = await supabase.from('organizations').select('id, name').limit(1).maybeSingle()
  if (!org) return { error: 'No organization found.' }
  return { organizationId: org.id, organizationName: org.name }
}

export async function getOrgReportsSummary(): Promise<{ data?: OrgReportsSummary; error?: string }> {
  const caller = await resolveOrgId()
  if (caller.error || !caller.organizationId) return { error: caller.error || 'Access denied' }

  const supabase = await createClient()
  const organizationId = caller.organizationId

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('organization_id', organizationId)

  const projectList = projects || []
  const projectIds = projectList.map(p => p.id)

  if (projectIds.length === 0) {
    return {
      data: {
        organizationName: caller.organizationName || 'Organization',
        generatedAt: new Date().toISOString(),
        projectCount: 0,
        projectsByStatus: [],
        totalCameras: 0,
        totalNetworkDevices: 0,
        totalBomCost: 0,
        tasks: { total: 0, completed: 0, percentComplete: 0 },
        projects: [],
        activeShareLinks: 0,
      },
    }
  }

  const [{ data: cameras }, { data: devices }, { data: bomItems }, { data: tasks }, { data: shareLinks }] =
    await Promise.all([
      supabase.from('camera_locations').select('id, project_id').in('project_id', projectIds),
      supabase.from('network_devices').select('id, project_id').in('project_id', projectIds),
      supabase.from('bom_items').select('project_id, quantity, unit_cost').in('project_id', projectIds),
      supabase.from('camera_tasks').select('project_id, status').in('project_id', projectIds),
      supabase
        .from('project_share_links')
        .select('id, revoked, expires_at')
        .in('project_id', projectIds),
    ])

  const camerasByProject = new Map<string, number>()
  for (const c of cameras || []) {
    camerasByProject.set(c.project_id, (camerasByProject.get(c.project_id) || 0) + 1)
  }

  const tasksByProject = new Map<string, { total: number; done: number }>()
  for (const t of tasks || []) {
    const entry = tasksByProject.get(t.project_id) || { total: 0, done: 0 }
    entry.total += 1
    if (t.status === 'Complete') entry.done += 1
    tasksByProject.set(t.project_id, entry)
  }

  const statusCounts = new Map<string, number>()
  for (const p of projectList) {
    statusCounts.set(p.status, (statusCounts.get(p.status) || 0) + 1)
  }

  const totalBomCost = (bomItems || []).reduce(
    (sum, i: any) => sum + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0),
    0
  )

  const allTasks = tasks || []
  const completedTasks = allTasks.filter(t => t.status === 'Complete').length

  const now = Date.now()
  const activeShareLinks = (shareLinks || []).filter(
    l => !l.revoked && new Date(l.expires_at).getTime() > now
  ).length

  return {
    data: {
      organizationName: caller.organizationName || 'Organization',
      generatedAt: new Date().toISOString(),
      projectCount: projectList.length,
      projectsByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      totalCameras: (cameras || []).length,
      totalNetworkDevices: (devices || []).length,
      totalBomCost,
      tasks: {
        total: allTasks.length,
        completed: completedTasks,
        percentComplete: allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0,
      },
      projects: projectList.map(p => {
        const t = tasksByProject.get(p.id) || { total: 0, done: 0 }
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          cameraCount: camerasByProject.get(p.id) || 0,
          taskPercentComplete: t.total > 0 ? Math.round((t.done / t.total) * 100) : 0,
        }
      }),
      activeShareLinks,
    },
  }
}

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { BYPASS_AUTH } from '@/config/auth'

// Canonical discipline ids — must match PROJECT_TYPES in /projects/create and
// ALL_DISCIPLINES in ProjectSidebar. 'master' is not a discipline itself; it expands
// to the disciplines that currently have a real workspace built for them.
const DISCIPLINE_MAP: Record<string, string[]> = {
  master: ['cctv', 'fiber', 'networking', 'wireless', 'power'],
  cctv: ['cctv'],
  fiber: ['fiber'],
  conduit: ['conduit'],
  networking: ['networking'],
  wireless: ['wireless'],
  power: ['power'],
  lighting: ['lighting'],
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const latitudeStr = formData.get('latitude') as string
  const longitudeStr = formData.get('longitude') as string
  const zoomStr = formData.get('zoom') as string

  if (!name) {
    return { error: 'Project name is required' }
  }

  // Resolve organization
  let orgId: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)
      .limit(1)
      .single()
    orgId = membership?.organization_id || null
  }

  if (!orgId) {
    const { data: firstProj } = await supabase.from('projects').select('organization_id').limit(1).single()
    orgId = firstProj?.organization_id || null
  }

  if (!orgId) {
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = firstOrg?.id || null
  }

  if (!orgId) {
    const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Default Organization' }).select('id').single()
    orgId = newOrg?.id || null
  }

  if (!orgId) {
    return { error: 'Failed to resolve organization.' }
  }

  const latitude = latitudeStr ? parseFloat(latitudeStr) : 33.7490
  const longitude = longitudeStr ? parseFloat(longitudeStr) : -84.3880
  const zoom = zoomStr ? parseInt(zoomStr, 10) : 15
  const projectType = (formData.get('project_type') as string) || 'master'
  const disciplines = DISCIPLINE_MAP[projectType] || []

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name,
      description: description || null,
      disciplines,
      organization_id: orgId,
      default_latitude: latitude,
      default_longitude: longitude,
      default_zoom: zoom,
    })
    .select('id')
    .single()

  const redirectId = project?.id || `proj-${projectType}-${Date.now().toString(36)}`

  revalidatePath('/projects')
  redirect(`/projects/${redirectId}/overview`)
}

export async function updateProjectMetadata(
  projectId: string,
  data: {
    name: string
    description?: string
    default_latitude: number
    default_longitude: number
    default_zoom: number
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Verify the project exists
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      name: data.name,
      description: data.description || null,
      default_latitude: data.default_latitude,
      default_longitude: data.default_longitude,
      default_zoom: data.default_zoom,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath(`/projects/${projectId}/maps`)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')

  return { success: true }
}

// ---------------------------------------------------------------------------
// Parent / sub-project portfolio (migration 011: projects.parent_id)
//
// Model is intentionally capped at 2 levels — a project either has no parent
// (it's a root, and may itself have children) or has exactly one parent that
// is itself a root. No grandchildren. This keeps the consolidated rollup view
// simple and keeps `linkProjectToParent` cheap to validate.
// ---------------------------------------------------------------------------

export interface PortfolioChildSummary {
  id: string
  name: string
  disciplines: string[]
  bomTotal: number
  bomItemCount: number
  tasksTotal: number
  tasksComplete: number
  updatedAt: string | null
}

export interface PortfolioData {
  parent: { id: string; name: string } | null
  children: PortfolioChildSummary[]
  linkableParents: { id: string; name: string }[]
}

export async function getProjectPortfolio(projectId: string): Promise<PortfolioData> {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, parent_id, organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { parent: null, children: [], linkableParents: [] }

  let parent: { id: string; name: string } | null = null
  if (project.parent_id) {
    const { data: parentRow } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', project.parent_id)
      .single()
    if (parentRow) parent = parentRow
  }

  const { data: childRows } = await supabase
    .from('projects')
    .select('id, name, disciplines, updated_at')
    .eq('parent_id', projectId)
    .order('name')

  const children: PortfolioChildSummary[] = []
  for (const child of childRows || []) {
    const { data: bomRows } = await supabase
      .from('bom_items')
      .select('quantity, unit_cost')
      .eq('project_id', child.id)
    const bomTotal = (bomRows || []).reduce(
      (sum, r) => sum + Number(r.quantity) * Number(r.unit_cost),
      0
    )

    const { data: taskRows } = await supabase
      .from('camera_tasks')
      .select('status')
      .eq('project_id', child.id)
    const tasksTotal = taskRows?.length || 0
    const tasksComplete = (taskRows || []).filter(t => t.status === 'Complete').length

    children.push({
      id: child.id,
      name: child.name,
      disciplines: child.disciplines || [],
      bomTotal,
      bomItemCount: bomRows?.length || 0,
      tasksTotal,
      tasksComplete,
      updatedAt: child.updated_at,
    })
  }

  // Candidate parents: root-level projects (no parent of their own) in the same
  // org, excluding this project and excluding this project's own children
  // (which would create a cycle).
  const { data: candidateRows } = await supabase
    .from('projects')
    .select('id, name')
    .eq('organization_id', project.organization_id)
    .is('parent_id', null)
    .neq('id', projectId)

  const childIds = new Set((childRows || []).map(c => c.id))
  const linkableParents = (candidateRows || [])
    .filter(p => !childIds.has(p.id))
    .map(p => ({ id: p.id, name: p.name }))

  return { parent, children, linkableParents }
}

export async function linkProjectToParent(
  projectId: string,
  parentId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  if (parentId === projectId) return { error: 'A project cannot be its own parent.' }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  if (parentId) {
    // This project must not already be a parent itself — max depth is 2 levels.
    const { count: ownChildCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', projectId)

    if ((ownChildCount ?? 0) > 0) {
      return {
        error:
          'This project already has sub-projects linked to it — it cannot also become a sub-project (max depth is 2 levels).',
      }
    }

    const { data: parentProject } = await supabase
      .from('projects')
      .select('id, parent_id, organization_id')
      .eq('id', parentId)
      .single()

    if (!parentProject) return { error: 'Parent project not found' }
    if (parentProject.organization_id !== project.organization_id) {
      return { error: 'The parent project must belong to the same organization.' }
    }
    if (parentProject.parent_id) {
      return { error: 'That project already has a parent — only two levels are supported.' }
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ parent_id: parentId, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath('/projects')
  if (parentId) revalidatePath(`/projects/${parentId}/overview`)

  return { success: true }
}

export async function updateProjectDisciplines(
  projectId: string,
  disciplines: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .single()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ disciplines, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/overview`)
  revalidatePath('/projects')

  return { success: true }
}

export async function deleteProject(projectId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  if (projectId === 'demo-metro-cctv') {
    return { error: 'The primary demo project is protected and cannot be deleted.' }
  }

  try {
    // 1. Delete associated data from child tables to maintain referential integrity
    await Promise.all([
      supabase.from('camera_tasks').delete().eq('project_id', projectId),
      supabase.from('camera_fiber_assignment_strands').delete().eq('project_id', projectId),
      supabase.from('camera_fiber_assignments').delete().eq('project_id', projectId),
      supabase.from('fiber_splice_records').delete().eq('project_id', projectId),
      supabase.from('fiber_enclosures').delete().eq('project_id', projectId),
      supabase.from('fiber_cables').delete().eq('project_id', projectId),
      supabase.from('fiber_route_segments').delete().eq('project_id', projectId),
      supabase.from('fiber_routes').delete().eq('project_id', projectId),
      supabase.from('fiber_nodes').delete().eq('project_id', projectId),
      supabase.from('switch_ports').delete().eq('project_id', projectId),
      supabase.from('network_devices').delete().eq('project_id', projectId),
      supabase.from('camera_locations').delete().eq('project_id', projectId),
      supabase.from('cabinets').delete().eq('project_id', projectId),
      supabase.from('fiber_distribution_units').delete().eq('project_id', projectId),
      supabase.from('fiber_patch_panels').delete().eq('project_id', projectId),
      supabase.from('fiber_patch_cords').delete().eq('project_id', projectId),
      supabase.from('bom_items').delete().eq('project_id', projectId),
      supabase.from('field_tasks').delete().eq('project_id', projectId),
      supabase.from('coordinate_points').delete().eq('project_id', projectId),
    ])

    // 2. Delete the project row from projects table
    const { error: projErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (projErr) {
      console.error('Error deleting project from database:', projErr)
      return { error: projErr.message }
    }

    revalidatePath('/projects')
    revalidatePath('/(workspace)')
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete project:', err)
    return { error: err.message || 'Failed to delete project from database.' }
  }
}

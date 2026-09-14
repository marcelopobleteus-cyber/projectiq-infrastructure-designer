'use server'

/**
 * Ductería's own server actions.
 *
 * Civil works are created, edited and removed from here. Previously the only
 * writer of `conduit_structures` was actions-fiber.ts, which mirrored a copy
 * whenever a manhole was placed on the FIBER map — so Ductería could be looked
 * at but never edited, and every civil object also existed as a fiber node.
 * This file makes Ductería the owner, and `conduit_structures.node_id` stays
 * null for anything created here.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { scopeBuysMaterial } from '@/lib/assetCondition'
import type { AssetCondition, WorkScope } from '@/lib/assetCondition'
import { conduitStructureTypeDef } from '@/lib/conduitStructureTypes'
import type { Database } from '@/types/supabase'

type ConduitStructureUpdate = Database['public']['Tables']['conduit_structures']['Update']

const PLACEHOLDER_ORG = '00000000-0000-0000-0000-000000000000'

function isDuplicateTagError(err: { code?: string } | null): boolean {
  return err?.code === '23505'
}

/**
 * Structure tags are unique per project, and two people placing at once used to
 * collide because the number came from stale client state. The number is picked
 * here, and the caller retries on a unique violation.
 */
async function nextFreeStructureTag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  prefix: string
): Promise<string> {
  const { data } = await supabase
    .from('conduit_structures')
    .select('structure_tag')
    .eq('project_id', projectId)

  const taken = new Set((data ?? []).map(r => r.structure_tag))
  let max = 0
  for (const tag of taken) {
    if (!tag.startsWith(`${prefix}-`)) continue
    const num = parseInt(tag.slice(prefix.length + 1), 10)
    if (!isNaN(num) && num > max) max = num
  }
  for (let n = max + 1; n < max + 500; n++) {
    const candidate = `${prefix}-${String(n).padStart(3, '0')}`
    if (!taken.has(candidate)) return candidate
  }
  return `${prefix}-${Date.now()}`
}

export interface CreateConduitStructureParams {
  projectId: string
  structureType: 'manhole' | 'handhole' | 'pull_box' | 'vault'
  latitude: number
  longitude: number
  sizeDescription?: string | null
  depthFt?: number | null
  material?: string | null
  coverRating?: string | null
  status?: string
  assetCondition?: AssetCondition
  workScope?: WorkScope
  ownerOfRecord?: string | null
  notes?: string | null
}

export async function createConduitStructure(params: CreateConduitStructureParams) {
  const supabase = await createClient()

  const typeDef = conduitStructureTypeDef(params.structureType)
  if (!typeDef) return { error: `Unknown structure type: ${params.structureType}` }

  const assetCondition: AssetCondition = params.assetCondition ?? 'new'
  const workScope: WorkScope = params.workScope ?? (assetCondition === 'new' ? 'install' : 'reuse')

  let created: { id: string; structure_tag: string } | null = null
  let lastError: { message: string } | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const structureTag = await nextFreeStructureTag(supabase, params.projectId, typeDef.tagPrefix)

    const { data, error } = await supabase
      .from('conduit_structures')
      .insert({
        project_id: params.projectId,
        organization_id: PLACEHOLDER_ORG, // the project trigger overwrites this
        node_id: null, // born in Ductería: no fiber node behind it
        structure_tag: structureTag,
        structure_type: params.structureType,
        latitude: params.latitude,
        longitude: params.longitude,
        size_description: params.sizeDescription ?? typeDef.defaultSize,
        depth_ft: params.depthFt ?? typeDef.defaultDepthFt,
        material: params.material ?? null,
        cover_rating: params.coverRating ?? null,
        status: params.status ?? 'Planned',
        asset_condition: assetCondition,
        work_scope: workScope,
        owner_of_record: params.ownerOfRecord ?? null,
        notes: params.notes ?? null,
      })
      .select('id, structure_tag')
      .single()

    if (!error && data) {
      created = data
      break
    }
    if (!isDuplicateTagError(error)) {
      lastError = error
      break
    }
    lastError = error
  }

  if (!created) {
    return { error: `Failed to create structure: ${lastError?.message ?? 'unknown error'}` }
  }

  // Material only for what actually gets installed. Reusing an existing
  // manhole buys nothing — see migration 029.
  let bomWarning: string | null = null
  if (scopeBuysMaterial(workScope)) {
    const { data: catItem } = await supabase
      .from('fiber_hardware_catalog')
      .select('part_number, description, unit_cost, manufacturer, unit')
      .eq('part_number', typeDef.bom.partNumber)
      .maybeSingle()

    const size = params.sizeDescription ?? typeDef.defaultSize
    const { error: bomErr } = await supabase.from('bom_items').insert({
      project_id: params.projectId,
      category: 'Conduit',
      module: 'conduit',
      subcategory: 'structure',
      work_scope: workScope,
      part_number: typeDef.bom.partNumber,
      description: catItem?.description ?? `${typeDef.bom.description} (${size})`,
      quantity: 1.0,
      unit: catItem?.unit ?? 'pcs',
      unit_cost: catItem?.unit_cost ?? typeDef.bom.fallbackCost,
      source: 'catalog',
      manufacturer: catItem?.manufacturer ?? 'Generic',
      conduit_structure_id: created.id,
      status: 'Planned',
    })
    if (bomErr) {
      bomWarning = `Structure saved, but its BOM line could not be created: ${bomErr.message}`
    }
  }

  revalidatePath(`/projects/${params.projectId}/conduit`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true, data: created, warning: bomWarning ?? undefined }
}

export interface UpdateConduitStructureParams {
  id: string
  projectId: string
  structureType?: 'manhole' | 'handhole' | 'pull_box' | 'vault'
  latitude?: number
  longitude?: number
  sizeDescription?: string | null
  depthFt?: number | null
  material?: string | null
  coverRating?: string | null
  status?: string
  assetCondition?: AssetCondition
  workScope?: WorkScope
  ownerOfRecord?: string | null
  notes?: string | null
}

export async function updateConduitStructure(params: UpdateConduitStructureParams) {
  const supabase = await createClient()

  const patch: ConduitStructureUpdate = { updated_at: new Date().toISOString() }
  if (params.structureType !== undefined) patch.structure_type = params.structureType
  if (params.latitude !== undefined) patch.latitude = params.latitude
  if (params.longitude !== undefined) patch.longitude = params.longitude
  if (params.sizeDescription !== undefined) patch.size_description = params.sizeDescription
  if (params.depthFt !== undefined) patch.depth_ft = params.depthFt
  if (params.material !== undefined) patch.material = params.material
  if (params.coverRating !== undefined) patch.cover_rating = params.coverRating
  if (params.status !== undefined) patch.status = params.status
  if (params.assetCondition !== undefined) patch.asset_condition = params.assetCondition
  if (params.workScope !== undefined) patch.work_scope = params.workScope
  if (params.ownerOfRecord !== undefined) patch.owner_of_record = params.ownerOfRecord
  if (params.notes !== undefined) patch.notes = params.notes

  const { error } = await supabase
    .from('conduit_structures')
    .update(patch)
    .eq('id', params.id)

  if (error) return { error: `Failed to update structure: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/conduit`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

export async function deleteConduitStructure(params: { id: string; projectId: string }) {
  const supabase = await createClient()

  // bom_items.conduit_structure_id is ON DELETE SET NULL, so the material line
  // would survive as an orphan. A structure that is removed shouldn't leave
  // something to buy behind it.
  await supabase.from('bom_items').delete().eq('conduit_structure_id', params.id)

  const { error } = await supabase.from('conduit_structures').delete().eq('id', params.id)
  if (error) return { error: `Failed to delete structure: ${error.message}` }

  revalidatePath(`/projects/${params.projectId}/conduit`)
  revalidatePath(`/projects/${params.projectId}/bom`)
  return { success: true }
}

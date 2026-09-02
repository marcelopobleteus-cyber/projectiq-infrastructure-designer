'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

/**
 * Recalculo de la mano de obra de un proyecto.
 *
 * Las lineas de mano de obra se crean con el precio vigente al momento de
 * marcar un elemento como existente. Si despues se ajusta la tarifa, esas
 * lineas conservan el precio viejo — y eso es correcto: un BOM ya cotizado
 * no debe moverse solo. Este modulo es la accion EXPLICITA para ponerlo al
 * dia cuando el usuario lo decide.
 *
 * Siempre en dos pasos: primero se previsualiza el cambio con montos, despues
 * se aplica. Nunca se altera un presupuesto sin que el usuario vea el delta.
 */

/** Estructuras civiles y su tipo canonico para buscar tarifa. */
const NODE_TYPE_TO_STRUCTURE: Record<string, string> = {
  'Manhole': 'manhole',
  'Handhole': 'handhole',
  'Pull Box': 'pull_box',
  'Pole': 'pole',
}

/** Alcances que implican trabajo sobre algo que ya existe. */
const LABOR_SCOPES = ['reuse', 'modify']

export interface LaborChange {
  action: 'add' | 'update' | 'remove'
  elementTag: string
  code: string
  description: string
  quantity: number
  unit: string
  /** Precio unitario actual de la linea; null cuando la linea aun no existe. */
  oldRate: number | null
  /** Precio unitario que quedaria; null cuando la linea se retira. */
  newRate: number | null
  oldTotal: number
  newTotal: number
}

export interface LaborRecalcResult {
  changes: LaborChange[]
  currentLaborTotal: number
  newLaborTotal: number
  /** Elementos que califican para mano de obra pero no tienen tarifa definida. */
  missingRates: string[]
  applied: boolean
  error?: string
}

/**
 * Calcula el estado que DEBERIA tener la mano de obra del proyecto y lo
 * compara con el actual. Con apply=false solo devuelve el diff.
 */
export async function recalculateProjectLabor(params: {
  projectId: string
  apply?: boolean
}): Promise<LaborRecalcResult> {
  const supabase = await createClient()
  const empty: LaborRecalcResult = {
    changes: [], currentLaborTotal: 0, newLaborTotal: 0,
    missingRates: [], applied: false,
  }

  // Organizacion del proyecto, para elegir sus tarifas propias
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', params.projectId)
    .maybeSingle()

  if (projErr || !project) {
    return { ...empty, error: projErr?.message ?? 'Project not found' }
  }

  const { data: rateRows, error: rateErr } = await supabase
    .from('labor_rates')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${project.organization_id}`)

  if (rateErr) return { ...empty, error: `Could not load labor rates: ${rateErr.message}` }

  // La tarifa propia de la organizacion gana sobre la base del sistema.
  const rateByCode = new Map<string, any>()
  for (const r of rateRows ?? []) {
    const current = rateByCode.get(r.code)
    if (!current || (!current.organization_id && r.organization_id)) {
      rateByCode.set(r.code, r)
    }
  }

  const findRate = (scope: string, unit: string, structureType: string | null) =>
    [...rateByCode.values()].find(
      r => r.applies_to_scope === scope && r.unit === unit &&
           (structureType ? r.structure_type === structureType : r.structure_type === null)
    )

  // ── Estado deseado ────────────────────────────────────────────────────────
  // Un mapa de clave-de-linea -> lo que deberia existir.
  type Wanted = {
    code: string; description: string; quantity: number; unit: string
    rate: number; module: string; scope: string
    linkCol: 'fiber_node_id' | 'fiber_route_id'; linkId: string; tag: string
  }
  const wanted = new Map<string, Wanted>()
  const missingRates = new Set<string>()

  const { data: nodes } = await supabase
    .from('fiber_nodes')
    .select('id, node_tag, node_type, asset_condition, work_scope')
    .eq('project_id', params.projectId)
    .eq('asset_condition', 'existing')

  for (const n of nodes ?? []) {
    if (!LABOR_SCOPES.includes(n.work_scope)) continue
    const structureType = NODE_TYPE_TO_STRUCTURE[n.node_type]
    if (!structureType) continue

    const rate = findRate(n.work_scope, 'ea', structureType)
    if (!rate) {
      missingRates.add(`${n.node_type} (${n.work_scope})`)
      continue
    }
    wanted.set(`${n.id}:${rate.code}`, {
      code: rate.code, description: rate.description, quantity: 1, unit: rate.unit,
      rate: Number(rate.rate), module: rate.module, scope: n.work_scope,
      linkCol: 'fiber_node_id', linkId: n.id, tag: n.node_tag,
    })
  }

  const { data: routes } = await supabase
    .from('fiber_routes')
    .select('id, route_id_tag, installed_length_feet, asset_condition, work_scope')
    .eq('project_id', params.projectId)
    .eq('asset_condition', 'existing')

  for (const r of routes ?? []) {
    if (!LABOR_SCOPES.includes(r.work_scope)) continue
    const length = Number(r.installed_length_feet ?? 0)
    if (length <= 0) continue

    const rate = findRate(r.work_scope, 'ft', null)
    if (!rate) {
      missingRates.add(`Existing duct (${r.work_scope})`)
      continue
    }
    wanted.set(`${r.id}:${rate.code}`, {
      code: rate.code, description: rate.description, quantity: length, unit: rate.unit,
      rate: Number(rate.rate), module: rate.module, scope: r.work_scope,
      linkCol: 'fiber_route_id', linkId: r.id, tag: r.route_id_tag ?? 'route',
    })
  }

  // ── Estado actual ─────────────────────────────────────────────────────────
  const { data: existingLines } = await supabase
    .from('bom_items')
    .select('id, part_number, description, quantity, unit, unit_cost, fiber_node_id, fiber_route_id')
    .eq('project_id', params.projectId)
    .eq('subcategory', 'labor')

  const changes: LaborChange[] = []
  const seen = new Set<string>()
  let currentLaborTotal = 0

  for (const line of existingLines ?? []) {
    const linkId = line.fiber_node_id ?? line.fiber_route_id
    const key = `${linkId}:${line.part_number}`
    const oldTotal = Number(line.quantity) * Number(line.unit_cost)
    currentLaborTotal += oldTotal

    const target = wanted.get(key)

    if (!target) {
      // El elemento dejo de calificar (por ejemplo, se remarco como nuevo).
      changes.push({
        action: 'remove',
        elementTag: '—',
        code: line.part_number ?? '',
        description: line.description,
        quantity: Number(line.quantity),
        unit: line.unit,
        oldRate: Number(line.unit_cost),
        newRate: null,
        oldTotal,
        newTotal: 0,
      })
      continue
    }

    seen.add(key)

    const rateChanged = Math.abs(Number(line.unit_cost) - target.rate) > 0.005
    const qtyChanged = Math.abs(Number(line.quantity) - target.quantity) > 0.01

    if (rateChanged || qtyChanged) {
      changes.push({
        action: 'update',
        elementTag: target.tag,
        code: target.code,
        description: target.description,
        quantity: target.quantity,
        unit: target.unit,
        oldRate: Number(line.unit_cost),
        newRate: target.rate,
        oldTotal,
        newTotal: target.quantity * target.rate,
      })
    }
  }

  for (const [key, target] of wanted) {
    if (seen.has(key)) continue
    changes.push({
      action: 'add',
      elementTag: target.tag,
      code: target.code,
      description: target.description,
      quantity: target.quantity,
      unit: target.unit,
      oldRate: null,
      newRate: target.rate,
      oldTotal: 0,
      newTotal: target.quantity * target.rate,
    })
  }

  const newLaborTotal = [...wanted.values()].reduce((s, w) => s + w.quantity * w.rate, 0)

  const result: LaborRecalcResult = {
    changes,
    currentLaborTotal: Number(currentLaborTotal.toFixed(2)),
    newLaborTotal: Number(newLaborTotal.toFixed(2)),
    missingRates: [...missingRates],
    applied: false,
  }

  // Previsualizacion: aqui termina.
  if (!params.apply) return result

  // ── Aplicar ───────────────────────────────────────────────────────────────
  // Los retiros se respaldan igual que cualquier borrado de BOM, para que el
  // recalculo tambien sea reversible.
  const toRemove = (existingLines ?? []).filter(line => {
    const linkId = line.fiber_node_id ?? line.fiber_route_id
    return !wanted.has(`${linkId}:${line.part_number}`)
  })

  if (toRemove.length > 0) {
    const { data: fullRows } = await supabase
      .from('bom_items')
      .select('*')
      .in('id', toRemove.map(l => l.id))

    if (fullRows?.length) {
      await supabase.from('bom_items_removed').insert(
        fullRows.map(row => ({
          original_id: row.id,
          project_id: params.projectId,
          payload: row as any,
          removed_reason: 'Labor recalculation: the element no longer qualifies',
        }))
      )
    }

    const { error: delErr } = await supabase
      .from('bom_items')
      .delete()
      .in('id', toRemove.map(l => l.id))
    if (delErr) return { ...result, error: `Failed to remove stale labor lines: ${delErr.message}` }
  }

  for (const line of existingLines ?? []) {
    const linkId = line.fiber_node_id ?? line.fiber_route_id
    const target = wanted.get(`${linkId}:${line.part_number}`)
    if (!target) continue
    const rateChanged = Math.abs(Number(line.unit_cost) - target.rate) > 0.005
    const qtyChanged = Math.abs(Number(line.quantity) - target.quantity) > 0.01
    if (!rateChanged && !qtyChanged) continue

    const { error: updErr } = await supabase
      .from('bom_items')
      .update({
        unit_cost: target.rate,
        quantity: target.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', line.id)
    if (updErr) return { ...result, error: `Failed to update labor line: ${updErr.message}` }
  }

  const additions = changes.filter(c => c.action === 'add')
  if (additions.length > 0) {
    const rows = [...wanted.entries()]
      .filter(([key]) => !seen.has(key))
      .map(([, w]) => ({
        project_id: params.projectId,
        category: 'Labor',
        module: w.module,
        subcategory: 'labor',
        work_scope: w.scope,
        part_number: w.code,
        description: w.description,
        quantity: w.quantity,
        unit: w.unit,
        unit_cost: w.rate,
        source: 'catalog',
        manufacturer: 'Labor',
        status: 'Planned',
        [w.linkCol]: w.linkId,
      }))

    const { error: insErr } = await supabase.from('bom_items').insert(rows as any)
    if (insErr) return { ...result, error: `Failed to add labor lines: ${insErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/bom`)
  revalidatePath(`/projects/${params.projectId}/fiber`)

  return { ...result, applied: true }
}

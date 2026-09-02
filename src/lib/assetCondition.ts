/**
 * Existente vs nuevo: el eje que decide que se cobra.
 *
 * Vive fuera de actions-fiber.ts porque ese archivo es 'use server' y solo
 * puede exportar funciones async. Aca van los tipos, etiquetas y la regla
 * de facturacion, que se usan tanto en cliente como en servidor.
 */

/**
 * El elemento fisico ya estaba en terreno, o se instala en este proyecto.
 *
 * Ojo: es distinto del `status` de obra. `status` es el avance
 * ("ya lo instale?"); `asset_condition` es la procedencia ("ya estaba?").
 * Un manhole existente reutilizado nunca pasa a "Installed" — no lo instalamos.
 */
export type AssetCondition = 'existing' | 'new' | 'unknown'

/** Alcance del trabajo. Solo install/replace generan material en el BOM. */
export type WorkScope = 'reference' | 'reuse' | 'modify' | 'install' | 'replace' | 'remove'

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  existing: 'Existing',
  new: 'New',
  unknown: 'Unverified',
}

export const WORK_SCOPE_LABELS: Record<WorkScope, string> = {
  reference: 'Reference only',
  reuse: 'Reuse existing',
  modify: 'Modify existing',
  install: 'Install new',
  replace: 'Remove & replace',
  remove: 'Remove',
}

/** Alcances validos segun la procedencia del activo. */
export const SCOPES_FOR_CONDITION: Record<AssetCondition, WorkScope[]> = {
  existing: ['reference', 'reuse', 'modify', 'replace', 'remove'],
  new: ['install'],
  unknown: ['reference', 'reuse', 'modify', 'install', 'replace', 'remove'],
}

/**
 * La regla de facturacion, en un solo lugar.
 * install/replace -> material + mano de obra
 * reuse/modify    -> solo mano de obra
 * reference       -> no genera nada
 */
export function scopeBuysMaterial(scope: WorkScope): boolean {
  return scope === 'install' || scope === 'replace'
}

/** Alcance por defecto coherente con la procedencia. */
export function defaultScopeFor(condition: AssetCondition): WorkScope {
  return condition === 'existing' ? 'reuse' : 'install'
}

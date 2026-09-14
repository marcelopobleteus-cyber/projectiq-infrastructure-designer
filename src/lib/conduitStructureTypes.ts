/**
 * What the Ductería module can place on the map.
 *
 * Civil works belong to Ductería and are created here — not from Fiber. Until
 * now the only way to put a manhole on the map was the Fiber placement menu,
 * which mirrored a copy into `conduit_structures`; that is how `fiber_nodes`
 * ended up holding 114 civil objects. Ductería owns them now, and Fiber shows
 * them as read-only reference (see claude/plan-separacion-modulos.md).
 *
 * `value` is what goes into conduit_structures.structure_type, which the DB
 * constrains to these four.
 */

export interface ConduitStructureTypeDef {
  value: 'manhole' | 'handhole' | 'pull_box' | 'vault'
  label: string
  /** Prefix for the auto-generated structure tag, e.g. MH-001. */
  tagPrefix: string
  /** Typical size, offered as the default when placing one. */
  defaultSize: string
  defaultDepthFt: number
  /**
   * Material line generated when the structure is actually installed or
   * replaced. Reusing an existing structure buys nothing — that rule is what
   * migration 029 fixed after 36 phantom manholes showed up in a BOM.
   */
  bom: { partNumber: string; description: string; fallbackCost: number }
}

export const CONDUIT_STRUCTURE_TYPES: ConduitStructureTypeDef[] = [
  {
    value: 'manhole',
    label: 'Manhole',
    tagPrefix: 'MH',
    defaultSize: '4x6x6',
    defaultDepthFt: 6,
    bom: { partNumber: 'MH-COVER', description: 'Concrete Manhole with Cast Iron Cover', fallbackCost: 2400.0 },
  },
  {
    value: 'handhole',
    label: 'Handhole',
    tagPrefix: 'HH',
    defaultSize: '24x36x36',
    defaultDepthFt: 3,
    bom: { partNumber: 'HH-BOX', description: 'Handhole Box', fallbackCost: 850.0 },
  },
  {
    value: 'pull_box',
    label: 'Pull Box',
    tagPrefix: 'PB',
    defaultSize: '12x12x6',
    defaultDepthFt: 2,
    bom: { partNumber: 'PB-BOX', description: 'Pull Box', fallbackCost: 150.0 },
  },
  {
    value: 'vault',
    label: 'Vault',
    tagPrefix: 'VLT',
    defaultSize: '6x8x7',
    defaultDepthFt: 7,
    bom: { partNumber: 'VLT-PRECAST', description: 'Precast Communications Vault', fallbackCost: 3200.0 },
  },
]

export const STRUCTURE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONDUIT_STRUCTURE_TYPES.map(t => [t.value, t.label])
)

export function conduitStructureTypeDef(value: string): ConduitStructureTypeDef | undefined {
  return CONDUIT_STRUCTURE_TYPES.find(t => t.value === value)
}

/**
 * What the Fiber module can place on the map.
 *
 * Per the module-separation rule (claude/plan-separacion-modulos.md), Fiber
 * offers ONLY fiber objects. Manholes, handholes and pull boxes belong to
 * Ductería; cameras belong to CCTV. Those older node types still exist in the
 * data (and can be shown as a background reference layer), but they are no
 * longer created from here.
 *
 * Naming follows the FTTX convention documented in
 * claude/plan-comparacion-ozmap.md — CE (caja de empalme) and CTO (caja de
 * terminación óptica) are what technicians already call these in the field.
 */

export interface FiberNodeTypeDef {
  /** Stored in fiber_nodes.node_type — must match the DB check constraint. */
  value: string
  /** Shown in the placement menu. */
  label: string
  /** Prefix for the auto-generated node tag, e.g. CE-001. */
  tagPrefix: string
  /**
   * Set when placing this object also creates the fiber_enclosures row that
   * actually holds splices — so a closure dropped on the map is immediately
   * usable in the splice/fusion views instead of being an empty marker.
   */
  enclosure?: {
    enclosureType: string
    role: 'midspan_splice' | 'termination' | 'field_termination' | 'headend'
    capacity: number
  }
  /**
   * Set when the object IS a short cable in the field. A pigtail is exactly
   * that — a stub of fibre with a connector on one end, fusion-spliced to the
   * feeder at the other. Creating it as a cable is what lets it appear in the
   * enclosure's splice matrix, so a splice can actually run through to it;
   * a bare marker could never be one side of a splice. The database trigger
   * on fiber_cables generates its strands with the TIA-598 colours.
   */
  cable?: {
    cableType: 'Backbone' | 'Drop' | 'Existing' | 'Spare' | 'Temporary' | 'Custom'
    fiberCount: number
    lengthFt: number
  }
}

export const FIBER_NODE_TYPES: FiberNodeTypeDef[] = [
  {
    value: 'Splice Closure',
    label: 'Splice Closure (CE)',
    tagPrefix: 'CE',
    enclosure: { enclosureType: 'Splice Enclosure', role: 'midspan_splice', capacity: 24 },
  },
  {
    value: 'Terminal Box',
    label: 'Terminal Box (CTO)',
    tagPrefix: 'CTO',
    enclosure: { enclosureType: 'Terminal Box', role: 'termination', capacity: 12 },
  },
  {
    value: 'Splitter',
    label: 'Splitter',
    tagPrefix: 'SPL',
    enclosure: { enclosureType: 'Splitter', role: 'termination', capacity: 8 },
  },
  {
    value: 'ODF',
    label: 'ODF / DIO',
    tagPrefix: 'ODF',
    enclosure: { enclosureType: 'ODF', role: 'headend', capacity: 48 },
  },
  {
    value: 'Pigtail',
    label: 'Pigtail',
    tagPrefix: 'PIG',
    cable: { cableType: 'Custom', fiberCount: 12, lengthFt: 10 },
  },
  { value: 'Fiber Slack', label: 'Fiber Slack / Reserve', tagPrefix: 'SLK' },
  { value: 'Existing Fiber Source', label: 'Existing Fiber Source', tagPrefix: 'EXT' },
]

export const FIBER_NODE_TYPE_VALUES = FIBER_NODE_TYPES.map(t => t.value)

export function fiberNodeTypeDef(value: string): FiberNodeTypeDef | undefined {
  return FIBER_NODE_TYPES.find(t => t.value === value)
}

/**
 * Node types owned by OTHER modules. They still render (as an optional
 * reference layer) but Fiber never creates or edits them.
 */
export const CIVIL_NODE_TYPES = new Set(['Manhole', 'Handhole', 'Pull Box', 'Vault'])
export const CCTV_NODE_TYPES = new Set(['Camera Location'])

export function isForeignNodeType(nodeType: string | null | undefined): boolean {
  if (!nodeType) return false
  return CIVIL_NODE_TYPES.has(nodeType) || CCTV_NODE_TYPES.has(nodeType)
}

/** Which module owns a node type — used for the reference-layer labelling. */
export function owningModule(nodeType: string | null | undefined): 'conduit' | 'cctv' | 'fiber' {
  if (nodeType && CIVIL_NODE_TYPES.has(nodeType)) return 'conduit'
  if (nodeType && CCTV_NODE_TYPES.has(nodeType)) return 'cctv'
  return 'fiber'
}

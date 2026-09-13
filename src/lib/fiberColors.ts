/**
 * ANSI/TIA-598 fiber color code — the 12-color sequence used to identify
 * individual fibers/buffer tubes within a cable. Verified against the
 * current standard (TIA-598-C/D) during the ductery/fiber plan standards
 * research (claude/plan-estandar-planos-fibra.md in the Claude project):
 * this exact 12-color order is the one universal, firm standard in fiber
 * documentation — unlike diagram symbology (splitters, ODF, splices),
 * which has no governing standard and is left to each org's own legend.
 *
 * For more than 12 fibers/tubes, the standard repeats the sequence with a
 * stripe marking the group (fiber 13 is Blue again, belonging to "group
 * 2"). `getFiberColor` mirrors that: position 13 maps back to Blue.
 *
 * Single source of truth — both the Fiber map/canvas and the Connectivity
 * Diagram import this so the palette can never drift between the two.
 */
export const FIBER_COLORS: { name: string; hex: string }[] = [
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Brown', hex: '#854d0e' },
  { name: 'Slate', hex: '#64748b' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Black', hex: '#000000' },
  { name: 'Yellow', hex: '#ca8a04' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Rose', hex: '#db2777' },
  { name: 'Aqua', hex: '#0d9488' },
]

export function getFiberColor(num: number): { name: string; hex: string } {
  const idx = (num - 1) % FIBER_COLORS.length
  return FIBER_COLORS[idx]
}

/** Looks up by the color name stored on a row (fiber_strands.fiber_color, etc). */
export function fiberColorHex(name: string | null | undefined): string {
  if (!name) return '#94a3b8'
  const match = FIBER_COLORS.find(c => c.name.toLowerCase() === name.toLowerCase())
  return match?.hex ?? '#94a3b8'
}

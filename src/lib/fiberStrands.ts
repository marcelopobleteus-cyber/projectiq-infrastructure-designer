/**
 * Constantes de planta externa compartidas entre servidor y cliente.
 *
 * Viven aqui y no en actions-enclosure.ts porque ese archivo lleva 'use server'
 * y un archivo asi solo puede exportar funciones async. Una constante exportada
 * desde ahi compila sin quejarse y revienta al invocar cualquier action del
 * modulo con "A use server file can only export async functions, found object".
 */

/** Limite fisico de Ethernet sobre cobre: 100 m. */
export const MAX_ETHERNET_DROP_FT = 328

/**
 * Norma de colores TIA-598-C para los 12 hilos de un buffer tube.
 * El orden no es decorativo: es como la cuadrilla identifica cada hilo en
 * terreno, y es el orden en que se ocupan.
 */
export const STRAND_COLORS = [
  'Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White',
  'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua',
] as const

export function strandColor(n: number): string {
  // Mas alla de 12 los colores se repiten por tubo; el numero manda.
  return STRAND_COLORS[(n - 1) % 12] ?? `Strand ${n}`
}

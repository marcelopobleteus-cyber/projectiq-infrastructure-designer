/**
 * Categorias de gasto.
 *
 * Viven en su propio modulo y NO en actions.ts porque un archivo 'use server'
 * solo puede exportar funciones async. Exportar una constante desde ahi compila
 * sin problemas y revienta en produccion al invocar el server action, con
 * "A use server file can only export async functions, found object".
 */

export const EXPENSE_CATEGORIES = [
  'fuel', 'material', 'equipment', 'tools', 'permit', 'travel', 'meals', 'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel: 'Fuel',
  material: 'Material',
  equipment: 'Equipment',
  tools: 'Tools',
  permit: 'Permit',
  travel: 'Travel',
  meals: 'Meals',
  other: 'Other',
}

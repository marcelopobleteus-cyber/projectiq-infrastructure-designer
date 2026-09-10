/**
 * De costo a precio de venta.
 *
 * El BOM siempre mostro costo. Esto agrega la capa comercial: margen sobre
 * material, margen sobre mano de obra, e impuesto. Es una funcion pura para
 * que la pantalla del BOM y el PDF del cliente calculen exactamente lo mismo
 * — el mismo motivo por el que se extrajo buildProjectBom.
 *
 * Dos reglas que no son obvias y cuestan plata si se equivocan:
 *
 * 1. markup != margin.
 *      markup 20% sobre costo 100 -> 120 (la ganancia es 16.7% del precio)
 *      margin 20% sobre costo 100 -> 125 (la ganancia es 20%   del precio)
 *    Por eso el modo se elige, no se asume.
 *
 * 2. El material que provee el cliente (OFCI) NO lleva margen ni entra en el
 *    precio: no lo compramos nosotros. Cobrarle al cliente un margen sobre
 *    algo que el mismo compro es un error de cotizacion, no una decision.
 */

import type { ProjectBomItem } from './buildProjectBom'

export interface PricingSettings {
  pricingMode: 'markup' | 'margin'
  materialMarkupPct: number
  laborMarkupPct: number
  taxPct: number
  taxAppliesToLabor: boolean
}

export const ZERO_PRICING: PricingSettings = {
  pricingMode: 'markup',
  materialMarkupPct: 0,
  laborMarkupPct: 0,
  taxPct: 0,
  taxAppliesToLabor: false,
}

export interface PricedTotals {
  /** Costo de lo que compramos e instalamos nosotros */
  materialCost: number
  laborCost: number
  /** Costo de lo que provee el cliente: se informa, no se cobra */
  ownerSuppliedCost: number
  materialPrice: number
  laborPrice: number
  subtotal: number
  tax: number
  total: number
  /** Ganancia bruta en dinero */
  grossProfit: number
  /** Ganancia como porcentaje del subtotal (margen real, no markup) */
  grossMarginPct: number
  settings: PricingSettings
}

/** Aplica el porcentaje segun el modo elegido. */
export function applyUplift(cost: number, pct: number, mode: 'markup' | 'margin'): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0
  const p = Number.isFinite(pct) && pct > 0 ? pct : 0
  if (p === 0) return cost

  if (mode === 'margin') {
    // Un margen de 100% daria division por cero (precio infinito). Se topa
    // en 99% en vez de reventar o devolver Infinity a una pantalla.
    const capped = Math.min(p, 99)
    return cost / (1 - capped / 100)
  }
  return cost * (1 + p / 100)
}

/** Una linea del BOM es mano de obra si su categoria lo dice. */
export function isLaborItem(item: ProjectBomItem): boolean {
  return (item.category || '').toLowerCase() === 'labor'
}

export function priceProjectBom(
  items: ProjectBomItem[],
  settings: PricingSettings = ZERO_PRICING,
): PricedTotals {
  let materialCost = 0
  let laborCost = 0
  let ownerSuppliedCost = 0

  for (const item of items) {
    const cost = Number(item.totalCost) || 0
    if (item.supplyResponsibility === 'owner') {
      ownerSuppliedCost += cost
      continue
    }
    if (isLaborItem(item)) laborCost += cost
    else materialCost += cost
  }

  const materialPrice = applyUplift(materialCost, settings.materialMarkupPct, settings.pricingMode)
  const laborPrice = applyUplift(laborCost, settings.laborMarkupPct, settings.pricingMode)
  const subtotal = materialPrice + laborPrice

  // En la mayoria de los estados de EE.UU. la mano de obra de instalacion no
  // paga sales tax, pero no en todos: por eso es una casilla y no una regla
  // fija que alguien descubre mal despues de facturar.
  const taxBase = settings.taxAppliesToLabor ? subtotal : materialPrice
  const tax = settings.taxPct > 0 ? taxBase * (settings.taxPct / 100) : 0

  const total = subtotal + tax
  const grossProfit = subtotal - (materialCost + laborCost)

  return {
    materialCost,
    laborCost,
    ownerSuppliedCost,
    materialPrice,
    laborPrice,
    subtotal,
    tax,
    total,
    grossProfit,
    grossMarginPct: subtotal > 0 ? (grossProfit / subtotal) * 100 : 0,
    settings,
  }
}

/** Precio de venta de una linea suelta, para mostrarlo en la tabla. */
export function priceLine(item: ProjectBomItem, settings: PricingSettings): number {
  const cost = Number(item.totalCost) || 0
  if (item.supplyResponsibility === 'owner') return 0
  const pct = isLaborItem(item) ? settings.laborMarkupPct : settings.materialMarkupPct
  return applyUplift(cost, pct, settings.pricingMode)
}

export function hasPricing(settings: PricingSettings): boolean {
  return settings.materialMarkupPct > 0 || settings.laborMarkupPct > 0 || settings.taxPct > 0
}

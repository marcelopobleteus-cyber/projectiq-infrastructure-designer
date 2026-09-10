/**
 * Tipos y valores por defecto de la marca de la organizacion.
 *
 * Viven aqui y no en settings/actions.ts porque ese archivo es 'use server' y
 * Next solo permite exportar funciones async desde un modulo de servidor.
 * Exportar la constante desde ahi rompia el build con "Failed to collect
 * configuration for /settings", sin senalar la linea culpable.
 */

export interface OrganizationBranding {
  logoDataUrl: string | null
  primaryColor: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  address: string | null
  licenseNumber: string | null
}

export const DEFAULT_BRANDING: OrganizationBranding = {
  logoDataUrl: null,
  primaryColor: '#009973',
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  website: null,
  address: null,
  licenseNumber: null,
}

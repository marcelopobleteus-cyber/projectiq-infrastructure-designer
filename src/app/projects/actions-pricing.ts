'use server'

/**
 * Margen e impuesto por proyecto.
 *
 * Sin fila guardada se devuelven ceros, o sea el BOM se comporta como siempre
 * (costo puro). Es a proposito: nadie debe ver precios nuevos por el solo
 * hecho de que exista la tabla.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { ZERO_PRICING, type PricingSettings } from '@/lib/bom/pricing'

async function resolveProjectOrg(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' as const }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' as const }

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' as const }
    return { organizationId: project.organization_id, role: membership?.role ?? 'owner' }
  }

  return { organizationId: project.organization_id, role: 'owner' }
}

export async function getProjectPricing(
  projectId: string,
): Promise<{ settings: PricingSettings; canEdit: boolean; error?: string }> {
  const caller = await resolveProjectOrg(projectId)
  if ('error' in caller) return { settings: ZERO_PRICING, canEdit: false, error: caller.error }

  const supabase = await createClient()
  const { data } = await supabase
    .from('project_pricing')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  const canEdit = caller.role === 'owner' || caller.role === 'admin'

  if (!data) return { settings: ZERO_PRICING, canEdit }

  return {
    canEdit,
    settings: {
      pricingMode: data.pricing_mode === 'margin' ? 'margin' : 'markup',
      materialMarkupPct: Number(data.material_markup_pct) || 0,
      laborMarkupPct: Number(data.labor_markup_pct) || 0,
      taxPct: Number(data.tax_pct) || 0,
      taxAppliesToLabor: !!data.tax_applies_to_labor,
    },
  }
}

export async function saveProjectPricing(params: {
  projectId: string
  settings: PricingSettings
}): Promise<{ success?: boolean; error?: string }> {
  const caller = await resolveProjectOrg(params.projectId)
  if ('error' in caller) return { error: caller.error }
  if (caller.role !== 'owner' && caller.role !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can change pricing.' }
  }

  const s = params.settings
  const inRange = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max

  if (!inRange(s.materialMarkupPct, 500)) return { error: 'Material percentage must be between 0 and 500.' }
  if (!inRange(s.laborMarkupPct, 500)) return { error: 'Labor percentage must be between 0 and 500.' }
  if (!inRange(s.taxPct, 100)) return { error: 'Tax must be between 0 and 100.' }
  // En modo margin, 100% seria precio infinito. Se rechaza aqui con un
  // mensaje claro en vez de dejar que la formula lo tope en silencio.
  if (s.pricingMode === 'margin' && (s.materialMarkupPct >= 100 || s.laborMarkupPct >= 100)) {
    return { error: 'In margin mode the percentage must be under 100.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('project_pricing').upsert(
    {
      project_id: params.projectId,
      organization_id: caller.organizationId,
      pricing_mode: s.pricingMode,
      material_markup_pct: s.materialMarkupPct,
      labor_markup_pct: s.laborMarkupPct,
      tax_pct: s.taxPct,
      tax_applies_to_labor: s.taxAppliesToLabor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' },
  )

  if (error) return { error: error.message }

  revalidatePath(`/projects/${params.projectId}/bom`)
  revalidatePath(`/projects/${params.projectId}/reports`)
  return { success: true }
}

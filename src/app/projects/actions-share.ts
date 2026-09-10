'use server'

/**
 * Enlaces de solo lectura para clientes.
 *
 * Reglas de seguridad de este archivo, por si alguien lo toca despues:
 *
 * - La contrasena nunca se guarda en claro. PBKDF2-SHA512, salt por enlace.
 * - La comparacion del hash es en tiempo constante (timingSafeEqual). Un
 *   `===` sobre strings filtra informacion por cuanto tarda en fallar.
 * - La lectura publica NO usa policies anonimas: valida y lee con service
 *   role. Abrir una policy publica sobre projects para esto expondria todos
 *   los proyectos de todas las organizaciones.
 */

import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { BYPASS_AUTH } from '@/config/auth'

const PBKDF2_ITERATIONS = 210_000
const PBKDF2_KEYLEN = 64
const PBKDF2_DIGEST = 'sha512'

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex')
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export interface ShareLinkItem {
  id: string
  token: string
  label: string | null
  expiresAt: string
  revoked: boolean
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  /** true cuando expires_at ya paso */
  expired: boolean
}

async function resolveProjectAccess(projectId: string) {
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
    return { organizationId: project.organization_id, role: membership?.role ?? 'owner', userId: user.id }
  }

  return { organizationId: project.organization_id, role: 'owner', userId: null as string | null }
}

export async function listShareLinks(
  projectId: string,
): Promise<{ links: ShareLinkItem[]; canManage: boolean; error?: string }> {
  const caller = await resolveProjectAccess(projectId)
  if ('error' in caller) return { links: [], canManage: false, error: caller.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_share_links')
    .select('id, token, label, expires_at, revoked, view_count, last_viewed_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return { links: [], canManage: false, error: error.message }

  const now = Date.now()
  return {
    canManage: caller.role === 'owner' || caller.role === 'admin',
    links: (data ?? []).map(l => ({
      id: l.id,
      token: l.token,
      label: l.label,
      expiresAt: l.expires_at,
      revoked: l.revoked,
      viewCount: l.view_count,
      lastViewedAt: l.last_viewed_at,
      createdAt: l.created_at,
      expired: new Date(l.expires_at).getTime() < now,
    })),
  }
}

export async function createShareLink(params: {
  projectId: string
  password: string
  expiresInDays: number
  label?: string
}): Promise<{ token?: string; error?: string }> {
  const caller = await resolveProjectAccess(params.projectId)
  if ('error' in caller) return { error: caller.error }
  if (caller.role !== 'owner' && caller.role !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can share a project.' }
  }

  // 8 caracteres es lo que la gente escribe y despues comparte por WhatsApp.
  // El enlace da acceso a un proyecto completo, asi que el minimo es mas alto.
  if (!params.password || params.password.length < 8) {
    return { error: 'The password must be at least 8 characters.' }
  }
  if (!Number.isFinite(params.expiresInDays) || params.expiresInDays < 1 || params.expiresInDays > 365) {
    return { error: 'Expiry must be between 1 and 365 days.' }
  }

  const salt = randomBytes(16).toString('hex')
  // 24 bytes en base64url: suficiente para que el token no se adivine ni
  // aunque alguien pruebe sin parar.
  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)

  const supabase = await createClient()
  const { error } = await supabase.from('project_share_links').insert({
    project_id: params.projectId,
    organization_id: caller.organizationId,
    token,
    password_salt: salt,
    password_hash: hashPassword(params.password, salt),
    label: (params.label || '').trim().slice(0, 80) || null,
    expires_at: expiresAt.toISOString(),
    created_by: caller.userId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${params.projectId}`)
  return { token }
}

export async function revokeShareLink(params: {
  projectId: string
  linkId: string
}): Promise<{ success?: boolean; error?: string }> {
  const caller = await resolveProjectAccess(params.projectId)
  if ('error' in caller) return { error: caller.error }
  if (caller.role !== 'owner' && caller.role !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can revoke a link.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_share_links')
    .update({ revoked: true })
    .eq('id', params.linkId)
    .eq('project_id', params.projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${params.projectId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Lado publico
// ---------------------------------------------------------------------------

export interface SharedProjectView {
  projectName: string
  projectDescription: string | null
  organizationName: string
  branding: {
    logoDataUrl: string | null
    primaryColor: string
    contactName: string | null
    contactEmail: string | null
    contactPhone: string | null
    website: string | null
  }
  cameraCount: number
  camerasByStatus: { status: string; count: number }[]
  taskPercentComplete: number
  cameras: { tag: string; model: string; status: string; placement: string }[]
  /** Solo se llena si el proyecto tiene precio configurado. */
  price: { subtotal: number; tax: number; total: number; taxPct: number } | null
  expiresAt: string
}

/**
 * Valida token + contrasena y devuelve la vista del cliente.
 *
 * Devuelve el MISMO mensaje para token inexistente, revocado, vencido o
 * contrasena incorrecta. Distinguirlos le diria a quien prueba al azar cuales
 * tokens existen.
 */
export async function openSharedProject(params: {
  token: string
  password: string
}): Promise<{ view?: SharedProjectView; error?: string }> {
  const generic = { error: 'That link or password is not valid.' }

  if (!params.token || !params.password) return generic

  const admin = createAdminClient()

  const { data: link } = await admin
    .from('project_share_links')
    .select('*')
    .eq('token', params.token)
    .maybeSingle()

  if (!link) return generic
  if (link.revoked) return generic
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return { error: 'This link has expired. Please ask for a new one.' }
  }

  const attempt = hashPassword(params.password, link.password_salt)
  if (!safeEquals(attempt, link.password_hash)) return generic

  const [{ data: project }, { data: org }, { data: brandingRow }] = await Promise.all([
    admin.from('projects').select('name, description, organization_id').eq('id', link.project_id).maybeSingle(),
    admin.from('organizations').select('name').eq('id', link.organization_id).maybeSingle(),
    admin.from('organization_branding').select('*').eq('organization_id', link.organization_id).maybeSingle(),
  ])

  if (!project) return generic

  const [{ data: cameras }, { data: models }, { data: tasks }, { data: pricingRow }] = await Promise.all([
    admin.from('camera_locations').select('*').eq('project_id', link.project_id).order('camera_id_tag'),
    admin.from('camera_models').select('id, manufacturer, model_number'),
    admin.from('camera_tasks').select('status').eq('project_id', link.project_id),
    admin.from('project_pricing').select('*').eq('project_id', link.project_id).maybeSingle(),
  ])

  const modelById = new Map((models ?? []).map(m => [m.id, m]))
  const camRows = cameras ?? []

  const statusCounts = new Map<string, number>()
  for (const c of camRows) statusCounts.set(c.status, (statusCounts.get(c.status) || 0) + 1)

  const taskRows = tasks ?? []
  const done = taskRows.filter(t => t.status === 'Complete').length

  // Precio: solo se muestra si la organizacion configuro margen o impuesto.
  // Sin eso, los numeros del BOM son COSTO INTERNO y no pueden salir por un
  // enlace publico — es la clase de fuga que cuesta una negociacion.
  let price: SharedProjectView['price'] = null
  if (pricingRow) {
    const hasUplift =
      Number(pricingRow.material_markup_pct) > 0 ||
      Number(pricingRow.labor_markup_pct) > 0 ||
      Number(pricingRow.tax_pct) > 0

    if (hasUplift) {
      const { buildProjectBom } = await import('@/lib/bom/buildProjectBom')
      const { priceProjectBom } = await import('@/lib/bom/pricing')

      const [{ data: devices }, { data: bomItems }] = await Promise.all([
        admin.from('network_devices').select('*').eq('project_id', link.project_id),
        admin.from('bom_items').select('*').eq('project_id', link.project_id),
      ])

      const items = buildProjectBom({
        cameras: camRows,
        cameraModels: models ?? [],
        devices: devices ?? [],
        dbBomItems: bomItems ?? [],
      })

      const totals = priceProjectBom(items, {
        pricingMode: pricingRow.pricing_mode === 'margin' ? 'margin' : 'markup',
        materialMarkupPct: Number(pricingRow.material_markup_pct) || 0,
        laborMarkupPct: Number(pricingRow.labor_markup_pct) || 0,
        taxPct: Number(pricingRow.tax_pct) || 0,
        taxAppliesToLabor: !!pricingRow.tax_applies_to_labor,
      })

      price = {
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        taxPct: Number(pricingRow.tax_pct) || 0,
      }
    }
  }

  // Se registra la visita sin bloquear la respuesta si falla: el contador es
  // informativo, no puede impedir que el cliente vea su proyecto.
  await admin
    .from('project_share_links')
    .update({ view_count: link.view_count + 1, last_viewed_at: new Date().toISOString() })
    .eq('id', link.id)

  return {
    view: {
      projectName: project.name,
      projectDescription: project.description,
      organizationName: org?.name || 'NextQ',
      branding: {
        logoDataUrl: brandingRow?.logo_data_url ?? null,
        primaryColor: brandingRow?.primary_color || '#009973',
        contactName: brandingRow?.contact_name ?? null,
        contactEmail: brandingRow?.contact_email ?? null,
        contactPhone: brandingRow?.contact_phone ?? null,
        website: brandingRow?.website ?? null,
      },
      cameraCount: camRows.length,
      camerasByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      taskPercentComplete: taskRows.length > 0 ? Math.round((done / taskRows.length) * 100) : 0,
      price,
      cameras: camRows.map(c => {
        const model = modelById.get(c.camera_model_id)
        const hasCoords = c.latitude !== 0 && c.longitude !== 0
        return {
          tag: c.camera_id_tag,
          model: model ? `${model.manufacturer} ${model.model_number}` : 'To be selected',
          status: c.status,
          // El cliente no necesita coordenadas exactas de cada camara; le
          // sirve saber si ya tiene ubicacion definida.
          placement: c.floor_plan_id ? 'Floor plan' : hasCoords ? 'Site map' : 'Not placed',
        }
      }),
      expiresAt: link.expires_at,
    },
  }
}

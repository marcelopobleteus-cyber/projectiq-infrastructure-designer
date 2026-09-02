'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendInviteEmail } from '@/utils/supabase/admin'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { BYPASS_AUTH } from '@/config/auth'

export interface TeamMemberItem {
  id: string
  profileId: string
  fullName: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joinedAt: string
  status: 'active'
}

export interface PendingInviteItem {
  id: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  invitedBy: string
  createdAt: string
  status: 'pending'
}

export interface OrganizationTeamData {
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer'
  organizationId: string
  organizationName: string
  members: TeamMemberItem[]
  invites: PendingInviteItem[]
}

export async function getOrganizationTeamData(): Promise<OrganizationTeamData> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    return {
      currentUserRole: 'viewer',
      organizationId: '',
      organizationName: 'Default Organization',
      members: [],
      invites: [],
    }
  }

  // 1. Resolve caller's organization membership
  let orgId = ''
  let currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'owner'

  if (user) {
    // Ordered so a user who belongs to more than one organization always resolves to the
    // same one. Without an order, `limit(1)` returned whichever row Postgres handed back
    // first, so the settings page could silently show a different organization per load.
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const membership = membershipRows?.[0]

    if (membership) {
      orgId = membership.organization_id
      currentUserRole = (membership.role as any) || 'owner'
    }
  }

  // Note: the two fallbacks below pick "any project" and then "any organization" when the
  // caller has no membership. RLS is what keeps that from crossing tenants, so they are
  // left in place, but a user with no membership should really see an empty state rather
  // than someone else's workspace.
  if (!orgId) {
    const { data: firstProj } = await supabase.from('projects').select('organization_id').limit(1)
    orgId = firstProj?.[0]?.organization_id || ''
  }

  if (!orgId) {
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1)
    orgId = firstOrg?.[0]?.id || ''
  }

  // Fetch Organization Name
  let organizationName = 'Company Workspace'
  if (orgId) {
    const { data: orgRow } = await supabase.from('organizations').select('name').eq('id', orgId).limit(1)
    if (orgRow?.[0]?.name) organizationName = orgRow[0].name
  }

  // 2. Fetch all members in organization
  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('id, profile_id, role, created_at, profiles(id, full_name, email)')
    .eq('organization_id', orgId)
  

  // Fetch real emails from auth.users via admin client if available
  let adminClient: any = null
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
  }

  const members: TeamMemberItem[] = []
  for (const m of memberRows || []) {
    const profile = (m.profiles as any) || {}
    const fullName = profile.full_name || 'Team Member'
    
    // Check if email is already available in the profiles table (added via migration 019)
    let email = profile.email || ''
    
    if (!email) {
      email = m.profile_id === user?.id ? (user?.email || 'user@company.com') : ''
    }
    
    if (!email && adminClient) {
      try {
        // Hard timeout of 3 seconds to prevent indefinite hanging in Vercel
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Admin API Timeout')), 3000)
        )
        const fetchPromise = adminClient.auth.admin.getUserById(m.profile_id)
        
        const { data: adminUser } = await Promise.race([fetchPromise, timeoutPromise]) as any
        if (adminUser?.user?.email) {
          email = adminUser.user.email
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (!email) {
      email = `${m.profile_id.substring(0, 8)}@company.com`
    }

    members.push({
      id: m.id,
      profileId: m.profile_id,
      fullName,
      email,
      role: m.role as any,
      joinedAt: m.created_at || new Date().toISOString(),
      status: 'active',
    })
  }

  // 3. Fetch pending invites in organization
  const { data: inviteRows } = await supabase
    .from('organization_invites')
    .select('id, email, role, created_at, status')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  
  const invites: PendingInviteItem[] = (inviteRows || []).map(i => ({
    id: i.id,
    email: i.email,
    role: i.role as any,
    invitedBy: 'System',
    createdAt: i.created_at,
    status: 'pending',
  }))

  return {
    currentUserRole,
    organizationId: orgId,
    organizationName,
    members,
    invites,
  }
}

export async function inviteTeamMember(
  email: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<{ success?: boolean; error?: string; warning?: string }> {
  const validRoles = ['admin', 'editor', 'viewer']
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role selected.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Check caller role
  let callerRole = 'owner'
  let orgId = ''

  if (user) {
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)

    const membership = membershipRows?.[0]

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
    if (membership) {
      orgId = membership.organization_id
      callerRole = membership.role
    }
  }

  if (callerRole !== 'owner' && callerRole !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can invite team members.' }
  }

  // Insert invite into organization_invites
  const { error: inviteErr } = await supabase
    .from('organization_invites')
    .insert({
      organization_id: orgId,
      email: email.trim().toLowerCase(),
      role: role as any,
      invited_by: user?.id || null,
      status: 'pending',
    })

  if (inviteErr) {
    return { error: `Failed to create invite: ${inviteErr.message}` }
  }

  // sendInviteEmail returns { sent, error } — it does not throw, so the old try/catch
  // never saw a failed send. The invite row exists either way, but the person is told
  // whether the email actually left.
  const invite = await sendInviteEmail(email.trim().toLowerCase())

  revalidatePath('/settings')

  if (!invite.sent) {
    console.error('Invite email not sent to', email, '-', invite.error)
    return {
      success: true,
      warning: `Invitation saved, but the email could not be sent: ${invite.error || 'unknown error'}`,
    }
  }

  return { success: true }
}

export async function updateMemberRole(
  memberId: string,
  newRole: 'owner' | 'admin' | 'editor' | 'viewer'
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Check caller role
  let callerRole = 'owner'
  let orgId = ''

  if (user) {
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)

    const membership = membershipRows?.[0]

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
    if (membership) {
      orgId = membership.organization_id
      callerRole = membership.role
    }
  }

  if (callerRole !== 'owner' && callerRole !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can manage roles.' }
  }

  // Fetch target member
  const { data: targetMemberRows } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role')
    .eq('id', memberId)
    .limit(1)

  const targetMember = targetMemberRows?.[0]
  if (!targetMember) return { error: 'Member not found.' }

  if (targetMember.organization_id !== orgId && !BYPASS_AUTH) {
    return { error: 'Access denied.' }
  }

  // Non-owners cannot change anyone to or from 'owner'
  if (callerRole !== 'owner' && (targetMember.role === 'owner' || newRole === 'owner')) {
    return { error: 'Only an organization owner can assign or modify owner roles.' }
  }

  // Check last owner protection
  if (targetMember.role === 'owner' && newRole !== 'owner') {
    const { count: ownerCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('role', 'owner')

    if ((ownerCount ?? 0) <= 1) {
      return { error: 'Cannot demote the organization’s last remaining owner.' }
    }
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole as any })
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeMember(memberId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  // Check caller role
  let callerRole = 'owner'
  let orgId = ''

  if (user) {
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)

    const membership = membershipRows?.[0]

    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
    if (membership) {
      orgId = membership.organization_id
      callerRole = membership.role
    }
  }

  if (callerRole !== 'owner' && callerRole !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can remove members.' }
  }

  // Fetch target member
  const { data: targetMemberRows } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role')
    .eq('id', memberId)
    .limit(1)

  const targetMember = targetMemberRows?.[0]
  if (!targetMember) return { error: 'Member not found.' }

  if (targetMember.organization_id !== orgId && !BYPASS_AUTH) {
    return { error: 'Access denied.' }
  }

  // Nobody removes themselves. The last-owner check below is not enough on its own: an
  // owner can promote someone else to owner and then delete their own row, which passes
  // the count check and locks them out of the organization they were managing — with no
  // way back from inside the app.
  if (user && targetMember.profile_id === user.id && !BYPASS_AUTH) {
    return {
      error: 'You cannot remove yourself from the organization. Ask another owner to do it.',
    }
  }

  // Owners are not removable from the client app at all — not by themselves, not by
  // another owner. Ownership is managed by the platform administrator from /admin.
  // Counting owners was not enough: promoting a second owner first made the count pass.
  if (targetMember.role === 'owner') {
    return {
      error:
        'Owners cannot be removed here. Contact the platform administrator to change the account owner.',
    }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function revokeInvite(inviteId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('organization_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Rename the caller's organization.
 *
 * The General tab used to render the workspace name in an input with no save button — you
 * could type in it and nothing happened. RLS already allows owners and admins to update
 * `organizations`, so the check here mirrors that rather than inventing a new rule.
 */
export async function updateWorkspaceName(
  name: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmed = name.trim()

  if (!trimmed) {
    return { error: 'The workspace name cannot be empty.' }
  }

  if (trimmed.length > 120) {
    return { error: 'The workspace name is too long (120 characters max).' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }

  let orgId = ''
  let callerRole = 'owner'

  if (user) {
    const { data: membershipRows } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const membership = membershipRows?.[0]
    if (!membership && !BYPASS_AUTH) return { error: 'Access denied' }
    if (membership) {
      orgId = membership.organization_id
      callerRole = membership.role
    }
  }

  if (callerRole !== 'owner' && callerRole !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can rename the workspace.' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ name: trimmed })
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { success: true }
}

// ─── Tarifas de mano de obra ─────────────────────────────────────────────────
//
// El sistema trae tarifas base (organization_id null) que son un punto de
// partida, NO precios de mercado verificados. Cada organizacion sobrescribe
// las que le sirven; las suyas ganan siempre sobre la base.

export interface LaborRateItem {
  id: string
  code: string
  description: string
  module: string
  appliesToScope: string
  structureType: string | null
  unit: string
  rate: number
  notes: string | null
  /** true = tarifa base del sistema, todavia sin ajustar por la organizacion */
  isSystemDefault: boolean
  /** id de la fila base cuando esta ya fue sobrescrita, para poder mostrar el origen */
  overridesCode: string | null
}

/** Resuelve la organizacion del usuario y su rol. */
async function resolveCallerOrg(): Promise<
  { orgId: string; role: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !BYPASS_AUTH) return { error: 'Not authenticated' }
  if (!user) return { orgId: '', role: 'owner' }

  const { data: rows } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const membership = rows?.[0]
  if (!membership) return { error: 'Access denied' }
  return { orgId: membership.organization_id, role: membership.role }
}

export async function getLaborRates(): Promise<{
  rates: LaborRateItem[]
  canEdit: boolean
  error?: string
}> {
  const caller = await resolveCallerOrg()
  if ('error' in caller) return { rates: [], canEdit: false, error: caller.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('labor_rates')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${caller.orgId}`)
    .order('module', { ascending: true })
    .order('code', { ascending: true })

  if (error) return { rates: [], canEdit: false, error: error.message }

  // La tarifa propia de la organizacion reemplaza a la base del mismo codigo.
  const byCode = new Map<string, any>()
  for (const row of data ?? []) {
    const current = byCode.get(row.code)
    if (!current || (!current.organization_id && row.organization_id)) {
      byCode.set(row.code, row)
    }
  }

  const rates: LaborRateItem[] = [...byCode.values()].map(r => ({
    id: r.id,
    code: r.code,
    description: r.description,
    module: r.module,
    appliesToScope: r.applies_to_scope,
    structureType: r.structure_type,
    unit: r.unit,
    rate: Number(r.rate),
    notes: r.notes,
    isSystemDefault: r.organization_id === null,
    overridesCode: r.organization_id ? r.code : null,
  }))

  return {
    rates,
    canEdit: caller.role === 'owner' || caller.role === 'admin',
  }
}

/**
 * Fija la tarifa de la organizacion para un codigo. Nunca modifica la fila
 * base del sistema: crea o actualiza la propia de la organizacion, de modo
 * que siempre se pueda ver cual era el punto de partida.
 */
export async function setLaborRate(params: {
  code: string
  rate: number
}): Promise<{ success?: boolean; error?: string }> {
  if (!Number.isFinite(params.rate) || params.rate < 0) {
    return { error: 'The rate must be a positive number.' }
  }
  if (params.rate > 1_000_000) {
    return { error: 'That rate looks wrong (over $1,000,000). Please check it.' }
  }

  const caller = await resolveCallerOrg()
  if ('error' in caller) return { error: caller.error }
  if (caller.role !== 'owner' && caller.role !== 'admin' && !BYPASS_AUTH) {
    return { error: 'Only owners and admins can change labor rates.' }
  }

  const supabase = await createClient()

  // Fila base como plantilla: se copia su descripcion, modulo y alcance.
  const { data: base } = await supabase
    .from('labor_rates')
    .select('*')
    .eq('code', params.code)
    .is('organization_id', null)
    .maybeSingle()

  if (!base) return { error: `Unknown rate code: ${params.code}` }

  const { error } = await supabase
    .from('labor_rates')
    .upsert(
      {
        organization_id: caller.orgId,
        code: base.code,
        description: base.description,
        module: base.module,
        applies_to_scope: base.applies_to_scope,
        structure_type: base.structure_type,
        unit: base.unit,
        rate: params.rate,
        is_default: false,
        notes: 'Adjusted by the organization',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,code' }
    )

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

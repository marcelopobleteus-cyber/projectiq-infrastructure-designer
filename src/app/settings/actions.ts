'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
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
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

    if (membership) {
      orgId = membership.organization_id
      currentUserRole = (membership.role as any) || 'owner'
    }
  }

  if (!orgId) {
    const { data: firstProj } = await supabase.from('projects').select('organization_id').limit(1).single()
    orgId = firstProj?.organization_id || ''
  }

  if (!orgId) {
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = firstOrg?.id || ''
  }

  // Fetch Organization Name
  let organizationName = 'Company Workspace'
  if (orgId) {
    const { data: orgRow } = await supabase.from('organizations').select('name').eq('id', orgId).single()
    if (orgRow?.name) organizationName = orgRow.name
  }

  // 2. Fetch all members in organization
  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('id, profile_id, role, created_at, profiles(id, full_name)')
    .eq('organization_id', orgId)

  // Fetch emails from auth.users (if available) or profiles
  const members: TeamMemberItem[] = []
  for (const m of memberRows || []) {
    const profile = (m.profiles as any) || {}
    const fullName = profile.full_name || 'Team Member'
    
    members.push({
      id: m.id,
      profileId: m.profile_id,
      fullName,
      email: m.profile_id === user?.id ? user.email || 'user@company.com' : `${m.profile_id.substring(0, 8)}@company.com`,
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
    invitedBy: 'Admin',
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
): Promise<{ success?: boolean; error?: string }> {
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
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

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

  // Attempt to send Supabase auth invite email (server-side only)
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const { createClient: createAdminClient } = require('@supabase/supabase-js')
      const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      await adminClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase())
    }
  } catch (e) {
    console.warn('Supabase auth inviteUserByEmail notice:', e)
  }

  revalidatePath('/settings')
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
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

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
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role')
    .eq('id', memberId)
    .single()

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
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

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
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role')
    .eq('id', memberId)
    .single()

  if (!targetMember) return { error: 'Member not found.' }

  if (targetMember.organization_id !== orgId && !BYPASS_AUTH) {
    return { error: 'Access denied.' }
  }

  // Check last owner protection
  if (targetMember.role === 'owner') {
    if (callerRole !== 'owner') {
      return { error: 'Only an owner can remove an owner.' }
    }

    const { count: ownerCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('role', 'owner')

    if ((ownerCount ?? 0) <= 1) {
      return { error: 'Cannot remove the organization’s last remaining owner.' }
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

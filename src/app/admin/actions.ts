'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

export interface PlatformMetrics {
  totalOrganizations: number
  totalUsers: number
  totalProjects: number
  activeProjects: number
  totalDevices: number
  totalTasks: number
  activityCount24h: number
}

export interface PlatformOrganizationItem {
  id: string
  name: string
  createdAt: string
  membersCount: number
  projectsCount: number
  owners: { fullName: string; email: string }[]
}

export interface PlatformUserItem {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  isPlatformAdmin: boolean
  createdAt: string
  organizations: { orgId: string; orgName: string; role: string }[]
}

export interface PlatformActivityItem {
  id: string
  organizationId: string
  organizationName: string
  projectId: string | null
  projectName: string | null
  actorId: string | null
  actorName: string
  actorEmail: string
  action: string
  entityType: string
  entityId: string | null
  metadata: any
  createdAt: string
}

export interface PlatformSettingsState {
  maintenanceMode: { enabled: boolean; message: string }
  systemAnnouncement: { enabled: boolean; type: 'info' | 'warning' | 'critical'; message: string }
  allowSignups: { enabled: boolean }
  defaultProjectLimit: { limit: number }
}

export interface PlatformOverviewData {
  isCallerPlatformAdmin: boolean
  callerEmail?: string
  callerName?: string
  metrics: PlatformMetrics
  organizations: PlatformOrganizationItem[]
  users: PlatformUserItem[]
  recentActivity: PlatformActivityItem[]
  platformSettings: PlatformSettingsState
}

// Internal auth & role guard
async function verifyPlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    return { isAuthorized: false, user: null, supabase }
  }

  if (BYPASS_AUTH) {
    return { isAuthorized: true, user, supabase }
  }

  if (!user) {
    return { isAuthorized: false, user: null, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  const isAuthorized = Boolean(profile?.is_platform_admin)
  return { isAuthorized, user, supabase }
}

export async function getPlatformOverviewData(): Promise<PlatformOverviewData> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  const defaultSettings: PlatformSettingsState = {
    maintenanceMode: { enabled: false, message: 'System is currently undergoing scheduled maintenance.' },
    systemAnnouncement: { enabled: false, type: 'info', message: 'Welcome to ProjectIQ Infrastructure Designer.' },
    allowSignups: { enabled: true },
    defaultProjectLimit: { limit: 50 },
  }

  if (!isAuthorized) {
    return {
      isCallerPlatformAdmin: false,
      metrics: {
        totalOrganizations: 0,
        totalUsers: 0,
        totalProjects: 0,
        activeProjects: 0,
        totalDevices: 0,
        totalTasks: 0,
        activityCount24h: 0,
      },
      organizations: [],
      users: [],
      recentActivity: [],
      platformSettings: defaultSettings,
    }
  }

  // 1. Fetch All Organizations
  const { data: orgRows } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })

  const organizationsList = orgRows || []
  const orgMap = new Map<string, string>()
  organizationsList.forEach(o => orgMap.set(o.id, o.name))

  // 2. Fetch All Profiles
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_platform_admin, updated_at')
    .order('updated_at', { ascending: false })

  const profilesList = profileRows || []
  const profileMap = new Map<string, { fullName: string; email: string }>()
  profilesList.forEach(p => {
    profileMap.set(p.id, {
      fullName: p.full_name || 'User',
      email: p.email || `${p.id.substring(0, 8)}@company.com`,
    })
  })

  // 3. Fetch All Organization Memberships
  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role, created_at')

  const memberships = memberRows || []

  // Group memberships by organization and profile
  const orgMembersCountMap = new Map<string, number>()
  const orgOwnersMap = new Map<string, { fullName: string; email: string }[]>()
  const userOrgsMap = new Map<string, { orgId: string; orgName: string; role: string }[]>()

  memberships.forEach(m => {
    // Org stats
    const currentCount = orgMembersCountMap.get(m.organization_id) || 0
    orgMembersCountMap.set(m.organization_id, currentCount + 1)

    // Org owners
    if (m.role === 'owner' || m.role === 'admin') {
      const pInfo = profileMap.get(m.profile_id) || { fullName: 'Owner', email: '' }
      const currentOwners = orgOwnersMap.get(m.organization_id) || []
      currentOwners.push(pInfo)
      orgOwnersMap.set(m.organization_id, currentOwners)
    }

    // User affiliations
    const userOrgs = userOrgsMap.get(m.profile_id) || []
    userOrgs.push({
      orgId: m.organization_id,
      orgName: orgMap.get(m.organization_id) || 'Workspace',
      role: m.role,
    })
    userOrgsMap.set(m.profile_id, userOrgs)
  })

  // 4. Fetch All Projects
  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, organization_id, name, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  const projectsList = projectRows || []
  const projectMap = new Map<string, { name: string; orgId: string }>()
  const orgProjectsCountMap = new Map<string, number>()

  let activeProjectsCount = 0
  projectsList.forEach(p => {
    projectMap.set(p.id, { name: p.name, orgId: p.organization_id })
    const curCount = orgProjectsCountMap.get(p.organization_id) || 0
    orgProjectsCountMap.set(p.organization_id, curCount + 1)

    const statusNorm = (p.status || '').toLowerCase()
    if (statusNorm === 'active' || statusNorm === 'in_progress' || !p.status) {
      activeProjectsCount++
    }
  })

  // 5. Fetch Device and Task Counts
  const { count: deviceCount } = await supabase
    .from('network_devices')
    .select('id', { count: 'exact', head: true })

  const { count: taskCount } = await supabase
    .from('camera_tasks')
    .select('id', { count: 'exact', head: true })

  // 6. Fetch 24h Activity Events
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentEventsCount } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo)

  // 7. Fetch Recent Global Activity Log (Last 50 events)
  const { data: activityRows } = await supabase
    .from('activity_log')
    .select('id, organization_id, project_id, actor_id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const recentActivity: PlatformActivityItem[] = (activityRows || []).map(a => {
    const actor = profileMap.get(a.actor_id || '') || { fullName: 'System / Automated', email: 'system@projectiq.io' }
    const orgName = orgMap.get(a.organization_id) || 'Global Platform'
    const proj = a.project_id ? projectMap.get(a.project_id) : null

    return {
      id: a.id,
      organizationId: a.organization_id,
      organizationName: orgName,
      projectId: a.project_id,
      projectName: proj?.name || null,
      actorId: a.actor_id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      metadata: a.metadata,
      createdAt: a.created_at,
    }
  })

  // 8. Fetch Platform Settings
  const { data: settingsRows } = await supabase
    .from('platform_settings')
    .select('key, value')

  const settingsState: PlatformSettingsState = { ...defaultSettings }
  if (settingsRows) {
    settingsRows.forEach(row => {
      if (row.key === 'maintenance_mode' && row.value) {
        settingsState.maintenanceMode = row.value as any
      } else if (row.key === 'system_announcement' && row.value) {
        settingsState.systemAnnouncement = row.value as any
      } else if (row.key === 'allow_signups' && row.value) {
        settingsState.allowSignups = row.value as any
      } else if (row.key === 'default_project_limit' && row.value) {
        settingsState.defaultProjectLimit = row.value as any
      }
    })
  }

  // Format Organization Items
  const organizations: PlatformOrganizationItem[] = organizationsList.map(org => ({
    id: org.id,
    name: org.name,
    createdAt: org.created_at || new Date().toISOString(),
    membersCount: orgMembersCountMap.get(org.id) || 0,
    projectsCount: orgProjectsCountMap.get(org.id) || 0,
    owners: orgOwnersMap.get(org.id) || [],
  }))

  // Format User Items
  const users: PlatformUserItem[] = profilesList.map(p => ({
    id: p.id,
    fullName: p.full_name || 'User',
    email: p.email || `${p.id.substring(0, 8)}@company.com`,
    avatarUrl: p.avatar_url,
    isPlatformAdmin: Boolean(p.is_platform_admin),
    createdAt: p.updated_at || new Date().toISOString(),
    organizations: userOrgsMap.get(p.id) || [],
  }))

  const callerProfile = user ? profileMap.get(user.id) : null

  return {
    isCallerPlatformAdmin: true,
    callerEmail: user?.email || callerProfile?.email || 'admin@projectiq.io',
    callerName: callerProfile?.fullName || 'Platform Administrator',
    metrics: {
      totalOrganizations: organizationsList.length,
      totalUsers: profilesList.length,
      totalProjects: projectsList.length,
      activeProjects: activeProjectsCount,
      totalDevices: deviceCount || 0,
      totalTasks: taskCount || 0,
      activityCount24h: recentEventsCount || 0,
    },
    organizations,
    users,
    recentActivity,
    platformSettings: settingsState,
  }
}

export async function toggleUserPlatformAdmin(
  targetProfileId: string,
  newStatus: boolean
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  // Safety check: Don't allow last platform admin to demote themselves
  if (!newStatus && user && user.id === targetProfileId) {
    const { count: adminCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_platform_admin', true)

    if ((adminCount ?? 0) <= 1) {
      return { error: 'Cannot revoke the platform’s last remaining Platform Superadmin.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_platform_admin: newStatus })
    .eq('id', targetProfileId)

  if (error) {
    return { error: `Failed to update platform admin status: ${error.message}` }
  }

  // Log platform admin grant/revocation
  try {
    const { data: targetProfile } = await supabase.from('profiles').select('email, full_name').eq('id', targetProfileId).single()
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
    if (firstOrg?.id) {
      await supabase.from('activity_log').insert({
        organization_id: firstOrg.id,
        actor_id: user?.id || null,
        action: newStatus ? 'platform_admin.granted' : 'platform_admin.revoked',
        entity_type: 'profiles',
        entity_id: targetProfileId,
        metadata: { target_email: targetProfile?.email, target_name: targetProfile?.full_name },
      })
    }
  } catch (e) {
    console.warn('Activity logging notice:', e)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function savePlatformSetting(
  key: string,
  value: any
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  const validKeys = ['maintenance_mode', 'system_announcement', 'allow_signups', 'default_project_limit']
  if (!validKeys.includes(key)) {
    return { error: 'Invalid platform setting key.' }
  }

  const { error } = await supabase
    .from('platform_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    })

  if (error) {
    return { error: `Failed to save setting: ${error.message}` }
  }

  revalidatePath('/admin')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function createPlatformOrganization(
  name: string,
  ownerEmail?: string
): Promise<{ success?: boolean; error?: string; orgId?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  if (!name || !name.trim()) {
    return { error: 'Organization name is required.' }
  }

  const { data: newOrg, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()

  if (orgErr || !newOrg) {
    return { error: `Failed to create organization: ${orgErr?.message}` }
  }

  // Associate owner if provided
  if (ownerEmail && ownerEmail.trim()) {
    const cleanEmail = ownerEmail.trim().toLowerCase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .single()

    if (profile) {
      await supabase.from('organization_members').insert({
        organization_id: newOrg.id,
        profile_id: profile.id,
        role: 'owner',
      })
    } else {
      // Create pending invite for owner
      await supabase.from('organization_invites').insert({
        organization_id: newOrg.id,
        email: cleanEmail,
        role: 'owner',
        invited_by: user?.id || null,
        status: 'pending',
      })
    }
  }

  // Log activity
  try {
    await supabase.from('activity_log').insert({
      organization_id: newOrg.id,
      actor_id: user?.id || null,
      action: 'organization.created_by_platform_admin',
      entity_type: 'organizations',
      entity_id: newOrg.id,
      metadata: { name: newOrg.name, owner_email: ownerEmail },
    })
  } catch (e) {
    console.warn('Activity logging notice:', e)
  }

  revalidatePath('/admin')
  return { success: true, orgId: newOrg.id }
}

export async function deletePlatformOrganization(
  orgId: string
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single()

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    return { error: `Failed to delete organization: ${error.message}` }
  }

  revalidatePath('/admin')
  return { success: true }
}

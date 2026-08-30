'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createStripeCustomer, createStripeSubscriptionCheckout } from '@/utils/stripe'

export interface PlatformModuleItem {
  id: string
  name: string
  description: string | null
  defaultMonthlyPriceCents: number
  stripePriceId: string | null
  isActive: boolean
  createdAt: string
}

export interface PlatformOrganizationModuleItem {
  id: string
  organizationId: string
  moduleId: string
  moduleName: string
  status: 'active' | 'canceled'
  priceCents: number
  stripeSubscriptionItemId: string | null
  enabledAt: string
}

export interface PlatformOrganizationItem {
  id: string
  name: string
  createdAt: string
  status: 'active' | 'suspended'
  billingStatus: 'trialing' | 'active' | 'past_due' | 'canceled'
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  membersCount: number
  projectsCount: number
  owners: { id: string; fullName: string; email: string }[]
  modules: PlatformOrganizationModuleItem[]
  monthlyTotalCents: number
}

export interface PlatformUserItem {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  isPlatformAdmin: boolean
  createdAt: string
  organizations: { id: string; name: string; role: string }[]
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
  metadata: Record<string, any> | null
  createdAt: string
}

export interface PlatformSettingsState {
  maintenanceMode: {
    enabled: boolean
    message: string
  }
  systemAnnouncement: {
    enabled: boolean
    text: string
    severity: 'info' | 'warning' | 'critical'
  }
  allowSignups: boolean
  defaultProjectLimit: number
}

export interface BillingMetricsSummary {
  totalMrrCents: number
  activeSubscriptionsCount: number
  trialingCount: number
  pastDueCount: number
  canceledCount: number
  suspendedCount: number
}

export interface PlatformOverviewData {
  isCallerPlatformAdmin: boolean
  callerEmail: string
  callerName: string
  metrics: {
    totalOrganizations: number
    totalUsers: number
    totalProjects: number
    activeProjects: number
    totalDevices: number
    totalTasks: number
    activityCount24h: number
  }
  billingMetrics: BillingMetricsSummary
  modules: PlatformModuleItem[]
  pastDueOrganizations: PlatformOrganizationItem[]
  organizations: PlatformOrganizationItem[]
  users: PlatformUserItem[]
  recentActivity: PlatformActivityItem[]
  platformSettings: PlatformSettingsState
}

const defaultSettings: PlatformSettingsState = {
  maintenanceMode: {
    enabled: false,
    message: 'ProjectIQ is currently undergoing scheduled maintenance. Please check back shortly.',
  },
  systemAnnouncement: {
    enabled: false,
    text: '',
    severity: 'info',
  },
  allowSignups: true,
  defaultProjectLimit: 10,
}

export async function verifyPlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAuthorized: false, user: null, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  const isPlatformAdmin = Boolean(profile?.is_platform_admin)

  return {
    isAuthorized: isPlatformAdmin,
    user,
    supabase,
  }
}

export async function getPlatformOverviewData(): Promise<PlatformOverviewData | null> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return null
  }

  // 1. Fetch Modules Catalog
  const { data: rawModules } = await supabase
    .from('modules')
    .select('*')
    .order('id', { ascending: true })

  const modulesList: PlatformModuleItem[] = (rawModules || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    defaultMonthlyPriceCents: m.default_monthly_price_cents || 0,
    stripePriceId: m.stripe_price_id,
    isActive: Boolean(m.is_active),
    createdAt: m.created_at,
  }))

  const moduleNameMap = new Map<string, string>()
  modulesList.forEach(m => moduleNameMap.set(m.id, m.name))

  // 2. Fetch Organizations & Organization Modules
  const { data: rawOrgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  const organizationsList = rawOrgs || []

  const { data: rawOrgModules } = await supabase
    .from('organization_modules')
    .select('*')
    .order('enabled_at', { ascending: true })

  const orgModulesMap = new Map<string, PlatformOrganizationModuleItem[]>()
  ;(rawOrgModules || []).forEach((om: any) => {
    const list = orgModulesMap.get(om.organization_id) || []
    list.push({
      id: om.id,
      organizationId: om.organization_id,
      moduleId: om.module_id,
      moduleName: moduleNameMap.get(om.module_id) || om.module_id.toUpperCase(),
      status: om.status || 'active',
      priceCents: om.price_cents || 0,
      stripeSubscriptionItemId: om.stripe_subscription_item_id,
      enabledAt: om.enabled_at,
    })
    orgModulesMap.set(om.organization_id, list)
  })

  // 3. Fetch Organization Members & Profiles
  const { data: rawMembers } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id, role')

  const membersList = rawMembers || []

  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const profilesList = rawProfiles || []

  // 4. Fetch Projects
  const { data: rawProjects } = await supabase
    .from('projects')
    .select('id, organization_id, name, status, created_at')

  const projectsList = rawProjects || []

  // 5. Aggregate metrics
  const orgMembersCountMap = new Map<string, number>()
  const orgOwnersMap = new Map<string, { id: string; fullName: string; email: string }[]>()
  const userOrgsMap = new Map<string, { id: string; name: string; role: string }[]>()

  const profileMap = new Map<string, { fullName: string; email: string }>()
  profilesList.forEach(p => {
    profileMap.set(p.id, {
      fullName: p.full_name || 'User',
      email: p.email || `${p.id.substring(0, 8)}@company.com`,
    })
  })

  const orgMap = new Map<string, string>()
  organizationsList.forEach(org => {
    orgMap.set(org.id, org.name)
  })

  membersList.forEach(m => {
    const current = orgMembersCountMap.get(m.organization_id) || 0
    orgMembersCountMap.set(m.organization_id, current + 1)

    const prof = profileMap.get(m.profile_id)
    if (m.role === 'owner' && prof) {
      const owners = orgOwnersMap.get(m.organization_id) || []
      owners.push({ id: m.profile_id, fullName: prof.fullName, email: prof.email })
      orgOwnersMap.set(m.organization_id, owners)
    }

    const orgName = orgMap.get(m.organization_id) || 'Workspace'
    const userOrgs = userOrgsMap.get(m.profile_id) || []
    userOrgs.push({ id: m.organization_id, name: orgName, role: m.role })
    userOrgsMap.set(m.profile_id, userOrgs)
  })

  const orgProjectsCountMap = new Map<string, number>()
  let activeProjectsCount = 0

  projectsList.forEach(p => {
    if (p.organization_id) {
      const current = orgProjectsCountMap.get(p.organization_id) || 0
      orgProjectsCountMap.set(p.organization_id, current + 1)
    }
    if (p.status !== 'completed' && p.status !== 'closed') {
      activeProjectsCount++
    }
  })

  // 6. Counts for devices and tasks
  const { count: deviceCount } = await supabase
    .from('network_devices')
    .select('id', { count: 'exact', head: true })

  const { count: taskCount } = await supabase
    .from('camera_tasks')
    .select('id', { count: 'exact', head: true })

  // 7. Fetch Activity Stream
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentEventsCount } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo)

  const { data: rawActivity } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const projectMap = new Map<string, { name: string }>()
  projectsList.forEach(p => projectMap.set(p.id, { name: p.name }))

  const recentActivity: PlatformActivityItem[] = (rawActivity || []).map(a => {
    const actor = a.actor_id ? profileMap.get(a.actor_id) || { fullName: 'System', email: 'system@projectiq.io' } : { fullName: 'System', email: 'system@projectiq.io' }
    const orgName = orgMap.get(a.organization_id) || 'Global'
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

  // Format Organization Items with Billing Details
  let totalPlatformMrrCents = 0
  let activeSubsCount = 0
  let trialingCount = 0
  let pastDueCount = 0
  let canceledCount = 0
  let suspendedCount = 0

  const organizations: PlatformOrganizationItem[] = organizationsList.map((org: any) => {
    const purchasedModules = orgModulesMap.get(org.id) || []
    const activePurchased = purchasedModules.filter(m => m.status === 'active')
    const monthlyTotalCents = activePurchased.reduce((acc, m) => acc + (m.priceCents || 0), 0)

    const billingStatus: 'trialing' | 'active' | 'past_due' | 'canceled' = org.billing_status || 'trialing'
    const status: 'active' | 'suspended' = org.status || 'active'

    if (status === 'suspended') {
      suspendedCount++
    }

    if (billingStatus === 'active') {
      activeSubsCount++
      if (status === 'active') {
        totalPlatformMrrCents += monthlyTotalCents
      }
    } else if (billingStatus === 'trialing') {
      trialingCount++
    } else if (billingStatus === 'past_due') {
      pastDueCount++
    } else if (billingStatus === 'canceled') {
      canceledCount++
    }

    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at || new Date().toISOString(),
      status,
      billingStatus,
      stripeCustomerId: org.stripe_customer_id,
      stripeSubscriptionId: org.stripe_subscription_id,
      currentPeriodEnd: org.current_period_end,
      membersCount: orgMembersCountMap.get(org.id) || 0,
      projectsCount: orgProjectsCountMap.get(org.id) || 0,
      owners: orgOwnersMap.get(org.id) || [],
      modules: purchasedModules,
      monthlyTotalCents,
    }
  })

  const pastDueOrganizations = organizations.filter(o => o.billingStatus === 'past_due' || o.status === 'suspended')

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
    billingMetrics: {
      totalMrrCents: totalPlatformMrrCents,
      activeSubscriptionsCount: activeSubsCount,
      trialingCount,
      pastDueCount,
      canceledCount,
      suspendedCount,
    },
    modules: modulesList,
    pastDueOrganizations,
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
      return { error: 'Cannot revoke the platform\'s last remaining Platform Superadmin.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_platform_admin: newStatus })
    .eq('id', targetProfileId)

  if (error) {
    return { error: `Failed to update platform admin status: ${error.message}` }
  }

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

export interface SelectedModuleInput {
  moduleId: string
  priceCents: number
}

export async function createPlatformOrganization(
  name: string,
  ownerEmail?: string,
  selectedModules?: SelectedModuleInput[]
): Promise<{
  success?: boolean
  error?: string
  orgId?: string
  checkoutUrl?: string
  stripeCustomerId?: string
}> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  if (!name || !name.trim()) {
    return { error: 'Organization name is required.' }
  }

  // 1. Create Organization
  const { data: newOrg, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: name.trim(),
      status: 'active',
      billing_status: 'trialing',
    })
    .select('id, name')
    .single()

  if (orgErr || !newOrg) {
    return { error: `Failed to create organization: ${orgErr?.message}` }
  }

  // 2. Associate owner if provided
  let cleanOwnerEmail = ownerEmail?.trim().toLowerCase() || ''
  if (cleanOwnerEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanOwnerEmail)
      .single()

    if (profile) {
      await supabase.from('organization_members').insert({
        organization_id: newOrg.id,
        profile_id: profile.id,
        role: 'owner',
      })
    } else {
      await supabase.from('organization_invites').insert({
        organization_id: newOrg.id,
        email: cleanOwnerEmail,
        role: 'owner',
        invited_by: user?.id || null,
        status: 'pending',
      })
    }
  }

  // 3. Attach Purchased Modules
  const modulesToInsert = selectedModules || []
  if (modulesToInsert.length > 0) {
    const moduleRows = modulesToInsert.map(m => ({
      organization_id: newOrg.id,
      module_id: m.moduleId,
      price_cents: Math.max(0, m.priceCents || 0),
      status: 'active' as const,
    }))

    const { error: modErr } = await supabase
      .from('organization_modules')
      .insert(moduleRows)

    if (modErr) {
      console.warn('[Billing] Error inserting organization_modules:', modErr.message)
    }
  }

  // 4. Stripe Customer & Checkout Session Creation (if Stripe is configured and prices are mapped)
  let checkoutUrl: string | undefined
  let stripeCustomerId: string | undefined

  try {
    const { data: catalogModules } = await supabase
      .from('modules')
      .select('id, name, stripe_price_id')
      .in('id', modulesToInsert.map(m => m.moduleId))

    const stripeLineItems = (catalogModules || [])
      .filter((m: any) => Boolean(m.stripe_price_id))
      .map((m: any) => ({
        priceId: m.stripe_price_id!,
        quantity: 1,
      }))

    if (cleanOwnerEmail) {
      const custRes = await createStripeCustomer({
        email: cleanOwnerEmail,
        name: newOrg.name,
        organizationId: newOrg.id,
      })

      if (custRes.customerId) {
        stripeCustomerId = custRes.customerId
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', newOrg.id)
      }
    }

    if (stripeLineItems.length > 0) {
      const checkoutRes = await createStripeSubscriptionCheckout({
        customerId: stripeCustomerId,
        customerEmail: !stripeCustomerId ? cleanOwnerEmail : undefined,
        organizationId: newOrg.id,
        organizationName: newOrg.name,
        lineItems: stripeLineItems,
      })

      if (checkoutRes.checkoutUrl) {
        checkoutUrl = checkoutRes.checkoutUrl
      }
    }
  } catch (stripeErr: any) {
    console.warn('[Stripe Onboarding Notice]', stripeErr.message)
  }

  // 5. Log activity
  try {
    await supabase.from('activity_log').insert({
      organization_id: newOrg.id,
      actor_id: user?.id || null,
      action: 'organization.created_by_platform_admin',
      entity_type: 'organizations',
      entity_id: newOrg.id,
      metadata: {
        name: newOrg.name,
        owner_email: cleanOwnerEmail,
        modules_count: modulesToInsert.length,
        has_stripe_checkout: Boolean(checkoutUrl),
      },
    })
  } catch (e) {
    console.warn('Activity logging notice:', e)
  }

  revalidatePath('/admin')
  return {
    success: true,
    orgId: newOrg.id,
    checkoutUrl,
    stripeCustomerId,
  }
}

export async function updatePlatformModule(
  moduleId: string,
  name: string,
  description: string | null,
  defaultMonthlyPriceCents: number,
  stripePriceId: string | null,
  isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  const { error } = await supabase
    .from('modules')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      default_monthly_price_cents: Math.max(0, defaultMonthlyPriceCents),
      stripe_price_id: stripePriceId?.trim() || null,
      is_active: isActive,
    })
    .eq('id', moduleId)

  if (error) {
    return { error: `Failed to update module: ${error.message}` }
  }

  try {
    const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
    if (firstOrg?.id) {
      await supabase.from('activity_log').insert({
        organization_id: firstOrg.id,
        actor_id: user?.id || null,
        action: 'module.updated_by_platform_admin',
        entity_type: 'modules',
        entity_id: moduleId,
        metadata: { name, default_monthly_price_cents: defaultMonthlyPriceCents, stripe_price_id: stripePriceId },
      })
    }
  } catch (e) {
    console.warn('Activity logging notice:', e)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function toggleOrganizationSuspension(
  orgId: string,
  newStatus: 'active' | 'suspended'
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ status: newStatus })
    .eq('id', orgId)

  if (error) {
    return { error: `Failed to update organization status: ${error.message}` }
  }

  try {
    await supabase.from('activity_log').insert({
      organization_id: orgId,
      actor_id: user?.id || null,
      action: newStatus === 'suspended' ? 'organization.suspended' : 'organization.reactivated',
      entity_type: 'organizations',
      entity_id: orgId,
      metadata: { new_status: newStatus },
    })
  } catch (e) {
    console.warn('Activity logging notice:', e)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function deletePlatformOrganization(
  orgId: string
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

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

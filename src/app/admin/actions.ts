'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendInviteEmail } from '@/utils/supabase/admin'
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
  logoUrl: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
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

  const orgNameMap = new Map<string, string>()
  organizationsList.forEach(o => orgNameMap.set(o.id, o.name))

  membersList.forEach(m => {
    orgMembersCountMap.set(m.organization_id, (orgMembersCountMap.get(m.organization_id) || 0) + 1)

    const profile = profileMap.get(m.profile_id)
    if (m.role === 'owner' && profile) {
      const owners = orgOwnersMap.get(m.organization_id) || []
      owners.push({
        id: m.profile_id,
        fullName: profile.fullName,
        email: profile.email,
      })
      orgOwnersMap.set(m.organization_id, owners)
    }

    const orgName = orgNameMap.get(m.organization_id) || 'Unknown Organization'
    const uOrgs = userOrgsMap.get(m.profile_id) || []
    uOrgs.push({
      id: m.organization_id,
      name: orgName,
      role: m.role,
    })
    userOrgsMap.set(m.profile_id, uOrgs)
  })

  const orgProjectsCountMap = new Map<string, number>()
  projectsList.forEach(p => {
    orgProjectsCountMap.set(p.organization_id, (orgProjectsCountMap.get(p.organization_id) || 0) + 1)
  })

  // 6. Fetch Technical Metrics
  const { count: totalDevices } = await supabase
    .from('network_devices')
    .select('id', { count: 'exact', head: true })

  const { count: totalTasks } = await supabase
    .from('field_tasks')
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

  const projectMap = new Map<string, string>()
  projectsList.forEach(p => projectMap.set(p.id, p.name))

  const activityList: PlatformActivityItem[] = (rawActivity || []).map((a: any) => {
    const prof = a.actor_id ? profileMap.get(a.actor_id) : null
    return {
      id: a.id,
      organizationId: a.organization_id,
      organizationName: orgNameMap.get(a.organization_id) || 'System',
      projectId: a.project_id || null,
      projectName: a.project_id ? (projectMap.get(a.project_id) || 'General Project') : null,
      actorId: a.actor_id || null,
      actorName: prof ? prof.fullName : 'System / Service',
      actorEmail: prof ? prof.email : 'system@projectiq.com',
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id || null,
      metadata: a.metadata,
      createdAt: a.created_at,
    }
  })

  // 8. Fetch Platform Settings
  const { data: rawSettings } = await supabase
    .from('platform_settings')
    .select('*')

  let currentSettings: PlatformSettingsState = { ...defaultSettings }
  if (rawSettings && rawSettings.length > 0) {
    rawSettings.forEach((setting: any) => {
      if (setting.key === 'maintenance_mode') {
        currentSettings.maintenanceMode = {
          enabled: Boolean(setting.value?.enabled),
          message: setting.value?.message || defaultSettings.maintenanceMode.message,
        }
      } else if (setting.key === 'system_announcement') {
        currentSettings.systemAnnouncement = {
          enabled: Boolean(setting.value?.enabled),
          text: setting.value?.text || '',
          severity: setting.value?.severity || 'info',
        }
      } else if (setting.key === 'allow_signups') {
        currentSettings.allowSignups = setting.value?.enabled !== undefined ? Boolean(setting.value.enabled) : true
      } else if (setting.key === 'default_project_limit') {
        currentSettings.defaultProjectLimit = typeof setting.value?.limit === 'number' ? setting.value.limit : 10
      }
    })
  }

  // Build Organization Items with Billing Details and Contact Details
  const orgItems: PlatformOrganizationItem[] = organizationsList.map((org: any) => {
    const orgMods = orgModulesMap.get(org.id) || []
    const monthlyTotalCents = orgMods
      .filter(m => m.status === 'active')
      .reduce((acc, curr) => acc + (curr.priceCents || 0), 0)

    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      status: (org.status as any) || 'active',
      billingStatus: (org.billing_status as any) || 'trialing',
      stripeCustomerId: org.stripe_customer_id || null,
      stripeSubscriptionId: org.stripe_subscription_id || null,
      currentPeriodEnd: org.current_period_end || null,
      logoUrl: org.logo_url || null,
      contactName: org.contact_name || null,
      contactEmail: org.contact_email || null,
      contactPhone: org.contact_phone || null,
      address: org.address || null,
      membersCount: orgMembersCountMap.get(org.id) || 0,
      projectsCount: orgProjectsCountMap.get(org.id) || 0,
      owners: orgOwnersMap.get(org.id) || [],
      modules: orgMods,
      monthlyTotalCents,
    }
  })

  // Calculate MRR and Billing Breakdown
  const totalMrrCents = orgItems
    .filter(o => o.billingStatus === 'active' && o.status === 'active')
    .reduce((acc, curr) => acc + curr.monthlyTotalCents, 0)

  const activeSubscriptionsCount = orgItems.filter(o => o.billingStatus === 'active').length
  const trialingCount = orgItems.filter(o => o.billingStatus === 'trialing').length
  const pastDueCount = orgItems.filter(o => o.billingStatus === 'past_due').length
  const canceledCount = orgItems.filter(o => o.billingStatus === 'canceled').length
  const suspendedCount = orgItems.filter(o => o.status === 'suspended').length

  const pastDueOrganizations = orgItems.filter(o => o.billingStatus === 'past_due' || o.status === 'suspended')

  // Build User Items
  const userItems: PlatformUserItem[] = profilesList.map(p => ({
    id: p.id,
    fullName: p.full_name || 'Anonymous User',
    email: p.email || `${p.id.substring(0, 8)}@company.com`,
    avatarUrl: p.avatar_url || null,
    isPlatformAdmin: Boolean(p.is_platform_admin),
    createdAt: p.created_at,
    organizations: userOrgsMap.get(p.id) || [],
  }))

  const callerProfile = user ? profileMap.get(user.id) : null

  return {
    isCallerPlatformAdmin: true,
    callerEmail: callerProfile?.email || user?.email || '',
    callerName: callerProfile?.fullName || 'Superadmin',
    metrics: {
      totalOrganizations: organizationsList.length,
      totalUsers: profilesList.length,
      totalProjects: projectsList.length,
      activeProjects: projectsList.filter(p => p.status !== 'archived').length,
      totalDevices: totalDevices || 0,
      totalTasks: totalTasks || 0,
      activityCount24h: recentEventsCount || 0,
    },
    billingMetrics: {
      totalMrrCents,
      activeSubscriptionsCount,
      trialingCount,
      pastDueCount,
      canceledCount,
      suspendedCount,
    },
    modules: modulesList,
    pastDueOrganizations,
    organizations: orgItems,
    users: userItems,
    recentActivity: activityList,
    platformSettings: currentSettings,
  }
}

export async function updatePlatformOrganization(
  orgId: string,
  updates: {
    name?: string
    logoUrl?: string | null
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    address?: string
  }
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, supabase } = await verifyPlatformAdmin()
  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }
  if (updates.name !== undefined && !updates.name.trim()) {
    return { error: 'Organization name cannot be empty.' }
  }

  const patch: Record<string, any> = {}
  if (updates.name !== undefined) patch.name = updates.name.trim()
  if (updates.logoUrl !== undefined) patch.logo_url = updates.logoUrl
  if (updates.contactName !== undefined) patch.contact_name = updates.contactName.trim()
  if (updates.contactEmail !== undefined) patch.contact_email = updates.contactEmail.trim()
  if (updates.contactPhone !== undefined) patch.contact_phone = updates.contactPhone.trim()
  if (updates.address !== undefined) patch.address = updates.address.trim()

  const { error } = await supabase.from('organizations').update(patch).eq('id', orgId)
  if (error) {
    return { error: `Failed to update organization: ${error.message}` }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function updatePlatformModule(
  moduleId: string,
  name: string,
  description: string,
  defaultMonthlyPriceCents: number,
  stripePriceId: string | null,
  isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()
  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  try {
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
      return { error: error.message }
    }

    try {
      const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
      if (firstOrg?.id) {
        await supabase.from('activity_log').insert({
          organization_id: firstOrg.id,
          actor_id: user?.id || null,
          action: 'module.updated_by_platform_admin',
          entity_type: 'modules',
          entity_id: null,
          metadata: {
            module_id: moduleId,
            name,
            default_monthly_price_cents: defaultMonthlyPriceCents,
            stripe_price_id: stripePriceId,
            is_active: isActive,
          },
        })
      }
    } catch {
      // Non-blocking activity log
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update module' }
  }
}

export async function toggleOrganizationSuspension(
  orgId: string,
  newStatus: 'active' | 'suspended'
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()
  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  try {
    const { error } = await supabase
      .from('organizations')
      .update({ status: newStatus })
      .eq('id', orgId)

    if (error) {
      return { error: error.message }
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
    } catch {
      // Non-blocking
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle organization suspension' }
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

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_platform_admin: newStatus })
      .eq('id', targetProfileId)

    if (error) {
      return { error: error.message }
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
          metadata: {
            target_email: targetProfile?.email || null,
            target_name: targetProfile?.full_name || null,
            is_platform_admin: newStatus,
          },
        })
      }
    } catch {
      // Non-blocking
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update platform administrator status' }
  }
}

export async function savePlatformSetting(
  key: string,
  value: any
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  try {
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        },
        { onConflict: 'key' }
      )

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update platform setting' }
  }
}

export async function createPlatformOrganization(
  name: string,
  ownerEmail?: string,
  selectedModules?: { moduleId: string; priceCents: number }[]
): Promise<{ success?: boolean; error?: string; organizationId?: string; checkoutUrl?: string | null }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  if (!name || !name.trim()) {
    return { error: 'Organization name is required.' }
  }

  try {
    // 1. Create Organization in Supabase
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        billing_status: 'trialing',
        status: 'active',
      })
      .select('id, name')
      .single()

    if (orgError || !newOrg) {
      return { error: orgError?.message || 'Failed to create organization' }
    }

    // 2. Insert selected organization_modules
    if (selectedModules && selectedModules.length > 0) {
      const moduleInserts = selectedModules.map(m => ({
        organization_id: newOrg.id,
        module_id: m.moduleId,
        price_cents: m.priceCents,
        status: 'active' as const,
      }))

      const { error: modInsertError } = await supabase
        .from('organization_modules')
        .insert(moduleInserts)

      if (modInsertError) {
        console.error('Error inserting organization modules:', modInsertError)
      }
    }

    // 3. Create Stripe Customer and Checkout Session if Stripe is configured
    let checkoutUrl: string | null = null
    try {
      const stripeCustomer = await createStripeCustomer(
        newOrg.id,
        newOrg.name,
        ownerEmail?.trim() || undefined
      )

      if (stripeCustomer) {
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: stripeCustomer.id })
          .eq('id', newOrg.id)

        // Fetch stripe_price_ids for selected modules
        if (selectedModules && selectedModules.length > 0) {
          const modIds = selectedModules.map(m => m.moduleId)
          const { data: modsWithPrice } = await supabase
            .from('modules')
            .select('id, stripe_price_id')
            .in('id', modIds)

          const modulePriceMap = new Map<string, string | null>()
          modsWithPrice?.forEach(m => modulePriceMap.set(m.id, m.stripe_price_id))

          const stripeItems = selectedModules.map(m => ({
            moduleId: m.moduleId,
            priceCents: m.priceCents,
            stripePriceId: modulePriceMap.get(m.moduleId) || null,
          }))

          checkoutUrl = await createStripeSubscriptionCheckout(
            newOrg.id,
            stripeCustomer.id,
            stripeItems,
            ownerEmail?.trim() || undefined
          )
        }
      }
    } catch (stripeErr) {
      console.warn('Stripe integration notice during org creation:', stripeErr)
    }

    // 4. If owner email is specified, create pending invitation
    if (ownerEmail && ownerEmail.trim()) {
      const cleanOwnerEmail = ownerEmail.trim().toLowerCase()
      await supabase.from('organization_invites').insert({
        organization_id: newOrg.id,
        email: cleanOwnerEmail,
        role: 'owner',
        invited_by: user?.id,
      })

      try {
        await sendInviteEmail(cleanOwnerEmail)
      } catch (inviteErr) {
        console.warn('Notice: Failed to send Supabase invite email to owner:', inviteErr)
      }
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
          organization_name: newOrg.name,
          owner_email: ownerEmail || null,
          modules_count: selectedModules?.length || 0,
        },
      })
    } catch {
      // Non-blocking
    }

    revalidatePath('/admin')
    return { success: true, organizationId: newOrg.id, checkoutUrl }
  } catch (err: any) {
    return { error: err.message || 'Failed to create organization' }
  }
}

export async function deletePlatformOrganization(
  orgId: string
): Promise<{ success?: boolean; error?: string }> {
  const { isAuthorized, user, supabase } = await verifyPlatformAdmin()

  if (!isAuthorized) {
    return { error: 'Unauthorized. Platform Administrator privileges required.' }
  }

  try {
    const { data: orgToDelete } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      return { error: error.message }
    }

    try {
      const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
      if (firstOrg?.id) {
        await supabase.from('activity_log').insert({
          organization_id: firstOrg.id,
          actor_id: user?.id || null,
          action: 'organization.deleted_by_platform_admin',
          entity_type: 'organizations',
          entity_id: orgId,
          metadata: { organization_name: orgToDelete?.name || orgId },
        })
      }
    } catch {
      // Non-blocking
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete organization' }
  }
}

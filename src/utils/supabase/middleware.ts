import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'
import { BYPASS_AUTH } from '@/config/auth'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not remove or alter this getUser call.
  // It is required for verifying user session integrity.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (BYPASS_AUTH) {
    if (path === '/' || path === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/projects'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Fetch platform-admin status once, reused by every check below.
  let isPlatformAdmin = false
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()
    isPlatformAdmin = Boolean(prof?.is_platform_admin)
  }

  // The employee mobile app has its own entry point (/mobile, which decides
  // where to send the visitor) and its own login page (/mobile/login) — both
  // must stay reachable while signed out. Every OTHER /mobile/* route (the
  // actual app: dashboard, projects, time, etc.) is still gated, but bounces
  // to /mobile/login instead of the desktop/admin /login.
  const isMobilePublicRoute =
    path === '/mobile' || path === '/mobile/login' || path.startsWith('/mobile/login/')
  const isMobileRoute = path === '/mobile' || path.startsWith('/mobile/')
  const isProtectedMobileRoute = isMobileRoute && !isMobilePublicRoute

  const desktopTenantPrefixes = ['/projects', '/settings', '/dashboard', '/equipment-catalog', '/reports']
  const isDesktopTenantRoute = desktopTenantPrefixes.some((prefix) => path.startsWith(prefix))
  // Used further below for the admin/tenant separation and suspension checks,
  // which should apply across the whole mobile app too (not just its gated part).
  const isTenantAppRoute = isDesktopTenantRoute || isMobileRoute
  const isAdminRoute = path.startsWith('/admin')

  if (isProtectedMobileRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/mobile/login'
    return NextResponse.redirect(url)
  }

  if ((isDesktopTenantRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if ((path === '/login' || path === '/') && user) {
    const url = request.nextUrl.clone()
    url.pathname = isPlatformAdmin ? '/admin' : '/projects'
    return NextResponse.redirect(url)
  }

  // Already signed in and landed on the employee login by mistake (e.g. a
  // bookmarked link) -> send them straight into the mobile app.
  if (isMobilePublicRoute && path !== '/mobile' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/mobile/dashboard'
    return NextResponse.redirect(url)
  }

  // Full separation: a platform admin never sees the tenant app; a regular user never sees /admin.
  if (user && isPlatformAdmin && isTenantAppRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }
  if (user && !isPlatformAdmin && isAdminRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/projects'
    return NextResponse.redirect(url)
  }

  // Workspace suspension / cancellation check — only runs for non-admins on tenant app routes
  if (isTenantAppRoute && user && !isPlatformAdmin && path !== '/inactive-workspace') {
    try {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id, organizations!inner(status, billing_status)')
        .eq('profile_id', user.id)
        .limit(1)
        .single()

      const org = (member as any)?.organizations
      if (org && (org.status === 'suspended' || org.billing_status === 'canceled')) {
        const url = request.nextUrl.clone()
        url.pathname = '/inactive-workspace'
        return NextResponse.redirect(url)
      }
    } catch (e) {
      // Continue if query fails
    }
  }

  return supabaseResponse
}

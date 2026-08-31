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
    if (path === '/' || path === '/login' || path === '/register') {
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

  const tenantAppPrefixes = ['/projects', '/settings', '/dashboard', '/equipment-catalog', '/reports', '/mobile']
  const isTenantAppRoute = tenantAppPrefixes.some((prefix) => path.startsWith(prefix))
  const isAdminRoute = path.startsWith('/admin')
  const isProtectedRoute = isTenantAppRoute || isAdminRoute

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if ((path === '/login' || path === '/register' || path === '/') && user) {
    const url = request.nextUrl.clone()
    url.pathname = isPlatformAdmin ? '/admin' : '/projects'
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

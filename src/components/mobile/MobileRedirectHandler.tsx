'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function MobileRedirectHandler() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobileWidth = window.innerWidth < 768
    let preferDesktop = false
    try {
      preferDesktop = localStorage.getItem('projectiq_prefer_desktop') === 'true'
    } catch (e) {}

    const isMobileRoute = pathname.startsWith('/mobile')

    // Scenario A: On desktop route with narrow mobile screen and no desktop preference -> Redirect to mobile route
    if (!isMobileRoute && isMobileWidth && !preferDesktop) {
      if (pathname === '/projects' || pathname === '/') {
        router.replace('/mobile/projects')
      } else if (pathname.startsWith('/projects/')) {
        const parts = pathname.split('/')
        const projectId = parts[2]
        const subRoute = parts[3] || 'overview'
        router.replace(`/mobile/projects/${projectId}/${subRoute}`)
      } else if (pathname === '/dashboard') {
        router.replace('/mobile/dashboard')
      } else if (pathname === '/reports') {
        router.replace('/mobile/reports')
      } else if (pathname === '/settings') {
        router.replace('/mobile/settings')
      } else if (pathname === '/time-tracking') {
        router.replace('/mobile/time')
      }
    }

    // Scenario B: On mobile route but user explicitly opted for desktop version -> Redirect to desktop route
    if (isMobileRoute && preferDesktop) {
      if (pathname.startsWith('/mobile/projects/')) {
        const parts = pathname.split('/')
        const projectId = parts[3]
        const subRoute = parts[4] || 'overview'
        router.replace(`/projects/${projectId}/${subRoute}`)
      } else if (pathname === '/mobile/projects') {
        router.replace('/projects')
      } else if (pathname === '/mobile/dashboard') {
        router.replace('/dashboard')
      } else if (pathname === '/mobile/reports') {
        router.replace('/reports')
      } else if (pathname === '/mobile/settings') {
        router.replace('/settings')
      } else if (pathname === '/mobile/time') {
        router.replace('/time-tracking')
      }
    }
  }, [pathname, router])

  return null
}

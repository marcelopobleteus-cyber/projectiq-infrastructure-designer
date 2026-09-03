'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function FieldRedirectHandler() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobileWidth = window.innerWidth < 768
    let preferDesktop = false
    try {
      preferDesktop = localStorage.getItem('projectiq_prefer_desktop') === 'true'
    } catch (e) {}

    const isMobileRoute = pathname.startsWith('/field')

    // Scenario A: On desktop route with narrow mobile screen and no desktop preference -> Redirect to mobile route
    if (!isMobileRoute && isMobileWidth && !preferDesktop) {
      if (pathname === '/projects' || pathname === '/') {
        router.replace('/field/projects')
      } else if (pathname.startsWith('/projects/')) {
        const parts = pathname.split('/')
        const projectId = parts[2]
        const subRoute = parts[3] || 'overview'
        router.replace(`/field/projects/${projectId}/${subRoute}`)
      } else if (pathname === '/dashboard') {
        router.replace('/field/dashboard')
      } else if (pathname === '/reports') {
        router.replace('/field/reports')
      } else if (pathname === '/settings') {
        router.replace('/field/settings')
      } else if (pathname === '/time-tracking') {
        router.replace('/field/time')
      }
    }

    // Scenario B: On mobile route but user explicitly opted for desktop version -> Redirect to desktop route
    if (isMobileRoute && preferDesktop) {
      if (pathname.startsWith('/field/projects/')) {
        const parts = pathname.split('/')
        const projectId = parts[3]
        const subRoute = parts[4] || 'overview'
        router.replace(`/projects/${projectId}/${subRoute}`)
      } else if (pathname === '/field/projects') {
        router.replace('/projects')
      } else if (pathname === '/field/dashboard') {
        router.replace('/dashboard')
      } else if (pathname === '/field/reports') {
        router.replace('/reports')
      } else if (pathname === '/field/settings') {
        router.replace('/settings')
      } else if (pathname === '/field/time') {
        router.replace('/time-tracking')
      }
    }
  }, [pathname, router])

  return null
}

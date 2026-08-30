'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import MainSidebar from '@/components/layout/MainSidebar'
import ProjectsContentArea from '@/components/layout/ProjectsContentArea'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/auth/actions'
import { BYPASS_AUTH } from '@/config/auth'

interface GlobalLayoutWrapperProps {
  children: React.ReactNode
}

export default function GlobalLayoutWrapper({ children }: GlobalLayoutWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user && !BYPASS_AUTH) {
          router.replace('/login')
          return
        }
        setUser(user)

        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setProfile(profileData || null)
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleSignOut = () => {
    startTransition(async () => {
      await logout()
      router.replace('/login')
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-[var(--surface-2)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-xs text-[var(--text-tertiary)] font-mono tracking-wider">LOADING NEXTQ...</p>
        </div>
      </div>
    )
  }

  const isPlatformAdmin = Boolean(profile?.is_platform_admin) || BYPASS_AUTH

  return (
    <AppShell>
      {/* Narrow Primary Left Sidebar */}
      <MainSidebar
        userEmail={user?.email}
        userName={profile?.full_name || 'User'}
        isPlatformAdmin={isPlatformAdmin}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <ProjectsContentArea>
        {children}
      </ProjectsContentArea>
    </AppShell>
  )
}

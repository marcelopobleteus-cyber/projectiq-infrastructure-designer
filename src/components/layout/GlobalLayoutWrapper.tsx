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
  const [orgBillingStatus, setOrgBillingStatus] = useState<string | null>(null)
  const [isPastDueDismissed, setIsPastDueDismissed] = useState(false)
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

          // Defense-in-depth: Platform admin should never be inside the tenant app
          if (profileData?.is_platform_admin && !BYPASS_AUTH) {
            router.replace('/admin')
            return
          }

          // Query organization billing status
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id, organizations!inner(status, billing_status)')
            .eq('profile_id', user.id)
            .limit(1)
            .single()

          const org = (member as any)?.organizations
          if (org) {
            setOrgBillingStatus(org.billing_status)
            if (!profileData?.is_platform_admin && (org.status === 'suspended' || org.billing_status === 'canceled')) {
              if (pathname !== '/inactive-workspace' && !pathname.startsWith('/admin')) {
                router.replace('/inactive-workspace')
              }
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, supabase, pathname])

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
        {orgBillingStatus === 'past_due' && !isPastDueDismissed && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">Notice:</span>
              <span>Your workspace subscription payment is past due. Please update payment information in billing settings to avoid service interruption.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPastDueDismissed(true)}
              className="text-amber-400 hover:text-white transition px-2 py-0.5 rounded text-[11px] font-bold"
            >
              Dismiss
            </button>
          </div>
        )}
        {children}
      </ProjectsContentArea>
    </AppShell>
  )
}

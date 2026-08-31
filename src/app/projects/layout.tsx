import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { logout } from '../auth/actions'
import AppShell from '@/components/layout/AppShell'
import MainSidebar from '@/components/layout/MainSidebar'
import ProjectsContentArea from '@/components/layout/ProjectsContentArea'

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() : { data: null }

  // Defense-in-depth: Platform admins should never see the tenant app
  if (profile?.is_platform_admin && !BYPASS_AUTH) {
    redirect('/admin')
  }

  const handleSignOut = async () => {
    'use server'
    await logout()
  }

  return (
    <AppShell>
      {/* Narrow Primary Left Sidebar */}
      <MainSidebar
        userEmail={user?.email || 'guest@projectiq.local'}
        userName={profile?.full_name || 'Guest User'}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <ProjectsContentArea>
        {children}
      </ProjectsContentArea>
    </AppShell>
  )
}

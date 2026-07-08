import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { logout } from './auth/actions'
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

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const handleSignOut = async () => {
    'use server'
    await logout()
  }

  return (
    <AppShell>
      {/* Narrow Primary Left Sidebar */}
      <MainSidebar
        userEmail={user.email}
        userName={profile?.full_name || 'User'}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <ProjectsContentArea>
        {children}
      </ProjectsContentArea>
    </AppShell>
  )
}


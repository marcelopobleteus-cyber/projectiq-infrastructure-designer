import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import { logout } from '../auth/actions'
import AppShell from '@/components/layout/AppShell'
import MainSidebar from '@/components/layout/MainSidebar'

export default async function DesignReviewLayout({
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
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
        {children}
      </div>
    </AppShell>
  )
}

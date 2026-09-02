import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

// Simple, single entry point for employees: just "/mobile".
// Not signed in -> the standalone employee login (separate from /login).
// Signed in -> straight to their dashboard, no deeper path to remember.
export default async function MobileIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/mobile/login')
  }

  redirect('/mobile/dashboard')
}

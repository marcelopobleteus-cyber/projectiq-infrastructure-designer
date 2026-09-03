import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'

// Simple, single entry point for employees: just "/field".
// Not signed in -> the standalone employee login (separate from /login).
// Signed in -> straight to their dashboard, no deeper path to remember.
export default async function FieldIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/field/login')
  }

  redirect('/field/dashboard')
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function sendInviteEmail(email: string): Promise<{ sent: boolean; error?: string }> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { sent: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }
  }
  const { createClient: createAdminClient } = require('@supabase/supabase-js')
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://designer.nextqtechs.com'
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })
  if (error) {
    // Supabase returns an error here if the email already belongs to a registered account —
    // that's expected and fine: the organization_invites row still exists, and
    // reconcile_pending_invites() will pick it up next time they log in normally.
    // Don't treat this as a failure of the invite itself.
    return { sent: false, error: error.message }
  }
  return { sent: true }
}

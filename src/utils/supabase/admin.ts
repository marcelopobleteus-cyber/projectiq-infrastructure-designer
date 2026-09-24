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

/**
 * Manda el correo con el que la persona entra por primera vez.
 *
 * Son DOS caminos, no uno. inviteUserByEmail solo manda correo cuando la
 * cuenta de auth no existe todavia; si ya existe devuelve error y NO manda
 * nada. Ese era el agujero: el boton del admin decia "invitacion registrada"
 * y al buzon no llegaba nada, porque la cuenta ya habia sido creada antes.
 *
 * Cuando la cuenta ya existe, lo correcto no es callarse: es mandar un enlace
 * de recuperacion, que aterriza en la misma pantalla (/reset-password) y deja
 * que la persona ponga su propia clave. Desde el punto de vista de quien
 * recibe el correo el resultado es identico; lo que cambia es que llega.
 */
export async function sendInviteEmail(
  email: string,
): Promise<{ sent: boolean; mode?: 'invite' | 'recovery'; error?: string }> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { sent: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }
  }

  const clean = email.trim().toLowerCase()
  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://designer.nextqtechnology.com'
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(clean, { redirectTo })
  if (!inviteError) return { sent: true, mode: 'invite' }

  // Segundo camino: la cuenta ya existe. Se manda recuperacion al mismo destino.
  const { error: recoveryError } = await adminClient.auth.resetPasswordForEmail(clean, { redirectTo })
  if (!recoveryError) return { sent: true, mode: 'recovery' }

  // Los dos fallaron: se reporta el del segundo intento, que es el que manda.
  return { sent: false, error: recoveryError.message }
}

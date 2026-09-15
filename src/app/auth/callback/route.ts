import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

/**
 * Punto de aterrizaje de todo enlace enviado por correo: invitacion, confirmacion
 * y recuperacion de clave.
 *
 * Supabase manda DOS formas distintas segun como se genero el enlace:
 *   - PKCE:  ?code=...              -> exchangeCodeForSession
 *   - OTP:   ?token_hash=...&type=  -> verifyOtp
 * Antes solo se atendia `code`, asi que los correos de recuperacion (que llegan
 * como token_hash + type=recovery) caian siempre al final y terminaban en /login
 * sin explicacion. Por eso "reset password" devolvia al login en vez de abrir la
 * pantalla para escribir la clave nueva.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/projects'

  // Supabase tambien puede devolver el error en la propia URL.
  const urlError = searchParams.get('error_description') || searchParams.get('error')

  const supabase = await createClient()
  let failure: string | null = urlError

  if (!failure && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    failure = error?.message ?? null
  } else if (!failure && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    failure = error?.message ?? null
  } else if (!failure) {
    failure = 'This link is missing its verification token.'
  }

  if (!failure) {
    try {
      await supabase.rpc('reconcile_pending_invites')
    } catch (e) {
      console.error('Error reconciling pending invites in auth callback:', e)
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Un enlace de recuperacion fallido se devuelve a /forgot-password, no a /login:
  // ahi puede pedir otro de inmediato en vez de quedarse mirando un formulario
  // que no le va a servir.
  const back = next === '/reset-password' ? '/forgot-password' : '/login'
  return NextResponse.redirect(`${origin}${back}?error=${encodeURIComponent(failure)}`)
}

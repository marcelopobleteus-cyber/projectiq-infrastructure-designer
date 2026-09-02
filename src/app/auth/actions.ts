'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })

  if (error) {
    return { error: error.message }
  }

  try {
    await supabase.rpc('reconcile_pending_invites')
  } catch (e) {
    console.error('Error reconciling pending invites during login:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/projects')
}

// Fully separate sign-in path for the employee mobile app (/mobile). Kept apart
// from the desktop `login()` above on purpose: different landing page, and any
// future change to admin/desktop auth (SSO, extra checks, etc.) should not
// silently affect how field employees clock in from their phones.
export async function loginMobile(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })

  if (error) {
    return { error: error.message }
  }

  try {
    await supabase.rpc('reconcile_pending_invites')
  } catch (e) {
    console.error('Error reconciling pending invites during login:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/mobile/dashboard')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return { error: 'Email is required' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://designer.nextqtechs.com'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    console.warn('resetPasswordForEmail notice (not surfaced to client):', error.message)
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

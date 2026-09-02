import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import MobileRedirectHandler from '@/components/mobile/MobileRedirectHandler'

// Distinct browser-tab title so the employee field app is never confused
// with the admin/desktop system, even across tabs.
export const metadata: Metadata = {
  title: 'NextQ Field App',
}

export default async function MobileRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/mobile/login')
  }

  return (
    <>
      <MobileRedirectHandler />
      {children}
    </>
  )
}

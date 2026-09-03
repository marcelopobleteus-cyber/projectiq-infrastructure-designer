import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import FieldRedirectHandler from '@/components/field/FieldRedirectHandler'

// Distinct browser-tab title so the employee field app is never confused
// with the admin/desktop system, even across tabs.
export const metadata: Metadata = {
  title: 'NextQ Field App',
}

export default async function FieldRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/field/login')
  }

  return (
    <>
      <FieldRedirectHandler />
      {children}
    </>
  )
}

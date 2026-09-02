import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import MobileAppShell from '@/components/mobile/MobileAppShell'
import TimeClockClient from '@/components/mobile/TimeClockClient'
import { loadTimeClockData } from './data'

export default async function MobileTimeClockPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  if (!user) {
    return (
      <MobileAppShell title="Fichaje" subtitle="Modo Terreno">
        <p className="text-xs text-[var(--text-secondary)]">Inicia sesión para marcar tus horas.</p>
      </MobileAppShell>
    )
  }

  const { projects, openEntry, history } = await loadTimeClockData(user.id)

  return (
    <MobileAppShell title="Fichaje" subtitle="Entrada, salida y horas trabajadas">
      <TimeClockClient projects={projects} openEntry={openEntry} history={history} />
    </MobileAppShell>
  )
}

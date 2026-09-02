import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import MobileAppShell from '@/components/mobile/MobileAppShell'
import TimeClockClient from '@/components/mobile/TimeClockClient'
import { loadTimeClockData } from '../../../time/data'

interface MobileProjectTimeProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function MobileProjectTimeClockPage({ params }: MobileProjectTimeProps) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single()

  if (!user) {
    return (
      <MobileAppShell title="Fichaje" subtitle={project?.name} projectId={projectId} projectName={project?.name}>
        <p className="text-xs text-[var(--text-secondary)]">Inicia sesión para marcar tus horas.</p>
      </MobileAppShell>
    )
  }

  const { projects, openEntry, history } = await loadTimeClockData(user.id)
  const projectHistory = history.filter((h) => h.project_id === projectId)

  return (
    <MobileAppShell
      title="Fichaje"
      subtitle={project?.name || 'Proyecto'}
      projectId={projectId}
      projectName={project?.name}
    >
      <TimeClockClient projects={projects} openEntry={openEntry} history={projectHistory} lockedProjectId={projectId} />
    </MobileAppShell>
  )
}

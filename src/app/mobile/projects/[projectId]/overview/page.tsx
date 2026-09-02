import React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BYPASS_AUTH } from '@/config/auth'
import MobileAppShell from '@/components/mobile/MobileAppShell'
import ProjectDocumentsClient, { ProjectDocumentItem } from '@/components/mobile/ProjectDocumentsClient'

interface MobileOverviewProps {
  params: Promise<{
    projectId: string
  }>
}

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planificación',
  in_progress: 'En Progreso',
  on_hold: 'En Pausa',
  completed: 'Completado',
  closed: 'Cerrado',
}

export default async function MobileOverviewPage({ params }: MobileOverviewProps) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, disciplines, default_latitude, default_longitude, organization_id, created_at, updated_at')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  let canManage = false
  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', user.id)
      .maybeSingle()
    canManage = !!membership && ['owner', 'admin', 'editor'].includes(membership.role)
  }

  const { count: cameraCount } = await supabase
    .from('camera_locations')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { count: completeCameraCount } = await supabase
    .from('camera_locations')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'complete')

  let initialDocuments: ProjectDocumentItem[] = []
  const { data: fileList } = await supabase.storage.from('project-documents').list(projectId, {
    sortBy: { column: 'updated_at', order: 'desc' },
  })
  initialDocuments = (fileList || [])
    .filter((f) => f.id)
    .map((f) => ({ name: f.name, size: f.metadata?.size ?? null, updatedAt: f.updated_at ?? null }))

  return (
    <MobileAppShell title={project.name} subtitle="Información del proyecto" projectId={projectId} projectName={project.name}>
      <div className="space-y-4 font-sans">
        <Link
          href={`/mobile/projects/${projectId}/time`}
          className="flex items-center justify-between bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-2xl p-4 active:scale-[0.98] transition-all"
        >
          <div>
            <p className="text-xs font-bold text-white/80 uppercase tracking-wide">Terreno</p>
            <p className="text-sm font-black text-white">Marcar Entrada / Salida</p>
          </div>
          <span className="text-white text-lg">⏱</span>
        </Link>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Información General
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              {STATUS_LABEL[project.status] || project.status}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{project.description}</p>
          )}

          {project.disciplines?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.disciplines.map((d: string) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent-text)] text-[9.5px] font-bold uppercase tracking-wide"
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
            <div>
              <p className="text-lg font-black text-[var(--text-primary)] tabular-nums">{cameraCount ?? 0}</p>
              <p className="text-[9.5px] text-[var(--text-secondary)] uppercase tracking-wide">Cámaras</p>
            </div>
            <div>
              <p className="text-lg font-black text-[var(--text-primary)] tabular-nums">{completeCameraCount ?? 0}</p>
              <p className="text-[9.5px] text-[var(--text-secondary)] uppercase tracking-wide">Completadas</p>
            </div>
          </div>

          {(project.default_latitude || project.default_longitude) && (
            <a
              href={`https://www.google.com/maps?q=${project.default_latitude},${project.default_longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-text)] pt-2 border-t border-[var(--border)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Ver ubicación en el mapa
            </a>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
            Documentación
          </h2>
          <ProjectDocumentsClient projectId={projectId} canManage={canManage} initialDocuments={initialDocuments} />
        </div>
      </div>
    </MobileAppShell>
  )
}

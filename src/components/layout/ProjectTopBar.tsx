'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { deleteProject } from '@/app/projects/actions'

interface ProjectTopBarProps {
  projectId: string
  projectName: string
  extraActionsSlot?: React.ReactNode
}

export default function ProjectTopBar({
  projectId,
  projectName,
  extraActionsSlot,
}: ProjectTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const tabs = [
    {
      label: 'Dashboard',
      href: `/projects/${projectId}/overview`,
      active: pathname.endsWith('/overview') || pathname.endsWith(projectId),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      )
    },
    {
      label: 'Layout & Map',
      href: `/projects/${projectId}/maps`,
      active: pathname.endsWith('/maps'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      )
    },
    {
      label: 'Bill of Materials',
      href: `/projects/${projectId}/bom`,
      active: pathname.endsWith('/bom'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      )
    },
    {
      label: 'Tasks & Field',
      href: `/projects/${projectId}/tasks`,
      active: pathname.endsWith('/tasks'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      )
    },
    {
      label: 'Reports',
      href: `/projects/${projectId}/reports`,
      active: pathname.endsWith('/reports'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      )
    }
  ]

  const handleDeleteProject = async () => {
    if (projectId === 'demo-metro-cctv') {
      alert('El proyecto de demostración no se puede eliminar.')
      return
    }

    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el proyecto "${projectName}"?\n\nEsta acción borrará de la base de datos Supabase todas las cámaras, nodos de fibra, switches, cómputos métricos (BOM) y tareas asociadas.`
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    const res = await deleteProject(projectId)
    setIsDeleting(false)

    if (res.error) {
      alert(`Error al eliminar proyecto: ${res.error}`)
    } else {
      router.push('/projects')
    }
  }

  return (
    <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--surface-1)] shrink-0 w-full relative z-20 font-sans">
      {/* Project Switcher & Name */}
      <div className="flex items-center gap-4 min-w-0">
        <Link href="/projects" className="flex items-center gap-2 group min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] font-bold text-xs shrink-0">
            NQ
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] leading-none">Project</span>
            <span className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors truncate">
              {projectName}
            </span>
          </div>
        </Link>

        <span className="inline-flex items-center gap-1.5 bg-[var(--success-soft)] border border-emerald-200 text-[var(--success)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          Active Workspace
        </span>
      </div>

      {/* Centered Navigation Tabs */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              tab.active
                ? 'border-b-[var(--accent)] text-[var(--text-primary)] font-bold'
                : 'border-b-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-b-[var(--border)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Action Utilities (Export + Interactive Project Actions Dropdown) */}
      <div className="flex items-center gap-3 shrink-0 relative">
        {extraActionsSlot && (
          <div className="flex items-center gap-2">
            {extraActionsSlot}
          </div>
        )}

        <Link
          href={`/projects/${projectId}/reports`}
          className="px-3 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-semibold text-xs rounded-lg transition shadow-xs"
        >
          Export
        </Link>

        {/* Real Interactive Project Actions Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            Project Actions
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-xl shadow-xl p-1.5 z-50 space-y-0.5 animate-in zoom-in-95 duration-100 font-sans">
              <div className="px-2.5 py-1 text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border)] mb-1">
                Acciones del Proyecto
              </div>

              <Link
                href={`/projects/${projectId}/overview`}
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/></svg>
                Dashboard del Proyecto
              </Link>

              <Link
                href={`/projects/${projectId}/bom`}
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Ver Cómputo Métrico (BOM)
              </Link>

              <Link
                href={`/projects/${projectId}/reports`}
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Exportar Reportes PDF
              </Link>

              <div className="border-t border-[var(--border)] pt-1 mt-1">
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--danger)] hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  {isDeleting ? 'Eliminando...' : 'Eliminar Proyecto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

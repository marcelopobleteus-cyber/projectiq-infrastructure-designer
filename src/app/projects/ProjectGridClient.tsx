'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { deleteProject } from './actions'

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at?: string | null
  default_latitude: number
  default_longitude: number
}

interface ProjectGridClientProps {
  initialProjects: Project[]
}

export default function ProjectGridClient({ initialProjects }: ProjectGridClientProps) {
  const sortedProjects = [...initialProjects].sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at).getTime()
    const timeB = new Date(b.updated_at || b.created_at).getTime()
    return timeB - timeA
  })

  const [projects, setProjects] = useState<Project[]>(sortedProjects)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleDelete = async (projId: string, projName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el proyecto "${projName}"?\n\nEsta acción borrará de la base de datos Supabase todas las cámaras, nodos de fibra, switches, cómputos métricos (BOM) y tareas asociadas. Esta acción NO se puede deshacer.`
    )
    if (!confirmDelete) return

    setDeletingId(projId)
    setErrorMsg(null)
    setOpenMenuId(null)
    const res = await deleteProject(projId)
    setDeletingId(null)

    if (res.error) {
      setErrorMsg(`Error al eliminar: ${res.error}`)
    } else {
      setProjects(prev => prev.filter(p => p.id !== projId))
    }
  }

  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl mx-auto mt-12 font-sans">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">No projects found</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
          You don't have any infrastructure design projects yet. Create your first project to get started.
        </p>
        <Link
          href="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-lg transition mt-6 shadow-xs"
        >
          Create Your First Project
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[var(--danger)] text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative flex flex-col justify-between p-5 bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl transition-all shadow-xs"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2 relative">
                <h3 className="font-extrabold text-[var(--text-primary)] text-base group-hover:text-[var(--accent-text)] transition-colors">
                  {project.name}
                </h3>

                {/* Destructive Actions Menu (Three-Dot ⋯ Dropdown) */}
                {project.id !== 'demo-metro-cctv' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                      }}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-md hover:bg-[var(--surface-hover)] transition cursor-pointer"
                      title="Opciones del proyecto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-lg shadow-lg p-1 z-30 w-36">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(project.id, project.name, e)}
                          disabled={deletingId === project.id}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--danger)] font-semibold hover:bg-red-50 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {deletingId === project.id ? (
                            <span className="animate-spin text-xs">⏳</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          )}
                          Borrar proyecto
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 min-h-[42px] mb-4">
                {project.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {new Date(project.created_at).toLocaleDateString()}
              </span>

              <Link
                href={`/projects/${project.id}/overview`}
                className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                Abrir Proyecto
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

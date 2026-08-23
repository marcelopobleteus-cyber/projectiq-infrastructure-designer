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

  const handleDelete = async (projId: string, projName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el proyecto "${projName}"?\n\nEsta acción borrará de la base de datos Supabase todas las cámaras, nodos de fibra, switches, cómputos métricos (BOM) y tareas asociadas. Esta acción NO se puede deshacer.`
    )
    if (!confirmDelete) return

    setDeletingId(projId)
    setErrorMsg(null)
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
      <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center bg-slate-900/20 backdrop-blur-sm max-w-xl mx-auto mt-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-slate-400 border border-slate-700/50 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <h3 className="text-base font-semibold text-white">No projects found</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
          You don't have any infrastructure design projects yet. Create your first project to get started.
        </p>
        <Link
          href="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-6"
        >
          Create Your First Project
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative flex flex-col justify-between p-6 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all hover:bg-slate-900/90 shadow-sm"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-extrabold text-white text-lg group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>

                {/* Delete Button */}
                {project.id !== 'demo-metro-cctv' && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(project.id, project.name, e)}
                    disabled={deletingId === project.id}
                    title="Eliminar proyecto permanentemente"
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-xs transition active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {deletingId === project.id ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-[11px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Borrar
                      </span>
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400 line-clamp-3 min-h-[42px] mb-4">
                {project.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {new Date(project.created_at).toLocaleDateString()}
              </span>

              <Link
                href={`/projects/${project.id}/overview`}
                className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1"
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

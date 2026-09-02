'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { deleteProject, updateProjectStatus, ProjectStatusType } from './actions'
import ConfirmModal from '@/components/ui/ConfirmModal'

export interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at?: string | null
  default_latitude: number
  default_longitude: number
  status?: ProjectStatusType
  tasksTotal?: number
  tasksComplete?: number
  lastUpdatedBy?: string
}

interface ProjectGridClientProps {
  initialProjects: Project[]
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'status-asc' | 'status-desc'

const STATUS_ORDER: Record<string, number> = {
  planning: 1,
  in_progress: 2,
  on_hold: 3,
  completed: 4,
  closed: 5
}

export default function ProjectGridClient({ initialProjects }: ProjectGridClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)

  // Sync state if initialProjects prop updates
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  // Load view mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('projectiq_projects_view_mode')
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  // Persist view mode preference
  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('projectiq_projects_view_mode', mode)
  }

  // Handle manual status update
  const handleStatusChange = async (projectId: string, newStatus: ProjectStatusType, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setUpdatingStatusId(projectId)
    setStatusDropdownId(null)
    setOpenMenuId(null)

    const res = await updateProjectStatus(projectId, newStatus)
    setUpdatingStatusId(null)

    if (res.error) {
      setErrorMsg(`Error al actualizar estado: ${res.error}`)
    } else {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  // Trigger modal confirmation
  const promptDelete = (projId: string, projName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId(null)
    setDeleteTarget({ id: projId, name: projName })
  }

  // Execute project deletion upon modal confirmation
  const confirmDeleteProject = async () => {
    if (!deleteTarget) return

    setDeletingId(deleteTarget.id)
    setErrorMsg(null)
    const res = await deleteProject(deleteTarget.id)
    setDeletingId(null)

    if (res.error) {
      setErrorMsg(`Error al eliminar: ${res.error}`)
    } else {
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    }
  }

  // Filter and Sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects]

    // 1. Search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    }

    // 2. Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        const timeA = new Date(a.updated_at || a.created_at).getTime()
        const timeB = new Date(b.updated_at || b.created_at).getTime()
        return timeB - timeA
      }
      if (sortBy === 'date-asc') {
        const timeA = new Date(a.updated_at || a.created_at).getTime()
        const timeB = new Date(b.updated_at || b.created_at).getTime()
        return timeA - timeB
      }
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name)
      }
      if (sortBy === 'status-asc') {
        const orderA = STATUS_ORDER[a.status || 'planning'] || 1
        const orderB = STATUS_ORDER[b.status || 'planning'] || 1
        return orderA - orderB
      }
      if (sortBy === 'status-desc') {
        const orderA = STATUS_ORDER[a.status || 'planning'] || 1
        const orderB = STATUS_ORDER[b.status || 'planning'] || 1
        return orderB - orderA
      }
      return 0
    })

    return result
  }, [projects, searchQuery, sortBy])

  const renderStatusBadge = (status: ProjectStatusType = 'planning') => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            In Progress
          </span>
        )
      case 'on_hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warn-soft)] text-[var(--warn)] border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)]" />
            On Hold
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            Completed
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--surface-2)] text-[var(--text-tertiary)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]" />
            Closed
          </span>
        )
      case 'planning':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]" />
            Planning
          </span>
        )
    }
  }

  const renderTaskProgress = (complete: number = 0, total: number = 0) => {
    if (total === 0) {
      return <span className="text-[11px] text-[var(--text-tertiary)] font-mono">No tasks</span>
    }
    const percent = Math.round((complete / total) * 100)
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
        <span className="font-bold">{complete}/{total} tasks</span>
        <span className="text-[10px] text-[var(--text-tertiary)]">({percent}%)</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[var(--danger)] text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-xs text-[var(--text-tertiary)] hover:text-black">✕</button>
        </div>
      )}

      {/* Control Bar: Search Input, Sort Selector, and Grid/List Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-1)] p-3 border border-[var(--border)] rounded-xl shadow-xs">
        {/* Live Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full pl-9 pr-8 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort and View Mode Controls */}
        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="py-1.5 px-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="status-asc">Status (Planning → Closed)</option>
              <option value="status-desc">Status (Closed → Planning)</option>
            </select>
          </div>

          {/* Grid / List View Toggle Buttons */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => toggleViewMode('grid')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface-1)] text-[var(--accent-text)] shadow-xs font-bold'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button
              type="button"
              onClick={() => toggleViewMode('list')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--surface-1)] text-[var(--accent-text)] shadow-xs font-bold'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Empty state — a workspace with no projects yet is not the same as a search
          that matched nothing, and the copy has to say which one this is. */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-10 text-center bg-[var(--surface-1)] max-w-xl mx-auto my-8 font-sans">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] mb-3">
            {searchQuery ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            )}
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {searchQuery ? 'No matching projects found' : 'No projects yet'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {searchQuery
              ? `No projects match "${searchQuery}". Try adjusting your search query.`
              : 'Create your first project to start planning cameras, fiber routes and devices.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between p-5 bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl transition-all shadow-xs"
            >
              <div>
                {/* Header: Project Name + Status Badge + ⋯ Options */}
                <div className="flex justify-between items-start gap-2 mb-3 relative">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-extrabold text-[var(--text-primary)] text-base group-hover:text-[var(--accent-text)] transition-colors truncate">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderStatusBadge(project.status)}
                      {renderTaskProgress(project.tasksComplete, project.tasksTotal)}
                    </div>
                  </div>

                  {/* Destructive / Status Options Menu (Three-Dot ⋯ Dropdown) */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                        setStatusDropdownId(null)
                      }}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-md hover:bg-[var(--surface-hover)] transition cursor-pointer"
                      title="Opciones del proyecto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-lg shadow-lg p-1.5 z-30 w-48 space-y-1 font-sans">
                        <div className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-0.5 border-b border-[var(--border)]">
                          Cambiar Estado
                        </div>

                        {(['planning', 'in_progress', 'on_hold', 'completed', 'closed'] as ProjectStatusType[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={(e) => handleStatusChange(project.id, s, e)}
                            disabled={updatingStatusId === project.id}
                            className={`w-full text-left px-2.5 py-1 text-xs rounded-md font-semibold transition flex items-center justify-between cursor-pointer ${
                              project.status === s
                                ? 'bg-[var(--surface-2)] font-bold text-[var(--accent-text)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="capitalize">{s.replace('_', ' ')}</span>
                            {project.status === s && <span className="text-[var(--accent)] font-bold">✓</span>}
                          </button>
                        ))}

                        {project.id !== 'demo-metro-cctv' && (
                          <div className="border-t border-[var(--border)] pt-1 mt-1">
                            <button
                              type="button"
                              onClick={(e) => promptDelete(project.id, project.name, e)}
                              disabled={deletingId === project.id}
                              className="w-full text-left px-2.5 py-1 text-xs text-[var(--danger)] font-bold hover:bg-red-50 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {deletingId === project.id ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              )}
                              Delete project
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-3 min-h-[42px] mb-4">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <div className="flex flex-col text-[11px] font-mono leading-tight">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  {project.lastUpdatedBy && (
                    <span className="text-[10px] text-[var(--text-tertiary)] font-sans mt-0.5 truncate max-w-[140px]" title={`By ${project.lastUpdatedBy}`}>
                      By {project.lastUpdatedBy}
                    </span>
                  )}
                </div>

                <Link
                  href={`/projects/${project.id}/overview`}
                  className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  Open Project
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* COMPACT TABLE-LIKE LIST VIEW LAYOUT */
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs divide-y divide-[var(--border)] font-sans">
          {filteredAndSortedProjects.map((project) => (
            <div
              key={project.id}
              className="p-4 hover:bg-[var(--surface-hover)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Column: Project Name & Description */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/projects/${project.id}/overview`}
                    className="font-extrabold text-sm text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors truncate"
                  >
                    {project.name}
                  </Link>
                  {renderStatusBadge(project.status)}
                  {renderTaskProgress(project.tasksComplete, project.tasksTotal)}
                </div>
                <p className="text-xs text-[var(--text-secondary)] truncate max-w-2xl">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Right Column: Date & Actions */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {new Date(project.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${project.id}/overview`}
                    className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    Open Project
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                  </Link>

                  {/* ⋯ Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                        setStatusDropdownId(null)
                      }}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-md hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition cursor-pointer"
                      title="Opciones del proyecto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-lg shadow-lg p-1.5 z-30 w-48 space-y-1 font-sans">
                        <div className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-0.5 border-b border-[var(--border)]">
                          Cambiar Estado
                        </div>

                        {(['planning', 'in_progress', 'on_hold', 'completed', 'closed'] as ProjectStatusType[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={(e) => handleStatusChange(project.id, s, e)}
                            disabled={updatingStatusId === project.id}
                            className={`w-full text-left px-2.5 py-1 text-xs rounded-md font-semibold transition flex items-center justify-between cursor-pointer ${
                              project.status === s
                                ? 'bg-[var(--surface-2)] font-bold text-[var(--accent-text)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="capitalize">{s.replace('_', ' ')}</span>
                            {project.status === s && <span className="text-[var(--accent)] font-bold">✓</span>}
                          </button>
                        ))}

                        {project.id !== 'demo-metro-cctv' && (
                          <div className="border-t border-[var(--border)] pt-1 mt-1">
                            <button
                              type="button"
                              onClick={(e) => promptDelete(project.id, project.name, e)}
                              disabled={deletingId === project.id}
                              className="w-full text-left px-2.5 py-1 text-xs text-[var(--danger)] font-bold hover:bg-red-50 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {deletingId === project.id ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              )}
                              Delete project
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Styled App Modal Confirmation for Project Deletion */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete project "${deleteTarget?.name}"?`}
        message={`This will PERMANENTLY delete from the Supabase database every camera, fiber node, switch, BOM line and work order in this project. This cannot be undone.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
        isLoading={Boolean(deletingId)}
        onConfirm={confirmDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

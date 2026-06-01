'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ProjectCreateReviewClient from './new/ProjectCreateReviewClient'

interface ProjectData {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string | null
  cameraCount: number
  deviceCount: number
}

interface ProjectReviewListClientProps {
  initialProjects: ProjectData[]
  googleMapsApiKey?: string
}

export default function ProjectReviewListClient({ initialProjects, googleMapsApiKey }: ProjectReviewListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Check URL query parameters for 'create' or 'new'
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('create') === 'true' || params.get('new') === 'true') {
        setIsCreateModalOpen(true)
      }
    }
  }, [])

  // Filter projects by query
  const filteredProjects = initialProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isCreateModalOpen && (
        <ProjectCreateReviewClient 
          onClose={() => setIsCreateModalOpen(false)} 
          googleMapsApiKey={googleMapsApiKey}
        />
      )}
      {/* Top Application Bar */}
      <header className="h-14 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
            Review Mode
          </span>
          <div className="h-4 w-[1px] bg-slate-850" />
          <h1 className="text-sm font-bold text-slate-200">System Designer v3.5</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Design Review Mode</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
        {/* 1. Page Header (Top Header) with Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">My Projects</h2>
            <p className="text-xs text-slate-400 mt-1">Manage and configure your site infrastructure networks</p>
          </div>
          
          {/* Project Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Project
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold rounded-xl transition-all cursor-not-allowed flex items-center gap-1.5 hover:bg-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Project
              <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded text-slate-600 font-mono font-bold">Soon</span>
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold rounded-xl transition-all cursor-not-allowed flex items-center gap-1.5 hover:bg-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Add Folder
              <span className="text-[8px] bg-slate-950 border border-slate-850 px-1 py-0.2 rounded text-slate-600 font-mono font-bold">Soon</span>
            </button>
          </div>
        </div>

        {/* 2. Filters and Search Bar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-850 p-4 rounded-2xl">
          {/* Search Box */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-4 py-2.5 bg-slate-950/50 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-555 hover:text-slate-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 group cursor-pointer select-none"
            >
              <div className={`w-8 h-4.5 rounded-full p-0.5 transition-all ${showArchived ? 'bg-cyan-500' : 'bg-slate-850'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all transform ${showArchived ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Show archived projects</span>
            </button>
          </div>
        </div>

        {/* Project List Table */}
        {filteredProjects.length === 0 ? (
          <div className="border border-dashed border-slate-850 rounded-2xl p-16 text-center bg-slate-900/10 backdrop-blur-sm max-w-xl mx-auto mt-6 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 text-slate-555">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">No projects yet</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                {searchQuery ? 'No projects match your search term. Try another query.' : 'Get started by creating your first site infrastructure project setup.'}
              </p>
            </div>
            {!searchQuery && (
              <div className="pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-950/25 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create Your First Project
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-4">Changed</th>
                    <th className="py-3 px-4 text-center">Cameras</th>
                    <th className="py-3 px-4 text-center">Network Devices</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-855/20 transition-all group">
                      <td className="py-3.5 px-6">
                        <div className="space-y-0.5">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-bold text-slate-200 hover:text-cyan-400 transition-colors text-sm"
                          >
                            {project.name}
                          </Link>
                          {project.description && (
                            <p className="text-[10px] text-slate-450 truncate max-w-sm">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-350">
                        {formatDate(project.updated_at || project.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-200">
                        <span className={`inline-flex items-center justify-center w-7 h-5.5 rounded-lg border text-[10px] font-bold ${
                          project.cameraCount > 0
                            ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'
                            : 'bg-slate-950 border-slate-850 text-slate-600'
                        }`}>
                          {project.cameraCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-200">
                        <span className={`inline-flex items-center justify-center w-7 h-5.5 rounded-lg border text-[10px] font-bold ${
                          project.deviceCount > 0
                            ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400'
                            : 'bg-slate-950 border-slate-850 text-slate-600'
                        }`}>
                          {project.deviceCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold rounded-md transition-all"
                          >
                            Open Grid
                          </Link>
                          <button
                            disabled
                            className="p-1 hover:bg-slate-800 text-slate-500 rounded cursor-not-allowed hover:text-slate-400"
                            title="Actions Menu"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

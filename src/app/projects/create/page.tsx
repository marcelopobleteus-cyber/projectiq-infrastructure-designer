'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createProject } from '../actions'

export default function CreateProjectPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const res = await createProject(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 relative z-10">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create New Project</h2>
          <p className="text-sm text-slate-400 mt-1">Configure coordinates and details for your infrastructure grid</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. CCTV Head Office Deployment"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Provide a brief summary of the site infrastructure..."
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="latitude" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                required
                defaultValue="37.7749"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                required
                defaultValue="-122.4194"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="zoom" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Zoom
              </label>
              <input
                id="zoom"
                name="zoom"
                type="number"
                required
                defaultValue="15"
                min="0"
                max="22"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-850 flex items-center justify-end gap-4">
            <Link
              href="/projects"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
            >
              {isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

/**
 * Lo que ve el cliente al abrir el enlace compartido.
 *
 * Es de solo lectura y deliberadamente austero: estado del proyecto, listado
 * de camaras y, SOLO si la organizacion configuro precio, el total cotizado.
 * Sin precio configurado no se muestra ningun monto — los numeros del BOM son
 * costo interno y no pueden salir por un enlace publico.
 */

import React, { useState } from 'react'
import { openSharedProject, type SharedProjectView } from '@/app/projects/actions-share'

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  complete: 'Complete',
  installed: 'Installed',
  issue: 'Needs attention',
  unknown: 'To be defined',
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function SharedProjectClient({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [view, setView] = useState<SharedProjectView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await openSharedProject({ token, password })
      if (res.error || !res.view) {
        setError(res.error || 'That link or password is not valid.')
        return
      }
      setView(res.view)
      // La contrasena no se guarda en ningun lado del navegador: si el
      // cliente recarga, la vuelve a escribir.
      setPassword('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <form
          onSubmit={handleOpen}
          className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Project access</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter the password you were given to view this project.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={busy || password.length === 0}
            className="w-full px-4 py-2.5 bg-slate-900 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            {busy ? 'Opening…' : 'View project'}
          </button>
        </form>
      </div>
    )
  }

  const accent = view.branding.primaryColor
  const contact = [
    view.branding.contactName,
    view.branding.contactPhone,
    view.branding.contactEmail,
    view.branding.website,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
              {view.organizationName}
            </div>
            <h1 className="text-2xl font-extrabold mt-1.5 break-words">{view.projectName}</h1>
            {view.projectDescription && (
              <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                {view.projectDescription}
              </p>
            )}
          </div>
          {view.branding.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.branding.logoDataUrl}
              alt={view.organizationName}
              className="max-h-14 max-w-[10rem] object-contain shrink-0"
            />
          )}
        </header>

        <div className="h-[3px] rounded" style={{ backgroundColor: accent }} />

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cameras', value: String(view.cameraCount) },
            { label: 'Progress', value: `${view.taskPercentComplete}%` },
            ...(view.price
              ? [
                  { label: 'Subtotal', value: money(view.price.subtotal) },
                  { label: 'Total', value: money(view.price.total) },
                ]
              : []),
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xl font-extrabold">{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {view.camerasByStatus.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Status breakdown
            </h2>
            <div className="flex flex-wrap gap-2">
              {view.camerasByStatus.map(s => (
                <span
                  key={s.status}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  {STATUS_LABEL[s.status] || s.status}: {s.count}
                </span>
              ))}
            </div>
          </section>
        )}

        {view.price && (
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Quote
            </h2>
            <div className="space-y-1.5 text-sm max-w-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-mono">{money(view.price.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax ({view.price.taxPct}%)</span>
                <span className="font-mono">{money(view.price.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span>Total</span>
                <span className="font-mono">{money(view.price.total)}</span>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-slate-200">
            Cameras
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider">Tag</th>
                  <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider">Model</th>
                  <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider">Location</th>
                  <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {view.cameras.map(c => (
                  <tr key={c.tag} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-mono font-bold">{c.tag}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.model}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.placement}</td>
                    <td className="px-4 py-2.5 text-slate-700">{STATUS_LABEL[c.status] || c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-[11px] text-slate-500 space-y-1 pt-2">
          {contact.length > 0 && <p>{contact.join('  ·  ')}</p>}
          <p>
            This link expires on{' '}
            {new Date(view.expiresAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            .
          </p>
        </footer>
      </div>
    </div>
  )
}

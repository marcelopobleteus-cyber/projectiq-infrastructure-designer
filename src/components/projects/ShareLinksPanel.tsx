'use client'

/**
 * Enlaces de solo lectura para clientes.
 *
 * La contrasena se muestra UNA vez, junto con el enlace recien creado, y no
 * se vuelve a mostrar nunca: en la base solo queda su hash. Si se pierde, se
 * revoca el enlace y se crea otro.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  listShareLinks,
  createShareLink,
  revokeShareLink,
  type ShareLinkItem,
} from '@/app/projects/actions-share'

const EXPIRY_OPTIONS = [7, 14, 30, 90]

export default function ShareLinksPanel({ projectId }: { projectId: string }) {
  const [links, setLinks] = useState<ShareLinkItem[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const requested = useRef(false)

  const [formOpen, setFormOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [justCreated, setJustCreated] = useState<{ url: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState<ShareLinkItem | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await listShareLinks(projectId)
    if (res.error) setError(res.error)
    else {
      setLinks(res.links)
      setCanManage(res.canManage)
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    load().catch(() => {
      setError('Could not load share links.')
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shareUrl = (token: string) =>
    typeof window === 'undefined' ? `/share/${token}` : `${window.location.origin}/share/${token}`

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await createShareLink({ projectId, password, expiresInDays, label })
    setBusy(false)

    if (res.error || !res.token) {
      setError(res.error || 'Could not create the link.')
      return
    }

    setJustCreated({ url: shareUrl(res.token), password })
    setPassword('')
    setLabel('')
    setFormOpen(false)
    await load()
  }

  const handleRevoke = async (link: ShareLinkItem) => {
    setBusy(true)
    const res = await revokeShareLink({ projectId, linkId: link.id })
    setBusy(false)
    setConfirmRevoke(null)
    if (res.error) {
      setError(res.error)
      return
    }
    await load()
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles el enlace igual esta a la vista para
      // copiarlo a mano; no se molesta al usuario con un error por esto.
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4 no-print">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Client share link
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed max-w-2xl">
            A read-only web page for a client who has no account: project status, camera list and,
            when this project has margin and tax set, the quoted total. Internal cost is never shown.
          </p>
        </div>
        {canManage && !formOpen && (
          <button
            type="button"
            onClick={() => { setFormOpen(true); setJustCreated(null) }}
            className="px-3.5 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs shrink-0"
          >
            New link
          </button>
        )}
      </div>

      {/* El enlace y la contrasena, una sola vez. */}
      {justCreated && (
        <div className="mt-3 border border-[var(--accent)]/40 bg-[var(--accent-soft)] rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-[var(--accent-text)] uppercase tracking-wider">
            Link ready — copy the password now
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] w-16 shrink-0">Link</span>
              <code className="flex-1 min-w-0 truncate font-mono text-[var(--text-primary)]">{justCreated.url}</code>
              <button
                type="button"
                onClick={() => copy(justCreated.url)}
                className="px-2 py-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[10px] font-bold cursor-pointer text-[var(--text-primary)]"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] w-16 shrink-0">Password</span>
              <code className="flex-1 font-mono text-[var(--text-primary)]">{justCreated.password}</code>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
            The password is stored hashed and cannot be shown again. If it gets lost, revoke this
            link and create a new one.
          </p>
          <button
            type="button"
            onClick={() => setJustCreated(null)}
            className="text-[10px] font-bold text-[var(--text-secondary)] underline cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleCreate} className="mt-3 border-t border-[var(--border)] pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Label (optional)
              </label>
              <input
                type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="e.g. City of Marietta"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="text" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="at least 8 characters"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Expires in
              </label>
              <select
                value={expiresInDays}
                onChange={e => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs cursor-pointer focus:outline-none focus:border-[var(--accent)]"
              >
                {EXPIRY_OPTIONS.map(d => (
                  <option key={d} value={d} className="text-[var(--text-primary)] bg-[var(--surface-1)]">
                    {d} days
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-[11px] text-[var(--danger)] font-semibold">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit" disabled={busy || password.length < 8}
              className="px-3.5 py-2 bg-[var(--accent)] disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              {busy ? 'Creating…' : 'Create link'}
            </button>
            <button
              type="button" onClick={() => { setFormOpen(false); setError(null) }} disabled={busy}
              className="px-3.5 py-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[11px] text-[var(--text-tertiary)] mt-3">Loading links…</p>
      ) : links.length > 0 ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3 space-y-2">
          {links.map(link => {
            const dead = link.revoked || link.expired
            return (
              <div
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {link.label || 'Client link'}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        link.revoked
                          ? 'bg-red-100 text-red-700'
                          : link.expired
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {link.revoked ? 'Revoked' : link.expired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Expires {formatDate(link.expiresAt)} · {link.viewCount} view
                    {link.viewCount === 1 ? '' : 's'}
                    {link.lastViewedAt ? ` · last opened ${formatDate(link.lastViewedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!dead && (
                    <button
                      type="button"
                      onClick={() => copy(shareUrl(link.token))}
                      className="px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Copy link
                    </button>
                  )}
                  {canManage && !link.revoked && (
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(link)}
                      className="px-2.5 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] text-[var(--danger)] text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        !formOpen && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
            {canManage ? 'No links yet.' : 'No links yet. Only owners and admins can create one.'}
          </p>
        )
      )}

      {/* Modal propio, no confirm() nativo: Chrome lo suprime tras el primero
          y devuelve false en silencio. */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Revoke this link?</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {confirmRevoke.label || 'This link'} will stop working immediately. Anyone who already
              has the URL will no longer be able to open the project.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button" onClick={() => handleRevoke(confirmRevoke)} disabled={busy}
                className="px-3.5 py-2 bg-[var(--danger)] disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {busy ? 'Revoking…' : 'Revoke'}
              </button>
              <button
                type="button" onClick={() => setConfirmRevoke(null)} disabled={busy}
                className="px-3.5 py-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

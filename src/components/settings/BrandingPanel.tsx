'use client'

/**
 * Marca de la organizacion aplicada a los PDF que ve el cliente.
 *
 * El logo se redimensiona en el navegador antes de guardarlo. Sin eso, una
 * foto de 4 MB del telefono entraria entera a la base y a cada carga de esta
 * pantalla; ademas el PDF no gana nada con mas de 600 px de ancho.
 */

import React, { useEffect, useRef, useState } from 'react'
import { getOrganizationBranding, saveOrganizationBranding } from '@/app/settings/actions'
import { DEFAULT_BRANDING, type OrganizationBranding } from '@/lib/branding'

const MAX_LOGO_WIDTH = 600
const MAX_LOGO_HEIGHT = 240

async function resizeLogo(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('That file is not a valid image.'))
    el.src = dataUrl
  })

  const scale = Math.min(1, MAX_LOGO_WIDTH / img.width, MAX_LOGO_HEIGHT / img.height)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image.')
  ctx.drawImage(img, 0, 0, w, h)

  // PNG conserva la transparencia del logo, que es lo normal en una marca.
  // Si sale muy pesado se cae a JPEG sobre fondo blanco.
  let out = canvas.toDataURL('image/png')
  if (out.length > 700_000) {
    const flat = document.createElement('canvas')
    flat.width = w
    flat.height = h
    const fctx = flat.getContext('2d')!
    fctx.fillStyle = '#ffffff'
    fctx.fillRect(0, 0, w, h)
    fctx.drawImage(img, 0, 0, w, h)
    out = flat.toDataURL('image/jpeg', 0.9)
  }
  return out
}

export default function BrandingPanel({
  active,
  showToast,
}: {
  active: boolean
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void
}) {
  const [loading, setLoading] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [saved, setSaved] = useState<OrganizationBranding>(DEFAULT_BRANDING)
  const [draft, setDraft] = useState<OrganizationBranding>(DEFAULT_BRANDING)
  const [busy, setBusy] = useState(false)
  const requested = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!active || requested.current) return
    requested.current = true
    setLoading(true)
    getOrganizationBranding()
      .then(res => {
        if (res.error) {
          showToast(res.error, 'error')
          return
        }
        setSaved(res.branding)
        setDraft(res.branding)
        setOrgName(res.organizationName)
        setCanEdit(res.canEdit)
      })
      .catch(() => showToast('Could not load branding.', 'error'))
      .finally(() => setLoading(false))
  }, [active, showToast])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const set = (patch: Partial<OrganizationBranding>) => setDraft(d => ({ ...d, ...patch }))

  const handleLogo = async (file: File | undefined) => {
    if (!file) return
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      showToast('The logo must be a PNG or JPEG image.', 'error')
      return
    }
    try {
      set({ logoDataUrl: await resizeLogo(file) })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not read that image.', 'error')
    }
  }

  const handleSave = async () => {
    setBusy(true)
    const res = await saveOrganizationBranding(draft)
    setBusy(false)
    if (res.error) {
      showToast(res.error, 'error')
      return
    }
    setSaved(draft)
    showToast('Branding saved. New PDFs will use it.')
  }

  const field = (
    label: string,
    key: keyof OrganizationBranding,
    placeholder: string,
    type = 'text',
  ) => (
    <div>
      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        disabled={!canEdit || busy}
        value={(draft[key] as string) || ''}
        onChange={e => set({ [key]: e.target.value } as Partial<OrganizationBranding>)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Branding</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Your logo, color and contact details on the PDFs your clients receive.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-tertiary)]">Loading branding…</p>
      ) : (
        <>
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-44 shrink-0">
                <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Logo</span>
                <div className="h-24 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
                  {draft.logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logoDataUrl} alt="Company logo" className="max-h-20 max-w-[9rem] object-contain" />
                  ) : (
                    <span className="text-[10px] text-[var(--text-tertiary)] px-3 text-center">PNG or JPEG, under 500 KB</span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 mt-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={e => handleLogo(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={busy}
                      className="px-2.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      {draft.logoDataUrl ? 'Replace' : 'Upload'}
                    </button>
                    {draft.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => set({ logoDataUrl: null })}
                        disabled={busy}
                        className="px-2.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-[16rem] space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Accent color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={!canEdit || busy}
                      value={draft.primaryColor}
                      onChange={e => set({ primaryColor: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer disabled:opacity-60"
                    />
                    <input
                      type="text"
                      disabled={!canEdit || busy}
                      value={draft.primaryColor}
                      onChange={e => set({ primaryColor: e.target.value })}
                      className="w-28 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)]">Used for headings and rules in the PDF</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('Contact name', 'contactName', orgName || 'Company contact')}
                  {field('Contact email', 'contactEmail', 'name@company.com', 'email')}
                  {field('Phone', 'contactPhone', '(555) 555-5555')}
                  {field('Website', 'website', 'company.com')}
                  {field('License #', 'licenseNumber', 'e.g. LVU-000000')}
                  {field('Address', 'address', 'City, State')}
                </div>
              </div>
            </div>

            {/* Vista previa de la cabecera real del PDF, para no tener que
                generar un documento solo para ver como quedo el color. */}
            <div className="border-t border-[var(--border)] pt-4">
              <span className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">PDF header preview</span>
              <div className="bg-white rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: draft.primaryColor }}>
                      {orgName || 'Your organization'}
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1.5">Project name</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Design Package - today</div>
                  </div>
                  {draft.logoDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logoDataUrl} alt="" className="max-h-10 max-w-[7rem] object-contain" />
                  )}
                </div>
                <div className="h-[2px] mt-2 rounded" style={{ backgroundColor: draft.primaryColor }} />
              </div>
            </div>

            {canEdit ? (
              dirty && (
                <div className="flex gap-2 border-t border-[var(--border)] pt-4">
                  <button
                    type="button" onClick={handleSave} disabled={busy}
                    className="px-3.5 py-2 bg-[var(--accent)] disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                  >
                    {busy ? 'Saving…' : 'Save branding'}
                  </button>
                  <button
                    type="button" onClick={() => setDraft(saved)} disabled={busy}
                    className="px-3.5 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              )
            ) : (
              <p className="text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border)] pt-4">
                Only owners and admins can change branding.
              </p>
            )}
          </div>

          <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
            Branding applies to PDFs generated from now on. Documents already downloaded keep the look they had.
          </p>
        </>
      )}
    </div>
  )
}

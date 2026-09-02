'use client'

import React, { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ProjectDocumentItem {
  name: string
  size: number | null
  updatedAt: string | null
}

interface ProjectDocumentsClientProps {
  projectId: string
  canManage: boolean
  initialDocuments: ProjectDocumentItem[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iconFor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return '📄'
  if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext)) return '🖼️'
  if (['dwg', 'dxf'].includes(ext)) return '📐'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  return '📎'
}

export default function ProjectDocumentsClient({ projectId, canManage, initialDocuments }: ProjectDocumentsClientProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<ProjectDocumentItem[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const refreshList = async () => {
    const { data } = await supabase.storage.from('project-documents').list(projectId, {
      sortBy: { column: 'updated_at', order: 'desc' },
    })
    setDocuments(
      (data || [])
        .filter((f) => f.id)
        .map((f) => ({ name: f.name, size: f.metadata?.size ?? null, updatedAt: f.updated_at ?? null }))
    )
  }

  const handleView = async (name: string) => {
    setError(null)
    const { data, error: signError } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(`${projectId}/${name}`, 300)

    if (signError || !data?.signedUrl) {
      setError('No se pudo abrir el documento.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo debe pesar menos de 20MB.')
      return
    }

    setIsUploading(true)
    setError(null)

    const safeName = file.name.replace(/[^a-zA-Z0-9_.\-]/g, '_')
    const path = `${projectId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from('project-documents').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      setError(`No se pudo subir el archivo: ${uploadError.message}`)
    } else {
      await refreshList()
    }

    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (name: string) => {
    setError(null)
    const { error: deleteError } = await supabase.storage.from('project-documents').remove([`${projectId}/${name}`])
    if (deleteError) {
      setError('No se pudo eliminar el documento.')
    } else {
      await refreshList()
    }
    setPendingDelete(null)
  }

  return (
    <div className="space-y-2 font-sans">
      {canManage && (
        <div>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" id="doc-upload-input" />
          <label
            htmlFor="doc-upload-input"
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-[var(--accent-border)] text-[var(--accent-text)] text-xs font-bold cursor-pointer transition-all ${
              isUploading ? 'opacity-50 pointer-events-none' : 'active:scale-[0.98]'
            }`}
          >
            {isUploading ? 'Subiendo...' : '+ Subir documento'}
          </label>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      {documents.length === 0 ? (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 text-center">
          <p className="text-xs text-[var(--text-secondary)]">No hay documentos cargados para este proyecto.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3"
            >
              <span className="text-lg shrink-0">{iconFor(doc.name)}</span>
              <button
                type="button"
                onClick={() => handleView(doc.name)}
                className="min-w-0 flex-1 text-left cursor-pointer"
              >
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{doc.name.replace(/^\d+-/, '')}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{formatSize(doc.size)}</p>
              </button>
              {canManage &&
                (pendingDelete === doc.name ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.name)}
                      className="text-[10px] font-bold text-red-500 px-1.5 cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="text-[10px] font-bold text-[var(--text-secondary)] px-1.5 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(doc.name)}
                    className="shrink-0 text-[var(--text-tertiary)] hover:text-red-500 p-1 cursor-pointer"
                    aria-label="Eliminar documento"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

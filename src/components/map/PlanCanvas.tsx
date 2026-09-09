'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  getFloorPlans,
  getFloorPlanFileUrl,
  uploadFloorPlan,
  updateFloorPlanCalibration,
  deleteFloorPlan,
  placeCameraOnPlan,
  updateCameraPlanPosition,
} from '@/app/projects/actions-floorplans'

interface FloorPlan {
  id: string
  floor_label: string
  sort_order: number
  file_path: string
  file_type: 'pdf' | 'image'
  image_width_px: number | null
  image_height_px: number | null
  scale_calibration: { point_a: { x: number; y: number }; point_b: { x: number; y: number }; real_distance_m: number } | null
}

interface PlanCameraMarker {
  id: string
  camera_id_tag: string
  plan_x: number | null
  plan_y: number | null
  status: string
  floor_plan_id: string | null
}

interface PlanCanvasProps {
  projectId: string
  module: 'cameras' | 'fiber'
  cameras: PlanCameraMarker[]
  addCameraMode: boolean
  selectedCameraId: string | null
  onSelectCamera: (id: string) => void
  /** Recibe la camara recien creada para insertarla en el estado sin recargar. */
  onCameraPlaced: (camera: unknown) => void
  /** Herramientas contextuales (Add Camera, etc.) renderizadas en esta barra. */
  toolsSlot?: React.ReactNode
}

const statusColor = (status: string) => {
  switch (status) {
    case 'installed':
    case 'complete':
      return 'var(--success)'
    case 'in_progress':
      return 'var(--accent)'
    default:
      return 'var(--pending)'
  }
}

export default function PlanCanvas({
  projectId,
  module,
  cameras,
  addCameraMode,
  selectedCameraId,
  onSelectCamera,
  onCameraPlaced,
  toolsSlot,
}: PlanCanvasProps) {
  const [plans, setPlans] = useState<FloorPlan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [calibPoints, setCalibPoints] = useState<{ x: number; y: number }[]>([])
  const [calibDistance, setCalibDistance] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  // zoom === null => ajustar a pantalla. Un numero es el factor sobre el
  // tamano nativo. Las coordenadas se guardan en px nativos, asi que el zoom
  // no afecta ni la calibracion ni la posicion de las camaras.
  const [zoom, setZoom] = useState<number | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  // UI propia en vez de window.prompt/alert/confirm (dialogos nativos: rompen
  // la estetica de la app y bloquean el hilo del navegador).
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<{
    fileName: string
    isPdf: boolean
    dataUrl?: string // solo imagenes
    width?: number
    height?: number
    pdfBuffer?: ArrayBuffer // solo PDF, se renderiza al confirmar
    pageCount?: number
  } | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [preparing, setPreparing] = useState(false) // leyendo/analizando el PDF
  const [pdfImportAll, setPdfImportAll] = useState(true)
  const [pdfPage, setPdfPage] = useState('1')
  const [placing, setPlacing] = useState(false) // guardando una camara

  const activePlan = plans.find(p => p.id === activePlanId) || null

  const refreshPlans = useCallback(async () => {
    setLoading(true)
    const data = await getFloorPlans(projectId, module)
    setPlans(data as FloorPlan[])
    if (data.length > 0 && !activePlanId) {
      setActivePlanId(data[0].id)
    }
    setLoading(false)
  }, [projectId, module, activePlanId])

  useEffect(() => {
    refreshPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, module])

  useEffect(() => {
    if (!activePlan) {
      setImageUrl(null)
      return
    }
    setImgLoaded(false)
    setNaturalSize(null)
    setZoom(null) // cada plano arranca ajustado a pantalla
    getFloorPlanFileUrl(activePlan.file_path).then(setImageUrl)
  }, [activePlan?.file_path])

  // Paso 1: leer el archivo y abrir el dialogo propio para pedir la etiqueta.
  // Un PDF se convierte a imagen (ver src/lib/pdfToImage.ts) para que la
  // calibracion y la colocacion de camaras funcionen igual que con una imagen.
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg(null)

    const isPdf = file.type === 'application/pdf'

    if (isPdf) {
      setPreparing(true)
      try {
        const buffer = await file.arrayBuffer()
        const { getPdfPageCount } = await import('@/lib/pdfToImage')
        const pageCount = await getPdfPageCount(buffer)
        setPendingUpload({
          fileName: file.name,
          isPdf: true,
          pdfBuffer: buffer,
          pageCount,
        })
        setPendingLabel(`Floor ${plans.length + 1}`)
        setPdfImportAll(pageCount > 1)
        setPdfPage('1')
      } catch (err) {
        console.error('PDF read failed:', err)
        setErrorMsg('That PDF could not be opened. If it is password-protected, export it as an image instead.')
      } finally {
        setPreparing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setErrorMsg('Could not read that file. Please try again.')
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.width, h: img.height })
        img.onerror = () => resolve(null)
        img.src = dataUrl
      })
      if (!dims) {
        setErrorMsg('That image could not be opened. Try a PNG or JPG export of the plan.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setPendingUpload({ dataUrl, fileName: file.name, isPdf: false, width: dims.w, height: dims.h })
      setPendingLabel(`Floor ${plans.length + 1}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  // Paso 2: confirmar la etiqueta y subir.
  const confirmUpload = async () => {
    if (!pendingUpload) return
    const fallback = `Floor ${plans.length + 1}`
    const label = pendingLabel.trim() || fallback
    setUploading(true)

    try {
      // ── Imagen: un solo registro, camino directo ──
      if (!pendingUpload.isPdf) {
        const result = await uploadFloorPlan({
          projectId,
          module,
          floorLabel: label,
          fileType: 'image',
          fileBase64: pendingUpload.dataUrl!,
          fileName: pendingUpload.fileName,
          imageWidthPx: pendingUpload.width,
          imageHeightPx: pendingUpload.height,
        })
        if (result.error) {
          setErrorMsg(`Upload failed: ${result.error}`)
          return
        }
        await refreshPlans()
        if (result.data) setActivePlanId(result.data.id)
        setPendingUpload(null)
        setPendingLabel('')
        return
      }

      // ── PDF: renderizar la(s) pagina(s) elegida(s) y subir cada una ──
      const total = pendingUpload.pageCount ?? 1
      let wanted: number[]
      if (pdfImportAll) {
        wanted = Array.from({ length: total }, (_, i) => i + 1)
      } else {
        const n = parseInt(pdfPage, 10)
        if (!n || n < 1 || n > total) {
          setErrorMsg(`Enter a page between 1 and ${total}.`)
          return
        }
        wanted = [n]
      }

      const { renderPdfPages } = await import('@/lib/pdfToImage')
      const rendered = await renderPdfPages(pendingUpload.pdfBuffer!, wanted)
      if (rendered.length === 0) {
        setErrorMsg('No pages could be rendered from that PDF.')
        return
      }

      const baseName = pendingUpload.fileName.replace(/\.pdf$/i, '')
      let firstId: string | null = null
      for (const pageImg of rendered) {
        const pageLabel = rendered.length > 1 ? `${label} — p.${pageImg.pageNumber}` : label
        const result = await uploadFloorPlan({
          projectId,
          module,
          floorLabel: pageLabel,
          // Se guarda como imagen: ya es un PNG/JPG renderizado.
          fileType: 'image',
          fileBase64: pageImg.dataUrl,
          fileName: `${baseName}-p${pageImg.pageNumber}.png`,
          imageWidthPx: pageImg.width,
          imageHeightPx: pageImg.height,
        })
        if (result.error) {
          setErrorMsg(`Upload failed on page ${pageImg.pageNumber}: ${result.error}`)
          await refreshPlans()
          return
        }
        if (!firstId && result.data) firstId = result.data.id
      }

      await refreshPlans()
      if (firstId) setActivePlanId(firstId)
      setPendingUpload(null)
      setPendingLabel('')
    } catch (err) {
      console.error('Upload failed:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!imgRef.current) return null
    const rect = imgRef.current.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    // Guardamos en coordenadas nativas de la imagen (0..width, 0..height)
    // para que la calibración de escala sea consistente sin importar el zoom.
    const nativeW = imgRef.current.naturalWidth || rect.width
    const nativeH = imgRef.current.naturalHeight || rect.height
    return { x: xPct * nativeW, y: yPct * nativeH }
  }

  const handleImageClick = async (e: React.MouseEvent) => {
    if (!imgLoaded) return // evita coordenadas mal calculadas antes de que la imagen termine de cargar
    const coords = getRelativeCoords(e)
    if (!coords || !activePlan) return

    if (calibrating) {
      // Un tercer clic reinicia la calibración con ese punto como el nuevo
      // primer punto, en vez de acumular un tercer punto que rompe el flujo
      // de "elegí 2 puntos" (el input de distancia solo se muestra con
      // exactamente 2).
      const next = calibPoints.length >= 2 ? [coords] : [...calibPoints, coords]
      setCalibPoints(next)
      setCalibDistance('')
      return
    }

    if (addCameraMode) {
      if (placing) return // evita duplicar si se hace doble clic
      setPlacing(true)
      try {
        const result = await placeCameraOnPlan({
          projectId,
          floorPlanId: activePlan.id,
          planX: coords.x,
          planY: coords.y,
        })
        if (result.error) {
          setErrorMsg(`Could not place camera: ${result.error}`)
        } else if (result.data) {
          // Se entrega la camara creada para insertarla en el estado del
          // padre. Antes se recargaba la pagina entera, lo que hacia
          // desaparecer y reaparecer el plano en cada clic.
          onCameraPlaced(result.data)
        }
      } finally {
        setPlacing(false)
      }
    }
  }

  const saveCalibration = async () => {
    if (!activePlan || calibPoints.length !== 2 || !calibDistance) return
    const dist = parseFloat(calibDistance)
    if (!dist || dist <= 0) {
      setErrorMsg('Enter a valid distance in meters.')
      return
    }
    const result = await updateFloorPlanCalibration({
      floorPlanId: activePlan.id,
      projectId,
      pointA: calibPoints[0],
      pointB: calibPoints[1],
      realDistanceM: dist,
    })
    if (result.error) {
      setErrorMsg(`Calibration failed: ${result.error}`)
    } else {
      await refreshPlans()
      setCalibrating(false)
      setCalibPoints([])
      setCalibDistance('')
    }
  }

  const pxToPct = (px: number, dim: number) => (dim ? (px / dim) * 100 : 0)

  const planCameras = cameras.filter(c => c.floor_plan_id === activePlanId && c.plan_x != null && c.plan_y != null)

  // Dialogos propios (reemplazan window.prompt / confirm). Se renderizan tanto
  // en el estado vacio como en la vista normal, porque el primer plano se sube
  // desde el estado vacio.
  const dialogs = (
    <>
      {pendingUpload && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-2xl p-4 flex flex-col gap-3 text-left">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Name this plan</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Give the floor or area a label so you can switch between plans.
              </p>
            </div>
            <input
              autoFocus
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !uploading) confirmUpload()
                if (e.key === 'Escape' && !uploading) setPendingUpload(null)
              }}
              placeholder="e.g. Floor 1, Basement, Warehouse"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-primary)] w-full"
            />
            {pendingUpload.isPdf && (pendingUpload.pageCount ?? 1) > 1 && (
              <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[11px] font-bold text-[var(--text-primary)]">
                  This PDF has {pendingUpload.pageCount} pages
                </p>
                <label className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="radio"
                    checked={pdfImportAll}
                    onChange={() => setPdfImportAll(true)}
                    disabled={uploading}
                  />
                  Import every page as its own floor
                </label>
                <label className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="radio"
                    checked={!pdfImportAll}
                    onChange={() => setPdfImportAll(false)}
                    disabled={uploading}
                  />
                  Only page
                  <input
                    type="number"
                    min={1}
                    max={pendingUpload.pageCount}
                    value={pdfPage}
                    onChange={e => { setPdfImportAll(false); setPdfPage(e.target.value) }}
                    disabled={uploading}
                    className="w-16 px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-1)] text-[11px] text-[var(--text-primary)]"
                  />
                </label>
              </div>
            )}

            <p className="text-[10px] text-[var(--text-tertiary)] truncate">{pendingUpload.fileName}</p>

            {pendingUpload.isPdf && (
              <p className="text-[10px] text-[var(--text-tertiary)]">
                The PDF is converted to an image so you can calibrate the scale and place cameras on it.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setPendingUpload(null); setPendingLabel('') }}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent)] text-white disabled:opacity-50"
              >
                {uploading ? (pendingUpload.isPdf ? 'Converting…' : 'Uploading…') : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && activePlan && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-2xl p-4 flex flex-col gap-3 text-left">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Delete “{activePlan.floor_label}”?
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              The plan file will be removed. Cameras placed on it will be unlinked from the plan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const result = await deleteFloorPlan(activePlan.id, projectId)
                  setConfirmingDelete(false)
                  if (result?.error) {
                    setErrorMsg(`Delete failed: ${result.error}`)
                    return
                  }
                  setActivePlanId(null)
                  await refreshPlans()
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--danger)] text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--text-tertiary)]">
        Loading floor plans…
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-sm font-bold text-[var(--text-primary)]">No floor plan uploaded yet</p>
        <p className="text-[11px] text-[var(--text-secondary)] max-w-xs">
          Upload a PDF or image of the building floor plan to place cameras on it instead of the map.
        </p>
        <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || preparing}
          className="px-4 py-2 bg-[var(--accent)] text-white font-bold text-xs rounded-lg disabled:opacity-50"
        >
          {preparing ? 'Reading…' : uploading ? 'Uploading…' : 'Upload Floor Plan'}
        </button>

        {errorMsg && (
          <div className="mt-1 px-3 py-2 rounded-lg bg-[var(--danger-soft,#fee2e2)] border border-[var(--danger)]/30 text-[11px] text-[var(--danger)] flex items-center gap-3 max-w-sm">
            <span className="flex-1 text-left">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {dialogs}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Floor selector + upload + calibrate */}
      <div className="flex items-center gap-2 p-2 bg-[var(--surface-1)] border-b border-[var(--border)] shrink-0 overflow-x-auto">
        {/* Herramientas del padre: viven junto al plano, no en una barra aparte. */}
        {toolsSlot && (
          <>
            {toolsSlot}
            <div className="w-px h-5 bg-[var(--border)] shrink-0" />
          </>
        )}
        {plans.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlanId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
              activePlanId === p.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            {p.floor_label}
          </button>
        ))}
        <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || preparing}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] whitespace-nowrap disabled:opacity-50"
        >
          {preparing ? 'Reading…' : uploading ? 'Uploading…' : '+ Add Floor'}
        </button>

        <div className="flex-1" />

        {activePlan?.file_type === 'image' && (
          <div className="flex items-center gap-1 mr-1 shrink-0">
            <button
              onClick={() => setZoom(z => Math.max(0.1, (z ?? 1) - 0.25))}
              title="Zoom out"
              className="w-7 h-7 rounded-lg text-[13px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              −
            </button>
            <button
              onClick={() => setZoom(null)}
              title="Fit plan to screen"
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${
                zoom === null
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              {zoom === null ? 'Fit' : `${Math.round(zoom * 100)}%`}
            </button>
            <button
              onClick={() => setZoom(z => Math.min(8, (z ?? 1) + 0.25))}
              title="Zoom in"
              className="w-7 h-7 rounded-lg text-[13px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              +
            </button>
          </div>
        )}

        {activePlan?.file_type === 'image' && (
          <button
            onClick={() => {
              setCalibrating(!calibrating)
              setCalibPoints([])
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
              calibrating ? 'bg-amber-600 text-white' : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            {calibrating ? 'Cancel Calibration' : activePlan.scale_calibration ? 'Re-calibrate Scale' : 'Calibrate Scale'}
          </button>
        )}

        {activePlan && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--danger)] whitespace-nowrap"
          >
            Delete
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="px-3 py-2 bg-[var(--danger-soft,#fee2e2)] border-b border-[var(--danger)]/30 text-[11px] text-[var(--danger)] flex items-center gap-3 shrink-0">
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="px-2 py-0.5 rounded font-bold border border-[var(--danger)]/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {calibrating && (
        <div className="p-2 bg-[var(--warn-soft)] border-b border-amber-200 text-[11px] text-[var(--text-primary)] flex items-center gap-3 shrink-0">
          <span>
            {calibPoints.length === 0 && 'Click two points on the plan a known distance apart.'}
            {calibPoints.length === 1 && 'Click the second point.'}
            {calibPoints.length === 2 && 'Enter the real-world distance between those two points:'}
          </span>
          {calibPoints.length === 2 && (
            <>
              <input
                type="number"
                value={calibDistance}
                onChange={e => setCalibDistance(e.target.value)}
                placeholder="meters"
                className="w-20 px-2 py-1 rounded border border-[var(--border)] text-xs"
              />
              <button onClick={saveCalibration} className="px-3 py-1 bg-[var(--accent)] text-white rounded font-bold">
                Save
              </button>
            </>
          )}
        </div>
      )}

      {/* Plan viewport */}
      <div ref={containerRef} className="flex-1 relative overflow-auto bg-[var(--surface-3)] flex items-start justify-center">
        {activePlan?.file_type === 'pdf' ? (
          <iframe src={imageUrl ?? undefined} className="w-full h-full border-0" title="Floor plan PDF" />
        ) : imageUrl ? (
          // shrink-wrap exacto a la imagen: si el wrapper fuera mas ancho que
          // la imagen (p.ej. min-w-full con un plano angosto), los marcadores
          // se posicionan en % del wrapper y quedan corridos.
          <div className="relative shrink-0" style={{ lineHeight: 0 }}>
            <img
              ref={imgRef}
              src={imageUrl}
              alt={activePlan?.floor_label}
              className={`block ${zoom === null ? 'max-w-full max-h-full' : 'max-w-none'} ${placing ? 'cursor-wait' : addCameraMode || calibrating ? 'cursor-crosshair' : ''}`}
              style={zoom !== null && naturalSize ? { width: naturalSize.w * zoom, height: naturalSize.h * zoom } : undefined}
              onClick={handleImageClick}
              onLoad={(e) => {
                const el = e.currentTarget
                setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight })
                setImgLoaded(true)
              }}
              draggable={false}
            />

            {/* Camera markers */}
            {planCameras.map(cam => (
              <button
                key={cam.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectCamera(cam.id)
                }}
                title={cam.camera_id_tag}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center text-[8px] font-bold text-white"
                style={{
                  left: `${pxToPct(cam.plan_x!, activePlan?.image_width_px || imgRef.current?.naturalWidth || 1)}%`,
                  top: `${pxToPct(cam.plan_y!, activePlan?.image_height_px || imgRef.current?.naturalHeight || 1)}%`,
                  backgroundColor: statusColor(cam.status),
                  outline: selectedCameraId === cam.id ? '2px solid var(--accent)' : 'none',
                  outlineOffset: '2px',
                }}
              >
                📷
              </button>
            ))}

            {/* Calibration points */}
            {calibPoints.map((p, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-white"
                style={{
                  left: `${pxToPct(p.x, activePlan?.image_width_px || imgRef.current?.naturalWidth || 1)}%`,
                  top: `${pxToPct(p.y, activePlan?.image_height_px || imgRef.current?.naturalHeight || 1)}%`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--text-tertiary)]">
            Loading plan…
          </div>
        )}

        {placing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] shadow-lg text-[11px] font-bold text-[var(--text-primary)] px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            Saving camera…
          </div>
        )}

        {!activePlan?.scale_calibration && activePlan?.file_type === 'image' && !calibrating && (
          <div className="absolute bottom-3 left-3 bg-[var(--warn-soft)] border border-amber-200 text-[var(--warn)] text-[10px] font-bold px-3 py-1.5 rounded-lg">
            ⚠️ Not calibrated — distances/cable measurements on this plan won&apos;t be accurate until you set the scale.
          </div>
        )}
      </div>

      {dialogs}
    </div>
  )
}

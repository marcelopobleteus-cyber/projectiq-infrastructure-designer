/**
 * Conversión de PDF a imagen en el navegador (pdf.js).
 *
 * Por qué: la colocación de cámaras, la calibración de escala y los marcadores
 * del PlanCanvas trabajan sobre píxeles nativos de una imagen. Convirtiendo
 * cada página del PDF a PNG al momento de subirla, todo ese flujo —ya
 * verificado en producción— funciona igual para un PDF, sin necesidad de
 * mantener un segundo camino de render.
 */

// Ancho/alto máximo del PNG generado. Un plano arquitectónico a escala 3x
// puede superar los 10.000 px por lado y reventar tanto la memoria del canvas
// como el límite de 25MB del Server Action.
const MAX_DIMENSION = 4000
// Margen respecto al bodySizeLimit de 25MB (el base64 agrega ~33%).
const MAX_DATA_URL_BYTES = 18 * 1024 * 1024

export interface PdfPageImage {
  dataUrl: string
  width: number
  height: number
  pageNumber: number
}

type PdfModule = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfModule> | null = null

async function loadPdfjs(): Promise<PdfModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      // El worker se empaqueta localmente: un worker desde CDN quedaría
      // bloqueado por CSP y además ataría la app a una red externa.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()
      return pdfjs
    })()
  }
  return pdfjsPromise
}

function base64Bytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

/** Cantidad de páginas del PDF. */
export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  const pdfjs = await loadPdfjs()
  // pdf.js se queda con el buffer (lo neutraliza), por eso se pasa una copia.
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise
  const n = doc.numPages
  await doc.destroy()
  return n
}

/**
 * Renderiza páginas del PDF a PNG.
 * @param pages números de página (1-based). Si se omite, todas.
 */
export async function renderPdfPages(
  data: ArrayBuffer,
  pages?: number[],
): Promise<PdfPageImage[]> {
  const pdfjs = await loadPdfjs()
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise

  try {
    const targets =
      pages && pages.length > 0
        ? pages.filter(p => p >= 1 && p <= doc.numPages)
        : Array.from({ length: doc.numPages }, (_, i) => i + 1)

    const out: PdfPageImage[] = []

    for (const pageNumber of targets) {
      const page = await doc.getPage(pageNumber)

      // Se parte de 2x para que el texto del plano quede legible al hacer
      // zoom, y se baja si excede el límite de dimensiones.
      const base = page.getViewport({ scale: 1 })
      const desired = 2
      const capped = Math.min(
        desired,
        MAX_DIMENSION / base.width,
        MAX_DIMENSION / base.height,
      )
      const scale = Math.max(0.5, capped)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create a canvas to render the PDF.')

      // Fondo blanco: un PDF sin fondo se renderiza transparente y luego se
      // ve negro sobre el visor oscuro.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvas, canvasContext: ctx, viewport }).promise

      let dataUrl = canvas.toDataURL('image/png')
      // Un plano grande en PNG puede pasarse del límite del Server Action;
      // JPEG conserva la legibilidad a una fracción del tamaño.
      if (base64Bytes(dataUrl) > MAX_DATA_URL_BYTES) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      }

      out.push({
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        pageNumber,
      })

      page.cleanup()
      // Liberar el canvas: en un PDF de muchas páginas, dejarlos vivos agota
      // la memoria de canvas del navegador.
      canvas.width = 0
      canvas.height = 0
    }

    return out
  } finally {
    await doc.destroy()
  }
}

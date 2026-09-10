/**
 * Generacion de PDF real del proyecto (pdf-lib, en el navegador).
 *
 * Reemplaza el mock de Reports que solo mostraba un toast.
 *
 * Por que pdf-lib y no jsPDF: jsPDF arrastra canvg/html2canvas como
 * dependencias opcionales, y con ellas core-js, que ejecuta un script de
 * postinstall. En pnpm 10+ eso corta el `pnpm install` de Vercel con
 * ERR_PNPM_IGNORED_BUILDS. pdf-lib no tiene scripts de instalacion, no
 * depende del DOM, y dibuja texto vectorial de verdad (no una captura del
 * canvas), asi que el PDF queda seleccionable y nitido al imprimir.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { ProjectReportData } from '@/app/projects/actions-reports'

// Carta en puntos. Se usa Letter y no A4 porque los proyectos son en EE.UU.
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const INK = rgb(0.09, 0.11, 0.15)
const MUTED = rgb(0.42, 0.45, 0.5)
const RULE = rgb(0.85, 0.87, 0.89)
const ACCENT = rgb(0, 0.6, 0.45)
const ZEBRA = rgb(0.96, 0.97, 0.98)

interface Ctx {
  doc: PDFDocument
  page: PDFPage
  y: number
  font: PDFFont
  bold: PDFFont
  mono: PDFFont
  pageNumber: number
  footerLabel: string
}

function newPage(ctx: Ctx) {
  drawFooter(ctx)
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  ctx.pageNumber += 1
  ctx.y = PAGE_HEIGHT - MARGIN
}

/** Reserva vertical: si no cabe lo que sigue, abre pagina antes de dibujarlo. */
function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 28) newPage(ctx)
}

function drawFooter(ctx: Ctx) {
  ctx.page.drawText(ctx.footerLabel, {
    x: MARGIN,
    y: MARGIN - 18,
    size: 7,
    font: ctx.font,
    color: MUTED,
  })
  const label = `Page ${ctx.pageNumber}`
  const w = ctx.font.widthOfTextAtSize(label, 7)
  ctx.page.drawText(label, {
    x: PAGE_WIDTH - MARGIN - w,
    y: MARGIN - 18,
    size: 7,
    font: ctx.font,
    color: MUTED,
  })
}

/**
 * pdf-lib lanza si el texto trae caracteres fuera de WinAnsi (un guion largo
 * pegado desde Word, por ejemplo). Como el texto viene de lo que el usuario
 * escribio, se sanea siempre en vez de confiar.
 */
function safe(text: string): string {
  return (text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = safe(text)
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean
  let out = clean
  while (out.length > 1 && font.widthOfTextAtSize(out + '...', size) > maxWidth) {
    out = out.slice(0, -1)
  }
  return out + '...'
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function heading(ctx: Ctx, text: string) {
  ensure(ctx, 34)
  ctx.y -= 6
  ctx.page.drawText(safe(text).toUpperCase(), {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.bold,
    color: ACCENT,
  })
  ctx.y -= 6
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.75,
    color: RULE,
  })
  ctx.y -= 14
}

function paragraph(ctx: Ctx, text: string, size = 9) {
  ctx.y -= 4
  for (const line of wrap(text, ctx.font, size, CONTENT_WIDTH)) {
    ensure(ctx, size + 4)
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size, font: ctx.font, color: INK })
    ctx.y -= size + 4
  }
}

/** Fila de indicadores grandes: el numero manda, la etiqueta acompana. */
function statRow(ctx: Ctx, stats: { label: string; value: string }[]) {
  if (stats.length === 0) return
  ensure(ctx, 44)
  const cell = CONTENT_WIDTH / stats.length
  const top = ctx.y
  stats.forEach((s, i) => {
    const x = MARGIN + cell * i
    ctx.page.drawText(truncate(s.value, ctx.bold, 17, cell - 8), {
      x,
      y: top - 16,
      size: 17,
      font: ctx.bold,
      color: INK,
    })
    ctx.page.drawText(truncate(s.label.toUpperCase(), ctx.font, 7, cell - 8), {
      x,
      y: top - 28,
      size: 7,
      font: ctx.font,
      color: MUTED,
    })
  })
  ctx.y = top - 42
}

interface Column {
  header: string
  /** Ancho en proporcion del ancho util */
  width: number
  align?: 'left' | 'right'
}

function table(ctx: Ctx, columns: Column[], rows: string[][]) {
  const totalUnits = columns.reduce((s, c) => s + c.width, 0)
  const widths = columns.map(c => (c.width / totalUnits) * CONTENT_WIDTH)
  const size = 7.5
  const rowHeight = 14

  const drawHeader = () => {
    ensure(ctx, rowHeight * 2)
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - rowHeight + 4,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: ZEBRA,
    })
    let x = MARGIN + 4
    columns.forEach((col, i) => {
      const text = truncate(col.header.toUpperCase(), ctx.bold, size, widths[i] - 8)
      const w = ctx.bold.widthOfTextAtSize(text, size)
      ctx.page.drawText(text, {
        x: col.align === 'right' ? x + widths[i] - 8 - w : x,
        y: ctx.y - rowHeight + 8,
        size,
        font: ctx.bold,
        color: MUTED,
      })
      x += widths[i]
    })
    ctx.y -= rowHeight
  }

  drawHeader()

  rows.forEach((row, rowIndex) => {
    // Si la fila no cabe, la cabecera se repite en la pagina nueva: una tabla
    // sin encabezado en la hoja 2 es ilegible para quien la recibe impresa.
    if (ctx.y - rowHeight < MARGIN + 28) {
      newPage(ctx)
      drawHeader()
    }
    if (rowIndex % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - rowHeight + 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: ZEBRA,
      })
    }
    let x = MARGIN + 4
    columns.forEach((col, i) => {
      const font = col.align === 'right' ? ctx.mono : ctx.font
      const text = truncate(row[i] ?? '', font, size, widths[i] - 8)
      const w = font.widthOfTextAtSize(text, size)
      ctx.page.drawText(text, {
        x: col.align === 'right' ? x + widths[i] - 8 - w : x,
        y: ctx.y - rowHeight + 8,
        size,
        font,
        color: INK,
      })
      x += widths[i]
    })
    ctx.y -= rowHeight
  })

  ctx.y -= 6
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function createCtx(data: ProjectReportData, label: string): Promise<Ctx> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  doc.setTitle(`${data.project.name} - ${label}`)
  doc.setProducer('NextQ Infrastructure Designer')
  doc.setCreator('NextQ Infrastructure Designer')

  return {
    doc,
    page,
    y: PAGE_HEIGHT - MARGIN,
    font,
    bold,
    mono,
    pageNumber: 1,
    footerLabel: `${safe(data.organizationName)} - ${safe(data.project.name)} - ${label}`,
  }
}

function documentHeader(ctx: Ctx, data: ProjectReportData, title: string) {
  ctx.page.drawText(safe(data.organizationName).toUpperCase(), {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  })
  ctx.y -= 24
  ctx.page.drawText(truncate(data.project.name, ctx.bold, 20, CONTENT_WIDTH), {
    x: MARGIN,
    y: ctx.y,
    size: 20,
    font: ctx.bold,
    color: INK,
  })
  ctx.y -= 16
  ctx.page.drawText(`${safe(title)}  ·  ${formatDate(data.generatedAt)}`.replace('·', '-'), {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.font,
    color: MUTED,
  })
  ctx.y -= 10
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 1.5,
    color: ACCENT,
  })
  ctx.y -= 22
}

/**
 * Reporte simple: una hoja, para revisar en campo o mandar por correo sin
 * que nadie tenga que leer 6 paginas.
 */
export async function buildSimpleReport(data: ProjectReportData): Promise<Uint8Array> {
  const ctx = await createCtx(data, 'Site Report')
  documentHeader(ctx, data, 'Site Report')

  statRow(ctx, [
    { label: 'Cameras', value: String(data.cameraTotals.total) },
    { label: 'Task progress', value: `${data.tasks.percentComplete}%` },
    { label: 'Network devices', value: String(data.network.deviceCount) },
    { label: 'Material cost', value: money(data.bom.totalCost) },
  ])

  if (data.project.description) {
    heading(ctx, 'Project')
    paragraph(ctx, data.project.description)
    ctx.y -= 4
  }

  heading(ctx, 'Field progress')
  table(
    ctx,
    [
      { header: 'Task status', width: 3 },
      { header: 'Count', width: 1, align: 'right' },
    ],
    [
      ['Complete', String(data.tasks.completed)],
      ['In progress', String(data.tasks.inProgress)],
      ['Not started', String(data.tasks.notStarted)],
      ['Blocked', String(data.tasks.blocked)],
      ['Total', String(data.tasks.total)],
    ]
  )

  heading(ctx, 'Camera placement')
  table(
    ctx,
    [
      { header: 'Where', width: 3 },
      { header: 'Cameras', width: 1, align: 'right' },
    ],
    [
      ['Placed on a floor plan', String(data.cameraTotals.onFloorPlan)],
      ['Placed on the map', String(data.cameraTotals.onMap)],
      ['Not placed yet', String(data.cameraTotals.unplaced)],
    ]
  )

  // Las camaras sin colocar son el dato accionable del reporte: se dicen,
  // no se esconden en un total.
  if (data.cameraTotals.unplaced > 0) {
    paragraph(
      ctx,
      `${data.cameraTotals.unplaced} camera(s) still have no location. They are counted in the totals above but cannot be found in the field.`
    )
  }

  heading(ctx, 'Cost summary')
  table(
    ctx,
    [
      { header: 'Line', width: 3 },
      { header: 'Amount', width: 1, align: 'right' },
    ],
    [
      ['Contractor-supplied', money(data.bom.contractorCost)],
      ['Owner-supplied (OFCI)', money(data.bom.ownerSuppliedCost)],
      ['Total material and labor cost', money(data.bom.totalCost)],
    ]
  )

  paragraph(
    ctx,
    'Costs shown are internal cost, not a client quote. Margin and tax are not applied.',
    8
  )

  drawFooter(ctx)
  return ctx.doc.save()
}

/**
 * Documento completo: lo que se le manda al cliente o se archiva como
 * as-built del diseno.
 */
export async function buildProjectDocument(data: ProjectReportData): Promise<Uint8Array> {
  const ctx = await createCtx(data, 'Design Package')
  documentHeader(ctx, data, 'Design Package')

  heading(ctx, 'Overview')
  paragraph(
    ctx,
    data.project.description ||
      'No project description has been entered. Add one in the project settings and regenerate this document.'
  )
  ctx.y -= 4
  table(
    ctx,
    [
      { header: 'Field', width: 1 },
      { header: 'Value', width: 2 },
    ],
    [
      ['Project', data.project.name],
      ['Status', data.project.status],
      ['Disciplines', data.project.disciplines.join(', ') || 'Not set'],
      ['Prepared by', data.organizationName],
      ['Generated', formatDate(data.generatedAt)],
    ]
  )

  statRow(ctx, [
    { label: 'Cameras', value: String(data.cameraTotals.total) },
    { label: 'Network devices', value: String(data.network.deviceCount) },
    { label: 'PoE budget', value: `${data.network.poeBudgetWatts} W` },
    { label: 'Task progress', value: `${data.tasks.percentComplete}%` },
  ])

  heading(ctx, 'Camera schedule')
  if (data.cameras.length === 0) {
    paragraph(ctx, 'No cameras have been added to this project yet.')
  } else {
    table(
      ctx,
      [
        { header: 'Tag', width: 1.1 },
        { header: 'Model', width: 2.8 },
        { header: 'Lens', width: 0.9 },
        { header: 'Res.', width: 0.9 },
        { header: 'Ht (ft)', width: 0.7, align: 'right' },
        { header: 'Link', width: 0.9 },
        { header: 'Placement', width: 1.4 },
        { header: 'Status', width: 1 },
      ],
      data.cameras.map(c => [
        c.tag,
        c.model,
        c.lens || '-',
        c.resolution || '-',
        c.mountingHeightFt != null ? String(c.mountingHeightFt) : '-',
        c.communicationType || '-',
        c.placement,
        c.status,
      ])
    )
  }

  heading(ctx, 'Bill of materials')
  if (data.bom.items.length === 0) {
    paragraph(ctx, 'No materials have been added to this project yet.')
  } else {
    table(
      ctx,
      [
        { header: 'Description', width: 3.4 },
        { header: 'Part number', width: 1.5 },
        { header: 'Category', width: 1.1 },
        { header: 'Qty', width: 0.7, align: 'right' },
        { header: 'Unit', width: 0.6 },
        { header: 'Unit cost', width: 1, align: 'right' },
        { header: 'Total', width: 1.1, align: 'right' },
      ],
      data.bom.items.map(i => [
        i.description,
        i.partNumber,
        i.category,
        String(i.quantity),
        i.unit,
        money(i.unitCost),
        money(i.totalCost),
      ])
    )

    table(
      ctx,
      [
        { header: 'Summary', width: 3 },
        { header: 'Amount', width: 1, align: 'right' },
      ],
      [
        ['Contractor-supplied', money(data.bom.contractorCost)],
        ['Owner-supplied (OFCI)', money(data.bom.ownerSuppliedCost)],
        ['Total cost', money(data.bom.totalCost)],
      ]
    )

    paragraph(
      ctx,
      'Amounts are internal cost. Margin, markup and tax are not included in this document.',
      8
    )
  }

  drawFooter(ctx)
  return ctx.doc.save()
}

/** Dispara la descarga en el navegador. */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Sin esto el blob queda retenido hasta que se cierre la pestana.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

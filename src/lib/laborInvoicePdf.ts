/**
 * Dibujo de la factura de labor (PDF).
 *
 * Replica el formato que NextQ ya usa: banda azul con el nombre de la empresa,
 * bloque BILL TO / FROM, panel de metadatos a la derecha con el balance
 * destacado, tabla de lineas por periodo y totales al pie.
 *
 * Vive fuera del server action a proposito, igual que payStatementPdf: asi la
 * maquetacion se puede generar y revisar sin levantar la app ni tocar la base.
 *
 * Esto es un documento de cobro. Los montos se reciben ya calculados desde el
 * server action; aqui no se recalcula nada, solo se dibuja, para que no existan
 * dos verdades sobre cuanto se cobra.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface InvoiceLine {
  /** "08/31/2026 - 09/06/2026 - Crew Labor" o "Fuel Reimbursement" */
  description: string
  hours: number
  rate: number
  labor: number
  reimbursement: number
  lineTotal: number
}

export interface InvoiceParty {
  name: string
  addressLines: string[]
  phone?: string | null
  email?: string | null
  website?: string | null
}

/** Un dia trabajado, tal como quedo en la tarjeta. */
export interface DetailDay {
  /** ISO yyyy-mm-dd */
  date: string
  employee: string
  project: string
  clockIn: string
  clockOut: string
  hours: number
}

/** Un gasto incluido en el reembolso. */
export interface DetailExpense {
  date: string
  vendor: string
  description: string
  project: string
  amount: number
}

export interface InvoiceDetail {
  days: DetailDay[]
  expenses: DetailExpense[]
}

export interface InvoiceInput {
  invoiceNumber: string
  /** ISO yyyy-mm-dd */
  invoiceDate: string
  paymentTerms: string
  projectOrPo: string
  billTo: InvoiceParty
  from: InvoiceParty
  lines: InvoiceLine[]
  laborSubtotal: number
  reimbursements: number
  otherOrTax: number
  balanceDue: number
  notes: string
  /**
   * Anexo con el respaldo dia por dia. Ausente = factura simple de una pagina.
   * Va en hoja aparte y no mezclado con las lineas de cobro: quien aprueba el
   * pago mira el total, y quien lo audita da vuelta la hoja.
   */
  detail?: InvoiceDetail
}

const NAVY = rgb(0.11, 0.20, 0.35)
const INK = rgb(0.09, 0.11, 0.15)
const MUTED = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.82, 0.84, 0.88)
const BAND = rgb(0.90, 0.93, 0.96)

const MARGIN = 48
const PAGE_W = 612
const PAGE_H = 792

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const num = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
}

/** Corta el texto para que nunca se salga de su columna. */
function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let out = text
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

/** Parte un parrafo en lineas que caben en maxWidth. */
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      cur = next
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

export async function buildLaborInvoicePdf(input: InvoiceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const reg = await pdf.embedFont(StandardFonts.Helvetica)

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  const right = PAGE_W - MARGIN
  let y = PAGE_H

  const text = (s: string, x: number, yy: number, size: number, font = reg, color = INK) =>
    page.drawText(s, { x, y: yy, size, font, color })

  const textRight = (s: string, xRight: number, yy: number, size: number, font = reg, color = INK) =>
    page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y: yy, size, font, color })

  // ---- Banda del encabezado -------------------------------------------------
  const bandH = 52
  y = PAGE_H - 34 - bandH
  page.drawRectangle({ x: MARGIN, y, width: right - MARGIN, height: bandH, color: NAVY })
  text(input.from.name.toUpperCase(), MARGIN + 16, y + 19, 17, bold, rgb(1, 1, 1))
  textRight('INVOICE', right - 16, y + 19, 17, bold, rgb(1, 1, 1))

  y -= 16
  const fromTag = [input.from.addressLines[0], input.from.website].filter(Boolean).join(' | ')
  text(fromTag, MARGIN, y, 8, reg, MUTED)

  // ---- BILL TO / FROM / metadatos ------------------------------------------
  const colBill = MARGIN
  const colFrom = MARGIN + 190
  const metaX = MARGIN + 372
  const metaW = right - metaX
  const yLeft = y - 26

  // Las direcciones se ENVUELVEN, no se truncan: una direccion cortada con "…"
  // en una factura es un error de cobranza, no un detalle estetico. El nombre si
  // se trunca, porque una razon social larga no cambia a donde llega el pago.
  const PARTY_W = 175
  const party = (label: string, p: InvoiceParty, x: number, startY: number): number => {
    let yy = startY
    text(label, x, yy, 8, bold, INK); yy -= 13
    text(fit(reg, p.name, 9, PARTY_W), x, yy, 9, reg); yy -= 12
    const rest = [
      ...p.addressLines.filter(Boolean),
      ...(p.phone ? [`Phone: ${p.phone}`] : []),
      ...(p.email ? [`Email: ${p.email}`] : []),
    ]
    for (const l of rest) {
      for (const piece of wrap(reg, l, 9, PARTY_W)) {
        text(piece, x, yy, 9, reg); yy -= 12
      }
    }
    return yy
  }

  const yAfterBill = party('BILL TO', input.billTo, colBill, yLeft)
  const yAfterFrom = party('FROM', input.from, colFrom, yLeft)

  // Panel derecho: etiqueta a la izquierda, valor a la derecha.
  let yMeta = yLeft
  const metaRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      page.drawRectangle({ x: metaX - 8, y: yMeta - 5, width: metaW + 8, height: 18, color: BAND })
    }
    text(label, metaX, yMeta, 8.5, bold, highlight ? INK : INK)
    textRight(value, right, yMeta, 8.5, highlight ? bold : reg, INK)
    yMeta -= 21
  }
  metaRow('Invoice #', input.invoiceNumber)
  metaRow('Invoice Date', fmtDate(input.invoiceDate))
  metaRow('Payment Terms', input.paymentTerms)
  metaRow('Project / PO', fit(reg, input.projectOrPo, 8.5, metaW - 84))
  metaRow('Balance Due', money(input.balanceDue), true)

  // ---- Tabla de lineas ------------------------------------------------------
  y = Math.min(yAfterBill, yAfterFrom, yMeta) - 24

  // Columnas numericas: se definen por su BORDE DERECHO, de derecha a izquierda,
  // restando el ancho que cada una necesita. Definirlas como offsets desde el
  // margen izquierdo fue el error que hacia que Reimb. y Line Total se pisaran.
  const PAD = 10
  const cTotal = right - PAD   // Line Total
  const cReimb = cTotal - 66
  const cLabor = cReimb - 66
  const cRate = cLabor - 60
  const cHours = cRate - 54
  const descX = MARGIN + PAD
  const descW = cHours - 48 - descX

  const headH = 22
  page.drawRectangle({ x: MARGIN, y: y - headH + 6, width: right - MARGIN, height: headH, color: NAVY })
  const hy = y - headH + 13
  text('Service Period / Description', descX, hy, 8.5, bold, rgb(1, 1, 1))
  textRight('Hours', cHours, hy, 8.5, bold, rgb(1, 1, 1))
  textRight('Rate', cRate, hy, 8.5, bold, rgb(1, 1, 1))
  textRight('Labor', cLabor, hy, 8.5, bold, rgb(1, 1, 1))
  textRight('Reimb.', cReimb, hy, 8.5, bold, rgb(1, 1, 1))
  textRight('Line Total', cTotal, hy, 8.5, bold, rgb(1, 1, 1))
  y -= headH + 4

  const rowH = 26
  for (const l of input.lines) {
    // Salto de pagina antes de dibujar, no despues: una fila nunca queda cortada.
    if (y - rowH < MARGIN + 150) {
      page = pdf.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
    const ty = y - 17
    text(fit(reg, l.description, 9, descW), descX, ty, 9, reg)
    textRight(num(l.hours), cHours, ty, 9, reg)
    textRight(money(l.rate), cRate, ty, 9, reg)
    textRight(money(l.labor), cLabor, ty, 9, reg)
    textRight(money(l.reimbursement), cReimb, ty, 9, reg)
    textRight(money(l.lineTotal), cTotal, ty, 9, reg)
    y -= rowH
    page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 0.7, color: LINE })
  }

  // ---- Totales --------------------------------------------------------------
  y -= 26
  const totalRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      page.drawRectangle({ x: cLabor - 96, y: y - 6, width: right - (cLabor - 96), height: 20, color: NAVY })
      text(label, cLabor - 88, y, 9.5, bold, rgb(1, 1, 1))
      textRight(value, cTotal, y, 9.5, bold, rgb(1, 1, 1))
    } else {
      text(label, cLabor - 88, y, 9, bold, INK)
      textRight(value, cTotal, y, 9, reg, INK)
    }
    y -= 22
  }
  totalRow('Labor Subtotal', money(input.laborSubtotal))
  totalRow('Reimbursements', money(input.reimbursements))
  totalRow('Other / Tax', money(input.otherOrTax))
  totalRow('BALANCE DUE', money(input.balanceDue), true)

  // ---- Notas ----------------------------------------------------------------
  y -= 18
  text('Notes / Payment Instructions', MARGIN, y, 9, bold, NAVY)
  y -= 14
  for (const line of wrap(reg, input.notes, 8.5, right - MARGIN)) {
    text(line, MARGIN, y, 8.5, reg, INK)
    y -= 12
  }

  // ---- Anexo: respaldo dia por dia -----------------------------------------
  if (input.detail && (input.detail.days.length > 0 || input.detail.expenses.length > 0)) {
    page = pdf.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN

    text('SUPPORTING DETAIL', MARGIN, y, 13, bold, NAVY)
    y -= 14
    text(
      `Invoice ${input.invoiceNumber} — ${fmtDate(input.invoiceDate)}`,
      MARGIN, y, 8.5, reg, MUTED,
    )
    y -= 26

    // Columnas del anexo: mismo criterio que la tabla principal, borde derecho
    // primero y de derecha a izquierda.
    const dHours = right
    const dOut = dHours - 52
    const dIn = dOut - 46
    const dProjX = MARGIN + 132
    const dProjW = dIn - 46 - dProjX

    const sectionHead = (title: string, cols: [string, number][]) => {
      if (y < MARGIN + 60) {
        page = pdf.addPage([PAGE_W, PAGE_H])
        y = PAGE_H - MARGIN
      }
      text(title, MARGIN, y, 9.5, bold, NAVY)
      y -= 15
      page.drawRectangle({ x: MARGIN, y: y - 5, width: right - MARGIN, height: 16, color: BAND })
      for (const [label, xRight] of cols) {
        if (xRight < 0) text(label, -xRight, y, 8, bold, INK)
        else textRight(label, xRight, y, 8, bold, INK)
      }
      y -= 20
    }

    const rowGuard = () => {
      if (y < MARGIN + 30) {
        page = pdf.addPage([PAGE_W, PAGE_H])
        y = PAGE_H - MARGIN
      }
    }

    if (input.detail.days.length > 0) {
      sectionHead('Days worked', [
        [ 'Date', -MARGIN ], [ 'Project', -dProjX ],
        [ 'In', dIn ], [ 'Out', dOut ], [ 'Hours', dHours ],
      ])
      let dayTotal = 0
      for (const d of input.detail.days) {
        rowGuard()
        text(fmtDate(d.date), MARGIN, y, 8.5, reg)
        text(fit(reg, d.project, 8.5, dProjW), dProjX, y, 8.5, reg)
        textRight(d.clockIn, dIn, y, 8.5, reg)
        textRight(d.clockOut, dOut, y, 8.5, reg)
        textRight(num(d.hours), dHours, y, 8.5, reg)
        dayTotal += d.hours
        y -= 14
      }
      y -= 2
      page.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: right, y: y + 6 }, thickness: 0.7, color: LINE })
      text('Total hours', dProjX, y - 6, 8.5, bold, INK)
      textRight(num(Math.round(dayTotal * 10000) / 10000), dHours, y - 6, 8.5, bold, INK)
      y -= 34
    }

    if (input.detail.expenses.length > 0) {
      sectionHead('Expenses included in reimbursement', [
        [ 'Date', -MARGIN ], [ 'Vendor / Description', -dProjX ], [ 'Amount', dHours ],
      ])
      let expTotal = 0
      for (const e of input.detail.expenses) {
        rowGuard()
        text(fmtDate(e.date), MARGIN, y, 8.5, reg)
        const label = [e.vendor, e.description].filter(Boolean).join(' — ')
        text(fit(reg, label, 8.5, dHours - 60 - dProjX), dProjX, y, 8.5, reg)
        textRight(money(e.amount), dHours, y, 8.5, reg)
        expTotal += e.amount
        y -= 14
        if (e.project) {
          rowGuard()
          text(fit(reg, e.project, 7.5, dHours - 60 - dProjX), dProjX, y + 2, 7.5, reg, MUTED)
          y -= 11
        }
      }
      y -= 2
      page.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: right, y: y + 6 }, thickness: 0.7, color: LINE })
      text('Total expenses', dProjX, y - 6, 8.5, bold, INK)
      textRight(money(Math.round(expTotal * 100) / 100), dHours, y - 6, 8.5, bold, INK)
      y -= 30
    }

    rowGuard()
    text(
      'This sheet supports the amounts on the invoice. Hours come from the crew time cards; expenses from their receipts.',
      MARGIN, y, 7.5, reg, MUTED,
    )
  }

  return pdf.save()
}

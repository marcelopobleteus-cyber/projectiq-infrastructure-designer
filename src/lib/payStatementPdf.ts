/**
 * Dibujo del comprobante de pago por labor (PDF).
 *
 * Vive fuera del server action a proposito: asi se puede generar y revisar el
 * documento sin levantar la aplicacion ni tocar la base, que es como se valido
 * la maquetacion antes de publicarlo.
 *
 * NO es una liquidacion de sueldo legal: muestra lo devengado (bruto), sin
 * retenciones ni impuestos, y el pie del documento lo dice.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface StatementWeek {
  week_start: string
  employment_type: string
  regular_hours: number
  overtime_hours: number
  total_hours: number
  hourly_rate: number | null
  total_cost: number | null
}

export interface StatementDay {
  work_day: string
  project_name: string
  clock_in: string
  clock_out: string
  paused_minutes: number
  hours: number
}

export interface StatementInput {
  organizationName: string
  organizationAddress?: string | null
  employeeName: string
  employeeTitle?: string | null
  timeZone: string
  from: string
  to: string
  weeks: StatementWeek[]
  days: StatementDay[]
}

const INK = rgb(0.09, 0.11, 0.15)
const MUTED = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.85, 0.87, 0.9)
const ACCENT = rgb(0.02, 0.36, 0.6)

const MARGIN = 48
const PAGE_W = 612
const PAGE_H = 792

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtDate(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function weekRange(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const s = new Date(Date.UTC(y, m - 1, d))
  const e = new Date(s); e.setUTCDate(e.getUTCDate() + 6)
  const f = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${f(s)} – ${f(e)}`
}

function fmtTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: tz,
  })
}

export async function buildStatementPdf(input: StatementInput): Promise<Uint8Array> {
  const { organizationName: orgName, organizationAddress, employeeName, employeeTitle, timeZone: tz, from, to, weeks, days } = input
  const org = { name: orgName, address: organizationAddress }
  const employmentType = String(weeks[0]?.employment_type || 'w2').toUpperCase()
  const rate = weeks[0]?.hourly_rate === null || weeks[0]?.hourly_rate === undefined ? null : Number(weeks[0].hourly_rate)

  const totals = weeks.reduce(
    (a, w) => ({
      regular: a.regular + Number(w.regular_hours),
      overtime: a.overtime + Number(w.overtime_hours),
      hours: a.hours + Number(w.total_hours),
      pay: a.pay + Number(w.total_cost ?? 0),
    }),
    { regular: 0, overtime: 0, hours: 0, pay: 0 }
  )

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const text = (s: string, x: number, size = 9, f: PDFFont = font, color = INK) =>
    page.drawText(s, { x, y, size, font: f, color })

  const right = (s: string, xRight: number, size = 9, f: PDFFont = font, color = INK) =>
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color })

  const rule = (yy: number, color = LINE) =>
    page.drawLine({
      start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy },
      thickness: 0.75, color,
    })

  /** Salta de pagina cuando ya no cabe otra fila. */
  const ensureRoom = (needed: number) => {
    if (y - needed > MARGIN + 40) return
    page = pdf.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN
  }

  // ── Encabezado ────────────────────────────────────────────────────────────
  text(org?.name || 'Company', MARGIN, 16, bold)
  right('LABOR PAYMENT STATEMENT', PAGE_W - MARGIN, 10, bold, ACCENT)
  y -= 14
  if (org?.address) { text(org.address, MARGIN, 8, font, MUTED); }
  right(`${fmtDate(from)} – ${fmtDate(to)}`, PAGE_W - MARGIN, 9, font, MUTED)
  y -= 10
  rule(y)
  y -= 20

  // ── Empleado ──────────────────────────────────────────────────────────────
  text('EMPLOYEE', MARGIN, 7.5, bold, MUTED)
  text('CLASSIFICATION', MARGIN + 200, 7.5, bold, MUTED)
  text('RATE', MARGIN + 340, 7.5, bold, MUTED)
  y -= 13
  text(employeeName, MARGIN, 11, bold)
  text(employmentType === '1099' ? '1099 — Contractor' : 'W2 — Employee', MARGIN + 200, 10, font)
  text(rate === null ? '—' : `${money(rate)} / hr`, MARGIN + 340, 10, font)
  y -= 12
  if (employeeTitle) text(employeeTitle, MARGIN, 8.5, font, MUTED)
  text(
    employmentType === '1099' ? 'All hours at straight time' : 'Overtime over 40 h/week at 1.5×',
    MARGIN + 200, 8, font, MUTED
  )
  y -= 22

  // ── Semanas ───────────────────────────────────────────────────────────────
  text('WEEKLY SUMMARY  (work week runs Monday to Sunday)', MARGIN, 8, bold, MUTED)
  y -= 13
  rule(y + 4)
  const cols = { week: MARGIN, reg: MARGIN + 250, ot: MARGIN + 320, tot: MARGIN + 390, amt: PAGE_W - MARGIN }
  text('Week', cols.week, 8, bold, MUTED)
  right('Regular', cols.reg, 8, bold, MUTED)
  right('Overtime', cols.ot, 8, bold, MUTED)
  right('Total h', cols.tot, 8, bold, MUTED)
  right('Amount', cols.amt, 8, bold, MUTED)
  y -= 6
  rule(y)
  y -= 14

  for (const w of weeks) {
    ensureRoom(16)
    text(weekRange(w.week_start), cols.week, 9)
    right(Number(w.regular_hours).toFixed(2), cols.reg, 9)
    right(Number(w.overtime_hours).toFixed(2), cols.ot, 9)
    right(Number(w.total_hours).toFixed(2), cols.tot, 9, bold)
    right(w.total_cost === null ? '—' : money(Number(w.total_cost)), cols.amt, 9)
    y -= 16
  }

  y -= 2
  rule(y + 8)
  y -= 6
  text('TOTAL', cols.week, 9.5, bold)
  right(totals.regular.toFixed(2), cols.reg, 9.5, bold)
  right(totals.overtime.toFixed(2), cols.ot, 9.5, bold)
  right(totals.hours.toFixed(2), cols.tot, 9.5, bold)
  right(rate === null ? '—' : money(totals.pay), cols.amt, 11, bold, ACCENT)
  y -= 28

  // ── Detalle diario, para que el monto se pueda verificar ──────────────────
  if (days.length > 0) {
    ensureRoom(60)
    text('DAILY DETAIL', MARGIN, 8, bold, MUTED)
    y -= 13
    rule(y + 4)
    const d = { day: MARGIN, proj: MARGIN + 110, in: MARGIN + 300, out: MARGIN + 370, brk: MARGIN + 450, hrs: PAGE_W - MARGIN }
    text('Date', d.day, 8, bold, MUTED)
    text('Project', d.proj, 8, bold, MUTED)
    text('In', d.in, 8, bold, MUTED)
    text('Out', d.out, 8, bold, MUTED)
    right('Break', d.brk, 8, bold, MUTED)
    right('Hours', d.hrs, 8, bold, MUTED)
    y -= 6
    rule(y)
    y -= 13

    for (const e of days) {
      ensureRoom(14)
      text(fmtDate(e.work_day), d.day, 8.5)
      const proj = String(e.project_name || 'Office')
      text(proj.length > 30 ? `${proj.slice(0, 29)}…` : proj, d.proj, 8.5)
      text(fmtTime(e.clock_in, tz), d.in, 8.5)
      text(fmtTime(e.clock_out, tz), d.out, 8.5)
      right(`${e.paused_minutes} min`, d.brk, 8.5)
      right(Number(e.hours).toFixed(2), d.hrs, 8.5, bold)
      y -= 14
    }
  }

  // ── Pie en todas las paginas ──────────────────────────────────────────────
  const issued = new Date().toLocaleString('en-US', { timeZone: tz })
  const pages = pdf.getPages()
  pages.forEach((pg, i) => {
    pg.drawLine({
      start: { x: MARGIN, y: MARGIN + 26 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 26 },
      thickness: 0.75, color: LINE,
    })
    pg.drawText(
      'Gross earnings for hours worked. This statement does not include taxes, withholdings or deductions.',
      { x: MARGIN, y: MARGIN + 14, size: 7, font, color: MUTED }
    )
    pg.drawText(`Issued ${issued} · ${org?.name || ''}`, { x: MARGIN, y: MARGIN + 4, size: 7, font, color: MUTED })
    const pageLabel = `Page ${i + 1} of ${pages.length}`
    pg.drawText(pageLabel, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(pageLabel, 7), y: MARGIN + 4, size: 7, font, color: MUTED,
    })
  })

  return await pdf.save()
}

// ─── Reporte global de nomina ────────────────────────────────────────────────

export interface PayrollReportRow extends StatementWeek {
  profile_id: string
  employee_name: string
}

export interface PayrollReportInput {
  organizationName: string
  organizationAddress?: string | null
  from: string
  to: string
  rows: PayrollReportRow[]
}

/**
 * Un documento con todos los empleados del periodo, para quien paga.
 *
 * Mantiene las semanas separadas por empleado — igual que la pantalla — porque
 * el sobretiempo es una regla semanal: juntar dos semanas en una sola linea
 * escondería sobre cuál se generó el recargo.
 */
export async function buildPayrollReportPdf(input: PayrollReportInput): Promise<Uint8Array> {
  const { organizationName, organizationAddress, from, to, rows } = input

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const text = (s: string, x: number, size = 9, f: PDFFont = font, color = INK) =>
    page.drawText(s, { x, y, size, font: f, color })
  const right = (s: string, xRight: number, size = 9, f: PDFFont = font, color = INK) =>
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color })
  const rule = (yy: number, color = LINE) =>
    page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy }, thickness: 0.75, color })

  const cols = {
    emp: MARGIN,
    type: MARGIN + 150,
    week: MARGIN + 195,
    reg: MARGIN + 320,
    ot: MARGIN + 378,
    tot: MARGIN + 436,
    amt: PAGE_W - MARGIN,
  }

  const header = () => {
    text(organizationName, MARGIN, 16, bold)
    right('PAYROLL REPORT', PAGE_W - MARGIN, 10, bold, ACCENT)
    y -= 14
    if (organizationAddress) text(organizationAddress, MARGIN, 8, font, MUTED)
    right(`${fmtDate(from)} – ${fmtDate(to)}`, PAGE_W - MARGIN, 9, font, MUTED)
    y -= 10
    rule(y)
    y -= 20
    text('All employees · work week runs Monday to Sunday', MARGIN, 8, bold, MUTED)
    y -= 14
    rule(y + 4)
    text('Employee', cols.emp, 8, bold, MUTED)
    text('Type', cols.type, 8, bold, MUTED)
    text('Week', cols.week, 8, bold, MUTED)
    right('Regular', cols.reg, 8, bold, MUTED)
    right('OT', cols.ot, 8, bold, MUTED)
    right('Total h', cols.tot, 8, bold, MUTED)
    right('Amount', cols.amt, 8, bold, MUTED)
    y -= 6
    rule(y)
    y -= 14
  }

  const ensureRoom = (needed: number) => {
    if (y - needed > MARGIN + 44) return
    page = pdf.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN
    header()
  }

  header()

  // Agrupado por empleado, conservando el orden en que vino.
  const byEmployee = new Map<string, PayrollReportRow[]>()
  for (const r of rows) {
    const list = byEmployee.get(r.profile_id) ?? []
    list.push(r)
    byEmployee.set(r.profile_id, list)
  }

  const grand = { regular: 0, overtime: 0, hours: 0, pay: 0 }
  let missingRate = 0

  for (const [, weeks] of byEmployee) {
    const sub = weeks.reduce(
      (a, w) => ({
        regular: a.regular + Number(w.regular_hours),
        overtime: a.overtime + Number(w.overtime_hours),
        hours: a.hours + Number(w.total_hours),
        pay: a.pay + Number(w.total_cost ?? 0),
      }),
      { regular: 0, overtime: 0, hours: 0, pay: 0 }
    )
    if (weeks[0].hourly_rate === null) missingRate++

    weeks.forEach((w, i) => {
      ensureRoom(16)
      if (i === 0) {
        const name = w.employee_name.length > 24 ? `${w.employee_name.slice(0, 23)}…` : w.employee_name
        text(name, cols.emp, 9, bold)
        text(String(w.employment_type).toUpperCase(), cols.type, 8, font, MUTED)
      }
      text(weekRange(w.week_start), cols.week, 8.5)
      right(Number(w.regular_hours).toFixed(2), cols.reg, 8.5)
      right(Number(w.overtime_hours).toFixed(2), cols.ot, 8.5)
      right(Number(w.total_hours).toFixed(2), cols.tot, 8.5, bold)
      right(w.total_cost === null ? '—' : money(Number(w.total_cost)), cols.amt, 8.5)
      y -= 15
    })

    if (weeks.length > 1) {
      ensureRoom(16)
      text('subtotal', cols.week, 8, bold, MUTED)
      right(sub.regular.toFixed(2), cols.reg, 8.5, bold)
      right(sub.overtime.toFixed(2), cols.ot, 8.5, bold)
      right(sub.hours.toFixed(2), cols.tot, 8.5, bold)
      right(weeks[0].hourly_rate === null ? '—' : money(sub.pay), cols.amt, 8.5, bold)
      y -= 15
    }

    grand.regular += sub.regular
    grand.overtime += sub.overtime
    grand.hours += sub.hours
    if (weeks[0].hourly_rate !== null) grand.pay += sub.pay
    y -= 5
  }

  ensureRoom(40)
  rule(y + 8)
  y -= 6
  text(`TOTAL · ${byEmployee.size} employee${byEmployee.size === 1 ? '' : 's'}`, cols.emp, 9.5, bold)
  right(grand.regular.toFixed(2), cols.reg, 9.5, bold)
  right(grand.overtime.toFixed(2), cols.ot, 9.5, bold)
  right(grand.hours.toFixed(2), cols.tot, 9.5, bold)
  right(money(grand.pay), cols.amt, 11, bold, ACCENT)
  y -= 20

  if (missingRate > 0) {
    ensureRoom(20)
    text(
      `${missingRate} employee${missingRate === 1 ? '' : 's'} without an hourly rate — their hours are counted, their cost is not.`,
      MARGIN, 8, font, rgb(0.72, 0.45, 0.05)
    )
  }

  const issued = new Date().toLocaleString('en-US')
  const pages = pdf.getPages()
  pages.forEach((pg, i) => {
    pg.drawLine({
      start: { x: MARGIN, y: MARGIN + 26 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 26 },
      thickness: 0.75, color: LINE,
    })
    pg.drawText(
      'Gross earnings for hours worked. This report does not include taxes, withholdings or deductions.',
      { x: MARGIN, y: MARGIN + 14, size: 7, font, color: MUTED }
    )
    pg.drawText(`Issued ${issued} · ${organizationName}`, { x: MARGIN, y: MARGIN + 4, size: 7, font, color: MUTED })
    const label = `Page ${i + 1} of ${pages.length}`
    pg.drawText(label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 7), y: MARGIN + 4, size: 7, font, color: MUTED,
    })
  })

  return await pdf.save()
}

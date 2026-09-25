/**
 * Feriados federales de Estados Unidos.
 *
 * Se calculan en vez de guardarse en una tabla porque las reglas son fijas desde
 * 1971 (Uniform Monday Holiday Act) y Juneteenth desde 2021. Una tabla habria
 * que ir llenandola cada ano, y el ano que nadie la llene la pantalla mentiria
 * en silencio.
 *
 * Son los 11 feriados FEDERALES. Georgia observa algunos dias extra para
 * empleados estatales; esos no entran aqui a proposito, porque lo que importa
 * para facturar es el dia que el prime no trabaja por obligacion.
 */

export interface FederalHoliday {
  /** ISO yyyy-mm-dd del dia en que efectivamente no se trabaja. */
  date: string
  name: string
  /**
   * true cuando la fecha real cayo en fin de semana y el feriado se corre.
   * El 4 de julio en sabado se observa el viernes 3: ese viernes es el dia sin
   * trabajo, y es el que tiene que salir marcado.
   */
  observed: boolean
}

const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Dia de la semana de una fecha, 0 domingo .. 6 sabado, sin zona horaria. */
const dow = (y: number, m: number, d: number): number =>
  new Date(Date.UTC(y, m - 1, d)).getUTCDay()

/** n-esimo <weekday> del mes. weekday: 0 domingo .. 6 sabado. */
function nthWeekday(y: number, m: number, weekday: number, n: number): number {
  const firstDow = dow(y, m, 1)
  const offset = (weekday - firstDow + 7) % 7
  return 1 + offset + (n - 1) * 7
}

/** Ultimo <weekday> del mes. */
function lastWeekday(y: number, m: number, weekday: number): number {
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lastDow = dow(y, m, daysInMonth)
  return daysInMonth - ((lastDow - weekday + 7) % 7)
}

/**
 * Corre al viernes anterior o al lunes siguiente cuando cae en fin de semana.
 * Solo aplica a los feriados de fecha fija; los que ya son un lunes o un jueves
 * definido nunca necesitan correrse.
 */
function observedFixed(y: number, m: number, d: number): { date: string; observed: boolean } {
  const w = dow(y, m, d)
  if (w === 6) {
    const dt = new Date(Date.UTC(y, m - 1, d - 1))
    return { date: dt.toISOString().slice(0, 10), observed: true }
  }
  if (w === 0) {
    const dt = new Date(Date.UTC(y, m - 1, d + 1))
    return { date: dt.toISOString().slice(0, 10), observed: true }
  }
  return { date: iso(y, m, d), observed: false }
}

/** Los 11 feriados federales de un ano, con la fecha en que se observan. */
export function federalHolidays(year: number): FederalHoliday[] {
  const fixed = (m: number, d: number, name: string): FederalHoliday => {
    const o = observedFixed(year, m, d)
    return { date: o.date, name, observed: o.observed }
  }
  const floating = (m: number, day: number, name: string): FederalHoliday => ({
    date: iso(year, m, day),
    name,
    observed: false,
  })

  return [
    fixed(1, 1, "New Year's Day"),
    floating(1, nthWeekday(year, 1, 1, 3), 'Martin Luther King Jr. Day'),
    floating(2, nthWeekday(year, 2, 1, 3), "Washington's Birthday"),
    floating(5, lastWeekday(year, 5, 1), 'Memorial Day'),
    fixed(6, 19, 'Juneteenth'),
    fixed(7, 4, 'Independence Day'),
    floating(9, nthWeekday(year, 9, 1, 1), 'Labor Day'),
    floating(10, nthWeekday(year, 10, 1, 2), 'Columbus Day'),
    fixed(11, 11, 'Veterans Day'),
    floating(11, nthWeekday(year, 11, 4, 4), 'Thanksgiving Day'),
    fixed(12, 25, 'Christmas Day'),
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/** Los feriados que caen dentro de un rango, cruzando los anos que haga falta. */
export function federalHolidaysBetween(from: string, to: string): FederalHoliday[] {
  const y1 = Number(from.slice(0, 4))
  const y2 = Number(to.slice(0, 4))
  const out: FederalHoliday[] = []
  for (let y = y1; y <= y2; y++) {
    for (const h of federalHolidays(y)) {
      if (h.date >= from && h.date <= to) out.push(h)
    }
  }
  return out
}

/** Busqueda directa por fecha; null cuando ese dia no es feriado. */
export function holidayOn(isoDay: string): FederalHoliday | null {
  const y = Number(isoDay.slice(0, 4))
  return federalHolidays(y).find(h => h.date === isoDay) ?? null
}

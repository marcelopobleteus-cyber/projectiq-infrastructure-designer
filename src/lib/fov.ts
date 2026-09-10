/**
 * Cono de vision de la camara: geometria compartida por el mapa y el plano.
 *
 * Una sola fuente de verdad a proposito. El mapa trabaja en lat/lng y el plano
 * en pixeles de la imagen; si cada uno calculara su propio cono, la misma
 * camara terminaria mostrando coberturas distintas segun donde se mire, que es
 * exactamente el problema que ya tuvimos con el icono.
 *
 * Convencion de heading: 0 = norte, 90 = este, sentido horario (compas).
 */

export const FEET_PER_METER = 3.280839895
export const DEFAULT_FOV_DEGREES = 90
export const DEFAULT_RANGE_FT = 75
export const DEFAULT_HEADING_DEGREES = 0

/** Cuantos lados tiene el arco. 24 se ve curvo sin inflar el GeoJSON. */
const ARC_SEGMENTS = 24

export interface FovInput {
  /** Apertura horizontal en grados */
  fovDegrees: number
  /** Hacia donde apunta, en grados desde el norte */
  headingDegrees: number
  /** Alcance en pies */
  rangeFt: number
}

/**
 * Saca la apertura de la camara, y si no la tiene, del texto del modelo.
 *
 * El catalogo guarda el FOV como texto libre ("100°-36°" en una varifocal, que
 * es el rango entre gran angular y tele). Se toma el numero MAYOR: es la
 * posicion mas abierta, y dibujar la cobertura mas amplia posible es lo
 * honesto para un diseno preliminar — mostrar el angulo cerrado haria creer
 * que se cubre menos de lo que se cubre.
 */
export function resolveFovDegrees(
  cameraFov: number | null | undefined,
  modelFovText?: string | null,
): number {
  if (typeof cameraFov === 'number' && cameraFov > 0 && cameraFov <= 360) {
    return cameraFov
  }
  if (modelFovText) {
    const numbers = (modelFovText.match(/\d+(\.\d+)?/g) || [])
      .map(Number)
      .filter(n => n > 0 && n <= 360)
    if (numbers.length > 0) return Math.max(...numbers)
  }
  return DEFAULT_FOV_DEGREES
}

export function resolveRangeFt(rangeFt: number | null | undefined): number {
  if (typeof rangeFt === 'number' && rangeFt > 0) return rangeFt
  return DEFAULT_RANGE_FT
}

/**
 * Hacia donde apunta la camara, si no se cargo un heading explicito.
 *
 * Antes una camara sin heading simplemente no dibujaba cono (bug: con 35
 * camaras solo la 1 que alguien habia tocado a mano mostraba algo). El resto
 * de los campos del cono (FOV, alcance) ya tenian default — a este le faltaba
 * el suyo. Norte (0°) es una direccion arbitraria pero visible: el usuario la
 * corrige arrastrando el cono, no quedandose sin nada que arrastrar.
 */
export function resolveHeadingDegrees(headingDegrees: number | null | undefined): number {
  if (typeof headingDegrees === 'number' && Number.isFinite(headingDegrees)) {
    return normalizeHeading(headingDegrees)
  }
  return DEFAULT_HEADING_DEGREES
}

/** Normaliza cualquier angulo a [0, 360). */
export function normalizeHeading(deg: number): number {
  const v = deg % 360
  return v < 0 ? v + 360 : v
}

/**
 * Rumbo (0=norte, 90=este, sentido horario) desde un punto lat/lng hacia otro,
 * usando la misma aproximacion plana con correccion de coseno que
 * coneGeoJsonPolygon — para que el handle que se arrastra en el mapa calce
 * exactamente con el cono que ese mismo heading dibuja.
 */
export function bearingBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const metersPerDegLat = 111_320
  const cosLat = Math.cos((fromLat * Math.PI) / 180)
  const metersPerDegLng = metersPerDegLat * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat)
  const north = (toLat - fromLat) * metersPerDegLat
  const east = (toLng - fromLng) * metersPerDegLng
  if (Math.abs(north) < 1e-9 && Math.abs(east) < 1e-9) return 0
  return normalizeHeading((Math.atan2(east, north) * 180) / Math.PI)
}

/**
 * Distancia en pies entre dos lat/lng, con la misma aproximacion plana.
 * Coherente con bearingBetween: sirve para que arrastrar el handle de alcance
 * calcule el mismo numero de pies que despues dibuja coneGeoJsonPolygon.
 */
export function distanceFeetBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const metersPerDegLat = 111_320
  const cosLat = Math.cos((fromLat * Math.PI) / 180)
  const metersPerDegLng = metersPerDegLat * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat)
  const north = (toLat - fromLat) * metersPerDegLat
  const east = (toLng - fromLng) * metersPerDegLng
  return Math.sqrt(north * north + east * east) * FEET_PER_METER
}

/** Punto lat/lng a una distancia (pies) y rumbo dados desde un origen. */
export function destinationPoint(
  fromLat: number,
  fromLng: number,
  bearingDegrees: number,
  distanceFt: number,
): [number, number] {
  const metersPerDegLat = 111_320
  const cosLat = Math.cos((fromLat * Math.PI) / 180)
  const metersPerDegLng = metersPerDegLat * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat)
  const rad = (normalizeHeading(bearingDegrees) * Math.PI) / 180
  const meters = distanceFt / FEET_PER_METER
  const north = meters * Math.cos(rad)
  const east = meters * Math.sin(rad)
  return [fromLng + east / metersPerDegLng, fromLat + north / metersPerDegLat]
}

/**
 * Puntos del cono en coordenadas planas (x hacia la derecha, y hacia ABAJO,
 * como en una imagen o un canvas). heading 0 apunta hacia arriba.
 */
export function conePointsPlanar(
  cx: number,
  cy: number,
  headingDegrees: number,
  fovDegrees: number,
  radius: number,
): { x: number; y: number }[] {
  const half = Math.min(fovDegrees, 360) / 2
  const points = [{ x: cx, y: cy }]

  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = -half + (2 * half * i) / ARC_SEGMENTS
    const angle = normalizeHeading(headingDegrees + t)
    const rad = (angle * Math.PI) / 180
    // sin/-cos: 0 grados = arriba (norte), y crece hacia abajo en pantalla.
    points.push({
      x: cx + radius * Math.sin(rad),
      y: cy - radius * Math.cos(rad),
    })
  }

  return points
}

/** Path SVG cerrado del cono, para dibujar sobre el plano. */
export function conePlanPath(
  cx: number,
  cy: number,
  headingDegrees: number,
  fovDegrees: number,
  radiusPx: number,
): string {
  const pts = conePointsPlanar(cx, cy, headingDegrees, fovDegrees, radiusPx)
  return (
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
  )
}

/**
 * Poligono del cono en lng/lat para el mapa.
 *
 * Se usa la aproximacion plana con correccion por coseno de la latitud, no una
 * formula geodesica completa: a 3000 ft como maximo el error es de
 * centimetros, y evita traer una libreria solo para esto.
 */
export function coneGeoJsonPolygon(
  latitude: number,
  longitude: number,
  headingDegrees: number,
  fovDegrees: number,
  rangeFt: number,
): [number, number][] {
  const radiusMeters = rangeFt / FEET_PER_METER
  const metersPerDegLat = 111_320
  const cosLat = Math.cos((latitude * Math.PI) / 180)
  const metersPerDegLng = metersPerDegLat * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat)

  const half = Math.min(fovDegrees, 360) / 2
  const ring: [number, number][] = [[longitude, latitude]]

  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = -half + (2 * half * i) / ARC_SEGMENTS
    const rad = (normalizeHeading(headingDegrees + t) * Math.PI) / 180
    const north = radiusMeters * Math.cos(rad)
    const east = radiusMeters * Math.sin(rad)
    ring.push([longitude + east / metersPerDegLng, latitude + north / metersPerDegLat])
  }

  ring.push([longitude, latitude])
  return ring
}

// ---------------------------------------------------------------------------
// DORI / densidad de pixeles (EN 62676-4)
// ---------------------------------------------------------------------------

export interface DoriBand {
  key: 'identify' | 'recognize' | 'observe' | 'detect'
  label: string
  /** Densidad minima en pixeles por metro */
  ppm: number
  color: string
  /** Distancia maxima en pies a la que todavia se alcanza esa densidad */
  maxDistanceFt: number
}

/** Umbrales de la norma EN 62676-4, en pixeles por metro. */
export const DORI_THRESHOLDS: { key: DoriBand['key']; label: string; ppm: number; color: string }[] = [
  { key: 'identify', label: 'Identify', ppm: 250, color: '#16a34a' },
  { key: 'recognize', label: 'Recognize', ppm: 125, color: '#65a30d' },
  { key: 'observe', label: 'Observe', ppm: 62, color: '#ca8a04' },
  { key: 'detect', label: 'Detect', ppm: 25, color: '#ea580c' },
]

/**
 * Pixeles horizontales del sensor a partir del texto de resolucion.
 *
 * Acepta "1920x1080" (exacto) y "4MP" (aproximado suponiendo 16:9, que es lo
 * que usa practicamente todo el CCTV IP). Devuelve null si no se puede
 * deducir: es preferible no dibujar bandas DORI a dibujarlas sobre un supuesto
 * inventado, porque de esas distancias depende que alguien acepte o rechace
 * una posicion de camara.
 */
export function resolveHorizontalPixels(resolution?: string | null): number | null {
  if (!resolution) return null
  const text = resolution.trim().toLowerCase()

  const explicit = text.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/)
  if (explicit) return Number(explicit[1])

  const mp = text.match(/(\d+(\.\d+)?)\s*mp/)
  if (mp) {
    const megapixels = Number(mp[1])
    if (megapixels > 0) {
      // 16:9 => w*h = MP*1e6 y w/h = 16/9  =>  w = sqrt(MP*1e6*16/9)
      return Math.round(Math.sqrt(megapixels * 1_000_000 * (16 / 9)))
    }
  }

  return null
}

/**
 * Distancia maxima, en pies, a la que se mantiene una densidad de pixeles.
 *
 * En el ancho de escena que cubre la camara a distancia d:
 *   ancho = 2 * d * tan(fov/2)
 *   ppm   = pixelesHorizontales / ancho
 * despejando d para un ppm dado.
 */
export function distanceForPpm(horizontalPixels: number, fovDegrees: number, ppm: number): number {
  const halfRad = (Math.min(fovDegrees, 179.9) / 2) * (Math.PI / 180)
  const tan = Math.tan(halfRad)
  if (tan <= 0 || ppm <= 0) return 0
  const meters = horizontalPixels / (ppm * 2 * tan)
  return meters * FEET_PER_METER
}

/** Densidad de pixeles a una distancia dada, en pixeles por metro. */
export function ppmAtDistance(
  horizontalPixels: number,
  fovDegrees: number,
  distanceFt: number,
): number {
  if (distanceFt <= 0) return 0
  const meters = distanceFt / FEET_PER_METER
  const halfRad = (Math.min(fovDegrees, 179.9) / 2) * (Math.PI / 180)
  const widthMeters = 2 * meters * Math.tan(halfRad)
  if (widthMeters <= 0) return 0
  return horizontalPixels / widthMeters
}

/**
 * Bandas DORI ordenadas de la mas exigente a la menos, recortadas al alcance
 * del cono. Se devuelven solo las que caen dentro del alcance: una banda
 * dibujada mas alla del alcance declarado dice que se ve algo donde el
 * disenador ya dijo que no se ve.
 */
export function doriBands(
  horizontalPixels: number,
  fovDegrees: number,
  rangeFt: number,
): DoriBand[] {
  return DORI_THRESHOLDS.map(t => ({
    ...t,
    maxDistanceFt: Math.min(distanceForPpm(horizontalPixels, fovDegrees, t.ppm), rangeFt),
  })).filter(b => b.maxDistanceFt > 0)
}

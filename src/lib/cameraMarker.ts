/**
 * Icono de camara compartido entre el mapa GIS y el plano subido.
 *
 * Antes cada vista dibujaba lo suyo: el mapa un SVG de camara CCTV con colores
 * por estado, y el plano un circulo con un emoji y OTRA paleta distinta. La
 * misma camara se veia diferente segun donde se mirara. Este modulo es la
 * unica fuente de verdad para color e icono.
 */

export type CameraStatus = 'planned' | 'in_progress' | 'complete' | 'issue' | string

/** Color por estado. Unica definicion — antes estaba duplicada y divergida. */
export function getCameraStatusColor(status: CameraStatus): string {
  switch (status) {
    case 'in_progress':
      return '#3b82f6' // azul — en ejecucion
    case 'complete':
    case 'installed':
      return '#22c55e' // verde — instalada
    case 'issue':
      return '#ef4444' // rojo — con problema
    default:
      return '#eab308' // amarillo — planificada
  }
}

export const CAMERA_ICON_SIZE: [number, number] = [46, 60]
/** El ancla visual es el centro del circulo (23,23), no el centro de la caja. */
export const CAMERA_ICON_OFFSET: [number, number] = [0, 7]

/**
 * SVG del marcador: cuerpo de camara bullet, lente, modulo de video y una
 * pastilla con la etiqueta.
 * @param idSuffix sufijo unico para el filtro; sin el, varios SVG en la misma
 *   pagina comparten el id "ds" y el navegador aplica el primero a todos.
 */
export function createCameraMarkerSvg(
  status: CameraStatus,
  tag: string,
  isSelected = false,
  idSuffix = '',
): string {
  const color = getCameraStatusColor(status)
  const ringAttr = isSelected ? `stroke="white" stroke-width="3"` : ''
  const shortTag = tag.length > 9 ? tag.substring(0, 9) : tag
  const fid = `ds${idSuffix}`
  // La etiqueta va dentro del SVG: hay que escapar lo que venga del usuario.
  const safeTag = shortTag
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 46 60">`,
    `<defs><filter id="${fid}" x="-40%" y="-40%" width="180%" height="180%">`,
    `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter></defs>`,
    `<circle cx="23" cy="23" r="22" fill="${color}" filter="url(#${fid})" ${ringAttr}/>`,
    `<circle cx="23" cy="23" r="16" fill="#0f172a"/>`,
    `<rect x="10" y="17" width="14" height="11" rx="2.5" fill="${color}"/>`,
    `<circle cx="17" cy="22.5" r="4" fill="#0f172a"/>`,
    `<circle cx="17" cy="22.5" r="2" fill="${color}" opacity="0.32"/>`,
    `<path d="M25 18.5L34 15v15L25 26.5V18.5z" fill="${color}"/>`,
    `<rect x="1" y="47" width="44" height="12" rx="6" fill="#0f172a" opacity="0.93"/>`,
    `<text x="23" y="57" text-anchor="middle" font-family="Courier New,monospace" `,
    `font-size="8" font-weight="bold" fill="white" letter-spacing="0.4">${safeTag}</text>`,
    `</svg>`,
  ].join('')
}

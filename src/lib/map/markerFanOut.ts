import * as maplibregl from 'maplibre-gl'

/**
 * Cuando dos o mas marcadores (camara, nodo de fibra, dispositivo de red...)
 * caen en el mismo punto del mapa satelital, MapLibre los dibuja apilados y
 * el de encima tapa a los demas por completo -- en la practica, "se esconde
 * el icono de la camara". Este modulo agrupa visualmente los marcadores que
 * quedan a menos de CLUSTER_PIXEL_THRESHOLD px entre si en una burbuja con
 * contador; al hacer clic en la burbuja se abren en abanico alrededor del
 * punto para que cada uno sea clickeable por separado, y quedan abiertos
 * hasta que se hace clic de nuevo (en la burbuja, otro grupo, o el mapa
 * vacio) -- no hay comportamiento de hover (los listeners de
 * clic originales de cada marcador se mantienen intactos: solo movemos su
 * offset en pantalla via marker.setOffset(), nunca reemplazamos el elemento
 * ni tocamos su transform directamente).
 *
 * A diferencia de una version anterior, este modulo NO parcha
 * maplibregl.Marker.prototype (dificil de verificar en produccion sin poder
 * loguearse a probarlo visualmente). En vez de eso, cada uno de los 3
 * lugares donde se crea un marcador "de punto" en ProjectMapCanvas.tsx
 * (camara, dispositivo de red, nodo de fibra) llama explicitamente a
 * registerFanOutMarker()/unregisterFanOutMarker().
 */

const CLUSTER_PIXEL_THRESHOLD = 22

type Point = { x: number; y: number }

const registryByMap = new WeakMap<maplibregl.Map, Set<maplibregl.Marker>>()

export function registerFanOutMarker(map: maplibregl.Map, marker: maplibregl.Marker) {
  let set = registryByMap.get(map)
  if (!set) {
    set = new Set()
    registryByMap.set(map, set)
  }
  set.add(marker)
}

export function unregisterFanOutMarker(map: maplibregl.Map, marker: maplibregl.Marker) {
  registryByMap.get(map)?.delete(marker)
}

let markerIdCounter = 0
const markerIds = new WeakMap<maplibregl.Marker, string>()
function idOf(marker: maplibregl.Marker): string {
  let id = markerIds.get(marker)
  if (!id) {
    id = `fo-${++markerIdCounter}`
    markerIds.set(marker, id)
  }
  return id
}

const baseOffsets = new WeakMap<maplibregl.Marker, [number, number]>()
function baseOffsetOf(marker: maplibregl.Marker): [number, number] {
  let base = baseOffsets.get(marker)
  if (!base) {
    const raw = marker.getOffset()
    base = [raw?.x ?? 0, raw?.y ?? 0]
    baseOffsets.set(marker, base)
  }
  return base
}

function fanOffsets(count: number): Array<[number, number]> {
  const radius = 32 + Math.max(0, count - 4) * 6
  const offsets: Array<[number, number]> = []
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
    offsets.push([Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)])
  }
  return offsets
}

const ACCENT = '#4f46e5'
const ACCENT_DARK = '#3730a3'
const COUNT_COLOR = '#f59e0b'

export function attachMarkerFanOut(map: maplibregl.Map): () => void {
  const badgesByKey = new Map<string, HTMLDivElement>()
  // El grupo abierto se mantiene abierto hasta que el usuario hace clic de
  // nuevo (en la burbuja ya abierta, en otro grupo, o en un punto vacio del
  // mapa). No hay comportamiento de hover: el mouse pasando por encima no
  // abre ni cierra nada, solo el clic.
  let expandedKey: string | null = null
  let syncScheduled = false
  let syncTimer: ReturnType<typeof setInterval> | null = null

  const container = map.getContainer()

  // Capa SVG unica para las lineas que conectan la burbuja con cada icono
  // cuando el abanico esta abierto (el detalle visual que faltaba: sin
  // esto, los iconos separados no se leen como "parte del mismo grupo").
  const spokesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  spokesSvg.setAttribute('width', '100%')
  spokesSvg.setAttribute('height', '100%')
  spokesSvg.style.position = 'absolute'
  spokesSvg.style.left = '0'
  spokesSvg.style.top = '0'
  spokesSvg.style.zIndex = '3'
  spokesSvg.style.pointerEvents = 'none'
  spokesSvg.style.overflow = 'visible'
  container.appendChild(spokesSvg)

  function ensureBadge(key: string, count: number): HTMLDivElement {
    let badge = badgesByKey.get(key)
    if (badge) return badge
    badge = document.createElement('div')
    badge.className = 'nextq-fanout-badge'
    badge.style.position = 'absolute'
    badge.style.left = '0'
    badge.style.top = '0'
    badge.style.zIndex = '5'
    badge.style.width = '36px'
    badge.style.height = '36px'
    badge.style.cursor = 'pointer'
    badge.style.pointerEvents = 'auto'
    badge.style.userSelect = 'none'
    badge.title = 'Multiple items here - click to expand'

    // Circulo principal con degrade + icono de "capas" (varios elementos
    // en un mismo punto), y un contador tipo notificacion en la esquina.
    badge.innerHTML = `
      <div style="
        width:100%; height:100%; border-radius:50%;
        background: radial-gradient(circle at 32% 28%, ${ACCENT} 0%, ${ACCENT_DARK} 100%);
        border: 2px solid #ffffff;
        box-shadow: 0 3px 10px rgba(55,48,163,0.5), 0 0 0 3px rgba(255,255,255,0.18);
        display:flex; align-items:center; justify-content:center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 2 7l10 5 10-5-10-5Z" fill="#ffffff"/>
          <path d="M2 12l10 5 10-5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
          <path d="M2 17l10 5 10-5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
        </svg>
      </div>
      <div class="nextq-fanout-count" style="
        position:absolute; top:-5px; right:-5px; min-width:18px; height:18px;
        border-radius:999px; background:${COUNT_COLOR}; border:2px solid #ffffff;
        color:#ffffff; font-family:sans-serif; font-size:10px; font-weight:800;
        display:flex; align-items:center; justify-content:center; padding:0 3px;
        box-shadow:0 1px 4px rgba(0,0,0,0.35);
      ">${count}</div>
    `
    badge.addEventListener('click', (e) => {
      e.stopPropagation()
      // Toggle simple: un clic en una burbuja ya abierta la cierra, un
      // clic en cualquier otra la abre (y cierra la anterior si habia una).
      expandedKey = expandedKey === key ? null : key
      sync()
    })
    container.appendChild(badge)
    badgesByKey.set(key, badge)
    return badge
  }

  function removeUnusedBadges(activeKeys: Set<string>) {
    badgesByKey.forEach((badge, key) => {
      if (!activeKeys.has(key)) {
        badge.remove()
        badgesByKey.delete(key)
      }
    })
  }

  function sync() {
    try {
      const set = registryByMap.get(map)
      const markers = set ? Array.from(set) : []

      // Posicion visual aproximada de cada marcador (proyeccion + offset base).
      const positions = new Map<maplibregl.Marker, Point>()
      markers.forEach(marker => {
        const el = marker.getElement()
        if (!el || !el.isConnected) return
        const base = baseOffsetOf(marker)
        const lngLat = marker.getLngLat()
        if (!lngLat) return
        const pt = map.project(lngLat)
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return
        positions.set(marker, { x: pt.x + base[0], y: pt.y + base[1] })
      })

      // Agrupa por cercania en pantalla (BFS simple sobre el umbral de pixeles).
      const visited = new Set<maplibregl.Marker>()
      const clusters: maplibregl.Marker[][] = []
      const entries = Array.from(positions.entries())
      entries.forEach(([marker]) => {
        if (visited.has(marker)) return
        const group: maplibregl.Marker[] = [marker]
        visited.add(marker)
        let frontier = [marker]
        while (frontier.length) {
          const next: maplibregl.Marker[] = []
          frontier.forEach(m => {
            const p1 = positions.get(m)!
            entries.forEach(([other]) => {
              if (visited.has(other)) return
              const p2 = positions.get(other)!
              const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
              if (dist <= CLUSTER_PIXEL_THRESHOLD) {
                visited.add(other)
                group.push(other)
                next.push(other)
              }
            })
          })
          frontier = next
        }
        clusters.push(group)
      })

      const activeKeys = new Set<string>()
      while (spokesSvg.firstChild) spokesSvg.removeChild(spokesSvg.firstChild)

      clusters.forEach(group => {
        if (group.length === 1) {
          const marker = group[0]
          const el = marker.getElement()
          el.style.visibility = ''
          el.style.pointerEvents = ''
          marker.setOffset(baseOffsetOf(marker))
          return
        }

        const sortedIds = group.map(idOf).sort()
        const key = sortedIds.join('|')
        activeKeys.add(key)

        const isExpanded = expandedKey === key
        const centroid = group.reduce(
          (acc, m) => {
            const p = positions.get(m)!
            return { x: acc.x + p.x / group.length, y: acc.y + p.y / group.length }
          },
          { x: 0, y: 0 }
        )

        const badge = ensureBadge(key, group.length)
        const countEl = badge.querySelector<HTMLDivElement>('.nextq-fanout-count')
        if (countEl) countEl.textContent = String(group.length)
        badge.style.transform = `translate(${centroid.x}px, ${centroid.y}px) translate(-50%, -50%)`
        badge.style.opacity = isExpanded ? '0' : '1'
        badge.style.pointerEvents = isExpanded ? 'none' : 'auto'

        const offsets = fanOffsets(group.length)
        group.forEach((marker, i) => {
          const el = marker.getElement()
          if (isExpanded) {
            el.style.visibility = ''
            el.style.pointerEvents = ''
            const base = baseOffsetOf(marker)
            const [dx, dy] = offsets[i]
            marker.setOffset([base[0] + dx, base[1] + dy])

            // Linea que conecta el centro del grupo con este icono, para
            // que se lea como abanico y no como iconos sueltos flotando.
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
            line.setAttribute('x1', String(centroid.x))
            line.setAttribute('y1', String(centroid.y))
            line.setAttribute('x2', String(centroid.x + dx))
            line.setAttribute('y2', String(centroid.y + dy))
            line.setAttribute('stroke', ACCENT)
            line.setAttribute('stroke-width', '2')
            line.setAttribute('stroke-linecap', 'round')
            line.setAttribute('opacity', '0.55')
            spokesSvg.appendChild(line)
          } else {
            el.style.visibility = 'hidden'
            el.style.pointerEvents = 'none'
            marker.setOffset(baseOffsetOf(marker))
          }
        })

        if (isExpanded) {
          const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          centerDot.setAttribute('cx', String(centroid.x))
          centerDot.setAttribute('cy', String(centroid.y))
          centerDot.setAttribute('r', '3')
          centerDot.setAttribute('fill', ACCENT)
          spokesSvg.appendChild(centerDot)
        }
      })

      removeUnusedBadges(activeKeys)
      if (expandedKey && !activeKeys.has(expandedKey)) {
        expandedKey = null
      }
    } catch (err) {
      // Nunca dejar que un fallo aca rompa el resto del mapa.
      console.error('markerFanOut sync failed', err)
    }
  }

  function scheduleSync() {
    if (syncScheduled) return
    syncScheduled = true
    requestAnimationFrame(() => {
      syncScheduled = false
      sync()
    })
  }

  map.on('move', scheduleSync)
  map.on('zoom', scheduleSync)
  map.on('resize', scheduleSync)
  map.on('render', scheduleSync)

  const collapseOnMapClick = () => {
    if (expandedKey) {
      expandedKey = null
      sync()
    }
  }
  map.on('click', collapseOnMapClick)

  // Los marcadores se van agregando a medida que cada efecto de React
  // (camaras, dispositivos, nodos de fibra) corre, no todos de una. Un
  // polling liviano cada 500ms cubre eso sin depender de observar el DOM.
  syncTimer = setInterval(scheduleSync, 500)
  scheduleSync()

  return () => {
    if (syncTimer) clearInterval(syncTimer)
    map.off('move', scheduleSync)
    map.off('zoom', scheduleSync)
    map.off('resize', scheduleSync)
    map.off('render', scheduleSync)
    map.off('click', collapseOnMapClick)
    badgesByKey.forEach(badge => badge.remove())
    badgesByKey.clear()
    spokesSvg.remove()
  }
}

import * as maplibregl from 'maplibre-gl'

/**
 * Cuando dos o mas marcadores (camara, nodo de fibra, dispositivo de red...)
 * caen en el mismo punto del mapa satelital, MapLibre los dibuja apilados y
 * el de encima tapa a los demas por completo -- en la practica, "se esconde
 * el icono de la camara". Este modulo agrupa visualmente los marcadores que
 * quedan a menos de CLUSTER_PIXEL_THRESHOLD px entre si en una burbuja con
 * contador; al pasar el mouse o hacer clic, se abren en abanico alrededor
 * del punto para que cada uno sea clickeable por separado (los listeners de
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
const COLLAPSE_DELAY_MS = 350

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

export function attachMarkerFanOut(map: maplibregl.Map): () => void {
  const badgesByKey = new Map<string, HTMLDivElement>()
  let expandedKey: string | null = null
  let hoverDepth = 0
  let collapseTimer: ReturnType<typeof setTimeout> | null = null
  let syncScheduled = false
  let syncTimer: ReturnType<typeof setInterval> | null = null

  const container = map.getContainer()

  const cancelCollapse = () => {
    if (collapseTimer) {
      clearTimeout(collapseTimer)
      collapseTimer = null
    }
  }

  const scheduleCollapse = () => {
    cancelCollapse()
    collapseTimer = setTimeout(() => {
      if (hoverDepth <= 0) {
        expandedKey = null
        sync()
      }
    }, COLLAPSE_DELAY_MS)
  }

  const onClusterEnter = () => {
    hoverDepth++
    cancelCollapse()
  }
  const onClusterLeave = () => {
    hoverDepth = Math.max(0, hoverDepth - 1)
    scheduleCollapse()
  }

  function ensureBadge(key: string): HTMLDivElement {
    let badge = badgesByKey.get(key)
    if (badge) return badge
    badge = document.createElement('div')
    badge.className = 'nextq-fanout-badge'
    badge.style.position = 'absolute'
    badge.style.left = '0'
    badge.style.top = '0'
    badge.style.zIndex = '5'
    badge.style.display = 'flex'
    badge.style.alignItems = 'center'
    badge.style.justifyContent = 'center'
    badge.style.minWidth = '24px'
    badge.style.height = '24px'
    badge.style.padding = '0 6px'
    badge.style.borderRadius = '999px'
    badge.style.background = '#0f172a'
    badge.style.border = '2px solid #fbbf24'
    badge.style.color = '#fbbf24'
    badge.style.fontFamily = 'sans-serif'
    badge.style.fontSize = '11px'
    badge.style.fontWeight = '800'
    badge.style.cursor = 'pointer'
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)'
    badge.style.pointerEvents = 'auto'
    badge.style.userSelect = 'none'
    badge.title = 'Multiple items here - click or hover to expand'
    badge.addEventListener('mouseenter', onClusterEnter)
    badge.addEventListener('mouseleave', onClusterLeave)
    badge.addEventListener('click', (e) => {
      e.stopPropagation()
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
        badge.removeEventListener('mouseenter', onClusterEnter)
        badge.removeEventListener('mouseleave', onClusterLeave)
        badge.remove()
        badgesByKey.delete(key)
      }
    })
  }

  const hoverBoundEls = new WeakSet<HTMLElement>()
  function bindMemberHover(marker: maplibregl.Marker) {
    const el = marker.getElement()
    if (hoverBoundEls.has(el)) return
    hoverBoundEls.add(el)
    el.addEventListener('mouseenter', onClusterEnter)
    el.addEventListener('mouseleave', onClusterLeave)
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

        const badge = ensureBadge(key)
        badge.style.transform = `translate(${centroid.x}px, ${centroid.y}px) translate(-50%, -50%)`
        badge.textContent = String(group.length)
        badge.style.opacity = isExpanded ? '0' : '1'
        badge.style.pointerEvents = isExpanded ? 'none' : 'auto'

        const offsets = fanOffsets(group.length)
        group.forEach((marker, i) => {
          const el = marker.getElement()
          bindMemberHover(marker)
          if (isExpanded) {
            el.style.visibility = ''
            el.style.pointerEvents = ''
            const base = baseOffsetOf(marker)
            const [dx, dy] = offsets[i]
            marker.setOffset([base[0] + dx, base[1] + dy])
          } else {
            el.style.visibility = 'hidden'
            el.style.pointerEvents = 'none'
            marker.setOffset(baseOffsetOf(marker))
          }
        })
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
    cancelCollapse()
    badgesByKey.forEach(badge => badge.remove())
    badgesByKey.clear()
  }
}

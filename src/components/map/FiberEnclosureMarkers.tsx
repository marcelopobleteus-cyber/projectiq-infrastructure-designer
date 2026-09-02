'use client'

import React, { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'

interface FiberEnclosureMarkersProps {
  map: maplibregl.Map | null
  fiberEnclosures: any[]
  fiberNodes: any[]
  layerVisibility: Record<string, boolean>
  setSelectedEnclosure: (enclosure: any | null) => void
  setSelectedCamera: (camera: any | null) => void
  setSelectedDevice: (device: any | null) => void
}

export default function FiberEnclosureMarkers({
  map,
  fiberEnclosures,
  fiberNodes,
  layerVisibility,
  setSelectedEnclosure,
  setSelectedCamera,
  setSelectedDevice
}: FiberEnclosureMarkersProps) {
  const enclosureMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({})

  // Synchronize Fiber Enclosure Markers
  useEffect(() => {
    if (!map) return

    // Remove hidden/obsolete enclosure markers
    Object.keys(enclosureMarkersRef.current).forEach(id => {
      const enc = fiberEnclosures.find(e => e.id === id)
      if (!enc || !layerVisibility['fiber-enclosures']) {
        enclosureMarkersRef.current[id].remove()
        delete enclosureMarkersRef.current[id]
      }
    })

    if (!layerVisibility['fiber-enclosures']) return

    // Draw enclosure markers
    fiberEnclosures.forEach(enclosure => {
      let lat = enclosure.latitude
      let lng = enclosure.longitude
      let isCoLocated = false

      if (lat === null || lng === null) {
        const linkedNode = fiberNodes.find(n => n.id === enclosure.node_id)
        if (linkedNode) {
          lat = linkedNode.latitude
          lng = linkedNode.longitude
          isCoLocated = true
        }
      } else {
        const linkedNode = fiberNodes.find(n => n.id === enclosure.node_id)
        if (linkedNode && Math.abs(linkedNode.latitude - lat) < 0.000001 && Math.abs(linkedNode.longitude - lng) < 0.000001) {
          isCoLocated = true
        }
      }

      if (lat === null || lng === null) {
        // Missing location, do not place on map
        return
      }

      if (isCoLocated) {
        lat += 0.00003
        lng += 0.00003
      }

      // SVG Definition
      const isAerial = enclosure.enclosure_type?.toLowerCase().includes('aerial')

      let svgShape = ''
      if (isAerial) {
        // Horizontal cylinder
        svgShape = `
          <rect x="4" y="9" width="16" height="10" rx="3" fill="#ec4899" stroke="#ffffff" stroke-width="2"/>
          <rect x="2" y="12" width="2" height="4" fill="#ffffff"/>
          <rect x="20" y="12" width="2" height="4" fill="#ffffff"/>
          <line x1="4" y1="14" x2="20" y2="14" stroke="#ffffff" stroke-width="1.5"/>
        `
      } else {
        // Dome closure / Vertical Dome
        svgShape = `
          <path d="M 6,18 L 6,10 A 6,6 0 0,1 18,10 L 18,18 Z" fill="#ec4899" stroke="#ffffff" stroke-width="2"/>
          <rect x="8" y="18" width="2" height="3" fill="#ffffff" rx="0.5"/>
          <rect x="11" y="18" width="2" height="3" fill="#ffffff" rx="0.5"/>
          <rect x="14" y="18" width="2" height="3" fill="#ffffff" rx="0.5"/>
          <rect x="5" y="17" width="14" height="2" fill="#334155" rx="0.5"/>
        `
      }

      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 24 32">
          <g transform="translate(0, 0)">
            ${svgShape}
          </g>
          <rect x="0" y="24" width="24" height="8" rx="1.5" fill="#0f172a" opacity="0.85"/>
          <text x="12" y="30" fill="#ffffff" font-size="6" font-family="sans-serif" font-weight="bold" text-anchor="middle">
            ${enclosure.enclosure_tag}
          </text>
        </svg>
      `

      if (enclosureMarkersRef.current[enclosure.id]) {
        const marker = enclosureMarkersRef.current[enclosure.id]
        marker.setLngLat([lng, lat])
        marker.getElement().innerHTML = svgPin
      } else {
        const el = document.createElement('div')
        el.style.width = '32px'
        el.style.height = '42px'
        el.style.cursor = 'pointer'
        el.innerHTML = svgPin
        el.title = `${enclosure.enclosure_tag} (${enclosure.enclosure_type})`

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          offset: [0, 5] // elementCenterY(21) - anchorY(16)
        })
          .setLngLat([lng, lat])
          .addTo(map)

        el.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          setSelectedCamera(null)
          setSelectedDevice(null)
          setSelectedEnclosure(enclosure)
        })

        enclosureMarkersRef.current[enclosure.id] = marker
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiberEnclosures, map, layerVisibility['fiber-enclosures'], fiberNodes, setSelectedCamera, setSelectedDevice, setSelectedEnclosure])

  // Cleanup enclosure markers on unmount
  useEffect(() => {
    return () => {
      Object.keys(enclosureMarkersRef.current).forEach(id => {
        enclosureMarkersRef.current[id].remove()
      })
    }
  }, [])

  return null
}

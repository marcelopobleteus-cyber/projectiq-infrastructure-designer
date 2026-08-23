import React, { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { CoordinatePoint } from '@/app/projects/actions-coordinate-viewer'

interface CoordinateMapProps {
  points: CoordinatePoint[]
  selectedPoint: CoordinatePoint | null
  onMarkerClick: (point: CoordinatePoint | null) => void
  googleMapsApiKey: string | undefined
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
  showCameras: boolean
  showSwitches: boolean
  groupSameLocation: boolean
}

export default function CoordinateMap({
  points,
  selectedPoint,
  onMarkerClick,
  googleMapsApiKey,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
  showCameras,
  showSwitches,
  groupSameLocation
}: CoordinateMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'roadmap' | 'satellite'>('hybrid')

  // Maintain references to markers to clean them up or update them
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Initialize Map
  useEffect(() => {
    if (!googleMapsApiKey || !mapContainerRef.current) return

    setOptions({
      key: googleMapsApiKey,
      v: 'weekly',
    })

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker')
    ]).then(([mapsLib]) => {
      if (!mapContainerRef.current) return

      const newMap = new mapsLib.Map(mapContainerRef.current, {
        center: { lat: defaultLatitude, lng: defaultLongitude },
        zoom: defaultZoom,
        mapTypeId: activeLayer,
        tilt: 0,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      })

      // Create a single shared InfoWindow
      const iw = new google.maps.InfoWindow()
      infoWindowRef.current = iw

      // Close selected point if map background is clicked
      newMap.addListener('click', () => {
        iw.close()
        onMarkerClick(null)
      })

      setMap(newMap)
    }).catch(err => {
      console.error('Failed to load Google Maps:', err)
    })

    return () => {
      // Cleanup InfoWindow
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    }
  }, [googleMapsApiKey])

  // Map layer controls
  const handleLayerChange = (layer: 'hybrid' | 'roadmap' | 'satellite') => {
    setActiveLayer(layer)
    if (map) {
      map.setMapTypeId(layer)
    }
  }

  // ── Custom SVG Icon generators ──
  const createCameraMarkerIcon = (tag: string, isSelected: boolean) => {
    const color = '#3b82f6' // Indigo/Blue for Camera
    const ringAttr = isSelected ? `stroke="white" stroke-width="3"` : ''
    const shortTag = tag.length > 9 ? tag.substring(0, 9) : tag

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 46 60">`,
      `<defs><filter id="ds" x="-40%" y="-40%" width="180%" height="180%">`,
      `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter></defs>`,
      `<circle cx="23" cy="23" r="20" fill="${color}" filter="url(#ds)" ${ringAttr}/>`,
      `<circle cx="23" cy="23" r="15" fill="#0f172a"/>`,
      // CCTV Icon
      `<rect x="12" y="17" width="12" height="9" rx="1.5" fill="${color}"/>`,
      `<circle cx="17" cy="21.5" r="3" fill="#0f172a"/>`,
      `<path d="M24 18.5L31 16v13L24 25.5V18.5z" fill="${color}"/>`,
      // Tag Label pill
      `<rect x="3" y="47" width="40" height="12" rx="5" fill="#0f172a" opacity="0.93"/>`,
      `<text x="23" y="56" text-anchor="middle" font-family="Courier New,monospace" `,
      `font-size="8" font-weight="bold" fill="white" letter-spacing="0.4">${shortTag}</text>`,
      `</svg>`
    ].join('')

    return {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(40, 52),
      anchor: new google.maps.Point(20, 20),
    }
  }

  const createSwitchMarkerIcon = (tag: string, isSelected: boolean) => {
    const color = '#06b6d4' // Cyan for Switch
    const ringAttr = isSelected ? `stroke="white" stroke-width="3"` : ''
    const shortTag = tag.length > 9 ? tag.substring(0, 9) : tag

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 46 60">`,
      `<defs><filter id="ds" x="-40%" y="-40%" width="180%" height="180%">`,
      `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter></defs>`,
      `<rect x="3" y="3" width="40" height="40" rx="6" fill="${color}" filter="url(#ds)" ${ringAttr}/>`,
      `<rect x="6" y="6" width="34" height="34" rx="4" fill="#0f172a"/>`,
      // Switch Port layout drawing
      `<rect x="11" y="12" width="6" height="5" rx="1" fill="${color}"/>`,
      `<rect x="20" y="12" width="6" height="5" rx="1" fill="${color}"/>`,
      `<rect x="29" y="12" width="6" height="5" rx="1" fill="${color}"/>`,
      `<rect x="11" y="21" width="6" height="5" rx="1" fill="${color}"/>`,
      `<rect x="20" y="21" width="6" height="5" rx="1" fill="${color}"/>`,
      `<rect x="29" y="21" width="6" height="5" rx="1" fill="${color}"/>`,
      // Tag Label pill
      `<rect x="3" y="47" width="40" height="12" rx="5" fill="#0f172a" opacity="0.93"/>`,
      `<text x="23" y="56" text-anchor="middle" font-family="Courier New,monospace" `,
      `font-size="7" font-weight="bold" fill="white" letter-spacing="0.4">${shortTag}</text>`,
      `</svg>`
    ].join('')

    return {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(40, 52),
      anchor: new google.maps.Point(20, 20),
    }
  }

  const createGroupedMarkerIcon = (count: number, isSelected: boolean) => {
    const color = '#8b5cf6' // Purple for Grouped Location
    const ringAttr = isSelected ? `stroke="white" stroke-width="3"` : ''

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="52" viewBox="0 0 46 52">`,
      `<defs><filter id="ds" x="-40%" y="-40%" width="180%" height="180%">`,
      `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/></filter></defs>`,
      // Hexagon or double circle
      `<circle cx="23" cy="23" r="21" fill="${color}" filter="url(#ds)" ${ringAttr}/>`,
      `<circle cx="23" cy="23" r="16" fill="#0f172a"/>`,
      `<circle cx="23" cy="23" r="10" fill="${color}"/>`,
      // Text representing count inside
      `<text x="23" y="27" text-anchor="middle" font-family="sans-serif" `,
      `font-size="12" font-weight="black" fill="white">${count}</text>`,
      // Tag Label pill
      `<rect x="3" y="46" width="40" height="12" rx="5" fill="#0f172a" opacity="0.93"/>`,
      `<text x="23" y="54" text-anchor="middle" font-family="sans-serif" `,
      `font-size="7" font-weight="bold" fill="#a78bfa" uppercase>Grouped</text>`,
      `</svg>`
    ].join('')

    return {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(40, 48),
      anchor: new google.maps.Point(20, 20),
    }
  }

  // ── InfoWindow HTML generators ──
  const getInfoWindowHtml = (point: CoordinatePoint) => {
    const isCam = point.device_type === 'CAM' || point.device_id.startsWith('CAM')
    return `
      <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; border-radius: 12px; color: #f1f5f9; min-width: 250px; border: 1px solid #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #ffffff;">${point.device_id}</h4>
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: ${isCam ? 'rgba(59, 130, 246, 0.15)' : 'rgba(6, 182, 212, 0.15)'}; color: ${isCam ? '#60a5fa' : '#22d3ee'}; border: 1px solid ${isCam ? 'rgba(59, 130, 246, 0.25)' : 'rgba(6, 182, 212, 0.25)'};">${isCam ? 'Camera' : 'Switch'}</span>
        </div>
        <div style="font-size: 11px; line-height: 1.6; margin-bottom: 6px; color: #cbd5e1;">
          <div><strong style="color: #64748b;">IP Address:</strong> <span style="font-family: monospace; font-size: 11px;">${point.ip_address || 'N/A'}</span></div>
          <div><strong style="color: #64748b;">Subnet Mask:</strong> <span style="font-family: monospace; font-size: 11px;">${point.subnet_mask || 'N/A'}</span></div>
          <div><strong style="color: #64748b;">Gateway:</strong> <span style="font-family: monospace; font-size: 11px;">${point.default_gateway || 'N/A'}</span></div>
          <div><strong style="color: #64748b;">VLAN ID:</strong> <span style="font-family: monospace; font-size: 11px;">${point.vlan || 'N/A'}</span></div>
          <div style="margin-top: 6px; color: #94a3b8; font-style: italic; font-size: 10px; border-top: 1px solid #1e293b; padding-top: 6px;">${point.description || 'No description provided.'}</div>
        </div>
        <div style="font-size: 9px; font-family: monospace; color: #475569; display: flex; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 4px; margin-top: 4px;">
          <span>Lat: ${Number(point.latitude).toFixed(6)}</span>
          <span>Lng: ${Number(point.longitude).toFixed(6)}</span>
        </div>
      </div>
    `
  }

  const getGroupedInfoWindowHtml = (pointsGroup: CoordinatePoint[]) => {
    const firstPoint = pointsGroup[0]
    return `
      <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; border-radius: 12px; color: #f1f5f9; min-width: 270px; border: 1px solid #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #ffffff;">Co-located Devices (${pointsGroup.length})</h4>
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.25);">Grouped</span>
        </div>
        <div style="max-height: 180px; overflow-y: auto; padding-right: 4px;">
          ${pointsGroup.map(point => {
            const isCam = point.device_type === 'CAM' || point.device_id.startsWith('CAM')
            return `
              <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #1e293b;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                  <strong style="font-size: 11px; color: #ffffff;">${point.device_id}</strong>
                  <span style="font-size: 7px; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; font-weight: bold; background-color: ${isCam ? 'rgba(59, 130, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)'}; color: ${isCam ? '#60a5fa' : '#22d3ee'};">${isCam ? 'CAM' : 'SWITCH'}</span>
                </div>
                <div style="font-size: 10px; font-family: monospace; color: #cbd5e1; line-height: 1.4;">
                  IP: ${point.ip_address || 'N/A'} | VLAN: ${point.vlan || 'N/A'}
                </div>
                ${point.description ? `<div style="font-size: 9px; color: #64748b; font-style: italic; margin-top: 2px;">${point.description}</div>` : ''}
              </div>
            `
          }).join('')}
        </div>
        <div style="font-size: 9px; font-family: monospace; color: #475569; display: flex; justify-content: space-between; padding-top: 4px;">
          <span>Lat: ${Number(firstPoint.latitude).toFixed(6)}</span>
          <span>Lng: ${Number(firstPoint.longitude).toFixed(6)}</span>
        </div>
      </div>
    `
  }

  // Draw Markers when data or filters change
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // 1. Filter out points based on visibility switches
    const visiblePoints = points.filter(p => {
      const isCam = p.device_type === 'CAM' || p.device_id.startsWith('CAM')
      if (isCam && !showCameras) return false
      if (!isCam && !showSwitches) return false
      return true
    })

    if (visiblePoints.length === 0) return

    // 2. Group co-located points
    const locationGroups: { [coords: string]: CoordinatePoint[] } = {}
    visiblePoints.forEach(p => {
      const coordKey = `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`
      if (!locationGroups[coordKey]) {
        locationGroups[coordKey] = []
      }
      locationGroups[coordKey].push(p)
    })

    const bounds = new google.maps.LatLngBounds()

    // 3. Render markers based on grouping strategy
    if (groupSameLocation) {
      // Grouped locations
      Object.keys(locationGroups).forEach(coordKey => {
        const group = locationGroups[coordKey]
        const firstPoint = group[0]
        const position = { lat: Number(firstPoint.latitude), lng: Number(firstPoint.longitude) }
        bounds.extend(position)

        const isGroupSelected = selectedPoint && group.some(p => p.id === selectedPoint.id)

        // If it's a single point in the group, render as standard, otherwise grouped
        let icon
        let title
        if (group.length === 1) {
          const p = group[0]
          const isCam = p.device_type === 'CAM' || p.device_id.startsWith('CAM')
          const isSelected = selectedPoint?.id === p.id
          icon = isCam ? createCameraMarkerIcon(p.device_id, isSelected) : createSwitchMarkerIcon(p.device_id, isSelected)
          title = p.device_id
        } else {
          icon = createGroupedMarkerIcon(group.length, !!isGroupSelected)
          title = `${group.length} co-located devices`
        }

        const marker = new google.maps.Marker({
          position,
          map,
          icon,
          title,
        })

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(
              group.length === 1 ? getInfoWindowHtml(group[0]) : getGroupedInfoWindowHtml(group)
            )
            infoWindowRef.current.open(map, marker)
          }

          // If click is on a single point, select it. If grouped, select the first one or just trigger callback
          if (group.length === 1) {
            onMarkerClick(group[0])
          } else {
            // Find if the currently selected point is part of the group, otherwise select the first
            const matchedSelected = selectedPoint && group.find(p => p.id === selectedPoint.id)
            onMarkerClick(matchedSelected || group[0])
          }
        })

        markersRef.current.push(marker)
      })
    } else {
      // Offset/Spidering behavior
      Object.keys(locationGroups).forEach(coordKey => {
        const group = locationGroups[coordKey]
        const totalInGroup = group.length

        group.forEach((p, idx) => {
          const lat = Number(p.latitude)
          const lng = Number(p.longitude)
          
          // Compute offset coordinates
          let markerPos = { lat, lng }
          if (totalInGroup > 1) {
            const offsetDistance = 0.00006 // approximately 6-8 meters in coordinate space
            const angle = (idx * 2 * Math.PI) / totalInGroup
            markerPos = {
              lat: lat + Math.sin(angle) * offsetDistance,
              lng: lng + Math.cos(angle) * offsetDistance
            }
          }
          bounds.extend(markerPos)

          const isCam = p.device_type === 'CAM' || p.device_id.startsWith('CAM')
          const isSelected = selectedPoint?.id === p.id
          const icon = isCam ? createCameraMarkerIcon(p.device_id, isSelected) : createSwitchMarkerIcon(p.device_id, isSelected)

          const marker = new google.maps.Marker({
            position: markerPos,
            map,
            icon,
            title: p.device_id,
          })

          marker.addListener('click', () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.setContent(getInfoWindowHtml(p))
              infoWindowRef.current.open(map, marker)
            }
            onMarkerClick(p)
          })

          markersRef.current.push(marker)
        })
      })
    }

    // Auto-fit bounds on initial loading or toggle changes
    if (visiblePoints.length > 0) {
      map.fitBounds(bounds)
      // Cap max zoom when auto-fitting to prevent extreme zoom in on single point
      const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom()! > 18) {
          map.setZoom(18)
        }
        google.maps.event.removeListener(listener)
      })
    }
  }, [points, map, showCameras, showSwitches, groupSameLocation])

  // Center map on Selected Point change from list
  useEffect(() => {
    if (!map) return

    if (!selectedPoint) {
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
      return
    }

    const lat = Number(selectedPoint.latitude)
    const lng = Number(selectedPoint.longitude)

    // Center and zoom slightly closer to center on list selection
    map.panTo({ lat, lng })
    map.setZoom(18)

    // Highlight and open the InfoWindow of the corresponding marker
    // Find the marker by title (device_id) or close proximity
    const marker = markersRef.current.find(m => m.getTitle() === selectedPoint.device_id)
    if (marker && infoWindowRef.current) {
      // Handle content based on grouping
      const isGroupedMode = groupSameLocation
      if (isGroupedMode) {
        // Find if this point is in a co-located group
        const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`
        const visiblePoints = points.filter(p => {
          const isCam = p.device_type === 'CAM' || p.device_id.startsWith('CAM')
          if (isCam && !showCameras) return false
          if (!isCam && !showSwitches) return false
          return true
        })
        const group = visiblePoints.filter(p => `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}` === coordKey)
        
        infoWindowRef.current.setContent(
          group.length === 1 ? getInfoWindowHtml(selectedPoint) : getGroupedInfoWindowHtml(group)
        )
      } else {
        infoWindowRef.current.setContent(getInfoWindowHtml(selectedPoint))
      }
      infoWindowRef.current.open(map, marker)
    }
  }, [selectedPoint, map, points, showCameras, showSwitches, groupSameLocation])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-850 shadow-xl flex flex-col bg-slate-900/10">
      {/* Map layer toggle UI */}
      <div className="absolute top-3 right-3 z-10 flex bg-slate-950/70 border border-slate-800 rounded-xl p-1 gap-1 backdrop-blur-md">
        {(['hybrid', 'roadmap', 'satellite'] as const).map(layer => (
          <button
            key={layer}
            onClick={() => handleLayerChange(layer)}
            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeLayer === layer
                ? 'bg-indigo-650 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {layer === 'hybrid' ? 'Satellite +' : layer}
          </button>
        ))}
      </div>

      {/* Map Canvas div */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full" />
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import stationData from '../../data/nyc_subway_stations.json'

const NYC_BOUNDS = [
  [40.4774, -74.2591],
  [40.9176, -73.7004],
]

const LINE_COLORS = {
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  '7': '#B933AD',
  'A': '#2850AD', 'C': '#2850AD', 'E': '#2850AD',
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
  'G': '#6CBE45',
  'J': '#996633', 'Z': '#996633',
  'L': '#A7A9AC',
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
  'S': '#808183',
}

const LIGHT_TEXT_LINES = new Set(['N', 'Q', 'R', 'W'])
const LINE_PRIORITY = ['1','2','3','4','5','6','7','A','C','E','B','D','F','M','G','J','Z','L','N','Q','R','W','S']
const BOROUGH_NAMES = { 1: 'Manhattan', 2: 'Bronx', 3: 'Brooklyn', 4: 'Queens', 5: 'Staten Island' }
const ARCGIS_BASE = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services'

function parseRoutes(oemRoute) {
  if (!oemRoute) return []
  return String(oemRoute).trim().split('-').map(r => r.trim()).filter(Boolean)
}

// Returns distinct colors for a route list, ordered by LINE_PRIORITY
function getDistinctColors(routes) {
  const seen = new Set()
  const colors = []
  for (const line of LINE_PRIORITY) {
    if (routes.includes(line)) {
      const color = LINE_COLORS[line]
      if (color && !seen.has(color)) {
        seen.add(color)
        colors.push(color)
      }
    }
  }
  return colors.length > 0 ? colors : ['#808183']
}


// Offset a lat/lng polyline by `offsetPx` pixels perpendicular to its direction.
// Recalculated at the map's current zoom so it stays visually constant.
function computeOffset(latLngs, offsetPx, map, L) {
  if (offsetPx === 0 || latLngs.length < 2) return latLngs
  return latLngs.map((ll, i) => {
    const p = map.latLngToLayerPoint(L.latLng(ll[0], ll[1]))
    const prevIdx = Math.max(0, i - 1)
    const nextIdx = Math.min(latLngs.length - 1, i + 1)
    const prev = map.latLngToLayerPoint(L.latLng(latLngs[prevIdx][0], latLngs[prevIdx][1]))
    const next = map.latLngToLayerPoint(L.latLng(latLngs[nextIdx][0], latLngs[nextIdx][1]))
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return ll
    // Perpendicular unit vector (90° CCW from travel direction)
    const nx = -dy / len
    const ny = dx / len
    const op = L.point(p.x + nx * offsetPx, p.y + ny * offsetPx)
    const result = map.layerPointToLatLng(op)
    return [result.lat, result.lng]
  })
}

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lineBadge(line) {
  const bg = LINE_COLORS[line] || '#808183'
  const textColor = LIGHT_TEXT_LINES.has(line) ? '#000' : '#fff'
  return `<span style="
    display:inline-flex;align-items:center;justify-content:center;
    width:22px;height:22px;border-radius:50%;
    background:${bg};color:${textColor};
    font-size:11px;font-weight:700;font-family:sans-serif;
    margin:2px;flex-shrink:0;
  ">${line}</span>`
}

function buildPopupContent(station) {
  const linesHtml = station.lines.map(lineBadge).join('')
  const extraTransfers = station.transfers.filter(t => !station.lines.includes(t))
  const transfersHtml = extraTransfers.length > 0
    ? `<div style="margin-top:8px">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Transfers</div>
        <div style="display:flex;flex-wrap:wrap">${extraTransfers.map(lineBadge).join('')}</div>
       </div>`
    : ''
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:180px;padding:2px 0">
      <div style="font-weight:700;font-size:14px;line-height:1.3;margin-bottom:3px">${station.name}</div>
      <div style="color:#777;font-size:11px;margin-bottom:10px">${station.neighborhood} · ${station.borough}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Lines</div>
      <div style="display:flex;flex-wrap:wrap">${linesHtml}</div>
      ${transfersHtml}
    </div>
  `
}

function buildFallbackPopup(props) {
  const name = props.STATION || ''
  const routes = parseRoutes(props.OEM_ROUTE)
  const borough = BOROUGH_NAMES[props.Borough] || ''
  const ada = props.ADA_Accessible
    ? '<div style="color:#27ae60;font-size:11px;margin-top:8px">♿ ADA Accessible</div>'
    : ''
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:160px;padding:2px 0">
      <div style="font-weight:700;font-size:14px;line-height:1.3;margin-bottom:3px">${name}</div>
      ${borough ? `<div style="color:#777;font-size:11px;margin-bottom:10px">${borough}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap">${routes.map(lineBadge).join('')}</div>
      ${ada}
    </div>
  `
}

export default function SubwayMap() {
  const containerRef = useRef(null)

  useEffect(() => {
    let map = null

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (!containerRef.current || map) return

      map = L.map(containerRef.current, {
        center: [40.7128, -74.006],
        zoom: 14,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: NYC_BOUNDS,
        maxBoundsViscosity: 1.0,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map)

      // Borough boundaries — non-interactive so clicks pass through to stations
      fetch(`${ARCGIS_BASE}/NYC_Borough_Boundary/FeatureServer/0/query?where=1%3D1&outFields=BoroName&outSR=4326&f=geojson`)
        .then(r => r.json())
        .then(data => {
          L.geoJSON(data, {
            style: { color: '#333333', weight: 2.5, opacity: 0.8, fillOpacity: 0 },
            interactive: false,
          }).addTo(map)
        })

      // Stations pane sits above the default overlayPane (z 400) so they're always on top of lines
      map.createPane('stationsPane')
      map.getPane('stationsPane').style.zIndex = 450

      const localLookup = {}
      stationData.forEach(s => { localLookup[normalizeName(s.name)] = s })

      const [linesGeoJson, stationsGeoJson] = await Promise.all([
        fetch(`${ARCGIS_BASE}/SubwayLines_share/FeatureServer/0/query?where=1%3D1&outFields=OEM_Route&outSR=4326&f=geojson`).then(r => r.json()),
        fetch(`${ARCGIS_BASE}/SubwayStations_share/FeatureServer/0/query?where=1%3D1&outFields=STATION,OEM_ROUTE,Borough,ADA_Accessible&outSR=4326&f=geojson`).then(r => r.json()),
      ])

      const linesFeatures = linesGeoJson.features || []

      // Layer group for lines so we can clear+redraw on zoom
      const linesGroup = L.layerGroup().addTo(map)

      function renderLines() {
        linesGroup.clearLayers()

        linesFeatures.forEach(feature => {
          const geom = feature.geometry
          if (!geom) return

          const segments = geom.type === 'MultiLineString'
            ? geom.coordinates
            : [geom.coordinates]

          const routes = parseRoutes(feature.properties?.OEM_Route)
          const colors = getDistinctColors(routes)

          const W = 3    // line weight in px
          const G = 0.5  // gap between parallel lines in px
          const step = W + G

          segments.forEach(seg => {
            const latLngs = seg.map(([lng, lat]) => [lat, lng])

            if (colors.length === 1) {
              L.polyline(latLngs, {
                color: colors[0],
                weight: W,
                opacity: 0.75,
                interactive: false,
              }).addTo(linesGroup)
            } else {
              // Draw one offset polyline per distinct color, centered around the track
              const totalWidth = colors.length * W + (colors.length - 1) * G
              colors.forEach((color, idx) => {
                const offsetPx = -(totalWidth / 2) + W / 2 + idx * step
                const offsetLatLngs = computeOffset(latLngs, offsetPx, map, L)
                L.polyline(offsetLatLngs, {
                  color,
                  weight: W,
                  opacity: 0.8,
                  interactive: false,
                }).addTo(linesGroup)
              })
            }
          })
        })
      }

      renderLines()
      map.on('zoomend', renderLines)

      // Station markers — added after lines so they sit on top and receive clicks
      L.geoJSON(stationsGeoJson, {
        pointToLayer: (_feature, latlng) => {
          return L.circleMarker(latlng, {
            pane: 'stationsPane',
            radius: 4,
            fillColor: '#000000',
            color: '#ffffff',
            weight: 0.5,
            opacity: 1,
            fillOpacity: 1,
          })
        },
        onEachFeature: (feature, layer) => {
          const stationName = feature.properties?.STATION || ''
          const localStation = localLookup[normalizeName(stationName)]
          const content = localStation
            ? buildPopupContent(localStation)
            : buildFallbackPopup(feature.properties)
          layer.bindPopup(content, { maxWidth: 280 })
        },
      }).addTo(map)
    }

    init()

    return () => { if (map) map.remove() }
  }, [])

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />
}

'use client'

import { useEffect, useRef } from 'react'

const NYC_BOUNDS = [
  [40.4774, -74.2591],
  [40.9176, -73.7004],
]

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

      fetch('https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Borough_Boundary/FeatureServer/0/query?where=1%3D1&outFields=BoroName&outSR=4326&f=geojson')
        .then(r => r.json())
        .then(data => {
          L.geoJSON(data, {
            style: {
              color: '#333333',
              weight: 2.5,
              opacity: 0.8,
              fillOpacity: 0,
            },
          }).addTo(map)
        })
    }

    init()

    return () => { if (map) map.remove() }
  }, [])

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />
}

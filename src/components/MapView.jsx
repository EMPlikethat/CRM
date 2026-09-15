import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Leaflet's default marker icon points at image URLs relative to its own
// CSS file, which breaks once Vite bundles everything under hashed
// filenames - point it at the actual bundled images instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CONTIGUOUS_US_CENTER = [39.8283, -98.5795]

export default function MapView({ properties, onRetryGeocode }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [retrying, setRetrying] = useState(null)
  const [retryError, setRetryError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = L.map(containerRef.current).setView(CONTIGUOUS_US_CENTER, 4)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const marker of markersRef.current) marker.remove()

    const located = properties.filter((p) => p.lat != null && p.lng != null)
    markersRef.current = located.map((p) =>
      L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.address),
    )

    if (located.length > 0) {
      map.fitBounds(
        located.map((p) => [p.lat, p.lng]),
        { padding: [30, 30], maxZoom: 15 },
      )
    }
  }, [properties])

  async function handleRetry(id) {
    setRetrying(id)
    setRetryError(null)
    try {
      await onRetryGeocode(id)
    } catch (err) {
      setRetryError(err.message)
    }
    setRetrying(null)
  }

  const unlocated = properties.filter((p) => p.lat == null || p.lng == null)

  return (
    <div className="map-view">
      <h2>Map</h2>
      <div ref={containerRef} className="map-container" />

      {unlocated.length > 0 && (
        <div className="map-unlocated">
          <h3>Not yet located ({unlocated.length})</h3>
          <p className="map-unlocated-note">
            New addresses are located automatically in the background - this
            usually clears within a minute. If one stays here, the address
            may need fixing, or the geocoding service may be unreachable.
          </p>
          <ul>
            {unlocated.map((p) => (
              <li key={p.id} className="map-unlocated-item">
                <span>{p.address}</span>
                <button
                  type="button"
                  onClick={() => handleRetry(p.id)}
                  disabled={retrying === p.id}
                >
                  {retrying === p.id ? 'Locating…' : 'Retry'}
                </button>
              </li>
            ))}
          </ul>
          {retryError && <p className="invoice-email-error">{retryError}</p>}
        </div>
      )}
    </div>
  )
}

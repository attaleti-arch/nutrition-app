'use client'
import { useEffect, useRef, useState } from 'react'

// ─── מפה קטנה ───
// "זה לא מתנהג כמו מפה שאפשר להבין" — מהרחוב, אחרי 233 מטר. הביקון לבדו
// אומר "לכיוון הזה", אבל לא איפה אני, לאן הלכתי, ומה הרחובות סביבי.
//
// אז יש מפה. מה שיש עליה: הרחובות האמיתיים, הבית, המסלול, ואני. מה שאין
// עליה בכוונה: סיכה על היצור. במקומה אזור זוהר — "הוא איפשהו שם" — כדי
// שהחיפוש יישאר חיפוש והביקון יישאר הכלי לרגע האחרון. בלי מספרים של
// מרחק.

let Lmod = null
const AMBER = '#E5A342'

function useLeaflet() {
  const [ready, setReady] = useState(!!Lmod)
  useEffect(() => {
    if (Lmod) { setReady(true); return }
    let alive = true
    import('leaflet').then(mod => { Lmod = mod.default || mod; if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  return ready
}

export function MiniMap({ home, path, pos, target, warmM = 70, height = 230 }) {
  const ready = useLeaflet()
  const el = useRef(null)
  const map = useRef(null)
  const lay = useRef({})
  const follow = useRef(true)
  const [following, setFollowing] = useState(true)

  // ── המפה עצמה, פעם אחת ──
  useEffect(() => {
    if (!ready || !el.current || map.current) return
    const L = Lmod
    const at = pos || home
    const m = L.map(el.current, {
      zoomControl: false, attributionControl: true,
      scrollWheelZoom: false, tap: true,
    }).setView(at ? [at.lat, at.lng] : [32.08, 34.78], 16)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(m)
    m.on('dragstart', () => { follow.current = false; setFollowing(false) })
    map.current = m
    return () => { m.remove(); map.current = null; lay.current = {} }
  }, [ready])

  // ── המסלול והבית ──
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.path?.remove(); lay.current.home?.remove()
    if (path?.length) {
      lay.current.path = L.polyline(path.map(p => [p.lat, p.lng]),
        { color: AMBER, weight: 4, opacity: 0.55, dashArray: '2 10', lineCap: 'round' }).addTo(m)
    }
    if (home) {
      lay.current.home = L.marker([home.lat, home.lng], {
        icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
          html: '<div style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">🏠</div>' }),
        interactive: false,
      }).addTo(m)
    }
  }, [ready, path, home])

  // ── האזור החם: היצור איפשהו שם ──
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.warm?.remove(); lay.current.warm2?.remove()
    if (!target) return
    lay.current.warm2 = L.circle([target.lat, target.lng], { radius: warmM * 1.8, color: AMBER,
      weight: 0, fillColor: AMBER, fillOpacity: 0.10, interactive: false }).addTo(m)
    lay.current.warm = L.circle([target.lat, target.lng], { radius: warmM, color: AMBER,
      weight: 2, dashArray: '4 6', opacity: 0.7, fillColor: AMBER, fillOpacity: 0.18, interactive: false }).addTo(m)
  }, [ready, target?.lat, target?.lng, warmM])

  // ── אני ──
  useEffect(() => {
    const m = map.current
    if (!m || !pos) return
    const L = Lmod
    const ll = [pos.lat, pos.lng]
    if (!lay.current.me) {
      lay.current.acc = L.circle(ll, { radius: pos.acc || 0, color: '#8FB57C', weight: 1, opacity: 0.5,
        fillColor: '#8FB57C', fillOpacity: 0.12, interactive: false }).addTo(m)
      lay.current.me = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#4C8DE8',
        fillOpacity: 1, interactive: false }).addTo(m)
    } else {
      lay.current.me.setLatLng(ll)
      lay.current.acc.setLatLng(ll).setRadius(pos.acc || 0)
    }
    if (follow.current) m.panTo(ll, { animate: true, duration: 0.6 })
  }, [ready, pos?.lat, pos?.lng, pos?.acc])

  const recenter = () => {
    follow.current = true; setFollowing(true)
    const at = pos || home
    if (map.current && at) map.current.panTo([at.lat, at.lng], { animate: true })
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden',
      border: '1px solid #2B382B', background: '#1C261D' }}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {!ready && <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        margin: 0, color: '#9BA495', fontSize: 14 }}>טוענים מפה…</p>}
      {!following && (
        <button onClick={recenter} style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, zIndex: 500,
          padding: '8px 12px', borderRadius: 10, border: 'none', background: '#E5A342', color: '#14200F',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          לאיפה שאני
        </button>
      )}
      {target && (
        <p style={{ position: 'absolute', top: 8, insetInlineEnd: 10, zIndex: 500, margin: 0, padding: '4px 9px',
          borderRadius: 8, background: 'rgba(15,21,15,.72)', color: '#E9E5D8', fontSize: 13, fontWeight: 700 }}>
          הזוהר: הוא איפשהו שם
        </p>
      )}
    </div>
  )
}

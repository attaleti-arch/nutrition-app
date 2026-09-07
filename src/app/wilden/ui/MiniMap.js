'use client'
import { useEffect, useRef, useState } from 'react'

// ─── המפה ───
// "רציתי מסלול כמו גוגל, של שעה, שמבינים לאן פונים ולאן הולכים, עם יעד
// ברור וכמה דמויות שפוגשים בדרך." זה המסך הראשי של ההליכה.
//
// מה שיש: הרחובות האמיתיים, הבית, המסלול, אני עם עיגול הדיוק, והתחנות —
// היצור הבא כסמן גדול עם התמונה שלו, הבאים אחריו כנקודות, מי שנתפס
// כסימון וי. מעקב אחרי הילד בזום של רחוב; כפתור לראות את כל הלולאה.

let Lmod = null
const AMBER = '#E5A342'
const GREEN = '#8FB57C'
const FOLLOW_ZOOM = 17

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

function stopIcon(L, s, isNext, img, name) {
  if (s.done) {
    return L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<div style="width:26px;height:26px;border-radius:50%;background:${GREEN};border:2px solid #fff;display:grid;place-items:center;color:#14200F;font-weight:900;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.4)">✓</div>` })
  }
  if (!isNext) {
    return L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9],
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${AMBER};opacity:.75;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>` })
  }
  const pic = img
    ? `<img src="${img}" alt="" style="width:48px;height:48px;object-fit:contain;display:block">`
    : `<div style="width:40px;height:40px;border-radius:50%;background:${AMBER}"></div>`
  return L.divIcon({ className: '', iconSize: [64, 76], iconAnchor: [32, 70],
    html: `<div style="display:grid;justify-items:center;gap:2px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(229,163,66,.28);border:3px solid ${AMBER};display:grid;place-items:center;animation:wildenPin 1.6s ease-in-out infinite">${pic}</div>
      <div style="background:${AMBER};color:#14200F;font-weight:900;font-size:12px;padding:1px 7px;border-radius:8px;white-space:nowrap">${name || ''}</div>
    </div>` })
}

export function MiniMap({ home, path, pos, stops = [], nextStop = 0, creatureImg, creatureName, height = '46vh' }) {
  const ready = useLeaflet()
  const el = useRef(null)
  const map = useRef(null)
  const lay = useRef({ stops: [] })
  const follow = useRef(true)
  const fitted = useRef(false)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    if (!ready || !el.current || map.current) return
    const L = Lmod
    const at = pos || home
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
      .setView(at ? [at.lat, at.lng] : [32.08, 34.78], FOLLOW_ZOOM)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m)
    m.on('dragstart', () => { follow.current = false; setFollowing(false) })
    map.current = m
    return () => { m.remove(); map.current = null; lay.current = { stops: [] }; fitted.current = false }
  }, [ready])

  // המסלול והבית. בפעם הראשונה — כל הלולאה על המסך, שיראו לאן הולכים.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.path?.remove(); lay.current.home?.remove()
    if (path?.length) {
      lay.current.path = L.polyline(path.map(p => [p.lat, p.lng]),
        { color: '#4C8DE8', weight: 6, opacity: 0.75, lineJoin: 'round', lineCap: 'round' }).addTo(m)
      if (!fitted.current) {
        m.fitBounds(lay.current.path.getBounds(), { padding: [24, 24] })
        fitted.current = true
        // אחרי כמה שניות של "הנה כל המסלול" — חוזרים לעקוב אחרי הילד.
        setTimeout(() => { if (map.current && follow.current && pos) map.current.setView([pos.lat, pos.lng], FOLLOW_ZOOM, { animate: true }) }, 4000)
      }
    }
    if (home) {
      lay.current.home = L.marker([home.lat, home.lng], { interactive: false,
        icon: L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14],
          html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">🏠</div>' }) }).addTo(m)
    }
  }, [ready, path, home])

  // התחנות
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.stops.forEach(x => x.remove()); lay.current.stops = []
    stops.forEach((s, i) => {
      const mk = L.marker([s.lat, s.lng], { icon: stopIcon(L, s, i === nextStop, creatureImg, creatureName),
        interactive: false, zIndexOffset: i === nextStop ? 1000 : 0 }).addTo(m)
      lay.current.stops.push(mk)
    })
  }, [ready, stops, nextStop, creatureImg, creatureName])

  // אני
  useEffect(() => {
    const m = map.current
    if (!m || !pos) return
    const L = Lmod
    const ll = [pos.lat, pos.lng]
    if (!lay.current.me) {
      lay.current.acc = L.circle(ll, { radius: pos.acc || 0, color: GREEN, weight: 1, opacity: 0.5, fillColor: GREEN, fillOpacity: 0.12, interactive: false }).addTo(m)
      lay.current.me = L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: '#1E66D0', fillOpacity: 1, interactive: false }).addTo(m)
    } else {
      lay.current.me.setLatLng(ll)
      lay.current.acc.setLatLng(ll).setRadius(pos.acc || 0)
    }
    if (follow.current && fitted.current) m.panTo(ll, { animate: true, duration: 0.5 })
  }, [ready, pos?.lat, pos?.lng, pos?.acc])

  const recenter = () => {
    follow.current = true; setFollowing(true)
    const at = pos || home
    if (map.current && at) map.current.setView([at.lat, at.lng], FOLLOW_ZOOM, { animate: true })
  }
  const showAll = () => {
    follow.current = false; setFollowing(false)
    if (map.current && lay.current.path) map.current.fitBounds(lay.current.path.getBounds(), { padding: [24, 24] })
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 16, overflow: 'hidden', border: '1px solid #2B382B', background: '#1C261D' }}>
      <style>{`@keyframes wildenPin{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {!ready && <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, color: '#9BA495', fontSize: 14 }}>טוענים מפה…</p>}
      <div style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, zIndex: 500, display: 'flex', gap: 8 }}>
        {!following && <button onClick={recenter} style={btn}>לאיפה שאני</button>}
        <button onClick={showAll} style={{ ...btn, background: 'rgba(15,21,15,.8)', color: '#E9E5D8' }}>כל המסלול</button>
      </div>
    </div>
  )
}

const btn = { padding: '9px 13px', borderRadius: 10, border: 'none', background: '#E5A342', color: '#14200F',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }

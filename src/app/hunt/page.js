'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import { MONSTERS, Monster } from './monsters'
import { unlockAudio, setMuted, sfxTick, sfxRustle, sfxCatch, sfxAppear, sfxFinish, buzz } from './audio'
import { fetchStreets, pickSpotsAdaptive } from './osm'
import { buildGraph, nearestNode, planLoop, spreadAlong, loopCoords } from './routing'

// ─────────────────────────────────────────────────────────────
// ציד היצורים — מסלול אחד, שעה בחוץ, עשרה יצורים, וחזרה הביתה.
// אין נקודות שצריך להסביר, אין בנייה, אין מסך בבית. יוצאים, אוספים, חוזרים.
// ─────────────────────────────────────────────────────────────

const STORE_KEY = 'hunt_v1'
const COUNT = 10

// אורך הליכה בפועל על הרחובות. ~4 קמ"ש עם ילד, כולל עצירות לתפיסה.
const LENGTHS = [
  { k: 'short', label: 'קצר', mins: 30, meters: 2200 },
  { k: 'mid', label: 'רגיל', mins: 45, meters: 3200 },
  { k: 'long', label: 'ארוך', mins: 60, meters: 4200 },
]
const lengthOf = k => LENGTHS.find(l => l.k === k) || LENGTHS[1]
// כמה מפה להוריד: מספיק כדי שהלולאה תוכל להתפרש, בלי להוריד חצי עיר
const fetchRadiusFor = meters => Math.max(450, Math.min(1250, Math.round(meters * 0.32)))

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── גאוגרפיה ──
function haversine(a, b) {
  const R = 6371000
  const t1 = (a.lat * Math.PI) / 180, t2 = (b.lat * Math.PI) / 180
  const dt = t2 - t1, dl = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dt / 2) ** 2 + Math.cos(t1) * Math.cos(t2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

function offsetPoint(home, bearingDeg, distM) {
  const rad = (bearingDeg * Math.PI) / 180
  const dy = Math.cos(rad) * distM
  const dx = Math.sin(rad) * distM
  return {
    lat: home.lat + dy / 111320,
    lng: home.lng + dx / (111320 * Math.cos((home.lat * Math.PI) / 180)),
  }
}

// טבעת סביב הבית: היצורים מסודרים לפי הזווית, כך שההליכה יוצאת מעגל אחד
// ולא זיגזג. הרעש בזווית וברדיוס הוא מה שמונע מזה להיראות כמו מסלול מחשב.
function buildRoute(home, radius) {
  const jitter = () => (Math.random() - 0.5)
  const start = Math.random() * 360
  const dir = Math.random() < 0.5 ? 1 : -1
  const kinds = dealKinds(COUNT)
  const pts = []
  for (let i = 0; i < COUNT; i++) {
    const angle = start + dir * ((360 / COUNT) * i + jitter() * 18)
    const r = radius * (0.75 + Math.random() * 0.5)
    const m = kinds[i]
    pts.push({ ...offsetPoint(home, angle, r), kind: m.id, pts: m.pts, caught: false })
  }
  return pts
}

// חלוקה מחפיסה ולא הגרלה עצמאית לכל נקודה: הגרלה חופשית מייצרת מסלולים
// שבהם שישה מתוך עשרה הם אותו יצור, וזה נראה דל.
function dealKinds(n) {
  const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1])
  const bag = []
  while (bag.length < n) bag.push(...shuffle(MONSTERS))
  return shuffle(bag.slice(0, n))
}

function routeFrom(spots) {
  const kinds = dealKinds(spots.length)
  return spots.map((s, i) => ({ lat: s.lat, lng: s.lng, kind: kinds[i].id, pts: kinds[i].pts, caught: false }))
}

function routeLength(home, pts) {
  let total = haversine(home, pts[0])
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i])
  total += haversine(pts[pts.length - 1], home)
  return total
}

function load() {
  try { const r = localStorage.getItem(STORE_KEY); if (r) return JSON.parse(r) } catch (e) { /* התחלה נקייה */ }
  return null
}
function save(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); return true } catch (e) { return false }
}

// Leaflet מגיע מהחבילה ולא מ-CDN: אם ה-CDN לא נענה באמצע הליכה בשכונה,
// המשחק כולו נתקע. ככה הוא ארוז יחד עם העמוד.
let Lmod = null
function useLeaflet() {
  const [ready, setReady] = useState(!!Lmod)
  useEffect(() => {
    if (Lmod) { setReady(true); return }
    let alive = true
    import('leaflet').then(mod => {
      Lmod = mod.default || mod
      if (alive) setReady(true)
    })
    return () => { alive = false }
  }, [])
  return ready
}

const C = {
  cream: '#F3EDE1', card: '#FBF7EE', ink: '#22271E', soft: '#5A6154',
  olive: '#3F5C53', dusk: '#2E3A55', signal: '#C9762A',
}

export default function HuntPage() {
  const mapReady = useLeaflet()
  const [state, setState] = useState(null)
  const [screen, setScreen] = useState('loading') // loading | intro | preview | hunt | done
  const [len, setLen] = useState('mid')
  const [pos, setPos] = useState(null)       // {lat,lng,acc}
  const [geoErr, setGeoErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [caught, setCaught] = useState(null) // היצור שנתפס עכשיו
  const [sound, setSound] = useState(true)

  const mapEl = useRef(null)
  const map = useRef(null)
  const layers = useRef({ me: null, acc: null, marks: [], line: null, home: null })
  const watchId = useRef(null)
  const nearest = useRef({ dist: Infinity, idx: -1 })
  const lastTick = useRef(0)
  const lastRustle = useRef(0)
  const follow = useRef(true)
  const osm = useRef(null)

  // ── טעינת מצב שמור ──
  useEffect(() => {
    const s = load()
    if (!s || !s.home) { setState({ totalPoints: 0, walks: 0 }); setScreen('intro'); return }
    if (s.today && s.today.date === todayKey() && !s.today.done) {
      const allCaught = s.today.route.every(m => m.caught)
      setState(s); setScreen(allCaught ? 'homeward' : 'hunt')
    } else {
      setState(s); setScreen('intro')
    }
  }, [])

  const persist = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  // ── מיקום נוכחי, פעם אחת ──
  const getFix = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('nogeo'))
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })

  function geoMessage(err) {
    if (err && err.code === 1) return 'הדפדפן חוסם את המיקום. צריך לאשר "מיקום" בהגדרות האתר ולנסות שוב.'
    if (err && err.code === 3) return 'לוקח יותר מדי זמן למצוא מיקום. נסו שוב, עדיף בחוץ מתחת לשמיים פתוחים.'
    if (err && err.message === 'nogeo') return 'הדפדפן הזה לא תומך במיקום. נסו בכרום או בספארי בנייד.'
    return 'לא הצלחנו למצוא את המיקום. נסו שוב בעוד רגע.'
  }

  // ── "אני בבית" → יוצרים מסלול ומראים אותו לאישור ──
  async function anchorHome() {
    setBusy('fix'); setGeoErr(null)
    unlockAudio()
    let fix
    try {
      fix = await getFix()
    } catch (err) {
      setGeoErr(geoMessage(err)); setBusy(false); return
    }
    const home = { lat: fix.lat, lng: fix.lng }
    setPos(fix)

    setBusy('streets')
    const built = await planRoute(home, lengthOf(len).meters)
    persist(prev => ({
      ...(prev || { totalPoints: 0, walks: 0 }),
      home,
      today: { date: todayKey(), done: false, len, ...built },
    }))
    setScreen('preview')
    setBusy(false)
  }

  // פיזור לפי מרחק בלבד מניח יצורים בשטח מת — חלקות ריקות, אזורי תעשייה,
  // ובמקרה אחד גם בית קברות. לכן שואלים קודם את OpenStreetMap אילו רחובות
  // ושבילים באמת קיימים, ומניחים רק עליהם.
  async function planRoute(home, meters) {
    const radius = fetchRadiusFor(meters)
    try {
      const data = osm.current && osm.current.home.lat === home.lat &&
                   osm.current.home.lng === home.lng && osm.current.radius === radius
        ? osm.current.data
        : await fetchStreets(home.lat, home.lng, radius)
      osm.current = { home, radius, data }

      // ── לולאה אמיתית: יוצאים מהבית, נעים בין הרחובות, וחוזרים ברחוב אחר ──
      const graph = buildGraph(data.ways, data.blocked)
      if (graph.nodes.length > 4) {
        const start = nearestNode(graph, home)
        if (start.idx >= 0 && start.dist < 220) {
          const loop = planLoop(graph, start.idx, meters)
          if (loop) {
            const spots = spreadAlong(graph, loop.loop, COUNT)
            if (spots.length === COUNT) {
              return {
                route: routeFrom(spots),
                path: loopCoords(graph, loop.loop),
                km: loop.len / 1000,
                sameStreet: loop.overlap,
                verified: true,
              }
            }
          }
        }
      }

      // הרחובות ידועים אבל לא נמצאה לולאה — לפחות נניח על רחובות אמיתיים
      const { spots } = pickSpotsAdaptive({
        home, points: data.points, blocked: data.blocked,
        radius: meters / 7, count: COUNT,
      })
      if (spots.length >= 5) return { route: routeFrom(spots), path: null, verified: true }
    } catch (e) {
      // Overpass לא זמין — ממשיכים, אבל אומרים את זה במפורש במסך האישור
    }
    return { route: buildRoute(home, meters / 7), path: null, verified: false }
  }

  async function reroll() {
    setBusy('streets')
    const built = await planRoute(state.home, lengthOf(state.today.len).meters)
    persist(prev => ({ ...prev, today: { ...prev.today, ...built } }))
    setBusy(false)
  }

  function startHunt() {
    unlockAudio()
    follow.current = true
    setScreen('hunt')
  }

  // ── מעקב חי בזמן הציד ──
  useEffect(() => {
    if ((screen !== 'hunt' && screen !== 'homeward') || !state?.today) return
    if (!navigator.geolocation) { setGeoErr(geoMessage({ message: 'nogeo' })); return }
    watchId.current = navigator.geolocation.watchPosition(
      p => {
        setGeoErr(null)
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy })
      },
      err => setGeoErr(geoMessage(err)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    )
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [screen, state?.today?.date])

  // ── בדיקת תפיסה + חישוב הקרוב ביותר ──
  useEffect(() => {
    if (screen !== 'hunt' || !pos || !state?.today || caught) return
    const route = state.today.route
    // רדיוס תפיסה מסתגל לדיוק ה-GPS: בשכונה צפופה הדיוק גרוע ו-15 מטר קבועים
    // פשוט לא ייתפסו לעולם.
    const R = Math.min(45, Math.max(22, (pos.acc || 30) * 0.9))
    let best = { dist: Infinity, idx: -1 }
    route.forEach((m, i) => {
      if (m.caught) return
      const d = haversine(pos, m)
      if (d < best.dist) best = { dist: d, idx: i }
    })
    nearest.current = best

    if (best.idx >= 0 && best.dist <= R) {
      const m = route[best.idx]
      sfxCatch(); buzz([30, 60, 120])
      setCaught({ ...m, idx: best.idx })
      persist(prev => {
        const r = prev.today.route.map((x, i) => (i === best.idx ? { ...x, caught: true } : x))
        return { ...prev, today: { ...prev.today, route: r }, totalPoints: (prev.totalPoints || 0) + m.pts }
      })
    }
  }, [pos, screen, state?.today?.route, caught, persist])

  // ── הדרך הביתה: היעד האחרון הוא הבית עצמו ──
  useEffect(() => {
    if (screen !== 'homeward' || !pos || !state?.home) return
    const d = haversine(pos, state.home)
    nearest.current = { dist: d, idx: -1 }
    const R = Math.min(60, Math.max(30, (pos.acc || 30) * 1.2))
    if (d <= R) {
      sfxFinish(); buzz([40, 70, 40, 70, 160])
      persist(prev => ({ ...prev, walks: (prev.walks || 0) + 1, today: { ...prev.today, done: true } }))
      setScreen('done')
    }
  }, [pos, screen, state?.home, persist])

  // ── טיקים ורשרושים: זה מה שמאפשר ללכת עם העיניים למעלה ──
  useEffect(() => {
    if ((screen !== 'hunt' && screen !== 'homeward') || caught) return
    const id = setInterval(() => {
      const { dist } = nearest.current
      if (!isFinite(dist) || dist > 300) return
      const now = Date.now()
      const gap = Math.min(2500, Math.max(250, 250 + (dist - 25) * 10))
      if (now - lastTick.current >= gap) {
        lastTick.current = now
        sfxTick(1 - Math.min(1, (dist - 20) / 280))
      }
      if (screen === 'hunt' && dist < 45 && now - lastRustle.current > 2000 + Math.random() * 3000) {
        lastRustle.current = now
        sfxRustle()
      }
    }, 120)
    return () => clearInterval(id)
  }, [screen, caught])

  // ── המפה ──
  // כל מסך מרנדר את ה-div שלו, אז במעבר בין מסכים ה-div הישן כבר לא בעמוד
  // ו-Leaflet נשאר תלוי באוויר — המפה נראית ריקה. לכן בונים אותה מחדש
  // בכל פעם שהמכולה בפועל השתנתה.
  useEffect(() => {
    const usesMap = screen === 'preview' || screen === 'hunt' || screen === 'homeward'
    if (map.current && (!usesMap || map.current.getContainer() !== mapEl.current)) {
      map.current.remove()
      map.current = null
      layers.current = { me: null, acc: null, marks: [], line: null, home: null }
    }
    if (!mapReady || !usesMap || !mapEl.current || map.current) return
    const L = Lmod
    const home = state?.home
    map.current = L.map(mapEl.current, { zoomControl: false, attributionControl: true })
      .setView(home ? [home.lat, home.lng] : [32.08, 34.78], 16)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map.current)
    L.control.zoom({ position: 'topleft' }).addTo(map.current)
    map.current.on('dragstart', () => { follow.current = false })
  }, [mapReady, screen, state?.home])

  // ── ציור היצורים, הבית והקו ──
  useEffect(() => {
    if (!map.current || !state?.today) return
    const L = Lmod
    const lay = layers.current
    lay.marks.forEach(m => m.remove())
    lay.marks = []
    if (lay.line) { lay.line.remove(); lay.line = null }
    if (lay.home) { lay.home.remove(); lay.home = null }

    const home = state.home
    const route = state.today.route

    lay.line = state.today.path
      ? L.polyline(state.today.path,
          { color: C.dusk, weight: 5, opacity: 0.6, lineJoin: 'round', lineCap: 'round' })
        .addTo(map.current)
      : L.polyline(
          [[home.lat, home.lng], ...route.map(p => [p.lat, p.lng]), [home.lat, home.lng]],
          { color: C.dusk, weight: 3, opacity: 0.45, dashArray: '7 9' }
        ).addTo(map.current)

    lay.home = L.marker([home.lat, home.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">🏠</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      }),
    }).addTo(map.current)

    route.forEach(m => {
      const info = MONSTERS.find(x => x.id === m.kind)
      const html = m.caught
        ? `<div style="width:22px;height:22px;border-radius:50%;background:${info.hue};opacity:.32;border:2px solid #fff"></div>`
        : `<div class="hunt-blip" style="width:30px;height:30px;border-radius:50%;background:${info.hue};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;gap:3px">
             <span style="width:5px;height:5px;border-radius:50%;background:#2A2F26"></span>
             <span style="width:5px;height:5px;border-radius:50%;background:#2A2F26"></span>
           </div>`
      lay.marks.push(
        L.marker([m.lat, m.lng], { icon: L.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] }) })
          .addTo(map.current)
      )
    })

    if (screen === 'preview') {
      map.current.fitBounds(lay.line.getBounds(), { padding: [45, 45] })
    }
  }, [state?.today?.route, state?.today?.path, screen, mapReady])

  // ── הנקודה הכחולה ──
  useEffect(() => {
    if (!map.current || !pos) return
    const L = Lmod
    const lay = layers.current
    if (!lay.me) {
      lay.acc = L.circle([pos.lat, pos.lng], { radius: pos.acc || 20, color: C.dusk, weight: 1, opacity: 0.35, fillOpacity: 0.08 }).addTo(map.current)
      lay.me = L.circleMarker([pos.lat, pos.lng], { radius: 8, color: '#fff', weight: 3, fillColor: C.dusk, fillOpacity: 1 }).addTo(map.current)
    } else {
      lay.me.setLatLng([pos.lat, pos.lng])
      lay.acc.setLatLng([pos.lat, pos.lng]).setRadius(pos.acc || 20)
    }
    if ((screen === 'hunt' || screen === 'homeward') && follow.current) map.current.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 })
  }, [pos, screen])

  function dismissCatch() {
    setCaught(null)
    const left = state.today.route.filter(m => !m.caught).length
    if (left === 0) {
      follow.current = true
      setScreen('homeward')
    }
    sfxAppear()
  }

  function toggleSound() {
    const v = !sound
    setSound(v); setMuted(!v)
    if (v) { unlockAudio(); sfxAppear() }
  }

  // ═══ תצוגה ═══
  if (screen === 'loading') return <Shell><p style={{ textAlign: 'center', color: C.soft }}>רגע…</p></Shell>

  const today = state?.today
  const found = today ? today.route.filter(m => m.caught).length : 0
  const dist = nearest.current.dist

  return (
    <Shell>
      {screen === 'intro' && (
        <div>
          <h1 style={S.h1}>ציד היצורים</h1>
          <p style={S.lede}>יוצאים מהבית, מסתובבים בשכונה, אוספים עשרה יצורים — וחוזרים הביתה.</p>

          {state?.totalPoints > 0 && (
            <div style={S.stats}>
              <div><b style={S.statN}>{state.totalPoints}</b><span style={S.statL}>נקודות</span></div>
              <div><b style={S.statN}>{state.walks || 0}</b><span style={S.statL}>{(state.walks || 0) === 1 ? 'מסלול' : 'מסלולים'}</span></div>
            </div>
          )}

          <p style={S.label}>כמה זמן יש לכם?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
            {LENGTHS.map(l => (
              <button key={l.k} onClick={() => setLen(l.k)}
                style={{ ...S.chip, ...(len === l.k ? S.chipOn : {}) }}>
                {l.label}<span style={{ display: 'block', fontSize: 12, fontWeight: 400, opacity: .8 }}>{l.mins} דק׳</span>
              </button>
            ))}
          </div>

          <button onClick={anchorHome} disabled={!!busy} style={S.cta}>
            {busy === 'fix' ? 'מחפשים אתכם על המפה…'
              : busy === 'streets' ? 'בודקים אילו רחובות יש סביבכם…'
              : 'אני בבית — בונים מסלול'}
          </button>
          {geoErr && <p style={S.err}>{geoErr}</p>}

          <p style={S.fine}>
            המסלול נבנה סביב המקום שבו אתם עומדים עכשיו, ונשמר רק במכשיר הזה.
            <b> יוצאים תמיד עם מבוגר</b> — המסלול מחושב לפי מרחק ואוויר, הוא לא יודע איפה יש כביש.
          </p>
        </div>
      )}

      {screen === 'preview' && (
        <div>
          <h1 style={{ ...S.h1, fontSize: 27 }}>המסלול של היום</h1>
          <p style={S.lede}>
            {today && `${(today.km || routeLength(state.home, today.route) / 1000).toFixed(1)} ק״מ · בערך ${lengthOf(today.len).mins} דקות · ${today.route.length} יצורים`}
          </p>
          {today?.path ? (
            <p style={S.ok}>
              ✓ מסלול הליכה על הרחובות — יוצא מהבית, מסתובב בשכונה, ו
              {today.sameStreet < 0.15 ? 'חוזר בדרך אחרת' : 'חוזר הביתה'}.
              היצורים פרוסים לאורכו במרווחים שווים.
            </p>
          ) : today?.verified ? (
            <p style={S.ok}>
              ✓ היצורים הונחו על רחובות אמיתיים — מחוץ לבתי קברות, שדות, אזורי תעשייה ומים.
              לא נמצאה לולאה שלמה באזור, אז אין קו מסלול רציף.
            </p>
          ) : (
            <p style={S.warn}>
              לא הצלחנו לבדוק את המפה כרגע, אז היצורים פוזרו לפי מרחק בלבד — חלקם עלולים ליפול בשטח פתוח.
              כדאי ללחוץ "מסלול אחר", ובכל מקרה לעבור על המסלול לפני שיוצאים.
            </p>
          )}
          <div ref={mapEl} style={S.map} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={reroll} disabled={!!busy} style={{ ...S.cta, ...S.ctaGhost, flex: '0 0 40%' }}>
              {busy ? 'רגע…' : 'מסלול אחר'}
            </button>
            <button onClick={startHunt} style={{ ...S.cta, flex: 1 }}>יוצאים! 🐾</button>
          </div>
          <p style={S.fine}>
            {today?.path
              ? <>הקו הוא <b>הדרך עצמה</b> — הולכים לפיו, והיצורים מחכים עליו.</>
              : <>הקו המקווקו מראה את <b>סדר</b> היצורים, לא את הדרך — הולכים ברחובות.</>}
          </p>
        </div>
      )}

      {(screen === 'hunt' || screen === 'homeward') && today && (
        <div>
          <div style={S.hud}>
            <div style={S.hudCount}>
              {Array.from({ length: today.route.length }).map((_, i) => (
                <span key={i} style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: i < found ? C.signal : 'rgba(90,97,84,.22)',
                }} />
              ))}
              <b style={{ marginInlineStart: 8, fontSize: 15 }}>{found}/{today.route.length}</b>
            </div>
            <button onClick={toggleSound} style={S.mute} aria-label="צליל">{sound ? '🔊' : '🔇'}</button>
          </div>

          {screen === 'homeward' && (
            <div style={S.homeward}>
              <b style={{ fontSize: 18 }}>{today.route.length} יצורים אצלכם 🎉</b>
              <span style={{ fontSize: 15 }}>עכשיו הביתה — שם המסלול נסגר.</span>
            </div>
          )}

          <div style={S.radar}>
            {isFinite(dist) ? (
              <>
                <b style={{ ...S.radarN, color: dist < 60 ? C.signal : C.dusk }}>
                  {dist < 1000 ? Math.round(dist) : (dist / 1000).toFixed(1) + 'k'}
                </b>
                <span style={S.radarL}>
                  {screen === 'homeward'
                    ? (dist < 60 ? 'כמעט בבית 🏠' : 'מטרים הביתה')
                    : (dist < 60 ? 'ממש קרוב — תסתכלו מסביב 👀' : 'מטרים ליצור הקרוב')}
                </span>
              </>
            ) : <span style={S.radarL}>מחפשים אתכם…</span>}
          </div>

          <div ref={mapEl} style={{ ...S.map, height: '52vh' }} />
          {geoErr && <p style={S.err}>{geoErr}</p>}
          <p style={S.fine}>המסך יכול להישאר בכיס — ככל שמתקרבים, הטיקים מהירים יותר.</p>
        </div>
      )}

      {screen === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Monster id={MONSTERS[0].id} size={104} />
          </div>
          <h1 style={S.h1}>חזרתם הביתה 🏠</h1>
          <p style={S.lede}>מסלול שלם, ובחוץ.</p>
          <div style={{ ...S.stats, justifyContent: 'center' }}>
            <div><b style={S.statN}>{state.totalPoints}</b><span style={S.statL}>נקודות</span></div>
            <div><b style={S.statN}>{state.walks || 0}</b><span style={S.statL}>{(state.walks || 0) === 1 ? 'מסלול' : 'מסלולים'}</span></div>
          </div>
          <button onClick={() => setScreen('intro')} style={S.cta}>מסלול חדש</button>
        </div>
      )}

      {caught && <CatchOverlay m={caught} onClose={dismissCatch} left={today.route.filter(x => !x.caught).length} />}

      <style>{`
        .hunt-blip{animation:huntPulse 1.7s ease-in-out infinite}
        @keyframes huntPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
        @keyframes huntPop{0%{transform:scale(.3) rotate(-14deg);opacity:0}
          60%{transform:scale(1.12) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes huntRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes huntSpark{0%{transform:scale(0) rotate(0);opacity:1}100%{transform:scale(1.9) rotate(140deg);opacity:0}}
        @media (prefers-reduced-motion: reduce){
          .hunt-blip{animation:none}
          [class^="hunt-"]{animation-duration:.01ms !important}
        }
        .leaflet-container{border-radius:14px;font-family:inherit}
      `}</style>
    </Shell>
  )
}

function CatchOverlay({ m, onClose, left }) {
  const info = MONSTERS.find(x => x.id === m.kind)
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ position: 'relative', animation: 'huntPop .5s cubic-bezier(.2,1.4,.4,1) both' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <span key={i} aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '50%', fontSize: 22,
            transform: `rotate(${i * 60}deg) translateY(-86px)`,
            animation: `huntSpark .85s ${0.08 * i}s ease-out both`,
          }}>✨</span>
        ))}
        <Monster id={m.kind} size={168} />
      </div>
      <p style={{ ...S.h1, fontSize: 32, margin: '20px 0 2px', animation: 'huntRise .4s .18s both' }}>{info.name}</p>
      <p style={{ color: C.signal, fontWeight: 700, margin: 0, animation: 'huntRise .4s .26s both' }}>+{m.pts} נקודות</p>
      <p style={{ color: 'rgba(243,237,225,.6)', marginTop: 4, animation: 'huntRise .4s .32s both' }}>
        {left > 0 ? `נשארו עוד ${left}` : 'זה האחרון — הביתה!'}
      </p>
      <button onClick={onClose} style={{ ...S.cta, marginTop: 26, maxWidth: 240, animation: 'huntRise .4s .38s both' }}>תפסתי!</button>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div dir="rtl" style={{
      minHeight: '100dvh', background: C.cream, color: C.ink,
      fontFamily: '"Heebo", system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '26px 18px 44px' }}>{children}</div>
    </div>
  )
}

const S = {
  h1: { fontSize: 34, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.15 },
  lede: { color: C.soft, margin: '0 0 22px', fontSize: 16.5, lineHeight: 1.6 },
  label: { fontSize: 13, fontWeight: 700, color: C.soft, margin: '0 0 8px' },
  chip: {
    flex: 1, padding: '11px 6px', borderRadius: 12, cursor: 'pointer',
    border: '1.5px solid #DCD2BE', background: C.card, color: C.ink,
    fontFamily: 'inherit', fontSize: 15, fontWeight: 700, lineHeight: 1.3,
  },
  chipOn: { background: C.olive, color: C.cream, borderColor: C.olive },
  cta: {
    width: '100%', padding: '15px 18px', borderRadius: 13, border: 'none',
    background: C.olive, color: C.cream, fontFamily: 'inherit',
    fontSize: 17, fontWeight: 800, cursor: 'pointer',
  },
  ctaGhost: { background: 'transparent', color: C.olive, border: `1.5px solid ${C.olive}` },
  map: { height: '46vh', minHeight: 260, borderRadius: 14, border: '1px solid #DCD2BE', background: '#E8E2D4' },
  hud: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  hudCount: { display: 'flex', alignItems: 'center', gap: 4 },
  mute: { border: 'none', background: 'transparent', fontSize: 21, cursor: 'pointer', padding: 4, lineHeight: 1 },
  radar: {
    background: C.card, border: '1px solid #DCD2BE', borderRadius: 14,
    padding: '14px 16px', marginBottom: 12, textAlign: 'center',
  },
  radarN: { display: 'block', fontSize: 40, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  radarL: { fontSize: 13.5, color: C.soft },
  stats: {
    display: 'flex', gap: 10, margin: '0 0 22px',
  },
  statN: { display: 'block', fontSize: 27, fontWeight: 900, color: C.dusk, fontVariantNumeric: 'tabular-nums' },
  statL: { fontSize: 12.5, color: C.soft },
  err: {
    marginTop: 12, padding: '11px 13px', borderRadius: 10,
    background: '#FBE9E4', color: '#8A3520', fontSize: 14.5, lineHeight: 1.55,
  },
  homeward: {
    display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center',
    padding: '12px 14px', borderRadius: 12, marginBottom: 10,
    background: '#E7EBDF', color: '#33452E', lineHeight: 1.5,
  },
  ok: {
    padding: '10px 13px', borderRadius: 10, background: '#E7EBDF',
    color: '#33452E', fontSize: 14, lineHeight: 1.55, margin: '0 0 12px',
  },
  warn: {
    padding: '10px 13px', borderRadius: 10, background: '#F0E4CE',
    color: '#6B4A18', fontSize: 14, lineHeight: 1.55, margin: '0 0 12px',
  },
  fine: { marginTop: 16, fontSize: 13.5, lineHeight: 1.65, color: C.soft },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 900,
    background: 'rgba(28,32,26,.93)', color: C.cream,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, textAlign: 'center', cursor: 'pointer',
  },
}

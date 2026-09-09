'use client'
import { useEffect, useRef, useState } from 'react'
import { bearing as bearingOf, haversine } from '../engine/geo'
import { routeArrows, splitAt, routeDirAt } from '../engine/mapLines'
import { angleDelta } from '../hooks/useOrient'
import { kidSvg } from './Wear'

// ─── המפה ───
// "רציתי מסלול כמו גוגל, של שעה, שמבינים לאן פונים ולאן הולכים, עם יעד
// ברור וכמה דמויות שפוגשים בדרך." זה המסך הראשי של ההליכה.
//
// "הדבר היחיד שלא נפתר זה ממשק המפות, הייתי שמחה שיהיה יותר ברור." אז:
// אריחים נקיים עם שמות רחובות (CARTO Voyager, אותם נתונים של OSM אבל
// מעוצבים כמו מפת ניווט), מסלול עבה עם מסגרת לבנה וחיצים לכיוון
// ההליכה, מה שכבר הלכנו באפור ומה שנשאר בכחול.
//
// ואז: "שיהיה להם דמות שמתקדמת במפה, שפונה עם הפנים לכיוון הנכון, ככה
// שהם ידעו לאן לפנות, אפילו כיוון צעדים." הדמות על המפה מסתכלת תמיד
// לאן *צריך* ללכת (הכיוון של המסלול מהנקודה שבה אנחנו), לא לאן הילד
// הולך במקרה. והמפה מסתובבת עם הטלפון (מצפן), כך ש"למעלה" על המסך זה
// "קדימה" ברחוב: הדמות פונה ימינה על המסך — פונים ימינה ברגליים.
//
// והמטבעות: "שינועו קלות על המפה כמו מטבע אמיתי, ושמתקרבים הוא נעלם."
// מרחפים באוויר, ונעלמים בקפיצה קטנה כשנאספים.

let Lmod = null
const AMBER = '#E5A342'
const GREEN = '#8FB57C'
const BLUE = '#2F7BE5'
const WALKED = '#9AA39E'
const FOLLOW_ZOOM = 17
const GONE_MS = 650

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

// עטיפה שמחזירה סימן ל"למעלה" גם כשהמפה מסובבת. חיצים ודמות לא עוברים
// דרכה — הם צריכים להסתובב עם המפה.
const upright = html => `<div class="wr">${html}</div>`

// ── מטבע שנראה כמו מטבע ──
// "מטבעות שלא נראות מטבעות" — נקודה צהובה היא נקודה. מטבע הוא עיגול עם
// שוליים, ברק, וחריטה. הזהב גדול יותר. כולם מרחפים, כל אחד בקצב קצת
// שונה, כמו מטבע במשחק — ולא כמו סיכה.
function coinSvg(size, gold, seed = 0) {
  const id = gold ? 'wg' : 'wc'
  const face = gold ? '#FFD84A' : '#F2C14E'
  const rim = gold ? '#B8860B' : '#A6731A'
  const delay = -((seed * 7919) % 2200)
  return `<div style="animation:wildenCoinFloat ${gold ? 1.6 : 2.2}s ease-in-out ${delay}ms infinite;transform-origin:50% 50%"><svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".55" stop-color="${face}"/><stop offset="1" stop-color="${rim}"/></radialGradient></defs>
    <circle cx="16" cy="16" r="15" fill="url(#${id})" stroke="${rim}" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="10.5" fill="none" stroke="${rim}" stroke-width="1.2" opacity=".7"/>
    <path d="M12 21 L16 10 L20 21 M13.5 17.5 H18.5" fill="none" stroke="${rim}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="11" cy="9" rx="3.5" ry="2" fill="#fff" opacity=".55" transform="rotate(-30 11 9)"/>
  </svg></div>`
}

// ── הסימנים על המפה ──
// לא מפלצות. זה מוריד את המתח. סימן: עקבות בתוך ענן זוהר עם סימן שאלה.
// מי שכבר נתפס פעם (known) מופיע כדמות בגוון ענבר — "אני יודע מי זה", בלי
// לחשוף צבעים. (צללית שחורה נראתה כמו צל, שהוא יצור בעצמו.) מי שנתפס
// במסע הזה — וי.
function stopIcon(L, s, isNext, img, known) {
  if (s.done) {
    return L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: upright(`<div style="width:26px;height:26px;border-radius:50%;background:${GREEN};border:2px solid #fff;display:grid;place-items:center;color:#14200F;font-weight:900;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.4)">✓</div>`) })
  }
  const size = isNext ? 58 : 36
  const inner = known && img
    ? `<img src="${img}" alt="" style="width:${size - 14}px;height:${size - 14}px;object-fit:contain;display:block;filter:sepia(1) saturate(3.5) hue-rotate(-8deg) brightness(.85) opacity(.9)">`
    : `<div style="position:relative;font-size:${isNext ? 26 : 16}px;line-height:1">🐾<span style="position:absolute;top:-8px;inset-inline-end:-12px;font-size:${isNext ? 18 : 12}px;font-weight:900;color:#14200F;background:${AMBER};border-radius:50%;width:${isNext ? 22 : 15}px;height:${isNext ? 22 : 15}px;display:grid;place-items:center">?</span></div>`
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: upright(`<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(229,163,66,${isNext ? '.3' : '.18'});border:${isNext ? 3 : 2}px ${isNext ? 'solid' : 'dashed'} ${AMBER};display:grid;place-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.45));${isNext ? 'animation:wildenPin 1.6s ease-in-out infinite' : 'opacity:.85'}">${inner}</div>`) })
}

// ── הדמות: ילד מלמעלה, עם אלומת מבט ── (הציור ב-ui/Wear.js, עם מה שקנו בחנות)
function kidIcon(L, facing, kid) {
  return L.divIcon({ className: '', iconSize: [72, 72], iconAnchor: [36, 36], html: kidSvg(facing == null ? 0 : facing, kid) })
}
// בן הלוויה: הדמות החיה, קטנה, מימין לילד. העוגן מוזז כדי שתשב לצידו.
function buddyIcon(L, src) {
  return L.divIcon({ className: '', iconSize: [44, 44], iconAnchor: [-14, 30],
    // height מפורש: ה-CSS של Leaflet דורס max-height על כל תמונה במפה (none !important).
    html: upright(`<div style="width:44px;height:44px;display:grid;place-items:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))"><img src="${src}" alt="" style="height:44px;width:44px;object-fit:contain;display:block"></div>`) })
}

function arrowIcon(L, deg) {
  return L.divIcon({ className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    html: `<svg width="16" height="16" viewBox="0 0 16 16" style="display:block;transform:rotate(${Math.round(deg)}deg)"><path d="M8 2 L13 12 L8 9.5 L3 12 Z" fill="#fff" stroke="${BLUE}" stroke-width="1.2" stroke-linejoin="round"/></svg>` })
}

// אלמנט המפה גדול ב-50% מהחלון (בשביל הסיבוב), אז שישית ממנו מכל צד
// מוסתרת. "כל המסלול" צריך להיכנס בחלק שרואים.
const fitPad = m => { const sz = m.getSize(); return [sz.x / 6 + 28, sz.y / 6 + 28] }

const coinKey = c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`

export function MiniMap({ home, path, pos, along = 0, heading = null, stops = [], nextStop = 0, reveal = true, known = [], creatureImg, coins = [], coinRun = null, height = '46vh', kid = null, buddyImg = null }) {
  // מה הילד לובש (חנות) — נקרא כשמציירים את הדמות. לא משתנה באמצע הליכה.
  const kidRef = useRef(kid); kidRef.current = kid
  const buddyRef = useRef(buddyImg); buddyRef.current = buddyImg
  const ready = useLeaflet()
  const el = useRef(null)
  const wrap = useRef(null)
  const map = useRef(null)
  const lay = useRef({ stops: [], arrows: [], coinMarks: new Map() })
  const follow = useRef(true)
  const fitted = useRef(false)
  const intro = useRef(0)           // עד מתי מראים את כל הלולאה לפני שעוקבים
  const lastPos = useRef(null)      // לחישוב הכיוון מהתנועה
  const motionDir = useRef(null)
  const rot = useRef(0)             // כמה המפה מסובבת עכשיו (מעלות, עם כיוון השעון)
  const [following, setFollowing] = useState(true)
  const [headingUp, setHeadingUp] = useState(true)

  useEffect(() => {
    if (!ready || !el.current || map.current) return
    const L = Lmod
    const at = pos || home
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false })
      .setView(at ? [at.lat, at.lng] : [32.08, 34.78], FOLLOW_ZOOM)
    // ── אריחי המפה, עם גיבוי ──
    // CARTO Voyager: אותם נתונים של OpenStreetMap, מעוצבים כמו מפת ניווט —
    // רחובות לבנים ורחבים, שמות ברורים, פחות רעש. אם השרת שלהם לא עונה
    // מרשת סלולרית ואף אריח לא נטען — עוברים לאריחי OSM עצמם.
    const main = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
    }).addTo(m)
    let ok = 0, bad = 0, swapped = false
    main.on('tileload', () => { ok++ })
    main.on('tileerror', () => {
      bad++
      if (!swapped && ok === 0 && bad >= 3) {
        swapped = true
        main.remove()
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m)
      }
    })
    m.on('dragstart', () => { follow.current = false; setFollowing(false) })
    map.current = m
    return () => { m.remove(); map.current = null; lay.current = { stops: [], arrows: [], coinMarks: new Map() }; fitted.current = false }
  }, [ready])

  // המסלול והבית. בפעם הראשונה — כל הלולאה על המסך, שיראו לאן הולכים.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.casing?.remove(); lay.current.home?.remove()
    lay.current.arrows.forEach(x => x.remove()); lay.current.arrows = []
    if (path?.length) {
      const ll = path.map(p => [p.lat, p.lng])
      // מסגרת לבנה מתחת לקו — ככה הוא נקרא גם על רחוב לבן וגם על פארק ירוק
      lay.current.casing = L.polyline(ll, { color: '#fff', weight: 12, opacity: 0.95, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(m)
      for (const a of routeArrows(path)) {
        lay.current.arrows.push(L.marker([a.lat, a.lng], { interactive: false, icon: arrowIcon(L, a.deg), zIndexOffset: 200 }).addTo(m))
      }
      if (!fitted.current) {
        m.fitBounds(lay.current.casing.getBounds(), { padding: fitPad(m) })
        fitted.current = true
        // אחרי כמה שניות של "הנה כל המסלול" — חוזרים לעקוב אחרי הילד.
        // (בלי intro, המיקום הבא היה גורר את המפה חזרה תוך שבריר שנייה,
        // והלולאה השלמה לא נראתה אף פעם.)
        intro.current = Date.now() + 4000
        setTimeout(() => { intro.current = 0; if (map.current && follow.current && pos) map.current.setView([pos.lat, pos.lng], FOLLOW_ZOOM, { animate: true }) }, 4000)
      }
    }
    if (home) {
      lay.current.home = L.marker([home.lat, home.lng], { interactive: false, zIndexOffset: 300,
        icon: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18],
          html: upright('<div style="width:36px;height:36px;border-radius:50%;background:#fff;border:3px solid #2B382B;display:grid;place-items:center;font-size:20px;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,.4)">🏠</div>') }) }).addTo(m)
    }
  }, [ready, path, home])

  // ── הלכנו / נשאר ──
  // אפור למה שמאחורינו, כחול למה שלפנינו. מצויר מחדש כל ~15 מ'.
  const alongStep = Math.floor((along || 0) / 15)
  useEffect(() => {
    const m = map.current
    if (!m || !path?.length) return
    const L = Lmod
    lay.current.done?.remove(); lay.current.todo?.remove()
    const { done, todo } = splitAt(path, along)
    if (done.length > 1) lay.current.done = L.polyline(done.map(p => [p.lat, p.lng]), { color: WALKED, weight: 7, opacity: 1, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(m)
    if (todo.length > 1) lay.current.todo = L.polyline(todo.map(p => [p.lat, p.lng]), { color: BLUE, weight: 7, opacity: 1, lineJoin: 'round', lineCap: 'round', interactive: false }).addTo(m)
  }, [ready, path, alongStep])

  // התחנות
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.stops.forEach(x => x.remove()); lay.current.stops = []
    if (!reveal) return
    stops.forEach((s, i) => {
      const isKnown = known.includes(s.creature)
      const mk = L.marker([s.lat, s.lng], { icon: stopIcon(L, s, i === nextStop, creatureImg, isKnown),
        interactive: false, zIndexOffset: i === nextStop ? 1000 : 400 }).addTo(m)
      lay.current.stops.push(mk)
    })
  }, [ready, stops, nextStop, creatureImg, reveal, known])

  // ── ריצת המטבעות ──
  // סימן אחד על המסלול: שלושה מטבעות בקשת, "20 שניות". נעלם כשנעשה.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    lay.current.coinRun?.remove(); lay.current.coinRun = null
    if (!coinRun || coinRun.done) return
    lay.current.coinRun = L.marker([coinRun.lat, coinRun.lng], { interactive: false, zIndexOffset: 600, icon: L.divIcon({ className: '', iconSize: [54, 40], iconAnchor: [27, 20],
      html: upright(`<div style="width:54px;height:40px;display:grid;place-items:center;border-radius:12px;background:rgba(255,216,74,.22);border:2px solid #E5A342;box-shadow:0 2px 6px rgba(0,0,0,.35);animation:wildenPin 1.6s ease-in-out infinite"><div style="display:flex;gap:-4px;align-items:flex-end">${coinSvg(14, false, 1)}${coinSvg(18, true, 2)}${coinSvg(14, false, 3)}</div><span style="position:absolute;bottom:-9px;font-size:9px;font-weight:900;background:#E5A342;color:#14200F;border-radius:999px;padding:0 5px">20 שנ׳</span></div>`) }) }).addTo(m)
  }, [ready, coinRun?.lat, coinRun?.lng, coinRun?.done])

  // ── המטבעות ──
  // סמן לכל מטבע, לפי מקום. מטבע שנאסף לא נמחק מיד: הוא קופץ, גדל
  // ונעלם — ורק אז יורד מהמפה. "שמתקרבים והוא נעלם."
  useEffect(() => {
    const m = map.current
    if (!m) return
    const L = Lmod
    const marks = lay.current.coinMarks
    const seen = new Set()
    ;(coins || []).forEach((c, i) => {
      const k = coinKey(c)
      seen.add(k)
      const cur = marks.get(k)
      const size = c.gold ? 30 : 18
      if (!c.taken) {
        if (!cur) {
          marks.set(k, { mk: L.marker([c.lat, c.lng], { interactive: false, zIndexOffset: 500, icon: L.divIcon({ className: '', iconSize: [size, size],
            iconAnchor: [size / 2, size / 2], html: upright(coinSvg(size, c.gold, i)) }) }).addTo(m), gone: false })
        }
      } else if (cur && !cur.gone) {
        cur.gone = true
        cur.mk.setIcon(L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          html: upright(`<div style="animation:wildenCoinGone ${GONE_MS}ms ease-out forwards">${coinSvg(size, c.gold, i)}</div>`) }))
        setTimeout(() => { cur.mk.remove(); if (marks.get(k) === cur) marks.delete(k) }, GONE_MS + 40)
      }
    })
    for (const [k, cur] of marks) if (!seen.has(k) && !cur.gone) { cur.mk.remove(); marks.delete(k) }
  }, [ready, coins])

  // ── הדמות, והמפה שמסתובבת ──
  // הדמות פונה לכיוון המסלול מהמקום שבו אנחנו. המפה מסתובבת לפי המצפן
  // (או לפי כיוון ההליכה כשאין מצפן), כך שלמעלה = קדימה.
  useEffect(() => {
    const m = map.current
    if (!m || !pos) return
    const L = Lmod
    const ll = [pos.lat, pos.lng]
    // הכיוון מהתנועה: מהנקודה הקודמת שהתרחקנו ממנה לפחות 4 מ'. פחות מזה
    // זה רעש GPS והדמות הייתה מסתובבת במקום.
    const prev = lastPos.current
    if (!prev) lastPos.current = pos
    else if (haversine(prev, pos) >= 4) { motionDir.current = bearingOf(prev, pos); lastPos.current = pos }
    const face = routeDirAt(path, along) ?? motionDir.current ?? 0
    if (!lay.current.me) {
      lay.current.acc = L.circle(ll, { radius: pos.acc || 0, color: BLUE, weight: 1, opacity: 0.4, fillColor: BLUE, fillOpacity: 0.1, interactive: false }).addTo(m)
      lay.current.me = L.marker(ll, { interactive: false, zIndexOffset: 2000, icon: kidIcon(L, face, kidRef.current) }).addTo(m)
      lay.current.meFace = face
      // בן הלוויה: הולך לידך, זקוף (לא מסתובב עם הדמות ולא עם המפה).
      if (buddyRef.current) lay.current.buddy = L.marker(ll, { interactive: false, zIndexOffset: 1990, icon: buddyIcon(L, buddyRef.current) }).addTo(m)
    } else {
      lay.current.me.setLatLng(ll)
      lay.current.buddy?.setLatLng(ll)
      lay.current.acc.setLatLng(ll).setRadius(pos.acc || 0)
      if (Math.abs(angleDelta(lay.current.meFace, face) || 0) >= 2) {
        const kid = lay.current.me.getElement()?.querySelector('.kid')
        if (kid) kid.style.transform = `rotate(${Math.round(face)}deg)`
        else lay.current.me.setIcon(kidIcon(L, face, kidRef.current))
        lay.current.meFace = face
      }
    }
    if (follow.current && fitted.current && Date.now() >= intro.current) m.panTo(ll, { animate: true, duration: 0.5 })
  }, [ready, pos?.lat, pos?.lng, pos?.acc, alongStep])

  // הסיבוב עצמו: CSS על אלמנט המפה, והסימנים הזקופים מסתובבים חזרה
  // דרך משתנה אחד. בלי React בדרך — זה רץ כמה פעמים בשנייה.
  const want = headingUp ? (heading ?? motionDir.current ?? null) : null
  useEffect(() => {
    const w = wrap.current
    if (!w) return
    let target = want == null ? 0 : want
    // הדרך הקצרה סביב 360, שהמפה לא תעשה סיבוב שלם מ-359 ל-1
    const d = angleDelta(rot.current % 360, target) || 0
    rot.current = rot.current + d
    w.style.setProperty('--rot', `${-rot.current}deg`)
    w.style.setProperty('--wr', `${rot.current}deg`)
  }, [want, ready])

  const recenter = () => {
    follow.current = true; setFollowing(true)
    const at = pos || home
    if (map.current && at) map.current.setView([at.lat, at.lng], FOLLOW_ZOOM, { animate: true })
  }
  const showAll = () => {
    follow.current = false; setFollowing(false)
    if (map.current && lay.current.casing) map.current.fitBounds(lay.current.casing.getBounds(), { padding: fitPad(map.current) })
  }

  return (
    <div ref={wrap} style={{ position: 'relative', height, borderRadius: 16, overflow: 'hidden', border: '1px solid #2B382B', background: '#E8ECE6', '--rot': '0deg', '--wr': '0deg' }}>
      <style>{CSS}</style>
      {/* המפה גדולה מהחלון ב-50% לכל כיוון, כדי שכשהיא מסתובבת לא רואים פינות ריקות */}
      <div ref={el} style={{ position: 'absolute', inset: '-25%', transform: 'rotate(var(--rot))', transition: 'transform .4s ease-out', willChange: 'transform' }} />
      {!ready && <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, color: '#4B554B', fontSize: 14 }}>טוענים מפה…</p>}
      <div style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, zIndex: 500, display: 'flex', gap: 8 }}>
        {!following && <button onClick={recenter} style={btn}>לאיפה שאני</button>}
        <button onClick={showAll} style={{ ...btn, background: 'rgba(15,21,15,.8)', color: '#E9E5D8' }}>כל המסלול</button>
      </div>
      {/* מצפן: לחיצה מחליפה בין "קדימה למעלה" ל"צפון למעלה". המחט תמיד מצביעה צפונה. */}
      <button onClick={() => setHeadingUp(v => !v)} style={compassBtn} aria-label={headingUp ? 'צפון למעלה' : 'הכיוון שלי למעלה'} title={headingUp ? 'צפון למעלה' : 'הכיוון שלי למעלה'}>
        <svg width="30" height="30" viewBox="0 0 30 30" style={{ display: 'block', transform: 'rotate(var(--rot))', transition: 'transform .4s ease-out' }}>
          <circle cx="15" cy="15" r="13" fill="#fff" stroke="#2B382B" strokeWidth="1.5" />
          <path d="M15 4 L19 15 L15 13 L11 15 Z" fill="#E0523A" />
          <path d="M15 26 L19 15 L15 17 L11 15 Z" fill="#9AA39E" />
        </svg>
      </button>
      {/* מקרא קטן: כחול = לאן, אפור = מאיפה. פעם אחת ולתמיד, בלי מילים רבות. */}
      <div style={legend} aria-hidden="true">
        <span style={{ ...swatch, background: BLUE }} /> הדרך
        <span style={{ ...swatch, background: WALKED, marginInlineStart: 8 }} /> הלכנו
      </div>
      <span style={attrib}>© OpenStreetMap, CARTO</span>
    </div>
  )
}

const CSS = `
@keyframes wildenPin{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes wildenCoinPop{0%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes wildenCoinFloat{0%,100%{transform:translateY(0) scaleX(1)}30%{transform:translateY(-3px) scaleX(.72)}50%{transform:translateY(-4px) scaleX(1)}80%{transform:translateY(-1px) scaleX(.86)}}
@keyframes wildenCoinGone{0%{transform:scale(1) translateY(0);opacity:1}45%{transform:scale(1.7) translateY(-14px);opacity:1}100%{transform:scale(.2) translateY(-34px);opacity:0}}
.leaflet-container{font-family:inherit}
.wr{transform:rotate(var(--wr,0deg));transition:transform .4s ease-out}
.kid{transition:transform .5s ease-out;transform-origin:50% 50%}
`

const btn = { padding: '9px 13px', borderRadius: 10, border: 'none', background: '#E5A342', color: '#14200F',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }
const compassBtn = { position: 'absolute', bottom: 62, insetInlineStart: 10, zIndex: 640, width: 44, height: 44, borderRadius: '50%', border: 'none',
  background: 'rgba(255,255,255,.92)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.35)', padding: 0 }
const legend = { position: 'absolute', bottom: 10, insetInlineEnd: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,.9)', color: '#23302A', fontSize: 12, fontWeight: 700, pointerEvents: 'none' }
const swatch = { display: 'inline-block', width: 14, height: 5, borderRadius: 3 }
const attrib = { position: 'absolute', bottom: 0, insetInlineEnd: 6, zIndex: 500, fontSize: 9, color: '#4B554B', opacity: .75, pointerEvents: 'none' }

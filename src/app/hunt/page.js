'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import { MONSTERS, Monster } from './monsters'
import { unlockAudio, setMuted, sfxTick, sfxRustle, sfxCatch, sfxAppear, sfxFinish, buzz } from './audio'
import { fetchStreets, pickSpotsAdaptive } from './osm'
import { buildGraph, nearestNode, planLoop, spreadAlong, loopCoords } from './routing'
import {
  AVATARS, JOURNEYS, journeyOf, RESOURCES, ENEMIES, BUILDS,
  RUNS_TO_UNLOCK_BUILDER, canAfford, countLoot, PortalScreen, WorldScreen,
} from './world'
import { EncounterScene, ENCOUNTER_CSS, RARITY, rollRarity } from './encounter'
import { buildBeats, pickFind, pickHint, pickChoice, BeatOverlay, BEATS_CSS } from './beats'
import { Avatar } from './avatars'
import { loadPlayer, savePlayer, clearPlayer, newPlayer, pushWorld, pullPlayer, normCode, syncState } from './player'

// ─────────────────────────────────────────────────────────────
// ציד היצורים — מסלול אחד, שעה בחוץ, עשרה יצורים, וחזרה הביתה.
// אין נקודות שצריך להסביר, אין בנייה, אין מסך בבית. יוצאים, אוספים, חוזרים.
// ─────────────────────────────────────────────────────────────

const STORE_KEY = 'hunt_v1'
const LOOT_KINDS = ['wood', 'stone', 'flowers']

// ── שלוש רגליים, לא שלוש רמות ──
// אין בחירת אורך לפני היציאה. שואלים ילד בבית "רוצה ללכת שעה?" והתשובה
// ברורה. במקום זה יוצאים, ובדקה 30 — כשהוא כבר בחוץ ומסוקרן — מופיע פיתוי.
//
// כל רגל היא לולאה שמתחילה ונגמרת בבית, ולא קטע מתוך מסלול ארוך אחד. כך
// בכל נקודת החלטה הילד עומד ליד הבית, ואפשר לעצור באמת.
// שלושה מפגשים ב-30, חמישה ב-45 — ובשישים *אותם חמישה*, ועוד משהו
// שלא יכול לקרות במסע קצר. הרגל השלישית היא לא "עוד שניים", היא מפגש
// אחד מיוחד: נדיר לפחות, ובסופו התפתחות שהילד בוחר.
const LEGS = [
  { i: 0, mins: 30, own: 30, meters: 2200, count: 3 },
  { i: 1, mins: 45, own: 15, meters: 1100, count: 2 },
  { i: 2, mins: 60, own: 15, meters: 1000, count: 1, deep: true },
]
const legOf = i => LEGS[Math.min(i ?? 0, LEGS.length - 1)]
const lengthOf = t => legOf(typeof t === 'object' ? t?.leg : t)
// כמה מפה להוריד: מספיק כדי שהלולאה תוכל להתפרש, בלי להוריד חצי עיר
const fetchRadiusFor = meters => Math.max(450, Math.min(1250, Math.round(meters * 0.32)))
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// הפיתוי הוא סקרנות, לא חשבון. לא "רוצה ללכת עוד רבע שעה?" אלא משהו
// שקרה עכשיו, ואי אפשר לדעת מה בסופו.
const LURES = [
  ['נמצאו עקבות שלא ראינו קודם. הן ממשיכות מכאן…', 'לעקוב אחרי העקבות'],
  ['משהו זז מעבר לפינה. זה לא אחד מאלה שתפסתם.', 'ללכת לראות'],
  ['אור חלש דולק במרחק. הוא לא היה שם בדרך לכאן.', 'להתקרב'],
]
const DEEP_LURES = [
  ['אחד היצורים שלכם התחיל לזהור. משהו קורה לו…', 'להמשיך איתו'],
  ['הריח המתוק חזר, חזק יותר מקודם.', 'ללכת אחריו'],
]

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
function buildRoute(home, radius, count) {
  const jitter = () => (Math.random() - 0.5)
  const start = Math.random() * 360
  const dir = Math.random() < 0.5 ? 1 : -1
  const kinds = dealKinds(count)
  const pts = []
  for (let i = 0; i < count; i++) {
    const angle = start + dir * ((360 / count) * i + jitter() * 18)
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

// נקודה על קו המסלול, מרחק מסוים קדימה ממה שכבר הלכנו. שם הגנב עוצר.
function aheadOnPath(path, walkedM, targetM, aheadM) {
  if (!path || path.length < 2) return { lat: 0, lng: 0 }
  let total = 0
  const segs = []
  for (let i = 1; i < path.length; i++) {
    const a = { lat: path[i - 1][0], lng: path[i - 1][1] }
    const b = { lat: path[i][0], lng: path[i][1] }
    const d = haversine(a, b)
    segs.push({ a, b, d, at: total }); total += d
  }
  const want = Math.min(total - 5, walkedM + aheadM)
  const s = segs.find(x => want >= x.at && want <= x.at + x.d) || segs[segs.length - 1]
  const t = s.d > 0 ? (want - s.at) / s.d : 0
  return { lat: s.a.lat + (s.b.lat - s.a.lat) * t, lng: s.a.lng + (s.b.lng - s.a.lng) * t }
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

// מסלול שמור יכול להיות כבר לא רלוונטי: נבנה במבנה ישן, מלפני שינוי
// מספר היצורים. אז לא מחזירים אליו את הילד — פותחים מסך פתיחה.
function isStale(s) {
  const t = s.today
  if (!t || !t.route?.length) return true
  return t.route.length !== legOf(t.leg).count
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

const HUNT_CSS = `
        .hunt-blip{animation:huntPulse 1.7s ease-in-out infinite}
        @keyframes huntPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
        @keyframes huntPop{0%{transform:scale(.3) rotate(-14deg);opacity:0}
          60%{transform:scale(1.12) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes huntRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes huntSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes huntStep{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes huntSpark{0%{transform:scale(0) rotate(0);opacity:1}100%{transform:scale(1.9) rotate(140deg);opacity:0}}
        @media (prefers-reduced-motion: reduce){
          .hunt-blip{animation:none}
          [class^="hunt-"]{animation-duration:.01ms !important}
        }
        .leaflet-container{border-radius:14px;font-family:inherit}
      `

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
  const [slow, setSlow] = useState(false)
  const [avatar, setAvatar] = useState('nova')
  const [journey, setJourney] = useState('adventure')
  const [enemy, setEnemy] = useState(null)
  const [beat, setBeat] = useState(null)
  const [rareBoost, setRareBoost] = useState(false)
  const [player, setPlayer] = useState(null)
  const [nameIn, setNameIn] = useState('')
  const [codeIn, setCodeIn] = useState('')
  const [codeMsg, setCodeMsg] = useState(null)
  const [lure, setLure] = useState(null)
  const [evolvePick, setEvolvePick] = useState(null)
  const [weak, setWeak] = useState(false)
  const [sync, setSync] = useState(null)   // מצב הגיבוי בפועל, לא ההנחה עליו

  const mapEl = useRef(null)
  const map = useRef(null)
  const layers = useRef({ me: null, acc: null, marks: [], line: null, home: null })
  const watchId = useRef(null)
  const nearest = useRef({ dist: Infinity, idx: -1 })
  const lastTick = useRef(0)
  const lastRustle = useRef(0)
  const follow = useRef(true)
  const osm = useRef(null)
  const abort = useRef(null)
  const enemyTimer = useRef(null)
  const walked = useRef(0)
  const lastFix = useRef(null)

  // אחרי שש שניות אומרים שזה נמשך, ונותנים דרך לצאת. אף מסך לא נשאר
  // תקוע בלי מוצא.
  useEffect(() => {
    if (busy !== 'streets') { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(t)
  }, [busy])

  function skipStreets() {
    if (abort.current) abort.current.abort()
  }

  // ── טעינת מצב שמור ──
  useEffect(() => {
    const pl = loadPlayer()
    setSync(syncState())
    if (!pl) { setState({ totalPoints: 0, walks: 0 }); setPlayer(null); setScreen('who'); return }
    setPlayer(pl)
    setAvatar(pl.avatar || 'nova')
    const s = load()
    if (!s || !s.home) { setState({ totalPoints: 0, walks: 0 }); setScreen('intro'); return }
    setState(s)
    setAvatar(s.avatar || 'nova')
    setJourney(s.journey || 'adventure')
    if (s.today && s.today.date === todayKey() && !s.today.done && !isStale(s)) {
      setScreen(s.today.route.every(m => m.caught) ? 'homeward' : 'hunt')
    } else if (s.today?.done && !s.today.transferred) {
      setScreen('portal')          // חזרו הביתה אבל לא העבירו — הפורטל עדיין פתוח
    } else {
      setScreen('intro')
    }
  }, [])

  // חייבת להיות דרך לחזור למסך השם: להתחיל מחדש, או למסור את הטלפון
  // לילד שני. בלי זה הפרופיל הראשון הוא לנצח.
  function switchPlayer() {
    const code = player?.code
    const ok = confirm(
      'להחליף שחקן?\n\n' +
      (code ? `הקוד של ${player.name} הוא ${code} — רשמו אותו, איתו כל העולם חוזר.\n\n` : '') +
      'העולם הנוכחי יישאר שמור בשרת, והמכשיר יתחיל מסך פתיחה חדש.'
    )
    if (!ok) return
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null }
    clearPlayer()
    try { localStorage.removeItem(STORE_KEY) } catch (e) { /* אין מה לעשות */ }
    setPlayer(null); setState({ totalPoints: 0, walks: 0 })
    setNameIn(''); setCodeIn(''); setCodeMsg(null)
    setCaught(null); setBeat(null); setEnemy(null)
    setScreen('who')
  }

  function createProfile() {
    const pl = newPlayer({ name: nameIn, avatar })
    savePlayer(pl)
    setPlayer(pl)
    const fresh = { totalPoints: 0, walks: 0 }
    setState(fresh); save(fresh)
    // מיטב מאמץ; אם אין רשת, יסונכרן בפורטל. התוצאה נרשמת כדי שההורה
    // יראה אם באמת יש גיבוי — ולא יגלה את זה רק כשהעולם ייעלם.
    pushWorld(pl, fresh).then(() => setSync(syncState()))
    sfxAppear()
    setScreen('intro')
  }

  async function restoreProfile() {
    const c = normCode(codeIn)
    if (c.length < 4) { setCodeMsg('הקוד קצר מדי'); return }
    setCodeMsg('מחפשים…')
    const r = await pullPlayer(c)
    if (!r.ok) {
      setCodeMsg(
        r.reason === 'not-found' ? 'לא מצאנו עולם עם הקוד הזה. בדקו את האותיות.'
        : r.reason === 'no-server' ? 'השחזור לא זמין כרגע — השרת לא מוגדר. אפשר להתחיל עולם חדש.'
        : 'לא הצלחנו להתחבר כרגע. אפשר להתחיל עולם חדש ולנסות שוב אחר כך.')
      return
    }
    const pl = { code: r.row.code, name: r.row.name, avatar: r.row.avatar, created: null }
    savePlayer(pl)
    setPlayer(pl)
    setAvatar(pl.avatar || 'nova')
    const world = { totalPoints: 0, walks: 0, ...(r.row.world || {}) }
    setState(world); save(world)
    sfxFinish()
    setScreen('intro')
  }

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
    const L = legOf(0)
    const built = await planRoute(home, L.meters, L.count)
    persist(prev => ({
      ...(prev || { totalPoints: 0, walks: 0 }),
      home, avatar, journey,
      today: { date: todayKey(), done: false, leg: 0, bag: [], loot: [], chase: null,
               beats: buildBeats(journeyOf(journey), L.count), ...built },
    }))
    setScreen('preview')
    setBusy(false)
  }

  // פיזור לפי מרחק בלבד מניח יצורים בשטח מת — חלקות ריקות, אזורי תעשייה,
  // ובמקרה אחד גם בית קברות. לכן שואלים קודם את OpenStreetMap אילו רחובות
  // ושבילים באמת קיימים, ומניחים רק עליהם.
  async function planRoute(home, meters, count) {
    const radius = fetchRadiusFor(meters)
    abort.current = new AbortController()
    try {
      const data = osm.current && osm.current.home.lat === home.lat &&
                   osm.current.home.lng === home.lng && osm.current.radius === radius
        ? osm.current.data
        : await fetchStreets(home.lat, home.lng, radius, { signal: abort.current?.signal })
      osm.current = { home, radius, data }

      // ── לולאה אמיתית: יוצאים מהבית, נעים בין הרחובות, וחוזרים ברחוב אחר ──
      const graph = buildGraph(data.ways, data.blocked)
      if (graph.nodes.length > 4) {
        const start = nearestNode(graph, home)
        if (start.idx >= 0 && start.dist < 220) {
          const loop = planLoop(graph, start.idx, meters)
          if (loop) {
            const spots = spreadAlong(graph, loop.loop, count)
            if (spots.length === count) {
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
        radius: meters / 7, count,
      })
      if (spots.length >= 5) return { route: routeFrom(spots), path: null, verified: true }
    } catch (e) {
      // Overpass לא זמין — ממשיכים, אבל אומרים את זה במפורש במסך האישור
    }
    return { route: buildRoute(home, meters / 7, count), path: null, verified: false }
  }

  async function reroll() {
    setBusy('streets')
    const L = legOf(state.today.leg)
    const built = await planRoute(state.home, L.meters, L.count)
    persist(prev => ({ ...prev, today: { ...prev.today, ...built } }))
    setBusy(false)
  }

  // ── נקודת ההחלטה ──
  // הגענו הביתה והרגל הושלמה. אם יש עוד רגל — מציעים אותה כפיתוי, לא
  // כשאלה על זמן. אם לא — הפורטל.
  async function continueOn() {
    const next = (state.today.leg || 0) + 1
    const L = legOf(next)
    setBusy('streets')
    const built = await planRoute(state.home, L.meters, L.count)
    persist(prev => ({
      ...prev,
      today: {
        ...prev.today,
        leg: next,
        bag: [...(prev.today.bag || []), ...prev.today.route.filter(m => m.caught)],
        beats: buildBeats(journeyOf(prev.journey || 'adventure'), L.count),
        chase: null, caughtThief: null,
        ...built,
      },
    }))
    walked.current = 0
    lastFix.current = null
    setBusy(false)
    setScreen('preview')
  }

  function toPortal() {
    persist(prev => ({
      ...prev,
      today: { ...prev.today, bag: [...(prev.today.bag || []), ...prev.today.route.filter(m => m.caught)] },
    }))
    setScreen('portal')
  }

  // תמיד חייבת להיות דרך לצאת ממסלול. בלי זה אפשר להיתקע במסלול שנבנה
  // במקום אחר, בלי שום כפתור על המסך.
  function abandon() {
    if (!confirm('לעצור את המסלול ולחזור למסך הפתיחה? מה שנאסף היום לא יישמר.')) return
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null }
    setCaught(null); setBeat(null); setEnemy(null); setWeak(false)
    persist(prev => ({ ...prev, today: null }))
    setScreen('intro')
  }

  function startHunt() {
    unlockAudio()
    follow.current = true
    walked.current = 0
    lastFix.current = null
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

    // ── כמה באמת הלכנו ──
    // GPS בתוך הבית קופץ מאות מטרים בלי שאיש זז. בלי המדידה הזו המשחק
    // "תופס" יצורים לפני שיצאו מהדלת.
    if (lastFix.current) {
      const step = haversine(lastFix.current, pos)
      if (step > 6 && step < 120) walked.current += step
    }
    lastFix.current = { lat: pos.lat, lng: pos.lng }

    // דיוק גרוע = אנחנו לא יודעים איפה הילד. קודם הגדלתי בגללו את רדיוס
    // התפיסה, וזה בדיוק הפוך: הוא צריך להקשיח, לא להרפות.
    const acc = pos.acc ?? 999
    const ready = acc <= 40 && walked.current >= 40
    setWeak(acc > 40)
    if (!ready) {
      let n = { dist: Infinity, idx: -1 }
      route.forEach((m, i) => { if (!m.caught) { const d = haversine(pos, m); if (d < n.dist) n = { dist: d, idx: i } } })
      nearest.current = n
      return
    }

    const R = 28
    let best = { dist: Infinity, idx: -1 }
    route.forEach((m, i) => {
      if (m.caught) return
      const d = haversine(pos, m)
      if (d < best.dist) best = { dist: d, idx: i }
    })
    nearest.current = best

    if (best.idx >= 0 && best.dist <= R) {
      const m = route[best.idx]
      const j = journeyOf(state.journey || 'adventure')
      const deep = legOf(state.today.leg).deep
      buzz([30, 60, 120])
      setCaught({
        ...m, idx: best.idx,
        // ברגל העמוקה אין מפגש רגיל. זה כל מה שהיא נותנת, אז הוא שווה משהו.
        rarity: deep
          ? (Math.random() < 0.45 ? RARITY.legend : RARITY.rare)
          : rollRarity(j.odds, rareBoost),
      })
      setRareBoost(false)
    }
  }, [pos, screen, state?.today?.route, caught, persist])

  // ── הגעה אל הגנב ──
  // מה שנחטף חוזר תמיד. מה שעל הכף זה רק הבונוס שהגנב נשא בעצמו, ולכן
  // כישלון אומר "עוד לא" ולא "איבדת".
  useEffect(() => {
    if (screen !== 'hunt' || !pos || !state?.today?.chase || caught || beat) return
    const ch = state.today.chase
    if (haversine(pos, ch) > 30) return
    const gotBonus = Math.random() < 0.7
    sfxCatch(); buzz([40, 60, 40, 120])
    persist(prev => ({
      ...prev,
      today: {
        ...prev.today,
        loot: [...(prev.today.loot || []), ...(ch.taken ? [ch.taken] : []), ...(gotBonus ? [ch.bonus] : [])],
        chase: null,
        caughtThief: { ...ch, gotBonus },
      },
    }))
  }, [pos, screen, state?.today?.chase, caught, beat, persist])

  // ── הדרך הביתה: היעד האחרון הוא הבית עצמו ──
  useEffect(() => {
    if (screen !== 'homeward' || !pos || !state?.home) return
    const d = haversine(pos, state.home)
    nearest.current = { dist: d, idx: -1 }
    const R = Math.min(60, Math.max(30, (pos.acc ?? 30) * 1.2))
    if (d <= R) {
      buzz([40, 70, 40, 70, 160])
      const last = (state.today.leg || 0) >= LEGS.length - 1
      persist(prev => ({
        ...prev,
        walks: (prev.walks || 0) + (prev.today.leg === 0 ? 1 : 0),
        today: { ...prev.today, done: last },
      }))
      if (last) { sfxFinish(); setScreen('portal') }
      else { sfxAppear(); setLure(pick((state.today.leg || 0) === 0 ? LURES : DEEP_LURES)); setScreen('crossroads') }
    }
  }, [pos, screen, state?.home, persist])

  // ── פעימות: משהו קורה כל שתיים-שלוש דקות, גם בין היצורים ──
  useEffect(() => {
    if (screen !== 'hunt' || caught || beat || enemy || !state?.today) return
    const t = state.today
    const target = legOf(t.leg).meters
    const prog = walked.current / target
    const next = (t.beats || []).find(x => !x.done && prog >= x.at)
    if (!next) return

    buzz([35, 45, 35])
    if (next.type === 'find') {
      const res = pick(LOOT_KINDS)
      sfxAppear()
      setBeat({ ...next, find: pickFind(), res })
    } else if (next.type === 'hint') {
      sfxAppear()
      setBeat({ ...next, line: pickHint() })
    } else if (next.type === 'choice') {
      sfxRustle()
      setBeat({ ...next, choice: pickChoice() })
    } else if (next.type === 'enemy') {
      // הגנב לא מוחק כלום — הוא לוקח קדימה, והופך לנקודה על המסלול
      sfxRustle(); buzz([60, 40, 60])
      const bag = t.loot || []
      const taken = bag.length ? bag[bag.length - 1] : null
      const spot = aheadOnPath(t.path, walked.current, target, 300)
      persist(prev => ({
        ...prev,
        today: {
          ...prev.today,
          loot: taken ? prev.today.loot.slice(0, -1) : prev.today.loot,
          beats: prev.today.beats.map(x => (x.id === next.id ? { ...x, done: true } : x)),
          chase: { ...pick(ENEMIES), taken, lat: spot.lat, lng: spot.lng, bonus: pick(LOOT_KINDS) },
        },
      }))
      return
    }
    persist(prev => ({
      ...prev,
      today: {
        ...prev.today,
        beats: prev.today.beats.map(x => (x.id === next.id ? { ...x, done: true } : x)),
      },
    }))
  }, [screen, caught, beat, enemy, pos, state?.today, persist])

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
      lay.acc = L.circle([pos.lat, pos.lng], { radius: pos.acc ?? 20, color: C.dusk, weight: 1, opacity: 0.35, fillOpacity: 0.08 }).addTo(map.current)
      lay.me = L.circleMarker([pos.lat, pos.lng], { radius: 8, color: '#fff', weight: 3, fillColor: C.dusk, fillOpacity: 1 }).addTo(map.current)
    } else {
      lay.me.setLatLng([pos.lat, pos.lng])
      lay.acc.setLatLng([pos.lat, pos.lng]).setRadius(pos.acc ?? 20)
    }
    if ((screen === 'hunt' || screen === 'homeward') && follow.current) map.current.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 })
  }, [pos, screen])

  function resolveEncounter(r) {
    const idx = caught.idx
    // חשוב לחשב את הנותרים כאן ולא אחרי persist: state ברינדור הנוכחי
    // עדיין לא כולל את התפיסה הזו, ולכן היצור האחרון לא היה נספר
    // והפורטל לא היה נפתח.
    const left = state.today.route.filter((m, i) => !m.caught && i !== idx).length
    persist(prev => {
      const t = prev.today
      const route = t.route.map((x, i) => (i === idx ? { ...x, caught: true } : x))
      return {
        ...prev,
        today: { ...t, route, loot: [...(t.loot || []), ...r.loot] },
        totalPoints: (prev.totalPoints || 0) + (r.caught ? caught.pts * (RARITY[r.rarity]?.mult || 1) : 0),
        res: r.honeySpent
          ? { ...(prev.res || {}), honey: Math.max(0, (prev.res?.honey || 0) - r.honeySpent) }
          : prev.res,
      }
    })
    setCaught(null)
    sfxAppear()
    if (left === 0) {
      follow.current = true
      setScreen('homeward')
    }
  }

  function closeBeat(extra) {
    const bt = beat
    setBeat(null)
    if (!bt) return
    if (bt.type === 'find') {
      sfxCatch()
      persist(prev => ({ ...prev, today: { ...prev.today, loot: [...(prev.today.loot || []), bt.res] } }))
    }
    if (bt.type === 'hint') setRareBoost(true)
    if (bt.type === 'choice' && extra) {
      // הילד בחר להאריך את ההליכה בעצמו — זה בדיוק הרגע שהמשחק קיים בשבילו
      sfxAppear()
      persist(prev => ({ ...prev, today: { ...prev.today, loot: [...(prev.today.loot || []), pick(LOOT_KINDS)] } }))
    }
    persist(prev => ({
      ...prev,
      today: { ...prev.today, beats: prev.today.beats.map(x => (x.id === bt.id ? { ...x, done: true } : x)) },
    }))
  }

  // ── מעבר דרך הפורטל ──
  function transfer() {
    persist(prev => {
      const t = prev.today
      const L = legOf(t.leg)
      const caughtOnes = [...(t.bag || []), ...t.route.filter(m => m.caught)]
      const kept = [...(prev.kept || [])]
      caughtOnes.forEach((m, i) => kept.push({ kind: m.kind, evolved: L.deep && i === evolvePick }))
      const res = { ...(prev.res || {}) }
      for (const k of t.loot || []) res[k] = (res[k] || 0) + 1
      return {
        ...prev,
        kept, res,
        runs45: (prev.runs45 || 0) + (t.len === 'mid' ? 1 : 0),
        today: { ...t, transferred: true },
      }
    })
    setEvolvePick(null)
    sfxFinish()
    setScreen('world')
    // מסנכרנים רק כאן: בזמן ההליכה יכול להיות שאין קליטה, ואין סיבה
    // להטריד את הרשת באמצע מסע.
    setTimeout(async () => {
      const w = load()
      if (w && player) { await pushWorld(player, w); setSync(syncState()) }
    }, 400)
  }

  function build(kind) {
    const b = BUILDS[kind]
    persist(prev => {
      if (prev.built?.[kind] || !canAfford(prev.res || {}, b.cost)) return prev
      const res = { ...prev.res }
      for (const [k, v] of Object.entries(b.cost)) res[k] -= v
      return { ...prev, res, built: { ...(prev.built || {}), [kind]: true } }
    })
    sfxCatch()
  }

  function makeHoney() {
    persist(prev => {
      if (!prev.built?.hive || (prev.res?.flowers || 0) < 2) return prev
      return { ...prev, res: { ...prev.res, flowers: prev.res.flowers - 2, honey: (prev.res.honey || 0) + 1 } }
    })
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
      {screen === 'who' && (
        <div>
          <h1 style={S.h1}>מי יוצא לדרך?</h1>
          <p style={S.lede}>בוחרים דמות ושם. העולם שתבנו יישמר עליהם.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {AVATARS.map(a => (
              <button key={a.id} onClick={() => setAvatar(a.id)}
                style={{ ...S.chip, ...(avatar === a.id ? S.chipOn : {}), padding: '14px 6px 11px' }}>
                <span style={{ display: 'block', marginBottom: 4 }}>
                  <span style={{ display: 'inline-block' }}><Avatar id={a.id} size={54} /></span>
                </span>
                {a.name}
              </button>
            ))}
          </div>

          <p style={S.label}>איך קוראים לך?</p>
          <input value={nameIn} onChange={e => setNameIn(e.target.value)} maxLength={20}
            placeholder="השם שלך" style={S.input} />

          <button onClick={createProfile} style={{ ...S.cta, marginTop: 14 }}>מתחילים עולם חדש</button>

          <div style={S.divider}>
            <span style={{ flex: 1, height: 1, background: '#DCD2BE' }} />
            <span>או</span>
            <span style={{ flex: 1, height: 1, background: '#DCD2BE' }} />
          </div>

          <p style={S.label}>כבר יש לכם קוד? הכניסו אותו וכל העולם יחזור</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={codeIn} onChange={e => setCodeIn(normCode(e.target.value))}
              placeholder="ABC12" maxLength={5}
              style={{ ...S.input, textAlign: 'center', letterSpacing: '.22em', fontWeight: 800, direction: 'ltr' }} />
            <button onClick={restoreProfile} style={{ ...S.cta, ...S.ctaGhost, flex: '0 0 40%', marginTop: 0 }}>
              שחזור
            </button>
          </div>
          {codeMsg && <p style={S.fine}>{codeMsg}</p>}
        </div>
      )}

      {screen === 'intro' && (
        <div>
          {player && (
            <div style={S.who}>
              <Avatar id={player.avatar || avatar} size={44} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 16 }}>{player.name}</b>
                <span style={{ display: 'block', fontSize: 12.5, color: C.soft }}>
                  קוד לשחזור: <b style={{ letterSpacing: '.14em', direction: 'ltr', display: 'inline-block' }}>{player.code}</b>
                </span>
                <SyncNote sync={sync} />
              </div>
              <button onClick={switchPlayer} style={S.exit}>החלפה</button>
            </div>
          )}
          <h1 style={S.h1}>ציד היצורים</h1>
          <p style={S.lede}>יוצאים מהבית, מסתובבים בשכונה, אוספים יצורים — וחוזרים הביתה דרך הפורטל.</p>

          {state?.totalPoints > 0 && (
            <div style={S.stats}>
              <div><b style={S.statN}>{state.totalPoints}</b><span style={S.statL}>נקודות</span></div>
              <div><b style={S.statN}>{state.walks || 0}</b><span style={S.statL}>{(state.walks || 0) === 1 ? 'מסלול' : 'מסלולים'}</span></div>
            </div>
          )}

          <p style={S.label}>איזו דרך היום?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {JOURNEYS.map(j => (
              <button key={j.k} onClick={() => setJourney(j.k)}
                style={{ ...S.chip, ...(journey === j.k ? S.chipOn : {}) }}>
                {j.label}
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, opacity: .8, lineHeight: 1.35 }}>
                  {j.sub}
                </span>
              </button>
            ))}
          </div>

          <button onClick={anchorHome} disabled={!!busy} style={S.cta}>
            {busy === 'fix' ? 'מחפשים אתכם על המפה…'
              : busy === 'streets' ? 'בודקים אילו רחובות יש סביבכם…'
              : 'צא למסע 🐾'}
          </button>
          {busy === 'streets' && slow && (
            <p style={S.warn}>
              שרת המפות מגיב לאט כרגע. עוד רגע נוותר עליו לבד ונבנה מסלול לפי מרחק —
              או שאפשר <button onClick={skipStreets} style={S.linkBtn}>לדלג עכשיו</button>.
            </p>
          )}
          {geoErr && <p style={S.err}>{geoErr}</p>}

          <p style={S.fine}>
            <a href="/hunt/parents" style={{ color: C.olive, fontWeight: 700 }}>הורים — קראו את זה לפני היציאה הראשונה ←</a>
          </p>
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
            {today && `${(today.km || routeLength(state.home, today.route) / 1000).toFixed(1)} ק״מ · בערך ${legOf(today.leg).own} דקות · ${today.route.length} יצורים`}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={toggleSound} style={S.mute} aria-label="צליל">{sound ? '🔊' : '🔇'}</button>
              <button onClick={abandon} style={S.exit}>לעצור</button>
            </div>
          </div>

          {pos && state.home && haversine(pos, state.home) > 1500 && (
            <p style={S.err}>
              המסלול הזה נבנה במקום אחר — אתם {(haversine(pos, state.home) / 1000).toFixed(1)} ק״מ מנקודת ההתחלה שלו.
              לחצו <b>לעצור</b> ובנו מסלול חדש מכאן.
            </p>
          )}
          {weak && (
            <p style={S.warn}>
              האיתות חלש כרגע — כדי לא "לתפוס" יצורים בטעות, התפיסה מושהית עד שהמיקום יתייצב.
              בחוץ, מתחת לשמיים פתוחים, זה נפתר תוך שניות.
            </p>
          )}
          {screen === 'homeward' && (
            <div style={S.homeward}>
              <b style={{ fontSize: 18 }}>{today.route.length} יצורים אצלכם 🎉</b>
              <span style={{ fontSize: 15 }}>עכשיו הביתה — שם המסלול נסגר.</span>
            </div>
          )}

          {today.chase && (
            <div style={S.chase}>
              <span style={{ fontSize: 26 }}>{today.chase.emoji}</span>
              <span>
                <b>{today.chase.name}</b> ברח קדימה
                {today.chase.taken && <> עם {RESOURCES[today.chase.taken].emoji}</>} —
                {' '}<b>{Math.round(haversine(pos || state.home, today.chase))} מ׳</b> מכאן
              </span>
            </div>
          )}
          {today.caughtThief && (
            <div style={S.gotBack} onClick={() => persist(prev => ({ ...prev, today: { ...prev.today, caughtThief: null } }))}>
              תפסתם את {today.caughtThief.name}! קיבלתם בחזרה את מה שנחטף
              {today.caughtThief.gotBonus && <> ועוד {RESOURCES[today.caughtThief.bonus].emoji} משלו</>}.
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

          <div style={{ position: 'relative' }}>
            <div ref={mapEl} style={{ ...S.map, height: '52vh' }} />
            <div style={S.walker}><Avatar id={state.avatar || 'nova'} size={62} /></div>
          </div>
          {geoErr && <p style={S.err}>{geoErr}</p>}
          <p style={S.fine}>המסך יכול להישאר בכיס — ככל שמתקרבים, הטיקים מהירים יותר.</p>
        </div>
      )}

      {screen === 'crossroads' && today && lure && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <Avatar id={state.avatar || 'nova'} size={96} mood="ready" />
          </div>
          <p style={S.crossKicker}>
            {(today.leg || 0) === 0 ? 'המסע הושלם. הפורטל מוכן.' : 'עוד רגל הושלמה. הפורטל עדיין פתוח.'}
          </p>
          <p style={S.crossLine}>{lure[0]}</p>

          <button onClick={continueOn} disabled={!!busy} style={{ ...S.cta, marginBottom: 10 }}>
            {busy ? 'רגע…' : lure[1]}
          </button>
          <button onClick={toPortal} style={{ ...S.cta, ...S.ctaGhost }}>לחזור דרך הפורטל</button>

          <p style={S.fine}>
            אפשר לחזור עכשיו — <b>שום דבר לא הולך לאיבוד.</b> מה שנאסף כבר שלכם.
          </p>
        </div>
      )}

      {screen === 'portal' && today && (
        <PortalScreen
          creatures={[...(today.bag || []), ...today.route.filter(m => m.caught)]
            .map(m => ({ kind: m.kind }))}
          loot={today.loot || []}
          evolved={!!legOf(today.leg).deep}
          chosen={evolvePick}
          onChoose={setEvolvePick}
          onTransfer={transfer}
        />
      )}

      {screen === 'world' && (
        <>
          <WorldScreen state={state} onBuild={build} onHoney={makeHoney}
            onNewRoute={() => setScreen('intro')} />
          <div style={{ ...S.stats, justifyContent: 'center', marginTop: 18 }}>
            <div><b style={S.statN}>{state.totalPoints}</b><span style={S.statL}>נקודות</span></div>
            <div><b style={S.statN}>{state.walks || 0}</b><span style={S.statL}>{(state.walks || 0) === 1 ? 'מסלול' : 'מסלולים'}</span></div>
          </div>
        </>
      )}

      {beat && <BeatOverlay beat={beat} onClose={() => closeBeat(false)} onChoose={closeBeat} />}
      {caught && (
        <EncounterScene
          key={caught.idx}
          monsterId={caught.kind}
          rarity={caught.rarity}
          avatarId={state.avatar || 'nova'}
          honey={state.res?.honey || 0}
          index={found + 1}
          total={today.route.length}
          enemy={null}
          onResolve={resolveEncounter}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: HUNT_CSS + ENCOUNTER_CSS + BEATS_CSS }} />
    </Shell>
  )
}


// ── האם העולם באמת מגובה ──
// ספארי מוחקת אחסון מקומי אחרי כשבוע בלי כניסה, והפיילוט הוא ארבעה־עשר
// יום. הקוד בן חמש האותיות הוא ההגנה היחידה — אבל הוא שווה משהו רק אם
// הגיבוי אמנם עלה לשרת. עד עכשיו כישלון היה שקט לחלוטין.
function SyncNote({ sync }) {
  if (!sync) return null
  if (sync.ok) {
    const days = Math.floor((Date.now() - sync.at) / 86400000)
    return (
      <span style={{ display: 'block', fontSize: 12, color: '#3F5C53' }}>
        ✓ העולם מגובה{days > 2 ? ` · לפני ${days} ימים` : ''}
      </span>
    )
  }
  return (
    <span style={{ display: 'block', fontSize: 12, color: '#A84B2A', fontWeight: 600 }}>
      {sync.reason === 'no-server'
        ? '⚠ אין גיבוי — העולם קיים רק במכשיר הזה'
        : '⚠ הגיבוי האחרון נכשל. הקוד לא ישחזר עדיין.'}
    </span>
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
  exit: {
    border: '1px solid #DCD2BE', background: 'transparent', color: '#5A6154',
    borderRadius: 999, padding: '4px 12px', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  chase: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
    padding: '11px 14px', borderRadius: 12, background: '#F0E4CE', color: '#6B4A18',
    fontSize: 14.5, lineHeight: 1.5,
  },
  gotBack: {
    marginBottom: 10, padding: '11px 14px', borderRadius: 12,
    background: '#E7EBDF', color: '#33452E', fontSize: 14.5, lineHeight: 1.5, cursor: 'pointer',
  },
  walker: {
    position: 'absolute', insetInlineStart: 10, bottom: 8, zIndex: 500,
    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.35))', pointerEvents: 'none',
    animation: 'huntStep 2.4s ease-in-out infinite',
  },
  input: {
    width: '100%', padding: '13px 14px', borderRadius: 12, fontFamily: 'inherit',
    fontSize: 16.5, border: '1.5px solid #DCD2BE', background: '#FBF7EE', color: '#22271E',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px',
    color: '#5A6154', fontSize: 13.5,
  },
  crossKicker: { fontSize: 14.5, color: C.soft, margin: '0 0 6px' },
  crossLine: {
    fontFamily: 'inherit', fontSize: 22, fontWeight: 700, lineHeight: 1.45,
    margin: '0 0 26px', textWrap: 'balance',
  },
  who: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
    padding: '10px 14px', borderRadius: 14, background: '#FBF7EE', border: '1px solid #DCD2BE',
  },
  linkBtn: {
    background: 'none', border: 'none', padding: 0, font: 'inherit',
    color: '#6B4A18', textDecoration: 'underline', cursor: 'pointer',
  },
  warn: {
    padding: '10px 13px', borderRadius: 10, background: '#F0E4CE',
    color: '#6B4A18', fontSize: 14, lineHeight: 1.55, margin: '0 0 12px',
  },
  fine: { marginTop: 16, fontSize: 13.5, lineHeight: 1.65, color: C.soft },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(28,32,26,.93)', color: C.cream,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, textAlign: 'center', cursor: 'pointer',
  },
}

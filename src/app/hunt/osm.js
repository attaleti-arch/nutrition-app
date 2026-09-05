'use client'

// ─── הצמדה לרחובות אמיתיים ───
// פיזור גיאומטרי לפי מרחק וזווית מייצר נקודות בשטח מת: חלקות ריקות, מפעלים,
// ובמקרה אחד גם בית קברות. לכן לפני בניית המסלול שואלים את OpenStreetMap
// אילו רחובות ושבילים באמת קיימים סביב הבית, ומניחים את היצורים עליהם בלבד.
//
// Overpass היא ממשק השאילתות הציבורי של OpenStreetMap. חינם, בלי מפתח,
// ובכל העולם. נקראת פעם אחת לכל מסלול.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// דרכים שילד הולך בהן. מכוון שאין כאן כבישים מהירים, ראשיים או עורקיים —
// לא כי אין שם מדרכה, אלא כי אנחנו לא שולחים ילד לעמוד ליד כביש סואן.
const WALKABLE = 'residential|living_street|pedestrian|footway|path|unclassified|service|steps'

// שטחים שנקודה בתוכם נפסלת, גם אם עובר בהם שביל.
const FORBIDDEN = `
  way(around:{R},{LAT},{LNG})[landuse~"^(cemetery|industrial|military|quarry|landfill|railway)$"];
  way(around:{R},{LAT},{LNG})[amenity~"^(grave_yard|prison|hospital)$"];
  way(around:{R},{LAT},{LNG})[natural=water];
  way(around:{R},{LAT},{LNG})[aeroway];
`

export function buildQuery(lat, lng, radius) {
  const R = Math.round(radius * 1.35)
  const forbidden = FORBIDDEN
    .replaceAll('{R}', String(R)).replaceAll('{LAT}', String(lat)).replaceAll('{LNG}', String(lng))
  return `[out:json][timeout:25];(` +
    `way(around:${R},${lat},${lng})[highway~"^(${WALKABLE})$"][foot!=no][access!=private];` +
    forbidden.replace(/\s+/g, ' ') +
    `);out geom;`
}

export async function fetchStreets(lat, lng, radius, { signal } = {}) {
  const body = buildQuery(lat, lng, radius)
  let lastErr = null
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body, signal })
      if (!res.ok) { lastErr = new Error('http ' + res.status); continue }
      return parseOverpass(await res.json())
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('overpass unreachable')
}

// מפריד את התשובה לשני דברים: נקודות שאפשר לעמוד עליהן, ומצולעים שפוסלים.
export function parseOverpass(json) {
  const points = []
  const blocked = []
  for (const el of (json && json.elements) || []) {
    const geom = el.geometry
    if (!geom || geom.length < 2) continue
    const tags = el.tags || {}
    if (tags.highway) {
      for (const g of geom) points.push({ lat: g.lat, lng: g.lon })
    } else {
      blocked.push(geom.map(g => [g.lat, g.lon]))
    }
  }
  return { points, blocked }
}

// ריי-קאסטינג. במרחקים של מאות מטרים אפשר להתייחס ללט/לונג כמישור.
export function insidePolygon(pt, poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j]
    if ((yi > pt.lat) !== (yj > pt.lat) &&
        pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi) hit = !hit
  }
  return hit
}

function metersBetween(a, b) {
  const R = 6371000
  const t1 = (a.lat * Math.PI) / 180, t2 = (b.lat * Math.PI) / 180
  const dt = t2 - t1, dl = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dt / 2) ** 2 + Math.cos(t1) * Math.cos(t2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

function bearing(home, p) {
  const dy = p.lat - home.lat
  const dx = (p.lng - home.lng) * Math.cos((home.lat * Math.PI) / 180)
  return (Math.atan2(dx, dy) * 180) / Math.PI
}

// בוחר n נקודות על רחובות אמיתיים, מפוזרות סביב הבית כמו טבעת, כדי שההליכה
// תישאר לולאה אחת ולא הלוך-ושוב. סקטור בלי מועמד פשוט מדולג — עדיף שמונה
// יצורים על רחובות מאשר עשרה שאחד מהם בשדה.
export function pickSpots({ home, points, blocked, radius, count, minGap = 70, tol = 0.75, band = [0.42, 1.3] }) {
  const clean = []
  for (const p of points) {
    const d = metersBetween(home, p)
    if (d < radius * band[0] || d > radius * band[1]) continue
    if (blocked.some(poly => insidePolygon(p, poly))) continue
    clean.push({ ...p, d, a: bearing(home, p) })
  }
  if (!clean.length) return []

  const chosen = []
  const step = 360 / count
  const start = Math.random() * 360
  const dir = Math.random() < 0.5 ? 1 : -1

  for (let i = 0; i < count; i++) {
    const target = start + dir * step * i
    let best = null, bestScore = Infinity
    for (const p of clean) {
      let da = Math.abs(((p.a - target + 540) % 360) - 180)
      da = 180 - da                                   // 0 = בדיוק בזווית המבוקשת
      if (da > step * tol) continue                   // מחוץ לסקטור
      if (chosen.some(c => metersBetween(c, p) < minGap)) continue
      // מעדיפים נקודה שגם בזווית הנכונה וגם קרובה לרדיוס המבוקש
      const score = da * 2 + Math.abs(p.d - radius) / 4
      if (score < bestScore) { bestScore = score; best = p }
    }
    if (best) chosen.push({ lat: best.lat, lng: best.lng })
  }
  return chosen
}

// בשכונה צפופה המעבר הראשון מספיק. במושב, בקצה עיר או ליד שדות פתוחים אין
// מספיק רחובות בטבעת צרה — ואז מרחיבים את הסקטורים ואת טווח המרחקים
// במקום להחזיר ארבעה יצורים.
export function pickSpotsAdaptive(opts) {
  const first = pickSpots(opts)
  if (first.length >= opts.count) return { spots: first, relaxed: false }
  const second = pickSpots({ ...opts, tol: 1.6, band: [0.25, 1.7], minGap: 45 })
  return second.length > first.length
    ? { spots: second, relaxed: true }
    : { spots: first, relaxed: false }
}

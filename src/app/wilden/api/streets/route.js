// ─── פרוקסי לרחובות ───
// בשטח, מהטלפון שלה, שני שרתי Overpass לא ענו תוך 12 שניות — ואז המסלול
// נפל לחלופי הגיאומטרי, שהוא לא מפה שאפשר להבין. השרת של Vercel יושב
// על רשת טובה יותר מטלפון ברחוב, ומחזיק זיכרון: אותה שכונה נשאלת פעם
// אחת ביום ולא בכל יציאה. הדפדפן עדיין מנסה במקביל גם ישירות — מי
// שעונה ראשון מנצח.

import { buildQuery, ENDPOINTS } from '../../engine/overpassQuery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 20000
const TTL_MS = 24 * 3600 * 1000
const cache = new Map()            // מפתח → { at, body }. לכל מופע שרת בנפרד.

function key(lat, lng, r) {
  // ~110 מ' רזולוציה. שכנים באותו תא מקבלים אותה תשובה — וזה בסדר,
  // הרדיוס גדול פי עשר מהתא.
  return `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(r / 100)}`
}

async function ask(url, body) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'POST', body, signal: ctl.signal,
      headers: { 'content-type': 'text/plain' } })
    if (!res.ok) throw new Error('http ' + res.status)
    const json = await res.json()
    if (!Array.isArray(json.elements)) throw new Error('bad body')
    return json
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req) {
  const u = new URL(req.url)
  const lat = Number(u.searchParams.get('lat'))
  const lng = Number(u.searchParams.get('lng'))
  const r = Number(u.searchParams.get('r') || 900)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || !Number.isFinite(r) || r < 200 || r > 3000) {
    return Response.json({ error: 'bad params' }, { status: 400 })
  }

  const k = key(lat, lng, r)
  const hit = cache.get(k)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json(hit.body, { headers: { 'x-cache': 'hit', 'cache-control': 'public, max-age=86400' } })
  }

  const body = buildQuery(lat, lng, r)
  try {
    const json = await Promise.any(ENDPOINTS.map(e => ask(e, body)))
    const slim = { elements: json.elements }
    cache.set(k, { at: Date.now(), body: slim })
    return Response.json(slim, { headers: { 'x-cache': 'miss', 'cache-control': 'public, max-age=86400' } })
  } catch (e) {
    return Response.json({ error: 'overpass unreachable' }, { status: 502 })
  }
}

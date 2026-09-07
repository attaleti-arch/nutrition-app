// ─── פרוקסי לרחובות ───
// בשטח, מהטלפון שלה, שרתי Overpass לא ענו בזמן — ואז המסלול נפל לחלופי
// הגיאומטרי, שהוא לא מפה שאפשר להבין. השרת של Vercel יושב על רשת טובה
// יותר מטלפון ברחוב. הדפדפן עדיין מנסה במקביל גם ישירות — מי שעונה
// ראשון מנצח.
//
// מה שנלמד מהלוגים: שבוע שלם של 502 בלבד. כלומר הפרוקסי לא עזר אף פעם,
// והרחובות הגיעו רק ישירות מהטלפון. הסיבה הסבירה: overpass-api.de חוסם
// כתובות של ספקי ענן. לכן: יותר מראות, רישום של *למה* כל אחת נכשלה
// (כדי שהפעם הבאה לא תהיה ניחוש), ומטמון בקצה של Vercel — שכונה שהצליחה
// פעם אחת נשארת שבוע, לכל המופעים.

import { buildQuery, ENDPOINTS, endpointLabel, failureLabel } from '../../engine/overpassQuery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// ברירת המחדל של Vercel היא 10 שניות לפונקציה — ואז היא נהרגת באמצע
// ההמתנה ל-Overpass ומחזירה 504 בדיוק כשהתשובה בדרך.
export const maxDuration = 28

const TIMEOUT_MS = 24000
const TTL_MS = 24 * 3600 * 1000
const cache = new Map()            // מפתח → { at, body }. לכל מופע שרת בנפרד.

// מטמון בקצה: s-maxage הוא מה ש-Vercel מכבד (max-age לבד הוא רק לדפדפן).
const EDGE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000'

function key(lat, lng, r) {
  // ~110 מ' רזולוציה. שכנים באותו תא מקבלים אותה תשובה — וזה בסדר,
  // הרדיוס גדול פי עשר מהתא.
  return `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(r / 100)}`
}

async function ask(url, body) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { method: 'POST', body, signal: ctl.signal,
      headers: { 'content-type': 'text/plain', 'user-agent': 'wilden-walk/1 (kids walking game; contact via repo)' } })
    if (!res.ok) throw new Error('http ' + res.status)
    const json = await res.json()
    if (!Array.isArray(json.elements)) throw new Error('bad body')
    return { json, source: endpointLabel(url), ms: Date.now() - t0 }
  } catch (e) {
    const err = new Error(failureLabel(e))
    err.source = endpointLabel(url); err.ms = Date.now() - t0
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req) {
  const u = new URL(req.url)
  const lat = Number(u.searchParams.get('lat'))
  const lng = Number(u.searchParams.get('lng'))
  const r = Number(u.searchParams.get('r') || 900)
  const part = u.searchParams.get('part') === 'blocked' ? 'blocked' : 'streets'
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || !Number.isFinite(r) || r < 200 || r > 3000) {
    return Response.json({ error: 'bad params' }, { status: 400 })
  }

  const k = key(lat, lng, r) + ':' + part
  const hit = cache.get(k)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json(hit.body, { headers: { 'x-cache': 'hit', 'cache-control': EDGE } })
  }

  const body = buildQuery(lat, lng, r, part)
  try {
    const won = await Promise.any(ENDPOINTS.map(e => ask(e, body)))
    const slim = { elements: won.json.elements, source: won.source }
    cache.set(k, { at: Date.now(), body: slim })
    console.log(`streets ok part=${part} via=${won.source} ms=${won.ms} n=${slim.elements.length}`)
    return Response.json(slim, { headers: { 'x-cache': 'miss', 'x-source': won.source, 'cache-control': EDGE } })
  } catch (e) {
    // AggregateError: כל אחד למה. זה מה שהיה חסר שבוע שלם.
    const tried = (e?.errors || []).map(x => `${x.source}:${x.message}@${Math.round((x.ms || 0) / 1000)}s`)
    console.error(`streets fail part=${part} tried=${tried.join(',')}`)
    return Response.json({ error: 'overpass unreachable', tried }, { status: 502, headers: { 'cache-control': 'no-store' } })
  }
}

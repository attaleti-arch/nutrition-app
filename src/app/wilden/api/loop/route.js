// ─── לולאה ממנוע ניווט (OpenRouteService) ───
// המפתח יושב רק בשרת (ORS_API_KEY ב-Vercel). בלי מפתח — 404, והטלפון
// ממשיך למתכנן שלנו כרגיל. עם מפתח: לולאת הליכה אמיתית באורך מבוקש,
// על מדרכות ושבילים, ושמות רחובות להוראות.
//
// המטמון: אותה דלת + אותו אורך + אותו זרע = אותה תשובה לכל המופעים,
// לשבוע. 2000 בקשות ביום במפתח חינמי — לפיילוט זה הרבה, אבל לא אינסוף.

import { orsBody, parseOrs } from '../../engine/ors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

// הכתובת החדשה קודם: "We are deprecating the URL api.openrouteservice.org in
// favour of api.heigit.org" (מהלוח שלה). הישנה נשארת גיבוי עד שתיכבה.
// המפתחות החדשים של HeiGIT (JWT, "ey...") נדחים בכתובת הישנה ("Access to this
// API has been disallowed"), והנתיב החדש לא מתועד בבירור — אז כמה מועמדים,
// והראשון שעונה נשמר לשאר הבקשות של המופע.
const URLS = [
  'https://api.heigit.org/v2/directions/foot-walking/geojson',
  'https://api.heigit.org/ors/v2/directions/foot-walking/geojson',
  'https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson',
  'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
]
let known = null
const TIMEOUT_MS = 15000
const cache = new Map()
const EDGE = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000'

export async function GET(req) {
  // מפתח שהודבק עם רווח או שורה חדשה בסוף מפיל את fetch מיד ("invalid header value").
  const key = (process.env.ORS_API_KEY || '').replace(/^Bearer\s+/i, '').replace(/[^\x21-\x7e]/g, '')
  if (!key) return Response.json({ error: 'no key' }, { status: 404, headers: { 'cache-control': 'no-store' } })

  const u = new URL(req.url)
  const lat = Number(u.searchParams.get('lat'))
  const lng = Number(u.searchParams.get('lng'))
  const m = Number(u.searchParams.get('m') || 2200)
  const seed = Number(u.searchParams.get('seed') || 0)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || !Number.isFinite(m) || m < 500 || m > 8000) {
    return Response.json({ error: 'bad params' }, { status: 400 })
  }

  const k = `${lat.toFixed(4)},${lng.toFixed(4)},${Math.round(m / 100)},${seed | 0}`
  const hit = cache.get(k)
  if (hit) return Response.json(hit, { headers: { 'x-cache': 'hit', 'cache-control': EDGE } })

  const body = JSON.stringify(orsBody({ lat, lng }, m, seed))
  const t0 = Date.now()
  let last = 'network'
  for (const url of (known ? [known, ...URLS.filter(u => u !== known)] : URLS)) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', accept: 'application/geo+json, application/json', authorization: key },
        body,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error(`loop fail url=${new URL(url).host} http=${res.status} ms=${Date.now() - t0} ${text.slice(0, 200)}`)
        last = 'ors ' + res.status
        continue
      }
      const parsed = parseOrs(await res.json())
      if (!parsed.ok) { last = parsed.reason; continue }
      known = url
      const out = { path: parsed.path, meters: parsed.meters, source: 'ors' }
      cache.set(k, out)
      console.log(`loop ok url=${new URL(url).host} ms=${Date.now() - t0} m=${parsed.meters} n=${parsed.path.length}`)
      return Response.json(out, { headers: { 'x-cache': 'miss', 'cache-control': EDGE } })
    } catch (e) {
      last = e?.name === 'AbortError' ? 'timeout' : 'network'
      console.error(`loop fail url=${new URL(url).host} ${last} ms=${Date.now() - t0} ${String(e?.cause?.message || e?.message || '').slice(0, 160)}`)
    } finally {
      clearTimeout(timer)
    }
  }
  return Response.json({ error: last }, { status: 502, headers: { 'cache-control': 'no-store' } })
}

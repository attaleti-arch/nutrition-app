// ─── שאילתת Overpass ───
// קובץ טהור בלי 'use client', כי גם הדפדפן וגם ה-API route בשרת בונים
// את אותה שאילתה. עותק אחד, ולא שניים שנפרדים בשקט.

// דרכים שילד הולך בהן. אין כאן כבישים מהירים, ראשיים או עורקיים — לא כי
// אין שם מדרכה, אלא כי אנחנו לא שולחים ילד לעמוד ליד כביש סואן.
export const WALKABLE = 'residential|living_street|pedestrian|footway|path|unclassified|service|steps'

// שטחים שנקודה בתוכם נפסלת, גם אם עובר בהם שביל רשום.
// leisure=park ו-playground לא נמצאים כאן בכוונה — גן ציבורי הוא מקום
// מצוין ליצור. רשימה מצומצמת בכוונה: כל תגית היא עוד סריקה בשרת.
export const FORBIDDEN_TAGS = [
  '[landuse~"^(cemetery|industrial|military|quarry|landfill|farmland|orchard|vineyard|forest|meadow|allotments)$"]',
  '[natural~"^(water|wood|scrub|wetland|grassland)$"]',
  '[amenity=grave_yard]',
  '[aeroway]',
]

// חמישה שרתים, לא שלושה. overpass-api.de חוסם כתובות של ספקי ענן (וזה
// כנראה מה שקרה לפרוקסי ב-Vercel: 502 על כל קריאה במשך שבוע). fr ו-mail.ru
// הם מראות עולמיות עם מדיניות אחרת.
export const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

// שם קצר לשרת, ללוג ולמסך: "de", "kumi", "fr"…
export function endpointLabel(url) {
  try {
    const h = new URL(url).hostname
    if (h.includes('overpass-api.de')) return 'de'
    if (h.includes('kumi')) return 'kumi'
    if (h.includes('coffee')) return 'coffee'
    if (h.includes('openstreetmap.fr')) return 'fr'
    if (h.includes('mail.ru')) return 'ru'
    return h.split('.')[0]
  } catch (e) { return String(url).slice(0, 12) }
}

// שתי שאילתות נפרדות, לא אחת כבדה. הרחובות הם מה שחייבים; המצולעים
// (שדות, תעשייה, בית קברות) הם שכבת בטיחות שרצה בתקציב זמן קצר, ואם לא
// הגיעה — יוצאים בלי. שאילתה משולבת עם רלציות על רדיוס של 1.7 ק"מ לקחה
// ל-Overpass יותר מ-20 שניות מהטלפון שלה, וכל מסע נפל לחלופי.
export function buildQuery(lat, lng, radius, part = 'streets') {
  const R = Math.round(radius * 1.1)
  const around = `(around:${R},${lat},${lng})`
  if (part === 'blocked') {
    const forbidden = FORBIDDEN_TAGS.map(t => `way${around}${t};`).join('')
    return `[out:json][timeout:12];(${forbidden});out geom;`
  }
  return `[out:json][timeout:25];(` +
    `way${around}[highway~"^(${WALKABLE})$"][foot!=no][access!=private];` +
    `);out geom;`
}

// ── למה נכשל, במילה ──
// 429 = השרת חסם אותנו זמנית (יותר מדי בקשות מאותה כתובת — מה שקורה אחרי
// כמה "לנסות שוב" ברצף). 504/timeout = השרת עמוס. אחרת — מה שהיה.
export function failureLabel(err) {
  if (!err) return 'fail'
  const name = err.name || ''
  const msg = String(err.message || err)
  if (name === 'AbortError' || msg === 'timeout') return 'timeout'
  const m = msg.match(/http (\d{3})/)
  if (m) return m[1] === '429' ? 'blocked' : m[1]
  if (msg === 'bad body') return 'bad'
  if (/fetch|network|Failed/i.test(msg)) return 'net'
  return msg.slice(0, 12)
}

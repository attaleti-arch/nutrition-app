// ─── מסלול מעגלי ממנוע ניווט אמיתי ───
// "החוליה החלשה שלנו היא המסלול." המתכנן שלנו בונה לולאה מגרף רחובות
// גולמי של OSM: הוא לא יודע מה מדרכה, איפה מעבר חצייה, ואיזה רחוב ראשי
// לא נעים ללכת בו עם ילד. OpenRouteService יודע — יש לו פרופיל הליכה
// ואפשרות round_trip: לולאה באורך מבוקש מנקודה אחת, על שבילים להולכי
// רגל, עם הוראות פנייה. זה המקור הראשון; המתכנן שלנו נשאר גיבוי.
//
// טהור: בונה בקשה, מפענח תשובה. הרשת יושבת ב-api/loop.

// גוף הבקשה. seed שונה = לולאה אחרת מאותה דלת; points = כמה "פינות".
export function orsBody(home, meters, seed = 0) {
  return {
    coordinates: [[round6(home.lng), round6(home.lat)]],
    options: { round_trip: { length: Math.max(500, Math.round(meters)), points: 4, seed: Math.abs(Math.round(seed)) % 10000 } },
    instructions: true,
    instructions_format: 'text',
    language: 'en',
    geometry_simplify: false,
    elevation: false,
    // ── סוג הדרך לכל קטע ──
    // "הלכתי אינסוף במדרכות ואז על כביש בצומת היא הייתה." זה מה שחסר היה:
    // המסלול של ORS הגיע בלי שום מידע על *מה* הוא עובר, ולכן שכבת הבטיחות
    // שבודקת "מדרכה או כביש" רצה על נתונים ריקים ולא הזיזה כלום.
    // waytype נותן בדיוק את זה: 7 מדרכה, 8 מדרגות, 4 שביל, 3 רחוב, 1 דרך ראשית.
    extras: ['waytype'],
  }
}

// waytype של ORS → הסוג שאנחנו מדברים בו (ראה engine/placement.js)
const WAYTYPE = {
  1: 'primary', 2: 'unclassified', 3: 'residential', 4: 'path', 5: 'track',
  6: 'path', 7: 'footway', 8: 'steps',
}
// סוגי פנייה שמסמנים צומת אמיתי — לא "המשיכו ישר" ולא יציאה/הגעה.
const TURN_TYPES = new Set([0, 1, 2, 3, 4, 5, 7, 8, 9, 12, 13])

const round6 = x => Math.round(x * 1e6) / 1e6

// תשובת GeoJSON → { ok, path: [{lat,lng,street}], meters } או { ok:false, reason }.
// שם הרחוב לכל נקודה מגיע מהצעדים (way_points = טווח אינדקסים בגיאומטריה),
// כי ההוראות שלנו ("פנו ימינה לרחוב X") נבנות משמות על הנקודות.
export function parseOrs(json) {
  const f = json?.features?.[0]
  const coords = f?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 4) return { ok: false, reason: 'empty' }
  const names = new Array(coords.length).fill('')
  // צומת: הנקודה שבה ההוראה משתנה לפנייה. שם נפגשים רחובות, ושם אסור
  // להעמיד ילד — גם אם זו הנקודה ה"יפה" לפי מרחק.
  const junctions = new Array(coords.length).fill(false)
  for (const seg of f.properties?.segments || []) {
    for (const st of seg.steps || []) {
      const [a, b] = st.way_points || []
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue
      const nm = cleanName(st.name)
      for (let i = a; i <= b && i < names.length; i++) if (!names[i]) names[i] = nm
      if (TURN_TYPES.has(st.type) && a >= 0 && a < junctions.length) junctions[a] = true
    }
  }
  // סוג הדרך לכל נקודה, מטווחי ה-extras
  const kinds = new Array(coords.length).fill(null)
  for (const [a, b, v] of f.properties?.extras?.waytype?.values || []) {
    const kind = WAYTYPE[v] || null
    for (let i = a; i <= b && i < kinds.length; i++) kinds[i] = kind
  }
  const path = coords.map(([lng, lat], i) => ({ lat, lng, street: names[i] || '', kind: kinds[i], junction: junctions[i] }))
  const meters = Math.round(f.properties?.summary?.distance || 0)
  return { ok: true, path, meters }
}

// "-" ו-"Unnamed" הם מה ש-ORS מחזיר לשביל בלי שם. אצלנו זה מחרוזת ריקה.
function cleanName(n) {
  if (!n || n === '-' || /^unnamed/i.test(n)) return ''
  return String(n).trim()
}

// זרע יומי: אותו בית, לולאה אחרת כל יום. יום בשנה מספיק.
export function daySeed(d = new Date()) {
  const start = Date.UTC(d.getFullYear(), 0, 1)
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000)
}

// ── ניקוי המפתח ──
// מפתח של ORS הוא base64 של JSON קטן ({"org","id","h"}). כשמדביקים אותו
// מטלפון בעברית נדבקים אליו תווי כיווניות וזנב כמו "0 in" — וזה מה שנשמר
// ב-Vercel. במקום לבקש להדביק שוב: מסירים כל מה שאינו base64, ואם זה לא
// מפוענח, מקצצים מהסוף עד שהוא כן.
export function cleanKey(raw) {
  let k = String(raw || '').replace(/^Bearer\s+/i, '').replace(/[^A-Za-z0-9+/=_-]/g, '')
  if (!k) return ''
  // מקצצים מהסוף תו-תו (עד 8) עד שמתקבל JSON תקין — הזנב הזר תמיד בסוף.
  for (let cut = 0; cut <= 8 && cut < k.length; cut++) {
    const c = k.slice(0, k.length - cut)
    if (looksLikeKey(c)) return c
  }
  return k
}
function looksLikeKey(k) {
  try {
    const json = JSON.parse(typeof atob === 'function' ? atob(k) : Buffer.from(k, 'base64').toString('utf8'))
    return !!(json && json.org && json.id)
  } catch (e) { return false }
}

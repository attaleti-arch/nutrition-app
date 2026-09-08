// ─── איפה היצור נמצא ───
// במשחק הקודם היעד קיבל נקודת GPS בזמן בניית המסלול, והילד היה חייב
// להגיע לתוך 28 מ' ממנה. במסע 1 יש יצור אחד — ואם הנקודה נפלה מאחורי
// גדר, שער נעול או חצר פרטית, המסע לא ניתן להשלמה בכלל.
//
// כאן היעד נוצר *קדימה על המסלול שהילד כבר הולך בו*, בתוך המסלול
// שה-routing ושכבת הבטיחות כבר אימתו. הוא תמיד נגיש, תמיד על רחוב
// אמיתי, ואף פעם לא מעבר לגדר.

import { pointAlong, pathLength, progressAlong, haversine } from './geo.js'

// כמה קדימה למקם. מספיק רחוק כדי שתהיה הליכה אמיתית, מספיק קרוב כדי
// שהילד לא יאבד עניין בדרך.
export const AHEAD_MIN = 180
export const AHEAD_MAX = 300

// לא ממקמים לפני שהילד באמת יצא לדרך. זה גם מונע יעד שנוחת בסלון.
export const PLACE_AFTER = 60

export function placeTarget(path, walkedAlong, { ahead, endBufferM = 120 } = {}) {
  if (!path || path.length < 2) return null
  const total = pathLength(path)
  const dist = ahead ?? AHEAD_MIN + Math.random() * (AHEAD_MAX - AHEAD_MIN)

  // משאירים מרווח לפני סוף הלולאה: יצור שנוחת עשרה מטר מהבית גורם
  // למסע להיגמר לפני שהתחיל.
  const maxAlong = Math.max(walkedAlong + 60, total - endBufferM)
  const at = Math.min(walkedAlong + dist, maxAlong)

  const p = pointAlong(path, at)
  if (!p) return null
  return { lat: p.point.lat, lng: p.point.lng, along: at }
}

// ── תחנות: כמה יצורים לאורך המסלול, קבועים מראש ──
// "רציתי מסלול כמו גוגל, של שעה, עם יעד ברור וכמה דמויות שפוגשים בדרך."
// אז לא יעד אחד שנולד תוך כדי הליכה, אלא תחנות שנקבעות ברגע שהמסלול
// נבנה, מפוזרות שווה לאורכו, עם מרווח מהבית בהתחלה ובסוף. הן מצוירות
// על המפה מההתחלה. הילד יודע לאן הוא הולך.
export const STOPS = 3
export const STOP_BUFFER = 150

// creatures: מי מחכה בכל תחנה, לפי הסדר, במחזוריות. נימי תמיד ראשון — הוא
// מוצא הדרכים, ובלעדיו אין שביל לאחרים.
// ── עד איפה המסלול "חדש" ──
// מסלול שחוזר באותו רחוב (הלוך ושוב) עובר בכל נקודה של הדרך חזרה כבר
// בדרך החוצה. יצור שמונח ב-80% של מסלול כזה יושב פיזית 600 מ' מהבית —
// והילד פוגש אותו אחרי שבע דקות, בדרך החוצה. "הלכנו 7 דקות, דבשון היה
// וזהו." לכן: מחזירה את המרחק-לאורך האחרון שהנקודה שלו לא נראתה קודם.
// בלולאה רגילה זה כמעט הסוף; בהלוך ושוב — נקודת המפנה.
export function freshEnd(path, { near = 35, gap = 80, step = 10 } = {}) {
  if (!path || path.length < 2) return 0
  const total = pathLength(path)
  const cum = [0]
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + haversine(path[i - 1], path[i]))
  const seen = (pt, before) => {
    for (let i = 1; i < path.length; i++) {
      if (cum[i - 1] > before) break
      if (haversine(pt, path[i - 1]) <= near || haversine(pt, path[i]) <= near) return true
      const d = distToSeg(pt, path[i - 1], path[i])
      if (d <= near) return true
    }
    return false
  }
  for (let at = total; at > 0; at -= step) {
    const p = pointAlong(path, at)
    if (!p) continue
    if (!seen(p.point, at - gap)) return at
  }
  return 0
}

function distToSeg(pt, a, b) {
  const mLat = 111320, mLng = 111320 * Math.cos((pt.lat * Math.PI) / 180)
  const ax = (a.lng - pt.lng) * mLng, ay = (a.lat - pt.lat) * mLat
  const bx = (b.lng - pt.lng) * mLng, by = (b.lat - pt.lat) * mLat
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
  return Math.hypot(ax + t * dx, ay + t * dy)
}

export function placeStops(path, count = STOPS, { creatures = ['nimi'], buffer = STOP_BUFFER } = {}) {
  if (!path || path.length < 2) return []
  const total = pathLength(path)
  // התחנות רק בחלק ה"חדש" של המסלול: בהלוך ושוב — עד נקודת המפנה, ואז
  // היצור מחכה בקצה והדרך חזרה היא איתו, עם מטבעות כפול.
  const end = Math.min(total - buffer, Math.max(freshEnd(path), buffer + 200))
  const usable = Math.max(0, end - buffer)
  const n = Math.max(1, Math.min(count, Math.floor(usable / 200) || 1))   // לפחות 200 מ' בין תחנות
  const list = Array.isArray(creatures) && creatures.length ? creatures : ['nimi']
  // היצור בסוף, לא באמצע. "הלכתי שבע דקות ומצאתי את נימי — למה שילד ימשיך?"
  // רוב ההליכה לפני התפיסה, וחם־קר שמתחזק לאורכה. יצור אחד: ב-80% מהדרך.
  // שניים: 45% ו-85%. שלושה: 30%, 60%, 85%.
  const FRACS = { 1: [0.8], 2: [0.45, 0.85], 3: [0.3, 0.6, 0.85] }
  const fr = FRACS[n] || Array.from({ length: n }, (_, i) => (i + 1) / (n + 1))
  const stops = []
  for (let i = 0; i < n; i++) {
    const at = buffer + usable * fr[i]
    const p = pointAlong(path, at)
    if (!p) continue
    stops.push({ lat: p.point.lat, lng: p.point.lng, along: at, creature: list[i % list.length], done: false })
  }
  return stops
}

// ── resume אחרי שהילד סגר וזז ──
// שומרים את מצב הסיפור ואת מה שכבר הושג, אבל לא מכריחים אותו לחזור
// פיזית לנקודה של אתמול. אם הוא כבר איפה שהיה היעד — או עבר אותו, או
// שהוא בכלל רחוק מהמסלול — היעד נוצר מחדש קדימה מהמקום שבו הוא עומד
// עכשיו.
export const REVALIDATE_OFFPATH = 150   // מטר מהמסלול = כבר לא אותו מסלול
export const REVALIDATE_PASSED = 30     // עבר את היעד בלי שהמפגש קרה

export function revalidate({ path, target, pos }) {
  if (!path || path.length < 2) return { action: 'rebuild-route' }
  const here = progressAlong(path, pos)

  if (here.offPath > REVALIDATE_OFFPATH) {
    // הילד לא על המסלול הזה בכלל. המסלול עצמו צריך להיבנות מחדש
    // סביב המקום שבו הוא עומד — אבל הסיפור וההתקדמות נשמרים.
    return { action: 'rebuild-route', reason: 'off-path', offPath: here.offPath }
  }

  if (!target) {
    return { action: 'place', at: here.along }
  }

  const passed = here.along > target.along - REVALIDATE_PASSED
  const behind = haversine(pos, target) > 40 && passed
  if (passed || behind) {
    return { action: 'replace', at: here.along, reason: 'passed' }
  }

  return { action: 'keep', at: here.along }
}

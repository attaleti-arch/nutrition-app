// ─── הרוחות ───
// הרעיון של הבן שלה: "רוחות שהרסו את העולם. אפשר לשאוב אותן מהמסלול אם
// קונים שואב. ואם לא — הרוח מנסה לחטוף את הדמות שנמצאת במסלול."
//
// וזו גם התשובה לשאלה שהעולם שואל מהשנייה הראשונה של הפתיחה: מה שבר
// אותו. רוח. היא עוד שם, בחוץ, על המסלול.
//
// המכניקה, בשלוש שורות:
//   יש שואב  — לוחצים, שואבים, והרוח הופכת למשאב (רוח) ולמטבעות.
//   אין שואב — היא חוטפת את היצור וגוררת אותו קדימה במסלול. לא מאבדים
//              אותו לעולם; פשוט הולכים עוד. ילד לא נענש, הוא נדחף.
//
// טהור: מקבל מסלול ומיקום, מחזיר נקודות ותוצאות. בלי React, בלי זמן.

import { pointAlong, pathLength, haversine } from './geo.js'

export const WIND_NEAR_M = 32        // מכאן היא מגיבה
export const WIND_COINS = 4          // כמה שווה שאיבה
export const WIND_PUSH_M = 130       // כמה היא גוררת את היצור קדימה
export const WIND_CLEAR_M = 110      // לא צמודה לתחנה — אחרת שתיהן באותו רגע
export const WIND_START_M = 220
export const WIND_END_M = 150
export const MAX_WINDS = 3

// ── איפה הן ──
// פרוסות על המסלול, לא על תחנה, ולא בהתחלה ובסוף. אותה שיטה כמו
// המטבעות: pointAlong על הקו, כלומר תמיד על המסלול עצמו.
export function placeWinds(path, { stops = [], coinRun = null, flowerRun = null, n = 2, rng = Math.random } = {}) {
  if (!path || path.length < 2) return []
  const total = pathLength(path)
  const from = WIND_START_M, to = total - WIND_END_M
  if (to - from < 200) return []
  const count = Math.max(1, Math.min(MAX_WINDS, n))
  const busy = [...(stops || []), coinRun, flowerRun].filter(Boolean).map(s => s.along)
  const out = []
  for (let i = 0; i < count; i++) {
    // מרווח שווה, עם תזוזה קטנה כדי שלא יהיו במקום זהה בכל מסע
    const base = from + ((to - from) * (i + 0.5)) / count
    let at = base + (rng() - 0.5) * 60
    // מתרחקים מתחנה: קדימה או אחורה, מה שקרוב יותר
    for (const b of busy) {
      if (Math.abs(at - b) < WIND_CLEAR_M) at = at < b ? b - WIND_CLEAR_M : b + WIND_CLEAR_M
    }
    at = Math.max(from, Math.min(to, at))
    if (out.some(w => Math.abs(w.along - at) < 150)) continue
    const p = pointAlong(path, at)
    if (!p) continue
    out.push({ id: 'w' + i, lat: p.point.lat, lng: p.point.lng, along: at, taken: false, hit: false })
  }
  return out
}

// הרוח הקרובה שעוד לא נגמרה. אותו דפוס כמו goldNearby.
export function windNearby(run, pos) {
  if (!pos) return null
  const list = run?.winds || []
  for (const w of list) {
    if (w.taken || w.hit) continue
    if (haversine(w, pos) <= WIND_NEAR_M) return w
  }
  return null
}

export const windsLeft = run => (run?.winds || []).filter(w => !w.taken && !w.hit).length

// ── שואבים ──
// הרוח נכנסת לשואב: משאב "רוח" למי שבבית, ומטבעות עכשיו.
export function suckWind(run, id) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  const winds = list.map((w, k) => (k === i ? { ...w, taken: true } : w))
  return { winds, coins: WIND_COINS }
}

// ── לא שואבים ──
// היא חוטפת את היצור הבא וגוררת אותו קדימה על המסלול. היצור לא אובד —
// הוא רק רחוק יותר, וזה עוד הליכה. מחזיר גם את מי שנחטף, בשביל המשפט.
export function windSteals(run, id, path = run?.path) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  const winds = list.map((w, k) => (k === i ? { ...w, hit: true } : w))
  const stops = run?.stops
  if (!Array.isArray(stops) || !path) return { winds, stops, creature: null }
  const k = stops.findIndex(s => !s.done)
  if (k < 0) return { winds, stops, creature: null }
  const total = pathLength(path)
  const at = Math.min(stops[k].along + WIND_PUSH_M, total - 80)
  const p = pointAlong(path, at)
  if (!p || at <= stops[k].along + 5) return { winds, stops, creature: null }
  const moved = stops.map((s, j) => (j === k ? { ...s, lat: p.point.lat, lng: p.point.lng, along: at } : s))
  return { winds, stops: moved, creature: stops[k].creature, pushed: Math.round(at - stops[k].along) }
}

// ─── הקווים על המפה, כפונקציות טהורות ───
// מה שהופך רשימת נקודות למשהו שילד מבין במבט: איפה כבר הלכנו, לאיזה
// כיוון ממשיכים. בלי Leaflet, בלי React — כדי שאפשר לבדוק.

import { bearing, haversine } from './geo.js'

export const ARROW_EVERY_M = 110

// חיצים לאורך המסלול: כל ~110 מ' נקודה עם כיוון ההליכה. "לא ברור לאן
// הולכים" — ככה ברור גם בלי לקרוא. מחזיר [{lat, lng, deg}].
export function routeArrows(path, everyM = ARROW_EVERY_M) {
  if (!path || path.length < 2) return []
  const out = []
  let acc = 0, next = everyM * 0.6
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]
    const d = haversine(a, b)
    if (d <= 0) continue
    while (acc + d >= next) {
      const t = (next - acc) / d
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, deg: bearing(a, b) })
      next += everyM
    }
    acc += d
  }
  return out
}

// לאן פונים עכשיו: הכיוון של המסלול בנקודה שאנחנו בה (along), במבט
// lookAhead מטרים קדימה. זה מה שהדמות על המפה מסתכלת אליו — "לכיוון
// הנכון", לא לכיוון שהילד הולך בו במקרה. null כשאין מסלול.
export function routeDirAt(path, along, lookAhead = 25) {
  if (!path || path.length < 2) return null
  const total = path.reduce((s, p, i) => (i ? s + haversine(path[i - 1], p) : 0), 0)
  const a = Math.max(0, Math.min(total - 1, along || 0))
  const b = Math.min(total, a + lookAhead)
  const from = splitAt(path, a).todo[0]
  const to = splitAt(path, b).todo[0] || path[path.length - 1]
  if (!from || !to || haversine(from, to) < 0.5) return null
  return bearing(from, to)
}

// חותך את המסלול במרחק along מהתחלה: { done, todo }. נקודת החיתוך
// מופיעה בשניהם, כדי שהקווים ייפגשו בלי חור.
export function splitAt(path, along) {
  if (!path || path.length < 2) return { done: [], todo: path || [] }
  if (!(along > 0)) return { done: [], todo: path }
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]
    const d = haversine(a, b)
    if (acc + d >= along) {
      const t = d > 0 ? (along - acc) / d : 0
      const cut = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
      return { done: [...path.slice(0, i), cut], todo: [cut, ...path.slice(i)] }
    }
    acc += d
  }
  return { done: path, todo: [] }
}

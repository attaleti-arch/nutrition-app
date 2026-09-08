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

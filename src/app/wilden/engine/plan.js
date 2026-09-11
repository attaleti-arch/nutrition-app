// ─── תוכנית המסע: כמה, ומה בדרך ───
// "במקום לנחש זמנים — הורה יזין קילומטרים." ההורה בוחר אורך (1 עד 4 ק"מ),
// והמשחק גוזר מזה את הזמן ואת נקודות העניין:
//   עד 1.5 ק"מ     — יצור ומטבעות (ריצה או קפיצה, לסירוגין)
//   2 עד 3 ק"מ     — יצור ושני סבבי מטבעות (ריצה + קפיצה)
//   3 ק"מ ומעלה    — שני יצורים ושני סבבי מטבעות (~45 דקות)
// הנקודות מפוזרות שווה על החלק ה"חדש" של המסלול, והיצור האחרון יושב
// בערך באמצע: "אורך המסלול. יצור יחסית באמצע ונמשך." אחרי התפיסה נשאר
// חצי מסלול — עם היצור לצד הילד, עם מטבעות כפול, ועם עוד מה לעשות בדרך.
// יצור בסוף היה הופך את השאר ל"עכשיו פשוט תלכו הביתה".
//
// טהור. בלי הגדרה של ההורה — הלוח הישן (2.2 ק"מ בראשון, 3.2 אחר כך).

import { pointAlong, pathLength } from './geo.js'
import { freshEnd, STOP_BUFFER } from './placement.js'

export const ROUTE_KM = [1, 1.5, 2, 3, 4]
export const KID_KMH = 3.3                  // קצב הליכה של ילד, לטיימר
export const POI = { CREATURE: 'creature', RUN: 'run', GOLD: 'gold', FLOWERS: 'flowers' }
export const MIN_GAP_M = 200                // פחות מזה בין נקודות — מוותרים על אחת

export const defaultKm = walks => (walks === 0 ? 2.2 : 3.2)
export const routeKm = (progress, walks = progress?.walks || 0) => progress?.routeKm || defaultKm(walks)
export const targetM = (progress, walks) => Math.round(routeKm(progress, walks) * 1000)
export const plannedMsKm = km => Math.round((km / KID_KMH) * 3600 * 1000)
export const plannedMin = km => Math.round((km / KID_KMH) * 60)

export function setRouteKm(progress, km) {
  if (!ROUTE_KM.includes(km)) return progress
  return { ...progress, routeKm: km }
}

// מה בדרך, לפי האורך. הסדר קבוע: היצור האחרון בערך באמצע, ואחריו עוד
// נקודה או שתיים — שגם לדרך חזרה יש מה להציע.
// פרחים: "כמו מטבעות, לפחות 20 שניות לאסוף בקפיצה או ריצה, ושיראו אותם."
// אותה ריצה של 20 שניות, עם פרחים, מ-2 ק"מ ומעלה (בקצר אין מקום לעוד תחנה).
export function poisFor(km, walks = 0) {
  if (km <= 1.5) return [POI.CREATURE, walks % 2 ? POI.GOLD : POI.RUN]
  if (km < 3) return [POI.RUN, POI.CREATURE, POI.FLOWERS, POI.GOLD]
  return [POI.RUN, POI.CREATURE, POI.FLOWERS, POI.CREATURE, POI.GOLD]
}
export const creatureCount = pois => pois.filter(k => k === POI.CREATURE).length

// יצור נוסף שנקנה נכנס אחרי היצור האחרון שבתוכנית — לא בסוף הרשימה.
// מה שבסוף הוא הדרך הביתה, והיא צריכה להישאר הדרך הביתה.
export function withCreatures(kinds, n) {
  if (!kinds?.length || !(n > 0)) return kinds
  const last = kinds.lastIndexOf(POI.CREATURE)
  const at = last < 0 ? kinds.length : last + 1
  return [...kinds.slice(0, at), ...Array(n).fill(POI.CREATURE), ...kinds.slice(at)]
}

// מניחים את הנקודות על המסלול. creatures: מי בתחנות, לפי הסדר.
// מחזיר { stops, coinRun, flowerRun, goldAlong } — מה שהמכונה צריכה.
export function placePois(path, kinds, { creatures = ['nimi'], buffer = STOP_BUFFER, freshEndM = null } = {}) {
  const out = { stops: [], coinRun: null, flowerRun: null, goldAlong: null }
  if (!path || path.length < 2 || !kinds?.length) return out
  const total = pathLength(path)
  const fe = freshEndM ?? freshEnd(path)
  const end = Math.min(total - buffer, Math.max(fe, buffer + 200))
  const usable = Math.max(0, end - buffer)
  // צפוף מדי? מוותרים על תחנות לפני שמוותרים על יצור — אבל יצור אחד לפחות תמיד.
  let list = [...kinds]
  while (list.length > 1 && (usable * 0.85) / list.length < MIN_GAP_M) {
    // צפוף: קודם מוותרים על הפרחים, אחר כך על הזהב, אחר כך על ריצת המטבעות.
    const drop = list.lastIndexOf(POI.FLOWERS) >= 0 ? list.lastIndexOf(POI.FLOWERS)
      : list.lastIndexOf(POI.GOLD) >= 0 ? list.lastIndexOf(POI.GOLD)
      : list.lastIndexOf(POI.RUN) >= 0 ? list.lastIndexOf(POI.RUN) : list.indexOf(POI.CREATURE)
    list.splice(drop, 1)
  }
  if (!list.includes(POI.CREATURE)) list.push(POI.CREATURE)
  const n = list.length
  const who = Array.isArray(creatures) && creatures.length ? creatures : ['nimi']
  let ci = 0
  list.forEach((kind, i) => {
    const at = buffer + usable * (0.85 * (i + 1)) / n
    const p = pointAlong(path, at)
    if (!p) return
    const pt = { lat: p.point.lat, lng: p.point.lng, along: at }
    if (kind === POI.CREATURE) out.stops.push({ ...pt, creature: who[ci++ % who.length], done: false })
    else if (kind === POI.RUN) out.coinRun = { ...pt, done: false }
    else if (kind === POI.FLOWERS) out.flowerRun = { ...pt, done: false }
    else if (kind === POI.GOLD) out.goldAlong = at
  })
  return out
}

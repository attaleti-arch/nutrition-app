// ─── בניית הלולאה, כפונקציה טהורה ───
// שני באגים ברצף חמקו מכאן בדיוק בגלל שהלוגיקה ישבה בתוך hook של React:
// קריאה כפולה ל-parseOverpass שזרקה את כל הנתונים, ואובייקט שהועבר
// במקום אינדקס. שניהם התגלו רק על טלפון ברחוב, כי Overpass חסומה
// מסביבת הפיתוח ולכן כל מסלול נפל לחלופי — ובנפילה הכול נראה תקין.
//
// עכשיו השרשרת כולה היא פונקציה שמקבלת תשובת Overpass ומחזירה מסלול,
// ואפשר להריץ עליה תשובה שמורה בלי רשת בכלל.

import { buildGraph, planLoop, planThereAndBack, loopSteps, nearestNode, dijkstra } from './routing.js'
import { parseOverpass } from './osm.js'
import { destination } from './geo.js'

// שעה של הליכה בקצב של ילד, עם שלוש עצירות למפגשים. היא ביקשה שעה.
export const TARGET_M = 3400

// מקבלת או JSON גולמי מ-Overpass, או תוצאה שכבר פוענחה. ההבחנה הזאת
// היא בדיוק מה שנשבר קודם, ולכן היא מפורשת כאן ולא נתונה לפרשנות.
export function normalize(input) {
  if (!input) return { ways: [], blocked: [] }
  if (Array.isArray(input.elements)) return parseOverpass(input)
  return { ways: input.ways || [], blocked: input.blocked || [] }
}

// ── הסולם ──
// "no-loop" על הטלפון שלה: הרחובות הגיעו, והמתכנן לא מצא לולאה. ביישוב
// קטן זה קורה: רחוב ראשי אחד, כמה סמטאות, ושדות מסביב שחותכים את
// הגרף. במקום להיכנע — יורדים בסולם, מדרגה אחרי מדרגה, עד שיש מסלול
// על רחובות אמיתיים. אף מדרגה לא ממציאה קו דרך שדה.
//
//   1. הלולאה כמו שתוכננה.
//   2. אותו אורך, חלון רחב יותר לנקודת המפנה.
//   3. לולאה קצרה יותר: 80%, 65%, 50% מהאורך.
//   4. כל אלה שוב — בלי סינון השטחים החסומים, כשהסינון הוא מה שקרע את
//      הגרף (שדה שהרחוב עובר בתוכו, מטע שהמושב יושב בו).
//   5. הלוך ושוב באותו רחוב, עד חצי האורך.
const LADDER = [
  { scale: 1 },
  { scale: 1, relaxed: true },
  { scale: 0.8, relaxed: true },
  { scale: 0.65, relaxed: true },
  { scale: 0.5, relaxed: true },
]
const RELAXED = { window: [0.2, 0.7], minLen: 0.45, candidates: 18 }
const MIN_LOOP_M = 500

// מחזירה { ok: true, path, meters, overlap, shape, scale, unblocked } או
// { ok: false, reason }. reason: empty | no-node | no-loop
// shape: loop | short (לולאה קצרה מהמתוכנן) | there-and-back
export function buildLoop(input, home, target = TARGET_M) {
  const { ways, blocked } = normalize(input)
  if (!ways.length) return { ok: false, reason: 'empty' }

  // שני גרפים: עם הסינון, ובלעדיו. השני רק כשיש בכלל מה להסיר.
  const variants = []
  for (const unblocked of blocked.length ? [false, true] : [false]) {
    const graph = buildGraph(ways, unblocked ? [] : blocked)
    if (!graph?.nodes?.length) continue
    // nearestNode מחזירה { idx, dist }, ו-planLoop מחזיר
    // { loop, len, overlap, score }. שתיהן נראות כמו ערך פשוט ואינן —
    // וזה בדיוק מה שנשבר פעמיים ברצף. הבית חייב להיות באמת ליד רחוב
    // ממופה, אחרת המסלול מתחיל 300 מ' מהדלת.
    const start = nearestNode(graph, home)
    if (!start || start.idx < 0 || start.dist > 250) continue
    variants.push({ graph, start, unblocked, out: dijkstra(graph, start.idx) })
  }
  if (!variants.length) return { ok: false, reason: 'no-node' }

  const finish = (v, plan, shape, scale) => {
    // נקודות {lat, lng, street}. שם הרחוב נוסע עם המסלול כדי שההוראות
    // יגידו לאן פונים, לא רק לאיזה צד.
    const path = loopSteps(v.graph, plan.loop)
    if (!path || path.length < 4 || plan.len < MIN_LOOP_M) return null
    return { ok: true, path, meters: plan.len, overlap: plan.overlap, shape, scale, unblocked: v.unblocked }
  }

  // סיבוב ראשון: רק לולאות אמיתיות (החזרה ברחובות אחרים). סיבוב שני:
  // גם כאלה שחוזרות באותם רחובות — הלוך ושוב באורך המלא עדיין עדיף על
  // כלום, אבל לולאה אמיתית קצרה יותר עדיפה עליו.
  for (const maxOverlap of [0.5, 1]) {
    for (const step of LADDER) {
      for (const v of variants) {
        const plan = planLoop(v.graph, v.start.idx, target * step.scale, { ...(step.relaxed ? RELAXED : {}), maxOverlap, out: v.out })
        if (!plan?.loop?.length) continue
        const shape = plan.overlap >= 0.8 ? 'there-and-back' : step.scale < 0.85 ? 'short' : 'loop'
        const r = finish(v, plan, shape, step.scale)
        if (r) return r
      }
    }
  }
  for (const v of variants) {
    const plan = planThereAndBack(v.graph, v.start.idx, target, { out: v.out })
    if (!plan) continue
    const r = finish(v, plan, 'there-and-back', plan.len / target)
    if (r) return r
  }
  return { ok: false, reason: 'no-loop' }
}

// מה אומרים להורה כשהמסלול הוא לא הלולאה שתוכננה. null = הכול כרגיל.
export function routeNote(r) {
  if (!r?.ok) return null
  const bits = []
  if (r.shape === 'there-and-back') bits.push('כאן אין מסלול מעגלי, אז הולכים עד הסוף וחוזרים באותה דרך.')
  else if (r.shape === 'short') bits.push('המסלול קצר קצת מהמתוכנן. זה מה שהרחובות כאן מאפשרים.')
  if (r.unblocked) bits.push('שימו לב: המסלול עובר ליד שטחים פתוחים.')
  return bits.length ? bits.join(' ') : null
}

// ── המסלול החלופי ──
// מרובע גס סביב הבית. לא מוצמד לרחובות, ולכן רשת אחרונה בלבד: הילד
// עדיין יוצא, אבל בלי הבטחת הבטיחות של OSM — והמסך אומר את זה.
export function fallbackLoop(home, target = TARGET_M) {
  const r = target / 6.5
  const ring = [0, 45, 90, 135, 180, 225, 270, 315].map(b => destination(home, b, r))
  return [home, ...ring, home]
}

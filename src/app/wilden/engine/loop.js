// ─── בניית הלולאה, כפונקציה טהורה ───
// שני באגים ברצף חמקו מכאן בדיוק בגלל שהלוגיקה ישבה בתוך hook של React:
// קריאה כפולה ל-parseOverpass שזרקה את כל הנתונים, ואובייקט שהועבר
// במקום אינדקס. שניהם התגלו רק על טלפון ברחוב, כי Overpass חסומה
// מסביבת הפיתוח ולכן כל מסלול נפל לחלופי — ובנפילה הכול נראה תקין.
//
// עכשיו השרשרת כולה היא פונקציה שמקבלת תשובת Overpass ומחזירה מסלול,
// ואפשר להריץ עליה תשובה שמורה בלי רשת בכלל.

import { buildGraph, planLoop, loopCoords, nearestNode } from './routing.js'
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

// מחזירה { ok: true, path } או { ok: false, reason }.
// reason הוא אחד מ: empty | no-node | no-loop | short-loop
export function buildLoop(input, home, target = TARGET_M) {
  const { ways, blocked } = normalize(input)
  if (!ways.length) return { ok: false, reason: 'empty' }

  const graph = buildGraph(ways, blocked)
  if (!graph?.nodes?.length) return { ok: false, reason: 'empty' }

  // nearestNode מחזירה { idx, dist }, ו-planLoop מחזיר
  // { loop, len, overlap, score }. שתיהן נראות כמו ערך פשוט ואינן —
  // וזה בדיוק מה שנשבר פעמיים ברצף. הבית חייב להיות באמת ליד רחוב
  // ממופה, אחרת המסלול מתחיל 300 מ' מהדלת.
  const start = nearestNode(graph, home)
  if (!start || start.idx < 0 || start.dist > 250) return { ok: false, reason: 'no-node' }

  const plan = planLoop(graph, start.idx, target)
  if (!plan?.loop?.length) return { ok: false, reason: 'no-loop' }

  const coords = loopCoords(graph, plan.loop)
  if (!coords || coords.length < 8) return { ok: false, reason: 'short-loop' }

  // loopCoords מחזיר [lat, lng]. כל שאר המנוע עובד ב-{lat, lng}, וערבוב
  // בין השניים לא זורק שגיאה — הוא פשוט מייצר מסלול באמצע האוקיינוס.
  const path = coords.map(([lat, lng]) => ({ lat, lng }))

  return { ok: true, path, meters: plan.len, overlap: plan.overlap }
}

// ── המסלול החלופי ──
// מרובע גס סביב הבית. לא מוצמד לרחובות, ולכן רשת אחרונה בלבד: הילד
// עדיין יוצא, אבל בלי הבטחת הבטיחות של OSM — והמסך אומר את זה.
export function fallbackLoop(home, target = TARGET_M) {
  const r = target / 6.5
  const ring = [0, 45, 90, 135, 180, 225, 270, 315].map(b => destination(home, b, r))
  return [home, ...ring, home]
}

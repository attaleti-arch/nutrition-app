// ─── הרוחות ───
// הרעיון של הבן שלה: "רוחות שהרסו את העולם. אפשר לשאוב אותן מהמסלול אם
// קונים שואב. ואם לא — הרוח מנסה לחטוף את הדמות שנמצאת במסלול."
//
// וזו גם התשובה לשאלה שהעולם שואל מהשנייה הראשונה של הפתיחה: מה שבר
// אותו. רוח. היא עוד שם, בחוץ, על המסלול.
//
// המכניקה, בשלוש שורות:
//   יש שואב  — לוחצים, שואבים, והרוח הופכת למשאב (רוח) ולמטבעות.
//   אין שואב — הוא חוטף את בן הלוויה. לא מאבדים אותו לעולם; הוא חוזר
//              הביתה בסוף. ילד לא נענש, הוא נדחף לרוץ.
//
// טהור: מקבל מסלול ומיקום, מחזיר נקודות ותוצאות. בלי React, בלי זמן.

import { pointAlong, pathLength, haversine } from './geo.js'

// ── הבחירה ──
// "אני רוצה שתהיה לו בחירה: לרכוש שואב מראש כי יש רוח במסלול. ואם אין לו
// כסף, כשהיא מופיעה בהפתעה הוא צריך לברוח עם בן הלוויה שלו כדי שהיא לא
// תחטוף אותו. אם לא מצליח לברוח — בן הלוויה יישאב."
//
// ומכאן שתי דרכים שונות לגמרי לאותו מסלול:
//   קנית שואב — הרוחות מסומנות על המפה מראש. רואים, מתקרבים, שואבים.
//   לא קנית   — הן לא על המפה בכלל. אחת מהן קופצת עליך באמצע הדרך, ואז
//               רצים. הצלחת — היא מתפוגגת. לא הצלחת — היא לוקחת את בן
//               הלוויה, והוא לא איתך עד סוף הטיול.
// הבריחה היא ריצה אמיתית: צעדים בזמן קצוב. זה גם מה שהמשחק הזה רוצה.
export const FLEE_MS = 15000         // כמה זמן יש לברוח, בפעם הראשונה
export const FLEE_STEPS = 22         // וכמה צעדים צריך
export const FLEE_COINS = 6          // מי שברח — הרוויח
export const WIND_RES = 'wind'       // ומי ששאב — קיבל משאב, לא רק מטבעות

// ── "אם האיום לא מתממש, למה לרכוש שואב?" ──
// שאלה נכונה, ובלעדיה השואב הוא קישוט. שלוש תשובות, וכולן כאן:
//   1. גובטבו מתחזק. כל פעם שהוא קופץ באותו טיול הוא מהיר יותר: עוד
//      ארבעה צעדים, שנייה פחות. בפעם השלישית הוא באמת תופס לפעמים.
//   2. הבריחה היא ריצה, לא לחיצות. כשיש מד צעדים חי — נגיעה במסך לא
//      נספרת. (זה היה החור: אפשר היה לברוח בלי לזוז.)
//   3. שאיבה מביאה משאב "רוח" הביתה — וזה משאב שהשומר מבקש, ובלי
//      השואב הוא מגיע רק מרוחי.
export const fleeGoal = (round = 1) => ({
  steps: FLEE_STEPS + 4 * Math.max(0, round - 1),
  ms: Math.max(9000, FLEE_MS - 1000 * Math.max(0, round - 1)),
})
export const escaped = (steps, ms, round = 1) => {
  const g = fleeGoal(round)
  return (steps || 0) >= g.steps && (ms || 0) <= g.ms
}
// כמה פעמים הוא כבר קפץ בטיול הזה (כדי לדעת כמה הוא מהיר עכשיו)
export const windRound = run => (run?.winds || []).filter(w => w.fled || w.tookBuddy).length + 1

// ── השם ──
// "גובטבו." הבן שלה נתן לו שם, ומרגע שיש שם יש דמות ולא מכשול. הוא
// יושב כאן פעם אחת ונכנס לכל משפט דרך {wind} — כך ששינוי שם הוא שורה
// אחת, והגרמנית לא נשברת.
export const WIND_NAME = 'גובטבו'

export const WIND_NEAR_M = 32        // מכאן הוא מגיב
export const WIND_COINS = 4          // כמה שווה שאיבה
export const WIND_PUSH_M = 130       // כמה היא גוררת את היצור קדימה
export const WIND_CLEAR_M = 110      // לא צמודה לתחנה — אחרת שתיהן באותו רגע
export const WIND_START_M = 220
export const WIND_END_M = 150
export const MAX_WINDS = 3

// ── איפה הן ──
// פרוסות על המסלול, לא על תחנה, ולא בהתחלה ובסוף. אותה שיטה כמו
// המטבעות: pointAlong על הקו, כלומר תמיד על המסלול עצמו.
export function placeWinds(path, { stops = [], coinRun = null, flowerRun = null, n = 2, rng = Math.random, holds = null } = {}) {
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
  // ── הרוח שמחזיקה מישהו ──
  // "בסיבוב הבא הזדמנות להחזיר את הדמות בקניית שואב אבק ושאיבה של הרוח
  // שחטפה אותה." אז היא כאן, על המסלול, ואפשר לזהות אותה: אחת מהן —
  // האמצעית, כדי שתמיד יהיה מרחק ללכת אליה — נושאת את מי שנחטף.
  if (holds && out.length) out[Math.floor(out.length / 2)].holds = holds
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
// הרוח נכנסת לשואב: משאב "רוח" למי שבבית, ומטבעות עכשיו. ואם היא הייתה
// זו שמחזיקה מישהו — הוא יוצא ממנה, וזה כל מה שקרה כאן.
export function suckWind(run, id) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  const winds = list.map((w, k) => (k === i ? { ...w, taken: true } : w))
  return { winds, coins: WIND_COINS, res: WIND_RES, rescued: list[i].holds || null }
}

// ── מי שנחטף, ונשאר חטוף ──
// שלוש התוצאות של מפגש עם גובטבו, ושלושתן שונות:
//   שואבים            — יוצאת ממנו דמות, וזה מה שמצדיק את השואב.
//   בורחים ורצים      — מצליחים, והוא מתפוגג.
//   נשארים בלי לזוז   — הוא חוטף את בן הלוויה, **וזה נשאר**: היצור לא
//                       בבית, לא יוצא איתך, ורואים את החור שהוא השאיר.
// ההחזרה היא משימה: לקנות שואב, למצוא את הרוח שמחזיקה אותו, ולשאוב.
// ושתי רשתות ביטחון: לא חוטפים את היצור האחרון שיש לילד, ולא חוטפים
// שניים — יש מקסימום חטוף אחד בכל רגע, כדי שהעולם לא יתרוקן.
export const takenId = progress => progress?.taken?.creature || null
export const isTaken = (progress, id) => !!id && takenId(progress) === id
export const canTake = progress => !takenId(progress) && (progress?.creatures || []).length >= 2

export function takeCreature(progress, id, t = null) {
  if (!id || !canTake(progress) || !(progress.creatures || []).includes(id)) return progress
  return { ...progress, taken: { creature: id, at: t }, buddy: progress.buddy === id ? null : progress.buddy }
}

export function freeCreature(progress, id = null) {
  if (!takenId(progress)) return progress
  if (id && takenId(progress) !== id) return progress
  return { ...progress, taken: null }
}

// ── ברחו ──
// הרוח מתפוגגת, והריצה שווה מטבעות. אין עונש על מי שרץ.
export function windFled(run, id) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  return { winds: list.map((w, k) => (k === i ? { ...w, taken: true, fled: true } : w)), coins: FLEE_COINS }
}

// ── הטוב מבריח את הפרא ──
// מי שכבר ריכך חמישה (ראה engine/tank.js) יוצא עם אחד מהם, והוא עומד
// מול הראשון שקופץ. אותה פעולה כמו שאיבה מבחינת הרוח — היא נגמרת —
// אבל בלי שואב ובלי בריחה, ופעם אחת בלבד בכל מסע.
export function scareWind(run, id) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  return { winds: list.map((w, k) => (k === i ? { ...w, taken: true, scared: true } : w)) }
}

// ── לא ברחו ──
// היא לוקחת את בן הלוויה. לא לתמיד: הוא לא איתך עד סוף הטיול, וחוזר
// הביתה בפורטל. ומי שקונה שואב ושואב רוח — משחרר אותו באמצע הדרך.
export function windTakesBuddy(run, id) {
  const list = run?.winds || []
  const i = list.findIndex(w => w.id === id)
  if (i < 0 || list[i].taken || list[i].hit) return null
  return { winds: list.map((w, k) => (k === i ? { ...w, hit: true, tookBuddy: true } : w)) }
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

// ─── ריצת המטבעות ───
// "שביל מטבעות באוויר שהילד קופץ ומביא אותן: המצלמה נפתחת שוב ויש כמו
// 20 שניות לאסוף כמה שיותר בריצה ויד מורמת."
//
// המצלמה נפתחת באמצע המסלול. לפני הילד שביל של מטבעות באוויר, מפוזר
// לצדדים ובגבהים שונים. הצעדים (מד התאוצה) מקדמים את הילד לאורך השביל,
// והמטבעות מתקרבים. מטבע נאסף כשהוא בהישג יד ומכוונים אליו את הטלפון:
// הנמוכים — ישר קדימה, הגבוהים — צריך להרים את היד. מה שעברנו בלי
// לתפוס — עף מאחור. עשרים שניות, ספירה, וכל מטבע נכנס לארנק.
//
// טהור: בלי React, בלי חיישנים. הבמה (ar/CoinRun.js) רק מציירת.

export const DURATION_MS = 20000
export const COINS = 16
export const STEP_M = 0.8            // כמה מתקדמים בצעד
export const TAP_M = 1.6             // בלי חיישנים: לחיצה = שני צעדים
export const REACH_M = 2.6           // מטבע בהישג יד
export const PASSED_M = -1.2         // עברנו אותו — הלך
export const AIM_DEG = 16            // כמה מדויק צריך לכוון (אופקי)
export const AIM_UP_DEG = 12         // ואנכי
export const SHOW_M = 14             // רואים מטבעות עד מרחק זה

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// גודל על המסך לפי מרחק: קרוב = גדול.
export const coinScale = d => clamp(3.2 / Math.max(0.8, d), 0.35, 1.5)

// השביל: מטבע כל ~1.7 מ', מתפתל לצדדים (±45° מהכיוון ההתחלתי), ורוב
// המטבעות בגובה העיניים, כל רביעי גבוה — "יד מורמת". השלישי מכל חמישה
// שווה 2.
export function startRun(ref, rng = Math.random, t = 0) {
  const coins = []
  let side = 0
  for (let i = 0; i < COINS; i++) {
    side = clamp(side + rnd(rng, -22, 22), -45, 45)
    const high = i % 4 === 3
    coins.push({
      id: 'r' + i,
      bearing: norm(ref + side),
      elev: high ? rnd(rng, 26, 36) : rnd(rng, -2, 10),
      d: 2.5 + i * 1.7,
      high,
      value: i % 5 === 2 ? 2 : 1,
      taken: false,
      missed: false,
    })
  }
  return { coins, progress: 0, startT: t, endT: t + DURATION_MS, got: 0, done: false, lastT: t }
}

export const timeLeftMs = (s, t) => Math.max(0, s.endT - t)
export const isOver = (s, t) => s.done || t >= s.endT

// מה רואים עכשיו: מטבעות שלא נאספו ולא פוספסו, בטווח, עם מרחק יחסי.
export function visibleCoins(s) {
  return s.coins
    .filter(c => !c.taken && !c.missed)
    .map(c => ({ ...c, rel: c.d - s.progress }))
    .filter(c => c.rel > PASSED_M && c.rel < SHOW_M)
}

// מתקדמים: צעד או לחיצה. מה שנשאר מאחור מפוספס.
export function advance(s, m, t) {
  if (s.done) return s
  const progress = s.progress + m
  const coins = s.coins.map(c => (!c.taken && !c.missed && c.d - progress < PASSED_M ? { ...c, missed: true } : c))
  return { ...s, progress, coins, lastT: t }
}
export const onStep = (s, t) => advance(s, STEP_M, t)
export const onTap = (s, t) => advance(s, TAP_M, t)

// לאן הטלפון מכוון (heading, pitch) — אוספים כל מטבע בהישג יד שמכוונים
// אליו. pitch=null (בלי חיישנים): מתעלמים מהגובה.
export function aim(s, heading, pitch, t) {
  if (s.done || heading == null) return { state: s, got: [] }
  const got = []
  const coins = s.coins.map(c => {
    if (c.taken || c.missed) return c
    const rel = c.d - s.progress
    if (rel > REACH_M || rel <= PASSED_M) return c
    const dx = Math.abs(((heading - c.bearing + 540) % 360) - 180)
    const dy = pitch == null ? 0 : Math.abs(pitch - c.elev)
    if (dx <= AIM_DEG && dy <= AIM_UP_DEG) { got.push(c); return { ...c, taken: true } }
    return c
  })
  if (!got.length) return { state: s, got }
  return { state: { ...s, coins, got: s.got + got.reduce((a, c) => a + c.value, 0), lastT: t }, got }
}

// הזמן נגמר, או שנגמרו המטבעות.
export function tick(s, t) {
  if (s.done) return s
  const left = s.coins.some(c => !c.taken && !c.missed)
  if (t >= s.endT || !left) return { ...s, done: true, lastT: t }
  return s
}

export function summary(s) {
  const taken = s.coins.filter(c => c.taken).length
  return { taken, total: s.coins.length, value: s.got }
}

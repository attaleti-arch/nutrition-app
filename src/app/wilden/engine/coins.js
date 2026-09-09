// ─── מטבעות ───
// הרעיון של הבן שלה: מטבעות לאורך השביל, גלינג כל כמה מטרים, וקנייה בסוף.
// זה מה שכל משחק ריצה עושה, ומה שחסר לנו: פידבק כל 20 מטר ולא כל 20 דקות.
//
// טהור. המטבעות מונחים על המסלול ברגע שהוא נבנה, ונאספים כשהילד עובר
// דרכם. מטבע זהב אחד לכל מסלול, שווה עשרה, בסמטה צדדית של המסלול.

import { pointAlong, pathLength, haversine } from './geo.js'

// "יותר מדי מטבעות." כל 35 מ' היה מסך מלא נקודות. כל 90 מ' זה גלינג
// בערך כל דקה ורבע של הליכה — מספיק כדי לחכות לבא, לא מספיק כדי להימאס.
export const COIN_EVERY_M = 90
export const COIN_START_M = 40          // לא בסלון
export const COIN_END_M = 40
export const COLLECT_RADIUS_M = 14      // GPS של טלפון: 5–10 מ' — צריך מרווח
export const STOP_CLEAR_M = 30          // בלי מטבעות על התחנה עצמה
export const GOLD_VALUE = 10

// goldAlong: איפה הזהב לפי התוכנית (engine/plan.js). undefined — הגרלה כמו
// פעם; null — בלי זהב במסע הזה.
export function placeCoins(path, { stops = [], every = COIN_EVERY_M, rng = Math.random, goldAlong } = {}) {
  if (!path || path.length < 2) return []
  const total = pathLength(path)
  const coins = []
  let i = 0
  for (let at = COIN_START_M; at <= total - COIN_END_M; at += every) {
    const p = pointAlong(path, at)
    if (!p) continue
    if (stops.some(s => Math.abs(s.along - at) < STOP_CLEAR_M)) continue
    coins.push({ id: 'c' + i++, lat: p.point.lat, lng: p.point.lng, along: at, value: 1, taken: false })
  }
  if (goldAlong === null) return coins
  let k = -1
  if (goldAlong != null && coins.length) {
    // הזהב במקום שהתוכנית קבעה: המטבע הקרוב ביותר לשם
    k = coins.reduce((best, c, j) => (Math.abs(c.along - goldAlong) < Math.abs(coins[best].along - goldAlong) ? j : best), 0)
  } else if (coins.length > 6) {
    // מטבע זהב: איפשהו בין 40% ל-75% מהדרך, לא על מטבע רגיל
    k = Math.floor(coins.length * (0.4 + rng() * 0.35))
  }
  if (k >= 0) coins[k] = { ...coins[k], id: 'gold', value: GOLD_VALUE, gold: true }
  return coins
}

// מפת אוצר (חנות): עוד מטבע זהב, בחלק השני של הדרך, לא על זהב קיים.
export function withExtraGold(coins, path) {
  if (!coins?.length) return coins
  const total = path ? pathLength(path) : Math.max(...coins.map(c => c.along))
  const want = total * 0.72
  let k = -1
  coins.forEach((c, j) => { if (!c.gold && (k < 0 || Math.abs(c.along - want) < Math.abs(coins[k].along - want))) k = j })
  if (k < 0) return coins
  return coins.map((c, j) => (j === k ? { ...c, id: 'gold2', value: GOLD_VALUE, gold: true } : c))
}

// מחזירה את המטבעות המעודכנים ואת מה שנאסף עכשיו. לא משנה את הקלט.
// הזהב לא נאסף בהליכה: הוא רגע של קפיצה (GOLD_TAKEN), לא של מעבר.
// along: איפה הילד על המסלול. מטבע של הדרך חזרה יושב, בהלוך ושוב, על
// אותה נקודה כמו מטבע של הדרך החוצה — ובלי זה שניהם היו נאספים ביציאה,
// והדרך חזרה (הכפולה!) נשארת ריקה. מטבע נאסף רק כשמגיעים אליו לאורך.
export const COLLECT_SLACK_M = 60
export function collectCoins(coins, pos, radius = COLLECT_RADIUS_M, along = null) {
  if (!coins?.length || !pos) return { coins, got: [] }
  const got = []
  const next = coins.map(c => {
    if (c.taken || c.gold) return c
    if (along != null && c.along != null && along < c.along - COLLECT_SLACK_M) return c
    if (haversine(c, pos) <= radius) { got.push(c); return { ...c, taken: true } }
    return c
  })
  return got.length ? { coins: next, got } : { coins, got }
}

// ── ריצת המטבעות: איפה ──
// נקודה אחת על המסלול, בשליש הראשון של החלק ה"חדש" (לא בדרך חזרה של
// הלוך ושוב), לא צמודה לתחנה של יצור ולא לבית. מסלול קצר מדי — בלי.
export const COIN_RUN_MIN_PATH_M = 900
export const COIN_RUN_NEAR_M = 20
export const COIN_RUN_CLEAR_M = 140
export function placeCoinRun(path, { stops = [], freshEndM = null } = {}) {
  if (!path || path.length < 2) return null
  const total = pathLength(path)
  if (total < COIN_RUN_MIN_PATH_M) return null
  const end = freshEndM != null ? Math.min(total, freshEndM) : total
  for (const frac of [0.3, 0.45, 0.2, 0.6]) {
    const at = end * frac
    if (at < 200 || at > end - 150) continue
    if (stops.some(s => Math.abs(s.along - at) < COIN_RUN_CLEAR_M)) continue
    const p = pointAlong(path, at)
    if (!p) continue
    return { lat: p.point.lat, lng: p.point.lng, along: at, done: false }
  }
  return null
}
export function coinRunNearby(run, pos) {
  const cr = run?.coinRun
  if (!cr || cr.done || !pos) return null
  return haversine(cr, pos) <= COIN_RUN_NEAR_M ? cr : null
}

export const GOLD_NEAR_M = 22
export function goldNearby(coins, pos) {
  const g = (coins || []).find(c => c.gold && !c.taken)
  if (!g || !pos) return null
  return haversine(g, pos) <= GOLD_NEAR_M ? g : null
}

// הדרך הביתה שווה כפול: היצור הולך איתך. "הוא איתך" צריך להרגיש.
export const HOME_BONUS = 2
export const coinsValue = (list, mult = 1) => (list || []).reduce((s, c) => s + (c.value || 0) * mult, 0)

// ── חם־קר ──
// מרחק ליצור → מילה וחום 0..1. בלי מספרים: ילד לא צריך "620 מ'", הוא צריך
// "פושר… חמים… רותח!". מתחזק לאט לאורך רוב ההליכה.
export const HEAT = [
  { max: 60, key: 'BURNING', word: 'רותח!', t: 1 },
  { max: 150, key: 'HOT', word: 'חם מאוד', t: 0.85 },
  { max: 320, key: 'WARM', word: 'חמים', t: 0.65 },
  { max: 600, key: 'MILD', word: 'פושר', t: 0.45 },
  { max: 1000, key: 'COOL', word: 'קריר', t: 0.28 },
  { max: Infinity, key: 'COLD', word: 'קר', t: 0.12 },
]
export function heatOf(distM) {
  if (distM == null) return { key: 'NONE', word: '', t: 0 }
  return HEAT.find(h => distM <= h.max)
}

// ── הלוח של הבן שלה ──
// מסע 1: 30 דקות, נימי לבד (הסיפור). מהמסע השני: 45 דקות ושני יצורים
// בדרך. מהמסע השלישי: מטבעות פותחים שלישי. ארבעה מסלולים בשבוע.
export const WALK_PLAN = {
  firstM: 2200,       // ~30 דקות
  laterM: 3200,       // ~45 דקות
  extraCost: 60,      // מטבעות ליצור נוסף
  extraFromWalk: 2,   // אינדקס 0 = המסע הראשון; מהשלישי (2) אפשר לשלם
}

export function loopTargetM(walks) {
  return walks === 0 ? WALK_PLAN.firstM : WALK_PLAN.laterM
}
// כמה זמן מתוכנן למסע, לטיימר שהיא ביקשה: 30 דקות בראשון, 45 אחר כך.
export function plannedMs(walks) {
  return (walks === 0 ? 30 : 45) * 60 * 1000
}

// ── בונוס תפיסה ──
// "הם רוצים לראות אחרי התפיסה את המטבעות עולות ברצף." תפיסה שווה מטבעות,
// והמונה מטפס אחד-אחד עם גלינג לכל אחד. חמישה: מספיק כדי לראות ספירה.
export const CATCH_BONUS = 5

export function canBuyExtra(progress) {
  return (progress.walks || 0) >= WALK_PLAN.extraFromWalk && (progress.coins || 0) >= WALK_PLAN.extraCost
}

// מי היום: מתחלפים בין מי שיש לו מודל. השני הוא מי שלא היה ראשון.
// שמונה יצורים. רצפה ואוויר לסירוגין כל עוד יש מעופפים, כדי שכל מסע
// ירגיש אחרת: עקבות, ואז להרים את הראש, ואז שוב עקבות. בולדר הבנאי
// לפני קראג — הרמז של מסע 1 ("מישהו כאן ידע לבנות") מוביל אליו.
// נוגה, התשיעית, בסוף — כדי ששמונת המסעות הראשונים לא ישתנו למי שכבר בדרך.
export const AVAILABLE = ['nimi', 'dabashon', 'lumi', 'ruchi', 'gali', 'tzel', 'bolder', 'kraag', 'noga']
// "אולי צריך 2 דמויות מינימום." מסע 1 הוא הסיפור של נימי, לבד. מהמסע
// השני — שניים בדרך תמיד: הראשון לפי הסבב, השני מהצד השני של הרשימה
// (כך שכמעט תמיד אחד על הרצפה ואחד באוויר). המטבעות פותחים שלישי.
export const BASE_FROM_WALK = 1
// count: כמה יצורים לפי תוכנית המסע (engine/plan.js); בלי — לפי הלוח.
export function creaturesForWalk(walks, extra, available = AVAILABLE, count = null) {
  const n = available.length
  const first = available[walks % n]
  const want = count ?? (walks < BASE_FROM_WALK ? 1 : 2)
  if (n < 2 || walks < BASE_FROM_WALK) return [first]
  const second = available[(walks + Math.floor(n / 2)) % n]
  // מסלול קצר (יצור אחד בתוכנית): מי ששילם על נוסף מקבל שני
  if (want < 2) return extra ? [first, second] : [first]
  const out = [first, second]
  if (extra) {
    const third = available.find((c, i) => i === (walks + Math.floor(n / 4)) % n && !out.includes(c)) || available.find(c => !out.includes(c))
    if (third) out.push(third)
  }
  return out
}

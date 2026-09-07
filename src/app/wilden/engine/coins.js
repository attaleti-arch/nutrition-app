// ─── מטבעות ───
// הרעיון של הבן שלה: מטבעות לאורך השביל, גלינג כל כמה מטרים, וקנייה בסוף.
// זה מה שכל משחק ריצה עושה, ומה שחסר לנו: פידבק כל 20 מטר ולא כל 20 דקות.
//
// טהור. המטבעות מונחים על המסלול ברגע שהוא נבנה, ונאספים כשהילד עובר
// דרכם. מטבע זהב אחד לכל מסלול, שווה עשרה, בסמטה צדדית של המסלול.

import { pointAlong, pathLength, haversine } from './geo.js'

export const COIN_EVERY_M = 35
export const COIN_START_M = 40          // לא בסלון
export const COIN_END_M = 40
export const COLLECT_RADIUS_M = 14      // GPS של טלפון: 5–10 מ' — צריך מרווח
export const STOP_CLEAR_M = 30          // בלי מטבעות על התחנה עצמה
export const GOLD_VALUE = 10

export function placeCoins(path, { stops = [], every = COIN_EVERY_M, rng = Math.random } = {}) {
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
  // מטבע זהב: איפשהו בין 40% ל-75% מהדרך, לא על מטבע רגיל
  if (coins.length > 6) {
    const k = Math.floor(coins.length * (0.4 + rng() * 0.35))
    coins[k] = { ...coins[k], id: 'gold', value: GOLD_VALUE, gold: true }
  }
  return coins
}

// מחזירה את המטבעות המעודכנים ואת מה שנאסף עכשיו. לא משנה את הקלט.
export function collectCoins(coins, pos, radius = COLLECT_RADIUS_M) {
  if (!coins?.length || !pos) return { coins, got: [] }
  const got = []
  const next = coins.map(c => {
    if (c.taken) return c
    if (haversine(c, pos) <= radius) { got.push(c); return { ...c, taken: true } }
    return c
  })
  return got.length ? { coins: next, got } : { coins, got }
}

export const coinsValue = list => (list || []).reduce((s, c) => s + (c.value || 0), 0)

// ── הלוח של הבן שלה ──
// מסע 1: 30 דקות, יצור אחד. מסע 2: 45 דקות, יצור אחד (אחר). מהמסע השלישי:
// 45 דקות, ומטבעות פותחים יצור שני. ארבעה מסלולים בשבוע.
export const WALK_PLAN = {
  firstM: 2200,       // ~30 דקות
  laterM: 3200,       // ~45 דקות
  extraCost: 60,      // מטבעות ליצור שני
  extraFromWalk: 2,   // אינדקס 0 = המסע הראשון; מהשלישי (2) אפשר לשלם
}

export function loopTargetM(walks) {
  return walks === 0 ? WALK_PLAN.firstM : WALK_PLAN.laterM
}

export function canBuyExtra(progress) {
  return (progress.walks || 0) >= WALK_PLAN.extraFromWalk && (progress.coins || 0) >= WALK_PLAN.extraCost
}

// מי היום: מתחלפים בין מי שיש לו מודל. השני הוא מי שלא היה ראשון.
export function creaturesForWalk(walks, extra, available = ['nimi', 'dabashon']) {
  const first = available[walks % available.length]
  if (!extra) return [first]
  const second = available.find(c => c !== first) || first
  return [first, second]
}

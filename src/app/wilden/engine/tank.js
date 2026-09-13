// ─── מה שבתוך השואב, וביצת הלב ───
// "יודע שאני לא אוהבת את הכלוב הזה." צודקת — המשחק הזה מרפא עולם, הוא
// לא כולא. אז אין כלוב: גובטבו שנשאב נשאר בתוך הכלי שקנו, במיכל הזכוכית
// שכבר מצויר בו, ורואים אותו מסתחרר שם.
//
// "מה הופך אותם לטובי לב?" — ההליכה. לא לחיצה, ולא חמישה שנכנסו:
//   חמישה במיכל   →  ביצת הלב מופיעה עליו, קרה.
//   מסע שלם איתה  →  היא בוקעת, וחמישה יוצאים טובי לב.
// זה אותו חוק בדיוק כמו הביצה הרגילה (egg.js, HATCH_M) — ילד כבר מכיר
// אותו: מה שמחמם ביצה זה ללכת. וכאן זה גם המשפט של הפיצ'ר: רוח לא
// מתרככת כי לחצת עליה, אלא כי נשאת אותה מספיק רחוק.
//
// טהור: progress נכנס, מספרים יוצאים. בלי React, בלי זמן.

import { HATCH_M } from './egg.js'

export const TANK_MAX = 5           // כמה נכנסים למיכל
export const TAME_COINS = 25        // מה שמקבלים כשהם מתרככים
export const SCARE_COINS = 5        // כשהטוב מבריח את הפרא במסלול
export const TAMED_WIND_MAX = 3     // גג רוח בכל מסע מהם, שלא יברח מהאיזון
export const HEART_EGG_NAME = 'ביצת הלב'
export const TAMED_NAME = 'גובטבו טוב לב'
export { HATCH_M }

// ── מה יש במיכל ──
// inTank הוא כמה גובטבו נשאבו ועוד לא רוככו. הוא יכול לעבור חמישה
// (שאבתם שישה במסע אחד) — מה שמעבר מחכה לביצה הבאה.
export const inTank = p => Math.max(0, p?.inTank || 0)
export const tankShown = p => Math.min(TANK_MAX, inTank(p))
export const tankFull = p => inTank(p) >= TANK_MAX
export const tankLeft = p => Math.max(0, TANK_MAX - inTank(p))
export const hasHeartEgg = p => !!p?.heartEgg
export const tamedCount = p => Math.max(0, p?.tamed || 0)

// ── הביצה נוצרת ──
// כשהחמישי נכנס. פעם אחת: אין שתי ביצות במקביל.
export function toTank(progress, n = 0) {
  const total = inTank(progress) + Math.max(0, n)
  const heartEgg = progress?.heartEgg || (total >= TANK_MAX ? { at: null } : null)
  return { inTank: total, heartEgg }
}

// ── והיא בוקעת ──
// רק אחרי מסע שלם איתה. אין כאן מטבעות לשלם: את המחיר שילמו בשואב,
// בחמש שאיבות ובקילומטרים.
export const heartWarm = walked => Math.max(0, Math.min(1, (walked || 0) / HATCH_M))
export const heartReady = (progress, walked) => hasHeartEgg(progress) && tankFull(progress) && (walked || 0) >= HATCH_M

export function hatchHeart(progress) {
  if (!hasHeartEgg(progress) || !tankFull(progress)) return progress
  return {
    ...progress,
    inTank: inTank(progress) - TANK_MAX,
    tamed: tamedCount(progress) + TANK_MAX,
    heartEgg: null,
    coins: (progress.coins || 0) + TAME_COINS,
  }
}

// ── מה הם עושים ──
// 1. בבית: כל חמישה טובי לב מביאים רוח אחת בכל מסע, כמו מבנה.
export const tamedWind = p => Math.min(TAMED_WIND_MAX, Math.floor(tamedCount(p) / TANK_MAX))
// 2. בחוץ: אחד מהם יוצא איתך, ומבריח את הפרא הראשון שקופץ. פעם אחת
//    בכל מסע — אחרת הרוחות מפסיקות להיות איום, והשואב שוב מיותר.
export const hasTamedGuard = p => tamedCount(p) >= TANK_MAX
export const tamedReady = (progress, run) => hasTamedGuard(progress) && !run?.tamedUsed

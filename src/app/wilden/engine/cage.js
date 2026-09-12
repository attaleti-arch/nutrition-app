// ─── כלוב הרוחות, וביצת הלב ───
// "ולדעתי צריך כלוב של 5 גוסטבו בעולם, ואז ביצה או חפץ שהופך אותם טובי
// לב."
//
// זה סוגר את הלולאה של הרוח, ולא רק מוסיף לה עוד קומה:
//   שואבים גובטבו בחוץ  →  הוא נכנס לכלוב בבית (חמישה, לא יותר)
//   הכלוב מלא           →  ביצת הלב מופיעה עליו. לוחצים, והיא בוקעת
//   חמישה טובי לב       →  והם כבר לא אויב: אחד מהם יוצא איתך למסלול
//                           ומבריח את הפרא הראשון, וכולם יחד מביאים רוח
//                           בכל מסע, כמו מבנה.
//
// כלומר השואב אינו כלי הגנה בלבד — הוא הדרך היחידה להפוך את מה ששבר את
// העולם למשהו ששייך אליו. וזה גם מה שילד זוכר: לא ניצחת את גובטבו,
// ריככת אותו.
//
// טהור: progress נכנס, מספרים יוצאים. בלי React, בלי זמן.

export const CAGE_MAX = 5           // כמה נכנסים לכלוב אחד
export const TAME_COINS = 25        // מה שמקבלים כשהם מתרככים
export const SCARE_COINS = 5        // כשהטוב מבריח את הפרא במסלול
export const TAMED_WIND_MAX = 3     // גג רוח בכל מסע מהכלוב, שלא יברח מהאיזון
export const CAGE_NAME = 'כלוב הרוחות'
export const HEART_EGG_NAME = 'ביצת הלב'
export const TAMED_NAME = 'גובטבו טוב לב'

// ── מה עומד בכלוב ──
// caged הוא כמה גובטבו נשאבו והובאו הביתה ועוד לא רוככו. הוא יכול לעבור
// חמישה (שאבתם שישה במסע אחד) — מה שמעבר מחכה בתור לביצה הבאה.
export const cagedTotal = p => Math.max(0, p?.caged || 0)
export const cagedShown = p => Math.min(CAGE_MAX, cagedTotal(p))
export const cageFull = p => cagedTotal(p) >= CAGE_MAX
export const cageLeft = p => Math.max(0, CAGE_MAX - cagedTotal(p))
export const tamedCount = p => Math.max(0, p?.tamed || 0)

// ── הביצה בוקעת ──
// חמישה יוצאים מהכלוב טובי לב. אין כאן מטבעות לשלם: את המחיר כבר
// שילמו בשואב ובחמש שאיבות, וילד לא צריך לשלם פעמיים על אותו רגע.
export function tameWinds(progress) {
  if (!cageFull(progress)) return progress
  return {
    ...progress,
    caged: cagedTotal(progress) - CAGE_MAX,
    tamed: tamedCount(progress) + CAGE_MAX,
    coins: (progress.coins || 0) + TAME_COINS,
  }
}

// ── מה הם עושים ──
// 1. בבית: כל חמישה טובי לב מביאים רוח אחת בכל מסע, כמו מבנה.
export const tamedWind = p => Math.min(TAMED_WIND_MAX, Math.floor(tamedCount(p) / CAGE_MAX))
// 2. בחוץ: אחד מהם יוצא איתך, ומבריח את הפרא הראשון שקופץ. פעם אחת
//    בכל מסע — אחרת הרוחות מפסיקות להיות איום, והשואב שוב מיותר.
export const hasTamedGuard = p => tamedCount(p) >= CAGE_MAX
export const tamedReady = (progress, run) => hasTamedGuard(progress) && !run?.tamedUsed

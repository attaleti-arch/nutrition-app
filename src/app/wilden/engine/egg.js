// ─── הביצה ───
// "יאללה ביצה זה קליל." קונים ביצה במטבעות, היא נוסעת על הביקון, ההליכה
// מחממת אותה, ובפורטל היא בוקעת: יצור שכבר נתפס, בצבע נדיר. הילד לא יודע
// מראש מי ובאיזה צבע — זה מה שמחזיק.
//
// טהור. ההגרלה מקבלת rng כדי שהבדיקות יהיו דטרמיניסטיות.
//
// הווריאנט הוא צבע וזוהר על אותו מודל — לא מודל חדש. model-viewer נותן
// גישה לחומרים אחרי הטעינה: מכפיל צבע על הטקסטורה (tint) וזוהר (glow).
// אפס בייטים נוספים, וזה נראה כמו יצור אחר.

export const EGG_PRICE = 40
export const HATCH_M = 1500        // כמה הליכה מחממת ביצה. ~20 דקות.

export const VARIANTS = [
  { id: 'gold', name: 'זהוב', p: 0.70, tint: [1.35, 1.12, 0.55], glow: [0.35, 0.22, 0.02] },
  { id: 'night', name: 'לילה', p: 0.25, tint: [0.32, 0.34, 0.8], glow: [0.02, 0.03, 0.22] },
  { id: 'ice', name: 'קרח', p: 0.05, tint: [0.8, 1.05, 1.3], glow: [0.15, 0.3, 0.4] },
]
export const variantById = id => VARIANTS.find(v => v.id === id) || null

export function rollVariant(rng = Math.random) {
  let r = rng()
  for (const v of VARIANTS) { if (r < v.p) return v; r -= v.p }
  return VARIANTS[0]
}

// ── מתי אפשר לקנות ──
// יש מטבעות, יש לפחות יצור אחד (הביצה בוקעת רק למי שכבר נתפס), ואין
// כבר ביצה. אחת בכל פעם.
export function canBuyEgg(progress) {
  return !progress.egg
    && (progress.coins || 0) >= EGG_PRICE
    && (progress.creatures || []).length > 0
}

export function eggWarmth(walked) {
  return Math.max(0, Math.min(1, (walked || 0) / HATCH_M))
}

export const WARMTH_WORDS = [
  { min: 1, word: 'מוכנה לבקוע!' },
  { min: 0.7, word: 'חמה' },
  { min: 0.35, word: 'מתחממת' },
  { min: 0, word: 'קרה' },
]
export const warmthWord = t => WARMTH_WORDS.find(w => t >= w.min).word

// ── הבקיעה ──
// יצור מתוך אלה שנתפסו. מעדיפים מי שעוד אין לו את הצבע הזה, כדי שביצה
// שנייה לא תיתן שוב "נימי זהוב". אם לכולם יש הכול — מה שיוצא.
export function hatch(progress, rng = Math.random) {
  const owned = progress.creatures || []
  if (!owned.length) return null
  const variant = rollVariant(rng)
  const have = new Set((progress.variants || []).map(v => `${v.creature}:${v.variant}`))
  const fresh = owned.filter(c => !have.has(`${c}:${variant.id}`))
  const pool = fresh.length ? fresh : owned
  const creature = pool[Math.floor(rng() * pool.length) % pool.length]
  return { creature, variant: variant.id }
}

export const hasVariant = (progress, creature, variant) =>
  (progress.variants || []).some(v => v.creature === creature && v.variant === variant)

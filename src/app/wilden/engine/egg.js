// ─── הביצה ───
// "יאללה ביצה זה קליל." קונים ביצה במטבעות, היא נוסעת על הביקון, ההליכה
// מחממת אותה, ובפורטל היא בוקעת: יצור שכבר נתפס, בצבע נדיר. הילד לא יודע
// מראש מי ובאיזה צבע — זה מה שמחזיק.
//
// טהור. ההגרלה מקבלת rng כדי שהבדיקות יהיו דטרמיניסטיות.
//
// צבע שגם נמכר בחנות נושא את אותו מזהה ואת אותו שם — אותו יער, בין אם
// בקע ובין אם נקנה (ראה engine/skins.js, ו-stages.canWear).
//
// הווריאנט הוא צבע וזוהר על אותו מודל — לא מודל חדש. model-viewer נותן
// גישה לחומרים אחרי הטעינה: מכפיל צבע על הטקסטורה (tint) וזוהר (glow).
// אפס בייטים נוספים, וזה נראה כמו יצור אחר.

export const EGG_PRICE = 40
export const HATCH_M = 1500        // כמה הליכה מחממת ביצה. ~20 דקות.

// זוהר: הקליפ הראשון של "נימי המפותח" (זנב פלאף, סימנים בטורקיז) — יפה מדי
// בשביל לזרוק. ליצור שיש לו קליפ לצבע (creature.variants[id]) הצבע הוא
// דמות שלמה; לשאר — גוון על המודל, כמו קודם.
// "יש ביצים שיכולים לצבוע דמויות לזהב, יער וכו׳." שבעה צבעים, ולא
// ארבעה: יער, שקיעה וכסף הצטרפו. שלושתם קיימים גם בחנות — שם בוחרים
// בדיוק מה ולמי ומשלמים, וכאן זה מה שיצא מהליכה של עשרים דקות.
export const VARIANTS = [
  { id: 'gold', name: 'זהוב', nameF: 'זהובה', p: 0.24, tint: [1.35, 1.12, 0.55], glow: [0.35, 0.22, 0.02] },
  { id: 'forest', name: 'יער', nameF: 'יער', p: 0.20, tint: [0.62, 1.15, 0.6], glow: [0.05, 0.22, 0.05] },
  { id: 'night', name: 'לילה', nameF: 'לילה', p: 0.15, tint: [0.32, 0.34, 0.8], glow: [0.02, 0.03, 0.22] },
  { id: 'sunset', name: 'שקיעה', nameF: 'שקיעה', p: 0.13, tint: [1.3, 0.7, 0.85], glow: [0.3, 0.05, 0.15] },
  { id: 'silver', name: 'כסף', nameF: 'כסף', p: 0.11, tint: [1.1, 1.12, 1.2], glow: [0.18, 0.2, 0.24] },
  { id: 'glow', name: 'זוהר', nameF: 'זוהרת', p: 0.10, tint: [0.7, 1.2, 1.1], glow: [0.05, 0.3, 0.25] },
  { id: 'ice', name: 'קרח', nameF: 'קרח', p: 0.07, tint: [0.8, 1.05, 1.3], glow: [0.15, 0.3, 0.4] },
]
export const variantById = id => VARIANTS.find(v => v.id === id) || null
// "גלי זהובה", לא "גלי זהוב": השם לפי המין של היצור.
export const variantName = (id, creature) => { const v = variantById(id); return v ? (creature?.gender === 'f' ? v.nameF : v.name) : '' }

// ── הצבע על הדמות החיה ──
// "הצבעים בדמו מושלמים." ליצור בלי קליפ לצבע: גוון על הקליפ הרגיל
// (פילטר צבע — מטריצה, זול), והילה בצבע מאחוריו. הערכים מהדמו שאישרה.
export const TINT = {
  gold: { filter: 'sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.08)', aura: 'rgba(255,214,110,.6)' },
  night: { filter: 'hue-rotate(195deg) saturate(1.3) brightness(.78) contrast(1.1)', aura: 'rgba(90,110,255,.55)' },
  ice: { filter: 'hue-rotate(150deg) saturate(.7) brightness(1.3)', aura: 'rgba(150,230,255,.6)' },
  glow: { filter: 'hue-rotate(40deg) saturate(1.5) brightness(1.12)', aura: 'rgba(110,230,200,.6)' },
}
export const tintOf = id => TINT[id] || null

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

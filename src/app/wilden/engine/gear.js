// ─── ציוד למרדף ───
// "החנות לא אטרקטיבית. הייתי שמחה למשהו שמקל על המרדף." אז לא רק כובעים:
// כלים שמשנים את המשחק. שלושה קבועים (קונים פעם אחת, לתמיד) ושלושה
// חד-פעמיים (נשרפים במסע הבא — הסיבה לחזור לחנות).
//
// טהור. progress.gear — מה שנקנה לתמיד; progress.items — { id: כמה }.
// modsFor(progress) — מה פעיל במסע הבא; consume(progress) — שורף את
// החד-פעמיים ביציאה. ההשפעה עצמה: chase.js (startM / stepM / flees),
// המכונה (coinRadius / extraGold), המסך (reveal).

export const GEAR = [
  { id: 'lantern', kind: 'gear', name: 'פנס', price: 40, effect: 'startM', value: 6,
    desc: 'היצור מתחיל קרוב יותר — 6 מטר במקום 9.', how: 'פחות ריצה עד שהוא בורח.' },
  { id: 'binoculars', kind: 'gear', name: 'משקפת', price: 35, effect: 'reveal', value: 0.45,
    desc: 'רואים את היצור על המפה ממרחק כפול.', how: 'הסימן נדלק כבר ב"פושר".' },
  { id: 'boots', kind: 'gear', name: 'נעלי ריצה', price: 60, effect: 'stepM', value: 1.0,
    desc: 'כל צעד במרדף שווה יותר.', how: 'מגיעים אליו ב-30% פחות צעדים.' },
  { id: 'honey', kind: 'item', name: 'פיתיון דבש', price: 15, effect: 'flees', value: 1,
    desc: 'במסע הבא כל יצור בורח רק פעם אחת.', how: 'חד-פעמי. נשרף ביציאה.' },
  { id: 'magnet', kind: 'item', name: 'מגנט מטבעות', price: 20, effect: 'coinRadius', value: 28,
    desc: 'במסע הבא המטבעות נמשכים אליכם מרחוק.', how: 'חד-פעמי. פי שניים רדיוס איסוף.' },
  { id: 'map', kind: 'item', name: 'מפת אוצר', price: 25, effect: 'extraGold', value: 1,
    desc: 'במסע הבא — מטבע זהב נוסף על המסלול.', how: 'חד-פעמי. עוד קפיצה, עוד 10.' },
]
export const gearById = id => GEAR.find(g => g.id === id) || null
export const MAX_ITEMS = 3

export const ownsGear = (progress, id) => (progress?.gear || []).includes(id)
export const itemCount = (progress, id) => progress?.items?.[id] || 0

export function canBuyGear(progress, id) {
  const g = gearById(id)
  if (!g) return false
  if ((progress?.coins || 0) < g.price) return false
  if (g.kind === 'gear') return !ownsGear(progress, id)
  return itemCount(progress, id) < MAX_ITEMS
}

export function buyGear(progress, id) {
  if (!canBuyGear(progress, id)) return progress
  const g = gearById(id)
  const coins = (progress.coins || 0) - g.price
  if (g.kind === 'gear') return { ...progress, coins, gear: [...(progress.gear || []), id] }
  return { ...progress, coins, items: { ...(progress.items || {}), [id]: itemCount(progress, id) + 1 } }
}

// מה פעיל במסע הבא: הקבועים תמיד, החד-פעמיים אם יש במלאי.
export function modsFor(progress) {
  const mods = {}
  for (const g of GEAR) {
    const on = g.kind === 'gear' ? ownsGear(progress, g.id) : itemCount(progress, g.id) > 0
    if (on) mods[g.effect] = g.value
  }
  return mods
}
// מה נשרף ביציאה למסע: חד-פעמי אחד מכל סוג שיש.
export function consume(progress) {
  const items = { ...(progress?.items || {}) }
  const used = []
  for (const g of GEAR) {
    if (g.kind === 'item' && items[g.id] > 0) { items[g.id] -= 1; used.push(g.id); if (!items[g.id]) delete items[g.id] }
  }
  return used.length ? { progress: { ...progress, items }, used } : { progress, used }
}
// למסך הבית: מה מחכה למסע הבא
export const armed = progress => GEAR.filter(g => g.kind === 'item' && itemCount(progress, g.id) > 0).map(g => ({ ...g, n: itemCount(progress, g.id) }))

export function mergeGear(base, other) {
  const gear = [...new Set([...(base?.gear || []), ...(other?.gear || [])])]
  const items = { ...(other?.items || {}) }
  for (const [k, v] of Object.entries(base?.items || {})) items[k] = Math.max(v || 0, items[k] || 0)
  return { gear, items }
}

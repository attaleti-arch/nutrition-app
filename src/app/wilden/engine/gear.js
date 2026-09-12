// ─── ציוד ───
// "אצלנו התפיסה ודאית, אז כלי שמקל לא חוסך כלום, וכלי שמקצר עובד נגד
// המטרה." לכן הכלים נותנים *יותר*, לא *קל יותר*:
//   מפתחות — פותחים יצור שבלעדיהם לא תופסים: פנס לצל (רחוב חשוך), משקפת
//             לרוחי (גבוה מדי), מכוש לקראג (קליפת אבן). קונים פעם אחת.
//   משרוקית — יצור נוסף על המסלול במסע הבא. עוד תחנה, עוד מרדף, עוד הליכה.
//   משרוקית זהב — היצור הבא שנתפס מגיע בצבע מיוחד, בלי ביצה.
//   מגנט, מפת אוצר — יותר מטבעות, לא פחות דרך.
//   שואב הרוח — הרוחות שעל המסלול נשאבות במקום לחטוף את היצור.
// חד-פעמי אפשר לקנות גם בדבש (הכוורת מייצרת) — הלולאה של הבן שלה.
//
// טהור. progress.gear — קבוע; progress.items — { id: כמה }.

import { tr } from '../i18n/index.js'

export const GEAR = [
  { id: 'lantern', kind: 'key', name: 'פנס', price: 40, effect: 'lantern', value: true, opens: 'tzel',
    desc: 'פותח את צל: בלי אור הוא רק צל. ומאיר את הרחוב בערב.', how: 'מפתח. פעם אחת, לתמיד.', lock: 'צל מחכה ברחוב החשוך. צריך פנס' },
  { id: 'binoculars', kind: 'key', name: 'משקפת', price: 35, effect: 'reveal', value: 0.45, opens: 'ruchi',
    desc: 'פותחת את רוחי: הוא גבוה מדי בלעדיה. וכל יצור נראה על המפה ממרחק כפול.', how: 'מפתח. פעם אחת, לתמיד.', lock: 'רוחי גבוה מדי. צריך משקפת' },
  { id: 'pickaxe', kind: 'key', name: 'מכוש', price: 45, effect: 'pickaxe', value: true, opens: 'kraag',
    desc: 'פותח את קראג: קליפת אבן, והמכוש שובר אותה.', how: 'מפתח. פעם אחת, לתמיד.', lock: 'קראג בקליפת אבן. צריך מכוש' },
  { id: 'whistle', kind: 'item', name: 'משרוקית', price: 30, honey: 3, effect: 'extraStop', value: 1,
    desc: 'במסע הבא יצור נוסף בדרך. עוד תחנה, עוד מרדף.', how: 'חד-פעמי. 30 מטבעות או 3 דבש.' },
  { id: 'goldWhistle', kind: 'item', name: 'משרוקית זהב', price: 60, honey: 6, effect: 'colorNext', value: 1,
    desc: 'היצור הבא שתתפסו יגיע בצבע מיוחד, בלי ביצה.', how: 'חד-פעמי. 60 מטבעות או 6 דבש.' },
  { id: 'magnet', kind: 'item', name: 'מגנט מטבעות', price: 20, effect: 'coinRadius', value: 28,
    desc: 'במסע הבא המטבעות נמשכים אליכם מרחוק.', how: 'חד-פעמי. פי שניים רדיוס איסוף.' },
  { id: 'map', kind: 'item', name: 'מפת אוצר', price: 25, effect: 'extraGold', value: 1,
    desc: 'במסע הבא — מטבע זהב נוסף על המסלול.', how: 'חד-פעמי. עוד קפיצה, עוד 10.' },
  // הרעיון של הבן שלה: הרוחות שברו את העולם, והן עוד בחוץ. בלי שואב הן
  // חוטפות את היצור וגוררות אותו קדימה; איתו — הן נכנסות פנימה.
  { id: 'vacuum', kind: 'tool', name: 'שואב הרוח', price: 55, effect: 'vacuum', value: true,
    desc: 'שואב רוחות מהמסלול. בלעדיו הרוח חוטפת את היצור וגוררת אותו קדימה.',
    how: 'כלי. פעם אחת, לתמיד.' },
]
export const gearById = id => GEAR.find(g => g.id === id) || null
export const MAX_ITEMS = 3
// איזה מפתח פותח איזה יצור
export const KEYS = Object.fromEntries(GEAR.filter(g => g.kind === 'key').map(g => [g.opens, g.id]))

export const ownsGear = (progress, id) => (progress?.gear || []).includes(id)
export const itemCount = (progress, id) => progress?.items?.[id] || 0
export const keyFor = creatureId => KEYS[creatureId] || null
// למסך הבית: "צל מחכה ברחוב החשוך. צריך פנס (40)"
export const lockLine = creatureId => { const g = gearById(KEYS[creatureId]); return g ? `${tr(g.lock)} (${g.price})` : '' }
export const unlocked = (progress, creatureId) => !KEYS[creatureId] || ownsGear(progress, KEYS[creatureId])

// pay: 'coins' | 'honey' — חד-פעמי אפשר לקנות בדבש (ראה honey בפריט)
export function canBuyGear(progress, id, pay = 'coins') {
  const g = gearById(id)
  if (!g) return false
  if (pay === 'honey') {
    if (!g.honey || (progress?.res?.honey || 0) < g.honey) return false
  } else if ((progress?.coins || 0) < g.price) return false
  if (g.kind !== 'item') return !ownsGear(progress, id)
  return itemCount(progress, id) < MAX_ITEMS
}

export function buyGear(progress, id, pay = 'coins') {
  if (!canBuyGear(progress, id, pay)) return progress
  const g = gearById(id)
  const paid = pay === 'honey'
    ? { ...progress, res: { ...(progress.res || {}), honey: (progress.res?.honey || 0) - g.honey } }
    : { ...progress, coins: (progress.coins || 0) - g.price }
  if (g.kind !== 'item') return { ...paid, gear: [...(progress.gear || []), id] }
  return { ...paid, items: { ...(progress.items || {}), [id]: itemCount(progress, id) + 1 } }
}

// מה פעיל במסע הבא: הקבועים תמיד, החד-פעמיים אם יש במלאי.
export function modsFor(progress) {
  const mods = {}
  for (const g of GEAR) {
    const on = g.kind !== 'item' ? ownsGear(progress, g.id) : itemCount(progress, g.id) > 0
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

// ── מפתחות בלוח ──
// יצור נעול (אין את המפתח שלו) מוחלף ביצור הפנוי הבא ברשימה. מחזיר גם מי
// ננעל, כדי שהבית יגיד "צל מחכה ברחוב החשוך. צריך פנס."
export function withKeys(list, progress, available) {
  const out = []
  const locked = []
  for (const id of list) {
    if (unlocked(progress, id)) { if (!out.includes(id)) out.push(id); continue }
    locked.push(id)
    const sub = available.find(c => unlocked(progress, c) && !out.includes(c) && !list.includes(c))
      || available.find(c => unlocked(progress, c) && !out.includes(c))
    if (sub) out.push(sub)
  }
  return { creatures: out.length ? out : [available.find(c => unlocked(progress, c)) || list[0]], locked }
}
// משרוקית: עוד יצור, הבא ברשימה שלא בדרך היום.
export function withExtra(list, progress, available, walks = 0) {
  const n = available.length
  for (let i = 0; i < n; i++) {
    const c = available[(walks + 2 + i) % n]
    if (!list.includes(c) && unlocked(progress, c)) return [...list, c]
  }
  return list
}

export function mergeGear(base, other) {
  const gear = [...new Set([...(base?.gear || []), ...(other?.gear || [])])]
  const items = { ...(other?.items || {}) }
  for (const [k, v] of Object.entries(base?.items || {})) items[k] = Math.max(v || 0, items[k] || 0)
  return { gear, items }
}

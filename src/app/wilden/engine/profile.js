// ─── מי משחק ───
// טהור. הילד בוחר שם ומקבל קוד קצר. הקוד הוא כל מה שצריך כדי לחזור
// לעולם שלו — בטלפון אחר, בדפדפן אחר, או אחרי שספארי מחק אחסון מקומי
// (הוא עושה את זה אחרי שבוע בלי כניסה).
//
// בלי זה קרה בדיוק מה שהיא ראתה: כל דפדפן הוא עולם חדש, walks חוזר
// לאפס, והמשחק שולח שוב ושוב לתפוס את נימי.

import { mergeWear } from './shop.js'
import { mergeGear } from './gear.js'
import { mergeSkins } from './skins.js'

// בלי 0/O/1/I/L — הורה מכתיב את הקוד בטלפון ואסור שיהיה ספק
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LEN = 5

export function makeCode(n = CODE_LEN, rng) {
  let out = ''
  let a
  if (rng) a = Array.from({ length: n }, () => Math.floor(rng() * 1e9))
  else if (typeof crypto !== 'undefined' && crypto.getRandomValues) a = crypto.getRandomValues(new Uint32Array(n))
  else a = Array.from({ length: n }, () => Math.floor(Math.random() * 1e9))
  for (let i = 0; i < n; i++) out += ALPHABET[a[i] % ALPHABET.length]
  return out
}

export const normCode = c => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN)
export const validCode = c => normCode(c).length === CODE_LEN

export function newProfile({ name, code, rng } = {}) {
  return {
    code: normCode(code) || makeCode(CODE_LEN, rng),
    name: (name || '').trim().slice(0, 20) || 'שחקן',
    created: new Date().toISOString(),
  }
}

// ── מיזוג שני עולמות ──
// הטלפון והשרת יכולים להחזיק גרסאות שונות של אותו ילד: הוא שיחק בטלפון
// של אמא ואז נכנס בטאבלט. הכלל: מי שהלך יותר הוא הבסיס (ואם שווה — מי
// שיש לו יותר מטבעות). היצורים הם איחוד — יצור שנתפס לא נעלם. משאבים
// לפי המקסימום לכל סוג. ככה אף פעם לא "נמחק לי".
export function richer(a, b) {
  if (!a) return b
  if (!b) return a
  const wa = a.walks || 0, wb = b.walks || 0
  if (wa !== wb) return wa > wb ? a : b
  const ca = a.coins || 0, cb = b.coins || 0
  if (ca !== cb) return ca > cb ? a : b
  return (a.missionsCompleted || 0) >= (b.missionsCompleted || 0) ? a : b
}

function mergeMax(a, b) {
  const out = { ...(b || {}) }
  for (const [k, v] of Object.entries(a || {})) out[k] = Math.max(v || 0, out[k] || 0)
  return out
}

export function mergeProgress(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const base = richer(local, remote)
  const other = base === local ? remote : local
  const creatures = [...(base.creatures || [])]
  for (const id of other.creatures || []) if (!creatures.includes(id)) creatures.push(id)
  const res = { ...(other.res || {}) }
  for (const [k, v] of Object.entries(base.res || {})) res[k] = Math.max(v || 0, res[k] || 0)
  // מה שבקע — איחוד. "נימי זהוב" לא נעלם כי שיחקו בטלפון אחר.
  const variants = [...(base.variants || [])]
  for (const v of other.variants || []) {
    if (!variants.some(x => x.creature === v.creature && x.variant === v.variant)) variants.push(v)
  }
  return {
    ...other,
    ...base,
    creatures,
    res,
    variants,
    // מה שנבנה בעולם — איחוד. בקשה שנסגרה נסגרה.
    quests: [...new Set([...(base.quests || []), ...(other.quests || [])])],
    // מונים להישגים: המקסימום מכל צד, ימים — איחוד. תג שהושג לא נעלם.
    catches: Math.max(base.catches || 0, other.catches || 0),
    caught: mergeMax(base.caught, other.caught),
    golds: Math.max(base.golds || 0, other.golds || 0),
    runs: Math.max(base.runs || 0, other.runs || 0),
    bestRun: Math.max(base.bestRun || 0, other.bestRun || 0),
    bestJumpCm: Math.max(base.bestJumpCm || 0, other.bestJumpCm || 0),
    metersTotal: Math.max(base.metersTotal || 0, other.metersTotal || 0),
    coinsEarned: Math.max(base.coinsEarned || 0, other.coinsEarned || 0),
    walkDays: [...new Set([...(other.walkDays || []), ...(base.walkDays || [])])].sort().slice(-60),
    egg: base.egg || other.egg || null,
    // החנות: מה שנקנה נקנה; מי לובש מה — של הבסיס, והשאר מהצד השני.
    ...mergeWear(base, other),
    weeklyBonus: [base.weeklyBonus, other.weeklyBonus].filter(Boolean).sort().pop() || null,
    buddy: base.buddy || other.buddy || null,
    routeKm: base.routeKm || other.routeKm || null,
    look: { ...(other.look || {}), ...(base.look || {}) },
    ...mergeGear(base, other),
    ...mergeSkins(base, other),
    bond: mergeMax(base.bond, other.bond),
    taken: base.taken || other.taken || null,
    inTank: Math.max(base.inTank || 0, other.inTank || 0),
    heartEgg: base.heartEgg || other.heartEgg || null,
    tamed: Math.max(base.tamed || 0, other.tamed || 0),
    minutesTotal: Math.max(base.minutesTotal || 0, other.minutesTotal || 0),
    lastWalk: base.lastWalk || other.lastWalk || null,
    story: { ...(other.story || {}), ...(base.story || {}) },
    walks: Math.max(base.walks || 0, other.walks || 0),
    missionsCompleted: Math.max(base.missionsCompleted || 0, other.missionsCompleted || 0),
  }
}

// האם יש בשרת משהו שאין בטלפון — כלומר האם המיזוג ישנה משהו.
export function remoteAdds(local, remote) {
  if (!remote) return false
  if (!local) return true
  return stable(mergeProgress(local, remote)) !== stable(local)
}

// השוואה בלי תלות בסדר המפתחות — המיזוג בונה אובייקט חדש. שדה ריק
// (null, []) ושדה שלא קיים הם אותו דבר: סכימה חדשה לא נחשבת "שינוי".
// גם 0 ו-{}: מונים חדשים להישגים שעוד לא זזו אינם "שינוי מהשרת".
const empty = v => v == null || v === 0 || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
function stable(o) {
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'
  if (o && typeof o === 'object') {
    return '{' + Object.keys(o).sort().filter(k => !empty(o[k])).map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
  }
  return JSON.stringify(o)
}

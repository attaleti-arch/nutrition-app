// ─── מי משחק ───
// טהור. הילד בוחר שם ומקבל קוד קצר. הקוד הוא כל מה שצריך כדי לחזור
// לעולם שלו — בטלפון אחר, בדפדפן אחר, או אחרי שספארי מחק אחסון מקומי
// (הוא עושה את זה אחרי שבוע בלי כניסה).
//
// בלי זה קרה בדיוק מה שהיא ראתה: כל דפדפן הוא עולם חדש, walks חוזר
// לאפס, והמשחק שולח שוב ושוב לתפוס את נימי.

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

export function mergeProgress(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const base = richer(local, remote)
  const other = base === local ? remote : local
  const creatures = [...(base.creatures || [])]
  for (const id of other.creatures || []) if (!creatures.includes(id)) creatures.push(id)
  const res = { ...(other.res || {}) }
  for (const [k, v] of Object.entries(base.res || {})) res[k] = Math.max(v || 0, res[k] || 0)
  return {
    ...other,
    ...base,
    creatures,
    res,
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

// השוואה בלי תלות בסדר המפתחות — המיזוג בונה אובייקט חדש.
function stable(o) {
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'
  if (o && typeof o === 'object') {
    return '{' + Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
  }
  return JSON.stringify(o)
}

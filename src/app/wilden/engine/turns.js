// ─── הוראות פנייה ───
// "שמבינים לאן פונים ולאן הולכים." המסלול הוא רשימת נקודות על רחובות
// אמיתיים; כאן היא הופכת לרשימת פניות: איפה על המסלול, ולאיזה צד.
// טהור, בלי React, כדי שאפשר יהיה לבדוק על מסלול סינתטי.

import { bearing, haversine } from './geo.js'
import { tr } from '../i18n/index.js'

export const TURN_DEG = 35          // פחות מזה — "ישר"
export const SHARP_DEG = 120
const MERGE_M = 15                  // שתי פניות קרובות = פנייה אחת

function delta(a, b) {
  return ((b - a + 540) % 360) - 180
}

// מחזירה [{ along, dir: 'left'|'right'|'uturn', deg }] בסדר עולה.
export function turnsFor(path) {
  if (!path || path.length < 3) return []
  const out = []
  let acc = 0
  for (let i = 1; i < path.length - 1; i++) {
    acc += haversine(path[i - 1], path[i])
    const din = bearing(path[i - 1], path[i])
    const dout = bearing(path[i], path[i + 1])
    const d = delta(din, dout)
    if (Math.abs(d) < TURN_DEG) continue
    const dir = Math.abs(d) >= SHARP_DEG ? 'uturn' : d > 0 ? 'right' : 'left'
    // הרחוב שאליו פונים: שם הקטע שיוצא מהפנייה.
    const street = path[i + 1].street || null
    const last = out[out.length - 1]
    if (last && acc - last.along < MERGE_M) { last.deg += d; last.dir = dirOf(last.deg); last.street = street || last.street; continue }
    out.push({ along: acc, dir, deg: d, street })
  }
  return out
}

function dirOf(deg) {
  return Math.abs(deg) >= SHARP_DEG ? 'uturn' : deg > 0 ? 'right' : 'left'
}

// ההוראה הבאה מהמקום שבו הילד עומד עכשיו. אם היעד לפני הפנייה הבאה —
// ההוראה היא "ישר עד היעד".
export function nextCue(turns, along, targetAlong = Infinity, { lead = 8 } = {}) {
  const t = turns.find(x => x.along > along + lead)
  if (!t || t.along > targetAlong) {
    return { kind: 'target', dist: Math.max(0, targetAlong - along) }
  }
  return { kind: 'turn', dir: t.dir, dist: t.along - along, street: t.street || null }
}

// ── חץ גדול ──
// ילד לא קורא "פנו ימינה" — הוא רואה חץ. ⬆ ישר, ↱ ימינה, ↰ שמאלה, ↩ סיבוב.
export function cueGlyph(cue) {
  if (!cue) return '⬆'
  if (cue.kind === 'target') return cue.dist <= 30 ? '📍' : '⬆'
  return cue.dir === 'right' ? '↱' : cue.dir === 'left' ? '↰' : '↩'
}

// ── טיימר ──
// "טיימר שילך לאחור בטיול." הזמן המתוכנן פחות מה שעבר מרגע שהמסלול נבנה.
export function timeLeftMs(startedAt, plannedMs, now) {
  if (!startedAt || !plannedMs) return null
  return Math.max(0, plannedMs - (now - startedAt))
}
export function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60), r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// ── לא "כאן" כשהוא 200 מ' משם ──
// המרחק לאורך המסלול יכול לשקר: לולאה מתחילה ונגמרת באותה דלת, ומי שעומד
// בבית נמדד לפעמים כאילו הוא בסוף הלולאה — אחרי היעד — ואז "הסימן כאן"
// בזמן שהסימן במרחק שני רחובות. המרחק בקו ישר הוא רצפה: אי אפשר להיות
// קרוב יותר ממנו.
export function floorCue(cue, straightM) {
  if (!cue || straightM == null) return cue
  if (cue.kind !== 'target') return cue
  return straightM > cue.dist ? { ...cue, dist: straightM } : cue
}

// הניסוח עובר דרך tr: בגרמנית סדר המילים אחר ("Jetzt links abbiegen"), אז
// כל משפט הוא תבנית עם משתנים ולא הדבקה של מילים.
export function cueText(cue, targetName = tr('היעד')) {
  const m = Math.round(cue.dist / 10) * 10
  if (cue.kind === 'target') {
    return m <= 30 ? tr('{t} כאן.', { t: targetName }) : tr('ישר {m} מ׳ עד {t}.', { m, t: targetName })
  }
  const word = cue.dir === 'left' ? tr('פנו שמאלה') : cue.dir === 'right' ? tr('פנו ימינה') : tr('הסתובבו')
  const to = cue.street ? tr(' ל{s}', { s: cue.street }) : ''
  return m <= 20 ? tr('{w}{to} עכשיו.', { w: word, to }) : tr('עוד {m} מ׳ {w}{to}.', { m, w: word, to })
}

// ─── הוראות פנייה ───
// "שמבינים לאן פונים ולאן הולכים." המסלול הוא רשימת נקודות על רחובות
// אמיתיים; כאן היא הופכת לרשימת פניות: איפה על המסלול, ולאיזה צד.
// טהור, בלי React, כדי שאפשר יהיה לבדוק על מסלול סינתטי.

import { bearing, haversine } from './geo.js'

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
    const last = out[out.length - 1]
    if (last && acc - last.along < MERGE_M) { last.deg += d; last.dir = dirOf(last.deg); continue }
    out.push({ along: acc, dir, deg: d })
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
  return { kind: 'turn', dir: t.dir, dist: t.along - along }
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

export function cueText(cue, targetName = 'היעד') {
  const m = Math.round(cue.dist / 10) * 10
  if (cue.kind === 'target') {
    return m <= 30 ? `${targetName} כאן.` : `ישר ${m} מ׳ עד ${targetName}.`
  }
  const word = cue.dir === 'left' ? 'פנו שמאלה' : cue.dir === 'right' ? 'פנו ימינה' : 'הסתובבו'
  return m <= 20 ? `${word} עכשיו.` : `עוד ${m} מ׳ ${word}.`
}

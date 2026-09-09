// ─── רצף הליכה ו"דחף" ───
// "היעדר תגמול מיידי על צעדים." פס קטן מעל המפה שמתמלא כשהולכים בלי
// לעצור. ארבע דקות רצופות = דחף לדקתיים: מטבעות כפולים, והיצור הבא
// מתגלה מרחוק יותר. עצירה מאפסת רק את הפס — לא את מה שכבר הרוויחו.
// ילד שנעצר לנשום לא מפסיד כלום.
//
// טהור. מוזן מ-FIX. "הולכים" = המונה של ההליכה התקדם ב-25 השניות
// האחרונות (GPS מוסיף מטרים בקפיצות, אז מהירות רגעית לא אומרת כלום).
// streak: { since, lastMoveT, boostUntil, boosts }.

export const STREAK_MS = 4 * 60 * 1000
export const BOOST_MS = 2 * 60 * 1000
export const STOP_MS = 25 * 1000       // בלי מטר חדש כל כך הרבה — עצרו
export const BOOST_COINS = 2           // מכפיל מטבעות בזמן דחף
export const BOOST_REVEAL = 0.45       // סף החום לגילוי בזמן דחף (רגיל: 0.65)

export const freshStreak = t => ({ since: t ?? null, lastMoveT: t ?? null, boostUntil: 0, boosts: 0 })

export function tickStreak(streak, { moved = false, t = 0 } = {}) {
  let s = streak || freshStreak(t)
  if (s.since == null) s = { ...s, since: t, lastMoveT: t }
  if (moved) s = s.lastMoveT === t ? s : { ...s, lastMoveT: t }
  // עצרו: הפס מתאפס. דחף שכבר רץ — ממשיך עד סופו.
  if (t - (s.lastMoveT ?? t) > STOP_MS) return s.since === t ? s : { ...s, since: t, lastMoveT: t }
  if (t - s.since >= STREAK_MS && t >= (s.boostUntil || 0)) {
    return { ...s, since: t, boostUntil: t + BOOST_MS, boosts: (s.boosts || 0) + 1 }
  }
  return s
}

export const boosting = (streak, t) => !!streak?.boostUntil && t < streak.boostUntil
export const streakFill = (streak, t) => (streak?.since == null ? 0 : Math.max(0, Math.min(1, (t - streak.since) / STREAK_MS)))
export const boostLeftMs = (streak, t) => (boosting(streak, t) ? streak.boostUntil - t : 0)

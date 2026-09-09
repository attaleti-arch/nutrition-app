// ─── שלבי התפתחות ───
// "כל הילדים אמרו לי ש-8 יצורים זה לא מספיק." לא עוד יצורים — עומק: כל
// יצור גדל. שלושה שלבים: גור, בוגר, אגדי. מה שמגדל אותו הוא תפיסות
// חוזרות של אותו יצור — 3 תפיסות = בוגר, 7 = אגדי. ככה כל מסע חוזר הוא
// התקדמות ("עוד 2 תפיסות ונימי גדל") ולא "שוב נימי".
//
// טהור. הכול נגזר מ-progress.caught — אין מצב נפרד, אין מה לאבד במיזוג.
// הדמות של כל שלב באה מהמרשם (creature.stages[n]); אם אין עדיין — אותה
// דמות, גדולה יותר, עם הילה. המשחק עובד לפני שכל החומרים מוכנים.

import { bondCredits } from './buddy.js'

export const STAGES = [
  { n: 1, name: 'גור', need: 0, scale: 1 },
  { n: 2, name: 'בוגר', need: 3, scale: 1.3 },
  { n: 3, name: 'אגדי', need: 7, scale: 1.6 },
]
export const MAX_STAGE = STAGES.length

export const stageInfo = n => STAGES[Math.max(1, Math.min(MAX_STAGE, n || 1)) - 1]
export const stageScale = n => stageInfo(n).scale

// כמה נקודות → באיזה שלב.
export function stageFor(points) {
  let s = 1
  for (const st of STAGES) if ((points || 0) >= st.need) s = st.n
  return s
}
// הנקודות של יצור: תפיסות, ועוד אחת על כל 2 ק"מ שהלכו איתו כבן לוויה.
export const stagePoints = (progress, id) => (progress?.caught?.[id] || 0) + bondCredits(progress, id)
export const stageOf = (progress, id) => stageFor(stagePoints(progress, id))

// לספר: { stage, have, need, next } — need הוא הסף של השלב הבא, null באגדי.
export function stageProgress(progress, id) {
  const have = stagePoints(progress, id)
  const stage = stageFor(have)
  const next = STAGES.find(s => s.n === stage + 1) || null
  return { stage, have, need: next ? next.need : null, next: next ? next.n : null, left: next ? Math.max(0, next.need - have) : 0 }
}

const idsOf = p => new Set([...Object.keys(p?.caught || {}), ...Object.keys(p?.bond || {})])

// מה גדל במסע הזה: [{ id, from, to }] — למסך ההתפתחות.
export function evolvedBetween(before, after) {
  const out = []
  for (const id of idsOf(after)) {
    const from = stageOf(before, id), to = stageOf(after, id)
    if (to > from) out.push({ id, from, to })
  }
  return out
}

// שם עם שלב: "נימי הבוגר", "גלי האגדית". gender מהמרשם ('f' | 'm').
const STAGE_TITLE = { 2: { m: 'הבוגר', f: 'הבוגרת' }, 3: { m: 'האגדי', f: 'האגדית' } }
export function stagedName(creature, stage) {
  if (!creature) return ''
  const t = STAGE_TITLE[stage]?.[creature.gender === 'f' ? 'f' : 'm']
  return t ? `${creature.name} ${t}` : creature.name
}
export const grewVerb = creature => (creature?.gender === 'f' ? 'גדלה' : 'גדל')

// ── המראה: צבע מהביצה שיש לו דמות ──
// ביצה שבקעה נותנת צבע. ליצור שיש לו קליפ לצבע הזה (creature.variants[id])
// זו דמות שלמה — והיא המראה שלו מעכשיו, אלא אם בחרו אחרת בספר
// (progress.look[id] = 'base' | מזהה צבע).
export function lookOf(progress, creature) {
  if (!creature?.variants) return null
  const pick = progress?.look?.[creature.id]
  if (pick === 'base') return null
  if (pick && creature.variants[pick]) return pick
  const had = (progress?.variants || []).filter(v => v.creature === creature.id && creature.variants[v.variant])
  return had.length ? had[had.length - 1].variant : null
}
export const hasLook = (progress, creature) =>
  !!creature?.variants && (progress?.variants || []).some(v => v.creature === creature.id && creature.variants[v.variant])

// היצור בשלב: אותו מרשם, עם הדמות של השלב אם יש, ובגודל של השלב.
// look — צבע מהביצה עם דמות משלו: מנצח את דמות השלב, ובלי הילה.
// aura — אין דמות לשלב הזה: מציירים הילה על הדמות הבסיסית.
export function staged(creature, stage = 1, look = null) {
  if (!creature) return null
  const n = Math.max(1, Math.min(MAX_STAGE, stage || 1))
  const lookArt = look && creature.variants?.[look] ? creature.variants[look] : null
  const art = lookArt || (n > 1 ? creature.stages?.[n] || null : null)
  const out = {
    ...creature,
    // יש דמות: הקליפ שלה. מודל תלת-ממד וגזירות של הבסיס לא "מבינים" — אחרת
    // הבמה מציגה את הגור בתלת-ממד ליד הבוגר בקליפ.
    ...(art ? { model: null, ios: null, sprites: null, anchors: null, ...art } : {}),
    stage: n,
    look: lookArt ? look : null,
    aura: n > 1 && !art,
  }
  if (n > 1) out.heightM = (creature.heightM || 0.5) * stageScale(n)
  return out
}
// הכול מ-progress: השלב לפי התפיסות, המראה לפי הביצה.
export const stagedFor = (progress, creature) => (creature ? staged(creature, stageOf(progress, creature.id), lookOf(progress, creature)) : null)

// כמה יצורים הגיעו לשלב — להישגים.
export const countAtStage = (progress, n) => [...idsOf(progress)].filter(id => stageOf(progress, id) >= n).length

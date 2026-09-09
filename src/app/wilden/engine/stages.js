// ─── שלבי התפתחות ───
// "כל הילדים אמרו לי ש-8 יצורים זה לא מספיק." לא עוד יצורים — עומק: כל
// יצור גדל. שלושה שלבים: גור, בוגר, אגדי. מה שמגדל אותו הוא תפיסות
// חוזרות של אותו יצור — 3 תפיסות = בוגר, 7 = אגדי. ככה כל מסע חוזר הוא
// התקדמות ("עוד 2 תפיסות ונימי גדל") ולא "שוב נימי".
//
// טהור. הכול נגזר מ-progress.caught — אין מצב נפרד, אין מה לאבד במיזוג.
// הדמות של כל שלב באה מהמרשם (creature.stages[n]); אם אין עדיין — אותה
// דמות, גדולה יותר, עם הילה. המשחק עובד לפני שכל החומרים מוכנים.

export const STAGES = [
  { n: 1, name: 'גור', need: 0, scale: 1 },
  { n: 2, name: 'בוגר', need: 3, scale: 1.3 },
  { n: 3, name: 'אגדי', need: 7, scale: 1.6 },
]
export const MAX_STAGE = STAGES.length

export const stageInfo = n => STAGES[Math.max(1, Math.min(MAX_STAGE, n || 1)) - 1]
export const stageScale = n => stageInfo(n).scale

// כמה פעמים נתפס → באיזה שלב.
export function stageFor(caughtCount) {
  let s = 1
  for (const st of STAGES) if ((caughtCount || 0) >= st.need) s = st.n
  return s
}
export const stageOf = (progress, id) => stageFor(progress?.caught?.[id] || 0)

// לספר: { stage, have, need, next } — need הוא הסף של השלב הבא, null באגדי.
export function stageProgress(progress, id) {
  const have = progress?.caught?.[id] || 0
  const stage = stageFor(have)
  const next = STAGES.find(s => s.n === stage + 1) || null
  return { stage, have, need: next ? next.need : null, next: next ? next.n : null, left: next ? Math.max(0, next.need - have) : 0 }
}

// מה גדל במסע הזה: [{ id, from, to }] — למסך ההתפתחות.
export function evolvedBetween(before, after) {
  const out = []
  for (const id of Object.keys(after?.caught || {})) {
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

// היצור בשלב: אותו מרשם, עם הדמות של השלב אם יש, ובגודל של השלב.
// aura — אין עדיין דמות לשלב הזה: מציירים הילה על הדמות הבסיסית.
export function staged(creature, stage = 1) {
  if (!creature) return null
  const n = Math.max(1, Math.min(MAX_STAGE, stage || 1))
  if (n === 1) return { ...creature, stage: 1, aura: false }
  const art = creature.stages?.[n] || null
  return {
    ...creature,
    ...(art || {}),
    stage: n,
    aura: !art,
    heightM: (creature.heightM || 0.5) * stageScale(n),
  }
}

// כמה יצורים הגיעו לשלב — להישגים.
export const countAtStage = (progress, n) => Object.keys(progress?.caught || {}).filter(id => stageOf(progress, id) >= n).length

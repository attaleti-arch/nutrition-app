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
import { tintOf, variantName } from './egg.js'
import { skinTint, skinById, ownsSkin, stoneCredits } from './skins.js'
import { tr } from '../i18n/index.js'

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
// הנקודות של יצור: תפיסות, ועוד אחת על כל 2 ק"מ שהלכו איתו כבן לוויה,
// ועוד אחת על כל אבן צמיחה מהחנות.
export const stagePoints = (progress, id) => (progress?.caught?.[id] || 0) + bondCredits(progress, id) + stoneCredits(progress, id)
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
  return t ? `${tr(creature.name)} ${tr(t)}` : tr(creature.name)
}
export const grewVerb = creature => (creature?.gender === 'f' ? tr('גדלה') : tr('גדל'))

// ── המראה: צבע מהביצה שיש לו דמות ──
// ביצה שבקעה נותנת צבע. ליצור שיש לו קליפ לצבע הזה (creature.variants[id])
// זו דמות שלמה — והיא המראה שלו מעכשיו, אלא אם בחרו אחרת בספר
// (progress.look[id] = 'base' | מזהה צבע).
// צבע "נראה" אם יש לו דמות (creature.variants[id]) או גוון (egg.TINT).
// צבע "נראה" אם יש לו דמות משלו, גוון מהביצה, או גוון מהחנות — אותו
// צבע יכול להגיע משני המקורות (יער בוקע מביצה וגם נמכר בחנות).
const wearable = (creature, id) => !!(creature?.variants?.[id] || tintOf(id) || skinTint(id))
// מה היצור הזה יכול ללבוש: מהביצה (מה שבקע), ומהחנות (סקינים שנקנו).
export function looksFor(progress, creature) {
  if (!creature) return []
  const out = []
  for (const v of progress?.variants || []) {
    if (v.creature === creature.id && wearable(creature, v.variant) && !out.includes(v.variant)) out.push(v.variant)
  }
  for (const s of progress?.skins?.[creature.id] || []) if (!out.includes(s)) out.push(s)
  return out
}
// בקע אצלי, או נקנה בחנות — שניהם "יש לי". קודם זה היה או-או, ומי
// שקנה צבע שגם בוקע מביצה לא יכול היה ללבוש אותו.
const canWear = (progress, creature, id) =>
  (progress?.variants || []).some(v => v.creature === creature.id && v.variant === id) || ownsSkin(progress, creature.id, id)
export function lookOf(progress, creature) {
  if (!creature) return null
  const pick = progress?.look?.[creature.id]
  if (pick === 'base') return null
  if (pick && (canWear(progress, creature, pick) || creature.variants?.[pick])) return pick
  const had = (progress?.variants || []).filter(v => v.creature === creature.id && wearable(creature, v.variant))
  // דמות שלמה עדיפה על גוון, אם בקעו כמה צבעים
  const withArt = had.filter(v => creature.variants?.[v.variant])
  const list = withArt.length ? withArt : had
  return list.length ? list[list.length - 1].variant : null
}
export const hasLook = (progress, creature) => looksFor(progress, creature).length > 0
// השם של מראה: צבע מהביצה, או סקין.
export const lookName = (id, creature) => variantName(id, creature) || (creature?.gender === 'f' ? skinById(id)?.nameF : skinById(id)?.name) || ''

// היצור בשלב: אותו מרשם, עם הדמות של השלב אם יש, ובגודל של השלב.
// look — צבע מהביצה עם דמות משלו: מנצח את דמות השלב, ובלי הילה.
// aura — אין דמות לשלב הזה: מציירים הילה על הדמות הבסיסית.
export function staged(creature, stage = 1, look = null) {
  if (!creature) return null
  const n = Math.max(1, Math.min(MAX_STAGE, stage || 1))
  const lookArt = look && creature.variants?.[look] ? creature.variants[look] : null
  const tint = !lookArt && look ? (tintOf(look) || skinTint(look)) : null
  // אין דמות לשלב הזה? יורדים לשלב הגבוה ביותר שכן יש לו — האגדי נראה
  // כמו הבוגר, גדול וזוהר, ולא כמו הגור. (קודם הוא נפל עד הגור.)
  const stageArt = n > 1 ? creature.stages?.[n] || creature.stages?.[n - 1] || null : null
  const art = lookArt || stageArt
  const out = {
    ...creature,
    // יש דמות: הקליפ שלה. מודל תלת-ממד וגזירות של הבסיס לא "מבינים" — אחרת
    // הבמה מציגה את הגור בתלת-ממד ליד הבוגר בקליפ.
    ...(art ? { model: null, ios: null, sprites: null, anchors: null, ...art } : {}),
    stage: n,
    look: lookArt || tint ? look : null,
    // גוון: פילטר על הקליפ (של השלב), והילה בצבע. המודל יורד — הוא לא צבוע.
    tint: tint ? tint.filter : null,
    auraColor: tint ? tint.aura : null,
    // הילה = "זה לא באמת החומר של השלב הזה": האגדי לובש את דמות הבוגר.
    aura: n > 1 && !creature.stages?.[n] && !lookArt,
  }
  if (tint) out.model = null
  if (n > 1) out.heightM = (creature.heightM || 0.5) * stageScale(n)
  return out
}
// הכול מ-progress: השלב לפי התפיסות, המראה לפי הביצה.
export const stagedFor = (progress, creature) => (creature ? staged(creature, stageOf(progress, creature.id), lookOf(progress, creature)) : null)

// כמה יצורים הגיעו לשלב — להישגים.
export const countAtStage = (progress, n) => [...idsOf(progress)].filter(id => stageOf(progress, id) >= n).length

// ── כל הצורות ──
// "ספר היצורים צריך לכלול יותר מ-9, שיראו המון דמויות." והן באמת שם: כל
// יצור הוא שלוש צורות — גור, בוגר, אגדי — ולכל אחת דמות משלה (לבוגר יש
// קליפ נפרד, לאגדי אותו קליפ עם הילה). תשעה יצורים הם עשרים ושבע צורות,
// ועוד אחת לכל צבע שבקע או נקנה. מה שעוד לא נפתח מופיע כצללית: רואים
// שיש שם משהו, ויודעים מה חסר כדי להגיע אליו.
//
// טהור, ומחזיר נתונים בלבד — הספר רק מצייר.
export function formsOf(progress, creature) {
  if (!creature) return []
  const have = (progress?.creatures || []).includes(creature.id)
  const sp = stageProgress(progress, creature.id)
  const out = STAGES.map(st => ({
    kind: 'stage', stage: st.n, name: st.name,
    open: have && sp.stage >= st.n,
    // מה חסר כדי לפתוח: תפיסות. בשלב 1 — פשוט לתפוס אותו פעם אחת.
    left: have ? Math.max(0, st.need - sp.have) : null,
  }))
  for (const l of looksFor(progress, creature)) {
    out.push({ kind: 'look', look: l, name: lookName(l, creature), open: true, stage: sp.stage })
  }
  return out
}

// כמה צורות נפתחו מכמה אפשריות (בלי צבעים — הם בונוס, ואין להם תקרה).
// מקבל את היצורים עצמם, כדי ש-stages לא יצטרך להכיר את המרשם.
export function formTally(progress, creatures = []) {
  let open = 0, total = 0, colours = 0
  for (const c of creatures) {
    if (!c) continue
    total += MAX_STAGE
    if ((progress?.creatures || []).includes(c.id)) open += Math.min(MAX_STAGE, stageOf(progress, c.id))
    colours += looksFor(progress, c).length
  }
  return { open, total, colours }
}

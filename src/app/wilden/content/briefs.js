// ─── מה אומרים לפני שיוצאים, ומה אומרים כשחוזרים ───
// טהור. עד עכשיו מסך הבית הראה תמיד את התדריך של מסע 1 ("הביקון זז
// לראשונה… צא למסע") — גם אחרי שנימי כבר נתפס. הילד קרא "שוב נימי" והיא
// ראתה "הוא ישלח אותנו שוב ושוב לתפוס את נימי". התדריך נגזר מהלוח: מי
// היום בדרך, לפי כמה מסעות כבר היו.

import M01 from './missions/m01-signal.js'
import { creaturesForWalk } from '../engine/coins.js'
import { creatureById } from './creatures.js'
import { tr } from '../i18n/index.js'

// מי היום בדרך — היצור הראשון לפי הלוח. השני (בתשלום) לא מוכרז מראש.
export function todaysCreature(progress) {
  const walks = progress?.walks || 0
  return creatureById(creaturesForWalk(walks, false)[0])
}
// כולם, לפי הסדר. מהמסע השני — שניים.
export function todaysCreatures(progress) {
  const walks = progress?.walks || 0
  return creaturesForWalk(walks, false).map(creatureById).filter(Boolean)
}
// הניסוח עובר דרך tr (גרמנית): כל משפט תבנית עם משתנים, לא הדבקת מילים.
const namesOf = list => list.map(c => tr(c.name)).join(tr(' ו'))

export function briefFor(progress) {
  const walks = progress?.walks || 0
  const who = todaysCreature(progress)
  if (walks === 0 || !who) {
    return { missionId: M01.id, creature: M01.creature, line: tr(M01.brief.line), sub: tr(M01.brief.sub), cta: tr(M01.brief.cta) }
  }
  const all = todaysCreatures(progress)
  const caught = progress?.creatures || []
  const fresh = all.filter(c => !caught.includes(c.id))
  const known = !fresh.includes(who)
  return {
    missionId: null,
    creature: who.id,
    creatures: all.map(c => c.id),
    line: tr('מסע {n}: היום בדרך {names}.', { n: walks + 1, names: namesOf(all) }),
    sub: fresh.length === 0
      ? (all.length > 1
        ? tr('שניהם שוב בחוץ. הביקון מרגיש אותם.')
        : tr('{name} שוב בחוץ. הביקון מרגיש אותו.', { name: tr(who.name) }))
      : known
        ? tr('{fresh} חדש{brings}. {name} שוב בחוץ.', {
          fresh: tr(fresh[0].name), name: tr(who.name),
          brings: fresh[0].brings ? tr(' — מביא {res} לעולם', { res: tr(fresh[0].brings) }) : '',
        })
        : who.brings
          ? tr('יצור חדש. הוא מביא {res} לעולם.', { res: tr(who.brings) })
            + (fresh.length > 1 && fresh[1].brings ? ' ' + tr('{name} מביא {res}.', { name: tr(fresh[1].name), res: tr(fresh[1].brings) }) : '')
          : tr('יצור חדש. הביקון כבר מרגיש אותו.'),
    cta: tr('צא למסע'),
  }
}

// מה קורה כשחוזרים דרך הפורטל. מסע 1 הוא סיפור; אחר כך — מה שנתפס.
export function homeFor(run, progress) {
  if (run?.missionId === M01.id) return { line: tr(M01.home.line), clue: { line: tr(M01.clue.line), sub: tr(M01.clue.sub) } }
  const caught = (run?.stops || []).filter(s => s.done).map(s => creatureById(s.creature)).filter(Boolean)
  const names = caught.map(c => tr(c.name))
  const brings = caught.filter(c => c.brings).map(c => tr(c.brings))
  const many = names.length > 1
  const line = names.length
    ? (brings.length
      ? tr(many ? '{names} נכנסים לעולם, ומביאים {res}.' : '{names} נכנס לעולם, ומביא {res}.', { names: names.join(tr(' ו')), res: brings.join(tr(' ו')) })
      : tr(many ? '{names} נכנסים לעולם.' : '{names} נכנס לעולם.', { names: names.join(tr(' ו')) }))
    : tr('חזרתם הביתה.')
  // progress כבר אחרי PORTAL_ENTERED — walks קודם, אז זה מי שמחכה מחר.
  const next = todaysCreatures(progress)
  return {
    line,
    clue: {
      line: next.length > 1 ? tr('הביקון מרגיש עוד שניים בחוץ.') : tr('הביקון מרגיש עוד אחד בחוץ.'),
      sub: next.length
        ? tr(next.length > 1 ? '{names} מחכים למסע הבא.' : '{names} מחכה למסע הבא.', { names: namesOf(next) })
        : tr('המסע הבא ייפתח מחר.'),
    },
  }
}

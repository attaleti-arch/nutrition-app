// ─── מה אומרים לפני שיוצאים, ומה אומרים כשחוזרים ───
// טהור. עד עכשיו מסך הבית הראה תמיד את התדריך של מסע 1 ("הביקון זז
// לראשונה… צא למסע") — גם אחרי שנימי כבר נתפס. הילד קרא "שוב נימי" והיא
// ראתה "הוא ישלח אותנו שוב ושוב לתפוס את נימי". התדריך נגזר מהלוח: מי
// היום בדרך, לפי כמה מסעות כבר היו.

import M01 from './missions/m01-signal.js'
import { creaturesForWalk } from '../engine/coins.js'
import { creatureById } from './creatures.js'

// מי היום בדרך — היצור הראשון לפי הלוח. השני (בתשלום) לא מוכרז מראש.
export function todaysCreature(progress) {
  const walks = progress?.walks || 0
  return creatureById(creaturesForWalk(walks, false)[0])
}

export function briefFor(progress) {
  const walks = progress?.walks || 0
  const who = todaysCreature(progress)
  if (walks === 0 || !who) {
    return { missionId: M01.id, creature: M01.creature, line: M01.brief.line, sub: M01.brief.sub, cta: M01.brief.cta }
  }
  const known = (progress?.creatures || []).includes(who.id)
  return {
    missionId: null,
    creature: who.id,
    line: `מסע ${walks + 1}: היום בדרך ${who.name}.`,
    sub: known
      ? `${who.name} שוב בחוץ. הביקון מרגיש אותו.`
      : who.brings
        ? `יצור חדש. הוא מביא ${who.brings} לעולם.`
        : 'יצור חדש. הביקון כבר מרגיש אותו.',
    cta: 'צא למסע',
  }
}

// מה קורה כשחוזרים דרך הפורטל. מסע 1 הוא סיפור; אחר כך — מה שנתפס.
export function homeFor(run, progress) {
  if (run?.missionId === M01.id) return { line: M01.home.line, clue: M01.clue }
  const caught = (run?.stops || []).filter(s => s.done).map(s => creatureById(s.creature)).filter(Boolean)
  const names = caught.map(c => c.name)
  const brings = caught.filter(c => c.brings).map(c => c.brings)
  const line = names.length
    ? `${names.join(' ו')} ${names.length > 1 ? 'נכנסים' : 'נכנס'} לעולם${brings.length ? `, ומביא${names.length > 1 ? 'ים' : ''} ${brings.join(' ו')}` : ''}.`
    : 'חזרתם הביתה.'
  // progress כבר אחרי PORTAL_ENTERED — walks קודם, אז זה מי שמחכה מחר.
  const next = todaysCreature(progress)
  return {
    line,
    clue: {
      line: 'הביקון מרגיש עוד אחד בחוץ.',
      sub: next ? `${next.name} מחכה למסע הבא.` : 'המסע הבא ייפתח מחר.',
    },
  }
}

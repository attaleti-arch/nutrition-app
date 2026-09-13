// ─── בן לוויה ───
// "אף אחד לא הולך *עם* הילד." בבית בוחרים יצור אחד שיוצא איתך. הוא על
// המפה ליד הדמות, אומר משפט באבני הדרך, וכל 2 ק"מ יחד נספרים לו כתפיסה
// לצורך ההתפתחות. ילד שהולך עם נימי כל יום מגדל אותו תוך שבוע.
//
// טהור. progress.buddy — מזהה; progress.bond — { [id]: מטרים יחד }.

export const BOND_M = 2000

// מי שגובטבו מחזיק לא יוצא לטיול — הוא לא בעולם (ראה engine/wind.js).
export const canBuddy = (progress, id) =>
  !!id && (progress?.creatures || []).includes(id) && progress?.taken?.creature !== id

export function setBuddy(progress, id) {
  if (id == null) return { ...progress, buddy: null }
  if (!canBuddy(progress, id)) return progress
  return { ...progress, buddy: id }
}

// בסוף הליכה: המטרים נזקפים לבן הלוויה.
export function addBond(progress, meters) {
  const id = progress?.buddy
  const m = Math.max(0, Math.round(meters || 0))
  if (!id || !m) return progress
  return { ...progress, bond: { ...(progress.bond || {}), [id]: (progress.bond?.[id] || 0) + m } }
}

export const bondOf = (progress, id) => progress?.bond?.[id] || 0
export const bondCredits = (progress, id) => Math.floor(bondOf(progress, id) / BOND_M)

// מה בן הלוויה אומר בדרך. מפתח: 'start' | 'quarter' | 'half' | 'coins' | 'home' | 'stop'
const LINES = {
  nimi: { start: 'יאללה, אני מוביל!', half: 'חצי דרך! מרחרח… עוד מעט יש מישהו.', home: 'הביתה! אני ראשון.', stop: 'שם! ראיתם? שם!' },
  dabashon: { start: 'זזז, יוצאים!', half: 'חצי דרך, ואני עדיין לא עייפה. זזז.', home: 'הביתה — לדבש!', stop: 'מישהו כאן. אני מרגישה.' },
  bolder: { start: 'צעד… צעד…', half: 'חצי. אבן… אחרי אבן.', home: 'הבית. טוב.', stop: 'שקט. מישהו.' },
  ruchi: { start: 'הרוח איתנו!', half: 'מלמעלה רואים את הבית!', home: 'נוחתים!', stop: 'שם, בין הבתים!' },
  lumi: { start: 'אני מאיר את הדרך.', half: 'חצי, ואני זוהר!', home: 'הבית זוהר. רואים?', stop: 'ניצוץ… שם.' },
  gali: { start: 'ספלאש! יוצאים!', half: 'חצי דרך, כמו גל שנשבר.', home: 'הביתה, לכד!', stop: 'שמעתם? מישהו זז.' },
  tzel: { start: 'אני כאן. מאחוריך.', half: 'חצי. ששש.', home: 'הבית. הצל שלי כבר שם.', stop: 'צל זר. כאן.' },
  kraag: { start: 'אבן… הולכת.', half: 'חצי… זוכר את הדרך.', home: 'הבית. זוכר.', stop: 'רעידה. מישהו.' },
  noga: { start: 'בואו, אני מאירה.', half: 'חצי הדרך. תסתכלו עליי כשחשוך.', home: 'הביתה, לבוקר.', stop: 'אור זר. שם.' },
}
export function buddyLine(id, key) {
  return LINES[id]?.[key] || null
}

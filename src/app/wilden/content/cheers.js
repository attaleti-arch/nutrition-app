// ─── מילות עידוד ───
// "כל הכבוד, מילות עידוד." טהור: מקבל מה קרה, מחזיר משפט. הבחירה
// דטרמיניסטית לפי מונה כדי שבדיקה תדע מה תצא, ולא יחזור אותו משפט
// פעמיים ברצף.

export const CHEERS = {
  catch: ['כל הכבוד!', 'וואו, תפסתם אותו!', 'איזה ציידים!', 'מדהים! הוא שלכם.', 'יש! עוד אחד בעולם.'],
  coins: ['ממשיכים ככה!', 'הארנק מתמלא!', 'גלינג! עוד אחד.', 'איזה קצב!'],
  half: ['חצי דרך! הביקון גאה בכם.', 'עברתם את החצי. הרגליים חזקות!'],
  home: ['הגעתם הביתה. גיבורים!', 'המסע נגמר, והעולם קצת יותר שלם.'],
  egg: ['הביצה מתחממת! עוד קצת.', 'הרגליים שלכם מחממות את הביצה.'],
}

export function cheer(kind, n = 0) {
  const list = CHEERS[kind] || CHEERS.catch
  return list[Math.abs(n) % list.length]
}

// ── רגעי עידוד בזמן ההליכה ──
// כל 10 מטבעות; חצי הדרך (פעם אחת). מחזיר { kind, text } או null.
export const COIN_MILESTONE = 10
export function milestone({ coinsBefore = 0, coinsNow = 0, alongBefore = 0, alongNow = 0, total = 0 } = {}) {
  if (total > 0 && alongBefore < total / 2 && alongNow >= total / 2) return { kind: 'half', text: cheer('half', Math.floor(alongNow)) }
  const a = Math.floor(coinsBefore / COIN_MILESTONE), b = Math.floor(coinsNow / COIN_MILESTONE)
  if (b > a && coinsNow > 0) return { kind: 'coins', text: `${b * COIN_MILESTONE} מטבעות! ${cheer('coins', b)}` }
  return null
}

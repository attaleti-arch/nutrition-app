// ─── הביקון ───
// החפץ של הילד וההסבר העלילתי לכל מערכת החיפוש. יש לו שני צירים
// נפרדים, וקל לבלבל ביניהם:
//
//   POWER — כמה הוא התחזק לאורך עולם 1. נשמר בין מסעות, עולה עם
//           השלמת משימות סיפוריות, ולא יורד לעולם. זה מה שהופך את מסע 7
//           למשמעותי: הילד רואה שהחפץ שלו אחר ממה שהיה במסע 1.
//
//   PHASE — איפה אנחנו בתוך החיפוש הנוכחי. מתאפס בכל יציאה.
//
// אין כאן שום "241 מטר ליצור הקרוב". הילד לא אמור לדעת מספרים.

export const POWER = ['DORMANT', 'REACTIVE', 'ACTIVE', 'EVOLVING', 'FULL_POWER']

// חמש הדרגות פרוסות על עשר המשימות. מסע 1 כבר מדליק אותו — זה הרגע
// שבו הוא מפסיק להיות כבוי, ואסור שיקרה רק בהמשך.
export function powerOf(missionsCompleted = 0) {
  if (missionsCompleted <= 0) return 'DORMANT'
  if (missionsCompleted <= 2) return 'REACTIVE'
  if (missionsCompleted <= 5) return 'ACTIVE'
  if (missionsCompleted <= 8) return 'EVOLVING'
  return 'FULL_POWER'
}

// ── שלבי החיפוש ──
// הספים נמדדים במטרים מהיעד. הם רחבים בכוונה: GPS ברחוב עירוני סוטה
// בעשרות מטרים, וסף צר גורם לביקון לקפוץ הלוך ושוב בין שני שלבים.
export const PHASE = {
  IDLE: 'IDLE',
  SIGNAL_WEAK: 'SIGNAL_WEAK',
  DIRECTION: 'DIRECTION',
  TRACE: 'TRACE',
  VERY_CLOSE: 'VERY_CLOSE',
  SAFE_STOP: 'SAFE_STOP',
}

const RING = [
  // הסף הרחב תואם למרחק שבו היעד מונח (180–300 מ'), כדי שהביקון יתעורר
  // באותו רגע ולא אחרי עוד מאה מטר של "נקלט אות חלש".
  { phase: PHASE.DIRECTION, within: 340 },
  { phase: PHASE.TRACE, within: 120 },
  { phase: PHASE.VERY_CLOSE, within: 45 },
]

// שני השערים שנשמרו מהמשחק הקודם, ושניהם נכתבו בעקבות באג אמיתי:
// דיוק גרוע *הקשיח* פעם את התפיסה במקום להרפות, וילד תפס שני יצורים
// בלי לצעוד צעד. הם נשארים בדיוק כפי שהם.
// ── שני ספי דיוק, לא אחד ──
// סף יחיד של 40 מ' חסם את *כל* ההתקדמות. ברחוב עירוני בין בניינים דיוק
// של 50–70 מ' הוא נפוץ לגמרי, והמשמעות הייתה משחק שקופא לחלוטין ואומר
// "נקלט אות חלש" עד שהילד מוותר.
//
// אבל בדיוק כזה עדיין אפשר לומר בכנות "זה בכיוון הזה". מה שאי אפשר הוא
// לומר "הוא כאן" — שם טעות של 60 מ' שולחת ילד לחפש במקום הלא נכון.
export const ACC_DIRECTION = 85   // עד כאן מותר לתת כיוון ועקבות
export const ACC_GATE = 40        // וכאן, רק כאן, מותר "הוא כאן"
export const WALK_GATE = 40       // מטרים שנצברו בהליכה לפני שמשהו קורה.

// מעל זה זה כבר לא רעש עירוני אלא מיקום מקורב — באייפון זה בדרך כלל
// "מיקום מדויק" שכבוי בהרשאות האתר.
export const ACC_COARSE = 200

// כמה זמן צריך לעמוד במקום כדי שהמצלמה תיפתח. זה כלל הבטיחות שהפך
// למכניקה — ובלעדיו כל שכבת ה-AR שבחרנו לא תקפה.
// ── "עומד במקום" נמדד ברדיוס, לא בין שתי דגימות ──
// GPS דוגם כפעם בשנייה, ובהליכה זה כמטר וחצי — כלומר *כל* דגימה בודדת
// נראית כמו עמידה, והמצלמה הייתה נפתחת באמצע הליכה. בדיוק מה שכלל
// הבטיחות בא למנוע.
//
// לכן מודדים מרחק מנקודת ייחוס: מי שנשאר בתוך 4 מ' במשך 4 שניות באמת
// עומד. הולך חוצה 4 מ' תוך כשלוש שניות ומאפס לפני שהספיק.
export const STILL_MS = 4000
export const STILL_RADIUS = 4

export function phaseOf({ dist, acc, walked, stillMs, resolved, active = true }) {
  if (resolved) return PHASE.IDLE
  // ── לפני שהיעד קיים ──
  // בתחילת מסע היעד עדיין לא הונח, ולכן אין מרחק. בגרסה הקודמת זה החזיר
  // IDLE — כלומר הביקון שתק בדיוק ברגע שהילד יוצא מהבית וצריך לדעת
  // שמשהו קורה. עכשיו הוא אומר "נקלט אות חלש. המשיכו ללכת", וזו גם
  // האמת: הוא באמת עוד לא יודע איפה.
  if (dist == null) return active ? PHASE.SIGNAL_WEAK : PHASE.IDLE
  if (walked < WALK_GATE) return PHASE.SIGNAL_WEAK
  if (acc != null && acc > ACC_DIRECTION) return PHASE.SIGNAL_WEAK

  let p = PHASE.SIGNAL_WEAK
  for (const r of RING) if (dist <= r.within) p = r.phase

  // "הוא כאן" דורש דיוק אמיתי. עם 60 מ' שגיאה זה שולח ילד לחפש בפינה
  // הלא נכונה, ולכן שם נעצרים על "עקבות טריים" עד שהקליטה משתפרת.
  if (p === PHASE.VERY_CLOSE && acc != null && acc > ACC_GATE) return PHASE.TRACE

  if (p === PHASE.VERY_CLOSE && stillMs >= STILL_MS) return PHASE.SAFE_STOP
  return p
}

// ── מה הביקון אומר ──
// הטקסט הוא חלק מהמנוע ולא מהמסך, כי המכונה נבדקת בלי React ואני רוצה
// לבדוק גם שהניסוח לא קופץ. אין כאן מרחקים ואין ספירה לאחור.
export const PHASE_COPY = {
  [PHASE.IDLE]: { line: '', sub: '' },
  [PHASE.SIGNAL_WEAK]: { line: 'נקלט אות חלש.', sub: 'המשיכו ללכת.' },
  [PHASE.DIRECTION]: { line: 'משהו נמצא בכיוון הזה.', sub: '' },
  [PHASE.TRACE]: { line: 'עקבות טריים.', sub: 'הוא עבר כאן לא מזמן.' },
  [PHASE.VERY_CLOSE]: { line: 'הוא כאן.', sub: '' },
  [PHASE.SAFE_STOP]: { line: 'הוא כאן.', sub: 'עצרו במקום בטוח כדי לחפש.' },
}

// ── מי שקיצר את הדרך ──
// הוא עומד על הנקודה של היצור, אבל את המסלול לא הלך. הביקון לא משקר
// ("הוא בכיוון הזה") ולא נועל בשקט — הוא אומר בדיוק מה קרה ומה לעשות.
export const SHORTCUT_COPY = { line: 'הוא לא מראה את עצמו למי שקיצר את הדרך.', sub: 'חזרו למסלול והמשיכו בו.' }

// רטט. הביקון מדבר גם כשהטלפון בכיס — זו כל הסיבה שהילד לא צריך
// ללכת עם המסך מול הפנים.
export const PHASE_BUZZ = {
  [PHASE.DIRECTION]: [40],
  [PHASE.TRACE]: [30, 50, 30],
  [PHASE.VERY_CLOSE]: [70, 90, 70],
  [PHASE.SAFE_STOP]: [40, 60, 40, 60, 120],
}

// החץ מוצג רק מ-DIRECTION והלאה, ורק כשהדיוק סביר. חץ שמסתובב
// אקראית בגלל GPS גרוע הוא גרוע יותר מאין חץ.
export function showsArrow(phase, acc) {
  if (phase === PHASE.IDLE || phase === PHASE.SIGNAL_WEAK) return false
  return acc == null || acc <= ACC_GATE
}

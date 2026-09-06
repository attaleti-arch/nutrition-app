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
  { phase: PHASE.DIRECTION, within: 250 },
  { phase: PHASE.TRACE, within: 120 },
  { phase: PHASE.VERY_CLOSE, within: 45 },
]

// שני השערים שנשמרו מהמשחק הקודם, ושניהם נכתבו בעקבות באג אמיתי:
// דיוק גרוע *הקשיח* פעם את התפיסה במקום להרפות, וילד תפס שני יצורים
// בלי לצעוד צעד. הם נשארים בדיוק כפי שהם.
export const ACC_GATE = 40      // מטרים. מעל זה הביקון לא מתקדם.
export const WALK_GATE = 40     // מטרים שנצברו בהליכה לפני שמשהו קורה.

// כמה זמן צריך לעמוד במקום כדי שהמצלמה תיפתח. זה כלל הבטיחות שהפך
// למכניקה — ובלעדיו כל שכבת ה-AR שבחרנו לא תקפה.
export const STILL_MS = 3000
export const STILL_STEP = 3     // מטרים. פחות מזה נחשב "עומד".

export function phaseOf({ dist, acc, walked, stillMs, resolved }) {
  if (resolved) return PHASE.IDLE
  if (dist == null) return PHASE.IDLE
  if (walked < WALK_GATE) return PHASE.SIGNAL_WEAK
  if (acc != null && acc > ACC_GATE) return PHASE.SIGNAL_WEAK

  let p = PHASE.SIGNAL_WEAK
  for (const r of RING) if (dist <= r.within) p = r.phase

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

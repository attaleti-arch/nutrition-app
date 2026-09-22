// ─── צל, ומה שהפנס עושה ───
// "זה מאוד חשוב לי שגם צל, אני רוצה לראות את הסימולציה שלו. חשוב לי
// שהתחושה תהיה פנס אלומת אור."
//
// עד עכשיו צל היה עוד מרדף: אותו שלד של כולם, רק עם צל במקום דמות.
// הפנס היה תפאורה — קונים אותו, המסך נעשה חשוך פחות, וזהו. אבל צל הוא
// היצור היחיד שאי אפשר לראות בלי אור, ולכן הפנס צריך להיות *הפועל*
// שלו, בדיוק כמו שהמשקפת היא הפועל של רוחי.
//
// אז ככה זה עובד:
//   DARK   — רחוב חשוך. הוא איפשהו, ולא רואים כלום. סורקים עם האלומה.
//   נכנס לאלומה — "האלומה עליו!" הצל שלו מופיע על הרצפה, וכל עוד האור
//            עליו הצעדים מקרבים. זה כל המשחק: להחזיק אותו באור וללכת.
//   יוצא מהאלומה — הוא נעלם. שתי שניות בחושך והוא *זז* למקום אחר, ואז
//            צריך לסרוק מחדש. זה מה שהופך את האור למשהו שמחזיקים.
//   ואחרי שתי חמיקות — הוא נעצר לרגליכם, קם מתוך הצל, ותופסים.
//
// טהור. הבמה מחשבת אם היצור בתוך האלומה וקוראת ל-onBeam; כל השאר כאן.

import { makeChase, PHASE, scaleFor } from './chase.js'

export const DARK = 'DARK'
export const SLIP_MS = 3200        // כמה זמן בחושך לפני שהוא זז
export const FIND_MS = 600         // כמה זמן להחזיק עליו אלומה כדי ש"נמצא"
// גודלו המרבי של צל בתוך האלומה. הכתם הוא 16% מרוחב המסך לגובה, ובגודל
// הזה הוא יוצא כשני שלישים ממנו — נמצא בתוכו, ולא מסתיר אותו.
export const BEAM_MAX_SCALE = 0.52
export const SCAN_MS = 50000       // רשת ביטחון: אחרי זמן סריקה ארוך הוא מתגלה

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)

const COPY = {
  DARK: { line: 'חשוך. הוא כאן, אבל בלי אור אי אפשר לראות אותו.', sub: 'סובבו לאט עם הפנס עד שהאלומה תתפוס אותו.' },
  DARK_WARM: { line: 'משהו זז באור…', sub: 'החזיקו את האלומה במקום.' },
  LIT: { line: 'האלומה עליו! אל תורידו אותה.', sub: 'רוצו אליו כל עוד הוא באור.' },
  LOST: { line: 'איבדתם אותו מהאור.', sub: 'סובבו לאט — הוא עוד שם.' },
  SLIP: { line: 'הוא חמק בחושך!', sub: 'הוא זז. סרקו שוב עם הפנס.' },
  NEAR: { line: 'הצל נעצר לרגליכם.', sub: 'לחצו במסך, והוא יקום!' },
}

export function makeBeam({ id = 'beam', target = 'creature', copy = null } = {}) {
  const base = makeChase({ id, target, style: 'shadow' })
  const text = { ...COPY, ...(copy || {}) }
  const inDark = s => s.phase === DARK

  // הוא זז למקום אחר ברחוב. לא בורח בקו — פשוט כבר לא שם.
  function slip(s, rng, t) {
    return {
      ...s, phase: DARK, lit: false, litT: 0, darkT: t, found: false,
      hidden: norm(s.hidden + (rng() < 0.5 ? -1 : 1) * rnd(rng, 55, 120)),
      slips: (s.slips || 0) + 1,
      // כל חמיקה מקרבת אותו קצת: הוא מתעייף, כמו כולם.
      dist: Math.max(4.2, s.dist - 1.6),
    }
  }

  return {
    ...base,
    id,
    style: 'shadow',
    // הבמה יודעת מזה שהמפגש הזה נשלט באלומה, ומדליקה את הפנס גם ביום.
    beam: true,

    start(ref, rng = Math.random, t = 0, mods = null) {
      const s = base.start(ref, rng, t, mods)
      return { ...s, phase: DARK, lit: false, litT: 0, darkT: t, found: false, slips: 0 }
    },

    targets(s, t = 0) {
      const out = base.targets(s, t)
      if (!inDark(s)) return out
      // בחושך הוא קיים — הבמה צריכה את הכיוון שלו כדי לדעת אם האור עליו —
      // אבל היא מציירת אותו רק כשהוא מואר. unlit הוא "כאן, ולא נראה".
      // ── והוא קטן, בתוך הכתם ──
      // "הפנס קטן ומעצבן, הדמות גדולה ומגושמת." בלי התקרה הזאת הוא הגיע
      // ל-scale 1.6 — יצור ברוחב שני שלישים מהמסך, שמסתיר את הכתם לגמרי.
      // ואז הילד כבר לא רואה איפה האלומה, ו"תחזיקו עליו את האור" הופך
      // למשחק בלי משוב. הוא צל על המדרכה: הוא צריך לשבת *בתוך* האור,
      // לא לבלוע אותו.
      return out.map(o => (o.id === target
        ? { ...o, scale: Math.min(scaleFor(s.dist), BEAM_MAX_SCALE), shadow: true, unlit: !s.lit }
        : o))
    },

    copy(s) {
      if (!inDark(s)) return base.copy(s)
      if (s.lit) return s.found ? text.LIT : text.DARK_WARM
      if (s.slips > 0 && !s.found) return text.SLIP
      return s.found ? text.LOST : text.DARK
    },

    // ── מה שהבמה מדווחת: האלומה עליו, או לא ──
    // טהור: מקבל את המצב ואת האם־מואר, ומחזיר מצב חדש.
    onBeam(s, on, t = 0, rng = Math.random) {
      if (s.phase === PHASE.DONE) return { state: s }
      if (on) {
        if (s.lit) {
          // מספיק זמן באור — והוא "נמצא": מכאן הצעדים מקרבים.
          // litT != null ולא litT: חותמת זמן אפס היא זמן תקף, ועם הבדיקה
          // הקודמת הוא פשוט לא היה נמצא לעולם באותו מקרה.
          if (!s.found && s.litT != null && t - s.litT >= FIND_MS) {
            return { state: { ...s, found: true }, feedback: 'beam' }
          }
          return { state: s }
        }
        return { state: { ...s, lit: true, litT: t, darkT: 0 } }
      }
      if (!s.lit) return { state: s }
      return { state: { ...s, lit: false, litT: 0, darkT: t } }
    },

    // צעד מקרב רק כשהאלומה עליו. ללכת בחושך לא מקרב אותך למי שלא רואים.
    onStep(s, t = 0, rng = Math.random) {
      if (inDark(s) && !(s.lit && s.found)) return { state: s }
      if (!inDark(s)) return base.onStep(s, t, rng)
      const dist = Math.max(0, s.dist - (s.mods?.stepM ?? 0.95))
      if (dist <= 3.2) {
        // הגיעו אליו באור: או שהוא חומק (פעמיים), או שהוא נעצר וקם.
        // חמיקה אחת, לא שתיים: כל חמיקה היא סבב מלא של למצוא־ולהתקרב
        // מחדש, ושלושה סבבים כאלה בחושך שברו את הרגע במקום לבנות אותו.
        if ((s.slips || 0) < 1) return { state: slip({ ...s, dist }, rng, t), feedback: 'slip' }
        return { state: { ...s, phase: PHASE.NEAR, ready: true, dist: 2.4, lit: true, lastMoveT: t }, feedback: 'near' }
      }
      return { state: { ...s, dist, lastMoveT: t } }
    },

    onTick(s, t = 0) {
      if (!inDark(s)) return base.onTick(s, t)
      // שתי שניות בחושך — והוא כבר לא שם.
      if (!s.lit && s.darkT != null && s.darkT !== 0 && s.found && t - s.darkT >= SLIP_MS) {
        return slip(s, Math.random, t)
      }
      // רשת ביטחון: ילד שסורק ולא מוצא לא נשאר בחושך לנצח.
      if (s.startT != null && t - s.startT >= SCAN_MS && !s.found) {
        return { ...s, lit: true, found: true, litT: t, tickT: t }
      }
      return s.tickT === t ? s : { ...s, tickT: t }
    },

    // ── בחושך אין על מה ללחוץ, אבל באור כן ──
    // "ממש בלתי ניתן לתפיסה." וזה היה נכון: ההתקדמות כאן תלויה *רק*
    // בצעדים, והתפיסה הזאת היא היחידה שבה הילד מחזיק את הטלפון מורם
    // ומכוון אותו למדרכה — בדיוק התנוחה שבה מד הצעדים כמעט לא סופר.
    // לכל שאר היצורים יש רשת: כשאין מד צעדים, לחיצה מקדמת. כאן היא
    // נחסמה לגמרי, ואז לא נשארה שום דרך להתקדם.
    //
    // האור נשאר הפעולה: בחושך הלחיצה עדיין לא עושה כלום. אבל ברגע
    // שהאלומה עליו והוא נמצא — לחיצה שווה צעד.
    onTap(s, rng = Math.random, t = 0, opts = {}) {
      if (inDark(s)) {
        if (s.lit && s.found) return this.onStep(s, t, rng)
        return { state: s }
      }
      return base.onTap(s, rng, t, opts)
    },

    onLock(s, tid, rng = Math.random, t = 0, opts = {}) {
      if (inDark(s)) return { state: s }
      return base.onLock(s, tid, rng, t, opts)
    },

    onCatch(s) {
      if (inDark(s)) return { state: s }
      return base.onCatch(s)
    },

    isDone: s => s.phase === PHASE.DONE,
  }
}

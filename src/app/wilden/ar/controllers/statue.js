// ─── ויספר: משחק הפסל ───
// "אני אוהבת את הפסל והדמות ניגשת אליו. ויספר נקרא לו."
//
// תשע דמויות, ופועל אחד: רצים אליהן ולוחצים. ויספר הוא ההפך הגמור, וזה
// כל הרעיון שלו — **עומדים כמו פסל, והוא בא אלייך**. כל תזוזה מרחיקה
// אותו צעד, ובסוף אין לחיצה בכלל: הוא מגיע, נשאר רגע, ונשאר איתך.
// היצור היחיד במשחק שלא נתפס — שמחליט לבוא.
//
// ולמה זה טוב גם לילד שזה המשחק שלו: אחרי ריצת מטבעות ובריחה מגובטבו,
// זו הנשימה. הליכה טובה לילד היא לא עשרים דקות של אותו מאמץ — היא
// התפרצויות ומנוחות, וזו המנוחה שהיא גם מהלך במשחק ולא "תפסיקו".
//
// טהור, ובאותו ממשק של המרדף (start / targets / copy / onStep / onTick /
// onTap / onCatch / isDone), כדי שהבמה לא תצטרך לדעת מי זה ויספר:
//   onTick(s, t, { still })  — שקט מקרב אותו, רעש עוצר אותו
//   onStep(s, t)             — זזתם. הוא נסוג.

export const PHASE = { FAR: 'FAR', NEAR: 'NEAR', DONE: 'DONE' }

// ── המספרים ──
// מ-6 מ' ל-1.6 מ' בקצב חצי מטר לשנייה: תשע שניות של שקט מושלם. ילד בן
// שש לא עומד תשע שניות מושלמות, ולכן נסיגה היא 0.7 מ' ולא איפוס — עשר
// תזוזות עדיין מסתיימות בתפיסה. אף פעם לא חוזרים להתחלה.
export const START_M = 6
export const NEAR_M = 1.6
export const APPROACH_MPS = 0.5       // כמה הוא מתקרב בשנייה של שקט
export const BACK_M = 0.7             // כמה הוא נסוג בתזוזה
export const BACK_GAP_MS = 600        // ומעל לזה: מעידה אחת אינה עשר נסיגות
export const MAX_M = 8
export const HOLD_MS = 1800           // כמה הוא עומד מולכם לפני שהוא נשאר
export const PATIENT_MS = 60000       // אחרי דקה הוא בא בכל מקרה. אין ילד תקוע.

const norm = a => ((a % 360) + 360) % 360
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const scaleFor = d => clamp(4.6 / Math.max(0.5, d), 0.5, 1.8)

const COPY = {
  FAR: { line: 'עמדו כמו פסל.', sub: 'הוא מתקרב רק כשלא זזים.' },
  MOVED: { line: 'זזתם — והוא נסוג.', sub: 'שוב. פסל.' },
  NEAR: { line: 'הוא מולכם.', sub: 'עוד רגע אחד בלי לזוז…' },
  DONE: { line: 'הוא נשאר איתכם.', sub: '' },
}

export function makeStatue({ id = 'statue', target = 'creature', copy = null } = {}) {
  const text = copy || COPY

  function arrive(s, t) {
    return { ...s, phase: PHASE.NEAR, dist: NEAR_M, nearT: t }
  }

  return {
    id,
    style: 'statue',
    // הבמה צריכה לדעת שהיא מזינה שקט ולא צעדים — וזו הדרך היחידה לדעת.
    needsStill: true,

    start(ref, rng = Math.random, t = 0, mods = null) {
      // כמעט מולכם, וקצת הצידה: מכוונים אליו פעם אחת — ואז קופאים.
      const side = rng() < 0.5 ? -1 : 1
      return {
        phase: PHASE.FAR, style: 'statue', hidden: norm(ref + side * (10 + rng() * 14)),
        dist: mods?.startM ?? START_M, tickT: t, startT: t, nearT: 0,
        stillMs: 0, backT: 0, moved: false, backs: 0, mods: mods || null,
      }
    },

    targets(s) {
      if (s.phase === PHASE.DONE) return []
      return [{
        id: target, bearing: s.hidden, elev: -5, kind: 'creature',
        scale: s.phase === PHASE.NEAR ? 1.8 : scaleFor(s.dist),
        dist: s.dist, flying: false, shadow: false, streak: null, peeking: false,
      }]
    },

    copy(s) {
      if (s.phase === PHASE.FAR && s.moved) return text.MOVED
      return text[s.phase] || text.FAR
    },

    // ── הזמן עובר ──
    // opts.still: הטלפון שקט. אז הוא מתקרב. אחרת הוא פשוט עומד — לא
    // מתרחק מעצמו, כי ההתרחקות היחידה כאן היא עונש על תזוזה.
    onTick(s, t = 0, opts = {}) {
      if (s.phase === PHASE.DONE) return s
      const dt = s.tickT ? Math.max(0, t - s.tickT) / 1000 : 0
      let next = { ...s, tickT: t }
      if (s.phase === PHASE.NEAR) {
        // מולכם: עוד רגע אחד של שקט והוא נשאר. תזוזה כאן לא מבטלת —
        // רק מאריכה, כי להפסיד אותו בשנייה האחרונה זה שובר לב.
        if (opts.still) next.stillMs = (s.stillMs || 0) + dt * 1000
        if (next.stillMs >= HOLD_MS) return { ...next, phase: PHASE.DONE }
        return next
      }
      // סבלנות: אחרי דקה מול ילד שלא מצליח לעמוד, הוא בא בעצמו.
      if (s.startT != null && t - s.startT >= PATIENT_MS) return arrive(next, t)
      if (opts.still && dt > 0) {
        next.stillMs = (s.stillMs || 0) + dt * 1000
        next.moved = false
        next.dist = Math.max(0, s.dist - APPROACH_MPS * dt)
        if (next.dist <= NEAR_M) return arrive({ ...next, stillMs: 0 }, t)
      } else if (!opts.still) {
        next.stillMs = 0
      }
      return next
    },

    // ── זזתם ──
    // מד הצעדים של הבמה הוא בדיוק הגלאי הזה: תזוזה גדולה מספיק כדי
    // להיחשב צעד היא תזוזה שפסל לא עושה.
    onStep(s, t = 0) {
      if (s.phase !== PHASE.FAR) return { state: s }
      if (s.backT && t - s.backT < BACK_GAP_MS) return { state: s }
      return {
        state: { ...s, dist: Math.min(MAX_M, s.dist + BACK_M), moved: true, stillMs: 0, backT: t, backs: (s.backs || 0) + 1 },
        feedback: 'moved',
      }
    },

    // אין כאן לחיצה שתופסת. לוחצים? הוא נרתע קצת — וזה בעצמו הלימוד.
    onTap(s, rng = Math.random, t = 0) {
      if (s.phase === PHASE.DONE) return { state: s }
      return { state: s, feedback: 'still' }
    },

    onLock(s) { return { state: s } },

    // לא תופסים אותו. הוא מגיע, והוא נשאר.
    onCatch(s) {
      if (s.phase !== PHASE.NEAR) return { state: s }
      return { state: { ...s, phase: PHASE.DONE }, feedback: 'catch' }
    },

    isDone: s => s.phase === PHASE.DONE,
  }
}

// ─── המרדף ───
// "המצלמה תיפתח והדמות תהיה טיפה מרוחקת והוא ירוץ אליה, אפילו שיהיה
// כתוב 'תמהר להתקרב שלא תברח', ואז 2 בריחות קטנות ותפיסה."
//
// היצור מתחיל רחוק וקטן. הילד רץ אליו — הצעדים נמדדים מהתאוצה של הטלפון
// (GPS איטי מדי לעשרים שניות של ריצה), וכל צעד מקרב. עומדים? הוא מתרחק
// לאט. כשמגיעים קרוב הוא בורח: קופץ לכיוון אחר, קצת פחות רחוק. פעמיים.
// בפעם השלישית הוא נעצר, ואפשר לתפוס.
//
// אותו שלד לכולם, וסגנון בריחה לפי האופי:
//   run     נימי, לומי, גלי, קראג — בורח הצידה על הרצפה, משאיר פס.
//   fly     דבשון, רוחי — בורח באוויר, גבוה יותר, צריך להרים את הראש.
//   shadow  צל — רק הצל שלו על הרצפה, מחליק. קם מתוכו רק בסוף.
//   stomp   בולדר — לא בורח: רוקע, המסך רועד, אבק, וכשהאבק שוקע הוא
//           מאחוריכם.
//
// מבנה זהה לבקרים הקודמים (start / targets / copy / onLock / onTap /
// onCatch / isDone) ועוד שניים: onStep (צעד) ו-onTick (זמן). טהור.

export const PHASE = { FAR: 'FAR', FLEE: 'FLEE', NEAR: 'NEAR', DONE: 'DONE' }

// ── המספרים אחרי השטח ──
// "זה לא עובד התפיסה": בשדה היצור נתקע על 4–6 מ' ולא ירד. הסיבה היא שילד
// מחזיק את הטלפון מורם מול הפנים כדי לראות אותו, ובתנוחה הזאת מד הצעדים
// כמעט לא סופר — בזמן שההתרחקות של העמידה כן רצה. לכן: צעד מקרב יותר,
// ההתרחקות חצי, סבלנות ארוכה יותר לפני שהיא מתחילה, ואחרי ארבעים שניות
// הוא פשוט מתעייף ונעצר. אף ילד לא נשאר תקוע מול יצור שלא מגיע.
export const START_M = 9          // מרחק התחלתי
export const FLEE_AT_M = 3.2      // מתחת לזה — בורח (או נעצר, בפעם השלישית)
export const STEP_M = 0.95        // כמה מתקרבים בצעד
export const TAP_M = 1.5          // בלי חיישנים: לחיצה מקרבת
export const DRIFT_MPS = 0.25     // כמה מתרחק בשנייה של עמידה
export const IDLE_MS = 4000       // אחרי כמה זמן עמידה מתחיל להתרחק
export const TIRED_MS = 40000     // אחרי כמה זמן מרדף הוא נעצר מעייפות
export const MAX_M = 13
export const FLEES = 2            // שתי בריחות, ואז נעצר
export const FLEE_SHOW_MS = 1400  // כמה זמן "הוא ברח!" לפני שחוזרים ל"רוצו"
export const STOMP_HIDE_MS = 1700 // בולדר: כמה זמן ההתפוצצות והאבק מכסים אותו (אורך הקליפ)

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// גודל על המסך לפי מרחק: 9 מ' — חצי, 4.6 מ' — רגיל, 3 מ' — גדול.
export const scaleFor = d => clamp(4.6 / Math.max(0.5, d), 0.5, 1.6)

const ELEV = {
  run: { FAR: -6, FLEE: -6, NEAR: -4 },
  shadow: { FAR: -16, FLEE: -16, NEAR: -4 },
  stomp: { FAR: -4, FLEE: -4, NEAR: -2 },
  fly: { FAR: 14, FLEE: 22, NEAR: 10 },
}

const COPY = {
  run: {
    FAR: { line: 'מהרו להתקרב לפני שהוא בורח!', sub: 'רוצו אליו!' },
    FLEE: { line: 'הוא ברח!', sub: 'מצאו אותו ורוצו שוב!' },
    NEAR: { line: 'הוא נעצר. הוא עייף.', sub: 'לחצו במסך כדי לתפוס!' },
  },
  fly: {
    FAR: { line: 'מהרו להתקרב לפני שהוא עף!', sub: 'הרימו את הטלפון ורוצו אליו!' },
    FLEE: { line: 'הוא עף!', sub: 'חפשו אותו באוויר ורוצו שוב!' },
    NEAR: { line: 'הוא מרחף מולכם.', sub: 'לחצו במסך כדי לתפוס!' },
  },
  shadow: {
    FAR: { line: 'רק הצל שלו כאן.', sub: 'עקבו אחריו על הרצפה, מהר!' },
    FLEE: { line: 'הצל חמק!', sub: 'חפשו אותו על הרצפה ורוצו שוב!' },
    NEAR: { line: 'הצל נעצר לרגליכם.', sub: 'לחצו במסך, והוא יקום!' },
  },
  stomp: {
    FAR: { line: 'התקרבו אליו. הוא כבד, אבל מהיר.', sub: 'רוצו אליו!' },
    FLEE: { line: 'הוא רקע ונעלם!', sub: 'מאחוריכם! הסתובבו!' },
    NEAR: { line: 'הוא נשאר. הקווים דולקים.', sub: 'לחצו במסך כדי לתפוס!' },
  },
}

export function makeChase({ id, target, style = 'run', copy = null }) {
  const elev = ELEV[style] || ELEV.run
  const text = copy || COPY[style] || COPY.run
  const flying = style === 'fly'

  // בריחה: לאן, וכמה רחוק. כל בריחה קצת פחות רחוקה — הוא מתעייף.
  // ציוד מהחנות: פנס (startM), נעלי ריצה (stepM), פיתיון (flees). בלי — ברירות המחדל.
  const M = s => s.mods || {}
  function flee(s, rng, t) {
    const from = s.hidden
    const n = s.flees + 1
    let to
    if (style === 'stomp') to = norm(from + rnd(rng, 150, 210))                 // מאחוריכם
    else if (style === 'shadow') to = norm(from + (rng() < 0.5 ? -1 : 1) * rnd(rng, 60, 110))
    else to = norm(from + (rng() < 0.5 ? -1 : 1) * rnd(rng, 32, 62))
    return {
      state: {
        ...s, phase: PHASE.FLEE, hidden: to, streakFrom: from, flees: n,
        // כל בריחה קצרה מהקודמת, ולא רק ב"קצת": "היא בורחת יותר מדי".
        // אחרי הבריחה השנייה הוא כבר כמעט בהישג יד.
        dist: Math.max(FLEE_AT_M + 1.4, (M(s).startM ?? START_M) - 2.9 * n), lastMoveT: t, fleeT: t,
        hiddenUntil: style === 'stomp' ? t + STOMP_HIDE_MS : 0,
        dustAt: style === 'stomp' ? from : null,
      },
      feedback: style === 'stomp' ? 'stomp' : 'flee',
    }
  }

  function settle(s, t) {
    return { state: { ...s, phase: PHASE.NEAR, ready: true, dist: 2.4, lastMoveT: t, hiddenUntil: 0, dustAt: null }, feedback: 'near' }
  }

  // הגיע קרוב: בורח, או נעצר אם כבר ברח מספיק.
  function arrived(s, rng, t) {
    if (s.flees >= (M(s).flees ?? FLEES)) return settle(s, t)
    return flee(s, rng, t)
  }

  function closer(s, m, rng, t) {
    if (s.phase === PHASE.DONE || s.phase === PHASE.NEAR) return { state: s }
    const dist = Math.max(0, s.dist - m)
    const next = { ...s, dist, lastMoveT: t }
    if (dist <= FLEE_AT_M) return arrived(next, rng, t)
    return { state: next }
  }

  return {
    id,
    style,

    start(ref, rng = Math.random, t = 0, mods = null) {
      // בצד, לא מאחור ולא מול: צריך להסתובב קצת כדי למצוא אותו.
      const side = rng() < 0.5 ? -1 : 1
      return {
        phase: PHASE.FAR, style, hidden: norm(ref + side * rnd(rng, 25, 55)),
        dist: mods?.startM ?? START_M, flees: 0, lastMoveT: t, tickT: t, fleeT: 0, startT: t,
        streakFrom: null, ready: false, hiddenUntil: 0, dustAt: null,
        mods: mods || null,
      }
    },

    targets(s, t = 0) {
      if (s.phase === PHASE.DONE) return []
      const out = []
      // בולדר מתחת לאבק: אין יצור, יש אבק במקום שבו היה.
      if (s.hiddenUntil && t < s.hiddenUntil) {
        // בגודל שבו הוא היה כשרקע — קרוב, גדול.
        if (s.dustAt != null) out.push({ id: 'dust', bearing: s.dustAt, elev: elev.FAR, kind: 'dust', passive: true, scale: scaleFor(FLEE_AT_M), at: s.fleeT })
        return out
      }
      out.push({
        id: target,
        bearing: s.hidden,
        elev: elev[s.phase] ?? elev.FAR,
        kind: 'creature',
        scale: s.phase === PHASE.NEAR ? 1.6 : scaleFor(s.dist),
        peeking: false,
        streak: s.phase === PHASE.FLEE && style !== 'stomp' ? s.streakFrom : null,
        flying,
        // צל: רק הצל שלו על הרצפה, עד שהוא נעצר וקם.
        shadow: style === 'shadow' && s.phase !== PHASE.NEAR,
        dist: s.dist,
      })
      return out
    },

    copy(s) {
      return text[s.phase] || { line: '', sub: '' }
    },

    // צעד אמיתי (מד התאוצה). זה הדלק של המרדף.
    onStep(s, t = 0, rng = Math.random) {
      return closer(s, M(s).stepM ?? STEP_M, rng, t)
    },

    // הזמן עובר: עומדים — הוא מתרחק. "הוא ברח!" חוזר ל"רוצו" אחרי רגע.
    onTick(s, t = 0) {
      if (s.phase === PHASE.DONE || s.phase === PHASE.NEAR) return s
      // tickT=0 = עוד לא תקתק: הדגימה הראשונה רק מכיילת, בלי להרחיק.
      const dt = s.tickT ? Math.max(0, t - s.tickT) / 1000 : 0
      // מרדף ארוך מדי: הוא מתעייף ונעצר, ואפשר לתפוס. זה גם הסיפור וגם
      // הרשת שמונעת מילד להישאר מול יצור שלא מתקרב לעולם.
      if (s.startT != null && t - s.startT >= TIRED_MS) return settle(s, t).state
      let next = s.tickT === t ? s : { ...s, tickT: t }
      if (s.phase === PHASE.FLEE && t - s.fleeT >= FLEE_SHOW_MS && t >= (s.hiddenUntil || 0)) {
        next = { ...next, phase: PHASE.FAR }
      }
      if (s.tickT && t - s.lastMoveT > IDLE_MS && dt > 0 && next.dist < MAX_M) {
        next = { ...next, dist: Math.min(MAX_M, next.dist + DRIFT_MPS * dt) }
      }
      return next === s ? s : next
    },

    // נעילה במבט = לחיצה. דרך נוספת, לא תנאי.
    onLock(s, tid, rng = Math.random, t = 0, opts = {}) {
      if (tid !== target) return { state: s }
      return this.onTap(s, rng, t, opts)
    },

    // לחיצה על היצור: קרוב — תופסים. רחוק — תלוי אם יש מד צעדים:
    // עם צעדים (opts.steps) הלחיצה רק מזכירה לרוץ; בלעדיהם היא מקרבת,
    // כי אחרת אין דרך להתקדם.
    onTap(s, rng = Math.random, t = 0, opts = {}) {
      if (s.phase === PHASE.NEAR) return this.onCatch(s)
      if (s.hiddenUntil && t < s.hiddenUntil) return { state: s }
      if (opts.steps) return { state: s, feedback: 'run' }
      return closer(s, TAP_M, rng, t)
    },

    onCatch(s) {
      if (s.phase !== PHASE.NEAR) return { state: s }
      return { state: { ...s, phase: PHASE.DONE }, feedback: 'catch' }
    },

    isDone: s => s.phase === PHASE.DONE,
  }
}

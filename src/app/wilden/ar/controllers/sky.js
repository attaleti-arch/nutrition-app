// ─── רוחי, ומה שהמשקפת עושה ───
// "רוחי נתפסה בלי המשקפת, לא היה למשקפת שום אפקט. היא לא התחילה מרחוק.
// מדמיינת משפט 'חפשו אותה בשמיים', לחיצה ורואים נקודה קטנה מרוחקת. ואז
// להשתמש במשקפת כדי לראות אותה טוב יותר. ואז ללחוץ ושהיא תתקרב מהשמיים
// אלינו, ואז הלרוץ ולתפוס הרגיל. או לקפוץ אליה כדי שתיתפס כי היא באוויר."
//
// זה בדיוק מה שקורה כאן. שלוש פאזות לפני המרדף הרגיל:
//   SKY    — היא נקודה גבוהה בשמיים. סורקים למעלה, ולוחצים כשמוצאים.
//   SCOPE  — המשקפת נפתחת: מסכה עגולה, והיא נראית מקרוב. בלי משקפת היא
//            נשארת נקודה, וזו הסיבה שהיא נעולה בלעדיה.
//   DIVE   — לחיצה שנייה, והיא צוללת מהשמיים אליכם. שנייה וחצי.
// ומכאן הלאה — המרדף הרגיל של chase.js, בדיוק כמו לכולם.
//
// טהור. אותו חוזה של chase.js, ועוד שדות שהבמה קוראת: scope, diveUntil.

import { makeChase, PHASE, scaleFor } from './chase.js'

export const SKY = { SKY: 'SKY', SCOPE: 'SCOPE', DIVE: 'DIVE' }
// ── כמה גבוה זה "בשמיים" ──
// הבמה מציירת יעד רק כשהוא בתוך חרוט הראייה: |dy| קטן מ-34 מעלות, כש-dy
// הוא ההפרש בין הגובה שלו לזווית שאליה הטלפון מורם. 34 בדיוק על הגבול —
// כלומר היא נראית רק אם הטלפון מורם, ולא נראית כשהוא מורם *בדיוק* אפס.
// זה הפיל את הבדיקה: היא הייתה שם, ולא היה על מה ללחוץ. 26 הוא עדיין
// למעלה (היא מצוירת ב-13% מראש המסך) אבל תמיד בתוך הפריים.
export const SKY_ELEV = 26          // כמה גבוה בשמיים (מעלות)
export const SKY_DIST_M = 30        // כמה רחוק — נקודה
export const SKY_SCALE = 0.17       // וכמה קטן
export const SCOPE_SCALE = 1.05     // דרך המשקפת
export const DIVE_MS = 1500         // כמה נמשכת הצלילה
export const SCAN_MS = 45000        // אחרי כמה זמן סריקה היא פשוט מתגלה

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)

const COPY = {
  SKY: { line: 'חפשו אותה בשמיים.', sub: 'הרימו את הטלפון וסובבו. היא רק נקודה משם.' },
  SKY_FOUND: { line: 'שם! נקודה קטנה גבוה.', sub: 'לחצו עליה כדי להסתכל במשקפת.' },
  SCOPE: { line: 'במשקפת רואים אותה.', sub: 'לחצו שוב — והיא תרד אליכם.' },
  BARE: { line: 'היא רחוקה מדי בשביל העיניים.', sub: 'בלי משקפת היא נשארת נקודה.' },
  DIVE: { line: 'היא צוללת אליכם!', sub: 'התכוננו לרוץ.' },
}

export function makeSky({ id = 'sky', target = 'creature', copy = null } = {}) {
  const base = makeChase({ id, target, style: 'fly' })
  const text = { ...COPY, ...(copy || {}) }
  const hasScope = s => !!(s.mods && s.mods.reveal)

  return {
    ...base,
    id,
    style: 'fly',

    start(ref, rng = Math.random, t = 0, mods = null) {
      const s = base.start(ref, rng, t, mods)
      // גבוה, רחוק, ובצד — צריך באמת לחפש אותה. לא יותר מדי בצד: 110
      // מעלות זה כמעט שליש סיבוב בשביל נקודה קטנה, וילד מוותר. 38 עד 85
      // מבטיח שהיא מחוץ לפריים בהתחלה (הפריים הוא 35 מעלות לכל צד) אבל
      // מרחק סיבוב אחד של הגוף.
      return { ...s, phase: SKY.SKY, dist: SKY_DIST_M, skyT: t, scope: false, diveUntil: 0,
        bigTap: true,
        hidden: norm(ref + (rng() < 0.5 ? -1 : 1) * rnd(rng, 38, 85)) }
    },

    targets(s, t = 0) {
      if (s.phase === SKY.SKY || s.phase === SKY.SCOPE || s.phase === SKY.DIVE) {
        const diving = s.phase === SKY.DIVE
        const k = diving ? Math.min(1, Math.max(0, (t - (s.diveUntil - DIVE_MS)) / DIVE_MS)) : 0
        const scale = s.phase === SKY.SCOPE ? SCOPE_SCALE
          : diving ? SKY_SCALE + (scaleFor(9) - SKY_SCALE) * k : SKY_SCALE
        return [{
          id: target, bearing: s.hidden,
          elev: diving ? SKY_ELEV * (1 - k) + 14 * k : SKY_ELEV,
          kind: 'creature', scale, flying: true, peeking: false, streak: null,
          dist: diving ? SKY_DIST_M + (9 - SKY_DIST_M) * k : SKY_DIST_M,
        }]
      }
      return base.targets(s, t)
    },

    copy(s, seen = false) {
      if (s.phase === SKY.SKY) return seen ? text.SKY_FOUND : text.SKY
      if (s.phase === SKY.SCOPE) return hasScope(s) ? text.SCOPE : text.BARE
      if (s.phase === SKY.DIVE) return text.DIVE
      return base.copy(s)
    },

    // צעדים לא מקרבים אותה כל עוד היא בשמיים — שם מחפשים, לא רצים.
    onStep(s, t = 0, rng = Math.random) {
      if (s.phase === SKY.SKY || s.phase === SKY.SCOPE || s.phase === SKY.DIVE) return { state: s }
      return base.onStep(s, t, rng)
    },

    onTick(s, t = 0) {
      if (s.phase === SKY.DIVE) {
        if (t >= s.diveUntil) return { ...s, phase: PHASE.FAR, dist: s.mods?.startM ?? 9, lastMoveT: t, tickT: t, startT: t }
        return s.tickT === t ? s : { ...s, tickT: t }
      }
      if (s.phase === SKY.SKY) {
        // רשת ביטחון: ילד שסורק ולא מוצא לא נשאר תקוע בשמיים.
        // skyT != null ולא skyT: מפגש שמתחיל ב-t=0 הוא אפס, וזה נכון.
        if (s.skyT != null && t - s.skyT >= SCAN_MS) return { ...s, phase: SKY.SCOPE, tickT: t }
        return s.tickT === t ? s : { ...s, tickT: t }
      }
      if (s.phase === SKY.SCOPE) return s.tickT === t ? s : { ...s, tickT: t }
      return base.onTick(s, t)
    },

    onLock(s, tid, rng = Math.random, t = 0, opts = {}) {
      if (tid !== target) return { state: s }
      return this.onTap(s, rng, t, opts)
    },

    onTap(s, rng = Math.random, t = 0, opts = {}) {
      // נקודה בשמיים → מסתכלים עליה (במשקפת, אם יש)
      if (s.phase === SKY.SKY) return { state: { ...s, phase: SKY.SCOPE, scope: hasScope(s), bigTap: true }, feedback: 'scope' }
      // ומהמשקפת → היא צוללת
      if (s.phase === SKY.SCOPE) {
        return { state: { ...s, phase: SKY.DIVE, scope: false, bigTap: false, diveUntil: t + DIVE_MS }, feedback: 'dive' }
      }
      if (s.phase === SKY.DIVE) return { state: s }
      return base.onTap(s, rng, t, opts)
    },

    onCatch(s) {
      if (s.phase === SKY.SKY || s.phase === SKY.SCOPE || s.phase === SKY.DIVE) return { state: s }
      return base.onCatch(s)
    },

    isDone: s => s.phase === PHASE.DONE,
  }
}

// ─── נימי · השביל שמסתבך ───
//
// הגרסה הקודמת הייתה שאלון: שלוש קבוצות, אחת "נכונה". זה עבד טכנית
// ונכשל כמשחק — הילד בוחר תשובה ואז מסתובב 360° עד שמשהו קופץ. אם ככה
// נבדוק WOW, נבדוק את המצלמה ולא את WILDEN.
//
// כאן העקבות הן מפה, לא שאלה. שביל אחד יוצא מרגלי הילד ומתפצל, וכל
// ענף הוא *משהו שנימי עשה*:
//
//   חוזרת   העקבות מסתובבות באמצע וחוזרות לאחור. הוא הסתובב כאן.
//   נעלמת   העקבות נחלשות ונפסקות. הוא קפץ.
//   רצה     הצעדים מתרחקים זה מזה וממשיכים הלאה. הוא רץ לשם.
//
// ההבחנה היא בהתנהגות ולא בסימון: כיוון הטביעות, המרווח ביניהן, והאם
// הן ממשיכות. ילד קורא את זה במבט, ואחרי ענף אחד מת הוא כבר יודע מה
// לחפש.
//
// והכי חשוב: הענף החי *מצביע לכיוון*, ונימי נמצא בקשת צרה סביבו.
// הסיבוב של הילד הוא התוצאה של מה שהוא הבין — לא סריקה עיוורת.

const PHASE = {
  TRAIL: 'TRAIL',         // קוראים את השביל
  PEEK: 'PEEK',           // הוא מציץ — בכיוון שהשביל הראה
  CHASE: 'CHASE',         // בורח, ומשאיר קו טרי
  APPROACH: 'APPROACH',   // נעצר, ומתקרב
  DONE: 'DONE',
}

export const BRANCH = { BACK: 'doubles-back', FADE: 'fades', RUN: 'runs' }

// הענפים נפרשים מראש השביל בקשת שאפשר לקרוא בסיבוב קטן — לא ב-360°.
const FAN = [-58, -20, 22, 60]
const rnd = (rng, a, b) => a + rng() * (b - a)
const norm = d => ((d % 360) + 360) % 360

export default {
  id: 'tracks-true-or-false',
  creature: 'nimi',

  start(anchor, rng = Math.random) {
    // ראש השביל מונח לפני הילד ונמוך — הוא מוריד מבט ורואה שמישהו עבר.
    const head = norm(anchor + rnd(rng, -18, 18))

    // ── הענף החי הוא תמיד החיצוני ──
    // שתי סיבות. משחקית: השבילים המתים קרובים, והחי מוביל רחוק יותר —
    // הילד באמת הולך לאנשהו. וטכנית: זה מה שמבטיח שנימי לא ייפול מול
    // הילד בפתיחה. בגרסה שבה הענף החי יכול היה להיות פנימי, הוא נחת
    // לפעמים במרחק כמה מעלות מהמבט — והיצור התקבל בלי לחפש.
    const outer = FAN.filter(a => Math.abs(a) >= 55)
    const inner = FAN.filter(a => Math.abs(a) < 55)
    const liveSlot = outer[Math.floor(rng() * outer.length)]
    const rest = [...inner, ...outer.filter(a => a !== liveSlot)]
      .sort(() => rng() - 0.5).slice(0, 2)
    const deadKinds = [BRANCH.BACK, BRANCH.FADE].sort(() => rng() - 0.5)

    const slots = [
      { a: liveSlot, kind: BRANCH.RUN },
      { a: rest[0], kind: deadKinds[0] },
      { a: rest[1], kind: deadKinds[1] },
    ].sort((x, y) => x.a - y.a)

    const branches = slots.map((sl, i) => ({
      id: 'b' + i,
      bearing: norm(head + sl.a),
      elev: -17,
      kind: sl.kind,
      live: sl.kind === BRANCH.RUN,
      dead: false,
    }))

    const live = branches.find(b => b.live)
    // ההסטה תמיד *מתרחקת* מהמבט ההתחלתי, אף פעם לא חוזרת אליו.
    const away = Math.sign(((((live.bearing - anchor) % 360) + 540) % 360) - 180) || 1
    return {
      phase: PHASE.TRAIL,
      anchor, head, branches,
      // נימי בקשת צרה סביב הכיוון שהשביל מראה. הסיבוב הוא מסקנה.
      hidden: norm(live.bearing + away * rnd(rng, 4, 26)),
      read: 0,
    }
  },

  targets(s) {
    if (s.phase === PHASE.TRAIL) {
      return [
        { id: 'head', bearing: s.head, elev: -22, kind: 'trailhead', passive: true },
        ...s.branches.filter(b => !b.dead).map(b => ({
          id: b.id, bearing: b.bearing, elev: b.elev, kind: 'trail', branch: b.kind,
        })),
      ]
    }
    if (s.phase === PHASE.DONE) return []
    return [{
      id: 'nimi',
      bearing: s.hidden,
      elev: s.phase === PHASE.APPROACH ? -3 : -8,
      kind: 'creature',
      scale: s.phase === PHASE.APPROACH ? 1.6 : s.phase === PHASE.PEEK ? 0.82 : 1,
      peeking: s.phase === PHASE.PEEK,
      // קו טרי שנשאר אחריו כשהוא בורח — שוב, כיוון ולא ניחוש.
      streak: s.phase === PHASE.CHASE ? s.streakFrom : null,
    }]
  },

  // אף פעם לא "בחר נכון". תמיד מה שרואים בשטח.
  copy(s) {
    switch (s.phase) {
      case PHASE.TRAIL:
        return s.read === 0
          ? { line: 'מישהו עבר כאן.', sub: 'השביל מתפצל. לכו לאורך אחד מהם.' }
          : { line: 'עוד יש שביל אחד.', sub: 'תראו לאן הצעדים ממשיכים.' }
      case PHASE.PEEK:
        return { line: 'משהו זז שם.', sub: 'לאט.' }
      case PHASE.CHASE:
        return { line: 'הוא ברח.', sub: 'הוא השאיר קו.' }
      case PHASE.APPROACH:
        return s.ready
          ? { line: 'עכשיו!', sub: 'תפסו אותו.' }
          : { line: 'הוא נעצר.', sub: 'כוונו אליו ולחצו לתפוס.' }
      default:
        return { line: '', sub: '' }
    }
  },

  onLock(s, id, rng = Math.random) {
    if (s.phase === PHASE.TRAIL) {
      if (id === 'head') return { state: s }        // ראש השביל הוא הזמנה, לא בחירה
      const b = s.branches.find(x => x.id === id)
      if (!b || b.dead) return { state: s }

      if (!b.live) {
        // ענף מת. לא "טעית" — ראינו מה נימי עשה כאן.
        return {
          state: {
            ...s,
            read: s.read + 1,
            branches: s.branches.map(x => (x.id === id ? { ...x, dead: true } : x)),
          },
          feedback: b.kind === BRANCH.BACK ? 'back' : 'fade',
        }
      }
      return { state: { ...s, phase: PHASE.PEEK }, feedback: 'run' }
    }

    if (s.phase === PHASE.PEEK) {
      // בורח — אבל לא לאנשהו. הקו שהוא משאיר הוא הכיוון.
      const from = s.hidden
      return {
        state: {
          ...s, phase: PHASE.CHASE, streakFrom: from,
          hidden: norm(from + (rng() < 0.5 ? -1 : 1) * rnd(rng, 52, 84)),
        },
        feedback: 'flee',
      }
    }

    if (s.phase === PHASE.CHASE) return { state: { ...s, phase: PHASE.APPROACH }, feedback: 'near' }
    // ── תפיסה ──
    // החלטה שלה, אחרי שראתה ילדים: תפיסה ולא ידידות. הנעילה על היצור
    // הקרוב לא מסיימת את המפגש — היא פותחת את רגע התפיסה. הילד צריך
    // לעשות משהו: כפתור או החלקה כלפי מעלה. onCatch סוגר.
    if (s.phase === PHASE.APPROACH) return { state: { ...s, ready: true }, feedback: s.ready ? null : 'ready' }
    return { state: s }
  },

  onCatch(s) {
    if (s.phase !== PHASE.APPROACH) return { state: s }
    return { state: { ...s, phase: PHASE.DONE }, feedback: 'catch' }
  },

  isDone: s => s.phase === PHASE.DONE,
}

export { PHASE as NIMI_PHASE }

// ─── יצור באוויר: תבנית ───
// דבשון ורוחי לא משאירים עקבות על הרצפה — הם באוויר. המפגש: משהו נשמע,
// מרימים את הטלפון, לחיצה → הוא עף למקום אחר → לחיצה → נעצר קרוב →
// לחיצה → נתפס. שלוש לחיצות, כמו נימי. מה שמשתנה בין השניים הוא רק
// הטקסט וקצת הגובה — אז זו תבנית, וכל יצור מעופף הוא כמה שורות.
//
// אותו מבנה כמו נימי (start / targets / copy / onLock / onTap / onCatch /
// isDone), כדי שהבמה לא תדע מי זה.

export const PHASE = { HUM: 'HUM', FLY: 'FLY', HOVER: 'HOVER', DONE: 'DONE' }

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)

// גובה מעל האופק. עם חיישנים הילד צריך להרים את הראש; בלי — אופקי.
const ELEV = { HUM: 16, FLY: 20, HOVER: 10 }

export function makeFlyer({ id, target, copy, elev = ELEV }) {
  return {
    id,

    start(ref, rng = Math.random) {
      // מתחיל בצד, לא מאחור: "בסוף הוא היה בניין אחרינו". צריך להסתובב
      // קצת כדי למצוא מאיפה הקול — לא להסתובב לגמרי.
      const side = rng() < 0.5 ? -1 : 1
      return { phase: PHASE.HUM, hidden: norm(ref + side * rnd(rng, 35, 70)), streakFrom: null, ready: false }
    },

    targets(s) {
      if (s.phase === PHASE.DONE) return []
      return [{
        id: target,
        bearing: s.hidden,
        elev: elev[s.phase] ?? 12,
        kind: 'creature',
        scale: s.phase === PHASE.HOVER ? 1.3 : 1,
        peeking: false,
        streak: s.phase === PHASE.FLY ? s.streakFrom : null,
        flying: true,
      }]
    },

    copy(s) {
      return copy[s.phase] || { line: '', sub: '' }
    },

    // נעילה במבט = כמו לחיצה. דרך נוספת, לא תנאי.
    onLock(s, tid, rng = Math.random) {
      if (tid !== target) return { state: s }
      return this.onTap(s, rng)
    },

    onTap(s, rng = Math.random) {
      if (s.phase === PHASE.HUM) {
        const from = s.hidden
        return {
          state: { ...s, phase: PHASE.FLY, streakFrom: from, hidden: norm(from + (rng() < 0.5 ? -1 : 1) * rnd(rng, 50, 80)) },
          feedback: 'flee',
        }
      }
      if (s.phase === PHASE.FLY) return { state: { ...s, phase: PHASE.HOVER, ready: true }, feedback: 'near' }
      if (s.phase === PHASE.HOVER) return this.onCatch(s)
      return { state: s }
    },

    onCatch(s) {
      if (s.phase !== PHASE.HOVER) return { state: s }
      return { state: { ...s, phase: PHASE.DONE }, feedback: 'catch' }
    },

    isDone: s => s.phase === PHASE.DONE,
  }
}

// ─── דבשון: הזמזום ───
// דבורה. הוא לא משאיר עקבות על הרצפה — הוא באוויר. המפגש שלו הוא זמזום
// שמתחזק כשמכוונים נכון, ואז הוא מרחף מעל הראש. שלוש לחיצות, כמו נימי:
// מרחף → לחיצה → עף למקום אחר → לחיצה → נעצר קרוב → לחיצה → נתפס.
//
// אותו מבנה כמו נימי (start / targets / copy / onLock / onTap / onCatch /
// isDone), כדי שהבמה לא תדע מי זה.

export const PHASE = { HUM: 'HUM', FLY: 'FLY', HOVER: 'HOVER', DONE: 'DONE' }

const norm = a => ((a % 360) + 360) % 360
const rnd = (rng, a, b) => a + rng() * (b - a)

// גובה מעל האופק. עם חיישנים הילד צריך להרים את הראש; בלי — אופקי.
const ELEV = { HUM: 16, FLY: 20, HOVER: 10 }

const dabashon = {
  id: 'buzz',

  start(ref, rng = Math.random) {
    // מתחיל מאחור־בצד: צריך להסתובב כדי למצוא מאיפה הזמזום
    const side = rng() < 0.5 ? -1 : 1
    return { phase: PHASE.HUM, hidden: norm(ref + side * rnd(rng, 70, 120)), streakFrom: null, ready: false }
  },

  targets(s) {
    if (s.phase === PHASE.DONE) return []
    return [{
      id: 'dabashon',
      bearing: s.hidden,
      elev: ELEV[s.phase] ?? 12,
      kind: 'creature',
      scale: s.phase === PHASE.HOVER ? 1.3 : 1,
      peeking: false,
      streak: s.phase === PHASE.FLY ? s.streakFrom : null,
      flying: true,
    }]
  },

  copy(s) {
    switch (s.phase) {
      case PHASE.HUM: return { line: 'משהו מזמזם.', sub: 'הרימו את הטלפון וחפשו באוויר. לחצו עליו!' }
      case PHASE.FLY: return { line: 'הוא עף!', sub: 'מצאו אותו שוב ולחצו עליו.' }
      case PHASE.HOVER: return { line: 'הוא מרחף מולכם.', sub: 'לחצו עליו כדי לתפוס!' }
      default: return { line: '', sub: '' }
    }
  },

  // נעילה במבט = כמו לחיצה. דרך נוספת, לא תנאי.
  onLock(s, id, rng = Math.random) {
    if (id !== 'dabashon') return { state: s }
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

export default dabashon

// ─── נימי · העקבות שמסתבכות ───
// "העקבות שלו מסתבכות עם עקבות מזויפות. הילד צריך לבחור את הסימן הנכון."
//
// חמש הפעימות מדף הדמות: עקבות ← מציץ ← בורח ← מופיע במקום אחר ← מתקרב.
// ההבדל מהגרסה הקודמת אינו קישוט: שם הילד רק מצא נקודה, וכאן הוא *פותר
// בעיה קטנה* — וזה ההבדל בין "אספתי" לבין "הוא בא איתי".
//
// ── הרמז ──
// שלוש קבוצות עקבות. שתיים נעצרות, ואחת ממשיכה הלאה ונמוגה במרחק.
// זה נקרא במבט אחד, זה הוגן, וזה נלמד אחרי טעות אחת. אין כאן ניחוש.
//
// טעות אינה עונש: הקבוצה המזויפת דוהה, נשארות פחות אפשרויות, וממשיכים.
// אין אובדן ואין ספירת ניסיונות שמוצגת לילד.

const PHASE = {
  TRACKS: 'TRACKS',       // בחר את העקבות הנכונות
  PEEK: 'PEEK',           // הוא מציץ משם
  FLEE: 'FLEE',           // ובורח למקום אחר
  APPROACH: 'APPROACH',   // הפעם הוא לא בורח
  DONE: 'DONE',
}

// זוויות ביחס למבט ההתחלתי. אף פעם לא מול הילד, ואף פעם לא מאחוריו
// לגמרי — כדי שסיבוב אחד יספיק.
const SPREAD = [-118, -44, 62, 134]

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)] }

export default {
  id: 'tracks-true-or-false',
  creature: 'nimi',

  start(anchor, rng = Math.random) {
    // שלוש קבוצות בזוויות שונות, אחת אמיתית.
    const angles = [...SPREAD].sort(() => rng() - 0.5).slice(0, 3)
    const realIdx = Math.floor(rng() * 3)
    return {
      phase: PHASE.TRACKS,
      anchor,
      realBearing: (anchor + angles[realIdx] + 360) % 360,
      targets: angles.map((a, i) => ({
        id: 't' + i,
        bearing: (anchor + a + 360) % 360,
        elev: -14,                       // עקבות על הרצפה — מסתכלים למטה
        kind: 'tracks',
        continues: i === realIdx,        // הרמז היחיד
        gone: false,
      })),
      misses: 0,
    }
  },

  // מה מוצג עכשיו
  targets(s) {
    if (s.phase === PHASE.TRACKS) return s.targets.filter(t => !t.gone)
    if (s.phase === PHASE.DONE) return []
    return [{
      id: 'nimi',
      bearing: s.creatureBearing,
      elev: s.phase === PHASE.APPROACH ? -2 : -6,
      kind: 'creature',
      scale: s.phase === PHASE.APPROACH ? 1.55 : s.phase === PHASE.PEEK ? 0.8 : 1,
      peeking: s.phase === PHASE.PEEK,
    }]
  },

  copy(s) {
    switch (s.phase) {
      case PHASE.TRACKS:
        return s.misses === 0
          ? { line: 'יש כאן יותר מסימן אחד.', sub: 'רק אחד מהם ממשיך הלאה.' }
          : { line: 'אלה נעצרות כאן.', sub: 'תחפשו את אלה שממשיכות.' }
      case PHASE.PEEK:
        return { line: 'משהו מציץ.', sub: 'אל תזוזו מהר.' }
      case PHASE.FLEE:
        return { line: 'הוא ברח.', sub: 'הוא לא רחוק.' }
      case PHASE.APPROACH:
        return { line: 'הוא לא בורח הפעם.', sub: '' }
      default:
        return { line: '', sub: '' }
    }
  },

  // הילד נעל על משהו
  onLock(s, id, rng = Math.random) {
    if (s.phase === PHASE.TRACKS) {
      const t = s.targets.find(x => x.id === id)
      if (!t) return { state: s }
      if (!t.continues) {
        // טעות. הקבוצה דוהה וממשיכים — בלי לאבד כלום.
        return {
          state: {
            ...s,
            misses: s.misses + 1,
            targets: s.targets.map(x => (x.id === id ? { ...x, gone: true } : x)),
          },
          feedback: 'wrong',
        }
      }
      return {
        state: { ...s, phase: PHASE.PEEK, creatureBearing: t.bearing },
        feedback: 'right',
      }
    }

    if (s.phase === PHASE.PEEK) {
      // בורח — אבל לא רחוק, ותמיד לצד שכבר מסתכלים אליו פחות.
      const away = pick(rng, [-95, -70, 68, 92])
      return {
        state: { ...s, phase: PHASE.FLEE, creatureBearing: (s.creatureBearing + away + 360) % 360 },
        feedback: 'flee',
      }
    }

    if (s.phase === PHASE.FLEE) {
      return { state: { ...s, phase: PHASE.APPROACH }, feedback: 'near' }
    }

    if (s.phase === PHASE.APPROACH) {
      return { state: { ...s, phase: PHASE.DONE }, feedback: 'befriend' }
    }

    return { state: s }
  },

  isDone: s => s.phase === PHASE.DONE,
}

export { PHASE as NIMI_PHASE }

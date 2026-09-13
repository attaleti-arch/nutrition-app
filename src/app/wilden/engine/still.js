// ─── גלאי הפסל ───
// "עמדו כמו פסל." כדי שזה יהיה משחק ולא תסכול, צריך להחליט בדיוק מה זה
// "לא לזוז" — וילד שנושם, ממצמץ ורועד קצת מהתרגשות *לא* זז.
//
// מד התאוצה נותן את הגודל הכולל (עם כוח המשיכה), כלומר ~9.81 כשהטלפון
// נח. מה שמעניין הוא לא הערך אלא **כמה הוא רועד**: שומרים ממוצע נע,
// ומודדים את הסטייה הממוצעת ממנו. יד יציבה של ילד — 0.1–0.3; הליכה —
// 2 ומעלה; סיבוב הטלפון — קופץ מיד.
//
// למה ממוצע נע ולא ערך מוחלט: ילד מחזיק את הטלפון בזווית שמשתנה לאט
// (הידיים מתעייפות). הזווית משנה את הפירוק לצירים אבל לא את הגודל, וגם
// סחיפה איטית של הגודל לא נחשבת רעש — רק תנודה מהירה.
//
// טהור: דגימות { t (ms), a (m/s²) } נכנסות, { still, jitter } יוצא.

export const STILL = {
  tol: 0.55,            // סטייה ממוצעת (m/s²) שמתחתיה זה "פסל"
  alpha: 0.15,          // כמה מהר הממוצע הנע רודף את הדגימה
  jitterAlpha: 0.12,    // וכמה מהר מדד הרעש מתעדכן
  graceMs: 350,         // רעש קצר (מעידה, נשימה עמוקה) לא שובר את השקט
  warmMs: 400,          // הדגימות הראשונות רק מכיילות
}

export function createStillness(cfg = {}) {
  const c = { ...STILL, ...cfg }
  let mean = null, jitter = 0, t0 = 0, lastLoud = 0, lastT = 0

  return {
    get jitter() { return jitter },
    reset() { mean = null; jitter = 0; t0 = 0; lastLoud = 0; lastT = 0 },
    // מחזיר { still, jitter, warm } — warm=false בזמן הכיול הראשון
    feed({ t, a }) {
      lastT = t
      if (mean == null) { mean = a; t0 = t; lastLoud = t; return { still: false, jitter: 0, warm: false } }
      const d = Math.abs(a - mean)
      mean += (a - mean) * c.alpha
      jitter += (d - jitter) * c.jitterAlpha
      const warm = t - t0 >= c.warmMs
      if (jitter > c.tol) lastLoud = t
      return { still: warm && t - lastLoud >= c.graceMs, jitter, warm }
    },
    // בלי דגימות (אין הרשאה, אין חיישן) אי אפשר לדעת — וזה לא "זז".
    get silent() { return mean == null },
    get lastT() { return lastT },
  }
}

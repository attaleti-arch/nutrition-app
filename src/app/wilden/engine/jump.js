// ─── זיהוי קפיצה ───
// מד התאוצה של הטלפון רואה קפיצה כחתימה בשלושה חלקים, בסדר הזה:
//   1. דחיפה — תאוצה חזקה (מעל ~1.6g) לכמה עשיריות שנייה
//   2. ריחוף — חוסר משקל: התאוצה הכוללת יורדת מתחת ל-~0.5g ל-120–500 מ"ש
//   3. נחיתה — מכה חדה
// נענוע יד מייצר דחיפות ומכות, אבל לא חוסר משקל. הריחוף הוא מה שמבדיל.
//
// טהור: מקבל דגימות { t (ms), a (m/s², כולל כוח המשיכה) } ומחזיר קפיצה
// כשמזהה. הספים ניתנים לכיוון — הם שונים מעט בין טלפונים ובין ילדים.

export const G = 9.81

export const JUMP = {
  pushG: 1.55,          // סף הדחיפה
  pushMinMs: 40,
  freefallG: 0.55,      // מתחת לזה = באוויר
  airMinMs: 110,        // פחות מזה — לא קפיצה, אולי צעד
  airMaxMs: 650,        // יותר מזה — נפילה או חיישן תקוע
  landG: 1.35,
  landWithinMs: 300,    // הנחיתה חייבת לבוא מיד אחרי הריחוף
  cooldownMs: 700,
}

export function createJumpDetector(cfg = {}) {
  const c = { ...JUMP, ...cfg }
  let phase = 'idle'
  let pushStart = 0, airStart = 0, airEnd = 0, peak = 0, lastJump = -1e9
  const reset = () => { phase = 'idle'; peak = 0 }

  return {
    get phase() { return phase },
    reset,
    // מחזיר null, או { airMs, peakG, t }
    feed({ t, a }) {
      const g = a / G
      if (t - lastJump < c.cooldownMs) return null
      switch (phase) {
        case 'idle':
          if (g >= c.pushG) { phase = 'push'; pushStart = t; peak = g }
          return null
        case 'push':
          peak = Math.max(peak, g)
          if (g <= c.freefallG) {
            if (t - pushStart < c.pushMinMs) { reset(); return null }
            phase = 'air'; airStart = t
          } else if (t - pushStart > 600) reset()          // דחיפה בלי ריחוף — לא קפיצה
          return null
        case 'air':
          if (g > c.freefallG) {
            airEnd = t
            const airMs = airEnd - airStart
            if (airMs < c.airMinMs || airMs > c.airMaxMs) { reset(); return null }
            phase = 'land'
          } else if (t - airStart > c.airMaxMs) reset()
          return null
        case 'land':
          if (g >= c.landG) {
            const airMs = airEnd - airStart
            lastJump = t
            reset()
            return { airMs, peakG: Math.round(peak * 100) / 100, t }
          }
          if (t - airEnd > c.landWithinMs) reset()
          return null
        default:
          reset(); return null
      }
    },
  }
}

// גובה משוער מזמן הריחוף: h = g·t²/8 (עלייה+ירידה). ילד: 10–30 ס"מ.
export function jumpHeightCm(airMs) {
  const t = airMs / 1000
  return Math.round((G * t * t) / 8 * 100)
}

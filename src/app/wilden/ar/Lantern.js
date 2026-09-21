'use client'
import { useEffect, useRef, useState } from 'react'

// ─── רחוב חשוך ופנס ───
// "הפנס יעשה אפקט פנס אמיתי?" — כן. וזה נכתב מחדש אחרי "חשוב לי
// שהתחושה תהיה פנס אלומת אור":
//
// מה שהיה כאן קודם היה *כתם* — עיגול בהיר בתוך חושך. פנס אמיתי הוא לא
// כתם; הוא שלושה דברים ביחד, ורק שלושתם ביחד קוראים "פנס":
//   1. האלומה באוויר — המשולש הזוהר שיוצא מהיד ומתרחב קדימה. זה מה
//      שמזהים כפנס עוד לפני שרואים על מה הוא מאיר.
//   2. הכתם על מה שמולו — חם, רחב יותר מגבוה (אור שנופל על רצפה), עם
//      ליבה בהירה ושוליים שמתרככים.
//   3. אבק שנע בתוך האלומה. בלי זה האור שטוח; איתו יש לו נפח.
// ועוד: הבהוב קל של הלהבה.
//
// ── ולמה יש כאן viewBox שנמדד ──
// הניסיון הראשון צויר ב-viewBox של 100×100 עם preserveAspectRatio="none",
// וזה מתח את הכול לגובה: הכתם יצא אליפסה עומדת, והטשטוש נמרח פי שניים
// אנכית. במסך של טלפון זה נראה כמו כתם ירוק, לא כמו אלומה. לכן המערכת
// נמדדת פעם אחת: יחידה אחת = אחוז מרוחב המסך, גם לגובה. מכאן כל המספרים
// כאן הם בפיקסלים־יחסיים אמיתיים, ועיגול הוא עיגול.
//
// hot: האלומה על היצור. אז היא מתחממת ומתחזקת — ילד מקבל אישור בלי
// לקרוא מילה.

const DUST = Array.from({ length: 16 }, (_, i) => ({
  dx: -13 + (i * 29) % 26, up: 34 + (i % 5) * 12, d: 4.5 + (i % 6) * 1.3, s: (i % 7) * 0.8, r: 0.5 + (i % 3) * 0.22,
}))

export function Lantern({ on, hot = false }) {
  const ref = useRef(null)
  const coneRef = useRef(null)
  const poolRef = useRef(null)
  const dustRef = useRef(null)
  const [vb, setVb] = useState(216)            // גובה המערכת, ביחידות של אחוז-רוחב
  // מרכז האלומה יושב על 52% מהגובה — בדיוק המרכז שסביבו הבמה מציבה יעדים.

  useEffect(() => {
    if (!on) return
    const measure = () => {
      const el = ref.current
      if (el && el.clientWidth) setVb(Math.round((el.clientHeight / el.clientWidth) * 100))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [on])

  useEffect(() => {
    if (!on || !ref.current) return
    const mid = vb * 0.52
    let raf = 0, tx = 50, ty = mid, x = 50, y = mid
    const onOrient = e => {
      const g = Math.max(-25, Math.min(25, e.gamma || 0))          // הטיה ימינה/שמאלה
      const b = Math.max(-20, Math.min(20, (e.beta || 90) - 90))   // למעלה/למטה
      // רעד יד קטן בלבד: האלומה מכוונת לאן שהטלפון מכוון, והעולם הוא
      // שזז. פנס שנודד על המסך בזמן שהמצלמה עומדת מרגיש כמו מדבקה.
      tx = 50 + g * 0.2; ty = mid - b * 0.34
    }
    const tick = () => {
      x += (tx - x) * 0.1; y += (ty - y) * 0.1
      const el = ref.current
      if (el) {
        el.style.setProperty('--lx', `${x}%`)
        el.style.setProperty('--ly', `${(y / vb) * 100}%`)
        if (coneRef.current) coneRef.current.setAttribute('points', cone(x, y, vb))
        if (poolRef.current) { poolRef.current.setAttribute('cx', x); poolRef.current.setAttribute('cy', y) }
        if (dustRef.current) dustRef.current.setAttribute('transform', `translate(${x - 50} ${y - mid})`)
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('deviceorientation', onOrient)
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('deviceorientation', onOrient); cancelAnimationFrame(raf) }
  }, [on, vb])

  if (!on) return <div style={L.dim} aria-hidden="true" />

  const mid = vb * 0.52
  return (
    <div ref={ref} style={{ ...L.wrap, '--ly': '52%' }} aria-hidden="true">
      <style>{LANTERN_CSS}</style>
      {/* 1. החושך, עם החור של הכתם */}
      <div style={{ ...L.dark, background: hot ? DARK_HOT : DARK_COLD }} />
      {/* 2. האלומה באוויר, האבק שבתוכה, והכתם עצמו */}
      <svg style={L.svg} viewBox={`0 0 100 ${vb}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="wl-cone" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFE0AE" stopOpacity={hot ? '.2' : '.15'} />
            <stop offset=".45" stopColor="#FFD79A" stopOpacity={hot ? '.17' : '.12'} />
            <stop offset="1" stopColor="#FFC97F" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="wl-pool" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#FFF6E2" stopOpacity={hot ? '.62' : '.46'} />
            <stop offset=".42" stopColor="#FFE0AE" stopOpacity={hot ? '.4' : '.28'} />
            <stop offset=".78" stopColor="#FFC97F" stopOpacity=".07" />
            <stop offset="1" stopColor="#FFC97F" stopOpacity="0" />
          </radialGradient>
          <filter id="wl-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="wl-edge" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>
        <polygon ref={coneRef} points={cone(50, mid, vb)} fill="url(#wl-cone)" filter="url(#wl-soft)" className="wildenBeam" />
        <g ref={dustRef} opacity=".65">
          {DUST.map((d, i) => (
            <circle key={i} cx={50 + d.dx} cy={mid + 14} r={d.r} fill="#FFEFD0" className="wildenMote"
              style={{ animationDuration: `${d.d}s`, animationDelay: `-${d.s}s`, '--up': `${d.up}px` }} />
          ))}
        </g>
        {/* הכתם: רחב מגבוה — כך נופל אור על רצפה */}
        <ellipse ref={poolRef} cx="50" cy={mid} rx="33" ry="16" fill="url(#wl-pool)" filter="url(#wl-edge)" />
      </svg>
      {/* 3. הפנס ביד: המקור שממנו האלומה יוצאת */}
      <div style={L.hand} className="wildenFlame" />
    </div>
  )
}

// המשולש של האלומה: מהיד (50%, מתחת למסך) אל הכתם, ומתרחב בדרך —
// צר ביציאה, רחב בקצה, בדיוק כמו אלומה אמיתית.
function cone(x, y, vb) {
  const base = vb + 8
  const w = 3                                    // חצי־רוחב ביציאה מהיד
  const W = 17 + (base - y) * 0.03               // חצי־רוחב בקצה: רחוק = רחב
  return `${50 - w},${base} ${50 + w},${base} ${x + W},${y + 3} ${x + W * 0.94},${y - 5} ${x - W * 0.94},${y - 5} ${x - W},${y + 3}`
}

// החושך: כמעט שחור בשוליים, פתוח בכתם. חם כשהאלומה על היצור.
const DARK_COLD = 'radial-gradient(ellipse 22% 6.6% at var(--lx) var(--ly), rgba(4,7,5,0) 46%, rgba(4,7,5,.34) 66%, rgba(4,7,5,.8) 84%, rgba(4,7,5,.96) 100%)'
const DARK_HOT = 'radial-gradient(ellipse 24% 7.4% at var(--lx) var(--ly), rgba(4,7,5,0) 50%, rgba(4,7,5,.3) 70%, rgba(4,7,5,.78) 86%, rgba(4,7,5,.95) 100%)'

const LANTERN_CSS = `
@keyframes wildenFlame { 0%,100% { opacity: .84 } 13% { opacity: 1 } 27% { opacity: .72 } 41% { opacity: .97 } 58% { opacity: .8 } 72% { opacity: 1 } 86% { opacity: .7 } }
@keyframes wildenMote { 0% { transform: translateY(8px); opacity: 0 } 25% { opacity: .95 } 100% { transform: translateY(calc(var(--up) * -0.12)); opacity: 0 } }
.wildenBeam { animation: wildenFlame 2.7s steps(1) infinite }
.wildenMote { animation: wildenMote 5.5s linear infinite }
@media (prefers-reduced-motion: reduce) { .wildenBeam, .wildenMote, .wildenFlame { animation: none !important } }
`

const L = {
  wrap: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, '--lx': '50%' },
  svg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  dark: { position: 'absolute', inset: 0 },
  // בלי פנס: עיגול צר ועמום. רואים שיש משהו, לא רואים מה.
  // (היה .92/.98 בקצוות — בפיילוט של 22:35 המסך היה כמעט שחור לגמרי.
  // עדיין חשוך מספיק כדי שהפנס יהיה שווה משהו, אבל רואים רחוב.)
  dim: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
    background: 'radial-gradient(circle at 50% 52%, rgba(5,8,5,.12) 0, rgba(5,8,5,.48) 22%, rgba(5,8,5,.78) 55%, rgba(5,8,5,.88) 100%)' },
  // הפנס ביד: המקור. כתם אור חם בתחתית המסך, שממנו האלומה יוצאת.
  hand: { position: 'absolute', left: '50%', bottom: -40, width: 120, height: 92, transform: 'translateX(-50%)',
    background: 'radial-gradient(ellipse at 50% 100%, rgba(255,232,180,.5) 0, rgba(255,214,140,0) 62%)' },
}

// ── כמה רחב האור, על המסך ──
// הבמה צריכה לדעת מתי היצור *בתוך* האלומה. הניסיון הראשון מדד את זה
// במעלות, וזה לא התאים למה שרואים: הבמה ממפה מעלות אופקיות ואנכיות
// בקנה מידה שונה לגמרי (1.6% מהרוחב למעלה אופקית, 1.5% מהגובה למעלה
// אנכית), ולכן "בתוך האלומה" לפי מעלות היה משהו אחר לגמרי מהאליפסה
// שמצוירת. אז המדידה היא במקום שבו הילד רואה אותה: אחוזי מסך, ואותה
// אליפסה בדיוק — עם מעט פנומברה, כי אור נגמר בהדרגה.
// הכתם שמצויר הוא rx=33 ry=16, והמבחן הולך איתו — אחרת הילד מכוון
// אור שרואים עליו ושום דבר לא קורה.
export const BEAM_RX = 34        // אחוזי רוחב מהמרכז
export const BEAM_RY = 17        // אחוזי גובה מהמרכז
export const beamHit = (dx, dy, fov) => {
  if (dx == null) return false
  const bx = (dx / (fov / 2)) * 50
  const by = dy * 1.5
  return (bx * bx) / (BEAM_RX * BEAM_RX) + (by * by) / (BEAM_RY * BEAM_RY) <= 1
}

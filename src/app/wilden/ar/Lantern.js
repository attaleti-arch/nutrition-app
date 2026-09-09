'use client'
import { useEffect, useRef } from 'react'

// ─── רחוב חשוך ופנס ───
// "הפנס יעשה אפקט פנס אמיתי?" — כן: אלומה חמה שזזה עם הטיה של הטלפון,
// מהבהבת קצת כמו להבה, וכל מה שמחוץ לה חשוך. היצור מואר רק כשהוא באלומה.
// בלי פנס: רק עיגול עמום במרכז. הכול שכבה אחת מעל המצלמה והיצור, זולה
// לצייר — משתנים של CSS, בלי רינדור מחדש של React בכל תזוזה.

export function Lantern({ on }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!on || !ref.current) return
    let raf = 0, tx = 50, ty = 52, x = 50, y = 52
    const onOrient = e => {
      const g = Math.max(-25, Math.min(25, e.gamma || 0))     // הטיה ימינה/שמאלה
      const b = Math.max(-20, Math.min(20, (e.beta || 90) - 90)) // למעלה/למטה
      tx = 50 + g * 0.6; ty = 52 - b * 0.5
    }
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12
      if (ref.current) { ref.current.style.setProperty('--lx', `${x}%`); ref.current.style.setProperty('--ly', `${y}%`) }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('deviceorientation', onOrient)
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('deviceorientation', onOrient); cancelAnimationFrame(raf) }
  }, [on])
  return (
    <div ref={ref} style={on ? L.beam : L.dim} aria-hidden="true">
      <style>{LANTERN_CSS}</style>
      {on && <div className="wildenFlame" style={L.flame} />}
      {on && <div style={L.hand} />}
    </div>
  )
}

const LANTERN_CSS = `
@keyframes wildenFlame { 0%,100% { opacity: .0 } 13% { opacity: .18 } 27% { opacity: .05 } 41% { opacity: .22 } 58% { opacity: .08 } 72% { opacity: .2 } 86% { opacity: .03 } }
@media (prefers-reduced-motion: reduce) { .wildenFlame { animation: none !important } }
`

const L = {
  // האלומה: חמה במרכז, שקופה עד ~40% מהרוחב, ואז חושך אמיתי.
  beam: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, '--lx': '50%', '--ly': '52%',
    background: 'radial-gradient(ellipse 44% 40% at var(--lx) var(--ly), rgba(255,226,160,.12) 0, rgba(255,210,130,.04) 38%, rgba(5,8,5,0) 52%, rgba(5,8,5,.72) 78%, rgba(5,8,5,.94) 100%)' },
  // בלי פנס: עיגול צר ועמום. רואים שיש משהו, לא רואים מה.
  dim: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
    background: 'radial-gradient(circle at 50% 52%, rgba(5,8,5,.15) 0, rgba(5,8,5,.6) 22%, rgba(5,8,5,.92) 55%, rgba(5,8,5,.98) 100%)' },
  // ההבהוב: שכבת אור דקה שמשנה רק שקיפות — זול, ומרגיש כמו להבה.
  flame: { position: 'absolute', inset: 0, animation: 'wildenFlame 2.7s steps(1) infinite',
    background: 'radial-gradient(ellipse 30% 26% at var(--lx) var(--ly), rgba(255,200,110,.5) 0, rgba(255,200,110,0) 100%)' },
  // הפנס ביד: כתם אור חם בתחתית, שממנו האלומה "יוצאת".
  hand: { position: 'absolute', left: '50%', bottom: -40, width: 220, height: 160, transform: 'translateX(-50%)',
    background: 'radial-gradient(ellipse at 50% 100%, rgba(255,214,140,.35) 0, rgba(255,214,140,0) 70%)' },
}

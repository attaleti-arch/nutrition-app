'use client'
import { useEffect, useRef, useState } from 'react'

// ─── הקליפ אחרי התפיסה ───
// "נראה לי שאחרי כל תפיסה נעשה סרטון Runway לדמות." הרגע שבו היצור חי:
// 5 שניות שבהן הוא עושה את מה שהוא — נימי מרחרח ומקפץ, דבשון נוחת על
// פרח. רקע כהה כמו של המשחק, וינייטה בשוליים כדי שלא יראו את המסגרת.
//
// אין קליפ → אין מסך. אף פעם לא סרטון של יצור אחר "בינתיים".
// לחיצה מדלגת. הסרטון מושתק (ספארי לא מנגן אוטומטית עם קול); הגלינג
// שלנו כבר נשמע על הבמה.

// variant: 'caught' (אחרי התפיסה) או 'reveal' (כשמגיעים לנקודה: פלאש,
// הקליפ, פלאש, ואז המצלמה נפתחת והוא ברחוב). הרעיון שלה.
export function CaughtClip({ creature, onDone, variant = 'caught' }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const [closing, setClosing] = useState(false)
  const doneRef = useRef(false)
  const reveal = variant === 'reveal'
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    if (!reveal) { onDone?.(); return }
    // פלאש יציאה, ואז המצלמה
    setClosing(true)
    setTimeout(() => onDone?.(), 420)
  }

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.play().catch(() => {})
    // אם הסרטון לא התחיל תוך 4 שניות (רשת סלולרית), לא מחזיקים את הילד.
    const bail = setTimeout(() => { if (!ready) finish() }, 4000)
    return () => clearTimeout(bail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!creature?.clip) return null
  return (
    <div style={S.wrap} dir="rtl" onClick={finish} role="button" aria-label="לדלג">
      {/* צבע מהביצה בלי קליפ משלו: הגוון על הסרטון — אלמנט אחד, מסך מלא, זול */}
      <video ref={ref} src={creature.clip} playsInline muted autoPlay preload="auto"
        onPlaying={() => setReady(true)} onEnded={finish} onError={finish}
        style={{ ...S.video, opacity: ready ? 1 : 0, filter: creature.tint || 'none' }} />
      <div style={S.vignette} />
      <div style={S.text}>
        <p style={S.name}>{creature.name}</p>
        <p style={S.sub}>{reveal ? 'הוא כאן. הביטו סביב.' : creature.brings ? `הוא מביא ${creature.brings} לעולם.` : 'הוא באוסף שלכם.'}</p>
      </div>
      {/* הפלאש: לבן-ענבר שנעלם בכניסה, וחוזר ביציאה לפני המצלמה */}
      {reveal && <div key={closing ? 'out' : 'in'} style={{ ...S.flash, animation: closing ? 'wildenFlashOut .42s ease-in forwards' : 'wildenFlashIn .6s ease-out forwards' }} />}
      <style>{CSS}</style>
      <button onClick={finish} style={S.skip}>לדלג</button>
    </div>
  )
}

// חימום מוקדם: הקליפ יורד כבר על שביל העקבות, כמו המודל.
export function usePreloadClip(src) {
  useEffect(() => {
    if (!src) return
    const ctl = new AbortController()
    fetch(src, { signal: ctl.signal }).catch(() => { /* ייטען אחר כך */ })
    return () => ctl.abort()
  }, [src])
}

const CSS = `
@keyframes wildenFlashIn { 0% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenFlashOut { 0% { opacity: 0 } 60% { opacity: 1 } 100% { opacity: 1 } }
`

const S = {
  flash: { position: 'absolute', inset: 0, background: '#FFF4D6', pointerEvents: 'none', zIndex: 7 },
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', zIndex: 3150, overflow: 'hidden' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .5s' },
  vignette: { position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 45%, rgba(15,21,15,0) 45%, rgba(15,21,15,.55) 75%, #0F150F 100%)' },
  text: { position: 'absolute', left: 0, right: 0, bottom: 48, textAlign: 'center', padding: '0 24px', pointerEvents: 'none' },
  name: { margin: 0, fontSize: 34, fontWeight: 900, color: '#E5A342', textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { margin: '6px 0 0', fontSize: 17, color: '#E9E5D8', textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  skip: { position: 'absolute', top: 18, insetInlineStart: 18, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', zIndex: 6 },
}

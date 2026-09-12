'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { useSteps } from '../hooks/useSteps'
import { sfxRumble, sfxCheer, sfxRustle, buzz } from '../engine/audio'
import { FLEE_MS, FLEE_STEPS, escaped } from '../engine/wind'

// ─── לברוח מהרוח ───
// "אם אין לו כסף, כשהיא מופיעה בהפתעה הוא צריך לברוח עם בן הלוויה שלו
// כדי שהיא לא תחטוף אותו. אם לא מצליח לברוח — בן הלוויה יישאב."
//
// חמש-עשרה שניות, עשרים ושניים צעדים. לא מסתכלים על המסך — רצים. המסך
// רק אומר כמה נשאר, והרוח מאחור גדלה ככל שהזמן אוזל. זה המסך היחיד
// במשחק שבו הילד *חייב* לרוץ, וזה בדיוק מה שהמשחק הזה רוצה.
//
// בלי מד צעדים (מחשב, או הרשאה שנדחתה): נגיעה במסך = צעד. אף ילד לא
// נשאר בלי דרך לברוח.

export function WindFlee({ buddyImg = null, buddyName = '', onDone }) {
  const steps = useSteps({ active: true })
  const [count, setCount] = useState(0)
  const [left, setLeft] = useState(FLEE_MS)
  const [go, setGo] = useState(false)
  const [lost, setLost] = useState(false)
  const startAt = useRef(0)
  const doneRef = useRef(false)
  const tapSteps = useRef(0)

  // רגע ההפתעה: קול, רטט, ואז רצים.
  useEffect(() => {
    try { sfxRumble(1.6, 0.6); buzz([90, 60, 90, 60, 140]) } catch (e) { /* */ }
    const id = setTimeout(() => { setGo(true); startAt.current = Date.now() }, 1200)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!go) return
    const id = setInterval(() => {
      const n = steps.take()
      if (n > 0) { tapSteps.current += n; try { sfxRustle() } catch (e) { /* */ } }
      const c = tapSteps.current
      setCount(c)
      const ms = Date.now() - startAt.current
      setLeft(Math.max(0, FLEE_MS - ms))
      if (doneRef.current) return
      if (c >= FLEE_STEPS) {
        doneRef.current = true
        try { sfxCheer(); buzz([40, 40, 40]) } catch (e) { /* */ }
        setTimeout(() => onDone?.(true), 900)
      } else if (ms >= FLEE_MS) {
        doneRef.current = true
        setLost(true)
        try { sfxRumble(2.2, 0.7); buzz([140, 80, 140]) } catch (e) { /* */ }
        setTimeout(() => onDone?.(false), 1600)
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, steps.take])

  const tap = () => { if (go && !doneRef.current) { tapSteps.current += 1; setCount(tapSteps.current) } }
  const pct = Math.min(1, count / FLEE_STEPS)
  const urgency = 1 - left / FLEE_MS
  const won = count >= FLEE_STEPS

  return (
    <div dir={dirOf()} style={S.wrap} onClick={tap}>
      <style>{CSS}</style>
      {/* ── היא עצמה ── מסתחררת מאחור וגדלה ככל שהזמן אוזל. וכשהזמן
          נגמר היא זונקת על המצלמה — הקליפ השני, במסך מלא. */}
      {!lost && (
        <img src="/world/wind/live.webp" alt="" draggable={false} aria-hidden="true"
          style={{ ...S.storm, opacity: won ? 0.3 : 0.5 + urgency * 0.45,
            transform: `translate(-50%,-50%) scale(${(won ? 0.7 : 1) * (0.8 + urgency * 0.8)})` }} />
      )}
      {lost && (
        <img src="/world/wind/lunge.webp" alt="" draggable={false} aria-hidden="true" style={S.lunge} />
      )}

      {!go && <p style={S.burst}>{tr('🌀 רוח!')}</p>}

      {go && !won && (
        <>
          <p style={S.line}>{tr('רוצו! היא מנסה לחטוף את {name}', { name: buddyName || tr('בן הלוויה') })}</p>
          <p style={S.sub}>{tr('עוד {n} צעדים', { n: Math.max(0, FLEE_STEPS - count) })}</p>
        </>
      )}
      {won && <p style={S.line}>{tr('ברחתם! הרוח נשארה מאחור.')}</p>}
      {lost && <p style={{ ...S.line, color: '#F0A08C' }}>{tr('היא תפסה אתכם!')}</p>}

      <div style={S.barWrap}>
        <div style={{ ...S.bar, width: `${Math.round(pct * 100)}%`, background: won ? '#8FB57C' : '#6EA8E6' }} />
      </div>
      <div style={S.clock}>
        <div style={{ ...S.clockFill, width: `${Math.round((left / FLEE_MS) * 100)}%` }} />
      </div>

      {/* בן הלוויה רץ איתך — הוא זה שעל הכף */}
      {buddyImg && (
        <img src={buddyImg} alt="" draggable={false}
          style={{ ...S.buddy, animation: go && !won ? 'wildenFleeRun .5s ease-in-out infinite' : 'none' }} />
      )}
      {!steps.live && go && <p style={S.hint}>{tr('אין מד צעדים — נגעו במסך בכל צעד.')}</p>}
    </div>
  )
}

const CSS = `
@keyframes wildenFleeRun { 0%,100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(-10px) } }
@keyframes wildenFleeIn { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: scale(1) } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, zIndex: 3200, background: 'radial-gradient(circle at 50% 40%, #1E2A38, #0C1218 70%)',
    color: '#E9E5D8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 24, textAlign: 'center', fontFamily: 'inherit', overflow: 'hidden', userSelect: 'none' },
  storm: { position: 'absolute', top: '27%', left: '50%', height: '34vh', width: 'auto',
    filter: 'drop-shadow(0 0 34px rgba(110,168,230,.55))', pointerEvents: 'none',
    transition: 'opacity .3s ease, transform .4s ease' },
  // הזינוק: היא ממלאת את המסך. זה הרגע שבו היא לוקחת את בן הלוויה.
  lunge: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
    pointerEvents: 'none', animation: 'wildenFleeIn .35s ease-out both' },
  burst: { position: 'relative', fontSize: 46, fontWeight: 900, color: '#8ED0F0', margin: 0, animation: 'wildenFleeIn .5s ease-out both' },
  line: { position: 'relative', fontSize: 25, fontWeight: 900, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,.8)' },
  sub: { position: 'relative', fontSize: 19, fontWeight: 800, color: '#8ED0F0', margin: 0 },
  barWrap: { position: 'relative', width: '100%', maxWidth: 320, height: 16, borderRadius: 999, background: 'rgba(233,229,216,.15)', overflow: 'hidden', marginTop: 6 },
  bar: { height: '100%', borderRadius: 999, transition: 'width .2s' },
  clock: { position: 'relative', width: '100%', maxWidth: 320, height: 6, borderRadius: 999, background: 'rgba(233,229,216,.12)', overflow: 'hidden' },
  clockFill: { height: '100%', background: '#E0523A', borderRadius: 999, transition: 'width .2s linear' },
  buddy: { position: 'absolute', bottom: '9%', left: '50%', transform: 'translateX(-50%)', height: '22vh', width: 'auto',
    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.5))', pointerEvents: 'none' },
  hint: { position: 'relative', fontSize: 13.5, color: '#9BA495', margin: 0 },
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { creatureById } from '../content/creatures'

// ─── מה שיצא מהרוח ───
// "חושבת שוויספר יהיה הדמות הראשונה שהרוח פלטה החוצה, והוא פשוט יסתכל
// במבט כזה מרופט, יתנער ויצאו ממנו ניצוצות, ואז יברח ברחוב (הזדמנות
// לתפוס בסיבובים הבאים)."
//
// ארבעה רגעים, בדיוק בסדר הזה, ובלי מילה מיותרת:
//   נפלט   — נזרק החוצה עם האבק, ונוחת.
//   מביט   — שנייה וחצי של מבט. כאן לא קורה כלום, וזה הרגע החשוב ביותר.
//   מתנער  — האבק עף ממנו והניצוצות יוצאים.
//   בורח   — הצידה, אל מחוץ למסך. הוא לא נתפס היום.
//
// הציור המאובק הוא שלה, וזה בדיוק אותו יצור שאפשר לתפוס אחר כך — רק
// אחרי שנים בתוך רוח.

const BEATS = [
  { id: 'out', ms: 900 },
  { id: 'look', ms: 1700 },
  { id: 'shake', ms: 1100 },
  { id: 'flee', ms: 1100 },
]
const TOTAL = BEATS.reduce((n, b) => n + b.ms, 0)

export function WhisperFreed({ id = 'whisper', onDone }) {
  const [i, setI] = useState(0)
  const c = creatureById(id)
  const timers = useRef([])
  useEffect(() => {
    let t = 0
    BEATS.forEach((b, k) => {
      t += b.ms
      if (k < BEATS.length - 1) timers.current.push(setTimeout(() => setI(k + 1), t))
    })
    timers.current.push(setTimeout(() => onDone?.(), TOTAL))
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const beat = BEATS[i].id
  const img = beat === 'flee' ? (c?.live || c?.poster) : (c?.dusty || c?.live)

  return (
    <div dir={dirOf()} style={S.wrap} aria-hidden="true">
      <style>{CSS}</style>
      <div style={{ ...S.stage, ...(ANIM[beat] || null) }}>
        <img src={img} alt="" draggable={false} style={S.fig} />
        {/* הניצוצות: יוצאים ממנו כשהוא מתנער, ולא לפני */}
        {beat === 'shake' && SPARKS.map((s, k) => (
          <span key={k} style={{ ...S.spark, left: `${s[0]}%`, top: `${s[1]}%`,
            animationDelay: `${k * 60}ms`, fontSize: s[2] }}>✨</span>
        ))}
      </div>
      <p style={S.line}>
        {beat === 'out' ? tr('משהו יצא מ{wind}…', { wind: tr('גובטבו') })
          : beat === 'look' ? tr('הוא מסתכל עליכם.')
          : beat === 'shake' ? tr('הוא מתנער — והאבק של כל השנים עף ממנו!')
          : tr('{name} ברח לרחוב. הוא שם בחוץ עכשיו.', { name: tr(c?.name || '') })}
      </p>
    </div>
  )
}

const SPARKS = [[12, 24, 26], [78, 18, 22], [30, 8, 30], [62, 40, 20], [8, 56, 24], [88, 52, 26], [46, 4, 22]]

const ANIM = {
  out: { animation: 'wildenSpitOut .9s cubic-bezier(.2,1.4,.4,1) both' },
  look: { animation: 'wildenLook 1.7s ease-in-out both' },
  shake: { animation: 'wildenShake 1.1s ease-in-out both' },
  flee: { animation: 'wildenRunOff 1.1s cubic-bezier(.5,0,.9,.4) both' },
}

const CSS = `
@keyframes wildenSpitOut { 0% { opacity: 0; transform: translate(38vw,-12vh) scale(.35) rotate(160deg) } 70% { opacity: 1; transform: translate(0,4vh) scale(1.06) rotate(-8deg) } 100% { opacity: 1; transform: translate(0,0) scale(1) rotate(0) } }
@keyframes wildenLook { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes wildenShake { 0%,100% { transform: rotate(0) } 12% { transform: rotate(-7deg) scale(1.03) } 28% { transform: rotate(7deg) scale(1.03) } 44% { transform: rotate(-6deg) } 60% { transform: rotate(6deg) } 76% { transform: rotate(-3deg) } }
@keyframes wildenRunOff { 0% { opacity: 1; transform: translateX(0) scale(1) } 25% { transform: translateX(-6vw) scale(1.02) } 100% { opacity: 0; transform: translateX(-115vw) scale(.72) } }
@keyframes wildenSparkOut { 0% { opacity: 0; transform: translate(0,0) scale(.3) } 30% { opacity: 1 } 100% { opacity: 0; transform: translate(var(--dx,0), -60px) scale(1.25) } }
@keyframes wildenFreedIn { from { opacity: 0 } to { opacity: 1 } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, zIndex: 3200, background: 'radial-gradient(circle at 50% 45%, rgba(24,31,41,.96), rgba(6,9,14,.995))',
    display: 'grid', placeItems: 'center', animation: 'wildenFreedIn .25s ease-out both', pointerEvents: 'none', overflow: 'hidden' },
  // גובה *וגם* רוחב: הדמות רחבה כמעט כמו שהיא גבוהה (אוזניים), ובלי
  // תקרת רוחב היא גלשה מהמסך בטלפון צר.
  stage: { position: 'relative', width: '100%', height: '54vh', display: 'grid', placeItems: 'center' },
  fig: { width: 'min(74vw, 380px)', height: 'auto', maxHeight: '54vh', objectFit: 'contain', display: 'block',
    filter: 'drop-shadow(0 10px 26px rgba(0,0,0,.6))' },
  spark: { position: 'absolute', animation: 'wildenSparkOut .9s ease-out both', pointerEvents: 'none' },
  line: { position: 'absolute', bottom: '13%', insetInline: 0, margin: 0, padding: '0 22px', textAlign: 'center',
    color: '#E9E5D8', fontSize: 19, fontWeight: 800, lineHeight: 1.5, textShadow: '0 3px 14px rgba(0,0,0,.85)' },
}

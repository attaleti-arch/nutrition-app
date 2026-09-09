'use client'
import { useEffect, useRef, useState } from 'react'
import { SPOTS, GUARDIAN } from './HomeWorld'
import { BUILDINGS } from '../engine/world'
import { sfxCrack, sfxAppear, sfxThud, sfxSleep, buzz } from '../engine/audio'
import { startMusic } from '../engine/music'

// ─── סרטון הפתיחה ───
// "סרטון פתיחה שמראה את כל פוטנציאל העולם המתוקן, ואז פלאש לעולם ההרוס
// ובקשה לעזור לבנות אותו." פעם אחת, בפעם הראשונה על הטלפון, לפני השם.
//
// לא סרטון מוכן אלא במה: הסרטון של העולם המתוקן שלה, ועליו היצורים והמבנים
// (תמונות קלות, לא האנימציות — זה המסך הראשון על רשת סלולרית). ואז פלאש,
// סדק, רעידה — והחורבה. הטקסט קצר: ילד בן שבע לא קורא פסקאות.
//
// לחיצה ראשונה ("להתחיל") כי בלי מגע אייפון לא משמיע כלום.
//
// ואז השומר: "אולי אחרי 'השומר כבר מחכה' פלאש, רקע שחור, ואנימציית שומר
// רוקעת ומתכווצת למקומו ונרדם." — פלאש שני, חושך, השומר ענק רוקע שלוש
// פעמים (רעידה + בום), מתכווץ אל המקום שלו בשער בזמן שהחורבה חוזרת,
// ונרדם: אבן אפורה, 💤. אז מבקשים עזרה.

const INTRO_KEY = 'wilden_intro_v1'
export const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === '1' } catch (e) { return true } }
export const markIntroSeen = () => { try { localStorage.setItem(INTRO_KEY, '1') } catch (e) { /* */ } }

const CAST = ['nimi', 'dabashon', 'gali', 'bolder', 'lumi', 'ruchi', 'noga']
const LINES_HEALED = ['היה פעם עולם.', 'מלא חיים, אור, ומים שזורמים.']
const LINES_BROKEN = ['ואז משהו נשבר.', 'היצורים ברחו. האור כבה.']

export function Intro({ onDone }) {
  const [phase, setPhase] = useState('start')   // start | healed | flash | broken | ask
  const [line, setLine] = useState(0)
  const timers = useRef([])
  const later = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const begin = () => {
    try { sfxAppear(); startMusic('magic') } catch (e) { /* */ }
    setPhase('healed'); setLine(0)
    later(3200, () => setLine(1))
    later(7000, () => {
      setPhase('flash')
      try { sfxCrack(0.9); buzz([80, 40, 120, 40, 200]); startMusic('broken') } catch (e) { /* */ }
    })
    later(7900, () => { setPhase('broken'); setLine(0) })
    later(10600, () => setLine(1))
    later(13600, () => setPhase('wait'))
    later(16200, () => { setPhase('flash2'); try { sfxCrack(0.6) } catch (e) { /* */ } })
    later(17000, () => setPhase('guardian'))
    for (const [i, t] of [17400, 18300, 19200].entries()) later(t, () => { setStomp(i + 1); try { sfxThud(1 - i * 0.15); buzz([90]) } catch (e) { /* */ } })
    later(20200, () => setPhase('settle'))
    later(21800, () => { setPhase('sleep'); try { sfxSleep() } catch (e) { /* */ } })
    later(23400, () => setPhase('ask'))
  }
  const [stomp, setStomp] = useState(0)
  const finish = () => { markIntroSeen(); onDone?.() }

  const broken = !['start', 'healed'].includes(phase)
  const guardianPhase = ['guardian', 'settle', 'sleep', 'ask'].includes(phase)
  const big = phase === 'guardian'          // ענק, על שחור, רוקע
  const asleep = phase === 'sleep' || phase === 'ask'
  return (
    <div style={I.wrap} className="wildenIntro">
      <style>{CSS}</style>
      {/* במה ביחס 3:4 שממלאת את הגובה, כמו כרטיס העולם — כך המקומות של
          היצורים והמבנים (אחוזים) נופלים בדיוק על התפאורה גם במסך צר. */}
      <div style={I.stage}>
       <div style={{ ...I.bg, animation: phase === 'healed' ? 'wildenKen 8s ease-out forwards' : 'none', transformOrigin: '50% 60%' }}>
        <img src={broken ? '/world/broken.jpg' : '/world/healed.jpg'} alt="" style={I.bg} draggable={false} />
        {phase !== 'start' && (
          <video key={broken ? 'b' : 'h'} src={broken ? '/world/broken.mp4' : '/world/healed.mp4'} poster={broken ? '/world/broken.jpg' : '/world/healed.jpg'}
            autoPlay muted loop playsInline style={I.bg} />
        )}
        {/* הפוטנציאל: היצורים והמבנים, במקומות שלהם בבית */}
        {phase === 'healed' && BUILDINGS.map(b => (
          <img key={b.id} src={b.img} alt="" draggable={false}
            style={{ ...I.item, left: `${b.spot.x}%`, top: `${b.spot.y}%`, width: `${b.spot.w}%`, animation: 'wildenPop .6s ease-out both', animationDelay: `${0.4 + (b.id.length % 4) * 0.2}s` }} />
        ))}
        {/* חושך לשומר: עולה בפלאש השני, יורד כשהוא מתיישב במקומו */}
        <div style={{ ...I.bg, background: '#000', opacity: big || phase === 'flash2' ? 1 : 0, transition: 'opacity 1.2s ease', pointerEvents: 'none', zIndex: 1 }} />
        {guardianPhase && (
          <div style={{ ...I.guardian,
            left: big ? '50%' : `${GUARDIAN.x}%`, top: big ? '96%' : `${GUARDIAN.y}%`, height: big ? '82%' : `${GUARDIAN.h}%`,
            transition: big ? 'none' : 'left 1.4s ease-in-out, top 1.4s ease-in-out, height 1.4s ease-in-out',
            animation: big && stomp ? `wildenStomp .5s ease-out ${stomp}` : 'none' }}>
            <img src="/world/guardian.webp" alt="" draggable={false} style={{ ...I.gimg, opacity: asleep ? 0 : 1 }} />
            <img src="/world/guardian-still.png" alt="" draggable={false} style={{ ...I.gimg, position: 'absolute', inset: 0, opacity: asleep ? 1 : 0, filter: 'grayscale(1) brightness(.62) contrast(.95)' }} />
            {asleep && <span style={I.zz}>💤</span>}
          </div>
        )}
        {phase === 'healed' && CAST.map((id, i) => {
          const sp = SPOTS[id]; if (!sp) return null
          return (
            <img key={id} src={`/creatures/${id}/poster.webp`} alt="" draggable={false}
              style={{ ...I.item, left: `${sp.x}%`, top: `${sp.y}%`, height: `${sp.h}%`, width: 'auto',
                animation: `wildenPop .6s ease-out both, ${sp.air ? 'wildenFloat' : 'wildenBob'} ${2.6 + i * 0.3}s ease-in-out infinite`, animationDelay: `${0.8 + i * 0.25}s, ${1.2 + i * 0.4}s` }} />
          )
        })}
       </div>
      </div>

      {broken && <div style={I.grey} />}
      {(phase === 'flash' || phase === 'flash2') && <div style={I.flash} />}
      {phase === 'flash' && <div style={I.cracks} />}

      <div style={{ ...I.text, animation: phase === 'flash' ? 'wildenShake .5s ease-out' : 'none' }}>
        {phase === 'start' && (
          <>
            <p style={I.eyebrow}>WILDEN</p>
            <button onClick={begin} style={I.cta}>להתחיל</button>
          </>
        )}
        {phase === 'healed' && <p key={'h' + line} style={I.line}>{LINES_HEALED[line]}</p>}
        {phase === 'broken' && <p key={'b' + line} style={I.line}>{LINES_BROKEN[line]}</p>}
        {phase === 'wait' && <p style={I.line}>השומר מחכה בשער.</p>}
        {phase === 'guardian' && <p style={I.line}>הוא כבד. הוא עייף.</p>}
        {(phase === 'settle' || phase === 'sleep') && <p style={I.line}>{phase === 'sleep' ? 'ונרדם.' : 'הוא חוזר למקומו…'}</p>}
        {phase === 'ask' && (
          <>
            <p style={I.line}>השומר ישן בשער.</p>
            <p style={I.sub}>תעזרו להעיר אותו ולבנות את העולם מחדש?</p>
            <button onClick={finish} style={I.cta}>אני בפנים!</button>
          </>
        )}
      </div>
      {phase !== 'start' && phase !== 'ask' && (
        <button onClick={finish} style={I.skip} aria-label="לדלג">לדלג</button>
      )}
    </div>
  )
}

const CSS = `
@keyframes wildenKen { 0% { transform: scale(1) } 100% { transform: scale(1.1) } }
@keyframes wildenPop { 0% { opacity: 0; transform: translate(-50%,-100%) scale(.6) } 100% { opacity: 1; transform: translate(-50%,-100%) scale(1) } }
@keyframes wildenBob { 0%,100% { margin-top: 0 } 50% { margin-top: -4px } }
@keyframes wildenFloat { 0%,100% { margin-top: 0 } 50% { margin-top: -10px } }
@keyframes wildenFlash { 0% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenLine { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
@keyframes wildenStomp { 0% { transform: translate(-50%,-100%) scaleY(1.06) scaleX(.96) } 30% { transform: translate(-50%,-100%) scaleY(.94) scaleX(1.06) } 55% { transform: translate(-51%,-100%) } 75% { transform: translate(-49%,-100%) } 100% { transform: translate(-50%,-100%) } }
@keyframes wildenShake { 0%,100% { transform: translate(0,0) } 15% { transform: translate(-7px,4px) } 30% { transform: translate(6px,-5px) } 45% { transform: translate(-5px,-3px) } 60% { transform: translate(4px,4px) } 80% { transform: translate(-2px,1px) } }
@media (prefers-reduced-motion: reduce) { .wildenIntro * { animation-duration: .01s !important } }
`

const I = {
  // הבמה ברוחב המסך ביחס 3:4 (כמו כרטיס העולם בבית), הטקסט מתחתיה — כלום לא נחתך.
  wrap: { position: 'fixed', inset: 0, zIndex: 4000, background: '#0F150F', overflow: 'hidden', color: '#E9E5D8', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' },
  stage: { position: 'relative', width: '100%', aspectRatio: '3 / 4', maxHeight: '68vh', overflow: 'hidden', flex: 'none', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, boxShadow: '0 10px 40px rgba(0,0,0,.6)' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  item: { position: 'absolute', transform: 'translate(-50%,-100%)', pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))' },
  grey: { position: 'absolute', top: 0, insetInline: 0, aspectRatio: '3 / 4', maxHeight: '68vh', background: 'rgba(15,21,15,.35)', pointerEvents: 'none' },
  flash: { position: 'absolute', inset: 0, background: '#fff', animation: 'wildenFlash .9s ease-out forwards', pointerEvents: 'none', zIndex: 2 },
  cracks: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', mixBlendMode: 'multiply',
    background: 'linear-gradient(115deg, transparent 49.6%, #000 49.9%, #000 50.1%, transparent 50.4%), linear-gradient(35deg, transparent 39.7%, #000 39.9%, #000 40.1%, transparent 40.3%), linear-gradient(160deg, transparent 62.7%, #000 62.9%, #000 63.1%, transparent 63.3%)' },
  guardian: { position: 'absolute', transform: 'translate(-50%,-100%)', zIndex: 2, pointerEvents: 'none', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.6))' },
  gimg: { height: '100%', width: 'auto', display: 'block', transition: 'opacity 1.2s ease' },
  zz: { position: 'absolute', top: -6, insetInlineEnd: -10, fontSize: 22, animation: 'wildenFloat 2.4s ease-in-out infinite' },
  text: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 24px max(24px, env(safe-area-inset-bottom))', textAlign: 'center', zIndex: 4 },
  eyebrow: { margin: 0, letterSpacing: 6, fontWeight: 900, color: '#E5A342', fontSize: 22 },
  line: { margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.25, textShadow: '0 2px 12px rgba(0,0,0,.8)', animation: 'wildenLine .7s ease-out both' },
  sub: { margin: 0, fontSize: 19, fontWeight: 700, color: '#E9E5D8', textShadow: '0 2px 10px rgba(0,0,0,.8)', animation: 'wildenLine .7s ease-out .3s both' },
  cta: { marginTop: 8, padding: '16px 40px', borderRadius: 999, border: 'none', background: '#E5A342', color: '#14200F', fontSize: 20, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 6px 24px rgba(229,163,66,.35)', animation: 'wildenLine .7s ease-out .6s both' },
  skip: { position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', insetInlineStart: 14, zIndex: 5, background: 'rgba(15,21,15,.55)', color: '#E9E5D8', border: '1px solid rgba(233,229,216,.3)', borderRadius: 999, padding: '6px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
}

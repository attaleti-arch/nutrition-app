'use client'
import { useEffect, useRef, useState } from 'react'
import { SPOTS, GUARDIAN } from './HomeWorld'
import { BUILDINGS } from '../engine/world'
import { sfxBreak, sfxAppear, sfxThud, sfxSleep, sfxRumble, sfxSnore, buzz } from '../engine/audio'
import { startMusic, stopMusic, primeMusic } from '../engine/music'
import { tr } from '../i18n'

// ─── הפתיחה: סיפור, לא הסבר ───
// התסריט שלה, כמעט מילה במילה:
//   1. העולם לפני — חי, והשומר בשער.
//   2. השבר — הבזק, האור כבה, היצורים בורחים.
//   3. הוא היחיד שלא ברח.
//   4. המחיר — לילה ועוד לילה, האור שבתוכו נגמר, והוא הופך לאבן.
//   5. מה יכול להעיר אותו — ארבעה סדקים: אבן, מים, ניצוץ, דבש. היצורים
//      לקחו איתם את הדרך. הם בחוץ. "תמצאו אותם."
// ואז הבית, והפסל נותן את האות הראשון: "אבן…"
//
// הבמה, לא סרטון: הסרטונים שלה של העולם, היצורים כתמונות קלות (מסך ראשון
// על רשת סלולרית), והשומר עם שני מצבים — ער ואבן. הכול בזמנים קבועים,
// ויש "לדלג". בערך 39 שניות — כל מילה מהתסריט שלה, בלי אוויר בין הרגעים.

const INTRO_KEY = 'wilden_intro_v1'
export const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === '1' } catch (e) { return true } }
export const markIntroSeen = () => { try { localStorage.setItem(INTRO_KEY, '1') } catch (e) { /* */ } }

// המקום של השומר הוא אחד, בפתיחה ובבית (ui/HomeWorld): לפני הכד, על
// אבני הריצפה. כך הוא לא מרחף, וגם לא קופץ כשהפתיחה נגמרת.
const GUARD = GUARDIAN

const CAST = ['nimi', 'dabashon', 'gali', 'bolder', 'lumi', 'ruchi', 'noga']
// לאן כל אחד בורח: הצד הקרוב של המסך
const FLEE = { nimi: [-60, 10], dabashon: [-40, -60], gali: [30, 60], bolder: [70, 20], lumi: [-70, 30], ruchi: [60, -60], noga: [-30, 70] }
const NEEDS = [
  { icon: '🪨', word: 'אבן', color: '#C9B79C', at: [38, 62] },
  { icon: '💧', word: 'מים', color: '#7CC4F0', at: [60, 48] },
  { icon: '✨', word: 'ניצוץ', color: '#F5D66B', at: [46, 36] },
  { icon: '🍯', word: 'דבש', color: '#F0A93A', at: [58, 74] },
]

// [זמן במילישניות, שלב, שורה]
// שני קליפים שלה מרנוואי: 'portal' — היצורים מתאיידים לתוך פורטל בשער (5 שנ');
// 'push' — השומר דוחף את דלתות השער לילה ועוד לילה (8 שנ'). השאר במה.
// ── הסדר של השבר ──
// "רגע אחד העולם נשבר נמצא לפני שהיצורים מתאיידים, ואז יש את השבר": השורה
// הכריזה על השבר בזמן שהיצורים עוד נעלמו, וההבזק שאחריה היה שבר שני, חלש.
// עכשיו זה רגע אחד: הפורטל נפתח, הם נעלמים, ורק אז המסך נשבר — עם המילה
// והצליל באותה שנייה.
const SCRIPT = [
  [0, 'healed', 'פעם העולם הזה היה מלא חיים.'],
  [2800, 'healed', 'ובשער עמד השומר. הוא שמר שהכול יישאר בטוח.'],
  [6200, 'portal', 'ואז, ברגע אחד…'],
  [8800, 'portal', 'והיצורים… נעלמו.'],
  [11300, 'flash', 'משהו נשבר.'],
  [13300, 'broken', 'האור כבה. המים נעצרו.'],
  [15300, 'stay', 'אבל השומר לא ברח. הוא נשאר בשער.'],
  [17500, 'push', 'הוא שמר לילה ועוד לילה…'],
  [21500, 'push', 'עד שהאור שבתוכו כמעט נגמר.'],
  [25600, 'stop', 'ואז הוא נעצר.'],
  [26800, 'stone', 'והפך לאבן.'],
  [28700, 'cracks', 'אבל הוא לא אבוד. כדי להעיר אותו, צריך להחזיר ארבעה דברים שהעולם איבד:'],
  [32100, 'needs', 'אבן. מים. ניצוץ. ודבש.'],
  [35500, 'outside', 'היצורים לקחו איתם את הדרך אליהם. והם שם בחוץ.'],
  [38900, 'eyes', 'תמצאו אותם.'],
]

export function Intro({ onDone }) {
  const [phase, setPhase] = useState('start')
  const [line, setLine] = useState('')
  const [needN, setNeedN] = useState(0)
  const timers = useRef([])
  const later = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const begin = () => {
    try { sfxAppear(); primeMusic(); startMusic('magic') } catch (e) { /* */ }
    for (const [t, ph, txt] of SCRIPT) later(t, () => { setPhase(ph); setLine(txt) })
    // הסאונד לפי התסריט שלה: קסם עד הרעם וזהו; ברגע השבר — רעד; היער ההרוס
    // מיד אחריו, חלש, עד "אני בפנים"; נחירות רכות מהרגע שהוא אבן.
    // הפורטל נפתח: רעד נמוך מתחת למוזיקה הקסומה, שקט מספיק כדי שלא ישמע
    // כמו השבר עצמו — רק אי-נוחות שגדלה.
    later(6200, () => { try { sfxRumble(5.0, 0.16) } catch (e) { /* */ } })
    // השבר: המילה, ההבזק והצליל באותה שנייה. המוזיקה הקסומה נחתכת כאן.
    later(11300, () => { try { stopMusic(0.25); sfxBreak(); buzz([120, 60, 220, 60, 300]) } catch (e) { /* */ } })
    later(12700, () => { try { startMusic('broken', 0.26) } catch (e) { /* */ } })
    for (const t of [18100, 20500, 22900]) later(t, () => { try { buzz([60]); sfxThud(0.35) } catch (e) { /* */ } })
    later(25600, () => { try { sfxThud(0.7) } catch (e) { /* */ } })
    later(26800, () => { try { sfxSleep() } catch (e) { /* */ } })
    later(28200, () => { try { sfxSnore(0.16) } catch (e) { /* */ } snores.current = setInterval(() => { try { sfxSnore(0.16) } catch (e) { /* */ } }, 3600) })
    for (let i = 0; i < 4; i++) later(32100 + i * 600, () => { setNeedN(i + 1); try { sfxAppear() } catch (e) { /* */ } })
    later(38900, () => { try { sfxAppear(); buzz([40, 30, 40]) } catch (e) { /* */ } })
  }
  const snores = useRef(null)
  useEffect(() => () => clearInterval(snores.current), [])
  const finish = () => { clearInterval(snores.current); try { stopMusic(0.5) } catch (e) { /* */ } markIntroSeen(); onDone?.() }

  const P = ['start', 'healed', 'portal', 'flash', 'broken', 'stay', 'push', 'stop', 'stone', 'cracks', 'needs', 'outside', 'eyes']
  const at = ph => P.indexOf(phase) >= P.indexOf(ph)
  const broken = at('flash')
  const stone = at('stone')
  // הזום מתחיל ברגע שהקליפ נגמר: במקום לחזור לתמונה הרחבה, נכנסים אליו.
  const zoomed = phase === 'stop' || phase === 'stone' || phase === 'cracks' || phase === 'needs'
  const fleeing = false
  const clip = phase === 'portal' ? 'portal' : phase === 'push' ? 'push' : null
  // האור של השומר: מלא עד הלילות, דועך בהם, כבוי כשהוא אבן
  const glow = phase === 'push' ? 0.5 : phase === 'stop' ? 0.2 : stone ? 0 : 1
  // הקליפים: מוכנים מראש (מושתקים, בלי קול — מותר בלי מגע), ומתנגנים כשהשלב מגיע
  const portalRef = useRef(null), pushRef = useRef(null)
  useEffect(() => {
    const v = clip === 'portal' ? portalRef.current : clip === 'push' ? pushRef.current : null
    if (!v) return
    try { v.currentTime = 0; v.play().catch(() => {}) } catch (e) { /* */ }
  }, [clip])

  return (
    <div style={I.wrap} className="wildenIntro">
      <style>{CSS}</style>
      <div style={I.stage}>
        <div style={{ ...I.bg, transformOrigin: `${GUARD.x}% ${GUARD.y - GUARD.h * 0.55}%`,
          transform: zoomed ? 'scale(2.3)' : 'scale(1)', transition: 'transform 1.4s ease-in-out' }}>
          <img src={broken ? '/world/broken.jpg' : '/world/healed.jpg'} alt="" style={I.bg} draggable={false} />
          {phase !== 'start' && (
            <video key={broken ? 'b' : 'h'} src={broken ? '/world/broken.mp4' : '/world/healed.mp4'} poster={broken ? '/world/broken.jpg' : '/world/healed.jpg'}
              autoPlay muted loop playsInline style={I.bg} />
          )}
          {/* המבנים: רק בעולם החי */}
          {(phase === 'healed' || phase === 'portal') && BUILDINGS.map(b => (
            <img key={b.id} src={b.img} alt="" draggable={false}
              style={{ ...I.item, left: `${b.spot.x}%`, top: `${b.spot.y}%`, width: `${b.spot.w}%`, animation: 'wildenPop .6s ease-out both', animationDelay: `${0.4 + (b.id.length % 4) * 0.2}s` }} />
          ))}
          {/* היצורים: בעולם החי — חיים; בשבר — מתאדים בעדינות, אחד אחרי השני, עולים
              קצת ומיטשטשים ("לא כאילו גלגלו עליהם כדור באולינג"); בסוף — צלליות */}
          {(phase === 'healed' || phase === 'portal' || at('outside')) && CAST.map((id, i) => {
            const sp = SPOTS[id]; if (!sp) return null
            const silhouette = at('outside')
            const [fx, fy] = FLEE[id]
            return (
              <img key={id} src={`/creatures/${id}/poster.webp`} alt="" draggable={false}
                style={{ ...I.item, left: `${sp.x}%`, top: `${sp.y}%`, height: `${sp.h}%`, width: 'auto',
                  '--fx': `${fx}vw`, '--fy': `${fy}vh`,
                  filter: silhouette ? 'brightness(0) blur(1px)' : I.item.filter,
                  opacity: silhouette ? 0.55 : 1,
                  animation: fleeing ? 'wildenFlee 2.2s ease-in-out both'
                    : silhouette ? `wildenPop .8s ease-out both`
                    : `wildenPop .6s ease-out both, ${sp.air ? 'wildenFloat' : 'wildenBob'} ${2.6 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: fleeing ? `${i * 0.18}s` : silhouette ? `${0.3 + i * 0.2}s` : `${0.8 + i * 0.25}s, ${1.2 + i * 0.4}s` }} />
            )
          })}
          {/* הקליפים שלה: הפורטל (היצורים מתאיידים) ודחיפת השער (לילה ועוד לילה) */}
          <video ref={portalRef} src="/world/intro/portal.mp4" muted playsInline preload="auto"
            style={{ ...I.bg, zIndex: 3, opacity: clip === 'portal' ? 1 : 0, transition: 'opacity .5s ease', pointerEvents: 'none' }} />
          {/* יציאה מהירה מהקליפ: הזום פנימה מתחיל באותו רגע, ואם הוא נשאר
              על המסך גם הקליפ נמתח איתו. */}
          <video ref={pushRef} src="/world/intro/push.mp4" muted playsInline preload="auto" poster="/world/intro/push-last.jpg"
            style={{ ...I.bg, zIndex: 3, opacity: clip === 'push' ? 1 : 0, transition: 'opacity .35s ease', pointerEvents: 'none' }} />
          {/* לילה ועוד לילה: כחול עמוק שעולה ויורד פעמיים, מעל הקליפ */}
          <div style={{ ...I.bg, background: '#060a18', opacity: 0, animation: phase === 'push' ? 'wildenNights 7.6s ease-in-out both' : 'none', pointerEvents: 'none', zIndex: 4 }} />
          {/* השומר, בשער, מהתמונה הראשונה ועד הסוף — חוץ מכשהקליפ שלו רץ */}
          {phase !== 'start' && !clip && (
            <div style={{ ...I.guardian, left: `${GUARD.x}%`, top: `${GUARD.y}%`, height: `${GUARD.h}%`,
              transform: `translate(-50%,-100%) ${phase === 'stop' || stone ? 'translateY(2%)' : ''}`,
              transition: 'transform 1.4s ease-in-out',
              animation: phase === 'nights' ? 'wildenStrain 1.8s ease-in-out infinite' : phase === 'healed' ? 'wildenBob 3.4s ease-in-out infinite' : 'none' }}>
              {/* צל על הקרקע: מה שמחבר רגליים לאדמה */}
              <div style={I.groundShadow} />
              {/* בדיוק כמו בבית, ששם הוא נראה טוב: תמונה אחת, בלי מסכות, בלי
                  רקעים, בלי פילטרים מונפשים. ער — הקליפ עם האור; אבן — הסטילס האפור. */}
              <img src="/world/guardian.webp" alt="" draggable={false} style={{ ...I.gimg, opacity: stone ? 0 : 1 }} />
              <img src="/world/guardian-still.png" alt="" draggable={false}
                style={{ ...I.gimg, position: 'absolute', inset: 0, opacity: stone ? 1 : 0, filter: 'grayscale(1) brightness(.62) contrast(.95)' }} />
              {/* האור שבתוכו: ההילה בלבד דועכת */}
              <div style={{ ...I.aura, opacity: glow * 0.8, transition: 'opacity 2.4s ease' }} />
              {/* ארבעה סדקים קטנים: אבן, מים, ניצוץ, דבש */}
              {(phase === 'cracks' || phase === 'needs') && NEEDS.map((n, i) => (
                <span key={n.word} style={{ ...I.crack, left: `${n.at[0]}%`, top: `${n.at[1]}%`, background: n.color, boxShadow: `0 0 6px 2px ${n.color}`,
                  animation: 'wildenCrackIn .5s ease-out both', animationDelay: `${0.6 + i * 0.25}s` }} />
              ))}
              {/* העיניים נדלקות לשבריר שנייה */}
              {phase === 'eyes' && <div style={I.eyes} />}
            </div>
          )}
        </div>
      </div>

      {broken && !zoomed && <div style={I.grey} />}
      {phase === 'flash' && <div style={I.flash} />}
      {phase === 'flash' && <div style={I.cracks} />}

      <div style={{ ...I.text, animation: phase === 'flash' ? 'wildenShake .5s ease-out' : 'none' }}>
        {phase === 'start' ? (
          <>
            <p style={I.eyebrow}>WILDEN</p>
            <button onClick={begin} style={I.cta}>{tr('להתחיל')}</button>
          </>
        ) : (
          <>
            <p key={line} style={I.line}>{tr(line)}</p>
            {phase === 'needs' && (
              <div style={I.needs}>
                {NEEDS.slice(0, needN).map(n => <span key={n.word} style={{ ...I.need, borderColor: n.color }}>{n.icon} {tr(n.word)}</span>)}
              </div>
            )}
            {phase === 'eyes' && <button onClick={finish} style={I.cta}>{tr('יוצאים לחפש')}</button>}
          </>
        )}
      </div>
      {phase !== 'start' && phase !== 'eyes' && (
        <button onClick={finish} style={I.skip} aria-label="לדלג">{tr('לדלג')}</button>
      )}
    </div>
  )
}

const CSS = `
@keyframes wildenPop { 0% { opacity: 0; transform: translate(-50%,-100%) scale(.6) } 100% { opacity: 1; transform: translate(-50%,-100%) scale(1) } }
@keyframes wildenFlee { 0% { opacity: 1; filter: blur(0) } 100% { opacity: 0; transform: translate(-50%,-112%); filter: blur(6px) } }
@keyframes wildenBob { 0%,100% { margin-top: 0 } 50% { margin-top: -4px } }
@keyframes wildenFloat { 0%,100% { margin-top: 0 } 50% { margin-top: -10px } }
@keyframes wildenFlash { 0% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenCracksOut { 0% { opacity: 0 } 5% { opacity: 1 } 45% { opacity: .9 } 100% { opacity: 0 } }
@keyframes wildenLine { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
@keyframes wildenNights { 0% { opacity: 0 } 22% { opacity: .62 } 45% { opacity: .05 } 70% { opacity: .68 } 100% { opacity: .1 } }
@keyframes wildenStrain { 0%,100% { margin-left: 0 } 25% { margin-left: -3px } 75% { margin-left: 3px } }
@keyframes wildenCrackIn { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.2) } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
@keyframes wildenEyes { 0% { opacity: 0 } 30% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenShake { 0%,100% { transform: translate(0,0) } 15% { transform: translate(-7px,4px) } 30% { transform: translate(6px,-5px) } 45% { transform: translate(-5px,-3px) } 60% { transform: translate(4px,4px) } 80% { transform: translate(-2px,1px) } }
@media (prefers-reduced-motion: reduce) { .wildenIntro * { animation-duration: .01s !important } }
`

const I = {
  wrap: { position: 'fixed', inset: 0, zIndex: 4000, background: '#0F150F', overflow: 'hidden', color: '#E9E5D8', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' },
  stage: { position: 'relative', width: '100%', aspectRatio: '3 / 4', maxHeight: '68vh', overflow: 'hidden', flex: 'none', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, boxShadow: '0 10px 40px rgba(0,0,0,.6)' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  item: { position: 'absolute', transform: 'translate(-50%,-100%)', pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))' },
  guardian: { position: 'absolute', zIndex: 2, pointerEvents: 'none' },
  gimg: { height: '100%', width: 'auto', display: 'block', transition: 'opacity 1.2s ease' },
  groundShadow: { position: 'absolute', left: '12%', right: '12%', bottom: '-2%', height: '7%', borderRadius: '50%', background: 'rgba(0,0,0,.5)', filter: 'blur(3px)' },
  aura: { position: 'absolute', inset: '-12%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,90,.5) 0%, rgba(245,200,90,0) 65%)', pointerEvents: 'none', zIndex: -1 },
  crack: { position: 'absolute', width: 7, height: 7, borderRadius: '50%', transform: 'translate(-50%,-50%)' },
  eyes: { position: 'absolute', left: '50%', top: '14%', width: '46%', height: '14%', transform: 'translateX(-50%)', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(255,240,180,.95) 0%, rgba(255,220,120,.4) 45%, rgba(255,220,120,0) 70%)', animation: 'wildenEyes 1.4s ease-out both' },
  grey: { position: 'absolute', top: 0, insetInline: 0, aspectRatio: '3 / 4', maxHeight: '68vh', background: 'rgba(15,21,15,.35)', pointerEvents: 'none' },
  flash: { position: 'absolute', inset: 0, background: '#fff', animation: 'wildenFlash .9s ease-out forwards', pointerEvents: 'none', zIndex: 2 },
  // הסדקים על המסך: נפתחים בבת אחת ודועכים. קודם הם נשארו קפואים כל עוד
  // ההבזק על המסך, וזה קפא ביחד עם השורה.
  cracks: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', mixBlendMode: 'multiply',
    animation: 'wildenCracksOut 2.3s ease-out forwards',
    background: 'linear-gradient(115deg, transparent 49.6%, #000 49.9%, #000 50.1%, transparent 50.4%), linear-gradient(35deg, transparent 39.7%, #000 39.9%, #000 40.1%, transparent 40.3%), linear-gradient(160deg, transparent 62.7%, #000 62.9%, #000 63.1%, transparent 63.3%)' },
  text: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 24px max(24px, env(safe-area-inset-bottom))', textAlign: 'center', zIndex: 4 },
  eyebrow: { margin: 0, letterSpacing: 6, fontWeight: 900, color: '#E5A342', fontSize: 22 },
  line: { margin: 0, fontSize: 26, fontWeight: 900, lineHeight: 1.3, textShadow: '0 2px 12px rgba(0,0,0,.8)', animation: 'wildenLine .7s ease-out both', textWrap: 'balance' },
  needs: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  need: { border: '2px solid', borderRadius: 999, padding: '6px 12px', fontSize: 16, fontWeight: 800, background: 'rgba(15,21,15,.8)', animation: 'wildenLine .4s ease-out both' },
  cta: { marginTop: 8, padding: '16px 40px', borderRadius: 999, border: 'none', background: '#E5A342', color: '#14200F', fontSize: 20, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 6px 24px rgba(229,163,66,.35)', animation: 'wildenLine .7s ease-out .6s both' },
  skip: { position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', insetInlineStart: 14, zIndex: 5, background: 'rgba(15,21,15,.55)', color: '#E9E5D8', border: '1px solid rgba(233,229,216,.3)', borderRadius: 999, padding: '6px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
}

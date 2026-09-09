'use client'
import { useEffect, useRef, useState } from 'react'
import { useModelViewer } from '../hooks/useModelViewer'
import { creatureById } from '../content/creatures'
import { variantById, tintOf } from '../engine/egg'
import { sfxCatch, sfxCheer, sfxCrack, sfxHatch, buzz } from '../engine/audio'
import { Aura } from './Aura'

// ─── הביצה בוקעת ───
// "קליפ של ביצה בוקעת, ואז פלאש, ודמות שעולה. תכניס מה שצריך — רעידות,
// קראק, פלאש ⚡️." שלושה רגעים:
//   egg      — הקליפ שלה (world/egg.mp4); בלי קליפ — הביצה המצוירת. על
//              שניהם: חמישה סדקים, כל אחד עם נקישה, רטט וזעזוע של המסך,
//              חזקים יותר בכל פעם. על המצוירת גם קווי הסדק והאור שדולף.
//   flash    — לבן, קרני אור מסתובבות, רטט ארוך, הצליל של הבקיעה.
//   creature — היצור עולה מלמטה לתוך הזוהר, ניצוצות עפים. צבע עם דמות
//              משלו (הקליפ) — הדמות; אחרת המודל עם הגוון. הצבע נקבע במנוע.

const EGG_CLIP = '/world/egg.mp4'
const EGG_FALLBACK_MS = 3400      // הביצה המצוירת: כמה זמן עד הבקיעה
const EGG_START_TIMEOUT_MS = 3000 // הסרטון לא התחיל (רשת) — ממשיכים בלעדיו
const FLASH_MS = 560
// מתי הסדקים, כחלק מאורך הביצה (סרטון או מצוירת). האחרון רגע לפני הבקיעה.
const CRACKS = [0.18, 0.4, 0.58, 0.74, 0.88]

export function Hatch({ hatched, onClose }) {
  const creature = creatureById(hatched?.creature)
  const variant = variantById(hatched?.variant)
  const art = creature?.variants?.[variant?.id] || null
  // בלי דמות לצבע: הגוון על הדמות החיה (כמו בבית ובספר), עם הילה בצבע.
  const tint = !art && creature?.live ? tintOf(variant?.id) : null
  const ready = useModelViewer(!!creature?.model && !art && !tint)
  const ref = useRef(null)
  const videoRef = useRef(null)
  const [phase, setPhase] = useState('egg')     // egg → flash → creature
  const [clip, setClip] = useState('loading')   // loading | on | off
  const [cracks, setCracks] = useState(0)       // כמה סדקים כבר
  const [shake, setShake] = useState(0)         // מונה — כל שינוי מפעיל זעזוע
  const [shown, setShown] = useState(false)
  const doneRef = useRef(false)
  const crackRef = useRef(0)

  // סדק מספר i: נקישה, רטט, זעזוע — חזקים יותר בכל פעם.
  const crackAt = i => {
    if (i < crackRef.current || doneRef.current) return
    crackRef.current = i + 1
    const k = i / (CRACKS.length - 1)
    setCracks(i + 1); setShake(s => s + 1)
    try { sfxCrack(k); buzz([25 + Math.round(55 * k)]) } catch (e) { /* לא קריטי */ }
  }

  // מהביצה לפלאש — פעם אחת, מכל מקור (סוף הסרטון, כישלון, או הביצה המצוירת).
  const hatch = () => {
    if (doneRef.current) return
    doneRef.current = true
    setPhase('flash')
    try { sfxHatch(); buzz([80, 40, 60, 40, 160]) } catch (e) { /* לא קריטי */ }
    setTimeout(() => { setPhase('creature'); try { sfxCatch() } catch (e) { /* */ } }, FLASH_MS)
    setTimeout(() => { try { sfxCheer() } catch (e) { /* */ } }, FLASH_MS + 700)
  }

  // הסרטון: מתחיל → 'on'; לא התחיל בזמן / שגיאה → 'off' והביצה המצוירת.
  useEffect(() => {
    const v = videoRef.current
    if (!v) { setClip('off'); return }
    v.play().catch(() => {})
    const bail = setTimeout(() => setClip(c => (c === 'loading' ? 'off' : c)), EGG_START_TIMEOUT_MS)
    return () => clearTimeout(bail)
  }, [])
  // הסדקים על הסרטון: לפי הזמן שלו.
  const onTime = e => {
    const v = e.currentTarget
    const f = v.currentTime / (v.duration || 5)
    for (let i = crackRef.current; i < CRACKS.length && f >= CRACKS[i]; i++) crackAt(i)
  }
  // הביצה המצוירת: אותם סדקים על שעון, ואז הבקיעה.
  useEffect(() => {
    if (clip !== 'off') return
    const ids = CRACKS.map((f, i) => setTimeout(() => crackAt(i), f * EGG_FALLBACK_MS))
    ids.push(setTimeout(hatch, EGG_FALLBACK_MS))
    return () => ids.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip])

  // הצבע על המודל (רק כשאין דמות לצבע): אחרי הטעינה, על כל החומרים.
  useEffect(() => {
    const el = ref.current
    if (!ready || !el || !variant || art) return
    const paint = () => {
      try {
        for (const m of el.model?.materials || []) {
          m.pbrMetallicRoughness.setBaseColorFactor([...variant.tint, 1])
          m.setEmissiveFactor(variant.glow)
        }
        setShown(true)
      } catch (e) { setShown(true) }
    }
    if (el.loaded) paint()
    el.addEventListener('load', paint)
    return () => el.removeEventListener('load', paint)
    // phase: האלמנט נוצר רק אחרי הפלאש. בלי זה ה-effect רץ לפני שיש ref.
  }, [ready, variant, art, phase])

  if (!creature || !variant) return null
  const name = `${creature.name} ${variant.name}`
  const rising = phase === 'creature'
  const k = cracks / CRACKS.length
  const eggLine = cracks === 0 ? 'הביצה נסדקת…' : cracks < 3 ? 'עוד סדק…' : cracks < 5 ? 'משהו זז בפנים!' : 'עכשיו!'

  return (
    <div style={S.wrap} dir="rtl">
      <div style={{ ...S.glow(variant), opacity: rising ? 1 : 0.2 + 0.5 * k }} />

      {/* הביצה: הסרטון שלה, או המצוירת. המסך מזדעזע בכל סדק (key מפעיל מחדש). */}
      {phase === 'egg' && (
        <div key={shake} style={{ ...S.stage, animation: shake ? `wildenHatchShake .38s ease-out` : 'none', '--amp': `${3 + 7 * k}px` }}>
          <video ref={videoRef} src={EGG_CLIP} muted playsInline preload="auto"
            onPlaying={() => setClip('on')} onTimeUpdate={onTime} onEnded={hatch} onError={() => setClip('off')}
            style={{ ...S.video, opacity: clip === 'on' ? 1 : 0 }} />
          {clip !== 'on' && (
            <div style={S.eggWrap}>
              <div style={{ ...S.egg, animation: `wildenEggShake ${(0.75 - 0.1 * cracks).toFixed(2)}s ease-in-out infinite` }}>
                {/* האור שדולף מהסדקים, והסדקים עצמם — נפתחים אחד אחרי השני */}
                <div style={{ ...S.leak, opacity: k }} />
                <svg viewBox="0 0 150 190" style={S.crackSvg} aria-hidden="true">
                  {CRACK_PATHS.slice(0, cracks).map((d, i) => (
                    <g key={i}>
                      <path d={d} fill="none" stroke="#FFE59A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".55" style={{ filter: 'blur(2px)' }} />
                      <path d={d} fill="none" stroke="#6B5537" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* הפלאש: לבן, וקרני אור שמסתובבות מהמרכז */}
      {phase !== 'egg' && <div style={{ ...S.rays, opacity: rising ? 0 : 0.9 }} />}
      <div style={{ ...S.flash, opacity: phase === 'flash' ? 1 : 0 }} />

      {/* ניצוצות עפים כשהיצור עולה */}
      {rising && <Sparks />}

      {/* היצור עולה */}
      {rising && art && (
        <div style={S.artWrap}>
          <div style={S.rise}>
            <Aura stage={2} size="130%" />
            <img src={art.live} alt="" draggable={false} style={S.art} />
          </div>
        </div>
      )}
      {rising && tint && (
        <div style={S.artWrap}>
          <div style={S.rise}>
            <Aura stage={2} size="130%" color={tint.aura} />
            <img src={creature.live} alt="" draggable={false} style={{ ...S.art, filter: tint.filter }} />
          </div>
        </div>
      )}
      {rising && !art && !tint && ready && creature.model && (
        <div style={S.riseFull}>
          <model-viewer ref={ref} src={creature.model}
            camera-orbit="-30deg 78deg auto" interaction-prompt="none" environment-image="neutral"
            shadow-intensity="0.7" exposure="1.1" auto-rotate auto-rotate-delay="0" rotation-per-second="18deg"
            style={{ ...S.model, opacity: shown ? 1 : 0, direction: 'ltr' }} />
        </div>
      )}
      {rising && !art && !tint && !creature.model && (
        <div style={S.artWrap}><div style={S.rise}><img src={creature.live} alt="" draggable={false} style={S.art} /></div></div>
      )}

      <div style={S.text}>
        <p style={S.eyebrow}>{rising ? 'הביצה בקעה!' : eggLine}</p>
        {rising && <p style={S.name}>{name}</p>}
        {rising && <p style={S.sub}>{variant.id === 'ice' ? 'נדיר מאוד. כמעט אף אחד לא ראה כזה.' : variant.id === 'night' ? 'נדיר. הוא זוהר בחושך.' : variant.id === 'glow' ? 'הסימנים שלו דולקים.' : 'הוא נוצץ.'}</p>}
        {rising && <button onClick={onClose} style={S.cta}>לעולם</button>}
      </div>
      <style>{CSS}</style>
    </div>
  )
}

// ניצוצות: שמונה-עשר, מהמרכז החוצה, כל אחד בזווית וגודל משלו.
function Sparks() {
  return (
    <div style={S.sparks} aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} style={{ ...S.spark, '--a': `${i * 20 + (i % 2) * 7}deg`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4,
          animationDelay: `${(i % 4) * 60}ms`, animationDuration: `${0.9 + (i % 3) * 0.25}s` }} />
      ))}
    </div>
  )
}

// קווי הסדק על הביצה המצוירת (150×190), מהראש כלפי מטה.
const CRACK_PATHS = [
  'M78 12 L84 30 L76 44',
  'M76 44 L88 58 L80 76 L92 90',
  'M84 30 L64 40 L58 60 L44 68',
  'M92 90 L100 108 L88 124',
  'M58 60 L52 86 L62 104 L50 126',
]

const CSS = `
@keyframes wildenEggShake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-7deg) } 40% { transform: rotate(6deg) } 60% { transform: rotate(-4deg) } 80% { transform: rotate(3deg) } }
@keyframes wildenHatchShake { 0%,100% { transform: translate(0,0) } 20% { transform: translate(calc(var(--amp) * -1), calc(var(--amp) * .6)) } 45% { transform: translate(var(--amp), calc(var(--amp) * -.5)) } 70% { transform: translate(calc(var(--amp) * -.5), calc(var(--amp) * .3)) } }
@keyframes wildenGlowIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes wildenRise { 0% { opacity: 0; transform: translateY(18%) scale(.6) } 60% { opacity: 1; transform: translateY(-3%) scale(1.04) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes wildenRays { 0% { transform: translate(-50%,-50%) rotate(0deg) scale(.4) } 100% { transform: translate(-50%,-50%) rotate(40deg) scale(1.3) } }
@keyframes wildenSpark { 0% { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1 } 100% { transform: rotate(var(--a)) translateY(-44vh) scale(.15); opacity: 0 } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', zIndex: 3200, overflow: 'hidden' },
  glow: v => ({ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'opacity .8s ease-out',
    background: `radial-gradient(circle at 50% 42%, rgba(${Math.round(v.tint[0] * 160)},${Math.round(v.tint[1] * 160)},${Math.round(v.tint[2] * 160)},.45), rgba(15,21,15,0) 60%)` }),
  stage: { position: 'absolute', inset: 0 },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .4s' },
  flash: { position: 'absolute', inset: 0, background: '#FFF6DC', pointerEvents: 'none', transition: 'opacity .5s ease-out', zIndex: 3 },
  rays: { position: 'absolute', left: '50%', top: '42%', width: '220vmax', height: '220vmax', borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
    background: 'repeating-conic-gradient(from 0deg, rgba(255,240,200,0) 0deg 7deg, rgba(255,236,190,.45) 7deg 10deg)',
    maskImage: 'radial-gradient(circle, rgba(0,0,0,1), rgba(0,0,0,0) 55%)', WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1), rgba(0,0,0,0) 55%)',
    animation: 'wildenRays 1.6s ease-out both', transition: 'opacity 1.2s ease-out' },
  eggWrap: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  egg: { position: 'relative', width: 150, height: 190, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
    background: 'radial-gradient(circle at 38% 30%, #FFF8E4, #E9DCC0 55%, #B9A98A)',
    boxShadow: '0 20px 40px rgba(0,0,0,.5), inset -10px -14px 24px rgba(0,0,0,.12)', transformOrigin: '50% 90%', overflow: 'hidden' },
  leak: { position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(circle at 55% 45%, rgba(255,214,110,.85), rgba(255,214,110,0) 65%)', transition: 'opacity .3s' },
  crackSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  sparks: { position: 'absolute', left: '50%', top: '40%', width: 0, height: 0, zIndex: 3, pointerEvents: 'none' },
  spark: { position: 'absolute', left: -4, top: -4, borderRadius: '50%', background: 'radial-gradient(circle, #FFF6DC, #FFD84A 60%, rgba(255,216,74,0))',
    boxShadow: '0 0 10px rgba(255,216,74,.8)', animation: 'wildenSpark 1s ease-out both', transformOrigin: 'center' },
  artWrap: { position: 'absolute', left: 0, right: 0, top: '8%', height: '56%', display: 'grid', placeItems: 'center', zIndex: 2 },
  rise: { position: 'relative', height: '100%', width: 'fit-content', animation: 'wildenRise 1.1s cubic-bezier(.2,.8,.3,1.1) both' },
  riseFull: { position: 'absolute', inset: 0, zIndex: 2, animation: 'wildenRise 1.1s cubic-bezier(.2,.8,.3,1.1) both' },
  art: { position: 'relative', zIndex: 1, height: '100%', width: 'auto', display: 'block' },
  model: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity .6s' },
  text: { position: 'absolute', left: 0, right: 0, bottom: 40, padding: '0 24px', textAlign: 'center', zIndex: 4 },
  eyebrow: { margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.14em', color: '#E5A342' },
  name: { margin: '6px 0 0', fontSize: 34, fontWeight: 900, color: '#E9E5D8', textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { margin: '6px 0 0', fontSize: 16, color: '#C3C8BA' },
  cta: { marginTop: 18, padding: '15px 40px', borderRadius: 13, border: 'none', background: '#E5A342',
    color: '#14200F', fontFamily: 'inherit', fontSize: 17.5, fontWeight: 800, cursor: 'pointer' },
}

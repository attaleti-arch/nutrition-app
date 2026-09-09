'use client'
import { useEffect, useRef, useState } from 'react'
import { useModelViewer } from '../hooks/useModelViewer'
import { creatureById } from '../content/creatures'
import { variantById } from '../engine/egg'
import { sfxCatch, sfxFinish, buzz } from '../engine/audio'
import { Aura } from './Aura'

// ─── הביצה בוקעת ───
// "קליפ של ביצה בוקעת, ואז פלאש, ודמות שעולה." שלושה רגעים:
//   egg      — הקליפ שלה של הביצה (world/egg.mp4). אין קליפ / לא נטען →
//              הביצה המצוירת רועדת, כמו קודם. אף פעם לא מסך ריק.
//   flash    — לבן, חצי שנייה, עם הצליל.
//   creature — היצור עולה מלמטה, גדל, זוהר. צבע עם דמות משלו (הקליפ) —
//              הדמות עצמה; אחרת המודל עם הגוון. הצבע נקבע במנוע; כאן רק מציירים.

const EGG_CLIP = '/world/egg.mp4'
const EGG_FALLBACK_MS = 1600      // הביצה המצוירת: כמה זמן רועדת
const EGG_START_TIMEOUT_MS = 3000 // הסרטון לא התחיל (רשת) — ממשיכים בלעדיו
const FLASH_MS = 520

export function Hatch({ hatched, onClose }) {
  const creature = creatureById(hatched?.creature)
  const variant = variantById(hatched?.variant)
  const art = creature?.variants?.[variant?.id] || null
  const ready = useModelViewer(!!creature?.model && !art)
  const ref = useRef(null)
  const videoRef = useRef(null)
  const [phase, setPhase] = useState('egg')     // egg → flash → creature
  const [clip, setClip] = useState('loading')   // loading | on | off
  const [shown, setShown] = useState(false)
  const doneRef = useRef(false)

  // מהביצה לפלאש — פעם אחת, מכל מקור (סוף הסרטון, כישלון, או הביצה המצוירת).
  const crack = () => {
    if (doneRef.current) return
    doneRef.current = true
    setPhase('flash')
    try { sfxFinish(); buzz([40, 60, 40, 140]) } catch (e) { /* לא קריטי */ }
    setTimeout(() => { setPhase('creature'); try { sfxCatch() } catch (e) { /* */ } }, FLASH_MS)
  }

  // הסרטון: מתחיל → 'on'; לא התחיל בזמן / שגיאה → 'off' והביצה המצוירת.
  useEffect(() => {
    const v = videoRef.current
    if (!v) { setClip('off'); return }
    v.play().catch(() => {})
    const bail = setTimeout(() => setClip(c => (c === 'loading' ? 'off' : c)), EGG_START_TIMEOUT_MS)
    return () => clearTimeout(bail)
  }, [])
  // הביצה המצוירת: שנייה וחצי של רעידה, ואז הסדק.
  useEffect(() => {
    if (clip !== 'off') return
    const id = setTimeout(crack, EGG_FALLBACK_MS)
    return () => clearTimeout(id)
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

  return (
    <div style={S.wrap} dir="rtl">
      <div style={{ ...S.glow(variant), opacity: rising ? 1 : 0.35 }} />

      {/* הביצה: הסרטון שלה, או המצוירת */}
      {phase === 'egg' && (
        <>
          <video ref={videoRef} src={EGG_CLIP} muted playsInline preload="auto"
            onPlaying={() => setClip('on')} onEnded={crack} onError={() => setClip('off')}
            style={{ ...S.video, opacity: clip === 'on' ? 1 : 0 }} />
          {clip !== 'on' && (
            <div style={S.eggWrap}>
              <div style={S.egg} />
            </div>
          )}
        </>
      )}

      <div style={{ ...S.flash, opacity: phase === 'flash' ? 1 : 0 }} />

      {/* היצור עולה */}
      {rising && art && (
        <div style={S.artWrap}>
          <div style={S.rise}>
            <Aura stage={2} size="130%" />
            <img src={art.live} alt="" draggable={false} style={S.art} />
          </div>
        </div>
      )}
      {rising && !art && ready && creature.model && (
        <div style={S.riseFull}>
          <model-viewer ref={ref} src={creature.model}
            camera-orbit="-30deg 78deg auto" interaction-prompt="none" environment-image="neutral"
            shadow-intensity="0.7" exposure="1.1" auto-rotate auto-rotate-delay="0" rotation-per-second="18deg"
            style={{ ...S.model, opacity: shown ? 1 : 0, direction: 'ltr' }} />
        </div>
      )}
      {rising && !art && !creature.model && (
        <div style={S.artWrap}><div style={S.rise}><img src={creature.live} alt="" draggable={false} style={S.art} /></div></div>
      )}

      <div style={S.text}>
        <p style={S.eyebrow}>{rising ? 'הביצה בקעה!' : 'הביצה נסדקת…'}</p>
        {rising && <p style={S.name}>{name}</p>}
        {rising && <p style={S.sub}>{variant.id === 'ice' ? 'נדיר מאוד. כמעט אף אחד לא ראה כזה.' : variant.id === 'night' ? 'נדיר. הוא זוהר בחושך.' : variant.id === 'glow' ? 'הסימנים שלו דולקים.' : 'הוא נוצץ.'}</p>}
        {rising && <button onClick={onClose} style={S.cta}>לעולם</button>}
      </div>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@keyframes wildenEggShake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-7deg) } 40% { transform: rotate(6deg) } 60% { transform: rotate(-4deg) } 80% { transform: rotate(3deg) } }
@keyframes wildenGlowIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes wildenRise { 0% { opacity: 0; transform: translateY(18%) scale(.6) } 60% { opacity: 1; transform: translateY(-3%) scale(1.04) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', zIndex: 3200, overflow: 'hidden' },
  glow: v => ({ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'opacity 1.2s ease-out',
    background: `radial-gradient(circle at 50% 42%, rgba(${Math.round(v.tint[0] * 160)},${Math.round(v.tint[1] * 160)},${Math.round(v.tint[2] * 160)},.45), rgba(15,21,15,0) 60%)` }),
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .4s' },
  flash: { position: 'absolute', inset: 0, background: '#FFF6DC', pointerEvents: 'none', transition: 'opacity .5s ease-out', zIndex: 3 },
  eggWrap: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  egg: { width: 150, height: 190, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
    background: 'radial-gradient(circle at 38% 30%, #FFF8E4, #E9DCC0 55%, #B9A98A)',
    boxShadow: '0 20px 40px rgba(0,0,0,.5), inset -10px -14px 24px rgba(0,0,0,.12)',
    animation: 'wildenEggShake .6s ease-in-out infinite', transformOrigin: '50% 90%' },
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

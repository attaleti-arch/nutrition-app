'use client'
import { useEffect, useRef, useState } from 'react'
import { useModelViewer } from '../hooks/useModelViewer'
import { creatureById } from '../content/creatures'
import { variantById } from '../engine/egg'
import { sfxCatch, buzz } from '../engine/audio'

// ─── הביצה בוקעת ───
// מסך אחד, רגע אחד: הביצה נסדקת, ומתוכה יוצא יצור שהילד כבר מכיר — בצבע
// שהוא לא ראה. אותו מודל, צבע וזוהר על החומרים. הצבע נקבע בהגרלה במנוע;
// כאן רק מציירים.

export function Hatch({ hatched, onClose }) {
  const creature = creatureById(hatched?.creature)
  const variant = variantById(hatched?.variant)
  const ready = useModelViewer(!!creature?.model)
  const ref = useRef(null)
  const [cracked, setCracked] = useState(false)
  const [shown, setShown] = useState(false)

  // הסדק: שנייה וחצי של ביצה רועדת, ואז היצור.
  useEffect(() => {
    const id = setTimeout(() => { setCracked(true); try { sfxCatch(); buzz([40, 60, 40, 140]) } catch (e) { /* לא קריטי */ } }, 1600)
    return () => clearTimeout(id)
  }, [])

  // הצבע: אחרי שהמודל נטען, על כל החומרים.
  useEffect(() => {
    const el = ref.current
    if (!ready || !el || !variant) return
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
  }, [ready, variant])

  if (!creature || !variant) return null
  const name = `${creature.name} ${variant.name}`

  return (
    <div style={S.wrap} dir="rtl">
      <div style={S.glow(variant)} />
      {!cracked && (
        <div style={S.eggWrap}>
          <div style={S.egg} />
        </div>
      )}
      {cracked && ready && creature.model && (
        <model-viewer ref={ref} src={creature.model}
          camera-orbit="-30deg 78deg auto" interaction-prompt="none" environment-image="neutral"
          shadow-intensity="0.7" exposure="1.1" auto-rotate auto-rotate-delay="0" rotation-per-second="18deg"
          style={{ ...S.model, opacity: shown ? 1 : 0, direction: 'ltr' }} />
      )}
      <div style={S.text}>
        <p style={S.eyebrow}>{cracked ? 'הביצה בקעה!' : 'הביצה נסדקת…'}</p>
        {cracked && <p style={S.name}>{name}</p>}
        {cracked && <p style={S.sub}>{variant.id === 'ice' ? 'נדיר מאוד. כמעט אף אחד לא ראה כזה.' : variant.id === 'night' ? 'נדיר. הוא זוהר בחושך.' : 'הוא נוצץ.'}</p>}
        {cracked && <button onClick={onClose} style={S.cta}>לעולם</button>}
      </div>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@keyframes wildenEggShake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-7deg) } 40% { transform: rotate(6deg) } 60% { transform: rotate(-4deg) } 80% { transform: rotate(3deg) } }
@keyframes wildenGlowIn { from { opacity: 0 } to { opacity: 1 } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', zIndex: 3200, overflow: 'hidden' },
  glow: v => ({ position: 'absolute', inset: 0, pointerEvents: 'none', animation: 'wildenGlowIn 1.2s ease-out',
    background: `radial-gradient(circle at 50% 42%, rgba(${Math.round(v.tint[0] * 160)},${Math.round(v.tint[1] * 160)},${Math.round(v.tint[2] * 160)},.45), rgba(15,21,15,0) 60%)` }),
  eggWrap: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  egg: { width: 150, height: 190, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
    background: 'radial-gradient(circle at 38% 30%, #FFF8E4, #E9DCC0 55%, #B9A98A)',
    boxShadow: '0 20px 40px rgba(0,0,0,.5), inset -10px -14px 24px rgba(0,0,0,.12)',
    animation: 'wildenEggShake .6s ease-in-out infinite', transformOrigin: '50% 90%' },
  model: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity .6s' },
  text: { position: 'absolute', left: 0, right: 0, bottom: 40, padding: '0 24px', textAlign: 'center' },
  eyebrow: { margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.14em', color: '#E5A342' },
  name: { margin: '6px 0 0', fontSize: 34, fontWeight: 900, color: '#E9E5D8', textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { margin: '6px 0 0', fontSize: 16, color: '#C3C8BA' },
  cta: { marginTop: 18, padding: '15px 40px', borderRadius: 13, border: 'none', background: '#E5A342',
    color: '#14200F', fontFamily: 'inherit', fontSize: 17.5, fontWeight: 800, cursor: 'pointer' },
}

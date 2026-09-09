'use client'
import { useEffect, useState } from 'react'
import { creatureById } from '../content/creatures'
import { staged, stagedName, grewVerb, stageInfo, lookOf } from '../engine/stages'
import { sfxCheer, sfxFinish, buzz } from '../engine/audio'
import { Aura } from './Aura'
import { Wear } from './Wear'

// ─── ההתפתחות ───
// אחרי הפורטל, כמו הביצה: היצור הקטן עומד, האור מתחזק עד שהמסך לבן,
// ומתוכו יוצא הגדול. Runway לא יודע להפוך דמות לדמות — הרגע הזה שלנו.
// evolved: [{ id, from, to }]; מראים אחד אחרי השני.

export function Evolve({ evolved, wearAll = {}, progress = null, onClose }) {
  const [i, setI] = useState(0)
  const ev = evolved?.[i]
  const base = creatureById(ev?.id)
  const [phase, setPhase] = useState('before')   // before → flash → after
  useEffect(() => {
    if (!ev) return
    setPhase('before')
    const t1 = setTimeout(() => { setPhase('flash'); try { sfxFinish(); buzz([60, 40, 120]) } catch (e) { /* */ } }, 1500)
    const t2 = setTimeout(() => { setPhase('after'); try { sfxCheer() } catch (e) { /* */ } }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [i, ev])
  if (!ev || !base) return null
  const look = lookOf(progress, base)
  const from = staged(base, ev.from, look), to = staged(base, ev.to, look)
  const cur = phase === 'after' ? to : from
  const next = () => (i + 1 < evolved.length ? setI(i + 1) : onClose?.())
  const gold = ev.to >= 3
  return (
    <div style={E.wrap} dir="rtl">
      <div style={{ ...E.glow, opacity: phase === 'before' ? 0.35 : 1, background: gold ? E.goldBg : E.tealBg }} />
      <div style={{ ...E.flash, opacity: phase === 'flash' ? 1 : 0 }} />
      <div style={{ ...E.stage, transform: `scale(${phase === 'after' ? 1 : 0.72})`, filter: phase === 'flash' ? 'brightness(3)' : 'none' }}>
        <div style={{ position: 'relative', height: '100%', width: 'fit-content' }}>
          {cur.auraColor ? <Aura stage={cur.stage} size="120%" color={cur.auraColor} /> : <Aura stage={cur.stage} size="120%" />}
          <img src={cur.live || cur.sprites?.hero} alt="" draggable={false} style={{ position: 'relative', zIndex: 1, height: '100%', width: 'auto', display: 'block', filter: cur.tint || 'none' }} />
          <Wear id={base.id} wear={wearAll?.[base.id]} anchors={cur.anchors} />
        </div>
      </div>
      <div style={E.text}>
        <p style={E.eyebrow}>{phase === 'after' ? (gold ? 'אגדי!' : `${base.name} ${grewVerb(base)}!`) : 'משהו קורה…'}</p>
        {phase === 'after' && <p style={E.name}>{stagedName(base, ev.to)}</p>}
        {phase === 'after' && <p style={E.sub}>{gold ? 'השלב האחרון. כמעט אף אחד לא הגיע לכאן.' : `שלב ${ev.to} מ־3. ${stageInfo(3).need} תפיסות — והוא אגדי.`}</p>}
        {phase === 'after' && <button onClick={next} style={E.cta}>{i + 1 < evolved.length ? 'הבא' : 'לעולם'}</button>}
      </div>
    </div>
  )
}

const E = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', zIndex: 3200, overflow: 'hidden' },
  tealBg: 'radial-gradient(circle at 50% 45%, rgba(110,230,200,.5), rgba(15,21,15,0) 62%)',
  goldBg: 'radial-gradient(circle at 50% 45%, rgba(255,214,110,.55), rgba(15,21,15,0) 62%)',
  glow: { position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'opacity 1.4s ease-in' },
  flash: { position: 'absolute', inset: 0, background: '#FFF6DC', pointerEvents: 'none', transition: 'opacity .5s ease-out', zIndex: 3 },
  stage: { position: 'absolute', left: 0, right: 0, top: '10%', height: '50%', display: 'grid', placeItems: 'center', transition: 'transform .9s cubic-bezier(.2,.8,.3,1.2), filter .4s', zIndex: 2 },
  text: { position: 'absolute', left: 0, right: 0, bottom: 40, padding: '0 24px', textAlign: 'center', zIndex: 4 },
  eyebrow: { margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '.1em', color: '#E5A342' },
  name: { margin: '6px 0 0', fontSize: 34, fontWeight: 900, color: '#E9E5D8', textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { margin: '6px 0 0', fontSize: 16, color: '#C3C8BA' },
  cta: { marginTop: 18, padding: '15px 40px', borderRadius: 13, border: 'none', background: '#E5A342', color: '#14200F', fontFamily: 'inherit', fontSize: 17.5, fontWeight: 800, cursor: 'pointer' },
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { useMotion } from '../hooks/useMotion'
import { createJumpDetector, jumpHeightCm, G } from '../engine/jump'

// ─── מטבע הזהב: קופצים ───
// מגיעים לנקודה, המצלמה נפתחת, מטבע זהב גדול מרחף מעל המדרכה ומסתובב.
// "קפצו ותפסו אותו!" הילד קופץ, הטלפון ביד, המטבע עף למונה. עומדים במקום.
//
// המטבע הוא CSS, לא מודל: עיגול מסתובב עם ברק. זול, בלי WebGL, ונראה
// כמו מטבע. אם אין מד תאוצה (או שלא אושר) — אחרי כמה שניות אפשר גם
// ללחוץ עליו. אף ילד לא נשאר בלי הזהב שלו.

const TAP_AFTER_MS = 9000

export function GoldStage({ value = 10, onTaken, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cam, setCam] = useState('starting')
  const [jumped, setJumped] = useState(null)         // { airMs, peakG }
  const [peakG, setPeakG] = useState(1)
  const [phase, setPhase] = useState('idle')
  const [canTap, setCanTap] = useState(false)
  const det = useRef(createJumpDetector())
  const doneRef = useRef(false)

  // ── המצלמה ── (אותו דפוס כמו הבמה הראשית: הווידאו תמיד בדף)
  useEffect(() => {
    let dead = false, settled = false
    const giveUp = setTimeout(() => { if (!dead && !settled) { settled = true; setCam('none') } }, 7000)
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera')
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (dead || settled) { s.getTracks().forEach(t => t.stop()); return }
        settled = true; streamRef.current = s
        const v = videoRef.current
        if (v) { v.srcObject = s; v.play().catch(() => {}) }
        setCam('on')
      } catch (e) { if (!settled) { settled = true; setCam('none') } }
    })()
    return () => { dead = true; clearTimeout(giveUp); streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // ── הקפיצה ──
  const finish = res => {
    if (doneRef.current) return
    doneRef.current = true
    setJumped(res)
    setTimeout(() => onTaken?.(res), 1300)
  }
  const motion = useMotion({
    active: !jumped,
    onSample: s => {
      setPeakG(p => Math.max(p * 0.97, s.a / G))
      const r = det.current.feed(s)
      if (det.current.phase !== phase) setPhase(det.current.phase)
      if (r) finish(r)
    },
  })

  useEffect(() => {
    const id = setTimeout(() => setCanTap(true), TAP_AFTER_MS)
    return () => clearTimeout(id)
  }, [])

  const askNeeded = motion.needsAsk && motion.perm === 'unknown'

  return (
    <div style={S.wrap}>
      <video ref={videoRef} playsInline muted autoPlay style={{ ...S.video, opacity: cam === 'on' ? 1 : 0 }} />
      {cam !== 'on' && <div style={S.backdrop} />}

      {/* המטבע */}
      <div style={S.coinWrap}>
        <button aria-label="מטבע הזהב" disabled={!canTap && !jumped} onClick={() => canTap && finish({ airMs: 0, peakG: 0, tapped: true })}
          style={{ ...S.coinBtn, ...(jumped ? S.coinTaken : {}) }}>
          <div style={{ ...S.coin, animation: jumped ? 'none' : 'wildenSpin 2.2s linear infinite' }}>
            <div style={S.coinFace}>W</div>
          </div>
        </button>
        {!jumped && <div style={S.sparkle} />}
      </div>

      {askNeeded && (
        <div style={S.ask}>
          <p style={S.askLine}>מטבע זהב! כדי לקפוץ אליו, הטלפון צריך להרגיש את הקפיצה.</p>
          <button onClick={motion.request} style={S.askBtn}>אפשר לי לקפוץ</button>
        </div>
      )}

      <div style={S.hint}>
        {jumped ? (
          <>
            <p style={S.big}>+{value} 🪙</p>
            <p style={S.sub}>{jumped.tapped ? 'הזהב שלכם.' : `קפיצה של ${jumpHeightCm(jumped.airMs)} ס״מ!`}</p>
          </>
        ) : (
          <>
            <p style={S.big}>קפצו ותפסו אותו!</p>
            <p style={S.sub}>
              {motion.perm === 'none' ? 'בטלפון הזה אין מד תאוצה — עוד רגע אפשר ללחוץ עליו.'
                : motion.live ? 'הטלפון ביד, ו… קפיצה!'
                : 'מחכים לחיישן…'}
            </p>
            {canTap && <p style={S.sub}>או פשוט ללחוץ על המטבע.</p>}
          </>
        )}
        {/* מד כיוון: מה החיישן רואה. לבדיקה עם הבן שלה. */}
        <p style={S.meter}>
          חיישן: {motion.live ? 'פעיל' : motion.perm} · שיא {peakG.toFixed(2)}g · {phase}
        </p>
      </div>

      <button onClick={onClose} style={S.back}>אחר כך</button>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@keyframes wildenSpin { from { transform: rotateY(0deg) } to { transform: rotateY(360deg) } }
@keyframes wildenFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
@keyframes wildenSparkle { 0%,100% { opacity: .35; transform: scale(.9) } 50% { opacity: .8; transform: scale(1.15) } }
@keyframes wildenTaken { 0% { transform: scale(1) translateY(0); opacity: 1 } 100% { transform: scale(.25) translateY(-60vh); opacity: 0 } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', overflow: 'hidden', zIndex: 3100, direction: 'rtl' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  backdrop: { position: 'absolute', inset: 0, background: 'linear-gradient(#25402F, #4A5F3C 58%, #6B7248)' },
  coinWrap: { position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)',
    animation: 'wildenFloat 2.4s ease-in-out infinite', perspective: 600 },
  coinBtn: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  coin: { width: 150, height: 150, borderRadius: '50%', transformStyle: 'preserve-3d',
    background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #FFD84A 55%, #B8860B)',
    boxShadow: 'inset 0 0 0 9px rgba(184,134,11,.55), 0 10px 30px rgba(0,0,0,.45), 0 0 40px rgba(255,216,74,.5)',
    display: 'grid', placeItems: 'center' },
  coinFace: { fontSize: 78, fontWeight: 900, color: 'rgba(160,110,10,.85)', fontFamily: 'Georgia, serif',
    textShadow: '0 1px 0 rgba(255,255,255,.5)' },
  coinTaken: { animation: 'wildenTaken .9s ease-in forwards' },
  sparkle: { position: 'absolute', inset: -40, borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,230,120,.45), rgba(255,230,120,0) 65%)',
    animation: 'wildenSparkle 1.6s ease-in-out infinite' },
  ask: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12,
    background: 'rgba(15,21,15,.82)', padding: 24, textAlign: 'center', zIndex: 5 },
  askLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0 },
  askBtn: { padding: '13px 26px', borderRadius: 12, border: 'none', background: '#E5A342', color: '#14200F',
    fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 34, padding: '0 22px', textAlign: 'center' },
  big: { color: '#FFD84A', fontSize: 30, fontWeight: 900, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { color: '#E9E5D8', fontSize: 16, margin: '6px 0 0', textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  meter: { color: '#9BA495', fontSize: 12.5, margin: '12px 0 0', fontFamily: 'ui-monospace, monospace' },
  back: { position: 'absolute', top: 18, insetInlineStart: 18, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', zIndex: 6 },
}

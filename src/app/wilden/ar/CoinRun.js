'use client'
import { useEffect, useRef, useState } from 'react'
import { useOrient, angleDelta } from '../hooks/useOrient'
import { useSteps } from '../hooks/useSteps'
import { useCamera } from '../hooks/useCamera'
import { camText } from '../engine/camera'
import { sfxCoin, sfxCheer, sfxFinish, sfxCount, buzz } from '../engine/audio'
import * as CR from '../engine/coinRun'

// ─── ריצת המטבעות: הבמה ───
// עשרים שניות. שביל מטבעות באוויר לפני הילד, הצעדים מקדמים, המבט אוסף.
// הגבוהים דורשים להרים את היד. הכול ב-engine/coinRun.js; כאן רק ציור,
// חיישנים, וקול.
//
// בלי מד תאוצה (מחשב, או הרשאה שנדחתה): לחיצה על המסך = שני צעדים.
// בלי מצפן: סליידר, כמו בבמה הראשית. אף ילד לא נשאר בלי הריצה שלו.

const FOV = 62
const TICK = 120

export function CoinRun({ onDone, onClose }) {
  const camera = useCamera()
  const { videoRef } = camera
  const cam = camera.state
  const { heading, pitch, perm, needsAsk, request } = useOrient({ active: true })
  const steps = useSteps({ active: true })
  const hasSensors = heading != null
  const [swipe, setSwipe] = useState(0)
  const live = hasSensors ? heading : swipe
  const pitchNow = hasSensors ? pitch : null

  const [s, setS] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [pop, setPop] = useState(null)         // מטבע שנאסף עכשיו: +1 שקופץ
  const [countdown, setCountdown] = useState(3) // 3, 2, 1, רוצו!
  const anchored = useRef(false)
  const doneRef = useRef(false)

  // עוגן: הכיוון שאליו הטלפון מכוון כשמתחילים, אחרי הספירה לאחור.
  useEffect(() => {
    if (countdown > 0) return
    if (anchored.current) return
    const ref = heading != null ? heading : (needsAsk && perm === 'unknown' ? null : 0)
    if (ref == null) return
    anchored.current = true
    setS(CR.startRun(ref, Math.random, Date.now()))
  }, [countdown, heading, needsAsk, perm])

  // 3, 2, 1
  useEffect(() => {
    if (countdown < 0) return
    try { sfxCount(countdown); if (countdown === 0) buzz([60, 30, 60]) } catch (e) { /* לא קריטי */ }
    if (countdown === 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 900)
    return () => clearTimeout(id)
  }, [countdown])

  // הדופק: צעדים, זמן, ומבט
  const liveRef = useRef(live); liveRef.current = live
  const pitchRef = useRef(pitchNow); pitchRef.current = pitchNow
  useEffect(() => {
    if (!s || s.done) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      const n = steps.take()
      setS(prev => {
        if (!prev || prev.done) return prev
        let next = prev
        for (let i = 0; i < n; i++) next = CR.onStep(next, t)
        const a = CR.aim(next, liveRef.current, pitchRef.current, t)
        if (a.got.length) {
          next = a.state
          try { sfxCoin(a.got.some(c => c.value > 1)); buzz([30]) } catch (e) { /* לא קריטי */ }
          setPop({ t, n: a.got.reduce((x, c) => x + c.value, 0) })
        }
        return CR.tick(next, t)
      })
    }, TICK)
    return () => clearInterval(id)
  }, [s?.done, s == null, steps.take])

  // נגמר: רגע של סיכום, ואז החוצה עם מה שנאסף
  useEffect(() => {
    if (!s?.done || doneRef.current) return
    doneRef.current = true
    try { sfxFinish(); if (s.got >= 8) sfxCheer(); buzz([60, 40, 60]) } catch (e) { /* לא קריטי */ }
    const id = setTimeout(() => onDone?.(CR.summary(s)), 2200)
    return () => clearTimeout(id)
  }, [s?.done])

  const askNeeded = (needsAsk && perm === 'unknown') || (steps.needsAsk && steps.perm === 'unknown')
  const askAll = () => { request(); steps.request() }
  const onTapScreen = () => { if (!steps.live && s && !s.done) setS(prev => (prev && !prev.done ? CR.onTap(prev, Date.now()) : prev)) }

  const visible = s ? CR.visibleCoins(s) : []
  const left = s ? CR.timeLeftMs(s, now) : CR.DURATION_MS
  const sum = s?.done ? CR.summary(s) : null

  return (
    <div style={S.wrap} onClick={onTapScreen}>
      <video ref={videoRef} playsInline muted autoPlay style={{ ...S.video, opacity: cam === 'on' ? 1 : 0 }} />
      {cam !== 'on' && <div style={S.backdrop} />}
      {cam === 'off' && camera.canRetry && (
        <div style={S.camNote}>
          {camText(camera.reason).t}
          <button onClick={e => { e.stopPropagation(); camera.retry() }} style={S.camRetry}>לנסות לפתוח מצלמה</button>
        </div>
      )}
      <style>{CSS}</style>

      {askNeeded && (
        <div style={S.ask} onClick={e => e.stopPropagation()}>
          <p style={S.askLine}>ריצת מטבעות! הטלפון צריך להרגיש את הצעדים ולדעת לאן הוא מכוון.</p>
          <button onClick={askAll} style={S.askBtn}>אפשר לי לרוץ</button>
        </div>
      )}

      {/* הספירה לאחור */}
      {countdown > 0 && !askNeeded && (
        <div style={S.center}><p style={S.count}>{countdown}</p><p style={S.countSub}>מוכנים לרוץ?</p></div>
      )}

      {/* המטבעות: כל אחד במקום שלו על המסך לפי הכיוון והגובה, וגדל כשמתקרב */}
      {s && !s.done && visible.map(c => {
        const dx = angleDelta(live, c.bearing)
        const dy = hasSensors ? c.elev - (pitch || 0) : 0
        if (dx == null || Math.abs(dx) > FOV / 2 + 6 || Math.abs(dy) > 36) return null
        const sc = CR.coinScale(c.rel)
        const size = 96 * sc
        const inReach = c.rel <= CR.REACH_M
        return (
          <div key={c.id} style={{ ...S.coinAt, left: `${50 + (dx / (FOV / 2)) * 50}%`, top: `${52 - dy * 1.5}%`,
            opacity: Math.max(0.55, 1 - Math.abs(dx) / 70) }} aria-hidden="true">
            <div style={{ width: size, height: size, perspective: 500 }}>
              <div style={{ ...S.coin, width: size, height: size, animation: `wildenSpin ${c.high ? 1.4 : 2}s linear infinite`,
                boxShadow: inReach ? '0 0 34px rgba(255,216,74,.9), inset 0 0 0 6px rgba(184,134,11,.55)' : S.coin.boxShadow,
                background: c.value > 1 ? 'radial-gradient(circle at 35% 30%, #FFFFFF, #FFE68A 45%, #C9961A)' : S.coin.background }}>
                <span style={{ ...S.face, fontSize: size * 0.5 }}>{c.value > 1 ? '2' : 'W'}</span>
              </div>
            </div>
            {c.high && c.rel < 7 && <span style={S.upHint}>⬆</span>}
          </div>
        )
      })}

      {/* +1 קופץ */}
      {pop && <div key={pop.t} style={S.pop}>+{pop.n}</div>}

      {/* HUD: זמן, מונה */}
      {s && !s.done && (
        <>
          <div style={S.timer}>
            <div style={S.timerBar}><div style={{ ...S.timerFill, width: `${(left / CR.DURATION_MS) * 100}%`, background: left < 5000 ? '#E0523A' : '#E5A342' }} /></div>
            <span style={S.timerNum}>{Math.ceil(left / 1000)}</span>
          </div>
          <div style={S.score}>🪙 {s.got}</div>
          <div style={S.hint}>
            <p style={S.big}>רוצו! אספו כמה שיותר!</p>
            <p style={S.sub}>{steps.live ? 'רוצו קדימה וכוונו את הטלפון למטבע. גבוה? הרימו יד!'
              : steps.perm === 'none' || steps.perm === 'denied' ? 'בטלפון הזה אין מד צעדים: לחצו על המסך כדי לרוץ.'
              : 'מחכים לחיישן… בינתיים לחצו על המסך כדי לרוץ.'}</p>
            {!hasSensors && (
              <input type="range" min="0" max="359" value={swipe} aria-label="סריקה" onClick={e => e.stopPropagation()}
                onChange={e => setSwipe(Number(e.target.value))} style={S.scan} />
            )}
          </div>
        </>
      )}

      {sum && (
        <div style={S.center}>
          <p style={S.big}>{sum.value >= 12 ? 'וואו!' : sum.value >= 6 ? 'יפה מאוד!' : 'כל הכבוד!'}</p>
          <p style={S.result}>🪙 {sum.value}</p>
          <p style={S.sub}>{sum.taken} מתוך {sum.total} מטבעות</p>
        </div>
      )}

      <button onClick={e => { e.stopPropagation(); onClose?.() }} style={S.back}>אחר כך</button>
    </div>
  )
}

const CSS = `
@keyframes wildenSpin { from { transform: rotateY(0deg) } to { transform: rotateY(360deg) } }
@keyframes wildenPop { 0% { transform: translate(-50%,-50%) scale(.6); opacity: 0 } 20% { transform: translate(-50%,-50%) scale(1.3); opacity: 1 } 100% { transform: translate(-50%,-140%) scale(1); opacity: 0 } }
@keyframes wildenCountIn { 0% { transform: scale(1.6); opacity: 0 } 30% { transform: scale(1); opacity: 1 } 100% { opacity: 1 } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', overflow: 'hidden', zIndex: 3100, direction: 'rtl', WebkitTapHighlightColor: 'transparent' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  backdrop: { position: 'absolute', inset: 0, background: 'linear-gradient(#25402F, #4A5F3C 58%, #6B7248)' },
  camNote: { position: 'absolute', top: 72, insetInline: 16, zIndex: 5, margin: 0, padding: '8px 12px',
    borderRadius: 10, background: 'rgba(15,21,15,.7)', color: '#C3C8BA', fontSize: 13, lineHeight: 1.5, textAlign: 'center' },
  camRetry: { display: 'block', margin: '8px auto 0', padding: '8px 16px', borderRadius: 999, border: 'none',
    background: '#E5A342', color: '#14200F', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  coinAt: { position: 'absolute', transform: 'translate(-50%,-50%)', transition: 'left .12s linear, top .12s linear', pointerEvents: 'none', display: 'grid', justifyItems: 'center' },
  coin: { borderRadius: '50%', transformStyle: 'preserve-3d', display: 'grid', placeItems: 'center',
    background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #FFD84A 55%, #B8860B)',
    boxShadow: 'inset 0 0 0 6px rgba(184,134,11,.55), 0 6px 18px rgba(0,0,0,.45), 0 0 18px rgba(255,216,74,.45)' },
  face: { fontWeight: 900, color: 'rgba(160,110,10,.85)', fontFamily: 'Georgia, serif', textShadow: '0 1px 0 rgba(255,255,255,.5)' },
  upHint: { marginTop: 4, color: '#FFD84A', fontSize: 22, fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,.7)' },
  pop: { position: 'absolute', left: '50%', top: '46%', color: '#FFD84A', fontSize: 44, fontWeight: 900, pointerEvents: 'none',
    textShadow: '0 2px 14px rgba(0,0,0,.8)', animation: 'wildenPop .9s ease-out forwards', zIndex: 4 },
  timer: { position: 'absolute', top: 20, insetInline: 70, display: 'flex', alignItems: 'center', gap: 10, zIndex: 4 },
  timerBar: { flex: 1, height: 12, borderRadius: 999, background: 'rgba(15,21,15,.6)', overflow: 'hidden', border: '1px solid rgba(233,229,216,.3)' },
  timerFill: { height: '100%', borderRadius: 999, transition: 'width .12s linear' },
  timerNum: { color: '#E9E5D8', fontSize: 22, fontWeight: 900, minWidth: 34, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,.8)', fontVariantNumeric: 'tabular-nums' },
  score: { position: 'absolute', top: 64, insetInlineEnd: 16, padding: '6px 14px', borderRadius: 999, background: '#E5A342', color: '#14200F',
    fontWeight: 900, fontSize: 20, boxShadow: '0 3px 12px rgba(0,0,0,.35)', zIndex: 4 },
  center: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 4, textAlign: 'center', zIndex: 3, pointerEvents: 'none' },
  count: { margin: 0, color: '#FFD84A', fontSize: 120, fontWeight: 900, lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,.8)', animation: 'wildenCountIn .9s ease-out' },
  countSub: { margin: 0, color: '#E9E5D8', fontSize: 20, fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  result: { margin: 0, color: '#FFD84A', fontSize: 64, fontWeight: 900, textShadow: '0 4px 24px rgba(0,0,0,.8)' },
  ask: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12,
    background: 'rgba(15,21,15,.82)', padding: 24, textAlign: 'center', zIndex: 5 },
  askLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0 },
  askBtn: { padding: '13px 26px', borderRadius: 12, border: 'none', background: '#E5A342', color: '#14200F',
    fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 34, padding: '0 22px', textAlign: 'center', zIndex: 3 },
  big: { color: '#FFD84A', fontSize: 28, fontWeight: 900, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  sub: { color: '#E9E5D8', fontSize: 15.5, margin: '6px 0 0', textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  scan: { width: '100%', maxWidth: 320, marginTop: 12, accentColor: '#E5A342', pointerEvents: 'auto' },
  back: { position: 'absolute', top: 18, insetInlineStart: 18, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', zIndex: 6 },
}

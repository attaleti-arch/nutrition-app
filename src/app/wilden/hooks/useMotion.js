'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── מד התאוצה ───
// אותו כלל כמו הכיוון באייפון: ההרשאה חייבת לצאת מלחיצה של המשתמש.
// מדווח החוצה דגימות { t, a } כש-a הוא גודל התאוצה הכוללת (עם כוח המשיכה).

export function useMotion({ active, onSample }) {
  const [perm, setPerm] = useState('unknown')     // unknown | granted | denied | none
  const needsAsk = typeof DeviceMotionEvent !== 'undefined'
    && typeof DeviceMotionEvent.requestPermission === 'function'
  const cb = useRef(onSample); cb.current = onSample
  const [live, setLive] = useState(false)

  const request = useCallback(async () => {
    if (!needsAsk) { setPerm('granted'); return true }
    try {
      const r = await DeviceMotionEvent.requestPermission()
      setPerm(r === 'granted' ? 'granted' : 'denied')
      return r === 'granted'
    } catch (e) { setPerm('denied'); return false }
  }, [needsAsk])

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') { setPerm('none'); return }
    if (needsAsk && perm !== 'granted') return
    let n = 0
    const h = e => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x == null) return
      const a = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0)
      if (++n === 3) setLive(true)
      cb.current?.({ t: e.timeStamp || performance.now(), a })
    }
    window.addEventListener('devicemotion', h)
    return () => window.removeEventListener('devicemotion', h)
  }, [active, perm, needsAsk])

  return { perm, needsAsk, request, live }
}

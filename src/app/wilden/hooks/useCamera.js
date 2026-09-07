'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { reasonOf, CAM_REASON } from '../engine/camera'

// ─── המצלמה, פעם אחת ───
// הבמה הראשית ומסך הזהב פתחו מצלמה כל אחד בדרכו, ושניהם נפלו על אותם
// דברים: זרם שהגיע לפני שהיה אלמנט וידאו, בקשה שנתקעה בלי תשובה, ואין
// דרך לנסות שוב בלי לצאת ולהיכנס. עכשיו יש מקום אחד.
//
// חוזה: { state, reason, live, videoRef, retry }
//   state   'starting' | 'on' | 'off'
//   reason  למה off (engine/camera.js) — לטקסט להורה
//   live    on, וגם באמת מגיעים פריימים (iOS מבטיח play() בלי תמונה)
//   retry() מתוך לחיצה — פותח מחדש. זה מה שחסר לה כשהמסך נשאר שחור.

const OPEN_TIMEOUT_MS = 7000
const LIVE_RECHECK_MS = 2500

export function useCamera({ active = true, onState } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [state, setState] = useState('starting')
  const [reason, setReason] = useState(null)
  const [live, setLive] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onStateRef = useRef(onState); onStateRef.current = onState

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // חיבור הזרם לאלמנט, עם וידוא שבאמת יש תמונה.
  const attach = useCallback(s => {
    const v = videoRef.current
    if (!v || !s) return
    if (v.srcObject !== s) v.srcObject = s
    const ok = () => setLive(true)
    v.addEventListener('playing', ok, { once: true })
    v.addEventListener('loadeddata', ok, { once: true })
    v.play().catch(() => {})
    if (v.readyState >= 2) ok()
  }, [])

  useEffect(() => {
    if (!active) { stop(); return }
    let dead = false, settled = false
    setState('starting'); setReason(null); setLive(false)

    const fail = err => {
      if (dead || settled) return
      settled = true
      const r = reasonOf(err, { secure: typeof window !== 'undefined' ? window.isSecureContext !== false : true })
      setReason(r); setState('off'); onStateRef.current?.('off', r)
    }
    // בטלפון שלה הבקשה לא נענתה ולא נדחתה — פשוט נתקעה. אחרי 7 שניות
    // מפסיקים לחכות, אבל משאירים כפתור "לנסות שוב".
    const giveUp = setTimeout(() => fail(new Error('timeout')), OPEN_TIMEOUT_MS)

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-media')
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        })
        if (dead || settled) { s.getTracks().forEach(t => t.stop()); return }
        settled = true
        clearTimeout(giveUp)
        streamRef.current = s
        setState('on'); onStateRef.current?.('on', null)
        attach(s)
      } catch (e) { fail(e) }
    })()

    return () => { dead = true; clearTimeout(giveUp); stop() }
    // attempt: כל retry מריץ את זה מחדש
  }, [active, attempt, attach])

  // אם הזרם הגיע לפני שהאלמנט היה בדף — מחברים כשהוא מופיע.
  useEffect(() => { if (state === 'on' && streamRef.current) attach(streamRef.current) }, [state, attach])

  // on אבל בלי תמונה: מנסים play() עוד פעם. ב-iOS זה לפעמים כל ההבדל.
  useEffect(() => {
    if (state !== 'on' || live) return
    const id = setTimeout(() => { if (streamRef.current) attach(streamRef.current) }, LIVE_RECHECK_MS)
    return () => clearTimeout(id)
  }, [state, live, attach])

  const retry = useCallback(() => { stop(); setAttempt(a => a + 1) }, [])

  return { state, reason, live, videoRef, retry, canRetry: reason !== CAM_REASON.NO_MEDIA && reason !== CAM_REASON.INSECURE }
}

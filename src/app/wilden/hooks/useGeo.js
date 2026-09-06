'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── המיקום ───
// עוטף את watchPosition ומזין את המכונה. כל מה שכאן הוא צד־אפקטים בלבד:
// הסינון, הספירה וההחלטות יושבים במנוע הטהור ונבדקים בלעדיו.
//
// שתי עובדות שמעצבות את הקוד הזה:
//   · הדפדפן עוצר את המעקב כשהמסך ננעל. חזרה מנעילה היא RESUME, לא FIX,
//     כי בין לבין הילד יכול היה לזוז חצי קילומטר.
//   · enableHighAccuracy שורף סוללה, ובלעדיו הדיוק לא מספיק לשער ה-40 מ'.
//     אין כאן פשרה — בלי זה המשחק לא עובד.

const GAP_RESUME_MS = 45000   // פער כזה בין דגימות = היה ניתוק, לא הליכה

export function useGeo({ active, onFix, onResume, onError } = {}) {
  const [pos, setPos] = useState(null)
  const [err, setErr] = useState(null)
  const [asking, setAsking] = useState(false)
  const watchId = useRef(null)
  const lastT = useRef(0)
  const cbs = useRef({})
  cbs.current = { onFix, onResume, onError }

  // בקשת ההרשאה נפרדת מהמעקב: היא חייבת לצאת מלחיצה של המשתמש, אחרת
  // ספארי מתעלמת ממנה בשקט.
  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr('unsupported'); cbs.current.onError?.('unsupported'); return
    }
    setAsking(true)
    navigator.geolocation.getCurrentPosition(
      p => {
        setAsking(false)
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }
        setPos(fix)
        cbs.current.onFix?.({ ...fix, t: Date.now(), first: true })
      },
      e => {
        setAsking(false)
        const reason = e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable'
        setErr(reason); cbs.current.onError?.(reason)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) return

    watchId.current = navigator.geolocation.watchPosition(
      p => {
        const t = Date.now()
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }
        setPos(fix)
        // פער ארוך = המסך היה נעול. לא סופרים את זה כהליכה, ומאמתים מחדש
        // איפה הילד נמצא עכשיו.
        if (lastT.current && t - lastT.current > GAP_RESUME_MS) cbs.current.onResume?.({ ...fix, t })
        else cbs.current.onFix?.({ ...fix, t })
        lastT.current = t
      },
      e => {
        const reason = e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable'
        setErr(reason); cbs.current.onError?.(reason)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    )

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [active])

  // חזרה מטאב מוסתר היא תמיד RESUME. גם אם הדגימה נראית רציפה.
  useEffect(() => {
    if (!active) return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      lastT.current = 0
      navigator.geolocation?.getCurrentPosition(
        p => cbs.current.onResume?.({
          lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: Date.now(),
        }),
        () => {},
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [active])

  return { pos, err, asking, request }
}

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── לאן הטלפון מכוון ───
// זו שכבת ה-AR שלנו. אין WebXR בספארי, ולכן במקום לעגן לרצפה אנחנו
// מציבים את היצור בזווית ובמרחק סביב הילד — ומסתמכים על כך שהוא *עומד*.
// כלל הבטיחות (SAFE_STOP) הוא מה שהופך את זה למדויק מספיק.
//
// שני מכשירים, שני מסלולי קוד. זה לא ניתן לאיחוד:
//
//   iOS      webkitCompassHeading — צפון אמיתי, גדל עם כיוון השעון.
//            ודורש requestPermission() מתוך לחיצה של המשתמש. בלי לחיצה
//            אמיתית ספארי מתעלמת בשקט, בלי שגיאה.
//
//   Android  alpha — יחסי לרגע ההתחלה אלא אם absolute. גדל *נגד* כיוון
//            השעון, ולכן heading = 360 - alpha.

// ההרשאה ב-iOS ניתנת פעם אחת לדף. מי שביקש אותה (כפתור "אישור מיקום",
// למשל) מסמן כאן, וכל useOrient שנולד אחר כך מתחיל כבר מ-granted — בלי
// כפתור נוסף על המפה.
let grantedOnce = false
const canAsk = () => typeof DeviceOrientationEvent !== 'undefined'
  && typeof DeviceOrientationEvent.requestPermission === 'function'

// לקריאה מתוך לחיצה, בלי hook. מחזירה true אם אפשר להאזין.
export async function requestOrientation() {
  if (!canAsk()) { grantedOnce = true; return true }
  try {
    const r = await DeviceOrientationEvent.requestPermission()
    grantedOnce = r === 'granted'
    return grantedOnce
  } catch (e) { return false }
}

// everyMs / minDeg: דילול. המפה לא צריכה 60 עדכונים בשנייה — ה-AR כן.
export function useOrient({ active, everyMs = 0, minDeg = 0 } = {}) {
  const [heading, setHeading] = useState(null)   // 0=צפון, מעלות, עם כיוון השעון
  const [pitch, setPitch] = useState(0)          // 0=אופקי, 90=מסתכל למעלה
  const [perm, setPerm] = useState(() => (grantedOnce ? 'granted' : 'unknown'))    // unknown | granted | denied | unneeded
  const [absolute, setAbsolute] = useState(false)
  const bound = useRef(false)
  const last = useRef({ t: 0, h: null })

  const needsAsk = canAsk()

  const request = useCallback(async () => {
    if (!needsAsk) { setPerm('unneeded'); grantedOnce = true; return true }
    try {
      const r = await DeviceOrientationEvent.requestPermission()
      setPerm(r === 'granted' ? 'granted' : 'denied')
      grantedOnce = r === 'granted'
      return r === 'granted'
    } catch (e) {
      // נזרק כשלא נקראנו מתוך לחיצה. זו טעות שלנו, לא של המשתמש.
      setPerm('denied')
      return false
    }
  }, [needsAsk])

  useEffect(() => {
    if (!active || bound.current) return
    if (needsAsk && perm !== 'granted') return
    if (typeof window === 'undefined') return

    const put = h => {
      if (everyMs || minDeg) {
        const now = Date.now()
        const dh = last.current.h == null ? 999 : Math.abs(angleDelta(last.current.h, h))
        if (now - last.current.t < everyMs || dh < minDeg) return
        last.current = { t: now, h }
      }
      setHeading(h)
    }
    const onOrient = e => {
      // הטיה: beta הוא -180..180, 0 = הטלפון שטוח על השולחן.
      // ‎90 = מוחזק זקוף. אנחנו רוצים 0 באופק ולכן מחסרים.
      if (typeof e.beta === 'number' && !everyMs) setPitch(Math.max(-90, Math.min(90, e.beta - 90)))

      if (typeof e.webkitCompassHeading === 'number') {
        put(e.webkitCompassHeading)      // iOS, צפון אמיתי
        setAbsolute(true)
        return
      }
      if (typeof e.alpha === 'number') {
        put((360 - e.alpha) % 360)       // אנדרואיד, כיוון הפוך
        setAbsolute(!!e.absolute)
      }
    }

    // deviceorientationabsolute הוא היחיד שנותן צפון אמיתי באנדרואיד.
    // אם הוא לא קיים — נופלים לאירוע הרגיל ומסמנים absolute=false, כדי
    // שהמסך יידע לבקש מהילד להסתובב במקום להבטיח כיוון שאי אפשר לקיים.
    const hasAbs = 'ondeviceorientationabsolute' in window
    const evName = hasAbs ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(evName, onOrient, true)
    bound.current = true

    return () => {
      window.removeEventListener(evName, onOrient, true)
      bound.current = false
    }
  }, [active, perm, needsAsk, everyMs, minDeg])

  return { heading, pitch, perm, absolute, needsAsk, request }
}

// הפרש זוויתי קצר ביותר בין שני כיוונים, ‎-180..180.
// זה מה שאומר "כמה שמאלה או ימינה היצור נמצא ממה שאתה רואה עכשיו".
export function angleDelta(from, to) {
  if (from == null || to == null) return null
  return ((((to - from) % 360) + 540) % 360) - 180
}

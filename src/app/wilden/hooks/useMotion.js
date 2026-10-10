'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── מד התאוצה ───
// אותו כלל כמו הכיוון באייפון: ההרשאה חייבת לצאת מלחיצה של המשתמש.
// מדווח החוצה דגימות { t, a } כש-a הוא גודל התאוצה הכוללת (עם כוח המשיכה).
//
// ── למה ההרשאה משותפת לכל המסך ──
// "הילד וגם אני טסנו בריצה ועדיין היה רשום שהוא תפס אותנו."
// וזה בדיוק מה שקרה: ההרשאה נשמרה ב-useState *של כל מופע בנפרד*. הבמה
// ביקשה אותה וקיבלה, אבל כשגוסטבו קפץ נפתח רכיב חדש עם מופע חדש של
// ההוק — ואצלו perm היה 'unknown' מחדש, ולכן המאזין לא חובר בכלל.
// באייפון זה אומר אפס דגימות, אפס צעדים, והטיימר נגמר למרות שרצו.
// (באנדרואיד needsAsk הוא false, המאזין מתחבר מיד, ולכן זה עבד שם.)
// עכשיו ההרשאה יושבת במודול: מי שקיבל אותה פעם אחת, קיבל אותה לכולם.

let sharedPerm = 'unknown'                    // unknown | granted | denied | none
const listeners = new Set()
function setShared(p) {
  if (p === sharedPerm) return
  sharedPerm = p
  listeners.forEach(fn => { try { fn(p) } catch (e) { /* */ } })
}

const canAsk = () => typeof DeviceMotionEvent !== 'undefined'
  && typeof DeviceMotionEvent.requestPermission === 'function'

// בקשה אחת, משותפת. קריאה שנייה בזמן שהראשונה באוויר מחכה לה ולא
// פותחת דיאלוג שני.
let pending = null
export function askMotion() {
  if (sharedPerm === 'granted') return Promise.resolve(true)
  if (!canAsk()) { setShared('granted'); return Promise.resolve(true) }
  if (pending) return pending
  pending = DeviceMotionEvent.requestPermission()
    .then(r => { setShared(r === 'granted' ? 'granted' : 'denied'); return r === 'granted' })
    .catch(() => { setShared('denied'); return false })
    .finally(() => { pending = null })
  return pending
}

export function useMotion({ active, onSample }) {
  const [perm, setPerm] = useState(sharedPerm)
  const needsAsk = canAsk()
  const cb = useRef(onSample); cb.current = onSample
  const [live, setLive] = useState(false)

  useEffect(() => {
    const fn = p => setPerm(p)
    listeners.add(fn)
    if (sharedPerm !== perm) setPerm(sharedPerm)
    return () => { listeners.delete(fn) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const request = useCallback(() => askMotion(), [])

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') { setShared('none'); return }
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

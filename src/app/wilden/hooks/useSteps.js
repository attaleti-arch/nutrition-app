'use client'
import { useCallback, useMemo, useRef } from 'react'
import { useMotion } from './useMotion'

// ─── צעדים ───
// המרדף וריצת המטבעות רצים על צעדים, לא על GPS: עשרים שניות של ריצה הן
// שלוש-ארבע דגימות GPS, כל אחת עם 5 מ' רעש. מד התאוצה נותן כל צעד.
// צעד = שיא של תאוצה (עם כוח המשיכה) מעל הסף, לא יותר מ-3.5 בשנייה.
//
// לא מחזיק state של React: הצעדים נצברים ב-ref, ומי שצריך אותם שואב
// אותם בקצב שלו (take). אחרת כל צעד היה מרנדר את כל הבמה.

export const STEP_G = 11.6
export const STEP_MIN_MS = 280

export function useSteps({ active = true } = {}) {
  const st = useRef({ lastT: 0, above: false, pending: 0, total: 0 })
  const motion = useMotion({ active, onSample: ({ a }) => {
    const s = st.current
    const now = Date.now()
    if (a > STEP_G && !s.above) {
      s.above = true
      if (now - s.lastT > STEP_MIN_MS) { s.lastT = now; s.pending += 1; s.total += 1 }
    } else if (a < STEP_G - 1.2) s.above = false
  } })
  // כמה צעדים נצברו מאז הפעם הקודמת
  const take = useCallback(() => { const n = st.current.pending; st.current.pending = 0; return n }, [])
  const total = useCallback(() => st.current.total, [])
  // אובייקט יציב: מי ששם אותו ב-deps של effect לא יקבל interval שמתאפס
  // בכל רינדור (וזה בדיוק מה שקרה: הסליידר רינדר, ה-interval לא ירה).
  return useMemo(() => ({ take, total, live: motion.live, perm: motion.perm, needsAsk: motion.needsAsk, request: motion.request }),
    [take, total, motion.live, motion.perm, motion.needsAsk, motion.request])
}

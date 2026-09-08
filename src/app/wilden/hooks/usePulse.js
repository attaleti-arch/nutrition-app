'use client'
import { useEffect, useRef } from 'react'
import { buzz } from '../engine/audio'
import { pulsePeriod } from '../engine/pulse'

// ─── חם/קר בדופק ───
// כמו גלאי מתכות: הטלפון רועד לאט כשרחוק, ומהר ומהר יותר ככל שמתקרבים.
// זה עובר גם להורה שהולך ליד. dist במטרים, null = שקט. period(d) נותן
// את המרווח בין רעידות.
//
// אייפון: ספארי לא תומכת ב-navigator.vibrate בכלל — שם זה שקט, ורק
// הצלילים והמד על המסך נשארים. באנדרואיד זה עובד.

export function usePulse(dist, { active = true, ...opts } = {}) {
  const last = useRef(0)
  const distRef = useRef(dist); distRef.current = dist
  const optsRef = useRef(opts); optsRef.current = opts
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      const p = pulsePeriod(distRef.current, optsRef.current)
      if (p == null) return
      const t = Date.now()
      if (t - last.current >= p) { last.current = t; buzz(p < 500 ? [35] : [25]) }
    }, 90)
    return () => clearInterval(id)
  }, [active])
}

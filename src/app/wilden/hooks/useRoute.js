'use client'
import { useCallback, useRef, useState } from 'react'
import { fetchStreets } from '../engine/osm'
import { buildLoop, fallbackLoop, TARGET_M } from '../engine/route'

// ─── בניית הלולאה ───
// ה-hook עושה שני דברים בלבד: מביא מ-Overpass, ומנהל מצב מסך. כל החישוב
// יושב ב-engine/route.js כפונקציה טהורה שיש עליה בדיקות.
//
// זה לא היה ככה קודם, ושילמנו על זה: שני באגי אינטגרציה ברצף — קריאה
// כפולה לפענוח, ואובייקט שהועבר במקום אינדקס — שאף בדיקה לא יכלה לגעת
// בהם כי הם ישבו בתוך hook. שניהם התגלו רק על טלפון ברחוב.
//
// ועוד דבר שנלמד בדרך הקשה: ל-fetch אין timeout כברירת מחדל. בלי
// AbortController ילד נתקע לנצח על "בודקים אילו רחובות".

const FETCH_TIMEOUT = 12000
const SOFT_TIMEOUT = 6000    // מתי מציעים "לדלג עכשיו"

export function useRoute() {
  const [status, setStatus] = useState('idle')   // idle | working | slow | ok
  const [path, setPath] = useState(null)
  const [degraded, setDegraded] = useState(false)
  const [reason, setReason] = useState(null)     // למה נפלנו לחלופי, בשמו
  const abort = useRef(null)
  const softTimer = useRef(null)

  const skip = useCallback(() => { abort.current?.abort() }, [])

  const build = useCallback(async home => {
    setStatus('working'); setDegraded(false); setPath(null); setReason(null)
    const ctl = new AbortController()
    abort.current = ctl
    clearTimeout(softTimer.current)
    softTimer.current = setTimeout(() => setStatus(s => (s === 'working' ? 'slow' : s)), SOFT_TIMEOUT)

    let out = null
    try {
      // ── כמה רחוק להוריד ──
      // planLoop מחפש נקודת מפנה במרחק 0.3–0.62 מאורך הלולאה. עם רדיוס
      // של 0.32 היא נמצאת בשוליים ממש של מה שהורדנו, ובשכונה דלילה
      // פשוט אין מועמדים ואין לולאה. 0.45 עולה קצת בזמן הורדה ונותן
      // למתכנן מרחב אמיתי לעבוד בו.
      const radius = Math.max(600, Math.min(1400, Math.round(TARGET_M * 0.45)))
      const data = await fetchStreets(home.lat, home.lng, radius, {
        signal: ctl.signal, timeoutMs: FETCH_TIMEOUT,
      })
      out = buildLoop(data, home)
    } catch (e) {
      out = { ok: false, reason: e?.name === 'AbortError' ? 'aborted' : 'network' }
    }

    clearTimeout(softTimer.current)
    abort.current = null

    if (out.ok) {
      setPath(out.path); setStatus('ok')
      return out.path
    }
    setReason(out.reason)
    const fb = fallbackLoop(home)
    setPath(fb); setDegraded(true); setStatus('ok')
    return fb
  }, [])

  return { status, path, degraded, reason, build, skip }
}

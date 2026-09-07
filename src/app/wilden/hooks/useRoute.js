'use client'
import { useCallback, useRef, useState } from 'react'
import { fetchStreets } from '../engine/osm'
// loop.js ולא route.js: קובץ בשם route.js בתוך app/ הוא API route
// מבחינת Next, והוא נבנה כנתיב /wilden/engine בלי שאף אחד התכוון.
import { buildLoop, fallbackLoop, TARGET_M } from '../engine/loop'
import { getCached, putCached } from '../engine/routeCache'

// ─── בניית הלולאה ───
// ה-hook עושה שני דברים בלבד: מביא מ-Overpass, ומנהל מצב מסך. כל החישוב
// יושב ב-engine/loop.js כפונקציה טהורה שיש עליה בדיקות.
//
// זה לא היה ככה קודם, ושילמנו על זה: שני באגי אינטגרציה ברצף — קריאה
// כפולה לפענוח, ואובייקט שהועבר במקום אינדקס — שאף בדיקה לא יכלה לגעת
// בהם כי הם ישבו בתוך hook. שניהם התגלו רק על טלפון ברחוב.
//
// ועוד דבר שנלמד בדרך הקשה: ל-fetch אין timeout כברירת מחדל. בלי
// AbortController ילד נתקע לנצח על "בודקים אילו רחובות".

// Overpass לוקח לפעמים 15–20 שניות לשכונה שלמה. 12 שניות היו קצרות מדי,
// וכל מסע נפל לחלופי — שעל מפה אמיתית נראה כמו מצולע שחוצה שדות.
const FETCH_TIMEOUT = 26000
const SOFT_TIMEOUT = 7000    // מתי אומרים "לוקח יותר מהרגיל"

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

    // ── מסלול שכבר נבנה מהבית הזה ──
    // ילד בפיילוט יוצא מאותה דלת כל יום. אין סיבה לחכות ל-Overpass בפעם
    // השנייה והעשירית — וזה בדיוק מה שקרה: המתנה, "לוקח יותר מהרגיל",
    // ואז מסלול חלופי גרוע יותר. פעם אחת מספיקה.
    const remembered = getCached(home)
    if (remembered) {
      setPath(remembered); setStatus('ok')
      return remembered
    }

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
      // רחובות מתפתלים: לולאה של 3.4 ק"מ נכנסת ברדיוס של ~1.1 ק"מ. יותר
      // מזה — השאילתה כבדה מדי ל-Overpass ונופלת בזמן.
      const radius = Math.max(600, Math.min(1100, Math.round(TARGET_M * 0.33)))
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
      putCached(home, out.path)      // כדי שהפעם הבאה תהיה מיידית
      setPath(out.path); setStatus('ok')
      return out.path
    }
    // ── נכשל: לא ממציאים מסלול ──
    // המצולע הגיאומטרי על מפה אמיתית נראה כמו שקר: קווים ישרים דרך שדות
    // ונחל. במקום זה אומרים מה קרה ונותנים לבחור: לנסות שוב, או לצאת
    // בכל זאת עם מסלול כללי — בידיעה.
    setReason(out.reason)
    setPath(null); setDegraded(false); setStatus('failed')
    return null
  }, [])

  // בחירה מפורשת של ההורה: מסלול כללי, לא על רחובות.
  const useFallback = useCallback(home => {
    const fb = fallbackLoop(home)
    setPath(fb); setDegraded(true); setStatus('ok')
    return fb
  }, [])

  return { status, path, degraded, reason, build, skip, useFallback }
}

'use client'
import { useCallback, useRef, useState } from 'react'
import { fetchStreets } from '../engine/osm'
// loop.js ולא route.js: קובץ בשם route.js בתוך app/ הוא API route
// מבחינת Next, והוא נבנה כנתיב /wilden/engine בלי שאף אחד התכוון.
import { buildLoop, fallbackLoop, routeNote, TARGET_M } from '../engine/loop'
import { getCached, putCached } from '../engine/routeCache'
import { daySeed } from '../engine/ors'

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
const WIDE_RADIUS = 1500     // ניסיון שני, רק כשהראשון לא מצא לולאה

const ENGINE_TIMEOUT = 12000

async function fetchEngineLoop(home, targetM, signal) {
  const ctl = new AbortController()
  const onAbort = () => ctl.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = setTimeout(() => ctl.abort(), ENGINE_TIMEOUT)
  try {
    const q = new URLSearchParams({ lat: home.lat.toFixed(6), lng: home.lng.toFixed(6), m: String(Math.round(targetM)), seed: String(daySeed()) })
    const res = await fetch(`/wilden/api/loop?${q}`, { signal: ctl.signal })
    if (!res.ok) return null
    const json = await res.json()
    const path = json?.path
    if (!Array.isArray(path) || path.length < 4) return null
    // המסלול מתחיל ונגמר בדלת, כמו אצל המתכנן שלנו.
    return [home, ...path, home]
  } catch (e) {
    return null
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', onAbort)
  }
}

export function useRoute() {
  const [status, setStatus] = useState('idle')   // idle | working | slow | ok
  const [path, setPath] = useState(null)
  const [degraded, setDegraded] = useState(false)
  const [reason, setReason] = useState(null)     // למה נפלנו לחלופי, בשמו
  const [detail, setDetail] = useState(null)     // מי נכשל ולמה: proxy:502 · de:blocked …
  const [source, setSource] = useState(null)     // מי ענה
  const [note, setNote] = useState(null)         // מסלול שהוא לא הלולאה שתוכננה, במילים
  const abort = useRef(null)
  const softTimer = useRef(null)

  const skip = useCallback(() => { abort.current?.abort() }, [])

  const build = useCallback(async (home, targetM = TARGET_M) => {
    setStatus('working'); setDegraded(false); setPath(null); setReason(null); setDetail(null); setNote(null)

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

    // ── קודם מנוע ניווט אמיתי ──
    // "החוליה החלשה שלנו היא המסלול." לולאת הליכה ממנוע שמכיר מדרכות
    // ומעברי חצייה, עם זרע יומי — כל יום לולאה אחרת מאותה דלת. בלי
    // מפתח בשרת (404) או בלי תשובה — ממשיכים למתכנן שלנו, כמו תמיד.
    const engine = await fetchEngineLoop(home, targetM, ctl.signal)
    if (engine) {
      clearTimeout(softTimer.current); abort.current = null
      setSource('ors'); setNote(null); setPath(engine); setStatus('ok')
      return engine
    }
    if (ctl.signal.aborted) {
      clearTimeout(softTimer.current); abort.current = null
      setReason('aborted'); setPath(null); setStatus('failed')
      return null
    }

    let out = null
    try {
      // ── כמה רחוק להוריד ──
      // planLoop מחפש נקודת מפנה במרחק הליכה של 0.3–0.62 מאורך הלולאה.
      // מרחק הליכה תמיד ארוך ממרחק אווירי, אז רדיוס של 0.33 (726 מ'
      // ללולאה של 2.2 ק"מ) השאיר למתכנן רצועה דקה בשוליים — וביישוב
      // קטן: "no-loop". 0.45 נותן לו מרחב. יותר מ-1.2 ק"מ בעיר צפופה
      // השאילתה כבדה ונופלת בזמן, אז זה התקרה — חוץ מניסיון שני,
      // כשהראשון לא מצא כלום: אז שווה לשלם על רדיוס גדול יותר.
      const radius = Math.max(700, Math.min(1200, Math.round(targetM * 0.45)))
      const data = await fetchStreets(home.lat, home.lng, radius, {
        signal: ctl.signal, timeoutMs: FETCH_TIMEOUT,
      })
      setSource(data.source || null)
      out = buildLoop(data, home, targetM)
      if (!out.ok && (out.reason === 'no-loop' || out.reason === 'no-node') && !ctl.signal.aborted) {
        const wider = await fetchStreets(home.lat, home.lng, WIDE_RADIUS, {
          signal: ctl.signal, timeoutMs: FETCH_TIMEOUT,
        })
        setSource(wider.source || null)
        const again = buildLoop(wider, home, targetM)
        if (again.ok) out = again
        else out = { ...out, detail: `r=${radius}:${out.reason} · r=${WIDE_RADIUS}:${again.reason} · ${wider.source || ''}` }
      }
    } catch (e) {
      out = { ok: false, reason: e?.name === 'AbortError' ? 'aborted' : 'network', detail: e?.detail || null }
    }

    clearTimeout(softTimer.current)
    abort.current = null

    if (out.ok) {
      // כדי שהפעם הבאה תהיה מיידית — אבל רק לולאה של ממש. הלוך ושוב או
      // לולאה קצרה הם פשרה של היום, לא מה שרוצים לחזור עליו מחר.
      if (out.shape === 'loop' && (out.scale ?? 1) >= 0.8) putCached(home, out.path)
      setNote(routeNote(out))
      setPath(out.path); setStatus('ok')
      return out.path
    }
    // ── נכשל: לא ממציאים מסלול ──
    // המצולע הגיאומטרי על מפה אמיתית נראה כמו שקר: קווים ישרים דרך שדות
    // ונחל. במקום זה אומרים מה קרה ונותנים לבחור: לנסות שוב, או לצאת
    // בכל זאת עם מסלול כללי — בידיעה.
    setReason(out.reason); setDetail(out.detail || null)
    setPath(null); setDegraded(false); setStatus('failed')
    return null
  }, [])

  // בחירה מפורשת של ההורה: מסלול כללי, לא על רחובות.
  const useFallback = useCallback((home, targetM = TARGET_M) => {
    const fb = fallbackLoop(home, targetM)
    setPath(fb); setDegraded(true); setStatus('ok')
    return fb
  }, [])

  return { status, path, degraded, reason, detail, source, note, build, skip, useFallback }
}

'use client'
import { useCallback, useRef, useState } from 'react'
import { fetchStreets, parseOverpass, pickSpotsAdaptive } from '../engine/osm'
import { buildGraph, planLoop, loopCoords, nearestNode } from '../engine/routing'
import { destination } from '../engine/geo'

// ─── בניית הלולאה ───
// שכבת הבטיחות של המשחק. Overpass מחזירה אילו רחובות ושבילים באמת קיימים
// סביב הבית ואילו שטחים אסורים — בתי קברות, שדות, תעשייה, מים — ורק אז
// נבנה הגרף והלולאה.
//
// שני דברים שנלמדו בדרך הקשה:
//   · ל-fetch אין timeout כברירת מחדל. בלי AbortController ילד נתקע לנצח
//     על "בודקים אילו רחובות".
//   · אם Overpass לא זמינה, המשחק לא נעצר. יש מסלול חלופי גאומטרי — פחות
//     טוב, אבל קיים.

const TARGET_M = 2200        // לולאה של ~30 דקות הליכה
const FETCH_TIMEOUT = 10000
const SOFT_TIMEOUT = 6000    // מתי מציעים "לדלג עכשיו"

export function useRoute() {
  const [status, setStatus] = useState('idle')   // idle | working | slow | ok | failed
  const [path, setPath] = useState(null)
  const [degraded, setDegraded] = useState(false)
  const abort = useRef(null)
  const softTimer = useRef(null)

  const skip = useCallback(() => { abort.current?.abort() }, [])

  const build = useCallback(async home => {
    setStatus('working'); setDegraded(false); setPath(null)
    const ctl = new AbortController()
    abort.current = ctl
    clearTimeout(softTimer.current)
    softTimer.current = setTimeout(() => setStatus(s => (s === 'working' ? 'slow' : s)), SOFT_TIMEOUT)

    try {
      const radius = Math.max(450, Math.min(1250, Math.round(TARGET_M * 0.32)))
      const json = await fetchStreets(home.lat, home.lng, radius, {
        signal: ctl.signal, timeoutMs: FETCH_TIMEOUT,
      })
      const { ways, blocked } = parseOverpass(json)
      const graph = buildGraph(ways, blocked)
      const start = nearestNode(graph, home)
      if (start == null) throw new Error('no-node')

      const loop = planLoop(graph, start, TARGET_M)
      if (!loop) throw new Error('no-loop')

      const coords = loopCoords(graph, loop)
      if (!coords || coords.length < 8) throw new Error('short-loop')

      clearTimeout(softTimer.current)
      setPath(coords); setStatus('ok')
      return coords
    } catch (e) {
      // ── המסלול החלופי ──
      // מרובע גס סביב הבית. הוא לא מוצמד לרחובות, ולכן הוא רק רשת אחרונה
      // ולא ברירת מחדל: הילד עדיין יוצא, אבל בלי הבטחת הבטיחות של OSM.
      clearTimeout(softTimer.current)
      const r = TARGET_M / 6.5
      const ring = [0, 45, 90, 135, 180, 225, 270, 315].map(b => destination(home, b, r))
      const fallback = [home, ...ring, home]
      setPath(fallback); setDegraded(true); setStatus('ok')
      return fallback
    } finally {
      abort.current = null
    }
  }, [])

  return { status, path, degraded, build, skip }
}

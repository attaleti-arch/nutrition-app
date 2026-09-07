'use client'
import { useEffect, useMemo, useState } from 'react'

// ─── טעינת model-viewer ───
// הרכיב של גוגל שמרנדר GLB בדפדפן, כולל אנימציות. מגיע מ-/public/vendor
// ולא מ-CDN, כדי שלא נהיה תלויים בשרת חיצוני באמצע רחוב.
//
// נטען פעם אחת בלבד, ורק כשיש בפועל מודל להציג. ילד שמקבל ספרייט לא
// מוריד מגה של ג'אווהסקריפט לחינם.

let pending = null

export function useModelViewer(enabled) {
  const [ready, setReady] = useState(
    () => typeof customElements !== 'undefined' && !!customElements.get('model-viewer'),
  )

  useEffect(() => {
    if (!enabled || ready) return
    if (customElements.get('model-viewer')) { setReady(true); return }
    if (!pending) {
      pending = new Promise(resolve => {
        const el = document.createElement('script')
        el.type = 'module'
        el.src = '/vendor/model-viewer.min.js'
        el.onload = () => resolve(true)
        el.onerror = () => resolve(false)
        document.body.appendChild(el)
      })
    }
    let dead = false
    pending.then(ok => { if (!dead && ok) setReady(true) })
    return () => { dead = true }
  }, [enabled, ready])

  return ready
}

// מאיפה המודל. בייצור — מהמרשם בלבד. ב-?debug=1 אפשר לתת ?glb=/path כדי
// לבדוק את הצינור עם קובץ כלשהו לפני שהמודל האמיתי קיים. זה כלי בדיקה,
// ומה שהוא מציג הוא לא נימי.
export function useModelSrc(creature) {
  return useMemo(() => {
    if (typeof window === 'undefined') return creature?.model || null
    const q = new URLSearchParams(window.location.search)
    if (q.get('debug') === '1' && q.get('glb')) return q.get('glb')
    return creature?.model || null
  }, [creature])
}

// ── חימום מוקדם ──
// הבמה נפתחת על שביל העקבות, והדמות עצמה מופיעה רק כמה שניות אחר כך.
// זה הזמן להוריד את model-viewer ואת קובץ המודל — כדי שכשנימי מבצבץ,
// המודל כבר במטמון ולא מתחיל להיטען מול הילד. בלי זה הספרייט מחזיק את
// הרגע הראשון, וזה בסדר, אבל עדיף בלי מעבר בכלל.
export function usePreloadModel(src) {
  useModelViewer(!!src)
  useEffect(() => {
    if (!src) return
    const ctl = new AbortController()
    fetch(src, { signal: ctl.signal }).catch(() => { /* המודל ייטען אחר כך רגיל */ })
    return () => ctl.abort()
  }, [src])
}

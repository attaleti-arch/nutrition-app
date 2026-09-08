'use client'
import { useEffect, useState } from 'react'

// ─── קליפ חד-פעמי, טרי בכל פעם ───
// WebP מונפש שמנגן פעם אחת (loop=1) — הדפדפן זוכר את האנימציה לפי הכתובת.
// <img> חדש עם אותה כתובת מצטרף לאנימציה שכבר נגמרה, ורואים פריים אחרון
// קפוא. הפתרון: מורידים את הקובץ פעם אחת (blob), ובכל פעם שצריך — כתובת
// object חדשה. אותם בייטים, אנימציה מההתחלה, בלי רשת באמצע המרדף.
//
// useBurst(src, key): key משתנה = הפעלה חדשה. key ריק = כלום.
export function useBurst(src, key) {
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!src || typeof fetch !== 'function') return
    let alive = true
    fetch(src).then(r => (r.ok ? r.blob() : null)).then(b => { if (alive && b) setBlob(b) }).catch(() => { /* ניפול לאבק */ })
    return () => { alive = false }
  }, [src])

  useEffect(() => {
    if (!blob || !key) { setUrl(null); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => { URL.revokeObjectURL(u) }
  }, [blob, key])

  return { url, loaded: !!blob }
}

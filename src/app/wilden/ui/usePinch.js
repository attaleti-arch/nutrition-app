'use client'
import { useRef, useState, useCallback } from 'react'

// ─── לטייל בעולם עם האצבע ───
// "אני אשמח שתהיה אפשרות לטייל שם בזום אין שכזה עם האצבע."
// שתי אצבעות מקרבות (עד פי 3), אצבע אחת גוררת כשמקורבים, לחיצה כפולה
// מחזירה. כשלא מקורבים הדף עדיין נגלל מעל העולם (touch-action: pan-y);
// ברגע שיש זום, הגרירה שייכת לעולם. לחיצה על יצור עדיין עובדת — גרירה
// של יותר מכמה פיקסלים מבטלת את הלחיצה, לא פחות.

const MAX = 3
const TAP_PX = 7

export function usePinch() {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const ref = useRef(null)
  const pts = useRef(new Map())         // pointerId -> {x, y}
  const start = useRef(null)            // מצב בתחילת המחווה
  const moved = useRef(false)
  const lastTap = useRef(0)

  const clamp = useCallback((s, x, y) => {
    const el = ref.current
    const w = el?.clientWidth || 0, h = el?.clientHeight || 0
    s = Math.max(1, Math.min(MAX, s))
    x = Math.min(0, Math.max(w * (1 - s), x))
    y = Math.min(0, Math.max(h * (1 - s), y))
    return { s, x, y }
  }, [])

  const onPointerDown = useCallback(e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    const ps = [...pts.current.values()]
    if (ps.length === 1) {
      const now = Date.now()
      if (now - lastTap.current < 320) { setT({ s: 1, x: 0, y: 0 }); lastTap.current = 0; return }
      lastTap.current = now
    }
    start.current = { t, ps, mid: mid(ps), d: dist(ps) }
  }, [t])

  const onPointerMove = useCallback(e => {
    if (!pts.current.has(e.pointerId) || !start.current) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const ps = [...pts.current.values()]
    const st = start.current
    if (ps.length >= 2 && st.ps.length >= 2) {
      // צביטה: קנה מידה סביב נקודת האמצע, בקואורדינטות של האלמנט
      const r = ref.current.getBoundingClientRect()
      const m0 = { x: st.mid.x - r.left, y: st.mid.y - r.top }, m1 = mid(ps)
      m1.x -= r.left; m1.y -= r.top
      const k = Math.max(0.2, dist(ps) / Math.max(1, st.d))
      const s = Math.max(1, Math.min(MAX, st.t.s * k))
      const ratio = s / st.t.s
      const x = m1.x - (m0.x - st.t.x) * ratio
      const y = m1.y - (m0.y - st.t.y) * ratio
      moved.current = true
      setT(clamp(s, x, y))
    } else if (ps.length === 1 && st.ps.length === 1 && st.t.s > 1) {
      const dx = ps[0].x - st.ps[0].x, dy = ps[0].y - st.ps[0].y
      if (Math.hypot(dx, dy) > TAP_PX) moved.current = true
      if (moved.current) setT(clamp(st.t.s, st.t.x + dx, st.t.y + dy))
    }
  }, [clamp])

  const onPointerUp = useCallback(e => {
    pts.current.delete(e.pointerId)
    const ps = [...pts.current.values()]
    start.current = ps.length ? { t, ps, mid: mid(ps), d: dist(ps) } : null
  }, [t])

  // לחיצה אחרי גרירה: לא לחיצה.
  const onClickCapture = useCallback(e => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false } }, [])

  const zoomed = t.s > 1.02
  return {
    ref, zoomed,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
    wrapStyle: { touchAction: zoomed ? 'none' : 'pan-y' },
    sceneStyle: { transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transformOrigin: '0 0', transition: start.current ? 'none' : 'transform .18s ease-out' },
    reset: () => setT({ s: 1, x: 0, y: 0 }),
  }
}

const mid = ps => ps.length >= 2 ? { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 } : { x: ps[0]?.x || 0, y: ps[0]?.y || 0 }
const dist = ps => ps.length >= 2 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0

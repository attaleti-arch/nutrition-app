'use client'
import { useEffect, useState } from 'react'
import { tr, dirOf } from '../i18n'

// ─── רגע השאיבה ───
// הכלי שקנו עובד, ורואים אותו עובד: השואב מימין, הרוח נמשכת לתוך המשפך
// ונעלמת בו, והמטבעות קופצים. שנייה וחצי — לא סרט, אבל גם לא רק טוסט.
//
// זה מה שהופך חמישים וחמישה מטבעות לפעולה שמרגישים.

const MS = 1700

export function WindSuck({ coins = 0, freed = null, onDone }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT(x => x + 100), 100)
    const end = setTimeout(() => onDone?.(), MS)
    return () => { clearInterval(id); clearTimeout(end) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const k = Math.min(1, t / (MS - 300))          // 0 → 1: כמה נשאבה

  return (
    <div dir={dirOf()} style={S.wrap} aria-hidden="true">
      <style>{CSS}</style>
      {/* הרוח: נמשכת ימינה אל המשפך, מתכווצת ומסתובבת */}
      <img src="/world/wind/live.webp" alt="" draggable={false}
        style={{ ...S.wind, opacity: 1 - k * 0.9,
          transform: `translate(${-46 + k * 40}vw, -50%) scale(${1 - k * 0.85}) rotate(${k * 220}deg)` }} />
      {/* השואב: יציב, עובד */}
      <img src="/world/gear/vacuum-live.webp" alt="" draggable={false} style={S.vac} />
      <p style={S.coins}>+{coins} 🪙</p>
      {freed && <p style={S.freed}>{tr('{name} יצא מתוכו!', { name: freed })}</p>}
    </div>
  )
}

const CSS = `
@keyframes wildenSuckIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes wildenSuckPop { 0% { opacity: 0; transform: translateY(10px) scale(.7) } 40% { opacity: 1; transform: translateY(-4px) scale(1.1) } 100% { opacity: 1; transform: translateY(-10px) scale(1) } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, zIndex: 3100, background: 'radial-gradient(circle at 50% 50%, rgba(20,34,50,.82), rgba(8,14,20,.94))',
    display: 'grid', placeItems: 'center', animation: 'wildenSuckIn .2s ease-out both', pointerEvents: 'none', overflow: 'hidden' },
  wind: { position: 'absolute', top: '46%', left: '50%', height: '30vh', width: 'auto',
    filter: 'drop-shadow(0 0 26px rgba(110,168,230,.6))', transition: 'transform .1s linear, opacity .1s linear' },
  // ימין פיזי, לא insetInlineEnd: המשפך בקובץ פונה שמאלה, והרוח באה
  // משמאל — ככה היא באמת נכנסת לתוכו, בכל שפה.
  vac: { position: 'absolute', top: '46%', right: '5%', transform: 'translateY(-50%)',
    height: '26vh', width: 'auto', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.55))' },
  coins: { position: 'absolute', bottom: '26%', margin: 0, fontSize: 34, fontWeight: 900, color: '#FFD84A',
    textShadow: '0 3px 14px rgba(0,0,0,.8)', animation: 'wildenSuckPop .7s ease-out both' },
  freed: { position: 'absolute', bottom: '19%', margin: 0, fontSize: 18, fontWeight: 800, color: '#8ED0F0',
    textShadow: '0 2px 10px rgba(0,0,0,.8)' },
}

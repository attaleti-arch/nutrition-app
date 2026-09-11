'use client'
import { useEffect } from 'react'
import { report } from './engine/report'
import { tr, dirOf } from './i18n'

// ─── המסך הלבן ──
// עד עכשיו, כשמשהו נשבר, Next הראה "Application error" באנגלית על רקע לבן,
// והמסע נגמר. עכשיו: מסך של המשחק, הסבר קצר, וכפתור שממשיך מאיפה שהיה —
// הכול שמור בטלפון, אז שום דבר לא אובד. והשגיאה נשלחת אלינו ברקע.

export default function WildenError({ error, reset }) {
  useEffect(() => { report(error, { where: 'route' }) }, [error])
  return (
    <div dir={dirOf()} style={S.wrap}>
      <p style={S.eyebrow}>WILDEN</p>
      <h1 style={S.h1}>{tr('משהו נתקע לרגע.')}</h1>
      <p style={S.body}>{tr('כל מה שאספתם שמור. אפשר להמשיך מאיפה שהייתם.')}</p>
      <button onClick={reset} style={S.cta}>{tr('להמשיך')}</button>
      <button onClick={() => window.location.reload()} style={{ ...S.cta, ...S.ghost }}>{tr('לפתוח מחדש')}</button>
    </div>
  )
}

const S = {
  wrap: { minHeight: '100dvh', background: '#0F150F', color: '#E9E5D8', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px', textAlign: 'center',
    fontFamily: '"Heebo", system-ui, -apple-system, sans-serif' },
  eyebrow: { fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color: '#E5A342', margin: 0 },
  h1: { fontSize: 26, fontWeight: 900, margin: '6px 0 0' },
  body: { color: '#9BA495', fontSize: 16, margin: '0 0 10px', maxWidth: 320, lineHeight: 1.5 },
  cta: { padding: '15px 34px', borderRadius: 999, border: 'none', background: '#E5A342', color: '#14200F',
    fontSize: 18, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' },
  ghost: { background: 'transparent', color: '#E9E5D8', border: '1px solid rgba(233,229,216,.3)', fontSize: 15, padding: '11px 24px' },
}

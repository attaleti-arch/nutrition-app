'use client'
import { useEffect, useState } from 'react'
import { MONSTERS } from '../monsters'

// ─── היצור בחדר ───
// model-viewer עוטף את שני המנועים המקומיים: Scene Viewer באנדרואיד
// ו-AR Quick Look באייפון. שניהם נפתחים מדף אינטרנט רגיל, בלי אפליקציה,
// ובלי הרשאה מיוחדת מעבר לגישה למצלמה שהמערכת מבקשת בעצמה.
//
// אייפון דורש .usdz ואנדרואיד .glb — לכן שניהם נבנים ב-scripts/make-3d-monsters.py

const C = { cream: '#F3EDE1', card: '#FBF7EE', ink: '#22271E', soft: '#5A6154', olive: '#3F5C53', line: '#DCD2BE' }

export default function ArPage() {
  const [ready, setReady] = useState(false)
  const [os, setOs] = useState('')
  const [id, setId] = useState('puch')

  useEffect(() => {
    const ua = navigator.userAgent
    setOs(/iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop')
    if (customElements.get('model-viewer')) { setReady(true); return }
    const el = document.createElement('script')
    el.type = 'module'
    el.src = '/vendor/model-viewer.min.js'
    el.onload = () => setReady(true)
    document.body.appendChild(el)
  }, [])

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.cream, color: C.ink,
      fontFamily: '"Heebo", system-ui, sans-serif', lineHeight: 1.7 }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 18px 60px' }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.12em', color: '#B4661A', margin: '0 0 8px' }}>
          ניסוי · ששת היצורים
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 10px', lineHeight: 1.15 }}>היצורים בתלת־ממד</h1>
        <p style={{ color: C.soft, margin: '0 0 20px' }}>
בוחרים יצור, מסובבים אותו באצבע. ובנייד — הכפתור פותח את המצלמה ומעמיד אותו על הרצפה.
        </p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {MONSTERS.map(m => (
            <button key={m.id} onClick={() => setId(m.id)} style={{
              flex: '1 1 30%', padding: '9px 4px', borderRadius: 11, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700,
              border: `1.5px solid ${id === m.id ? C.olive : C.line}`,
              background: id === m.id ? C.olive : C.card,
              color: id === m.id ? C.cream : C.ink,
            }}>{m.name}</button>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, overflow: 'hidden' }}>
          {ready ? (
            <model-viewer
              key={id}
              src={`/monsters3d/${id}.glb`}
              ios-src={`/monsters3d/${id}.usdz`}
              alt="יצור"
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="fixed"
              camera-controls
              auto-rotate
              auto-rotate-delay="1200"
              rotation-per-second="14deg"
              environment-image="neutral"
              shadow-intensity="1"
              shadow-softness="0.9"
              exposure="1"
              camera-orbit="18deg 78deg auto"
              style={{ width: '100%', height: '58vh', minHeight: 340, background: '#EDE7DA' }}
            />
          ) : (
            <div style={{ height: '58vh', minHeight: 340, display: 'grid', placeItems: 'center', color: C.soft }}>
              טוען…
            </div>
          )}
        </div>

        <p style={{ ...note, marginTop: 18 }}>
          {os === 'ios' && <>באייפון: לחצי על <b>הכפתור עם האייקון בפינת המסך</b> ← ״AR״. הטלפון יבקש להזיז את המצלמה כדי לזהות את הרצפה.</>}
          {os === 'android' && <>באנדרואיד: לחצי על <b>הכפתור בפינת המסך</b>, וגוגל תפתח את המצלמה.</>}
          {os === 'desktop' && <>במחשב אין AR — כאן אפשר רק לסובב אותו. <b>פתחי את הדף בנייד</b> כדי להעמיד אותו על הרצפה.</>}
        </p>

        <div style={box}>
          <p style={{ margin: '0 0 10px', fontWeight: 700 }}>מה שאני צריך לדעת ממך</p>
          <ol style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>הוא נראה <b>מרשים</b> או <b>זול</b>? זו השאלה היחידה.</li>
            <li>הגודל על הרצפה מתאים, או שצריך גדול יותר?</li>
            <li>מה חסר לו כדי להיות ״וואו״ — צבע, פרטים, תנועה?</li>
          </ol>
        </div>

        <a href="/hunt" style={cta}>חזרה למשחק</a>
      </div>
    </div>
  )
}

const note = {
  paddingInlineStart: 14, borderInlineStart: `2px solid ${C.olive}`,
  color: C.soft, fontSize: 15.5, margin: 0,
}
const box = {
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
  padding: '18px 20px', margin: '24px 0 0', fontSize: 15.5,
}
const cta = {
  display: 'block', textAlign: 'center', marginTop: 22, padding: '14px 18px',
  borderRadius: 13, background: C.olive, color: C.cream,
  fontSize: 16.5, fontWeight: 800, textDecoration: 'none',
}

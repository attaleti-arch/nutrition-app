'use client'
import { useState } from 'react'
import { tr } from '../i18n'
import { WIND_NAME } from '../engine/wind'
import { TANK_MAX, tankShown, tankFull, hasHeartEgg, tamedCount, tamedWind, HATCH_M } from '../engine/tank'
import { TANK_GLASS } from '../content/spots'
import { sfxAppear, buzz } from '../engine/audio'

// ─── מה שבשואב ───
// "יודע שאני לא אוהבת את הכלוב הזה." אז אין כלוב. הכלי שקנו עומד בעולם,
// ובתוך מיכל הזכוכית שכבר מצויר בו — בדיוק שם, לפי מדידה של הקובץ —
// מסתחררים הגובטבו שנשאבו. "איך יראו אותם": ככה. דרך הזכוכית.
//
// ומה שמרכך אותם הוא לא הלחיצה כאן אלא ההליכה: כשהחמישי נכנס, ביצת הלב
// יושבת על המיכל, קרה, ומחכה למסע שלם. לחיצה עליה אומרת מה חסר, ולא
// פותחת אותה — כי אי אפשר לפתוח אותה בלחיצה. זה כל הרעיון.

export function WindTank({ progress, onOpen }) {
  const [glow, setGlow] = useState(false)
  const n = tankShown(progress)
  const egg = hasHeartEgg(progress)
  const tamed = tamedCount(progress)
  const perWalk = tamedWind(progress)
  if (!n && !tamed) return null          // עוד לא נשאב אף אחד — אין מה להראות

  const tap = () => {
    setGlow(true); setTimeout(() => setGlow(false), 900)
    try { sfxAppear(); buzz([25]) } catch (e) { /* לא קריטי */ }
    onOpen?.()
  }

  return (
    <div style={T.wrap}>
      <style>{CSS}</style>
      {/* טובי הלב: כבר לא בפנים. מרחפים מעל הכלי, בזהב חם. */}
      {tamed > 0 && Array.from({ length: Math.min(TANK_MAX, tamed) }, (_, i) => (
        <img key={`t${i}`} src="/world/wind/poster.webp" alt="" aria-hidden="true" draggable={false}
          style={{ ...T.free, left: `${FREE[i][0]}%`, bottom: `${FREE[i][1]}%`,
            animationDelay: `${i * 0.45}s`, transform: i % 2 ? 'scaleX(-1)' : 'none' }} />
      ))}

      <button onClick={tap} aria-label={tr('שואב הרוח')} style={T.btn}>
        {/* מה שבתוך הזכוכית. מעל התמונה ולא מתחתיה — הזכוכית בקובץ
            אטומה, ומי שמצויר מאחוריה פשוט לא נראה. mix-blend screen
            עושה את העבודה שהשקיפות הייתה אמורה לעשות: הם זוהרים בתוכה. */}
        {Array.from({ length: n }, (_, i) => (
          <img key={i} src="/world/wind/poster.webp" alt="" aria-hidden="true" draggable={false}
            style={{ ...T.inside,
              left: `${TANK_GLASS.cx + INSIDE[i][0] * TANK_GLASS.rx}%`,
              top: `${TANK_GLASS.cy + INSIDE[i][1] * TANK_GLASS.ry}%`,
              animationDelay: `${i * 0.35}s` }} />
        ))}
        {/* והאור שממלא אותו: ככל שיש בו יותר, כך הוא בוהק יותר */}
        <span aria-hidden="true" style={{ ...T.glass, opacity: 0.18 + n * 0.07 + (glow ? 0.25 : 0),
          left: `${TANK_GLASS.cx}%`, top: `${TANK_GLASS.cy}%`,
          width: `${TANK_GLASS.rx * 2.6}%`, paddingBottom: `${TANK_GLASS.rx * 2.6}%` }} />
        <img src="/world/gear/vacuum.webp" alt="" draggable={false} style={T.tool} />

        {/* ביצת הלב: יושבת על המיכל כשהוא מלא. קרה — עד שהולכים. */}
        {egg && (
          <span style={T.egg} aria-hidden="true">🥚
            <span style={T.heart}>❤️</span>
          </span>
        )}

        <span style={{ ...T.tag, borderColor: egg ? '#F0C069' : 'rgba(110,168,230,.5)', color: egg ? '#F0C069' : '#C3D8EE' }}>
          {tamed > 0 && !n ? `❤️ ${tamed} · 🌬️ +${perWalk}` : `🌀 ${n}/${TANK_MAX}`}
        </span>
      </button>

      {egg && <span style={T.call}>{tr('🥚 מסע שלם והיא בוקעת')}</span>}
    </div>
  )
}

// ─── ומה יש בו באמת ───
// "אבל איך יראו אותם?" בגודל של העולם, מיכל הזכוכית הוא עשרים פיקסלים —
// שם אף דמות לא תיקרא, כמה שלא ננסה. אז לחיצה על הכלי פותחת את זה:
// חמישה מקומות, ומי שכבר בפנים יושב בהם בגודל אמיתי. גם מה שחסר נראה —
// עיגול ריק הוא הזמנה לצאת מחר.
export function TankCard({ progress, onClose }) {
  const n = tankShown(progress)
  const egg = hasHeartEgg(progress)
  const tamed = tamedCount(progress)
  const km = (HATCH_M / 1000).toFixed(1).replace(/\.0$/, '')
  return (
    <div style={K.card} onClick={e => e.stopPropagation()}>
      <style>{CSS}</style>
      <button onClick={onClose} style={K.x} aria-label={tr('סגירה')}>✕</button>
      <p style={K.title}>{tr('בשואב')} <b style={{ color: egg ? '#F0C069' : '#8ED0F0' }}>{n}/{TANK_MAX}</b></p>
      <div style={K.slots}>
        {Array.from({ length: TANK_MAX }, (_, i) => (
          <span key={i} style={{ ...K.slot, borderColor: i < n ? 'rgba(110,168,230,.55)' : 'rgba(233,229,216,.18)' }}>
            {i < n
              ? <img src="/world/wind/poster.webp" alt="" draggable={false} style={{ ...K.face, animationDelay: `${i * 0.3}s` }} />
              : <span style={K.empty}>·</span>}
          </span>
        ))}
      </div>
      {tamed > 0 && (
        <div style={K.tamedRow}>
          {Array.from({ length: Math.min(TANK_MAX, tamed) }, (_, i) => (
            <img key={i} src="/world/wind/poster.webp" alt="" draggable={false} style={{ ...K.face, ...K.tamedFace }} />
          ))}
          <span style={K.tamedText}>{tr('❤️ {n} טובי לב — אחד מהם יוצא איתכם, ורוח אחת נכנסת בכל מסע.', { n: tamed })}</span>
        </div>
      )}
      <p style={K.line}>
        {egg
          ? tr('🥚 ביצת הלב יושבת על המיכל, וקרה. מסע של {km} ק״מ — והיא בוקעת, וחמישה יוצאים טובי לב.', { km })
          : n
            ? tr('עוד {k} {wind} בשואב, ותהיה ביצת לב. שואבים אותם בדרך.', { k: TANK_MAX - n, wind: tr(WIND_NAME) })
            : tr('שאבו {wind} בדרך, והוא יחכה כאן.', { wind: tr(WIND_NAME) })}
      </p>
    </div>
  )
}

const K = {
  card: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(15,21,15,.94)', border: '1px solid #2B382B', color: '#E9E5D8', zIndex: 7 },
  x: { position: 'absolute', top: 6, insetInlineEnd: 8, background: 'transparent', border: 'none', color: '#767F71', fontSize: 17, fontFamily: 'inherit', cursor: 'pointer', padding: 4 },
  title: { margin: 0, fontSize: 12.5, color: '#8ED0F0', fontWeight: 800, letterSpacing: '.04em' },
  slots: { display: 'flex', gap: 7, margin: '8px 0' },
  slot: { flex: 1, aspectRatio: '1', maxWidth: 62, borderRadius: 12, border: '1.5px dashed', display: 'grid', placeItems: 'center', background: 'rgba(110,168,230,.07)', overflow: 'hidden' },
  face: { height: '84%', width: 'auto', maxWidth: '88%', objectFit: 'contain', animation: 'wildenFaceSpin 2.6s ease-in-out infinite' },
  tamedFace: { height: 30, width: 'auto', maxWidth: 'none', animation: 'none', filter: 'sepia(.8) saturate(2.2) hue-rotate(-18deg) brightness(1.12)' },
  empty: { color: '#4A5247', fontSize: 20, fontWeight: 900 },
  tamedRow: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', marginBottom: 6 },
  tamedText: { marginInlineStart: 6, fontSize: 13, fontWeight: 700, color: '#FFD3DC' },
  line: { margin: 0, fontSize: 13.5, lineHeight: 1.5, color: '#C3D8EE' },
}

// היסטים ביחס לרדיוס מיכל הזכוכית: אשכול קטן בתוכו, לא שורה.
const INSIDE = [[0, -0.08], [-0.45, 0.25], [0.45, 0.25], [-0.3, -0.45], [0.33, -0.42]]
// ואחרי שיצאו: קשת מעל הכלי.
const FREE = [[-10, 76], [16, 92], [44, 100], [72, 92], [98, 76]]

const CSS = `
@keyframes wildenInTank { 0%,100% { transform: translate(-50%,-50%) rotate(-10deg) scale(1) } 50% { transform: translate(-50%,-50%) rotate(12deg) scale(1.08) } }
/* בכרטיס הם לא ממורכזים אבסולוטית — ולכן בלי translate, אחרת הם נגררים
   החוצה מהמשבצת ונחתכים. אותה תנועה, בלי ההזזה. */
@keyframes wildenFaceSpin { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(9deg) } }
@keyframes wildenFreeWind { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
@keyframes wildenEggFloat { 0%,100% { transform: translate(-50%,0) scale(1) } 50% { transform: translate(-50%,-5px) scale(1.05) } }
@keyframes wildenTankPulse { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
`

const T = {
  wrap: { position: 'relative', width: '100%', pointerEvents: 'auto' },
  btn: { position: 'relative', display: 'block', width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', filter: 'drop-shadow(0 5px 12px rgba(0,0,0,.55))' },
  tool: { position: 'relative', zIndex: 2, width: '100%', display: 'block' },
  inside: { position: 'absolute', zIndex: 3, width: '13%', height: 'auto', transform: 'translate(-50%,-50%)',
    opacity: 0.75, filter: 'brightness(1.1) saturate(1.3)',
    animation: 'wildenInTank 1.8s ease-in-out infinite', pointerEvents: 'none' },
  glass: { position: 'absolute', zIndex: 3, mixBlendMode: 'screen', transform: 'translate(-50%,-50%)', height: 0, borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(180,230,255,.5), rgba(110,168,230,.22) 55%, rgba(110,168,230,0) 72%)',
    transition: 'opacity .6s ease' },
  // טוב לב: אותו קליפ, בזהב חם — כבר לא הדבר הכחול שקופץ עליך בחוץ
  free: { position: 'absolute', width: '22%', height: 'auto', zIndex: 3, pointerEvents: 'none',
    filter: 'sepia(.8) saturate(2.2) hue-rotate(-18deg) brightness(1.12) drop-shadow(0 0 10px rgba(255,214,110,.55))',
    animation: 'wildenFreeWind 3s ease-in-out infinite' },
  egg: { position: 'absolute', zIndex: 4, left: '60%', top: '-8%', fontSize: 24, animation: 'wildenEggFloat 2.2s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(255,120,150,.7))' },
  heart: { position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', fontSize: 11 },
  tag: { position: 'absolute', zIndex: 5, left: '50%', bottom: '-6%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
    background: 'rgba(15,21,15,.88)', border: '1px solid', borderRadius: 999, padding: '1px 7px', fontSize: 10.5, fontWeight: 800 },
  call: { position: 'absolute', zIndex: 5, left: '50%', bottom: '-22%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
    background: '#F0C069', color: '#14200F', borderRadius: 999, padding: '2px 8px', fontSize: 10.5, fontWeight: 900,
    animation: 'wildenTankPulse 2.4s ease-in-out infinite' },
}

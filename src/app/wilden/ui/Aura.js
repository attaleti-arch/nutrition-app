'use client'

// ─── הילה ───
// שני שימושים: יצור שגדל בלי דמות לשלב (טורקיז לבוגר, זהב לאגדי), וצבע
// מהביצה (color — הצבע של הגוון). מאחורי התמונה (zIndex 0), בלי filter על
// ה-WebP המונפש עצמו.
export function Aura({ stage = 1, size = '110%', color = null }) {
  if (!color && (!stage || stage < 2)) return null
  const gold = stage >= 3
  const c1 = color || (gold ? 'rgba(255,214,110,.55)' : 'rgba(110,230,200,.45)')
  const c2 = color ? color.replace(/[\d.]+\)$/, '.16)') : gold ? 'rgba(240,192,105,.18)' : 'rgba(90,200,170,.14)'
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', left: '50%', top: '55%', width: size, height: size, transform: 'translate(-50%,-50%)',
      borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
      background: `radial-gradient(circle, ${c1}, ${c2} 45%, rgba(0,0,0,0) 70%)`,
      animation: `wildenAura ${gold ? 2.2 : 3}s ease-in-out infinite`,
    }}>
      <style>{`@keyframes wildenAura { 0%,100% { opacity: .75; transform: translate(-50%,-50%) scale(1) } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.08) } }`}</style>
    </span>
  )
}

// ההילה של יצור בשלב/צבע: מה שצריך, או כלום.
export function CreatureAura({ c, size }) {
  if (!c) return null
  if (c.auraColor) return <Aura stage={c.stage} size={size} color={c.auraColor} />
  if (c.aura) return <Aura stage={c.stage} size={size} />
  return null
}

// תג קטן: "בוגר" / "אגדי"
export function StageTag({ stage, style }) {
  if (!stage || stage < 2) return null
  const gold = stage >= 3
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 900,
      background: gold ? '#F0C069' : '#6EE6C8', color: '#14200F', ...style }}>{gold ? '✦ אגדי' : '▲ בוגר'}</span>
  )
}

'use client'
import { useState } from 'react'
import { tr } from '../i18n'
import { CAGE_MAX, cagedShown, cageFull, tamedCount, tamedWind, CAGE_NAME } from '../engine/cage'
import { sfxAppear, sfxCheer, buzz } from '../engine/audio'

// ─── כלוב הרוחות ───
// "כלוב של 5 גוסטבו בעולם, ואז ביצה או חפץ שהופך אותם טובי לב."
//
// הכלוב מצויר ולא מצולם: SVG של כלוב ברזל על בסיס אבן, כדי שהוא יישב על
// התפאורה שלה בלי לחכות לקובץ, ויישאר חד בכל זום. מה שבתוכו זה הקליפ
// האמיתי של גובטבו בקטן — אותו יצור שנשאב בחוץ, עכשיו מאחורי סורגים.
//
// שלושה מצבים, ורואים את ההבדל מרחוק:
//   ריק/מתמלא — סורגים אפורים, הרוחות בפנים נעות בעצבנות. "2/5"
//   מלא        — ביצת הלב מרחפת מעליו ופועמת. לוחצים.
//   רוככו      — הסורגים נפתחים, האור מתחמם, והם מרחפים חופשי מסביב.

const HATCH_MS = 1800

export function WindCage({ progress, onTame }) {
  const [hatching, setHatching] = useState(false)
  const caged = cagedShown(progress)
  const full = cageFull(progress)
  const tamed = tamedCount(progress)
  const perWalk = tamedWind(progress)
  if (!caged && !tamed) return null            // עוד לא נשאב אף אחד — אין כלוב

  const hatch = () => {
    if (!full || hatching) return
    setHatching(true)
    try { sfxAppear(); buzz([40, 50, 40, 50, 80]) } catch (e) { /* לא קריטי */ }
    setTimeout(() => {
      onTame?.()
      setHatching(false)
      try { sfxCheer() } catch (e) { /* לא קריטי */ }
    }, HATCH_MS)
  }

  const open = tamed > 0 && !caged            // הכלוב ריק ומי שהיה בו כבר בחוץ
  return (
    <div style={C.wrap}>
      <style>{CSS}</style>
      {/* טובי הלב: מרחפים מעל הכלוב, בזהב חם — אותו גובטבו, צבע אחר.
          בקשת, לא בשורה: חמישה בשורה ישרה נראים כמו סרגל. */}
      {tamed > 0 && Array.from({ length: Math.min(CAGE_MAX, tamed) }, (_, i) => (
        <img key={`t${i}`} src="/world/wind/poster.webp" alt="" aria-hidden="true" draggable={false}
          style={{ ...C.free, left: `${FREE[i][0]}%`, bottom: `${FREE[i][1]}%`,
            animationDelay: `${i * 0.45}s`, transform: i % 2 ? 'scaleX(-1)' : 'none' }} />
      ))}

      <button onClick={hatch} disabled={!full || hatching} aria-label={tr(CAGE_NAME)} style={C.btn}>
        <svg viewBox="0 0 100 116" style={{ width: '100%', display: 'block', overflow: 'visible', position: 'relative', zIndex: 1 }} aria-hidden="true">
          <defs>
            <clipPath id="wildenCageDome"><path d="M8,98 L8,48 A42,42 0 0 1 92,48 L92,98 Z" /></clipPath>
            <linearGradient id="wildenCageBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6E7680" /><stop offset=".45" stopColor="#C3CBD4" /><stop offset="1" stopColor="#5A626B" />
            </linearGradient>
            <radialGradient id="wildenCageGlow">
              <stop offset="0" stopColor={open ? 'rgba(255,214,110,.85)' : 'rgba(110,168,230,.6)'} />
              <stop offset="1" stopColor="rgba(110,168,230,0)" />
            </radialGradient>
          </defs>
          {/* מה שבתוך הכלוב — מתחת לסורגים */}
          <ellipse cx="50" cy="66" rx="34" ry="30" fill="url(#wildenCageGlow)" />
          {/* הסורגים. אחרי הריכוך שניים מהם נפתחים החוצה */}
          <g clipPath="url(#wildenCageDome)">
            {[22, 36, 50, 64, 78].map((x, i) => {
              const swung = open && (i === 1 || i === 3)
              return <rect key={x} x={x - 2} y="20" width="4" height="82" rx="2" fill="url(#wildenCageBar)"
                style={{ transformOrigin: `${x}px 98px`, transform: swung ? `rotate(${i === 1 ? -26 : 26}deg)` : 'none', transition: 'transform 1.2s cubic-bezier(.2,.9,.3,1)' }} />
            })}
          </g>
          <path d="M8,98 L8,48 A42,42 0 0 1 92,48 L92,98" fill="none" stroke="url(#wildenCageBar)" strokeWidth="5" strokeLinecap="round" />
          <path d="M14,62 H86" fill="none" stroke="url(#wildenCageBar)" strokeWidth="3.5" opacity=".9" />
          {/* הטבעת למעלה, והבסיס: אבן, כמו כל דבר שהשומר בנה */}
          <path d="M50,20 A6,6 0 1 1 50,8 A6,6 0 1 1 50,20" fill="none" stroke="#8A919A" strokeWidth="3" />
          <rect x="2" y="96" width="96" height="14" rx="5" fill="#5C5A52" />
          <rect x="2" y="96" width="96" height="5" rx="2.5" fill="#7A776C" />
        </svg>

        {/* הכלואים: הקליפ האמיתי בקטן, נעים בעצבנות *מאחורי* הסורגים —
            zIndex 0 מתחת ל-SVG, אחרת הם נראים כמו ניצבים לפני הכלוב. */}
        {Array.from({ length: caged }, (_, i) => (
          <img key={i} src="/world/wind/poster.webp" alt="" aria-hidden="true" draggable={false}
            style={{ ...C.caged, left: `${INSIDE[i][0]}%`, top: `${INSIDE[i][1]}%`,
              animationDelay: `${i * 0.3}s`, opacity: hatching ? 0 : 1 }} />
        ))}

        {/* ביצת הלב: מופיעה רק כשהכלוב מלא */}
        {full && (
          <span style={{ ...C.egg, ...(hatching ? C.eggCrack : null) }} aria-hidden="true">🥚
            <span style={C.heart}>❤️</span>
          </span>
        )}
        {hatching && <span style={C.burst} aria-hidden="true" />}

        {/* מה כתוב מתחת: מצב, ובמילה — העולם הוא תמונה, לא לוח מחוונים.
            ההסבר המלא יושב במסך הבית, לפני שיוצאים. */}
        <span style={{ ...C.tag, borderColor: full ? '#F0C069' : 'rgba(110,168,230,.5)', color: full ? '#F0C069' : '#C3D8EE' }}>
          {tamed > 0 && !caged ? `❤️ ${tamed} · 🌬️ +${perWalk}` : `🌀 ${caged}/${CAGE_MAX}`}
        </span>
      </button>

      {full && !hatching && <span style={C.call}>{tr('🥚 לחצו')}</span>}
    </div>
  )
}

const CSS = `
@keyframes wildenCaged { 0%,100% { transform: translate(-50%,-50%) translateY(0) rotate(-6deg) } 50% { transform: translate(-50%,-50%) translateY(-5px) rotate(8deg) } }
@keyframes wildenFreeWind { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
@keyframes wildenEggFloat { 0%,100% { transform: translate(-50%,0) scale(1) } 50% { transform: translate(-50%,-6px) scale(1.06) } }
@keyframes wildenEggCrack { 0% { transform: translate(-50%,0) rotate(0) scale(1) } 20% { transform: translate(-50%,0) rotate(-14deg) scale(1.1) } 40% { transform: translate(-50%,0) rotate(14deg) scale(1.1) } 60% { transform: translate(-50%,-4px) rotate(-10deg) scale(1.15) } 100% { transform: translate(-50%,-10px) rotate(0) scale(0) ; opacity: 0 } }
@keyframes wildenCageBurst { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.2) } 45% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%,-50%) scale(2.6) } }
`

// איפה עומדים החמישה בתוך הכיפה, ואיפה מרחפים אחרי שיצאו. מספרים, לא
// חשבון: שלושה למעלה ושניים מתחתיהם ממלאים כיפה; חמישה בשורה נראים סרגל.
const INSIDE = [[30, 50], [50, 44], [70, 50], [38, 68], [62, 68]]
const FREE = [[-6, 84], [18, 100], [46, 108], [74, 100], [98, 84]]

const C = {
  wrap: { position: 'relative', width: '100%', pointerEvents: 'auto' },
  btn: { position: 'relative', display: 'block', width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.5))' },
  caged: { position: 'absolute', width: '22%', height: 'auto', transform: 'translate(-50%,-50%)', zIndex: 0,
    filter: 'brightness(.82) saturate(1.2) drop-shadow(0 0 6px rgba(110,168,230,.55))',
    animation: 'wildenCaged 1.6s ease-in-out infinite', transition: 'opacity .5s ease', pointerEvents: 'none' },
  // טוב לב: אותו קליפ, בזהב חם — כבר לא הדבר הכחול שקופץ עליך בחוץ
  free: { position: 'absolute', width: '24%', height: 'auto', zIndex: 2, pointerEvents: 'none',
    filter: 'sepia(.8) saturate(2.2) hue-rotate(-18deg) brightness(1.12) drop-shadow(0 0 10px rgba(255,214,110,.55))',
    animation: 'wildenFreeWind 3s ease-in-out infinite' },
  egg: { position: 'absolute', left: '50%', top: '-16%', fontSize: 26, animation: 'wildenEggFloat 2.2s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(255,120,150,.7))' },
  eggCrack: { animation: `wildenEggCrack ${1800}ms ease-in forwards` },
  heart: { position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', fontSize: 12 },
  burst: { position: 'absolute', left: '50%', top: '55%', width: '90%', aspectRatio: '1', borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,236,190,.95), rgba(255,180,120,.5) 45%, rgba(255,180,120,0) 70%)', animation: 'wildenCageBurst 1.8s ease-out forwards' },
  tag: { position: 'absolute', left: '50%', bottom: '-8%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 3,
    background: 'rgba(15,21,15,.88)', border: '1px solid', borderRadius: 999, padding: '1px 7px', fontSize: 10.5, fontWeight: 800 },
  call: { position: 'absolute', left: '50%', bottom: '-24%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 3,
    background: '#F0C069', color: '#14200F', borderRadius: 999, padding: '2px 8px', fontSize: 10.5, fontWeight: 900 },
}

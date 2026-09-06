'use client'
import { PHASE } from '../engine/beacon'

// ─── הביקון ───
// החפץ של הילד. שני צירים נפרדים על אותו עצם:
//
//   POWER — כמה הוא התחזק לאורך עולם 1. זה מה שהופך את מסע 7 למשמעותי:
//           הילד רואה שהחפץ שלו אחר ממה שהיה במסע 1, בלי שאף אחד אמר לו.
//   PHASE — איפה אנחנו בחיפוש הנוכחי.
//
// אין כאן מרחק במטרים ואין ספירה. חץ מופיע רק כשהדיוק מאפשר אותו —
// חץ שמסתובב אקראית גרוע יותר מאין חץ.

const POWER_LOOK = {
  DORMANT:    { core: '#6E6A5E', glow: 0,    ring: 0, leaf: '#7C8A6E', shell: '#B9AE97' },
  REACTIVE:   { core: '#C08A3E', glow: 0.35, ring: 0, leaf: '#8FA277', shell: '#C6BAA1' },
  ACTIVE:     { core: '#E9A13B', glow: 0.7,  ring: 1, leaf: '#9CB37F', shell: '#D2C5A9' },
  EVOLVING:   { core: '#F5B94E', glow: 1,    ring: 2, leaf: '#A9C288', shell: '#DCCFB1' },
  FULL_POWER: { core: '#8FD3F0', glow: 1.35, ring: 3, leaf: '#B6CE92', shell: '#E6D9BA' },
}

export function Beacon({ power = 'DORMANT', phase = PHASE.IDLE, arrow = false, bearing = 0, size = 132 }) {
  const L = POWER_LOOK[power] || POWER_LOOK.DORMANT
  const hot = phase === PHASE.VERY_CLOSE || phase === PHASE.SAFE_STOP
  const pulse = phase === PHASE.IDLE ? 0 : phase === PHASE.SIGNAL_WEAK ? 2.8
    : phase === PHASE.DIRECTION ? 1.9 : phase === PHASE.TRACE ? 1.1 : 0.55

  return (
    <div style={{ position: 'relative', width: size, height: size * 1.18 }}>
      <svg viewBox="0 0 100 118" width={size} height={size * 1.18} aria-hidden="true">
        <defs>
          <radialGradient id="wbCore">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.95 * (L.glow || 0.2)} />
            <stop offset="45%" stopColor={L.core} stopOpacity={L.glow ? 0.95 : 0.5} />
            <stop offset="100%" stopColor={L.core} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wbShell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={L.shell} />
            <stop offset="100%" stopColor="#8C8271" />
          </linearGradient>
        </defs>

        {/* הקליפה — טיפה של אבן. היא לא משתנה לאורך המשחק, וזה בכוונה:
            החפץ אותו חפץ, מה שמשתנה זה מה שבתוכו. */}
        <path d="M50 8 C72 30 84 50 84 66 C84 88 69 104 50 104 C31 104 16 88 16 66 C16 50 28 30 50 8 Z"
          fill="url(#wbShell)" stroke="#6E6558" strokeWidth="1.6" />

        {/* עלה — הסימן של WILDEN */}
        <path d="M50 14 C61 28 64 40 58 50 C50 43 45 32 50 14 Z" fill={L.leaf} opacity="0.95" />
        <path d="M50 14 C52 30 55 40 58 50" stroke="#5E7150" strokeWidth="0.9" fill="none" opacity="0.5" />

        {/* טבעות ההתחזקות. הן בתוך הקליפה ולא סביבה — זה מה שהילד רואה
            משתנה במסע 7 בלי שאף אחד אמר לו. */}
        {[1, 2, 3].slice(0, L.ring).map(i => (
          <circle key={i} cx="50" cy="70" r={11 + i * 7} fill="none"
            stroke={L.core} strokeWidth="1.5" opacity={0.62 - i * 0.13} />
        ))}

        {/* הליבה. הפעימה מתקצרת ככל שמתקרבים — זה כל מה שהילד צריך
            כדי לדעת שהוא מתחמם, בלי מספר אחד. */}
        <circle cx="50" cy="70" r="24" fill="url(#wbCore)"
          style={pulse ? { animation: `wbPulse ${pulse}s ease-in-out infinite` } : undefined} />
        <circle cx="50" cy="70" r={hot ? 9 : 7} fill={L.core}
          opacity={L.glow ? 1 : 0.55}
          style={pulse ? { animation: `wbPulse ${pulse}s ease-in-out infinite` } : undefined} />

        {/* החץ. מסתובב סביב הליבה ולא מצביע על מפה — הילד מרים את
            הראש ומסתכל לכיוון, לא על מסך. */}
        {arrow && (
          <g transform={`rotate(${bearing} 50 70)`}>
            <path d="M50 40 L56 53 L50 49.5 L44 53 Z" fill={L.core} stroke="#1B2618" strokeWidth="0.7" />
          </g>
        )}
      </svg>
    </div>
  )
}

export const BEACON_CSS = `
@keyframes wbPulse {
  0%,100% { opacity: .55; transform: scale(.94); transform-origin: 50px 70px }
  50%     { opacity: 1;   transform: scale(1.06); transform-origin: 50px 70px }
}
@media (prefers-reduced-motion: reduce) {
  [style*="wbPulse"] { animation: none !important }
}
`

// שורת הטקסט מתחת לביקון. קצרה בכוונה — היא נקראת בהליכה.
export function BeaconLine({ line, sub, tone = 'calm' }) {
  if (!line) return null
  return (
    <div style={{ textAlign: 'center', marginTop: 14 }}>
      <p style={{
        margin: 0, fontSize: 19, fontWeight: 700,
        color: tone === 'hot' ? '#E9A13B' : '#E8E4D8',
      }}>{line}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 15, color: '#9BA495' }}>{sub}</p>}
    </div>
  )
}

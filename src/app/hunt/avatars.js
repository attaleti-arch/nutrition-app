'use client'

// ─── האוואטרים ───
// מצוירים ולא אימוג'י: אימוג'י נראה שונה בכל מכשיר, אי אפשר להנפיש אותו,
// ואי אפשר לתת לו ציוד. כאן כל חלק הוא צורה שאפשר להזיז, לצבוע ולשדרג.

export const AVATARS = [
  { id: 'nova', name: 'נובה', skin: '#F0C9A4', suit: '#7FA8D9', trim: '#3E6699', accent: '#FFD97A' },
  { id: 'zuri', name: 'זורי', skin: '#C98D63', suit: '#5C6270', trim: '#333844', accent: '#7FD6B5' },
  { id: 'kai', name: 'קאי', skin: '#EEBE93', suit: '#9B84C4', trim: '#5F4C86', accent: '#FFE08A' },
]
export const avatarOf = id => AVATARS.find(a => a.id === id) || AVATARS[0]

// bob: 0..1 — שלב הנשימה. mood: 'idle' | 'ready' | 'happy'
export function Avatar({ id, size = 130, mood = 'idle' }) {
  const a = avatarOf(id)
  const eyeY = mood === 'happy' ? 40 : 42

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 100 125" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="50" cy="119" rx="26" ry="5" fill="#000" opacity="0.13" />

      {/* רגליים */}
      <rect x="38" y="92" width="9" height="22" rx="4.5" fill={a.trim} />
      <rect x="53" y="92" width="9" height="22" rx="4.5" fill={a.trim} />
      <ellipse cx="42.5" cy="115" rx="7" ry="4" fill="#2A2F26" />
      <ellipse cx="57.5" cy="115" rx="7" ry="4" fill="#2A2F26" />

      {/* גוף */}
      <path d="M32,62 q18,-7 36,0 l3,26 q-21,7 -42,0 Z" fill={a.suit} />
      <path d="M32,62 q18,-7 36,0 l1,8 q-19,6 -38,0 Z" fill="#fff" opacity="0.17" />
      <circle cx="50" cy="76" r="5" fill={a.accent} />
      <circle cx="50" cy="76" r="2" fill={a.trim} opacity="0.6" />

      {/* ידיים */}
      <rect x="22" y="64" width="9" height="24" rx="4.5" fill={a.trim}
        transform={mood === 'happy' ? 'rotate(-28 26 68)' : 'rotate(-6 26 68)'} />
      <rect x="69" y="64" width="9" height="24" rx="4.5" fill={a.trim}
        transform={mood === 'happy' ? 'rotate(28 74 68)' : 'rotate(6 74 68)'} />

      {/* ראש */}
      <circle cx="50" cy="40" r="23" fill={a.skin} />

      {id === 'nova' && (
        <>
          <path d="M27,40 a23,23 0 0 1 46,0 a23,23 0 0 1 -46,0 Z" fill="#BFE3FF" opacity="0.32" />
          <path d="M27,38 a23,23 0 0 1 46,0 l0,-3 a23,23 0 0 0 -46,0 Z" fill={a.suit} />
          <circle cx="50" cy="40" r="23" fill="none" stroke={a.trim} strokeWidth="3" />
          <path d="M34,29 q9,-6 18,-3" stroke="#fff" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
        </>
      )}
      {id === 'zuri' && (
        <>
          <path d="M27,36 a23,23 0 0 1 46,0 l0,-2 a23,23 0 0 0 -46,0 Z" fill={a.trim} />
          <path d="M27,40 a23,23 0 0 1 46,0 l0,-6 l-46,0 Z" fill={a.suit} />
          <rect x="27" y="46" width="46" height="9" rx="4" fill={a.trim} opacity="0.92" />
          <path d="M70,34 q12,4 9,16 q-5,-8 -11,-11 Z" fill={a.trim} />
        </>
      )}
      {id === 'kai' && (
        <>
          <path d="M50,4 L70,34 L30,34 Z" fill={a.suit} />
          <path d="M50,4 L60,19 L40,19 Z" fill="#fff" opacity="0.18" />
          <circle cx="50" cy="12" r="3.4" fill={a.accent} />
          <rect x="26" y="31" width="48" height="7" rx="3.5" fill={a.trim} />
        </>
      )}

      {/* פנים */}
      {mood === 'happy' ? (
        <g stroke="#2A2F26" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M38,42 q5,-5 10,0" />
          <path d="M52,42 q5,-5 10,0" />
        </g>
      ) : (
        <>
          <circle cx="42" cy={eyeY} r="4.2" fill="#2A2F26" />
          <circle cx="58" cy={eyeY} r="4.2" fill="#2A2F26" />
          <circle cx="43.4" cy={eyeY - 1.6} r="1.5" fill="#fff" />
          <circle cx="59.4" cy={eyeY - 1.6} r="1.5" fill="#fff" />
        </>
      )}
      <path d={mood === 'happy' ? 'M43,51 q7,7 14,0' : 'M44,51 q6,4 12,0'}
        fill="none" stroke="#2A2F26" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="35" cy="48" r="3.4" fill="#E8907F" opacity="0.4" />
      <circle cx="65" cy="48" r="3.4" fill="#E8907F" opacity="0.4" />
    </svg>
  )
}

'use client'

// ─── אייקונים לציוד ───
// מצוירים ב-SVG, צבעוניים, גדולים. viewBox 0 0 100 100.
export function GearIcon({ id, size = 64, style }) {
  const g = ICONS[id]
  if (!g) return null
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ display: 'block', ...style }}>
      {g}
    </svg>
  )
}

const ICONS = {
  stone: (
    <g>
      <path d="M50 8 L84 30 L76 76 L24 76 L16 30 Z" fill="#6EE6C8" />
      <path d="M50 8 L84 30 L50 40 Z" fill="#B8F5E6" opacity=".8" />
      <path d="M50 40 L84 30 L76 76 Z" fill="#3FBFA0" />
      <path d="M50 40 L24 76 L16 30 Z" fill="#9AF0DA" opacity=".7" />
      <path d="M50 40 L76 76 L24 76 Z" fill="#2E9C82" />
      <circle cx="50" cy="8" r="4" fill="#FFF6DC" />
      <path d="M14 18 L20 24 M86 16 L80 22 M50 90 V96" stroke="#FFD84A" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  lantern: (
    <g>
      <rect x="36" y="14" width="28" height="10" rx="3" fill="#8A6A3A" />
      <path d="M30 24 H70 L74 74 H26 Z" fill="#4A3A2A" />
      <path d="M36 28 H64 L67 70 H33 Z" fill="#FFE59A" />
      <circle cx="50" cy="50" r="10" fill="#FFF6DC" />
      <path d="M50 50 L20 30 M50 50 L80 30 M50 50 L18 62 M50 50 L82 62" stroke="#FFD84A" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <rect x="28" y="74" width="44" height="10" rx="3" fill="#8A6A3A" />
      <path d="M44 14 Q50 2 56 14" stroke="#8A6A3A" strokeWidth="4" fill="none" />
    </g>
  ),
  binoculars: (
    <g>
      <rect x="10" y="36" width="34" height="42" rx="10" fill="#2E3A2E" />
      <rect x="56" y="36" width="34" height="42" rx="10" fill="#2E3A2E" />
      <rect x="40" y="44" width="20" height="14" rx="4" fill="#4E5E4E" />
      <circle cx="27" cy="62" r="11" fill="#6EB6FF" />
      <circle cx="73" cy="62" r="11" fill="#6EB6FF" />
      <circle cx="23" cy="58" r="4" fill="#fff" opacity=".8" />
      <circle cx="69" cy="58" r="4" fill="#fff" opacity=".8" />
      <rect x="16" y="24" width="22" height="16" rx="6" fill="#4E5E4E" />
      <rect x="62" y="24" width="22" height="16" rx="6" fill="#4E5E4E" />
    </g>
  ),
  boots: (
    <g>
      <path d="M22 26 H50 L52 54 L84 60 Q92 62 90 72 H24 Z" fill="#E0523A" />
      <path d="M22 26 H50 V40 H22 Z" fill="#F0A08C" opacity=".6" />
      <path d="M24 72 H90 Q92 80 84 82 H26 Q18 80 24 72 Z" fill="#2B382B" />
      <path d="M30 34 L44 34 M30 42 L46 42" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 40 H16 M4 50 H14 M6 60 H16" stroke="#FFD84A" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  honey: (
    <g>
      <rect x="28" y="30" width="44" height="52" rx="10" fill="#F0A020" />
      <rect x="34" y="40" width="32" height="34" rx="6" fill="#FFC64A" />
      <rect x="30" y="20" width="40" height="14" rx="4" fill="#8A6A3A" />
      <path d="M40 46 L46 40 L54 40 L60 46 L54 52 L46 52 Z" fill="#F0A020" opacity=".8" />
      <path d="M50 82 Q52 92 50 96 Q46 90 50 82" fill="#F0A020" />
      <ellipse cx="72" cy="26" rx="8" ry="6" fill="#FFD84A" />
      <path d="M66 22 Q72 16 78 22" stroke="#4A3A2A" strokeWidth="2" fill="none" />
      <rect x="66" y="24" width="12" height="4" rx="1" fill="#4A3A2A" opacity=".6" />
    </g>
  ),
  magnet: (
    <g>
      <path d="M22 22 V56 Q22 84 50 84 Q78 84 78 56 V22 H60 V54 Q60 66 50 66 Q40 66 40 54 V22 Z" fill="#E0523A" />
      <rect x="22" y="22" width="18" height="16" fill="#C9D3D8" />
      <rect x="60" y="22" width="18" height="16" fill="#C9D3D8" />
      <circle cx="20" cy="14" r="5" fill="#FFD84A" />
      <circle cx="80" cy="10" r="5" fill="#FFD84A" />
      <circle cx="50" cy="8" r="5" fill="#FFD84A" />
      <path d="M22 18 L28 22 M78 14 L72 20 M50 12 L50 20" stroke="#FFD84A" strokeWidth="2" />
    </g>
  ),
  map: (
    <g>
      <path d="M12 22 L38 14 L62 24 L88 16 V78 L62 86 L38 76 L12 84 Z" fill="#E9DCC0" />
      <path d="M38 14 V76 M62 24 V86" stroke="#B9A98A" strokeWidth="2" />
      <path d="M22 60 Q34 40 46 52 T70 44" stroke="#E0523A" strokeWidth="3" strokeDasharray="5 4" fill="none" />
      <path d="M66 36 L76 46 M76 36 L66 46" stroke="#E0523A" strokeWidth="5" strokeLinecap="round" />
      <circle cx="26" cy="64" r="5" fill="#FFD84A" stroke="#8A6A3A" strokeWidth="2" />
    </g>
  ),
  // שואב הרוח: משפך נחושת, מכל זכוכית שבתוכו רוח מסתחררת, ורצועת עור.
  // ציור עד שהאיור האמיתי יגיע (כמו כל השאר כאן).
  vacuum: (
    <g>
      <path d="M10 30 L34 44 V62 L10 76 Z" fill="#C98A3A" />
      <path d="M12 34 L32 46 V60 L12 72 Z" fill="#F0C069" opacity=".85" />
      <rect x="32" y="38" width="40" height="30" rx="10" fill="#2E3A2E" />
      <rect x="37" y="43" width="30" height="20" rx="7" fill="#8ED0F0" opacity=".9" />
      <path d="M52 46 q9 3 0 7 q-9 4 0 7" stroke="#2F7BE5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="70" y="44" width="18" height="18" rx="5" fill="#C98A3A" />
      <path d="M74 62 q10 10 2 20" stroke="#8A6A3A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="36" r="3.5" fill="#8ED0F0" opacity=".9" />
      <circle cx="20" cy="70" r="3" fill="#8ED0F0" opacity=".7" />
      <path d="M6 24 q8 4 0 8 M4 80 q10 -4 2 -9" stroke="#8ED0F0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  ),
}

'use client'

// ─── יצורי הציד ───
// כל יצור הוא SVG מצויר — נטען מיד, נראה חד בכל גודל, ולא עולה כלום.
// אותה שפה ויזואלית של הדרקון: צורות עגולות, עיניים גדולות, בלי פרטים קטנים.

export const MONSTERS = [
  { id: 'puch',   name: 'פוּך',    hue: '#8FB9E8', dark: '#5E8FC4', pts: 10 },
  { id: 'gilgul', name: 'גִלגּוּל', hue: '#F2B366', dark: '#C9862F', pts: 10 },
  { id: 'anafon', name: 'עֲנָפוֹן', hue: '#9DC98A', dark: '#6C9B57', pts: 15 },
  { id: 'nitznitz', name: 'נִצְנִיץ', hue: '#F2D06B', dark: '#C9A32B', pts: 20 },
  { id: 'zanvan', name: 'זַנְבָן',  hue: '#E39BC0', dark: '#BF6A93', pts: 15 },
  { id: 'avnon',  name: 'אַבְנוֹן', hue: '#B6AEA0', dark: '#857D6F', pts: 10 },
]

export function monsterById(id) {
  return MONSTERS.find(m => m.id === id) || MONSTERS[0]
}

// עיניים — משותפות לכל היצורים, כי הן מה שהופך אותם לחמודים
function Eyes({ cx = 50, y = 45, gap = 13, r = 7, blink = false }) {
  if (blink) {
    return (
      <g stroke="#2A2F26" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d={`M${cx - gap - 5},${y} q5,4 10,0`} />
        <path d={`M${cx + gap - 5},${y} q5,4 10,0`} />
      </g>
    )
  }
  return (
    <g>
      <circle cx={cx - gap} cy={y} r={r} fill="#2A2F26" />
      <circle cx={cx + gap} cy={y} r={r} fill="#2A2F26" />
      <circle cx={cx - gap + 2.4} cy={y - 2.6} r={r * 0.36} fill="#fff" />
      <circle cx={cx + gap + 2.4} cy={y - 2.6} r={r * 0.36} fill="#fff" />
    </g>
  )
}

function Smile({ cx = 50, y = 60, w = 9 }) {
  return <path d={`M${cx - w},${y} q${w},${w * 0.8} ${w * 2},0`} fill="none" stroke="#2A2F26" strokeWidth="2.6" strokeLinecap="round" />
}

export function Monster({ id, size = 120, blink = false }) {
  const m = monsterById(id)
  const { hue, dark } = m
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      {id === 'puch' && (
        <g>
          <ellipse cx="50" cy="88" rx="24" ry="4.5" fill="#000" opacity="0.11" />
          <path d="M26,30 L20,12 L38,24 Z" fill={dark} />
          <path d="M74,30 L80,12 L62,24 Z" fill={dark} />
          <circle cx="50" cy="52" r="30" fill={hue} />
          <path d="M28,66 q22,14 44,0 q-8,18 -22,18 q-14,0 -22,-18 Z" fill={dark} opacity="0.22" />
          <Eyes y={48} blink={blink} />
          <Smile y={63} />
          <circle cx="27" cy="60" r="5" fill="#fff" opacity="0.35" />
          <circle cx="73" cy="60" r="5" fill="#fff" opacity="0.35" />
        </g>
      )}

      {id === 'gilgul' && (
        <g>
          <ellipse cx="50" cy="88" rx="22" ry="4.5" fill="#000" opacity="0.11" />
          <circle cx="50" cy="52" r="29" fill={hue} />
          <path d="M50,23 a29,29 0 0 1 25,15 a20,20 0 0 0 -25,-6 a12,12 0 0 1 12,10 a7,7 0 0 0 -12,-3 Z" fill={dark} opacity="0.5" />
          <Eyes y={49} gap={12} blink={blink} />
          <Smile y={64} w={8} />
        </g>
      )}

      {id === 'anafon' && (
        <g>
          <ellipse cx="50" cy="88" rx="21" ry="4.5" fill="#000" opacity="0.11" />
          <path d="M50,26 C50,12 40,8 34,12 C32,20 40,26 50,27 Z" fill={dark} />
          <path d="M50,26 C50,14 60,9 66,14 C67,22 59,27 50,27 Z" fill={dark} opacity="0.75" />
          <path d="M50,10 L50,28" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26,54 q24,-28 48,0 q0,26 -24,28 q-24,-2 -24,-28 Z" fill={hue} />
          <Eyes y={50} gap={12} blink={blink} />
          <Smile y={65} w={8} />
          <circle cx="34" cy="66" r="4.5" fill={dark} opacity="0.3" />
          <circle cx="66" cy="66" r="4.5" fill={dark} opacity="0.3" />
        </g>
      )}

      {id === 'nitznitz' && (
        <g>
          <ellipse cx="50" cy="90" rx="18" ry="4" fill="#000" opacity="0.11" />
          <path d="M50,16 L59,40 L84,44 L66,60 L71,84 L50,72 L29,84 L34,60 L16,44 L41,40 Z" fill={hue} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          <Eyes y={50} gap={10} r={6} blink={blink} />
          <Smile y={62} w={7} />
        </g>
      )}

      {id === 'zanvan' && (
        <g>
          <ellipse cx="46" cy="88" rx="20" ry="4.5" fill="#000" opacity="0.11" />
          <path d="M68,72 C86,70 90,50 78,40 C74,36 68,38 68,43 C76,50 74,62 62,66 Z" fill={dark} opacity="0.8" />
          <ellipse cx="45" cy="56" rx="25" ry="24" fill={hue} />
          <path d="M28,36 L24,20 L40,30 Z" fill={dark} />
          <path d="M62,36 L66,20 L50,30 Z" fill={dark} />
          <Eyes cx={45} y={52} gap={11} blink={blink} />
          <Smile cx={45} y={66} w={8} />
        </g>
      )}

      {id === 'avnon' && (
        <g>
          <ellipse cx="50" cy="88" rx="25" ry="4.5" fill="#000" opacity="0.11" />
          <path d="M22,58 L30,30 L52,22 L76,32 L80,60 L64,82 L36,82 Z" fill={hue} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M30,30 L52,22 L50,44 Z" fill="#fff" opacity="0.22" />
          <Eyes y={52} gap={13} blink={blink} />
          <Smile y={68} w={9} />
        </g>
      )}
    </svg>
  )
}

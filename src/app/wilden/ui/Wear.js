'use client'
import { ANCHORS, itemById, SLOT } from '../engine/shop'

// ─── מה שלובשים ───
// הכובעים והמשקפיים מהחנות, מצוירים ב-SVG. מונחים על הדמות החיה במקום
// שנקבע ב-ANCHORS (בית, ספר, במה), ועל הילד במפה — מלמעלה.
// אין filter ואין אנימציה: זה יושב על WebP מונפש.

// ── הפריטים, מהצד (על יצור) ── viewBox 0 0 100 60
export function ItemSvg({ id, style }) {
  const it = itemById(id)
  if (!it) return null
  return (
    <svg viewBox="0 0 100 60" aria-hidden="true" style={{ display: 'block', overflow: 'visible', ...style }}>
      {SIDE[id]}
    </svg>
  )
}

const SIDE = {
  cap: (
    <g>
      <path d="M18 40 Q50 4 82 40 Z" fill="#E0523A" />
      <path d="M18 40 Q50 30 82 40 L96 44 Q60 36 22 46 Z" fill="#B53F2C" />
      <circle cx="50" cy="12" r="4" fill="#B53F2C" />
    </g>
  ),
  party: (
    <g>
      <path d="M50 2 L26 52 Q50 62 74 52 Z" fill="#9B6BD6" />
      <path d="M38 27 L62 27 L58 36 L42 36 Z" fill="#F2C641" />
      <path d="M31 42 L69 42 L66 49 L34 49 Z" fill="#F2C641" />
      <circle cx="50" cy="4" r="5" fill="#FFD84A" />
    </g>
  ),
  flower: (
    <g>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="50" cy="30" rx="9" ry="16" fill="#F26D8D" transform={`rotate(${a} 50 30) translate(0 -14)`} />
      ))}
      <circle cx="50" cy="30" r="9" fill="#FFD84A" />
    </g>
  ),
  bow: (
    <g>
      <path d="M50 30 L14 12 Q6 30 14 48 Z" fill="#E0523A" />
      <path d="M50 30 L86 12 Q94 30 86 48 Z" fill="#E0523A" />
      <path d="M50 30 L22 20 L22 40 Z" fill="#B53F2C" opacity=".5" />
      <path d="M50 30 L78 20 L78 40 Z" fill="#B53F2C" opacity=".5" />
      <circle cx="50" cy="30" r="8" fill="#B53F2C" />
    </g>
  ),
  wizard: (
    <g>
      <path d="M50 0 L28 44 L72 44 Z" fill="#3E4A9C" />
      <path d="M50 0 Q60 26 42 44 L28 44 Z" fill="#2C3675" opacity=".6" />
      <ellipse cx="50" cy="46" rx="36" ry="9" fill="#3E4A9C" />
      <ellipse cx="50" cy="45" rx="36" ry="6" fill="#4F5CB8" />
      <path d="M46 18 L48 24 L54 24 L49 27 L51 33 L46 29 L41 33 L43 27 L38 24 L44 24 Z" fill="#FFD84A" />
    </g>
  ),
  crown: (
    <g>
      <path d="M14 50 L14 18 L32 34 L50 8 L68 34 L86 18 L86 50 Z" fill="#F0C069" />
      <rect x="14" y="44" width="72" height="10" fill="#D6A24A" />
      <circle cx="50" cy="10" r="5" fill="#E0523A" />
      <circle cx="14" cy="18" r="4" fill="#3E86D6" />
      <circle cx="86" cy="18" r="4" fill="#3E86D6" />
      <circle cx="32" cy="48" r="3" fill="#E0523A" />
      <circle cx="68" cy="48" r="3" fill="#E0523A" />
    </g>
  ),
  shades: (
    <g>
      <path d="M2 24 L98 24" stroke="#3A3A3A" strokeWidth="4" />
      <rect x="8" y="18" width="36" height="26" rx="10" fill="#1B1B1B" stroke="#8A8A8A" strokeWidth="2.5" />
      <rect x="56" y="18" width="36" height="26" rx="10" fill="#1B1B1B" stroke="#8A8A8A" strokeWidth="2.5" />
      <path d="M14 26 Q20 20 30 22" stroke="#fff" strokeWidth="3" opacity=".55" fill="none" />
      <path d="M62 26 Q68 20 78 22" stroke="#fff" strokeWidth="3" opacity=".55" fill="none" />
    </g>
  ),
  glasses: (
    <g>
      <path d="M2 28 L98 28" stroke="#7A4A22" strokeWidth="4" />
      <circle cx="28" cy="30" r="17" fill="rgba(200,230,255,.35)" stroke="#7A4A22" strokeWidth="5" />
      <circle cx="72" cy="30" r="17" fill="rgba(200,230,255,.35)" stroke="#7A4A22" strokeWidth="5" />
    </g>
  ),
}

// ── על יצור ──
// wear: { head, face } — מונח בתוך תיבה שגודלה = תיבת התמונה (position:
// relative על העוטף). flip — כשהתמונה הפוכה, גם הפריט.
export function Wear({ id, wear, flip = false }) {
  const a = ANCHORS[id]
  if (!a || !wear) return null
  return (
    <>
      {[SLOT.HEAD, SLOT.FACE].map(slot => {
        const item = wear[slot]; const an = a[slot]
        if (!item || !an || !SIDE[item]) return null
        return (
          <ItemSvg key={slot} id={item} style={{
            position: 'absolute', left: `${flip ? 100 - an.x : an.x}%`, top: `${an.y}%`,
            height: `${an.h}%`, aspectRatio: '100 / 60', width: 'auto',
            transform: `translate(-50%,-50%) ${flip ? 'scaleX(-1)' : ''}`, zIndex: 2, pointerEvents: 'none',
          }} />
        )
      })}
    </>
  )
}

// ── הילד במפה: מלמעלה, עם אלומת מבט ──
// facing במעלות (0 = צפון): לאן צריך ללכת. האלומה הכחולה לפני הפנים היא
// מה שקוראים במבט. הראש, הכובע והכתפיים — כדי שזה ילד ולא חץ.
// kid: { head, shirt } מהחנות. בלי — חולצה ירוקה וכובע אדום, כמו מההתחלה.
// מחרוזת HTML גולמית: המפה מציירת אותה ב-divIcon.
const BLUE = '#2F7BE5'
export function kidSvg(facing, kid = null) {
  const shirt = itemById(kid?.shirt)
  const c = shirt?.color || '#6FA35A', d = shirt?.dark || '#4E7B3E'
  const hat = kidHatSvg(kid?.head)
  return `<div class="kid" style="transform:rotate(${Math.round(facing)}deg)">
    <svg width="72" height="72" viewBox="0 0 72 72" style="display:block;overflow:visible">
      <defs><linearGradient id="wbeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${BLUE}" stop-opacity=".45"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></linearGradient></defs>
      <path d="M36 36 L14 0 Q36 -8 58 0 Z" fill="url(#wbeam)"/>
      <ellipse cx="36" cy="40" rx="15" ry="10" fill="${c}" stroke="#fff" stroke-width="2.5"/>
      <ellipse cx="36" cy="43" rx="6" ry="4" fill="${d}"/>
      <circle cx="36" cy="34" r="9.5" fill="#F0C49B" stroke="#fff" stroke-width="2"/>
      ${hat || `<path d="M26.5 33 Q36 22 45.5 33 Q36 28 26.5 33 Z" fill="#5A3A22"/>
      <path d="M27 31 Q36 21 45 31 L47 27 Q36 17 25 27 Z" fill="#E0523A"/>
      <path d="M33 25 L36 19 L39 25 Z" fill="#E0523A"/>`}
    </svg></div>`
}

// הכובעים מלמעלה. הראש במרכז (36,34) ברדיוס 9.5.
export function kidHatSvg(id) {
  switch (id) {
    case 'cap': return '<circle cx="36" cy="34" r="10" fill="#E0523A"/><path d="M27 31 Q36 14 45 31 Z" fill="#B53F2C"/><circle cx="36" cy="34" r="2" fill="#B53F2C"/>'
    case 'party': return '<circle cx="36" cy="34" r="10" fill="#9B6BD6"/><circle cx="36" cy="34" r="6" fill="#F2C641"/><circle cx="36" cy="34" r="2.5" fill="#FFD84A"/>'
    case 'flower': return '<circle cx="36" cy="34" r="10" fill="#6FA35A"/>' + [0, 72, 144, 216, 288].map(a => `<ellipse cx="36" cy="27" rx="3.5" ry="6" fill="#F26D8D" transform="rotate(${a} 36 34)"/>`).join('') + '<circle cx="36" cy="34" r="3.5" fill="#FFD84A"/>'
    case 'bow': return '<circle cx="36" cy="34" r="9.5" fill="#5A3A22"/><path d="M36 28 L27 23 L27 33 Z M36 28 L45 23 L45 33 Z" fill="#E0523A"/><circle cx="36" cy="28" r="2.5" fill="#B53F2C"/>'
    case 'wizard': return '<circle cx="36" cy="34" r="12" fill="#3E4A9C"/><circle cx="36" cy="34" r="5" fill="#4F5CB8"/><path d="M36 30 L37 33 L40 33 L38 35 L39 38 L36 36 L33 38 L34 35 L32 33 L35 33 Z" fill="#FFD84A"/>'
    case 'crown': return '<circle cx="36" cy="34" r="10" fill="#5A3A22"/><path d="M36 22 L39 30 L47 27 L43 35 L47 43 L39 39 L36 46 L33 39 L25 43 L29 35 L25 27 L33 30 Z" fill="#F0C069"/><circle cx="36" cy="34" r="2.5" fill="#E0523A"/>'
    default: return ''
  }
}

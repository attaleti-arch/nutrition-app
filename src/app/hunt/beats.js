'use client'
import { RESOURCES } from './world'

// ─── הפעימות ───
// שלושה יצורים ב-30 דקות זה שלוש תפיסות — אבל לא שלושה דברים שקורים.
// בין יצור ליצור חייבת להיות ציפייה, אחרת יש שתים-עשרה דקות מתות של
// הליכה מול מספר שיורד.
//
// הפעימות נקבעות לפי *כמה באמת הלכת*, לא לפי שעון. מי שעומד במקום לא
// מקבל אירועים, ומי שהולך מהר לא מפסיד אותם.

const FIND_LINES = [
  { icon: '🪵', text: 'ענף יבש מונח על המדרכה. שווה לקחת.' },
  { icon: '🪨', text: 'אבן שטוחה בדיוק בגודל הנכון.' },
  { icon: '🌼', text: 'פרחים בין המרצפות — הדבורים יאהבו.' },
  { icon: '🪵', text: 'מישהו זרק ארגז. הקרשים עוד טובים.' },
  { icon: '🌼', text: 'שיח פורח בגדר של מישהו. אחד מספיק.' },
]

const HINT_LINES = [
  'עקבות קטנות באדמה. משהו לא רגיל עבר כאן.',
  'נוצה שאתם לא מזהים. היא זוהרת קצת.',
  'ריח מתוק באוויר — יצור נדיר מסתובב באזור.',
  'שקט פתאומי. משהו גדול מתחבא בסביבה.',
]

const CHOICES = [
  {
    text: 'שביל צדדי מתפתל בין השיחים. הוא מאריך את הדרך, אבל משהו מבריק שם.',
    take: 'לסטות לשם', skip: 'להמשיך ישר', extraM: 180,
  },
  {
    text: 'גדר פתוחה אל חצר משחקים. אפשר לחצות דרכה — או להקיף.',
    take: 'לחצות', skip: 'להקיף', extraM: 120,
  },
  {
    text: 'רעש מגיע מהכיוון ההוא. לא ברור מה זה.',
    take: 'ללכת לבדוק', skip: 'לא היום', extraM: 220,
  },
]

export const pickFind = () => FIND_LINES[Math.floor(Math.random() * FIND_LINES.length)]
export const pickHint = () => HINT_LINES[Math.floor(Math.random() * HINT_LINES.length)]
export const pickChoice = () => CHOICES[Math.floor(Math.random() * CHOICES.length)]

// בונה את לוח הפעימות: היצורים מעוגנים ב-GPS, והפעימות משובצות ביניהם
// לפי המרווחים שנשארו. התוצאה היא שמשהו קורה כל שתיים-שלוש דקות.
export function buildBeats(journey, creatureCount) {
  const mix = journey.beats
  const slots = []
  for (const [type, n] of Object.entries(mix)) for (let i = 0; i < n; i++) slots.push(type)

  // היצורים יושבים ב-(i+0.5)/n לאורך המסלול. הפעימות נכנסות באמצע
  // המרווחים, כדי שלא ייפלו יחד עם תפיסה.
  const gaps = []
  for (let i = 0; i <= creatureCount; i++) {
    const from = i === 0 ? 0.04 : (i - 0.5) / creatureCount
    const to = i === creatureCount ? 0.94 : (i + 0.5) / creatureCount
    gaps.push([from, to])
  }

  const beats = []
  slots.sort(() => Math.random() - 0.5).forEach((type, i) => {
    const [from, to] = gaps[i % gaps.length]
    const at = from + (to - from) * (0.3 + Math.random() * 0.4)
    beats.push({ id: `${type}-${i}`, type, at, done: false })
  })
  return beats.sort((a, b) => a.at - b.at)
}

const C = { cream: '#F3EDE1', olive: '#3F5C53', signal: '#C9762A' }

export function BeatOverlay({ beat, onClose, onChoose }) {
  if (beat.type === 'find') {
    return (
      <Sheet onClose={onClose}>
        <div style={b.icon}>{beat.find.icon}</div>
        <p style={b.text}>{beat.find.text}</p>
        <p style={b.gain}>+1 {RESOURCES[beat.res].emoji} {RESOURCES[beat.res].name}</p>
        <button onClick={onClose} style={b.cta}>לקחת</button>
      </Sheet>
    )
  }

  if (beat.type === 'hint') {
    return (
      <Sheet onClose={onClose}>
        <div style={{ ...b.icon, animation: 'encTwinkle 1.6s ease-in-out infinite' }}>✨</div>
        <p style={b.text}>{beat.line}</p>
        <p style={{ ...b.gain, color: C.signal }}>הסיכוי ליצור נדיר בפגישה הבאה עלה</p>
        <button onClick={onClose} style={b.cta}>ממשיכים בשקט</button>
      </Sheet>
    )
  }

  // בחירה: זו הנקודה שבה הילד מבקש להאריך את ההליכה בעצמו
  return (
    <Sheet>
      <div style={b.icon}>🔀</div>
      <p style={b.text}>{beat.choice.text}</p>
      <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 6 }}>
        <button onClick={() => onChoose(false)} style={{ ...b.cta, ...b.ghost, flex: 1 }}>
          {beat.choice.skip}
        </button>
        <button onClick={() => onChoose(true)} style={{ ...b.cta, flex: 1 }}>
          {beat.choice.take}
          <span style={b.sub}>+{beat.choice.extraM} מ׳</span>
        </button>
      </div>
    </Sheet>
  )
}

function Sheet({ children, onClose }) {
  return (
    <div style={b.wrap} onClick={onClose}>
      <div style={b.sheet} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

const b = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(28,32,26,.86)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
  },
  sheet: {
    width: '100%', maxWidth: 480, background: '#1E2A26', color: C.cream,
    borderRadius: 22, padding: '26px 20px 22px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    animation: 'beatUp .4s cubic-bezier(.2,1.2,.4,1) both',
    fontFamily: '"Heebo", system-ui, sans-serif',
  },
  icon: { fontSize: 54, lineHeight: 1 },
  text: { fontSize: 17, lineHeight: 1.6, margin: 0, maxWidth: 320 },
  gain: { fontSize: 15.5, fontWeight: 800, color: '#9DC98A', margin: 0 },
  cta: {
    width: '100%', maxWidth: 300, padding: '14px 16px', borderRadius: 13, border: 'none',
    background: C.olive, color: C.cream, fontFamily: 'inherit',
    fontSize: 16.5, fontWeight: 800, cursor: 'pointer', marginTop: 6,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  },
  ghost: { background: 'transparent', border: `1.5px solid rgba(243,237,225,.35)` },
  sub: { fontSize: 12, fontWeight: 400, opacity: 0.8 },
}

export const BEATS_CSS = `
@keyframes beatUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
`

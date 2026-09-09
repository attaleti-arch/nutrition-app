'use client'
import { useState } from 'react'
import { normCode, CODE_LEN } from '../engine/profile'

// ─── מי יוצא היום? ───
// מסך אחד לפני העולם: שם, או קוד של מישהו שכבר שיחק. בלי סיסמה, בלי
// מייל — ילד בן שבע והורה עם טלפון ביד. הקוד מופיע אחר כך על מסך הבית.

export function ProfileGate({ P, switching }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState('new')       // new | code
  const [code, setCode] = useState('')

  return (
    <>
      <p style={s.eyebrow}>WILDEN</p>
      <h1 style={s.h1}>{switching ? 'מי משחק עכשיו?' : 'מי יוצא היום?'}</h1>
      <p style={s.lede}>
        {switching
          ? 'שחקן אחר על אותו טלפון. העולם של הקודם שמור בקוד שלו.'
          : 'השם נשאר בטלפון. תקבלו קוד קצר כדי לחזור לעולם שלכם מכל טלפון.'}
      </p>

      {mode === 'new' ? (
        <>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלי"
            maxLength={20} autoComplete="off" style={s.input} aria-label="שם" />
          <button onClick={() => P.create(name)} disabled={!name.trim()} style={{ ...s.cta, opacity: name.trim() ? 1 : .5 }}>
            זה אני
          </button>
          <button onClick={() => setMode('code')} style={{ ...s.cta, ...s.ctaGhost }}>יש לי קוד</button>
          {!P.server && <p style={s.note}>השרת עוד לא מחובר, אז השמירה בטלפון הזה בלבד.</p>}
        </>
      ) : (
        <>
          <input value={code} onChange={e => setCode(normCode(e.target.value))} placeholder="A1B2C"
            maxLength={CODE_LEN} autoComplete="off" autoCapitalize="characters" inputMode="latin"
            style={{ ...s.input, ...s.code }} aria-label="קוד" dir="ltr" />
          <button onClick={() => P.restore(code)} disabled={P.busy || code.length < CODE_LEN}
            style={{ ...s.cta, opacity: code.length < CODE_LEN ? .5 : 1 }}>
            {P.busy ? 'מחפשים…' : 'לחזור לעולם שלי'}
          </button>
          <button onClick={() => setMode('new')} style={{ ...s.cta, ...s.ctaGhost }}>שחקן חדש</button>
          {P.error && <p style={s.warn}>{errText(P.error)}</p>}
          {!P.server && <p style={s.note}>השרת עוד לא מחובר, אז אי אפשר לשחזר עכשיו. אפשר להתחיל בלי קוד.</p>}
        </>
      )}
      {switching && <button onClick={P.cancelSwitch} style={{ ...s.cta, ...s.ctaGhost }}>ביטול</button>}
    </>
  )
}

function errText(e) {
  if (e === 'not-found') return 'לא מצאנו קוד כזה. בדקו שוב את חמשת התווים.'
  if (e === 'short') return `הקוד הוא ${CODE_LEN} תווים.`
  if (e === 'no-server') return 'השרת לא מחובר עכשיו.'
  return 'אין חיבור לשרת. נסו שוב עוד רגע.'
}

// ── שורת השחקן במסך הבית ──
export function ProfileBar({ P, onIntro, music }) {
  const p = P.profile
  if (!p) return null
  const st = !P.server ? 'שמור בטלפון בלבד' : P.sync.ok ? 'שמור בענן' : P.sync.reason === 'never' ? 'עוד לא נשמר בענן' : 'לא הצלחנו לשמור בענן'
  const col = !P.server ? '#9BA495' : P.sync.ok ? '#8FB57C' : '#D97F5A'
  return (
    <div style={s.bar}>
      <span>👤 <b style={{ color: '#E9E5D8' }}>{p.name}</b></span>
      <span>קוד <b style={s.codeChip}>{p.code}</b></span>
      <span style={{ color: col }}>{st}</span>
      <button onClick={P.switchPlayer} style={s.link}>להחליף שחקן</button>
      {onIntro && <button onClick={onIntro} style={s.link}>הפתיחה</button>}
      {music && <button onClick={music.toggle} style={s.link} aria-label={music.off ? 'להפעיל מוזיקה' : 'להשתיק מוזיקה'}>{music.off ? '🔇' : '🎵'}</button>}
    </div>
  )
}

const C = { ink: '#E9E5D8', muted: '#9BA495', faint: '#767F71', amber: '#E5A342', line: '#2B382B', card: '#161E17', red: '#D97F5A' }
const s = {
  eyebrow: { fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color: C.amber, margin: '0 0 10px' },
  h1: { fontSize: 32, fontWeight: 900, margin: '0 0 8px', lineHeight: 1.15 },
  lede: { fontSize: 17, color: C.muted, margin: '0 0 18px', lineHeight: 1.6 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13,
    border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: 'inherit', fontSize: 20,
    fontWeight: 700, outline: 'none' },
  code: { textAlign: 'center', letterSpacing: '.35em', fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' },
  cta: { display: 'block', width: '100%', marginTop: 12, padding: '15px 18px', borderRadius: 13,
    border: 'none', background: C.amber, color: '#14200F', fontFamily: 'inherit', fontSize: 17.5, fontWeight: 800, cursor: 'pointer' },
  ctaGhost: { background: 'transparent', color: C.ink, border: `1.5px solid ${C.line}` },
  warn: { marginTop: 14, fontSize: 14.5, color: C.red },
  note: { marginTop: 14, fontSize: 14, color: C.faint, lineHeight: 1.6 },
  bar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', fontSize: 13.5, color: C.muted,
    margin: '0 0 14px' },
  codeChip: { fontFamily: 'ui-monospace, monospace', letterSpacing: '.12em', color: C.amber },
  link: { background: 'none', border: 'none', padding: 0, color: C.faint, fontFamily: 'inherit', fontSize: 13,
    textDecoration: 'underline', cursor: 'pointer', marginInlineStart: 'auto' },
}

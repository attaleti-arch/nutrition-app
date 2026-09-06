'use client'
import { useState } from 'react'
import { Beacon, BeaconLine, BEACON_CSS } from '../ui/Beacon'
import { phaseOf, powerOf, PHASE, PHASE_COPY, POWER, ACC_GATE, WALK_GATE, STILL_MS } from '../engine/beacon'

// ─── מעבדת הביקון ───
// אי אפשר לבדוק ביקון בלי ללכת חצי שעה ברחוב — אלא אם מזיזים את
// המרחק, הדיוק והעצירה ביד. הדף הזה קיים בשביל זה בלבד. הוא לא חלק
// מהמשחק ולא יגיע לילד.

const C = {
  bg: '#0F150F', card: '#161E17', card2: '#1C261D',
  ink: '#E9E5D8', muted: '#9BA495', faint: '#767F71',
  amber: '#E5A342', green: '#8FB57C', red: '#D97F5A', line: '#2B382B',
}

export default function BeaconLab() {
  const [dist, setDist] = useState(600)
  const [acc, setAcc] = useState(12)
  const [walked, setWalked] = useState(300)
  const [still, setStill] = useState(0)
  const [missions, setMissions] = useState(0)
  const [bearing, setBearing] = useState(35)

  const power = powerOf(missions)
  const phase = phaseOf({ dist, acc, walked, stillMs: still, resolved: false })
  const copy = PHASE_COPY[phase]
  const hot = phase === PHASE.VERY_CLOSE || phase === PHASE.SAFE_STOP
  const showArrow = phase !== PHASE.IDLE && phase !== PHASE.SIGNAL_WEAK && acc <= ACC_GATE

  const blocked =
    walked < WALK_GATE ? `נחסם: נצברו ${walked} מ׳ בלבד (נדרש ${WALK_GATE})`
    : acc > ACC_GATE ? `נחסם: דיוק ${acc} מ׳ גרוע מדי (נדרש ≤ ${ACC_GATE})`
    : null

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, color: C.ink,
      fontFamily: '"Heebo", system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: BEACON_CSS }} />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 18px 70px' }}>

        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em',
          color: C.amber, margin: '0 0 6px' }}>WILDEN · כלי פיתוח</p>
        <h1 style={{ fontSize: 27, fontWeight: 900, margin: '0 0 4px' }}>מעבדת הביקון</h1>
        <p style={{ color: C.muted, fontSize: 15, margin: '0 0 24px' }}>
          מזיזים את המחוונים במקום ללכת ברחוב. זה לא מסך של המשחק.
        </p>

        {/* הביקון */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
          padding: '30px 20px 24px', display: 'grid', placeItems: 'center', marginBottom: 8 }}>
          <Beacon power={power} phase={phase} arrow={showArrow} bearing={bearing} />
          <BeaconLine line={copy.line} sub={copy.sub} tone={hot ? 'hot' : 'calm'} />

          {phase === PHASE.SAFE_STOP && (
            <button style={{ marginTop: 18, padding: '13px 26px', borderRadius: 12,
              border: 'none', background: C.amber, color: '#14200F',
              fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: 'pointer' }}>
              👁 חפש אותו
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 12.5,
          fontFamily: 'ui-monospace, monospace', color: C.faint, justifyContent: 'center' }}>
          <span>POWER: <b style={{ color: C.green }}>{power}</b></span>
          <span>·</span>
          <span>PHASE: <b style={{ color: hot ? C.amber : C.ink }}>{phase}</b></span>
        </div>

        {blocked && (
          <p style={{ background: '#301A12', border: `1px solid ${C.red}`, color: C.red,
            borderRadius: 10, padding: '10px 14px', fontSize: 14, margin: '0 0 20px' }}>
            {blocked}
          </p>
        )}

        <Slider label="מרחק מהיעד" v={dist} set={setDist} min={0} max={900} step={10} unit=" מ׳"
          note="‎250 → כיוון · 120 → עקבות · 45 → הוא כאן" />
        <Slider label="דיוק GPS" v={acc} set={setAcc} min={0} max={90} step={1} unit=" מ׳"
          note={`מעל ${ACC_GATE} הביקון לא מתקדם. אפס הוא מצוין, לא חסר.`} />
        <Slider label="נצבר בהליכה" v={walked} set={setWalked} min={0} max={800} step={10} unit=" מ׳"
          note={`מתחת ל-${WALK_GATE} שום דבר לא קורה. זה הבאג של "שני יצורים בלי צעד".`} />
        <Slider label="עומד במקום" v={still} set={setStill} min={0} max={6000} step={250} unit=" מ״ש"
          note={`${STILL_MS} מ״ש פותחות את המצלמה. כלל הבטיחות כמכניקה.`} />
        <Slider label="כיוון היעד" v={bearing} set={setBearing} min={0} max={359} step={1} unit="°" />

        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.muted, margin: '26px 0 8px' }}>
          התחזקות לאורך עולם 1 — {missions} משימות
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {[0, 1, 3, 6, 9].map((n, i) => (
            <button key={n} onClick={() => setMissions(n)} style={{
              padding: '9px 2px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 9.5, fontWeight: 700, lineHeight: 1.5,
              border: `1.5px solid ${power === POWER[i] ? C.amber : C.line}`,
              background: power === POWER[i] ? C.amber : C.card,
              color: power === POWER[i] ? '#14200F' : C.muted,
            }}>
              {POWER[i]}
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 400 }}>{n}</span>
            </button>
          ))}
        </div>

        <p style={{ marginTop: 30, fontSize: 13.5, color: C.faint, lineHeight: 1.7,
          borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
          המנוע עצמו נבדק ב-<span style={{ fontFamily: 'ui-monospace, monospace' }}>node --test</span> —
          עשרים בדיקות שמריצות מסע שלם בלי GPS ובלי דפדפן.
        </p>
      </div>
    </div>
  )
}

function Slider({ label, v, set, min, max, step, unit = '', note }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: C.amber, fontFamily: 'ui-monospace, monospace' }}>
          {v}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v}
        onChange={e => set(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.amber, marginTop: 4 }} />
      {note && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: C.faint }}>{note}</p>}
    </div>
  )
}

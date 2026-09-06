'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Monster, monsterById } from './monsters'
import { Avatar, avatarOf } from './avatars'

// ─── מסך המפגש ───
// זה המסך שקובע אם זה משחק או אפליקציית מפה. המפה נשארת ברקע כשכבת
// תשתית; ברגע שמשהו קורה, המשחק לוקח את המסך.
//
// מבנה הרגע: היצור מתגלה → הילד בוחר איך לפעול → יש תוצאה שאפשר להיכשל
// בה → הפרס עף אל ה-HUD. בלי בחירה זה לא מפגש, זו הודעה.

export const RARITY = {
  common: { k: 'common', label: 'רגיל', color: '#8AA37E', glow: 'rgba(138,163,126,.55)', mult: 1, sparks: 6 },
  rare: { k: 'rare', label: 'נדיר', color: '#4E86C4', glow: 'rgba(78,134,196,.6)', mult: 2, sparks: 12 },
  legend: { k: 'legend', label: 'אגדי', color: '#C9762A', glow: 'rgba(201,118,42,.65)', mult: 4, sparks: 22 },
}

// ההסתברויות תלויות בקושי — זה מה שהופך "קשה" למפתה ולא רק לעונש
export const RARITY_ODDS = {
  easy: { common: 0.82, rare: 0.16, legend: 0.02 },
  normal: { common: 0.66, rare: 0.27, legend: 0.07 },
  hard: { common: 0.44, rare: 0.38, legend: 0.18 },
}

export function rollRarity(diff = 'normal') {
  const odds = RARITY_ODDS[diff] || RARITY_ODDS.normal
  const r = Math.random()
  if (r < odds.legend) return RARITY.legend
  if (r < odds.legend + odds.rare) return RARITY.rare
  return RARITY.common
}

// כל פעולה היא החלפה: סיכוי מול תגמול. זה מה שהופך את הרגע להחלטה.
export const ACTIONS = [
  { k: 'grab', label: 'לתפוס!', hint: 'מהר ובטוח', icon: '🫳', odds: 0.82, bonus: 1 },
  { k: 'sneak', label: 'להתגנב', hint: 'איטי — אבל שווה כפול', icon: '🤫', odds: 0.55, bonus: 2 },
  { k: 'lure', label: 'לפתות בדבש', hint: 'כמעט בטוח · עולה 🍯', icon: '🍯', odds: 0.95, bonus: 1, costHoney: 1 },
]

const RES = { wood: '🪵', stone: '🪨', flowers: '🌼', honey: '🍯' }

export function EncounterScene({
  monsterId, rarity, avatarId, honey = 0,
  index = 1, total = 5, enemy = null,
  onResolve,
}) {
  const [phase, setPhase] = useState('reveal')      // reveal | choose | resolving | won | lost
  const [choice, setChoice] = useState(null)
  const [loot, setLoot] = useState([])
  const [flyers, setFlyers] = useState([])
  const timers = useRef([])

  const rar = rarity || RARITY.common
  const mon = monsterById(monsterId)
  const av = avatarOf(avatarId)

  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)) }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => { later(() => setPhase('choose'), 900) }, [later])

  function act(a) {
    if (phase !== 'choose') return
    if (a.costHoney && honey < a.costHoney) return
    setChoice(a)
    setPhase('resolving')
    later(() => {
      const won = Math.random() < a.odds
      if (won) {
        const kinds = ['wood', 'stone', 'flowers']
        const n = a.bonus * rar.mult
        const got = Array.from({ length: n }, () => kinds[Math.floor(Math.random() * kinds.length)])
        setLoot(got)
        setFlyers(got.map((k, i) => ({ k, i })))
        setPhase('won')
        later(() => onResolve?.({ caught: true, action: a.k, loot: got, rarity: rar.k, honeySpent: a.costHoney || 0 }), 2200)
      } else {
        setPhase('lost')
        later(() => onResolve?.({ caught: false, action: a.k, loot: [], rarity: rar.k, honeySpent: a.costHoney || 0 }), 1900)
      }
    }, 850)
  }

  return (
    <div style={sc.wrap}>
      <Backdrop rarity={rar} phase={phase} />

      {/* ── HUD ── */}
      <div style={sc.hud}>
        <div style={sc.hudLeft}>
          <span style={{ ...sc.badge, background: rar.color }}>{rar.label}</span>
          {rar.k !== 'common' && <span style={sc.mult}>×{rar.mult}</span>}
        </div>
        <div style={sc.pips}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              ...sc.pip,
              background: i < index - 1 ? '#F3EDE1' : i === index - 1 ? rar.color : 'rgba(243,237,225,.25)',
              transform: i === index - 1 ? 'scale(1.45)' : 'none',
            }} />
          ))}
        </div>
        <span style={sc.honey}>🍯 {honey}</span>
      </div>

      {/* ── הבמה ── */}
      <div style={sc.stage}>
        {enemy && phase !== 'won' && (
          <div style={sc.enemy}>
            <span style={{ fontSize: 46 }}>{enemy.emoji}</span>
            <span style={sc.enemyName}>{enemy.name}</span>
          </div>
        )}

        <div style={sc.creature}>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: phase === 'won' ? 'encCaught .7s cubic-bezier(.3,1.5,.5,1) forwards'
              : phase === 'lost' ? 'encFlee .9s ease-in forwards'
              : 'encBob 2.6s ease-in-out infinite',
          }}>
            <div style={{ ...sc.aura, boxShadow: `0 0 60px 24px ${rar.glow}`, opacity: phase === 'reveal' ? 0 : 1 }} />
            {rar.k !== 'common' && <Sparks n={rar.sparks} color={rar.color} />}
            <div style={{ animation: phase === 'reveal' ? 'encPop .8s cubic-bezier(.2,1.5,.4,1) both' : 'none' }}>
              <Monster id={monsterId} size={rar.k === 'legend' ? 168 : 148} />
            </div>
          </div>
        </div>

        <div style={sc.avatar}>
          <Avatar id={avatarId} size={104}
            mood={phase === 'won' ? 'happy' : phase === 'choose' ? 'ready' : 'idle'} />
        </div>

        {flyers.map(f => (
          <span key={f.i} style={{ ...sc.flyer, animation: `encFly 1.1s ${0.12 * f.i}s cubic-bezier(.4,0,.2,1) both` }}>
            {RES[f.k]}
          </span>
        ))}
      </div>

      {/* ── תחתית ── */}
      <div style={sc.bottom}>
        {phase === 'reveal' && <p style={sc.line}>משהו זז בשיחים…</p>}

        {phase === 'choose' && (
          <>
            <p style={sc.name}>{mon.name}</p>
            <div style={sc.actions}>
              {ACTIONS.map(a => {
                const locked = a.costHoney && honey < a.costHoney
                return (
                  <button key={a.k} onClick={() => act(a)} disabled={locked}
                    style={{ ...sc.action, opacity: locked ? 0.42 : 1 }}>
                    <span style={sc.actionIcon}>{a.icon}</span>
                    <b>{a.label}</b>
                    <span style={sc.actionHint}>{locked ? 'אין דבש' : a.hint}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {phase === 'resolving' && <p style={sc.line}>{choice.k === 'sneak' ? 'מתקרבים בשקט…' : choice.k === 'lure' ? 'מניחים את הדבש…' : 'קדימה!'}</p>}

        {phase === 'won' && (
          <>
            <p style={{ ...sc.name, color: rar.color }}>{mon.name} הצטרף!</p>
            <div style={sc.lootRow}>
              {Object.entries(loot.reduce((a, k) => ({ ...a, [k]: (a[k] || 0) + 1 }), {}))
                .map(([k, n]) => <span key={k} style={sc.lootChip}>{RES[k]} {n}</span>)}
            </div>
          </>
        )}

        {phase === 'lost' && (
          <>
            <p style={sc.name}>הוא חמק!</p>
            <p style={sc.line}>{enemy ? `${enemy.name} הבריח אותו.` : 'הוא ראה אתכם מגיעים.'} יהיו עוד.</p>
          </>
        )}
      </div>
    </div>
  )
}

// רקע בשלוש שכבות שנעות בקצב שונה — זה מה שנותן עומק בלי תלת-ממד
function Backdrop({ rarity, phase }) {
  return (
    <div style={sc.bg}>
      <div style={{ ...sc.sky, background: `radial-gradient(120% 80% at 50% 18%, ${rarity.glow} 0%, rgba(30,36,30,0) 62%), linear-gradient(#1E2A28, #16201C)` }} />
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{ ...sc.layer, bottom: '30%', opacity: 0.34, animation: 'encDriftSlow 26s linear infinite' }}>
        <path d="M-40,200 L-40,120 Q30,70 90,110 T220,96 T340,120 T460,104 L460,200 Z" fill="#3A5148" />
      </svg>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{ ...sc.layer, bottom: '16%', opacity: 0.55, animation: 'encDrift 17s linear infinite' }}>
        <path d="M-40,200 L-40,150 Q40,110 110,146 T250,132 T400,152 L460,200 Z" fill="#2C4038" />
      </svg>
      <div style={sc.ground} />
      {phase === 'won' && <div style={sc.flash} />}
    </div>
  )
}

function Sparks({ n, color }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (360 / n) * i + (i % 3) * 7
        const dist = 74 + (i % 4) * 16
        return (
          <span key={i} aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '50%', width: 5, height: 5,
            borderRadius: '50%', background: color,
            transform: `rotate(${ang}deg) translateY(-${dist}px)`,
            animation: `encTwinkle ${1.6 + (i % 5) * 0.25}s ${(i % 7) * 0.14}s ease-in-out infinite`,
          }} />
        )
      })}
    </>
  )
}

export const ENCOUNTER_CSS = `
@keyframes encBob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-11px) scale(1.03)}}
@keyframes encPop{0%{transform:scale(.2) rotate(-16deg);opacity:0}70%{transform:scale(1.14) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes encCaught{0%{transform:scale(1)}35%{transform:scale(1.2)}100%{transform:scale(.15) translateY(46px);opacity:0}}
@keyframes encFlee{0%{transform:translateX(0) scale(1);opacity:1}100%{transform:translateX(150px) scale(.5);opacity:0}}
@keyframes encTwinkle{0%,100%{opacity:.15;transform-origin:center}50%{opacity:1}}
@keyframes encFly{0%{opacity:0;transform:translate(0,0) scale(.5)}25%{opacity:1}100%{opacity:0;transform:translate(var(--fx,120px),-210px) scale(1.25)}}
@keyframes encDrift{from{transform:translateX(0)}to{transform:translateX(-40px)}}
@keyframes encDriftSlow{from{transform:translateX(0)}to{transform:translateX(-22px)}}
@keyframes encFlash{from{opacity:.75}to{opacity:0}}
@media (prefers-reduced-motion: reduce){
  [style*="animation"]{animation-duration:.01ms !important;animation-iteration-count:1 !important}
}
`

const cream = '#F3EDE1'
const sc = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 3000, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', color: cream,
    fontFamily: '"Heebo", system-ui, sans-serif',
  },
  bg: { position: 'absolute', inset: 0, zIndex: 0 },
  sky: { position: 'absolute', inset: 0 },
  layer: { position: 'absolute', insetInline: '-12%', height: '46%', width: '124%' },
  ground: {
    position: 'absolute', insetInline: 0, bottom: 0, height: '17%',
    background: 'linear-gradient(#22322B, #1A2620)',
  },
  flash: { position: 'absolute', inset: 0, background: cream, animation: 'encFlash .55s ease-out forwards' },

  hud: {
    position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 10, padding: '14px 16px 0',
  },
  hudLeft: { display: 'flex', alignItems: 'center', gap: 7 },
  badge: {
    fontSize: 12.5, fontWeight: 800, letterSpacing: '.04em',
    padding: '4px 11px', borderRadius: 999, color: '#16201C',
  },
  mult: { fontSize: 13, fontWeight: 800, opacity: 0.85 },
  pips: { display: 'flex', gap: 6, alignItems: 'center' },
  pip: { width: 8, height: 8, borderRadius: '50%', transition: 'transform .25s' },
  honey: { fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

  stage: { position: 'relative', zIndex: 2, flex: 1, minHeight: 0 },
  // המרכוז יושב על העוטף, והאנימציה על הפנימי — אחרת ה-transform של
  // האנימציה דורס את translate(-50%,-50%) והיצור זז מהמרכז.
  creature: {
    position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  aura: {
    position: 'absolute', width: 8, height: 8, borderRadius: '50%',
    transition: 'opacity .6s',
  },
  avatar: { position: 'absolute', insetInlineStart: 14, bottom: 6 },
  enemy: {
    position: 'absolute', insetInlineEnd: 16, top: 8, textAlign: 'center',
    animation: 'encPop .6s .2s cubic-bezier(.2,1.5,.4,1) both',
  },
  enemyName: { display: 'block', fontSize: 12, opacity: 0.8, marginTop: 2 },
  flyer: { position: 'absolute', left: '50%', top: '42%', fontSize: 26, zIndex: 3 },

  bottom: {
    position: 'relative', zIndex: 2, padding: '0 16px 26px',
    background: 'linear-gradient(rgba(22,32,28,0), rgba(22,32,28,.92) 34%)',
    minHeight: 188, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  },
  name: { fontSize: 27, fontWeight: 800, margin: '0 0 12px', textAlign: 'center' },
  line: { fontSize: 16.5, opacity: 0.8, margin: '0 0 12px', textAlign: 'center' },
  actions: { display: 'flex', gap: 8 },
  action: {
    flex: 1, padding: '12px 6px 11px', borderRadius: 15, cursor: 'pointer',
    border: '1.5px solid rgba(243,237,225,.28)', background: 'rgba(243,237,225,.08)',
    color: cream, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 800,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },
  actionIcon: { fontSize: 25, lineHeight: 1.1 },
  actionHint: { fontSize: 11.5, fontWeight: 400, opacity: 0.72, lineHeight: 1.3 },
  lootRow: { display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap' },
  lootChip: {
    background: 'rgba(243,237,225,.14)', borderRadius: 999,
    padding: '6px 13px', fontSize: 15.5, fontWeight: 700,
  },
}

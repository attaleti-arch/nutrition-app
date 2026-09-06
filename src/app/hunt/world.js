'use client'
import { Monster, MONSTERS } from './monsters'

// ─── שערי הדרך: הצד השני של הפורטל ───
// מה שנאסף בחוץ עובר דרך הפורטל למימד הבית. ההליכה היא המקור היחיד
// לחומרים — אי אפשר לבנות שום דבר בלי לצאת.

export const AVATARS = [
  { id: 'nova', emoji: '🧑‍🚀', name: 'נובה' },
  { id: 'zuri', emoji: '🥷', name: 'זורי' },
  { id: 'kai', emoji: '🧙', name: 'קאי' },
]

// במקור אלה היו "קל / בינוני / קשה". ילד שנמנע מתנועה קורא "קשה", בוחר
// "קל", ומרגיש שבחר בפחות — בדיוק התחושה שהמשחק אמור לעקוף. אותו מנגנון,
// שם שמתאר אופי ולא יכולת.
export const JOURNEYS = [
  { k: 'calm', label: 'שקטה', sub: 'כמעט בלי הפרעות', enemyChance: 0.25, escape: 0.9 },
  { k: 'normal', label: 'רגילה', sub: 'משהו יקרה בדרך', enemyChance: 0.5, escape: 0.8 },
  { k: 'wild', label: 'פראית', sub: 'הדרך לא תיתן לכם מנוחה', enemyChance: 0.8, escape: 0.65 },
]
export const journeyOf = k => JOURNEYS.find(j => j.k === k) || JOURNEYS[1]

export const RESOURCES = {
  wood: { emoji: '🪵', name: 'קרשים' },
  stone: { emoji: '🪨', name: 'אבן' },
  flowers: { emoji: '🌼', name: 'פרחים' },
  honey: { emoji: '🍯', name: 'דבש' },
}

export const ENEMIES = [
  { emoji: '👺', name: 'גנב הקרשים' },
  { emoji: '🪲', name: 'חוטף הצוף' },
  { emoji: '🦹', name: 'שומר הצל' },
]

export const BUILDS = {
  house: { emoji: '🏠', name: 'בית', cost: { wood: 6, stone: 3 } },
  hive: { emoji: '🍯', name: 'כוורת', cost: { wood: 4, flowers: 3 } },
}
export const RUNS_TO_UNLOCK_BUILDER = 3

export const canAfford = (res, cost) => Object.entries(cost).every(([k, v]) => (res[k] || 0) >= v)
export const costText = cost =>
  Object.entries(cost).map(([k, v]) => `${v} ${RESOURCES[k].emoji}`).join(' + ')

const C = {
  cream: '#F3EDE1', card: '#FBF7EE', ink: '#22271E', soft: '#5A6154',
  olive: '#3F5C53', dusk: '#2E3A55', signal: '#C9762A', line: '#DCD2BE',
}

// ── האויב בדרך ──
// במקור האויב מחק חפץ מהתיק. ילד שנמנע מדברים שהוא עלול להיכשל בהם חווה
// אובדן התקדמות כעונש, וזו בדיוק התחושה שבורחים ממנה. כאן הוא *גונב* —
// והחפץ חוזר ביצור הבא. אותו מתח, אבל הוא מושך להמשיך ללכת.
export function EnemyOverlay({ enemy, stolen, escaped, onClose }) {
  return (
    <div style={ov.wrap} onClick={onClose}>
      <div style={{ fontSize: 96, animation: 'huntPop .45s cubic-bezier(.2,1.4,.4,1) both' }}>{enemy.emoji}</div>
      <p style={{ ...ov.title, animation: 'huntRise .4s .12s both' }}>{enemy.name}</p>
      <p style={{ ...ov.body, animation: 'huntRise .4s .2s both' }}>
        {escaped
          ? 'הוא ניסה — והתחמקתם!'
          : stolen
            ? <>הוא חטף {RESOURCES[stolen].emoji} {RESOURCES[stolen].name}. <b>היצור הבא יחזיר לכם את זה.</b></>
            : 'הוא ניסה לחטוף — אבל התיק היה ריק.'}
      </p>
      <button onClick={onClose} style={{ ...ov.btn, animation: 'huntRise .4s .3s both' }}>
        {escaped ? 'ממשיכים!' : 'אחריו!'}
      </button>
    </div>
  )
}

// ── הפורטל ──
export function PortalScreen({ creatures, loot, evolved, onTransfer }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 96, animation: 'huntSpin 7s linear infinite' }}>🌀</div>
      <h1 style={w.h1}>הפורטל נפתח</h1>
      <p style={w.lede}>מה שאספתם בחוץ עובר עכשיו למימד הבית.</p>

      <div style={w.tray}>
        <div style={w.trayRow}>
          {creatures.map((c, i) => (
            <span key={i} style={{ position: 'relative' }}>
              <Monster id={c.kind} size={46} />
              {c.evolved && <span style={w.spark}>✨</span>}
            </span>
          ))}
        </div>
        <div style={w.trayRow}>
          {Object.entries(countLoot(loot)).map(([k, n]) => (
            <span key={k} style={w.chip}>{RESOURCES[k].emoji} {n}</span>
          ))}
          {!loot.length && <span style={{ color: C.soft, fontSize: 14 }}>בלי חומרים הפעם</span>}
        </div>
      </div>

      {evolved && <p style={w.evolveNote}>✨ יצור אחד התפתח במסלול הארוך</p>}
      <button onClick={onTransfer} style={w.cta}>העבירו למימד הבית</button>
    </div>
  )
}

export function countLoot(loot) {
  return loot.reduce((acc, k) => ({ ...acc, [k]: (acc[k] || 0) + 1 }), {})
}

// ── מימד הבית ──
export function WorldScreen({ state, onBuild, onHoney, onNewRoute }) {
  const res = state.res || {}
  const built = state.built || {}
  const kept = state.kept || []
  const builderOpen = (state.runs45 || 0) >= RUNS_TO_UNLOCK_BUILDER
  const left = RUNS_TO_UNLOCK_BUILDER - (state.runs45 || 0)

  return (
    <div>
      <h1 style={w.h1}>מימד הבית</h1>

      <div style={w.scene}>
        <div style={w.sky} />
        <div style={w.ground} />
        {built.house && <span style={{ ...w.building, insetInlineEnd: 22 }}>🏠</span>}
        {built.hive && <span style={{ ...w.building, insetInlineStart: 22, fontSize: 46 }}>🍯</span>}
        <div style={w.herd}>
          {kept.length === 0 && <span style={w.empty}>עוד אין כאן אף אחד. צאו למסלול.</span>}
          {kept.slice(0, 18).map((c, i) => (
            <span key={i} style={{ position: 'relative' }}>
              <Monster id={c.kind} size={38} />
              {c.evolved && <span style={{ ...w.spark, fontSize: 13 }}>✨</span>}
            </span>
          ))}
        </div>
        {kept.length > 18 && <span style={w.more}>+{kept.length - 18}</span>}
      </div>

      <div style={w.resRow}>
        {Object.keys(RESOURCES).map(k => (
          <span key={k} style={w.chip}>{RESOURCES[k].emoji} <b>{res[k] || 0}</b></span>
        ))}
      </div>

      {!builderOpen ? (
        <p style={w.locked}>
          🦫 <b>בולדי הבנאי</b> עוד ישן. הוא מתעורר אחרי {RUNS_TO_UNLOCK_BUILDER} מסלולים של 45 דקות —
          {left === 1 ? ' נשאר אחד.' : ` נשארו ${left}.`}
        </p>
      ) : (
        <>
          <p style={w.unlocked}>🦫 בולדי ער. אפשר לבנות.</p>
          {Object.entries(BUILDS).map(([k, b]) => (
            <button key={k} onClick={() => onBuild(k)}
              disabled={built[k] || !canAfford(res, b.cost)}
              style={{ ...w.buildBtn, opacity: built[k] ? 0.45 : canAfford(res, b.cost) ? 1 : 0.55 }}>
              {b.emoji} {built[k] ? `${b.name} — בנוי` : `בנו ${b.name}`}
              {!built[k] && <span style={w.cost}> · {costText(b.cost)}</span>}
            </button>
          ))}
          <button onClick={onHoney} disabled={!built.hive || (res.flowers || 0) < 2}
            style={{ ...w.buildBtn, opacity: built.hive && (res.flowers || 0) >= 2 ? 1 : 0.55 }}>
            🍯 הפיקו דבש<span style={w.cost}> · 2 🌼 → 1 🍯</span>
          </button>
        </>
      )}

      <button onClick={onNewRoute} style={w.cta}>למסלול הבא 🐾</button>
    </div>
  )
}

const ov = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(28,32,26,.94)',
    color: C.cream, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', cursor: 'pointer',
  },
  title: { fontSize: 27, fontWeight: 800, margin: '16px 0 6px' },
  body: { fontSize: 16.5, lineHeight: 1.6, margin: 0, maxWidth: 320, color: 'rgba(243,237,225,.86)' },
  btn: {
    marginTop: 26, width: '100%', maxWidth: 240, padding: '14px 18px', borderRadius: 13,
    border: 'none', background: C.olive, color: C.cream, fontFamily: 'inherit',
    fontSize: 17, fontWeight: 800, cursor: 'pointer',
  },
}

const w = {
  h1: { fontSize: 30, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 },
  lede: { color: C.soft, margin: '0 0 20px', fontSize: 16, lineHeight: 1.6 },
  tray: {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
    padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16,
  },
  trayRow: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  chip: {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
    padding: '6px 13px', fontSize: 15, fontVariantNumeric: 'tabular-nums',
  },
  spark: { position: 'absolute', insetInlineEnd: -2, top: -4, fontSize: 15 },
  evolveNote: { color: C.signal, fontWeight: 700, margin: '0 0 16px' },
  scene: {
    position: 'relative', height: 220, borderRadius: 18, overflow: 'hidden',
    border: `1px solid ${C.line}`, marginBottom: 12,
  },
  sky: { position: 'absolute', inset: 0, background: 'linear-gradient(#EDE7DA, #E3DDCC)' },
  ground: { position: 'absolute', insetInline: 0, bottom: 0, height: '34%', background: '#D6CFB6' },
  building: { position: 'absolute', bottom: 16, fontSize: 58, lineHeight: 1 },
  herd: {
    position: 'absolute', insetInline: 12, top: 14, display: 'flex',
    gap: 4, flexWrap: 'wrap', justifyContent: 'center',
  },
  empty: { color: C.soft, fontSize: 14.5, marginTop: 28 },
  more: {
    position: 'absolute', insetInlineEnd: 10, top: 10, fontSize: 12.5,
    background: C.card, borderRadius: 999, padding: '3px 9px', border: `1px solid ${C.line}`,
  },
  resRow: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 },
  locked: {
    background: '#EFE7D6', color: '#6B4A18', borderRadius: 12,
    padding: '11px 14px', fontSize: 14.5, lineHeight: 1.6, margin: '0 0 14px',
  },
  unlocked: { color: C.olive, fontWeight: 700, margin: '0 0 10px', fontSize: 15.5 },
  buildBtn: {
    width: '100%', padding: '13px 16px', borderRadius: 12, marginBottom: 8,
    border: `1.5px solid ${C.olive}`, background: 'transparent', color: C.olive,
    fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', textAlign: 'start',
  },
  cost: { fontWeight: 400, fontSize: 13.5, opacity: 0.85 },
  cta: {
    width: '100%', padding: '15px 18px', borderRadius: 13, border: 'none', marginTop: 8,
    background: C.olive, color: C.cream, fontFamily: 'inherit',
    fontSize: 17, fontWeight: 800, cursor: 'pointer',
  },
}

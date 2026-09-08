'use client'
import { useEffect, useRef, useState } from 'react'
import { CREATURES, creatureById } from '../content/creatures'
import { AVAILABLE } from '../engine/coins'
import { RES_OF, RES_NAME, RES_ICON, creatureLine } from '../engine/world'
import { variantById } from '../engine/egg'
import { useModelViewer } from '../hooks/useModelViewer'
import { badgeList } from '../engine/badges'
import { itemById } from '../engine/shop'
import { Wear } from './Wear'

// ─── ספר היצורים, והישגים ───
// עמוד לכל יצור: מי הוא, מה הוא מביא, כמה פעמים נתפס, באילו צבעים. מי
// שלא נתפס — צללית וסימן שאלה, כדי שיהיה מה לרצות. לחיצה על יצור שנתפס
// פותחת אותו בתלת-ממד, לסובב עם האצבע — זה המקום של המודלים.

export function Book({ progress, onClose }) {
  const [open, setOpen] = useState(null)
  const have = progress?.creatures || []
  const caught = progress?.caught || {}
  const variants = progress?.variants || []
  return (
    <div style={B.wrap} dir="rtl">
      <div style={B.top}>
        <h2 style={B.h2}>ספר היצורים</h2>
        <span style={B.count}>{have.length} / {AVAILABLE.length}</span>
        <button onClick={onClose} style={B.close}>סגור</button>
      </div>
      <div style={B.grid}>
        {AVAILABLE.map(id => {
          const c = CREATURES[id]
          const known = have.includes(id)
          const n = caught[id] || 0
          const vs = variants.filter(v => v.creature === id)
          return (
            <button key={id} onClick={() => known && setOpen(id)} style={{ ...B.card, opacity: known ? 1 : 0.7, cursor: known ? 'pointer' : 'default' }} aria-label={known ? c.name : 'יצור לא ידוע'}>
              <div style={B.pic}>
                {known
                  ? <div style={{ position: 'relative', height: 116, width: 'fit-content' }}>
                      <img src={c.live || c.sprites?.hero} alt="" style={B.img} draggable={false} />
                      <Wear id={id} wear={progress?.wear?.[id]} />
                    </div>
                  : <span style={B.unknown}>?</span>}
              </div>
              <p style={B.name}>{known ? c.name : '???'}</p>
              <p style={B.sub}>{known ? `מביא ${RES_ICON[RES_OF[id]] || ''} ${RES_NAME[RES_OF[id]] || ''}` : c.arMode === 'sky' ? 'משהו באוויר' : 'משהו על הרצפה'}</p>
              {known && <p style={B.meta}>נתפס {n === 1 ? 'פעם אחת' : `${n} פעמים`}{vs.length ? ' · ' + vs.map(v => variantById(v.variant)?.name).join(', ') : ''}</p>}
            </button>
          )
        })}
      </div>
      {open && <CreaturePage id={open} progress={progress} onClose={() => setOpen(null)} />}
    </div>
  )
}

function CreaturePage({ id, progress, onClose }) {
  const c = creatureById(id)
  const ready = useModelViewer(!!c?.model)
  const ref = useRef(null)
  const [line, setLine] = useState(0)
  const vs = (progress?.variants || []).filter(v => v.creature === id)
  const n = progress?.caught?.[id] || 0
  const wear = progress?.wear?.[id]
  const dressed = !!wear && Object.keys(wear).length > 0
  useEffect(() => { setLine(Math.floor(Math.random() * 3)) }, [id])
  if (!c) return null
  // לובש משהו מהחנות? מראים את הדמות החיה עם הכובע. אחרת — התלת-ממד, לסובב.
  return (
    <div style={B.page} dir="rtl">
      <button onClick={onClose} style={B.back}>חזרה לספר</button>
      <div style={B.stage}>
        {ready && c.model && !dressed
          ? <model-viewer ref={ref} src={c.model} camera-controls auto-rotate auto-rotate-delay="800" rotation-per-second="20deg"
              interaction-prompt="none" environment-image="neutral" shadow-intensity="0.7" exposure="1.05"
              style={{ width: '100%', height: '100%', background: 'transparent' }} />
          : <div style={{ position: 'relative', height: '80%', width: 'fit-content' }}>
              <img src={c.live || c.sprites?.hero} alt="" style={{ height: '100%', width: 'auto', display: 'block' }} draggable={false} />
              <Wear id={id} wear={wear} />
            </div>}
      </div>
      <p style={B.pageHint}>{dressed ? `${c.name} עם ${Object.values(wear).map(w => itemById(w)?.name).filter(Boolean).join(' ו')}` : 'סובבו אותו עם האצבע'}</p>
      <h3 style={B.pageName}>{c.name}</h3>
      <p style={B.pageLine}>"{creatureLine(id, line)}"</p>
      <div style={B.facts}>
        <span style={B.fact}>{RES_ICON[RES_OF[id]]} מביא {RES_NAME[RES_OF[id]]}</span>
        <span style={B.fact}>{c.arMode === 'sky' ? '🌤️ באוויר' : '🐾 על הרצפה'}</span>
        <span style={B.fact}>🎯 נתפס {n} {n === 1 ? 'פעם' : 'פעמים'}</span>
        {vs.map((v, i) => <span key={i} style={{ ...B.fact, color: '#F0C069' }}>✨ {variantById(v.variant)?.name}</span>)}
      </div>
    </div>
  )
}

export function Badges({ progress, onClose }) {
  const list = badgeList(progress || {})
  const done = list.filter(b => b.done).length
  return (
    <div style={B.wrap} dir="rtl">
      <div style={B.top}>
        <h2 style={B.h2}>הישגים</h2>
        <span style={B.count}>{done} / {list.length}</span>
        <button onClick={onClose} style={B.close}>סגור</button>
      </div>
      <div style={B.list}>
        {list.map(b => (
          <div key={b.id} style={{ ...B.badge, opacity: b.done ? 1 : 0.62 }}>
            <span style={{ ...B.badgeIcon, filter: b.done ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={B.badgeName}>{b.name}</p>
              <p style={B.badgeDesc}>{b.desc}</p>
              {!b.done && <div style={B.bar}><div style={{ ...B.fill, width: `${Math.round((b.have / b.need) * 100)}%` }} /></div>}
            </div>
            <span style={B.badgeN}>{b.done ? '✓' : `${b.have}/${b.need}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const B = {
  wrap: { position: 'fixed', inset: 0, zIndex: 2800, background: '#0F150F', color: '#E9E5D8', overflowY: 'auto', padding: '18px 16px 40px', fontFamily: 'inherit' },
  top: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'sticky', top: 0, background: '#0F150F', padding: '6px 0', zIndex: 2 },
  h2: { margin: 0, fontSize: 24, fontWeight: 900, flex: 1 },
  count: { color: '#E5A342', fontWeight: 800, fontSize: 15 },
  close: { padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(233,229,216,.3)', background: 'transparent', color: '#E9E5D8', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  card: { background: '#161E17', border: '1px solid #2B382B', borderRadius: 14, padding: 10, textAlign: 'center', color: '#E9E5D8', fontFamily: 'inherit' },
  // רקע בהיר מעט מאחורי הדמות — צל, השחור, נעלם אחרת על כרטיס כהה.
  pic: { height: 120, display: 'grid', placeItems: 'center', background: 'radial-gradient(ellipse at 50% 60%, #33423A, rgba(51,66,58,0) 72%)', borderRadius: 12 },
  img: { maxHeight: 116, maxWidth: '100%', objectFit: 'contain' },
  unknown: { fontSize: 54, fontWeight: 900, color: '#3A473A' },
  name: { margin: '6px 0 0', fontSize: 17, fontWeight: 900 },
  sub: { margin: '2px 0 0', fontSize: 13, color: '#9BA495' },
  meta: { margin: '4px 0 0', fontSize: 12, color: '#767F71' },
  page: { position: 'fixed', inset: 0, zIndex: 2900, background: 'radial-gradient(ellipse at 50% 35%, #1C261D, #0F150F 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px 30px' },
  back: { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(233,229,216,.3)', background: 'transparent', color: '#E9E5D8', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  stage: { width: '100%', height: '48vh', display: 'grid', placeItems: 'center' },
  pageHint: { margin: 0, fontSize: 12.5, color: '#767F71' },
  pageName: { margin: '8px 0 0', fontSize: 30, fontWeight: 900, color: '#E5A342' },
  pageLine: { margin: '6px 0 14px', fontSize: 16, color: '#C3C8BA', fontStyle: 'italic', textAlign: 'center' },
  facts: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  fact: { padding: '6px 12px', borderRadius: 999, background: '#161E17', border: '1px solid #2B382B', fontSize: 14 },
  list: { display: 'grid', gap: 8 },
  badge: { display: 'flex', alignItems: 'center', gap: 12, background: '#161E17', border: '1px solid #2B382B', borderRadius: 14, padding: '10px 12px' },
  badgeIcon: { fontSize: 30, width: 40, textAlign: 'center' },
  badgeName: { margin: 0, fontSize: 16, fontWeight: 800 },
  badgeDesc: { margin: '2px 0 0', fontSize: 13, color: '#9BA495' },
  bar: { height: 5, borderRadius: 999, background: 'rgba(233,229,216,.12)', marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', background: '#E5A342', borderRadius: 999 },
  badgeN: { fontSize: 14, fontWeight: 800, color: '#E5A342', minWidth: 36, textAlign: 'center' },
}

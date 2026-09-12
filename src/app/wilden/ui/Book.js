'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { CREATURES, creatureById } from '../content/creatures'
import { AVAILABLE } from '../engine/coins'
import { RES_OF, RES_NAME, RES_ICON, creatureLine } from '../engine/world'
import { variantById, variantName } from '../engine/egg'
import { useModelViewer } from '../hooks/useModelViewer'
import { badgeList } from '../engine/badges'
import { itemById } from '../engine/shop'
import { Wear } from './Wear'
import { CreatureAura, StageTag } from './Aura'
import { STAGES, stageProgress, staged, stagedFor, stagedName, hasLook, looksFor, lookName, formsOf, formTally } from '../engine/stages'

// ─── ספר היצורים, והישגים ───
// "ספר היצורים צריך לכלול יותר מ-9, שיראו המון דמויות."
//
// והן שם: לכל יצור שלוש צורות — גור, בוגר, אגדי — ולכל אחת דמות משלה.
// תשעה יצורים הם עשרים ושבע צורות, ועוד אחת לכל צבע שבקע או נקנה. אז
// הספר הוא לא רשימה של תשעה כרטיסים אלא שורה לכל יצור: קו ההתפתחות
// שלו משמאל לימין, והצבעים שלו אחריו. מה שעוד לא נפתח — צללית שחורה:
// רואים שיש שם משהו, ורואים כמה חסר.
//
// בגריד יש פוסטרים (פריים אחד, חתוך), לא קליפים: עשרים ושבע אנימציות
// על מסך אחד הן שלושים מגה. הקליפ החי נפתח בעמוד של היצור, אחד בכל פעם.

export function Book({ progress, onClose, onLook = null }) {
  const [open, setOpen] = useState(null)
  const have = progress?.creatures || []
  const caught = progress?.caught || {}
  const tally = formTally(progress, AVAILABLE.map(id => CREATURES[id]))
  return (
    <div style={B.wrap} dir={dirOf()}>
      <div style={B.top}>
        <h2 style={B.h2}>{tr('ספר היצורים')}</h2>
        <span style={B.count}>{tally.open} / {tally.total}{tally.colours ? ` · ${tally.colours} 🎨` : ''}</span>
        <button onClick={onClose} style={B.close}>{tr('סגור')}</button>
      </div>
      <p style={B.lead}>{tr('{n} יצורים, ולכל אחד שלוש צורות — וצבעים.', { n: AVAILABLE.length })}</p>
      <div style={B.rows}>
        {AVAILABLE.map(id => {
          const base = CREATURES[id]
          const sp = stageProgress(progress, id)
          const known = have.includes(id)
          const n = caught[id] || 0
          const female = base.gender === 'f'
          const forms = formsOf(progress, base)
          return (
            <section key={id} style={B.row}>
              <div style={B.rowHead}>
                <span style={B.rowName}>{known ? tr(base.name) : '???'}</span>
                <span style={B.rowSub}>
                  {known
                    ? `${female ? tr('מביאה') : tr('מביא')} ${RES_ICON[RES_OF[id]] || ''} ${tr(RES_NAME[RES_OF[id]] || '')} · ${n === 1 ? tr('נתפס פעם אחת') : tr('נתפס {n} פעמים', { n })}`
                    : base.arMode === 'sky' ? tr('משהו באוויר') : tr('משהו על הרצפה')}
                </span>
              </div>
              <div style={B.forms}>
                {forms.map((f, i) => (
                  <Form key={`${id}-${f.kind}-${f.stage || ''}-${f.look || ''}-${i}`}
                    base={base} form={f} known={known} progress={progress} onOpen={() => setOpen(id)} />
                ))}
              </div>
              {/* "עוד 2 תפיסות ונימי גדל" — הסיבה לצאת שוב אליו */}
              {known && sp.next && (
                <div style={B.growWrap}>
                  <div style={B.growBar}><div style={{ ...B.growFill, width: `${Math.round((sp.have / sp.need) * 100)}%` }} /></div>
                  <span style={B.growText}>{tr('עוד')} {sp.left === 1 ? tr('תפיסה אחת') : tr('{n} תפיסות', { n: sp.left })} {sp.next === 3 ? (female ? tr('והיא אגדית') : tr('והוא אגדי')) : (female ? tr('והיא גדלה') : tr('והוא גדל'))}</span>
                </div>
              )}
            </section>
          )
        })}
      </div>
      {open && <CreaturePage id={open} progress={progress} onClose={() => setOpen(null)} onLook={onLook} />}
    </div>
  )
}

// ── צורה אחת ──
// פתוחה: הדמות של השלב (או של הצבע), עם ההילה שלה. נעולה: אותה דמות
// בדיוק, שחורה — צללית. ילד רואה מה מחכה לו, בלי לקבל את זה.
function Form({ base, form, known, progress, onOpen }) {
  const c = staged(base, form.stage || 1, form.kind === 'look' ? form.look : null)
  const src = c?.poster || c?.live || c?.sprites?.hero
  const locked = !form.open
  const need = !known ? tr('למצוא אותו')
    : form.left > 0 ? (form.left === 1 ? tr('עוד תפיסה') : tr('עוד {n}', { n: form.left }))
    : ''
  return (
    <button onClick={() => !locked && onOpen()} disabled={locked}
      aria-label={locked ? tr('צורה נעולה') : `${tr(base.name)} ${tr(form.name)}`}
      style={{ ...B.cell, ...(locked ? B.cellLocked : {}), cursor: locked ? 'default' : 'pointer' }}>
      <div style={B.cellPic}>
        {!locked && <CreatureAura c={c} size="104%" />}
        {src && <img src={src} alt="" loading="lazy" draggable={false}
          style={{ ...B.cellImg, filter: locked ? 'brightness(0) opacity(.32)' : (c.tint || 'none') }} />}
      </div>
      <span style={{ ...B.cellName, color: locked ? '#5C6A5C' : form.kind === 'look' ? '#F0C069' : '#E9E5D8' }}>
        {form.kind === 'look' ? '✨ ' : ''}{tr(form.name)}
      </span>
      {locked && need && <span style={B.cellNeed}>{need}</span>}
    </button>
  )
}

function CreaturePage({ id, progress, onClose, onLook }) {
  const sp = stageProgress(progress, id)
  const base = creatureById(id)
  const c = stagedFor(progress, base)
  const canLook = hasLook(progress, base)      // יש צבע מהביצה עם דמות משלו — אפשר להחליף מראה
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
    <div style={B.page} dir={dirOf()}>
      <button onClick={onClose} style={B.back}>{tr('חזרה לספר')}</button>
      <div style={B.stage}>
        {ready && c.model && !dressed
          ? <model-viewer ref={ref} src={c.model} camera-controls auto-rotate auto-rotate-delay="800" rotation-per-second="20deg"
              interaction-prompt="none" environment-image="neutral" shadow-intensity="0.7" exposure="1.05"
              style={{ width: '100%', height: '100%', background: 'transparent' }} />
          : <div style={{ position: 'relative', height: `${68 + (sp.stage - 1) * 12}%`, width: 'fit-content' }}>
              <CreatureAura c={c} size="118%" />
              <img src={c.live || c.sprites?.hero} alt="" style={{ position: 'relative', zIndex: 1, height: '100%', width: 'auto', display: 'block', filter: c.tint || 'none' }} draggable={false} />
              <Wear id={id} wear={wear} anchors={c.anchors} />
            </div>}
      </div>
      <p style={B.pageHint}>{dressed ? `${tr(c.name)} ${tr('עם')} ${Object.values(wear).map(w => tr(itemById(w)?.name)).filter(Boolean).join(tr(' ו'))}` : tr('סובבו אותו עם האצבע')}</p>
      <h3 style={B.pageName}>{stagedName(c, sp.stage)}{c.look ? ` ${tr(lookName(c.look, c))}` : ''}</h3>
      {/* שלושת השלבים: מה הושג, ומה הסף הבא */}
      <div style={B.stages} aria-label={tr('שלבי התפתחות')}>
        {STAGES.map(st => (
          <span key={st.n} style={{ ...B.stageDot, background: sp.stage >= st.n ? (st.n === 3 ? '#F0C069' : '#6EE6C8') : 'transparent', color: sp.stage >= st.n ? '#14200F' : '#767F71' }}>
            {tr(st.name)}{st.n > 1 && sp.stage < st.n ? ` · ${st.need}` : ''}
          </span>
        ))}
      </div>
      {sp.next && <p style={B.pageGrow}>{tr('נתפס {have} מ־{need}.', { have: sp.have, need: sp.need })} {tr('עוד')} {sp.left === 1 ? tr('תפיסה אחת') : tr('{n} תפיסות', { n: sp.left })}.</p>}
      {/* המראה: רגיל, מה שבקע מהביצה, סקינים מהחנות */}
      {canLook && onLook && (
        <div style={B.looks} aria-label={tr('מראה')}>
          <button onClick={() => onLook(id, 'base')} style={{ ...B.lookChip, ...(c.look ? {} : B.lookOn) }}>{tr('רגיל')}</button>
          {looksFor(progress, base).map(l => (
            <button key={l} onClick={() => onLook(id, l)} style={{ ...B.lookChip, ...(c.look === l ? B.lookOn : {}) }}>✨ {tr(lookName(l, c))}</button>
          ))}
        </div>
      )}
      <p style={B.pageLine}>"{tr(creatureLine(id, line))}"</p>
      <div style={B.facts}>
        <span style={B.fact}>{RES_ICON[RES_OF[id]]} {tr('מביא')} {tr(RES_NAME[RES_OF[id]])}</span>
        <span style={B.fact}>{c.arMode === 'sky' ? tr('🌤️ באוויר') : tr('🐾 על הרצפה')}</span>
        <span style={B.fact}>🎯 {n === 1 ? tr('נתפס פעם אחת') : tr('נתפס {n} פעמים', { n })}</span>
        {vs.map((v, i) => <span key={i} style={{ ...B.fact, color: '#F0C069' }}>✨ {tr(variantName(v.variant, c))}</span>)}
      </div>
    </div>
  )
}

export function Badges({ progress, onClose }) {
  const list = badgeList(progress || {})
  const done = list.filter(b => b.done).length
  return (
    <div style={B.wrap} dir={dirOf()}>
      <div style={B.top}>
        <h2 style={B.h2}>{tr('הישגים')}</h2>
        <span style={B.count}>{done} / {list.length}</span>
        <button onClick={onClose} style={B.close}>{tr('סגור')}</button>
      </div>
      <div style={B.list}>
        {list.map(b => (
          <div key={b.id} style={{ ...B.badge, opacity: b.done ? 1 : 0.62 }}>
            <span style={{ ...B.badgeIcon, filter: b.done ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={B.badgeName}>{tr(b.name)}</p>
              <p style={B.badgeDesc}>{tr(b.desc)}</p>
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
  lead: { margin: '0 0 12px', fontSize: 13.5, color: '#767F71' },
  rows: { display: 'grid', gap: 12 },
  row: { background: '#161E17', border: '1px solid #2B382B', borderRadius: 14, padding: '10px 10px 12px' },
  rowHead: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  rowName: { fontSize: 17, fontWeight: 900 },
  rowSub: { fontSize: 12.5, color: '#9BA495' },
  // גלילה אופקית בשורה: יצור עם ארבעה צבעים לא ישבור את הרוחב של הטלפון.
  forms: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' },
  cell: { flex: '0 0 auto', width: 88, background: '#101710', border: '1px solid #2B382B', borderRadius: 12,
    padding: '6px 4px 7px', color: '#E9E5D8', fontFamily: 'inherit', display: 'grid', justifyItems: 'center', gap: 2 },
  cellLocked: { background: '#0D120D', borderStyle: 'dashed', borderColor: '#263126' },
  cellPic: { position: 'relative', height: 72, width: '100%', display: 'grid', placeItems: 'center' },
  cellImg: { position: 'relative', zIndex: 1, maxHeight: 72, maxWidth: '100%', objectFit: 'contain', display: 'block' },
  cellName: { fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 },
  cellNeed: { fontSize: 11, color: '#767F71' },
  card: { background: '#161E17', border: '1px solid #2B382B', borderRadius: 14, padding: 10, textAlign: 'center', color: '#E9E5D8', fontFamily: 'inherit' },
  // רקע בהיר מעט מאחורי הדמות — צל, השחור, נעלם אחרת על כרטיס כהה.
  pic: { position: 'relative', height: 120, display: 'grid', placeItems: 'center', background: 'radial-gradient(ellipse at 50% 60%, #33423A, rgba(51,66,58,0) 72%)', borderRadius: 12 },
  growWrap: { marginTop: 6 },
  growBar: { height: 5, borderRadius: 999, background: 'rgba(233,229,216,.12)', overflow: 'hidden' },
  growFill: { height: '100%', background: '#6EE6C8', borderRadius: 999 },
  growText: { display: 'block', marginTop: 3, fontSize: 11.5, color: '#9BA495' },
  stages: { display: 'flex', gap: 6, marginTop: 6 },
  stageDot: { padding: '4px 10px', borderRadius: 999, border: '1px solid #2B382B', fontSize: 12.5, fontWeight: 800 },
  pageGrow: { margin: '6px 0 0', fontSize: 13.5, color: '#9BA495' },
  looks: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  lookChip: { padding: '6px 12px', borderRadius: 999, border: '1px solid #2B382B', background: 'transparent', color: '#E9E5D8', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' },
  lookOn: { borderColor: '#F0C069', background: 'rgba(240,192,105,.18)', color: '#F0C069' },
  lookBtn: { marginTop: 10, padding: '8px 14px', borderRadius: 10, border: '1px solid #F0C069', background: 'transparent', color: '#F0C069', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' },
  img: { maxHeight: 116, maxWidth: '100%', objectFit: 'contain' },
  unknown: { fontSize: 54, fontWeight: 900, color: '#3A473A' },
  name: { margin: '6px 0 0', fontSize: 17, fontWeight: 900 },
  sub: { margin: '2px 0 0', fontSize: 13, color: '#9BA495' },
  meta: { margin: '4px 0 0', fontSize: 12, color: '#767F71' },
  page: { position: 'fixed', inset: 0, zIndex: 2900, background: 'radial-gradient(ellipse at 50% 35%, #1C261D, #0F150F 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px 30px', overflowY: 'auto' },
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

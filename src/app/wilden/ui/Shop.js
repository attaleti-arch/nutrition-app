'use client'
import { useState } from 'react'
import { creatureById } from '../content/creatures'
import { ITEMS, SLOT, KID, owns, canBuy, wearOf } from '../engine/shop'
import { ItemSvg, Wear, kidSvg } from './Wear'
import { Aura } from './Aura'
import { staged, stageOf } from '../engine/stages'

// ─── החנות ───
// זרימה אחת: בוחרים מי (יצור שנתפס, או "אני" — הילד במפה), רואים אותו
// למעלה עם מה שהוא לובש, ולוחצים על פריט. לא נקנה ויש מטבעות — קונים והוא
// לובש מיד. נקנה — לובש. לובש כבר — מוריד. אין "סל", אין אישור.

export function Shop({ progress, onBuy, onEquip, onClose }) {
  const have = progress?.creatures || []
  const [who, setWho] = useState(have[0] || KID)
  const coins = progress?.coins || 0
  const wear = wearOf(progress, who)
  const isKid = who === KID
  const c = isKid ? null : staged(creatureById(who), stageOf(progress, who))

  const groups = [
    { title: 'כובעים', items: ITEMS.filter(i => i.slot === SLOT.HEAD) },
    !isKid && { title: 'על הפנים', items: ITEMS.filter(i => i.slot === SLOT.FACE) },
    isKid && { title: 'חולצה', items: ITEMS.filter(i => i.slot === SLOT.SHIRT) },
  ].filter(Boolean)

  const tap = item => {
    if (wear[item.slot] === item.id) return onEquip(who, item.slot, null)
    if (owns(progress, item.id)) return onEquip(who, item.slot, item.id)
    if (canBuy(progress, item.id)) onBuy(item.id, who, item.slot)
  }

  return (
    <div style={T.wrap} dir="rtl">
      <div style={T.top}>
        <h2 style={T.h2}>החנות</h2>
        <span style={T.coins}>🪙 {coins}</span>
        <button onClick={onClose} style={T.close}>סגור</button>
      </div>

      {/* מי לובש */}
      <div style={T.whoRow}>
        {have.map(id => {
          const cc = creatureById(id); if (!cc) return null
          return (
            <button key={id} onClick={() => setWho(id)} aria-label={cc.name} style={{ ...T.who, borderColor: who === id ? '#E5A342' : '#2B382B' }}>
              <img src={cc.live || cc.sprites?.hero} alt="" style={T.whoImg} draggable={false} />
            </button>
          )
        })}
        <button onClick={() => setWho(KID)} aria-label="אני" style={{ ...T.who, borderColor: isKid ? '#E5A342' : '#2B382B' }}>
          <span style={T.whoKid}>אני</span>
        </button>
      </div>

      {/* התצוגה: הנבחר, עם מה שהוא לובש */}
      <div style={T.stage}>
        {isKid
          ? <div style={T.kidBox} dangerouslySetInnerHTML={{ __html: kidSvg(0, wear) }} />
          : c && (
            <div style={{ position: 'relative', height: 176, width: 'fit-content' }}>
              {c.aura && <Aura stage={c.stage} />}
              <img src={c.live || c.sprites?.hero} alt="" style={{ position: 'relative', zIndex: 1, height: 176, width: 'auto', display: 'block' }} draggable={false} />
              <Wear id={who} wear={wear} anchors={c.anchors} />
            </div>
          )}
      </div>
      <p style={T.stageName}>{isKid ? 'הדמות שלך במפה' : c?.name}</p>

      {/* הפריטים */}
      {groups.map(gr => (
        <div key={gr.title}>
          <p style={T.groupTitle}>{gr.title}</p>
          <div style={T.grid}>
            {gr.items.map(item => {
              const owned = owns(progress, item.id)
              const wearing = wear[item.slot] === item.id
              const afford = owned || canBuy(progress, item.id)
              return (
                <button key={item.id} onClick={() => tap(item)} disabled={!afford}
                  aria-label={item.name}
                  style={{ ...T.card, borderColor: wearing ? '#8FB57C' : '#2B382B', opacity: afford ? 1 : 0.55 }}>
                  <div style={T.pic}>
                    {item.slot === SLOT.SHIRT
                      ? <span style={{ ...T.shirt, background: item.color, borderColor: item.dark }} />
                      : <ItemSvg id={item.id} style={{ height: 52, width: 'auto' }} />}
                  </div>
                  <p style={T.name}>{item.name}</p>
                  <p style={{ ...T.price, color: wearing ? '#8FB57C' : owned ? '#9BA495' : '#E5A342' }}>
                    {wearing ? '✓ לובש' : owned ? 'יש · ללבוש' : `🪙 ${item.price}`}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {!have.length && <p style={T.hint}>הכובעים הם ליצורים שנתפסו. עד אז — הדמות שלך במפה.</p>}
      <p style={T.hint}>מטבעות אוספים בדרך. פריט שנקנה פעם אחת אפשר ללבוש על כל אחד.</p>
    </div>
  )
}

const T = {
  wrap: { position: 'fixed', inset: 0, zIndex: 2800, background: '#0F150F', color: '#E9E5D8', overflowY: 'auto', padding: '18px 16px 40px', fontFamily: 'inherit' },
  top: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'sticky', top: 0, background: '#0F150F', padding: '6px 0', zIndex: 2 },
  h2: { margin: 0, fontSize: 24, fontWeight: 900, flex: 1 },
  coins: { color: '#E5A342', fontWeight: 900, fontSize: 18 },
  close: { padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(233,229,216,.3)', background: 'transparent', color: '#E9E5D8', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  whoRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 },
  who: { flex: 'none', width: 56, height: 56, borderRadius: 14, border: '2px solid', background: 'radial-gradient(circle at 50% 40%, #3E4D40, #26302A 75%)', display: 'grid', placeItems: 'center', padding: 4, cursor: 'pointer' },
  whoImg: { maxHeight: 46, maxWidth: 46, objectFit: 'contain' },
  whoKid: { color: '#E9E5D8', fontWeight: 900, fontSize: 15, fontFamily: 'inherit' },
  stage: { height: 200, display: 'grid', placeItems: 'center', marginTop: 8, background: 'radial-gradient(ellipse at 50% 60%, #1C261D, #0F150F 75%)', borderRadius: 16, overflow: 'hidden' },
  kidBox: { transform: 'scale(2.4)', transformOrigin: 'center', width: 72, height: 72 },
  stageName: { margin: '6px 0 4px', textAlign: 'center', fontSize: 17, fontWeight: 900, color: '#E5A342' },
  groupTitle: { margin: '12px 0 8px', fontSize: 14, fontWeight: 800, color: '#9BA495', letterSpacing: '.04em' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  card: { background: '#161E17', border: '1.5px solid', borderRadius: 14, padding: '10px 6px 8px', textAlign: 'center', color: '#E9E5D8', fontFamily: 'inherit', cursor: 'pointer' },
  pic: { height: 56, display: 'grid', placeItems: 'center' },
  shirt: { display: 'block', width: 44, height: 44, borderRadius: '50%', border: '3px solid' },
  name: { margin: '6px 0 0', fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 },
  price: { margin: '3px 0 0', fontSize: 13, fontWeight: 800 },
  hint: { margin: '14px 0 0', fontSize: 13, color: '#767F71', textAlign: 'center' },
}

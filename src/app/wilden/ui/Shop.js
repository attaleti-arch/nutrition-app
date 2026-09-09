'use client'
import { useState } from 'react'
import { creatureById } from '../content/creatures'
import { ITEMS, SLOT, KID, owns, canBuy, wearOf } from '../engine/shop'
import { ItemSvg, Wear, kidSvg } from './Wear'
import { CreatureAura } from './Aura'
import { stagedFor } from '../engine/stages'
import { GEAR, ownsGear, itemCount, canBuyGear, MAX_ITEMS } from '../engine/gear'
import { SKINS, ownsSkin, canBuySkin, canBuyStone, STONE_PRICE } from '../engine/skins'
import { stageProgress } from '../engine/stages'
import { GearIcon } from './GearIcons'

// ─── החנות ───
// זרימה אחת: בוחרים מי (יצור שנתפס, או "אני" — הילד במפה), רואים אותו
// למעלה עם מה שהוא לובש, ולוחצים על פריט. לא נקנה ויש מטבעות — קונים והוא
// לובש מיד. נקנה — לובש. לובש כבר — מוריד. אין "סל", אין אישור.

export function Shop({ progress, onBuy, onEquip, onGear = null, onSkin = null, onStone = null, onLook = null, onClose }) {
  const have = progress?.creatures || []
  const [who, setWho] = useState(have[0] || KID)
  const coins = progress?.coins || 0
  const wear = wearOf(progress, who)
  const isKid = who === KID
  const base = isKid ? null : creatureById(who)
  const c = isKid ? null : stagedFor(progress, base)

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

      {/* ── ציוד למרדף ── "משהו שמקל על המרדף." כלים עם השפעה אמיתית, קודם. */}
      <p style={T.groupTitle}>ציוד למרדף</p>
      <div style={T.gearGrid}>
        {GEAR.map(item => {
          const owned = item.kind === 'gear' && ownsGear(progress, item.id)
          const n = item.kind === 'item' ? itemCount(progress, item.id) : 0
          const can = canBuyGear(progress, item.id)
          return (
            <button key={item.id} onClick={() => can && onGear?.(item.id)} disabled={!can && !owned}
              aria-label={item.name}
              style={{ ...T.gearCard, borderColor: owned ? '#8FB57C' : n > 0 ? '#F0C069' : '#2B382B', opacity: can || owned || n > 0 ? 1 : 0.55 }}>
              <div style={T.gearIcon}><GearIcon id={item.id} size={64} />{n > 0 && <span style={T.gearCount}>×{n}</span>}</div>
              <div style={{ flex: 1, textAlign: 'start' }}>
                <p style={T.gearName}>{item.name} {item.kind === 'item' && <span style={T.once}>חד־פעמי</span>}</p>
                <p style={T.gearDesc}>{item.desc}</p>
                <p style={{ ...T.gearPrice, color: owned ? '#8FB57C' : can ? '#E5A342' : '#767F71' }}>
                  {owned ? '✓ יש לכם, לתמיד' : item.kind === 'item' && n >= MAX_ITEMS ? `יש ${n} — המקסימום` : `🪙 ${item.price}${n > 0 ? ' · עוד אחד' : ''}`}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <p style={{ ...T.groupTitle, marginTop: 18 }}>סקינים ולהלביש · למי?</p>
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

      {/* ── סקינים ── "הבן שלי אומר סקינים." מראה חדש ליצור הנבחר, וסקין מהביצה אם בקע. */}
      {!isKid && c && (
        <div style={T.skinRow}>
          <button onClick={() => onLook?.(who, 'base')} aria-label="מראה רגיל"
            style={{ ...T.skinCard, borderColor: !c.look ? '#8FB57C' : '#2B382B' }}>
            <div style={T.skinPic}><img src={base.live} alt="" style={T.skinImg} draggable={false} /></div>
            <p style={T.skinName}>רגיל</p>
            <p style={{ ...T.price, color: !c.look ? '#8FB57C' : '#9BA495' }}>{!c.look ? '✓ לובש' : 'ללבוש'}</p>
          </button>
          {SKINS.map(sk => {
            const owned = ownsSkin(progress, who, sk.id)
            const wearing = c.look === sk.id
            const can = canBuySkin(progress, who, sk.id)
            return (
              <button key={sk.id} onClick={() => (wearing ? onLook?.(who, 'base') : owned ? onLook?.(who, sk.id) : can && onSkin?.(who, sk.id))}
                disabled={!owned && !can} aria-label={`סקין ${sk.name}`}
                style={{ ...T.skinCard, borderColor: wearing ? '#8FB57C' : owned ? '#F0C069' : '#2B382B', opacity: owned || can ? 1 : 0.55 }}>
                <div style={T.skinPic}>
                  <span style={{ ...T.skinAura, background: `radial-gradient(circle, ${sk.aura}, rgba(0,0,0,0) 65%)` }} />
                  <img src={base.live} alt="" style={{ ...T.skinImg, filter: sk.filter, position: 'relative', zIndex: 1 }} draggable={false} />
                </div>
                <p style={T.skinName}>{base.gender === 'f' ? sk.nameF : sk.name}</p>
                <p style={{ ...T.price, color: wearing ? '#8FB57C' : owned ? '#9BA495' : can ? '#E5A342' : '#767F71' }}>
                  {wearing ? '✓ לובש' : owned ? 'ללבוש' : `🪙 ${sk.price}`}
                </p>
              </button>
            )
          })}
          {/* אבן צמיחה: נקודת התפתחות ליצור הזה */}
          <button onClick={() => canBuyStone(progress, who) && onStone?.(who)} disabled={!canBuyStone(progress, who)} aria-label="אבן צמיחה"
            style={{ ...T.skinCard, borderColor: '#2B382B', opacity: canBuyStone(progress, who) ? 1 : 0.55 }}>
            <div style={T.skinPic}><GearIcon id="stone" size={56} /></div>
            <p style={T.skinName}>אבן צמיחה</p>
            <p style={{ ...T.price, color: canBuyStone(progress, who) ? '#E5A342' : '#767F71' }}>🪙 {STONE_PRICE}</p>
            <p style={T.skinSub}>{stageProgress(progress, who).next ? `+1 · עוד ${stageProgress(progress, who).left} ${base.gender === 'f' ? 'והיא גדלה' : 'והוא גדל'}` : 'כבר אגדי'}</p>
          </button>
        </div>
      )}

      {/* התצוגה: הנבחר, עם מה שהוא לובש */}
      <div style={T.stage}>
        {isKid
          ? <div style={T.kidBox} dangerouslySetInnerHTML={{ __html: kidSvg(0, wear) }} />
          : c && (
            <div style={{ position: 'relative', height: 176, width: 'fit-content' }}>
              <CreatureAura c={c} />
              <img src={c.live || c.sprites?.hero} alt="" style={{ position: 'relative', zIndex: 1, height: 176, width: 'auto', display: 'block', filter: c.tint || 'none' }} draggable={false} />
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
  skinRow: { display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 6px', marginTop: 6 },
  skinCard: { flex: 'none', width: 112, background: '#161E17', border: '1.5px solid', borderRadius: 14, padding: '8px 6px', textAlign: 'center', color: '#E9E5D8', fontFamily: 'inherit', cursor: 'pointer' },
  skinPic: { position: 'relative', height: 84, display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: 10 },
  skinAura: { position: 'absolute', left: '50%', top: '55%', width: '120%', height: '120%', transform: 'translate(-50%,-50%)', borderRadius: '50%' },
  skinImg: { maxHeight: 80, maxWidth: 96, objectFit: 'contain' },
  skinName: { margin: '6px 0 0', fontSize: 14, fontWeight: 900 },
  skinSub: { margin: '3px 0 0', fontSize: 11.5, color: '#9BA495', lineHeight: 1.3 },
  gearGrid: { display: 'grid', gap: 8 },
  gearCard: { display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, #1C271E, #131A14)', border: '1.5px solid', borderRadius: 16, padding: '10px 12px', color: '#E9E5D8', fontFamily: 'inherit', cursor: 'pointer' },
  gearIcon: { position: 'relative', flex: 'none', width: 72, height: 72, borderRadius: 14, background: 'radial-gradient(circle at 50% 40%, #33423A, #1C261D 75%)', display: 'grid', placeItems: 'center' },
  gearCount: { position: 'absolute', top: -6, insetInlineStart: -6, padding: '2px 7px', borderRadius: 999, background: '#F0C069', color: '#14200F', fontSize: 12, fontWeight: 900 },
  gearName: { margin: 0, fontSize: 16.5, fontWeight: 900 },
  once: { fontSize: 11, fontWeight: 800, color: '#F0C069', border: '1px solid rgba(240,192,105,.5)', borderRadius: 999, padding: '1px 7px', marginInlineStart: 6, verticalAlign: 'middle' },
  gearDesc: { margin: '3px 0 0', fontSize: 13.5, color: '#C3C8BA', lineHeight: 1.4 },
  gearPrice: { margin: '5px 0 0', fontSize: 14, fontWeight: 800 },
}

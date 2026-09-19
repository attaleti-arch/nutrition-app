'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { creatureById } from '../content/creatures'
import { staged, stagedName, stageProgress, stageInfo, lookOf, MAX_STAGE } from '../engine/stages'
import { JARS_PER_POINT, jarsOf, towardNext, honeyOf } from '../engine/feed'
import { sfxCoin, sfxAppear, buzz } from '../engine/audio'

// ─── להאכיל ───
// "איך מתבצעת ההאכלה ויזואלית?"
//
// גוררים צנצנת מהמדף אל היצור. הצנצנת מתהפכת ונשפכת — היא שעושה את כל
// העבודה, ולא היצור. ככה זה עובד לכל אחד־עשר היצורים בלי קליפ אכילה
// לכל דמות: הילד קורא "הוא אוכל" מהצנצנת, מהניצוצות ומהצליל.
//
// היצור עצמו הוא הספרייט החי שכבר קיים, ומעליו שלוש תנועות ב-CSS:
// נוטה קדימה, נמעך, וקופץ בחזרה.
//
// ומה שמשתנה בכל האכלה: הפס. שלוש צנצנות — נקודת צמיחה, ואז מסך
// ההתפתחות (ui/Evolve.js) נכנס מעצמו מהמכונה.
//
// הצנצנת היא 🍯 בינתיים. ביום שתהיה תמונה — JAR_ICON, ושום דבר אחר
// בקובץ הזה לא משתנה.

const JAR_ICON = '🍯'
const POUR_MS = 900

export function Feed({ progress, creature, onFeed, onClose }) {
  const id = creature?.id
  const jars = honeyOf(progress)
  const sp = stageProgress(progress, id) || { stage: 1, have: 0, need: null }
  const look = lookOf(progress, creature)
  const c = staged(creature, sp.stage, look)
  const fed = towardNext(progress, id)

  const [drag, setDrag] = useState(null)      // { x, y } — הצנצנת באצבע
  const [pour, setPour] = useState(0)          // מפתח לאנימציית השפיכה
  const targetRef = useRef(null)
  const wrapRef = useRef(null)
  const busy = useRef(false)

  // ניקוי, כדי שאנימציה לא תישאר תקועה אם סוגרים באמצע
  useEffect(() => () => { busy.current = true }, [])

  const drop = e => {
    const t = targetRef.current
    const p = e.changedTouches?.[0] || e
    setDrag(null)
    if (!t || busy.current || !jars) return
    const r = t.getBoundingClientRect()
    const hit = p.clientX >= r.left - 30 && p.clientX <= r.right + 30 && p.clientY >= r.top - 30 && p.clientY <= r.bottom + 30
    if (!hit) return
    busy.current = true
    setPour(n => n + 1)
    try { sfxCoin(true); buzz([20, 40, 30]) } catch (err) { /* לא קריטי */ }
    // השפיכה רצה, ורק בסופה הצנצנת באמת יורדת מהמדף
    setTimeout(() => {
      try { sfxAppear() } catch (err) { /* */ }
      onFeed?.(id)
      busy.current = false
    }, POUR_MS)
  }

  const move = e => {
    if (!drag) return
    const p = e.touches?.[0] || e
    setDrag({ x: p.clientX, y: p.clientY })
  }

  const grab = e => {
    if (!jars || busy.current) return
    const p = e.touches?.[0] || e
    setDrag({ x: p.clientX, y: p.clientY })
  }

  const full = sp.stage >= MAX_STAGE
  return (
    <div dir={dirOf()} style={S.wrap} ref={wrapRef}
      onTouchMove={move} onTouchEnd={drop} onMouseMove={move} onMouseUp={drop}>
      <style>{CSS}</style>
      <button onClick={onClose} style={S.back} aria-label={tr('סגירה')}>{tr('חזרה')}</button>

      <p style={S.title}>{tr('להאכיל את {name}', { name: tr(stagedName(creature, sp.stage)) })}</p>

      {/* ── היצור ── הספרייט החי שכבר קיים, ומעליו התגובה */}
      <div style={S.stage}>
        {/* עוגן בגודל היצור עצמו — כדי שחוט הדבש ייפול על הראש שלו בכל
            מסך, ולא במקום שיצא נכון במקרה בטלפון אחד. */}
        <div style={S.anchor}>
          <div ref={targetRef} key={pour} style={{ ...S.figure, animation: pour ? 'wildenEat .9s ease-out' : 'none' }}>
            {c?.live && <img src={c.live} alt="" draggable={false} style={{ ...S.live, filter: c.tint || 'none' }} />}
          </div>
          {/* השפיכה: הצנצנת מתהפכת מעליו, וחוט דבש יורד */}
          {/* חוט הדבש נכנס מאחורי היצור ונעלם בו — ככה זה נראה כמו דבש
              שנשפך עליו, ולא כמו קו שחוצה אותו. הניצוצות מלפנים. */}
          {pour > 0 && (
            <div key={`p${pour}`} style={S.pourWrap} aria-hidden="true">
              <span style={S.pourJar}>{JAR_ICON}</span>
              <span style={S.pourStream} />
            </div>
          )}
          {pour > 0 && <span key={`s${pour}`} style={S.sparks} aria-hidden="true">✨</span>}
        </div>
      </div>

      {/* ── הפס ── זז בכל צנצנת, לא רק כשהשלב מתחלף */}
      {full ? (
        <p style={S.max}>{tr('{name} אגדי. אין לאן לגדול יותר.', { name: tr(creature?.name || '') })}</p>
      ) : (
        <div style={S.barWrap}>
          <p style={S.barTop}>
            {tr(stageInfo(sp.stage).name)} · {tr('עוד {n} צנצנות לנקודה', { n: JARS_PER_POINT - fed })}
          </p>
          <div style={S.bar}>
            <div style={{ ...S.fill, width: `${Math.round((fed / JARS_PER_POINT) * 100)}%` }} />
          </div>
          <p style={S.barSub}>{tr('שלב {a} מ־{b}', { a: sp.stage, b: MAX_STAGE })} · {tr('אכל {n} צנצנות', { n: jarsOf(progress, id) })}</p>
        </div>
      )}

      {/* ── המדף ── */}
      <p style={S.shelfTitle}>{jars ? tr('גררו צנצנת אליו') : tr('אין דבש. ריצת פרחים מכינה אותו.')}</p>
      <div style={S.shelf} onTouchStart={grab} onMouseDown={grab} role="button" aria-label={tr('צנצנת דבש')}>
        {Array.from({ length: Math.min(jars, 12) }, (_, i) => (
          <span key={i} style={S.jar}>{JAR_ICON}</span>
        ))}
        {jars > 12 && <span style={S.more}>+{jars - 12}</span>}
      </div>

      {/* הצנצנת שבאצבע */}
      {drag && (
        <span style={{ ...S.held, left: drag.x, top: drag.y }} aria-hidden="true">{JAR_ICON}</span>
      )}
    </div>
  )
}

const CSS = `
@keyframes wildenEat { 0% { transform: translateY(0) scale(1,1) } 25% { transform: translateY(6px) scale(1.06,.93) } 55% { transform: translateY(-10px) scale(.97,1.05) } 100% { transform: translateY(0) scale(1,1) } }
@keyframes wildenPourJar { 0% { transform: translateX(-50%) rotate(0deg); opacity: 0 } 18% { opacity: 1 } 45%,75% { transform: translateX(-50%) rotate(118deg) } 100% { transform: translateX(-50%) rotate(118deg); opacity: 0 } }
@keyframes wildenStream { 0%,25% { transform: translateX(-50%) scaleY(0); opacity: 0 } 40% { transform: translateX(-50%) scaleY(1); opacity: 1 } 78% { transform: translateX(-50%) scaleY(1); opacity: .9 } 100% { transform: translateX(-50%) scaleY(0); opacity: 0 } }
@keyframes wildenSpark { 0%,40% { opacity: 0; transform: translateX(-50%) scale(.4) } 62% { opacity: 1; transform: translateX(-50%) scale(1.25) } 100% { opacity: 0; transform: translateX(-50%) scale(1) } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, zIndex: 3300, background: 'linear-gradient(#141C16, #0D120E)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 18px 26px',
    color: '#E9E5D8', overflow: 'hidden', userSelect: 'none', touchAction: 'none' },
  back: { position: 'absolute', top: 16, insetInlineStart: 16, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', zIndex: 4 },
  title: { margin: 0, fontSize: 21, fontWeight: 900, color: '#F0C069' },
  stage: { position: 'relative', flex: 1, width: '100%', display: 'grid', placeItems: 'center', minHeight: 180 },
  anchor: { position: 'relative', display: 'grid', placeItems: 'center' },
  figure: { display: 'grid', placeItems: 'center', transformOrigin: '50% 100%', position: 'relative', zIndex: 1 },
  live: { height: '34vh', width: 'auto', display: 'block', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.55))' },
  pourWrap: { position: 'absolute', top: '-22%', left: '50%', width: 0, pointerEvents: 'none', zIndex: 0 },
  pourJar: { position: 'absolute', left: 0, top: 0, fontSize: 44, display: 'block',
    transformOrigin: '50% 80%', animation: 'wildenPourJar .9s ease-in-out both' },
  pourStream: { position: 'absolute', left: 0, top: 42, width: 9, height: 96, borderRadius: 999,
    background: 'linear-gradient(#FFD98A, #E8A32E)', transformOrigin: '50% 0',
    boxShadow: '0 0 14px rgba(255,200,90,.7)', animation: 'wildenStream .9s ease-in both' },
  sparks: { position: 'absolute', left: '50%', top: '26%', fontSize: 34, zIndex: 2, pointerEvents: 'none',
    animation: 'wildenSpark .9s ease-out both' },
  barWrap: { width: '100%', maxWidth: 340, textAlign: 'center', margin: '4px 0 12px' },
  barTop: { margin: 0, fontSize: 15, fontWeight: 800, color: '#E9E5D8' },
  bar: { height: 14, borderRadius: 999, background: 'rgba(233,229,216,.14)', overflow: 'hidden',
    border: '1px solid rgba(233,229,216,.22)', margin: '6px 0 4px' },
  fill: { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#E8A32E,#F0C069)', transition: 'width .45s ease-out' },
  barSub: { margin: 0, fontSize: 13, color: '#9BA495' },
  max: { margin: '4px 0 12px', fontSize: 15, fontWeight: 800, color: '#8FB57C', textAlign: 'center' },
  shelfTitle: { margin: '0 0 6px', fontSize: 14.5, color: '#C3C8BA' },
  shelf: { display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignItems: 'center',
    padding: '10px 14px', borderRadius: 14, minHeight: 58, width: '100%', maxWidth: 340,
    background: 'rgba(233,229,216,.06)', border: '1px solid rgba(233,229,216,.14)', cursor: 'grab' },
  jar: { fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 2px 5px rgba(0,0,0,.5))' },
  more: { fontSize: 14, fontWeight: 800, color: '#F0C069' },
  held: { position: 'fixed', fontSize: 42, transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5,
    filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.6))' },
}

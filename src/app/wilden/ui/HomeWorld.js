'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePinch } from './usePinch'
import { tr } from '../i18n'
import { creatureById } from '../content/creatures'
import { activeQuest, questProgress, canComplete, worldState, creatureLine, RES_NAME, RES_ICON, swarmOf, buildings, openChapter, CHAPTERS, nextGoals } from '../engine/world'
import { sfxAppear, sfxCheer, sfxFinish, buzz } from '../engine/audio'
import { Wear } from './Wear'
import { CreatureAura } from './Aura'
import { stageOf, stagedFor } from '../engine/stages'
import { SPOTS, GUARDIAN, TANK } from '../content/spots'
import { openAreas, areaOfSpot, DEFAULT_AREA } from '../content/areas'
import { WindTank, TankCard } from './WindTank'
import { takenId, WIND_NAME } from '../engine/wind'

// ─── עולם הבית ───
// "לא מבינה מה ילד רואה במעמד הבית." עכשיו: הרקע שלה (החורבה בשקיעה,
// סרטון שנושם), ועליו כל יצור שנתפס, חי — הקליפ שלו בלי רקע, במקום
// שלו: נימי ליד הכד, דבשון מעל העץ, בולדר על האבנים. לחיצה על יצור —
// הוא אומר משהו. השומר ליד השער: פסל כבוי שמבקש, ומתעורר כשנותנים.
// מה שנבנה נשאר: מים בכד, אור בביקון, ניצנים בעץ, שער פתוח.
//
// הכול על מלבן 3:4 של הרקע, במיקומים באחוזים, כדי שיישב על כל טלפון.

// איפה כל אחד עומד — ומה באמת יש בקבצים — יושב ב-content/spots.js, בלי
// React, כדי שהבדיקה תוכל לוודא שאף שתי דמויות לא נוגעות זו בזו.
export { SPOTS, GUARDIAN, TANK }
// הנחיל: היסטים ביחס לגובה של הגדול (ולא אחוזי עולם קבועים, שגלשו לשכן),
// ומכפיל גודל — הרחוקים קטנים יותר, בשביל עומק.
const SWARM_OFFS = [[-0.45, -0.12, 0.45], [0.45, -0.08, 0.45], [-0.75, 0.18, 0.4], [0.75, 0.22, 0.4], [-0.25, 0.34, 0.5], [0.3, 0.38, 0.5]]
const SWARM_BUDGET = 12
// ── הבועה לא נחתכת בקצה ──
// נימי עומד ב-15% ונוגה ב-85%: בועה שממורכזת עליהם גולשת מחוץ לתמונה
// והמשפט נקטע באמצע. בקצוות היא נצמדת פנימה במקום להתמרכז.
const bubbleAt = x => (x < 28 ? { left: 0, transform: 'none' }
  : x > 72 ? { left: 'auto', right: 0, transform: 'none' } : null)

// עד שתמונת המבנה תגיע: רק הילה חמה במקום שלו (הנחיל מסביב עושה את העבודה)
const GLOW = { hive: 'rgba(240,192,105,.55)', pond: 'rgba(120,200,240,.5)', quarry: 'rgba(200,170,140,.5)', nest: 'rgba(180,230,255,.5)' }
function BuildingGlow({ id }) {
  const c = GLOW[id] || GLOW.hive
  return <div aria-hidden="true" style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: `radial-gradient(circle, ${c} 0%, transparent 65%)` }} />
}

export function HomeWorld({ progress, onQuest, onCreatureTap, walks = 0, firstWord = false }) {
  const world = worldState(progress)
  const quest = activeQuest(progress)
  const chapter = openChapter(progress)
  const ready = canComplete(progress, quest)
  const [bubble, setBubble] = useState(null)      // { id, text }
  const [giving, setGiving] = useState(false)
  const [guardOpen, setGuardOpen] = useState(false)
  const [tankOpen, setTankOpen] = useState(false)
  const timer = useRef(null)
  const say = (id, text) => {
    clearTimeout(timer.current)
    setBubble({ id, text })
    timer.current = setTimeout(() => setBubble(null), 3600)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  // מי שגובטבו מחזיק לא נמצא בעולם — ורואים את החור שהוא השאיר.
  const held = takenId(progress)
  const have = (progress?.creatures || []).filter(id => id !== held)
  const seed = useMemo(() => Math.floor(Math.random() * 100), [])
  // כמה מהעולם נרפא: 0 — החורבה שלה; 1 — התמונה המתוקנת שלה, לגמרי.
  const heal = world.total ? Math.min(1, world.built / world.total) : 0
  const healed = heal >= 1

  // "ואז נכנסים ישר למשחק, והפסל בבית נותן את האות הראשון: אבן…"
  useEffect(() => {
    if (!firstWord) return
    const id = setTimeout(() => say('guardian', tr('אבן…')), 1400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstWord])

  const give = () => {
    if (!quest || !ready || giving) return
    setGiving(true)
    try { sfxFinish(); buzz([60, 40, 90]) } catch (e) { /* לא קריטי */ }
    setTimeout(() => {
      onQuest?.(quest.id)
      say('guardian', quest.done)
      setGiving(false)
      setGuardOpen(false)
      try { sfxCheer() } catch (e) { /* לא קריטי */ }
    }, 900)
  }

  // לטייל בעולם: צביטה מקרבת, גרירה מזיזה, לחיצה כפולה מחזירה.
  const pinch = usePinch()

  // ── הרצועה ──
  // "אין אפשרות שהעולם יהיה פנורמי ואפשר להזיז ממקום למקום?" המקומות
  // שיש להם תפאורה (content/areas.js), והמקום שעומדים בו עכשיו. עם מקום
  // אחד — אין חיצים, אין נקודות, וזה בדיוק המסך שהיה.
  const areas = openAreas(world)
  const [at, setAt] = useState(0)
  const here = Math.min(at, areas.length - 1)
  const go = d => {
    const n = Math.max(0, Math.min(areas.length - 1, here + d))
    if (n === here) return
    setAt(n); setBubble(null); setGuardOpen(false); setTankOpen(false)
    try { sfxAppear() } catch (e) { /* לא קריטי */ }
  }

  return (
    <div ref={pinch.ref} style={{ ...W.wrap, ...pinch.wrapStyle }} {...pinch.handlers}>
      <style>{CSS}</style>
      <div style={{ ...W.scene, ...pinch.sceneStyle }}>
      {/* ── הרצועה ── כל מקום הוא מסך שלם, והם מסודרים בשורה. המעבר הוא
          הזזה של הרצועה, ולכן הוא נראה כמו ללכת הצידה ולא כמו לטעון מסך.
          transform הוא פיזי ולא לוגי, ולכן זה נכון גם בעברית וגם בגרמנית. */}
      {areas.map((a, i) => {
        const mine = a.id === DEFAULT_AREA        // שכבות החורבה שייכות למקום הראשון
        return (
        <div key={a.id} style={{ ...W.area, transform: `translateX(${(i - here) * 100}%)`,
          visibility: Math.abs(i - here) > 1 ? 'hidden' : 'visible' }}>
      {/* התפאורה של המקום הזה. סרטון בלופ — וילד לא מחכה לסרטון, אז
          התמונה קודם והסרטון מעליה כשמוכן. */}
      <img src={a.bg} alt="" style={W.bg} draggable={false} />
      {a.video && !healed && <video src={a.video} autoPlay muted loop playsInline style={W.bg} />}
      {/* העולם המתוקן — אותה תפאורה בבוקר, עולה בהדרגה עם כל בקשה
          שנענתה, עד שמכסה את החורבה לגמרי. */}
      {a.healed && <img src={a.healed} alt="" draggable={false}
        style={{ ...W.bg, opacity: heal, transition: 'opacity 2.4s ease-in-out' }} />}
      {a.healedVideo && healed && <video src={a.healedVideo} poster={a.healed} autoPlay muted loop playsInline style={W.bg} />}
      {/* בזום: סטילס חדים מעל הסרטונים. החורבה מתחת, המתוקן מעליה. */}
      {a.hd && pinch.zoomed && <img src={a.hd} alt="" draggable={false} style={W.bg} />}
      {a.healedHd && <img src={a.healedHd} alt="" draggable={false}
        style={{ ...W.bg, opacity: pinch.zoomed ? heal : 0, transition: 'opacity .35s ease' }} />}
      <div style={{ ...W.dusk, opacity: 1 - heal * 0.5 }} />

      {/* מה נבנה: שכבות על התפאורה — עד שהתמונה המתוקנת כבר מראה הכול בעצמה */}
      {mine && !healed && world.basinFull && <div style={W.basinWater} aria-hidden="true" />}
      {mine && !healed && world.beaconLit && <div style={W.beaconGlow} aria-hidden="true" />}
      {mine && !healed && world.treeAlive && <div style={W.treeLeaves} aria-hidden="true">🌿🌸🌿</div>}
      {mine && !healed && world.gateOpen && <div style={W.gateLight} aria-hidden="true" />}

      {/* השומר: פסל כבוי, או ער. עומד במקום שלו ברצועה. */}
      {areaOfSpot(GUARDIAN) === a.id && <button onClick={() => { setGuardOpen(v => !v); try { sfxAppear() } catch (e) { /* */ } }} aria-label={tr('השומר')}
        style={{ ...W.spot, left: `${GUARDIAN.x}%`, top: `${GUARDIAN.y}%`, height: `${GUARDIAN.h}%` }}>
        {world.guardianAwake
          ? <img src="/world/guardian.webp" alt="" style={W.figure} draggable={false} />
          : <img src="/world/guardian-still.png" alt="" style={{ ...W.figure, filter: 'grayscale(1) brightness(.62) contrast(.95)' }} draggable={false} />}
        {!world.guardianAwake && <span style={W.zz}>💤</span>}
        {quest && !guardOpen && <span style={{ ...W.mark, background: ready ? '#8FB57C' : '#E5A342' }}>{ready ? '✓' : '!'}</span>}
      </button>}

      {/* היצורים שחיים כאן */}
      {have.filter(id => areaOfSpot(SPOTS[id]) === a.id).map(id => {
        const sp = SPOTS[id]
        // בשלב שלו: בוגר גדול ב-15%, אגדי ב-30% (לא הגודל המלא של הבמה — הבית צפוף).
        const stage = stageOf(progress, id)
        const c = stagedFor(progress, creatureById(id))
        if (!c || !sp || !c.live) return null
        const h = sp.h * (1 + (stage - 1) * 0.15)
        return (
          <button key={id} onClick={() => { say(id, creatureLine(id, seed + walks)); onCreatureTap?.(id); try { sfxAppear() } catch (e) { /* */ } }}
            aria-label={c.name}
            style={{ ...W.spot, left: `${sp.x}%`, top: `${sp.y + h * (sp.foot || 0)}%`, height: `${h}%`, animation: sp.air ? 'wildenHover 3.2s ease-in-out infinite' : 'none' }}>
            <div style={{ ...W.figure, width: 'fit-content', position: 'relative', transform: sp.flip ? 'scaleX(-1)' : 'none' }}>
              <CreatureAura c={c} />
              <img src={c.live} alt="" draggable={false} style={{ ...W.figure, position: 'relative', zIndex: 1, filter: c.tint || 'none' }} />
              <Wear id={id} wear={progress?.wear?.[id]} anchors={c.anchors} />
            </div>
            {/* הצל מתחת לרגליים, לא מתחת לקנבס */}
            {!sp.air && <span style={{ ...W.groundShadow, bottom: `calc(${(sp.foot || 0) * 100}% - 4px)` }} />}
            {bubble?.id === id && <span style={{ ...W.bubble, ...bubbleAt(sp.x) }}>{bubble.text}</span>}
          </button>
        )
      })}
      {/* ── הנחיל ── תפיסות חוזרות: אותו קליפ בקטן, בקשת סביב הגדול, עד שש. לכל
          היותר 12 בכל העולם, כדי שטלפון לא ייחנק. */}
      {(() => {
        let budget = SWARM_BUDGET
        return have.filter(id => areaOfSpot(SPOTS[id]) === a.id).flatMap(id => {
          const c = creatureById(id); const sp = SPOTS[id]
          const n = Math.min(swarmOf(progress, id), budget)
          if (!c?.live || !sp || n <= 0) return []
          budget -= n
          return SWARM_OFFS.slice(0, n).map(([dx, dy, k], i) => (
            <img key={`${id}-m${i}`} src={c.live} alt="" draggable={false} aria-hidden="true"
              style={{ ...W.mini, left: `${sp.x + dx * sp.h}%`, top: `${sp.y + dy * sp.h + sp.h * k * (sp.foot || 0)}%`, height: `${sp.h * k}%`,
                transform: `translate(-50%,-100%) ${i % 2 ? 'scaleX(-1)' : ''}`,
                animation: sp.air ? `wildenHover ${2.6 + i * 0.35}s ease-in-out infinite` : 'none', animationDelay: `${i * 0.2}s`,
                filter: c.tint || 'none' }} />
          ))
        })
      })()}

      {/* ── מבנים ── שבע מאותו יצור: המבנה שלו מופיע ומייצר בכל מסע. התמונה
          שלה כשתגיע (img); עד אז — ציור. */}
      {buildings(progress).filter(b => b.built && areaOfSpot(b.spot) === a.id).map(b => (
        <div key={b.id} style={{ ...W.building, left: `${b.spot.x}%`, top: `${b.spot.y}%`, width: `${b.spot.w}%` }} aria-label={tr(b.name)}>
          {b.img ? <img src={b.live || b.img} alt="" style={{ width: '100%', display: 'block' }} draggable={false} /> : <BuildingGlow id={b.id} />}
          <span style={W.buildingTag}>{RES_ICON[b.product]} {tr('+1 בכל מסע')}</span>
        </div>
      ))}

      {/* ── החור ── "אם נשארים אדישים בחוסר תנועה, דמות נחטפת." אז היא
          לא כאן — ורואים בדיוק *מי* לא כאן: הצללית שלו במקום שלו, ומערבולת
          עליה. ילד לא צריך לקרוא שום שורה כדי להבין מה קרה. */}
      {held && SPOTS[held] && creatureById(held) && areaOfSpot(SPOTS[held]) === a.id && (() => {
        const sp = SPOTS[held]
        const c = creatureById(held)
        return (
          <button onClick={() => say(held, tr('{wind} מחזיק אותו. שאבו את הרוח שלו בדרך.', { wind: tr(WIND_NAME) }))}
            aria-label={tr('מקום ריק')}
            style={{ ...W.spot, left: `${sp.x}%`, top: `${sp.y + sp.h * (sp.foot || 0)}%`, height: `${sp.h}%` }}>
            <img src={c.poster || c.live} alt="" draggable={false}
              style={{ ...W.figure, transform: sp.flip ? 'scaleX(-1)' : 'none', filter: 'brightness(.3) saturate(.1) contrast(1.2)', opacity: 0.72 }} />
            <span style={W.hole} aria-hidden="true" />
            <span style={W.heldMark} aria-hidden="true">🌀</span>
            {bubble?.id === held && <span style={{ ...W.bubble, ...bubbleAt(sp.x) }}>{bubble.text}</span>}
          </button>
        )
      })()}

      {/* ── השואב ── מי שנשאב בחוץ מסתחרר בזכוכית שלו, עד שמסע שלם
          מרכך אותו. בלי כלוב, ובלי לכלוא. */}
      {areaOfSpot(TANK) === a.id && <div style={{ ...W.tank, left: `${TANK.x}%`, top: `${TANK.y}%`, width: `${TANK.w}%` }}>
        <WindTank progress={progress} onOpen={() => setTankOpen(v => !v)} />
      </div>}

      {bubble?.id === 'guardian' && areaOfSpot(GUARDIAN) === a.id && (
        <span style={{ ...W.bubble, position: 'absolute', bottom: 'auto', left: `${GUARDIAN.x}%`, top: `${GUARDIAN.y - GUARDIAN.h - 12}%`, display: 'block' }}>{bubble.text}</span>
      )}

        </div>
        )
      })}
      </div>

      {/* ── ללכת הצידה ── חיצים בשוליים ונקודות למעלה. מופיעים רק כשיש
          לאן ללכת, כדי שמסך של מקום אחד יישאר בדיוק כמו שהיה. */}
      {areas.length > 1 && (
        <>
          {here > 0 && <button dir="ltr" onClick={() => go(-1)} aria-label={tr('אחורה')} style={{ ...W.arrow, left: 6 }}>‹</button>}
          {here < areas.length - 1 && <button dir="ltr" onClick={() => go(1)} aria-label={tr('קדימה')} style={{ ...W.arrow, right: 6 }}>›</button>}
          <div style={W.areaTabs}>
            {areas.map((a, i) => (
              <button key={a.id} onClick={() => go(i - here)} aria-label={tr(a.name)}
                style={{ ...W.areaTab, ...(i === here ? W.areaTabOn : null) }}>{tr(a.name)}</button>
            ))}
          </div>
        </>
      )}

      {/* מה יש בשואב — בגודל שאפשר לראות. מחוץ לסצנה, כמו כרטיס הבקשה,
          כדי שצביטה לא תגרור אותו. */}
      {tankOpen && <TankCard progress={progress} onClose={() => setTankOpen(false)} />}

      {/* הבקשה של השומר */}
      {quest && guardOpen && !tankOpen && (
        <div style={W.questCard} onClick={e => e.stopPropagation()}>
          <p style={W.questTitle}>
            {world.guardianAwake ? tr('השומר') : tr('פסל אבן, כבוי')} · {tr(quest.title)}
            <span style={W.chapter}>{tr('פרק {n}: {name}', { n: chapter, name: tr(CHAPTERS.find(c => c.n === chapter)?.name || '') })}</span>
          </p>
          <p style={W.questAsk}>{tr(quest.ask)}</p>
          <div style={W.needs}>
            {questProgress(progress, quest).map(n => (
              <span key={n.res} style={{ ...W.need, borderColor: n.have >= n.need ? '#8FB57C' : 'rgba(233,229,216,.25)' }}>
                {RES_ICON[n.res] || '•'} {tr(RES_NAME[n.res] || n.res)} <b>{n.have}/{n.need}</b>
              </span>
            ))}
          </div>
          {ready
            ? <button onClick={give} disabled={giving} style={W.give}>{giving ? '…' : tr('לתת לו · +{n} 🪙', { n: quest.coins })}</button>
            : <p style={W.hint}>{tr(quest.hint)}</p>}
        </div>
      )}
      {/* ── לא "נגמר" ── כל הבקשות נסגרו, ועדיין יש בדיוק מה לעשות מחר:
          צורות בספר, יצור שעומד לגדול, מבנים, צבעים. במספרים אמיתיים. */}
      {!quest && (
        <div style={W.builtAll}>
          <p style={W.builtLine}>{tr('העולם נבנה מחדש. הבוקר חזר, והשער פתוח.')}</p>
          <div style={W.goals}>
            {nextGoals(progress).map((g, i) => (
              <span key={i} style={W.goal}>
                {g.icon} {g.name ? `${tr(g.name)} · ${g.left === 1 ? tr('עוד תפיסה') : tr('עוד {n}', { n: g.left })}` : `${tr(g.text)} ${g.have}/${g.need}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* כמה נבנה */}
      <div style={{ ...W.progress, ...(areas.length > 1 ? { top: 36 } : null) }} aria-label={tr('התקדמות העולם')}>
        {Array.from({ length: world.total }, (_, i) => <span key={i} style={{ ...W.dot, background: i < world.built ? '#E5A342' : 'rgba(233,229,216,.25)' }} />)}
      </div>
    </div>
  )
}

const CSS = `
@keyframes wildenHover { 0%,100% { transform: translate(-50%,-100%) translateY(0) } 50% { transform: translate(-50%,-100%) translateY(-6px) } }
@keyframes wildenBubble { 0% { opacity: 0; transform: translate(-50%, 6px) } 12% { opacity: 1; transform: translate(-50%, 0) } 85% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenHole { 0%,100% { opacity: .75; transform: scale(1) rotate(0) } 50% { opacity: 1; transform: scale(1.08) rotate(180deg) } }
@keyframes wildenWater { 0%,100% { opacity: .55 } 50% { opacity: .8 } }
@keyframes wildenBeacon { 0%,100% { opacity: .6; transform: translate(-50%,-50%) scale(1) } 50% { opacity: .95; transform: translate(-50%,-50%) scale(1.12) } }
`

const W = {
  wrap: { position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 18, overflow: 'hidden', background: '#1b1a22', border: '1px solid #2B382B', userSelect: 'none' },
  scene: { position: 'absolute', inset: 0, willChange: 'transform' },
  area: { position: 'absolute', inset: 0, transition: 'transform .45s cubic-bezier(.2,.8,.3,1)' },
  arrow: { position: 'absolute', top: '46%', zIndex: 6, width: 34, height: 46, borderRadius: 10,
    background: 'rgba(15,21,15,.55)', border: '1px solid rgba(233,229,216,.25)', color: '#E9E5D8',
    fontSize: 26, lineHeight: 1, fontFamily: 'inherit', cursor: 'pointer', padding: 0, backdropFilter: 'blur(2px)' },
  areaTabs: { position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 6 },
  areaTab: { padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(233,229,216,.22)',
    background: 'rgba(15,21,15,.6)', color: '#9BA495', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' },
  areaTabOn: { background: 'rgba(233,229,216,.92)', color: '#14200F', borderColor: 'transparent' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  dusk: { position: 'absolute', inset: 0, background: 'linear-gradient(rgba(15,21,15,0) 70%, rgba(15,21,15,.55))', pointerEvents: 'none' },
  spot: { position: 'absolute', transform: 'translate(-50%,-100%)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', display: 'block' },
  // בלי filter על תמונות מונפשות: drop-shadow שמחושב 10 פעמים בשנייה על שמונה WebP תוקע טלפון. הצל מצויר בנפרד.
  figure: { height: '100%', width: 'auto', display: 'block' },
  groundShadow: { position: 'absolute', left: '15%', right: '15%', bottom: -4, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,.35)', filter: 'blur(3px)', zIndex: -1 },
  zz: { position: 'absolute', top: -6, insetInlineEnd: -10, fontSize: 18 },
  mini: { position: 'absolute', pointerEvents: 'none', zIndex: 1, opacity: 0.96 },
  building: { position: 'absolute', transform: 'translate(-50%,-100%)', zIndex: 0, pointerEvents: 'none' },
  tank: { position: 'absolute', transform: 'translate(-50%,-100%)', zIndex: 2 },
  heldMark: { position: 'absolute', top: -6, insetInlineEnd: -6, fontSize: 17, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.7))' },
  hole: { position: 'absolute', inset: '-18% -30%', pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(110,168,230,.45), rgba(20,34,50,.35) 48%, rgba(20,34,50,0) 72%)',
    animation: 'wildenHole 3.4s ease-in-out infinite' },
  buildingTag: { position: 'absolute', left: '50%', top: '-10px', transform: 'translate(-50%,-100%)', whiteSpace: 'nowrap', background: 'rgba(15,21,15,.85)', border: '1px solid #F0C069', color: '#F0C069', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 800 },
  mark: { position: 'absolute', top: -8, insetInlineStart: -8, width: 24, height: 24, borderRadius: '50%', color: '#14200F', fontWeight: 900, fontSize: 15, display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.4)' },
  bubble: { position: 'absolute', display: 'block', bottom: '104%', left: '50%', transform: 'translateX(-50%)', minWidth: 150, maxWidth: 230, padding: '8px 12px', borderRadius: 12, background: 'rgba(233,229,216,.96)', color: '#14200F', fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,.35)', animation: 'wildenBubble 3.6s ease-out forwards', pointerEvents: 'none', zIndex: 5, whiteSpace: 'normal' },
  basinWater: { position: 'absolute', left: '39%', top: '43%', width: '23%', height: '6%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(120,190,230,.75), rgba(60,120,180,.4) 70%, rgba(60,120,180,0))', animation: 'wildenWater 3s ease-in-out infinite', pointerEvents: 'none' },
  beaconGlow: { position: 'absolute', left: '50.5%', top: '45%', width: '26%', height: '18%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,230,140,.85), rgba(240,192,105,.35) 45%, rgba(240,192,105,0) 70%)', animation: 'wildenBeacon 2.4s ease-in-out infinite', pointerEvents: 'none' },
  treeLeaves: { position: 'absolute', left: '7%', top: '12%', fontSize: 26, letterSpacing: 4, pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' },
  gateLight: { position: 'absolute', left: '46%', top: '30%', width: '12%', height: '14%', background: 'linear-gradient(rgba(255,240,200,.9), rgba(255,220,140,.5))', borderRadius: '40% 40% 4px 4px', boxShadow: '0 0 30px rgba(255,220,140,.8)', pointerEvents: 'none' },
  questCard: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(15,21,15,.92)', border: '1px solid #2B382B', color: '#E9E5D8', zIndex: 6 },
  questTitle: { margin: 0, fontSize: 12.5, color: '#E5A342', fontWeight: 800, letterSpacing: '.04em' },
  questAsk: { margin: '6px 0 8px', fontSize: 15, lineHeight: 1.5, fontWeight: 600 },
  needs: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  need: { padding: '4px 9px', borderRadius: 999, border: '1.5px solid', fontSize: 13.5, background: 'rgba(233,229,216,.06)' },
  give: { display: 'block', width: '100%', padding: '11px 14px', borderRadius: 11, border: 'none', background: '#8FB57C', color: '#14200F', fontFamily: 'inherit', fontSize: 16, fontWeight: 900, cursor: 'pointer' },
  hint: { margin: 0, fontSize: 13.5, color: '#9BA495' },
  // למעלה, על השמיים: למטה הוא היה מכסה בדיוק את השורה הקדמית של
  // היצורים — ואת המקום שלהם בעולם בניתי אתמול.
  builtAll: { position: 'absolute', left: 10, right: 10, top: 30, padding: '9px 12px', borderRadius: 12, background: 'rgba(15,21,15,.82)', color: '#E9E5D8', fontSize: 14, textAlign: 'center', zIndex: 3 },
  builtLine: { margin: '0 0 8px', fontSize: 14, fontWeight: 700 },
  goals: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  goal: { padding: '4px 9px', borderRadius: 999, border: '1px solid #2B382B', background: 'rgba(233,229,216,.06)', fontSize: 12.5, fontWeight: 700 },
  chapter: { display: 'block', marginTop: 2, color: '#767F71', fontSize: 11, fontWeight: 700, letterSpacing: '.03em' },
  progress: { position: 'absolute', top: 10, insetInlineStart: 12, display: 'flex', gap: 5, zIndex: 4 },
  dot: { width: 9, height: 9, borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,.5)' },
}

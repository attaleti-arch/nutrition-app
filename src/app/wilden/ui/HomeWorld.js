'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { creatureById } from '../content/creatures'
import { activeQuest, questProgress, canComplete, worldState, creatureLine, RES_NAME, RES_ICON } from '../engine/world'
import { sfxAppear, sfxCheer, sfxFinish, buzz } from '../engine/audio'

// ─── עולם הבית ───
// "לא מבינה מה ילד רואה במעמד הבית." עכשיו: הרקע שלה (החורבה בשקיעה,
// סרטון שנושם), ועליו כל יצור שנתפס, חי — הקליפ שלו בלי רקע, במקום
// שלו: נימי ליד הכד, דבשון מעל העץ, בולדר על האבנים. לחיצה על יצור —
// הוא אומר משהו. השומר ליד השער: פסל כבוי שמבקש, ומתעורר כשנותנים.
// מה שנבנה נשאר: מים בכד, אור בביקון, ניצנים בעץ, שער פתוח.
//
// הכול על מלבן 3:4 של הרקע, במיקומים באחוזים, כדי שיישב על כל טלפון.

// איפה כל יצור עומד בעולם (אחוזים מהתפאורה), ובאיזה גודל (גובה ב-%).
const SPOTS = {
  nimi: { x: 36, y: 63, h: 15, flip: true },
  gali: { x: 56, y: 56, h: 12 },
  lumi: { x: 24, y: 74, h: 18, flip: true },
  bolder: { x: 80, y: 60, h: 22 },
  kraag: { x: 66, y: 71, h: 17, flip: true },
  tzel: { x: 88, y: 77, h: 15 },
  dabashon: { x: 20, y: 30, h: 11, air: true },
  ruchi: { x: 72, y: 24, h: 12, air: true, flip: true },
}
const GUARDIAN = { x: 52, y: 41, h: 24 }

export function HomeWorld({ progress, onQuest, onCreatureTap, walks = 0 }) {
  const world = worldState(progress)
  const quest = activeQuest(progress)
  const ready = canComplete(progress, quest)
  const [bubble, setBubble] = useState(null)      // { id, text }
  const [giving, setGiving] = useState(false)
  const [guardOpen, setGuardOpen] = useState(false)
  const timer = useRef(null)
  const say = (id, text) => {
    clearTimeout(timer.current)
    setBubble({ id, text })
    timer.current = setTimeout(() => setBubble(null), 3600)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  const have = progress?.creatures || []
  const seed = useMemo(() => Math.floor(Math.random() * 100), [])
  // כמה מהעולם נרפא: 0 — החורבה שלה; 1 — התמונה המתוקנת שלה, לגמרי.
  const heal = world.total ? Math.min(1, world.built / world.total) : 0
  const healed = heal >= 1

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

  return (
    <div style={W.wrap}>
      <style>{CSS}</style>
      {/* התפאורה: סרטון בלופ. ילד לא מחכה לסרטון — התמונה קודם, הסרטון מעליה כשמוכן. */}
      <img src="/world/broken.jpg" alt="" style={W.bg} draggable={false} />
      {!healed && <video src="/world/broken.mp4" autoPlay muted loop playsInline style={W.bg} />}
      {/* העולם המתוקן — התמונה שלה, אותה חורבה בבוקר: דשא, פריחה, אור בשער.
          עולה בהדרגה עם כל בקשה שנענתה, עד שמכסה את החורבה לגמרי. */}
      <img src="/world/healed.jpg" alt="" draggable={false}
        style={{ ...W.bg, opacity: heal, transition: 'opacity 2.4s ease-in-out' }} />
      {/* וכשהכול נבנה — הסרטון שלה של הבוקר, נושם: אור בשער, מים בכד, פריחה. */}
      {healed && <video src="/world/healed.mp4" poster="/world/healed.jpg" autoPlay muted loop playsInline style={W.bg} />}
      <div style={{ ...W.dusk, opacity: 1 - heal * 0.5 }} />

      {/* מה נבנה: שכבות על התפאורה — עד שהתמונה המתוקנת כבר מראה הכול בעצמה */}
      {!healed && world.basinFull && <div style={W.basinWater} aria-hidden="true" />}
      {!healed && world.beaconLit && <div style={W.beaconGlow} aria-hidden="true" />}
      {!healed && world.treeAlive && <div style={W.treeLeaves} aria-hidden="true">🌿🌸🌿</div>}
      {!healed && world.gateOpen && <div style={W.gateLight} aria-hidden="true" />}

      {/* השומר: פסל כבוי, או ער */}
      <button onClick={() => { setGuardOpen(v => !v); try { sfxAppear() } catch (e) { /* */ } }} aria-label="השומר"
        style={{ ...W.spot, left: `${GUARDIAN.x}%`, top: `${GUARDIAN.y}%`, height: `${GUARDIAN.h}%` }}>
        {world.guardianAwake
          ? <img src="/world/guardian.webp" alt="" style={W.figure} draggable={false} />
          : <img src="/world/guardian-still.png" alt="" style={{ ...W.figure, filter: 'grayscale(1) brightness(.62) contrast(.95)' }} draggable={false} />}
        {!world.guardianAwake && <span style={W.zz}>💤</span>}
        {quest && !guardOpen && <span style={{ ...W.mark, background: ready ? '#8FB57C' : '#E5A342' }}>{ready ? '✓' : '!'}</span>}
      </button>

      {/* היצורים שחיים כאן */}
      {have.map(id => {
        const c = creatureById(id); const sp = SPOTS[id]
        if (!c || !sp || !c.live) return null
        return (
          <button key={id} onClick={() => { say(id, creatureLine(id, seed + walks)); onCreatureTap?.(id); try { sfxAppear() } catch (e) { /* */ } }}
            aria-label={c.name}
            style={{ ...W.spot, left: `${sp.x}%`, top: `${sp.y}%`, height: `${sp.h}%`, animation: sp.air ? 'wildenHover 3.2s ease-in-out infinite' : 'none' }}>
            <img src={c.live} alt="" draggable={false} style={{ ...W.figure, transform: sp.flip ? 'scaleX(-1)' : 'none' }} />
            {!sp.air && <span style={W.groundShadow} />}
            {bubble?.id === id && <span style={W.bubble}>{bubble.text}</span>}
          </button>
        )
      })}
      {bubble?.id === 'guardian' && (
        <span style={{ ...W.bubble, position: 'absolute', bottom: 'auto', left: `${GUARDIAN.x}%`, top: `${GUARDIAN.y - GUARDIAN.h - 12}%`, display: 'block' }}>{bubble.text}</span>
      )}

      {/* הבקשה של השומר */}
      {quest && guardOpen && (
        <div style={W.questCard} onClick={e => e.stopPropagation()}>
          <p style={W.questTitle}>{world.guardianAwake ? 'השומר' : 'פסל אבן, כבוי'} · {quest.title}</p>
          <p style={W.questAsk}>{quest.ask}</p>
          <div style={W.needs}>
            {questProgress(progress, quest).map(n => (
              <span key={n.res} style={{ ...W.need, borderColor: n.have >= n.need ? '#8FB57C' : 'rgba(233,229,216,.25)' }}>
                {RES_ICON[n.res] || '•'} {RES_NAME[n.res] || n.res} <b>{n.have}/{n.need}</b>
              </span>
            ))}
          </div>
          {ready
            ? <button onClick={give} disabled={giving} style={W.give}>{giving ? '…' : `לתת לו · +${quest.coins} 🪙`}</button>
            : <p style={W.hint}>{quest.hint}</p>}
        </div>
      )}
      {!quest && (
        <div style={W.builtAll}>העולם נבנה מחדש. הבוקר חזר. כל הכבוד — השער פתוח, ההמשך בקרוב.</div>
      )}

      {/* כמה נבנה */}
      <div style={W.progress} aria-label="התקדמות העולם">
        {Array.from({ length: world.total }, (_, i) => <span key={i} style={{ ...W.dot, background: i < world.built ? '#E5A342' : 'rgba(233,229,216,.25)' }} />)}
      </div>
    </div>
  )
}

const CSS = `
@keyframes wildenHover { 0%,100% { transform: translate(-50%,-100%) translateY(0) } 50% { transform: translate(-50%,-100%) translateY(-6px) } }
@keyframes wildenBubble { 0% { opacity: 0; transform: translate(-50%, 6px) } 12% { opacity: 1; transform: translate(-50%, 0) } 85% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wildenWater { 0%,100% { opacity: .55 } 50% { opacity: .8 } }
@keyframes wildenBeacon { 0%,100% { opacity: .6; transform: translate(-50%,-50%) scale(1) } 50% { opacity: .95; transform: translate(-50%,-50%) scale(1.12) } }
`

const W = {
  wrap: { position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 18, overflow: 'hidden', background: '#1b1a22', border: '1px solid #2B382B', userSelect: 'none' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  dusk: { position: 'absolute', inset: 0, background: 'linear-gradient(rgba(15,21,15,0) 70%, rgba(15,21,15,.55))', pointerEvents: 'none' },
  spot: { position: 'absolute', transform: 'translate(-50%,-100%)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', display: 'block' },
  // בלי filter על תמונות מונפשות: drop-shadow שמחושב 10 פעמים בשנייה על שמונה WebP תוקע טלפון. הצל מצויר בנפרד.
  figure: { height: '100%', width: 'auto', display: 'block' },
  groundShadow: { position: 'absolute', left: '15%', right: '15%', bottom: -4, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,.35)', filter: 'blur(3px)', zIndex: -1 },
  zz: { position: 'absolute', top: -6, insetInlineEnd: -10, fontSize: 18 },
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
  builtAll: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(15,21,15,.85)', color: '#E9E5D8', fontSize: 14, textAlign: 'center' },
  progress: { position: 'absolute', top: 10, insetInlineStart: 12, display: 'flex', gap: 5, zIndex: 4 },
  dot: { width: 9, height: 9, borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,.5)' },
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { useOrient, angleDelta } from '../hooks/useOrient'
import { controllerFor } from './controllers'
import { sfxAppear, sfxRustle, sfxCatch, buzz } from '../engine/audio'

// ─── במה המפגש ───
// שני מצבים, מכניקה אחת. מצלמה שנדחתה אינה דילוג על המפגש אלא רקע אחר
// לאותו חיפוש — הילד עדיין פותר את אותה בעיה, ואף פעם לא מקבל את היצור
// בחינם.
//
// הבמה לא יודעת מה זה נימי. היא מקבלת controller — פאזות, יעדים וטקסט —
// ומציירת אותו. שבעת היצורים הנותרים ייכתבו בלי לגעת בקובץ הזה.

const FOV = 62            // שדה ראייה אופקי טיפוסי של מצלמת טלפון

// ── שני ספים, לא אחד ──
// עם סף יחיד הנעילה נכשלת בדיוק במקרה הנפוץ: ילד שמסתובב ברציפות עובר
// דרך החלון ולא שוהה בו. מדדתי — סריקה חלקה לא הצליחה לנעול אף פעם.
//
// לכן: נכנסים בסף צר, ויוצאים רק בסף רחב הרבה יותר. בין השניים הנעילה
// לא מתקדמת אבל גם לא נמחקת. התחושה היא "תפסתי אותו במבט, עכשיו רק אל
// תאבד אותו" — ולא "אל תזוז".
const ENTER_DEG = 14
const EXIT_DEG = 30
const HOLD_MS = 700
const DECAY = 0.6
const TICK = 80

export function Stage({ creature, onMode, onFound, onGiveUp }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [camState, setCamState] = useState('starting')
  const { heading, pitch, perm, absolute, needsAsk, request } = useOrient({ active: true })
  const hasSensors = heading != null

  const ctrl = controllerFor(creature)
  const [cs, setCs] = useState(null)        // מצב ה-controller
  const anchored = useRef(false)
  const [swipe, setSwipe] = useState(0)
  const [flash, setFlash] = useState(null)

  const onModeRef = useRef(); onModeRef.current = onMode
  const onFoundRef = useRef(); onFoundRef.current = onFound

  // ── עוגן ──
  // הכוריאוגרפיה נמדדת ביחס לכיוון שאליו הטלפון מכוון ברגע הפתיחה, ולא
  // בזוויות מוחלטות. הגרלה מוחלטת נופלת לפעמים בדיוק מול הילד, והוא מוצא
  // בלי לחפש.
  useEffect(() => {
    if (anchored.current || !ctrl) return
    const ref = heading != null ? heading : (needsAsk && perm === 'unknown' ? null : 0)
    if (ref == null) return
    anchored.current = true
    setCs(ctrl.start(ref))
  }, [heading, needsAsk, perm, ctrl])

  // ── המצלמה ──
  // התוצאה מדווחת החוצה למכונה. בלי זה "מצלמה נדחתה ← Story Mode" נשאר
  // כלל שנבדק במנוע ולא מתקיים במציאות.
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera')
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        })
        if (dead) { s.getTracks().forEach(t => t.stop()); return }
        streamRef.current = s
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}) }
        setCamState('on'); onModeRef.current?.('CAMERA')
      } catch (e) {
        setCamState('denied'); onModeRef.current?.('STORY')
      }
    })()
    return () => {
      dead = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const live = hasSensors ? heading : swipe
  const targets = cs && ctrl ? ctrl.targets(cs) : []

  // מיקום כל יעד ביחס למה שרואים עכשיו. בלי חיישנים אין גובה, ולכן
  // החיפוש אופקי בלבד — אחרת יעד שנקבע לו גובה בלתי ניתן למציאה.
  const placed = targets.map(t => {
    const dx = angleDelta(live, t.bearing)
    const dy = hasSensors ? (t.elev ?? 0) - (pitch || 0) : 0
    return { ...t, dx, dy, off: dx == null ? 999 : Math.hypot(dx, dy) }
  })
  const nearest = placed.reduce((a, b) => (b.off < (a?.off ?? 999) ? b : a), null)

  // ── נעילה ──
  // הזמן מצטבר ונשחק לאט: "תחזיק אותו בערך במרכז בערך שנייה", ולא
  // "אל תזוז". לנעול זווית צרה ברציפות עם יד של ילד הוא כמעט בלתי אפשרי,
  // וזה נמדד — בגרסה הקשיחה שלוש בדיקות ברצף לא מצאו כלום.
  const holdRef = useRef(0)
  const [hold, setHold] = useState(0)
  const lockedRef = useRef(null)
  const nearestRef = useRef(nearest)
  nearestRef.current = nearest

  useEffect(() => {
    if (!cs || !ctrl || ctrl.isDone(cs)) return
    const id = setInterval(() => {
      const n = nearestRef.current
      const held = lockedRef.current

      // מאבדים נעילה רק אם באמת התרחקנו, או אם יעד אחר נכנס למרכז.
      if (held && (!n || n.id !== held || n.off > EXIT_DEG)) {
        holdRef.current = Math.max(0, holdRef.current - TICK * DECAY)
        if (holdRef.current === 0) lockedRef.current = null
      }
      if (n && n.off < ENTER_DEG) {
        if (lockedRef.current !== n.id) { lockedRef.current = n.id; holdRef.current = TICK }
        else holdRef.current += TICK
      } else if (held && n && n.id === held && n.off <= EXIT_DEG) {
        holdRef.current += TICK * 0.6      // בתוך הפס הרחב — ממשיך לצבור, לאט יותר
      }
      setHold(holdRef.current)

      if (holdRef.current >= HOLD_MS && lockedRef.current) {
        const id2 = lockedRef.current
        holdRef.current = 0; lockedRef.current = null; setHold(0)
        setCs(prev => {
          const r = ctrl.onLock(prev, id2)
          fire(r.feedback, setFlash)
          return r.state
        })
      }
    }, TICK)
    return () => clearInterval(id)
  }, [cs, ctrl])

  // סיום — אחרי שהכוריאוגרפיה נגמרה
  useEffect(() => {
    if (!cs || !ctrl || !ctrl.isDone(cs)) return
    const id = setTimeout(() => onFoundRef.current?.(), 1500)
    return () => clearTimeout(id)
  }, [cs, ctrl])

  const done = cs && ctrl ? ctrl.isDone(cs) : false
  const copy = cs && ctrl ? ctrl.copy(cs) : { line: '', sub: '' }

  return (
    <div style={S.wrap}>
      {camState === 'on' && <video ref={videoRef} playsInline muted autoPlay style={S.video} />}
      {camState === 'denied' && <StoryBackdrop />}
      {camState === 'starting' && <div style={S.center}><p style={S.dim}>פותחים מצלמה…</p></div>}

      {/* הרשאת חיישנים באייפון חייבת לצאת מלחיצה אמיתית, אחרת ספארי
          מתעלמת בשקט ואף אחד לא יודע למה כלום לא זז. */}
      {needsAsk && perm === 'unknown' && (
        <div style={S.ask}>
          <p style={S.askLine}>הרימו את הטלפון וסובבו כדי לחפש</p>
          <button onClick={request} style={S.askBtn}>אפשר לי לחפש</button>
        </div>
      )}

      {/* מציגים רק מה שבאמת בתוך חרוט הראייה. גבול רחב יותר מצייר יעדים
          מחוץ למסך — הם קיימים ב-DOM, נספרים בבדיקה, ואי אפשר לראות אותם.
          וגם: יעד שנראה ב-30% שקיפות בשמש פשוט לא קיים בשביל ילד. */}
      {!done && placed.map(t => {
        const vis = Math.abs(t.dx ?? 999) < FOV / 2 + 4 && Math.abs(t.dy) < 34
        if (!vis) return null
        const locked = lockedRef.current === t.id && hold > 0
        return (
          <div key={t.id} style={{
            ...S.node,
            left: `${50 + (t.dx / (FOV / 2)) * 50}%`,
            top: `${52 - t.dy * 1.5}%`,
            opacity: Math.max(0.6, 1 - Math.abs(t.dx) / 74),
            transform: `translate(-50%,-50%) scale(${t.scale || 1})`,
          }}>
            {t.kind === 'tracks'
              ? <Tracks continues={t.continues} />
              : <Nimi peeking={t.peeking} />}
            {locked && <LockRing pct={hold / HOLD_MS} />}
          </div>
        )
      })}

      {done && (
        <div style={S.doneWrap}>
          <Nimi />
          <p style={S.foundName}>{creature?.name}</p>
          <p style={S.foundLine}>הוא הלך אחריכם.</p>
        </div>
      )}

      {!done && (
        <div style={S.hint}>
          <p style={S.hintLine}>{flash || copy.line}</p>
          {copy.sub && !flash && <p style={S.hintSub}>{copy.sub}</p>}
          {!hasSensors && (
            <input type="range" min="0" max="359" value={swipe} aria-label="סריקה"
              onChange={e => setSwipe(Number(e.target.value))} style={S.scan} />
          )}
          {hasSensors && !absolute && <p style={S.hintSub}>סובבו סיבוב שלם פעם אחת כדי לכייל.</p>}
        </div>
      )}

      <button onClick={onGiveUp} style={S.back}>חזרה</button>
    </div>
  )
}

// משוב רגעי. "טעית" אף פעם לא נאמר — נאמר מה ראינו.
function fire(kind, setFlash) {
  if (!kind) return
  const map = {
    wrong: { t: 'אלה נעצרות כאן.', buzz: [50], sfx: sfxRustle },
    right: { t: 'אלה ממשיכות!', buzz: [40, 60, 40], sfx: sfxAppear },
    flee: { t: 'הוא ברח!', buzz: [70, 50, 70], sfx: sfxRustle },
    near: { t: 'הוא נעצר.', buzz: [40], sfx: sfxAppear },
    befriend: { t: '', buzz: [40, 60, 40, 140], sfx: sfxCatch },
  }
  const m = map[kind]
  if (!m) return
  try { m.sfx?.(); buzz(m.buzz) } catch (e) { /* אודיו לא קריטי */ }
  if (!m.t) return
  setFlash(m.t)
  setTimeout(() => setFlash(null), 1400)
}

function LockRing({ pct }) {
  return (
    <svg style={S.lock} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#E5A342" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${pct * 289} 289`}
        transform="rotate(-90 50 50)" opacity="0.92" />
    </svg>
  )
}

// ── העקבות ──
// הרמז היחיד: האמיתיות ממשיכות ונמוגות במרחק, המזויפות נעצרות.
// נקרא במבט אחד, הוגן, ונלמד אחרי טעות אחת.
function Tracks({ continues }) {
  const paw = (x, y, o, s = 1) => (
    <g key={`${x}-${y}`} opacity={o} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="4.2" ry="5.4" fill="#F0C069" />
      <circle cx="-4" cy="-5.6" r="1.7" fill="#F0C069" />
      <circle cx="0" cy="-7.2" r="1.8" fill="#F0C069" />
      <circle cx="4" cy="-5.6" r="1.7" fill="#F0C069" />
    </g>
  )
  // הצביר ממורכז ב-viewBox בכוונה: טבעת הנעילה ממורכזת על הצומת, ואם
  // הציור יושב בפינה הטבעת נראית כאילו היא מקיפה משהו אחר.
  return (
    <svg width="150" height="150" viewBox="0 0 100 100" aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 9px rgba(240,192,105,.65))' }}>
      {paw(42, 68, 1)}
      {paw(56, 58, 0.95)}
      {paw(44, 48, 0.85)}
      {continues && <>
        {paw(58, 37, 0.58, 0.85)}
        {paw(46, 27, 0.36, 0.7)}
        {paw(58, 18, 0.19, 0.55)}
      </>}
    </svg>
  )
}

function Nimi({ peeking }) {
  return (
    <svg width="150" height="150" viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="90" rx="24" ry="5" fill="#000" opacity="0.26" />
      <g clipPath={peeking ? 'url(#peekClip)' : undefined}>
        <defs><clipPath id="peekClip"><rect x="34" y="0" width="66" height="100" /></clipPath></defs>
        <circle cx="50" cy="58" r="26" fill="#8FA277" />
        <path d="M34 32 L40 50 L28 47 Z" fill="#7C8F66" />
        <path d="M66 32 L60 50 L72 47 Z" fill="#7C8F66" />
        <path d="M50 30 C59 42 61 50 57 57 C51 51 47 42 50 30 Z" fill="#A9C288" />
        <circle cx="42" cy="54" r="6.4" fill="#F6F2E6" />
        <circle cx="58" cy="54" r="6.4" fill="#F6F2E6" />
        <circle cx="43" cy="55" r="3.3" fill="#22271E" />
        <circle cx="59" cy="55" r="3.3" fill="#22271E" />
      </g>
    </svg>
  )
}

function StoryBackdrop() {
  return (
    <div style={S.story}>
      <div style={S.storySky} />
      <div style={S.storyGround} />
    </div>
  )
}

const S = {
  wrap: { position: 'fixed', inset: 0, background: '#0F150F', overflow: 'hidden', zIndex: 3000 },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  story: { position: 'absolute', inset: 0 },
  storySky: { position: 'absolute', inset: 0, background: 'linear-gradient(#25402F, #4A5F3C 58%, #6B7248)' },
  storyGround: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
    background: 'linear-gradient(#5A5F3E, #33381F)' },
  center: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  dim: { color: '#9BA495', fontSize: 15 },
  node: { position: 'absolute', transition: 'opacity .2s, transform .35s', pointerEvents: 'none' },
  lock: { position: 'absolute', inset: 6, width: 'calc(100% - 12px)', height: 'calc(100% - 12px)' },
  doneWrap: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
    alignContent: 'center', gap: 2 },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 32, padding: '0 22px', textAlign: 'center' },
  hintLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0,
    textShadow: '0 2px 12px rgba(0,0,0,.85)' },
  hintSub: { color: '#C3C8BA', fontSize: 15, margin: '4px 0 0',
    textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  scan: { width: '100%', maxWidth: 320, marginTop: 12, accentColor: '#E5A342' },
  ask: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center',
    gap: 12, background: 'rgba(15,21,15,.82)', padding: 24, textAlign: 'center', zIndex: 5 },
  askLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0 },
  askBtn: { padding: '13px 26px', borderRadius: 12, border: 'none', background: '#E5A342',
    color: '#14200F', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  foundName: { color: '#E5A342', fontSize: 28, fontWeight: 900, margin: '6px 0 0',
    textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  foundLine: { color: '#E9E5D8', fontSize: 17, margin: '4px 0 0',
    textShadow: '0 2px 12px rgba(0,0,0,.8)' },
  back: { position: 'absolute', top: 18, insetInlineStart: 18, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', zIndex: 6 },
}

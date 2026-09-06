'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useOrient, angleDelta } from '../hooks/useOrient'

// ─── במה המפגש ───
// שני מצבים, מכניקה אחת. זה העיקרון: מצלמה שנדחתה אינה דילוג על המפגש
// אלא רקע אחר לאותו חיפוש. הילד עדיין מוצא את היצור, ואף פעם לא מקבל
// אותו בחינם.
//
//   CAMERA  פיד המצלמה מאחור. היצור ממוקם בזווית סביב הילד, והוא סורק
//           את הרחוב האמיתי כדי למצוא אותו.
//   STORY   סביבה מצוירת שמגיבה לאותם חיישנים. אם גם החיישנים חסומים,
//           אפשר לסרוק באצבע — אבל עדיין צריך לחפש.

const FOV = 62            // שדה ראייה אופקי טיפוסי של מצלמת טלפון
const FOUND_DEG = 14      // כמה קרוב למרכז נחשב "עליו"
const HOLD_MS = 850       // כמה זמן מצטבר צריך להחזיק אותו שם
const DECAY = 0.5         // וכמה מהר זה נשחק כשמפספסים רגע

export function Stage({ creature, onMode, onFound, onGiveUp }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [camState, setCamState] = useState('starting')
  const { heading, pitch, perm, absolute, needsAsk, request } = useOrient({ active: true })

  // ── יש בכלל חיישני כיוון? ──
  // בלי הם אי אפשר לבקש מהילד להטות את הטלפון, ולכן החיפוש הופך אופקי
  // בלבד — סריקה באצבע. אחרת יצור שנקבע לו גובה היה בלתי ניתן למציאה,
  // וזה נראה בדיוק כמו באג.
  const hasSensors = heading != null

  // ── איפה היצור מסתתר ──
  // נמדד *ביחס לכיוון שאליו הטלפון מכוון ברגע הפתיחה*, ולא בזווית מוחלטת.
  // הגרלה מוחלטת נופלת לפעמים בדיוק מול הילד, והיצור נמצא בלי לחפש —
  // וזה בדיוק "היצור התקבל בחינם" שאסור שיקרה. לכן לעולם 70°–290° מהמבט
  // ההתחלתי: תמיד צריך להסתובב, אף פעם לא צריך להסתובב פעמיים.
  const [spot, setSpot] = useState(null)
  const anchored = useRef(false)
  useEffect(() => {
    if (anchored.current) return
    // מחכים לדגימת חיישן ראשונה כדי לעגן; אם אין חיישנים כלל, מעגנים
    // לאפס — שם מתחילה גם הסריקה באצבע.
    const ref = heading != null ? heading : (needsAsk && perm === 'unknown' ? null : 0)
    if (ref == null) return
    anchored.current = true
    setSpot({
      bearing: (ref + 70 + Math.random() * 220) % 360,
      elev: creature?.arMode === 'sky' ? 34 + Math.random() * 26 : -5 + Math.random() * 13,
    })
  }, [heading, needsAsk, perm, creature])

  const [swipe, setSwipe] = useState(0)     // סריקה באצבע כשאין חיישנים
  const [found, setFound] = useState(false)

  const onModeRef = useRef()
  onModeRef.current = onMode

  // ── המצלמה ──
  // התוצאה מדווחת החוצה למכונה. בלי זה "מצלמה נדחתה → Story Mode" נשאר
  // כלל שנבדק במנוע ולא מתקיים במציאות — וזה בדיוק מה שקרה בבדיקה
  // הראשונה מקצה לקצה.
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
        setCamState('on')
        onModeRef.current?.('CAMERA')
      } catch (e) {
        setCamState('denied')     // ההורה סירב, או שאין מצלמה. המפגש ממשיך.
        onModeRef.current?.('STORY')
      }
    })()
    return () => {
      dead = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── איפה היצור ביחס למה שרואים עכשיו ──
  const liveHeading = hasSensors ? heading : swipe
  const dx = spot ? angleDelta(liveHeading, spot.bearing) : null
  // בלי חיישנים אין גובה — החיפוש אופקי בלבד.
  const dy = spot && hasSensors ? spot.elev - (pitch || 0) : 0
  const off = dx == null ? 999 : Math.hypot(dx, dy)
  const visible = dx != null && Math.abs(dx) < FOV / 2 + 8 && Math.abs(dy) < 40

  // ── "נעילה" על היצור ──
  // הגרסה הראשונה דרשה להחזיק ברציפות בתוך 11°, ואיפוס מוחלט בכל פספוס.
  // עם יד של ילד שמסתובב זה כמעט בלתי אפשרי — הבדיקה מקצה לקצה לא
  // הצליחה למצוא אותו אפילו פעם אחת מתוך שלוש.
  //
  // כאן הזמן *מצטבר* ונשחק לאט. המשמעות: "תחזיק אותו בערך במרכז בערך
  // שנייה", ולא "אל תזוז". סטייה קצרה לא מוחקת את מה שכבר נצבר.
  const holdRef = useRef(0)
  const [hold, setHold] = useState(0)
  const offRef = useRef(off)
  offRef.current = off

  useEffect(() => {
    if (found || !spot) return
    const TICK = 80
    const id = setInterval(() => {
      const near = offRef.current < FOUND_DEG
      holdRef.current = Math.max(0, holdRef.current + (near ? TICK : -TICK * DECAY))
      setHold(holdRef.current)
      if (holdRef.current >= HOLD_MS) {
        clearInterval(id)
        setFound(true)
        onFound?.()
      }
    }, TICK)
    return () => clearInterval(id)
  }, [found, spot, onFound])

  // מיקום על המסך: אחוז מהרוחב לפי הזווית.
  const left = 50 + (dx ?? 0) / (FOV / 2) * 50
  const top = 52 - dy * 1.5

  return (
    <div style={S.wrap}>
      {camState === 'on' && (
        <video ref={videoRef} playsInline muted autoPlay style={S.video} />
      )}
      {camState === 'denied' && <StoryBackdrop />}
      {camState === 'starting' && (
        <div style={S.center}><p style={S.dim}>פותחים מצלמה…</p></div>
      )}

      {/* בקשת הרשאת חיישנים — חייבת לצאת מלחיצה אמיתית, אחרת ספארי
          מתעלמת בשקט ואף אחד לא יודע למה כלום לא זז. */}
      {needsAsk && perm === 'unknown' && (
        <div style={S.ask}>
          <p style={S.askLine}>הרימו את הטלפון וסובבו כדי לחפש</p>
          <button onClick={request} style={S.askBtn}>אפשר לי לחפש</button>
          {perm === 'denied' && (
            <p style={S.askNote}>אפשר גם לסרוק באצבע — גררו על המסך.</p>
          )}
        </div>
      )}

      {/* היצור. כרגע צורה זמנית — המודל האמיתי נכנס דרך המניפסט. */}
      {visible && (
        <div style={{ ...S.creature, left: `${left}%`, top: `${top}%`,
          opacity: found ? 1 : Math.max(0.25, 1 - off / 45),
          transform: `translate(-50%,-50%) scale(${found ? 1.25 : 1})` }}>
          <Placeholder found={found} />
          {!found && hold > 0 && (
            <svg style={S.lock} viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#E5A342" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${(hold / HOLD_MS) * 289} 289`}
                transform="rotate(-90 50 50)" opacity="0.9" />
            </svg>
          )}
        </div>
      )}

      {/* מחמם/מתקרר. בלי מספרים, בלי מרחק. */}
      {!found && (
        <div style={S.hint}>
          <p style={S.hintLine}>
            {off < 20 ? 'שם! ממש שם.'
              : off < 55 ? 'קרוב. תזוזו לאט.'
              : visible ? 'משהו זז בקצה.'
              : 'הסתובבו לאט. הוא לא רחוק.'}
          </p>
          {!hasSensors && (
            <input type="range" min="0" max="359" value={swipe} aria-label="סריקה"
              onChange={e => setSwipe(Number(e.target.value))} style={S.scan} />
          )}
          {hasSensors && !absolute && (
            <p style={S.askNote}>סובבו סיבוב שלם פעם אחת כדי לכייל.</p>
          )}
        </div>
      )}

      {found && (
        <div style={S.found}>
          <p style={S.foundName}>{creature?.name}</p>
          <p style={S.foundLine}>הוא ראה אתכם.</p>
        </div>
      )}

      <button onClick={onGiveUp} style={S.back}>חזרה</button>
    </div>
  )
}

function Placeholder({ found }) {
  return (
    <svg width="140" height="140" viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="88" rx="26" ry="6" fill="#000" opacity="0.28" />
      <circle cx="50" cy="56" r="27" fill={found ? '#9CB37F' : '#7E8F6C'} />
      <circle cx="41" cy="50" r="6.5" fill="#F6F2E6" />
      <circle cx="59" cy="50" r="6.5" fill="#F6F2E6" />
      <circle cx="42" cy="51" r="3.4" fill="#22271E" />
      <circle cx="60" cy="51" r="3.4" fill="#22271E" />
      <path d="M35 30 L40 46 L30 44 Z" fill={found ? '#9CB37F' : '#7E8F6C'} />
      <path d="M65 30 L60 46 L70 44 Z" fill={found ? '#9CB37F' : '#7E8F6C'} />
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
  creature: { position: 'absolute', transition: 'opacity .25s, transform .3s', pointerEvents: 'none' },
  lock: { position: 'absolute', inset: -12, width: 'calc(100% + 24px)', height: 'calc(100% + 24px)' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 34, padding: '0 22px', textAlign: 'center' },
  hintLine: { color: '#E9E5D8', fontSize: 18, fontWeight: 700, margin: 0,
    textShadow: '0 2px 12px rgba(0,0,0,.8)' },
  scan: { width: '100%', maxWidth: 320, marginTop: 12, accentColor: '#E5A342' },
  ask: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center',
    gap: 12, background: 'rgba(15,21,15,.82)', padding: 24, textAlign: 'center' },
  askLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0 },
  askBtn: { padding: '13px 26px', borderRadius: 12, border: 'none', background: '#E5A342',
    color: '#14200F', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  askNote: { color: '#9BA495', fontSize: 14, margin: 0 },
  found: { position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center' },
  foundName: { color: '#E5A342', fontSize: 26, fontWeight: 900, margin: 0,
    textShadow: '0 2px 14px rgba(0,0,0,.85)' },
  foundLine: { color: '#E9E5D8', fontSize: 17, margin: '4px 0 0',
    textShadow: '0 2px 12px rgba(0,0,0,.8)' },
  back: { position: 'absolute', top: 18, insetInlineStart: 18, padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(233,229,216,.3)', background: 'rgba(15,21,15,.55)', color: '#E9E5D8',
    fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' },
}

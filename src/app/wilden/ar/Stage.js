'use client'
import { useEffect, useRef, useState } from 'react'
import { useOrient, angleDelta } from '../hooks/useOrient'
import { useSteps } from '../hooks/useSteps'
import { controllerFor } from './controllers'
import { useMotion } from '../hooks/useMotion'
import { createStillness } from '../engine/still'
import { CreatureFigure, ModelLayer, Dust, Burst } from './Figure'
import { useModelSrc, usePreloadModel } from '../hooks/useModelViewer'
import { useBurst } from '../hooks/useBurst'
import { Lantern } from './Lantern'
import { usePulse } from '../hooks/usePulse'
import { useCamera } from '../hooks/useCamera'
import { camText } from '../engine/camera'
import { sfxAppear, sfxRustle, sfxCatch, buzz, startVoice, sfxVoice } from '../engine/audio'
import { bearing, haversine } from '../engine/geo'
import { cheer } from '../content/cheers'
import { tr } from '../i18n'

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
const TICK_CHASE = 250     // הדופק של המרדף: צעדים וזמן

export function Stage({ creature, onMode, onFound, onGiveUp, pos = null, anchor = null, wear = null, mods = null }) {
  // ── המצלמה ──
  // התוצאה מדווחת החוצה למכונה. בלי זה "מצלמה נדחתה ← Story Mode" נשאר
  // כלל שנבדק במנוע ולא מתקיים במציאות. הפתיחה עצמה, הזמן הקצוב והניסיון
  // החוזר יושבים ב-useCamera — משותף עם מסך הזהב.
  const onModeRef = useRef(); onModeRef.current = onMode
  const cam = useCamera({ onState: st => onModeRef.current?.(st === 'on' ? 'CAMERA' : 'STORY') })
  const { videoRef } = cam
  const camState = cam.state === 'on' ? 'on' : cam.state === 'off' ? 'denied' : 'starting'
  const videoLive = cam.live
  const { heading, pitch, perm, absolute, needsAsk, request } = useOrient({ active: true })
  const hasSensors = heading != null

  // ── צעדים ──
  // המרדף רץ על צעדים, לא על GPS (ראה hooks/useSteps).
  const steps = useSteps({ active: true })
  // ── ולוויספר: ההפך ──
  // הוא מתקרב כשעומדים. מה שנמדד הוא הרעד סביב הממוצע, לא הערך עצמו
  // (ראה engine/still.js), וזה חייב להיות סלחני: ילד שנושם אינו זז.
  const ctrl0 = controllerFor(creature)
  const wantsStill = !!ctrl0?.needsStill
  const stillDet = useRef(null)
  if (wantsStill && !stillDet.current) stillDet.current = createStillness()
  const stillRef = useRef(false)
  const motion = useMotion({ active: wantsStill, onSample: s => {
    const r = stillDet.current?.feed(s)
    if (r) stillRef.current = r.still
  } })
  // ההרשאות באייפון (כיוון + תנועה) יוצאות מאותה לחיצה.
  const askNeeded = (needsAsk && perm === 'unknown') || (steps.needsAsk && steps.perm === 'unknown')
  const askAll = () => { request(); steps.request(); if (wantsStill) motion.request() }
  // יש מד צעדים חי? אז לחיצה ומבט לא מחליפים ריצה.
  const stepsLiveRef = useRef(false); stepsLiveRef.current = steps.live
  // מתי נספר צעד אחרון. ילד שמחזיק את הטלפון מורם מול הפנים כמעט לא
  // מייצר צעדים, ואז הלחיצה על היצור חוזרת להיות דרך להתקדם.
  const lastStepAt = useRef(0)
  const STALE_STEPS_MS = 8000

  const ctrl = ctrl0
  const modelSrc = useModelSrc(creature)
  usePreloadModel(modelSrc)                 // המודל מתחיל לרדת כבר על שביל העקבות
  const [modelShown, setModelShown] = useState(false)
  const [modelFailed, setModelFailed] = useState(false)
  const [cs, setCs] = useState(null)        // מצב ה-controller
  const anchored = useRef(false)
  const [swipe, setSwipe] = useState(0)
  const [flash, setFlash] = useState(null)
  const [shake, setShake] = useState(false)   // בולדר רקע: המסך רועד

  const onFoundRef = useRef(); onFoundRef.current = onFound

  // ── הקול שלו ──
  // "זמזום לדבורה." מהרגע שהבמה נפתחת היצור נשמע, חלש; מתחזק כשמכוונים
  // אליו וכשמתקרבים. נפסק כשתפסו. ראה engine/audio.js.
  const voiceRef = useRef(null)
  useEffect(() => {
    voiceRef.current = startVoice(creature?.id)
    return () => { voiceRef.current?.stop(); voiceRef.current = null }
  }, [creature?.id])

  // ── עוגן ──
  // הכוריאוגרפיה נמדדת ביחס לכיוון שאליו הטלפון מכוון ברגע הפתיחה, ולא
  // בזוויות מוחלטות. הגרלה מוחלטת נופלת לפעמים בדיוק מול הילד, והוא מוצא
  // בלי לחפש.
  useEffect(() => {
    if (anchored.current || !ctrl) return
    const ref = heading != null ? heading : (needsAsk && perm === 'unknown' ? null : 0)
    if (ref == null) return
    anchored.current = true
    setCs(ctrl.start(ref, Math.random, Date.now(), mods))
  }, [heading, needsAsk, perm, ctrl])

  const live = hasSensors ? heading : swipe
  const [now, setNow] = useState(() => Date.now())
  const targets = cs && ctrl ? ctrl.targets(cs, now) : []

  // ── ההתפוצצות של בולדר ──
  // הקליפ יורד כשהבמה נפתחת; בכל רקיעה (hiddenUntil חדש) — הפעלה טרייה.
  // אם אין קליפ, או שעוד לא הגיע — ענן האבק המצויר.
  const burst = useBurst(creature?.burst, cs?.hiddenUntil || 0)

  // ── הדופק של המרדף ──
  // כל רבע שנייה: הצעדים שנצברו מקרבים, והזמן שעובר מרחיק. הבקר מחליט.
  useEffect(() => {
    if (!cs || !ctrl || ctrl.isDone(cs)) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      const n = steps.take()
      if (n > 0) lastStepAt.current = t
      setCs(prev => {
        let next = prev
        for (let i = 0; i < n && ctrl.onStep; i++) {
          const r = ctrl.onStep(next, t)
          if (r.state !== next) { next = r.state; if (r.feedback) fire(r.feedback, setFlash, setShake, creatureIdRef.current) }
        }
        // בלי חיישן תנועה אי אפשר לדעת אם עומדים — ואז מניחים שכן.
        // ילד בלי חיישן לא מרמה, הוא רק מחכה, וזה בדיוק אותו משחק.
        if (ctrl.onTick) next = ctrl.onTick(next, t, wantsStill ? { still: !motion.live || stillRef.current } : undefined)
        return next
      })
    }, TICK_CHASE)
    return () => clearInterval(id)
  }, [cs?.phase, ctrl, steps.take])

  // ── הליכה אמיתית, לא רק מד הצעדים ──
  // ה-GPS יודע שזזנו גם כשהטלפון מורם והמד שותק. כל מטר וחצי של הליכה
  // שווה צעד. מדידה גרועה (דיוק חלש, קפיצה) לא נספרת.
  const lastPos = useRef(null)
  useEffect(() => {
    if (!pos || !cs || !ctrl?.onStep || ctrl.isDone(cs)) { lastPos.current = pos || lastPos.current; return }
    const prev = lastPos.current
    lastPos.current = pos
    if (!prev || (pos.acc ?? 99) > 25) return
    const moved = haversine(prev, pos)
    if (!(moved > 1.2 && moved < 30)) return
    const n = Math.min(4, Math.round(moved / 1.6))
    if (n < 1) return
    const t = Date.now()
    lastStepAt.current = t
    setCs(p => {
      let next = p
      for (let i = 0; i < n; i++) {
        const r = ctrl.onStep(next, t)
        if (r.state !== next) { next = r.state; if (r.feedback) fire(r.feedback, setFlash, setShake, creatureIdRef.current) }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  // מיקום כל יעד ביחס למה שרואים עכשיו. בלי חיישנים אין גובה, ולכן
  // החיפוש אופקי בלבד — אחרת יעד שנקבע לו גובה בלתי ניתן למציאה.
  const placed = targets.map(t => {
    const dx = angleDelta(live, t.bearing)
    const dy = hasSensors ? (t.elev ?? 0) - (pitch || 0) : 0
    return { ...t, dx, dy, off: dx == null ? 999 : Math.hypot(dx, dy) }
  })
  // ראש השביל הוא הזמנה, לא בחירה. אם הוא ניתן לנעילה, הילד "בוחר" את
  // הרגליים של עצמו והמפגש נתקע.
  const nearest = placed
    .filter(t => !t.passive)
    .reduce((a, b) => (b.off < (a?.off ?? 999) ? b : a), null)

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
          const r = ctrl.onLock(prev, id2, Math.random, Date.now(), { steps: stepsLiveRef.current })
          fire(r.feedback, setFlash, setShake, creatureIdRef.current)
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
  const creatureIdRef = useRef(creature?.id); creatureIdRef.current = creature?.id

  // ── תפיסה ──
  // ההחלטה שלה: תפיסה ולא ידידות, כי זה ילדים. הרגע עצמו חייב להיות של
  // הילד — כפתור גדול, או החלקה כלפי מעלה על המסך כמו זריקה. שניהם
  // עושים אותו דבר; הכפתור קיים כדי שגם בלי מגע חלק זה יעבוד.
  // canCatch מחושב למטה, אחרי שיודעים איפה היצור; המגע קורא אותו דרך ref.
  const canCatchRef = useRef(false)
  const doCatch = () => {
    if (!ctrl?.onCatch) return
    setCs(prev => {
      const r = ctrl.onCatch(prev)
      if (r.state !== prev) fire(r.feedback, setFlash, setShake, creatureIdRef.current)
      return r.state
    })
  }
  // לחיצה על היצור עצמו — הדרך הפשוטה. הבקר מחליט מה קורה בכל שלב.
  const doTap = () => {
    if (!ctrl?.onTap) return
    setCs(prev => {
      const t = Date.now()
      // מד צעדים "חי" אבל שקט כבר שמונה שניות = הוא לא באמת סופר. אז
      // הלחיצה מקרבת, כמו בטלפון בלי חיישנים.
      const counting = stepsLiveRef.current && t - lastStepAt.current < STALE_STEPS_MS
      const r = ctrl.onTap(prev, Math.random, t, { steps: counting })
      if (r.state !== prev) fire(r.feedback, setFlash, setShake, creatureIdRef.current)
      return r.state
    })
  }
  const touchY = useRef(null)
  const onTouchStart = e => { touchY.current = e.touches?.[0]?.clientY ?? null }
  const onTouchEnd = e => {
    const y0 = touchY.current; touchY.current = null
    const y1 = e.changedTouches?.[0]?.clientY
    if (canCatchRef.current && y0 != null && y1 != null && y0 - y1 > 70) doCatch()
  }

  // ── היצור עצמו ──
  // מחושב פעם אחת: גם הספרייט בתוך היעד וגם שכבת המודל צריכים את זה.
  const ct = placed.find(t => t.kind === 'creature') || null
  const ctVisible = !!ct && Math.abs(ct.dx ?? 999) < FOV / 2 + 4 && Math.abs(ct.dy) < 34
  const ctFaceLeft = !!ct && ct.streak != null && angleDelta(ct.streak, ct.bearing) < 0
  const ctStreakSide = !ct || ct.streak == null ? null
    : angleDelta(ct.streak, ct.bearing) < 0 ? 'right' : 'left'
  // עוצמת הקול: קרוב = חזק, על המסך = חזק יותר, נתפס = שקט.
  useEffect(() => {
    const v = voiceRef.current
    if (!v) return
    if (done) { v.stop(); return }
    const d = cs?.dist != null ? Math.max(0, 1 - cs.dist / 13) : 0.5
    v.setLevel(Math.min(1, d * 0.7 + (ctVisible ? 0.35 : 0)))
  }, [cs?.dist, ctVisible, done])

  // ── להקיף אותו ──
  // היצור עומד בנקודה אמיתית (התחנה). מהמיקום של הטלפון יחסית אליה
  // יודעים מאיזה צד הילד מסתכל, והמודל מסתובב בהתאם: הילד הולך סביבו
  // ורואה צד, גב, וחוזר לפנים. GPS של 5 מ' — לכן מחליקים, ומתעלמים
  // כשקרובים מדי (הכיוון לא מוגדר). הפנים "ננעלות" לכיוון הילד ברגע שהוא
  // נעצר, ומשם הכול יחסי.
  const stopped = done || cs?.phase === 'NEAR' || cs?.phase === 'APPROACH'
  const viewRef = useRef({ face: null, orbit: 0, last: null })
  if (pos && anchor && haversine(anchor, pos) >= 3) {
    const vb = bearing(anchor, pos)
    const v = viewRef.current
    if (v.last == null) v.last = vb
    else v.last = v.last + (angleDelta(v.last, vb) || 0) * 0.35     // החלקה
    if (stopped && v.face == null) v.face = v.last
    if (v.face != null) v.orbit = angleDelta(v.face, v.last) || 0
  }
  const orbit = stopped ? viewRef.current.orbit : 0

  // יש דמות חיה (קליפ בלי רקע)? היא מוצגת כשהוא זז ומציץ. כשהוא נעצר —
  // המודל התלת-ממדי, כי אותו אפשר להקיף.
  const useModel = !!modelSrc && !modelFailed && (!creature?.live || stopped)
  const showModel = useModel && (done || (ctVisible && !ct.peeking))
  const hideSprite = showModel && modelShown

  // ── מתי אפשר לתפוס ──
  // "זה חמוד, אבל איך תופסים?" — מהרחוב. הנעילה המדויקת (14°, שנייה)
  // הייתה קשה מדי ביד של ילד, והכפתור לא הופיע. עכשיו: הוא נעצר, הוא על
  // המסך פחות או יותר במרכז — הכפתור שם. לכוון בערך וללחוץ.
  const canCatch = !done && (cs?.phase === 'NEAR' || cs?.phase === 'APPROACH')
    && (!!cs?.ready || (ctVisible && Math.abs(ct.dx) < 30))
  // המרדף: כמה רחוק הוא עכשיו. מוצג כפס שמתקצר כשרצים.
  const chasing = !done && (cs?.phase === 'FAR' || cs?.phase === 'FLEE') && cs?.dist != null
  canCatchRef.current = canCatch
  // חשוך: צל תמיד; כולם אחרי 18:00 ולפני 6:00.
  const hour = new Date().getHours()
  const dark = !done && (creature?.id === 'tzel' || hour >= 18 || hour < 6)
  // חם/קר בדופק: רועד לאט כשרחוק, מהר כשקרוב — גם ההורה שלידו מרגיש.
  usePulse(chasing ? cs.dist : null)

  return (
    <div style={{ ...S.wrap, animation: shake ? 'wildenShake .5s ease-out' : 'none' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{STAGE_CSS}</style>
      {/* הווידאו קיים תמיד. קודם הוא נוצר רק אחרי שהמצלמה אושרה — אבל הזרם
          חובר אליו *לפני* זה, כשעוד לא היה אלמנט. היא אישרה מצלמה וקיבלה
          מסך שחור. עכשיו האלמנט תמיד שם, והזרם מתחבר גם מאוחר יותר. */}
      <video ref={videoRef} playsInline muted autoPlay
        style={{ ...S.video, opacity: camState === 'on' ? 1 : 0 }} />
      {/* רחוב חשוך: לצל תמיד, ולכולם בערב. הפנס (מפתח מהחנות) הוא אלומה
          אמיתית שזזה עם הטלפון; בלעדיו רואים רק במרכז, עמום. צל בלי פנס לא
          מגיע לכאן (הלוח מחליף אותו). */}
      {dark && <Lantern on={!!mods?.lantern} />}
      {camState === 'on' && !videoLive && (
        <div style={S.camNote}>
          {tr('המצלמה אושרה אבל התמונה לא הגיעה.')}
          <button onClick={cam.retry} style={S.camRetry}>{tr('לפתוח מצלמה שוב')}</button>
        </div>
      )}
      {camState === 'denied' && <StoryBackdrop />}
      {/* למה אין מצלמה — ומה עושים. משפט אחד, פעולה אחת, וכפתור לנסות
          שוב מתוך לחיצה (ספארי לא פותח מצלמה בלי מגע). */}
      {camState === 'denied' && !done && (
        <div style={S.camNote}>
          <b>{tr(camText(cam.reason).t)}</b> {tr(camText(cam.reason).how)}
          {cam.canRetry && <button onClick={cam.retry} style={S.camRetry}>{tr('לנסות לפתוח מצלמה')}</button>}
        </div>
      )}
      {camState === 'starting' && <div style={S.center}><p style={S.dim}>{tr('פותחים מצלמה…')}</p></div>}

      {/* הרשאת חיישנים באייפון חייבת לצאת מלחיצה אמיתית, אחרת ספארי
          מתעלמת בשקט ואף אחד לא יודע למה כלום לא זז. */}
      {askNeeded && (
        <div style={S.ask}>
          <p style={S.askLine}>{tr('הרימו את הטלפון וסובבו כדי לחפש')}</p>
          <button onClick={askAll} style={S.askBtn}>{tr('אפשר לי לחפש')}</button>
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
            // בלי scale ב-transform: model-viewer מודד את עצמו לפי המלבן
            // אחרי הטרנספורם ומצייר פי 1.6 גדול מדי. הגודל עובר לדמות
            // כמספר והיא נמדדת בגובה אמיתי.
            transform: 'translate(-50%,-50%)',
          }}>
            {t.kind === 'trailhead' ? <Trailhead />
              : t.kind === 'trail' ? <Trail branch={t.branch} />
              : t.kind === 'dust' ? (creature?.burst && burst.loaded
                  ? (burst.url ? <Burst src={burst.url} scale={t.scale} /> : null)
                  : <Dust />)
              /* בורח: פונה הלאה מהמקום שממנו הגיע, והפס הטרי נשאר מאחוריו. */
              : <CreatureFigure creature={creature} scale={t.scale || 1} flying={!!t.flying} shadow={!!t.shadow} wear={wear}
                  peeking={t.peeking} approaching={(t.scale || 1) > 1.2}
                  faceLeft={ctFaceLeft} streakSide={ctStreakSide}
                  hideSprite={hideSprite && !t.peeking} />}
            {locked && <LockRing pct={hold / HOLD_MS} />}
            {/* טבעת "עכשיו": כשאפשר לתפוס, הוא מסומן. ילד רואה סימן, לא קורא. */}
            {t.kind === 'creature' && canCatch && <CatchRing />}
          </div>
        )
      })}

      {/* אזור הלחיצה על היצור: גדול, שקוף, במקום שבו הוא נראה. ילד לוחץ
          על הדמות — לא על כפתור. */}
      {!done && ct && ctVisible && !canCatch && (
        <button aria-label={tr('לחצו על היצור')} onClick={doTap} style={{
          ...S.tapArea,
          left: `${50 + (Math.max(-0.6, Math.min(0.6, ct.dx / (FOV / 2)))) * 50}%`,
          top: `${52 - ct.dy * 1.5}%`,
        }} />
      )}
      {/* ── רגע התפיסה ──
          "עמדתי עם המצלמה עליו, עשיתי טפיחות, כלום לא עבד." ברגע שהוא
          נעצר — כל המסך הוא הכפתור. לא צריך לפגוע בדמות, לא צריך למצוא
          כפתור: לגעת במסך זה לתפוס. */}
      {!done && canCatch && (
        <button aria-label={tr('לתפוס!')} onClick={doCatch} style={S.catchArea} />
      )}

      {/* המודל התלת-ממדי, אם יש: שכבה קבועה על כל הבמה. הדמות ממוקמת
          דרך המצלמה. הצל, הפס וטבעת הנעילה נשארים ביעד עצמו למעלה. */}
      {useModel && (
        <ModelLayer creature={creature}
          visible={showModel}
          x={done || !ct ? 0 : ct.dx / (FOV / 2)}
          // למודל יש פרספקטיבה אמיתית — הרגליים הקרובות כבר גדולות. 1.6 של
          // הספרייט הופך אותו לענק שחותך את המסך; 1.3 מרגיש "הוא קרוב".
          scale={done ? 1.2 : Math.min(ct?.scale || 1, 1.3)}
          faceLeft={!done && ctFaceLeft}
          phase={done ? 'catch' : (ct?.scale || 1) > 1.2 ? 'appear' : 'move'}
          done={done}
          orbit={orbit}
          onShown={() => setModelShown(true)}
          onFailed={() => setModelFailed(true)} />
      )}

      {done && (
        <div style={S.doneWrap}>
          <CreatureFigure creature={creature} done scale={1.35} hideSprite={hideSprite} wear={wear} />
          <p style={S.foundName}>{tr(creature?.name)}</p>
          <p style={S.foundLine}>{tr(cheer('catch', Math.floor((cs?.hidden || 0) / 37)))} {tr('תפסתם אותו!')}</p>
        </div>
      )}

      {!done && (
        <div style={S.hint}>
          <p style={S.hintLine}>{flash || tr(copy.line)}</p>
          {copy.sub && !flash && <p style={S.hintSub}>{tr(copy.sub)}</p>}
          {chasing && (
            <div style={S.distWrap} aria-label={tr('מרחק')}>
              <div style={S.distBar}><div style={{ ...S.distFill, width: `${Math.round(100 * (1 - Math.min(1, cs.dist / 12)))}%` }} /></div>
              <span style={S.distNum}>{Math.max(1, Math.round(cs.dist))} {tr('מ׳')}</span>
            </div>
          )}
          {canCatch && (
            <button onClick={doCatch} style={S.catchBtn}>{tr('לתפוס!')}</button>
          )}
          {!hasSensors && (
            <input type="range" min="0" max="359" value={swipe} aria-label={tr('סריקה')}
              onChange={e => setSwipe(Number(e.target.value))} style={S.scan} />
          )}
          {hasSensors && !absolute && <p style={S.hintSub}>{tr('סובבו סיבוב שלם פעם אחת כדי לכייל.')}</p>}
        </div>
      )}

      <button onClick={onGiveUp} style={S.back}>{tr('חזרה')}</button>
    </div>
  )
}

// משוב רגעי. "טעית" אף פעם לא נאמר — נאמר מה ראינו.
function fire(kind, setFlash, setShake, creatureId = null) {
  if (!kind) return
  if (kind === 'stomp' && setShake) { setShake(true); setTimeout(() => setShake(false), 520) }
  // הקול של היצור לרגע הזה, לפני הצליל הכללי
  if (creatureId && (kind === 'flee' || kind === 'near' || kind === 'stomp')) {
    try { sfxVoice(creatureId, kind) } catch (e) { /* לא קריטי */ }
  }
  const map = {
    stomp: { t: 'הוא רקע!', buzz: [90, 40, 130], sfx: null },
    back: { t: 'כאן הוא הסתובב וחזר.', buzz: [50], sfx: sfxRustle },
    fade: { t: 'כאן העקבות נגמרות. הוא קפץ.', buzz: [50], sfx: sfxRustle },
    run: { t: 'רוצו אליו!', buzz: [40], sfx: null },
    // ויספר: הפועל ההפוך — תזוזה היא מה שמרחיק, ועמידה היא מה שמקרב.
    moved: { t: 'זזתם! הוא נסוג.', buzz: [70, 40], sfx: sfxRustle },
    still: { t: 'לא לוחצים. עומדים.', buzz: [30], sfx: null },
    flee: { t: 'הוא ברח!', buzz: [70, 50, 70], sfx: creatureId ? null : sfxRustle },
    near: { t: 'הוא נעצר.', buzz: [40], sfx: creatureId ? null : sfxAppear },
    ready: { t: 'עכשיו!', buzz: [60, 40, 60], sfx: sfxAppear },
    catch: { t: '', buzz: [40, 60, 40, 140], sfx: sfxCatch },
  }
  const m = map[kind]
  if (!m) return
  try { m.sfx?.(); buzz(m.buzz) } catch (e) { /* אודיו לא קריטי */ }
  if (!m.t) return
  setFlash(m.t ? tr(m.t) : m.t)
  setTimeout(() => setFlash(null), 1400)
}

function CatchRing() {
  return (
    <svg className="wilden-catch-ring" style={S.catchRing} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#E5A342" strokeWidth="3.5" opacity=".9" />
    </svg>
  )
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

// ── השביל ──
// שלוש התנהגויות, ולא שלוש אפשרויות מסומנות. ההבדל הוא בכיוון הטביעות,
// במרווח ביניהן ובשאלה אם הן ממשיכות — כלומר במה שנימי עשה, לא בסימון
// שאומר "זו הנכונה".
function paw(x, y, rot, o, s = 1) {
  return (
    <g key={`${x}-${y}`} opacity={o} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="4" ry="5.2" fill="#F0C069" />
      <circle cx="-3.8" cy="-5.4" r="1.6" fill="#F0C069" />
      <circle cx="0" cy="-7" r="1.7" fill="#F0C069" />
      <circle cx="3.8" cy="-5.4" r="1.6" fill="#F0C069" />
    </g>
  )
}

const GLOW = { filter: 'drop-shadow(0 0 8px rgba(240,192,105,.6))' }

function Trail({ branch }) {
  let prints = []
  if (branch === 'runs') {
    // מרווח שגדל = הוא האיץ. וממשיך אל מחוץ למסגרת.
    prints = [
      paw(46, 84, 0, 1), paw(56, 71, 4, 1), paw(45, 55, -4, 1),
      paw(58, 36, 6, 0.95, 1.02), paw(44, 14, -6, 0.9, 1.04),
    ]
  } else if (branch === 'doubles-back') {
    // הולכות למעלה, מסתובבות, וחוזרות — הטביעות החוזרות הפוכות.
    prints = [
      paw(44, 84, 0, 1), paw(54, 70, 6, 1), paw(58, 56, 24, 0.95),
      paw(50, 47, 90, 0.9), paw(38, 52, 168, 0.9), paw(30, 66, 180, 0.85),
      paw(34, 82, 180, 0.8),
    ]
  } else {
    // נחלשות ונפסקות באמצע.
    prints = [
      paw(46, 84, 0, 1), paw(56, 72, 4, 0.8, 0.94),
      paw(46, 62, -3, 0.5, 0.85), paw(55, 54, 5, 0.24, 0.74),
    ]
  }
  return (
    <svg width="150" height="150" viewBox="0 0 100 100" aria-hidden="true" style={GLOW}>
      {prints}
    </svg>
  )
}

// ראש השביל: כאן הוא עבר. זו ההזמנה לקרוא, ולא יעד לנעילה.
function Trailhead() {
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true" style={GLOW}>
      <ellipse cx="50" cy="62" rx="30" ry="10" fill="#F0C069" opacity="0.1" />
      {paw(44, 68, -8, 0.95)}
      {paw(56, 60, 6, 0.9)}
    </svg>
  )
}

// הדמות עצמה — ספרייט או מודל — יושבת ב-Figure.js. הבמה רק מציבה אותה.

function StoryBackdrop() {
  return (
    <div style={S.story}>
      <div style={S.storySky} />
      <div style={S.storyGround} />
    </div>
  )
}

const STAGE_CSS = `
@keyframes wildenShake { 0%,100% { transform: translate(0,0) } 15% { transform: translate(-7px,4px) } 30% { transform: translate(6px,-5px) } 45% { transform: translate(-5px,-3px) } 60% { transform: translate(4px,4px) } 80% { transform: translate(-2px,1px) } }
@keyframes wildenCatchRing { 0% { transform: scale(.86); opacity: .35 } 55% { transform: scale(1.04); opacity: .95 } 100% { transform: scale(.86); opacity: .35 } }
@media (prefers-reduced-motion: reduce) { .wilden-catch-ring { animation: none !important } }
`

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
  tapArea: { position: 'absolute', width: '54vw', height: '46vh', transform: 'translate(-50%,-50%)',
    background: 'transparent', border: 'none', padding: 0, zIndex: 4, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent' },
  lock: { position: 'absolute', inset: 6, width: 'calc(100% - 12px)', height: 'calc(100% - 12px)' },
  // כל המסך הוא כפתור התפיסה. מתחת לטקסט (5) ולכפתור החזרה (6), מעל החושך (1).
  catchArea: { position: 'absolute', inset: 0, background: 'transparent', border: 'none', padding: 0,
    zIndex: 4, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  catchRing: { position: 'absolute', inset: '6%', width: '88%', height: '88%',
    filter: 'drop-shadow(0 0 10px rgba(229,163,66,.55))',
    animation: 'wildenCatchRing 1.15s ease-in-out infinite' },
  doneWrap: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
    alignContent: 'center', gap: 2, zIndex: 3, pointerEvents: 'none' },
  // ── ההוראה חייבת להיות מעל החושך ──
  // "עמדתי, טפחתי, כלום לא עבד": ב-22:35 שכבת הרחוב החשוך (zIndex 1) שכבה
  // על הטקסט ועל כפתור התפיסה, והם היו כמעט שחורים. חושך הוא אפקט של
  // העולם; ההוראה היא של המשחק, ולעולם לא מתחתיו.
  hint: { position: 'absolute', left: 0, right: 0, bottom: 32, padding: '0 22px', textAlign: 'center',
    zIndex: 5, pointerEvents: 'none' },
  hintLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0,
    textShadow: '0 2px 12px rgba(0,0,0,.85)' },
  hintSub: { color: '#C3C8BA', fontSize: 15, margin: '4px 0 0',
    textShadow: '0 2px 10px rgba(0,0,0,.8)' },
  scan: { width: '100%', maxWidth: 320, marginTop: 12, accentColor: '#E5A342', pointerEvents: 'auto' },
  distWrap: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 10 },
  distBar: { width: 160, height: 10, borderRadius: 999, background: 'rgba(15,21,15,.6)', overflow: 'hidden', border: '1px solid rgba(233,229,216,.25)' },
  distFill: { height: '100%', background: '#E5A342', borderRadius: 999, transition: 'width .3s' },
  distNum: { color: '#E9E5D8', fontSize: 16, fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,.8)', minWidth: 44, textAlign: 'start' },
  ask: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center',
    gap: 12, background: 'rgba(15,21,15,.82)', padding: 24, textAlign: 'center', zIndex: 5 },
  askLine: { color: '#E9E5D8', fontSize: 19, fontWeight: 700, margin: 0 },
  // כפתור התפיסה: גדול, אחד, במרכז. ילד לא צריך לקרוא כדי למצוא אותו.
  camNote: { position: 'absolute', top: 72, insetInline: 16, zIndex: 5, margin: 0, padding: '8px 12px',
    borderRadius: 10, background: 'rgba(15,21,15,.7)', color: '#C3C8BA', fontSize: 13, lineHeight: 1.5,
    textAlign: 'center', direction: 'rtl' },
  camRetry: { display: 'block', margin: '8px auto 0', padding: '8px 16px', borderRadius: 999, border: 'none',
    background: '#E5A342', color: '#14200F', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  catchBtn: { marginTop: 14, padding: '16px 44px', borderRadius: 999, border: 'none',
    background: '#E5A342', color: '#14200F', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
    cursor: 'pointer', boxShadow: '0 6px 24px rgba(229,163,66,.45)', pointerEvents: 'auto',
    animation: 'wildenBreathe 1s ease-in-out infinite' },
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

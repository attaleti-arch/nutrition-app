'use client'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { initial, reduce, beaconView, S, RUN, MODE, nextRunKind, canStartStory } from './engine/machine'
import { PHASE, PHASE_BUZZ, ACC_GATE, ACC_DIRECTION, ACC_COARSE, WALK_GATE } from './engine/beacon'
import { save, load, dayKey } from './engine/persist'
import { creatureById } from './content/creatures'
import M01 from './content/missions/m01-signal'
import { Beacon, BeaconLine, BEACON_CSS } from './ui/Beacon'
import { Stage } from './ar/Stage'
import { useGeo } from './hooks/useGeo'
import { useRoute } from './hooks/useRoute'
import { unlockAudio, sfxAppear, sfxRustle, sfxCatch, sfxFinish, buzz } from './engine/audio'

// ─── WILDEN · מסע 1 ───
// הקליפה בלבד: היא בוחרת מסך לפי מצב המכונה ומזינה לתוכה אירועים.
// כל ההחלטות — איפה היצור, מתי הביקון מתקדם, מה קורה ב-resume — יושבות
// במנוע הטהור ונבדקות בלעדיו.

const C = {
  bg: '#0F150F', card: '#161E17', card2: '#1C261D',
  ink: '#E9E5D8', muted: '#9BA495', faint: '#767F71',
  amber: '#E5A342', green: '#8FB57C', red: '#D97F5A', line: '#2B382B',
}

export default function Wilden() {
  const [g, dispatch] = useReducer(reduce, null, () => load() || initial())
  const [booted, setBooted] = useState(false)
  const route = useRoute()
  const lastPhase = useRef(null)
  const today = dayKey()

  // שומרים בכל מעבר, לא רק בסוף. הילד סוגר את הטלפון באמצע מסע — זה
  // המצב השכיח, לא קצה נדיר.
  useEffect(() => { if (booted) save(g) }, [g, booted])
  useEffect(() => { setBooted(true) }, [])

  // ── חלון הצצה למצב, מאחורי ?debug=1 ──
  // גם לבדיקות אוטומטיות וגם לרגע שבו הורה בפיילוט אומר "זה תקוע" ואני
  // צריך לדעת מה המכונה חושבת בלי לנחש.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).has('debug')) return
    window.__wilden = { state: g, view: beaconView(g), route: { degraded: route.degraded, reason: route.reason, status: route.status } }
  }, [g, route.degraded, route.reason, route.status])

  const onFix = useCallback(f => dispatch({ type: 'FIX', ...f }), [])
  const onResume = useCallback(f => dispatch({ type: 'RESUME', ...f }), [])
  const onGeoErr = useCallback(r => {
    if (r === 'denied') dispatch({ type: 'PERMISSION_DENIED' })
  }, [])

  const searching = g.state === S.SEARCH || g.state === S.ENCOUNTER
  const geo = useGeo({ active: searching, onFix, onResume, onError: onGeoErr })

  const view = beaconView(g)

  // הביקון מדבר גם כשהטלפון בכיס. זו כל הסיבה שהילד לא צריך ללכת עם
  // המסך מול הפנים.
  useEffect(() => {
    if (g.state !== S.SEARCH) { lastPhase.current = null; return }
    if (view.phase === lastPhase.current) return
    lastPhase.current = view.phase
    const b = PHASE_BUZZ[view.phase]
    if (b) { buzz(b); if (view.phase === PHASE.TRACE) sfxRustle(); else sfxAppear() }
  }, [view.phase, g.state])

  // בניית המסלול ברגע שיש בית
  useEffect(() => {
    if (g.state !== S.ROUTE_BUILDING || !g.run?.home) return
    let dead = false
    route.build(g.run.home).then(path => {
      if (!dead && path) dispatch({ type: 'ROUTE_READY', path, home: g.run.home })
    })
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state, g.run?.home])

  function startRun(kind) {
    unlockAudio()
    dispatch({ type: 'START_RUN', kind, missionId: kind === RUN.STORY ? M01.id : null, day: today, t: Date.now() })
    dispatch({ type: 'SET_CREATURE', id: M01.creature })
  }

  function askLocation() {
    geo.request()
    navigator.geolocation?.getCurrentPosition(
      p => dispatch({ type: 'PERMISSION_GRANTED', home: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      e => { if (e.code === 1) dispatch({ type: 'PERMISSION_DENIED' }) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  if (!booted) return <Shell><p style={{ color: C.muted, textAlign: 'center' }}>רגע…</p></Shell>

  const creature = creatureById(g.run?.creature || M01.creature)

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, color: C.ink,
      fontFamily: '"Heebo", system-ui, -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: BEACON_CSS }} />

      {g.state === S.ENCOUNTER && (
        <Stage
          creature={creature}
          onMode={m => dispatch({ type: m === 'CAMERA' ? 'CAMERA_READY' : 'CAMERA_DENIED' })}
          onFound={() => dispatch({ type: 'ENCOUNTER_RESOLVED', caught: true })}
          onGiveUp={() => dispatch({ type: 'ENCOUNTER_RESOLVED', caught: false })}
        />
      )}

      <Shell>
        {g.state === S.BROKEN_WORLD && (
          <BrokenWorld g={g} today={today} onStart={startRun} />
        )}

        {g.state === S.PERMISSIONS && (
          <Panel eyebrow="לפני שיוצאים">
            <h2 style={s.h2}>הביקון צריך לדעת איפה אתם</h2>
            <p style={s.body}>
              הוא בונה מסלול סביב המקום שבו אתם עומדים. <b>המיקום נשאר בטלפון</b> ולא
              נשלח לשום מקום.
            </p>
            <button onClick={askLocation} style={s.cta} disabled={geo.asking}>
              {geo.asking ? 'רגע…' : 'אישור מיקום'}
            </button>
            {geo.err === 'denied' && <p style={s.warn}>בלי מיקום אי אפשר לצאת למסע.</p>}
          </Panel>
        )}

        {g.state === S.ROUTE_BUILDING && (
          <Panel eyebrow="בונים מסלול">
            <h2 style={s.h2}>בודקים אילו רחובות יש כאן</h2>
            <p style={s.body}>
              מרחיקים את המסלול משדות, מאזורי תעשייה ומכבישים סואנים.
            </p>
            {route.status === 'slow' && (
              <>
                <p style={s.warn}>לוקח יותר מהרגיל.</p>
                <button onClick={route.skip} style={{ ...s.cta, ...s.ctaGhost }}>לדלג עכשיו</button>
              </>
            )}
          </Panel>
        )}

        {g.state === S.SEARCH && (
          <SearchScreen g={g} view={view} geo={geo} degraded={route.degraded} reason={route.reason}
            onSearch={() => dispatch({ type: 'SEARCH_PRESSED' })}
            onAbort={() => dispatch({ type: 'ABORT' })} />
        )}

        {g.state === S.CAUGHT && (
          <Panel eyebrow="נתפס!">
            <div style={{ textAlign: 'center', margin: '10px 0 18px' }}>
              <p style={{ fontSize: 30, fontWeight: 900, margin: 0, color: C.amber }}>{creature?.name}</p>
              <p style={{ ...s.body, marginTop: 8 }}>תפסתם אותו! הוא באוסף שלכם.</p>
            </div>
            <button onClick={() => { sfxAppear(); dispatch({ type: 'PORTAL_OPEN' }) }} style={s.cta}>
              לפתוח את הפורטל
            </button>
          </Panel>
        )}

        {g.state === S.PORTAL && (
          <Panel eyebrow="הפורטל">
            <h2 style={s.h2}>הביקון נפתח</h2>
            <p style={s.body}>
              הקשת מתמלאת אור. {creature?.name} נכנס פנימה — והפעם לא לבד.
            </p>
            <button onClick={() => { sfxFinish(); dispatch({ type: 'PORTAL_ENTERED' }) }} style={s.cta}>
              לחזור הביתה
            </button>
          </Panel>
        )}

        {g.state === S.CLUE && (
          <Panel eyebrow="בעולם">
            <p style={s.body}>{M01.home.line}</p>
            <div style={s.clue}>
              <p style={s.clueLine}>{M01.clue.line}</p>
              <p style={s.clueSub}>{M01.clue.sub}</p>
            </div>
            <button onClick={() => dispatch({ type: 'CLUE_SEEN' })} style={s.cta}>הבנתי</button>
          </Panel>
        )}

        {g.state === S.RUN_COMPLETE && (
          <Panel eyebrow="המסע נגמר">
            <h2 style={s.h2}>{g.progress.creatures.length ? 'הוא חי בעולם שלכם עכשיו.' : 'חזרתם.'}</h2>
            <Stats g={g} />
            <button onClick={() => dispatch({ type: 'RUN_CLOSED' })} style={s.cta}>לעולם</button>
          </Panel>
        )}

        {g.state === S.ABORTED && (
          <Panel eyebrow="עצרנו">
            <h2 style={s.h2}>הכול נשמר</h2>
            <p style={s.body}>מה שאספתם נשאר. אפשר לצאת שוב מתי שבא לכם.</p>
            <button onClick={() => dispatch({ type: 'RUN_CLOSED' })} style={s.cta}>לעולם</button>
          </Panel>
        )}
      </Shell>
    </div>
  )
}

// ── עולם הבית ההרוס ──
function BrokenWorld({ g, today, onStart }) {
  const storyOpen = canStartStory(g.progress, today)
  const first = g.progress.missionsCompleted === 0
  return (
    <>
      <p style={s.eyebrow}>WILDEN</p>
      <h1 style={s.h1}>{first ? 'העולם שלך נשבר.' : 'העולם שלך חוזר לאט.'}</h1>
      <p style={s.lede}>
        {first
          ? 'הם לא נעלמו. הם נמצאים בצד שלנו.'
          : g.progress.creatures.length === 1
            ? 'אחד כבר חי כאן. השאר עדיין בחוץ.'
            : `${g.progress.creatures.length} כבר חיים כאן. עוד מחכים בחוץ.`}
      </p>

      <div style={{ display: 'grid', placeItems: 'center', margin: '24px 0 20px' }}>
        <Beacon power={beaconView(g).power} phase={PHASE.IDLE} size={120} />
      </div>

      {storyOpen ? (
        <>
          <div style={s.brief}>
            <p style={s.briefLine}>{M01.brief.line}</p>
            <p style={s.briefSub}>{M01.brief.sub}</p>
          </div>
          <button onClick={() => onStart(RUN.STORY)} style={s.cta}>{M01.brief.cta}</button>
          <button onClick={() => onStart(RUN.FREE)} style={{ ...s.cta, ...s.ctaGhost }}>צא לחקור</button>
        </>
      ) : (
        <>
          <div style={s.brief}>
            <p style={s.briefLine}>המסע הבא ייפתח מחר.</p>
            <p style={s.briefSub}>אבל אפשר לצאת לחקור מתי שבא לכם.</p>
          </div>
          <button onClick={() => onStart(RUN.FREE)} style={s.cta}>צא לחקור</button>
        </>
      )}

      {g.notice === 'no-location' && <p style={s.warn}>בלי אישור מיקום אי אפשר לצאת.</p>}
      <Stats g={g} />
    </>
  )
}

// ── מסך החיפוש ──
function SearchScreen({ g, view, geo, degraded, reason, onSearch, onAbort }) {
  const hot = view.phase === PHASE.VERY_CLOSE || view.phase === PHASE.SAFE_STOP
  return (
    <>
      <p style={s.eyebrow}>{g.run.kind === RUN.STORY ? 'מסע · האות' : 'יציאה חופשית'}</p>

      <div style={{ display: 'grid', placeItems: 'center', margin: '18px 0 6px' }}>
        <Beacon power={view.power} phase={view.phase} arrow={view.arrow}
          bearing={view.bearing ?? 0} size={150} />
        <BeaconLine line={view.line} sub={view.sub} tone={hot ? 'hot' : 'calm'} />
      </div>

      {view.canSearch && (
        <button onClick={onSearch} style={{ ...s.cta, marginTop: 22, fontSize: 19 }}>
          👁 חפש אותו
        </button>
      )}

      {!view.canSearch && view.phase === PHASE.VERY_CLOSE && (
        <p style={s.hintStop}>עצרו במקום בטוח — ואז אפשר לחפש.</p>
      )}

      <GpsPanel geo={geo} run={g.run} />
      {degraded && (
        <p style={s.note}>
          {reason === 'no-loop' || reason === 'short-loop'
            ? 'לא מצאנו כאן לולאה שחוזרת הביתה. המסלול כללי — עברו עליו לפני שיוצאים.'
            : reason === 'empty' || reason === 'no-node'
              ? 'לא מצאנו רחובות ממופים סביב הבית. המסלול כללי — עברו עליו לפני שיוצאים.'
              : 'לא הצלחנו להתחבר למפה כרגע. המסלול כללי — עברו עליו לפני שיוצאים.'}
          {reason && <span style={{ opacity: .55 }}> ({reason})</span>}
        </p>
      )}

      <button onClick={onAbort} style={{ ...s.cta, ...s.ctaGhost, marginTop: 26 }}>לעצור</button>
    </>
  )
}

// ── מה קורה עם המיקום ──
// לא מאחורי ?debug=1. הורה בפיילוט צריך לדעת בעצמו אם הטלפון לא מעדכן
// מיקום, אם "מיקום מדויק" כבוי, או אם פשוט צריך לצאת מתחת לבניין —
// ולכל אחד מהם פעולה אחרת לגמרי.
function GpsPanel({ geo, run }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(id)
  }, [])

  const acc = geo.pos?.acc
  const since = geo.lastAt ? Math.round((now - geo.lastAt) / 1000) : null
  const walked = Math.round(run?.walked || 0)

  let issue = null
  if (geo.err === 'denied') {
    issue = { t: 'המיקום חסום', how: 'הגדרות ← Safari ← מיקום ← אפשר' }
  } else if (!geo.fixes) {
    issue = { t: 'עוד לא הגיעה קריאת מיקום אחת', how: 'צאו החוצה ותנו לזה כמה שניות' }
  } else if (since != null && since > 30) {
    issue = { t: `המיקום לא התעדכן ${since} שניות`, how: 'ייתכן שמצב חיסכון בסוללה פועל — כבו אותו' }
  } else if (acc != null && acc > ACC_COARSE) {
    issue = {
      t: `הטלפון נותן מיקום מקורב בלבד (${Math.round(acc)} מ׳)`,
      how: 'הגדרות ← פרטיות ואבטחה ← שירותי מיקום ← אתרי Safari ← הפעילו «מיקום מדויק»',
    }
  } else if (acc != null && acc > ACC_DIRECTION) {
    issue = { t: `קליטה חלשה (${Math.round(acc)} מ׳)`, how: 'צאו מתחת לבניין או לחניון — זה משתפר תוך כדי הליכה' }
  } else if (walked === 0 && geo.fixes > 20) {
    issue = { t: 'הטלפון מעדכן מיקום אבל לא רואה תנועה', how: 'זה תקין אם עומדים. אם אתם הולכים — תגידו לי.' }
  }

  return (
    <div style={s.gps}>
      <div style={s.gpsRow}>
        <span>דיוק <b style={{ color: acc == null ? C.faint : acc <= ACC_GATE ? C.green : acc <= ACC_DIRECTION ? C.amber : C.red }}>
          {acc == null ? '—' : Math.round(acc) + ' מ׳'}</b></span>
        <span>נצבר <b style={{ color: walked >= WALK_GATE ? C.green : C.faint }}>{walked} מ׳</b></span>
        <span>קריאות <b style={{ color: geo.fixes ? C.green : C.red }}>{geo.fixes}</b></span>
        {since != null && <span>לפני <b>{since}ש׳</b></span>}
      </div>
      {issue && (
        <div style={s.gpsIssue}>
          <p style={{ margin: 0, fontWeight: 700, color: C.red }}>{issue.t}</p>
          <p style={{ margin: '3px 0 0', color: C.muted, fontSize: 13.5 }}>{issue.how}</p>
        </div>
      )}
    </div>
  )
}

function Stats({ g }) {
  const res = g.progress.res || {}
  const kinds = Object.entries(res).filter(([, v]) => v > 0)
  if (!g.progress.missionsCompleted && !kinds.length && !g.progress.creatures.length) return null
  return (
    <div style={s.stats}>
      <div><b style={s.statN}>{g.progress.creatures.length}</b><span style={s.statL}>יצורים</span></div>
      <div><b style={s.statN}>{g.progress.missionsCompleted}</b><span style={s.statL}>מסעות</span></div>
      {kinds.map(([k, v]) => (
        <div key={k}><b style={s.statN}>{v}</b><span style={s.statL}>{RES_NAME[k] || k}</span></div>
      ))}
    </div>
  )
}
const RES_NAME = { wood: 'קרשים', stone: 'אבן', flowers: 'פרחים', spark: 'ניצוץ', honey: 'דבש' }

function Panel({ eyebrow, children }) {
  return (
    <>
      {eyebrow && <p style={s.eyebrow}>{eyebrow}</p>}
      {children}
    </>
  )
}

function Shell({ children }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '38px 20px 70px' }}>{children}</div>
  )
}

const s = {
  eyebrow: { fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color: C.amber, margin: '0 0 10px' },
  h1: { fontSize: 32, fontWeight: 900, margin: '0 0 8px', lineHeight: 1.15 },
  h2: { fontSize: 23, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.25 },
  lede: { fontSize: 17, color: C.muted, margin: '0 0 4px' },
  body: { fontSize: 16, color: C.muted, margin: '0 0 16px', lineHeight: 1.7 },
  cta: { display: 'block', width: '100%', marginTop: 12, padding: '15px 18px', borderRadius: 13,
    border: 'none', background: C.amber, color: '#14200F',
    fontFamily: 'inherit', fontSize: 17.5, fontWeight: 800, cursor: 'pointer' },
  ctaGhost: { background: 'transparent', color: C.ink, border: `1.5px solid ${C.line}` },
  brief: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
    padding: '16px 18px', margin: '18px 0 4px' },
  briefLine: { margin: 0, fontSize: 17, fontWeight: 700 },
  briefSub: { margin: '4px 0 0', fontSize: 15, color: C.muted },
  clue: { background: C.card, borderInlineStart: `3px solid ${C.amber}`, borderRadius: 10,
    padding: '14px 16px', margin: '16px 0' },
  clueLine: { margin: 0, fontSize: 19, fontWeight: 800, color: C.amber },
  clueSub: { margin: '5px 0 0', fontSize: 15, color: C.muted },
  warn: { marginTop: 14, fontSize: 14.5, color: C.red },
  note: { marginTop: 14, fontSize: 14, color: C.faint, lineHeight: 1.6 },
  hintStop: { marginTop: 18, fontSize: 15.5, color: C.faint, textAlign: 'center' },
  gps: { marginTop: 20, padding: '10px 12px', background: C.card,
    border: `1px solid ${C.line}`, borderRadius: 12 },
  gpsRow: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13,
    color: C.faint, fontFamily: 'ui-monospace, monospace' },
  gpsIssue: { marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`, fontSize: 14.5 },
  stats: { display: 'flex', gap: 18, marginTop: 26, paddingTop: 16, borderTop: `1px solid ${C.line}` },
  statN: { display: 'block', fontSize: 22, fontWeight: 900, color: C.ink },
  statL: { fontSize: 12.5, color: C.faint },
}

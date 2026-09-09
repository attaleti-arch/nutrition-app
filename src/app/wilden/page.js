'use client'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { initial, reduce, beaconView, S, RUN, MODE, nextRunKind, canStartStory } from './engine/machine'
import { PHASE, PHASE_BUZZ, ACC_GATE, ACC_DIRECTION, ACC_COARSE, WALK_GATE } from './engine/beacon'
import { PLACE_AFTER } from './engine/placement'
import { save, load, dayKey } from './engine/persist'
import { creatureById } from './content/creatures'
import { briefFor, homeFor, todaysCreature } from './content/briefs'
import { useProfile } from './hooks/useProfile'
import { ProfileGate, ProfileBar } from './ui/ProfileGate'
import { Beacon, BeaconLine, BEACON_CSS } from './ui/Beacon'
import { Stage } from './ar/Stage'
import { useGeo } from './hooks/useGeo'
import { useOrient, requestOrientation } from './hooks/useOrient'
import { useRoute } from './hooks/useRoute'
import { MiniMap } from './ui/MiniMap'
import { turnsFor, nextCue, cueText, floorCue, cueGlyph, timeLeftMs, fmtClock } from './engine/turns'
import { pathLength } from './engine/geo'
import { loopTargetM, canBuyExtra, WALK_PLAN, heatOf, goldNearby, coinRunNearby, plannedMs, AVAILABLE } from './engine/coins'
import { cheer, milestone } from './content/cheers'
import { GoldStage } from './ar/GoldStage'
import { CoinRun } from './ar/CoinRun'
import { Hatch } from './ui/Hatch'
import { Evolve } from './ui/Evolve'
import { stagedFor, stageOf, stagedName, stageProgress } from './engine/stages'
import { HomeWorld } from './ui/HomeWorld'
import { Book, Badges } from './ui/Book'
import { Shop } from './ui/Shop'
import { weeklyStatus, WEEKLY_COINS, km } from './engine/weekly'
import { bondOf, buddyLine, BOND_M } from './engine/buddy'
import { ROUTE_KM, routeKm, poisFor, creatureCount, plannedMsKm, plannedMin } from './engine/plan'
import { armed, gearById, withKeys, lockLine } from './engine/gear'
import { BUILDINGS, RES_ICON as RES_ICONS } from './engine/world'
import { boosting, streakFill, boostLeftMs, BOOST_REVEAL } from './engine/streak'
import { usePulse } from './hooks/usePulse'
import { badgeById } from './engine/badges'
import { RES_NAME as RES_NAMES } from './engine/world'
import { CaughtClip, usePreloadClip } from './ui/CaughtClip'
import { EGG_PRICE, canBuyEgg, eggWarmth, warmthWord, variantName } from './engine/egg'
import { haversine } from './engine/geo'
import { sfxCoin, sfxTally, sfxCheer, resumeAudio } from './engine/audio'
import 'leaflet/dist/leaflet.css'
import { unlockAudio, sfxAppear, sfxRustle, sfxCatch, sfxFinish, buzz } from './engine/audio'

// ─── WILDEN · מסע 1 ───
// הקליפה בלבד: היא בוחרת מסך לפי מצב המכונה ומזינה לתוכה אירועים.
// כל ההחלטות — איפה היצור, מתי הביקון מתקדם, מה קורה ב-resume — יושבות
// במנוע הטהור ונבדקות בלעדיו.

const PAGE_CSS = `
@keyframes wildenCoinFly { 0% { transform: translate(-50%,-50%) scale(.6); opacity: 0 } 15% { transform: translate(-50%,-50%) scale(1.25); opacity: 1 }
  100% { transform: translate(calc(-50% + 34vw), calc(-50% - 36vh)) scale(.4); opacity: 0 } }
@keyframes wildenToast { 0% { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.9) } 12% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) }
  80% { opacity: 1 } 100% { opacity: 0; transform: translateX(-50%) translateY(-8px) } }
`
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

  // ── מי משחק ──
  // שם וקוד בטלפון, העולם גם בשרת. בלי זה כל דפדפן היה עולם חדש —
  // walks חוזר לאפס והמשחק שולח שוב ושוב לתפוס את נימי.
  const P = useProfile({ g, dispatch, booted })

  // ── חלון הצצה למצב, מאחורי ?debug=1 ──
  // גם לבדיקות אוטומטיות וגם לרגע שבו הורה בפיילוט אומר "זה תקוע" ואני
  // צריך לדעת מה המכונה חושבת בלי לנחש.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).has('debug')) return
    window.__wilden = { state: g, view: beaconView(g), route: { degraded: route.degraded, reason: route.reason, detail: route.detail, source: route.source, status: route.status } }
  }, [g, route.degraded, route.reason, route.detail, route.source, route.status])

  // ── סאונד שחוזר לחיים ──
  // ספארי מקפיא את הסאונד כשהמסך נכבה באמצע הליכה, ולא מחזיר לבד. בלי זה
  // "המטבעות לא עושות צליל, גם התפיסה לא". כל מגע וכל חזרה למסך מחזירים.
  useEffect(() => {
    const wake = () => resumeAudio()
    window.addEventListener('touchend', wake, { passive: true })
    window.addEventListener('click', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      window.removeEventListener('touchend', wake); window.removeEventListener('click', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [])

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

  // ── נכנסים לרדיוס — המפה עוברת למפגש ──
  // הילד לא צריך למצוא כפתור. עצר ליד הסימן, הביקון אמר "כאן", ואחרי
  // שנייה וחצי המצלמה נפתחת. הכפתור נשאר למי שרוצה ללחוץ בעצמו.
  useEffect(() => {
    if (g.state !== S.SEARCH || !view.canSearch) return
    const id = setTimeout(() => dispatch({ type: 'SEARCH_PRESSED' }), 1500)
    return () => clearTimeout(id)
  }, [g.state, view.canSearch])

  // בניית המסלול ברגע שיש בית
  useEffect(() => {
    if (g.state !== S.ROUTE_BUILDING || !g.run?.home) return
    let dead = false
    // אורך הלולאה לפי הלוח: 30 דקות בפעם הראשונה, 45 אחר כך.
    route.build(g.run.home, g.run.km ? Math.round(g.run.km * 1000) : loopTargetM(g.run.walkIndex || 0)).then(path => {
      if (dead) return
      if (path) dispatch({ type: 'ROUTE_READY', path, home: g.run.home, t: Date.now() })
      else dispatch({ type: 'ROUTE_FAILED' })
    })
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state, g.run?.home])

  function startRun(kind, extra = false) {
    unlockAudio()
    // התדריך של היום — לא תמיד מסע 1. מי בדרך נקבע לפי הלוח.
    const b = briefFor(g.progress)
    dispatch({ type: 'START_RUN', kind, extra, missionId: kind === RUN.STORY ? b.missionId : null, day: today, t: Date.now() })
    dispatch({ type: 'SET_CREATURE', id: b.creature })
  }

  // ── מטבע הזהב ──
  // בטווח 22 מ' מהזהב נפתח מסך הקפיצה. "אחר כך" סוגר אותו עד שמתרחקים
  // וחוזרים — לא נטפל בילד.
  const [goldOpen, setGoldOpen] = useState(false)
  const [hatchSeen, setHatchSeen] = useState(false)
  const [seenEvolved, setSeenEvolved] = useState(null)   // הרשימה שכבר הוצגה (לפי זהות)
  // ── הקליפ אחרי התפיסה ── פעם אחת לכל תפיסה; נטען מראש בזמן המפגש.
  const [clipSeen, setClipSeen] = useState(false)
  useEffect(() => { if (g.state !== S.CAUGHT) setClipSeen(false) }, [g.state])
  // ── הגילוי ── מגיעים לנקודה: פלאש, הקליפ של היצור, פלאש, ואז המצלמה.
  const [introSeen, setIntroSeen] = useState(false)
  useEffect(() => { if (g.state !== S.ENCOUNTER) setIntroSeen(false) }, [g.state])
  useEffect(() => { if (g.state === S.BROKEN_WORLD) setHatchSeen(false) }, [g.state])
  const [goldSkipped, setGoldSkipped] = useState(false)
  const nearGold = g.state === S.SEARCH ? goldNearby(g.run?.coins, g.run?.pos) : null
  useEffect(() => {
    if (nearGold && !goldSkipped && !goldOpen) setGoldOpen(true)
    if (!nearGold && goldSkipped) setGoldSkipped(false)
  }, [nearGold, goldSkipped, goldOpen])
  // ── ריצת המטבעות ── נקודה אחת במסלול: בטווח 20 מ' המצלמה נפתחת ל-20 שניות.
  const [runOpen, setRunOpen] = useState(false)
  const [runSkipped, setRunSkipped] = useState(false)
  const nearRun = g.state === S.SEARCH && !goldOpen ? coinRunNearby(g.run, g.run?.pos) : null
  useEffect(() => {
    if (nearRun && !runSkipped && !runOpen) { unlockAudio(); setRunOpen(true) }
    if (!nearRun && runSkipped) setRunSkipped(false)
  }, [nearRun, runSkipped, runOpen])

  // ── גלינג ──
  // המנוע אוסף, הדף מצלצל. lastCoin משתנה בכל איסוף; זהב מצלצל יותר.
  const lastCoinT = useRef(null)
  useEffect(() => {
    const lc = g.run?.lastCoin
    if (!lc || lc.t === lastCoinT.current) return
    lastCoinT.current = lc.t
    try { resumeAudio(); sfxCoin(lc.gold); buzz(lc.gold ? [30, 40, 30, 40, 60] : [25]) } catch (e) { /* לא קריטי */ }
    setBurst({ t: lc.t, gold: !!lc.gold, n: lc.n || 1 })
  }, [g.run?.lastCoin])
  const [burst, setBurst] = useState(null)

  const nextC = g.state === S.ENCOUNTER || g.state === S.SEARCH ? creatureById(g.run?.target?.creature || g.run?.creature) : null
  usePreloadClip(nextC?.clip || null)
  usePreloadClip(nextC?.live || null)

  function askLocation() {
    geo.request()
    // באותה לחיצה גם המצפן: ב-iOS הוא ניתן רק מתוך לחיצה, וזו הלחיצה.
    // ככה המפה יודעת לאן הטלפון פונה בלי כפתור נוסף.
    requestOrientation()
    navigator.geolocation?.getCurrentPosition(
      p => dispatch({ type: 'PERMISSION_GRANTED', home: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      e => { if (e.code === 1) dispatch({ type: 'PERMISSION_DENIED' }) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  if (!booted) return <Shell><p style={{ color: C.muted, textAlign: 'center' }}>רגע…</p></Shell>

  // היצור של התחנה הנוכחית. (מסע ישן בלי תחנות — היצור של המסע.)
  // בשלב שלו (3 תפיסות = בוגר, 7 = אגדי): הדמות, הקליפ והגודל של השלב.
  const creatureBase = creatureById(g.run?.target?.creature || g.run?.creature) || todaysCreature(g.progress)
  const creature = stagedFor(g.progress, creatureBase)
  // מי נתפס הרגע: התחנה שסומנה done אחרונה.
  const justCaughtBase = g.state === S.CAUGHT
    ? creatureById(g.run.stops?.[Math.max(0, g.run.stop - (g.run.resolved ? 0 : 1))]?.creature || g.run.creature) || creatureBase
    : null
  const justCaught = stagedFor(g.progress, justCaughtBase)

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, color: C.ink,
      fontFamily: '"Heebo", system-ui, -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: BEACON_CSS + PAGE_CSS }} />

      {/* מטבע הזהב: רגע של קפיצה, מעל המפה */}
      {g.state === S.SEARCH && goldOpen && (
        <GoldStage value={10}
          onTaken={res => { dispatch({ type: 'GOLD_TAKEN', t: Date.now(), jump: res }); setGoldOpen(false); setGoldSkipped(false) }}
          onClose={() => { setGoldOpen(false); setGoldSkipped(true) }} />
      )}

      {/* ריצת המטבעות: עשרים שניות של ריצה, מעל המפה */}
      {g.state === S.SEARCH && runOpen && (
        <CoinRun
          onDone={sum => { dispatch({ type: 'COIN_RUN_DONE', got: sum.value, t: Date.now() }); setRunOpen(false) }}
          onClose={() => { setRunOpen(false); setRunSkipped(true) }} />
      )}

      {/* הביצה בקעה: מסך אחד מעל הכול, לפני הבית */}
      {g.hatched && (g.state === S.CLUE || g.state === S.RUN_COMPLETE) && !hatchSeen && (
        <Hatch hatched={g.hatched} onClose={() => setHatchSeen(true)} />
      )}
      {/* מי גדל במסע הזה — אחרי הביצה, לפני מסך הסיום */}
      {/* גם בבית: אבן צמיחה מהחנות מגדילה מיד. כל רשימה חדשה של "מי גדל" מוצגת פעם אחת. */}
      {g.evolved?.length > 0 && (g.state === S.CLUE || g.state === S.RUN_COMPLETE || g.state === S.BROKEN_WORLD) && (!g.hatched || hatchSeen) && seenEvolved !== g.evolved && (
        <Evolve evolved={g.evolved} wearAll={g.progress.wear} progress={g.progress} onClose={() => setSeenEvolved(g.evolved)} />
      )}

      {/* הקליפ של היצור, אחרי "תפסתם אותו!" ולפני ספירת המטבעות */}
      {justCaught?.clip && !clipSeen && (
        <CaughtClip creature={justCaught} onDone={() => setClipSeen(true)} />
      )}

      {g.state === S.ENCOUNTER && creature?.clip && !introSeen && (
        <CaughtClip creature={creature} variant="reveal" onDone={() => { sfxAppear(); buzz([40, 30, 80]); setIntroSeen(true) }} />
      )}

      {g.state === S.ENCOUNTER && (introSeen || !creature?.clip) && (
        <Stage
          creature={creature}
          wear={g.progress.wear?.[creature?.id] || null}
          mods={g.run?.mods || null}
          pos={geo.pos}
          anchor={g.run?.target || null}
          onMode={m => dispatch({ type: m === 'CAMERA' ? 'CAMERA_READY' : 'CAMERA_DENIED' })}
          onFound={() => dispatch({ type: 'ENCOUNTER_RESOLVED', caught: true })}
          onGiveUp={() => dispatch({ type: 'ENCOUNTER_RESOLVED', caught: false })}
        />
      )}

      <Shell>
        {g.state === S.BROKEN_WORLD && !P.loaded && (
          <p style={{ color: C.muted, textAlign: 'center' }}>רגע…</p>
        )}
        {g.state === S.BROKEN_WORLD && P.needsGate && (
          <ProfileGate P={P} switching={P.switching} />
        )}
        {g.state === S.BROKEN_WORLD && P.loaded && !P.needsGate && (
          <BrokenWorld g={g} today={today} onStart={startRun} onEgg={() => { sfxAppear(); dispatch({ type: 'BUY_EGG', t: Date.now() }) }} onQuest={id => dispatch({ type: 'COMPLETE_QUEST', id })}
            onBuy={(id, who, slot) => { sfxCheer(); buzz([30, 30, 60]); dispatch({ type: 'BUY_ITEM', id, who, slot }) }}
            onEquip={(who, slot, id) => { sfxAppear(); dispatch({ type: 'EQUIP', who, slot, id }) }}
            onBuddy={id => { sfxAppear(); dispatch({ type: 'SET_BUDDY', id }) }}
            onKm={km => dispatch({ type: 'SET_ROUTE_KM', km })}
            onLook={(id, look) => { sfxAppear(); dispatch({ type: 'SET_LOOK', id, look }) }}
            onGear={(id, pay) => { sfxCheer(); buzz([30, 30, 60]); dispatch({ type: 'BUY_GEAR', id, pay }) }}
            onSkin={(creature, skin) => { sfxCheer(); buzz([30, 30, 60]); dispatch({ type: 'BUY_SKIN', creature, skin }) }}
            onStone={creature => { sfxFinish(); buzz([60, 40, 120]); dispatch({ type: 'BUY_STONE', creature }) }} P={P} />
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

        {g.state === S.ROUTE_FAILED && (
          <RouteFailed route={route} detail={route.detail}
            onRetry={() => dispatch({ type: 'ROUTE_RETRY' })}
            onAbort={() => dispatch({ type: 'ABORT' })} />
        )}

        {g.state === S.SEARCH && (
          <SearchScreen g={g} view={view} geo={geo} degraded={route.degraded} reason={route.reason} note={route.note} creature={creature} burst={burst}
            onSearch={() => dispatch({ type: 'SEARCH_PRESSED' })}
            onPortal={() => { sfxAppear(); dispatch({ type: 'PORTAL_OPEN' }) }}
            onAbort={() => dispatch({ type: 'ABORT' })} />
        )}

        {g.state === S.CAUGHT && (
          <Panel eyebrow="נתפס!">
            <div style={{ textAlign: 'center', margin: '10px 0 18px' }}>
              <p style={{ fontSize: 30, fontWeight: 900, margin: 0, color: C.amber }}>
                {creatureById(g.run.stops?.[Math.max(0, g.run.stop - (g.run.resolved ? 0 : 1))]?.creature || g.run.creature)?.name || creature?.name}
              </p>
              <p style={{ ...s.cheer }}>{cheer('catch', (g.progress.creatures?.length || 0) + (g.run.stop || 0))}</p>
              <p style={{ ...s.body, marginTop: 4 }}>תפסתם אותו! הוא באוסף שלכם.</p>
              <Tally total={g.run.coinsTaken || 0} bonus={g.run.catchBonus || 0} />
              {g.run.stops && (
                <p style={{ ...s.body, marginTop: 0, color: C.faint }}>
                  {g.run.resolved
                    ? 'זה היה האחרון בדרך.'
                    : `עוד ${g.run.stops.length - g.run.stop} מחכים בדרך.`}
                </p>
              )}
            </div>
            {g.run.resolved ? (
              <>
                <button onClick={() => { sfxAppear(); dispatch({ type: 'CONTINUE' }) }} style={s.cta}>
                  חוזרים הביתה. הוא איתכם — מטבעות כפול
                </button>
                {/* "שאחרי התפיסה הסיבוב ממשיך עד הבית": הפורטל נפתח רק ליד הבית. */}
                {atHome(g.run) && (
                  <button onClick={() => { sfxAppear(); dispatch({ type: 'PORTAL_OPEN' }) }} style={{ ...s.cta, ...s.ctaGhost }}>
                    🏠 הגענו. לפתוח את הפורטל
                  </button>
                )}
              </>
            ) : (
              <button onClick={() => { sfxAppear(); dispatch({ type: 'CONTINUE' }) }} style={s.cta}>
                להמשיך בדרך
              </button>
            )}
          </Panel>
        )}

        {g.state === S.PORTAL && (
          <Panel eyebrow="הפורטל">
            <h2 style={s.h2}>הביקון נפתח</h2>
            <p style={s.body}>
              הקשת מתמלאת אור. {creature?.name} נכנס פנימה — והפעם לא לבד.
            </p>
            <button onClick={() => { sfxFinish(); dispatch({ type: 'PORTAL_ENTERED', t: Date.now() }) }} style={s.cta}>
              לחזור הביתה
            </button>
          </Panel>
        )}

        {g.state === S.CLUE && (() => {
          const h = homeFor(g.run, g.progress)
          return (
            <Panel eyebrow="בעולם">
              <p style={s.body}>{h.line}</p>
              <div style={s.clue}>
                <p style={s.clueLine}>{h.clue.line}</p>
                <p style={s.clueSub}>{h.clue.sub}</p>
              </div>
              <NewBadges ids={g.newBadges} />
              <button onClick={() => dispatch({ type: 'CLUE_SEEN' })} style={s.cta}>הבנתי</button>
            </Panel>
          )
        })()}

        {g.state === S.RUN_COMPLETE && (
          <Panel eyebrow="המסע נגמר">
            <h2 style={s.h2}>{g.progress.creatures.length ? 'הוא חי בעולם שלכם עכשיו.' : 'חזרתם.'}</h2>
            <NewBadges ids={g.newBadges} />
            {g.made?.length > 0 && (
              <p style={s.made}>🏠 {g.made.map(m => `${BUILDINGS.find(b => b.id === m.id)?.name || m.id} ${RES_ICONS[m.product] || ''} +1`).join(' · ')}</p>
            )}
            <ParentCard walk={g.progress.lastWalk && { ...g.progress.lastWalk, buddy: g.progress.buddy, stageProgress: g.progress.buddy ? stageProgress(g.progress, g.progress.buddy) : null }} gift={g.weeklyGift} />
            <Stats g={g} />
            <button onClick={() => dispatch({ type: 'RUN_CLOSED' })} style={s.cta}>לעולם</button>
          </Panel>
        )}

        {g.state === S.ABORTED && (
          <Panel eyebrow="עצרנו">
            <h2 style={s.h2}>הכול נשמר</h2>
            <p style={s.body}>מה שאספתם נשאר. אפשר לצאת שוב מתי שבא לכם.</p>
            <ParentCard walk={g.progress.lastWalk} />
            <button onClick={() => dispatch({ type: 'RUN_CLOSED' })} style={s.cta}>לעולם</button>
          </Panel>
        )}
      </Shell>
    </div>
  )
}

// ── ספירת המטבעות אחרי התפיסה ──
// "הם רוצים לראות את המטבעות עולות ברצף." המונה מטפס מאפס עד הסכום של
// המסע, גלינג לכל צעד, והבונוס של התפיסה כתוב לידו.
const TALLY_STEPS = 14
function Tally({ total, bonus }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!total) return
    const steps = Math.min(total, TALLY_STEPS)
    let i = 0
    const id = setInterval(() => {
      i += 1
      const v = Math.round((total * i) / steps)
      setN(v)
      try { resumeAudio(); sfxTally(i - 1, steps) } catch (e) { /* לא קריטי */ }
      if (i >= steps) clearInterval(id)
    }, 110)
    return () => clearInterval(id)
  }, [total])
  return (
    <div style={s.tally}>
      <span key={n} style={s.tallyN}>🪙 {n}</span>
      {bonus > 0 && <span style={s.tallyBonus}>+{bonus} על התפיסה</span>}
    </div>
  )
}

// ── הרחובות לא הגיעו ──
// "רק רחובות ברורים." אין יותר "מסלול כללי": המתומן על שדות ובית קברות
// לא היה מפה שאפשר להבין, והוא נראה כמו שקר. במקום זה: מנסים שוב לבד,
// כמה פעמים, עם ספירה לאחור — ואומרים מי נכשל ולמה.
const RETRY_S = 20
const RETRY_BLOCKED_S = 60
const MAX_AUTO = 3
function RouteFailed({ route, detail, onRetry, onAbort }) {
  const blocked = !!detail && detail.includes('blocked')
  const planner = route.reason === 'no-loop' || route.reason === 'no-node' || route.reason === 'short-loop'
  const wait = blocked ? RETRY_BLOCKED_S : RETRY_S
  const [left, setLeft] = useState(wait)
  const autoRef = useRef(0)
  useEffect(() => {
    setLeft(wait)
    if (autoRef.current >= MAX_AUTO) return
    const id = setInterval(() => setLeft(x => {
      if (x <= 1) { clearInterval(id); autoRef.current += 1; onRetry(); return 0 }
      return x - 1
    }), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])
  return (
    <Panel eyebrow={planner ? 'אין מסלול כאן' : 'הרחובות לא הגיעו'}>
      <h2 style={s.h2}>{planner ? 'לא מצאנו מסלול ברחובות שכאן' : 'לא הצלחנו להביא את מפת הרחובות'}</h2>
      <p style={s.body}>
        {planner
          ? 'הרחובות הגיעו, אבל אין בהם דרך שיוצאת מהבית וחוזרת אליו, גם לא הלוך ושוב. אולי הבית רחוק מרחוב ממופה. נסו להתחיל מפינת רחוב קרובה.'
          : blocked
            ? 'שרת המפות חסם אותנו זמנית אחרי כמה ניסיונות ברצף. זה עובר תוך דקה.'
            : 'שרת המפות לא ענה בזמן. זה קורה, בעיקר מרשת סלולרית.'}
        {' '}המסלול הוא רק על רחובות אמיתיים, ולכן לא ממציאים אחד.
      </p>
      {autoRef.current < MAX_AUTO && left > 0 && (
        <p style={s.body}>מנסים שוב לבד בעוד <b>{left}</b> שניות.</p>
      )}
      {/* מי נכשל ולמה. זה מה שצריך לצלם ולשלוח לי. */}
      {(detail || route.reason) && (
        <p style={{ ...s.note, fontFamily: 'ui-monospace, monospace', fontSize: 12.5, direction: 'ltr', textAlign: 'left' }}>
          {route.reason}{detail ? ' — ' + detail : ''}
        </p>
      )}
      <button onClick={onRetry} style={s.cta}>לנסות שוב עכשיו</button>
      <button onClick={onAbort} style={{ ...s.cta, ...s.ctaGhost }}>לא עכשיו</button>
    </Panel>
  )
}

import { earned as earnedBadges } from './engine/badges'
const badgeCount = p => earnedBadges(p || {}).length

// ── הישג חדש ── מוצג במסך הסיום, מה שנפתח במסע הזה.
function NewBadges({ ids }) {
  if (!ids?.length) return null
  return (
    <div style={s.newBadges}>
      {ids.map(id => { const b = badgeById(id); return b ? <span key={id} style={s.newBadge}>{b.icon} {b.name}</span> : null })}
    </div>
  )
}

// ── להורים ── בסוף הליכה: כמה הלכו, כמה זמן, כמה צעדים בערך. בלי קלוריות.
function ParentCard({ walk, gift = null }) {
  if (!walk || (!walk.meters && !walk.minutes)) return null
  return (
    <div style={s.parent}>
      <p style={s.parentEyebrow}>להורים</p>
      <p style={s.parentLine}>
        היום הלכתם <b>{km(walk.meters)}</b>
        {walk.minutes > 0 && <> · <b>{walk.minutes} דקות</b> בחוץ</>}
        {walk.steps > 0 && <> · כ־<b>{walk.steps.toLocaleString('he-IL')}</b> צעדים</>}.
      </p>
      {walk.buddy && (() => { const b = creatureById(walk.buddy); const sp = walk.stageProgress; return b ? (
        <p style={s.parentBuddy}>🐾 {km(walk.meters)} עם {b.name}{sp?.next ? ` · עוד ${sp.left === 1 ? 'תפיסה אחת' : `${sp.left} תפיסות`} או ${km(sp.left * BOND_M)} יחד — ${b.gender === 'f' ? 'והיא גדלה' : 'והוא גדל'}` : ''}</p>
      ) : null })()}
      {gift === 'egg' && <p style={s.parentGift}>🥚 שלושה מסעות השבוע — ביצה על הביקון, מתנה.</p>}
      {gift === 'coins' && <p style={s.parentGift}>🪙 שלושה מסעות השבוע — {WEEKLY_COINS} מטבעות בונוס.</p>}
    </div>
  )
}

// בבית = בתוך 60 מ' מהדלת, או שאין מיקום בכלל (אז לא חוסמים).
const HOME_M = 60
function atHome(run) {
  if (!run?.home || !run?.pos) return true
  return haversine(run.pos, run.home) <= HOME_M
}

// ── עולם הבית ההרוס ──
// מה בדרך, במילים של ילד
function poisText(pois) {
  const n = pois.filter(k => k === 'creature').length
  const parts = [n === 1 ? 'יצור אחד' : `${n} יצורים`]
  if (pois.includes('run')) parts.push('ריצת מטבעות')
  if (pois.includes('gold')) parts.push('קפיצה לזהב')
  return parts.join(' · ')
}

function BrokenWorld({ g, today, onStart, onEgg, onQuest, onBuy, onEquip, onGear, onSkin, onStone, onBuddy, onKm, onLook, P }) {
  const [panel, setPanel] = useState(null)   // book | badges | shop
  const week = weeklyStatus(g.progress, today)
  const buddy = creatureById(g.progress.buddy)
  // routeLen ולא km: km הוא פורמט המרחק (engine/weekly) שמשמש כאן למטה.
  const routeLen = routeKm(g.progress, g.progress.walks || 0)
  const pois = poisFor(routeLen, g.progress.walks || 0)
  const nCreatures = creatureCount(pois)
  const storyOpen = canStartStory(g.progress, today)
  const first = g.progress.missionsCompleted === 0
  const walks = g.progress.walks || 0
  const extraOk = canBuyExtra(g.progress)
  // התדריך של היום: מסע 1 — הסיפור. אחר כך — מי בדרך לפי הלוח, בשם.
  const brief = briefFor(g.progress)
  const who = creatureById(brief.creature)
  // מפתחות: יצור נעול מוחלף, והבית אומר מה חסר ("צל מחכה ברחוב החשוך. צריך פנס")
  const keyed = withKeys((brief.creatures || []).slice(0, nCreatures), g.progress, AVAILABLE)
  return (
    <>
      <p style={s.eyebrow}>WILDEN</p>
      {P && <ProfileBar P={P} />}
      <h1 style={s.h1}>{first ? 'העולם שלך נשבר.' : 'העולם שלך חוזר לאט.'}</h1>
      <p style={s.lede}>
        {first
          ? 'הם לא נעלמו. הם נמצאים בצד שלנו.'
          : g.progress.creatures.length === 1
            ? 'אחד כבר חי כאן. השאר עדיין בחוץ.'
            : `${g.progress.creatures.length} כבר חיים כאן. עוד מחכים בחוץ.`}
      </p>

      {/* העולם עצמו: התפאורה שלה, היצורים החיים, והשומר שמבקש. */}
      <div style={{ margin: '16px 0 10px' }}>
        <HomeWorld progress={g.progress} walks={walks} onQuest={onQuest} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button onClick={() => setPanel('book')} style={s.chip}>📖 ספר היצורים <b>{g.progress.creatures.length}/{AVAILABLE.length}</b></button>
        <button onClick={() => setPanel('badges')} style={s.chip}>🏅 הישגים <b>{badgeCount(g.progress)}</b></button>
        <button onClick={() => setPanel('shop')} style={s.chip}>🛍️ חנות <b>🪙 {g.progress.coins || 0}</b></button>
      </div>
      {panel === 'book' && <Book progress={g.progress} onClose={() => setPanel(null)} onLook={onLook} />}
      {panel === 'badges' && <Badges progress={g.progress} onClose={() => setPanel(null)} />}
      {panel === 'shop' && <Shop progress={g.progress} onBuy={onBuy} onEquip={onEquip} onGear={onGear} onSkin={onSkin} onStone={onStone} onLook={onLook} onClose={() => setPanel(null)} />}

      {/* מה מחכה למסע הבא מהחנות */}
      {armed(g.progress).length > 0 && (
        <p style={s.armed}>🎒 למסע הבא: {armed(g.progress).map(it => `${it.name}${it.n > 1 ? ` ×${it.n}` : ''}`).join(' · ')}</p>
      )}

      {/* בן לוויה: מי יוצא איתך היום. על המפה לידך, וכל 2 ק"מ יחד = תפיסה להתפתחות שלו. */}
      {g.progress.creatures.length > 0 && (
        <div style={s.buddyRow} aria-label="בן לוויה">
          <p style={s.buddyTitle}>{buddy ? <>יוצא איתך: <b>{stagedName(buddy, stageOf(g.progress, buddy.id))}</b> · {km(bondOf(g.progress, buddy.id))} יחד</> : 'מי יוצא איתך היום?'}</p>
          <div style={s.buddyPick}>
            {g.progress.creatures.map(id => {
              const c = creatureById(id); if (!c) return null
              const on = g.progress.buddy === id
              return (
                <button key={id} onClick={() => onBuddy(on ? null : id)} aria-label={`בן לוויה: ${c.name}`}
                  style={{ ...s.buddyChip, borderColor: on ? C.amber : C.line, background: on ? 'rgba(229,163,66,.18)' : C.card }}>
                  <img src={c.live || c.sprites?.hero} alt="" style={s.buddyImg} draggable={false} />
                </button>
              )
            })}
          </div>
          {!buddy && <p style={s.buddyHint}>הוא ילך לידך על המפה, וכל 2 ק״מ יחד נספרים לו כתפיסה.</p>}
        </div>
      )}

      {/* השבוע: שלושה מסעות בין ראשון לשבת — ביצה. לא רצף שנשבר: מונה שמתאפס ביום ראשון. */}
      <div style={s.weekly} aria-label="השבוע">
        <span style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: week.need }, (_, i) => <span key={i} style={{ ...s.weekDot, background: i < week.have ? C.amber : 'transparent' }} />)}
        </span>
        <span>{week.done
          ? 'הבונוס השבועי התקבל. בשבוע הבא — שוב.'
          : `${week.have}/${week.need} מסעות השבוע · ב־${week.need} מקבלים ${week.gift === 'egg' ? 'ביצה 🥚' : `🪙 ${WEEKLY_COINS}`}`}</span>
      </div>

      {/* הלוח של הבן שלה: מסע 1 — 30 דקות ונימי. אחר כך 45 דקות ושניים
          בדרך. מהשלישי — מטבעות פותחים יצור שלישי. */}
      <div style={s.plan}>
        <span>🚶 {routeLen} ק״מ · ~{plannedMin(routeLen)} דק׳</span>
        <span>🪙 <b>{g.progress.coins || 0}</b></span>
        <span>{`${keyed.creatures.map(id => creatureById(id)?.name).filter(Boolean).join(' ו') || who?.name || 'יצורים'} בדרך`}</span>
      </div>
      {keyed.locked.map(id => <p key={id} style={s.locked}>🔒 {lockLine(id)}. בינתיים {creatureById(keyed.creatures[keyed.creatures.length - 1])?.name} במקומו.</p>)}

      {/* להורה: אורך המסלול. במקום לנחש — 1 עד 4 ק"מ, וממנו הזמן ומה בדרך. */}
      <div style={s.kmRow} aria-label="אורך המסלול">
        <p style={s.kmTitle}>להורה · אורך המסלול</p>
        <div style={s.kmPick}>
          {ROUTE_KM.map(k => (
            <button key={k} onClick={() => onKm(k)} style={{ ...s.kmChip, borderColor: g.progress.routeKm === k ? C.amber : C.line, background: g.progress.routeKm === k ? 'rgba(229,163,66,.18)' : C.card, color: g.progress.routeKm === k ? C.amber : C.ink }}>
              {k} ק״מ
            </button>
          ))}
        </div>
        <p style={s.kmHint}>{poisText(pois)}{g.progress.routeKm ? '' : ' · לא נבחר: לפי הלוח'}</p>
      </div>

      {storyOpen ? (
        <>
          <div style={s.brief}>
            <p style={s.briefLine}>{brief.line}</p>
            <p style={s.briefSub}>{brief.sub}</p>
          </div>
          <button onClick={() => onStart(RUN.STORY)} style={s.cta}>{brief.cta}</button>
          {extraOk && (
            <button onClick={() => onStart(RUN.STORY, true)} style={{ ...s.cta, ...s.ctaGold }}>
              🪙 {WALK_PLAN.extraCost} — לפתוח יצור שלישי בדרך
            </button>
          )}
          <button onClick={() => onStart(RUN.FREE)} style={{ ...s.cta, ...s.ctaGhost }}>צא לחקור</button>
        </>
      ) : (
        <>
          <div style={s.brief}>
            <p style={s.briefLine}>המסע הבא ייפתח מחר{who ? ` — ${who.name} בדרך` : ''}.</p>
            <p style={s.briefSub}>אבל אפשר לצאת לחקור מתי שבא לכם{who ? `, וגם ${who.name} שם` : ''}.</p>
          </div>
          <button onClick={() => onStart(RUN.FREE)} style={s.cta}>צא לחקור</button>
          {extraOk && (
            <button onClick={() => onStart(RUN.FREE, true)} style={{ ...s.cta, ...s.ctaGold }}>
              🪙 {WALK_PLAN.extraCost} — לפתוח יצור שלישי בדרך
            </button>
          )}
        </>
      )}
      {walks >= WALK_PLAN.extraFromWalk && !extraOk && (
        <p style={s.note}>יצור שלישי בדרך עולה {WALK_PLAN.extraCost} מטבעות. יש לכם {g.progress.coins || 0}.</p>
      )}

      {/* הביצה: קונים במטבעות, היא מתחממת בהליכה, בוקעת בפורטל. מי ובאיזה
          צבע — לא יודעים מראש. */}
      {g.progress.egg ? (
        <div style={s.eggCard}>
          <span style={s.eggIcon}>🥚</span>
          <div>
            <p style={s.briefLine}>יש ביצה על הביקון.</p>
            <p style={s.briefSub}>היא מתחממת בהליכה. אחרי מסע ארוך היא תבקע בפורטל.</p>
          </div>
        </div>
      ) : canBuyEgg(g.progress) ? (
        <button onClick={onEgg} style={{ ...s.cta, ...s.ctaGhost, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start' }}>
          <span style={s.eggIcon}>🥚</span>
          <span>🪙 {EGG_PRICE} — ביצה<br /><span style={{ fontSize: 13.5, color: C.muted, fontWeight: 500 }}>מי בפנים? באיזה צבע? מגלים רק כשהיא בוקעת.</span></span>
        </button>
      ) : g.progress.creatures.length > 0 && (
        <p style={s.note}>🥚 ביצה עולה {EGG_PRICE} מטבעות. יש לכם {g.progress.coins || 0}.</p>
      )}

      {g.notice === 'no-location' && <p style={s.warn}>בלי אישור מיקום אי אפשר לצאת.</p>}
      <Stats g={g} />
    </>
  )
}

// ── מסך החיפוש ──
// ── מסך ההליכה: מפת רחובות ──
// המסך הראשי של המסע הוא מפה, לא ביקון. הוראה אחת גדולה מעל המפה,
// המסלול על רחובות אמיתיים, ההתקדמות עליו. הביקון הוא שכבה קטנה בפינה
// שמתעוררת רק כשקרובים. היצורים לא מצוירים מראש — רק סימנים: עקבות,
// סימן שאלה, ניצוץ. מגלים מי זה רק כשמגיעים.
function SearchScreen({ g, view, geo, degraded, reason, note, onSearch, onAbort, onPortal, creature, burst }) {
  const r = g.run
  // המצפן, מדולל: המפה מסתובבת איתו כדי שלמעלה = קדימה.
  const orient = useOrient({ active: true, everyMs: 120, minDeg: 2 })
  // ── טיימר לאחור ──
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const left = timeLeftMs(r.walkStartedAt, r.km ? plannedMsKm(r.km) : plannedMs(r.walkIndex || 0), now)
  // ── מילות עידוד ──
  // כל 10 מטבעות, וחצי הדרך. מופיע לכמה שניות מעל המפה ונעלם.
  const [toast, setToast] = useState(null)
  const prevRef = useRef({ coins: r.coinsTaken || 0, along: r.along || 0 })
  useEffect(() => {
    const total0 = r.path ? pathLength(r.path) : 0
    const m = milestone({ coinsBefore: prevRef.current.coins, coinsNow: r.coinsTaken || 0,
      alongBefore: prevRef.current.along, alongNow: r.along || 0, total: total0 })
    prevRef.current = { coins: r.coinsTaken || 0, along: r.along || 0 }
    if (!m) return
    try { sfxCheer(); buzz([30, 30, 30]) } catch (e) { /* לא קריטי */ }
    setToast(m.text)
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.coinsTaken, r.along])
  const hot = view.phase === PHASE.VERY_CLOSE || view.phase === PHASE.SAFE_STOP
  const near = hot || view.phase === PHASE.TRACE
  const turns = useMemo(() => turnsFor(r.path), [r.path])
  const total = useMemo(() => (r.path ? pathLength(r.path) : 0), [r.path])
  const along = r.along || 0
  const homeward = !!r.resolved
  const distToTarget = r.target && r.pos ? haversine(r.pos, r.target) : null
  const cue = r.target ? floorCue(nextCue(turns, along, r.target.along), homeward ? null : distToTarget) : null
  const toTarget = r.target ? Math.max(0, r.target.along - along) : null
  const stopsLeft = r.stops ? r.stops.filter(x => !x.done).length : 1
  // ── חם־קר ──
  // הסימן על המפה נחשף רק כשמתחממים (מתחת ל-320 מ'). עד אז: מסלול, רחובות,
  // ומד חום שמתחזק. סיכה מהרגע הראשון הורגת את המתח.
  const heat = r.target && !r.resolved ? heatOf(distToTarget) : null
  // דחף: ארבע דקות בלי לעצור. מטבעות כפולים, והיצור מתגלה מרחוק יותר.
  const boost = boosting(r.streak, now)
  const fill = boost ? 1 : streakFill(r.streak, now)
  // משקפת (חנות): הסימן נדלק מרחוק כפול. דחף — אותו דבר לדקתיים.
  const reveal = (r.walked || 0) >= PLACE_AFTER && !!heat && heat.t >= (boost ? BOOST_REVEAL : (r.mods?.reveal ?? 0.65))
  // בן הלוויה: על המפה לידך, ומדבר באבני הדרך (יציאה, חצי, הביתה, תחנה).
  const buddy = creatureById(g.progress.buddy)
  const buddyKey = !buddy ? null : homeward ? 'home' : reveal ? 'stop' : total && along / total >= 0.5 ? 'half' : 'start'
  const saidRef = useRef(null)
  useEffect(() => {
    if (!buddy || !buddyKey || saidRef.current === buddyKey) return
    saidRef.current = buddyKey
    const line = buddyLine(buddy.id, buddyKey)
    if (!line) return
    setToast(`${buddy.name}: ${line}`)
    const id = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buddyKey])
  // רעידה בדופק כשמתקרבים לתחנה (מ-100 מ'): לאט, ואז מהר. כמו גלאי מתכות.
  usePulse(!homeward && heat && distToTarget != null && distToTarget < 100 ? distToTarget : null,
    { base: 300, perM: 18, near: 350, far: 2000 })

  return (
    <>
      <div style={s.mapWrap}>
        <MiniMap home={r.home} path={r.path} pos={geo.pos} along={r.along || 0} heading={orient.heading} coinRun={r.coinRun}
          stops={r.stops || (r.target ? [r.target] : [])} nextStop={r.stops ? r.stop : 0}
          reveal={reveal} known={g.progress.creatures} creatureImg={creature?.sprites?.hero}
          coins={r.coins} height="100%" kid={g.progress.wear?.kid || null} buddyImg={buddy?.live || null} />

        {/* מונה המטבעות: קופץ בכל גלינג. בדרך הביתה או בדחף — כפול. */}
        <div key={r.coinsTaken || 0} style={{ ...s.coinHud, ...(boost ? s.coinHudBoost : {}) }}>🪙 {r.coinsTaken || 0}{(homeward || boost) && <span style={{ fontSize: 12 }}> ×2</span>}</div>

        {/* רצף ההליכה: מתמלא כשהולכים בלי לעצור; מלא = דחף לדקתיים. */}
        {!homeward && (
          <div style={{ ...s.streak, ...(boost ? s.streakOn : {}) }} aria-label="רצף הליכה">
            <div style={s.streakBar}><div style={{ ...s.streakFill, width: `${Math.round(fill * 100)}%`, background: boost ? '#FFD84A' : '#8FB57C' }} /></div>
            <span style={s.streakWord}>{boost ? `⚡ דחף! ${Math.ceil(boostLeftMs(r.streak, now) / 1000)} שנ׳` : fill > 0.02 ? 'בלי לעצור…' : 'רצף'}</span>
          </div>
        )}

        {/* אפקט איסוף: מטבע עף מהמרכז אל המונה, עם +1 */}
        {burst && (
          <div key={burst.t} style={s.burst} aria-hidden="true">
            <span style={{ ...s.burstCoin, fontSize: burst.gold ? 54 : 40 }}>🪙</span>
            <span style={s.burstPlus}>+{burst.gold ? 10 : burst.n}{homeward ? '×2' : ''}</span>
          </div>
        )}
        {toast && <div style={s.toast}>{buddy && toast.startsWith(buddy.name + ':') && <img src={buddy.live} alt="" style={s.toastBuddy} />}{toast}</div>}

        {/* ההוראה, מעל המפה */}
        <div style={s.navOverlay}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* חץ גדול: ילד רואה חץ לפני שהוא קורא מילה */}
            <span style={s.navGlyph} aria-hidden="true">{cueGlyph(cue)}</span>
            <p style={s.navLine}>
              {homeward ? (cue ? cueText(cue, 'הבית') : 'חוזרים הביתה. הוא איתכם.')
                : cue ? cueText(cue, reveal ? 'הסימן' : 'הפנייה הבאה')
                : 'יוצאים לדרך.'}
            </p>
          </div>
          <p style={s.navSub}>
            {left != null && <><span style={{ color: left < 5 * 60000 ? C.amber : C.ink }}>⏱ <b>{fmtClock(left)}</b></span> · </>}
            הביתה: <b>{fmtM(Math.max(0, total - along))}</b>
            {r.stops && !homeward && <> · יצורים בדרך: <b>{stopsLeft}</b></>}
            {homeward && <> · מטבעות כפול</>}
            {r.used?.length > 0 && <> · 🎒 {r.used.map(id => gearById(id)?.name).filter(Boolean).join(', ')}</>}
            {g.progress.egg && <> · 🥚 <b>{warmthWord(eggWarmth(r.walked))}</b></>}
          </p>
        </div>

        {/* מד החום: קר → רותח. בלי מספרים. */}
        {heat && (
          <div style={s.heat}>
            <div style={s.heatBar}><div style={{ ...s.heatFill, width: `${Math.round(heat.t * 100)}%`,
              background: heat.t >= 0.85 ? '#E0523A' : heat.t >= 0.65 ? '#E5A342' : heat.t >= 0.45 ? '#D9C25A' : '#6C9BD1' }} /></div>
            <span style={{ ...s.heatWord, color: heat.t >= 0.85 ? '#F0A08C' : heat.t >= 0.65 ? '#F0C069' : C.ink }}>{heat.word}</span>
          </div>
        )}

        {/* הביקון: שכבה על המפה, רק כשקרובים */}
        {near && (
          <div style={s.beaconOverlay}>
            <Beacon power={view.power} phase={view.phase} arrow={view.arrow} bearing={view.bearing ?? 0} size={84} />
            <p style={s.beaconOverlayLine}>{view.line}</p>
          </div>
        )}

        {view.canSearch && !homeward && (
          <button onClick={onSearch} style={s.searchOverlay}>👁 משהו כאן. לחפש</button>
        )}
        {/* הדרך הביתה היא חלק מהמסע: הפורטל נפתח רק כשמגיעים. עד אז — כמה נשאר. */}
        {homeward && (atHome(r)
          ? <button onClick={onPortal} style={s.searchOverlay}>🏠 הגענו. לפתוח את הפורטל</button>
          : <p style={s.stopOverlay}>🏠 עוד {fmtM(Math.max(0, total - along))} הביתה. הוא איתכם.</p>)}
        {!view.canSearch && view.phase === PHASE.VERY_CLOSE && (
          <p style={s.stopOverlay}>הסימן כאן. עצרו במקום בטוח.</p>
        )}
      </div>

      <GpsPanel geo={geo} run={g.run} />
      {/* מסלול שהוא לא הלולאה שתוכננה: הלוך ושוב, או קצר יותר. אומרים. */}
      {note && !degraded && <p style={s.note}>{note}</p>}
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
        <span style={{ color: C.faint }}>גרסה <b style={{ color: C.faint }}>{process.env.NEXT_PUBLIC_BUILD}</b></span>
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
      {(g.progress.minutesTotal || 0) > 0 && <div><b style={s.statN}>{g.progress.minutesTotal}</b><span style={s.statL}>דקות בחוץ</span></div>}
      {kinds.map(([k, v]) => (
        <div key={k}><b style={s.statN}>{v}</b><span style={s.statL}>{RES_NAME[k] || k}</span></div>
      ))}
      {(g.progress.variants || []).length > 0 && (
        <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {g.progress.variants.map((v, i) => (
            <span key={i} style={s.variantChip}>✨ {creatureById(v.creature)?.name} {variantName(v.variant, creatureById(v.creature))}</span>
          ))}
        </div>
      )}
    </div>
  )
}
const RES_NAME = RES_NAMES

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

function fmtM(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} ק״מ` : `${Math.round(m / 10) * 10} מ׳`
}

const s = {
  eyebrow: { fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color: C.amber, margin: '0 0 10px' },
  // המפה תופסת את המסך; כל השאר שכבות עליה.
  mapWrap: { position: 'relative', height: 'calc(100dvh - 190px)', minHeight: 420, margin: '-6px 0 10px' },
  navOverlay: { position: 'absolute', top: 10, insetInline: 10, zIndex: 600, background: 'rgba(15,21,15,.88)',
    border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px', backdropFilter: 'blur(6px)' },
  heat: { position: 'absolute', top: 96, insetInlineStart: 12, zIndex: 650, display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(15,21,15,.85)', border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 12px 6px 8px' },
  heatBar: { width: 84, height: 10, borderRadius: 999, background: '#243024', overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 999, transition: 'width .8s ease, background .8s ease' },
  heatWord: { fontSize: 15, fontWeight: 900 },
  coinHud: { position: 'absolute', top: 96, insetInlineEnd: 12, zIndex: 650, padding: '6px 12px', borderRadius: 999,
    background: '#E5A342', color: '#14200F', fontWeight: 900, fontSize: 17, boxShadow: '0 3px 12px rgba(0,0,0,.35)',
    animation: 'wildenCoinPop .35s ease-out' },
  plan: { display: 'flex', justifyContent: 'space-between', gap: 10, background: C.card2, border: `1px solid ${C.line}`,
    borderRadius: 12, padding: '10px 14px', margin: '0 0 12px', fontSize: 15, color: C.muted },
  ctaGold: { background: '#F0C069', color: '#14200F' },
  navLine: { margin: 0, fontSize: 23, fontWeight: 900, color: C.ink, lineHeight: 1.25 },
  navGlyph: { fontSize: 40, lineHeight: 1, color: C.amber, flex: 'none', textShadow: '0 2px 8px rgba(0,0,0,.5)' },
  burst: { position: 'absolute', left: '50%', top: '55%', zIndex: 700, pointerEvents: 'none', display: 'grid',
    justifyItems: 'center', animation: 'wildenCoinFly .9s cubic-bezier(.3,.7,.4,1) forwards' },
  burstCoin: { lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.5))' },
  burstPlus: { color: '#FFD84A', fontWeight: 900, fontSize: 22, textShadow: '0 2px 8px rgba(0,0,0,.8)' },
  toast: { position: 'absolute', left: '50%', top: '42%', transform: 'translateX(-50%)', zIndex: 720, padding: '12px 20px',
    borderRadius: 999, background: '#E5A342', color: '#14200F', fontWeight: 900, fontSize: 19, whiteSpace: 'nowrap',
    boxShadow: '0 8px 28px rgba(0,0,0,.45)', animation: 'wildenToast 3.2s ease-out forwards' },
  cheer: { margin: '8px 0 0', fontSize: 22, fontWeight: 900, color: '#F0C069' },
  tally: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12, marginTop: 10 },
  tallyN: { fontSize: 34, fontWeight: 900, color: '#FFD84A', animation: 'wildenCoinPop .2s ease-out' },
  tallyBonus: { fontSize: 14, color: C.muted },
  navSub: { margin: '5px 0 0', fontSize: 14.5, color: C.muted },
  beaconOverlay: { position: 'absolute', bottom: 54, insetInlineEnd: 10, zIndex: 600, display: 'grid',
    justifyItems: 'center', gap: 2, background: 'rgba(15,21,15,.82)', borderRadius: 14, padding: '8px 10px 6px',
    border: `1px solid ${C.line}` },
  beaconOverlayLine: { margin: 0, fontSize: 12.5, fontWeight: 700, color: C.ink, maxWidth: 110, textAlign: 'center' },
  searchOverlay: { position: 'absolute', bottom: 12, insetInline: 60, zIndex: 700, padding: '14px 18px', borderRadius: 999,
    border: 'none', background: C.amber, color: '#14200F', fontFamily: 'inherit', fontSize: 18, fontWeight: 900,
    cursor: 'pointer', boxShadow: '0 6px 22px rgba(229,163,66,.45)' },
  stopOverlay: { position: 'absolute', bottom: 14, insetInline: 40, zIndex: 700, margin: 0, textAlign: 'center',
    padding: '10px 14px', borderRadius: 12, background: 'rgba(15,21,15,.88)', color: C.amber, fontWeight: 800, fontSize: 15 },
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
  stats: { display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 26, paddingTop: 16, borderTop: `1px solid ${C.line}` },
  variantChip: { fontSize: 13.5, color: '#F0C069', background: C.card2, border: `1px solid ${C.line}`, borderRadius: 999, padding: '4px 10px' },
  eggCard: { display: 'flex', alignItems: 'center', gap: 12, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
    padding: '14px 16px', marginTop: 12 },
  eggIcon: { fontSize: 30, lineHeight: 1 },
  chip: { flex: 1, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, color: C.ink,
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  newBadges: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 14px' },
  newBadge: { padding: '8px 12px', borderRadius: 999, background: '#F0C069', color: '#14200F', fontSize: 14, fontWeight: 900,
    boxShadow: '0 4px 14px rgba(240,192,105,.35)', animation: 'wildenCoinPop .5s ease-out' },
  weekly: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.muted, margin: '0 0 14px', padding: '8px 12px', background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12 },
  buddyRow: { margin: '0 0 12px', padding: '10px 12px', background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12 },
  kmRow: { margin: '0 0 12px', padding: '10px 12px', background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12 },
  armed: { margin: '-6px 0 12px', fontSize: 14, color: '#F0C069', fontWeight: 700 },
  locked: { margin: '-6px 0 12px', fontSize: 13.5, color: C.muted },
  made: { margin: '6px 0 0', fontSize: 15, color: '#F0C069', fontWeight: 700 },
  kmTitle: { margin: '0 0 8px', fontSize: 12.5, fontWeight: 800, letterSpacing: '.08em', color: C.faint },
  kmPick: { display: 'flex', gap: 6 },
  kmChip: { flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  kmHint: { margin: '8px 0 0', fontSize: 13, color: C.muted },
  buddyTitle: { margin: '0 0 8px', fontSize: 14.5, color: C.muted },
  buddyPick: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 },
  buddyChip: { flex: 'none', width: 48, height: 48, borderRadius: 12, border: '2px solid', display: 'grid', placeItems: 'center', padding: 3, cursor: 'pointer' },
  buddyImg: { maxHeight: 40, maxWidth: 40, objectFit: 'contain' },
  buddyHint: { margin: '8px 0 0', fontSize: 12.5, color: C.faint },
  streak: { position: 'absolute', top: 136, insetInlineStart: 12, zIndex: 650, display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(15,21,15,.85)', border: `1px solid ${C.line}`, borderRadius: 999, padding: '5px 12px 5px 8px' },
  streakOn: { border: '1px solid #FFD84A', boxShadow: '0 0 14px rgba(255,216,74,.5)', animation: 'wildenCoinPop .35s ease-out' },
  streakBar: { width: 70, height: 8, borderRadius: 999, background: '#243024', overflow: 'hidden' },
  streakFill: { height: '100%', borderRadius: 999, transition: 'width 1s linear' },
  streakWord: { fontSize: 12.5, fontWeight: 800, color: C.ink },
  coinHudBoost: { boxShadow: '0 0 16px rgba(255,216,74,.7)', background: '#FFD84A' },
  toastBuddy: { height: 34, width: 'auto', verticalAlign: 'middle', marginInlineEnd: 8 },
  parentBuddy: { margin: '6px 0 0', fontSize: 14.5, color: C.muted },
  weekDot: { width: 12, height: 12, borderRadius: '50%', border: `2px solid ${C.amber}`, display: 'block' },
  parent: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 16px', margin: '4px 0 12px' },
  parentEyebrow: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: C.faint },
  parentLine: { margin: '4px 0 0', fontSize: 15.5, color: C.muted, lineHeight: 1.6 },
  parentGift: { margin: '6px 0 0', fontSize: 15, color: '#F0C069', fontWeight: 700 },
  statN: { display: 'block', fontSize: 22, fontWeight: 900, color: C.ink },
  statL: { fontSize: 12.5, color: C.faint },
}

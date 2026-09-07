// ─── מכונת המצבים ───
// טהורה: מקבלת מצב ואירוע, מחזירה מצב חדש. אין בתוכה GPS, אין React,
// אין localStorage ואין Date.now — כל אירוע נושא את הזמן שלו. זה מה
// שמאפשר להריץ מסע שלם בבדיקה אוטומטית בלי לצאת לרחוב, ולתקן באגים
// באמצע פיילוט של ארבעה־עשר יום בלי ללכת שוב ושוב.

import { haversine, bearing, advanceWalk, progressAlong } from './geo.js'
import { phaseOf, powerOf, POWER, PHASE, showsArrow, PHASE_COPY, STILL_MS, STILL_RADIUS } from './beacon.js'
import { placeTarget, placeStops, revalidate, PLACE_AFTER } from './placement.js'
import { placeCoins, collectCoins, coinsValue, WALK_PLAN, creaturesForWalk, HOME_BONUS } from './coins.js'
import { mergeProgress } from './profile.js'
import { EGG_PRICE, HATCH_M, canBuyEgg, hatch } from './egg.js'

export const S = {
  BROKEN_WORLD: 'BROKEN_WORLD',     // עולם הבית ההרוס. נקודת הכניסה.
  PERMISSIONS: 'PERMISSIONS',
  ROUTE_BUILDING: 'ROUTE_BUILDING',
  ROUTE_FAILED: 'ROUTE_FAILED',
  SEARCH: 'SEARCH',                 // הליכה. שלב הביקון נגזר, לא נשמר.
  ENCOUNTER: 'ENCOUNTER',           // מצלמה או סיפור — ראה encounterMode
  CAUGHT: 'CAUGHT',           // היצור נתפס. החלטה שלה: תפיסה, לא ידידות.
  PORTAL: 'PORTAL',
  HOME_RETURN: 'HOME_RETURN',
  CLUE: 'CLUE',
  RUN_COMPLETE: 'RUN_COMPLETE',
  ABORTED: 'ABORTED',
}

// שני סוגי יציאה, מופרדים ברמת הארכיטקטורה מהיום הראשון. אם נוסיף את
// זה מאוחר, מנוע ההתקדמות כולו ישתנה.
export const RUN = {
  STORY: 'STORY_MISSION',           // אחד ביום. מקדם עלילה.
  FREE: 'FREE_EXPEDITION',          // בלי הגבלה. משאבים, קשר, נדירים — בלי עלילה.
}

// שני מצבי מפגש. "אין מצלמה" אינו דילוג על המפגש: אותו controller,
// אותה בעיה, אותה תפיסה — בסביבה משחקית במקום פיד מצלמה.
// היצור אף פעם לא מתקבל בחינם.
export const MODE = { CAMERA: 'CAMERA', STORY: 'STORY' }

export function initial() {
  return {
    v: 1,
    state: S.BROKEN_WORLD,
    run: null,
    progress: {
      missionsCompleted: 0,
      lastStoryDay: null,
      creatures: [],
      res: {},
      story: {},
      coins: 0,           // הארנק
      walks: 0,           // כמה מסלולים הושלמו, מכל סוג — קובע את הלוח
      egg: null,          // { boughtAt } — ביצה על הביקון, מחכה למסע
      variants: [],       // [{ creature, variant, at }] — מה שבקע
    },
  }
}

// ── מי מותר לצאת עכשיו ──
// משימה סיפורית אחת ליום — כדי שיישאר בראש "מחר בולדר ימשיך לבנות".
// אבל אין שום נעילה של יציאה נוספת: ילד שמתלהב ורוצה לצאת שוב בערב
// יוצא, וזה בדיוק ההפך מ"תחזור מחר".
export function canStartStory(progress, day) {
  return progress.lastStoryDay !== day
}

export function nextRunKind(progress, day) {
  return canStartStory(progress, day) ? RUN.STORY : RUN.FREE
}

// ── הביקון, נגזר ולא נשמר ──
// שלב החיפוש הוא פונקציה של המרחק, הדיוק, מה שנצבר בהליכה וכמה זמן
// עומדים. לשמור אותו כמצב נפרד היה יוצר שני מקורות אמת שנפרדים זה מזה
// בדיוק כשה-GPS קופץ.
export function beaconView(g) {
  const r = g.run
  const done = g.progress.missionsCompleted
  if (!r || g.state !== S.SEARCH) {
    return { power: powerOf(done), phase: PHASE.IDLE, ...PHASE_COPY[PHASE.IDLE], arrow: false, bearing: null }
  }

  // ── הביקון ער בזמן מסע ──
  // powerOf נגזר ממשימות שהושלמו, ולכן במסע הראשון הוא החזיר DORMANT:
  // אבן אפורה וכבויה בדיוק במסע שכל הסיפור שלו הוא "הביקון זז לראשונה
  // מאז שהאור כבה". בזמן יציאה הוא לפחות REACTIVE.
  const power = done === 0 ? POWER[1] : powerOf(done)

  const dist = r.target && r.pos ? haversine(r.pos, r.target) : null
  const phase = phaseOf({
    dist, acc: r.acc, walked: r.walked, stillMs: r.stillMs, resolved: r.resolved, active: true,
  })
  return {
    power,
    phase,
    ...PHASE_COPY[phase],
    arrow: showsArrow(phase, r.acc) && !!r.target && !!r.pos,
    bearing: r.target && r.pos ? bearing(r.pos, r.target) : null,
    canSearch: phase === PHASE.SAFE_STOP,
  }
}

// ═══════════════════════════════════════════════════════════════
// הרדוסר
// ═══════════════════════════════════════════════════════════════

export function reduce(g, ev) {
  switch (ev.type) {

    case 'START_RUN': {
      const kind = ev.kind || nextRunKind(g.progress, ev.day)
      if (kind === RUN.STORY && !canStartStory(g.progress, ev.day)) {
        return { ...g, state: S.BROKEN_WORLD, notice: 'story-done-today' }
      }
      // יצור שני בתשלום — רק מהמסע השלישי, ורק אם יש מטבעות. משלמים מראש.
      const walks = g.progress.walks || 0
      const wallet = g.progress.coins || 0
      const extra = !!ev.extra && walks >= WALK_PLAN.extraFromWalk && wallet >= WALK_PLAN.extraCost
      return {
        ...g,
        state: S.PERMISSIONS,
        notice: null,
        progress: extra ? { ...g.progress, coins: wallet - WALK_PLAN.extraCost } : g.progress,
        run: {
          kind,
          missionId: ev.missionId || null,
          day: ev.day,
          startedAt: ev.t,
          walkIndex: walks,
          wantCreatures: creaturesForWalk(walks, extra, ev.available),
          home: null, path: null, pos: null, lastFix: null, walkRef: null, stillRef: null,
          acc: null, walked: 0, along: 0,
          target: null, resolved: false,
          encounterMode: null, stillMs: 0,
          loot: [], coins: [], coinsTaken: 0, lastCoin: null,
        },
      }
    }

    case 'PERMISSION_GRANTED':
      return { ...g, state: S.ROUTE_BUILDING, run: { ...g.run, home: ev.home } }

    case 'PERMISSION_DENIED':
      // בלי מיקום אין משחק. זה השער היחיד שבאמת חוסם.
      return { ...g, state: S.BROKEN_WORLD, run: null, notice: 'no-location' }

    // ── המסלול מוכן, והתחנות איתו ──
    // כמה יצורים לאורך הדרך, קבועים מראש ומצוירים על המפה. היעד הראשון
    // ידוע מהצעד הראשון. (בלי stops — מסע ישן ששמור בטלפון — נשארים
    // בהתנהגות הקודמת: יעד אחד שנולד אחרי 60 מ'.)
    case 'ROUTE_READY': {
      // מי בדרך נקבע ב-START_RUN לפי הלוח: יצור אחד, או שניים אם שולם.
      const who = ev.creatures || g.run.wantCreatures || ['nimi']
      const stops = placeStops(ev.path, who.length, { creatures: who })
      const coins = placeCoins(ev.path, { stops })
      return {
        ...g,
        state: S.SEARCH,
        run: { ...g.run, path: ev.path, home: ev.home ?? g.run.home, stops, stop: 0,
          target: stops[0] || null, resolved: false, coins, coinsTaken: g.run.coinsTaken || 0 },
      }
    }

    // ── תפסנו אחד, ממשיכים לתחנה הבאה ──
    // אחרי האחרון — גם: חוזרים הביתה ברגל, והוא איתנו. מטבעות כפול.
    case 'CONTINUE':
      if (g.state !== S.CAUGHT) return g
      return { ...g, state: S.SEARCH, run: { ...g.run, stillMs: 0, encounterMode: null } }

    case 'ROUTE_FAILED':
      return { ...g, state: S.ROUTE_FAILED }

    case 'ROUTE_RETRY':
      if (g.state !== S.ROUTE_FAILED) return g
      return { ...g, state: S.ROUTE_BUILDING }

    // ── הדופק של המשחק ──
    case 'FIX': {
      if (g.state !== S.SEARCH || !g.run) return g
      const r = g.run
      const pos = { lat: ev.lat, lng: ev.lng }

      // נקודת הייחוס זזה רק כשהצעד נספר, אחרת הליכה רגילה — מטר וחצי בין
      // דגימה לדגימה — נופלת כולה מתחת לסף הרעש והמונה נשאר על אפס.
      const w = advanceWalk(r.walkRef, pos)
      const walked = r.walked + w.add

      // "עומד" נמדד כשהייה בתוך רדיוס, לא כהפרש בין שתי דגימות: בקצב
      // הליכה כל דגימה בודדת קטנה מהסף, וכל הליכה הייתה נספרת כעמידה.
      const dt = r.lastT ? Math.max(0, ev.t - r.lastT) : 0
      const drift = r.stillRef ? haversine(r.stillRef, pos) : 0
      const staying = r.stillRef && drift <= STILL_RADIUS
      const stillMs = staying ? r.stillMs + dt : 0
      const stillRef = staying ? r.stillRef : pos

      let target = r.target
      const along = r.path ? progressAlong(r.path, pos).along : 0

      // מסע ישן בלי תחנות: היעד נוצר אחרי שהילד יצא לדרך, קדימה על המסלול.
      if (!target && !r.stops && r.path && walked >= PLACE_AFTER) {
        target = placeTarget(r.path, along)
      }

      // ── מטבעות ──
      // עוברים דרך מטבע — הוא נאסף. הדף שומע את השינוי ב-coinsTaken ומצלצל.
      const cc = collectCoins(r.coins, pos)
      const coinsTaken = (r.coinsTaken || 0) + coinsValue(cc.got, r.resolved ? HOME_BONUS : 1)
      const lastCoin = cc.got.length ? { t: ev.t, gold: cc.got.some(c => c.gold), n: cc.got.length } : r.lastCoin

      return {
        ...g,
        run: { ...r, pos, lastFix: pos, walkRef: w.ref, stillRef, lastT: ev.t, acc: ev.acc ?? null, walked, along, target, stillMs,
          coins: cc.coins, coinsTaken, lastCoin },
      }
    }

    // ── resume אחרי שהילד סגר וזז ──
    // מצב הסיפור וכל מה שהושג נשמרים. המיקום נבדק מחדש, ואם הילד כבר
    // איפה שהוא — היעד עובר אליו במקום להחזיר אותו לאתמול.
    case 'RESUME': {
      if (!g.run || g.state !== S.SEARCH) return g
      const r = g.run
      const pos = { lat: ev.lat, lng: ev.lng }
      const v = revalidate({ path: r.path, target: r.target, pos })

      if (v.action === 'rebuild-route') {
        return { ...g, state: S.ROUTE_BUILDING, run: { ...r, home: pos, path: null, target: null, stops: null, pos, lastFix: pos, walkRef: pos, stillRef: pos, lastT: ev.t, stillMs: 0 } }
      }
      // תחנות קבועות לא זזות: אם עבר אותה — המפה מראה אותה מאחור, וחוזרים.
      const target = r.stops || v.action === 'keep' ? r.target : placeTarget(r.path, v.at)
      return {
        ...g,
        run: { ...r, pos, lastFix: pos, walkRef: pos, stillRef: pos, lastT: ev.t, acc: ev.acc ?? null, along: v.at, target, stillMs: 0 },
      }
    }

    // ── הילד עצר ולחץ "חפש אותו" ──
    case 'SEARCH_PRESSED': {
      const view = beaconView(g)
      if (!view.canSearch) return g
      return { ...g, state: S.ENCOUNTER, run: { ...g.run, encounterMode: null } }
    }

    case 'CAMERA_READY':
      return { ...g, run: { ...g.run, encounterMode: MODE.CAMERA } }

    // מצלמה נדחתה — לא מדלגים על המפגש. אותו controller, בלי פיד.
    case 'CAMERA_DENIED':
      return { ...g, run: { ...g.run, encounterMode: MODE.STORY } }

    case 'ENCOUNTER_RESOLVED': {
      if (g.state !== S.ENCOUNTER) return g
      if (!ev.caught) {
        // נכשל אינו "איבדת" — היצור עדיין שם, והחיפוש ממשיך.
        return { ...g, state: S.SEARCH, run: { ...g.run, stillMs: 0, encounterMode: null } }
      }
      const r = g.run
      if (!r.stops) return { ...g, state: S.CAUGHT, run: { ...r, resolved: true } }

      // תחנה נתפסה. יש עוד? היעד עובר לבאה, והמסע נמשך. אחרונה? הפורטל.
      const stops = r.stops.map((s, i) => (i === r.stop ? { ...s, done: true } : s))
      const next = r.stop + 1
      const more = next < stops.length
      return {
        ...g,
        state: S.CAUGHT,
        run: { ...r, stops, stop: more ? next : r.stop, target: more ? stops[next] : r.target,
          resolved: !more, stillMs: 0 },
      }
    }

    // ── קפצו למטבע הזהב ──
    case 'GOLD_TAKEN': {
      const r = g.run
      if (!r?.coins) return g
      const gold = r.coins.find(c => c.gold && !c.taken)
      if (!gold) return g
      const mult = r.resolved ? HOME_BONUS : 1
      return {
        ...g,
        run: {
          ...r,
          coins: r.coins.map(c => (c === gold ? { ...c, taken: true } : c)),
          coinsTaken: (r.coinsTaken || 0) + gold.value * mult,
          lastCoin: { t: ev.t ?? Date.now(), gold: true, n: 1, jump: ev.jump || null },
        },
      }
    }

    case 'PORTAL_OPEN':
      // הפורטל נפתח רק אחרי התחנה האחרונה — מיד, או בסוף הדרך הביתה.
      if (!(g.state === S.CAUGHT || g.state === S.SEARCH) || !g.run?.resolved) return g
      return { ...g, state: S.PORTAL }

    case 'PORTAL_ENTERED': {
      const r = g.run
      const isStory = r.kind === RUN.STORY
      // כל מי שנתפס בדרך נכנס לעולם — פעם אחת לכל סוג.
      const caughtIds = r.stops ? r.stops.filter(s => s.done).map(s => s.creature) : [r.creature]
      const creatures = [...g.progress.creatures]
      for (const id of caughtIds) if (id && !creatures.includes(id)) creatures.push(id)
      const res = { ...g.progress.res }
      for (const k of r.loot || []) res[k] = (res[k] || 0) + 1

      // ── הביצה בוקעת ──
      // רק אם הלכו מספיק כדי לחמם אותה. אחרת היא נשארת למסע הבא — לא
      // נשרפת, לא נמחקת. מי בוקע: מתוך מי שכבר נתפס (כולל היום).
      const progressWithToday = { ...g.progress, creatures }
      const warm = (r.walked || 0) >= HATCH_M
      const hatched = g.progress.egg && warm ? hatch(progressWithToday, ev.rng) : null
      const variants = hatched
        ? [...(g.progress.variants || []), { ...hatched, at: ev.t ?? null }]
        : g.progress.variants || []

      return {
        ...g,
        state: isStory ? S.CLUE : S.RUN_COMPLETE,
        hatched,
        progress: {
          ...g.progress,
          creatures,
          res,
          egg: hatched ? null : g.progress.egg,
          variants,
          coins: (g.progress.coins || 0) + (r.coinsTaken || 0),
          walks: (g.progress.walks || 0) + 1,
          // רק משימה סיפורית מקדמת את העולם ואת הביקון.
          missionsCompleted: isStory ? g.progress.missionsCompleted + 1 : g.progress.missionsCompleted,
          lastStoryDay: isStory ? r.day : g.progress.lastStoryDay,
          story: isStory && r.missionId
            ? { ...g.progress.story, [r.missionId]: 'done' }
            : g.progress.story,
        },
      }
    }

    case 'CLUE_SEEN':
      return { ...g, state: S.RUN_COMPLETE }

    case 'RUN_CLOSED':
      return { ...g, state: S.BROKEN_WORLD, run: null, hatched: null }

    // ── קונים ביצה ──
    // במסך הבית בלבד. מטבעות יורדים מיד; הביצה יושבת על הביקון עד המסע.
    case 'BUY_EGG': {
      if (g.state !== S.BROKEN_WORLD || !canBuyEgg(g.progress)) return g
      return {
        ...g,
        progress: { ...g.progress, coins: g.progress.coins - EGG_PRICE, egg: { boughtAt: ev.t ?? null } },
      }
    }

    case 'ABORT':
      // "לעצור" שומר הכל. אין עונש על לחזור הביתה — גם המטבעות שנאספו נשארים.
      return {
        ...g,
        state: S.ABORTED,
        progress: { ...g.progress, coins: (g.progress.coins || 0) + (g.run?.coinsTaken || 0) },
        run: { ...g.run, resolved: false, coinsTaken: 0 },
      }

    case 'SET_CREATURE':
      return { ...g, run: { ...g.run, creature: ev.id } }

    // ── עולם מהשרת ──
    // הילד נכנס עם הקוד שלו בטלפון אחר, או שהשרת מחזיק יותר ממה שיש כאן.
    // ממזגים — אף פעם לא דורסים — ורק בין מסעות, לא באמצע הליכה.
    case 'IMPORT_PROGRESS': {
      if (!ev.progress) return g
      if (g.state !== S.BROKEN_WORLD && g.run) return g
      return { ...g, progress: mergeProgress(g.progress, ev.progress) }
    }

    // ── שחקן אחר על אותו טלפון ──
    case 'RESET_WORLD':
      return { ...initial(), progress: ev.progress ? mergeProgress(initial().progress, ev.progress) : initial().progress }

    case 'ADD_LOOT':
      return { ...g, run: { ...g.run, loot: [...(g.run.loot || []), ev.kind] } }

    default:
      return g
  }
}

export function run(state, events) {
  return events.reduce(reduce, state)
}

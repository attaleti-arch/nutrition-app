// ─── מכונת המצבים ───
// טהורה: מקבלת מצב ואירוע, מחזירה מצב חדש. אין בתוכה GPS, אין React,
// אין localStorage ואין Date.now — כל אירוע נושא את הזמן שלו. זה מה
// שמאפשר להריץ מסע שלם בבדיקה אוטומטית בלי לצאת לרחוב, ולתקן באגים
// באמצע פיילוט של ארבעה־עשר יום בלי ללכת שוב ושוב.

import { haversine, bearing, advanceWalk, progressAlong } from './geo.js'
import { phaseOf, powerOf, POWER, PHASE, showsArrow, PHASE_COPY, SHORTCUT_COPY, STILL_MS, STILL_RADIUS } from './beacon.js'
import { placeTarget, revalidate, PLACE_AFTER, freshEnd } from './placement.js'
import { placeCoins, collectCoins, coinsValue, WALK_PLAN, creaturesForWalk, HOME_BONUS, CATCH_BONUS } from './coins.js'
import { mergeProgress } from './profile.js'
import { EGG_PRICE, HATCH_M, canBuyEgg, hatch, rollVariant } from './egg.js'
import { buy as buyItem, equip as equipItem } from './shop.js'
import { grantWeekly, walkSummary } from './weekly.js'
import { evolvedBetween } from './stages.js'
import { routeKm, poisFor, creatureCount, placePois, setRouteKm, withCreatures, POI } from './plan.js'
import { modsFor, consume, buyGear, withKeys, withExtra } from './gear.js'
import { buySkin, buyStone } from './skins.js'
import { withExtraGold, AVAILABLE, heatDistance } from './coins.js'
import { freshStreak, tickStreak, boosting, BOOST_COINS } from './streak.js'
import { setBuddy, addBond } from './buddy.js'
import { bringsFor, completeQuest, produce } from './world.js'
import { newlyEarned } from './badges.js'

// גובה קפיצה ממשך זמן באוויר: h = g·t²/8, בס"מ.
const jumpCm = airMs => (airMs ? Math.round((9.81 * (airMs / 1000) ** 2 / 8) * 100) : 0)

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
      quests: [],         // מזהי הבקשות של השומר שנסגרו — מה נבנה בעולם
      // ── מונים להישגים ── נצברים בפורטל, לא נמחקים אף פעם
      catches: 0, caught: {}, golds: 0, runs: 0, bestRun: 0, bestJumpCm: 0,
      metersTotal: 0, coinsEarned: 0, walkDays: [],
      // ── החנות ── מה נקנה, ומי לובש מה (ראה engine/shop.js)
      owned: [], wear: {},
      // ── בן לוויה ── מי יוצא איתך, וכמה מטרים הלכתם יחד (ראה engine/buddy.js)
      buddy: null, bond: {},
      routeKm: null,      // אורך המסלול שההורה בחר (ק"מ); null — הלוח
      look: {},           // { [creatureId]: 'base' | מזהה צבע } — המראה שנבחר בספר
      gear: [], items: {}, // ציוד למרדף: קבוע, וחד-פעמי עם כמות (ראה engine/gear.js)
      skins: {}, stones: {}, // סקינים שנקנו ליצור, ואבני צמיחה (ראה engine/skins.js)

      // ── הבונוס השבועי ── יום ראשון של השבוע שבו כבר ניתן (ראה engine/weekly.js)
      weeklyBonus: null,
      // ── להורה ── ההליכה האחרונה, ודקות בחוץ בסך הכול
      lastWalk: null, minutesTotal: 0,
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

  // ── המרחק הוא לאורך המסלול, לא קו אווירי ──
  // "המפה לא מכוונת אותי למסלול שנבנה — אני יכולה לדלג את הכל לסימן
  // שאלה." יצור שנמצא עשרים מטר מכאן באוויר, אבל שלוש מאות מטר בדרך
  // שנבנתה, עוד לא "כאן". המרחק הגדול מבין השניים הוא המרחק האמיתי,
  // והמסלול חוזר להיות המשחק.
  const straight = r.target && r.pos ? haversine(r.pos, r.target) : null
  const alongLeft = r.target?.along != null && r.along != null ? Math.max(0, r.target.along - r.along) : null
  const dist = heatDistance(straight, alongLeft)
  const phase = phaseOf({
    dist, acc: r.acc, walked: r.walked, stillMs: r.stillMs, resolved: r.resolved, active: true,
  })
  // עומדים ממש עליו באוויר, אבל המסלול עוד ארוך: קיצרו דרך. אומרים את זה
  // במילים של העולם, ולא משאירים ילד מול "הוא בכיוון הזה" כשהוא עליו.
  const shortcut = !r.resolved && straight != null && straight <= 60 && alongLeft != null && alongLeft > 120
  return {
    power,
    phase,
    ...(shortcut ? SHORTCUT_COPY : PHASE_COPY[phase]),
    shortcut,
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
      // תוכנית המסע: האורך שההורה בחר (או הלוח), ומה בדרך לפי האורך.
      const km = routeKm(g.progress, walks)
      const pois = poisFor(km, walks)
      // ציוד: הקבועים פעילים תמיד; החד-פעמיים נשרפים עכשיו ופעילים במסע הזה.
      const mods = modsFor(g.progress)
      const paid = extra ? { ...g.progress, coins: wallet - WALK_PLAN.extraCost } : g.progress
      const { progress: afterGear, used } = consume(paid)
      // מי בדרך: לפי הלוח; נעולים (בלי מפתח) מוחלפים; משרוקית מוסיפה אחד.
      const avail = ev.available || AVAILABLE
      const planned = creaturesForWalk(walks, extra, avail, creatureCount(pois))
      const keyed = withKeys(planned, g.progress, avail)
      const want = mods.extraStop ? withExtra(keyed.creatures, g.progress, avail, walks) : keyed.creatures
      return {
        ...g,
        state: S.PERMISSIONS,
        notice: null,
        progress: afterGear,
        run: {
          kind,
          missionId: ev.missionId || null,
          day: ev.day,
          startedAt: ev.t,
          walkIndex: walks,
          km, pois, mods, used, locked: keyed.locked,
          wantCreatures: want,
          home: null, path: null, pos: null, lastFix: null, walkRef: null, stillRef: null,
          acc: null, walked: 0, along: 0,
          streak: freshStreak(ev.t ?? null),      // רצף הליכה → דחף (ראה engine/streak.js)
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
      // נקודות העניין לפי התוכנית: היצור האחרון בערך באמצע, ואחריו עוד
      // נקודה לדרך חזרה. מסע ישן בלי תוכנית, יצור שלישי בתשלום, או בדיקה
      // שמזינה יצורים ישירות — התחנות לפי היצורים; מטבעות רק כשיש יצור
      // אחד (אחרת צפוף מדי).
      const kinds = g.run.pois && creatureCount(g.run.pois) === who.length ? g.run.pois
        : who.length === 1 ? [POI.RUN, POI.CREATURE, POI.GOLD]
        : g.run.pois ? withCreatures(g.run.pois, who.length - creatureCount(g.run.pois))
        : who.map(() => POI.CREATURE)
      const plan = placePois(ev.path, kinds, { creatures: who, freshEndM: freshEnd(ev.path) })
      const stops = plan.stops
      let coins = placeCoins(ev.path, { stops, goldAlong: plan.goldAlong })
      // מפת אוצר: עוד זהב, בחלק השני של הדרך
      if (g.run.mods?.extraGold) coins = withExtraGold(coins, ev.path)
      const coinRun = plan.coinRun
      const flowerRun = plan.flowerRun
      return {
        ...g,
        state: S.SEARCH,
        run: { ...g.run, path: ev.path, home: ev.home ?? g.run.home, stops, stop: 0,
          target: stops[0] || null, resolved: false, coins, coinRun, flowerRun, coinsTaken: g.run.coinsTaken || 0,
          walkStartedAt: ev.t ?? g.run.walkStartedAt ?? null },
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
      // עם המיקום הקודם לאורך: במסלול שחוזר באותו רחוב, זה מה שמבדיל
      // בין הדרך החוצה לדרך חזרה.
      // ── ההתקדמות לא יכולה לקפוץ ──
      // ההטלה על המסלול לבדה נותנת את כל הדרך במתנה למי שחתך דרך מגרש
      // ונחת על התחנה. הסימן על המסלול זז קדימה לכל היותר כמו שבאמת
      // הלכנו בין שתי דגימות (ועוד שלושה מטרים לרעש GPS). אחורה — חופשי.
      const cand = r.path ? progressAlong(r.path, pos, r.along ?? 0).along : 0
      const prevAlong = r.along ?? 0
      const maxStep = r.lastFix ? haversine(r.lastFix, pos) + 3 : Infinity
      const along = cand > prevAlong ? Math.min(cand, prevAlong + maxStep) : cand

      // מסע ישן בלי תחנות: היעד נוצר אחרי שהילד יצא לדרך, קדימה על המסלול.
      if (!target && !r.stops && r.path && walked >= PLACE_AFTER) {
        target = placeTarget(r.path, along)
      }

      // ── רצף הליכה ── ארבע דקות בלי לעצור = דחף: מטבעות כפולים לדקתיים.
      const streak = tickStreak(r.streak, { moved: w.add > 0, t: ev.t })
      const boost = boosting(streak, ev.t)

      // ── מטבעות ──
      // עוברים דרך מטבע — הוא נאסף. הדף שומע את השינוי ב-coinsTaken ומצלצל.
      const cc = collectCoins(r.coins, pos, r.mods?.coinRadius ?? undefined, along)   // מגנט: רדיוס כפול
      // כפול בדרך הביתה, כפול בדחף — לא פי ארבע. המקסימום מהשניים.
      const coinsTaken = (r.coinsTaken || 0) + coinsValue(cc.got, Math.max(r.resolved ? HOME_BONUS : 1, boost ? BOOST_COINS : 1))
      const lastCoin = cc.got.length ? { t: ev.t, gold: cc.got.some(c => c.gold), n: cc.got.length, boost } : r.lastCoin

      return {
        ...g,
        run: { ...r, pos, lastFix: pos, walkRef: w.ref, stillRef, lastT: ev.t, acc: ev.acc ?? null, walked, along, target, stillMs,
          coins: cc.coins, coinsTaken, lastCoin, streak },
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
      // תפיסה שווה מטבעות — והמסך אחריה סופר אותם אחד-אחד.
      const bonus = { coinsTaken: (r.coinsTaken || 0) + CATCH_BONUS, catchBonus: CATCH_BONUS }
      if (!r.stops) return { ...g, state: S.CAUGHT, run: { ...r, ...bonus, resolved: true } }

      // תחנה נתפסה. יש עוד? היעד עובר לבאה, והמסע נמשך. אחרונה? הפורטל.
      const stops = r.stops.map((s, i) => (i === r.stop ? { ...s, done: true } : s))
      const next = r.stop + 1
      const more = next < stops.length
      return {
        ...g,
        state: S.CAUGHT,
        run: { ...r, ...bonus, stops, stop: more ? next : r.stop, target: more ? stops[next] : r.target,
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
          goldJumpMs: Math.max(r.goldJumpMs || 0, ev.jump?.airMs || 0),
        },
      }
    }

    // ── ריצת הפרחים נגמרה ──
    // כל פרח שנאסף: פרח הביתה (משאב), ומטבע אחד — "כמו מטבעות".
    case 'FLOWER_RUN_DONE': {
      const r = g.run
      if (!r?.flowerRun || r.flowerRun.done) return g
      const got = Math.max(0, ev.got || 0)
      return {
        ...g,
        run: {
          ...r,
          flowerRun: { ...r.flowerRun, done: true, got },
          coinsTaken: (r.coinsTaken || 0) + got,
          lastCoin: got ? { t: ev.t ?? Date.now(), gold: false, n: got, run: true, flowers: true } : r.lastCoin,
        },
      }
    }

    // ── ריצת המטבעות נגמרה ──
    // מה שנאסף בריצה נכנס למונה (כפול בדרך הביתה), והנקודה נסגרת.
    case 'COIN_RUN_DONE': {
      const r = g.run
      if (!r?.coinRun || r.coinRun.done) return g
      const mult = r.resolved ? HOME_BONUS : 1
      const got = Math.max(0, ev.got || 0)
      return {
        ...g,
        run: {
          ...r,
          coinRun: { ...r.coinRun, done: true, got },
          coinsTaken: (r.coinsTaken || 0) + got * mult,
          lastCoin: got ? { t: ev.t ?? Date.now(), gold: false, n: got, run: true } : r.lastCoin,
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
      // כל יצור שנתפס מביא הביתה את מה שהוא מביא: דבש, אבן, מים…
      // גם בפעם השנייה — זה מה שהשומר מבקש, וזו הסיבה לצאת שוב.
      for (const [k, n] of Object.entries(bringsFor(caughtIds))) res[k] = (res[k] || 0) + n

      // ── הביצה בוקעת ──
      // רק אם הלכו מספיק כדי לחמם אותה. אחרת היא נשארת למסע הבא — לא
      // נשרפת, לא נמחקת. מי בוקע: מתוך מי שכבר נתפס (כולל היום).
      const progressWithToday = { ...g.progress, creatures }
      const warm = (r.walked || 0) >= HATCH_M
      const eggHatched = g.progress.egg && warm ? hatch(progressWithToday, ev.rng) : null
      // משרוקית זהב: היצור הראשון שנתפס היום מגיע בצבע, בלי ביצה.
      const whistled = r.mods?.colorNext && caughtIds[0]
        ? { creature: caughtIds[0], variant: rollVariant(ev.rng || Math.random).id, source: 'whistle' } : null
      const hatched = eggHatched || whistled
      const variants = [...(g.progress.variants || []),
        ...(eggHatched ? [{ ...eggHatched, at: ev.t ?? null }] : []),
        ...(whistled ? [{ creature: whistled.creature, variant: whistled.variant, at: ev.t ?? null, source: 'whistle' }] : [])]

      // ── מונים להישגים ──
      const caught = { ...(g.progress.caught || {}) }
      for (const id of caughtIds) if (id) caught[id] = (caught[id] || 0) + 1
      // מבנים שעובדים (7 מאותו יצור) מייצרים בכל מסע: הכוורת — דבש.
      const made = produce({ caught }).made
      for (const m of made) res[m.product] = (res[m.product] || 0) + 1
      // פרחים מהריצה: הביתה, כמשאב.
      if (r.flowerRun?.done && r.flowerRun.got) res.flowers = (res.flowers || 0) + r.flowerRun.got
      const goldTaken = (r.coins || []).some(c => c.gold && c.taken) ? 1 : 0
      const runDone = r.coinRun?.done ? 1 : 0
      const walkDays = [...(g.progress.walkDays || [])]
      if (r.day && !walkDays.includes(r.day)) walkDays.push(r.day)
      // ── להורה ── מרחק, דקות, צעדים משוערים של ההליכה הזאת
      const lastWalk = { ...walkSummary({ walked: r.walked, startedAt: r.walkStartedAt, t: ev.t }), day: r.day || null }
      // בן הלוויה: המטרים של היום נזקפים לו (כל 2 ק"מ = תפיסה להתפתחות).
      const withBond = addBond(g.progress, r.walked)
      const progress0 = {
          ...withBond,
          creatures,
          res,
          egg: hatched ? null : g.progress.egg,
          variants,
          coins: (g.progress.coins || 0) + (r.coinsTaken || 0),
          walks: (g.progress.walks || 0) + 1,
          catches: (g.progress.catches || 0) + caughtIds.filter(Boolean).length,
          caught,
          golds: (g.progress.golds || 0) + goldTaken,
          runs: (g.progress.runs || 0) + runDone,
          bestRun: Math.max(g.progress.bestRun || 0, r.coinRun?.got || 0),
          bestJumpCm: Math.max(g.progress.bestJumpCm || 0, jumpCm(r.goldJumpMs)),
          metersTotal: (g.progress.metersTotal || 0) + Math.round(r.walked || 0),
          coinsEarned: (g.progress.coinsEarned || 0) + (r.coinsTaken || 0),
          walkDays: walkDays.slice(-60),
          lastWalk,
          minutesTotal: (g.progress.minutesTotal || 0) + lastWalk.minutes,
          // רק משימה סיפורית מקדמת את העולם ואת הביקון.
          missionsCompleted: isStory ? g.progress.missionsCompleted + 1 : g.progress.missionsCompleted,
          lastStoryDay: isStory ? r.day : g.progress.lastStoryDay,
          story: isStory && r.missionId
            ? { ...g.progress.story, [r.missionId]: 'done' }
            : g.progress.story,
      }
      // ── הבונוס השבועי ── שלושה מסעות השבוע: ביצה, או מטבעות אם כבר יש ביצה.
      const weekly = r.day ? grantWeekly(progress0, r.day, ev.t ?? null) : { progress: progress0, gift: null }
      const progress = weekly.progress

      return {
        ...g,
        state: isStory ? S.CLUE : S.RUN_COMPLETE,
        hatched,
        // מה נפתח במסע הזה — למסך הסיום. נמחק ב-RUN_CLOSED, כמו hatched.
        newBadges: newlyEarned(g.progress, progress),
        weeklyGift: weekly.gift,
        // מי גדל במסע הזה (3 תפיסות = בוגר, 7 = אגדי) — למסך ההתפתחות.
        evolved: evolvedBetween(g.progress, progress),
        made,       // מה המבנים ייצרו היום — למסך הסיום
        progress,
      }
    }

    case 'CLUE_SEEN':
      return { ...g, state: S.RUN_COMPLETE }

    case 'RUN_CLOSED':
      return { ...g, state: S.BROKEN_WORLD, run: null, hatched: null, newBadges: null, weeklyGift: null, evolved: null, made: null }

    // ── החנות ──
    // במסך הבית בלבד. קנייה מורידה מטבעות; לבישה חופשית על מה שנקנה.
    case 'BUY_ITEM': {
      if (g.state !== S.BROKEN_WORLD) return g
      let progress = buyItem(g.progress, ev.id)
      if (progress === g.progress) return g
      // קנו בשביל מישהו? הוא לובש מיד.
      if (ev.who && ev.slot) progress = equipItem(progress, ev.who, ev.slot, ev.id)
      return { ...g, progress }
    }
    // ── סקינים ואבן צמיחה ── ליצור מסוים. בבית בלבד.
    case 'BUY_SKIN': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = buySkin(g.progress, ev.creature, ev.skin)
      return progress === g.progress ? g : { ...g, progress }
    }
    case 'BUY_STONE': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = buyStone(g.progress, ev.creature)
      if (progress === g.progress) return g
      // אבן שמגדילה עכשיו — מסך ההתפתחות, כמו בפורטל
      const evolved = evolvedBetween(g.progress, progress)
      return { ...g, progress, evolved: evolved.length ? evolved : g.evolved || null }
    }
    // ── ציוד ── כלים למרדף. בבית בלבד; מטבעות יורדים מיד.
    case 'BUY_GEAR': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = buyGear(g.progress, ev.id, ev.pay || 'coins')
      return progress === g.progress ? g : { ...g, progress }
    }
    // ── המראה ── צבע מהביצה עם דמות משלו, או הרגיל. בבית בלבד.
    case 'SET_LOOK': {
      if (g.state !== S.BROKEN_WORLD || !ev.id) return g
      const look = { ...(g.progress.look || {}) }
      if (ev.look == null) delete look[ev.id]; else look[ev.id] = ev.look
      return { ...g, progress: { ...g.progress, look } }
    }
    // ── אורך המסלול ── ההורה בוחר קילומטרים. בבית בלבד.
    case 'SET_ROUTE_KM': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = setRouteKm(g.progress, ev.km)
      return progress === g.progress ? g : { ...g, progress }
    }
    // ── בן לוויה ── מי יוצא איתך. בבית בלבד; רק מי שנתפס.
    case 'SET_BUDDY': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = setBuddy(g.progress, ev.id ?? null)
      return progress === g.progress ? g : { ...g, progress }
    }
    case 'EQUIP': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = equipItem(g.progress, ev.who, ev.slot, ev.id ?? null)
      return progress === g.progress ? g : { ...g, progress }
    }

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
      // גם מה שהלכו נספר — להורה, ולמטרים.
      const aborted = g.run ? { ...walkSummary({ walked: g.run.walked, startedAt: g.run.walkStartedAt, t: ev.t }), day: g.run.day || null } : null
      return {
        ...g,
        state: S.ABORTED,
        progress: {
          ...addBond(g.progress, g.run?.walked),
          coins: (g.progress.coins || 0) + (g.run?.coinsTaken || 0),
          ...(aborted ? { lastWalk: aborted, minutesTotal: (g.progress.minutesTotal || 0) + aborted.minutes, metersTotal: (g.progress.metersTotal || 0) + aborted.meters } : {}),
        },
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

    // ── נותנים לשומר ──
    // בעולם הבית בלבד. המשאבים יורדים, הבקשה נסגרת, משהו בעולם נבנה.
    case 'COMPLETE_QUEST': {
      if (g.state !== S.BROKEN_WORLD) return g
      const progress = completeQuest(g.progress, ev.id)
      return progress === g.progress ? g : { ...g, progress }
    }

    default:
      return g
  }
}

export function run(state, events) {
  return events.reduce(reduce, state)
}

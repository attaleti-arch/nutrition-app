// ─── בדיקות המנוע ───
// כל מסע 1 רץ כאן מקצה לקצה בלי GPS, בלי דפדפן ובלי ללכת ברגל.
// זו הסיבה שהמכונה נכתבה טהורה: פיילוט של ארבעה־עשר יום ידרוש תיקונים
// תוך כדי, ואי אפשר לבדוק כל תיקון בהליכה של חצי שעה בשכונה.
//
//   node --test tests/

import test from 'node:test'
import assert from 'node:assert/strict'

import { destination, haversine, stepBetween, progressAlong } from '../src/app/wilden/engine/geo.js'
import { phaseOf, powerOf, PHASE, ACC_GATE, ACC_DIRECTION, WALK_GATE, STILL_MS, STILL_RADIUS } from '../src/app/wilden/engine/beacon.js'
import { initial, reduce, run, beaconView, S, RUN, MODE, canStartStory } from '../src/app/wilden/engine/machine.js'
import { forServer } from '../src/app/wilden/engine/persist.js'
import { revalidate, PLACE_AFTER } from '../src/app/wilden/engine/placement.js'
import { STRUCTURE, GUARDIAN_STATE, affordanceOf, isEnterable, KRAAG_AWAKENS } from '../src/app/wilden/content/canon.js'
import nimi from '../src/app/wilden/ar/controllers/nimi.js'
import dabashon from '../src/app/wilden/ar/controllers/dabashon.js'
import { loopTargetM, canBuyExtra, WALK_PLAN, goldNearby } from '../src/app/wilden/engine/coins.js'
import { createJumpDetector, jumpHeightCm, G } from '../src/app/wilden/engine/jump.js'
import { buildLoop, fallbackLoop, normalize, routeNote } from '../src/app/wilden/engine/loop.js'
import { routeArrows, splitAt } from '../src/app/wilden/engine/mapLines.js'
import { getCached, putCached } from '../src/app/wilden/engine/routeCache.js'

const HOME = { lat: 32.0853, lng: 34.7818 }
const DAY = '2026-09-06'

// מסלול סינתטי: קו ישר צפונה, נקודה כל 20 מ', באורך 1.2 ק"מ.
const PATH = Array.from({ length: 61 }, (_, i) => destination(HOME, 0, i * 20))

// הולך לאורך המסלול ומזין FIX-ים. מחזיר את המצב אחרי ההליכה.
function walk(g, meters, { acc = 10, stepM = 15, t0 = 1000 } = {}) {
  let t = t0
  for (let d = stepM; d <= meters; d += stepM) {
    const p = destination(HOME, 0, d)
    g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc, t })
    t += 10000
  }
  return g
}

// creatures: מי בדרך. ברירת המחדל (בלי) — לפי הלוח: מסע ראשון, נימי לבד.
function started(creatures, g0) {
  let g = g0 || initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: PATH, home: HOME, creatures })
  g = reduce(g, { type: 'SET_CREATURE', id: 'nimi' })
  return g
}
const THREE = ['nimi', 'dabashon', 'nimi']

// ══════════════════════════════════════════════
test('גאומטריה: סינון קפיצות GPS', () => {
  const a = HOME
  assert.equal(stepBetween(null, a), 0, 'הדגימה הראשונה לא סופרת מרחק')
  assert.equal(stepBetween(a, destination(a, 0, 2)), 0, 'שני מטר הוא רעש של המקלט, לא צעד')
  assert.ok(stepBetween(a, destination(a, 0, 15)) > 14, 'חמישה־עשר מטר כן נספרים')
  assert.equal(stepBetween(a, destination(a, 0, 400)), 0, 'קפיצה של 400 מ׳ אינה הליכה')
})

test('גאומטריה: איפה אני על המסלול', () => {
  const at = destination(HOME, 0, 300)
  const r = progressAlong(PATH, at)
  assert.ok(Math.abs(r.along - 300) < 15, `צריך להיות ~300 מ׳ לאורך, התקבל ${r.along.toFixed(0)}`)
  assert.ok(r.offPath < 5, 'על המסלול עצמו')

  const off = destination(destination(HOME, 0, 300), 90, 200)
  assert.ok(progressAlong(PATH, off).offPath > 150, 'מאתיים מטר הצידה = מחוץ למסלול')
})

// ══════════════════════════════════════════════
test('ביקון: הדרגות עולות לאורך עולם 1 ולא יורדות', () => {
  assert.equal(powerOf(0), 'DORMANT')
  assert.equal(powerOf(1), 'REACTIVE', 'מסע 1 כבר מדליק אותו')
  assert.equal(powerOf(5), 'ACTIVE')
  assert.equal(powerOf(9), 'FULL_POWER')
  assert.equal(powerOf(10), 'FULL_POWER')
})

test('ביקון: שני השערים שנכתבו בעקבות באג אמיתי', () => {
  const base = { dist: 20, acc: 5, walked: 500, stillMs: 0, resolved: false }

  assert.equal(phaseOf(base), PHASE.VERY_CLOSE)

  assert.equal(
    phaseOf({ ...base, walked: WALK_GATE - 1 }), PHASE.SIGNAL_WEAK,
    'בלי הליכה — הביקון לא מתקדם, גם אם היעד מטר משם'
  )
  // דיוק גרוע מקשיח, לא מרפה. זה הבאג של "שני יצורים בלי צעד".
  // אבל סף יחיד הקפיא את המשחק לגמרי ברחוב עירוני, ולכן יש שניים:
  assert.equal(
    phaseOf({ ...base, acc: ACC_DIRECTION + 1 }), PHASE.SIGNAL_WEAK,
    'דיוק גרוע באמת — שום דבר לא זז'
  )
  assert.equal(
    phaseOf({ ...base, acc: ACC_GATE + 5 }), PHASE.TRACE,
    'דיוק בינוני — מותר לומר "עקבות טריים", אסור לומר "הוא כאן"'
  )
  assert.equal(
    phaseOf({ ...base, acc: ACC_GATE + 5, stillMs: STILL_MS * 3 }), PHASE.TRACE,
    'וגם עמידה ארוכה לא פותחת מצלמה בדיוק בינוני — שם טעות שולחת ילד לפינה הלא נכונה'
  )
})

test('ביקון: דיוק אפס הוא מצוין, לא חסר', () => {
  // acc === 0 הוא falsy. בקוד הקודם זה חסם תפיסה לנצח.
  const p = phaseOf({ dist: 20, acc: 0, walked: 500, stillMs: 0, resolved: false })
  assert.equal(p, PHASE.VERY_CLOSE)
})

test('ביקון: SAFE_STOP דורש לעמוד במקום', () => {
  const near = { dist: 20, acc: 5, walked: 500, resolved: false }
  assert.equal(phaseOf({ ...near, stillMs: 0 }), PHASE.VERY_CLOSE, 'תוך כדי הליכה — לא נפתח')
  assert.equal(phaseOf({ ...near, stillMs: STILL_MS }), PHASE.SAFE_STOP, 'אחרי עצירה — נפתח')
})

test('ביקון: השלבים מדורגים לפי מרחק', () => {
  const b = { acc: 5, walked: 500, stillMs: 0, resolved: false }
  assert.equal(phaseOf({ ...b, dist: 600 }), PHASE.SIGNAL_WEAK)
  assert.equal(phaseOf({ ...b, dist: 200 }), PHASE.DIRECTION)
  assert.equal(phaseOf({ ...b, dist: 80 }), PHASE.TRACE)
  assert.equal(phaseOf({ ...b, dist: 20 }), PHASE.VERY_CLOSE)
})

// ══════════════════════════════════════════════
test('תחנות: כמה יצורים לאורך המסלול, קבועים מהצעד הראשון', () => {
  const g = started(THREE)
  assert.equal(g.run.stops.length, 3, 'שלוש תחנות על 1.2 ק"מ')
  assert.deepEqual(g.run.target, g.run.stops[0], 'היעד הראשון ידוע מיד — יש לאן ללכת')
  const total = 60 * 20
  let prev = 0
  for (const s of g.run.stops) {
    assert.ok(progressAlong(PATH, s).offPath < 5, 'על המסלול המאומת, לא מאחורי גדר')
    assert.ok(s.along >= 150 && s.along <= total - 150, 'מרווח מהבית בהתחלה ובסוף')
    assert.ok(s.along - prev >= 200, 'לפחות 200 מ׳ בין תחנות')
    prev = s.along
  }
})

test('תחנות: היצור בסוף, לא באמצע — רוב ההליכה לפני התפיסה', () => {
  const one = started()
  const total = 60 * 20
  assert.equal(one.run.stops.length, 1)
  assert.ok(one.run.stops[0].along / total >= 0.7, `יצור יחיד ב-~80% מהדרך, התקבל ${(one.run.stops[0].along / total).toFixed(2)}`)
  const two = started(['nimi', 'dabashon'])
  assert.ok(two.run.stops[1].along / total >= 0.75, 'השני עדיין לקראת הסוף')
  assert.ok(two.run.stops[0].along / total >= 0.4, 'והראשון לא ליד הבית')
})

// ══════════════════════════════════════════════
// קפיצה: מד התאוצה רואה דחיפה, ריחוף, נחיתה. נענוע יד — לא.
function feedSeq(det, seq, dt = 20) {
  let t = 1000, out = null
  for (const gval of seq) { const r = det.feed({ t, a: gval * G }); if (r) out = r; t += dt }
  return out
}
test('קפיצה: דחיפה, ריחוף, נחיתה — מזוהה', () => {
  const det = createJumpDetector()
  // 1g רגיל → דחיפה 2g (80מ"ש) → ריחוף 0.2g (240מ"ש) → נחיתה 2.4g
  const seq = [1, 1, 1, 2.0, 2.1, 2.0, 1.9, 0.3, 0.2, 0.15, 0.2, 0.2, 0.25, 0.2, 0.3, 0.2, 0.25, 0.2, 0.3, 2.4, 1.8, 1, 1]
  const r = feedSeq(det, seq)
  assert.ok(r, 'זוהתה קפיצה')
  assert.ok(r.airMs >= 200 && r.airMs <= 280, `ריחוף של ~240 מ"ש, התקבל ${r.airMs}`)
  assert.ok(jumpHeightCm(r.airMs) >= 5 && jumpHeightCm(r.airMs) <= 12, 'גובה סביר לילד')
})
test('קפיצה: נענוע יד — דחיפות ומכות בלי חוסר משקל — לא מזוהה', () => {
  const det = createJumpDetector()
  const seq = [1, 2.2, 1.6, 0.9, 2.5, 1.2, 0.8, 2.1, 1.1, 0.9, 2.3, 1, 1]
  assert.equal(feedSeq(det, seq), null)
})
test('קפיצה: ריחוף קצר מדי (צעד) — לא מזוהה', () => {
  const det = createJumpDetector()
  const seq = [1, 1.8, 1.9, 0.3, 0.3, 1.9, 1, 1]       // 40מ"ש באוויר
  assert.equal(feedSeq(det, seq), null)
})
test('קפיצה: כשמזהים — הזהב נלקח, ולא נאסף סתם במעבר', () => {
  let g = started()
  const gold = g.run.coins.find(c => c.gold)
  g = reduce(g, { type: 'FIX', lat: gold.lat, lng: gold.lng, acc: 6, t: 5000 })
  assert.equal(g.run.coins.find(c => c.gold).taken, false, 'עוברים ליד הזהב — הוא נשאר')
  assert.ok(goldNearby(g.run.coins, g.run.pos), 'אבל המשחק יודע שאנחנו לידו')
  g = reduce(g, { type: 'GOLD_TAKEN', t: 6000, jump: { airMs: 240 } })
  assert.equal(g.run.coins.find(c => c.gold).taken, true)
  assert.equal(g.run.coinsTaken, 10)
  assert.equal(g.run.lastCoin.gold, true)
  assert.equal(reduce(g, { type: 'GOLD_TAKEN', t: 7000 }).run.coinsTaken, 10, 'פעם אחת בלבד')
})

test('הדרך הביתה שווה כפול', () => {
  let g = started()
  g = walk(g, 100)
  const before = g.run.coinsTaken
  g = { ...g, run: { ...g.run, resolved: true } }        // אחרי התפיסה האחרונה
  g = walk(g, 300, { t0: 999000 })
  const gained = g.run.coinsTaken - before
  const taken = g.run.coins.filter(c => c.taken && c.along > 100 && c.along <= 300 && !c.gold).length
  assert.ok(gained >= taken * 2, `${taken} מטבעות בדרך הביתה שווים לפחות ${taken * 2}, התקבל ${gained}`)
})

test('תחנות: מסלול קצר מקבל פחות תחנות, לא תחנות צפופות', () => {
  const short = Array.from({ length: 21 }, (_, i) => destination(HOME, 0, i * 20))   // 400 מ'
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: short, home: HOME })
  assert.equal(g.run.stops.length, 1)
})

test('מסע ישן בלי תחנות: היעד נוצר קדימה אחרי שיוצאים', () => {
  let g = started()
  g = { ...g, run: { ...g.run, stops: null, target: null } }
  g = walk(g, PLACE_AFTER - 20)
  assert.equal(g.run.target, null, 'עדיין לא הלכו מספיק')
  g = walk(g, 200)
  assert.ok(g.run.target, 'אחרי הליכה — היעד נוצר')
  assert.ok(g.run.target.along > g.run.along, 'והוא קדימה, לא מאחור')
})

// ══════════════════════════════════════════════
test('resume: הילד עבר תחנה — היא לא זזה, המפה מראה אותה מאחור', () => {
  let g = started()
  g = walk(g, 200)
  const before = g.run.target

  // סגר את הטלפון, ופתח אותו 700 מ׳ הלאה — כבר עבר את התחנה הראשונה.
  const elsewhere = destination(HOME, 0, 700)
  g = reduce(g, { type: 'RESUME', lat: elsewhere.lat, lng: elsewhere.lng, acc: 10, t: 900000 })

  assert.equal(g.state, S.SEARCH, 'עדיין באותו מסע')
  assert.deepEqual(g.run.target, before, 'תחנה היא יעד קבוע, כמו בגוגל')
  assert.ok(g.run.along > 650, 'אבל המנוע יודע איפה הוא עכשיו')
})

test('resume: רחוק מהמסלול — בונים מסלול חדש ושומרים את הסיפור', () => {
  let g = started()
  g = walk(g, 200)
  g.progress.creatures = ['nimi']

  const farAway = destination(HOME, 90, 3000)
  g = reduce(g, { type: 'RESUME', lat: farAway.lat, lng: farAway.lng, acc: 10, t: 900000 })

  assert.equal(g.state, S.ROUTE_BUILDING, 'מסלול חדש סביב המקום הנוכחי')
  assert.deepEqual(g.progress.creatures, ['nimi'], 'ומה שכבר הושג נשמר')
  assert.equal(g.run.missionId, 'm01', 'ומצב הסיפור נשמר')
})

test('resume: עדיין באמצע הדרך — לא נוגעים ביעד', () => {
  let g = started()
  g = walk(g, 200)
  const before = g.run.target
  const here = destination(HOME, 0, 210)
  g = reduce(g, { type: 'RESUME', lat: here.lat, lng: here.lng, acc: 10, t: 900000 })
  assert.deepEqual(g.run.target, before, 'אין סיבה להזיז יעד שעוד לא הגיעו אליו')
})

// ══════════════════════════════════════════════
test('מצלמה נדחתה: המפגש קורה בכל זאת, והיצור לא מתקבל בחינם', () => {
  let g = started()
  g = walk(g, 200)

  // מגיעים ליעד ועוצרים
  const at = g.run.target
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 500000 })
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 505000 })
  assert.equal(beaconView(g).phase, PHASE.SAFE_STOP)

  g = reduce(g, { type: 'SEARCH_PRESSED' })
  assert.equal(g.state, S.ENCOUNTER)

  g = reduce(g, { type: 'CAMERA_DENIED' })
  assert.equal(g.run.encounterMode, MODE.STORY, 'עוברים ל-Story Encounter Mode')
  assert.equal(g.state, S.ENCOUNTER, 'ועדיין בתוך המפגש — לא דילגנו עליו')
  assert.equal(g.run.resolved, false, 'היצור לא התקבל אוטומטית')

  // וגם כאן אפשר להיכשל
  g = reduce(g, { type: 'ENCOUNTER_RESOLVED', caught:false })
  assert.equal(g.state, S.SEARCH, 'כישלון מחזיר לחיפוש, לא מוחק כלום')
})

test('לא לוחצים "חפש" לפני שעוצרים', () => {
  let g = started()
  g = walk(g, 200)
  const before = g.state
  g = reduce(g, { type: 'SEARCH_PRESSED' })
  assert.equal(g.state, before, 'תוך כדי הליכה הכפתור לא עושה כלום')
})

// ══════════════════════════════════════════════
// מגיע לתחנה הנוכחית, עוצר, ותופס.
function catchHere(g, t0) {
  const at = g.run.target
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: t0 })
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: t0 + 5000 })
  assert.equal(beaconView(g).phase, PHASE.SAFE_STOP, 'עצר ליד התחנה')
  return run(g, [{ type: 'SEARCH_PRESSED' }, { type: 'CAMERA_READY' }, { type: 'ENCOUNTER_RESOLVED', caught: true }])
}

test('מסע 1 מקצה לקצה: שלוש תחנות, ואז הפורטל', () => {
  let g = started(THREE)
  g = walk(g, 200)

  g = catchHere(g, 500000)
  assert.equal(g.state, S.CAUGHT)
  assert.equal(g.run.resolved, false, 'יש עוד תחנות — המסע לא נגמר')
  assert.equal(g.run.stops[0].done, true)
  assert.deepEqual(g.run.target, g.run.stops[1], 'היעד עבר לתחנה הבאה')
  assert.equal(reduce(g, { type: 'PORTAL_OPEN' }).state, S.CAUGHT, 'אין פורטל באמצע')

  g = reduce(g, { type: 'CONTINUE' })
  assert.equal(g.state, S.SEARCH, 'ממשיכים בדרך')
  g = catchHere(g, 600000)
  g = reduce(g, { type: 'CONTINUE' })
  g = catchHere(g, 700000)
  assert.equal(g.run.resolved, true, 'התחנה האחרונה — המסע הושלם')
  const home = reduce(g, { type: 'CONTINUE' })
  assert.equal(home.state, S.SEARCH, 'אפשר לחזור הביתה ברגל, והוא איתנו')
  assert.equal(reduce(home, { type: 'PORTAL_OPEN' }).state, S.PORTAL, 'והפורטל נפתח גם מהדרך')

  g = run(g, [
    { type: 'ADD_LOOT', kind: 'wood' },
    { type: 'PORTAL_OPEN' },
    { type: 'PORTAL_ENTERED' },
  ])

  assert.equal(g.state, S.CLUE, 'משימה סיפורית נגמרת ברמז, לא במסך ניצחון')
  assert.deepEqual(g.progress.creatures, ['nimi', 'dabashon'], 'כל מי שנתפס בדרך, פעם אחת לכל סוג')
  assert.equal(g.progress.walks, 1, 'מסלול אחד הושלם')
  assert.ok(g.progress.coins > 0, 'המטבעות שנאספו בדרך נכנסו לארנק')
  assert.equal(g.progress.res.wood, 1)
  assert.equal(g.progress.missionsCompleted, 1)
  assert.equal(g.progress.story.m01, 'done')
  assert.equal(beaconView(g).power, 'REACTIVE', 'הביקון התחזק')

  g = reduce(g, { type: 'CLUE_SEEN' })
  assert.equal(g.state, S.RUN_COMPLETE)
})

// ══════════════════════════════════════════════
test('משימה סיפורית אחת ביום — אבל אין נעילה של יציאה נוספת', () => {
  let g = started(THREE)
  g = walk(g, 200)
  g = catchHere(g, 500000); g = reduce(g, { type: 'CONTINUE' })
  g = catchHere(g, 600000); g = reduce(g, { type: 'CONTINUE' })
  g = catchHere(g, 700000)
  g = run(g, [
    { type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' },
    { type: 'CLUE_SEEN' }, { type: 'RUN_CLOSED' },
  ])

  assert.equal(canStartStory(g.progress, DAY), false, 'עלילה נוספת — מחר')

  // אבל ילד שמתלהב ורוצה לצאת שוב בערב יוצא.
  const free = reduce(g, { type: 'START_RUN', kind: RUN.FREE, day: DAY, t: 999 })
  assert.equal(free.state, S.PERMISSIONS, 'צא לחקור — תמיד פתוח')
  assert.equal(free.run.kind, RUN.FREE)

  const blocked = reduce(g, { type: 'START_RUN', kind: RUN.STORY, day: DAY, t: 999 })
  assert.equal(blocked.state, S.BROKEN_WORLD)
  assert.equal(blocked.notice, 'story-done-today')

  assert.equal(canStartStory(g.progress, '2026-09-07'), true, 'מחר — נפתח')
})

test('יציאה חופשית נותנת חומרים אבל לא מקדמת עלילה', () => {
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.FREE, day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: PATH, home: HOME })
  g = run(g, [{ type: 'ADD_LOOT', kind: 'stone' }, { type: 'PORTAL_ENTERED' }])

  assert.equal(g.progress.res.stone, 1, 'החומרים נכנסו')
  assert.equal(g.progress.missionsCompleted, 0, 'אבל העלילה לא זזה')
  assert.equal(g.progress.lastStoryDay, null, 'ולא "בזבזה" את המשימה של היום')
  assert.equal(g.state, S.RUN_COMPLETE, 'ובלי רמז — הרמז שייך לעלילה')
})

// ══════════════════════════════════════════════
test('מיקום לא עוזב את המכשיר. גם לא בטעות', () => {
  let g = started()
  g = walk(g, 300)
  const out = forServer(g)
  const json = JSON.stringify(out)

  assert.ok(!json.includes('lat'), 'אין קואורדינטות בשליחה לשרת')
  assert.ok(!json.includes('lng'))
  assert.equal(out.run, undefined, 'כל ה-run יורד, לא שדות נבחרים מתוכו')
  assert.equal(out.progress.missionsCompleted, 0)
})

test('סירוב מיקום עוצר, וזה השער היחיד שבאמת חוסם', () => {
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_DENIED' })
  assert.equal(g.state, S.BROKEN_WORLD)
  assert.equal(g.notice, 'no-location')
})

test('"לעצור" שומר הכל', () => {
  let g = started()
  g = walk(g, 300)
  g = reduce(g, { type: 'ADD_LOOT', kind: 'wood' })
  g = reduce(g, { type: 'ABORT' })
  assert.equal(g.state, S.ABORTED)
  assert.equal(g.run.loot.length, 1, 'מה שנאסף עדיין שם')
})

// ══════════════════════════════════════════════
// קאנון: שומרי האבן
// אותה שפה אדריכלית, שתי affordances. הבדיקות האלה קיימות כדי שילד
// לעולם לא ינסה להיכנס בקראג, וכדי שהכלל הזה לא ייגזל בטעות בעוד חודש.

test('קאנון: פורטל פתוח מזמין כניסה, שומר רדום שקוף לחלוטין', () => {
  const portal = { kind: STRUCTURE.PORTAL, open: true }
  const kraag = { kind: STRUCTURE.GUARDIAN, state: GUARDIAN_STATE.DORMANT }

  const p = affordanceOf(portal)
  assert.equal(p.membrane, true, 'ממברנת אנרגיה בתוך הקשת')
  assert.equal(p.beaconMarksExit, true, 'והביקון מסמן אותו כיציאה')

  const k = affordanceOf(kraag)
  assert.equal(k.membrane, false, 'אצל השומר החלל הוא חלל — רואים דרכו את הרחוב')
  assert.equal(k.particles, false)
  assert.equal(k.inwardPull, false, 'ואין שום אנימציית "בוא לכאן"')
  assert.equal(k.beaconMarksExit, false, 'והביקון שותק לגביו')
})

test('קאנון: שומר אינו מעבר בשום מצב — גם ער, גם אם סומן בטעות', () => {
  for (const state of Object.values(GUARDIAN_STATE)) {
    assert.equal(isEnterable({ kind: STRUCTURE.GUARDIAN, state }), false, state)
  }
  // אפילו אם מישהו יעביר open:true על שומר.
  assert.equal(isEnterable({ kind: STRUCTURE.GUARDIAN, open: true }), false,
    'השער הקשיח: קראג לא נפתח גם כשמבקשים ממנו')
})

test('קאנון: פורטל סגור אינו נכנס', () => {
  assert.equal(isEnterable({ kind: STRUCTURE.PORTAL, open: false }), false)
  assert.equal(isEnterable({ kind: STRUCTURE.PORTAL, open: true }), true)
})

test('קאנון: ההתעוררות של קראג ברחוב, בגובה מלא', () => {
  assert.equal(KRAAG_AWAKENS.where, 'STREET')
  assert.equal(KRAAG_AWAKENS.heightM, 2.20)
  assert.equal(KRAAG_AWAKENS.framing, 'RISE_INTO_FRAME',
    'קם לתוך המסגרת — לא מבקשים מילד לסגת ארבעה מטרים ברחוב')
})

// ══════════════════════════════════════════════
// הכוריאוגרפיה של נימי
// ה-controller הוא לוגיקה טהורה, ולכן מפגש שלם נבדק בלי מצלמה ובלי
// חיישנים. זה מה שיאפשר לכתוב את שבעת הנותרים בלי לצאת החוצה.

const angDiff = (a, b) => Math.abs(((((b - a) % 360) + 540) % 360) - 180)

test('נימי: שביל אחד שמתפצל לשלוש התנהגויות', () => {
  const s = nimi.start(0)
  const t = nimi.targets(s)
  assert.equal(t.filter(x => x.kind === 'trailhead').length, 1, 'ראש שביל אחד')
  const br = t.filter(x => x.kind === 'trail')
  assert.equal(br.length, 3)
  assert.deepEqual(
    [...br.map(x => x.branch)].sort(),
    ['doubles-back', 'fades', 'runs'],
    'כל שלוש ההתנהגויות, אחת מכל סוג — לא "נכון/לא נכון"'
  )
})

test('נימי: ראש השביל אינו יעד לנעילה', () => {
  const s = nimi.start(0)
  assert.equal(nimi.targets(s).find(t => t.kind === 'trailhead').passive, true)
  assert.deepEqual(nimi.onLock(s, 'head').state, s, 'לחיצה עליו לא מזיזה כלום')
})

test('נימי: השביל נקרא בסיבוב קטן, לא ב-360°', () => {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 360
    const s = nimi.start(a)
    for (const t of nimi.targets(s)) {
      assert.ok(angDiff(a, t.bearing) < 85,
        `יעד ב-${angDiff(a, t.bearing).toFixed(0)}° — הילד היה צריך להסתובב לחפש אותו`)
    }
  }
})

test('נימי: הכיוון שנלמד מהעקבות הוא שקובע איפה הוא מתחבא', () => {
  for (let i = 0; i < 40; i++) {
    const s = nimi.start(Math.random() * 360)
    const live = s.branches.find(b => b.live)
    assert.ok(angDiff(live.bearing, s.hidden) <= 27,
      'נימי בקשת צרה סביב הענף החי — הסיבוב הוא מסקנה ולא סריקה')
    assert.ok(angDiff(s.anchor, s.hidden) > 35,
      `ואף פעם לא מול הילד בפתיחה (${angDiff(s.anchor, s.hidden).toFixed(0)}°)`)
    assert.ok(angDiff(s.anchor, s.hidden) >= angDiff(s.anchor, live.bearing) - 1,
      'ההסטה מתרחקת מהמבט ההתחלתי, לא חוזרת אליו')
  }
})

test('נימי: ענף מת מספר מה נימי עשה, לא שהילד טעה', () => {
  let s = nimi.start(0)
  const dead = s.branches.find(b => !b.live)
  const r = nimi.onLock(s, dead.id)
  assert.ok(['back', 'fade'].includes(r.feedback), 'המשוב הוא ההתנהגות עצמה')
  assert.equal(r.state.phase, 'TRAIL', 'נשארים בשביל')
  assert.equal(nimi.targets(r.state).filter(t => t.kind === 'trail').length, 2)
  assert.equal(nimi.isDone(r.state), false)
})

test('נימי: הפעימות — שביל, מציץ, בורח עם קו, מתקרב, חבר', () => {
  let s = nimi.start(0)
  const live = s.branches.find(b => b.live)

  let r = nimi.onLock(s, live.id)
  assert.equal(r.feedback, 'run')
  assert.equal(r.state.phase, 'PEEK')
  assert.equal(nimi.targets(r.state)[0].peeking, true)

  const was = r.state.hidden
  r = nimi.onLock(r.state, 'nimi')
  assert.equal(r.state.phase, 'CHASE')
  assert.notEqual(r.state.hidden, was, 'ברח למקום אחר')
  assert.equal(nimi.targets(r.state)[0].streak, was, 'והשאיר קו שמראה מאיפה')

  r = nimi.onLock(r.state, 'nimi')
  assert.equal(r.state.phase, 'APPROACH')
  assert.ok(nimi.targets(r.state)[0].scale > 1)

  // תפיסה: הנעילה על היצור הקרוב פותחת את הרגע, לא סוגרת אותו.
  r = nimi.onLock(r.state, 'nimi')
  assert.equal(nimi.isDone(r.state), false, 'נעילה לבד לא תופסת')
  assert.equal(r.state.ready, true, 'אבל פותחת את כפתור התפיסה')
  assert.equal(r.feedback, 'ready')
  assert.deepEqual(nimi.onCatch(nimi.start(0)).state.phase, 'TRAIL', 'אי אפשר לתפוס לפני שהוא קרוב')
  r = nimi.onCatch(r.state)
  assert.equal(nimi.isDone(r.state), true)
  assert.equal(r.feedback, 'catch')
})

test('תחנות: היצורים מתחלפים — נימי, דבשון, נימי', () => {
  const g = started(THREE)
  assert.deepEqual(g.run.stops.map(s => s.creature), ['nimi', 'dabashon', 'nimi'])
})

// ══════════════════════════════════════════════
// הלוח של הבן שלה: מטבעות, 30 ואז 45 דקות, יצור שני בתשלום.
test('לוח: מסע ראשון — 30 דקות, נימי לבד, בלי אפשרות לקנות', () => {
  const g = started()
  assert.equal(g.run.walkIndex, 0)
  assert.equal(loopTargetM(0), 2200); assert.equal(loopTargetM(1), 3200)
  assert.deepEqual(g.run.stops.map(s => s.creature), ['nimi'])
  assert.equal(canBuyExtra(initial().progress), false)
  const paid = reduce(initial(), { type: 'START_RUN', kind: RUN.STORY, day: DAY, t: 0, extra: true })
  assert.deepEqual(paid.run.wantCreatures, ['nimi'], 'לשלם אי אפשר לפני המסע השלישי')
})

test('מטבעות: מונחים על השביל, נאספים כשעוברים, נשארים גם כשעוצרים', () => {
  let g = started()
  const n = g.run.coins.length
  assert.ok(n >= 10 && n <= 16, `מטבע כל ~90 מ' על 1.2 ק"מ, התקבלו ${n}`)
  assert.equal(g.run.coins.filter(c => c.gold).length, 1, 'זהב אחד')
  assert.ok(g.run.coins.every(c => Math.abs(c.along - g.run.stops[0].along) >= 30), 'לא על התחנה')
  assert.equal(g.run.coinsTaken, 0)

  g = walk(g, 200)
  assert.ok(g.run.coinsTaken >= 2, `אחרי 200 מ' נאספו כמה: ${g.run.coinsTaken}`)
  assert.ok(g.run.lastCoin, 'ויש אירוע לצליל')
  const taken = g.run.coins.filter(c => c.taken).length
  assert.ok(taken >= 2 && g.run.coins.filter(c => !c.taken && c.along < 150).length === 0, 'מה שעברנו נאסף')

  const stopped = reduce(g, { type: 'ABORT' })
  assert.equal(stopped.progress.coins, g.run.coinsTaken, 'עצירה שומרת את המטבעות')
})

test('לוח: אחרי שני מסעות אפשר לקנות יצור שני, והתשלום יורד מהארנק', () => {
  let g = initial()
  g = { ...g, progress: { ...g.progress, walks: 2, coins: 100 } }
  assert.equal(canBuyExtra(g.progress), true)
  g = started(undefined, g)
  assert.equal(g.run.walkIndex, 2)
  assert.deepEqual(g.run.stops.map(s => s.creature), ['lumi'], 'בלי תשלום — אחד; המסע השלישי הוא של לומי')

  let h = initial()
  h = { ...h, progress: { ...h.progress, walks: 2, coins: 100 } }
  h = reduce(h, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0, extra: true })
  assert.equal(h.progress.coins, 100 - WALK_PLAN.extraCost, 'שולם מראש')
  h = reduce(h, { type: 'PERMISSION_GRANTED', home: HOME })
  h = reduce(h, { type: 'ROUTE_READY', path: PATH, home: HOME })
  assert.deepEqual(h.run.stops.map(s => s.creature), ['lumi', 'nimi'], 'שניים בדרך — והשני הוא מישהו אחר')
})

test('דבשון: באוויר, שלוש לחיצות', () => {
  let s = dabashon.start(0)
  assert.equal(s.phase, 'HUM')
  const t = dabashon.targets(s)[0]
  assert.equal(t.flying, true, 'דבורה — לא על הרצפה')
  assert.ok(t.elev > 0, 'מעל האופק: צריך להרים את הטלפון')
  assert.ok(dabashon.copy(s).line.length > 0)
  let r = dabashon.onTap(s)
  assert.equal(r.state.phase, 'FLY'); assert.equal(r.feedback, 'flee')
  assert.notEqual(r.state.hidden, s.hidden, 'עף למקום אחר')
  r = dabashon.onTap(r.state)
  assert.equal(r.state.phase, 'HOVER'); assert.ok(dabashon.targets(r.state)[0].scale > 1, 'קרוב יותר')
  assert.equal(dabashon.isDone(dabashon.onCatch(s).state), false, 'אי אפשר לתפוס לפני שהוא מרחף')
  r = dabashon.onTap(r.state)
  assert.equal(dabashon.isDone(r.state), true); assert.equal(r.feedback, 'catch')
  assert.deepEqual(dabashon.targets(r.state), [])
})

test('נימי: לוחצים עליו — הדרך שילד מבין מיד', () => {
  let s = nimi.start(0)
  assert.deepEqual(nimi.onTap(s).state, s, 'על השביל אין על מי ללחוץ')
  s = nimi.onLock(s, s.branches.find(b => b.live).id).state       // → מציץ
  let r = nimi.onTap(s)
  assert.equal(r.state.phase, 'CHASE', 'לחיצה על המציץ — הוא בורח')
  assert.equal(r.feedback, 'flee')
  r = nimi.onTap(r.state)
  assert.equal(r.state.phase, 'APPROACH', 'מצאו אותו ולחצו — הוא נעצר')
  r = nimi.onTap(r.state)
  assert.equal(nimi.isDone(r.state), true, 'לחיצה שלישית — נתפס')
  assert.equal(r.feedback, 'catch')
})

test('נימי: אי אפשר לסיים בלי לקרוא את השביל', () => {
  let s = nimi.start(0)
  for (const b of s.branches.filter(x => !x.live)) s = nimi.onLock(s, b.id).state
  assert.equal(s.phase, 'TRAIL', 'שני ענפים מתים ועדיין לא נגמר')
  assert.equal(nimi.targets(s).filter(t => t.kind === 'trail').length, 1)
  s = nimi.onLock(s, s.branches.find(b => b.live).id).state
  assert.equal(s.phase, 'PEEK')
})

test('נימי: הטקסט אף פעם לא אומר לילד שהוא טעה', () => {
  let s = nimi.start(0)
  const all = [nimi.copy(s)]
  const dead = s.branches.find(b => !b.live)
  s = nimi.onLock(s, dead.id).state
  all.push(nimi.copy(s))
  for (const c of all) {
    assert.ok(!/טעית|לא נכון|שגוי/.test(c.line + c.sub), c.line)
  }
  assert.notEqual(all[0].line, all[1].line, 'והטקסט מתקדם אחרי שקראנו ענף')
})

// ══════════════════════════════════════════════
// שלושה באגים שנמצאו רק על טלפון אמיתי ברחוב

test('הביקון ער כבר במסע הראשון', () => {
  let g = started()
  assert.equal(beaconView(g).power, 'REACTIVE',
    'במסע 1 הוא היה DORMANT — אבן אפורה במסע שכולו "הביקון זז לראשונה"')
  assert.equal(beaconView(initial()).power, 'DORMANT', 'אבל בעולם ההרוס, לפני יציאה, כן')
})

test('הביקון מדבר גם לפני שהיעד הונח', () => {
  // מסע ישן בלי תחנות: היעד עוד לא קיים ביציאה מהבית.
  let g = started()
  g = { ...g, run: { ...g.run, stops: null, target: null } }
  assert.equal(g.run.target, null)
  const v = beaconView(g)
  assert.equal(v.phase, PHASE.SIGNAL_WEAK,
    'בתחילת מסע הוא החזיר IDLE ולא אמר כלום — בדיוק כשהילד יוצא מהבית')
  assert.ok(v.line.length > 0, 'ויש טקסט')
})

test('phaseOf שותק רק כשאין מסע', () => {
  const off = { dist: null, acc: 10, walked: 0, stillMs: 0, resolved: false, active: false }
  assert.equal(phaseOf(off), PHASE.IDLE)
  assert.equal(phaseOf({ ...off, active: true }), PHASE.SIGNAL_WEAK)
})

// ══════════════════════════════════════════════
// שרשרת בניית המסלול
// שני באגי אינטגרציה ברצף חמקו מכאן כי הלוגיקה ישבה בתוך hook. עכשיו
// היא פונקציה טהורה, ומריצים עליה תשובת Overpass שמורה — בלי רשת.

// רשת רחובות סינתטית: 5×5 בלוקים במרווח 150 מ', בפורמט של Overpass.
function fakeOverpass(home, n = 9, gap = 220) {
  const elements = []
  const at = (i, j) => {
    const p = destination(destination(home, 0, (i - (n - 1) / 2) * gap), 90, (j - (n - 1) / 2) * gap)
    return { lat: p.lat, lon: p.lng }
  }
  let id = 1
  for (let i = 0; i < n; i++) {
    elements.push({ type: 'way', id: id++, tags: { highway: 'residential' },
      geometry: Array.from({ length: n }, (_, j) => at(i, j)) })
    elements.push({ type: 'way', id: id++, tags: { highway: 'residential' },
      geometry: Array.from({ length: n }, (_, j) => at(j, i)) })
  }
  return { elements }
}

test('מסלול: תשובת Overpass גולמית הופכת ללולאה', () => {
  const r = buildLoop(fakeOverpass(HOME), HOME)
  assert.equal(r.ok, true, `נכשל עם ${r.reason}`)
  assert.ok(r.path.length >= 8, 'ולולאה אמיתית, לא שני קווים')
})

test('מסלול: הלולאה מתחילה ונגמרת ליד הבית', () => {
  const { path } = buildLoop(fakeOverpass(HOME), HOME)
  assert.ok(haversine(path[0], HOME) < 200, 'מתחילה ליד הבית')
  assert.ok(haversine(path[path.length - 1], HOME) < 200, 'וחוזרת אליו')
})

test('מסלול: תשובה שכבר פוענחה עובדת גם היא', () => {
  // זה בדיוק הבאג הראשון: fetchStreets מחזירה מפוענח, והקוד פענח שוב.
  const parsed = normalize(fakeOverpass(HOME))
  const r = buildLoop(parsed, HOME)
  assert.equal(r.ok, true, `נכשל עם ${r.reason} — פענוח כפול זרק את הנתונים`)
})

test('מסלול: כל כשל מקבל שם משלו', () => {
  assert.equal(buildLoop({ elements: [] }, HOME).reason, 'empty')
  assert.equal(buildLoop(null, HOME).reason, 'empty')
  // רחוב בודד — יש צמתים, אין לולאה
  const one = { elements: [{ type: 'way', id: 1, tags: { highway: 'residential' },
    geometry: [{ lat: HOME.lat, lon: HOME.lng }, { lat: HOME.lat + 0.002, lon: HOME.lng }] }] }
  assert.ok(['no-loop', 'short-loop'].includes(buildLoop(one, HOME).reason))
})

// ══════════════════════════════════════════════
// הסולם: "no-loop" על הטלפון שלה — הרחובות הגיעו והמתכנן לא מצא לולאה.
// ביישוב קטן זה קורה. עכשיו יורדים בסולם עד שיש מסלול על רחובות אמיתיים.

// רחוב אחד ארוך, בלי שום צומת: אין לולאה בשום אורך.
function oneStreet(home, meters = 1400, step = 100) {
  const geometry = []
  for (let d = 0; d <= meters; d += step) { const p = destination(home, 0, d); geometry.push({ lat: p.lat, lon: p.lng }) }
  return { elements: [{ type: 'way', id: 1, tags: { highway: 'residential', name: 'הראשי' }, geometry }] }
}

test('סולם: רחוב אחד בלי צמתים — הלוך ושוב, לא כישלון', () => {
  const r = buildLoop(oneStreet(HOME), HOME, 2200)
  assert.equal(r.ok, true, `נכשל עם ${r.reason} — בדיוק מה שהיא צילמה`)
  assert.equal(r.shape, 'there-and-back')
  assert.ok(haversine(r.path[0], HOME) < 50 && haversine(r.path[r.path.length - 1], HOME) < 50, 'מתחיל ונגמר בבית')
  assert.ok(r.meters >= 1600 && r.meters <= 2600, `אורך סביר: ${r.meters}`)
  assert.equal(r.path[1].street, 'הראשי', 'ושם הרחוב נוסע עם ההוראות')
  assert.match(routeNote(r), /הלוך ושוב|באותה דרך/)
})

test('סולם: שכונה קטנה — לולאה קצרה מהמתוכנן, לא כישלון', () => {
  // 3×3 בלוקים במרווח 200 מ': ההיקף החיצוני 1.6 ק"מ. מבקשים 3.2.
  const r = buildLoop(fakeOverpass(HOME, 3, 200), HOME, 3200)
  assert.equal(r.ok, true, `נכשל עם ${r.reason}`)
  assert.equal(r.shape, 'short')
  assert.ok(r.scale < 1)
  assert.ok(r.meters >= 500, `לפחות חצי ק"מ: ${r.meters}`)
  assert.match(routeNote(r), /קצר/)
})

test('סולם: שדה שחותך את הרשת — מנסים בלי הסינון, ואומרים', () => {
  // מטע שמכסה את כל הרשת חוץ מהבלוק של הבית: עם הסינון נשארים שני
  // רחובות; בלעדיו יש שכונה שלמה.
  const base = fakeOverpass(HOME, 9, 220)
  const c1 = destination(destination(HOME, 0, 130), 90, 130)
  const c2 = destination(destination(HOME, 0, 1100), 90, 1100)
  base.elements.push({ type: 'way', id: 998, tags: { landuse: 'orchard' },
    geometry: [{ lat: c1.lat, lon: c1.lng }, { lat: c2.lat, lon: c1.lng }, { lat: c2.lat, lon: c2.lng }, { lat: c1.lat, lon: c2.lng }, { lat: c1.lat, lon: c1.lng }] })
  const c3 = destination(destination(HOME, 180, 130), 270, 130)
  const c4 = destination(destination(HOME, 180, 1100), 270, 1100)
  base.elements.push({ type: 'way', id: 997, tags: { landuse: 'orchard' },
    geometry: [{ lat: c3.lat, lon: c3.lng }, { lat: c4.lat, lon: c3.lng }, { lat: c4.lat, lon: c4.lng }, { lat: c3.lat, lon: c4.lng }, { lat: c3.lat, lon: c3.lng }] })
  const r = buildLoop(base, HOME, 3200)
  assert.equal(r.ok, true, `נכשל עם ${r.reason}`)
  if (r.unblocked) assert.match(routeNote(r), /שטחים פתוחים/)
  else assert.ok(r.meters >= 500)
})

test('סולם: הלולאה הרגילה עדיין ראשונה, בלי הערות', () => {
  const r = buildLoop(fakeOverpass(HOME), HOME)
  assert.equal(r.shape, 'loop')
  assert.equal(r.scale, 1)
  assert.equal(r.unblocked, false)
  assert.equal(routeNote(r), null)
  assert.equal(routeNote({ ok: false, reason: 'no-loop' }), null)
})

test('סולם: הלוך ושוב צריך לפחות 250 מ׳ — אחרת באמת אין מסלול', () => {
  assert.equal(buildLoop(oneStreet(HOME, 200, 50), HOME, 2200).reason, 'no-loop')
})

test('מפה: חיצים כל ~110 מ׳ לכיוון ההליכה, והמסלול נחתך במקום שהלכנו', () => {
  const a = HOME, b = destination(HOME, 0, 400), c = destination(b, 90, 300)
  const path = [a, b, c]
  const arrows = routeArrows(path)
  assert.ok(arrows.length >= 5 && arrows.length <= 7, `${arrows.length} חיצים על 700 מ'`)
  assert.ok(Math.abs(arrows[0].deg) < 1 || Math.abs(arrows[0].deg - 360) < 1, 'הראשון מצביע צפונה')
  assert.ok(Math.abs(arrows[arrows.length - 1].deg - 90) < 1, 'האחרון מזרחה')
  const { done, todo } = splitAt(path, 500)
  assert.equal(done.length, 3, 'בית, הפנייה, ונקודת החיתוך')
  assert.equal(todo.length, 2)
  assert.ok(haversine(done[2], destination(b, 90, 100)) < 2, 'החיתוך 100 מ׳ אחרי הפנייה')
  assert.deepEqual(splitAt(path, 0).done, [])
  assert.equal(splitAt(path, 5000).todo.length, 0, 'מעבר לסוף — הכול הלכנו')
})

test('מסלול: החלופי תמיד קיים, וסגור', () => {
  const fb = fallbackLoop(HOME)
  assert.ok(fb.length >= 8)
  assert.deepEqual(fb[0], HOME)
  assert.deepEqual(fb[fb.length - 1], HOME, 'מתחיל ונגמר בבית')
})

test('מסלול: שטח אסור לא נכנס ללולאה', () => {
  const base = fakeOverpass(HOME)
  // בית קברות שמכסה את כל הרבע הצפוני-מזרחי
  const c1 = destination(HOME, 45, 300), c2 = destination(HOME, 45, 800)
  base.elements.push({
    type: 'way', id: 999, tags: { landuse: 'cemetery' },
    geometry: [
      { lat: c1.lat, lon: c1.lng }, { lat: c2.lat, lon: c1.lng },
      { lat: c2.lat, lon: c2.lng }, { lat: c1.lat, lon: c2.lng },
      { lat: c1.lat, lon: c1.lng },
    ],
  })
  const r = buildLoop(base, HOME)
  assert.equal(r.ok, true, `נכשל עם ${r.reason}`)
  const { blocked } = normalize(base)
  assert.ok(blocked.length > 0, 'השטח האסור אכן נקרא')
})

// ══════════════════════════════════════════════
// הליכה בקצב אמיתי
// כל הבדיקות עד כאן "הלכו" בקפיצות של 15 מ' — וזה בדיוק מה שהסתיר את
// הבאג שהרג את המסע הראשון בשטח. GPS בטלפון דוגם כפעם בשנייה, ובהליכה
// זה כמטר וחצי. אם נקודת הייחוס מתקדמת בכל דגימה, כל צעד נופל מתחת
// לסף הרעש והמונה נשאר על אפס לנצח.

function strollTo(g, meters, { acc = 8, perFix = 1.5, t0 = 1000, hz = 1000 } = {}) {
  let t = t0
  for (let d = perFix; d <= meters; d += perFix) {
    const p = destination(HOME, 0, d)
    g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc, t })
    t += hz
  }
  return g
}

test('הליכה: מטר וחצי בין דגימות עדיין נספר', () => {
  let g = strollTo(started(), 300)
  assert.ok(g.run.walked > 250,
    `הלכנו 300 מ׳ ונספרו ${g.run.walked.toFixed(0)} — זה הבאג שתקע את הביקון על "אות חלש"`)
})

test('הליכה: הביקון מתעורר תוך כדי, לא אחרי', () => {
  // שלוש תחנות: הראשונה ב-~420 מ'. (יצור יחיד יושב ב-80% — רחוק בכוונה.)
  let g = strollTo(started(THREE), 300)
  assert.ok(g.run.target, 'היעד הונח')
  const v = beaconView(g)
  assert.notEqual(v.phase, PHASE.SIGNAL_WEAK,
    'אחרי 300 מ׳ הליכה הוא כבר לא אמור להיות תקוע על "נקלט אות חלש"')
  assert.equal(v.arrow, true, 'ויש חץ')
})

test('הליכה: עמידה במקום עדיין לא סופרת', () => {
  let g = started()
  const p = destination(HOME, 0, 5)
  // מאה דגימות באותה נקודה, עם רעש של חצי מטר לכל כיוון
  for (let i = 0; i < 100; i++) {
    const j = destination(p, (i * 47) % 360, 0.5)
    g = reduce(g, { type: 'FIX', lat: j.lat, lng: j.lng, acc: 8, t: 1000 + i * 1000 })
  }
  assert.ok(g.run.walked < 15,
    `רעש מקלט צבר ${g.run.walked.toFixed(0)} מ׳ — הסף אמור לפסול אותו`)
})

test('הליכה: "עומד במקום" נמדד מתזוזה אמיתית', () => {
  // ילד שהולך לא אמור להיחשב עומד, גם כשהצעד הבודד קטן מהסף
  let g = strollTo(started(), 200)
  assert.equal(g.run.stillMs, 0, 'בהליכה רצופה אין עצירה')

  // ואז הוא עוצר
  const at = destination(HOME, 0, 200)
  for (let i = 0; i < 8; i++) {
    g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 500000 + i * 1000 })
  }
  assert.ok(g.run.stillMs >= STILL_MS, 'ואחרי חמש שניות במקום — כן')
})

test('הליכה: נסיעה ברכב לא נספרת כהליכה', () => {
  let g = started()
  let t = 1000
  for (let d = 200; d <= 4000; d += 200) {   // 200 מ׳ בין דגימות = ~70 קמ"ש
    const p = destination(HOME, 0, d)
    g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc: 8, t })
    t += 10000
  }
  assert.equal(g.run.walked, 0, 'קפיצות של 200 מ׳ אינן צעדים')
})

// ══════════════════════════════════════════════
// זיכרון מסלולים
// ילד יוצא מאותה דלת כל יום. Overpass איטית מהטלפון, וההמתנה דוחפת
// ללחוץ "לדלג עכשיו" — כלומר למסלול חלופי גרוע יותר, כל יום מחדש.

test('זיכרון: מסלול חוזר מאותו בית', () => {
  const store = {}
  global.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
    removeItem: k => { delete store[k] },
  }
  const path = Array.from({ length: 12 }, (_, i) => destination(HOME, i * 30, 200))

  assert.equal(getCached(HOME), null, 'בפעם הראשונה אין מה לזכור')
  assert.equal(putCached(HOME, path), true)
  assert.ok(getCached(HOME), 'ובפעם השנייה הוא שם — בלי רשת')

  // אותו בניין, GPS שסטה קצת — עדיין אותו תא
  const drifted = destination(HOME, 45, 40)
  assert.ok(getCached(drifted), 'סטייה של 40 מ׳ לא מאבדת את המסלול')

  // בית אחר לגמרי
  assert.equal(getCached(destination(HOME, 0, 5000)), null)
})

test('זיכרון: מסלול ישן נשכח', () => {
  const store = {}
  global.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
    removeItem: k => { delete store[k] },
  }
  const path = Array.from({ length: 12 }, (_, i) => destination(HOME, i * 30, 200))
  const longAgo = Date.now() - 40 * 86400000
  putCached(HOME, path, longAgo)
  assert.equal(getCached(HOME), null, 'רחובות לא זזים, אבל בית כן')
})

test('זיכרון: מסלול פגום לא נשמר', () => {
  const store = {}
  global.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
    removeItem: k => { delete store[k] },
  }
  assert.equal(putCached(HOME, null), false)
  assert.equal(putCached(HOME, [HOME, HOME]), false, 'שתי נקודות אינן לולאה')
  assert.equal(getCached(HOME), null)
})

// ═══════════════════════════════════════════════════════════════
// מי משחק, מה נשמר, ומי היום בדרך
// ═══════════════════════════════════════════════════════════════
import { makeCode, normCode, validCode, newProfile, mergeProgress, remoteAdds, richer } from '../src/app/wilden/engine/profile.js'
import { briefFor, homeFor, todaysCreature } from '../src/app/wilden/content/briefs.js'
import { reasonOf, camText, CAM_REASON } from '../src/app/wilden/engine/camera.js'

test('פרופיל: קוד בן 5 בלי תווים מבלבלים', () => {
  const seeded = () => 0.123456
  const c = makeCode(5, seeded)
  assert.equal(c.length, 5)
  for (let i = 0; i < 200; i++) {
    const k = makeCode()
    assert.equal(k.length, 5)
    assert.ok(!/[0OI1L]/.test(k), 'בלי 0/O/1/I/L: הורה מכתיב בטלפון')
  }
  assert.equal(normCode(' a1-b2c '), 'A1B2C')
  assert.ok(validCode('ab2cd'))
  assert.ok(!validCode('ab2c'))
  assert.equal(newProfile({ name: '  ' }).name, 'שחקן')
  assert.equal(newProfile({ name: 'נועם', code: 'q2w3e' }).code, 'Q2W3E')
})

test('מיזוג: מי שהלך יותר הוא הבסיס, ויצור שנתפס לא נעלם', () => {
  const local = { walks: 1, coins: 40, missionsCompleted: 1, creatures: ['nimi'], res: { honey: 1 }, story: { m01: 'done' }, lastStoryDay: '2026-09-01' }
  const remote = { walks: 3, coins: 10, missionsCompleted: 3, creatures: ['nimi', 'dabashon'], res: { stone: 2 }, story: { m01: 'done' }, lastStoryDay: '2026-09-05' }
  assert.equal(richer(local, remote), remote)
  const m = mergeProgress(local, remote)
  assert.equal(m.walks, 3)
  assert.equal(m.coins, 10, 'הארנק של הבסיס — לא סכום, אחרת מיזוג כפול מכפיל מטבעות')
  assert.deepEqual(m.creatures, ['nimi', 'dabashon'])
  assert.deepEqual(m.res, { stone: 2, honey: 1 })
  assert.equal(m.lastStoryDay, '2026-09-05')
  // שוויון ב-walks: יותר מטבעות מנצח
  assert.equal(richer({ walks: 2, coins: 5 }, { walks: 2, coins: 9 }).coins, 9)
  assert.equal(mergeProgress(local, null), local)
  assert.equal(mergeProgress(null, remote), remote)
  assert.ok(remoteAdds(local, remote))
  assert.ok(remoteAdds(remote, local), 'גם לכיוון השני: הדבש של הטלפון לא הולך לאיבוד')
  const subset = { walks: 1, coins: 5, creatures: ['nimi'], res: {}, story: {} }
  assert.ok(!remoteAdds(remote, subset), 'השרת לא מוסיף כלום — לא נוגעים')
  assert.ok(!remoteAdds(local, local))
  assert.ok(!remoteAdds(local, { ...local, res: { honey: 1 } }), 'סדר מפתחות אחר אינו שינוי')
})

test('מיזוג במכונה: רק בין מסעות, אף פעם לא באמצע הליכה', () => {
  let g = initial()
  const remote = { walks: 2, coins: 30, creatures: ['nimi', 'dabashon'], res: {}, story: {}, missionsCompleted: 2 }
  g = reduce(g, { type: 'IMPORT_PROGRESS', progress: remote })
  assert.equal(g.progress.walks, 2)
  assert.deepEqual(g.progress.creatures, ['nimi', 'dabashon'])
  assert.equal(g.state, S.BROKEN_WORLD)

  // באמצע מסע — מתעלמים
  let h = started(['nimi'])
  const before = h.progress
  h = reduce(h, { type: 'IMPORT_PROGRESS', progress: { walks: 9, coins: 999 } })
  assert.equal(h.progress, before)

  // שחקן אחר על אותו טלפון: עולם נקי, או העולם שלו מהשרת
  const fresh = reduce(g, { type: 'RESET_WORLD' })
  assert.equal(fresh.progress.walks, 0)
  assert.deepEqual(fresh.progress.creatures, [])
  const theirs = reduce(g, { type: 'RESET_WORLD', progress: { walks: 1, coins: 7, creatures: ['kraag'] } })
  assert.equal(theirs.progress.walks, 1)
  assert.deepEqual(theirs.progress.creatures, ['kraag'])
})

test('לשרת: מטבעות ומסעות נשלחים, מיקום לא', () => {
  let g = initial()
  g = reduce(g, { type: 'IMPORT_PROGRESS', progress: { walks: 2, coins: 33, creatures: ['nimi'], res: {}, story: {} } })
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  const out = forServer(g)
  assert.equal(out.progress.walks, 2)
  assert.equal(out.progress.coins, 33)
  assert.equal(out.run, undefined)
  assert.ok(!JSON.stringify(out).includes('lat'))
})

test('התדריך: לא תמיד נימי', () => {
  const b0 = briefFor({ walks: 0, creatures: [] })
  assert.equal(b0.missionId, 'm01')
  assert.equal(b0.creature, 'nimi')
  assert.equal(b0.cta, 'צא למסע')

  const b1 = briefFor({ walks: 1, creatures: ['nimi'] })
  assert.equal(b1.missionId, null, 'מסע 1 הוא סיפור; אחר כך אין משימה קבועה')
  assert.equal(b1.creature, 'dabashon')
  assert.ok(b1.line.includes('דבשון'), b1.line)
  assert.ok(b1.line.includes('מסע 2'))
  assert.ok(b1.sub.includes('דבש'), 'יצור חדש — מה הוא מביא')

  const b2 = briefFor({ walks: 2, creatures: ['nimi', 'dabashon'] })
  assert.equal(b2.creature, 'lumi')
  assert.ok(b2.sub.includes('ניצוץ'))

  // שמונה יצורים, רצפה ואוויר לסירוגין, בולדר לפני קראג
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(w => todaysCreature({ walks: w }).id), ['nimi', 'dabashon', 'lumi', 'ruchi', 'gali', 'tzel', 'bolder', 'kraag'])
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(w => todaysCreature({ walks: w }).arMode), ['ground', 'sky', 'ground', 'sky', 'ground', 'ground', 'ground', 'ground'])
  assert.ok(briefFor({ walks: 6, creatures: [] }).sub.includes('אבן'), 'בולדר מביא אבן')

  // הסבב חוזר: מסע 9 — שוב נימי, אבל כ"שוב בחוץ" ולא כמסע 1
  const b8 = briefFor({ walks: 8, creatures: ['nimi', 'dabashon', 'lumi', 'ruchi', 'gali', 'tzel', 'bolder', 'kraag'] })
  assert.equal(b8.creature, 'nimi')
  assert.equal(b8.missionId, null)
  assert.ok(b8.sub.includes('שוב'))
  assert.equal(todaysCreature({ walks: 9 }).id, 'dabashon')
})

test('הבית אחרי הפורטל: מסע 1 — הסיפור; אחר כך — מי שנתפס ומי שמחכה', () => {
  const m01 = homeFor({ missionId: 'm01' }, { walks: 1 })
  assert.ok(m01.line.includes('נימי'))
  assert.equal(m01.clue.line, 'מישהו כאן ידע לבנות.')

  const run = { missionId: null, stops: [{ creature: 'dabashon', done: true }] }
  const h = homeFor(run, { walks: 2 })
  assert.ok(h.line.includes('דבשון'), h.line)
  assert.ok(h.line.includes('דבש'))
  assert.ok(h.clue.sub.includes('לומי'), 'walks=2 → הבא בסבב הוא לומי')

  const two = homeFor({ stops: [{ creature: 'nimi', done: true }, { creature: 'kraag', done: true }] }, { walks: 3 })
  assert.ok(two.line.includes('נימי וקראג'), two.line)
  assert.ok(two.line.includes('נכנסים'))
})

test('המסע השלם: אחרי נימי, המסע הבא מציע דבשון — לא נימי שוב', () => {
  let g = started(['nimi'])
  g = walk(g, 200)
  g = catchHere(g, 500000)
  g = reduce(g, { type: 'PORTAL_OPEN' })
  g = reduce(g, { type: 'PORTAL_ENTERED' })
  g = reduce(g, { type: 'CLUE_SEEN' })
  g = reduce(g, { type: 'RUN_CLOSED' })
  assert.equal(g.progress.walks, 1)
  const b = briefFor(g.progress)
  assert.equal(b.creature, 'dabashon')
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, day: '2026-09-07', t: 1 })
  assert.deepEqual(g.run.wantCreatures, ['dabashon'])
})

test('המצלמה: כל שגיאה הופכת לסיבה אחת עם פעולה אחת', () => {
  assert.equal(reasonOf({ name: 'NotAllowedError' }), CAM_REASON.DENIED)
  assert.equal(reasonOf({ name: 'PermissionDeniedError' }), CAM_REASON.DENIED)
  assert.equal(reasonOf({ name: 'NotFoundError' }), CAM_REASON.NOT_FOUND)
  assert.equal(reasonOf({ name: 'OverconstrainedError' }), CAM_REASON.NOT_FOUND)
  assert.equal(reasonOf({ name: 'NotReadableError' }), CAM_REASON.BUSY)
  assert.equal(reasonOf({ name: 'AbortError' }), CAM_REASON.BUSY)
  assert.equal(reasonOf(new Error('timeout')), CAM_REASON.TIMEOUT)
  assert.equal(reasonOf(new Error('no-media')), CAM_REASON.NO_MEDIA, 'דפדפן של וואטסאפ')
  assert.equal(reasonOf(new Error('no-media'), { secure: false }), CAM_REASON.INSECURE)
  assert.equal(reasonOf({ name: 'WeirdError' }), CAM_REASON.OTHER)
  assert.equal(reasonOf(null), CAM_REASON.OTHER)
  for (const r of Object.values(CAM_REASON)) {
    const t = camText(r)
    assert.ok(t.t && t.how, r)
    assert.equal(typeof t.retry, 'boolean')
  }
  assert.equal(camText(CAM_REASON.NO_MEDIA).retry, false, 'בלי mediaDevices אין מה לנסות שוב')
  assert.ok(camText(CAM_REASON.NO_MEDIA).how.includes('ספארי'))
  assert.ok(camText(CAM_REASON.DENIED).how.includes('aA'), 'איפה בדיוק לוחצים באייפון')
})

import ruchi from '../src/app/wilden/ar/controllers/ruchi.js'
import { controllerFor } from '../src/app/wilden/ar/controllers/index.js'
import { CREATURES, hasModel } from '../src/app/wilden/content/creatures.js'
import { AVAILABLE } from '../src/app/wilden/engine/coins.js'

test('רוחי: באוויר, גבוה מדבשון, שלוש לחיצות, ואותו מבנה', () => {
  const rng = () => 0.3
  let s = ruchi.start(0, rng)
  let t = ruchi.targets(s)
  assert.equal(t.length, 1)
  assert.equal(t[0].id, 'ruchi')
  assert.equal(t[0].flying, true)
  assert.equal(t[0].elev, 22, 'רוחי גבוה יותר')
  assert.equal(dabashon.targets(dabashon.start(0, rng))[0].elev, 16, 'דבשון נשאר כמו שהיה')
  assert.ok(ruchi.copy(s).line.includes('מרשרש'))
  const r1 = ruchi.onTap(s, rng); assert.equal(r1.feedback, 'flee'); s = r1.state
  assert.ok(ruchi.copy(s).line.includes('רוח'))
  assert.ok(ruchi.targets(s)[0].streak != null, 'הפס נשאר מאחוריו')
  const r2 = ruchi.onTap(s, rng); assert.equal(r2.feedback, 'near'); s = r2.state
  assert.equal(s.ready, true)
  const r3 = ruchi.onTap(s, rng); assert.equal(r3.feedback, 'catch'); s = r3.state
  assert.ok(ruchi.isDone(s))
  assert.deepEqual(ruchi.targets(s), [])
  // נעילה במבט על יעד אחר לא עושה כלום
  assert.equal(ruchi.onLock(ruchi.start(0, rng), 'dabashon').state.phase, 'HUM')
})

test('שמונה יצורים: לכולם מודל אמיתי, controller רשום, ומצב AR שהבמה מכירה', () => {
  assert.equal(AVAILABLE.length, 8)
  for (const id of AVAILABLE) {
    const c = CREATURES[id]
    assert.ok(c, id)
    assert.ok(hasModel(id), id + ': בלי מודל לא נכנסים לסבב')
    assert.ok(c.model.startsWith('/creatures/' + id + '/'), id + ': המודל שלו, לא של יצור אחר')
    assert.ok(controllerFor(c), id + ': controller')
    assert.ok(['ground', 'sky'].includes(c.arMode), id)
    if (c.arMode === 'sky') assert.ok(controllerFor(c).targets(controllerFor(c).start(0))[0].flying, id + ': בשמיים → flying')
  }
  assert.equal(new Set(AVAILABLE).size, 8, 'בלי כפילויות')
})

// ═══════════════════════════════════════════════════════════════
// הביצה
// ═══════════════════════════════════════════════════════════════
import { EGG_PRICE, HATCH_M, VARIANTS, rollVariant, canBuyEgg, eggWarmth, warmthWord, hatch, hasVariant } from '../src/app/wilden/engine/egg.js'

test('ביצה: ההגרלה לפי ההסתברויות, ולכל צבע יש שם וצבע', () => {
  assert.equal(VARIANTS.reduce((s, v) => s + v.p, 0).toFixed(2), '1.00')
  assert.equal(rollVariant(() => 0.1).id, 'gold')
  assert.equal(rollVariant(() => 0.8).id, 'night')
  assert.equal(rollVariant(() => 0.97).id, 'ice')
  for (const v of VARIANTS) { assert.ok(v.name); assert.equal(v.tint.length, 3); assert.equal(v.glow.length, 3) }
  // בהגרלה אמיתית קרח הוא נדיר
  let ice = 0
  for (let i = 0; i < 4000; i++) if (rollVariant().id === 'ice') ice++
  assert.ok(ice > 80 && ice < 340, 'קרח ~5%: ' + ice)
})

test('ביצה: קונים רק עם מטבעות, רק עם יצור אחד לפחות, ורק אחת', () => {
  assert.ok(!canBuyEgg({ coins: 100, creatures: [] }), 'בלי יצור — למי היא תבקע?')
  assert.ok(!canBuyEgg({ coins: EGG_PRICE - 1, creatures: ['nimi'] }))
  assert.ok(canBuyEgg({ coins: EGG_PRICE, creatures: ['nimi'] }))
  assert.ok(!canBuyEgg({ coins: 100, creatures: ['nimi'], egg: { boughtAt: 1 } }), 'אחת בכל פעם')

  let g = initial()
  g = { ...g, progress: { ...g.progress, coins: 50, creatures: ['nimi'] } }
  const before = g
  g = reduce(g, { type: 'BUY_EGG', t: 7 })
  assert.equal(g.progress.coins, 10)
  assert.deepEqual(g.progress.egg, { boughtAt: 7 })
  assert.equal(reduce(g, { type: 'BUY_EGG', t: 8 }), g, 'שנייה לא נקנית')
  // לא במסך הבית — לא קונים
  const mid = started(['nimi'], before)
  assert.equal(reduce(mid, { type: 'BUY_EGG' }).progress.egg, null)
})

test('ביצה: מתחממת בהליכה, בוקעת בפורטל רק כשחמה, ואם לא — נשארת', () => {
  assert.equal(eggWarmth(0), 0)
  assert.equal(eggWarmth(HATCH_M / 2), 0.5)
  assert.equal(eggWarmth(HATCH_M * 3), 1)
  assert.equal(warmthWord(0), 'קרה')
  assert.equal(warmthWord(1), 'מוכנה לבקוע!')

  // מסע קצר: לא בקעה, הביצה נשארת, המטבעות לא חוזרים
  let g = initial()
  g = { ...g, progress: { ...g.progress, coins: 50, creatures: ['nimi'] } }
  g = reduce(g, { type: 'BUY_EGG', t: 1 })
  g = started(['dabashon'], g)
  g = walk(g, 200)
  g = catchHere(g, 500000)
  g = reduce(g, { type: 'PORTAL_OPEN' })
  g = reduce(g, { type: 'PORTAL_ENTERED', t: 9, rng: () => 0.1 })
  assert.equal(g.hatched, null)
  assert.deepEqual(g.progress.egg, { boughtAt: 1 }, 'הביצה מחכה למסע הבא')
  assert.deepEqual(g.progress.variants, [])
  g = reduce(g, { type: 'RUN_CLOSED' })

  // מסע ארוך (יום אחר — הסיפור הוא אחד ליום): בוקעת. דבשון נתפס אתמול —
  // גם הוא יכול לצאת מהביצה
  g = { ...g, progress: { ...g.progress, lastStoryDay: null } }
  g = started(['kraag'], g)
  assert.equal(g.state, S.SEARCH)
  g = walk(g, HATCH_M + 100)
  g = catchHere(g, 900000)
  g = reduce(g, { type: 'PORTAL_OPEN' })
  const seq = [0.1, 0.99]     // זהוב; מהמאגר — האחרון
  let i = 0
  g = reduce(g, { type: 'PORTAL_ENTERED', t: 11, rng: () => seq[i++ % seq.length] })
  assert.ok(g.hatched, 'בקעה')
  assert.equal(g.hatched.variant, 'gold')
  assert.ok(['nimi', 'dabashon', 'kraag'].includes(g.hatched.creature))
  assert.equal(g.progress.egg, null)
  assert.equal(g.progress.variants.length, 1)
  assert.equal(g.progress.variants[0].at, 11)
  assert.ok(hasVariant(g.progress, g.hatched.creature, 'gold'))
  g = reduce(g, { type: 'RUN_CLOSED' })
  assert.equal(g.hatched, null, 'הרגע נגמר, לא חוזר על המסך')
})

test('ביצה: מעדיפה יצור שעוד אין לו את הצבע הזה', () => {
  const p = { creatures: ['nimi', 'dabashon'], variants: [{ creature: 'nimi', variant: 'gold' }] }
  for (let k = 0; k < 20; k++) {
    const h = hatch(p, () => 0.1)         // תמיד זהוב
    assert.equal(h.creature, 'dabashon', 'לנימי כבר יש זהוב')
  }
  // לכולם יש — מה שיוצא
  const all = { creatures: ['nimi'], variants: [{ creature: 'nimi', variant: 'gold' }] }
  assert.equal(hatch(all, () => 0.1).creature, 'nimi')
  assert.equal(hatch({ creatures: [] }), null)
})

test('ביצה: נשלחת לשרת ומתמזגת, ומה שבקע לא נעלם', () => {
  let g = initial()
  g = { ...g, progress: { ...g.progress, coins: 50, creatures: ['nimi'], variants: [{ creature: 'nimi', variant: 'ice', at: 1 }] } }
  g = reduce(g, { type: 'BUY_EGG', t: 2 })
  const out = forServer(g)
  assert.deepEqual(out.progress.egg, { boughtAt: 2 })
  assert.equal(out.progress.variants.length, 1)

  const local = { walks: 1, coins: 0, creatures: ['nimi'], res: {}, story: {}, variants: [{ creature: 'nimi', variant: 'ice' }] }
  const remote = { walks: 3, coins: 5, creatures: ['nimi', 'dabashon'], res: {}, story: {}, variants: [{ creature: 'dabashon', variant: 'gold' }], egg: { boughtAt: 9 } }
  const m = mergeProgress(local, remote)
  assert.equal(m.variants.length, 2)
  assert.deepEqual(m.egg, { boughtAt: 9 })
})

import { endpointLabel, failureLabel, ENDPOINTS } from '../src/app/wilden/engine/overpassQuery.js'
test('רחובות: כל שרת בשם קצר, וכל כישלון במילה אחת', () => {
  assert.deepEqual(ENDPOINTS.map(endpointLabel), ['de', 'kumi', 'coffee', 'fr', 'ru'])
  assert.equal(failureLabel(new Error('http 429')), 'blocked', '429 = חסימה זמנית, וזו הודעה אחרת להורה')
  assert.equal(failureLabel(new Error('http 502')), '502')
  assert.equal(failureLabel(new Error('http 504')), '504')
  assert.equal(failureLabel(Object.assign(new Error('x'), { name: 'AbortError' })), 'timeout')
  assert.equal(failureLabel(new Error('timeout')), 'timeout')
  assert.equal(failureLabel(new TypeError('Failed to fetch')), 'net')
  assert.equal(failureLabel(new Error('bad body')), 'bad')
  assert.equal(failureLabel(null), 'fail')
})

import { floorCue, cueText } from '../src/app/wilden/engine/turns.js'
test('הוראות: לא "הסימן כאן" כשהוא 200 מ׳ בקו ישר', () => {
  // עומדים בבית, המסלול חושב שאנחנו אחרי היעד → dist 0
  const bad = { kind: 'target', dist: 0 }
  assert.equal(cueText(bad, 'הסימן'), 'הסימן כאן.')
  const fixed = floorCue(bad, 210)
  assert.equal(cueText(fixed, 'הסימן'), 'ישר 210 מ׳ עד הסימן.')
  // באמת ליד היעד — נשאר "כאן"
  assert.equal(cueText(floorCue({ kind: 'target', dist: 12 }, 9), 'הסימן'), 'הסימן כאן.')
  // פנייה — לא נוגעים; בלי מרחק — לא נוגעים
  const turn = { kind: 'turn', dir: 'left', dist: 40 }
  assert.equal(floorCue(turn, 500), turn)
  assert.equal(floorCue(bad, null), bad)
})

import { cueGlyph, timeLeftMs, fmtClock, turnsFor as turnsFor2, nextCue } from '../src/app/wilden/engine/turns.js'
import { plannedMs, CATCH_BONUS } from '../src/app/wilden/engine/coins.js'
import { cheer, milestone, CHEERS } from '../src/app/wilden/content/cheers.js'
import { buildGraph, planLoop, loopSteps } from '../src/app/wilden/engine/routing.js'

test('הוראות: שם הרחוב נוסע עם הפנייה, וחץ גדול לכל הוראה', () => {
  // רחוב ישר צפונה ואז פנייה ימינה לרחוב בשם
  const a = HOME, b = destination(HOME, 0, 200), c = destination(b, 90, 200)
  const path = [{ ...a, street: 'הרצל' }, { ...b, street: 'הרצל' }, { ...c, street: 'ביאליק' }]
  const turns = turnsFor2(path)
  assert.equal(turns.length, 1)
  assert.equal(turns[0].dir, 'right')
  assert.equal(turns[0].street, 'ביאליק')
  const cue = nextCue(turns, 50, 1000)
  assert.equal(cue.street, 'ביאליק')
  assert.equal(cueText(cue), 'עוד 150 מ׳ פנו ימינה לביאליק.')
  assert.equal(cueGlyph(cue), '↱')
  assert.equal(cueGlyph({ kind: 'turn', dir: 'left', dist: 10 }), '↰')
  assert.equal(cueGlyph({ kind: 'target', dist: 300 }), '⬆')
  assert.equal(cueGlyph({ kind: 'target', dist: 10 }), '📍')
  // בלי שם — כמו קודם
  assert.equal(cueText({ kind: 'turn', dir: 'left', dist: 100 }), 'עוד 100 מ׳ פנו שמאלה.')
})

test('הוראות: הגרף שומר את שם הרחוב על הקשת, והלולאה מחזירה אותו', () => {
  const p = (b, d) => destination(HOME, b, d)
  const ways = [
    { tier: 0, name: 'הרצל', nodes: [HOME, p(0, 300), p(0, 600)] },
    { tier: 0, name: 'ביאליק', nodes: [p(0, 600), p(45, 700)] },
  ]
  const g = buildGraph(ways)
  const steps = loopSteps(g, [0, 1, 2, 3])
  assert.equal(steps[0].street, null, 'הנקודה הראשונה — עוד לא הלכנו ברחוב')
  assert.equal(steps[1].street, 'הרצל')
  assert.equal(steps[3].street, 'ביאליק')
})

test('טיימר: הזמן המתוכנן פחות מה שעבר, ולא מתחת לאפס', () => {
  assert.equal(plannedMs(0), 30 * 60000)
  assert.equal(plannedMs(3), 45 * 60000)
  assert.equal(timeLeftMs(1000, 60000, 31000), 30000)
  assert.equal(timeLeftMs(1000, 60000, 99000), 0)
  assert.equal(timeLeftMs(null, 60000, 5), null)
  assert.equal(fmtClock(30000), '0:30')
  assert.equal(fmtClock(23 * 60000 + 5000), '23:05')
  // ROUTE_READY רושם את שעת ההתחלה
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: PATH, home: HOME, t: 4242 })
  assert.equal(g.run.walkStartedAt, 4242)
})

test('תפיסה שווה מטבעות, והמונה יודע כמה מהם על התפיסה', () => {
  let g = started(['nimi'])
  g = walk(g, 200)
  const before = g.run.coinsTaken
  g = catchHere(g, 500000)
  assert.equal(g.run.coinsTaken, before + CATCH_BONUS)
  assert.equal(g.run.catchBonus, CATCH_BONUS)
  g = reduce(g, { type: 'PORTAL_OPEN' })
  g = reduce(g, { type: 'PORTAL_ENTERED', t: 1 })
  assert.equal(g.progress.coins, before + CATCH_BONUS, 'הבונוס נכנס לארנק')
})

test('עידוד: כל 10 מטבעות, חצי דרך פעם אחת, ולא אותו משפט פעמיים', () => {
  assert.ok(CHEERS.catch.length >= 3)
  assert.notEqual(cheer('catch', 0), cheer('catch', 1))
  assert.equal(milestone({ coinsBefore: 8, coinsNow: 9 }), null)
  const m = milestone({ coinsBefore: 9, coinsNow: 11 })
  assert.equal(m.kind, 'coins'); assert.ok(m.text.startsWith('10 מטבעות!'))
  const h = milestone({ alongBefore: 900, alongNow: 1010, total: 2000 })
  assert.equal(h.kind, 'half')
  assert.equal(milestone({ alongBefore: 1010, alongNow: 1100, total: 2000 }), null, 'חצי דרך רק פעם אחת')
  assert.equal(milestone({ coinsBefore: 0, coinsNow: 0 }), null)
})

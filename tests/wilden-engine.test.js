// ─── בדיקות המנוע ───
// כל מסע 1 רץ כאן מקצה לקצה בלי GPS, בלי דפדפן ובלי ללכת ברגל.
// זו הסיבה שהמכונה נכתבה טהורה: פיילוט של ארבעה־עשר יום ידרוש תיקונים
// תוך כדי, ואי אפשר לבדוק כל תיקון בהליכה של חצי שעה בשכונה.
//
//   node --test tests/

import test from 'node:test'
import assert from 'node:assert/strict'

import { destination, haversine, stepBetween, progressAlong } from '../src/app/wilden/engine/geo.js'
import { phaseOf, powerOf, PHASE, ACC_GATE, WALK_GATE, STILL_MS } from '../src/app/wilden/engine/beacon.js'
import { initial, reduce, run, beaconView, S, RUN, MODE, canStartStory } from '../src/app/wilden/engine/machine.js'
import { forServer } from '../src/app/wilden/engine/persist.js'
import { revalidate, PLACE_AFTER } from '../src/app/wilden/engine/placement.js'
import { STRUCTURE, GUARDIAN_STATE, affordanceOf, isEnterable, KRAAG_AWAKENS } from '../src/app/wilden/content/canon.js'

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

function started() {
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: PATH, home: HOME })
  g = reduce(g, { type: 'SET_CREATURE', id: 'nimi' })
  return g
}

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
  assert.equal(
    phaseOf({ ...base, acc: ACC_GATE + 1 }), PHASE.SIGNAL_WEAK,
    'דיוק גרוע מקשיח, לא מרפה. זה הבאג של "שני יצורים בלי צעד"'
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
test('מיקום היצור: נוצר קדימה על המסלול, לא בנקודה שרירותית', () => {
  let g = started()
  assert.equal(g.run.target, null, 'לפני שיוצאים — אין יעד')

  g = walk(g, PLACE_AFTER - 20)
  assert.equal(g.run.target, null, 'עדיין לא הלכו מספיק')

  g = walk(g, 200)
  assert.ok(g.run.target, 'אחרי הליכה — היעד נוצר')

  const onPath = progressAlong(PATH, g.run.target)
  assert.ok(onPath.offPath < 5, 'היעד יושב על המסלול המאומת, לא מאחורי גדר')
  assert.ok(g.run.target.along > g.run.along, 'והוא קדימה, לא מאחור')
})

test('מיקום היצור: לא נוחת בסוף הלולאה', () => {
  let g = started()
  g = walk(g, 1150)
  const total = 60 * 20
  assert.ok(g.run.target.along <= total - 100, 'נשמר מרווח לפני הבית')
})

// ══════════════════════════════════════════════
test('resume: הילד זז — היעד עובר אליו, לא הוא לאתמול', () => {
  let g = started()
  g = walk(g, 200)
  const before = g.run.target

  // סגר את הטלפון, ופתח אותו 700 מ׳ הלאה — כבר עבר את היעד.
  const elsewhere = destination(HOME, 0, 700)
  g = reduce(g, { type: 'RESUME', lat: elsewhere.lat, lng: elsewhere.lng, acc: 10, t: 900000 })

  assert.equal(g.state, S.SEARCH, 'עדיין באותו מסע')
  assert.notDeepEqual(g.run.target, before, 'היעד מוקם מחדש')
  assert.ok(g.run.target.along > 700, 'וקדימה מהמקום שבו הוא עומד עכשיו')
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
  g = walk(g, 400)

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
  g = reduce(g, { type: 'ENCOUNTER_RESOLVED', befriended: false })
  assert.equal(g.state, S.SEARCH, 'כישלון מחזיר לחיפוש, לא מוחק כלום')
})

test('לא לוחצים "חפש" לפני שעוצרים', () => {
  let g = started()
  g = walk(g, 400)
  const before = g.state
  g = reduce(g, { type: 'SEARCH_PRESSED' })
  assert.equal(g.state, before, 'תוך כדי הליכה הכפתור לא עושה כלום')
})

// ══════════════════════════════════════════════
test('מסע 1 מקצה לקצה', () => {
  let g = started()
  g = walk(g, 400)
  const at = g.run.target
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 500000 })
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 505000 })

  g = run(g, [
    { type: 'SEARCH_PRESSED' },
    { type: 'CAMERA_READY' },
    { type: 'ADD_LOOT', kind: 'wood' },
    { type: 'ENCOUNTER_RESOLVED', befriended: true },
    { type: 'PORTAL_OPEN' },
    { type: 'PORTAL_ENTERED' },
  ])

  assert.equal(g.state, S.CLUE, 'משימה סיפורית נגמרת ברמז, לא במסך ניצחון')
  assert.deepEqual(g.progress.creatures, ['nimi'])
  assert.equal(g.progress.res.wood, 1)
  assert.equal(g.progress.missionsCompleted, 1)
  assert.equal(g.progress.story.m01, 'done')
  assert.equal(beaconView(g).power, 'REACTIVE', 'הביקון התחזק')

  g = reduce(g, { type: 'CLUE_SEEN' })
  assert.equal(g.state, S.RUN_COMPLETE)
})

// ══════════════════════════════════════════════
test('משימה סיפורית אחת ביום — אבל אין נעילה של יציאה נוספת', () => {
  let g = started()
  g = walk(g, 400)
  const at = g.run.target
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 500000 })
  g = reduce(g, { type: 'FIX', lat: at.lat, lng: at.lng, acc: 8, t: 505000 })
  g = run(g, [
    { type: 'SEARCH_PRESSED' }, { type: 'CAMERA_READY' },
    { type: 'ENCOUNTER_RESOLVED', befriended: true },
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

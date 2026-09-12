// ─── בדיקות המנוע ───
// כל מסע 1 רץ כאן מקצה לקצה בלי GPS, בלי דפדפן ובלי ללכת ברגל.
// זו הסיבה שהמכונה נכתבה טהורה: פיילוט של ארבעה־עשר יום ידרוש תיקונים
// תוך כדי, ואי אפשר לבדוק כל תיקון בהליכה של חצי שעה בשכונה.
//
//   node --test tests/

import test from 'node:test'
import assert from 'node:assert/strict'

import { destination, haversine, stepBetween, progressAlong, bearing as bearing2 } from '../src/app/wilden/engine/geo.js'
import { phaseOf, powerOf, PHASE, ACC_GATE, ACC_DIRECTION, WALK_GATE, STILL_MS, STILL_RADIUS } from '../src/app/wilden/engine/beacon.js'
import { initial, reduce, run, beaconView, S, RUN, MODE, canStartStory } from '../src/app/wilden/engine/machine.js'

import { revalidate, PLACE_AFTER } from '../src/app/wilden/engine/placement.js'
import { STRUCTURE, GUARDIAN_STATE, affordanceOf, isEnterable, KRAAG_AWAKENS } from '../src/app/wilden/content/canon.js'
import nimi from '../src/app/wilden/ar/controllers/nimi.js'
import dabashon from '../src/app/wilden/ar/controllers/dabashon.js'
import { loopTargetM, canBuyExtra, WALK_PLAN, goldNearby } from '../src/app/wilden/engine/coins.js'
import { createJumpDetector, jumpHeightCm, G } from '../src/app/wilden/engine/jump.js'
import { buildLoop, fallbackLoop, normalize, routeNote } from '../src/app/wilden/engine/loop.js'
import { routeArrows, splitAt, routeDirAt } from '../src/app/wilden/engine/mapLines.js'
import { freshEnd, placeStops as placeStops2 } from '../src/app/wilden/engine/placement.js'
import { collectCoins as collectCoins2 } from '../src/app/wilden/engine/coins.js'
import { pathLength as pathLength2 } from '../src/app/wilden/engine/geo.js'
import { angleDelta } from '../src/app/wilden/hooks/useOrient.js'
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

// "אורך המסלול. יצור יחסית באמצע ונמשך." לא ליד הבית — אבל גם לא בסוף:
// מה שמבטיח את ההליכה הוא אורך המסלול, והתפיסה היא אמצע הסיפור.
test('תחנות: היצור בערך באמצע — לא ליד הבית, ואחריו עוד מסלול', () => {
  const one = started()
  const total = 60 * 20
  assert.equal(one.run.stops.length, 1)
  const at = one.run.stops[0].along / total
  assert.ok(at >= 0.3 && at <= 0.65, `יצור יחיד בערך באמצע, התקבל ${at.toFixed(2)}`)
  assert.ok(total - one.run.stops[0].along >= 400, 'נשאר מסלול אחרי התפיסה')
  const two = started(['nimi', 'dabashon'])
  assert.ok(two.run.stops[0].along / total >= 0.25, 'הראשון לא ליד הבית')
  assert.ok(two.run.stops[1].along / total <= 0.8, 'וגם השני לא בסוף')
  assert.ok(two.run.stops[1].along > two.run.stops[0].along)
})

// ══════════════════════════════════════════════
// קפיצה: מד התאוצה רואה דחיפה, ריחוף, נחיתה. נענוע יד — לא.
test('מסלול: קיצור דרך אל היצור לא פותח אותו — המרחק הוא לאורך המסלול', () => {
  // מסלול בצורת ר: 400 מ' צפונה, ואז 400 מ' מזרחה. היצור בקצה (800 לאורך).
  const corner = destination(HOME, 0, 400)
  const path = [
    ...Array.from({ length: 21 }, (_, i) => destination(HOME, 0, i * 20)),
    ...Array.from({ length: 20 }, (_, i) => destination(corner, 90, (i + 1) * 20)),
  ]
  const end = path[path.length - 1]
  const base = {
    ...initial(),
    state: S.SEARCH,
    run: { path, home: HOME, pos: HOME, lastFix: HOME, walkRef: HOME, stillRef: HOME, lastT: 0,
      along: 0, walked: 0, acc: 8, stillMs: 0, coins: [], coinsTaken: 0, stops: null, resolved: false,
      target: { ...end, along: 800 } },
  }
  const feed = (g, pts, t0 = 1000) => {
    let t = t0
    for (const p of pts) { g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc: 8, t }); t += 5000 }
    return g
  }
  // קיצור באלכסון: 566 מ' באוויר במקום 800 על המסלול.
  const diag = Array.from({ length: 29 }, (_, i) => {
    const f = (i + 1) / 29
    return { lat: HOME.lat + (end.lat - HOME.lat) * f, lng: HOME.lng + (end.lng - HOME.lng) * f }
  })
  const cut = feed(base, diag)
  assert.ok(cut.run.along < 640, `ההתקדמות לא קפצה ל-800: ${Math.round(cut.run.along)}`)
  const vCut = beaconView(cut)
  assert.equal(vCut.canSearch, false, 'עומדים עליו באוויר — אבל את המסלול לא הלכו')
  assert.equal(vCut.shortcut, true)
  assert.match(vCut.line, /קיצר/, 'ואומרים לו את זה: ' + vCut.line)
  // אותו יצור, דרך המסלול: נפתח.
  let full = feed(base, path.slice(1))
  assert.ok(full.run.along > 780, `על המסלול ההתקדמות מלאה: ${Math.round(full.run.along)}`)
  full = feed(full, [end, end, end], 400000)   // עומדים במקום ארבע שניות
  const vFull = beaconView(full)
  assert.equal(vFull.shortcut, false)
  assert.equal(vFull.canSearch, true, 'הלכו את המסלול — אפשר לחפש')
})

import { SPOTS, GUARDIAN, FIGURE, figureBox, gapBetween } from '../src/app/wilden/content/spots.js'

// "אפשר שהמיקום של כל חיה שנתפסת יהיה במרחב, קצת במרחק מהדמויות האחרות?"
// נימי נצמד לרגל של השומר אחרי שהוא עבר למרכז. הבדיקה הזאת לא תיתן
// לזה לקרות שוב — גם לא כשכל היצורים אגדיים וגדולים ב-30%.
test('עולם הבית: לכל דמות מקום משלה, עם מרווח — וגם כשכולן אגדיות', () => {
  const all = { ...SPOTS, guardian: GUARDIAN }
  for (const id of Object.keys(all)) assert.ok(FIGURE[id], `אין מידות לקובץ של ${id}`)
  const boxes = (grow = 1) => Object.fromEntries(Object.entries(all).map(([id, sp]) =>
    [id, figureBox(id, { ...sp, h: sp.h * (id === 'guardian' ? 1 : grow) })]))
  const check = (grow, min, what) => {
    const b = boxes(grow)
    const ids = Object.keys(b)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const g = gapBetween(b[ids[i]], b[ids[j]])
        assert.ok(g >= min, `${what}: ${ids[i]} ו-${ids[j]} במרחק ${g.toFixed(1)}% (צריך ${min}%)`)
      }
    }
    // ובתוך התמונה
    for (const [id, x] of Object.entries(b)) {
      assert.ok(x.left >= 0 && x.right <= 100, `${id} גולש בצדדים: ${x.left.toFixed(1)}–${x.right.toFixed(1)}`)
      assert.ok(x.top >= 0 && x.bottom <= 100, `${id} גולש למעלה/למטה: ${x.top.toFixed(1)}–${x.bottom.toFixed(1)}`)
    }
  }
  check(1, 2.5, 'שלב 1')
  // בשלב 3 כולם גדולים ב-30% ובולדר לבדו תופס רבע מהרוחב במרכז. מותרת
  // נגיעה קלה בין שכנים — לא דמות שיושבת על דמות.
  check(1.3, -1.5, 'שלב 3')
  const big = figureBox('bolder', SPOTS.bolder)
  assert.ok(big.right - big.left >= 20, 'בולדר הוא גוש: רחב מכולם')
  for (const id of Object.keys(SPOTS)) {
    if (id === 'bolder') continue
    assert.ok(SPOTS[id].h < SPOTS.bolder.h - 6, `בולדר צריך להיות גדול מ-${id} בבירור`)
  }
  // הרגליים: foot הוא מה שיש בקובץ, ובלעדיו הדמות מרחפת מעל הצל שלה
  for (const [id, sp] of Object.entries(SPOTS)) {
    assert.ok(Math.abs((sp.foot ?? 0) - (1 - FIGURE[id].bot)) < 0.02, `foot של ${id} לא תואם לקובץ`)
  }
})

import { formsOf, formTally, staged as staged2 } from '../src/app/wilden/engine/stages.js'
import { CREATURES as CRE2 } from '../src/app/wilden/content/creatures.js'

// "ספר היצורים צריך לכלול יותר מ-9, שיראו המון דמויות."
test('ספר: כל יצור הוא שלוש צורות — 27 בסך הכול, ועוד צבעים', () => {
  const ids = Object.keys(CRE2)
  assert.equal(ids.length, 9)
  const empty = { creatures: [], caught: {} }
  const t0 = formTally(empty, ids.map(id => CRE2[id]))
  assert.equal(t0.total, 27, 'תשעה יצורים, שלוש צורות לכל אחד')
  assert.equal(t0.open, 0)
  // לכל צורה יש דמות להראות — גם לנעולה (צללית של אותה דמות)
  for (const id of ids) {
    const forms = formsOf(empty, CRE2[id])
    assert.equal(forms.length, 3)
    assert.deepEqual(forms.map(f => f.open), [false, false, false])
    for (const f of forms) {
      const c = staged2(CRE2[id], f.stage)
      assert.ok(c.poster, `אין פוסטר ל-${id} שלב ${f.stage}`)
    }
  }
  // תפסו את נימי שלוש פעמים: גור ובוגר פתוחים, אגדי עוד לא
  const p3 = { creatures: ['nimi'], caught: { nimi: 3 } }
  const f3 = formsOf(p3, CRE2.nimi)
  assert.deepEqual(f3.map(f => f.open), [true, true, false])
  assert.equal(f3[2].left, 4, 'עוד ארבע תפיסות והוא אגדי')
  assert.equal(formTally(p3, ids.map(id => CRE2[id])).open, 2)
  // צבע שבקע הוא צורה נוספת בשורה
  const pc = { ...p3, variants: [{ creature: 'nimi', variant: 'forest' }] }
  const fc = formsOf(pc, CRE2.nimi)
  assert.equal(fc.length, 4)
  assert.equal(fc[3].kind, 'look')
  assert.equal(fc[3].name, 'יער')
  assert.equal(formTally(pc, ids.map(id => CRE2[id])).colours, 1)
})

test('שלבים: לאגדי אין עדיין חומר — הוא לובש את דמות הבוגר, לא את הגור', () => {
  const c3 = staged2(CRE2.nimi, 3)
  assert.equal(c3.live, CRE2.nimi.stages[2].live, 'דמות הבוגר, לא של הגור')
  assert.equal(c3.aura, true, 'ועם הילה, כי זה לא באמת החומר של אגדי')
  assert.ok(c3.heightM > CRE2.nimi.heightM)
  const c2 = staged2(CRE2.nimi, 2)
  assert.equal(c2.aura, false, 'לבוגר יש חומר משלו')
})

import { safeAlong, riskAt, JUNCTION_M, isFootKind, stopInfo, kindName } from '../src/app/wilden/engine/placement.js'

// "איך נוודא שהיצור על השביל? הוא אמור להיות כמו המטבעות על המסלול."
// אותו מנגנון בדיוק: pointAlong על המסלול. הבדיקה מוודאת את זה על
// מסלול מפותל — כל תחנה, כל מטבע, על הקו.
test('בטיחות: היצור יושב על המסלול עצמו, כמו מטבע', async () => {
  const { placeCoins } = await import('../src/app/wilden/engine/coins.js')
  const { placePois, poisFor } = await import('../src/app/wilden/engine/plan.js')
  // מסלול מפותל: שמונה קטעים בכיוונים מתחלפים
  const pts = [{ ...HOME, kind: 'residential' }]
  let cur = HOME
  for (const [b, d] of [[0, 300], [90, 220], [0, 260], [270, 240], [180, 300], [90, 280], [180, 260], [270, 260]]) {
    cur = destination(cur, b, d)
    pts.push({ ...cur, kind: 'residential' })
  }
  // מצפיפים נקודות על כל קטע, כמו מסלול אמיתי מהגרף
  const path = []
  for (let i = 1; i < pts.length; i++) {
    const seg = haversine(pts[i - 1], pts[i])
    const b = bearing2(pts[i - 1], pts[i])
    for (let d = 0; d < seg; d += 20) path.push({ ...destination(pts[i - 1], b, d), kind: pts[i].kind, junction: false })
  }
  path.push({ ...pts[pts.length - 1], kind: 'residential', junction: false })
  const plan = placePois(path, poisFor(3, 1), { creatures: ['nimi', 'gali'] })
  const coins = placeCoins(path, { stops: plan.stops, goldAlong: plan.goldAlong })
  // המרחק מהנקודה אל קו המסלול — בדיוק מה ש-progressAlong מודדת
  const onPath = p => progressAlong(path, p).offPath
  for (const s of plan.stops) assert.ok(onPath(s) < 1, `יצור על המסלול: ${onPath(s).toFixed(2)} מ׳`)
  for (const c of [plan.coinRun, plan.flowerRun].filter(Boolean)) assert.ok(onPath(c) < 1)
  for (const c of coins) assert.ok(onPath(c) < 1, 'מטבע על המסלול')
  // ומה שמוצג בשטח: על מה היא יושבת
  const info = stopInfo(path, plan.stops[0].along)
  assert.equal(info.kind, 'residential')
  assert.equal(kindName(info.kind), 'רחוב מגורים')
  assert.equal(info.foot, false)
})

// "הבעיה הקשה של המשחק: היצורים באמצע כבישים או מעברים חדים ולא על המדרכות."
test('בטיחות: התחנה מתרחקת מצומת, ומעדיפה שביל על כביש', () => {
  const at = (d, extra) => ({ ...destination(HOME, 0, d), ...extra })
  // רחוב ישר: צומת ב-300, ומ-400 והלאה זה שביל להולכי רגל
  const path = [at(0, {}), at(100, { kind: 'residential' }), at(300, { kind: 'residential', junction: true }),
    at(400, { kind: 'residential' }), at(600, { kind: 'footway' })]
  assert.ok(isFootKind('footway') && isFootKind('pedestrian') && !isFootKind('residential'))
  // בדיוק על הצומת — הכי גרוע
  assert.ok(riskAt(path, 300) > riskAt(path, 200), 'צומת מסוכן יותר מאמצע רחוב')
  assert.ok(riskAt(path, 500) < riskAt(path, 200), 'שביל בטוח יותר מרחוב')
  // תחנה שנפלה על הצומת — זזה ממנו
  const moved = safeAlong(path, 300)
  assert.ok(Math.abs(moved - 300) >= JUNCTION_M, `זזה מהצומת: ${Math.round(moved)}`)
  // תחנה ליד השביל — עולה עליו
  const onFoot = safeAlong(path, 380)
  assert.ok(onFoot >= 400, `עברה לשביל: ${Math.round(onFoot)}`)
  // רחוב אחיד בלי צמתים — לא זזה סתם
  const plain = [at(0, {}), at(300, { kind: 'residential' }), at(600, { kind: 'residential' })]
  assert.equal(safeAlong(plain, 300), 300)
})

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
// הלוח של הבן שלה: מטבעות, 30 ואז 45 דקות, שניים בדרך, שלישי בתשלום.
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
  assert.deepEqual(g.run.stops.map(s => s.creature), ['lumi', 'bolder'], 'בלי תשלום — שניים; המסע השלישי הוא של לומי, ובולדר מהצד השני של הסבב')

  let h = initial()
  h = { ...h, progress: { ...h.progress, walks: 2, coins: 100 } }
  h = reduce(h, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0, extra: true })
  assert.equal(h.progress.coins, 100 - WALK_PLAN.extraCost, 'שולם מראש')
  h = reduce(h, { type: 'PERMISSION_GRANTED', home: HOME })
  h = reduce(h, { type: 'ROUTE_READY', path: PATH, home: HOME })
  assert.deepEqual(h.run.stops.map(s => s.creature), ['lumi', 'bolder', 'gali'], 'שלושה בדרך — והשלישי הוא מישהו אחר')
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

// ══════════════════════════════════════════════
// "הלכנו 7 דקות, דבשון היה וזהו."
// המסלול היה הלוך ושוב, והיצור הונח ב-80% ממנו — שזה פיזית 600 מ' מהבית,
// על הרחוב שהולכים בו החוצה. הילד פגש אותו בדרך החוצה, אחרי שבע דקות.

// הלוך ושוב: 1000 מ' צפונה ובחזרה, נקודה כל 50 מ'.
function thereAndBack(meters = 1000, step = 50) {
  const out = []
  for (let d = 0; d <= meters; d += step) out.push({ ...destination(HOME, 0, d), street: 'הראשי' })
  return out.concat(out.slice(0, -1).reverse())
}

test('הלוך ושוב: היצור מחכה בקצה, לא על הרחוב שכבר הלכנו בו', () => {
  const path = thereAndBack()
  assert.ok(freshEnd(path) >= 950 && freshEnd(path) <= 1010, `הקצה החדש ליד נקודת המפנה: ${freshEnd(path)}`)
  const [stop] = placeStops2(path, 1, { creatures: ['dabashon'] })
  assert.ok(stop.along >= 800, `התחנה ליד המפנה, לא ב-80% מהדרך: ${Math.round(stop.along)}`)
  assert.ok(haversine(stop, destination(HOME, 0, 1000)) < 220, 'ופיזית רחוק מהבית, לא 7 דקות')
  // שתי תחנות — שתיהן בדרך החוצה
  const two = placeStops2(path, 2, { creatures: ['nimi', 'dabashon'] })
  assert.equal(two.length, 2)
  assert.ok(two.every(s => s.along <= 1010), 'אף אחת לא בדרך חזרה')
  assert.ok(two[1].along - two[0].along >= 150, 'ומרווח ביניהן')
  // לולאה רגילה: כמעט הכול "חדש", והתחנה ב-80% כרגיל
  const loop = PATH
  assert.ok(freshEnd(loop) > pathLength2(loop) * 0.85, 'בלולאה הקצה החדש הוא כמעט הסוף')
})

test('הלוך ושוב: המונה לאורך יודע אם אנחנו בדרך החוצה או בדרך חזרה', () => {
  const path = thereAndBack()
  const at600 = destination(HOME, 0, 600)
  assert.ok(Math.abs(progressAlong(path, at600, 550).along - 600) < 5, 'בדרך החוצה')
  assert.ok(Math.abs(progressAlong(path, at600, 1350).along - 1400) < 5, 'אותה נקודה בדרך חזרה = 1400')
  // רגע המפנה: מ-1000 ממשיכים קדימה, לא חוזרים אחורה לאורך
  const at980 = destination(HOME, 0, 980)
  assert.ok(progressAlong(path, at980, 1000).along >= 1000, 'אחרי המפנה המונה ממשיך לעלות')
  // בלי prevAlong — כמו קודם, הקטע הראשון
  assert.ok(Math.abs(progressAlong(path, at600).along - 600) < 5)
})

test('הלוך ושוב: מטבע של הדרך חזרה לא נאסף בדרך החוצה', () => {
  const at600 = destination(HOME, 0, 600)
  const coins = [{ id: 'a', ...at600, along: 600, value: 1, taken: false }, { id: 'b', ...at600, along: 1400, value: 1, taken: false }]
  const out = collectCoins2(coins, at600, undefined, 600)
  assert.deepEqual(out.got.map(c => c.id), ['a'], 'רק מטבע הדרך החוצה')
  const back = collectCoins2(out.coins, at600, undefined, 1395)
  assert.deepEqual(back.got.map(c => c.id), ['b'], 'ובדרך חזרה — השני')
  assert.equal(collectCoins2(coins, at600).got.length, 2, 'בלי along — כמו קודם')
})

test('הלוך ושוב מקצה לקצה: בדרך החוצה אין מפגש, בקצה יש, ובדרך חזרה מטבעות כפול', () => {
  const path = thereAndBack(1000, 50)
  let g = initial()
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0 })
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path, home: HOME, creatures: ['dabashon'], t: 0 })
  assert.equal(g.run.stops.length, 1)
  // הדרך החוצה היא החלק ה"חדש": היצור בערך באמצעה — ואחריו עוד קילומטר וחצי
  const stopAt = g.run.target.along
  assert.ok(stopAt >= 450 && stopAt <= 800, `היצור באמצע הדרך החוצה: ${Math.round(stopAt)}`)
  assert.ok(2000 - stopAt >= 1200, 'ונשאר מסלול ארוך אחרי התפיסה')
  // 400 מ' החוצה: עדיין לא "כאן"
  g = walk(g, 400)
  assert.equal(g.state, S.SEARCH)
  assert.ok(haversine(g.run.pos, g.run.target) > 100, 'בדרך החוצה היצור עוד רחוק')
  assert.ok(Math.abs(g.run.along - 400) < 30, `המונה לאורך: ${Math.round(g.run.along)}`)
  const coinsOut = g.run.coinsTaken
  assert.ok(coinsOut >= 2 && coinsOut <= 10, `מטבעות בדרך החוצה בלבד (עם דחף): ${coinsOut}`)
  // עד היצור, ותפיסה
  let t = 1000 + 27 * 10000
  for (let d = 415; d <= stopAt; d += 15) { const p = destination(HOME, 0, d); g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc: 10, t }); t += 10000 }
  g = catchHere(g, t + 1000)
  assert.equal(g.state, S.CAUGHT)
  assert.equal(g.run.resolved, true, 'יצור אחד — המסע נפתר, וממשיכים איתו')
  g = reduce(g, { type: 'CONTINUE' })
  assert.equal(g.state, S.SEARCH)
  // וממשיכים: עד המפנה ובחזרה. המונה ממשיך מעל 1000, והמטבעות נאספים כפול
  t += 200000
  const before = g.run.coinsTaken
  for (let d = stopAt + 15; d <= 1000; d += 15) { const p = destination(HOME, 0, d); g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc: 10, t }); t += 10000 }
  for (let d = 985; d >= 0; d -= 15) { const p = destination(HOME, 0, d); g = reduce(g, { type: 'FIX', lat: p.lat, lng: p.lng, acc: 10, t }); t += 10000 }
  assert.ok(g.run.along > 1900, `המונה בסוף הדרך חזרה: ${Math.round(g.run.along)}`)
  assert.ok(g.run.coinsTaken - before >= 6, `מטבעות בדרך חזרה: ${g.run.coinsTaken - before}`)
})

test('סולם: הלוך ושוב מלא עדיף על לולאה של חצי אורך', () => {
  // רחוב ארוך אחד ובלוק קטן לידו: יש לולאה של ~800 מ', ויש הלוך ושוב של 3.2 ק"מ
  const base = oneStreet(HOME, 2000, 100)
  const a = destination(HOME, 0, 200), b = destination(a, 90, 200), c = destination(b, 180, 200)
  base.elements.push({ type: 'way', id: 2, tags: { highway: 'residential', name: 'סמטה' },
    geometry: [{ lat: a.lat, lon: a.lng }, { lat: b.lat, lon: b.lng }, { lat: c.lat, lon: c.lng }, { lat: HOME.lat, lon: HOME.lng }] })
  const r = buildLoop(base, HOME, 3200)
  assert.equal(r.ok, true)
  assert.ok(r.meters >= 2400, `מסע מלא, לא ${Math.round(r.meters)} מ'`)
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

test('מפה: הדמות פונה לכיוון הנכון — המסלול מהמקום שבו אנחנו, לא לאן שהלכנו', () => {
  const a = HOME, b = destination(HOME, 0, 400), c = destination(b, 90, 300)
  const path = [a, b, c]
  const near = (x, y) => Math.abs(angleDelta(x, y)) < 1.5
  assert.ok(near(routeDirAt(path, 0), 0), 'ביציאה — צפונה')
  assert.ok(near(routeDirAt(path, 200), 0), 'באמצע הרחוב — עדיין צפונה')
  // 15 מ' לפני הפנייה, המבט 25 מ' קדימה כבר מתחיל לפנות מזרחה
  const d = routeDirAt(path, 385)
  assert.ok(d > 5 && d < 85, `לפני הפנייה: ${Math.round(d)}°`)
  assert.ok(near(routeDirAt(path, 450), 90), 'אחרי הפנייה — מזרחה')
  assert.ok(near(routeDirAt(path, 5000), 90), 'מעבר לסוף — הכיוון האחרון')
  assert.equal(routeDirAt(null, 0), null)
  assert.equal(routeDirAt([a], 0), null)
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
import { forServer } from '../src/app/wilden/engine/persist.js'
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
  assert.ok(b1.line.includes('האני'), b1.line)
  assert.ok(b1.line.includes('מסע 2'))
  assert.ok(b1.sub.includes('דבש'), 'יצור חדש — מה הוא מביא')

  const b2 = briefFor({ walks: 2, creatures: ['nimi', 'dabashon'] })
  assert.equal(b2.creature, 'lumi')
  assert.ok(b2.sub.includes('ניצוץ'))

  // שמונה יצורים, רצפה ואוויר לסירוגין, בולדר לפני קראג
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(w => todaysCreature({ walks: w }).id), ['nimi', 'dabashon', 'lumi', 'ruchi', 'gali', 'tzel', 'bolder', 'kraag'])
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(w => todaysCreature({ walks: w }).arMode), ['ground', 'sky', 'ground', 'sky', 'ground', 'ground', 'ground', 'ground'])
  assert.ok(briefFor({ walks: 6, creatures: [] }).sub.includes('אבן'), 'בולדר מביא אבן')

  // מסע 9 — נוגה, התשיעית. הסבב חוזר: מסע 10 — שוב נימי, כ"שוב בחוץ" ולא כמסע 1
  assert.equal(todaysCreature({ walks: 8 }).id, 'noga')
  const b9 = briefFor({ walks: 9, creatures: ['nimi', 'dabashon', 'lumi', 'ruchi', 'gali', 'tzel', 'bolder', 'kraag', 'noga'] })
  assert.equal(b9.creature, 'nimi')
  assert.equal(b9.missionId, null)
  assert.ok(b9.sub.includes('שוב'))
  assert.equal(todaysCreature({ walks: 10 }).id, 'dabashon')
})

test('הבית אחרי הפורטל: מסע 1 — הסיפור; אחר כך — מי שנתפס ומי שמחכה', () => {
  const m01 = homeFor({ missionId: 'm01' }, { walks: 1 })
  assert.ok(m01.line.includes('נימי'))
  assert.equal(m01.clue.line, 'מישהו כאן ידע לבנות.')

  const run = { missionId: null, stops: [{ creature: 'dabashon', done: true }] }
  const h = homeFor(run, { walks: 2 })
  assert.ok(h.line.includes('האני'), h.line)
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
  // מהמסע השני — שניים. הראשון לפי הלוח (האני), והשני הוא מי שהשומר
  // מחכה לו: הבקשה הפתוחה היא "אבן", ואבן מביא בולדר.
  assert.equal(g.run.wantCreatures[0], 'dabashon')
  assert.equal(g.run.wantCreatures.length, 2)
  assert.ok(['bolder', 'kraag'].includes(g.run.wantCreatures[1]), 'השני מביא את מה שחסר: ' + g.run.wantCreatures[1])
})

// "אני לא רוצה שהמשחק ייגמר מהר מדי" — והחלק השני של אותו תיקון:
// הבקשה לא נתקעת מסעות שלמים כי היצור הנכון לא הוגרל.
test('הלוח: מי שהשומר מחכה לו יוצא איתך — והבקשה מתקדמת בכל מסע', () => {
  const base = { ...initial(), progress: { ...initial().progress, walks: 3 } }
  // הבקשה הפתוחה: אבן. אז אחד מנושאי האבן בדרך.
  let g = reduce(base, { type: 'START_RUN', kind: RUN.FREE, day: 'd2', t: 1 })
  assert.ok(g.run.wantCreatures.some(c => ['bolder', 'kraag'].includes(c)), 'חסר אבן — ובדרך מי שמביא אבן')
  // אחרי שיש אבן, הוא כבר לא נדרש; מי שמביא את הבקשה הבאה (מים) מצטרף
  const after = { ...base, progress: { ...base.progress, quests: ['wake'] } }
  const h = reduce(after, { type: 'START_RUN', kind: RUN.FREE, day: 'd3', t: 2 })
  assert.ok(h.run.wantCreatures.includes('gali'), 'עכשיו חסרים מים: ' + h.run.wantCreatures.join(','))
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
import { CREATURES, hasModel, sizeOf } from '../src/app/wilden/content/creatures.js'
import { AVAILABLE, creaturesForWalk } from '../src/app/wilden/engine/coins.js'

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

test('שניים בדרך: מהמסע השני תמיד שניים, ובכל מסע לפחות אחד על הרצפה', () => {
  assert.deepEqual(creaturesForWalk(0, false), ['nimi'], 'מסע 1: נימי לבד')
  assert.deepEqual(creaturesForWalk(0, true), ['nimi'])
  for (let w = 1; w < 12; w++) {
    const two = creaturesForWalk(w, false)
    assert.equal(two.length, 2, `מסע ${w + 1}`)
    assert.notEqual(two[0], two[1])
    assert.ok(two.some(id => CREATURES[id].arMode === 'ground'), 'אחד על הרצפה')
    const three = creaturesForWalk(w, true)
    assert.equal(three.length, 3)
    assert.equal(new Set(three).size, 3, 'שלושה שונים')
  }
  // בסבב אחד (9 מסעות) רואים את כולם, כל אחד לפחות פעמיים
  const seen = {}
  for (let w = 1; w <= AVAILABLE.length; w++) for (const id of creaturesForWalk(w, false)) seen[id] = (seen[id] || 0) + 1
  assert.equal(Object.keys(seen).length, AVAILABLE.length)
  assert.ok(Object.values(seen).every(n => n >= 2))
  // התדריך מציג את שניהם
  const b = briefFor({ walks: 1, creatures: ['nimi'] })
  assert.deepEqual(b.creatures, ['dabashon', 'tzel'])
  assert.ok(b.line.includes('האני וצל'), b.line)
})

test('גודל על המסך: בולדר גדול מנימי, לפי heightM', () => {
  assert.ok(sizeOf(CREATURES.bolder) > 1.5 && sizeOf(CREATURES.bolder) <= 1.7, 'בולדר: פי 1.6')
  assert.ok(sizeOf(CREATURES.kraag) > sizeOf(CREATURES.lumi), 'קראג גדול מלומי')
  assert.ok(sizeOf(CREATURES.nimi) < 1 && sizeOf(CREATURES.nimi) >= 0.85, 'נימי קטן מהייחוס')
  assert.ok(sizeOf(CREATURES.dabashon) < sizeOf(CREATURES.nimi), 'דבשון הכי קטנה')
  assert.equal(sizeOf(null), 1, 'בלי יצור — 1')
  assert.equal(sizeOf({ heightM: 5 }), 2.4, 'תקרה (בולדר האגדי), שלא יחתוך את המסך')
})

test('תשעה יצורים: לכולם מודל אמיתי, controller רשום, ומצב AR שהבמה מכירה', () => {
  assert.equal(AVAILABLE.length, 9)
  for (const id of AVAILABLE) {
    const c = CREATURES[id]
    assert.ok(c, id)
    assert.ok(hasModel(id), id + ': בלי מודל לא נכנסים לסבב')
    assert.ok(c.model.startsWith('/creatures/' + id + '/'), id + ': המודל שלו, לא של יצור אחר')
    assert.ok(controllerFor(c), id + ': controller')
    assert.ok(['ground', 'sky'].includes(c.arMode), id)
    if (c.arMode === 'sky') assert.ok(controllerFor(c).targets(controllerFor(c).start(0))[0].flying, id + ': בשמיים → flying')
  }
  assert.equal(new Set(AVAILABLE).size, 9, 'בלי כפילויות')
})

// ═══════════════════════════════════════════════════════════════
// הביצה
// ═══════════════════════════════════════════════════════════════
import { EGG_PRICE, HATCH_M, VARIANTS, rollVariant, canBuyEgg, eggWarmth, warmthWord, hatch, hasVariant, tintOf } from '../src/app/wilden/engine/egg.js'
import { skinTint as skinTint2 } from '../src/app/wilden/engine/skins.js'

test('ביצה: שבעה צבעים, ההגרלה לפי ההסתברויות, ולכל צבע יש שם וגוון', () => {
  assert.equal(VARIANTS.length, 7, 'זהב, יער, לילה, שקיעה, כסף, זוהר, קרח')
  assert.equal(VARIANTS.reduce((s, v) => s + v.p, 0).toFixed(2), '1.00')
  assert.equal(rollVariant(() => 0.1).id, 'gold')
  assert.equal(rollVariant(() => 0.3).id, 'forest')
  assert.equal(rollVariant(() => 0.5).id, 'night')
  assert.equal(rollVariant(() => 0.65).id, 'sunset')
  assert.equal(rollVariant(() => 0.78).id, 'silver')
  assert.equal(rollVariant(() => 0.88).id, 'glow')
  assert.equal(rollVariant(() => 0.97).id, 'ice')
  for (const v of VARIANTS) { assert.ok(v.name); assert.equal(v.tint.length, 3); assert.equal(v.glow.length, 3) }
  // צבע שבוקע חייב להיות כזה שאפשר גם ללבוש: גוון מהביצה או מהחנות
  for (const v of VARIANTS) assert.ok(tintOf(v.id) || skinTint2(v.id), `אין גוון ל-${v.id}`)
  // בהגרלה אמיתית קרח הוא הנדיר
  let ice = 0
  for (let i = 0; i < 4000; i++) if (rollVariant().id === 'ice') ice++
  assert.ok(ice > 170 && ice < 400, 'קרח ~7%: ' + ice)
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

test('הוראות: בדרך הביתה היעד הוא סוף המסלול, והפניות ממשיכות', () => {
  // מסלול: צפונה 200, ימינה 200. התחנה הייתה ב-100 — כבר עברנו אותה.
  const a = HOME, b = destination(HOME, 0, 200), c = destination(b, 90, 200)
  const path = [{ ...a, street: 'הרצל' }, { ...b, street: 'הרצל' }, { ...c, street: 'ביאליק' }]
  const turns = turnsFor2(path)
  // כך זה היה אחרי התפיסה: היעד מאחור → "הגעת", בלי פנייה אחת.
  const stale = nextCue(turns, 150, 100)
  assert.equal(stale.kind, 'target')
  assert.equal(stale.dist, 0)
  // וכך זה עכשיו: היעד הוא סוף המסלול, והפנייה הבאה חוזרת.
  const cue = nextCue(turns, 150, 400)
  assert.equal(cue.kind, 'turn')
  assert.equal(cue.street, 'ביאליק')
  assert.equal(cueText(cue, 'הבית'), 'עוד 50 מ׳ פנו ימינה לביאליק.')
  // ואחרי הפנייה האחרונה — כמה נשאר עד הדלת, לא "הבית כאן".
  const last = nextCue(turns, 250, 400)
  assert.equal(cueText(last, 'הבית'), 'ישר 150 מ׳ עד הבית.')
})

test('הוראות: סיבוב חזרה באותו רחוב — בלי שם, ונקודה כפולה לא יוצרת פנייה', () => {
  // הלוך ושוב על רחוב אחד: בקצה מסתובבים וחוזרים — באותו רחוב.
  const p = d => ({ ...destination(HOME, 0, d), street: 'הרב איפרגן שלום' })
  const back = [p(0), p(100), p(200), p(100), p(0)]
  const t = turnsFor2(back)
  assert.equal(t.length, 1); assert.equal(t[0].dir, 'uturn')
  assert.equal(t[0].street, null, 'לא "הסתובבו לרחוב שאתם כבר עליו"')
  assert.equal(cueText(nextCue(t, 130, 400)), 'עוד 70 מ׳ הסתובבו.')
  // נקודה שנרשמה פעמיים באמצע רחוב ישר: כיוון 0 מדומה, וממנו "הסתובבו"
  // באמצע רחוב. אין פניות ברחוב ישר.
  const straight = [p(0), p(100), p(100), p(200), p(300)]
  assert.deepEqual(turnsFor2(straight), [])
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

// ═══════════════════════════════════════════════════════════════
// המרדף
// "הדמות תהיה טיפה מרוחקת והוא ירוץ אליה, 'תמהר להתקרב שלא תברח', ואז
// 2 בריחות קטנות ותפיסה." אותו שלד לכולם, סגנון בריחה לפי האופי.
// ═══════════════════════════════════════════════════════════════
import { makeChase, PHASE as CH, START_M, FLEE_AT_M, STEP_M, TAP_M, IDLE_MS, MAX_M, STOMP_HIDE_MS, TIRED_MS, scaleFor } from '../src/app/wilden/ar/controllers/chase.js'

const runCtl = makeChase({ id: 'run', target: 'creature', style: 'run' })
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }
// רצים: צעד אחרי צעד עד שמשהו קורה
function runUntil(ctl, s, pred, t0 = 0, maxSteps = 60) {
  let t = t0, last = null
  for (let i = 0; i < maxSteps; i++) {
    t += 400
    const r = ctl.onStep(s, t, seq(0.3))
    last = r
    s = r.state
    if (pred(r)) return { s, r, t }
  }
  return { s, r: last, t }
}

test('מרדף: מתחיל רחוק וקטן, כל צעד מקרב, בגודל שגדל', () => {
  const s = runCtl.start(0, seq(0.2, 0.5))
  assert.equal(s.phase, CH.FAR)
  assert.equal(s.dist, START_M)
  const t0 = runCtl.targets(s)[0]
  assert.equal(t0.kind, 'creature')
  assert.ok(t0.scale <= 0.55, `רחוק = קטן: ${t0.scale}`)
  assert.ok(Math.abs(t0.bearing) >= 25 && Math.abs(t0.bearing) <= 55 || Math.abs(t0.bearing - 360) <= 55, 'בצד, לא מול ולא מאחור')
  const s2 = runCtl.onStep(s, 400).state
  assert.equal(s2.dist, START_M - STEP_M)
  assert.ok(runCtl.targets(s2)[0].scale > t0.scale, 'צעד = גדל')
  assert.ok(scaleFor(3) > scaleFor(6) && scaleFor(6) > scaleFor(9))
  assert.equal(scaleFor(0.1), 1.6, 'תקרה')
})

test('מרדף: שתי בריחות לכיוון אחר, ובפעם השלישית נעצר ואפשר לתפוס', () => {
  let s = runCtl.start(0, seq(0.2, 0.5))
  const b0 = s.hidden
  let { s: s1, r: r1 } = runUntil(runCtl, s, r => r.feedback === 'flee')
  assert.equal(s1.phase, CH.FLEE)
  assert.equal(s1.flees, 1)
  assert.ok(Math.abs(angleDelta(b0, s1.hidden)) >= 40, 'ברח לכיוון אחר')
  assert.ok(s1.dist < START_M && s1.dist > FLEE_AT_M, `פחות רחוק מבהתחלה: ${s1.dist}`)
  assert.equal(runCtl.targets(s1)[0].streak, b0, 'ומשאיר פס מאיפה שברח')
  // "הוא ברח!" חוזר ל"רוצו" אחרי רגע
  const back = runCtl.onTick(s1, s1.fleeT + 2000)
  assert.equal(back.phase, CH.FAR)
  ;({ s: s1, r: r1 } = runUntil(runCtl, back, r => r.feedback === 'flee', back.tickT))
  assert.equal(s1.flees, 2)
  const { s: s2, r: r2 } = runUntil(runCtl, runCtl.onTick(s1, s1.fleeT + 2000), r => r.feedback === 'near', s1.fleeT + 2000)
  assert.equal(r2.feedback, 'near', 'בפעם השלישית — נעצר')
  assert.equal(s2.phase, CH.NEAR)
  assert.equal(s2.ready, true)
  assert.equal(runCtl.targets(s2)[0].scale, 1.6, 'גדול, מולכם')
  assert.equal(runCtl.onStep(s2, 99999).state, s2, 'צעדים כבר לא משנים')
  const c = runCtl.onTap(s2)
  assert.equal(c.feedback, 'catch')
  assert.equal(runCtl.isDone(c.state), true)
  assert.deepEqual(runCtl.targets(c.state), [])
})

test('מרדף: אחרי ארבעים שניות הוא מתעייף ונעצר — אפשר לתפוס', () => {
  const s = runCtl.start(0)
  const mid = runCtl.onTick(s, TIRED_MS - 1000)
  assert.notEqual(mid.phase, CH.NEAR, 'לפני הזמן — עוד רץ')
  const tired = runCtl.onTick(mid, TIRED_MS + 10)
  assert.equal(tired.phase, CH.NEAR, 'ואז נעצר')
  assert.equal(tired.ready, true)
  assert.equal(runCtl.onTap(tired).feedback, 'catch', 'ואפשר לתפוס')
})

test('מרדף: עומדים — הוא מתרחק לאט. בלי חיישנים — לחיצה מקרבת', () => {
  const s = runCtl.start(0)
  const s1 = runCtl.onTick(s, 1000)
  assert.equal(s1.dist, START_M, 'בשניות הראשונות לא מתרחק')
  const s2 = runCtl.onTick(s1, IDLE_MS + 3000)
  assert.ok(s2.dist > START_M && s2.dist <= MAX_M, `אחרי עמידה מתרחק: ${s2.dist}`)
  const s3 = runCtl.onTick(s2, IDLE_MS + 26000)
  assert.equal(s3.dist, MAX_M, 'ולא מעבר לתקרה')
  const tapped = runCtl.onTap(s, Math.random, 500).state
  assert.equal(tapped.dist, START_M - TAP_M, 'לחיצה מקרבת')
  assert.equal(tapped.lastMoveT, 500, 'ונחשבת כתנועה')
  // עם מד צעדים — לחיצה מרחוק לא מקרבת, רק מזכירה לרוץ
  const withSteps = runCtl.onTap(s, Math.random, 500, { steps: true })
  assert.equal(withSteps.state, s)
  assert.equal(withSteps.feedback, 'run')
  assert.equal(runCtl.onLock(s, 'creature', Math.random, 500, { steps: true }).state, s, 'וגם מבט לא')
})

test('מרדף: כל יצור בסגנון שלו — צל כצל, בולדר רוקע ונעלם, מעופפים באוויר', () => {
  const shadow = makeChase({ id: 'shadow', target: 'creature', style: 'shadow' })
  let s = shadow.start(0)
  assert.equal(shadow.targets(s)[0].shadow, true, 'צל: רק הצל שלו')
  assert.ok(shadow.targets(s)[0].elev < -10, 'על הרצפה, נמוך')
  assert.ok(shadow.copy(s).line.includes('צל'))
  s = { ...s, phase: CH.NEAR }
  assert.equal(shadow.targets(s)[0].shadow, false, 'כשנעצר — קם')

  const fly = makeChase({ id: 'fly', target: 'creature', style: 'fly' })
  const f = fly.start(0)
  assert.equal(fly.targets(f)[0].flying, true)
  assert.ok(fly.targets(f)[0].elev > 0, 'באוויר')
  const fled = runUntil(fly, f, r => r.feedback === 'flee').s
  assert.ok(fly.targets(fled)[0].elev > fly.targets(f)[0].elev, 'בורח — גבוה יותר')

  const stomp = makeChase({ id: 'stomp', target: 'creature', style: 'stomp' })
  const b = stomp.start(0, seq(0.5))
  const { s: bs, r: br, t } = runUntil(stomp, b, r => r.feedback === 'stomp', 0)
  assert.equal(br.feedback, 'stomp', 'בולדר רוקע')
  const behind = Math.abs(angleDelta(b.hidden + 180, bs.hidden))
  assert.ok(behind <= 30, `ומופיע מאחור: ${behind}`)
  const during = stomp.targets(bs, t + 100)
  assert.equal(during.length, 1); assert.equal(during[0].kind, 'dust', 'בזמן האבק — רק אבק, בכיוון הישן')
  assert.equal(during[0].bearing, b.hidden)
  const after = stomp.targets(bs, t + STOMP_HIDE_MS + 10)
  assert.equal(after[0].kind, 'creature', 'האבק שקע — הוא שם')
  assert.equal(after[0].streak, null, 'בלי פס: הוא לא רץ')
  assert.equal(stomp.onTap(bs, Math.random, t + 100).state, bs, 'מתחת לאבק אי אפשר ללחוץ עליו')
})

test('מרדף: כל שמונת היצורים מקבלים בקר מרדף, מעופפים באוויר', () => {
  for (const id of AVAILABLE) {
    const c = CREATURES[id]
    const ctl = controllerFor(c)
    assert.ok(ctl?.onStep, id + ': בקר מרדף')
    const t = ctl.targets(ctl.start(0))[0]
    assert.equal(t.kind, 'creature')
    assert.equal(!!t.flying, c.arMode === 'sky', id)
  }
  assert.equal(controllerFor(CREATURES.tzel).style, 'shadow')
  assert.equal(controllerFor(CREATURES.bolder).style, 'stomp')
})

// ═══════════════════════════════════════════════════════════════
// ריצת המטבעות
// "המצלמה נפתחת שוב ויש כמו 20 שניות לאסוף כמה שיותר בריצה ויד מורמת."
// ═══════════════════════════════════════════════════════════════
import * as CR from '../src/app/wilden/engine/coinRun.js'
import { placeCoinRun, coinRunNearby, COIN_RUN_NEAR_M } from '../src/app/wilden/engine/coins.js'
const pathLength = pathLength2

test('ריצה: שביל של 16 מטבעות לפני הילד, חלקם גבוה, וכל צעד מקרב', () => {
  const s = CR.startRun(90, seq(0.5), 1000)
  assert.equal(s.coins.length, CR.COINS)
  assert.ok(s.coins.every(c => Math.abs(angleDelta(90, c.bearing)) <= 45), 'כולם בקשת של ±45° מהכיוון ההתחלתי')
  assert.equal(s.coins.filter(c => c.high).length, 4, 'כל רביעי גבוה — יד מורמת')
  assert.ok(s.coins.filter(c => c.high).every(c => c.elev >= 26))
  assert.ok(s.coins.some(c => c.value === 2), 'ויש מטבעות של 2')
  assert.equal(s.endT, 1000 + CR.DURATION_MS)
  const v0 = CR.visibleCoins(s)
  assert.ok(v0.length >= 5 && v0.length < CR.COINS, `רואים את הקרובים בלבד: ${v0.length}`)
  assert.equal(v0[0].rel, 2.5, 'הראשון 2.5 מ׳ לפנינו')
  const s2 = CR.onStep(s, 1400)
  assert.equal(s2.progress, CR.STEP_M)
  assert.ok(CR.coinScale(1) > CR.coinScale(5), 'קרוב = גדול')
})

test('ריצה: מטבע נאסף רק כשהוא בהישג יד ומכוונים אליו; גבוה — צריך להרים', () => {
  let s = CR.startRun(0, seq(0.5), 0)
  const c0 = s.coins[0]
  // רחוק מדי — אפילו בכיוון מדויק לא נאסף (הגבוה הראשון, 7.6 מ׳ וגבוה;
  // הראשון כבר בהישג יד אבל נמוך, אז המבט למעלה לא תופס אותו)
  const c3 = s.coins[3]
  assert.equal(CR.aim(s, c3.bearing, c3.elev, 10).got.length, 0)
  // מתקרבים עד הישג יד
  while (c0.d - s.progress > CR.REACH_M) s = CR.onStep(s, 100)
  assert.equal(CR.aim(s, c0.bearing + 40, c0.elev, 200).got.length, 0, 'מכוונים הצידה — לא')
  const a = CR.aim(s, c0.bearing + 5, c0.elev + 3, 200)
  assert.equal(a.got.length, 1, 'בערך בכיוון — כן')
  assert.equal(a.state.got, c0.value)
  assert.equal(a.state.coins[0].taken, true)
  assert.equal(CR.aim(a.state, c0.bearing, c0.elev, 300).got.length, 0, 'פעם אחת')
  // הגבוה: בגובה העיניים לא נאסף, עם היד למעלה כן
  s = a.state
  const hi = s.coins.find(c => c.high)
  while (hi.d - s.progress > CR.REACH_M) s = CR.onStep(s, 400)
  assert.ok(!CR.aim(s, hi.bearing, 4, 500).got.some(c => c.high), 'טלפון ישר — הגבוה לא נאסף (נמוך שבדרך כן)')
  assert.equal(CR.aim(s, hi.bearing, hi.elev - 5, 500).got.length, 1, 'מרימים — נאסף')
  // בלי חיישן גובה (pitch=null) — הגובה לא נספר
  const s3 = CR.startRun(0, seq(0.5), 0)
  let s4 = s3; while (s3.coins[0].d - s4.progress > CR.REACH_M) s4 = CR.onStep(s4, 100)
  assert.equal(CR.aim(s4, s3.coins[0].bearing, null, 100).got.length, 1)
})

test('ריצה: מה שעברנו הלך, הזמן נגמר אחרי 20 שניות, והסיכום סופר ערך', () => {
  let s = CR.startRun(0, seq(0.5), 0)
  for (let i = 0; i < 8; i++) s = CR.onStep(s, 100 * i)
  assert.equal(s.coins[0].missed, true, 'הראשון נשאר מאחור')
  assert.ok(CR.visibleCoins(s).every(c => !c.missed))
  assert.equal(CR.tick(s, 5000).done, false)
  const over = CR.tick(s, CR.DURATION_MS + 1)
  assert.equal(over.done, true)
  assert.equal(CR.onStep(over, 99999), over, 'אחרי הסיום כלום לא זז')
  assert.equal(CR.aim(over, 0, 0, 99999).got.length, 0)
  const sum = CR.summary({ ...over, got: 7, coins: over.coins.map((c, i) => ({ ...c, taken: i < 5 })) })
  assert.deepEqual(sum, { taken: 5, total: CR.COINS, value: 7 })
  // בלי חיישנים: לחיצה = שני צעדים
  assert.equal(CR.onTap(CR.startRun(0, seq(0.5), 0), 1).progress, CR.TAP_M)
  // נגמרו המטבעות — גם נגמר
  const all = { ...s, coins: s.coins.map(c => ({ ...c, taken: true })) }
  assert.equal(CR.tick(all, 3000).done, true)
})

test('ריצה: הנקודה בשליש הראשון של המסלול, לא על תחנה, ונפתחת בטווח 20 מ׳', () => {
  const stops = [{ along: 480 }, { along: 900 }]
  const cr = placeCoinRun(PATH, { stops })
  assert.ok(cr, 'יש נקודה על מסלול של ' + Math.round(pathLength(PATH)) + ' מ׳')
  assert.ok(cr.along >= 200 && cr.along < pathLength(PATH) * 0.65, `בחלק הראשון: ${Math.round(cr.along)}`)
  assert.ok(stops.every(st => Math.abs(st.along - cr.along) >= 140), 'רחוק מהתחנות')
  assert.equal(placeCoinRun([HOME, destination(HOME, 0, 400)], {}), null, 'מסלול קצר — בלי')
  // הלוך ושוב: בחלק ה"חדש" בלבד
  const tb = thereAndBack(1000, 50)
  const crb = placeCoinRun(tb, { stops: [{ along: 900 }], freshEndM: freshEnd(tb) })
  assert.ok(crb && crb.along < 1000, 'לא בדרך חזרה')
  const run = { coinRun: cr }
  assert.equal(coinRunNearby(run, destination(cr, 0, COIN_RUN_NEAR_M + 30)), null)
  assert.deepEqual(coinRunNearby(run, destination(cr, 0, 5)), cr)
  assert.equal(coinRunNearby({ coinRun: { ...cr, done: true } }, cr), null, 'נעשה — לא נפתח שוב')
})

test('ריצה: ROUTE_READY מניח את הנקודה, ו-COIN_RUN_DONE מכניס את המטבעות למונה (כפול בדרך הביתה)', () => {
  let g = started(['nimi'])
  assert.ok(g.run.coinRun && !g.run.coinRun.done, 'יש ריצה במסלול')
  const before = g.run.coinsTaken
  g = reduce(g, { type: 'COIN_RUN_DONE', got: 9, t: 5 })
  assert.equal(g.run.coinsTaken, before + 9)
  assert.equal(g.run.coinRun.done, true)
  assert.equal(g.run.lastCoin.n, 9, 'ויש גלינג')
  assert.equal(reduce(g, { type: 'COIN_RUN_DONE', got: 9, t: 6 }).run.coinsTaken, before + 9, 'פעם אחת בלבד')
  // בדרך הביתה — כפול
  let h = started(['nimi'])
  h = { ...h, run: { ...h.run, resolved: true } }
  h = reduce(h, { type: 'COIN_RUN_DONE', got: 4, t: 5 })
  assert.equal(h.run.coinsTaken, 8)
})

// ═══════════════════════════════════════════════════════════════
// עולם הבית: משאבים, השומר, הבקשות
// ═══════════════════════════════════════════════════════════════
import { QUESTS, CHAPTERS, RES_OF, bringsFor, activeQuest, openChapter, creaturesWanted, nextGoals, questProgress, canComplete, completeQuest, worldState, creatureLine } from '../src/app/wilden/engine/world.js'
const ALL_QUESTS = QUESTS.map(q => q.id)

import { mergeProgress as mergeProgress2 } from '../src/app/wilden/engine/profile.js'

test('עולם: כל יצור מביא משאב, והפורטל מכניס אותו הביתה גם בתפיסה חוזרת', () => {
  for (const id of AVAILABLE) assert.ok(RES_OF[id], id + ' מביא משהו')
  assert.deepEqual(bringsFor(['dabashon', 'bolder', 'kraag']), { honey: 1, stone: 2 })
  let g = started(['dabashon', 'bolder'])
  g = walk(g, 200); g = catchHere(g, 500000); g = reduce(g, { type: 'CONTINUE' }); g = catchHere(g, 600000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.equal(g.progress.res.honey, 1); assert.equal(g.progress.res.stone, 1)
  assert.deepEqual(g.progress.quests, [], 'עוד לא נבנה כלום')
})

test('עולם: הבקשות לפי הסדר — נותנים רק כשיש, המשאבים יורדים, המטבעות נכנסים, העולם נבנה', () => {
  assert.equal(QUESTS.length, 9, 'חמש להעיר את העולם, ארבע לבנות בו')
  let p = { ...initial().progress, res: { stone: 1 }, coins: 10 }
  assert.equal(activeQuest(p).id, 'wake')
  assert.equal(canComplete(p, activeQuest(p)), false)
  assert.deepEqual(questProgress(p, activeQuest(p)), [{ res: 'stone', need: 2, have: 1 }])
  assert.equal(completeQuest(p, 'wake'), p, 'בלי מספיק — כלום לא קורה')
  p = { ...p, res: { stone: 3, water: 2 } }
  assert.equal(canComplete(p, activeQuest(p)), true)
  const q1 = completeQuest(p, 'wake')
  assert.equal(q1.res.stone, 1, 'שתיים ירדו')
  assert.equal(q1.coins, 25)
  assert.deepEqual(q1.quests, ['wake'])
  assert.equal(worldState(q1).guardianAwake, true)
  assert.equal(worldState(q1).basinFull, false)
  assert.equal(worldState(q1).built, 1)
  assert.equal(activeQuest(q1).id, 'basin', 'הבאה בתור')
  assert.equal(completeQuest(q1, 'beacon'), q1, 'לא מדלגים')
  assert.equal(completeQuest(q1, 'wake'), q1, 'לא פעמיים')
  const q2 = completeQuest(q1, 'basin')
  assert.equal(worldState(q2).basinFull, true)
  assert.equal(q2.res.water, 0)
  // כל פרק 1
  let all = { ...q2, res: { spark: 2, honey: 2, leaf: 1, wind: 2, shadow: 1 } }
  for (const q of QUESTS) all = completeQuest(all, q.id)
  assert.equal(worldState(all).gateOpen, true)
  assert.equal(worldState(all).built, 5)
  // ופרק 2 נפתח — המשחק לא נגמר עם השער
  assert.equal(openChapter(all), 2)
  assert.equal(activeQuest(all).id, 'hive')
  let done2 = { ...all, res: { honey: 3, leaf: 2, water: 3, stone: 6, shadow: 1, wind: 3, spark: 2 } }
  for (const q of QUESTS) done2 = completeQuest(done2, q.id)
  assert.equal(activeQuest(done2), null)
  assert.equal(worldState(done2).built, 9)
  assert.equal(worldState(done2).hiveBuilt, true)
})

// "אני לא רוצה שהמשחק ייגמר מהר מדי": שתי בקשות שאפשר להשלים — השומר
// מבקש את מי שאפשר להביא עכשיו, ולא נתקע על הראשונה בשרשרת.
test('עולם: פרקים, ובתוך פרק — הבקשה שאפשר להשלים היום', () => {
  assert.equal(CHAPTERS.length, 2)
  const p = { ...initial().progress, res: { water: 2 } }   // אין אבן, יש מים
  assert.equal(activeQuest(p).id, 'basin', 'אפשר למלא את הכד עכשיו — אז זו הבקשה')
  const none = { ...initial().progress, res: {} }
  assert.equal(activeQuest(none).id, 'wake', 'אין כלום — הראשונה, כדי שהרמז יגיד מה להביא')
  // פרק 2 לא נפתח לפני שפרק 1 נסגר, גם אם יש חומרים לכוורת
  const rich = { ...initial().progress, res: { honey: 5, leaf: 5 } }
  assert.equal(openChapter(rich), 1)
  assert.equal(activeQuest(rich).chapter, 1)
  // מי חסר: מי שמביא את מה שאין
  assert.deepEqual(creaturesWanted({ res: {}, quests: [] }), ['bolder', 'kraag'], 'חסר אבן')
  assert.ok(creaturesWanted({ res: { stone: 2 }, quests: ['wake'] }).includes('gali'), 'חסרים מים')
  assert.deepEqual(creaturesWanted({ quests: ALL_QUESTS }), [], 'הכול נבנה — אין למי לחכות')
})

test('עולם: כשהכול נבנה, המסך אומר מה נשאר — ולא "נגמר"', () => {
  const p = { ...initial().progress, quests: ALL_QUESTS, creatures: ['nimi'], caught: { nimi: 2 } }
  const goals = nextGoals(p)
  assert.equal(goals[0].need, 27, 'הספר: 27 צורות')
  assert.equal(goals[0].have, 1)
  assert.equal(goals[1].name, 'נימי'); assert.equal(goals[1].left, 1, 'עוד תפיסה והוא בוגר')
  assert.ok(goals.some(g => g.need === 4), 'ארבעה מבנים')
  assert.ok(goals.some(g => g.need === 63), 'תשעה יצורים כפול שבעה צבעים')
})

test('עולם: COMPLETE_QUEST רק בבית, ונשמר ומתמזג', () => {
  let g = { ...initial(), progress: { ...initial().progress, res: { stone: 2 }, coins: 0 } }
  const inRun = reduce({ ...g, state: S.SEARCH }, { type: 'COMPLETE_QUEST', id: 'wake' })
  assert.deepEqual(inRun.progress.quests, [], 'בדרך — לא')
  g = reduce(g, { type: 'COMPLETE_QUEST', id: 'wake' })
  assert.deepEqual(g.progress.quests, ['wake'])
  assert.equal(g.progress.coins, 15)
  assert.deepEqual(forServer(g).progress.quests, ['wake'], 'עולה לשרת')
  const merged = mergeProgress2({ ...g.progress, walks: 3 }, { ...initial().progress, quests: ['wake', 'basin'], walks: 1 })
  assert.deepEqual(merged.quests.sort(), ['basin', 'wake'], 'איחוד')
  assert.ok(creatureLine('nimi', 0).length > 0)
  assert.notEqual(creatureLine('nimi', 0), creatureLine('nimi', 1))
})

// ═══════════════════════════════════════════════════════════════
// הישגים
// ═══════════════════════════════════════════════════════════════
import { BADGES, earned, newlyEarned, badgeList, walksInWeek } from '../src/app/wilden/engine/badges.js'

test('הישגים: נגזרים מההתקדמות, נפתחים במסע, ולא נעלמים במיזוג', () => {
  const p0 = initial().progress
  assert.deepEqual(earned(p0), [])
  assert.ok(BADGES.length >= 20)
  let g = started(['nimi'])
  g = walk(g, 200); g = catchHere(g, 500000)
  g = reduce(g, { type: 'COIN_RUN_DONE', got: 13, t: 1 })
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.equal(g.progress.catches, 1)
  assert.deepEqual(g.progress.caught, { nimi: 1 })
  assert.equal(g.progress.runs, 1)
  assert.equal(g.progress.bestRun, 13)
  assert.ok(g.progress.metersTotal >= 150, 'מטרים נצברים: ' + g.progress.metersTotal)
  assert.ok(g.progress.coinsEarned > 13)
  assert.deepEqual(g.progress.walkDays, [DAY])
  const ids = g.newBadges
  assert.ok(ids.includes('first-walk') && ids.includes('first-catch') && ids.includes('run-first') && ids.includes('run-12'), ids.join(','))
  assert.ok(!ids.includes('gold-first'))
  const closed = reduce(reduce(g, { type: 'CLUE_SEEN' }), { type: 'RUN_CLOSED' })
  assert.equal(closed.newBadges, null, 'נמחק כשסוגרים')
  assert.deepEqual(newlyEarned(g.progress, g.progress), [], 'בלי שינוי — כלום חדש')
  // רשימה עם התקדמות
  const list = badgeList(g.progress)
  const w5 = list.find(b => b.id === 'walks-5')
  assert.equal(w5.done, false); assert.equal(w5.have, 1); assert.equal(w5.need, 5)
  // ארבעה בשבוע
  assert.equal(walksInWeek({ walkDays: ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-07'] }), 4)
  assert.equal(walksInWeek({ walkDays: ['2026-08-20', '2026-09-03', '2026-09-05', '2026-09-07'] }), 3)
  // מיזוג: מקסימום, לא סכום; ימים מתאחדים
  const merged = mergeProgress2({ ...g.progress, golds: 2, walks: 4 }, { ...initial().progress, golds: 5, runs: 3, walkDays: ['2026-01-01'], walks: 1 })
  assert.equal(merged.golds, 5); assert.equal(merged.runs, 3); assert.ok(merged.walkDays.includes('2026-01-01') && merged.walkDays.includes(DAY))
  assert.ok(forServer(g).progress.walkDays.length === 1, 'עולה לשרת')
})

test('הישגים: זהב וקפיצה נספרים בפורטל', () => {
  let g = started(['nimi'])
  g = walk(g, 200)
  g = reduce(g, { type: 'GOLD_TAKEN', t: 5, jump: { airMs: 520, peakG: 2 } })
  assert.equal(g.run.goldJumpMs, 520)
  g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.equal(g.progress.golds, 1)
  assert.ok(g.progress.bestJumpCm >= 30 && g.progress.bestJumpCm <= 36, `520ms באוויר ≈ 33 ס"מ: ${g.progress.bestJumpCm}`)
  assert.ok(g.newBadges.includes('gold-first') && g.newBadges.includes('jump-30'))
})

// ══════════════════════════════════════════════
// ─── החנות, הבונוס השבועי, הסיכום להורה ───
import { ITEMS, SLOT, KID, itemById, canBuy, buy, equip, owns, wearOf, wornBy, mergeWear, ANCHORS } from '../src/app/wilden/engine/shop.js'
import { weekStart, walksInWeekOf, weeklyBonusDue, grantWeekly, weeklyStatus, walkSummary, WEEKLY_GOAL, WEEKLY_COINS, km } from '../src/app/wilden/engine/weekly.js'
import { pulsePeriod } from '../src/app/wilden/engine/pulse.js'
import { AVAILABLE as AVAIL2 } from '../src/app/wilden/engine/coins.js'

test('חנות: קונים רק עם מטבעות, פעם אחת, ולובשים רק מה שנקנה ובחריץ הנכון', () => {
  const p0 = { ...initial().progress, coins: 30, creatures: ['nimi'] }
  assert.ok(ITEMS.length >= 10)
  assert.ok(canBuy(p0, 'cap')); assert.ok(!canBuy(p0, 'crown'), 'כתר 70 — אין מספיק')
  const p1 = buy(p0, 'cap')
  assert.equal(p1.coins, 30 - itemById('cap').price)
  assert.ok(owns(p1, 'cap'))
  assert.equal(buy(p1, 'cap'), p1, 'לא קונים פעמיים')
  assert.equal(equip(p1, 'nimi', SLOT.HEAD, 'crown'), p1, 'לא לובשים מה שלא נקנה')
  assert.equal(equip(p1, 'nimi', SLOT.FACE, 'cap'), p1, 'כובע לא על הפנים')
  const p2 = equip(p1, 'nimi', SLOT.HEAD, 'cap')
  assert.deepEqual(wearOf(p2, 'nimi'), { head: 'cap' })
  // אותו פריט על שניים — מותר; חולצה — רק לילד
  const p3 = equip(p2, KID, SLOT.HEAD, 'cap')
  assert.deepEqual(wornBy(p3, 'cap').sort(), ['kid', 'nimi'])
  const p4 = buy({ ...p3, coins: 10 }, 'shirt-red')
  assert.equal(equip(p4, 'nimi', SLOT.SHIRT, 'shirt-red'), p4, 'יצור בלי חולצה')
  assert.deepEqual(wearOf(equip(p4, KID, SLOT.SHIRT, 'shirt-red'), KID), { head: 'cap', shirt: 'shirt-red' })
  // מורידים
  const p5 = equip(p3, 'nimi', SLOT.HEAD, null)
  assert.equal(p5.wear.nimi, undefined)
  // לכל יצור יש עוגן לכובע ולפנים
  for (const id of AVAIL2) assert.ok(ANCHORS[id]?.head && ANCHORS[id]?.face, id)
})

test('חנות במכונה: רק בבית, קנייה עם "בשביל מי" מלבישה מיד, ונשמר לשרת ובמיזוג', () => {
  let g = { ...initial(), progress: { ...initial().progress, coins: 50, creatures: ['nimi', 'gali'] } }
  g = reduce(g, { type: 'BUY_ITEM', id: 'shades', who: 'gali', slot: SLOT.FACE })
  assert.equal(g.progress.coins, 20)
  assert.deepEqual(g.progress.owned, ['shades'])
  assert.deepEqual(g.progress.wear, { gali: { face: 'shades' } })
  g = reduce(g, { type: 'EQUIP', who: 'nimi', slot: SLOT.FACE, id: 'shades' })
  assert.deepEqual(wornBy(g.progress, 'shades').sort(), ['gali', 'nimi'])
  // באמצע הליכה — לא
  const walking = started(['nimi'], { ...g, progress: { ...g.progress, coins: 100 } })
  assert.equal(reduce(walking, { type: 'BUY_ITEM', id: 'cap' }), walking)
  // שרת
  const srv = forServer(g).progress
  assert.deepEqual(srv.owned, ['shades']); assert.deepEqual(srv.wear.gali, { face: 'shades' })
  // מיזוג: מה שנקנה — איחוד; מה שלובשים — הבסיס קודם
  const m = mergeWear({ owned: ['cap'], wear: { nimi: { head: 'cap' } } }, { owned: ['shades'], wear: { nimi: { face: 'shades' }, gali: { face: 'shades' } } })
  assert.deepEqual(m.owned.sort(), ['cap', 'shades'])
  assert.deepEqual(m.wear, { nimi: { head: 'cap' }, gali: { face: 'shades' } })
  const merged = mergeProgress2({ ...g.progress, walks: 3 }, { ...initial().progress, owned: ['cap'], wear: { kid: { head: 'cap' } } })
  assert.ok(merged.owned.includes('cap') && merged.owned.includes('shades'))
  assert.deepEqual(merged.wear.kid, { head: 'cap' })
})

test('שבוע: ראשון עד שבת, שלושה מסעות — ביצה, ואם יש ביצה — מטבעות; פעם בשבוע', () => {
  assert.equal(weekStart('2026-09-06'), '2026-09-06', 'ראשון')
  assert.equal(weekStart('2026-09-12'), '2026-09-06', 'שבת — אותו שבוע')
  assert.equal(weekStart('2026-09-13'), '2026-09-13', 'ראשון הבא')
  const p = { ...initial().progress, walkDays: ['2026-09-01', '2026-09-07', '2026-09-08'] }
  assert.equal(walksInWeekOf(p, '2026-09-08'), 2)
  assert.ok(!weeklyBonusDue(p, '2026-09-08'))
  const p3 = { ...p, walkDays: [...p.walkDays, '2026-09-10'] }
  assert.ok(weeklyBonusDue(p3, '2026-09-10'))
  const g1 = grantWeekly(p3, '2026-09-10', 5)
  assert.equal(g1.gift, 'egg'); assert.deepEqual(g1.progress.egg, { boughtAt: 5, gift: true }); assert.equal(g1.progress.weeklyBonus, '2026-09-06')
  assert.ok(!weeklyBonusDue(g1.progress, '2026-09-11'), 'לא פעמיים באותו שבוע')
  const g2 = grantWeekly({ ...p3, egg: { boughtAt: 1 } }, '2026-09-10')
  assert.equal(g2.gift, 'coins'); assert.equal(g2.progress.coins, WEEKLY_COINS)
  // מונה שמתאפס ולא נשבר
  const st = weeklyStatus(p, '2026-09-08')
  assert.deepEqual(st, { have: 2, need: WEEKLY_GOAL, done: false, gift: 'egg' })
  assert.equal(weeklyStatus(g1.progress, '2026-09-14').have, 0, 'שבוע חדש — מאפס')
  assert.equal(weeklyStatus(g1.progress, '2026-09-14').done, false)
})

test('שבוע במכונה: המסע השלישי בפורטל נותן ביצה, ומסך הסיום יודע', () => {
  const p0 = { ...initial().progress, walkDays: ['2026-09-07', '2026-09-08'] }
  let g = started(['nimi'], { ...initial(), progress: p0 })
  g = walk(g, 200); g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED', t: 600000 }])
  assert.equal(g.weeklyGift, 'egg')
  assert.ok(g.progress.egg?.gift)
  assert.equal(g.progress.weeklyBonus, '2026-09-06')
  const closed = reduce(reduce(g, { type: 'CLUE_SEEN' }), { type: 'RUN_CLOSED' })
  assert.equal(closed.weeklyGift, null)
  assert.ok(forServer(g).progress.weeklyBonus === '2026-09-06')
  // מסע רביעי באותו שבוע — כלום
  let g4 = started(['nimi'], { ...closed, progress: { ...closed.progress, egg: null } })
  g4 = walk(g4, 200); g4 = catchHere(g4, 500000)
  g4 = run(g4, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.equal(g4.weeklyGift, null); assert.equal(g4.progress.egg, null)
})

test('להורה: מרחק, דקות, צעדים משוערים — בפורטל וגם כשעוצרים', () => {
  assert.deepEqual(walkSummary({ walked: 1834, startedAt: 0, t: 24.4 * 60000 }), { meters: 1834, minutes: 24, steps: 3350 })
  assert.deepEqual(walkSummary({}), { meters: 0, minutes: 0, steps: 0 })
  assert.equal(km(1834), '1.8 ק״מ'); assert.equal(km(640), '640 מ׳')
  let g = started(['nimi'])
  g = { ...g, run: { ...g.run, walkStartedAt: 0 } }     // ROUTE_READY בבדיקות בלי שעון
  g = walk(g, 200); g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED', t: 20 * 60000 }])
  const lw = g.progress.lastWalk
  assert.ok(lw.meters >= 150 && lw.minutes === 20 && lw.steps > 200, JSON.stringify(lw))
  assert.equal(g.progress.minutesTotal, 20)
  assert.equal(forServer(g).progress.lastWalk.minutes, 20)
  // עוצרים באמצע — גם נספר
  let a = started(['nimi']); a = { ...a, run: { ...a.run, walkStartedAt: 0 } }; a = walk(a, 300)
  a = reduce(a, { type: 'ABORT', t: 9 * 60000 })
  assert.ok(a.progress.lastWalk.meters >= 250 && a.progress.lastWalk.minutes === 9)
  assert.ok(a.progress.metersTotal >= 250)
})

test('דופק: רחוק — לאט, קרוב — מהר, בלי מרחק — שקט', () => {
  assert.equal(pulsePeriod(null), null)
  assert.equal(pulsePeriod(13), 1890)
  assert.equal(pulsePeriod(20), 1900, 'תקרה')
  assert.ok(pulsePeriod(3) < pulsePeriod(8))
  assert.equal(pulsePeriod(0.2), 250)
  assert.equal(pulsePeriod(95, { base: 300, perM: 18, near: 350, far: 2000 }), 2000)
  assert.equal(pulsePeriod(5, { base: 300, perM: 18, near: 350, far: 2000 }), 390)
})

// ══════════════════════════════════════════════
// ─── שלבי התפתחות ───
import { STAGES, stageFor, stageOf, stageProgress, evolvedBetween, staged, stagedName, grewVerb, stageScale, countAtStage } from '../src/app/wilden/engine/stages.js'
import { sizeOf as sizeOf2 } from '../src/app/wilden/content/creatures.js'

test('שלבים: 3 תפיסות = בוגר, 7 = אגדי; נגזר מהמונה, לא מצב נפרד', () => {
  assert.equal(STAGES.length, 3)
  assert.deepEqual([0, 1, 2, 3, 6, 7, 20].map(stageFor), [1, 1, 1, 2, 2, 3, 3])
  const p = { caught: { nimi: 4, gali: 7 } }
  assert.equal(stageOf(p, 'nimi'), 2); assert.equal(stageOf(p, 'gali'), 3); assert.equal(stageOf(p, 'tzel'), 1)
  assert.deepEqual(stageProgress(p, 'nimi'), { stage: 2, have: 4, need: 7, next: 3, left: 3 })
  assert.deepEqual(stageProgress(p, 'gali'), { stage: 3, have: 7, need: null, next: null, left: 0 })
  assert.deepEqual(stageProgress({}, 'nimi'), { stage: 1, have: 0, need: 3, next: 2, left: 3 })
  assert.equal(countAtStage(p, 2), 2); assert.equal(countAtStage(p, 3), 1)
  // מה גדל בין שני מצבים
  assert.deepEqual(evolvedBetween({ caught: { nimi: 2 } }, { caught: { nimi: 3, tzel: 1 } }), [{ id: 'nimi', from: 1, to: 2 }])
  assert.deepEqual(evolvedBetween({ caught: { nimi: 3 } }, { caught: { nimi: 4 } }), [])
  // שם ופועל לפי מין
  assert.equal(stagedName(CREATURES.nimi, 1), 'נימי'); assert.equal(stagedName(CREATURES.nimi, 2), 'נימי הבוגר'); assert.equal(stagedName(CREATURES.nimi, 3), 'נימי האגדי')
  assert.equal(stagedName(CREATURES.gali, 2), 'גלי הבוגרת'); assert.equal(stagedName(CREATURES.noga, 3), 'נוגה האגדית')
  assert.equal(grewVerb(CREATURES.dabashon), 'גדלה'); assert.equal(grewVerb(CREATURES.bolder), 'גדל')
})

test('שלבים: יצור בשלב — אותה דמות גדולה יותר עם הילה, או הדמות של השלב אם יש', () => {
  // קראג: עוד אין לו דמות לשלב — אותה דמות, גדולה, עם הילה
  const bare = { ...CREATURES.kraag, stages: undefined }   // יצור בלי שלבים — לכולם כבר יש שלב 2, אז מדמים
  const g1 = staged(bare, 1), g2 = staged(bare, 2), g3 = staged(bare, 3)
  assert.equal(g1.aura, false); assert.equal(g2.aura, true); assert.equal(g3.stage, 3)
  assert.equal(g2.live, bare.live, 'בלי חומר לשלב — הדמות הבסיסית')
  assert.ok(Math.abs(g2.heightM / bare.heightM - stageScale(2)) < 1e-9)
  assert.ok(sizeOf2(g3) > sizeOf2(g2) && sizeOf2(g2) > sizeOf2(g1), 'גדל על הבמה')
  assert.ok(sizeOf2(staged(CREATURES.bolder, 3)) <= 2.4, 'בולדר האגדי עדיין נכנס למסך')
  // נימי: יש דמות לשלב 2 (הקליפ שלה) — מתחלפת, בלי הילה, ובלי המודל של הגור
  const n2 = staged(CREATURES.nimi, 2)
  assert.equal(n2.live, '/creatures/nimi/s2/live.webp'); assert.equal(n2.clip, '/creatures/nimi/s2/caught.mp4')
  assert.equal(n2.aura, false); assert.equal(n2.model, null, 'המודל של הגור לא מוצג ליד הבוגר'); assert.ok(n2.anchors?.head)
  assert.equal(staged(CREATURES.nimi, 3).aura, true, 'שלב 3 עדיין בלי דמות — הילה')
  assert.equal(staged(null, 2), null)
})

test('שלבים במכונה: התפיסה השלישית מגדילה בפורטל, מסך הסיום יודע, ותג נפתח', () => {
  let g = started(['nimi'], { ...initial(), progress: { ...initial().progress, caught: { nimi: 2 }, creatures: ['nimi'] } })
  g = walk(g, 200); g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.deepEqual(g.evolved, [{ id: 'nimi', from: 1, to: 2 }])
  assert.ok(g.newBadges.includes('grown-first'), g.newBadges.join(','))
  const closed = reduce(reduce(g, { type: 'CLUE_SEEN' }), { type: 'RUN_CLOSED' })
  assert.equal(closed.evolved, null)
  // תפיסה רביעית — כלום
  let g4 = started(['nimi'], closed); g4 = walk(g4, 200); g4 = catchHere(g4, 500000)
  g4 = run(g4, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.deepEqual(g4.evolved, [])
})

// ══════════════════════════════════════════════
// ─── רצף הליכה ודחף; בן לוויה ───
import { STREAK_MS, BOOST_MS, STOP_MS, freshStreak, tickStreak, boosting, streakFill, boostLeftMs, BOOST_COINS } from '../src/app/wilden/engine/streak.js'
import { BOND_M, setBuddy, addBond, bondOf, bondCredits, buddyLine, canBuddy } from '../src/app/wilden/engine/buddy.js'

test('רצף: ארבע דקות בלי לעצור — דחף לדקתיים; עצירה מאפסת את הפס ולא את הדחף', () => {
  let s = freshStreak(0)
  for (let t = 5000; t < STREAK_MS - 1000; t += 5000) s = tickStreak(s, { moved: t % 15000 === 0, t })
  assert.ok(!boosting(s, STREAK_MS - 1000)); assert.ok(streakFill(s, STREAK_MS - 1000) > 0.95)
  s = tickStreak(s, { moved: true, t: STREAK_MS + 1000 })
  assert.ok(boosting(s, STREAK_MS + 1000), 'דחף'); assert.equal(s.boosts, 1)
  assert.ok(boostLeftMs(s, STREAK_MS + 1000) === BOOST_MS)
  assert.ok(streakFill(s, STREAK_MS + 1000) < 0.05, 'הפס מתחיל מחדש')
  // עוצרים באמצע הדחף: הפס מתאפס, הדחף נשאר עד סופו
  const t2 = STREAK_MS + 1000 + STOP_MS + 5000
  s = tickStreak(s, { moved: false, t: t2 })
  assert.ok(boosting(s, t2)); assert.equal(s.since, t2)
  assert.ok(!boosting(s, STREAK_MS + 1000 + BOOST_MS + 1))
  // GPS שמוסיף מטרים בקפיצות: 20 שניות בלי מטר חדש עדיין "הולכים"
  let w = freshStreak(0); w = tickStreak(w, { moved: true, t: 1000 }); w = tickStreak(w, { moved: false, t: 20000 })
  assert.equal(w.since, 0)
})

test('דחף במכונה: מטבעות כפולים בזמן דחף', () => {
  let g = started(['nimi'])
  assert.ok(g.run.streak, 'יש רצף מהיציאה')
  // הולכים 5 דקות ברצף (FIX כל 10 שניות, 15 מ')
  g = walk(g, 450, { t0: 1000 })     // 30 דגימות × 10 שניות = 300 שניות
  assert.ok(boosting(g.run.streak, g.run.lastT), 'אחרי 4 דקות — דחף')
  const before = g.run.coinsTaken
  // מטבע לפנינו: אוספים אותו בזמן הדחף
  const next = g.run.coins.find(c => !c.taken && !c.gold && c.along > g.run.along)
  g = reduce(g, { type: 'FIX', lat: next.lat, lng: next.lng, acc: 8, t: g.run.lastT + 10000 })
  assert.equal(g.run.coinsTaken - before, (next.value || 1) * BOOST_COINS)
  assert.equal(g.run.lastCoin.boost, true)
})

test('בן לוויה: בוחרים רק מי שנתפס; המטרים נזקפים לו; 2 ק"מ = נקודת התפתחות', () => {
  const p0 = { ...initial().progress, creatures: ['nimi'], caught: { nimi: 2 } }
  assert.ok(canBuddy(p0, 'nimi')); assert.ok(!canBuddy(p0, 'gali'))
  assert.equal(setBuddy(p0, 'gali'), p0)
  const p1 = setBuddy(p0, 'nimi'); assert.equal(p1.buddy, 'nimi')
  assert.equal(setBuddy(p1, null).buddy, null)
  const p2 = addBond(p1, 1500); assert.equal(bondOf(p2, 'nimi'), 1500); assert.equal(bondCredits(p2, 'nimi'), 0)
  const p3 = addBond(p2, 600); assert.equal(bondCredits(p3, 'nimi'), 1)
  assert.equal(addBond(p0, 900), p0, 'בלי בן לוויה — כלום')
  assert.equal(stageOf(p3, 'nimi'), 2, '2 תפיסות + 2 ק"מ = בוגר')
  assert.deepEqual(stageProgress(p3, 'nimi').have, 3)
  assert.ok(buddyLine('nimi', 'half') && buddyLine('noga', 'start')); assert.equal(buddyLine('nimi', 'nope'), null)
  assert.equal(BOND_M, 2000)
})

test('בן לוויה במכונה: רק בבית, ההליכה נזקפת בפורטל ובעצירה, וההתפתחות קופצת', () => {
  let g = { ...initial(), progress: { ...initial().progress, creatures: ['nimi'], caught: { nimi: 2 }, bond: { nimi: 1900 } } }
  g = reduce(g, { type: 'SET_BUDDY', id: 'nimi' })
  assert.equal(g.progress.buddy, 'nimi')
  g = started(['nimi'], g)
  assert.equal(reduce(g, { type: 'SET_BUDDY', id: null }), g, 'לא באמצע הליכה')
  g = walk(g, 200); g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.ok(g.progress.bond.nimi >= 2050, 'המטרים נוספו: ' + g.progress.bond.nimi)
  assert.equal(stageOf(g.progress, 'nimi'), 2)
  assert.ok(g.evolved.some(e => e.id === 'nimi' && e.to === 2), 'גדל מהקילומטרים ומהתפיסה יחד')
  assert.equal(forServer(g).progress.buddy, 'nimi')
  // עצירה באמצע — גם נזקף
  let a = { ...initial(), progress: { ...initial().progress, creatures: ['gali'], buddy: 'gali' } }
  a = started(['gali'], a); a = walk(a, 300); a = reduce(a, { type: 'ABORT', t: 5000 })
  assert.ok(a.progress.bond.gali >= 250)
  // מיזוג: המקסימום, ובן הלוויה של הבסיס
  const m = mergeProgress2({ ...g.progress, walks: 5 }, { ...initial().progress, bond: { nimi: 9000, tzel: 500 }, buddy: 'tzel' })
  assert.equal(m.bond.nimi, 9000); assert.equal(m.bond.tzel, 500); assert.equal(m.buddy, 'nimi')
})

// ══════════════════════════════════════════════
// ─── תוכנית המסע: ההורה בוחר ק"מ ───
import { ROUTE_KM, routeKm, targetM, plannedMin, poisFor, creatureCount, placePois, setRouteKm, withCreatures, POI } from '../src/app/wilden/engine/plan.js'
import { placeCoins as placeCoins2 } from '../src/app/wilden/engine/coins.js'

test('תוכנית: בלי בחירה — הלוח; עם בחירה — הק"מ של ההורה, וממנו הזמן ומה בדרך', () => {
  assert.deepEqual(ROUTE_KM, [1, 1.5, 2, 3, 4])
  assert.equal(routeKm({}, 0), 2.2); assert.equal(routeKm({ walks: 3 }), 3.2); assert.equal(routeKm({ routeKm: 1.5 }, 3), 1.5)
  assert.equal(targetM({ routeKm: 3 }), 3000)
  const p = setRouteKm({}, 7); assert.equal(p.routeKm, undefined, 'רק מהרשימה')
  assert.equal(setRouteKm({}, 3).routeKm, 3)
  assert.equal(plannedMin(1), 18); assert.equal(plannedMin(3), 55)
  assert.deepEqual(poisFor(1, 0), ['creature', 'run']); assert.deepEqual(poisFor(1.5, 1), ['creature', 'gold'], 'לסירוגין')
  assert.deepEqual(poisFor(2, 0), ['run', 'creature', 'flowers', 'gold'])
  assert.deepEqual(poisFor(3, 0), ['run', 'creature', 'flowers', 'creature', 'gold']); assert.equal(creatureCount(poisFor(4, 0)), 2)
  assert.deepEqual(poisFor(2.2, 0), ['run', 'creature', 'flowers', 'gold'], 'הלוח הישן: מסע 1 — יצור אחד'); assert.equal(creatureCount(poisFor(3.2, 1)), 2)
  // בכל אורך: אחרי היצור האחרון יש עוד נקודה — הדרך חזרה לא ריקה
  for (const km of [1, 1.5, 2, 3, 4]) {
    const p = poisFor(km, 0)
    assert.ok(p.lastIndexOf('creature') < p.length - 1, `${km} ק"מ: היצור לא אחרון`)
  }
})

test('תוכנית: יצור נוסף שנקנה נכנס אחרי היצור האחרון, לא בסוף המסלול', () => {
  assert.deepEqual(withCreatures(['run', 'creature', 'flowers', 'gold'], 1),
    ['run', 'creature', 'creature', 'flowers', 'gold'])
  assert.deepEqual(withCreatures(['run', 'creature', 'gold'], 0), ['run', 'creature', 'gold'], 'בלי תוספת — כמו שהיה')
  assert.deepEqual(withCreatures(['run', 'gold'], 1), ['run', 'gold', 'creature'], 'בלי יצור בתוכנית — בסוף')
})

test('תוכנית: הנקודות מפוזרות שווה, היצור בערך באמצע, ובמסלול צפוף מוותרים על מטבעות', () => {
  const total = 60 * 20
  const a = placePois(PATH, ['run', 'creature', 'gold'], { creatures: ['nimi'] })
  assert.equal(a.stops.length, 1); assert.equal(a.stops[0].creature, 'nimi')
  assert.ok(a.coinRun.along < a.stops[0].along && a.stops[0].along < a.goldAlong, 'ריצה, היצור, ואז עוד משהו לדרך חזרה')
  const at = a.stops[0].along / total
  assert.ok(at > 0.35 && at < 0.65, 'היצור בערך באמצע: ' + at.toFixed(2))
  assert.ok(total - a.stops[0].along >= 400, 'נשאר מסלול אחרי התפיסה')
  assert.ok(a.coinRun.along >= 300, 'הריצה לא ליד הבית')
  // ארבע נקודות — על מסלול של 2.4 ק"מ (על 1.2 ק"מ זה צפוף, ואז מוותרים על הזהב)
  const LONG = Array.from({ length: 121 }, (_, i) => destination(HOME, 0, i * 20))
  assert.equal(placePois(PATH, ['run', 'creature', 'creature', 'gold'], { creatures: ['nimi', 'gali'] }).goldAlong, null, 'צפוף — בלי זהב')
  const b = placePois(LONG, ['run', 'creature', 'gold', 'creature'], { creatures: ['nimi', 'gali'] })
  assert.deepEqual(b.stops.map(s => s.creature), ['nimi', 'gali'])
  assert.ok(b.stops[0].along > b.coinRun.along && b.goldAlong > b.stops[0].along && b.stops[1].along > b.goldAlong)
  assert.ok(b.stops[1].along - b.stops[0].along >= 300, 'רווח בין היצורים')
  // מסלול קצר מאוד: נשאר רק יצור
  const short = PATH.slice(0, 21)   // 400 מ'
  const c = placePois(short, ['run', 'creature', 'gold'])
  assert.equal(c.stops.length, 1); assert.equal(c.coinRun, null); assert.equal(c.goldAlong, null)
  // הזהב במקום שהתוכנית קבעה; בלי זהב בתוכנית — בלי זהב
  const coins = placeCoins2(PATH, { stops: a.stops, goldAlong: a.goldAlong })
  const gold = coins.find(x => x.gold); assert.ok(gold && Math.abs(gold.along - a.goldAlong) <= 45, 'הזהב על המטבע הקרוב')
  assert.ok(!placeCoins2(PATH, { stops: a.stops, goldAlong: null }).some(x => x.gold))
})

test('תוכנית במכונה: SET_ROUTE_KM בבית בלבד, והמסע נבנה לפי התוכנית', () => {
  let g = reduce(initial(), { type: 'SET_ROUTE_KM', km: 1 })
  assert.equal(g.progress.routeKm, 1)
  assert.equal(reduce(g, { type: 'SET_ROUTE_KM', km: 9 }), g)
  g = reduce(g, { type: 'START_RUN', kind: RUN.STORY, missionId: 'm01', day: DAY, t: 0 })
  assert.equal(g.run.km, 1); assert.deepEqual(g.run.pois, ['creature', 'run']); assert.deepEqual(g.run.wantCreatures, ['nimi'])
  assert.equal(reduce(g, { type: 'SET_ROUTE_KM', km: 3 }), g, 'לא באמצע')
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME })
  g = reduce(g, { type: 'ROUTE_READY', path: PATH, home: HOME })
  assert.equal(g.run.stops.length, 1); assert.ok(g.run.coinRun); assert.ok(!g.run.coins.some(c => c.gold), '1 ק"מ: ריצה בלי זהב')
  // 3 ק"מ, מהמסע השלישי: שני יצורים, ריצה וזהב
  let h = { ...initial(), progress: { ...initial().progress, walks: 2, routeKm: 3 } }
  h = reduce(h, { type: 'START_RUN', kind: RUN.FREE, day: DAY, t: 0 })
  assert.equal(h.run.wantCreatures.length, 2)
  const LONG = Array.from({ length: 151 }, (_, i) => destination(HOME, 0, i * 20))   // 3 ק"מ, כמו שהתוכנית ביקשה
  h = reduce(h, { type: 'PERMISSION_GRANTED', home: HOME }); h = reduce(h, { type: 'ROUTE_READY', path: LONG, home: HOME })
  assert.equal(h.run.stops.length, 2); assert.ok(h.run.coinRun); assert.ok(h.run.coins.some(c => c.gold))
  assert.ok(h.run.coinRun.along < h.run.stops[0].along, 'הריצה לפני היצור הראשון')
  assert.equal(forServer(h).progress.routeKm, 3)
  assert.equal(mergeProgress2({ ...h.progress, walks: 5 }, { ...initial().progress, routeKm: 1 }).routeKm, 3, 'הבסיס קובע')
})

// ══════════════════════════════════════════════
// ─── המראה מהביצה: צבע עם דמות משלו ───
import { lookOf, hasLook, stagedFor } from '../src/app/wilden/engine/stages.js'

test('מראה: ביצה שבקעה "זוהר" לנימי — הקליפ שלו הוא המראה; אפשר לחזור לרגיל; לאחרים — גוון בלבד', () => {
  assert.ok(CREATURES.nimi.variants?.glow?.live, 'לנימי יש דמות לזוהר')
  const p0 = { ...initial().progress, creatures: ['nimi', 'gali'], variants: [] }
  assert.equal(lookOf(p0, CREATURES.nimi), null); assert.ok(!hasLook(p0, CREATURES.nimi))
  const p1 = { ...p0, variants: [{ creature: 'nimi', variant: 'glow', at: 1 }, { creature: 'gali', variant: 'glow', at: 2 }] }
  assert.equal(lookOf(p1, CREATURES.nimi), 'glow'); assert.ok(hasLook(p1, CREATURES.nimi))
  assert.equal(lookOf(p1, CREATURES.gali), 'glow', 'לגלי אין דמות לזוהר — גוון'); assert.ok(hasLook(p1, CREATURES.gali))
  const g = stagedFor(p1, CREATURES.gali)
  assert.ok(g.tint && g.auraColor && g.look === 'glow' && g.live === CREATURES.gali.live && g.model === null, 'גוון על הקליפ הרגיל, בלי מודל')
  const s = stagedFor(p1, CREATURES.nimi)
  assert.equal(s.live, '/creatures/nimi/glow/live.webp'); assert.equal(s.look, 'glow'); assert.equal(s.model, null); assert.equal(s.aura, false)
  // המראה מנצח את דמות השלב, בגודל של השלב
  const s2 = stagedFor({ ...p1, caught: { nimi: 4 } }, CREATURES.nimi)
  assert.equal(s2.stage, 2); assert.equal(s2.live, '/creatures/nimi/glow/live.webp'); assert.ok(s2.heightM > CREATURES.nimi.heightM)
  // בחירה בספר: רגיל
  assert.equal(lookOf({ ...p1, look: { nimi: 'base' } }, CREATURES.nimi), null)
  assert.equal(stagedFor({ ...p1, look: { nimi: 'base' } }, CREATURES.nimi).live, CREATURES.nimi.live)
  // צבע זהוב שבקע — בלי דמות: גוון זהב על הדמות הרגילה; אם גם זוהר בקע — הדמות עדיפה על הגוון
  const gold = stagedFor({ ...p0, variants: [{ creature: 'nimi', variant: 'gold' }] }, CREATURES.nimi)
  assert.equal(gold.look, 'gold'); assert.ok(gold.tint.includes('sepia')); assert.equal(gold.live, CREATURES.nimi.live)
  assert.equal(lookOf({ ...p0, variants: [{ creature: 'nimi', variant: 'glow' }, { creature: 'nimi', variant: 'gold' }] }, CREATURES.nimi), 'glow')
})

test('מראה במכונה: SET_LOOK בבית, נשמר לשרת ובמיזוג הבסיס קובע', () => {
  let g = { ...initial(), progress: { ...initial().progress, creatures: ['nimi'], variants: [{ creature: 'nimi', variant: 'glow', at: 1 }] } }
  g = reduce(g, { type: 'SET_LOOK', id: 'nimi', look: 'base' })
  assert.deepEqual(g.progress.look, { nimi: 'base' })
  g = reduce(g, { type: 'SET_LOOK', id: 'nimi', look: null })
  assert.deepEqual(g.progress.look, {})
  assert.deepEqual(forServer(reduce(g, { type: 'SET_LOOK', id: 'nimi', look: 'base' })).progress.look, { nimi: 'base' })
  const m = mergeProgress2({ ...g.progress, walks: 3, look: { nimi: 'base' } }, { ...initial().progress, look: { nimi: 'glow', gali: 'base' } })
  assert.deepEqual(m.look, { nimi: 'base', gali: 'base' })
})

// ══════════════════════════════════════════════
// ─── ציוד: מפתחות, משרוקיות, ומה שנותן יותר ───
import { GEAR, gearById, canBuyGear, buyGear, modsFor, consume, armed, ownsGear, itemCount, MAX_ITEMS, mergeGear, KEYS, unlocked, withKeys, withExtra, lockLine } from '../src/app/wilden/engine/gear.js'
import { withExtraGold } from '../src/app/wilden/engine/coins.js'
import { BUILDINGS, swarmOf, buildings, produce } from '../src/app/wilden/engine/world.js'

test('ציוד: מפתח נקנה פעם אחת, חד-פעמי נערם עד 3 ואפשר לקנות בדבש, ומה שפעיל נגזר מהם', () => {
  assert.equal(GEAR.length, 7)
  assert.deepEqual(KEYS, { tzel: 'lantern', ruchi: 'binoculars', kraag: 'pickaxe' })
  const p0 = { ...initial().progress, coins: 100, res: { honey: 4 } }
  assert.ok(canBuyGear(p0, 'lantern')); assert.ok(!canBuyGear({ ...p0, coins: 10 }, 'lantern'))
  const p1 = buyGear(p0, 'lantern'); assert.equal(p1.coins, 60); assert.ok(ownsGear(p1, 'lantern')); assert.ok(unlocked(p1, 'tzel')); assert.ok(!unlocked(p1, 'kraag'))
  assert.equal(buyGear(p1, 'lantern'), p1, 'לא פעמיים')
  // משרוקית בדבש
  assert.ok(canBuyGear(p1, 'whistle', 'honey')); assert.ok(!canBuyGear(p1, 'goldWhistle', 'honey'), '6 דבש — אין')
  const p2 = buyGear(p1, 'whistle', 'honey')
  assert.equal(p2.res.honey, 1); assert.equal(p2.coins, 60); assert.equal(itemCount(p2, 'whistle'), 1)
  const p3 = buyGear(buyGear(p2, 'whistle'), 'whistle'); assert.equal(itemCount(p3, 'whistle'), 3)
  assert.equal(itemCount(buyGear({ ...p3, coins: 99 }, 'whistle'), 'whistle'), MAX_ITEMS, 'לא יותר משלושה')
  assert.deepEqual(modsFor(p3), { lantern: true, extraStop: 1 })
  assert.deepEqual(armed(p3).map(a => [a.id, a.n]), [['whistle', 3]])
  const c = consume(p3); assert.deepEqual(c.used, ['whistle']); assert.equal(itemCount(c.progress, 'whistle'), 2)
  assert.deepEqual(consume(p0).used, [])
  assert.ok(lockLine('tzel').includes('פנס') && lockLine('tzel').includes('40')); assert.equal(lockLine('nimi'), '')
  assert.deepEqual(mergeGear({ gear: ['lantern'], items: { whistle: 1 } }, { gear: ['pickaxe'], items: { whistle: 2, map: 1 } }), { gear: ['lantern', 'pickaxe'], items: { whistle: 2, map: 1 } })
})

test('מפתחות בלוח: יצור נעול מוחלף בפנוי הבא, ומשרוקית מוסיפה אחד', () => {
  const none = initial().progress
  const k = withKeys(['dabashon', 'tzel'], none, AVAILABLE)
  assert.deepEqual(k.creatures, ['dabashon', 'nimi']); assert.deepEqual(k.locked, ['tzel'])
  const withL = { ...none, gear: ['lantern'] }
  assert.deepEqual(withKeys(['dabashon', 'tzel'], withL, AVAILABLE), { creatures: ['dabashon', 'tzel'], locked: [] })
  assert.deepEqual(withKeys(['kraag', 'ruchi'], none, AVAILABLE).locked, ['kraag', 'ruchi'])
  const ex = withExtra(['nimi', 'gali'], none, AVAILABLE, 0)
  assert.equal(ex.length, 3); assert.ok(!['tzel', 'ruchi', 'kraag'].includes(ex[2]), 'המשרוקית לא קוראת לנעול')
  assert.equal(withExtra(['nimi', 'gali'], none, ['nimi', 'gali'], 0).length, 2, 'אין למי לקרוא')
})

test('ציוד במכונה: משרוקית = עוד יצור; משרוקית זהב = צבע בפורטל; מגנט ומפה; נעול מוחלף', () => {
  // כל הבקשות סגורות: הלוח נקי מהטיית "מי שהשומר מחכה לו", והבדיקה
  // בודקת ציוד בלבד.
  let g = { ...initial(), progress: { ...initial().progress, coins: 300, walks: 1, quests: ALL_QUESTS } }
  g = reduce(g, { type: 'BUY_GEAR', id: 'whistle' }); g = reduce(g, { type: 'BUY_GEAR', id: 'goldWhistle' }); g = reduce(g, { type: 'BUY_GEAR', id: 'magnet' }); g = reduce(g, { type: 'BUY_GEAR', id: 'map' })
  assert.equal(g.progress.coins, 300 - 30 - 60 - 20 - 25)
  g = reduce(g, { type: 'START_RUN', kind: RUN.FREE, day: DAY, t: 0 })
  assert.deepEqual(g.run.locked, ['tzel'], 'מסע 2: צל בלוח, בלי פנס — נעול')
  assert.equal(g.run.wantCreatures.length, 3, 'שניים מהלוח (צל הוחלף) + משרוקית')
  assert.ok(!g.run.wantCreatures.includes('tzel'))
  assert.equal(g.run.mods.colorNext, 1); assert.equal(g.run.mods.coinRadius, 28); assert.equal(g.run.mods.extraGold, 1)
  assert.deepEqual(g.progress.items, {})
  const LONG3 = Array.from({ length: 151 }, (_, i) => destination(HOME, 0, i * 20))   // 3 ק"מ: מקום לשלושה יצורים וזהב
  g = reduce(g, { type: 'PERMISSION_GRANTED', home: HOME }); g = reduce(g, { type: 'ROUTE_READY', path: LONG3, home: HOME })
  assert.equal(g.run.stops.length, 3); assert.equal(g.run.coins.filter(c => c.gold).length, 2, 'מפת אוצר: שני זהבים')
  g = walk(g, 300)
  const c0 = g.run.coins.find(c => !c.gold && c.along > 420 && c.along < g.run.stops[0].along - 60)
  const side = destination({ lat: c0.lat, lng: c0.lng }, 90, 22)
  g = reduce(g, { type: 'FIX', lat: side.lat, lng: side.lng, acc: 8, t: 400000 })
  assert.ok(g.run.coins.find(c => c.id === c0.id).taken, 'מגנט: נמשך מ-22 מ\'')
  // תופסים את הראשון ונכנסים לפורטל — משרוקית הזהב צובעת אותו
  g = catchHere(g, 500000)
  // עד סוף התחנות: מסמנים את השאר כתפוסים (קיצור לבדיקה)
  g = { ...g, run: { ...g.run, stops: g.run.stops.map(s => ({ ...s, done: true })), resolved: true } }
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED', t: 600000, rng: () => 0.1 }])
  assert.ok(g.hatched && g.hatched.source === 'whistle' && g.hatched.creature === g.run?.stops?.[0]?.creature || g.hatched?.source === 'whistle')
  assert.ok(g.progress.variants.some(v => v.source === 'whistle' && v.variant === 'gold'))
  const coins = withExtraGold([{ id: 'a', along: 100, value: 1 }, { id: 'gold', along: 700, value: 10, gold: true }, { id: 'b', along: 900, value: 1 }], null)
  assert.equal(coins.filter(c => c.gold).length, 2); assert.ok(coins.find(c => c.id === 'gold2'))
})

test('נחיל ומבנים: 7 מאותו יצור — הכוורת עובדת ומייצרת דבש בכל מסע', () => {
  assert.equal(BUILDINGS[0].id, 'hive')
  assert.equal(swarmOf({ caught: { dabashon: 1 } }, 'dabashon'), 0)
  assert.equal(swarmOf({ caught: { dabashon: 4 } }, 'dabashon'), 3)
  assert.equal(swarmOf({ caught: { dabashon: 40 } }, 'dabashon'), 6, 'עד שש')
  const b = buildings({ caught: { dabashon: 6 } }).find(x => x.id === 'hive')
  assert.equal(b.built, false); assert.equal(b.have, 6)
  assert.ok(buildings({ caught: { dabashon: 7 } }).find(x => x.id === 'hive').built)
  assert.deepEqual(produce({ caught: { dabashon: 7 }, res: { honey: 2 } }), { res: { honey: 3 }, made: [{ id: 'hive', product: 'honey' }] })
  assert.deepEqual(produce({ caught: { dabashon: 2 } }).made, [])
  // במכונה: התפיסה השביעית של האני — הכוורת עובדת כבר במסע הזה
  let g = started(['dabashon'], { ...initial(), progress: { ...initial().progress, caught: { dabashon: 6 }, creatures: ['dabashon'] } })
  g = walk(g, 200); g = catchHere(g, 500000)
  g = run(g, [{ type: 'PORTAL_OPEN' }, { type: 'PORTAL_ENTERED' }])
  assert.equal(g.progress.res.honey, 2, 'האני הביאה 1 + הכוורת ייצרה 1')
  assert.deepEqual(g.made, [{ id: 'hive', product: 'honey' }])
  assert.equal(reduce(reduce(g, { type: 'CLUE_SEEN' }), { type: 'RUN_CLOSED' }).made, null)
})

// ══════════════════════════════════════════════
// ─── סקינים ואבן צמיחה ───
import { SKINS, skinById, canBuySkin, buySkin, ownsSkin, canBuyStone, buyStone, STONE_PRICE, stoneCredits, mergeSkins } from '../src/app/wilden/engine/skins.js'
import { looksFor, lookName } from '../src/app/wilden/engine/stages.js'

test('סקינים: קונים ליצור שנתפס, הוא לובש מיד, ובספר אפשר להחליף בין רגיל / ביצה / סקין', () => {
  assert.ok(SKINS.length >= 5)
  const p0 = { ...initial().progress, coins: 100, creatures: ['gali'], variants: [{ creature: 'gali', variant: 'gold' }] }
  assert.ok(!canBuySkin(p0, 'nimi', 'lava'), 'לא נתפס'); assert.ok(canBuySkin(p0, 'gali', 'lava'))
  const p1 = buySkin(p0, 'gali', 'lava')
  assert.equal(p1.coins, 55); assert.ok(ownsSkin(p1, 'gali', 'lava')); assert.equal(p1.look.gali, 'lava')
  assert.equal(buySkin(p1, 'gali', 'lava'), p1, 'לא פעמיים')
  const s = stagedFor(p1, CREATURES.gali)
  assert.equal(s.look, 'lava'); assert.ok(s.tint.includes('sepia')); assert.equal(s.auraColor, skinById('lava').aura)
  assert.deepEqual(looksFor(p1, CREATURES.gali), ['gold', 'lava'])
  assert.equal(lookName('lava', CREATURES.gali), 'לבה'); assert.equal(lookName('gold', CREATURES.gali), 'זהובה')
  // חזרה לזהוב, לרגיל
  assert.equal(stagedFor({ ...p1, look: { gali: 'gold' } }, CREATURES.gali).look, 'gold')
  assert.equal(stagedFor({ ...p1, look: { gali: 'base' } }, CREATURES.gali).look, null)
  assert.equal(stagedFor({ ...p1, look: { gali: 'silver' } }, CREATURES.gali).look, 'gold', 'סקין שלא נקנה — לא לובשים; חוזרים למה שבקע')
  // אבן צמיחה
  assert.ok(canBuyStone(p1, 'gali')); assert.ok(!canBuyStone({ ...p1, coins: 10 }, 'gali'))
  const p2 = buyStone(buyStone({ ...p1, coins: 200, caught: { gali: 1 } }, 'gali'), 'gali')
  assert.equal(stoneCredits(p2, 'gali'), 2); assert.equal(stageOf(p2, 'gali'), 2, '1 תפיסה + 2 אבנים = בוגר')
  assert.deepEqual(mergeSkins({ skins: { gali: ['lava'] }, stones: { gali: 1 } }, { skins: { gali: ['silver'], nimi: ['forest'] }, stones: { gali: 2 } }), { skins: { gali: ['lava', 'silver'], nimi: ['forest'] }, stones: { gali: 2 } })
})

test('סקינים במכונה: בבית בלבד; אבן שמגדילה פותחת את מסך ההתפתחות; נשמר לשרת', () => {
  let g = { ...initial(), progress: { ...initial().progress, coins: 200, creatures: ['nimi'], caught: { nimi: 2 } } }
  g = reduce(g, { type: 'BUY_SKIN', creature: 'nimi', skin: 'forest' })
  assert.deepEqual(g.progress.skins, { nimi: ['forest'] }); assert.equal(g.progress.look.nimi, 'forest')
  g = reduce(g, { type: 'BUY_STONE', creature: 'nimi' })
  assert.equal(g.progress.stones.nimi, 1)
  assert.deepEqual(g.evolved, [{ id: 'nimi', from: 1, to: 2 }], 'האבן השלישית מגדילה — מסך ההתפתחות')
  const walking = started(['nimi'], { ...g, evolved: null })
  assert.equal(reduce(walking, { type: 'BUY_SKIN', creature: 'nimi', skin: 'lava' }), walking)
  assert.deepEqual(forServer(g).progress.skins, { nimi: ['forest'] }); assert.equal(forServer(g).progress.stones.nimi, 1)
})

test('חם-קר: מודד לאורך המסלול, לא בקו אווירי — היציאה מהבית תמיד קרה', async () => {
  const { heatDistance, heatOf } = await import('../src/app/wilden/engine/coins.js')
  // הבית 120 מ' מהתחנה בקו ישר, אבל 1100 מ' בהליכה לאורך הלולאה
  assert.equal(heatDistance(120, 1100), 1100)
  assert.equal(heatOf(heatDistance(120, 1100)).key, 'COLD')
  // ליד התחנה שניהם קטנים — חם
  assert.equal(heatOf(heatDistance(40, 50)).key, 'BURNING')
  // אחרי שעברו את התחנה (along שלילי) — קו אווירי בלבד
  assert.equal(heatDistance(300, -50), 300)
  assert.equal(heatDistance(null, 500), 500)
  assert.equal(heatDistance(null, null), null)
})

test('מנוע ניווט: בונים בקשת לולאה ומפענחים תשובת GeoJSON לשמות רחובות על הנקודות', async () => {
  const { orsBody, parseOrs, daySeed } = await import('../src/app/wilden/engine/ors.js')
  const body = orsBody({ lat: 32.0853, lng: 34.7818 }, 2200, 12)
  assert.deepEqual(body.coordinates, [[34.7818, 32.0853]])
  assert.equal(body.options.round_trip.length, 2200)
  assert.equal(body.options.round_trip.seed, 12)
  const json = { features: [{ geometry: { coordinates: [[34.78, 32.08], [34.781, 32.081], [34.782, 32.081], [34.782, 32.08], [34.78, 32.08]] },
    properties: { summary: { distance: 1234.6 }, segments: [{ steps: [
      { name: 'הרצל', way_points: [0, 1] }, { name: '-', way_points: [1, 3] }, { name: 'ביאליק', way_points: [3, 4] } ] }] } }] }
  const r = parseOrs(json)
  assert.equal(r.ok, true)
  assert.equal(r.meters, 1235)
  assert.equal(r.path.length, 5)
  assert.deepEqual(r.path[0], { lat: 32.08, lng: 34.78, street: 'הרצל' })
  assert.equal(r.path[2].street, '')          // "-" = בלי שם
  assert.equal(r.path[4].street, 'ביאליק')
  assert.equal(parseOrs({ features: [] }).ok, false)
  assert.equal(parseOrs(null).ok, false)
  assert.equal(daySeed(new Date(2026, 0, 1)), 0)
  assert.equal(daySeed(new Date(2026, 0, 2)), 1)
})

test('מפתח ORS שהודבק מטלפון: תווי כיווניות וזנב "0 in" יורדים, המפתח האמיתי נשאר', async () => {
  const { cleanKey } = await import('../src/app/wilden/engine/ors.js')
  const real = Buffer.from(JSON.stringify({ org: '5b3ce3597851110001cf6248', id: 'abc', h: 'murmur64' })).toString('base64')
  assert.equal(cleanKey(real), real)
  assert.equal(cleanKey('⁨' + real + '⁩0 in'), real)
  assert.equal(cleanKey(real + '0in'), real)
  assert.equal(cleanKey('Bearer ' + real + '\n'), real)
  assert.equal(cleanKey(''), '')
  assert.equal(cleanKey('notakey'), 'notakey')     // לא base64 של JSON — מחזירים כמו שהוא, השרת של ORS יגיד
})

test('פרחים: ריצה של 20 שניות כמו המטבעות — בתוכנית, על המסלול, ובסוף הביתה כמשאב וכמטבעות', async () => {
  const { poisFor, placePois, POI } = await import('../src/app/wilden/engine/plan.js')
  const { flowerRunNearby } = await import('../src/app/wilden/engine/coins.js')
  assert.ok(!poisFor(1, 1).includes(POI.FLOWERS), 'בקצר אין מקום לפרחים')
  assert.ok(poisFor(2).includes(POI.FLOWERS) && poisFor(3).includes(POI.FLOWERS))
  // מסלול ישר של 3 ק"מ
  const path = Array.from({ length: 31 }, (_, i) => ({ lat: 32.08 + i * 0.0009, lng: 34.78 }))
  const plan = placePois(path, poisFor(3), { creatures: ['nimi', 'gali'] })
  assert.ok(plan.flowerRun && !plan.flowerRun.done && plan.coinRun && plan.stops.length === 2)
  assert.ok(plan.flowerRun.along > plan.coinRun.along, 'הפרחים אחרי המטבעות')
  assert.ok(flowerRunNearby({ flowerRun: plan.flowerRun }, plan.flowerRun), 'ליד הנקודה — נפתח')
  assert.equal(flowerRunNearby({ flowerRun: { ...plan.flowerRun, done: true } }, plan.flowerRun), null)
  // במכונה: הריצה נסגרת, פרח = מטבע, ובסוף המסע פרחים בבית
  let g = { ...initial(), state: 'SEARCH', run: { flowerRun: { ...plan.flowerRun }, coinsTaken: 3, coins: [], stops: [], walked: 100 } }
  g = reduce(g, { type: 'FLOWER_RUN_DONE', got: 7, t: 5 })
  assert.equal(g.run.flowerRun.done, true); assert.equal(g.run.flowerRun.got, 7)
  assert.equal(g.run.coinsTaken, 10)
  assert.equal(g.run.lastCoin.flowers, true)
  assert.equal(reduce(g, { type: 'FLOWER_RUN_DONE', got: 2 }), g, 'פעם אחת')
})

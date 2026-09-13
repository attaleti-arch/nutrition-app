// ─── עולם הבית: מה הבאנו, מה השומר מבקש, מה נבנה ───
// "הבן שלי אומר שחסר NPC ו-quest." ו"רציתי שזה ירגיש שונה מפוקימון GO,
// שם אין אף אחד שצריך אותך."
//
// כל יצור שנתפס מביא הביתה משאב (דבשון — דבש, בולדר — אבן...). השומר,
// פסל אבן בכניסה לעולם, מבקש משאבים לפי הסדר, וכל בקשה שמתמלאת בונה
// משהו שרואים: הסדקים שלו נדלקים, הכד מתמלא מים, העץ המת מלבלב, הביקון
// דולק, השער נפתח. זו הסיבה לצאת מחר.
//
// טהור: progress נכנס, תשובות יוצאות. המכונה מפעילה completeQuest.

import { CREATURES } from '../content/creatures.js'
import { formTally, stageProgress } from './stages.js'
import { inTank, tankShown, tamedCount, TANK_MAX } from './tank.js'

// מה כל יצור מביא הביתה. פעם אחת לכל תפיסה, גם חוזרת.
export const RES_OF = {
  nimi: 'leaf', dabashon: 'honey', bolder: 'stone', ruchi: 'wind',
  lumi: 'spark', gali: 'water', tzel: 'shadow', kraag: 'stone', noga: 'light',
}
export const RES_NAME = {
  wood: 'קרשים', stone: 'אבן', flowers: 'פרחים', spark: 'ניצוץ', honey: 'דבש',
  water: 'מים', wind: 'רוח', shadow: 'צללים', leaf: 'עלים', light: 'אור',
}
export const RES_ICON = { stone: '🪨', honey: '🍯', water: '💧', wind: '🌬️', spark: '✨', shadow: '🌑', leaf: '🍃', wood: '🪵', flowers: '🌸', light: '🌟' }

// מה נכנס לעולם כשחוזרים דרך הפורטל עם היצורים האלה.
export function bringsFor(creatureIds) {
  const out = {}
  for (const id of creatureIds || []) {
    const k = RES_OF[id]
    if (k) out[k] = (out[k] || 0) + 1
  }
  return out
}

// ── הבקשות של השומר ──
// כל בקשה: מה צריך, מה הוא אומר לפני, מה קורה כשנותנים, ומה זה משנה
// בעולם (flag). כמה מטבעות על הדרך, כי גם זה נחמד.
//
// ── "אני לא רוצה שהמשחק ייגמר מהר מדי" ──
// מדדתי: עם חמש בקשות בלבד, הסימולציה נגמרה אחרי עשרה מסעות — וגרוע
// מזה, ארבע מהן נסגרו באותו מסע אחד. הסיבה: הבקשות היו נעולות בשרשרת
// קשיחה, המשאבים נערמו בצד, וברגע שהמשאב החוסם הגיע הכול נפתח יחד.
// שני תיקונים, ושניהם כאן:
//   1. פרקים. פרק 1 מעיר את העולם (חמש). פרק 2 בונה בו בתים (ארבע) —
//      וזה החלק שנותן ייצור קבוע, כלומר סיבה להמשיך.
//   2. בתוך פרק פתוח, השומר מבקש את מה שאפשר להביא עכשיו (ראה
//      activeQuest). ככה נבנה משהו כמעט בכל מסע, במקום שש פעמים כלום
//      ואז הכול.
export const CHAPTERS = [
  { n: 1, name: 'להעיר את העולם' },
  { n: 2, name: 'לבנות בו בית' },
]
export const QUESTS = [
  { id: 'wake', chapter: 1, needs: { stone: 2 }, flag: 'guardianAwake', coins: 15,
    title: 'להעיר את השומר',
    ask: 'אני… ישן. כבד. תביאו לי אבן — שתיים — והסדקים שלי יידלקו שוב.',
    hint: 'אבן מביאים בולדר וקראג.',
    done: 'האור חזר אליי. תודה. עכשיו אני זוכר: הכד היה מלא מים.' },
  { id: 'basin', chapter: 1, needs: { water: 2 }, flag: 'basinFull', coins: 20,
    title: 'למלא את הכד',
    ask: 'הכד במרכז היה מלא מים, והביקון עמד בתוכו. תביאו מים.',
    hint: 'מים מביאה גלי.',
    done: 'הכד מלא. שומעים? המים זזים. הביקון צריך אור.' },
  { id: 'beacon', chapter: 1, needs: { spark: 2 }, flag: 'beaconLit', coins: 25,
    title: 'להדליק את הביקון',
    ask: 'ניצוץ. שני ניצוצות, והביקון בכד יידלק. אז כולם יראו את הבית מרחוק.',
    hint: 'ניצוץ מביא לומי.',
    done: 'הביקון דולק! עכשיו העץ. הוא לא מת, הוא רק רעב.' },
  { id: 'tree', chapter: 1, needs: { honey: 2, leaf: 1 }, flag: 'treeAlive', coins: 25,
    title: 'להחיות את העץ',
    ask: 'העץ הזקן צריך דבש, ועלה אחד ירוק שיזכיר לו. תביאו.',
    hint: 'דבש מביאה האני, עלה מביא נימי.',
    done: 'תראו! ניצנים. הוא חוזר. נשאר רק השער.' },
  { id: 'gate', chapter: 1, needs: { wind: 2, shadow: 1 }, flag: 'gateOpen', coins: 40,
    title: 'לפתוח את השער',
    ask: 'השער נעול מבפנים. רוח תדחוף אותו, וצל ידע לעבור דרכו. תביאו את שניהם.',
    hint: 'רוח מביא רוחי, צללים מביא צל.',
    done: 'השער נפתח. מה שמאחוריו… זה כבר סיפור אחר. בקרוב.' },

  // ── פרק 2: לבנות בו בית ──
  // ארבע הבקשות האלה בונות את המבנים שכבר יש להם תמונה (BUILDINGS),
  // וכל מבנה מייצר משאב בכל מסע. כלומר הפרק הזה לא רק מאריך את המשחק —
  // הוא מה שהופך אותו למשק שממשיך לעבוד.
  { id: 'hive', chapter: 2, needs: { honey: 3, leaf: 2 }, flag: 'hiveBuilt', coins: 30, builds: 'hive',
    title: 'לבנות כוורת',
    ask: 'האני מביאה דבש בכל פעם, ואין לה איפה לשים אותו. תביאו דבש ועלים — ונבנה לה כוורת.',
    hint: 'דבש מביאה האני, עלים מביא נימי.',
    done: 'הכוורת עומדת. מעכשיו יש דבש בכל מסע, גם בלי ללכת רחוק.' },
  { id: 'pond', chapter: 2, needs: { water: 3, stone: 2 }, flag: 'pondBuilt', coins: 30, builds: 'pond',
    title: 'לחפור שלולית',
    ask: 'גלי צריכה מים משלה, לא רק את הכד שלי. מים ואבן לגדה.',
    hint: 'מים מביאה גלי, אבן בולדר וקראג.',
    done: 'השלולית מלאה. גלי לא מפסיקה לקפוץ פנימה.' },
  { id: 'quarry', chapter: 2, needs: { stone: 4, shadow: 1 }, flag: 'quarryBuilt', coins: 35, builds: 'quarry',
    title: 'לסדר את ערמת האבנים',
    ask: 'בולדר אוסף אבנים ומפזר אותן. ערמה מסודרת — ויהיה לנו ממה לבנות.',
    hint: 'אבן מביאים בולדר וקראג, צל מביא צל.',
    done: 'כל אבן במקום שלה. בולדר מרוצה מאוד־מאוד.' },
  { id: 'nest', chapter: 2, needs: { wind: 3, spark: 2 }, flag: 'nestBuilt', coins: 35, builds: 'nest',
    title: 'לבנות קן',
    ask: 'רוחי ישן על החומה. קן גבוה, מרוח ומניצוץ, ויהיה לו בית.',
    hint: 'רוח מביא רוחי, ניצוץ מביאה לומי.',
    done: 'הקן מוכן. רוחי חג מעליו פעמיים ונכנס. עכשיו העולם הזה באמת בית.' },
]

export const questById = id => QUESTS.find(q => q.id === id) || null

// ── הפרק שנפתח ──
// פרק נפתח רק כשכל הקודם נסגר: קודם מעירים את העולם, אחר כך בונים בו.
export function openChapter(progress) {
  const done = progress?.quests || []
  for (const ch of CHAPTERS) {
    if (QUESTS.some(q => q.chapter === ch.n && !done.includes(q.id))) return ch.n
  }
  return CHAPTERS[CHAPTERS.length - 1].n
}

// ── הבקשה הפעילה ──
// בתוך הפרק הפתוח: אם אפשר להשלים משהו עכשיו — זה מה שהוא מבקש, כדי
// שמי שחזר עם הידיים מלאות יבנה משהו היום ולא בעוד ארבעה מסעות. אחרת
// הראשונה שלא נעשתה, כדי שהרמז יגיד מה להביא. null = הכול נבנה.
export function activeQuest(progress) {
  const done = progress?.quests || []
  const ch = openChapter(progress)
  const left = QUESTS.filter(q => q.chapter === ch && !done.includes(q.id))
  if (!left.length) return QUESTS.find(q => !done.includes(q.id)) || null
  return left.find(q => canComplete(progress, q)) || left[0]
}

// ── מי חסר לשומר ──
// "רציתי שזה ירגיש שונה מפוקימון GO, שם אין אף אחד שצריך אותך." אז מי
// שהשומר מחכה לו הוא מי שיוצא איתך היום: אם חסר דבש — האני בדרך. בלי
// זה המסלול הוא הגרלה, והבקשה תקועה שישה מסעות כי היצור הנכון לא הגיע.
// מחזירה מזהי יצורים לפי כמה חסר, הגדול קודם.
export function creaturesWanted(progress, quest = activeQuest(progress)) {
  if (!quest) return []
  const res = progress?.res || {}
  const gaps = Object.entries(quest.needs)
    .map(([k, n]) => ({ res: k, gap: n - (res[k] || 0) }))
    .filter(x => x.gap > 0)
    .sort((a, b) => b.gap - a.gap)
  const out = []
  for (const g of gaps) {
    for (const [id, r] of Object.entries(RES_OF)) if (r === g.res && !out.includes(id)) out.push(id)
  }
  return out
}

// כמה יש מכל מה שהבקשה צריכה: [{ res, have, need }]
export function questProgress(progress, quest) {
  const res = progress?.res || {}
  return Object.entries(quest?.needs || {}).map(([k, need]) => ({ res: k, need, have: Math.min(need, res[k] || 0) }))
}

export function canComplete(progress, quest) {
  if (!quest) return false
  const res = progress?.res || {}
  return Object.entries(quest.needs).every(([k, n]) => (res[k] || 0) >= n)
}

// נותנים לשומר: המשאבים יורדים, הבקשה נסגרת, המטבעות נכנסים.
export function completeQuest(progress, id) {
  const q = questById(id)
  if (!q || (progress.quests || []).includes(id) || !canComplete(progress, q)) return progress
  const res = { ...(progress.res || {}) }
  for (const [k, n] of Object.entries(q.needs)) res[k] = (res[k] || 0) - n
  return { ...progress, res, quests: [...(progress.quests || []), id], coins: (progress.coins || 0) + q.coins }
}

// מה נבנה בעולם: דגלים שהמסך מצייר.
export function worldState(progress) {
  const done = progress?.quests || []
  const st = {}
  for (const q of QUESTS) st[q.flag] = done.includes(q.id)
  st.built = done.length
  st.total = QUESTS.length
  return st
}

// ── מה הלאה ──
// כשכל הבקשות נסגרות, "ההמשך בקרוב" נקרא לילד כמו "נגמר". וזה לא נגמר:
// יש ספר עם עשרים ושבע צורות, יצורים שגדלים עד אגדי, ארבעה מבנים
// ושבעה צבעים לכל יצור. הפאנל הזה אומר בדיוק מה נשאר — במספרים
// אמיתיים, בלי הבטחות.
export function nextGoals(progress) {
  const ids = Object.keys(CREATURES)
  const forms = formTally(progress, ids.map(id => CREATURES[id]))
  const out = [{ icon: '📖', text: 'צורות בספר', have: forms.open, need: forms.total }]
  // מי הכי קרוב לגדול — הסיבה לצאת מחר
  let best = null
  for (const id of progress?.creatures || []) {
    const sp = stageProgress(progress, id)
    if (!sp.next) continue
    if (!best || sp.left < best.left) best = { id, ...sp }
  }
  if (best) {
    out.push({ icon: '▲', text: 'הכי קרוב לגדול', name: CREATURES[best.id]?.name,
      have: best.have, need: best.need, left: best.left })
  }
  const b = buildings(progress)
  out.push({ icon: '🏠', text: 'מבנים', have: b.filter(x => x.built).length, need: b.length })
  out.push({ icon: '🎨', text: 'צבעים', have: forms.colours, need: ids.length * 7 })
  // מה שבשואב, למי שכבר שאב רוח אחת: גם זה משהו שנשאר לעשות מחר.
  if (inTank(progress) || tamedCount(progress)) {
    out.push({ icon: '🌀', text: 'בשואב', have: tankShown(progress), need: TANK_MAX })
  }
  return out
}

// ── מה כל יצור אומר בבית ──
// לחיצה על יצור בעולם: משפט אחד, בקול שלו. מתחלף לפי מצב העולם.
const LINES = {
  nimi: ['מרחרח… מרחרח… יש פה משהו!', 'אני מכיר את כל השבילים. גם את הסודיים.', 'מחר יוצאים שוב? אני ראשון.'],
  dabashon: ['זזזז… הפרחים חוזרים? אז גם אני.', 'הבאתי דבש. מתוק כמו… כמו דבש.', 'העץ הזה היה מלא פרחים פעם. זזז.'],
  bolder: ['כל אבן… במקום… שלה.', 'הגשר. אני בונה את הגשר. אחר כך.', 'השומר? הכרתי אותו. הוא ישן הרבה.'],
  ruchi: ['הרוח סיפרה לי שהשער עוד נעול.', 'מלמעלה רואים הכול. הכול!', 'עוד מעט אני מנסה לעוף מעל החומה.'],
  lumi: ['בלילה אני מאיר את הדרך. אל תדאגו.', 'הביקון צריך ניצוץ? יש לי.', 'תראו את הזנב שלי! תראו!'],
  gali: ['הכד… ריק. אני יכולה לתקן את זה.', 'שמעתם? זה המים. הם חוזרים.', 'ספלאש!'],
  tzel: ['אני כאן. לא, כאן. לא… כאן.', 'מעבר לשער יש צל שאני מכיר.', 'ששש. הלילה שומע.'],
  kraag: ['אבן… זוכרת… הכול.', 'פעם הייתי גדול. אהיה שוב.', 'השער. אני זוכר מה מאחוריו.'],
  noga: ['כשחשוך, תסתכלו עליי.', 'העלים שלי זוהרים כשמישהו שמח. עכשיו, למשל.', 'הבוקר? אני מביאה אותו.'],
}
export function creatureLine(id, seed = 0) {
  const arr = LINES[id] || ['…']
  return arr[Math.abs(seed) % arr.length]
}

// ── מבנים ──
// "7 דבורים = הכוורת עובדת." תפיסות חוזרות בונות נחיל, והנחיל בונה מבנה
// שמייצר משאב בכל מסע. הכוורת ראשונה; השאר כשהתמונות שלה יגיעו (img).
export const BUILDINGS = [
  { id: 'hive', name: 'כוורת', creature: 'dabashon', need: 7, product: 'honey', spot: { x: 15, y: 60, w: 24 }, img: '/world/buildings/hive.webp', live: '/world/buildings/hive-live.webp',
    line: 'שבע דבורים — והכוורת עובדת. דבש בכל מסע.' },
  { id: 'pond', name: 'שלולית', creature: 'gali', need: 7, product: 'water', spot: { x: 62, y: 89, w: 26 }, img: '/world/buildings/pond.webp', live: '/world/buildings/pond-live.webp',
    line: 'שבע גלי — והשלולית מלאה. מים בכל מסע.' },
  { id: 'quarry', name: 'ערמת אבנים', creature: 'bolder', need: 7, product: 'stone', spot: { x: 88, y: 72, w: 30 }, img: '/world/buildings/quarry.webp', live: '/world/buildings/quarry-live.webp',
    line: 'שבעה בולדר — וערמת האבנים גדלה. אבן בכל מסע.' },
  { id: 'nest', name: 'קן', creature: 'ruchi', need: 7, product: 'wind', spot: { x: 89, y: 35, w: 15 }, img: '/world/buildings/nest.webp', live: '/world/buildings/nest-live.webp',
    line: 'שבעה רוחי — והקן שלם. רוח בכל מסע.' },
]
export const SWARM_MAX = 6      // כמה קטנים מסביב לגדול, לכל היותר
export const swarmOf = (progress, id) => Math.max(0, Math.min(SWARM_MAX, (progress?.caught?.[id] || 0) - 1))
// מבנה קם בשתי דרכים: בקשה של השומר שבונה אותו (פרק 2), או שבע תפיסות
// של אותו יצור. מי שאוהב יצור אחד מגיע לשם לבד, ומי שהולך עם השומר
// מגיע לשם בסיפור.
export const buildingState = (progress, b) => {
  const n = progress?.caught?.[b.creature] || 0
  const byQuest = (progress?.quests || []).includes(b.id)
  return { ...b, have: Math.min(b.need, n), byQuest, built: byQuest || n >= b.need }
}
export const buildings = progress => BUILDINGS.map(b => buildingState(progress, b))
// בסוף מסע: כל מבנה שעובד מייצר אחד. מחזיר { res, made: [{ id, product }] }.
export function produce(progress) {
  const res = { ...(progress?.res || {}) }
  const made = []
  for (const b of buildings(progress)) if (b.built) { res[b.product] = (res[b.product] || 0) + 1; made.push({ id: b.id, product: b.product }) }
  return { res, made }
}

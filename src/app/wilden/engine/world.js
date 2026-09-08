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

// ── הבקשות של השומר, לפי הסדר ──
// כל בקשה: מה צריך, מה הוא אומר לפני, מה קורה כשנותנים, ומה זה משנה
// בעולם (flag). כמה מטבעות על הדרך, כי גם זה נחמד.
export const QUESTS = [
  { id: 'wake', needs: { stone: 2 }, flag: 'guardianAwake', coins: 15,
    title: 'להעיר את השומר',
    ask: 'אני… ישן. כבד. תביאו לי אבן — שתיים — והסדקים שלי יידלקו שוב.',
    hint: 'אבן מביאים בולדר וקראג.',
    done: 'האור חזר אליי. תודה. עכשיו אני זוכר: הכד היה מלא מים.' },
  { id: 'basin', needs: { water: 2 }, flag: 'basinFull', coins: 20,
    title: 'למלא את הכד',
    ask: 'הכד במרכז היה מלא מים, והביקון עמד בתוכו. תביאו מים.',
    hint: 'מים מביאה גלי.',
    done: 'הכד מלא. שומעים? המים זזים. הביקון צריך אור.' },
  { id: 'beacon', needs: { spark: 2 }, flag: 'beaconLit', coins: 25,
    title: 'להדליק את הביקון',
    ask: 'ניצוץ. שני ניצוצות, והביקון בכד יידלק. אז כולם יראו את הבית מרחוק.',
    hint: 'ניצוץ מביא לומי.',
    done: 'הביקון דולק! עכשיו העץ. הוא לא מת, הוא רק רעב.' },
  { id: 'tree', needs: { honey: 2, leaf: 1 }, flag: 'treeAlive', coins: 25,
    title: 'להחיות את העץ',
    ask: 'העץ הזקן צריך דבש, ועלה אחד ירוק שיזכיר לו. תביאו.',
    hint: 'דבש מביאה האני, עלה מביא נימי.',
    done: 'תראו! ניצנים. הוא חוזר. נשאר רק השער.' },
  { id: 'gate', needs: { wind: 2, shadow: 1 }, flag: 'gateOpen', coins: 40,
    title: 'לפתוח את השער',
    ask: 'השער נעול מבפנים. רוח תדחוף אותו, וצל ידע לעבור דרכו. תביאו את שניהם.',
    hint: 'רוח מביא רוחי, צללים מביא צל.',
    done: 'השער נפתח. מה שמאחוריו… זה כבר סיפור אחר. בקרוב.' },
]

export const questById = id => QUESTS.find(q => q.id === id) || null

// הבקשה הפעילה: הראשונה שלא נעשתה. null = הכול נבנה.
export function activeQuest(progress) {
  const done = progress?.quests || []
  return QUESTS.find(q => !done.includes(q.id)) || null
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

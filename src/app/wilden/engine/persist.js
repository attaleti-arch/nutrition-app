// ─── שמירה ושחזור ───
// נשמר בכל מעבר מצב, לא רק בסוף. הילד סוגר את הטלפון באמצע מסע — זה
// המצב השכיח ביותר, לא קצה נדיר.
//
// מה שנשמר כאן נשאר במכשיר. המיקום, המסלול והבית לא עוזבים אותו לעולם;
// forServer() מסיר אותם לפני כל שליחה, וזה נבדק בטסטים.

const KEY = 'wilden_v1'
const VERSION = 1

export function save(g) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...g, v: VERSION }))
    return true
  } catch (e) {
    return false        // אחסון מלא או מצב פרטי. המשחק ממשיך מהזיכרון.
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const g = JSON.parse(raw)
    return migrate(g)
  } catch (e) {
    return null         // שמירה פגומה עדיפה על מסך לבן
  }
}

export function clear() {
  try { localStorage.removeItem(KEY) } catch (e) { /* אין מה לעשות */ }
}

// אין עדיין ממה לשדרג, אבל הפונקציה קיימת מהיום הראשון: פיילוט של
// ארבעה־עשר יום ישנה סכימה תוך כדי, ואסור שעדכון ימחק עולם של ילד.
function migrate(g) {
  if (!g || typeof g !== 'object') return null
  if (!g.v || g.v > VERSION) return null
  return g
}

// ── מה מותר לשלוח לשרת ──
// יצורים, חומרים, מטבעות, מסעות, התקדמות. לא מיקום, לא מסלול, לא כתובת
// הבית. גם לא בטעות: כל ה-run יורד, ולא רק שדות נבחרים מתוכו.
export function forServer(g) {
  if (!g) return null
  return {
    v: g.v ?? VERSION,
    progress: {
      missionsCompleted: g.progress?.missionsCompleted ?? 0,
      creatures: g.progress?.creatures ?? [],
      res: g.progress?.res ?? {},
      story: g.progress?.story ?? {},
      lastStoryDay: g.progress?.lastStoryDay ?? null,
      coins: g.progress?.coins ?? 0,
      walks: g.progress?.walks ?? 0,
      egg: g.progress?.egg ?? null,
      variants: g.progress?.variants ?? [],
      quests: g.progress?.quests ?? [],
      catches: g.progress?.catches ?? 0,
      caught: g.progress?.caught ?? {},
      golds: g.progress?.golds ?? 0,
      runs: g.progress?.runs ?? 0,
      bestRun: g.progress?.bestRun ?? 0,
      bestJumpCm: g.progress?.bestJumpCm ?? 0,
      metersTotal: g.progress?.metersTotal ?? 0,
      coinsEarned: g.progress?.coinsEarned ?? 0,
      walkDays: g.progress?.walkDays ?? [],
      owned: g.progress?.owned ?? [],
      wear: g.progress?.wear ?? {},
      weeklyBonus: g.progress?.weeklyBonus ?? null,
      buddy: g.progress?.buddy ?? null,
      routeKm: g.progress?.routeKm ?? null,
      bond: g.progress?.bond ?? {},
      minutesTotal: g.progress?.minutesTotal ?? 0,
      lastWalk: g.progress?.lastWalk ?? null,
    },
  }
}

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

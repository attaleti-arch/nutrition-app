// ─── זיכרון מסלולים ───
// ילד בפיילוט יוצא מאותה דלת כל יום. אין שום סיבה לחכות ל-Overpass
// בפעם השנייה, השלישית והעשירית — וזה בדיוק מה שקרה: המתנה ארוכה,
// "לוקח יותר מהרגיל", ואז מסלול חלופי גרוע יותר. פעם אחת מספיקה.
//
// המסלול נשמר במכשיר בלבד, כמו כל מיקום אחר במשחק. הוא לא נשלח לשום
// מקום ולא נכנס ל-forServer.

import { haversine } from './geo.js'

const KEY = 'wilden_routes_v1'
const MAX = 6                       // כמה נקודות בית לזכור
const TTL_DAYS = 30                 // רחובות לא זזים, אבל בית כן

// ── התאמה לפי מרחק, לא לפי רשת ──
// הגרסה הראשונה עיגלה קואורדינטות לתא של ~110 מ'. לרשת קבועה יש גבולות,
// וסטייה של 40 מ' מהמקום שבו עמדו אתמול נופלת לפעמים בצד השני של הקו —
// כלומר בדיוק אותה דלת, וזיכרון שלא נמצא. בדיקה תפסה את זה.
export const SAME_HOME_M = 150

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch (e) { return [] }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true }
  catch (e) { return false }      // אחסון מלא. המשחק ממשיך, פשוט בלי זיכרון.
}

function findNear(list, home) {
  let best = -1, bd = Infinity
  for (let i = 0; i < list.length; i++) {
    const d = haversine({ lat: list[i].lat, lng: list[i].lng }, home)
    if (d < bd) { bd = d; best = i }
  }
  return bd <= SAME_HOME_M ? best : -1
}

export function getCached(home, now = Date.now()) {
  const list = read()
  const i = findNear(list, home)
  if (i < 0) return null
  const hit = list[i]
  if (now - hit.at > TTL_DAYS * 86400000) return null
  if (!Array.isArray(hit.paths) || !hit.paths.length) return null
  // כמה מסלולים לאותו בית, כדי ש"מסלול אחר" יישאר אפשרי גם מהזיכרון.
  return hit.paths[Math.floor(Math.random() * hit.paths.length)]
}

export function putCached(home, path, now = Date.now()) {
  if (!Array.isArray(path) || path.length < 8) return false
  const list = read()
  const i = findNear(list, home)
  const paths = i >= 0 ? [path, ...list[i].paths].slice(0, 3) : [path]
  const entry = { lat: home.lat, lng: home.lng, at: now, paths }

  const rest = i >= 0 ? list.filter((_, k) => k !== i) : list
  // החדש ראשון, והישנים נחתכים לפי גיל כדי שהאחסון לא יגדל בלי סוף.
  const next = [entry, ...rest].sort((a, b) => b.at - a.at).slice(0, MAX)
  return write(next)
}

export function clearCache() {
  try { localStorage.removeItem(KEY) } catch (e) { /* אין מה לעשות */ }
}

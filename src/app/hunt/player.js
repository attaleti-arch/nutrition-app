'use client'
import { supabase } from '../supabase'

// ─── מי משחק ───
// עצמאי לגמרי מאפליקציית הילדים. הילד בוחר דמות ושם, ומקבל קוד קצר.
// הקוד הוא כל מה שצריך כדי לחזור לעולם שלו — במכשיר אחר, אחרי ניקוי
// נתונים, או אחרי שספארי מוחק אחסון מקומי (הוא עושה את זה אחרי שבוע
// בלי כניסה, וזה בדיוק מה שהורג פיילוט של שבועיים).
//
// מה נשמר בשרת: יצורים, חומרים, מבנים, מסעות, התקדמות בעולם.
// מה לא עוזב את הטלפון לעולם: מיקום, מסלולים, קואורדינטות.

const KEY = 'hunt_player_v1'
const TABLE = 'hunt_players'

// בלי 0/O/1/I/L — הורה מכתיב את הקוד בטלפון ואסור שיהיה ספק
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeCode(n = 5) {
  let out = ''
  const a = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(n))
    : Array.from({ length: n }, () => Math.floor(Math.random() * 1e9))
  for (let i = 0; i < n; i++) out += ALPHABET[a[i] % ALPHABET.length]
  return out
}

export const normCode = c => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)

export function loadPlayer() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) } catch (e) { /* פרופיל פגום */ }
  return null
}

export function savePlayer(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true } catch (e) { return false }
}

export function clearPlayer() {
  try { localStorage.removeItem(KEY) } catch (e) { /* אין מה לעשות */ }
}

export function newPlayer({ name, avatar }) {
  return {
    code: makeCode(),
    name: (name || '').trim().slice(0, 20) || 'שחקן',
    avatar: avatar || 'nova',
    created: new Date().toISOString(),
  }
}

// ── סנכרון ──
// תמיד "מיטב המאמץ". המשחק חייב לעבוד גם כשאין רשת — הילד בחוץ, אולי
// בלי קליטה — ולכן localStorage הוא המקור, והשרת הוא גיבוי.

// ── האם יש בכלל שרת ──
// supabase.js נופל ל-placeholder.supabase.co כשמשתני הסביבה חסרים. אז כל
// קריאה נכשלת ברשת — בשקט מוחלט. הורה רואה קוד שחזור על המסך, מאמין
// שהעולם שמור, והוא לא. עדיף לדעת ביום הראשון ולא ביום השמיני.
export function serverConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!url && !url.includes('placeholder')
}

// ── מצב הגיבוי, גלוי ──
// שתי הקריאות ל-pushWorld הן "שגר ושכח" והתוצאה נזרקה, ולכן כישלון גיבוי
// היה בלתי נראה: המשחק ממשיך לעבוד מ-localStorage — וספארי מוחקת אחסון
// מקומי אחרי כשבוע בלי כניסה. הפיילוט הוא ארבעה־עשר יום, כלומר העולם
// יכול להיעלם באמצע בלי שאיש ידע שלא היה גיבוי מלכתחילה.
const SYNC_KEY = 'hunt_sync_v1'

export function syncState() {
  if (!serverConfigured()) return { ok: false, reason: 'no-server', at: null }
  try { const r = localStorage.getItem(SYNC_KEY); if (r) return JSON.parse(r) }
  catch (e) { /* לא קריטי */ }
  return { ok: false, reason: 'never', at: null }
}

function recordSync(ok, reason) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify({ ok, reason: reason || null, at: Date.now() })) }
  catch (e) { /* אחסון מלא. הגיבוי עצמו חשוב יותר מהרישום עליו */ }
}

function stripLocation(world) {
  if (!world) return null
  // eslint-disable-next-line no-unused-vars
  const { home, today, ...safe } = world
  return safe          // בלי home ובלי מסלול היום. גם לא בטעות.
}

// בלי הפסקת זמן, הורה שלוחץ "שחזור" כששרת לא זמין רואה "מחפשים…" לנצח.
const NET_TIMEOUT = 8000

function withTimeout(ms) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  return { signal: ctl.signal, done: () => clearTimeout(timer) }
}

export async function pushWorld(player, world) {
  if (!player?.code) return { ok: false, reason: 'no-player' }
  if (!serverConfigured()) return { ok: false, reason: 'no-server' }
  try {
    const t = withTimeout(NET_TIMEOUT)
    try {
      const { error } = await supabase.from(TABLE).upsert({
        code: player.code,
        name: player.name,
        avatar: player.avatar,
        world: stripLocation(world),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'code' }).abortSignal(t.signal)
      if (error) { recordSync(false, error.message); return { ok: false, reason: error.message } }
      recordSync(true)
      return { ok: true }
    } finally { t.done() }
  } catch (e) {
    recordSync(false, e.message)
    return { ok: false, reason: e.message }
  }
}

export async function pullPlayer(code) {
  const c = normCode(code)
  if (c.length < 4) return { ok: false, reason: 'short' }
  if (!serverConfigured()) return { ok: false, reason: 'no-server' }
  try {
    const t = withTimeout(NET_TIMEOUT)
    try {
      const { data, error } = await supabase.from(TABLE)
        .select('code, name, avatar, world').eq('code', c).limit(1).abortSignal(t.signal)
      if (error) return { ok: false, reason: error.message }
      if (!data || !data.length) return { ok: false, reason: 'not-found' }
      return { ok: true, row: data[0] }
    } finally { t.done() }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

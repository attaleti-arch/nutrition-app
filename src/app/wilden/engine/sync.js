'use client'
import { supabase } from '../../supabase'
import { forServer } from './persist'
import { normCode, validCode } from './profile'

// ─── הפרופיל בטלפון, והעולם בשרת ───
// תמיד "מיטב המאמץ". המשחק חייב לעבוד גם כשאין רשת — הילד בחוץ, אולי
// בלי קליטה — ולכן localStorage הוא המקור והשרת הוא גיבוי.
//
// מה נשמר בשרת: forServer(g) — יצורים, חומרים, מטבעות, מסעות, התקדמות.
// מה לא עוזב את הטלפון לעולם: מיקום, מסלול, כתובת הבית. כל ה-run יורד.

const KEY = 'wilden_profile_v1'
const SYNC_KEY = 'wilden_sync_v1'
const TABLE = 'wilden_players'
const NET_TIMEOUT = 8000

export function loadProfile() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) } catch (e) { /* פרופיל פגום */ }
  return null
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true } catch (e) { return false }
}

export function clearProfile() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(SYNC_KEY) } catch (e) { /* אין מה לעשות */ }
}

// ── האם יש בכלל שרת ──
// supabase.js נופל ל-placeholder כשמשתני הסביבה חסרים. אז כל קריאה נכשלת
// ברשת בשקט. הורה רואה קוד על המסך, מאמין שהעולם שמור, והוא לא. עדיף
// שהמסך יגיד "שמור בטלפון בלבד" מהיום הראשון.
export function serverConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!url && !url.includes('placeholder')
}

export function syncState() {
  if (!serverConfigured()) return { ok: false, reason: 'no-server', at: null }
  try { const r = localStorage.getItem(SYNC_KEY); if (r) return JSON.parse(r) } catch (e) { /* לא קריטי */ }
  return { ok: false, reason: 'never', at: null }
}

function recordSync(ok, reason) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify({ ok, reason: reason || null, at: Date.now() })) }
  catch (e) { /* אחסון מלא. הגיבוי עצמו חשוב יותר מהרישום עליו */ }
}

function withTimeout(ms) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  return { signal: ctl.signal, done: () => clearTimeout(timer) }
}

export async function pushWorld(profile, g) {
  if (!profile?.code) return { ok: false, reason: 'no-player' }
  if (!serverConfigured()) { recordSync(false, 'no-server'); return { ok: false, reason: 'no-server' } }
  try {
    const t = withTimeout(NET_TIMEOUT)
    try {
      const { error } = await supabase.from(TABLE).upsert({
        code: profile.code,
        name: profile.name,
        world: forServer(g),
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
  if (!validCode(c)) return { ok: false, reason: 'short' }
  if (!serverConfigured()) return { ok: false, reason: 'no-server' }
  try {
    const t = withTimeout(NET_TIMEOUT)
    try {
      const { data, error } = await supabase.from(TABLE)
        .select('code, name, world, updated_at').eq('code', c).limit(1).abortSignal(t.signal)
      if (error) return { ok: false, reason: error.message }
      if (!data || !data.length) return { ok: false, reason: 'not-found' }
      return { ok: true, row: data[0] }
    } finally { t.done() }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

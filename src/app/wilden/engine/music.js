'use client'

// ─── מוזיקת רקע ───
// הגרסה הראשונה ייצרה מוזיקה בקוד. "הצלילים נוראיים. העולם הישן מרגיש כמו
// מנחת מסוקים והחדש צלילים מרגיזים." צודקת: מוזיקה מיוצרת נשמעת כמו קוד.
// עכשיו: קבצים אמיתיים (שלה, מ-Suno), בלופ, עם דעיכה בין מצבי הרוח. אם
// קובץ חסר — שקט. שקט עדיף על מנחת מסוקים.
//   /world/music/magic.mp3   — העולם המתוקן והפתיחה
//   /world/music/broken.mp3  — החורבה

const KEY = 'wilden_music_v1'
const FILES = { magic: '/world/music/magic.mp3', broken: '/world/music/broken.mp3' }
const VOL = 0.18
let cur = null            // { mode, el }
let musicOff = false
try { musicOff = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'off' } catch (e) { /* */ }

export const musicMuted = () => musicOff
export function setMusicMuted(v) {
  musicOff = !!v
  try { localStorage.setItem(KEY, musicOff ? 'off' : 'on') } catch (e) { /* */ }
  if (musicOff) stopMusic(0.4)
}

// ── פתיחת הערוץ ב-iOS ──
// ספארי מרשה ל-<audio> לנגן רק אם play() נקרא בתוך מגע. המוזיקה של החורבה
// מתחילה מטיימר, שניות אחרי הלחיצה — ונחסמה בשקט: "אין מוזיקה עצובה, היא
// נפסקת לחלוטין". הפתרון: בלחיצה עצמה יוצרים את שני האלמנטים ומנגנים
// אותם אילמים לרגע. מאותו רגע הם "פתוחים", וטיימר יכול להפעיל אותם.
const pool = {}
export function primeMusic() {
  if (typeof Audio === 'undefined') return
  for (const mode of Object.keys(FILES)) {
    if (pool[mode]) continue
    const el = new Audio(FILES[mode]); el.loop = true; el.preload = 'auto'; el.volume = 0
    pool[mode] = el
    el.play().then(() => { if (cur?.el !== el) el.pause() }).catch(() => {})
  }
}

export function startMusic(mode, vol = VOL) {
  if (musicOff || !mode || !FILES[mode] || typeof Audio === 'undefined') return
  if (cur?.mode === mode) return
  stopMusic(1.0)
  const target = Math.max(0, Math.min(1, vol))
  const el = pool[mode] || new Audio(FILES[mode])
  pool[mode] = el
  el.loop = true; el.preload = 'auto'; el.volume = 0
  try { el.currentTime = 0 } catch (e) { /* */ }
  const s = { mode, el }
  cur = s
  // בלי גישה (ספארי לפני מגע) — play נדחה בשקט; הנגיעה הבאה תנסה שוב.
  // NotAllowedError = אין עוד מגע (ספארי): נשארים ומנסים שוב במגע הבא.
  // כל שגיאה אחרת (קובץ חסר) = שקט, ולא מנסים שוב.
  s.vol = target
  el.play().then(() => fade(el, target, 1.6)).catch(e => { if (cur === s && e?.name !== 'NotAllowedError') cur = null })
}

export function stopMusic(sec = 1.2) {
  const s = cur; if (!s) return
  cur = null
  fade(s.el, 0, sec, () => { try { if (cur?.el !== s.el) s.el.pause() } catch (e) { /* */ } })
}

// נגיעה כלשהי אחרי שהדף נטען: אם המוזיקה נדחתה, לנסות שוב.
export function retryMusic() {
  if (cur && cur.el.paused) cur.el.play().then(() => fade(cur.el, cur.vol ?? VOL, 1.2)).catch(() => {})
}

function fade(el, to, sec, done) {
  const from = el.volume, steps = Math.max(1, Math.round(sec * 20))
  let i = 0
  const id = setInterval(() => {
    i++
    try { el.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps))) } catch (e) { /* */ }
    if (i >= steps) { clearInterval(id); done?.() }
  }, 50)
}

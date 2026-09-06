'use client'

// ─── מנוע הצליל ───
// כל הצלילים מיוצרים בזמן אמת ב-Web Audio. אין קבצים להוריד, זה עובד גם בלי
// רשת באמצע הליכה, וזה שוקל אפס. iOS דורש נגיעה ראשונה כדי לפתוח סאונד —
// לכן unlock() נקרא מהלחיצה על "מתחילים".

let ctx = null
let master = null
let muted = false

function ac() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function unlockAudio() {
  const c = ac()
  if (!c) return false
  // צליל אילם קצרצר — זה מה שפותח את הערוץ ב-iOS
  const o = c.createOscillator()
  const g = c.createGain()
  g.gain.value = 0.0001
  o.connect(g); g.connect(master)
  o.start(); o.stop(c.currentTime + 0.02)
  return true
}

export function setMuted(v) {
  muted = !!v
  if (master) master.gain.value = muted ? 0 : 0.9
}

export function isMuted() { return muted }

function tone({ freq, dur = 0.18, type = 'sine', vol = 0.25, delay = 0, glideTo = null }) {
  const c = ac(); if (!c || muted) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(master)
  o.start(t0); o.stop(t0 + dur + 0.05)
}

function noise({ dur = 0.4, freq = 3800, q = 1.1, vol = 0.14, delay = 0 }) {
  const c = ac(); if (!c || muted) return
  const t0 = c.currentTime + delay
  const frames = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, frames, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q
  const g = c.createGain()
  // מעטפת עם ריצוד — זה מה שגורם לזה להישמע כמו רשרוש בשיחים ולא כמו רעש לבן
  g.gain.setValueAtTime(0.0001, t0)
  const steps = 7
  for (let i = 1; i <= steps; i++) {
    const t = t0 + (dur * i) / steps
    const wobble = vol * (0.35 + Math.random() * 0.65) * (1 - i / (steps + 2))
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, wobble), t)
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp); bp.connect(g); g.connect(master)
  src.start(t0); src.stop(t0 + dur + 0.05)
}

// ── טיק התקרבות: ככל שקרוב יותר, גבוה יותר. זה מה שמאפשר ללכת עם הראש למעלה ──
export function sfxTick(closeness) {
  const k = Math.max(0, Math.min(1, closeness))
  tone({ freq: 520 + k * 700, dur: 0.07, type: 'triangle', vol: 0.06 + k * 0.09 })
}

// ── רשרוש: משהו זז בשיח, ממש לידך ──
export function sfxRustle() {
  noise({ dur: 0.45, freq: 3200 + Math.random() * 1800, q: 0.9, vol: 0.16 })
}

// ── גלינג-גלינג: רגע התפיסה ──
export function sfxCatch() {
  tone({ freq: 220, glideTo: 700, dur: 0.13, type: 'sine', vol: 0.22 })      // הפופ
  noise({ dur: 0.22, freq: 5200, q: 0.7, vol: 0.12, delay: 0.02 })           // הרשרוש
  tone({ freq: 1046.5, dur: 0.5, type: 'sine', vol: 0.26, delay: 0.10 })     // גלינג
  tone({ freq: 1318.5, dur: 0.5, type: 'sine', vol: 0.22, delay: 0.17 })     // גלינג
  tone({ freq: 1568.0, dur: 0.7, type: 'sine', vol: 0.20, delay: 0.24 })     // גלינג
  tone({ freq: 2093.0, dur: 0.9, type: 'sine', vol: 0.12, delay: 0.31 })     // נצנוץ
}

// ── יצור התגלה על המפה ──
export function sfxAppear() {
  tone({ freq: 660, dur: 0.16, type: 'triangle', vol: 0.16 })
  tone({ freq: 990, dur: 0.28, type: 'sine', vol: 0.14, delay: 0.09 })
}

// ── חזרת הביתה, המסלול הושלם ──
export function sfxFinish() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
  notes.forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'sine', vol: 0.22, delay: i * 0.11 }))
  noise({ dur: 0.9, freq: 6000, q: 0.6, vol: 0.09, delay: 0.2 })
}

export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch (e) { /* לא נתמך — לא נורא */ }
}

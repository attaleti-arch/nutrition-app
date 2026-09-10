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

// ── להחזיר לחיים אחרי רקע ──
// ספארי מקפיא את ה-AudioContext כשהמסך נכבה או כשעוברים אפליקציה, ולא
// מחזיר אותו לבד. "המטבעות לא עושות צליל, גם התפיסה לא" — זה בדיוק זה.
// נקרא מכל מגע ומכל חזרה לחלון.
export function resumeAudio() {
  const c = ac()
  if (!c) return false
  if (c.state !== 'running') c.resume().catch(() => {})
  return c.state === 'running'
}

export function audioState() {
  return ctx ? ctx.state : 'none'
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

// ── גלינג: מטבע ──
// קצר, גבוה, ולא מעייף גם בפעם השמונים. זהב — שלושה צלילים עולים.
export function sfxCoin(gold = false) {
  tone({ freq: 1567.98, dur: 0.09, type: 'sine', vol: 0.18 })
  tone({ freq: 2093.0, dur: 0.16, type: 'sine', vol: 0.16, delay: 0.06 })
  if (gold) {
    tone({ freq: 2637.0, dur: 0.22, type: 'sine', vol: 0.16, delay: 0.14 })
    tone({ freq: 3135.96, dur: 0.4, type: 'sine', vol: 0.12, delay: 0.22 })
  }
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

// ── ספירת מטבעות ──
// אחרי התפיסה המונה מטפס אחד-אחד; כל צעד גבוה מעט מהקודם, והאחרון
// מתנגן. זה מה שהופך "+7" למשהו שרואים ושומעים.
export function sfxTally(i, n) {
  const k = n > 1 ? i / (n - 1) : 1
  tone({ freq: 1046.5 * Math.pow(2, k * 0.75), dur: 0.08, type: 'sine', vol: 0.16 })
  if (i === n - 1) {
    tone({ freq: 2093.0, dur: 0.35, type: 'sine', vol: 0.16, delay: 0.09 })
    tone({ freq: 2637.0, dur: 0.5, type: 'sine', vol: 0.12, delay: 0.16 })
  }
}

// ── כל הכבוד ──
// ── הביצה ──
// סדק: נקישה יבשה, חזקה יותר בכל פעם (k 0..1). בקיעה: שאיבה של אוויר,
// עלייה, ואז נצנוץ — האור שממנו היצור עולה.
export function sfxCrack(k = 0.5) {
  if (muted) return
  noise({ dur: 0.07 + 0.06 * k, freq: 1400 + 1200 * k, q: 1.6, vol: 0.12 + 0.22 * k })
  tone({ freq: 220 + 80 * k, glideTo: 90, dur: 0.09, type: 'triangle', vol: 0.14 + 0.1 * k })
  if (k > 0.6) noise({ dur: 0.25, freq: 300, q: 0.7, vol: 0.12, delay: 0.03 })   // הביצה מתנדנדת על האבן
}
// רקיעה של השומר: בום נמוך + חבטה. ושינה: שלושה צלילים יורדים, רכים.
export function sfxThud(k = 1) {
  tone({ freq: 70, glideTo: 38, dur: 0.42, type: 'sine', vol: 0.5 * k })
  noise({ dur: 0.16, freq: 220, q: 0.7, vol: 0.22 * k })
}
export function sfxSleep() {
  tone({ freq: 523, dur: 0.5, type: 'triangle', vol: 0.12 })
  tone({ freq: 392, dur: 0.6, type: 'triangle', vol: 0.11, delay: 0.45 })
  tone({ freq: 262, dur: 1.1, type: 'triangle', vol: 0.1, delay: 0.95 })
}

export function sfxHatch() {
  if (muted) return
  noise({ dur: 0.55, freq: 2600, q: 0.5, vol: 0.16 })                             // ווש
  tone({ freq: 240, glideTo: 1320, dur: 0.55, type: 'sine', vol: 0.22 })          // עלייה
  ;[1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'sine', vol: 0.07, delay: 0.35 + i * 0.09 }))
  tone({ freq: 1046, dur: 0.9, type: 'triangle', vol: 0.12, delay: 0.7 })         // פעמון
}

export function sfxCheer() {
  const notes = [783.99, 987.77, 1174.66]
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.14, delay: i * 0.08 }))
}

export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch (e) { /* לא נתמך — לא נורא */ }
}

// ═══════════════════════════════════════════════════════════════
// ── הקולות של היצורים ──
// "זמזום לדבורה, ולא יודעת מה עוד. שזה ירגיש חוויה." לכל יצור קול
// מתמשך בזמן המפגש, שמתחזק כשמכוונים אליו ומתקרבים (setLevel 0..1),
// וקול קצר לרגעי הבריחה, העצירה והרקיעה. הכול מסונתז כאן, בלי קבצים.
// ═══════════════════════════════════════════════════════════════

const VOICES = {
  // דבורה: מסור נמוך עם ריצוד מהיר — זמזום.
  dabashon: c => {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 175
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 176.5
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
    const trem = c.createOscillator(); trem.frequency.value = 27
    const tg = c.createGain(); tg.gain.value = 0.35
    const amp = c.createGain(); amp.gain.value = 0.65
    trem.connect(tg); tg.connect(amp.gain)
    o.connect(lp); o2.connect(lp); lp.connect(amp)
    return { out: amp, start: () => { o.start(); o2.start(); trem.start() }, stop: () => { o.stop(); o2.stop(); trem.stop() }, base: 0.16 }
  },
  // ציפור רוח: רעש מסונן שנושם לאט, וציוץ מדי פעם.
  ruchi: c => {
    const src = loopNoise(c); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6
    const amp = c.createGain(); amp.gain.value = 0.6
    const lfo = c.createOscillator(); lfo.frequency.value = 0.35; const lg = c.createGain(); lg.gain.value = 0.35
    lfo.connect(lg); lg.connect(amp.gain)
    src.connect(bp); bp.connect(amp)
    const chirp = setInterval(() => { if (!muted) tone({ freq: 1800, glideTo: 2600, dur: 0.12, type: 'sine', vol: 0.05 }) }, 2600)
    return { out: amp, start: () => { src.start(); lfo.start() }, stop: () => { src.stop(); lfo.stop(); clearInterval(chirp) }, base: 0.2 }
  },
  // לומי: נצנוץ — שני סינוסים גבוהים כמעט זהים, פעימה איטית.
  lumi: c => {
    const o = c.createOscillator(); o.frequency.value = 1568
    const o2 = c.createOscillator(); o2.frequency.value = 1571.5
    const amp = c.createGain(); amp.gain.value = 0.5
    o.connect(amp); o2.connect(amp)
    const sparkle = setInterval(() => { if (!muted) tone({ freq: 2093 + Math.random() * 1400, dur: 0.14, type: 'sine', vol: 0.04 }) }, 900)
    return { out: amp, start: () => { o.start(); o2.start() }, stop: () => { o.stop(); o2.stop(); clearInterval(sparkle) }, base: 0.05 }
  },
  // גלי: בועות — בליפים יורדים, אקראיים.
  gali: c => {
    const amp = c.createGain(); amp.gain.value = 1
    const src = loopNoise(c); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500
    src.connect(lp); lp.connect(amp)
    const drip = setInterval(() => { if (!muted) tone({ freq: 900 + Math.random() * 700, glideTo: 400, dur: 0.11, type: 'sine', vol: 0.07 }) }, 700 + Math.random() * 500)
    return { out: amp, start: () => src.start(), stop: () => { src.stop(); clearInterval(drip) }, base: 0.06 }
  },
  // צל: לחישה — רעש נמוך שמתנשם לאט, וסינוס עמוק.
  tzel: c => {
    const src = loopNoise(c); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.4
    const amp = c.createGain(); amp.gain.value = 0.5
    const lfo = c.createOscillator(); lfo.frequency.value = 0.6; const lg = c.createGain(); lg.gain.value = 0.45
    lfo.connect(lg); lg.connect(amp.gain)
    const o = c.createOscillator(); o.frequency.value = 82; const og = c.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(amp)
    src.connect(bp); bp.connect(amp)
    return { out: amp, start: () => { src.start(); lfo.start(); o.start() }, stop: () => { src.stop(); lfo.stop(); o.stop() }, base: 0.14 }
  },
  // נוגה: פעמון רחוק — שני סינוסים בקווינטה, נושמים לאט, וצליל פעמון קטן מדי פעם.
  noga: c => {
    const o = c.createOscillator(); o.frequency.value = 880
    const o2 = c.createOscillator(); o2.frequency.value = 1318.5
    const g2 = c.createGain(); g2.gain.value = 0.45; o2.connect(g2)
    const amp = c.createGain(); amp.gain.value = 0.5
    const lfo = c.createOscillator(); lfo.frequency.value = 0.22; const lg = c.createGain(); lg.gain.value = 0.3
    lfo.connect(lg); lg.connect(amp.gain)
    o.connect(amp); g2.connect(amp)
    const bell = setInterval(() => { if (!muted) tone({ freq: [1760, 2637, 3520][Math.floor(Math.random() * 3)], dur: 0.6, type: 'sine', vol: 0.035 }) }, 1700)
    return { out: amp, start: () => { o.start(); o2.start(); lfo.start() }, stop: () => { o.stop(); o2.stop(); lfo.stop(); clearInterval(bell) }, base: 0.045 }
  },
  // בולדר וקראג: רעם אבן — רעש נמוך מאוד.
  bolder: c => stoneVoice(c, 0.22),
  kraag: c => stoneVoice(c, 0.16),
  // נימי: רשרוש בשיחים כל כמה שניות, וטפיפה.
  nimi: c => {
    const amp = c.createGain(); amp.gain.value = 1
    const src = loopNoise(c); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3600; bp.Q.value = 1.2
    const lfo = c.createOscillator(); lfo.frequency.value = 1.1; const lg = c.createGain(); lg.gain.value = 0.5
    const g2 = c.createGain(); g2.gain.value = 0.5
    lfo.connect(lg); lg.connect(g2.gain)
    src.connect(bp); bp.connect(g2); g2.connect(amp)
    return { out: amp, start: () => { src.start(); lfo.start() }, stop: () => { src.stop(); lfo.stop() }, base: 0.07 }
  },
}

function stoneVoice(c, base) {
  const src = loopNoise(c); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110
  const amp = c.createGain(); amp.gain.value = 1
  const lfo = c.createOscillator(); lfo.frequency.value = 0.25; const lg = c.createGain(); lg.gain.value = 0.4
  lfo.connect(lg); lg.connect(amp.gain)
  src.connect(lp); lp.connect(amp)
  return { out: amp, start: () => { src.start(); lfo.start() }, stop: () => { src.stop(); lfo.stop() }, base }
}

function loopNoise(c) {
  const frames = c.sampleRate * 2
  const buf = c.createBuffer(1, frames, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true
  return src
}

// מתחיל את הקול של היצור. מחזיר { setLevel(0..1), stop() }. בלי אודיו —
// ידית ריקה, כדי שהבמה לא תצטרך לבדוק.
export function startVoice(id) {
  const c = ac()
  const make = VOICES[id]
  if (!c || !make) return { setLevel() {}, stop() {} }
  let v
  try { v = make(c) } catch (e) { return { setLevel() {}, stop() {} } }
  const level = c.createGain(); level.gain.value = 0.0001
  v.out.connect(level); level.connect(master)
  try { v.start() } catch (e) { /* כבר התחיל */ }
  let stopped = false
  return {
    setLevel(k) {
      if (stopped) return
      const target = muted ? 0.0001 : Math.max(0.0001, v.base * (0.25 + 0.75 * Math.max(0, Math.min(1, k))))
      level.gain.setTargetAtTime(target, c.currentTime, 0.25)
    },
    stop() {
      if (stopped) return
      stopped = true
      level.gain.setTargetAtTime(0.0001, c.currentTime, 0.12)
      setTimeout(() => { try { v.stop(); level.disconnect() } catch (e) { /* כבר נעצר */ } }, 500)
    },
  }
}

// ── רגעים: בריחה, עצירה, רקיעה — בקול של היצור ──
export function sfxVoice(id, kind) {
  if (muted) return
  if (kind === 'stomp' || (kind === 'flee' && (id === 'bolder' || id === 'kraag'))) {
    tone({ freq: 90, glideTo: 28, dur: 0.38, type: 'sine', vol: 0.5 })             // הרעם
    noise({ dur: 0.5, freq: 160, q: 0.5, vol: 0.35, delay: 0.02 })
    noise({ dur: 0.7, freq: 1200, q: 0.4, vol: 0.12, delay: 0.1 })                 // אבק
    return
  }
  if (kind === 'flee') {
    switch (id) {
      case 'dabashon': tone({ freq: 170, glideTo: 420, dur: 0.5, type: 'sawtooth', vol: 0.14 }); break
      case 'ruchi': noise({ dur: 0.6, freq: 900, q: 0.5, vol: 0.22 }); tone({ freq: 2400, glideTo: 3200, dur: 0.14, type: 'sine', vol: 0.06, delay: 0.1 }); break
      case 'tzel': noise({ dur: 0.7, freq: 2600, q: 1.6, vol: 0.14 }); tone({ freq: 140, glideTo: 60, dur: 0.6, type: 'sine', vol: 0.12 }); break
      case 'gali': noise({ dur: 0.35, freq: 2200, q: 0.7, vol: 0.2 }); [0, 0.07, 0.15].forEach(d => tone({ freq: 1200, glideTo: 500, dur: 0.12, type: 'sine', vol: 0.08, delay: d })); break
      case 'lumi': [0, 0.06, 0.12, 0.18].forEach((d, i) => tone({ freq: 1568 * Math.pow(2, i / 6), dur: 0.16, type: 'sine', vol: 0.09, delay: d })); break
      default: // נימי וחברים: רשרוש וטפיפה מהירה
        noise({ dur: 0.45, freq: 3400, q: 0.9, vol: 0.16 })
        ;[0, 0.09, 0.18, 0.27].forEach(d => noise({ dur: 0.05, freq: 1400, q: 2, vol: 0.12, delay: d }))
    }
    return
  }
  if (kind === 'near') {
    switch (id) {
      case 'dabashon': tone({ freq: 175, dur: 0.35, type: 'sawtooth', vol: 0.1 }); break
      case 'tzel': tone({ freq: 60, glideTo: 160, dur: 0.5, type: 'sine', vol: 0.14 }); break
      default: tone({ freq: 660, dur: 0.16, type: 'triangle', vol: 0.14 }); tone({ freq: 990, dur: 0.28, type: 'sine', vol: 0.12, delay: 0.09 })
    }
  }
}

// ── ריצת המטבעות: ספירה לאחור ויציאה ──
export function sfxCount(n) {
  if (n > 0) tone({ freq: 660, dur: 0.12, type: 'square', vol: 0.09 })
  else { tone({ freq: 990, dur: 0.35, type: 'square', vol: 0.11 }); tone({ freq: 1320, dur: 0.3, type: 'sine', vol: 0.1, delay: 0.12 }) }
}

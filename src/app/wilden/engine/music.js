'use client'
import { audioGraph } from './audio'

// ─── מוזיקת רקע ───
// "חסר לי איזו מוזיקה קסומה כשזה נפתח. בכללי חסר צלילי רקע."
// שני מצבי רוח, מיוצרים בזמן אמת ב-Web Audio (אפס קבצים, אפס הורדה):
//   magic  — פד רך של שני אוסצילטורים לכל צליל באקורד, ופעמונים בסולם
//            פנטטוני עם דיליי שנותן להם "נצנוץ". העולם המתוקן והפתיחה.
//   broken — דרון נמוך ורוח מסוננת שנושמת לאט. החורבה.
// המעבר בין מצבים הוא דעיכה של שניה, לא חיתוך. הכול על master של audio.js,
// אז ההשתקה הכללית תופסת גם כאן.

const KEY = 'wilden_music_v1'
let cur = null            // { mode, gain, nodes: [], timer, nextAt, stepIdx }
let musicOff = false
try { musicOff = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'off' } catch (e) { /* */ }

export const musicMuted = () => musicOff
export function setMusicMuted(v) {
  musicOff = !!v
  try { localStorage.setItem(KEY, musicOff ? 'off' : 'on') } catch (e) { /* */ }
  if (musicOff) stopMusic(0.4)
}

const VOL = { magic: 0.16, broken: 0.14 }
// A major pentatonic, שתי אוקטבות. אקורדים: I, vi, IV, V (A, F#m, D, E).
const PENTA = [440, 494, 554, 659, 740, 880, 988, 1109, 1319, 1480]
const CHORDS = [[220, 277, 330], [185, 220, 277], [147, 185, 220], [165, 208, 247]]

export function startMusic(mode) {
  if (musicOff || !mode) return
  if (cur?.mode === mode) return
  const g = audioGraph(); if (!g) return
  const { ctx, master } = g
  stopMusic(1.0)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(VOL[mode], ctx.currentTime + 1.6)
  gain.connect(master)
  const state = { mode, gain, nodes: [], timer: null, nextAt: ctx.currentTime + 0.1, stepIdx: 0, ctx }
  if (mode === 'magic') magic(state); else brokenWorld(state)
  cur = state
}

export function stopMusic(fade = 1.2) {
  const s = cur; if (!s) return
  cur = null
  clearInterval(s.timer)
  const t = s.ctx.currentTime
  try {
    s.gain.gain.cancelScheduledValues(t)
    s.gain.gain.setValueAtTime(Math.max(0.0001, s.gain.gain.value), t)
    s.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade)
  } catch (e) { /* */ }
  setTimeout(() => { for (const n of s.nodes) { try { n.stop?.() } catch (e) { /* */ } try { n.disconnect() } catch (e) { /* */ } } try { s.gain.disconnect() } catch (e) { /* */ } }, fade * 1000 + 100)
}

// ── קסם ──
function magic(s) {
  const { ctx, gain } = s
  // דיליי עם פידבק: הפעמונים "מהדהדים" — זה מה שעושה את זה קסום ולא מקלדת.
  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.31
  const fb = ctx.createGain(); fb.gain.value = 0.38
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400
  delay.connect(fb); fb.connect(lp); lp.connect(delay); delay.connect(gain)
  s.nodes.push(delay, fb, lp)
  // הפד: לכל צליל באקורד שני אוסצילטורים מעט לא מכוונים, דרך lowpass רך
  const padLp = ctx.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 900
  const padG = ctx.createGain(); padG.gain.value = 0.5
  padLp.connect(padG); padG.connect(gain); s.nodes.push(padLp, padG)
  const oscs = []
  for (let i = 0; i < 3; i++) for (const det of [-4, 4]) {
    const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.detune.value = det
    const og = ctx.createGain(); og.gain.value = 0.2
    o.connect(og); og.connect(padLp); o.start(); s.nodes.push(o, og); oscs.push({ o, i })
  }
  const setChord = (idx, t) => {
    const ch = CHORDS[idx % CHORDS.length]
    for (const { o, i } of oscs) { o.frequency.cancelScheduledValues(t); o.frequency.setTargetAtTime(ch[i], t, 0.6) }
  }
  setChord(0, ctx.currentTime)
  let chord = 0, chordAt = ctx.currentTime + 6
  // פעמון: טריאנגל קצר עם דעיכה, לתוך הדיליי
  const bell = (t, f, v) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t)
    bg.gain.exponentialRampToValueAtTime(v, t + 0.015); bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    o.connect(bg); bg.connect(delay); bg.connect(gain); o.start(t); o.stop(t + 1.5)
  }
  // תזמון קדימה: כל 200ms מתכננים חצי שניה קדימה. זה מה שמונע "נפילות" כשהדף עסוק.
  s.timer = setInterval(() => {
    if (cur !== s) return
    const now = ctx.currentTime
    while (s.nextAt < now + 0.6) {
      const ch = CHORDS[chord % CHORDS.length]
      // תווים מהאקורד לרוב, ולפעמים קפיצה בסולם — מנגינה שלא חוזרת על עצמה
      const pool = Math.random() < 0.65 ? ch.map(f => f * (Math.random() < 0.5 ? 2 : 4)) : PENTA
      const f = pool[Math.floor(Math.random() * pool.length)]
      bell(s.nextAt, f, 0.06 + Math.random() * 0.05)
      s.nextAt += Math.random() < 0.3 ? 0.75 : 0.375
      if (s.nextAt > chordAt) { chord++; chordAt += 6; setChord(chord, s.nextAt) }
    }
  }, 200)
}

// ── חורבה ──
function brokenWorld(s) {
  const { ctx, gain } = s
  for (const [f, det, type] of [[55, 0, 'sine'], [82.4, 6, 'sine'], [110, -5, 'triangle']]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det
    const og = ctx.createGain(); og.gain.value = f > 100 ? 0.12 : 0.3
    o.connect(og); og.connect(gain); o.start(); s.nodes.push(o, og)
  }
  // רוח: רעש דרך bandpass, עם "נשימה" איטית בעוצמה ובגובה
  const frames = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
  const d = buf.getChannelData(0); for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6
  const wg = ctx.createGain(); wg.gain.value = 0.08
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.06
  lfo.connect(lfoG); lfoG.connect(wg.gain)
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.05
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 180
  lfo2.connect(lfo2G); lfo2G.connect(bp.frequency)
  src.connect(bp); bp.connect(wg); wg.connect(gain)
  src.start(); lfo.start(); lfo2.start()
  s.nodes.push(src, bp, wg, lfo, lfoG, lfo2, lfo2G)
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { creatureById } from '../content/creatures'
import { useCamera } from '../hooks/useCamera'
import { WIND_NAME } from '../engine/wind'

// ─── מה שיצא מהרוח ───
// "חושבת שוויספר יהיה הדמות הראשונה שהרוח פלטה החוצה, והוא פשוט יסתכל
// במבט כזה מרופט, יתנער ויצאו ממנו ניצוצות, ואז יברח ברחוב."
//
// והקליפ שלה עושה את כל זה בעצמו: הוא תלוי מהשואב מכוסה אבק, האבק נושר
// ממנו, מתחתיו מתגלה מישהו אחר לגמרי — ירוק, עם כנפיים — הוא מביט רגע,
// מסתובב, ורץ אל האופק עד שהוא נקודה.
//
// ולכן אין כאן שום אנימציה משלי: יש את הקליפ שלה, על רקע בהיר. הרקע
// הבהיר הוא החלטה ולא פשרה — הסרטון צולם על לבן, וניסיון לגזור ממנו את
// הרצפה השאיר שלולית אפורה. בתוך משחק שכולו חורבה בשקיעה, שנייה לבנה
// היא בדיוק מה שרגע כזה צריך: כמו הבזק של זיכרון.
//
// ואחרי שלוש שניות אפשר לדלג. ילד שראה את זה פעם אחת לא חייב לשבת שוב.
//
// ── ואז הרחוב ──
// "הייצור שיוצא מהשואב גם צריך להרגיש אמיתי ברחוב ולהתרחק מהם."
// הקליפ נגמר כשהוא רץ אל האופק — אבל אל אופק לבן, שאינו שום מקום.
// אחריו נפתחת המצלמה: הוא עומד ברחוב האמיתי, מסתובב, ומתרחק עד שהוא
// נקודה. שתי שניות וחצי, ומהן הילד מבין איפה לחפש אותו.

const CLIP_MS = 8200
const STREET_MS = 2800
const MS = CLIP_MS + STREET_MS
const SKIP_AFTER = 3000
const BEATS = [
  { at: 0, line: 'משהו יצא מ{wind}…' },
  { at: 3400, line: 'הוא מתנער — והאבק של כל השנים עף ממנו!' },
  { at: 5600, line: 'הוא מסתכל עליכם.' },
  { at: CLIP_MS, line: '{name} ברח לרחוב שלכם. הוא שם בחוץ עכשיו.' },
]

export function FreedClip({ id = 'whisper', onDone }) {
  const [ms, setMs] = useState(0)
  const c = creatureById(id)
  const done = useRef(false)
  const finish = () => { if (!done.current) { done.current = true; onDone?.() } }
  useEffect(() => {
    const t0 = Date.now()
    const iv = setInterval(() => setMs(Date.now() - t0), 120)
    const end = setTimeout(finish, MS)
    return () => { clearInterval(iv); clearTimeout(end) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base = c?.freed || '/world/whisper/freed'
  const beat = [...BEATS].reverse().find(b => ms >= b.at) || BEATS[0]
  const canSkip = ms >= SKIP_AFTER
  // הרחוב נפתח רק בשנייה השמינית — אין טעם להחזיק מצלמה פתוחה לפני כן.
  const street = ms >= CLIP_MS
  const k = street ? Math.min(1, (ms - CLIP_MS) / STREET_MS) : 0   // 0 → 1: כמה התרחק

  if (street) {
    return (
      <div dir={dirOf()} style={S.street} onClick={() => canSkip && finish()}>
        <StreetRun c={c} k={k} />
        <p style={S.streetLine}>{tr(beat.line, { wind: tr(WIND_NAME), name: tr(c?.name || '') })}</p>
        {canSkip && <span style={S.skip}>{tr('להמשיך')}</span>}
      </div>
    )
  }

  return (
    <div dir={dirOf()} style={S.wrap} onClick={() => canSkip && finish()}>
      {/* שני קידודים: אייפון מנגן H.264, ודפדפן בלי הקודק הזה (וגם
          הדפדפן שבו אני בודק) נופל ל-VP9. בלי זה הרגע הזה פשוט לבן.
          והנתיב מגיע מהמרשם — לכל מי שנפלט הקליפ שלו. */}
      <video key={base} autoPlay muted playsInline style={S.vid}>
        <source src={`${base}.mp4`} type="video/mp4" />
        <source src={`${base}.webm`} type="video/webm" />
      </video>
      <div style={S.vignette} aria-hidden="true" />
      <p key={beat.at} style={S.line}>
        {tr(beat.line, { wind: tr(WIND_NAME), name: tr(c?.name || '') })}
      </p>
      {canSkip && <span style={S.skip}>{tr('להמשיך')}</span>}
    </div>
  )
}

// ── הוא ברחוב, ומתרחק ──
// המצלמה מאחור, והספרייט החי שלו (webp עם שקיפות) קטן ועולה — בדיוק
// כמו מישהו שרץ ממך והולך ונעלם.
function StreetRun({ c, k }) {
  const cam = useCamera({ active: true })
  const src = c?.live || c?.sprites?.hero || null
  return (
    <>
      {/* בלי מצלמה הוא היה רץ בתוך שחור. רחוב מצויר — אותו אחד של הבמה —
          כדי שגם אז יהיה לו מאיפה להתרחק. */}
      {cam.state !== 'on' && (
        <div style={S.paint} aria-hidden="true">
          <div style={S.paintSky} /><div style={S.paintGround} />
        </div>
      )}
      <video ref={cam.videoRef} playsInline muted autoPlay
        style={{ ...S.cam, opacity: cam.state === 'on' ? 1 : 0 }} />
      <div style={S.camVeil} aria-hidden="true" />
      {src && (
        <img src={src} alt="" draggable={false}
          style={{ ...S.runner,
            // יוצא גדול וקרוב, ונעשה נקודה גבוהה יותר במסך (כלומר רחוקה)
            height: `${34 - 27 * k}vh`,
            bottom: `${18 + 26 * k}%`,
            opacity: 1 - k * 0.45,
            filter: `drop-shadow(0 ${8 - 6 * k}px ${10 - 7 * k}px rgba(0,0,0,${0.5 - 0.35 * k}))` }} />
      )}
    </>
  )
}

const S = {
  // לבן שמתאים ללבן של הסרטון, כדי שלא ייראה מלבן בתוך מלבן
  wrap: { position: 'fixed', inset: 0, zIndex: 3200, background: '#FAFAF8', overflow: 'hidden',
    display: 'grid', placeItems: 'center', animation: 'wildenFadeIn .3s ease-out both', cursor: 'pointer' },
  vid: { width: '100%', maxWidth: 560, maxHeight: '74vh', objectFit: 'contain', display: 'block' },
  vignette: { position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 45%, rgba(15,21,15,0) 52%, rgba(15,21,15,.14) 100%)' },
  line: { position: 'absolute', bottom: '9%', insetInline: 0, margin: 0, padding: '0 24px', textAlign: 'center',
    color: '#14200F', fontSize: 20, fontWeight: 900, lineHeight: 1.5, animation: 'wildenFadeIn .4s ease-out both' },
  street: { position: 'fixed', inset: 0, zIndex: 3200, background: '#0C1218', overflow: 'hidden', cursor: 'pointer' },
  cam: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .3s' },
  paint: { position: 'absolute', inset: 0 },
  paintSky: { position: 'absolute', inset: 0, background: 'linear-gradient(#25402F, #4A5F3C 58%, #6B7248)' },
  paintGround: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
    background: 'linear-gradient(#5A5F3E, #33381F)' },
  camVeil: { position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(8,14,20,.18), rgba(8,14,20,.55))' },
  runner: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'auto',
    pointerEvents: 'none', transition: 'height .12s linear, bottom .12s linear, opacity .12s linear' },
  streetLine: { position: 'absolute', bottom: '9%', insetInline: 0, margin: 0, padding: '0 24px', textAlign: 'center',
    color: '#E9E5D8', fontSize: 20, fontWeight: 900, lineHeight: 1.5, textShadow: '0 2px 16px rgba(0,0,0,.9)',
    animation: 'wildenFadeIn .4s ease-out both' },
  skip: { position: 'absolute', top: 14, insetInlineEnd: 14, padding: '5px 13px', borderRadius: 999,
    background: 'rgba(20,32,15,.72)', color: '#E9E5D8', fontSize: 13, fontWeight: 800 },
}

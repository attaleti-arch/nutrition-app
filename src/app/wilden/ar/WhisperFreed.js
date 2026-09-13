'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { creatureById } from '../content/creatures'
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

const MS = 10000
const SKIP_AFTER = 3000
const BEATS = [
  { at: 0, line: 'משהו יצא מ{wind}…' },
  { at: 3400, line: 'הוא מתנער — והאבק של כל השנים עף ממנו!' },
  { at: 5600, line: 'הוא מסתכל עליכם.' },
  { at: 7600, line: '{name} ברח לרחוב. הוא שם בחוץ עכשיו.' },
]

export function WhisperFreed({ id = 'whisper', onDone }) {
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

  const beat = [...BEATS].reverse().find(b => ms >= b.at) || BEATS[0]
  const canSkip = ms >= SKIP_AFTER

  return (
    <div dir={dirOf()} style={S.wrap} onClick={() => canSkip && finish()}>
      {/* שני קידודים: אייפון מנגן H.264, ודפדפן בלי הקודק הזה (וגם
          הדפדפן שבו אני בודק) נופל ל-VP9. בלי זה הרגע הזה פשוט לבן. */}
      <video autoPlay muted playsInline style={S.vid}>
        <source src="/world/whisper/freed.mp4" type="video/mp4" />
        <source src="/world/whisper/freed.webm" type="video/webm" />
      </video>
      <div style={S.vignette} aria-hidden="true" />
      <p key={beat.at} style={S.line}>
        {tr(beat.line, { wind: tr(WIND_NAME), name: tr(c?.name || '') })}
      </p>
      {canSkip && <span style={S.skip}>{tr('להמשיך')}</span>}
    </div>
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
  skip: { position: 'absolute', top: 14, insetInlineEnd: 14, padding: '5px 13px', borderRadius: 999,
    background: 'rgba(20,32,15,.72)', color: '#E9E5D8', fontSize: 13, fontWeight: 800 },
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { tr, dirOf } from '../i18n'
import { sfxCoin, sfxCheer, buzz } from '../engine/audio'

// ─── הכוורת עובדת ───
// "האני נכנסת בקליפ לכוורת עם פרחים ויוצאת עם דבש. צליל של דבש מצטבר
// וכמות צנצנות עולה על המסך, שהילד רואה לנגד עיניו."
//
// זה הרגע שסוגר את השרשרת: הילד רץ אחרי פרחים ברחוב, ועכשיו הוא רואה
// מה נעשה מהם. בלי הרגע הזה ריצת הפרחים נשארת מיני־משחק, והדבש נשאר
// מספר בדוח.
//
// הקליפ הוא שלה (Runway + טופז): האני נכנסת לכוורת עם הפרחים, הכוורת
// זוהרת מבפנים, והיא יוצאת עם צנצנת ומרימה אותה. שש שניות.
// ואז הצנצנות נספרות אחת־אחת, כל אחת עם הצליל שלה.
//
// ולמי שאין לו פרחים אין כאן מסך בכלל — הוא מקבל משפט במסך הסיום. אין
// טעם להראות לילד קליפ של הכנת דבש שלא קרתה.

const CLIP_MS = 6100
const JAR_MS = 620          // כמה זמן בין צנצנת לצנצנת

export function HiveMake({ jars = 0, used = 0, onDone }) {
  const [ms, setMs] = useState(0)
  const done = useRef(false)
  const rang = useRef(0)
  const finish = () => { if (!done.current) { done.current = true; onDone?.() } }

  useEffect(() => {
    const t0 = Date.now()
    const iv = setInterval(() => setMs(Date.now() - t0), 90)
    const end = setTimeout(finish, CLIP_MS + jars * JAR_MS + 1500)
    return () => { clearInterval(iv); clearTimeout(end) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // כמה צנצנות כבר על המסך
  const shown = ms < CLIP_MS ? 0 : Math.min(jars, Math.floor((ms - CLIP_MS) / JAR_MS) + 1)

  // הצליל של כל צנצנת, פעם אחת לכל אחת
  useEffect(() => {
    if (shown <= rang.current) return
    rang.current = shown
    try { sfxCoin(true); buzz([25]) } catch (e) { /* לא קריטי */ }
    if (shown === jars) { try { sfxCheer() } catch (e) { /* */ } }
  }, [shown, jars])

  const canSkip = ms > 2200
  return (
    <div dir={dirOf()} style={S.wrap} onClick={() => canSkip && finish()} role="button" aria-label={tr('לדלג')}>
      <video key="hive" autoPlay muted playsInline style={S.vid}>
        <source src="/world/buildings/hive-make.mp4" type="video/mp4" />
        <source src="/world/buildings/hive-make.webm" type="video/webm" />
      </video>
      <div style={S.veil} aria-hidden="true" />

      <div style={S.text}>
        <p style={S.line}>{tr('הכוורת עובדת')}</p>
        <p style={S.sub}>{tr('{n} פרחים שקטפתם', { n: used })}</p>
        {/* הצנצנות עצמן: אחת־אחת, כל אחת קופצת פנימה */}
        <div style={S.jars} aria-label={tr('{n} צנצנות דבש', { n: jars })}>
          {Array.from({ length: jars }, (_, i) => (
            <span key={i} style={{ ...S.jar, ...(i < shown ? S.jarIn : S.jarOut) }}>🍯</span>
          ))}
        </div>
        {shown === jars && jars > 0 && (
          <p style={S.got}>{jars === 1 ? tr('צנצנת דבש אחת') : tr('{n} צנצנות דבש', { n: jars })}</p>
        )}
      </div>

      {canSkip && <span style={S.skip}>{tr('להמשיך')}</span>}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@keyframes wildenJarIn { 0% { transform: scale(.2) translateY(14px); opacity: 0 } 60% { transform: scale(1.25) translateY(-4px); opacity: 1 } 100% { transform: scale(1) translateY(0); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }
`

const S = {
  wrap: { position: 'fixed', inset: 0, zIndex: 3250, background: '#0F150F', overflow: 'hidden', cursor: 'pointer',
    display: 'grid', placeItems: 'center' },
  vid: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  veil: { position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(12,18,12,.1) 40%, rgba(12,18,12,.72) 78%, rgba(12,18,12,.92) 100%)' },
  text: { position: 'absolute', left: 0, right: 0, bottom: '7%', padding: '0 22px', textAlign: 'center' },
  line: { margin: 0, fontSize: 25, fontWeight: 900, color: '#FFE8C4', textShadow: '0 2px 16px rgba(0,0,0,.9)' },
  sub: { margin: '3px 0 0', fontSize: 15, color: '#D9CDB4', textShadow: '0 2px 10px rgba(0,0,0,.85)' },
  jars: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', margin: '12px 0 0', minHeight: 44 },
  jar: { fontSize: 34, lineHeight: 1, display: 'inline-block',
    filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.6))' },
  jarIn: { animation: 'wildenJarIn .42s cubic-bezier(.2,1.5,.4,1) both' },
  jarOut: { opacity: 0 },
  got: { margin: '10px 0 0', fontSize: 19, fontWeight: 800, color: '#F0C069', textShadow: '0 2px 12px rgba(0,0,0,.85)' },
  skip: { position: 'absolute', top: 14, insetInlineEnd: 14, padding: '5px 13px', borderRadius: 999,
    background: 'rgba(20,32,15,.72)', color: '#E9E5D8', fontSize: 13, fontWeight: 800 },
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { useModelViewer, useModelSrc } from '../hooks/useModelViewer'
import { sizeOf } from '../content/creatures'
import { Wear } from '../ui/Wear'
import { Aura } from '../ui/Aura'

// ─── הדמות על הבמה ───
// שתי דרכים להציג יצור, ומדרגה ברורה ביניהן:
//
//   1. מודל תלת-ממדי (GLB) — אם למרשם היצור יש model והקובץ נטען. מסתובב
//      עם הטלפון, מנגן קליפ לפי הפאזה, עומד על הרצפה. (ModelLayer)
//   2. ספרייט — גזירה דו-ממדית מגיליון הדמויות. מה שיש היום. (CreatureFigure)
//
// המעבר ביניהם הוא במרשם (content/creatures.js) בלבד. הבמה לא יודעת
// ולא צריכה לדעת מה הגיע מהאמן. אם המודל לא נטען — נופלים לספרייט בשקט,
// ולא למסך ריק ולא לכדור ירוק.
//
// PEEK הוא תמיד ספרייט: "ראש מבצבץ מאחורי גזע" הוא תמונה מעוצבת, ומודל
// תלת-ממדי בלי עץ אמיתי להסתתר מאחוריו לא יעשה את זה טוב יותר.

const GLOW_DONE = 'drop-shadow(0 0 22px rgba(240,192,105,.55))'
const FOV_DEG = 22          // זווית ראייה אנכית של מצלמת המודל

// ── ספרייט + צל + פס ──
// scale מגיע מהפאזה (0.82 מבצבץ, 1.6 מתקרב, 1.35 בסיום) ומיושם כגובה
// אמיתי, לא כ-transform — ראה הערה ב-Stage.
// hideSprite: המודל התלת-ממדי כבר מוצג בשכבה שלו; הצל והפס נשארים כאן.
export function CreatureFigure({ creature, peeking, faceLeft, streakSide, approaching, done, scale: phaseScale = 1, hideSprite = false, flying = false, shadow = false, wear = null }) {
  // הגודל: הפאזה כפול הגובה האמיתי של היצור. בולדר גדול מנימי גם כשהם
  // באותו מרחק.
  const scale = phaseScale * sizeOf(creature)
  // דמות חיה כבר זזה בעצמה; אנימציית CSS מעליה רק מכבידה.
  const anim = hideSprite || creature?.live ? 'none'
    : approaching ? 'wildenBob 1.1s ease-in-out infinite'
    : done ? 'wildenBreathe 2.6s ease-in-out infinite' : 'none'
  return (
    <div className="wilden-figure" style={{ ...F.figure, animation: anim,
      width: `${(60 * scale).toFixed(1)}vw`, height: `${(36 * scale).toFixed(1)}vh` }}>
      <style>{FIGURE_CSS}</style>
      {streakSide && (
        <div style={{ ...F.streak, ...(streakSide === 'left' ? F.streakL : F.streakR) }} />
      )}
      {!flying && !shadow && <div style={F.shadow} />}
      {done && <div style={F.glow} />}
      {/* צל: רק הצל שלו על הרצפה. שטוח, כהה, מחליק — בלי הדמות. */}
      {shadow ? <ShadowBlob faceLeft={faceLeft} />
        : !hideSprite && (
        <Sprite sprites={creature?.sprites} live={creature?.live} peeking={peeking} faceLeft={faceLeft} done={done} scale={scale} wear={wear} creatureId={creature?.id}
          aura={creature?.aura ? creature.stage : 0} />
      )}
    </div>
  )
}

// ── הצל של צל ──
// כתם כהה שטוח בצורת שועל, על הרצפה, עם קצה סגול שזוהר. זה מה שרואים
// כשצל "כאן" אבל עוד לא קם. SVG סטטי, כדי שלא לעבד תמונה מונפשת.
export function ShadowBlob({ faceLeft }) {
  return (
    <svg viewBox="0 0 200 70" aria-hidden="true" style={{ ...F.blob, transform: `translateX(-50%) ${faceLeft ? 'scaleX(-1)' : ''}` }}>
      <defs>
        <radialGradient id="wshadow" cx="50%" cy="50%" r="55%">
          <stop offset="0" stopColor="#120A1E" stopOpacity=".92" />
          <stop offset=".8" stopColor="#120A1E" stopOpacity=".7" />
          <stop offset="1" stopColor="#120A1E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M12 44 C30 22 70 18 110 24 L128 8 L134 26 L152 12 L154 30 C176 34 190 42 188 50 C180 62 120 66 70 62 C34 60 8 56 12 44 Z" fill="url(#wshadow)" />
      <path d="M40 48 C70 38 120 40 160 46" fill="none" stroke="#8A5CF6" strokeWidth="2" strokeLinecap="round" opacity=".55" style={{ animation: 'wildenShadowPulse 1.6s ease-in-out infinite' }} />
    </svg>
  )
}

// ── אבק ──
// בולדר רקע: ענן אבק במקום שבו הוא היה, שמתפשט ונעלם.
export function Dust() {
  return (
    <div style={F.dustWrap} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <span key={i} style={{ ...F.dust, left: `${18 + i * 11}%`, animationDelay: `${i * 60}ms`, width: 34 + (i % 3) * 14, height: 34 + (i % 3) * 14 }} />
      ))}
    </div>
  )
}

// ── ההתפוצצות של בולדר ──
// הקליפ שלה: רוקע, אור, ברקים, אבנים, עשן — פעם אחת (WebP בלי לופ), בגודל
// שבו הוא עמד. src הוא כתובת טרייה לכל פעם (ראה hooks/useBurst), אחרת
// הדפדפן ממשיך אנימציה שכבר נגמרה ומראים פריים אחרון קפוא.
export function Burst({ src, scale = 1.45 }) {
  return (
    <div style={{ ...F.figure, width: `${(60 * scale).toFixed(1)}vw`, height: `${(36 * scale).toFixed(1)}vh`, pointerEvents: 'none' }} aria-hidden="true">
      <img src={src} alt="" draggable={false} style={{ ...F.hero, height: `${(40 * scale).toFixed(1)}vh`, transition: 'none' }} />
    </div>
  )
}

// ── הדמות החיה ──
// live הוא הקליפ של Runway בלי רקע (WebP מונפש). הוא מנצח את הספרייט
// הסטטי בכל פאזה חוץ מהצצה, ששם יש ציור ייעודי אם קיים.
function Sprite({ sprites, live, peeking, faceLeft, done, scale = 1, wear = null, creatureId = null, aura = 0 }) {
  if (!sprites && !live) return null
  if (peeking && sprites?.peek) {
    return <img src={sprites.peek} alt="" draggable={false}
      style={{ ...F.peek, height: `${(36 * scale).toFixed(1)}vh` }} />
  }
  const src = live || sprites?.hero
  if (!src) return null
  // העוטף הוא תיבת התמונה: הכובע מהחנות יושב עליו באחוזים, ומתהפך איתו.
  return (
    <div style={{ ...F.hero, width: 'fit-content', height: `${(34 * scale).toFixed(1)}vh`, transform: faceLeft ? 'scaleX(-1)' : 'none' }}>
      {/* גדל בלי דמות לשלב: הילה מאחוריו */}
      {aura > 1 && <Aura stage={aura} />}
      <img src={src} alt="" draggable={false} style={{
        position: 'relative', zIndex: 1,
        height: '100%', width: 'auto', display: 'block', userSelect: 'none', WebkitUserDrag: 'none',
        // בלי filter על תמונה מונפשת: drop-shadow שמחושב מחדש 12 פעמים בשנייה
        // על WebP מונפש תוקע את הדפדפן. הצל והזוהר מצוירים מאחור ב-CSS רגיל.
        filter: live ? 'none' : done ? GLOW_DONE : 'drop-shadow(0 6px 10px rgba(0,0,0,.35))',
      }} />
      {wear && creatureId && <Wear id={creatureId} wear={wear} />}
    </div>
  )
}

// ── שכבת המודל ──
// model-viewer ממלא את כל הבמה ולא זז ולא משנה גודל אף פעם. מיקום וגודל
// הדמות על המסך נקבעים דרך המצלמה בלבד: camera-target מזיז את הדמות
// שמאלה/ימינה/למטה, ורדיוס המצלמה באחוזים קובע כמה גדולה היא.
//
// למה ככה ולא תיבה שנעה עם היעד: model-viewer מודד את עצמו באירועי
// layout, ותיבה שנעה ומשתנה תוך כדי רינדור הציגה את המודל במקום הלא
// נכון — לא באופן שיכולתי לשחזר בעמוד סטטי. שכבה קבועה מוציאה את כל
// המסלול הזה מהמשחק.
//
//   x       — מיקום אופקי במסך, -1..1 (0 = מרכז). מגיע מ-dx/(FOV/2).
//   scale   — כמו בספרייט. 1.6 = קרוב.
//   faceLeft, phase, done — כמו בספרייט.
//   onShown — המודל נטען ומוצג: הספרייט יכול להיעלם.
//   visible — היצור בתוך חרוט הראייה. השכבה נשארת מחוברת גם כשלא, ורק
//             נעלמת: פירוק וחיבור מחדש של model-viewer באמצע רינדור זרק
//             שגיאות פנימיות וטען את המודל מחדש בכל סיבוב של הטלפון.
export function ModelLayer({ creature, x = 0, scale: phaseScale = 1, faceLeft, phase, done, visible = true, orbit = 0, onShown, onFailed }) {
  // גובה אמיתי: אותו מכפיל כמו הספרייט, כדי שהמעבר ביניהם לא יקפוץ.
  const scale = phaseScale * sizeOf(creature)
  // יצור מעופף (דבשון): מרחף בגובה העיניים ומעלה, בלי צל על הרצפה.
  const flying = creature?.arMode === 'sky'
  const src = useModelSrc(creature)
  const ready = useModelViewer(!!src)
  const ref = useRef(null)
  const [base, setBase] = useState(null)      // {target, radius, fov} מהמסגור האוטומטי
  const wanted = creature?.clips?.[phase]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onLoad = () => {
      const avail = el.availableAnimations || []
      if (avail.length) el.animationName = avail.includes(wanted) ? wanted : avail[0]
      const t = el.getCameraTarget()
      const o = el.getCameraOrbit()
      const d = el.getDimensions()
      // הגודל נמדד לפי הציר הגדול ביותר, לא רק הגובה: דבורה עם כנפיים
      // רחבה יותר משהיא גבוהה, ולפי גובה בלבד היא נחתכה בקצה המסך.
      setBase({ target: { x: t.x, y: t.y, z: t.z }, radius: o.radius, fov: el.getFieldOfView(),
        height: Math.max(d.y, d.x * 0.85, d.z * 0.85) })
      onShown?.()
    }
    const onError = () => onFailed?.()
    el.addEventListener('load', onLoad)
    el.addEventListener('error', onError)
    return () => { el.removeEventListener('load', onLoad); el.removeEventListener('error', onError) }
  }, [ready, wanted, onShown, onFailed])

  useEffect(() => {
    const el = ref.current
    if (!el || !el.loaded) return
    const avail = el.availableAnimations || []
    if (avail.length) el.animationName = avail.includes(wanted) ? wanted : avail[0]
  }, [wanted])

  // ── תנועה בלי שלד ──
  // המודל של Meshy הגיע בלי אנימציות, ואין כלי אוטומטי שעושה שלד ליצור
  // על ארבע. עד שמאייש יעשה את זה, הגוף כולו זז: נשימה כשעומד, קפיצות
  // קצרות כשבורח, נדנוד קל של הגוף כשמסתכל על הילד. לא רגליים שהולכות —
  // אבל יצור חי ולא פסל. נכבה מעצמו ברגע שיש קליפים בקובץ.
  useEffect(() => {
    const el = ref.current
    if (!el || !base || !visible) return
    if ((el.availableAnimations || []).length) return
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t0 = performance.now()
    let raf = 0
    const loop = now => {
      // כותבים לרכיב רק כשהוא באמת מחובר ועם מודל: כתיבה אחרי ניתוק
      // מתפוצצת בתוך model-viewer בפריים הבא, מחוץ ל-try/catch.
      if (!el.isConnected || !el.loaded) { raf = requestAnimationFrame(loop); return }
      const t = (now - t0) / 1000
      let sy = 1, pitch = 0, yawWag = 0
      if (flying) {
        // ריחוף: עולה ויורד לאט, נוטה קצת עם הכנפיים
        const bob = Math.sin(t * Math.PI * 1.6)
        sy = 1 + bob * 0.03
        pitch = -6 + bob * 3
        yawWag = Math.sin(t * Math.PI * 0.8) * 8 + (phase === 'move' ? Math.sin(t * Math.PI * 6) * 2 : 0)
      } else if (phase === 'move') {
        // ריצה: קפיצות של ~2.4 בשנייה, הגוף נוטה קדימה
        const hop = Math.abs(Math.sin(t * Math.PI * 2.4))
        sy = 1 + hop * 0.05
        pitch = -4 + hop * 5
        yawWag = Math.sin(t * Math.PI * 4.8) * 2
      } else if (phase === 'appear') {
        // נעצר ומסתכל: נשימה, וסיבוב קל של הגוף לצדדים כמו שמרחרח
        sy = 1 + Math.sin(t * Math.PI * 1.2) * 0.02
        yawWag = Math.sin(t * Math.PI * 0.6) * 6
        pitch = Math.sin(t * Math.PI * 0.9) * 2
      } else {
        // נתפס: נשימה רגועה ושמחה קטנה
        sy = 1 + Math.sin(t * Math.PI * 1.4) * 0.025
        yawWag = Math.sin(t * Math.PI * 2.2) * 3
      }
      try {
        el.orientation = `0deg ${pitch.toFixed(2)}deg ${yawWag.toFixed(2)}deg`
        el.scale = `1 ${sy.toFixed(3)} 1`
      } catch (e) { /* הרכיב נעלם באמצע פריים */ }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [base, phase, visible])

  if (!src || !ready) return null

  // ── לאן הוא פונה ──
  // כשהוא זז: שלושת-רבעי לכיוון התנועה (רואים שהוא הולך לאנשהו). כשהוא
  // נעצר או נתפס: כמעט חזיתי, מסתכל על הילד. "הדמות מונחת על צידה, אי
  // אפשר להיות לפניה" — עכשיו ברגע שהוא עוצר הוא מסתובב אליך.
  // model-viewer מחליק את שינוי הזווית, אז הסיבוב עצמו נראה כתנועה.
  // orbit: כמה הילד הלך סביבו (לפי GPS). "לפחות שהילד יסתובב סביבו" —
  // הוא עומד במקום, והילד שמקיף אותו רואה צד, גב, וחוזר לפנים.
  const side = faceLeft ? 1 : -1
  const yaw = done ? orbit : phase === 'move' ? side * 55 : side * 14 + orbit

  // ── גודל ומיקום דרך המצלמה ──
  // המסגור האוטומטי של model-viewer בתיבה על כל המסך ממלא את הרוחב —
  // גדול מדי. רוצים שגובה הדמות יהיה כמו הספרייט: 34vh × scale.
  // גובה נראה במרחק r הוא 2·r·tan(fov/2), ומכאן r. הרדיוס נמסר באחוזים
  // מהרדיוס האוטומטי, ההיסט האופקי לאורך וקטור "ימינה" של המצלמה כדי
  // שיעבוד בכל yaw, וההיסט למטה מניח את הרגליים בגובה הצל של היעד.
  // זווית ראייה צרה ממרחק, לא רחבה מקרוב: מצלמה במרחק 1.3 מ' מיצור של
  // 60 ס"מ מנפחת את הראש ומעוותת. 22° ממרחק של כמה מטרים נראה כמו
  // יצור שעומד ברחוב, וזה גם פחות או יותר מה שמצלמת הטלפון רואה.
  let radiusPct = Math.round(100 / scale)
  let target = 'auto auto auto'
  if (base) {
    // field-of-view שקבענו הוא של הציר הצר (הרוחב, בטלפון עומד). הזווית
    // האנכית בפועל נקראת מהרכיב אחרי הטעינה — היא מה שקובע גובה על המסך.
    const tanH = Math.tan((base.fov * Math.PI) / 360)
    const r = base.height / (0.68 * scale * tanH)
    radiusPct = Math.round((r / base.radius) * 100)
    const halfH = r * tanH
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 0.5
    const halfW = halfH * aspect
    const th = (yaw * Math.PI) / 180
    const right = { x: Math.cos(th), z: -Math.sin(th) }
    // בקצה החרוט הדמות לא יוצאת מהמסך: לכל היותר 60% מחצי הרוחב הצידה.
    // הילד מסובב את הטלפון אליה בכל מקרה — זה הרגע שבו היא נכנסת למרכז.
    const lim = flying ? 0.45 : 0.6
    const xc = Math.max(-lim, Math.min(lim, x))
    const sx = -xc * halfW                       // יעד ימינה = דמות שמאלה
    const tx = base.target.x + right.x * sx
    const tz = base.target.z + right.z * sx
    // מרכז הדמות מעט מתחת למרכז המסך; מעופף — מעל המרכז, באוויר.
    const ty = base.target.y + halfH * (flying ? -0.35 : 0.06)
    target = `${tx.toFixed(3)}m ${ty.toFixed(3)}m ${tz.toFixed(3)}m`
  }

  return (
    <model-viewer
      ref={ref}
      src={src}
      autoplay
      camera-orbit={`${yaw}deg 82deg ${radiusPct}%`}
      min-camera-orbit="auto auto 5%"
      max-camera-orbit="auto auto 1200%"
      field-of-view={`${FOV_DEG}deg`}
      min-field-of-view={`${FOV_DEG}deg`}
      max-field-of-view={`${FOV_DEG}deg`}
      camera-target={target}
      interaction-prompt="none"
      disable-zoom=""
      disable-pan=""
      disable-tap=""
      environment-image="neutral"
      shadow-intensity={flying ? '0' : '0.9'}
      shadow-softness="0.8"
      exposure="1.05"
      // בלי filter על הקנבס: drop-shadow על WebGL בגודל מסך מלא תוקע את
      // הטלפון. הזוהר בסיום מצויר מאחורי הדמות ב-CSS רגיל (ראה CreatureFigure).
      style={{ ...F.layer, opacity: visible ? 1 : 0 }}
    />
  )
}

const FIGURE_CSS = `
@keyframes wildenBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3.5%) } }
@keyframes wildenBreathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.03) } }
@keyframes wildenShadowPulse { 0%,100% { opacity: .35 } 50% { opacity: .8 } }
@keyframes wildenDust { 0% { transform: translate(-50%, 0) scale(.4); opacity: .95 } 60% { opacity: .7 } 100% { transform: translate(-50%, -70px) scale(1.9); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .wilden-figure { animation: none !important } }
model-viewer { --poster-color: transparent; --progress-bar-color: transparent; background: transparent; }
`

const F = {
  // תיבת הדמות בגודל קבוע לפי הפאזה, כדי שהצל והפס יישבו באותו מקום גם
  // כשהספרייט מוחלף במודל.
  figure: { position: 'relative', display: 'grid', justifyItems: 'center', alignItems: 'end',
    willChange: 'transform' },
  hero: { gridArea: '1 / 1', width: 'auto', display: 'block', position: 'relative', zIndex: 1,
    userSelect: 'none', WebkitUserDrag: 'none', transition: 'height .35s' },
  peek: { gridArea: '1 / 1', width: 'auto', display: 'block', userSelect: 'none',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.35))' },
  // direction: ltr — הכרחי. העמוד כולו rtl, ו-model-viewer מניח את הקנבס
  // הפנימי שלו בלי left/right מפורש. ב-rtl הוא נצמד לימין, וקנבס ברוחב
  // כפול (DPR 2) זז שמאלה בחצי רוחבו: המודל נעלם או מופיע במקום הלא נכון.
  // שעתיים של חיפוש, שורה אחת של תיקון.
  layer: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block',
    background: 'transparent', pointerEvents: 'none', zIndex: 2, direction: 'ltr',
    transition: 'opacity .25s' },
  // זוהר הסיום: עיגול רך מאחורי הדמות. זול, ועובד גם מאחורי המודל.
  glow: { position: 'absolute', inset: '-12%', borderRadius: '50%', zIndex: 0,
    background: 'radial-gradient(circle, rgba(240,192,105,.45), rgba(240,192,105,.12) 55%, rgba(240,192,105,0) 72%)',
    animation: 'wildenBreathe 2.6s ease-in-out infinite' },
  shadow: { position: 'absolute', bottom: '-1.2vh', left: '18%', right: '18%', height: '4vh',
    borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,.42), rgba(0,0,0,0) 70%)' },
  // הפס שנשאר אחרי ריצה: כיוון, לא ניחוש.
  blob: { position: 'absolute', bottom: '4%', left: '50%', width: '92%', height: 'auto', filter: 'blur(1.5px)' },
  dustWrap: { position: 'relative', width: '52vw', height: '24vh', pointerEvents: 'none' },
  dust: { position: 'absolute', bottom: 0, borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(214,200,170,.95), rgba(170,150,120,.55) 60%, rgba(150,130,100,0) 100%)',
    animation: 'wildenDust 1.3s ease-out forwards', transform: 'translateX(-50%)' },
  streak: { position: 'absolute', bottom: '6%', width: '55%', height: '2.4vh', borderRadius: '50%',
    filter: 'blur(3px)', opacity: 0.7 },
  streakL: { right: '80%', background: 'linear-gradient(90deg, rgba(240,192,105,0), rgba(240,192,105,.75))' },
  streakR: { left: '80%', background: 'linear-gradient(270deg, rgba(240,192,105,0), rgba(240,192,105,.75))' },
}

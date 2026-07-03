'use client'
import { useState, useEffect, useRef } from 'react'

// ─── משחקי מאמן הדרקון ───
// עיקרון: ההתנהגות האמיתית (ארוחות, צעדים, אימון) מייצרת אנרגיה ⚡ —
// והאנרגיה פותחת סיבובי משחק. המסך הוא פרס על החיים, לא תחליף להם.

// בנק משימות הגלגל
export const WHEEL_MISSIONS = [
  { t: 'אכול משהו כתום היום 🥕', e: '🟠' },
  { t: 'שתה כוס מים בעמידה על רגל אחת 🦩', e: '💧' },
  { t: '10 קפיצות לפני ארוחת ערב ⭐', e: '🦘' },
  { t: 'עזור לערוך את השולחן 🍽️', e: '🍽️' },
  { t: 'אכול משהו ירוק היום 🥬', e: '🟢' },
  { t: 'ספר בארוחה משהו טוב שקרה היום 😊', e: '💬' },
  { t: 'טעם ביס אחד ממשהו בצלחת של אמא 😄', e: '👀' },
  { t: 'סדר את הכיסא שלך אחרי האוכל 🪑', e: '🪑' },
]

const SECRET_MISSIONS = [
  'שים כוס מים ליד הצלחת של כל בני הבית — בלי שישימו לב 🕵️',
  'סדר את המגירה של הכפות בשקט מוחלט 🤫',
  'שים פתק עם לב ❤️ ליד הצלחת של מישהו במשפחה',
  'הברח ירק אחד לצלחת שלך לפני שמישהו רואה 🥷',
  'תגיד לאמא או אבא "תודה על האוכל" — ותראה את הפרצוף שלהם 😊',
  'שתה כוס מים שלמה כשאף אחד לא מסתכל 💧',
  'סדר את הנעליים של כולם ליד הדלת בשקט 🥾',
  'תעשה 5 סקוואטים במקום שאף אחד לא רואה 🏋️',
]

// שלושה בלוקים של ~5 דקות: ליבה · שיווי משקל וקואורדינציה · יוגה ביחד — רבע שעה ביום
const EXERCISES = [
  { cat: 'ליבה', catEmoji: '💪', name: 'סקוואטים', emoji: '🐉', kind: 'reps', amount: '10 פעמים',
    how: 'עומדים עם רגליים ברוחב כתפיים, יורדים לאט-לאט כאילו מתיישבים על כיסא בלתי נראה — וקמים בחזרה!' },
  { cat: 'ליבה', catEmoji: '💪', name: 'קפיצות כוכב', emoji: '⭐', kind: 'reps', amount: '8 פעמים',
    how: 'קופצים ופותחים ידיים ורגליים לצדדים כמו כוכב ענק — וסוגרים בנחיתה. קלילים כמו דרקון!' },
  { cat: 'ליבה', catEmoji: '💪', name: 'בטן סטטי (פלאנק)', emoji: '🧘', kind: 'timer', secs: 20,
    how: 'שוכבים על הבטן, מרימים את הגוף על המרפקים וקצות הרגליים — הגב ישר כמו קרש! מחזיקים חזק.' },
  { cat: 'ליבה', catEmoji: '💪', name: 'שכיבות שמיכה', emoji: '🛏️', kind: 'reps', amount: '5 פעמים',
    how: 'ידיים על הרצפה ברוחב כתפיים, גוף ישר — מתכופפים לאט למטה ודוחפים למעלה. מותר על הברכיים!' },
  { cat: 'שיווי משקל', catEmoji: '🦩', name: 'פלמינגו', emoji: '🦩', kind: 'timer', secs: 15,
    how: 'עומדים על רגל אחת, ידיים פתוחות לצדדים כמו כנפיים. מחזיקים בלי ליפול — ואז מחליפים רגל!' },
  { cat: 'שיווי משקל', catEmoji: '🦩', name: 'קפיצות החלפה', emoji: '🦘', kind: 'reps', amount: '5 על כל רגל × 3',
    how: 'קופצים 5 פעמים על רגל ימין, מחליפים ל-5 על שמאל — ועוד פעמיים. סה"כ 3 סיבובים!' },
  { cat: 'שיווי משקל', catEmoji: '🦩', name: 'הליכה על חבל דמיוני', emoji: '🤸', kind: 'timer', secs: 20,
    how: 'הולכים על קו ישר ברצפה — עקב צמוד לאצבעות, צעד אחרי צעד, ידיים לצדדים. לא נופלים מהחבל!' },
  { cat: 'שיווי משקל', catEmoji: '🦩', name: 'ספר על הראש', emoji: '📚', kind: 'timer', secs: 15,
    how: 'שמים ספר (או כרית קטנה) על הראש ועומדים על רגל אחת — כמה זמן תחזיקו בלי שייפול? 😄' },
  { cat: 'יוגה ביחד', catEmoji: '🌳', name: 'עץ זוגי', emoji: '🌳', kind: 'timer', secs: 20,
    how: 'עומדים זה לצד זה עם אמא או אבא, מחזיקים ידיים, וכל אחד מרים את הרגל החיצונית — עץ כפול!' },
  { cat: 'יוגה ביחד', catEmoji: '🌳', name: 'כלב מביט מטה', emoji: '🐕', kind: 'timer', secs: 20,
    how: 'ידיים ורגליים על הרצפה, ישבן גבוה-גבוה למעלה — הגוף בצורת משולש. מי במשפחה מחזיק הכי יפה?' },
  { cat: 'יוגה ביחד', catEmoji: '🌳', name: 'פרפר זוגי', emoji: '🦋', kind: 'timer', secs: 20,
    how: 'יושבים אחד מול השני, כפות הרגליים נוגעות, מחזיקים ידיים — ומנפנפים בברכיים כמו כנפי פרפר.' },
  { cat: 'יוגה ביחד', catEmoji: '🌳', name: 'נשימת דרקון', emoji: '🐲', kind: 'reps', amount: '5 נשימות',
    how: 'יושבים בשקט, נושמים עמוק-עמוק דרך האף... ונושפים חזק דרך הפה כמו דרקון שמוציא אש!' },
]

const TRIVIA = [
  { q: 'איזה מאכל נותן הכי הרבה כוח לשרירים?', a: ['ביצה 🥚', 'סוכריה 🍬', 'צ׳יפס 🍟'], c: 0, why: 'ביצה מלאה בחלבון — אבני הבניין של השרירים!' },
  { q: 'מה עוזר לגוף לגדול בלילה?', a: ['טלוויזיה 📺', 'שינה טובה 😴', 'גלידה 🍦'], c: 1, why: 'בשינה הגוף בונה את עצמו — כמו טעינת סוללה!' },
  { q: 'כמה צבעים של ירקות כדאי לאכול ביום?', a: ['רק אחד', 'כמה שיותר! 🌈', 'אפס'], c: 1, why: 'כל צבע מביא כוח אחר — קשת בצלחת = גוף חזק!' },
  { q: 'מה הכי טוב לשתות כשצמאים?', a: ['מים 💧', 'קולה 🥤', 'מיץ ממותק'], c: 0, why: 'הגוף שלנו בנוי בעיקר ממים — זה הדלק האמיתי!' },
  { q: 'למה כדאי ללעוס לאט?', a: ['כי זה משעמם', 'כדי שהבטן תבין שאכלנו 🧠', 'סתם'], c: 1, why: 'לוקח לבטן 20 דקות להגיד "אני שבעה" — לאט זה חכם!' },
  { q: 'איזו ארוחה מעירה את המנוע בבוקר?', a: ['ארוחת בוקר ☀️', 'אין צורך לאכול', 'רק שוקולד'], c: 0, why: 'ארוחת בוקר מדליקה את מנוע האנרגיה של כל היום!' },
  { q: 'מה עושה הגזר לעיניים?', a: ['כלום', 'עוזר לראות טוב 👀', 'מצחיק אותן'], c: 1, why: 'בגזר יש ויטמין A שהעיניים מתות עליו!' },
  { q: 'כמה זמן כדאי לזוז ולשחק כל יום?', a: ['שעה לפחות! 🏃', '5 דקות', 'בכלל לא'], c: 0, why: 'שעה של תנועה ביום = דרקון חזק ושמח!' },
  { q: 'מה קורה לגוף כשאוכלים ירקות?', a: ['נהיה ירוק 😂', 'מקבל מגן-על 🛡️', 'שום דבר'], c: 1, why: 'ירקות בונים לגוף מגן שנלחם בחיידקים!' },
  { q: 'מתי הבטן באמת רעבה?', a: ['כשמשעמם', 'כשהיא מקרקרת 🔊', 'כשרואים פרסומת'], c: 1, why: 'שעמום זה לא רעב! הבטן יודעת להגיד כשהיא צריכה אוכל.' },
  { q: 'איזה חטיף הכי חזק אחרי ספורט?', a: ['פרי ויוגורט 🍓', 'במבה ענקית', 'עוגה'], c: 0, why: 'פרי + יוגורט = סוכר טבעי וחלבון — בדיוק מה שהשריר ביקש!' },
  { q: 'למה אוכלים ביחד ליד השולחן?', a: ['כי חייבים', 'כי זה כיף ומחבר 🥰', 'כדי לריב'], c: 1, why: 'ארוחה משפחתית היא זמן הקסם של היום!' },
]

const GOOD_ITEMS = ['🥦', '🍅', '🥕', '🍎', '🥒', '🍌', '🍓', '🫑']
const BAD_ITEMS = ['🍭', '🍩', '🍬']

export function hashDay(dateStr) {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) % 100000
  return h
}

export function dailySecret(dateStr) { return SECRET_MISSIONS[hashDay(dateStr) % SECRET_MISSIONS.length] }
export function dailyTrivia(dateStr) { return TRIVIA[hashDay(dateStr) % TRIVIA.length] }
export function dailyWorkout(dateStr) {
  // 2 תרגילים מכל בלוק (ליבה, שיווי משקל, יוגה ביחד) — מתחלפים לפי היום
  const h = hashDay(dateStr)
  const picks = []
  const cats = ['ליבה', 'שיווי משקל', 'יוגה ביחד']
  for (const cat of cats) {
    const pool = EXERCISES.filter(e => e.cat === cat)
    const i1 = h % pool.length
    let i2 = (h + 1 + (h % 2)) % pool.length
    if (i2 === i1) i2 = (i1 + 1) % pool.length
    picks.push(pool[i1], pool[i2])
  }
  return picks
}

// ─── תפוס את הירק! ───
export function CatchVeggie({ onEnd, best }) {
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [targets, setTargets] = useState([])
  const [done, setDone] = useState(false)
  const idRef = useRef(0)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  const start = () => {
    setPlaying(true); setDone(false); setScore(0); setTimeLeft(30); setTargets([])
    const spawn = setInterval(() => {
      const id = ++idRef.current
      const good = Math.random() > 0.28
      setTargets(t => [...t, {
        id, good,
        e: good ? GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)] : BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)],
        x: 5 + Math.random() * 78,
        y: 8 + Math.random() * 74,
      }])
      setTimeout(() => setTargets(t => t.filter(x => x.id !== id)), 1100)
    }, 600)
    const tick = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(spawn); clearInterval(tick)
          setPlaying(false); setDone(true); setTargets([])
          setScore(s => { onEnd(s); return s })
          return 0
        }
        return t - 1
      })
    }, 1000)
    timers.current = [spawn, tick]
  }

  const tap = (t) => {
    setTargets(arr => arr.filter(x => x.id !== t.id))
    setScore(s => Math.max(0, s + (t.good ? 1 : -2)))
    if (navigator.vibrate) navigator.vibrate(t.good ? 25 : [40, 30, 40])
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {!playing && !done && (
        <>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🥦</div>
          <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7, marginBottom: 12 }}>
            תפסו ירקות ופירות כמה שיותר מהר!<br/>זהירות מהממתקים — הם מורידים 2 נקודות 😈<br/>
            {best > 0 && <b style={{ color: '#0369a1' }}>השיא שלך: {best}</b>}
          </div>
          <button onClick={start} style={{ padding: '14px 40px', borderRadius: 16, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer' }}>
            ⚡ התחל! (30 שניות)
          </button>
        </>
      )}
      {playing && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', marginBottom: 6 }}>
            <span style={{ fontWeight: 900, fontSize: 17, color: '#16a34a' }}>{score} נק׳</span>
            <span style={{ fontWeight: 900, fontSize: 17, color: timeLeft <= 5 ? '#ef4444' : '#0369a1' }}>⏱ {timeLeft}</span>
          </div>
          <div style={{ position: 'relative', height: 320, background: 'linear-gradient(180deg,#e0f2fe,#f0fdf4)', borderRadius: 18, overflow: 'hidden', border: '2.5px solid #bae6fd' }}>
            {targets.map(t => (
              <div key={t.id} onPointerDown={() => tap(t)}
                style={{ position: 'absolute', left: t.x + '%', top: t.y + '%', fontSize: 38, cursor: 'pointer', userSelect: 'none', animation: 'pop-in 0.18s ease' }}>
                {t.e}
              </div>
            ))}
          </div>
        </>
      )}
      {done && (
        <>
          <div style={{ fontSize: 44, margin: '8px 0' }}>{score > best ? '🏆' : '💪'}</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#16a34a' }}>{score} נקודות!</div>
          {score > best && <div style={{ fontWeight: 800, fontSize: 15, color: '#d97706', marginTop: 4 }}>שיא חדש!! 🎉</div>}
          <button onClick={() => setDone(false)} style={{ marginTop: 12, padding: '11px 28px', borderRadius: 14, border: '2px solid #16a34a', background: '#fff', color: '#16a34a', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            חזרה
          </button>
        </>
      )}
    </div>
  )
}

// ─── גלגל האתגר ───
export function ChallengeWheel({ spun, mission, missionDone, onSpin, onDone }) {
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const segAngle = 360 / WHEEL_MISSIONS.length

  const spin = () => {
    if (spinning || spun) return
    const idx = Math.floor(Math.random() * WHEEL_MISSIONS.length)
    const target = 360 * 5 + (360 - idx * segAngle - segAngle / 2)
    setSpinning(true)
    setRot(target)
    setTimeout(() => {
      setSpinning(false)
      onSpin(WHEEL_MISSIONS[idx].t)
      if (navigator.vibrate) navigator.vibrate([60, 40, 100])
    }, 3600)
  }

  const colors = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#14b8a6', '#ec4899', '#84cc16']
  return (
    <div style={{ textAlign: 'center' }}>
      {!spun ? (
        <>
          <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 10 }}>סיבוב אחד ביום — איזו משימה תצא לך? 🎡</div>
          <div style={{ position: 'relative', width: 230, height: 230, margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 26, zIndex: 5 }}>🔻</div>
            <div style={{
              width: 230, height: 230, borderRadius: '50%',
              background: `conic-gradient(${WHEEL_MISSIONS.map((_, i) => `${colors[i]} ${i * segAngle}deg ${(i + 1) * segAngle}deg`).join(',')})`,
              border: '6px solid #fff', boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
              transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.15,0.9,0.28,1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              {WHEEL_MISSIONS.map((m, i) => (
                <span key={i} style={{ position: 'absolute', transform: `rotate(${i * segAngle + segAngle / 2}deg) translateY(-82px)`, fontSize: 22 }}>{m.e}</span>
              ))}
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 2 }}>🎯</div>
            </div>
          </div>
          <button onClick={spin} disabled={spinning}
            style={{ marginTop: 16, padding: '14px 44px', borderRadius: 16, border: 'none', background: spinning ? '#94a3b8' : '#f97316', color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer' }}>
            {spinning ? 'מסתובב...' : '🎡 סובב!'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎯</div>
          <div style={{ fontWeight: 900, fontSize: 17, color: '#c2410c', background: '#fff7ed', borderRadius: 16, padding: '14px 18px', border: '2px solid #fed7aa', lineHeight: 1.6 }}>
            המשימה שלך היום:<br/>{mission}
          </div>
          {missionDone ? (
            <div style={{ marginTop: 12, fontWeight: 900, color: '#16a34a', fontSize: 16 }}>✅ בוצע! קיבלת ⚡ אנרגיה!</div>
          ) : (
            <button onClick={onDone} style={{ marginTop: 14, padding: '13px 36px', borderRadius: 14, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
              ✓ ביצעתי את המשימה!
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── משימה חשאית ───
export function SecretMission({ dateStr, revealed, done, onReveal, onDone }) {
  const mission = dailySecret(dateStr)
  return (
    <div style={{ textAlign: 'center' }}>
      {!revealed ? (
        <>
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'dragon-idle 2s ease-in-out infinite' }}>✉️</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>הגיעה מעטפה חשאית... 🤫<br/>רק סוכנים אמיצים פותחים</div>
          <button onClick={onReveal} style={{ padding: '13px 36px', borderRadius: 14, border: 'none', background: '#1e293b', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
            🕵️ פתח את המעטפה
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🕵️</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0', background: '#1e293b', borderRadius: 16, padding: '16px 18px', lineHeight: 1.7 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 6 }}>— המשימה תושמד בקריאה 💨 —</span>
            {mission}
          </div>
          {done ? (
            <div style={{ marginTop: 12, fontWeight: 900, color: '#16a34a', fontSize: 16 }}>🥷 בוצע בשקט מוחלט. סוכן-על!</div>
          ) : (
            <button onClick={onDone} style={{ marginTop: 14, padding: '13px 36px', borderRadius: 14, border: 'none', background: '#334155', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              🤫 ביצעתי בלי שאף אחד שם לב
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── אימון הגיבור ───
export function HeroWorkout({ dateStr, doneToday, onFinish }) {
  const exercises = dailyWorkout(dateStr)
  const [idx, setIdx] = useState(-1)
  const [secs, setSecs] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startEx = (i) => {
    setIdx(i)
    const ex = exercises[i]
    clearInterval(timerRef.current)
    if (ex.kind === 'timer') {
      setSecs(ex.secs)
      timerRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(timerRef.current); if (navigator.vibrate) navigator.vibrate(80); return 0 }
          return s - 1
        })
      }, 1000)
    } else {
      setSecs(-1)
    }
  }

  const nextEx = () => {
    if (idx < exercises.length - 1) startEx(idx + 1)
    else { setIdx(-2); onFinish() }
  }

  if (doneToday && idx === -1) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🏅</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#16a34a', marginTop: 6 }}>סיימת את אימון הגיבור של היום!</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>מחר מחכה אימון חדש 💪</div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {idx === -1 && (
        <>
          <div style={{ fontSize: 44, marginBottom: 4 }}>💪</div>
          <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 10 }}>רבע שעה של כוח: ליבה 💪 · שיווי משקל 🦩 · יוגה ביחד 🌳<br/>עם הסבר לכל תרגיל — והדרקון מתאמן איתך 🐉</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {exercises.map((ex, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 14, padding: '10px 8px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6' }}>{ex.catEmoji} {ex.cat}</div>
                <div style={{ fontSize: 26 }}>{ex.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{ex.kind === 'timer' ? ex.secs + ' שניות' : ex.amount}</div>
              </div>
            ))}
          </div>
          <button onClick={() => startEx(0)} style={{ padding: '14px 40px', borderRadius: 16, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer' }}>
            🔥 מתחילים!
          </button>
        </>
      )}
      {idx >= 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>תרגיל {idx + 1} מתוך {exercises.length} · {exercises[idx].catEmoji} {exercises[idx].cat}</div>
          <div style={{ fontSize: 56 }}>{exercises[idx].emoji}</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#1e293b' }}>{exercises[idx].name}</div>
          {exercises[idx].kind === 'reps' && <div style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>{exercises[idx].amount}</div>}
          <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: '#5b21b6', fontWeight: 600, lineHeight: 1.7, margin: '10px 0' }}>{exercises[idx].how}</div>
          {exercises[idx].kind === 'timer' && (
            <div style={{ fontSize: 54, fontWeight: 900, color: secs === 0 ? '#16a34a' : '#8b5cf6', lineHeight: 1.1, marginBottom: 8 }}>
              {secs === 0 ? '✓' : secs}
            </div>
          )}
          <button onClick={nextEx}
            disabled={exercises[idx].kind === 'timer' && secs > 0}
            style={{ padding: '13px 40px', borderRadius: 14, border: 'none', background: (exercises[idx].kind === 'timer' && secs > 0) ? '#cbd5e1' : '#16a34a', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
            {idx < exercises.length - 1 ? 'הבא ←' : '🏁 סיום!'}
          </button>
        </>
      )}
      {idx === -2 && (
        <>
          <div style={{ fontSize: 48 }}>🏅</div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#16a34a', marginTop: 4 }}>אימון גיבור הושלם! +⚡ אנרגיה!</div>
        </>
      )}
    </div>
  )
}

// ─── זיכרון המאכלים ───
export function MemoryGame({ onWin }) {
  const EMOJIS = ['🍅', '🥦', '🥕', '🍎', '🍌', '🥒']
  const [cards, setCards] = useState([])
  const [open, setOpen] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [started, setStarted] = useState(false)
  const lock = useRef(false)

  const start = () => {
    const deck = [...EMOJIS, ...EMOJIS]
      .map((e, i) => ({ e, id: i, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
    setCards(deck); setOpen([]); setMatched([]); setMoves(0); setStarted(true)
    lock.current = false
  }

  const flip = (id) => {
    if (lock.current || open.includes(id) || matched.includes(id)) return
    const next = [...open, id]
    setOpen(next)
    if (next.length === 2) {
      setMoves(m => m + 1)
      lock.current = true
      const [a, b] = next.map(i => cards.find(c => c.id === i))
      setTimeout(() => {
        if (a.e === b.e) {
          setMatched(m => {
            const nm = [...m, a.id, b.id]
            if (nm.length === cards.length) onWin()
            return nm
          })
        }
        setOpen([])
        lock.current = false
      }, 700)
    }
  }

  const won = matched.length === 12 && started
  return (
    <div style={{ textAlign: 'center' }}>
      {!started ? (
        <>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🧠</div>
          <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 12 }}>מצאו את כל הזוגות!</div>
          <button onClick={start} style={{ padding: '14px 40px', borderRadius: 16, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer' }}>
            ⚡ התחל!
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>מהלכים: {moves}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {cards.map(c => {
              const shown = open.includes(c.id) || matched.includes(c.id)
              return (
                <div key={c.id} onClick={() => flip(c.id)}
                  style={{
                    aspectRatio: '1', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 30, cursor: 'pointer', userSelect: 'none',
                    background: shown ? '#f0fdf4' : 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                    border: matched.includes(c.id) ? '2.5px solid #16a34a' : '2.5px solid transparent',
                    transition: 'all 0.25s',
                  }}>
                  {shown ? c.e : '❓'}
                </div>
              )
            })}
          </div>
          {won && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#16a34a' }}>🎉 ניצחת ב-{moves} מהלכים!</div>
              <button onClick={start} style={{ marginTop: 8, padding: '10px 26px', borderRadius: 12, border: '2px solid #0ea5e9', background: '#fff', color: '#0369a1', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                עוד פעם!
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── חידת הכוח היומית ───
export function DailyTrivia({ dateStr, answered, wasRight, onAnswer }) {
  const t = dailyTrivia(dateStr)
  const [picked, setPicked] = useState(null)
  const show = answered || picked !== null
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 4 }}>❓</div>
      <div style={{ fontWeight: 900, fontSize: 16.5, color: '#1e293b', marginBottom: 12, lineHeight: 1.5 }}>{t.q}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {t.a.map((ans, i) => {
          const isCorrect = i === t.c
          const wasPicked = picked === i
          let bg = '#f8fafc', border = '#e2e8f0', color = '#334155'
          if (show && isCorrect) { bg = '#f0fdf4'; border = '#16a34a'; color = '#166534' }
          else if (show && wasPicked && !isCorrect) { bg = '#fef2f2'; border = '#ef4444'; color = '#b91c1c' }
          return (
            <button key={i} disabled={show}
              onClick={() => { setPicked(i); onAnswer(isCorrect) }}
              style={{ padding: '13px', borderRadius: 14, border: `2.5px solid ${border}`, background: bg, color, fontWeight: 800, fontSize: 15, cursor: show ? 'default' : 'pointer' }}>
              {ans}
            </button>
          )
        })}
      </div>
      {show && (
        <div style={{ marginTop: 12, background: '#eff6ff', borderRadius: 14, padding: '12px 14px', fontSize: 13.5, color: '#1e40af', fontWeight: 600, lineHeight: 1.6 }}>
          {(answered ? wasRight : picked === t.c) ? '🎉 נכון! +⚡ ' : '💙 '}{t.why}
        </div>
      )}
    </div>
  )
}

// ─── ארון הגביעים ───
export function TrophyRoom({ counters, growthDays, aliens }) {
  const trophies = [
    { e: '🐣', n: 'הדרקון נולד', ok: true },
    { e: '🌱', n: 'יום כוח ראשון', ok: growthDays >= 1 },
    { e: '🔥', n: 'שבוע של כוח', ok: growthDays >= 7 },
    { e: '👑', n: 'דרקון זהב', ok: growthDays >= 21 },
    { e: '👽', n: 'חייזר ראשון', ok: aliens >= 1 },
    { e: '🛸', n: '3 חייזרים', ok: aliens >= 3 },
    { e: '💪', n: 'אימון ראשון', ok: (counters.workouts || 0) >= 1 },
    { e: '🏋️', n: '10 אימונים', ok: (counters.workouts || 0) >= 10 },
    { e: '🥦', n: '15 בתפוס-את-הירק', ok: (counters.bestCatch || 0) >= 15 },
    { e: '⚡', n: '25 בתפוס-את-הירק', ok: (counters.bestCatch || 0) >= 25 },
    { e: '🧠', n: 'אלוף הזיכרון', ok: (counters.memoryWins || 0) >= 1 },
    { e: '🎓', n: '5 חידות נכונות', ok: (counters.triviaRight || 0) >= 5 },
    { e: '🕵️', n: 'סוכן חשאי', ok: (counters.secrets || 0) >= 1 },
    { e: '🥷', n: '5 משימות חשאיות', ok: (counters.secrets || 0) >= 5 },
    { e: '🎡', n: '5 סיבובי גלגל', ok: (counters.spins || 0) >= 5 },
  ]
  const won = trophies.filter(t => t.ok).length
  return (
    <div>
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 15, color: '#b45309', marginBottom: 12 }}>
        🏆 {won} מתוך {trophies.length} גביעים
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {trophies.map((t, i) => (
          <div key={i} style={{
            background: t.ok ? 'linear-gradient(135deg,#fef9c3,#fde68a)' : '#f1f5f9',
            borderRadius: 16, padding: '12px 6px', textAlign: 'center',
            border: t.ok ? '2px solid #f59e0b' : '2px solid #e2e8f0',
            opacity: t.ok ? 1 : 0.55,
          }}>
            <div style={{ fontSize: 30, filter: t.ok ? 'none' : 'grayscale(1)' }}>{t.e}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: t.ok ? '#92400e' : '#94a3b8', marginTop: 3 }}>{t.n}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

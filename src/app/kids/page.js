'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

// ─────────────────────────────────────────────────────────────
// מאמן הדרקון — אפליקציית ילדים "בין הראש לצלחת"
// עיקרון: הילד הוא המאמן, הדרקון הוא זה שבתהליך.
// אין קלוריות, אין משקל, אין אשמה — רק אנרגיה, כוח וגדילה.
// שמירה מקומית במכשיר (localStorage) — פשוט ובטוח לפיילוט.
// ─────────────────────────────────────────────────────────────

const STORE_KEY = 'dragon_coach_v1'
const STEP_GOAL = 7500
const STAGES = [
  { min: 0, name: 'גור דרקון', scale: 0.72 },
  { min: 7, name: 'דרקון צעיר', scale: 0.88 },
  { min: 14, name: 'דרקון מכונף', scale: 1.0, wings: true },
  { min: 21, name: 'דרקון זהב', scale: 1.08, wings: true, gold: true },
]
const CHECKS = [
  { k: 'lp', meal: 'צהריים', label: 'חלבון', emoji: '🍗' },
  { k: 'lv', meal: 'צהריים', label: 'ירק', emoji: '🥦' },
  { k: 'lc', meal: 'צהריים', label: 'פחמימה', emoji: '🍚' },
  { k: 'dp', meal: 'ערב', label: 'חלבון', emoji: '🥚' },
  { k: 'dv', meal: 'ערב', label: 'ירק', emoji: '🥕' },
]
const STEP_STOPS = [
  { at: 1000, label: 'הטיילת', emoji: '🌊' },
  { at: 3000, label: 'הגשר', emoji: '🌉' },
  { at: 5000, label: 'היער', emoji: '🌲' },
  { at: 7500, label: 'טירת האלופים', emoji: '🏰' },
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* corrupt state → fresh start */ }
  return null
}

function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch (e) { /* quota */ }
}

// ✅ סנכרון לשרת — רשומה בטבלת daily_logs עם מזהה 'kid:' כדי לא להתערבב
// עם רשומות הלקוחות. כל נתוני היום נשמרים בתוך עמודת ה-JSONB הקיימת checks.
async function syncToServer(s) {
  if (!s || !s.familyCode) return
  try {
    await supabase.from('daily_logs').upsert({
      client_name: 'kid:' + s.familyCode,
      log_date: s.today.date,
      checks: {
        kid: true,
        dragon_name: s.name,
        growth_days: s.growthDays,
        checks: s.today.checks || {},
        grew: !!s.today.grew,
        steps: s.today.steps || 0,
        photos: (s.album || []).length,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_name,log_date' })
  } catch (e) { /* offline — ננסה בפעם הבאה */ }
}

function stageFor(growthDays) {
  let st = STAGES[0]
  for (const s of STAGES) if (growthDays >= s.min) st = s
  return st
}

// ── הדרקון עצמו ──
function Dragon({ stage, mood, eating, size = 190 }) {
  const body = stage.gold ? '#f6c445' : '#5fd068'
  const bodyDark = stage.gold ? '#dfa321' : '#3fae4e'
  const belly = stage.gold ? '#fdeeb8' : '#d3f5d6'
  const s = stage.scale
  return (
    <div style={{ animation: eating ? 'dragon-eat 0.55s ease' : 'dragon-idle 3s ease-in-out infinite', transformOrigin: 'bottom center' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        <g transform={`translate(100 108) scale(${s}) translate(-100 -108)`}>
          {/* כנפיים */}
          {stage.wings && (
            <>
              <path d="M52,95 C20,68 12,96 30,116 C40,126 55,120 60,110 Z" fill={bodyDark} opacity="0.9">
                <animateTransform attributeName="transform" type="rotate" values="0 58 108;-9 58 108;0 58 108" dur="1.6s" repeatCount="indefinite" />
              </path>
              <path d="M148,95 C180,68 188,96 170,116 C160,126 145,120 140,110 Z" fill={bodyDark} opacity="0.9">
                <animateTransform attributeName="transform" type="rotate" values="0 142 108;9 142 108;0 142 108" dur="1.6s" repeatCount="indefinite" />
              </path>
            </>
          )}
          {/* זנב */}
          <path d="M140,150 C168,152 178,138 172,124 C186,130 190,152 172,162 C160,168 146,162 140,155 Z" fill={body} />
          <circle cx="176" cy="126" r="7" fill={bodyDark} />
          {/* גוף */}
          <ellipse cx="100" cy="120" rx="52" ry="48" fill={body} />
          {/* בטן */}
          <ellipse cx="100" cy="132" rx="32" ry="28" fill={belly} />
          {/* רגליים */}
          <ellipse cx="72" cy="164" rx="14" ry="10" fill={bodyDark} />
          <ellipse cx="128" cy="164" rx="14" ry="10" fill={bodyDark} />
          {/* קרניים */}
          <path d="M76,66 C72,52 78,46 84,50 C88,54 86,64 82,70 Z" fill="#fff0c9" stroke={bodyDark} strokeWidth="2" />
          <path d="M124,66 C128,52 122,46 116,50 C112,54 114,64 118,70 Z" fill="#fff0c9" stroke={bodyDark} strokeWidth="2" />
          {/* ראש (חלק מהגוף — בלוב חמוד) */}
          <ellipse cx="100" cy="86" rx="44" ry="36" fill={body} />
          {/* אוזניים/סנפירים */}
          <ellipse cx="58" cy="86" rx="9" ry="14" fill={bodyDark} />
          <ellipse cx="142" cy="86" rx="9" ry="14" fill={bodyDark} />
          {/* עיניים לפי מצב רוח */}
          {mood === 'sleep' ? (
            <>
              <path d="M76,84 q8,6 16,0" fill="none" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M108,84 q8,6 16,0" fill="none" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
              <text x="150" y="56" fontSize="17" fill="#64748b" fontWeight="800">💤</text>
            </>
          ) : mood === 'hungry' ? (
            <>
              <ellipse cx="84" cy="84" rx="7.5" ry="9" fill="#1f2937" />
              <ellipse cx="116" cy="84" rx="7.5" ry="9" fill="#1f2937" />
              <circle cx="86.5" cy="81" r="2.5" fill="#fff" />
              <circle cx="118.5" cy="81" r="2.5" fill="#fff" />
              {/* גבות עצובות-מתחננות */}
              <path d="M74,72 q10,-5 18,-1" fill="none" stroke={bodyDark} strokeWidth="3" strokeLinecap="round" />
              <path d="M126,72 q-10,-5 -18,-1" fill="none" stroke={bodyDark} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="84" cy="83" rx="7.5" ry="9.5" fill="#1f2937" />
              <ellipse cx="116" cy="83" rx="7.5" ry="9.5" fill="#1f2937" />
              <circle cx="86.5" cy="79.5" r="3" fill="#fff" />
              <circle cx="118.5" cy="79.5" r="3" fill="#fff" />
            </>
          )}
          {/* נחיריים */}
          <circle cx="94" cy="98" r="2.2" fill={bodyDark} />
          <circle cx="106" cy="98" r="2.2" fill={bodyDark} />
          {/* פה */}
          {eating ? (
            <ellipse cx="100" cy="110" rx="10" ry="8" fill="#7c2d12" />
          ) : mood === 'hungry' ? (
            <path d="M92,110 q8,-5 16,0" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <path d="M88,107 q12,10 24,0" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          )}
        </g>
      </svg>
    </div>
  )
}

// ── קונפטי מסך מלא ──
function Confetti() {
  const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f6c445']
  const pieces = Array.from({ length: 90 }, (_, i) => i)
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 900, overflow: 'hidden' }}>
      {pieces.map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: '-4%',
          left: (i * 37 % 100) + '%',
          width: 8 + (i % 3) * 4,
          height: 12 + (i % 4) * 3,
          background: colors[i % colors.length],
          borderRadius: i % 2 ? '50%' : 2,
          animation: `confetti-fall ${2.2 + (i % 5) * 0.35}s linear ${(i % 10) * 0.12}s forwards`,
          transform: `rotate(${i * 47}deg)`,
        }} />
      ))}
    </div>
  )
}

export default function KidsApp() {
  const [state, setState] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('dragon') // dragon | steps | album
  const [eating, setEating] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [growFlash, setGrowFlash] = useState(false)
  const [stepConfettiShown, setStepConfettiShown] = useState(false)
  const [cracks, setCracks] = useState(0)
  const [nameInput, setNameInput] = useState('')
  const fileRef = useRef(null)

  // טעינה + מעבר יום
  useEffect(() => {
    let s = loadState()
    const tk = todayKey()
    if (s && s.today?.date !== tk) {
      s = { ...s, today: { date: tk, checks: {}, steps: 0, grew: false } }
      saveState(s)
    }
    setState(s)
    setLoaded(true)
  }, [])

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveState(next)
      return next
    })
  }, [])

  // סנכרון מושהה לשרת אחרי כל שינוי
  const syncTimer = useRef(null)
  useEffect(() => {
    if (!state || !state.familyCode) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => syncToServer(state), 1500)
    return () => clearTimeout(syncTimer.current)
  }, [state])

  const [codeInput, setCodeInput] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [codeStatus, setCodeStatus] = useState(null) // null | checking | ok | bad
  const connectFamily = async () => {
    const code = codeInput.trim()
    if (!code) return
    setCodeStatus('checking')
    try {
      const res = await supabase.from('clients').select('name').eq('password', code).maybeSingle()
      if (res.data) {
        update(prev => ({ ...prev, familyCode: code, parentName: res.data.name }))
        setCodeStatus('ok')
        setTimeout(() => setShowCode(false), 1200)
      } else {
        setCodeStatus('bad')
      }
    } catch (e) { setCodeStatus('bad') }
  }

  // ── בקיעה ──
  const crackEgg = () => {
    if (cracks < 4) { setCracks(cracks + 1); if (navigator.vibrate) navigator.vibrate(30); return }
    setCracks(5)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3000)
  }

  const hatch = () => {
    if (!nameInput.trim()) return
    update({
      name: nameInput.trim(),
      growthDays: 0,
      today: { date: todayKey(), checks: {}, steps: 0, grew: false },
      album: [],
    })
  }

  // ── האכלה ──
  const toggleCheck = (k) => {
    if (!state) return
    const checks = { ...state.today.checks }
    const turningOn = !checks[k]
    checks[k] = turningOn
    let grew = state.today.grew
    let growthDays = state.growthDays
    const full = CHECKS.every(c => checks[c.k])
    if (turningOn) {
      setEating(true)
      setTimeout(() => setEating(false), 600)
      if (navigator.vibrate) navigator.vibrate(40)
    }
    if (full && !grew) {
      grew = true
      growthDays = growthDays + 1
      setConfetti(true)
      setGrowFlash(true)
      setTimeout(() => setConfetti(false), 3500)
      setTimeout(() => setGrowFlash(false), 2600)
      if (navigator.vibrate) navigator.vibrate([80, 60, 120])
    }
    update({ ...state, growthDays, today: { ...state.today, checks, grew } })
  }

  // ── צעדים ──
  const setSteps = (n) => {
    if (!state) return
    const steps = Math.max(0, Math.min(30000, n))
    const hitGoal = steps >= STEP_GOAL && (state.today.steps || 0) < STEP_GOAL
    update({ ...state, today: { ...state.today, steps } })
    if (hitGoal) {
      setConfetti(true)
      setStepConfettiShown(true)
      setTimeout(() => setConfetti(false), 3500)
      if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 160])
    }
  }

  // ── אלבום ──
  const addPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file || !state) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas')
      const maxW = 420
      const ratio = Math.min(1, maxW / img.width)
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, c.width, c.height)
      // הדרקון מצטרף לתמונה 🐉
      ctx.font = `${Math.round(c.width * 0.16)}px serif`
      ctx.fillText('🐉', c.width * 0.03, c.height * 0.97)
      const thumb = c.toDataURL('image/jpeg', 0.72)
      URL.revokeObjectURL(url)
      update(prev => {
        const album = [{ date: todayKey(), thumb }, ...(prev.album || [])].slice(0, 30)
        return { ...prev, album }
      })
    }
    img.src = url
    e.target.value = ''
  }

  if (!loaded) return null

  const css = (
    <style>{`
      @keyframes dragon-idle { 0%,100% { transform: scale(1) } 50% { transform: scale(1.025) } }
      @keyframes dragon-eat { 0% { transform: scale(1) } 35% { transform: scale(1.14) rotate(-3deg) } 70% { transform: scale(0.96) rotate(2deg) } 100% { transform: scale(1) } }
      @keyframes confetti-fall { to { top: 105%; transform: rotate(720deg) } }
      @keyframes grow-flash { 0% { transform: scale(0.6); opacity: 0 } 25% { transform: scale(1.15); opacity: 1 } 75% { transform: scale(1); opacity: 1 } 100% { opacity: 0 } }
      @keyframes egg-wobble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-6deg) } 75% { transform: rotate(6deg) } }
      * { -webkit-tap-highlight-color: transparent; }
    `}</style>
  )

  // ═══ מסך בקיעה ═══
  if (!state) {
    const hatched = cracks >= 5
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0ea5e9,#38bdf8 55%,#bae6fd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        {css}
        {confetti && <Confetti />}
        {!hatched ? (
          <>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 26, marginBottom: 6 }}>מצאת ביצה מסתורית! 🥚</div>
            <div style={{ color: '#e0f2fe', fontSize: 16, marginBottom: 30 }}>לחצו עליה כדי לבקוע ({5 - cracks} לחיצות)</div>
            <div onClick={crackEgg} style={{ cursor: 'pointer', animation: cracks ? 'egg-wobble 0.4s ease' : 'dragon-idle 2.5s ease-in-out infinite', fontSize: 130, userSelect: 'none', filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))' }}>
              {cracks === 0 ? '🥚' : cracks < 3 ? '🥚' : '🐣'}
            </div>
            {cracks > 0 && cracks < 5 && (
              <div style={{ color: '#fff', fontSize: 22, marginTop: 18, fontWeight: 800 }}>{'💥'.repeat(cracks)}</div>
            )}
          </>
        ) : (
          <>
            <Dragon stage={STAGES[0]} mood="happy" eating={false} size={200} />
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: '10px 0 4px' }}>נולד לך דרקון! 🎉</div>
            <div style={{ color: '#e0f2fe', fontSize: 15, marginBottom: 18 }}>הוא צריך מאמן. איך קוראים לו?</div>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="שם הדרקון..."
              style={{ padding: '14px 18px', borderRadius: 16, border: 'none', fontSize: 20, textAlign: 'center', width: 230, fontWeight: 800, outline: 'none' }} />
            <button onClick={hatch} disabled={!nameInput.trim()}
              style={{ marginTop: 14, padding: '16px 44px', borderRadius: 18, border: 'none', background: nameInput.trim() ? '#f59e0b' : '#94a3b8', color: '#fff', fontSize: 20, fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
              אני המאמן! 💪
            </button>
          </>
        )}
      </div>
    )
  }

  // ═══ האפליקציה ═══
  const stage = stageFor(state.growthDays)
  const nextStage = STAGES.find(s => s.min > state.growthDays)
  const checks = state.today.checks || {}
  const checkedCount = CHECKS.filter(c => checks[c.k]).length
  const mood = checkedCount === 0 ? 'hungry' : 'happy'
  const steps = state.today.steps || 0
  const stepPct = Math.min(100, (steps / STEP_GOAL) * 100)
  const hour = new Date().getHours()
  const dragonMood = hour >= 21 || hour < 6 ? 'sleep' : mood

  const bigBtn = (active, color) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '14px 6px', borderRadius: 20, cursor: 'pointer',
    border: active ? `3.5px solid ${color}` : '3px dashed #cbd5e1',
    background: active ? color + '22' : '#fff',
    transition: 'all 0.15s',
  })

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#7dd3fc,#e0f2fe 40%,#f0fdf4)', fontFamily: 'Arial, sans-serif', paddingBottom: 90 }}>
      {css}
      {confetti && <Confetti />}

      {/* כותרת */}
      <div style={{ textAlign: 'center', padding: '18px 16px 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1' }}>המאמן של</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#0c4a6e' }}>{state.name} 🐉</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 99, padding: '4px 14px', marginTop: 6, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>{stage.name}</span>
          {nextStage && <span style={{ fontSize: 11, color: '#94a3b8' }}>· עוד {nextStage.min - state.growthDays} ימי כוח לשלב הבא</span>}
        </div>
        <div style={{ marginTop: 6 }}>
          {state.familyCode ? (
            <span style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 700 }}>🔗 מחובר למשפחת {state.parentName || ''}</span>
          ) : (
            <button onClick={() => setShowCode(true)} style={{ border: 'none', background: 'none', fontSize: 10.5, color: '#94a3b8', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              🔑 להורים: חיבור קוד משפחה
            </button>
          )}
        </div>
      </div>

      {/* חלון קוד משפחה */}
      {showCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 24, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>🔑</div>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#1e293b', marginBottom: 4 }}>חיבור קוד משפחה</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>להורים: הקלידו את הקוד האישי שקיבלתם מאתי — כך ההתקדמות תגיע גם אליה למעקב</div>
            <input value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeStatus(null) }} placeholder="הקוד שלכם..."
              style={{ padding: '12px 16px', borderRadius: 14, border: '2px solid ' + (codeStatus === 'bad' ? '#ef4444' : '#e2e8f0'), fontSize: 17, textAlign: 'center', width: '100%', boxSizing: 'border-box', outline: 'none', fontWeight: 700 }} />
            {codeStatus === 'bad' && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 700 }}>קוד לא מזוהה — בדקו עם אתי</div>}
            {codeStatus === 'ok' && <div style={{ fontSize: 13, color: '#16a34a', marginTop: 6, fontWeight: 800 }}>✓ מחובר! ההתקדמות תגיע לאתי</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={connectFamily} disabled={codeStatus === 'checking'}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                {codeStatus === 'checking' ? 'בודק...' : 'חיבור'}
              </button>
              <button onClick={() => setShowCode(false)}
                style={{ padding: '13px 18px', borderRadius: 14, border: '2px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═ טאב דרקון ═ */}
      {tab === 'dragon' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {growFlash && (
              <div style={{ position: 'absolute', top: 6, fontWeight: 900, fontSize: 20, color: '#d97706', animation: 'grow-flash 2.6s ease forwards', zIndex: 5, background: '#fffbeb', borderRadius: 99, padding: '8px 22px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                {state.name} גדל! 🎉
              </div>
            )}
            <Dragon stage={stage} mood={dragonMood} eating={eating} size={210} />
            <div style={{ background: '#fff', borderRadius: 16, padding: '8px 18px', marginTop: -6, fontSize: 14.5, fontWeight: 700, color: '#334155', boxShadow: '0 3px 14px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 300 }}>
              {dragonMood === 'sleep' ? `${state.name} ישן... נתראה מחר 💤`
                : checkedCount === 0 ? `אני רעב... תאכל ואני אוכל איתך! 🥺`
                : checkedCount < 5 ? `יאמי!! עוד ${5 - checkedCount} ואני גדל!! 😋`
                : `וואו איזה מאמן!! היום גדלתי בזכותך! 🏆`}
            </div>
          </div>

          {/* מד אנרגיה */}
          <div style={{ display: 'flex', gap: 5, margin: '16px 0 6px', justifyContent: 'center' }}>
            {CHECKS.map(c => (
              <div key={c.k} style={{ width: 46, height: 12, borderRadius: 99, background: checks[c.k] ? 'linear-gradient(90deg,#22c55e,#84cc16)' : '#e2e8f0', transition: 'background 0.3s' }} />
            ))}
          </div>

          {/* צ'קים צהריים */}
          <div style={{ background: '#fff', borderRadius: 22, padding: 16, marginTop: 12, boxShadow: '0 4px 18px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#c2410c', marginBottom: 10 }}>🌞 צהריים — מה נתת לדרקון?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {CHECKS.filter(c => c.meal === 'צהריים').map(c => (
                <div key={c.k} onClick={() => toggleCheck(c.k)} style={bigBtn(checks[c.k], '#f97316')}>
                  <span style={{ fontSize: 34 }}>{c.emoji}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: checks[c.k] ? '#c2410c' : '#64748b' }}>{c.label}</span>
                  {checks[c.k] && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 900 }}>✓ אכלנו!</span>}
                </div>
              ))}
            </div>
          </div>

          {/* צ'קים ערב */}
          <div style={{ background: '#fff', borderRadius: 22, padding: 16, marginTop: 12, boxShadow: '0 4px 18px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#6d28d9', marginBottom: 10 }}>🌙 ערב — ארוחת לילה טוב</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CHECKS.filter(c => c.meal === 'ערב').map(c => (
                <div key={c.k} onClick={() => toggleCheck(c.k)} style={bigBtn(checks[c.k], '#8b5cf6')}>
                  <span style={{ fontSize: 34 }}>{c.emoji}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: checks[c.k] ? '#6d28d9' : '#64748b' }}>{c.label}</span>
                  {checks[c.k] && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 900 }}>✓ אכלנו!</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═ טאב צעדים ═ */}
      {tab === 'steps' && (
        <div style={{ padding: '10px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 4px 18px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0c4a6e', marginBottom: 4 }}>👟 מסלול המנצחים</div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 16 }}>כמה צעדת היום? (מהשעון של אמא/אבא)</div>

            <div style={{ fontSize: 44, fontWeight: 900, color: steps >= STEP_GOAL ? '#16a34a' : '#0369a1', lineHeight: 1 }}>
              {steps.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>מתוך {STEP_GOAL.toLocaleString()} צעדים</div>

            {/* פס התקדמות עם תחנות */}
            <div style={{ position: 'relative', height: 60, margin: '0 6px' }}>
              <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 14, background: '#e2e8f0', borderRadius: 99 }} />
              <div style={{ position: 'absolute', top: 24, right: 0, width: stepPct + '%', height: 14, background: 'linear-gradient(90deg,#22c55e,#0ea5e9)', borderRadius: 99, transition: 'width 0.5s' }} />
              {STEP_STOPS.map(st => {
                const pos = (st.at / STEP_GOAL) * 100
                const passed = steps >= st.at
                return (
                  <div key={st.at} style={{ position: 'absolute', right: `calc(${Math.min(100, pos)}% - 14px)`, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                    <span style={{ fontSize: 20, filter: passed ? 'none' : 'grayscale(1) opacity(0.5)' }}>{st.emoji}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: passed ? '#16a34a' : '#94a3b8', marginTop: 22 }}>{st.label}</span>
                  </div>
                )
              })}
            </div>

            {steps >= STEP_GOAL && (
              <div style={{ background: 'linear-gradient(135deg,#fef9c3,#fde68a)', borderRadius: 16, padding: '12px 16px', margin: '14px 0 4px', fontWeight: 900, color: '#a16207', fontSize: 16 }}>
                🏰🎉 הגעת לטירת האלופים!! ניצחוווון!
              </div>
            )}

            {/* הזנת צעדים */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              {[500, 1000].map(n => (
                <button key={n} onClick={() => setSteps(steps + n)}
                  style={{ padding: '12px 20px', borderRadius: 14, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                  ‎+{n.toLocaleString()}
                </button>
              ))}
              <button onClick={() => setSteps(0)}
                style={{ padding: '12px 16px', borderRadius: 14, border: '2px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                איפוס
              </button>
            </div>
            <input type="number" inputMode="numeric" placeholder="או הקלידו מספר מדויק..." value={steps || ''}
              onChange={e => setSteps(parseInt(e.target.value) || 0)}
              style={{ marginTop: 12, padding: '12px 16px', borderRadius: 14, border: '2px solid #e2e8f0', fontSize: 16, textAlign: 'center', width: 210, outline: 'none', fontWeight: 700 }} />

            {steps >= STEP_GOAL && (
              <a href={`https://wa.me/?text=${encodeURIComponent(`🏰 ניצחתי!! הגעתי היום ל-${steps.toLocaleString()} צעדים והדרקון ${state.name} גאה בי! 🐉💪`)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'block', marginTop: 14, padding: '13px', borderRadius: 14, background: '#25D366', color: '#fff', fontWeight: 900, fontSize: 15, textDecoration: 'none' }}>
                📤 לספר לאמא ואבא בוואטסאפ!
              </a>
            )}
          </div>
        </div>
      )}

      {/* ═ טאב אלבום ═ */}
      {tab === 'album' && (
        <div style={{ padding: '10px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 4px 18px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0c4a6e', textAlign: 'center' }}>📸 אלבום הגיבור</div>
            <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', marginBottom: 14 }}>צלמו את הצלחות הכי שוות — {state.name} מצטרף לכל תמונה!</div>
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'block', width: '100%', padding: '16px', borderRadius: 16, border: '3px dashed #7dd3fc', background: '#f0f9ff', color: '#0369a1', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
              📷 צלמו צלחת חדשה!
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={addPhoto} style={{ display: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              {(state.album || []).map((p, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.12)', position: 'relative' }}>
                  <img src={p.thumb} alt="" style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, padding: '3px 8px', textAlign: 'left' }}>{p.date}</div>
                </div>
              ))}
            </div>
            {(!state.album || state.album.length === 0) && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 16 }}>עוד אין תמונות — הצלחת הראשונה שלך מחכה! ✨</div>
            )}
          </div>
        </div>
      )}

      {/* ניווט תחתון */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', zIndex: 100 }}>
        {[
          { k: 'dragon', l: 'הדרקון שלי', i: '🐉' },
          { k: 'steps', l: 'צעדים', i: '👟' },
          { k: 'album', l: 'אלבום', i: '📸' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ flex: 1, padding: '10px 0 12px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderTop: tab === t.k ? '3.5px solid #0ea5e9' : '3.5px solid transparent' }}>
            <span style={{ fontSize: 24 }}>{t.i}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: tab === t.k ? '#0369a1' : '#94a3b8' }}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { CatchVeggie, ChallengeWheel, SecretMission, HeroWorkout, MemoryGame, DailyTrivia, TrophyRoom } from './games'

// ─────────────────────────────────────────────────────────────
// מאמן הדרקון — אפליקציית ילדים "בין הראש לצלחת"
// עיקרון: הילד הוא המאמן, הדרקון הוא זה שבתהליך.
// אין קלוריות, אין משקל, אין אשמה — רק אנרגיה, כוח וגדילה.
// שמירה מקומית במכשיר (localStorage) — פשוט ובטוח לפיילוט.
// ─────────────────────────────────────────────────────────────

const STORE_KEY = 'dragon_coach_v1'
const STAGES = [
  { min: 0, name: 'גור דרקון', scale: 0.6 },
  { min: 7, name: 'דרקון צעיר', scale: 0.8 },
  { min: 14, name: 'דרקון מכונף', scale: 0.98, wings: true },
  { min: 21, name: 'דרקון זהב', scale: 1.14, wings: true, gold: true },
]
// ── יעד צעדים שגדל עם הדרקון: חודש 1 = 4,000 · חודש 2 = 6,000 · חודש 3+ = 7,500 ──
const MONTH_GOALS = [4000, 6000, 7500]
function monthOf(growthDays) { return Math.floor((growthDays || 0) / 30) }
function stepGoalFor(growthDays) { return MONTH_GOALS[Math.min(2, monthOf(growthDays))] }
// אביזר חדש בכל יום גדילה בתוך השבוע — תגמול נראה מיידי; בסוף שבוע — קפיצת גודל
const ACCESSORY_NAMES = ['כובע מסיבה 🎩', 'עניבת פרפר 🎀', 'נעליים אדומות 👟', 'משקפי שמש 😎', 'צעיף 🧣', 'בלון 🎈']
const CHECKS = [
  { k: 'lp', meal: 'צהריים', label: 'חלבון', emoji: '🍗' },
  { k: 'lv', meal: 'צהריים', label: 'ירק', emoji: '🥦' },
  { k: 'lc', meal: 'צהריים', label: 'פחמימה', emoji: '🍚' },
  { k: 'dp', meal: 'ערב', label: 'חלבון', emoji: '🥚' },
  { k: 'dv', meal: 'ערב', label: 'ירק', emoji: '🥕' },
]
const STEP_STOPS = [
  { frac: 0.15, label: 'הטיילת', emoji: '🌊' },
  { frac: 0.4, label: 'הגשר', emoji: '🌉' },
  { frac: 0.7, label: 'היער', emoji: '🌲' },
  { frac: 1.0, label: 'טירת האלופים', emoji: '🏰' },
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
        new_foods: (s.alien && s.alien.foods) || [],
        aliens_caught: s.aliens || 0,
        games: s.counters || {},
        snapshot: {
          name: s.name, growthDays: s.growthDays, aliens: s.aliens || 0,
          counters: s.counters || {}, allFoods: s.allFoods || [], alien: s.alien || null,
        },
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

// ── הדרקון עצמו — עם אביזרים שנצברים, תינוקות וביצה ──
function Dragon({ stage, mood, eating, size = 190, accessories = 0, babies = 0, eggSoon = false }) {
  const body = stage.gold ? '#f6c445' : '#5fd068'
  const bodyDark = stage.gold ? '#dfa321' : '#3fae4e'
  const belly = stage.gold ? '#fdeeb8' : '#d3f5d6'
  const s = stage.scale
  const acc = n => accessories >= n
  return (
    <div style={{ animation: eating ? 'dragon-eat 0.55s ease' : 'dragon-idle 3s ease-in-out infinite', transformOrigin: 'bottom center' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* תינוקות דרקון — האחריות של החודשים הבאים */}
        {babies >= 1 && (
          <g transform="translate(22 158) scale(0.5)">
            <ellipse cx="0" cy="10" rx="24" ry="20" fill="#8fe08f" />
            <ellipse cx="0" cy="-8" rx="18" ry="15" fill="#8fe08f" />
            <circle cx="-6" cy="-10" r="2.8" fill="#1f2937" />
            <circle cx="6" cy="-10" r="2.8" fill="#1f2937" />
            <path d="M-5,-2 q5,4 10,0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {babies >= 2 && (
          <g transform="translate(178 160) scale(0.44)">
            <ellipse cx="0" cy="10" rx="24" ry="20" fill="#a5e6a5" />
            <ellipse cx="0" cy="-8" rx="18" ry="15" fill="#a5e6a5" />
            <circle cx="-6" cy="-10" r="2.8" fill="#1f2937" />
            <circle cx="6" cy="-10" r="2.8" fill="#1f2937" />
            <path d="M-5,-2 q5,4 10,0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {/* ביצה — לקראת סוף החודש */}
        {eggSoon && (
          <g transform="translate(174 168)">
            <ellipse cx="0" cy="0" rx="13" ry="17" fill="#fffbeb" stroke="#e8d9a8" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur="1.2s" repeatCount="indefinite" />
            </ellipse>
          </g>
        )}
        <g transform={`translate(100 108) scale(${s}) translate(-100 -108)`}>
          {!stage.wings && (
            <>
              <path d="M58,102 C44,92 40,104 48,114 C54,118 60,114 62,107 Z" fill={bodyDark} opacity="0.85" />
              <path d="M142,102 C156,92 160,104 152,114 C146,118 140,114 138,107 Z" fill={bodyDark} opacity="0.85" />
            </>
          )}
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
          <path d="M142,150 C168,150 180,134 176,112 C174,104 168,100 162,102 C170,116 160,138 138,144 Z" fill={body} />
          <path d="M172,112 L188,96 L192,116 Z" fill={bodyDark} />
          <ellipse cx="100" cy="120" rx="52" ry="48" fill={body} />
          <ellipse cx="100" cy="132" rx="32" ry="28" fill={belly} />
          <ellipse cx="72" cy="164" rx="14" ry="10" fill={bodyDark} />
          <ellipse cx="128" cy="164" rx="14" ry="10" fill={bodyDark} />
          {/* 👟 נעליים אדומות */}
          {acc(3) && (
            <>
              <ellipse cx="72" cy="166" rx="15" ry="9" fill="#ef4444" />
              <ellipse cx="128" cy="166" rx="15" ry="9" fill="#ef4444" />
              <path d="M60,164 q12,-5 24,0" fill="none" stroke="#fff" strokeWidth="2" />
              <path d="M116,164 q12,-5 24,0" fill="none" stroke="#fff" strokeWidth="2" />
            </>
          )}
          <path d="M76,68 C66,58 63,44 73,37 C77,46 81,56 84,66 Z" fill="#fff0c9" stroke={bodyDark} strokeWidth="2" />
          <path d="M124,68 C134,58 137,44 127,37 C123,46 119,56 116,66 Z" fill="#fff0c9" stroke={bodyDark} strokeWidth="2" />
          <path d="M88,56 L93,41 L98,54 Z" fill={bodyDark} />
          <path d="M97,52 L102,36 L107,51 Z" fill={bodyDark} />
          <path d="M106,54 L112,41 L116,56 Z" fill={bodyDark} />
          <ellipse cx="100" cy="86" rx="44" ry="36" fill={body} />
          <ellipse cx="58" cy="86" rx="9" ry="14" fill={bodyDark} />
          <ellipse cx="142" cy="86" rx="9" ry="14" fill={bodyDark} />
          <ellipse cx="100" cy="104" rx="21" ry="14" fill={belly} stroke={bodyDark} strokeWidth="1.5" />
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
          {/* 😎 משקפי שמש */}
          {acc(4) && mood !== 'sleep' && (
            <>
              <rect x="72" y="76" width="24" height="16" rx="7" fill="#1f2937" opacity="0.92" />
              <rect x="104" y="76" width="24" height="16" rx="7" fill="#1f2937" opacity="0.92" />
              <line x1="96" y1="82" x2="104" y2="82" stroke="#1f2937" strokeWidth="3" />
              <circle cx="80" cy="80" r="2.5" fill="#fff" opacity="0.5" />
              <circle cx="112" cy="80" r="2.5" fill="#fff" opacity="0.5" />
            </>
          )}
          <circle cx="94" cy="98" r="2.2" fill={bodyDark} />
          <circle cx="106" cy="98" r="2.2" fill={bodyDark} />
          {eating ? (
            <ellipse cx="100" cy="110" rx="10" ry="8" fill="#7c2d12" />
          ) : mood === 'hungry' ? (
            <path d="M92,110 q8,-5 16,0" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <path d="M88,107 q12,10 24,0" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {/* 🧣 צעיף */}
          {acc(5) && (
            <>
              <rect x="80" y="114" width="40" height="11" rx="5.5" fill="#f97316" />
              <rect x="103" y="121" width="11" height="22" rx="5" fill="#fb923c" />
            </>
          )}
          {/* 🎀 עניבת פרפר */}
          {acc(2) && (
            <>
              <path d="M100,122 L84,113 L84,131 Z" fill="#ec4899" />
              <path d="M100,122 L116,113 L116,131 Z" fill="#ec4899" />
              <circle cx="100" cy="122" r="4.5" fill="#be185d" />
            </>
          )}
          {/* 🎩 כובע מסיבה */}
          {acc(1) && (
            <>
              <path d="M100,22 L84,58 L116,58 Z" fill="#8b5cf6" />
              <path d="M92,40 L108,40 L104,49 L96,49 Z" fill="#facc15" />
              <circle cx="100" cy="20" r="6" fill="#fbbf24" />
            </>
          )}
          {/* 🎈 בלון */}
          {acc(6) && (
            <g>
              <path d="M152,108 C158,84 162,62 160,44" fill="none" stroke="#94a3b8" strokeWidth="1.8" />
              <ellipse cx="160" cy="34" rx="12" ry="15" fill="#a855f7">
                <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2s" repeatCount="indefinite" />
              </ellipse>
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}

// ── החייזר — נבנה ממאכלים חדשים: כל טעימה חדשה מוסיפה חלק ──
// סדר החלקים: עין, עין, אף, פה, אנטנות, ידיים, ובסוף — גוף!
const ALIEN_PARTS = ['עין ראשונה 👁️', 'עין שנייה 👀', 'אף 👃', 'פה 👄', 'אנטנות 📡', 'ידיים 💪', 'גוף שלם 🕺']

function Alien({ parts, dancing, size = 170 }) {
  const skin = '#9ee06f'
  const skinDark = '#6cbb45'
  const hasBody = parts >= 7
  return (
    <div style={{ animation: dancing ? 'alien-dance 0.55s ease-in-out infinite' : 'dragon-idle 3s ease-in-out infinite', transformOrigin: 'bottom center' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* גוף — מגיע אחרון! עד אז הראש מרחף */}
        {hasBody && (
          <g>
            <ellipse cx="100" cy="150" rx="34" ry="30" fill={skin} />
            <ellipse cx="100" cy="158" rx="20" ry="16" fill="#c8f0a8" />
            {/* רגליים */}
            <ellipse cx="82" cy="182" rx="11" ry="8" fill={skinDark} />
            <ellipse cx="118" cy="182" rx="11" ry="8" fill={skinDark} />
          </g>
        )}
        {/* ידיים — לפני הגוף הן נדבקות לראש (מצחיק בכוונה) */}
        {parts >= 6 && (
          <g>
            <path d={hasBody ? 'M66,140 C48,130 42,118 48,110' : 'M60,100 C42,94 36,82 42,74'} fill="none" stroke={skinDark} strokeWidth="9" strokeLinecap="round" />
            <path d={hasBody ? 'M134,140 C152,130 158,118 152,110' : 'M140,100 C158,94 164,82 158,74'} fill="none" stroke={skinDark} strokeWidth="9" strokeLinecap="round" />
          </g>
        )}
        {/* אנטנות */}
        {parts >= 5 && (
          <g>
            <line x1="82" y1="38" x2="72" y2="16" stroke={skinDark} strokeWidth="5" strokeLinecap="round" />
            <circle cx="70" cy="13" r="7" fill="#f59e0b" />
            <line x1="118" y1="38" x2="128" y2="16" stroke={skinDark} strokeWidth="5" strokeLinecap="round" />
            <circle cx="130" cy="13" r="7" fill="#f59e0b" />
          </g>
        )}
        {/* ראש */}
        <ellipse cx="100" cy={hasBody ? 78 : 100} rx="48" ry="44" fill={skin} stroke={skinDark} strokeWidth="2.5" />
        <g transform={hasBody ? 'translate(0 -22)' : ''}>
          {/* עיניים */}
          {parts >= 1 && (
            <g>
              <ellipse cx="82" cy="94" rx="12" ry="16" fill="#1f2937" transform="rotate(-12 82 94)" />
              <circle cx="85" cy="88" r="4" fill="#fff" />
            </g>
          )}
          {parts >= 2 && (
            <g>
              <ellipse cx="118" cy="94" rx="12" ry="16" fill="#1f2937" transform="rotate(12 118 94)" />
              <circle cx="121" cy="88" r="4" fill="#fff" />
            </g>
          )}
          {/* אף */}
          {parts >= 3 && (
            <g>
              <circle cx="96" cy="112" r="2.5" fill={skinDark} />
              <circle cx="104" cy="112" r="2.5" fill={skinDark} />
            </g>
          )}
          {/* פה */}
          {parts >= 4 && (
            dancing
              ? <ellipse cx="100" cy="126" rx="9" ry="7" fill="#7c2d12" />
              : <path d="M88,124 q12,10 24,0" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {/* בלי חלקים בכלל — סימן שאלה עדין */}
          {parts === 0 && (
            <text x="100" y="108" textAnchor="middle" fontSize="30" fill={skinDark} fontWeight="900">?</text>
          )}
        </g>
        {dancing && (
          <>
            <text x="30" y="60" fontSize="20">🎵</text>
            <text x="160" y="46" fontSize="20">🎶</text>
          </>
        )}
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

  // טעינה + מעבר יום + קוד משפחה מהקישור (?code=) — הגעה מכניסת מסלול ילד
  useEffect(() => {
    let s = loadState()
    const tk = todayKey()
    if (s && s.today?.date !== tk) {
      s = { ...s, today: { date: tk, checks: {}, steps: 0, grew: false } }
      saveState(s)
    }
    const qcode = new URLSearchParams(window.location.search).get('code')
    if (qcode) {
      if (s && !s.familyCode) {
        s = { ...s, familyCode: qcode }
        saveState(s)
      } else if (!s) {
        try { localStorage.setItem('dragon_pending_code', qcode) } catch (e) {}
      }
      // מאמתים ומעדכנים שם הורה ברקע
      supabase.from('clients').select('name, password').ilike('password', qcode).limit(1).then(res => {
        const row = res.data && res.data[0]
        if (row) {
          setState(prev => {
            if (!prev) return prev
            const next = { ...prev, familyCode: row.password || qcode, parentName: row.name }
            saveState(next)
            return next
          })
        }
      })
    }
    // המשכיות: אין נתונים במכשיר או שהשרת מתקדם יותר — משחזרים מהשרת
    const knownCode = qcode || (s && s.familyCode)
    if (knownCode) {
      supabase.from('daily_logs').select('log_date, checks')
        .eq('client_name', 'kid:' + knownCode)
        .order('log_date', { ascending: false }).limit(1)
        .then(res => {
          const row = res.data && res.data[0]
          const snap = row && row.checks && row.checks.snapshot
          if (!snap || !snap.name) return
          setState(prev => {
            if (prev && (prev.growthDays || 0) >= (snap.growthDays || 0)) return prev
            const sameDay = row.log_date === tk
            const next = {
              name: snap.name,
              growthDays: snap.growthDays || 0,
              aliens: snap.aliens || 0,
              counters: snap.counters || {},
              allFoods: snap.allFoods || [],
              alien: snap.alien || { start: null, foods: [] },
              album: (prev && prev.album) || [],
              familyCode: knownCode,
              parentName: prev && prev.parentName,
              today: sameDay
                ? { date: tk, checks: row.checks.checks || {}, steps: row.checks.steps || 0, grew: !!row.checks.grew }
                : { date: tk, checks: {}, steps: 0, grew: false },
            }
            saveState(next)
            return next
          })
        })
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
      const res0 = await supabase.from('clients').select('name, password').ilike('password', code).limit(1)
      const res = { data: res0.data && res0.data[0] }
      if (res.data) {
        update(prev => ({ ...prev, familyCode: res.data.password || code, parentName: res.data.name }))
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
    let pendingCode = null
    try { pendingCode = localStorage.getItem('dragon_pending_code') } catch (e) {}
    update({
      name: nameInput.trim(),
      growthDays: 0,
      today: { date: todayKey(), checks: {}, steps: 0, grew: false },
      album: [],
      ...(pendingCode ? { familyCode: pendingCode } : {}),
    })
    if (pendingCode) {
      supabase.from('clients').select('name, password').ilike('password', pendingCode).limit(1).then(res => {
        const row = res.data && res.data[0]
        if (row) update(prev => ({ ...prev, familyCode: row.password, parentName: row.name }))
      })
      try { localStorage.removeItem('dragon_pending_code') } catch (e) {}
    }
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
    const goal = stepGoalFor(state.growthDays || 0)
    const steps = Math.max(0, Math.min(30000, n))
    const hitGoal = steps >= goal && (state.today.steps || 0) < goal
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
      const maxW = 800
      const ratio = Math.min(1, maxW / img.width)
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, c.width, c.height)
      // הדרקון מצטרף לתמונה 🐉
      ctx.font = `${Math.round(c.width * 0.16)}px serif`
      ctx.fillText('🐉', c.width * 0.03, c.height * 0.97)
      const thumb = c.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(url)
      update(prev => {
        const album = [{ date: todayKey(), thumb }, ...(prev.album || [])].slice(0, 30)
        return { ...prev, album }
      })
    }
    img.src = url
    e.target.value = ''
  }

  // שיתוף יצירה — Web Share (וואטסאפ/גלריה), נפילה להורדה
  const sharePhoto = async (thumb) => {
    try {
      const blob = await (await fetch(thumb)).blob()
      const file = new File([blob], 'meal-art.jpg', { type: 'image/jpeg' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: 'תראו איזו ארוחה מצוירת יצרתי! 🎨🐉' })
        return
      }
    } catch (e) {}
    const a = document.createElement('a')
    a.href = thumb
    a.download = 'meal-art.jpg'
    a.click()
  }

  // ── חייזר המאכלים החדשים ──
  const [foodInput, setFoodInput] = useState('')
  const [foodMsg, setFoodMsg] = useState(null)
  const alien = state?.alien || { start: null, foods: [] }
  const allFoods = state?.allFoods || []
  const alienParts = Math.min(7, alien.foods.length)
  const alienDone = alienParts >= 7

  const addFood = () => {
    const name = foodInput.trim()
    if (!name || !state) return
    const norm = name.replace(/\s+/g, ' ')
    if (allFoods.some(f => f === norm)) {
      setFoodMsg({ type: 'dup', text: 'כבר טעמת את זה! משהו חדש-חדש 😉' })
      setTimeout(() => setFoodMsg(null), 2500)
      return
    }
    const foods = [...alien.foods, norm]
    const done = foods.length >= 7
    update(prev => ({
      ...prev,
      alien: { start: prev.alien?.start || todayKey(), foods },
      allFoods: [...(prev.allFoods || []), norm],
      aliens: done ? (prev.aliens || 0) + 1 : (prev.aliens || 0),
    }))
    setFoodInput('')
    if (navigator.vibrate) navigator.vibrate(50)
    if (done) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 4000)
      if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 180])
    } else {
      setFoodMsg({ type: 'ok', text: `אמיץ!! נוספה ${ALIEN_PARTS[foods.length - 1]}` })
      setTimeout(() => setFoodMsg(null), 2500)
    }
  }

  const newAlien = () => {
    update(prev => ({ ...prev, alien: { start: null, foods: [] } }))
  }

  // ── מערכת האנרגיה: התנהגות אמיתית ⟵ ⚡ ⟵ סיבובי משחק ──
  const [activeGame, setActiveGame] = useState(null)
  const counters = state?.counters || {}
  const t2 = state?.today || {}
  const energyEarned =
    CHECKS.filter(c => (t2.checks || {})[c.k]).length +
    ((t2.steps || 0) >= stepGoalFor(state?.growthDays || 0) ? 2 : 0) +
    (t2.wheelDone ? 1 : 0) +
    (t2.workoutDone ? 1 : 0) +
    (t2.triviaRight ? 1 : 0)
  const energy = Math.max(0, energyEarned - (t2.energySpent || 0))

  const bumpCounter = (key, val) => {
    update(prev => ({ ...prev, counters: { ...(prev.counters || {}), [key]: val(((prev.counters || {})[key]) || 0) } }))
  }
  const setTodayField = (fields) => {
    update(prev => ({ ...prev, today: { ...prev.today, ...fields } }))
  }
  const spendEnergy = () => setTodayField({ energySpent: (t2.energySpent || 0) + 1 })

  const openGame = (key, costsEnergy) => {
    if (costsEnergy && energy <= 0) return
    if (costsEnergy) spendEnergy()
    setActiveGame(key)
  }

  if (!loaded) return null

  const css = (
    <style>{`
      @keyframes dragon-idle { 0%,100% { transform: scale(1) } 50% { transform: scale(1.025) } }
      @keyframes dragon-eat { 0% { transform: scale(1) } 35% { transform: scale(1.14) rotate(-3deg) } 70% { transform: scale(0.96) rotate(2deg) } 100% { transform: scale(1) } }
      @keyframes confetti-fall { to { top: 105%; transform: rotate(720deg) } }
      @keyframes grow-flash { 0% { transform: scale(0.6); opacity: 0 } 25% { transform: scale(1.15); opacity: 1 } 75% { transform: scale(1); opacity: 1 } 100% { opacity: 0 } }
      @keyframes egg-wobble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-6deg) } 75% { transform: rotate(6deg) } }
      @keyframes alien-dance { 0%,100% { transform: rotate(-7deg) translateX(-7px) } 50% { transform: rotate(7deg) translateX(7px) } }
      @keyframes pop-in { 0% { transform: scale(0.2); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
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
  const month = monthOf(state.growthDays)
  const babies = Math.min(2, month)
  const eggSoon = (state.growthDays % 30) >= 27 && state.growthDays > 0
  const accessories = state.growthDays % 7
  const STEP_GOAL = stepGoalFor(state.growthDays)
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
          {babies > 0 && <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 800 }}>· הורה ל-{babies} 🐣</span>}
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
                {state.growthDays % 7 === 0 ? state.name + ' גדל בגוף!! 🎉' : state.name + ' קיבל ' + ACCESSORY_NAMES[(state.growthDays % 7) - 1] + '!'}
              </div>
            )}
            <Dragon stage={stage} mood={dragonMood} eating={eating} size={210} accessories={accessories} babies={babies} eggSoon={eggSoon} />
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
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>מתוך {STEP_GOAL.toLocaleString()} צעדים · יעד חודש {month + 1}{month < 2 ? ' (יגדל עם הדרקון! 🐉)' : ' 🏆'}</div>

            {/* פס התקדמות עם תחנות */}
            <div style={{ position: 'relative', height: 60, margin: '0 6px' }}>
              <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 14, background: '#e2e8f0', borderRadius: 99 }} />
              <div style={{ position: 'absolute', top: 24, right: 0, width: stepPct + '%', height: 14, background: 'linear-gradient(90deg,#22c55e,#0ea5e9)', borderRadius: 99, transition: 'width 0.5s' }} />
              {STEP_STOPS.map(st => {
                const at = Math.round(st.frac * STEP_GOAL)
                const pos = st.frac * 100
                const passed = steps >= at
                return (
                  <div key={st.label} style={{ position: 'absolute', right: `calc(${Math.min(100, pos)}% - 14px)`, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
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
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0c4a6e', textAlign: 'center' }}>🎨 אלבום הארוחות המצוירות</div>
            <div style={{ background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 14, padding: '10px 14px', fontSize: 13, color: '#9a3412', fontWeight: 700, textAlign: 'center', margin: '8px 0 12px', lineHeight: 1.7 }}>המשימה: ליצור פרצוף מאוכל בצלחת! 😄<br/>עיניים, אף, פה — ואולי גם עניבה או כובע?<br/>כמה שיותר פרטים = יצירת מופת!</div>
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'block', width: '100%', padding: '16px', borderRadius: 16, border: '3px dashed #7dd3fc', background: '#f0f9ff', color: '#0369a1', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
              📷 צלמו את היצירה!
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={addPhoto} style={{ display: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              {(state.album || []).map((p, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.12)' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={p.thumb} alt="" style={{ width: '100%', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, padding: '3px 8px', textAlign: 'left' }}>{p.date}</div>
                  </div>
                  <button onClick={() => sharePhoto(p.thumb)}
                    style={{ display: 'block', width: '100%', padding: '9px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 900, fontSize: 12.5, cursor: 'pointer' }}>📤 לשלוח לאמא ואבא!</button>
                </div>
              ))}
            </div>
            {(!state.album || state.album.length === 0) && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 16 }}>עוד אין תמונות — הצלחת הראשונה שלך מחכה! ✨</div>
            )}
          </div>
        </div>
      )}

      {/* ═ טאב חייזר ═ */}
      {tab === 'alien' && (
        <div style={{ padding: '10px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 4px 18px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#166534' }}>👽 בונים חייזר!</div>
            <div style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 6px', lineHeight: 1.6 }}>
              טעמת מאכל שאף פעם לא טעמת? (לא חטיף ולא ממתק 😉)<br/>כל טעימה אמיצה מוסיפה לחייזר חלק — ב-7 הוא קם לרקוד!
            </div>
            {(state.aliens || 0) > 0 && (
              <div style={{ display: 'inline-block', background: '#f0fdf4', borderRadius: 99, padding: '3px 14px', fontSize: 12, fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                האוסף שלי: {'👽'.repeat(Math.min(8, state.aliens))} {state.aliens > 8 ? `×${state.aliens}` : ''}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Alien parts={alienParts} dancing={alienDone} />
            </div>
            {alienDone ? (
              <>
                <div style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius: 16, padding: '12px 16px', fontWeight: 900, color: '#166534', fontSize: 16, marginBottom: 10 }}>
                  🕺🎉 החייזר קם לחיים ורוקד לכבודך!!
                </div>
                <button onClick={newAlien}
                  style={{ padding: '13px 30px', borderRadius: 14, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                  👽 מתחילים חייזר חדש!
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', margin: '2px 0 12px' }}>
                  {ALIEN_PARTS.map((p, i) => (
                    <div key={i} style={{ width: 30, height: 8, borderRadius: 99, background: i < alienParts ? '#16a34a' : '#e2e8f0' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 10 }}>
                  {alienParts}/7 · החלק הבא: {ALIEN_PARTS[alienParts]}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={foodInput} onChange={e => setFoodInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFood()}
                    placeholder="מה טעמת בפעם הראשונה?"
                    style={{ flex: 1, padding: '13px 14px', borderRadius: 14, border: '2px solid #bbf7d0', fontSize: 15, outline: 'none', fontWeight: 700, minWidth: 0 }} />
                  <button onClick={addFood}
                    style={{ padding: '13px 20px', borderRadius: 14, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    טעמתי!
                  </button>
                </div>
                {foodMsg && (
                  <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 800, color: foodMsg.type === 'ok' ? '#16a34a' : '#d97706' }}>{foodMsg.text}</div>
                )}
              </>
            )}
            {alien.foods.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                {alien.foods.map((f, i) => (
                  <span key={i} style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#166534' }}>🍽️ {f}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═ טאב משחקים ═ */}
      {tab === 'games' && (
        <div style={{ padding: '10px 16px' }}>
          {/* מד אנרגיה */}
          <div style={{ background: 'linear-gradient(135deg,#fef9c3,#fde68a)', borderRadius: 18, padding: '12px 16px', marginBottom: 12, border: '2px solid #f59e0b', textAlign: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#92400e' }}>⚡ אנרגיה: {energy}</span>
            <div style={{ fontSize: 11.5, color: '#a16207', marginTop: 2 }}>
              ארוחות לדרקון, צעדים, אימון ומשימות ממלאים אנרגיה — משחקים משתמשים בה!
            </div>
          </div>

          {activeGame === null && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { k: 'catch', n: 'תפוס את הירק!', e: '🥦', sub: 'שיא: ' + (counters.bestCatch || 0), cost: true },
                { k: 'memory', n: 'זיכרון המאכלים', e: '🧠', sub: 'מצאו זוגות', cost: true },
                { k: 'wheel', n: 'גלגל האתגר', e: '🎡', sub: t2.wheelSpun ? 'המשימה שלך ↓' : 'סיבוב יומי', cost: false },
                { k: 'workout', n: 'אימון הגיבור', e: '💪', sub: t2.workoutDone ? 'הושלם! 🏅' : 'נותן ⚡', cost: false },
                { k: 'secret', n: 'משימה חשאית', e: '🕵️', sub: t2.secretDone ? 'בוצע 🥷' : 'ססס... 🤫', cost: false },
                { k: 'trivia', n: 'חידת הכוח', e: '❓', sub: t2.triviaDone ? 'ענית היום' : 'נותנת ⚡', cost: false },
                { k: 'trophies', n: 'ארון הגביעים', e: '🏆', sub: 'ההישגים שלי', cost: false },
              ].map(g => {
                const locked = g.cost && energy <= 0
                return (
                  <div key={g.k} onClick={() => !locked && openGame(g.k, g.cost)}
                    style={{
                      background: '#fff', borderRadius: 18, padding: '16px 10px', textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.07)', cursor: locked ? 'default' : 'pointer',
                      opacity: locked ? 0.55 : 1, border: '2px solid ' + (locked ? '#e2e8f0' : '#bae6fd'),
                    }}>
                    <div style={{ fontSize: 36 }}>{g.e}</div>
                    <div style={{ fontWeight: 900, fontSize: 13.5, color: '#0c4a6e', marginTop: 4 }}>{g.n}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{locked ? 'צריך ⚡ — סמן ארוחה!' : g.sub}{g.cost && !locked ? ' · עולה ⚡1' : ''}</div>
                  </div>
                )
              })}
            </div>
          )}

          {activeGame !== null && (
            <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 4px 18px rgba(0,0,0,0.07)' }}>
              <button onClick={() => setActiveGame(null)}
                style={{ border: 'none', background: 'none', color: '#0369a1', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 10, padding: 0 }}>
                → חזרה למשחקים
              </button>
              {activeGame === 'catch' && (
                <CatchVeggie best={counters.bestCatch || 0}
                  onEnd={(score) => { if (score > (counters.bestCatch || 0)) bumpCounter('bestCatch', () => score) }} />
              )}
              {activeGame === 'memory' && (
                <MemoryGame onWin={() => bumpCounter('memoryWins', v => v + 1)} />
              )}
              {activeGame === 'wheel' && (
                <ChallengeWheel spun={!!t2.wheelSpun} mission={t2.wheelMission} missionDone={!!t2.wheelDone}
                  onSpin={(m) => { setTodayField({ wheelSpun: true, wheelMission: m }); bumpCounter('spins', v => v + 1) }}
                  onDone={() => { setTodayField({ wheelDone: true }); setConfetti(true); setTimeout(() => setConfetti(false), 2500) }} />
              )}
              {activeGame === 'workout' && (
                <HeroWorkout dateStr={t2.date || todayKey()} doneToday={!!t2.workoutDone}
                  onFinish={() => { setTodayField({ workoutDone: true }); bumpCounter('workouts', v => v + 1); setConfetti(true); setTimeout(() => setConfetti(false), 3000); if (navigator.vibrate) navigator.vibrate([80, 50, 120]) }} />
              )}
              {activeGame === 'secret' && (
                <SecretMission dateStr={t2.date || todayKey()} revealed={!!t2.secretRevealed} done={!!t2.secretDone}
                  onReveal={() => setTodayField({ secretRevealed: true })}
                  onDone={() => { setTodayField({ secretDone: true }); bumpCounter('secrets', v => v + 1) }} />
              )}
              {activeGame === 'trivia' && (
                <DailyTrivia dateStr={t2.date || todayKey()} answered={!!t2.triviaDone} wasRight={!!t2.triviaRight}
                  onAnswer={(right) => { setTodayField({ triviaDone: true, triviaRight: right }); if (right) bumpCounter('triviaRight', v => v + 1) }} />
              )}
              {activeGame === 'trophies' && (
                <TrophyRoom counters={counters} growthDays={state.growthDays || 0} aliens={state.aliens || 0} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ניווט תחתון */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', zIndex: 100 }}>
        {[
          { k: 'dragon', l: 'הדרקון', i: '🐉' },
          { k: 'steps', l: 'צעדים', i: '👟' },
          { k: 'games', l: 'משחקים', i: '🎮' },
          { k: 'alien', l: 'חייזר', i: '👽' },
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

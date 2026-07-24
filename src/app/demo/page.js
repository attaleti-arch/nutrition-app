'use client'
import { useState, useRef, useEffect } from 'react'

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  teal: '#0d9488', tealLight: '#f0fdfa',
  agent: '#4a9b8e', agentLight: '#e8f5f2',
  orange: '#f97316', orangeLight: '#fff7ed',
}

// Mock client: נועה, 28y, 62kg, 164cm, ירידה במשקל, regular
const CLIENT = {
  name: 'נועה',
  goal: 'ירידה במשקל',
  stage: 2,
  stageName: 'שלב הצמיחה · בניית הרגלים',
  streak: 12,
  weeklyDays: 5,
  targets: { calories: 1440, protein: 94, carbs: 126, fat: 46 },
}

// מה נועה אכלה היום — יומן מלא ויפה
const MOCK_LOG = {
  boker: [
    { id: 'b_kotej', text: 'קוטג׳ 5% (150 גרם)', done: true },
    { id: 'b4', text: 'פריכית דגנים מלאים × 2', done: true },
    { id: 'b8', text: '½ אבוקדו', done: true },
  ],
  lunch: {
    prot: { id: 'p10', text: 'חזה עוף (130 גרם)', done: true },
    carb: { id: 'c4', text: 'בטטה אפויה (120 גרם)', done: true },
    fat: { id: 'f1', text: 'כף שמן זית', done: true },
    veggies: [
      { id: 'v1', text: 'סלט טרי — מלפפון, עגבנייה, לימון + מלח', done: true },
      { id: 'v2', text: 'ירקות קלויים בתנור, 150 גרם', done: false },
    ],
  },
  erev: [
    { id: 'b_gvina_levana_erev', text: 'גבינה לבנה 5% (100 גרם)', done: false },
    { id: 'e4', text: '2 פריכיות דגנים', done: false },
  ],
  benayim: { id: 'ben1', text: 'תפוח ירוק קטן', done: true },
  water: 6,
  steps: 8240,
  sport: true,
}

// מאקרו שאכלה בפועל עד כה
const EATEN = { calories: 987, protein: 79, carbs: 82, fat: 34 }

function pct(val, target) { return Math.min(100, Math.round((val / target) * 100)) }

function MacroBar({ label, eaten, target, color, unit = 'g' }) {
  const p = pct(eaten, target)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', marginBottom: 3 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: p >= 100 ? C.greenMid : '#6b7280' }}>{eaten}{unit} / {target}{unit} <span style={{ fontWeight: 800, color: p >= 100 ? C.greenMid : C.orange }}>{p}%</span></span>
      </div>
      <div style={{ height: 7, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: p + '%', height: '100%', background: p >= 100 ? C.greenMid : color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function CheckItem({ text, done, color = C.greenMid }) {
  const [checked, setChecked] = useState(done)
  return (
    <button onClick={() => setChecked(v => !v)} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '12px 14px', borderRadius: 12, border: '1.5px solid ' + (checked ? color : '#e5e7eb'),
      background: checked ? (color === C.greenMid ? C.greenLight : C.tealLight) : '#fafafa',
      cursor: 'pointer', textAlign: 'right', marginBottom: 6,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', border: '2px solid ' + (checked ? color : '#d1d5db'),
        background: checked ? color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.2s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? '#1f2937' : '#6b7280', flex: 1 }}>{text}</span>
    </button>
  )
}

function Section({ title, icon, children, accent = C.greenMid, bg = '#f0fdf4' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb', marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ background: bg, padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{title}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  )
}

function DiaryTab() {
  return (
    <div>
      {/* ארוחת בוקר */}
      <Section title="ארוחת בוקר" icon="🌅" accent={C.greenDark} bg={C.greenLight}>
        {MOCK_LOG.boker.map(i => <CheckItem key={i.id} text={i.text} done={i.done} color={C.greenMid} />)}
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
          ☕ לפני: קפה שחור או עם חלב שקדים
        </div>
      </Section>

      {/* ביניים */}
      <Section title="ביניים" icon="🍎" accent="#d97706" bg="#fffbeb">
        <CheckItem text={MOCK_LOG.benayim.text} done={MOCK_LOG.benayim.done} color="#d97706" />
      </Section>

      {/* ארוחת צהריים */}
      <Section title="ארוחת צהריים" icon="🍽️" accent={C.teal} bg={C.tealLight}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 6 }}>💪 חלבון</div>
        <CheckItem text={MOCK_LOG.lunch.prot.text} done={MOCK_LOG.lunch.prot.done} color={C.teal} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6, marginTop: 8 }}>🍞 פחמימה</div>
        <CheckItem text={MOCK_LOG.lunch.carb.text} done={MOCK_LOG.lunch.carb.done} color="#d97706" />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 6, marginTop: 8 }}>🫒 שומן</div>
        <CheckItem text={MOCK_LOG.lunch.fat.text} done={MOCK_LOG.lunch.fat.done} color="#7c3aed" />
        <div style={{ fontSize: 11, fontWeight: 700, color: C.greenMid, marginBottom: 6, marginTop: 8 }}>🥦 ירקות</div>
        {MOCK_LOG.lunch.veggies.map(i => <CheckItem key={i.id} text={i.text} done={i.done} color={C.greenMid} />)}
      </Section>

      {/* ארוחת ערב */}
      <Section title="ארוחת ערב" icon="🌙" accent="#4338ca" bg="#eef2ff">
        {MOCK_LOG.erev.map(i => <CheckItem key={i.id} text={i.text} done={i.done} color="#4338ca" />)}
      </Section>

      {/* מים + פעילות */}
      <Section title="מעקב יומי" icon="📊" accent={C.agent} bg={C.agentLight}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
          {[
            { icon: '💧', label: 'מים', value: MOCK_LOG.water + ' כוסות', color: '#0284c7' },
            { icon: '🚶', label: 'צעדים', value: MOCK_LOG.steps.toLocaleString(), color: C.greenMid },
            { icon: '🏃', label: 'אימון', value: MOCK_LOG.sport ? '✅ בוצע' : 'טרם', color: MOCK_LOG.sport ? C.greenMid : '#9ca3af' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1.5px solid #e5e7eb' }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* כפתור שמירה */}
      <button style={{
        width: '100%', padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg,' + C.greenDark + ',' + C.greenMid + ')',
        color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16, marginTop: 4, marginBottom: 8,
      }}>
        💾 שמירת היומן
      </button>
    </div>
  )
}

const GUIDE_CARDS = [
  {
    title: 'הצלחת החכמה',
    icon: '🥗',
    color: C.greenMid,
    bg: C.greenLight,
    body: '50% ירקות מגוונים · 25% חלבון איכותי · 25% פחמימה מורכבת. סדר אכילה: חלבון וירק קודם, פחמימה אחרונה.',
  },
  {
    title: 'שתייה וניקוי',
    icon: '💧',
    color: '#0284c7',
    bg: '#eff6ff',
    body: 'מינימום 8 כוסות ביום (2 ליטר). כוס מים לפני כל ארוחה. קפה עד 2 כוסות. להפחית שתייה ממותקת.',
  },
  {
    title: 'ספורט ותנועה',
    icon: '🏃',
    color: '#7c3aed',
    bg: '#faf5ff',
    body: '10,000 צעדים ביום כבסיס. 3 אימוני כוח בשבוע. 30 דקות הליכה בוקר מדרבן חילוף חומרים.',
  },
  {
    title: 'שינה ורגיעה',
    icon: '😴',
    color: '#4338ca',
    bg: '#eef2ff',
    body: '7-8 שעות שינה לפחות. שינה לפני 23:00 מיטיבה עם הורמוני שובע. סטרס גבוה = קורטיזול = שמירת שומן.',
  },
  {
    title: 'אכילה מודעת',
    icon: '🧘',
    color: C.teal,
    bg: C.tealLight,
    body: 'אוכלים בלי מסכים. 20 דקות לארוחה. ללעוס לאט. המח מקבל את אות השובע אחרי 20 דקות.',
  },
  {
    title: 'הסלמה חכמה',
    icon: '📈',
    color: '#d97706',
    bg: '#fffbeb',
    body: 'מוסיפים שינוי אחד בשבוע. לא הכל בבת אחת. הצלחות קטנות בונות מומנטום לטווח ארוך.',
  },
]

function GuidesTab() {
  return (
    <div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, textAlign: 'right', lineHeight: 1.6 }}>
        🏡 המדריכים שלך לשלב הצמיחה
      </div>
      {GUIDE_CARDS.map(g => (
        <div key={g.title} style={{
          background: g.bg, border: '1.5px solid ' + g.color + '40', borderRadius: 16,
          padding: '16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{g.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: g.color }}>{g.title}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{g.body}</p>
        </div>
      ))}

      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '20px', color: '#fff', textAlign: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌟</div>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>12 ימים ברצף!</div>
        <div style={{ fontSize: 13, color: '#86efac' }}>נועה, את כוכבת של ממש. המחויבות שלך מדהימה 💪</div>
      </div>
    </div>
  )
}

const DEMO_CHAT = [
  { role: 'assistant', text: 'היי נועה! 🌿 אני כאן לעזור. כבר 12 ימים ברצף — מרשים מאוד!\nמה שאלה לי היום?' },
  { role: 'user', text: 'מה לאכול לפני אימון בצהריים?' },
  { role: 'assistant', text: '💪 לפני אימון (2-3 שעות לפני):\n\n🍌 בננה בינונית + 2 תמרים\n🥙 פיתה קטנה עם גבינה לבנה 5%\n\nישירות לפני (15-30 דקות):\n⚡ 2 תמרים בלבד — מהיר ונקי\n\nשתי לפחות 500 מל מים לפני האימון!\n\nתאמני בריאות 🏃‍♀️' },
  { role: 'user', text: 'אכלתי קצת יותר מדי ערב שלמה, אני מרגישה רע' },
  { role: 'assistant', text: 'נועה, זה לגמרי בסדר ❤️\n\nמעידה אחת לא מוחקת 12 ימים מדהימים. הגוף שלך גמיש!\n\nמה שעוזר עכשיו:\n🥗 ארוחת בוקר קלה מחר — סלט + חלבון בלבד\n💧 שתי 3 ליטר מים מחר לניקוי\n🚶 הליכה של 20 דקות הבוקר\n\nמה למדת מהמעידה הזו? 💭' },
]

function AgentTab() {
  const [messages, setMessages] = useState(DEMO_CHAT)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const DEMO_RESPONSES = [
    'שאלה מצוינת! 🌿 תזונה מאוזנת היא המפתח. תמיד לשלב חלבון, ירק ופחמימה מורכבת. מה עוד מסתקרן אותך?',
    'נועה, את בדרך הנכונה 💪 המחויבות שלך ל-12 ימים ברצף מדברת בעד עצמה. המשיכי כך!',
    'טיפ של היום: שתי כוס מים לפני כל ארוחה — זה מפחית רעב ב-20% ומשפר עיכול 💧',
  ]
  const [demoIdx, setDemoIdx] = useState(0)

  function send() {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { role: 'assistant', text: DEMO_RESPONSES[demoIdx % DEMO_RESPONSES.length] }])
      setDemoIdx(i => i + 1)
    }, 1400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: 360 }}>
      <div style={{ background: 'linear-gradient(135deg,' + C.agent + ',#3d8a7e)', borderRadius: 16, padding: '14px 16px', marginBottom: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15 }}>עוזר החירום</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', marginLeft: 5, verticalAlign: 'middle' }} />
            מחובר · בין הראש לצלחת
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
            <div style={{
              maxWidth: '82%', padding: '11px 14px', borderRadius: m.role === 'user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
              background: m.role === 'user' ? '#f3f4f6' : C.agentLight,
              border: m.role === 'assistant' ? '1px solid ' + C.agent + '40' : 'none',
              fontSize: 13, lineHeight: 1.7, color: '#1f2937', whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 4px 16px', background: C.agentLight, border: '1px solid ' + C.agent + '40' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 7, height: 7, borderRadius: '50%', background: C.agent,
                    animation: 'bounce 1.2s infinite', animationDelay: j * 0.2 + 's',
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="שאלי אותי כל דבר..."
          style={{
            flex: 1, padding: '12px 14px', borderRadius: 14, border: '1.5px solid ' + C.agent + '60',
            fontSize: 14, outline: 'none', background: '#fff', direction: 'rtl',
          }}
        />
        <button onClick={send} style={{
          padding: '12px 18px', borderRadius: 14, background: C.agent, color: '#fff',
          border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16,
        }}>➤</button>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  )
}

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('diary')

  const cal = EATEN.calories
  const calTarget = CLIENT.targets.calories
  const calPct = pct(cal, calTarget)

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', direction: 'rtl', fontFamily: 'Heebo, system-ui, sans-serif' }}>
      {/* demo banner */}
      <div style={{ background: '#fbbf24', padding: '6px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#78350f', position: 'sticky', top: 0, zIndex: 100 }}>
        ⭐ מצב הדגמה — בין הראש לצלחת · אתי אטל
      </div>

      {/* header */}
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '22px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת · אתי אטל</div>
            <div style={{ fontSize: 11, background: '#ffffff25', color: '#fff', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>🏆 {CLIENT.stageName}</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>היי {CLIENT.name}!</div>
          <div style={{ fontSize: 12, color: '#bbf7d0', marginBottom: 10 }}>שבת, 12 יולי 2026</div>

          {/* calorie bar */}
          <div style={{ background: '#ffffff20', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#86efac', marginBottom: 6 }}>
              <span>🔥 {cal} קל אכלת</span>
              <span>יעד: {calTarget} קל</span>
            </div>
            <div style={{ position: 'relative', height: 18, background: '#ffffff20', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: calPct + '%', height: '100%', background: '#4ade80', borderRadius: 99, transition: 'width 0.4s' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                {calPct}%
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>נשאר {calTarget - cal} קל להיום</div>
          </div>

          {/* streak */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: '#ffffff15', borderRadius: 10, padding: '6px 12px', fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>🔥 {CLIENT.streak} ימים ברצף</div>
            <div style={{ background: '#ffffff15', borderRadius: 10, padding: '6px 12px', fontSize: 12, color: '#86efac', fontWeight: 700 }}>📅 {CLIENT.weeklyDays}/7 השבוע</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '10px 14px 0' }}>
        {/* tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'diary', label: '📅 היומן', activeColor: C.greenMid, activeBg: C.greenLight, activeText: C.greenDark },
            { key: 'guides', label: '🏡 מדריכים', activeColor: C.teal, activeBg: C.tealLight, activeText: C.teal },
            { key: 'agent', label: '🤖 Agent', activeColor: C.agent, activeBg: C.agentLight, activeText: C.agent, dot: true },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === t.key ? t.activeColor : '#e5e7eb'),
              background: activeTab === t.key ? t.activeBg : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              color: activeTab === t.key ? t.activeText : '#555', position: 'relative',
            }}>
              {t.dot && <span style={{ position: 'absolute', top: 4, left: 4, width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />}
              {t.label}
            </button>
          ))}
        </div>

        {/* macro bars (diary only) */}
        {activeTab === 'diary' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 10 }}>📊 מאקרו להיום</div>
            <MacroBar label="💪 חלבון" eaten={EATEN.protein} target={CLIENT.targets.protein} color={C.teal} />
            <MacroBar label="🍞 פחמימות" eaten={EATEN.carbs} target={CLIENT.targets.carbs} color="#d97706" />
            <MacroBar label="🫒 שומן" eaten={EATEN.fat} target={CLIENT.targets.fat} color="#7c3aed" />
          </div>
        )}

        {/* tab content */}
        {activeTab === 'diary' && <DiaryTab />}
        {activeTab === 'guides' && <GuidesTab />}
        {activeTab === 'agent' && <AgentTab />}

        <div style={{ height: 24 }} />
      </div>

      {/* floating calorie bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e5e7eb', padding: '8px 16px 12px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', marginBottom: 3 }}>
                <span>🔥 {cal} קל</span>
                <span style={{ color: C.greenMid, fontWeight: 700 }}>נשאר {calTarget - cal} קל</span>
                <span>{calTarget} קל</span>
              </div>
              <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: calPct + '%', height: '100%', background: C.greenMid, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.greenDark, flexShrink: 0 }}>{calPct}%</div>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
            💪 {EATEN.protein}g / {CLIENT.targets.protein}g חלבון {EATEN.protein >= CLIENT.targets.protein ? '✅' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

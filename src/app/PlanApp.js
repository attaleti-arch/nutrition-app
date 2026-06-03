'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import WelcomeDocument from './WelcomeDocument'

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  orange: '#f97316', orangeLight: '#fff7ed',
  purple: '#9333ea', purpleLight: '#faf5ff',
  blue: '#0284c7', blueLight: '#eff6ff',
  amber: '#d97706', amberLight: '#fffbeb',
  teal: '#0d9488', tealLight: '#f0fdfa',
  agent: '#4a9b8e', agentLight: '#e8f5f2',
}

const DIET_TYPES = [
  { key: 'regular', label: 'אוכלת הכל', icon: '🍗' },
  { key: 'vegetarian', label: 'צמחונית', icon: '🥚' },
  { key: 'vegan', label: 'טבעונית', icon: '🌱' },
  { key: 'keto', label: 'קיטו', icon: '🥑' },
]

const RESTRICTIONS = [
  { key: 'no_gluten', label: 'ללא גלוטן', icon: '🌾' },
  { key: 'no_lactose', label: 'ללא לקטוז', icon: '🥛' },
  { key: 'no_nuts', label: 'ללא אגוזים', icon: '🥜' },
  { key: 'no_eggs', label: 'ללא ביצים', icon: '🥚' },
  { key: 'no_fish', label: 'ללא דגים', icon: '🐟' },
  { key: 'no_sugar', label: 'ללא סוכר מוסף', icon: '🍬' },
]

const SPORT_OPTIONS = [
  { key: 'yoga', label: 'יוגה', icon: '🧘' },
  { key: 'swim', label: 'שחייה', icon: '🏊' },
  { key: 'bike', label: 'אופניים', icon: '🚴' },
  { key: 'gym', label: 'כושר', icon: '🏋️' },
  { key: 'run', label: 'ריצה', icon: '🏃' },
  { key: 'dance', label: 'ריקוד', icon: '💃' },
  { key: 'pilates', label: 'פילאטיס', icon: '🤸' },
  { key: 'other', label: 'אחר', icon: '⚡' },
]

const ACTIVITY_LEVELS = ['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל']
const ACTIVITY_MULT = { 'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9 }
const GOALS_LIST = ['ירידה במשקל', 'שמירה על משקל', 'עלייה במסה']
const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}

const BONUS_RECIPES = [
  { title: 'כדורי אנרגיה מעוררים', cal: '85 קל ליחידה', ingredients: 'תמרים, אגוזי מלך, קקאו איכותי, מעט קוקוס' },
  { title: 'מאפי חלבון אקספרס', cal: '140 קל למאפה', ingredients: 'גבינה לבנה 5%, ביצה, קמח כוסמין, שום שמיר' },
  { title: 'שייק ירוק מרענן ומאזן', cal: '180 קל למנה', ingredients: 'חופן תרד, חצי תפוח ירוק, משקה שקדים, מנת חלבון' }
]

const PLAN = {
  bokerSnack: 'לפני: נס קפה + חטיף בריאות עד 99 קל',
  boker: [
    { id: 'b1', text: 'משקה / חטיף חלבון', tags: [] },
    { id: 'b3', text: 'מעדן פרו + פרי', tags: ['vegan'] },
    { id: 'b4', text: '3 פריכיות + קוטג׳ 3% + דבש', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b10', text: 'גבינה לבנה / בולגרית / צפתית 5% + ירקות', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b6', text: 'פיתה כוסמין / 4 פריכיות / 2 פרוסות לחם שיפון', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'b7', text: 'ביצים קשות / חביתה + ירקות', tags: [], hide: ['vegan', 'no_eggs'] },
    { id: 'b8', text: 'אבוקדו + ירקות', tags: ['vegan', 'keto'] },
    { id: 'b9', text: 'שיבולת שועל + חלב / משקה צמחי', hide: ['keto'], tags: ['vegetarian'] },
  ],
  carbOptions: [
    { id: 'c1', text: '150 גרם אורז מלא / קינואה', hide: ['keto', 'no_gluten'] },
    { id: 'c2', text: '200 גרם בורגול / כוסמת', hide: ['keto', 'no_gluten'] },
    { id: 'c4', text: '170 גרם תפוחי אדמה / בטטה', hide: ['keto'] },
    { id: 'c5', text: '150 גרם כרובית / ברוקולי (קיטו)', tags: ['keto'] },
    { id: 'c6', text: '150 גרם עדשים / חומוס מבושל', tags: ['vegan'] },
    { id: 'c7', text: '100 גרם שעועית לבנה / אדומה', tags: ['vegan'] },
  ],
  protOptions: [
    { id: 'p1', text: '200 גרם דג לבן (אמנון / בקלה)', hide: ['vegan', 'no_fish'] },
    { id: 'p2', text: '100 גרם סלמון', hide: ['vegan', 'no_fish'] },
    { id: 'p9', text: '100 גרם טונה / סרדינים', hide: ['vegan', 'no_fish'] },
    { id: 'p12', text: '150 גרם חזה עוף', hide: ['vegan', 'vegetarian'] },
    { id: 'p5', text: '140 גרם ירך עוף / 100 גרם הודו טחון', hide: ['vegan', 'vegetarian'] },
    { id: 'p3', text: '150 גרם טופו', tags: ['vegan'] },
    { id: 'p8', text: '3 ביצים / אומלט', hide: ['vegan', 'no_eggs'] },
    { id: 'p11', text: '150 גרם מג׳דרה (עדשים + אורז)', tags: ['vegan'] },
    { id: 'p6', text: '2 המבורגר צמחוני', tags: ['vegan'] },
    { id: 'p13', text: '200 גרם גרגירי חומוס מבושל', tags: ['vegan'] },
    { id: 'p14', text: '200 גרם עדשים מבושלות', tags: ['vegan'] },
    { id: 'p15', text: '150 גרם שעועית / פול מבושל', tags: ['vegan'] },
    { id: 'p16', text: '150 גרם אדממה', tags: ['vegan'] },
    { id: 'p17', text: '200 גרם קוטג׳ 3% / גבינה לבנה 5%', hide: ['vegan', 'no_lactose'] },
    { id: 'p18', text: '200 גרם יוגורט יווני 0%', hide: ['vegan', 'no_lactose'] },
  ],
  fatOptions: [
    { id: 'f1', text: 'כף שמן זית', tags: ['vegan', 'keto'] },
    { id: 'f2', text: '2 כפות טחינה גולמית', tags: ['vegan'] },
    { id: 'f3', text: '50 גרם אבוקדו (רבע)', tags: ['vegan', 'keto'] },
    { id: 'f4', text: 'חופן אגוזי מלך / שקדים (30 גרם)', tags: ['vegan', 'keto'], hide: ['no_nuts'] },
    { id: 'f5', text: '30 גרם גבינה צהובה 5%', hide: ['vegan', 'no_lactose'] },
  ],
  veggieOptions: [
    { id: 'v1', text: 'סלט טרי — מלפפון, עגבנייה, לימון + מלח' },
    { id: 'v2', text: 'ירקות קלויים בתנור (זוקיני, פלפל, חציל, ברוקולי)' },
    { id: 'v3', text: 'ירקות מאודים (ברוקולי, כרובית, גזר)' },
    { id: 'v4', text: 'סלט עלים ירוקים (תרד, רוקט, חסה)' },
  ],
  erev: [
    { id: 'e1', text: 'קוטג׳ / גבינה לבנה 5% + ירקות טריים', hide: ['vegan', 'no_lactose'] },
    { id: 'e2', text: '50 גרם ברנפלקס + חלב / משקה צמחי', hide: ['keto'] },
    { id: 'e4', text: 'פיתה / 4 פריכיות / 2 פרוסות לחם שיפון', hide: ['keto', 'no_gluten'] },
    { id: 'e5', text: 'סלט ירקות + טחינה / שמן זית', tags: ['vegan', 'keto'] },
    { id: 'e6', text: 'יוגורט יווני 0% + פירות יער', hide: ['vegan', 'no_lactose', 'keto'] },
    { id: 'e7', text: '2 ביצים קשות + ירקות', hide: ['vegan', 'no_eggs'] },
    { id: 'e8', text: '100 גרם עדשים מבושלות + ירקות', tags: ['vegan'] },
  ],
  benayimOptions: [
    { id: 'ben1', text: 'פרי עונתי (תפוח / אגס / קיווי)' },
    { id: 'ben2', text: 'חופן אגוזים / שקדים (5-6 יחידות)' },
    { id: 'ben3', text: 'חטיף בריאות / חלבון עד 150 קל' },
    { id: 'ben4', text: 'יוגורט 0% + פרי', hide: ['vegan', 'no_lactose'] },
  ],
  rules: [
    { icon: '💧', text: 'לפחות 2-3 ליטר מים ביום' },
    { icon: '☕', text: 'עד 2 קפה ביום' },
    { icon: '🥦', text: 'חצי צלחת = ירקות תמיד!' },
    { icon: '🔄', text: 'ניתן להחליף בין הארוחות - לא להוסיף' },
    { icon: '🍳', text: 'בישול בתרסיס שמן בלבד!' },
    { icon: '😴', text: '7 שעות שינה לפחות' },
    { icon: '🚶', text: '10,000 צעדים ביום' },
  ],
}

const AGENT_SYSTEM_PROMPT = `אתה "עוזר החירום" של תוכנית "בין הראש לצלחת" – מבוסס שיטת אתי אטל.

## זהותך
אתה עוזר תזונתי קליני חם, מעצים ומקצועי. לא רופא — מלווה תזונתי שמדבר בשפה חיובית ומחזיר כוח ללקוחה.

## 🚨 כלל חירום — מוחלט
כאב חד בחזה / קוצר נשימה / נפיחות פתאומית / אובדן הכרה / ירידת סוכר קיצונית / כאב בטן עז → עצור הכול:
"🚨 זה נשמע כמו מצב חירום רפואי. פני בדחיפות למיון או התקשרי ל-101. אל תישארי לבד."

## 🍽️ הצלחת החכמה (שיטת אתי)
- 50% ירקות מגוונים — הבסיס תמיד
- 25-40% חלבון איכותי: דגים שמנים, עוף/הודו, ביצים, קטניות, טופו
- 15-25% פחמימה מורכבת GI נמוך: בטטה, קינואה, כוסמת, בורגול, אורז מלא
- 10-20% שומן מהצומח: שמן זית, אבוקדו, טחינה גולמית
- סדר אכילה: חלבון וירק קודם → פחמימה אחרונה

## 📋 6 פרוטוקולים קליניים
1. מטבולי (סוכרת, אינסולין): 40% חלבון | 30% שומן | 30% פחמימה. חלבון לפני פחמימה. פעילות: כוח + אירובי. תוספים: מגנזיום, כרום, אומגה 3.
2. קרדיולוגי (לב, כולסטרול, לחץ דם): 30% חלבון רזה | 20% שומן (אומגה 3) | 50% ירקות. ללא נתרן מיותר. פעילות: אירובי מתון בלבד. לא HIIT. תוספים: CoQ10, אומגה 3.
3. אונקולוגי: 50% חלבון | 30% שומן | 20% פחמימה מבושלת. מניעת קכקסיה. להימנע מסוכר. פעילות: תנועה מתונה.
4. בלוטת תריס (כולל כריתה): סלניום (2 אגוזי ברזיל/יום), אבץ, יוד. לא HIIT. לבותירוקסין על קיבה ריקה.
5. עיכול (קרוהן, קוליטיס, IBS, צליאק): מזון מבושל/מאודה בלבד בדלקת. 5-6 ארוחות קטנות. פרוביוטיקה. פעילות: יוגה ופילאטיס.
6. כליות וגאוט: 15-20% חלבון | הידרציה 2.5-3 ליטר | הימנעות מפורינים בגאוט.

## 🧠 גישת NLP (אתי אטל)
- "מה כן לאכול" — לא "מה אסור"
- כל כישלון = משוב. "מה למדת מהמעידה הזו?"
- "אנרגיה זורמת למקום שבו תשומת הלב מתמקדת"
- זהי רגש מאחורי אכילה רגשית → הצעי חלופה
- "תוכנית אכילה" — לא "דיאטה"

## 🏋️ תזונת ספורט
- לפני אימון (120 דק'): 250 קל', 70% פחמימות, 10-15% חלבון
- ממש לפני (10-45 דק'): בננה / 2 תמרים / לחם לבן + דבש
- אחרי אימון: 600-900 קל', 40-60% פחמימות, 20-30% חלבון

## 🚫 גבולות
- ייעוץ תזונתי בלבד. לא אבחנות, לא הפסקת תרופות.
- ספק → "התייעצי עם הרופא המטפל"

## 💬 סגנון
- עברית חמה, קצרה, חיובית
- תמיד מסיימת במשהו מעשי אחד לעשות עכשיו`

const AGENT_QUICK = [
  "🍽️ איך בונה צלחת חכמה?",
  "🏋️ מה לאכול לפני אימון?",
  "🩸 תזונה לאיזון סוכר",
  "🫀 תזונה לבריאות הלב",
  "🦋 בלוטת תריס — מה לאכול?",
  "😔 אכלתי ריגשית — מה עכשיו?",
]

function AgentChat({ clientName, gender, clientProfile }) {
  const fem = gender !== 'זכר'
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `שלום${clientName ? ' ' + clientName.split(' ')[0] : ''}! 🌿\nאני **עוזר החירום** של "בין הראש לצלחת"\nמבוסס **שיטת אתי אטל**.\n\nכאן איתך 24/7 לכל שאלה תזונתית 💚\n\n⚠️ כאב חזה / קוצר נשימה / נפיחות פתאומית → פני מיד למיון!`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function buildClientContext() {
    if (!clientProfile) return ''
    const parts = []
    if (clientProfile.goal) parts.push('מטרה: ' + clientProfile.goal)
    if (clientProfile.weight) parts.push('משקל: ' + clientProfile.weight + 'ק"ג')
    if (clientProfile.age) parts.push('גיל: ' + clientProfile.age)
    if (clientProfile.medical_history) parts.push('מחלות רקע: ' + clientProfile.medical_history)
    if (clientProfile.medications) parts.push('תרופות: ' + clientProfile.medications)
    if (clientProfile.outcome_doc) parts.push('מסע המטרה שלה:\n' + clientProfile.outcome_doc)
    return parts.length ? parts.join(' | ') : ''
  }

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')
    setShowQuick(false)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'agent',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          clientProfile: buildClientContext(),
        }),
      })
      const data = await res.json()
      const reply = data.result || 'מצטערת, נסי שוב.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בחיבור. בדקי את האינטרנט ונסי שוב.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function fmt(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/🚨([^\n]*)/g, '<span style="color:#dc2626;font-weight:700">🚨$1</span>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', borderRadius: '16px 16px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌿</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Agent חירום 24/7</div>
          <div style={{ fontSize: 11, color: '#b2dfdb' }}>בין הראש לצלחת · שיטת אתי אטל</div>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: '#ffffff20', borderRadius: 20, padding: '4px 10px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>פעיל</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8f4ef', border: '1px solid #e8f5f2', borderTop: 'none' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, animation: 'fadeUp 0.25s ease' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: '0 2px 6px rgba(74,155,142,0.3)' }}>🌿</div>
            )}
            <div
              style={msg.role === 'user' ? {
                background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff',
                borderRadius: '18px 18px 4px 18px', padding: '11px 15px', maxWidth: '78%',
                fontSize: 14, lineHeight: 1.7, boxShadow: '0 2px 10px rgba(15,76,42,0.25)',
              } : {
                background: '#fff', color: '#1a1a1a',
                borderRadius: '18px 18px 18px 4px', padding: '11px 15px', maxWidth: '82%',
                fontSize: 14, lineHeight: 1.7, border: '1px solid rgba(74,155,142,0.12)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}
              dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
            />
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌿</div>
            <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '14px 16px', border: '1px solid rgba(74,155,142,0.12)', display: 'flex', gap: 5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4a9b8e', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {showQuick && (
        <div style={{ padding: '8px 14px', background: '#f8f4ef', borderLeft: '1px solid #e8f5f2', borderRight: '1px solid #e8f5f2' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>שאלות נפוצות:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AGENT_QUICK.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{ padding: '5px 11px', borderRadius: 20, border: '1.5px solid rgba(74,155,142,0.3)', background: '#fff', color: '#3a7a6e', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '10px 14px 14px', background: '#fff', borderRadius: '0 0 16px 16px', border: '1px solid #e8f5f2', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={fem ? 'שאלי כל שאלה תזונתית...' : 'שאל כל שאלה תזונתית...'}
            rows={1} disabled={loading}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1.5px solid rgba(74,155,142,0.25)', fontSize: 14, fontFamily: 'inherit', direction: 'rtl', resize: 'none', outline: 'none', background: '#f8f4ef', maxHeight: 90, overflow: 'auto', lineHeight: 1.5 }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: '50%', background: !input.trim() || loading ? '#e5e7eb' : 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', color: !input.trim() || loading ? '#9ca3af' : '#fff', border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(180deg)', flexShrink: 0, transition: 'all 0.2s', boxShadow: !input.trim() || loading ? 'none' : '0 3px 10px rgba(74,155,142,0.4)' }}>
            ➤
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 6, marginBottom: 0 }}>⚠️ לתסמינים דחופים פני למיון · ייעוץ תזונתי בלבד</p>
      </div>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

function calcBMR(weight, height, age, gender) {
  if (!weight || !height || !age) return 0
  return gender === 'נקבה'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5
}

function calcTargets(weight, height, age, gender, activity, goal) {
  var bmr = calcBMR(weight, height, age, gender)
  if (!bmr) return null
  var tdee = bmr * (ACTIVITY_MULT[activity] || 1.55)
  var adjust = goal === 'ירידה במשקל' ? -400 : goal === 'עלייה במסה' ? 300 : 0
  var calories = Math.round(tdee + adjust)
  var split = GOALS_SPLIT[goal] || GOALS_SPLIT['ירידה במשקל']
  return {
    calories,
    protein: Math.round((calories * split.protein / 100) / 4),
    carbs: Math.round((calories * split.carbs / 100) / 4),
    fat: Math.round((calories * split.fat / 100) / 9),
  }
}

function shouldHide(item, dietType, restrictions) {
  if (!item.hide) return false
  for (var i = 0; i < item.hide.length; i++) {
    var h = item.hide[i]
    if (h === dietType) return true
    if (restrictions && restrictions[h]) return true
  }
  return false
}

function Confetti() {
  const colors = ['#16a34a','#f97316','#9333ea','#0284c7','#d97706','#0d9488','#ec4899']
  const pieces = Array.from({ length: 60 }, function(_, i) { return i })
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(function(i) {
        var color = colors[i % colors.length]
        var left = (i * 37 + 13) % 100
        var delay = (i * 0.08) % 2
        var size = 6 + (i % 4) * 3
        return <div key={i} style={{ position: 'absolute', top: -20, left: left + '%', width: size, height: size, background: color, borderRadius: i % 3 === 0 ? '50%' : 2, animation: 'fall ' + (2 + (i % 3) * 0.5) + 's ' + delay + 's ease-in forwards', opacity: 0.9 }} />
      })}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  )
}

function FeedbackCard({ feedback, clientName, logDate, onOpenFull }) {
  const [expanded, setExpanded] = useState(false)
  if (!feedback) return null
  const lines = feedback.split('\n').map(function(l) { return l.trim() }).filter(Boolean)
  const winLines = [], focusLines = [], stepsLines = [], messageLines = []
  var currentSection = 'none'
  lines.forEach(function(line) {
    const l = line.toLowerCase()
    if (l.includes('עבד') || l.includes('הצלחה') || l.includes('ניצחון') || l.includes('שמור')) { currentSection = 'win'; return }
    if (l.includes('דיוק') || l.includes('שיפור') || l.includes('משימ') || l.includes('לחזק')) { currentSection = 'focus'; return }
    if (l.includes('צעד') || l.includes('מחר') || l.includes('שבוע הבא')) { currentSection = 'steps'; return }
    if (l.includes('מסר') || l.includes('💚') || l.includes('בשבילך')) { currentSection = 'message'; return }
    if (line.startsWith('**') || line.startsWith('#') || line.startsWith('---')) return
    const clean = line.replace(/^[*#\-•>\d.]+\s*/, '').trim()
    if (!clean || clean.length < 4) return
    if (currentSection === 'win') winLines.push(clean)
    else if (currentSection === 'focus') focusLines.push(clean)
    else if (currentSection === 'steps') stepsLines.push(clean)
    else if (currentSection === 'message') messageLines.push(clean)
  })
  const hasParsed = winLines.length > 0 || focusLines.length > 0 || stepsLines.length > 0
  return (
    <div style={{ direction: 'rtl', marginBottom: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '16px 18px', marginBottom: 10, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>משוב אישי מאתי 💚</div>
            <div style={{ fontSize: 11, color: '#86efac' }}>{logDate} · אתי אטל</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#bbf7d0', lineHeight: 1.6 }}>היי {clientName ? clientName.split(' ')[0] : ''}! המשוב האישי שלי עבורך 🌿</div>
      </div>
      {hasParsed ? (
        <div>
          {winLines.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>✨</span><span style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>מה עבד — שמרי על זה!</span></div>
              {winLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#dcfce7', borderRadius: 10, marginBottom: 6 }}><span style={{ fontSize: 14, flexShrink: 0 }}>🌟</span><span style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {focusLines.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 18 }}>🎯</span><span style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>משימות לדיוק</span></div>
              {focusLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#fef3c7', borderRadius: 10, marginBottom: 6 }}><span style={{ fontSize: 13, color: '#92400e', flexShrink: 0 }}>→</span><span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {stepsLines.length > 0 && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>🚀</span><span style={{ fontWeight: 800, fontSize: 14, color: '#1e40af' }}>3 צעדים קטנים לשבוע הבא</span></div>
              {stepsLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#dbeafe', borderRadius: 10, marginBottom: 6 }}><div style={{ width: 22, height: 22, borderRadius: 99, background: '#1e40af', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div><span style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {messageLines.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#faf5ff,#f0fdf4)', border: '1.5px solid #d8b4fe', borderRadius: 16, padding: '14px 16px', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>💚</div>
              {messageLines.map(function(line, i) { return <div key={i} style={{ fontSize: 14, color: '#7c3aed', fontWeight: 700, lineHeight: 1.7, fontStyle: 'italic' }}>"{line}"</div> })}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>— אתי אטל</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{expanded ? feedback : feedback.substring(0, 200) + (feedback.length > 200 ? '...' : '')}</div>
          {feedback.length > 200 && <button onClick={function() { setExpanded(!expanded) }} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#16a34a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{expanded ? '▲ פחות' : '▼ קראי הכל'}</button>}
        </div>
      )}
      {onOpenFull && <button onClick={onOpenFull} style={{ width: '100%', padding: 11, borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>📄 פתחי את המשוב המלא</button>}
    </div>
  )
}

function MealScanner({ gender, onAdd, joinedDate }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editCal, setEditCal] = useState(0)
  const [editProtein, setEditProtein] = useState(0)
  const [editFat, setEditFat] = useState(0)
  const [editCarbs, setEditCarbs] = useState(0)
  const inputRef = useRef(null)
  const fem = gender !== 'זכר'
  var daysInApp = joinedDate ? Math.floor((Date.now() - new Date(joinedDate).getTime()) / (1000*60*60*24)) : 99
  var isLocked = daysInApp < 7
  async function handleFile(file) {
    if (!file) return
    setScanning(true); setResult(null)
    try {
      var base64 = await new Promise(function(res, rej) { var r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('שגיאה')); r.readAsDataURL(file) })
      var res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'scanMeal', imageBase64: base64, mediaType: file.type, gender: gender }) })
      var data = await res.json()
      var r2 = data.result
      setResult(r2); setEditDesc(r2.description || ''); setEditCal(r2.total_calories || 0)
      setEditProtein(r2.total_protein || 0); setEditFat(r2.total_fat || 0); setEditCarbs(r2.total_carbs || 0)
      setEditing(true)
    } catch(e) { alert('שגיאה בסריקה') }
    setScanning(false)
  }
  if (isLocked) return (
    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#f3f4f6', border: '1.5px dashed #d1d5db', textAlign: 'center' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>📸 צילום צלחת יפתח בעוד {7 - daysInApp} ימים</span>
    </div>
  )
  if (!editing || !result) return (
    <div style={{ marginTop: 10 }}>
      <input type="file" accept="image/*" ref={inputRef} style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      <button onClick={() => inputRef.current?.click()} disabled={scanning} style={{ width: '100%', padding: '10px', borderRadius: 10, background: scanning ? '#9ca3af' : '#eff6ff', color: scanning ? '#fff' : '#0284c7', border: '1.5px dashed #93c5fd', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
        {scanning ? '⏳ מנתח...' : fem ? '📸 צלמי או העלי תמונה — AI יזהה' : '📸 צלם או העלה תמונה — AI יזהה'}
      </button>
    </div>
  )
  return (
    <div style={{ marginTop: 10, background: '#eff6ff', borderRadius: 14, padding: 14, border: '1.5px solid #93c5fd' }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e40af', marginBottom: 8 }}>🤖 AI זיהה — {fem ? 'תקני' : 'תקן'} אם לא מדויק:</div>
      <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 13, marginBottom: 10, boxSizing: 'border-box', textAlign: 'right' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[{ label: '🔥 קל', val: editCal, set: setEditCal }, { label: '💪 חלבון', val: editProtein, set: setEditProtein }, { label: '🍞 פחמימה', val: editCarbs, set: setEditCarbs }, { label: '🫒 שומן', val: editFat, set: setEditFat }].map(function(f) {
          return <div key={f.label} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{f.label}</div><input type="number" value={f.val} onChange={e => f.set(Number(e.target.value) || 0)} style={{ width: '100%', padding: '6px 4px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
        })}
      </div>
      {result.confidence === 'low' && <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⚠️ ביטחון נמוך — כדאי לתקן</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { onAdd(editCal, editDesc, editProtein, editFat, editCarbs); setEditing(false); setResult(null) }} style={{ flex: 2, padding: 10, borderRadius: 10, background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✅ {fem ? 'הוסיפי' : 'הוסף'} לארוחה</button>
        <button onClick={() => { setEditing(false); setResult(null) }} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#fff', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ ביטול</button>
      </div>
    </div>
  )
}

function Section({ title, icon, accent, light, children, defaultOpen, badge, isLocked, lockMessage }) {
  const [open, setOpen] = useState(defaultOpen || false)
  if (isLocked) return (
    <div style={{ background: '#fafafa', borderRadius: 18, overflow: 'hidden', border: '1.5px dashed #d1d5db', marginBottom: 10, opacity: 0.75 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#f3f4f6' }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#6b7280', textAlign: 'right' }}>{title}</span>
        <span style={{ fontSize: 11, background: '#e5e7eb', color: '#4b5563', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>{lockMessage || 'נעול'}</span>
      </div>
    </div>
  )
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? light : '#fff', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
        {badge && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>{badge}</span>}
        <span style={{ color: accent, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '4px 18px 16px' }}>{children}</div>}
    </div>
  )
}

function CheckRow({ id, text, accent, checked, onToggle }) {
  return (
    <div onClick={() => onToggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 0.45 : 1 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checked ? accent : '#d1d5db'), background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: '#222', textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function RadioRow({ id, text, accent, selected, onSelect }) {
  const active = selected === id
  return (
    <div onClick={() => onSelect(active ? null : id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
      <div style={{ width: 18, height: 18, borderRadius: 99, border: '2px solid ' + (active ? accent : '#d1d5db'), background: active ? accent : '#fff', flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: active ? accent : '#222', fontWeight: active ? 700 : 400, flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function FreeText({ value, onChange, placeholder }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'פרטים נוספים...'} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 8, color: '#555' }} />
}

function ExtraCal({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} placeholder="קלוריות נוספות..." style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>קל</span>
    </div>
  )
}

function YesNo({ value, onChange, labelYes, labelNo, accent }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={() => onChange(true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === true ? accent : '#e5e7eb'), background: value === true ? accent : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === true ? '#fff' : '#555' }}>{labelYes}</button>
      <button onClick={() => onChange(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === false ? '#ef4444' : '#e5e7eb'), background: value === false ? '#fef2f2' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === false ? '#ef4444' : '#555' }}>{labelNo}</button>
    </div>
  )
}

function NlpSelector({ label, value, onChange, max, lowLabel, highLabel, accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: accent, fontWeight: 900 }}>{value || 0}/{max}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: max }).map(function(_, i) {
          const num = i + 1; const isActive = value === num
          return <button key={num} onClick={() => onChange(num)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid ' + (isActive ? accent : '#e5e7eb'), background: isActive ? accent : '#fff', color: isActive ? '#fff' : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{num}</button>
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
        <span>{lowLabel}</span><span>{highLabel}</span>
      </div>
    </div>
  )
}

export default function PlanApp({ clientName, userPassword }) {
  const displayName = clientName || userPassword || ''
  const dbKey = userPassword || clientName || ''
  const today = new Date().toLocaleDateString('he-IL')
  const todayKey = new Date().toLocaleDateString('sv-SE')

  const [currentStage, setCurrentStage] = useState(1)
  const [stageName, setStageName] = useState('שלב הניצוץ · מודעות')
  const [videoUrl, setVideoUrl] = useState('')
  const [pantryNotes, setPantryNotes] = useState('')
  const [showStage2Welcome, setShowStage2Welcome] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showWelcomeDoc, setShowWelcomeDoc] = useState(false)
  const [dietType, setDietType] = useState(null)
  const [restrictions, setRestrictions] = useState({})
  const [setupDone, setSetupDone] = useState(false)
  const [profileDone, setProfileDone] = useState(false)
  const [checks, setChecks] = useState({})
  const [carbSel, setCarbSel] = useState(null)
  const [protSel, setProtSel] = useState(null)
  const [fatSel, setFatSel] = useState(null)
  const [veggieSel, setVeggieSel] = useState(null)
  const [lunchOpt, setLunchOpt] = useState(null)
  const [benayimSel, setBenayimSel] = useState(null)
  const [hadSnack, setHadSnack] = useState(null)
  const [hadBenayim, setHadBenayim] = useState(null)
  const [water, setWater] = useState(0)
  const [steps, setSteps] = useState('')
  const [note, setNote] = useState('')
  const [showWAButton, setShowWAButton] = useState(false)
  const [bokerFree, setBokerFree] = useState('')
  const [lunchFree, setLunchFree] = useState('')
  const [erevFree, setErevFree] = useState('')
  const [bokerExtraCal, setBokerExtraCal] = useState(0)
  const [lunchExtraCal, setLunchExtraCal] = useState(0)
  const [erevExtraCal, setErevExtraCal] = useState(0)
  const [scanCalories, setScanCalories] = useState(0)
  const [scanDesc, setScanDesc] = useState('')
  const [scanProtein, setScanProtein] = useState(0)
  const [scanFat, setScanFat] = useState(0)
  const [scanCarbs, setScanCarbs] = useState(0)
  const [joinedDate, setJoinedDate] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [reportApproved, setReportApproved] = useState(false)
  const [activeTab, setActiveTab] = useState('diary')
  const [showDocsMenu, setShowDocsMenu] = useState(false)
  const [showInitialReport, setShowInitialReport] = useState(false)
  const [showOutcomeDoc, setShowOutcomeDoc] = useState(false)
  const [showDailyFeedback, setShowDailyFeedback] = useState(false)
  const [guideUrl, setGuideUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nutritionData, setNutritionData] = useState({})
  const [sportType, setSportType] = useState('')
  const [sportCommitDays, setSportCommitDays] = useState(2)
  const [sportDoneToday, setSportDoneToday] = useState(false)
  const [sportDaysThisWeek, setSportDaysThisWeek] = useState(0)
  const [stressLevel, setStressLevel] = useState(0)
  const [fatigueLevel, setFatigueLevel] = useState(0)
  const [hungerLevel, setHungerLevel] = useState(0)
  const [userMood, setUserMood] = useState(null)
  const [userWeight, setUserWeight] = useState('')
  const [userHeight, setUserHeight] = useState('')
  const [userAge, setUserAge] = useState('')
  const [userGender, setUserGender] = useState('נקבה')
  const [userActivity, setUserActivity] = useState('בינוני')
  const [userGoal, setUserGoal] = useState('ירידה במשקל')
  const [userTargetWeight, setUserTargetWeight] = useState('')
  const [clientData, setClientData] = useState(null) // ✅ נתוני הלקוח המלאים

  const fem = userGender !== 'זכר'
  const gf = (f, m) => fem ? f : m

  useEffect(function() {
    async function loadNutrition() {
      var { data } = await supabase.from('nutrition_data').select('*')
      var nd = {}
      if (data) data.forEach(item => nd[item.id] = item)
      setNutritionData(nd)
    }
    loadNutrition()
  }, [])

  useEffect(function() {
    async function load() {
      var client = await supabase.from('clients').select('*').eq('password', dbKey).maybeSingle()
      if (client.data) {
        var d = client.data
        setClientData(d) // ✅ שמירת כל נתוני הלקוח
        if (d.weight) { setUserWeight(String(d.weight)); setProfileDone(true) }
        if (d.height) setUserHeight(String(d.height))
        if (d.age) setUserAge(String(d.age))
        if (d.gender) setUserGender(d.gender)
        if (d.activity) setUserActivity(d.activity)
        if (d.goal) setUserGoal(d.goal)
        if (d.target_weight) setUserTargetWeight(String(d.target_weight))
        if (d.video_url) setVideoUrl(d.video_url)
        if (d.pantry_notes) setPantryNotes(d.pantry_notes)
        if (d.created_at) setJoinedDate(d.created_at)
        if (d.sport_type) setSportType(d.sport_type)
        if (d.sport_commit_days) setSportCommitDays(d.sport_commit_days)
        // welcome_doc_enabled נטען ישירות מ-client.data

        // ✅ תיקון: טעינת העדפות תזונה מ-clients (לא מ-daily_logs)
        if (d.diet_type) { setDietType(d.diet_type); setSetupDone(true) }
        if (d.restrictions) setRestrictions(d.restrictions)

        if (d.current_stage) {
          const stg = d.current_stage
          setCurrentStage(stg)
          if (stg === 1) setStageName('שלב הניצוץ · מודעות')
          if (stg === 2) setStageName('שלב העוגן · עיצוב סביבה')
          if (stg === 3) setStageName('שלב החופש · דרך חיים')
          var seenKey = 'stage2seen_' + dbKey
          if (stg >= 2 && !localStorage.getItem(seenKey)) {
            setShowStage2Welcome(true); setShowConfetti(true)
            localStorage.setItem(seenKey, '1')
            setTimeout(() => setShowConfetti(false), 4000)
          }
        }

        // WelcomeDocument נפתח רק דרך כפתור ידני — לא אוטומטי
      }

      var todayLog = await supabase.from('daily_logs').select('*').eq('client_name', dbKey).eq('log_date', todayKey).maybeSingle()
      if (todayLog.data) {
        var t = todayLog.data
        setChecks(t.checks || {}); setCarbSel(t.carb_sel); setProtSel(t.prot_sel); setFatSel(t.fat_sel)
        setVeggieSel(t.veggie_sel); setLunchOpt(t.lunch_opt); setBenayimSel(t.benayim_sel)
        setWater(t.water || 0); setSteps(t.steps || ''); setNote(t.note || '')
        setBokerFree(t.boker_free || ''); setLunchFree(t.lunch_free || ''); setErevFree(t.erev_free || '')
        setBokerExtraCal(t.boker_extra_cal || 0); setLunchExtraCal(t.lunch_extra_cal || 0); setErevExtraCal(t.erev_extra_cal || 0)
        setHadSnack(t.had_snack ?? null); setHadBenayim(t.had_benayim ?? null)
        setSportDoneToday(t.sport_done_today || false)
        var dayOfWeek = new Date().getDay()
        setSportDaysThisWeek(dayOfWeek === 0 ? 0 : (t.sport_days_week || 0))
        setScanCalories(t.scan_calories || 0); setScanDesc(t.scan_desc || '')
        setFeedback(t.trainer_feedback || null); setReportApproved(t.report_approved || false)
        if (t.nlp_metrics) { var m = t.nlp_metrics; setStressLevel(m.stress || 0); setFatigueLevel(m.fatigue || 0); setHungerLevel(m.hunger || 0); setUserMood(m.mood || null) }
      }
    }
    if (dbKey) load()
  }, [dbKey, todayKey])

  // ✅ שמירה אוטומטית — 3 שניות אחרי כל שינוי
  const autoSaveRef = useRef(null)
  useEffect(() => {
    if (!dbKey || !todayKey || !profileDone) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      var payload = {
        client_name: dbKey, log_date: todayKey, checks,
        carb_sel: carbSel, prot_sel: protSel, fat_sel: fatSel, veggie_sel: veggieSel, lunch_opt: lunchOpt, benayim_sel: benayimSel,
        water, steps, note, boker_free: bokerFree, lunch_free: lunchFree, erev_free: erevFree,
        boker_extra_cal: bokerExtraCal || 0, lunch_extra_cal: lunchExtraCal || 0, erev_extra_cal: erevExtraCal || 0,
        had_snack: hadSnack, had_benayim: hadBenayim,
        sport_done_today: sportDoneToday, sport_days_week: sportDaysThisWeek,
        scan_calories: scanCalories || 0, scan_desc: scanDesc || '', scan_protein: scanProtein || 0, scan_fat: scanFat || 0, scan_carbs: scanCarbs || 0,
        diet_type: dietType, restrictions,
        nlp_metrics: { stress: stressLevel, fatigue: fatigueLevel, hunger: hungerLevel, mood: userMood },
        updated_at: new Date().toISOString(),
      }
      await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
    }, 3000)
    return () => clearTimeout(autoSaveRef.current)
  }, [checks, carbSel, protSel, fatSel, veggieSel, lunchOpt, benayimSel, water, steps, note, bokerFree, lunchFree, erevFree, bokerExtraCal, lunchExtraCal, erevExtraCal, hadSnack, hadBenayim, sportDoneToday, sportDaysThisWeek, scanCalories, scanDesc, stressLevel, fatigueLevel, hungerLevel, userMood])

  // ✅ listener לסגירת מדריכים מתוך iframe
  useEffect(() => {
    function handleGuideClose(e) {
      if (e.data === 'closeGuide') setGuideUrl(null)
    }
    window.addEventListener('message', handleGuideClose)
    return () => window.removeEventListener('message', handleGuideClose)
  }, [])

  function calcEatenCalories() {
    var total = 0
    function add(id) { var item = nutritionData[id]; if (item) total += item.calories || 0 }
    if (hadSnack) add('snack')
    if (checks) Object.keys(checks).forEach(id => { if (checks[id]) add(id) })
    if (carbSel) add(carbSel); if (protSel) add(protSel)
    if (fatSel) add(fatSel); if (veggieSel) add(veggieSel)
    if (benayimSel) add(benayimSel); if (hadBenayim) add('benayim')
    total += (bokerExtraCal || 0) + (lunchExtraCal || 0) + (erevExtraCal || 0) + (scanCalories || 0)
    return total
  }

  // ✅ תיקון: saveProfile שומר גם diet_type ו-restrictions
  const saveProfile = async function() {
    if (!userWeight || !userHeight || !userAge) return
    await supabase.from('clients').update({
      weight: parseFloat(userWeight),
      height: parseFloat(userHeight),
      age: parseInt(userAge),
      gender: userGender,
      activity: userActivity,
      goal: userGoal,
      target_weight: userTargetWeight ? parseFloat(userTargetWeight) : null,
      sport_type: sportType,
      sport_commit_days: sportCommitDays,
      diet_type: dietType,
      restrictions: restrictions,
    }).eq('password', dbKey)
    setProfileDone(true)
  }

  const resetDay = async function() {
    if (!window.confirm('לאפס את כל הנתונים של היום?')) return
    await supabase.from('daily_logs').delete().eq('client_name', dbKey).eq('log_date', todayKey)
    setChecks({}); setCarbSel(null); setProtSel(null); setFatSel(null); setVeggieSel(null); setBenayimSel(null); setLunchOpt(null)
    setWater(0); setSteps(''); setNote(''); setBokerFree(''); setLunchFree(''); setErevFree('')
    setBokerExtraCal(0); setLunchExtraCal(0); setErevExtraCal(0)
    setHadSnack(null); setHadBenayim(null); setSportDoneToday(false)
    setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0)
    setStressLevel(0); setFatigueLevel(0); setHungerLevel(0); setUserMood(null)
    setFeedback(null); setReportApproved(false)
  }

  const handleSave = async function() {
    setSaving(true)
    var payload = {
      client_name: dbKey, log_date: todayKey, checks,
      carb_sel: carbSel, prot_sel: protSel, fat_sel: fatSel, veggie_sel: veggieSel, lunch_opt: lunchOpt, benayim_sel: benayimSel,
      water, steps, note, boker_free: bokerFree, lunch_free: lunchFree, erev_free: erevFree,
      boker_extra_cal: bokerExtraCal || 0, lunch_extra_cal: lunchExtraCal || 0, erev_extra_cal: erevExtraCal || 0,
      had_snack: hadSnack, had_benayim: hadBenayim,
      sport_done_today: sportDoneToday, sport_days_week: sportDaysThisWeek,
      scan_calories: scanCalories || 0, scan_desc: scanDesc || '', scan_protein: scanProtein || 0, scan_fat: scanFat || 0, scan_carbs: scanCarbs || 0,
      diet_type: dietType, restrictions,
      nlp_metrics: { stress: stressLevel, fatigue: fatigueLevel, hunger: hungerLevel, mood: userMood },
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
    if (error) {
      console.error('שגיאה בשמירה:', error.message)
      alert('שגיאה בשמירה: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setSaved(true)
    setShowWAButton(true) // ✅ מציג כפתור WA נפרד — לא מנווט אוטומטית
    setTimeout(() => setSaved(false), 3000)
  }

  const targets = calcTargets(parseFloat(userWeight), parseFloat(userHeight), parseInt(userAge), userGender, userActivity, userGoal)
  const eatenCalories = calcEatenCalories()
  const filteredBoker = PLAN.boker.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredProt = PLAN.protOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredErev = PLAN.erev.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredCarbs = PLAN.carbOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredFat = PLAN.fatOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredBenayim = PLAN.benayimOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalItems = filteredBoker.length + filteredErev.length

  // ─────────────────────────────────────────────
  // ✅ סדר זרימה נכון: setup → profile → welcome → stage2 → app
  // ─────────────────────────────────────────────

  if (!setupDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>היי {displayName.split(' ')[0]}!</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>{gf('בואי', 'בוא')} נתאים את התפריט</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>סוג תזונה:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIET_TYPES.map(d => <button key={d.key} onClick={() => setDietType(d.key)} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (dietType === d.key ? C.greenMid : '#e5e7eb'), background: dietType === d.key ? C.greenLight : '#fafafa', color: dietType === d.key ? C.greenDark : '#333' }}>{d.icon} {d.label}</button>)}
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>הגבלות:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RESTRICTIONS.map(r => <button key={r.key} onClick={() => setRestrictions(prev => { var n = {...prev}; n[r.key] = !n[r.key]; return n })} style={{ padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (restrictions[r.key] ? C.blue : '#e5e7eb'), background: restrictions[r.key] ? C.blueLight : '#fafafa', color: restrictions[r.key] ? C.blue : '#333' }}>{r.icon} {r.label} {restrictions[r.key] ? '✓' : ''}</button>)}
          </div>
        </div>
        {/* ✅ תיקון: שמירת העדפות תזונה ל-clients בלחיצה */}
        <button onClick={async () => {
          if (!dietType) return
          await supabase.from('clients').update({ diet_type: dietType, restrictions }).eq('password', dbKey)
          setSetupDone(true)
        }} disabled={!dietType} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: dietType ? C.greenMid : '#e5e7eb', color: dietType ? '#fff' : '#9ca3af', border: 'none', cursor: 'pointer', width: '100%', maxWidth: 340 }}>
          {gf('בואי', 'בוא')} נתחיל!
        </button>
      </div>
    )
  }

  if (!profileDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>פרטים אישיים 📊</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>כדי לחשב את היעד הקלורי שלך</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[{ label: 'משקל (ק"ג)', val: userWeight, set: setUserWeight, ph: '70' }, { label: 'גובה (ס"מ)', val: userHeight, set: setUserHeight, ph: '165' }, { label: 'גיל', val: userAge, set: setUserAge, ph: '30' }, { label: 'משקל יעד (ק"ג)', val: userTargetWeight, set: setUserTargetWeight, ph: '60' }].map(f => (
              <div key={f.label}><div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 600 }}>{f.label}</div><input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מין</div>
            <div style={{ display: 'flex', gap: 8 }}>{['נקבה', 'זכר'].map(g => <button key={g} onClick={() => setUserGender(g)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '2px solid ' + (userGender === g ? C.greenMid : '#e5e7eb'), background: userGender === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: userGender === g ? C.greenDark : '#555' }}>{g}</button>)}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ACTIVITY_LEVELS.map(a => <button key={a} onClick={() => setUserActivity(a)} style={{ padding: '8px 12px', borderRadius: 99, border: '2px solid ' + (userActivity === a ? C.greenMid : '#e5e7eb'), background: userActivity === a ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: userActivity === a ? C.greenDark : '#555' }}>{a}</button>)}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{GOALS_LIST.map(g => <button key={g} onClick={() => setUserGoal(g)} style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid ' + (userGoal === g ? C.greenMid : '#e5e7eb'), background: userGoal === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: userGoal === g ? C.greenDark : '#555', textAlign: 'right' }}>{g}</button>)}</div>
          </div>
        </div>
        <button onClick={saveProfile} disabled={!userWeight || !userHeight || !userAge} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: (userWeight && userHeight && userAge) ? C.greenMid : '#e5e7eb', color: (userWeight && userHeight && userAge) ? '#fff' : '#9ca3af', border: 'none', cursor: 'pointer', width: '100%', maxWidth: 340 }}>{gf('שמרי', 'שמור')} פרטים</button>
        <button onClick={() => setProfileDone(true)} style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>{gf('דלגי', 'דלג')} בינתיים</button>
      </div>
    )
  }

  // WelcomeDocument נפתח רק דרך כפתור ידני בטאבים

  if (showStage2Welcome) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#fff' }}>
        {showConfetti && <Confetti />}
        <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 28, textAlign: 'center', marginBottom: 8 }}>{gf('ברוכה הבאה', 'ברוך הבא')} לשלב 2!</div>
        <div style={{ fontSize: 16, color: '#bbf7d0', textAlign: 'center', marginBottom: 24, lineHeight: 1.7 }}>שלב העוגן · עיצוב הסביבה 🏡<br/>עברת על הבסיס — עכשיו הופכים אותו לדרך חיים</div>
        {videoUrl && (<div style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 8px 40px #0000004a' }}><iframe src={videoUrl.replace('watch?v=', 'embed/')} width="100%" height="220" frameBorder="0" allowFullScreen style={{ display: 'block' }} /></div>)}
        <div style={{ background: '#ffffff20', borderRadius: 16, padding: 16, width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#86efac' }}>מה חדש בשלב הזה:</div>
          {['🏃 ספורט נוסף על ההליכות — בחירה שלך', '🥫 מדריך מזווה ומקרר — מוכן לך כאן', '📸 צילום צלחת — AI יזהה מה אכלת', '🤖 Agent חירום 24/7 — שאלי כל שאלה תזונתית'].map((t, i) => (<div key={i} style={{ fontSize: 14, color: '#fff', padding: '6px 0', borderBottom: i < 3 ? '1px solid #ffffff15' : 'none' }}>{t}</div>))}
        </div>
        <button onClick={() => setShowStage2Welcome(false)} style={{ padding: '16px 40px', borderRadius: 16, background: '#fff', color: '#0f4c2a', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>{gf('בואי', 'בוא')} נתחיל! 🚀</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      {showConfetti && <Confetti />}

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '24px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת · אתי אטל</div>
            <div style={{ fontSize: 11, background: '#ffffff25', color: '#fff', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>🏆 {stageName}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>היי {displayName.split(' ')[0]}!</div>
          <div style={{ fontSize: 12, color: '#bbf7d0', marginTop: 2 }}>{today}</div>
          {targets && (
            <div style={{ marginTop: 10, background: '#ffffff20', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#86efac', marginBottom: 6 }}>
                <span>🔥 {Math.round(eatenCalories)} קל אכל{gf('ת', '')}</span>
                <span>יעד: {targets.calories} קל</span>
              </div>
              <div style={{ position: 'relative', height: 18, background: '#ffffff20', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, Math.round((eatenCalories / targets.calories) * 100)) + '%', height: '100%', background: eatenCalories >= targets.calories ? '#fbbf24' : '#4ade80', borderRadius: 99, transition: 'width 0.3s' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {Math.min(100, Math.round((eatenCalories / targets.calories) * 100))}%
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>{eatenCalories >= targets.calories ? '✅ הגעת ליעד!' : 'נשאר ' + (targets.calories - Math.round(eatenCalories)) + ' קל'}</div>
            </div>
          )}
          <div style={{ marginTop: 8, background: '#ffffff15', borderRadius: 10, height: 6, overflow: 'hidden' }}>
            <div style={{ width: Math.round((checkedCount / totalItems) * 100) + '%', height: '100%', background: '#4ade80', borderRadius: 10 }} />
          </div>
          <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>{checkedCount}/{totalItems} פריטים סומנו היום</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('diary')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'diary' ? '#16a34a' : '#e5e7eb'), background: activeTab === 'diary' ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'diary' ? '#0f4c2a' : '#555' }}>
            📅 היומן
          </button>
          {currentStage >= 2 && (
            <button onClick={() => setActiveTab('guides')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'guides' ? C.teal : '#e5e7eb'), background: activeTab === 'guides' ? C.tealLight : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'guides' ? C.teal : '#555' }}>
              🏡 מדריכים
            </button>
          )}
          <button onClick={() => setActiveTab('agent')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'agent' ? C.agent : '#e5e7eb'), background: activeTab === 'agent' ? C.agentLight : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'agent' ? C.agent : '#555', position: 'relative' }}>
            🤖 Agent
            <span style={{ position: 'absolute', top: 4, left: 4, width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />
          </button>
          {/* ✅ כפתור "המסמכים שלי" — תמיד נגיש */}
          <button onClick={() => setShowDocsMenu(!showDocsMenu)} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (showDocsMenu ? '#7c3aed' : '#e5e7eb'), background: showDocsMenu ? '#faf5ff' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: showDocsMenu ? '#7c3aed' : '#555', position: 'relative' }}>
            📂 המסמכים
          </button>
        </div>

        {/* ✅ תפריט מסמכים */}
        {showDocsMenu && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e9d5ff', padding: '12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* מסמך פתיחה */}
            {clientData?.welcome_doc_enabled ? (
              <button onClick={() => { setShowWelcomeDoc(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#e8f5f2,#f0fdf4)', border: '1.5px solid #4a9b8e', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#3a7a6e', textAlign: 'right' }}>
                🌿 מסמך הפתיחה שלי — תזונה ומחלות
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🔒 מסמך הפתיחה — יפתח בקרוב
              </div>
            )}
            {/* ניתוח התחלתי */}
            {feedback ? (
              <button onClick={() => window.open('/report?client=' + dbKey, '_blank')} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1.5px solid #0284c7', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#0f4c2a', textAlign: 'right' }}>
                📊 הניתוח האישי שלי — 360 ובדיקות דם
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                📊 הניתוח האישי — יתווסף לאחר הפגישה הראשונה
              </div>
            )}
            {/* מסמך מטרה */}
            {clientData?.outcome_doc ? (
              <button onClick={() => { setShowOutcomeDoc(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#faf5ff,#eff6ff)', border: '1.5px solid #7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#7c3aed', textAlign: 'right' }}>
                🧭 המטרה שלי — מסע התוצאה
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🧭 המטרה שלי — יתווסף לאחר פגישה 2
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ משוב יומי מלא — overlay */}
      {showDailyFeedback && feedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowDailyFeedback(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב האישי שלך 💚</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{displayName.split(' ')[0]} · {today} · אתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              // מפצל לפי המפריד -- שה-route שולח בין סעיפים
              const rawSections = feedback.split(/\n\s*--\s*\n/)
              const SECTION_COLORS = [
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
                { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
                { bg: '#fdf4ff', border: '#a21caf', title: '#86198f' },
              ]
              return rawSections.map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const isBoldTitle = /^\*\*.*\*\*/.test(firstLine)
                const title = isBoldTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = isBoldTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: `1.5px solid ${c.border}40`, boxShadow: `0 2px 8px ${c.border}15` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}30`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}

      {/* ✅ מדריך HTML — overlay עם סגירה */}
      {guideUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#0f4c2a', color: '#fff', flexShrink: 0 }}>
            <button onClick={() => setGuideUrl(null)} style={{ padding: '7px 16px', borderRadius: 8, background: '#fff', color: '#0f4c2a', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>✕ סגרי</button>
            <img src="/logo.png" alt="בין הראש לצלחת" style={{ height: 32, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display='none' }} />
          </div>
          <iframe src={guideUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="מדריך" />
        </div>
      )}

      {/* ✅ מסמך פתיחה — overlay */}
      {showWelcomeDoc && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto' }}>
          <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 201 }}>
            <button onClick={() => setShowWelcomeDoc(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <WelcomeDocument clientPassword={dbKey} clientName={displayName} onContinue={() => setShowWelcomeDoc(false)} />
        </div>
      )}

      {/* ✅ ניתוח התחלתי — overlay מעוצב */}
      {showInitialReport && feedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowInitialReport(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>הניתוח האישי שלך 💚</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{displayName.split(' ')[0]} · אתי אטל</div>
                </div>
              </div>
            </div>
            {feedback.split(/\n(?=\*\*[✨🔍⚡🩺🥗🎯💚])/).map((section, i) => {
              const lines = section.split('\n')
              const titleLine = lines[0]
              const title = titleLine.replace(/\*\*/g, '').trim()
              const body = lines.slice(1).join('\n').trim()
              const colors = ['#16a34a','#0284c7','#d97706','#dc2626','#7c3aed','#0d9488','#f97316']
              const color = colors[i % colors.length]
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 18, padding: '18px', marginBottom: 12, border: `1.5px solid ${color}25` }}>
                  {title && <div style={{ fontWeight: 900, fontSize: 15, color, marginBottom: 10, borderBottom: `2px solid ${color}20`, paddingBottom: 8 }}>{title}</div>}
                  <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                    dangerouslySetInnerHTML={{ __html: body
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ✅ מסמך מטרה — overlay */}
      {showOutcomeDoc && clientData?.outcome_doc && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowOutcomeDoc(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #e9d5ff', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המטרה שלך — מסע התוצאה 🧭</div>
                  <div style={{ fontSize: 11, color: '#e9d5ff' }}>{displayName.split(' ')[0]} · אתי אטל</div>
                </div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 18, padding: '20px 18px', border: '1.5px solid #e9d5ff' }}>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, whiteSpace: 'pre-wrap', textAlign: 'right' }}>{clientData.outcome_doc}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 14px 80px' }}>
          <AgentChat clientName={displayName} gender={userGender} clientProfile={clientData} />
        </div>
      )}

      {activeTab === 'guides' && currentStage >= 2 && (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 14px 80px' }}>
          {videoUrl && (
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 12 }}>
              <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', fontWeight: 800, fontSize: 15 }}>🎬 ברכת פתיחה מאתי</div>
              <iframe src={videoUrl.replace('watch?v=', 'embed/')} width="100%" height="200" frameBorder="0" allowFullScreen style={{ display: 'block' }} />
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: C.tealLight, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🛒</span>
              <div><div style={{ fontWeight: 800, fontSize: 15, color: C.teal }}>מדריך קניות חכם</div><div style={{ fontSize: 12, color: '#9ca3af' }}>רשימה מלאה עם טיפים וצ׳קבוקסים</div></div>
            </div>
            <div style={{ padding: 14 }}><button onClick={() => setGuideUrl('/shopping_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.teal, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך 🛒</button></div>
          </div>
          {pantryNotes ? (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff7ed', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🏡</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.orange }}>מדריך המזווה שלי</div><div style={{ fontSize: 12, color: '#9ca3af' }}>הנחיות אישיות מהפגישה שלנו בבית</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 12 }}>{pantryNotes}</div>
                <button onClick={() => setGuideUrl('/pantry_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.orange, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך המלא 🏡</button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff7ed', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🏡</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.orange }}>מדריך המזווה והמקרר</div><div style={{ fontSize: 12, color: '#9ca3af' }}>איך לארגן את המטבח לתמיכה בדרך שלך</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <button onClick={() => setGuideUrl('/pantry_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.orange, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך 🏡</button>
              </div>
            </div>
          )}
          {currentStage >= 3 && (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: C.purpleLight, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📚</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.purple }}>חוברת המתכונים של אתי</div><div style={{ fontSize: 12, color: '#9ca3af' }}>20 מתכונים · ללא קמח · ללא סוכר · חלבון גבוה</div></div>
              </div>
              <div style={{ padding: 14 }}><button onClick={() => setGuideUrl('/recipes_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.purple, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את החוברת 📚</button></div>
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 14px 80px', display: activeTab === 'diary' ? 'block' : 'none' }}>
        {feedback && <FeedbackCard feedback={feedback} clientName={displayName} logDate={today} onOpenFull={() => setShowDailyFeedback(true)} />}

        <div style={{ background: '#fff', borderRadius: 18, padding: 18, border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.greenDark, marginBottom: 12, textAlign: 'right' }}>🧠 מודעות והקשבה לגוף</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>מה מצב הרוח שלך היום?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ k: 'calm', l: gf('😌 רגועה', '😌 רגוע') }, { k: 'stressed', l: '🤯 בסטרס' }, { k: 'tired', l: gf('🥱 עייפה', '🥱 עייף') }, { k: 'bored', l: gf('😐 משועממת', '😐 משועמם') }].map(m => {
                const isSel = userMood === m.k
                return <button key={m.k} onClick={() => setUserMood(m.k)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid ' + (isSel ? C.greenMid : '#e5e7eb'), background: isSel ? C.greenLight : '#fafafa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{m.l}</button>
              })}
            </div>
          </div>
          <NlpSelector label="לחץ וסטרס:" value={stressLevel} onChange={setStressLevel} max={5} lowLabel={gf('רגועה', 'רגוע')} highLabel="עומס" accent="#ef4444" />
          <NlpSelector label="עייפות:" value={fatigueLevel} onChange={setFatigueLevel} max={5} lowLabel={gf('אנרגטית', 'אנרגטי')} highLabel={gf('סחוטה', 'סחוט')} accent={C.orange} />
          <NlpSelector label="רעב ממוצע:" value={hungerLevel} onChange={setHungerLevel} max={5} lowLabel={gf('שבעה', 'שבע')} highLabel="רעב קיצוני" accent={C.blue} />
        </div>

        {currentStage >= 2 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 18, border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.purple, marginBottom: 12, textAlign: 'right' }}>🏃 ספורט שבועי</div>
            {!sportType ? (
              <>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>{gf('בחרי', 'בחר')} פעילות נוספת על ההליכות:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {SPORT_OPTIONS.map(s => (<button key={s.key} onClick={async () => { setSportType(s.key); await supabase.from('clients').update({ sport_type: s.key }).eq('password', dbKey) }} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{s.icon} {s.label}</button>))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div><span style={{ fontSize: 22 }}>{SPORT_OPTIONS.find(s => s.key === sportType)?.icon || '⚡'}</span><span style={{ fontWeight: 700, fontSize: 14, marginRight: 6, color: C.purple }}>{SPORT_OPTIONS.find(s => s.key === sportType)?.label || sportType}</span></div>
                  <button onClick={() => setSportType('')} style={{ fontSize: 11, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }}>שנה</button>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>מחויבות שבועית:</div>
                  <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4].map(n => (<button key={n} onClick={async () => { setSportCommitDays(n); await supabase.from('clients').update({ sport_commit_days: n }).eq('password', dbKey) }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '2px solid ' + (sportCommitDays === n ? C.purple : '#e5e7eb'), background: sportCommitDays === n ? C.purpleLight : '#fff', color: sportCommitDays === n ? C.purple : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{n}×</button>))}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>פעמים בשבוע בנוסף על ההליכות</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: sportDoneToday ? '#faf5ff' : '#fafafa', borderRadius: 12, padding: '12px 14px' }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>אימון היום</div><div style={{ fontSize: 11, color: '#9ca3af' }}>השבוע: {sportDaysThisWeek}/{sportCommitDays} אימונים</div></div>
                  <button onClick={() => { var done = !sportDoneToday; setSportDoneToday(done); if (done) setSportDaysThisWeek(w => Math.min(w + 1, sportCommitDays)) }} style={{ padding: '8px 16px', borderRadius: 10, background: sportDoneToday ? C.purple : '#fff', color: sportDoneToday ? '#fff' : C.purple, border: '2px solid ' + C.purple, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{sportDoneToday ? '✅ בוצע!' : '+ סמן אימון'}</button>
                </div>
                {sportDaysThisWeek >= sportCommitDays && (<div style={{ marginTop: 8, background: C.purpleLight, borderRadius: 10, padding: '8px 12px', textAlign: 'center', fontSize: 13, color: C.purple, fontWeight: 700 }}>🏆 {gf('השלמת', 'השלמת')} את המחויבות השבועית! מדהים!</div>)}
              </>
            )}
          </div>
        )}

        <Section title="ארוחת בוקר" icon="☀️" accent={C.orange} light={C.orangeLight} defaultOpen={true}>
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0 4px', textAlign: 'right' }}>{PLAN.bokerSnack}</div>
          <YesNo value={hadSnack} onChange={setHadSnack} labelYes="✅ אכלתי חטיף" labelNo="❌ דילגתי" accent={C.orange} />
          {filteredBoker.map(item => <CheckRow key={item.id} id={item.id} text={item.text} accent={C.orange} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
          <FreeText value={bokerFree} onChange={setBokerFree} placeholder="אכלתי גם / פרטים נוספים..." />
          <ExtraCal value={bokerExtraCal} onChange={setBokerExtraCal} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setBokerExtraCal(c => c + cal); setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
        </Section>

        <Section title="ארוחת צהריים" icon="🌞" accent={C.greenMid} light={C.greenLight}>
          <div style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
            {[{ k: 'A', l: '🍽️ מרכיבי הארוחה' }, { k: 'B', l: '🫒 רטבים ונלווים' }].map(opt => (<button key={opt.k} onClick={() => setLunchOpt(lunchOpt === opt.k ? null : opt.k)} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '2px solid ' + (lunchOpt === opt.k ? C.greenMid : '#e5e7eb'), background: lunchOpt === opt.k ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: lunchOpt === opt.k ? C.greenDark : '#555' }}>{opt.l}</button>))}
          </div>
          {lunchOpt === 'A' && (<div><div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>פחמימה:</div>{filteredCarbs.map(o => <RadioRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} selected={carbSel} onSelect={setCarbSel} />)}<div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '10px 0 2px', textAlign: 'right' }}>חלבון:</div>{filteredProt.map(o => <RadioRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} selected={protSel} onSelect={setProtSel} />)}</div>)}
          {lunchOpt === 'B' && (<div><div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>רטבים ותוספות:</div>{filteredFat.map(o => <CheckRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} checked={!!checks[o.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}</div>)}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות (חובה!):</div>
          {PLAN.veggieOptions.map(o => <RadioRow key={o.id} id={o.id} text={o.text} accent={C.teal} selected={veggieSel} onSelect={setVeggieSel} />)}
          <FreeText value={lunchFree} onChange={setLunchFree} placeholder="פרטים נוספים על הצהריים..." />
          <ExtraCal value={lunchExtraCal} onChange={setLunchExtraCal} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setLunchExtraCal(c => c + cal); setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
        </Section>

        <Section title="ביניים" icon="🌤" accent={C.blue} light={C.blueLight}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.blue, padding: '8px 0 4px', textAlign: 'right' }}>בחר/י:</div>
          {filteredBenayim.map(o => <RadioRow key={o.id} id={o.id} text={o.text} accent={C.blue} selected={benayimSel} onSelect={setBenayimSel} />)}
          <YesNo value={hadBenayim} onChange={setHadBenayim} labelYes="✅ אכלתי" labelNo="❌ דילגתי" accent={C.blue} />
        </Section>

        <Section title="ארוחת ערב" icon="🌙" accent={C.purple} light={C.purpleLight}>
          {filteredErev.map(item => <CheckRow key={item.id} id={item.id} text={item.text} accent={C.purple} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות לערב:</div>
          {PLAN.veggieOptions.map(o => (<div key={o.id + '_e'} onClick={() => setChecks(c => { var n = {...c}; n[o.id + '_erev'] = !n[o.id + '_erev']; return n })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checks[o.id + '_erev'] ? 0.45 : 1 }}><div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checks[o.id + '_erev'] ? C.teal : '#d1d5db'), background: checks[o.id + '_erev'] ? C.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{checks[o.id + '_erev'] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}</div><span style={{ fontSize: 14, color: '#222', textDecoration: checks[o.id + '_erev'] ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{o.text}</span></div>))}
          <FreeText value={erevFree} onChange={setErevFree} placeholder="פרטים נוספים על הערב..." />
          <ExtraCal value={erevExtraCal} onChange={setErevExtraCal} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setErevExtraCal(c => c + cal); setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
        </Section>

        <Section title="🥫 המזווה ועוגני ההתארגנות" icon="🛒" accent={C.teal} light={C.tealLight} isLocked={currentStage < 2} lockMessage="ייפתח לאחר פגישת המזווה שלנו! 🔒">
          <div style={{ paddingTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 4 }}>💡 עוגן שבועי — מקרר מנצח:</div>
            <div style={{ fontSize: 13, color: '#444', background: C.tealLight, padding: 10, borderRadius: 10, lineHeight: 1.6, marginBottom: 12 }}>{gf('הקפידי', 'הקפד')} שבכל סופ"ש יהיו לך לפחות 3 מקורות חלבון מבושלים במקרר וירקות שטופים וחתוכים.</div>
            {[{ id: 'shop1', text: 'הכנתי קיטים מראש למקפיא' }, { id: 'shop2', text: 'חתכתי ירקות ושמתי בגובה העיניים במקרר' }, { id: 'shop3', text: 'יש קופסת הצלה מוכנה במקרר' }, { id: 'shop4', text: 'קניתי מקורות חלבון לשבוע' }].map(item => <CheckRow key={item.id} id={item.id} text={item.text} accent={C.teal} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
          </div>
        </Section>

        <Section title="🧁 ספר המתכונים של אתי" icon="✨" accent={C.purple} light={C.purpleLight} isLocked={currentStage < 3} lockMessage="ייפתח לאחר סדנת הנשנושים! 🔒">
          <div style={{ paddingTop: 6 }}>
            {BONUS_RECIPES.map(function(rec, idx) {
              return (<div key={idx} style={{ background: '#fff', padding: 10, borderRadius: 10, border: '1px solid #e9d5ff', marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><span style={{ fontWeight: 700, fontSize: 13, color: C.purple }}>{rec.title}</span><span style={{ fontSize: 11, background: C.purpleLight, color: C.purple, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{rec.cal}</span></div><div style={{ fontSize: 12, color: '#666' }}><span style={{ fontWeight: 600 }}>רכיבים:</span> {rec.ingredients}</div></div>)
            })}
          </div>
        </Section>

        <Section title="מעקב שתייה" icon="💧" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 8, textAlign: 'right' }}>{water}/8 כוסות</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: 8 }).map((_, i) => (<button key={i} onClick={() => setWater(i < water ? i : i + 1)} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer', border: '2px solid ' + (i < water ? C.blue : '#e5e7eb'), background: i < water ? C.blueLight : '#fafafa' }}>💧</button>))}
            </div>
          </div>
        </Section>

        <Section title="מעקב צעדים" icon="🚶" accent={C.purple} light={C.purpleLight}>
          <div style={{ padding: '10px 0' }}>
            <input type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="מספר צעדים..." style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
            <div style={{ marginTop: 8, height: 8, background: '#f3f4f6', borderRadius: 99 }}>
              <div style={{ width: Math.min(100, Math.round((parseInt(steps) || 0) / 10000 * 100)) + '%', height: '100%', background: C.purple, borderRadius: 99 }} />
            </div>
          </div>
        </Section>

        <Section title="כללים חשובים" icon="📋" accent={C.amber} light={C.amberLight}>
          <div style={{ paddingTop: 8 }}>
            {PLAN.rules.map(function(r, i) { return (<div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < PLAN.rules.length - 1 ? '1px solid #fef3c7' : 'none' }}><span style={{ fontSize: 18 }}>{r.icon}</span><span style={{ fontSize: 13.5, color: '#333', lineHeight: 1.6, flex: 1, textAlign: 'right' }}>{r.text}</span></div>) })}
          </div>
        </Section>

        <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10, textAlign: 'right' }}>הערה יומית לאתי</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={gf('כתבי כאן איך הרגשת היום...', 'כתוב כאן איך הרגשת היום...')} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 16, borderRadius: 16, background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>
          {saving ? 'שומר...' : saved ? '✅ נשמר!' : gf('שמרי', 'שמור') + ' את היום שלי'}
        </button>
        {showWAButton && (
          <a href={'https://wa.me/972523336766?text=' + encodeURIComponent('יומן חדש! 🌿\n' + (displayName || dbKey) + ' מילאה את היומן היום.\nhttps://project-l990h.vercel.app/admin')}
            target="_blank" rel="noopener noreferrer"
            onClick={() => setShowWAButton(false)}
            style={{ display: 'block', width: '100%', padding: 12, borderRadius: 14, marginTop: 8, background: '#25D366', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            📱 שלחי הודעה לאתי
          </a>
        )}
        <button onClick={resetDay} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 8, background: 'transparent', border: '1px solid #fca5a5', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>🔄 {gf('אפסי', 'אפס')} את היום</button>
        <button onClick={() => setSetupDone(false)} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>{gf('עדכני', 'עדכן')} העדפות תזונה</button>
        <button onClick={() => setProfileDone(false)} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>{gf('עדכני', 'עדכן')} פרטים אישיים</button>
      </div>
    </div>
  )
}

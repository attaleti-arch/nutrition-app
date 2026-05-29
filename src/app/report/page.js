'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const LOGO = 'data:image/png;base64,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'

const C = {
  teal: '#4a9b8e', tealLight: '#e8f5f2',
  gold: '#c4956a', goldLight: '#fdf3e7',
  green: '#7aab6e', greenLight: '#f0f9ec',
  purple: '#9333ea', purpleLight: '#faf5ff',
  red: '#e55a5a', redLight: '#fef2f2',
  cream: '#f5f0e8', text: '#2d2d2d', gray: '#8a8a8a',
}

const BLOOD_RANGES = {
  glucose: { min: 70, max: 100, label: 'סוכר בצום', unit: 'mg/dL' },
  hba1c: { min: 0, max: 5.7, label: 'המוגלובין A1C', unit: '%' },
  cholesterol: { min: 0, max: 200, label: 'כולסטרול כללי', unit: 'mg/dL' },
  hdl: { min: 60, max: 999, label: 'HDL טוב', unit: 'mg/dL' },
  ldl: { min: 0, max: 100, label: 'LDL רע', unit: 'mg/dL' },
  triglycerides: { min: 0, max: 150, label: 'טריגליצרידים', unit: 'mg/dL' },
  vitamin_d: { min: 30, max: 100, label: 'ויטמין D', unit: 'ng/mL' },
  ferritin: { min: 12, max: 150, label: 'פריטין', unit: 'ng/mL' },
  vitamin_b12: { min: 200, max: 900, label: 'ויטמין B12', unit: 'pg/mL' },
  tsh: { min: 0.4, max: 4.0, label: 'TSH', unit: 'mIU/L' },
}

const CARD_STYLES = [
  { border: '#c4956a', bg: '#fffbf5' },
  { border: '#4a9b8e', bg: '#f0f9f7' },
  { border: '#c4956a', bg: '#fffbf5' },
  { border: '#e55a5a', bg: '#fff8f8' },
  { border: '#7aab6e', bg: '#f5fbf3' },
  { border: '#9333ea', bg: '#fdf8ff' },
]

function BloodBar({ label, value, min, max, unit }) {
  if (!value) return null
  const val = parseFloat(value)
  const isNormal = val >= min && val <= max
  const pct = Math.min(100, Math.max(5, ((val - min * 0.5) / (max * 1.5 - min * 0.5)) * 100))
  return (
    <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fff', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: isNormal ? C.teal : C.red }}>{val} {unit}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: isNormal ? C.tealLight : C.redLight, color: isNormal ? C.teal : C.red, fontWeight: 700 }}>
            {isNormal ? '✓ תקין' : '⚠️ חריג'}
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: C.cream, borderRadius: 99 }}>
        <div style={{ width: pct + '%', height: '100%', background: isNormal ? C.teal : C.red, borderRadius: 99 }} />
      </div>
    </div>
  )
}

function parseCards(feedback) {
  if (!feedback) return []
  const ICONS = ['🌟','🔍','⚡','🩸','🥗','🎯']
  const lines = feedback.split('\n')
  const sections = []
  let current = { icon: '🌟', body: [], index: 0 }

  lines.forEach(line => {
    const t = line.trim()
    if (!t || t === '--') return
    // זיהוי שורת כותרת: מתחילה ב-# או ** ומכילה אמוג'י
    const isHeader = /^(#+|\*\*)/.test(t)
    const emojiMatch = t.match(/[🌟🔍⚡🩸🥗🎯🧠💊💚🎯]/)
    if (isHeader && emojiMatch) {
      if (current.body.length > 0) sections.push({...current})
      current = { icon: emojiMatch[0], body: [], index: sections.length }
    } else if (!isHeader) {
      const clean = t
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^[-•*]\s*/, '')
        .replace(/\|/g, '')
        .trim()
      if (clean) current.body.push(clean)
    }
  })
  if (current.body.length > 0) sections.push(current)

  return sections.slice(0, 6).map((s, i) => ({
    icon: s.icon,
    body: s.body,
    style: CARD_STYLES[i % 6]
  }))
}

function InsightCard({ card }) {
  return (
    <div style={{
      background: card.style.bg,
      border: '2px solid ' + card.style.border,
      borderRadius: 24,
      padding: '22px 20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 30, textAlign: 'center', marginBottom: 14 }}>{card.icon}</div>
      {card.body.map((line, i) => (
        <p key={i} style={{ fontSize: 15, lineHeight: 1.9, color: C.text, margin: '0 0 10px 0', textAlign: 'right' }}>
          {line}
        </p>
      ))}
    </div>
  )
}

function ReportContent() {
  const searchParams = useSearchParams()
  const clientKey = searchParams.get('client')
  const isPreview = searchParams.get('preview') === 'true'
  const [log, setLog] = useState(null)
  const [client, setClient] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!clientKey) return
      const { data: clientData } = await supabase.from('clients').select('*').eq('password', clientKey).maybeSingle()
      setClient(clientData)
      const { data: logData } = await supabase.from('daily_logs').select('*').eq('client_name', clientKey).order('log_date', { ascending: false }).limit(1).maybeSingle()
      setLog(logData)
      const { data: profileData } = await supabase.from('client_profiles').select('*').eq('client_password', clientKey).maybeSingle()
      setProfile(profileData)
      setLoading(false)
    }
    load()
  }, [clientKey])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center' }}>
        <img src={LOGO} style={{ height: 100, marginBottom: 16 }} alt="לוגו" />
        <div style={{ color: C.teal, fontWeight: 700 }}>טוענת את הדוח שלך...</div>
      </div>
    </div>
  )

  if (!log?.trainer_feedback || (!log?.report_approved && !isPreview)) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', padding: 30 }}>
        <img src={LOGO} style={{ height: 100, marginBottom: 16 }} alt="לוגו" />
        <div style={{ color: C.teal, fontWeight: 700, fontSize: 20 }}>הדוח שלך בהכנה 💚</div>
        <div style={{ color: C.gray, marginTop: 10 }}>אתי מכינה את הניתוח האישי שלך</div>
      </div>
    </div>
  )

  const feedback = log.trainer_feedback
  const bloodTests = profile?.blood_tests || {}
  const bloodEntries = Object.entries(BLOOD_RANGES).filter(([key]) => bloodTests[key])
  const cards = parseCards(feedback)
  const today = new Date().toLocaleDateString('he-IL')

  const macroData = [
    { name: 'פחמימות', value: 60, color: '#f97316' },
    { name: 'חלבון', value: 15, color: C.teal },
    { name: 'שומן', value: 25, color: C.gold },
  ]
  const targetMacro = [
    { name: 'פחמימות', value: 30, color: '#f97316' },
    { name: 'חלבון', value: 40, color: C.teal },
    { name: 'שומן', value: 30, color: C.gold },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.cream, direction: 'rtl' }}>
      <style>{'@media print { .no-print { display: none !important; } * { -webkit-print-color-adjust: exact !important; } }'}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#fff 60%,' + C.tealLight + ')', padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 24px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <img src={LOGO} style={{ height: 120, marginBottom: 10 }} alt="לוגו אתי אטל" />
        <div style={{ fontSize: 13, color: C.gray }}>אתי אטל | יועצת בריאות ותזונה התנהגותית</div>
        {client && (
          <div style={{ marginTop: 14, display: 'inline-block', background: C.goldLight, borderRadius: 16, padding: '10px 24px', border: '2px solid ' + C.gold }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>🌿 הדוח האישי של {client.name}</div>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>{today}</div>
        {isPreview && (
          <div style={{ marginTop: 10, background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#92400e' }}>
            👁️ תצוגה מקדימה — הלקוחה עדיין לא רואה
          </div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>

        {/* Macro Chart */}
        <div style={{ background: C.tealLight, borderRadius: 24, padding: '20px 18px', marginBottom: 20, border: '2px solid ' + C.teal }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.teal }}>המצב התזונתי שלך</span>
          </div>
          <div style={{ display: 'flex' }}>
            {[{ label: 'מצב קיים', data: macroData }, { label: 'יעד מומלץ', data: targetMacro }].map(({ label, data }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={3}>
                      {data.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={v => v + '%'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 6 }}>
            {[{ l: 'פחמימות', c: '#f97316' }, { l: 'חלבון', c: C.teal }, { l: 'שומן', c: C.gold }].map(i => (
              <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
                <span style={{ fontSize: 12, color: C.text }}>{i.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Blood Tests */}
        {bloodEntries.length > 0 && (
          <div style={{ background: C.redLight, borderRadius: 24, padding: '20px 18px', marginBottom: 20, border: '2px solid ' + C.red }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>🩸</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.red }}>בדיקות הדם שלך</span>
            </div>
            {bloodEntries.map(([key, range]) => (
              <BloodBar key={key} label={range.label} value={bloodTests[key]} min={range.min} max={range.max} unit={range.unit} />
            ))}
          </div>
        )}

        {/* Cards Grid */}
        {cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {cards.map((card, i) => <InsightCard key={i} card={card} />)}
          </div>
        )}

        <div style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginBottom: 16 }}>
          בין הראש לצלחת · אתי אטל · 052-333-6766
        </div>

        <div className="no-print">
          <button onClick={() => window.print()} style={{ width: '100%', padding: 18, borderRadius: 16, background: 'linear-gradient(135deg,' + C.teal + ',' + C.green + ')', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>
            🖨️ שמרי / הדפסי את הדוח
          </button>
          <div style={{ fontSize: 12, color: C.gray, textAlign: 'center', marginTop: 8 }}>
            iPhone: שתפי ← הדפסי ← שמרי PDF | Android: תפריט ← שמרי כ-PDF
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#f5f0e8',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#4a9b8e',fontWeight:700}}>🌿 טוענת...</div></div>}>
      <ReportContent />
    </Suspense>
  )
}

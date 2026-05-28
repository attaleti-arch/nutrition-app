'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, ReferenceLine } from 'recharts'

const COLORS = {
  teal: '#4a9b8e',
  tealLight: '#e8f5f2',
  gold: '#c4956a',
  goldLight: '#fdf3e7',
  green: '#7aab6e',
  greenLight: '#f0f9ec',
  cream: '#f5f0e8',
  red: '#e55a5a',
  redLight: '#fef2f2',
  text: '#2d2d2d',
  gray: '#8a8a8a',
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

function Card({ title, icon, color, lightColor, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 22, marginBottom: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', borderTop: '4px solid ' + color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 16, color: color }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function BloodBar({ label, value, min, max, unit }) {
  if (!value) return null
  const val = parseFloat(value)
  const isNormal = val >= min && val <= max
  const pct = Math.min(100, Math.max(0, ((val - min * 0.5) / (max * 1.5 - min * 0.5)) * 100))

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: COLORS.text }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: isNormal ? COLORS.teal : COLORS.red }}>{val} {unit}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: isNormal ? COLORS.tealLight : COLORS.redLight, color: isNormal ? COLORS.teal : COLORS.red, fontWeight: 700 }}>
            {isNormal ? '✓ תקין' : '⚠️ לא תקין'}
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: '#f0ebe0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: isNormal ? COLORS.teal : COLORS.red, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>טווח תקין: {min}–{max === 999 ? 'מעל 60' : max}</div>
    </div>
  )
}

function parseSection(text, keyword) {
  if (!text) return null
  const lines = text.split('\n')
  let collecting = false
  let result = []
  for (let line of lines) {
    if (line.includes(keyword)) { collecting = true; continue }
    if (collecting) {
      if (line.match(/^\*\*[🌟🔍🧠🎯🩸🥗💊💚📊✅⚡3]/) && !line.includes(keyword)) break
      if (line.trim()) result.push(line.replace(/\*\*/g, '').trim())
    }
  }
  return result.length ? result.join('\n') : null
}

function ReportContent() {
  const searchParams = useSearchParams()
  const clientKey = searchParams.get('client')
  const [log, setLog] = useState(null)
  const [client, setClient] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!clientKey) return
      const { data: clientData } = await supabase.from('clients').select('*').eq('password', clientKey).maybeSingle()
      setClient(clientData)

      const today = new Date().toLocaleDateString('sv-SE')
      const { data: logData } = await supabase.from('daily_logs').select('*').eq('client_name', clientKey).order('log_date', { ascending: false }).limit(1).maybeSingle()
      setLog(logData)

      const { data: profileData } = await supabase.from('client_profiles').select('*').eq('client_password', clientKey).maybeSingle()
      setProfile(profileData)

      setLoading(false)
    }
    load()
  }, [clientKey])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
        <div style={{ color: COLORS.teal, fontWeight: 700 }}>טוענת את הדוח שלך...</div>
      </div>
    </div>
  )

  if (!log?.trainer_feedback || !log?.report_approved) return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💚</div>
        <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 18 }}>הדוח שלך בהכנה</div>
        <div style={{ color: COLORS.gray, marginTop: 8 }}>אתי מכינה את הניתוח האישי שלך — תחזרי בקרוב!</div>
      </div>
    </div>
  )

  const feedback = log.trainer_feedback
  const bloodTests = profile?.blood_tests || {}

  // Parse macro from feedback text (rough estimate)
  const macroData = [
    { name: 'פחמימות', value: 60, color: '#f97316' },
    { name: 'חלבון', value: 15, color: COLORS.teal },
    { name: 'שומן', value: 25, color: COLORS.gold },
  ]
  const targetMacro = [
    { name: 'פחמימות', value: 30, color: '#f97316' },
    { name: 'חלבון', value: 40, color: COLORS.teal },
    { name: 'שומן', value: 30, color: COLORS.gold },
  ]

  const bloodEntries = Object.entries(BLOOD_RANGES).filter(([key]) => bloodTests[key])

  // Split feedback into sections
  const sections = feedback.split(/(?=\*\*[🌟🔍🧠🎯🩸🥗💊💚📊✅⚡])/).filter(s => s.trim())

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '28px 20px 24px', textAlign: 'center', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <img src="/logo.png" style={{ height: 90, marginBottom: 10 }} alt="לוגו" />
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.teal }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>אתי אטל | יועצת בריאות ותזונה התנהגותית</div>
        {client && <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.gold, marginTop: 10 }}>הדוח האישי של {client.name}</div>}
        <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{new Date().toLocaleDateString('he-IL')}</div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 60px' }}>

        {/* Macro Chart */}
        <Card title="המצב התזונתי שלך היום" icon="📊" color={COLORS.teal} lightColor={COLORS.tealLight}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6 }}>מצב קיים</div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={macroData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {macroData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={v => v + '%'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6 }}>יעד מומלץ</div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={targetMacro} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {targetMacro.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={v => v + '%'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
            {[{ l: 'פחמימות', c: '#f97316' }, { l: 'חלבון', c: COLORS.teal }, { l: 'שומן', c: COLORS.gold }].map(i => (
              <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
                <span style={{ fontSize: 12, color: COLORS.text }}>{i.l}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Blood Tests */}
        {bloodEntries.length > 0 && (
          <Card title="בדיקות הדם שלך" icon="🩸" color="#e55a5a" lightColor={COLORS.redLight}>
            {bloodEntries.map(([key, range]) => (
              <BloodBar key={key} label={range.label} value={bloodTests[key]} min={range.min} max={range.max} unit={range.unit} />
            ))}
          </Card>
        )}

        {/* Feedback Sections */}
        {sections.map((section, i) => {
          const isStrengths = section.includes('זוהר') || section.includes('חזק')
          const isBlocks = section.includes('מחסום') || section.includes('עכב')
          const isBeliefs = section.includes('אמונ')
          const isPersonal = section.includes('מסר') || section.includes('אישי')
          const isRecs = section.includes('המלצ') || section.includes('תוסף')

          const color = isStrengths ? COLORS.teal : isBlocks ? COLORS.gold : isBeliefs ? '#9333ea' : isPersonal ? COLORS.green : isRecs ? COLORS.teal : COLORS.text
          const icon = isStrengths ? '🌟' : isBlocks ? '🔍' : isBeliefs ? '🧠' : isPersonal ? '💚' : isRecs ? '🥗' : '📋'

          const lines = section.split('\n')
          const title = lines[0].replace(/\*\*/g, '').replace(/[🌟🔍🧠🎯🩸🥗💊💚📊✅⚡]/g, '').trim()
          const body = lines.slice(1).join('\n').replace(/\*\*/g, '').trim()

          if (!body) return null

          return (
            <Card key={i} title={title} icon={icon} color={color}>
              <div style={{ fontSize: 14, lineHeight: 1.9, color: COLORS.text, whiteSpace: 'pre-wrap' }}>
                {body}
              </div>
            </Card>
          )
        })}

        {/* Print Button */}
        <button onClick={() => window.print()} style={{ width: '100%', padding: 16, borderRadius: 16, background: 'linear-gradient(135deg,' + COLORS.teal + ',' + COLORS.green + ')', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16, marginTop: 8 }}>
          🖨️ שמרי / הדפסי את הדוח
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray, fontSize: 12 }}>
          בין הראש לצלחת · אתי אטל · 052-333-6766
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

'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const C = {
  teal: '#4a9b8e',
  tealLight: '#e8f5f2',
  gold: '#c4956a',
  goldLight: '#fdf3e7',
  green: '#7aab6e',
  greenLight: '#f0f9ec',
  purple: '#9333ea',
  purpleLight: '#faf5ff',
  cream: '#f5f0e8',
  creamDark: '#ede8de',
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

function Card({ title, icon, color, bg, children }) {
  return (
    <div style={{ background: bg || C.cream, borderRadius: 24, padding: '24px 22px', marginBottom: 20, boxShadow: '0 2px 20px rgba(0,0,0,0.05)', borderRight: '5px solid ' + color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: color }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function BloodBar({ label, value, min, max, unit }) {
  if (!value) return null
  const val = parseFloat(value)
  const isNormal = val >= min && val <= max
  const pct = Math.min(100, Math.max(5, ((val - min * 0.5) / (max * 1.5 - min * 0.5)) * 100))

  return (
    <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fff', borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: isNormal ? C.teal : C.red }}>{val} {unit}</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: isNormal ? C.tealLight : C.redLight, color: isNormal ? C.teal : C.red, fontWeight: 700 }}>
            {isNormal ? '✓ תקין' : '⚠️ לא תקין'}
          </span>
        </div>
      </div>
      <div style={{ height: 10, background: C.creamDark, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: isNormal ? C.teal : C.red, borderRadius: 99, transition: 'width 0.6s' }} />
      </div>
      <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>טווח תקין: {min}–{max === 999 ? 'מעל 60' : max}</div>
    </div>
  )
}

function SectionBody({ text }) {
  const paragraphs = text.split('\n').filter(l => l.trim())
  return (
    <div>
      {paragraphs.map((p, i) => {
        // סנן שורות markdown
        if (p.startsWith('|') || p.match(/^[-|\s]{3,}$/) || p.startsWith('#')) return null
        const clean = p
          .replace(/^[-•*]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/^#+\s*/, '')
          .replace(/\|/g, '') // הסר קווים אנכיים גם מאמצע שורה
          .trim()
        if (!clean || clean === '--') return null
        return (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.9, color: C.text, marginBottom: 14, padding: 0 }}>
            {clean}
          </p>
        )
      })}
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
        <img src="/logo.png" style={{ height: 80, marginBottom: 16 }} alt="לוגו" />
        <div style={{ color: C.teal, fontWeight: 700, fontSize: 16 }}>טוענת את הדוח שלך...</div>
      </div>
    </div>
  )

  if (!log?.trainer_feedback || (!log?.report_approved && !isPreview)) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', padding: 30 }}>
        <img src="/logo.png" style={{ height: 80, marginBottom: 16 }} alt="לוגו" />
        <div style={{ color: C.teal, fontWeight: 700, fontSize: 20 }}>הדוח שלך בהכנה 💚</div>
        <div style={{ color: C.gray, marginTop: 10, fontSize: 15, lineHeight: 1.7 }}>אתי מכינה את הניתוח האישי שלך<br/>תחזרי בקרוב!</div>
      </div>
    </div>
  )

  const feedback = log.trainer_feedback
  const bloodTests = profile?.blood_tests || {}
  const bloodEntries = Object.entries(BLOOD_RANGES).filter(([key]) => bloodTests[key])

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

  const sections = feedback.split(/(?=\*\*[🌟🔍🧠🎯🩸🥗💊💚📊✅⚡])/).filter(s => s.trim())

  const sectionStyle = (section) => {
    if (section.includes('זוהר') || section.includes('חזק')) return { color: C.teal, bg: C.tealLight, icon: '🌟' }
    if (section.includes('מחסום') || section.includes('עכב')) return { color: C.gold, bg: C.goldLight, icon: '🔍' }
    if (section.includes('אמונ')) return { color: C.purple, bg: C.purpleLight, icon: '🧠' }
    if (section.includes('מסר') && section.includes('אישי')) return { color: C.green, bg: C.greenLight, icon: '💚' }
    if (section.includes('המלצ') || section.includes('תוסף')) return { color: C.teal, bg: C.tealLight, icon: '🥗' }
    if (section.includes('פיזיולוג') || section.includes('גוף')) return { color: C.gold, bg: C.goldLight, icon: '⚡' }
    if (section.includes('לוגי') || section.includes('NLP') || section.includes('דילטס')) return { color: C.purple, bg: C.purpleLight, icon: '🎯' }
    return { color: C.teal, bg: C.cream, icon: '📋' }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, direction: 'rtl' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #f5f0e8 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <div>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #fff 60%, ' + C.tealLight + ')', padding: '32px 20px 28px', textAlign: 'center', boxShadow: '0 2px 24px rgba(0,0,0,0.07)', marginBottom: 28 }}>
          <div style={{ marginBottom: 12, height: 100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src="/logo.png" style={{ height: 100 }} alt="לוגו"
            onError={function(e) { e.target.style.display='none' }} />
        </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.teal }}>בין הראש לצלחת</div>
          <div style={{ fontSize: 14, color: C.gray, marginTop: 4 }}>אתי אטל | יועצת בריאות ותזונה התנהגותית</div>
          {client && (
            <div style={{ marginTop: 16, display: 'inline-block', background: C.goldLight, borderRadius: 16, padding: '10px 24px', border: '2px solid ' + C.gold }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>הדוח האישי של {client.name} 🌿</div>
            </div>
          )}
          <div style={{ fontSize: 13, color: C.gray, marginTop: 10 }}>{new Date().toLocaleDateString('he-IL')}</div>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 30px' }}>

          {/* Macro Chart */}
          <Card title="המצב התזונתי שלך" icon="📊" color={C.teal} bg={C.tealLight}>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ label: 'מצב קיים', data: macroData }, { label: 'יעד מומלץ', data: targetMacro }].map(({ label, data }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: C.gray, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                        {data.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={v => v + '%'} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: C.gray, textAlign: 'center', marginTop: 8, marginBottom: 4, lineHeight: 1.6 }}>
            המטרה: להגדיל את חלק החלבון ולאזן את הפחמימות 🎯
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
              {[{ l: 'פחמימות', c: '#f97316' }, { l: 'חלבון', c: C.teal }, { l: 'שומן', c: C.gold }].map(i => (
                <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: i.c }} />
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{i.l}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Blood Tests */}
          {bloodEntries.length > 0 && (
            <Card title="בדיקות הדם שלך" icon="🩸" color={C.red} bg={C.redLight}>
              {bloodEntries.map(([key, range]) => (
                <BloodBar key={key} label={range.label} value={bloodTests[key]} min={range.min} max={range.max} unit={range.unit} />
              ))}
            </Card>
          )}

          {/* Feedback Sections */}
          {sections.map((section, i) => {
            const style = sectionStyle(section)
            const lines = section.split('\n')
            const title = lines[0].replace(/\*\*/g, '').replace(/[🌟🔍🧠🎯🩸🥗💊💚📊✅⚡]/g, '').replace(/^#+\s*/, '').trim()
            const body = lines.slice(1).join('\n').replace(/\*\*/g, '').trim()
            if (!body) return null
            return (
              <Card key={i} title={title} icon={style.icon} color={style.color} bg={style.bg}>
                <SectionBody text={body} />
              </Card>
            )
          })}

        </div>
      </div>

      {/* Buttons */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 50px' }}>
        

        <div className='no-print' style={{ textAlign: 'center', marginTop: 20, color: C.gray, fontSize: 12 }}>
          בין הראש לצלחת · אתי אטל · 052-333-6766
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a9b8e', fontWeight: 700, fontSize: 16 }}>🌿 טוענת...</div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  )
}

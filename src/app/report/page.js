'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
 
const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}
const ACTIVITY_MULT = {
  'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9
}

function calcTargets(client) {
  if (!client || !client.weight || !client.height || !client.age) return null
  var bmr = client.gender === 'זכר'
    ? 10 * client.weight + 6.25 * client.height - 5 * client.age + 5
    : 10 * client.weight + 6.25 * client.height - 5 * client.age - 161
  var tdee = bmr * (ACTIVITY_MULT[client.activity] || 1.55)
  var adjust = client.goal === 'ירידה במשקל' ? -400 : client.goal === 'עלייה במסה' ? 300 : 0
  var calories = Math.round(tdee + adjust)
  var split = GOALS_SPLIT[client.goal] || GOALS_SPLIT['ירידה במשקל']
  return {
    calories,
    protein: Math.round((calories * split.protein / 100) / 4),
    carbs: Math.round((calories * split.carbs / 100) / 4),
    fat: Math.round((calories * split.fat / 100) / 9),
    proteinPct: split.protein, carbsPct: split.carbs, fatPct: split.fat,
  }
}

function calcNutrition(log, nutritionData) {
  var total = { calories: 0, protein: 0, fat: 0, fiber: 0 }
  function add(id) {
    var item = nutritionData[id]
    if (item) { total.calories += item.calories || 0; total.protein += item.protein || 0; total.fat += item.fat || 0; total.fiber += item.fiber || 0 }
  }
  if (log.had_snack) add('snack')
  if (log.checks) Object.keys(log.checks).forEach(function(id) { if (log.checks[id]) add(id) })
  if (log.carb_sel) add(log.carb_sel)
  if (log.prot_sel) add(log.prot_sel)
  if (log.fat_sel) add(log.fat_sel)
  if (log.veggie_sel) add(log.veggie_sel)
  if (log.benayim_sel) add(log.benayim_sel)
  if (log.had_benayim) add('benayim')
  total.calories += (log.boker_extra_cal || 0) + (log.lunch_extra_cal || 0) + (log.erev_extra_cal || 0)
  var totalCal = total.protein * 4 + total.fat * 9
  total.proteinPct = totalCal > 0 ? Math.round((total.protein * 4 / totalCal) * 100) : 0
  total.fatPct = totalCal > 0 ? Math.round((total.fat * 9 / totalCal) * 100) : 0
  total.carbsPct = Math.max(0, 100 - total.proteinPct - total.fatPct)
  return total
}

// ── גרף טבעת עם אחוזים קבועים ──
function MacroPieChart({ actual, target }) {
  var actualData = [
    { name: 'חלבון', value: actual.proteinPct || 0, color: '#16a34a' },
    { name: 'שומן', value: actual.fatPct || 0, color: '#9333ea' },
    { name: 'פחמימות', value: actual.carbsPct || 0, color: '#f97316' },
  ]
  var targetData = target ? [
    { name: 'חלבון', value: target.proteinPct, color: '#16a34a' },
    { name: 'שומן', value: target.fatPct, color: '#9333ea' },
    { name: 'פחמימות', value: target.carbsPct, color: '#f97316' },
  ] : null

  function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, value }) {
    if (value < 8) return null
    var RADIAN = Math.PI / 180
    var radius = innerRadius + (outerRadius - innerRadius) * 0.5
    var x = cx + radius * Math.cos(-midAngle * RADIAN)
    var y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800}>
        {value}%
      </text>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '16px 12px', marginBottom: 16, border: '1px solid rgba(74,155,142,0.2)' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#2d5a4a', marginBottom: 12, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> המצב התזונתי שלך
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>מצב קיים</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={actualData} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={3} labelLine={false} label={renderLabel}>
                {actualData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 4 }}>{Math.round(actual.calories)} קל</div>
        </div>
        {targetData && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>יעד מומלץ</div>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={targetData} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={3} labelLine={false} label={renderLabel}>
                  {targetData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 4 }}>{target.calories} קל יעד</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {[{ l: 'פחמימות', c: '#f97316' }, { l: 'חלבון', c: '#16a34a' }, { l: 'שומן', c: '#9333ea' }].map(function(i) {
          return <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
            <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{i.l}</span>
          </div>
        })}
      </div>
    </div>
  )
}

function NutritionBar({ label, value, max, color }) {
  var pct = Math.min(100, Math.round((value / (max || 1)) * 100))
  var isGood = pct >= 80
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span style={{ color: '#555', fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{Math.round(value)} <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: isGood ? color : color + 'aa', borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function ReportPage() {
  const [client, setClient] = useState(null)
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [nutritionData, setNutritionData] = useState({})
  const [loading, setLoading] = useState(true)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(function() {
    var params = new URLSearchParams(window.location.search)
    var clientPassword = params.get('client')
    var preview = params.get('preview')
    if (preview) setIsPreview(true)
    if (!clientPassword) { setLoading(false); return }

    async function load() {
      var { data: clientData } = await supabase.from('clients').select('*').eq('password', clientPassword).maybeSingle()
      var { data: profileData } = await supabase.from('client_profiles').select('*').eq('client_password', clientPassword).maybeSingle()
      var { data: logsData } = await supabase.from('daily_logs').select('*').eq('client_name', clientPassword).order('log_date', { ascending: false }).limit(14)
      var { data: nd } = await supabase.from('nutrition_data').select('*')
      var nutritionMap = {}
      if (nd) nd.forEach(function(item) { nutritionMap[item.id] = item })

      setClient(clientData)
      setProfile(profileData)
      setLogs(logsData || [])
      setNutritionData(nutritionMap)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
        <div style={{ fontSize: 16, color: '#4a9b8e', fontWeight: 700 }}>טוען את הדוח...</div>
      </div>
    </div>
  )

  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>לא נמצא דוח</div>
    </div>
  )

  var targets = calcTargets(client)
  var recentLogs = logs.slice(0, 7)
  var avgNutrition = recentLogs.length > 0 ? (function() {
    var totals = recentLogs.map(function(l) { return calcNutrition(l, nutritionData) })
    return {
      calories: totals.reduce(function(s, n) { return s + n.calories }, 0) / totals.length,
      protein: totals.reduce(function(s, n) { return s + n.protein }, 0) / totals.length,
      fat: totals.reduce(function(s, n) { return s + n.fat }, 0) / totals.length,
      proteinPct: Math.round(totals.reduce(function(s, n) { return s + n.proteinPct }, 0) / totals.length),
      fatPct: Math.round(totals.reduce(function(s, n) { return s + n.fatPct }, 0) / totals.length),
      carbsPct: Math.round(totals.reduce(function(s, n) { return s + n.carbsPct }, 0) / totals.length),
    }
  })() : null

  var reportText = profile?.ai_report || ''
  var sections = reportText.split(/\*\*([^*]+)\*\*/).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', direction: 'rtl', fontFamily: 'sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #f8f4ef, #ede6db)', padding: '28px 20px 24px', textAlign: 'center', borderBottom: '2px solid #e0d5c5', position: 'relative' }}>
        {isPreview && (
          <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: '#92400e', fontWeight: 700 }}>
            👁️ תצוגה מקדימה — הלקוחה עדיין לא רואה את זה
          </div>
        )}
        <img src="/logo.png" alt="בין הראש לצלחת" style={{ height: 80, width: 'auto', marginBottom: 8 }} />
        <div style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 900, color: '#3a7a6e', marginBottom: 4 }}>
          🌿 הדוח האישי של {client.name}
        </div>
        <div style={{ fontSize: 13, color: '#9a8a7a' }}>
          {new Date().toLocaleDateString('he-IL')}
        </div>
        <div style={{ display: 'inline-block', background: '#4a9b8e', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 16px', borderRadius: 99, marginTop: 10 }}>
          תצוגה מקדימה — הלקוחה עדיין לא רואה ✨
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 16px 60px' }}>

        {/* גרף תזונה ממוצע */}
        {avgNutrition && (
          <MacroPieChart actual={avgNutrition} target={targets} />
        )}

        {/* פסי תזונה */}
        {avgNutrition && targets && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 16, border: '1.5px solid #e0d5c5' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#3a7a6e', marginBottom: 12 }}>📈 ממוצע שבועי מול יעד</div>
            <NutritionBar label="קלוריות" value={avgNutrition.calories} max={targets.calories} color="#f97316" />
            <NutritionBar label="חלבון (g)" value={avgNutrition.protein} max={targets.protein} color="#16a34a" />
            <NutritionBar label="שומן (g)" value={avgNutrition.fat} max={targets.fat} color="#9333ea" />
          </div>
        )}

        {/* תוכן הדוח */}
        {reportText ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 18px', border: '1.5px solid #e0d5c5' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#3a7a6e', marginBottom: 16 }}>📋 הניתוח האישי שלך</div>
            {reportText.split('\n').map(function(line, i) {
              if (!line.trim()) return <div key={i} style={{ height: 8 }} />
              if (line.startsWith('**') && line.endsWith('**')) {
                return <div key={i} style={{ fontWeight: 800, fontSize: 15, color: '#3a7a6e', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {line.replace(/\*\*/g, '')}
                </div>
              }
              if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
                return <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                  <span style={{ color: '#4a9b8e', flexShrink: 0 }}>•</span>
                  <span>{line.replace(/^[*\-•]\s*/, '')}</span>
                </div>
              }
              return <div key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 4 }}>{line}</div>
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', border: '1.5px solid #e0d5c5' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <div style={{ fontSize: 15, color: '#9a8a7a' }}>הדוח האישי שלך בהכנה — אתי תשלח בקרוב</div>
          </div>
        )}

        {/* footer */}
        <div style={{ textAlign: 'center', marginTop: 24, padding: '16px', borderTop: '1px solid #e0d5c5' }}>
          <div style={{ fontSize: 13, color: '#9a8a7a' }}>
            <strong style={{ color: '#3a7a6e' }}>אתי אטל</strong> · יועצת בריאות ותזונה התנהגותית
          </div>
          <div style={{ fontSize: 12, color: '#9a8a7a', marginTop: 4 }}>052-333-6766 · Attal.eti@gmail.com</div>
          <div style={{ fontSize: 11, color: '#c4a882', marginTop: 8 }}>בין הראש לצלחת © 2026</div>
        </div>
      </div>
    </div>
  )
}

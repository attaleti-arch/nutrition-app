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
    if (item) {
      total.calories += item.calories || 0
      total.protein += item.protein || 0
      total.fat += item.fat || 0
      total.fiber += item.fiber || 0
    }
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

  if (loading) return <div>טוען...</div>
  if (!client) return <div>לא נמצא דוח</div>

  var reportText = profile?.ai_report || ''

  return (
    <div style={{ background: '#f5f0e8', direction: 'rtl', fontFamily: 'sans-serif', padding: 20 }}>
      {reportText ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 18px', border: '1.5px solid #e0d5c5' }}>
          
          <div style={{ fontWeight: 800, fontSize: 15, color: '#3a7a6e', marginBottom: 16 }}>
            📋 הניתוח האישי שלך
          </div>

          {reportText.split(/\n\s*--\s*\n/).map(function(section, index) {

            const colors = [
              { color: '#16a34a', light: '#f0fdf4' },
              { color: '#0284c7', light: '#eff6ff' },
              { color: '#9333ea', light: '#faf5ff' },
              { color: '#dc2626', light: '#fef2f2' },
              { color: '#d97706', light: '#fffbeb' },
              { color: '#0d9488', light: '#f0fdfa' }
            ]

            const c = colors[index % colors.length]

            return (
              <div
                key={index}
                style={{
                  background: c.light,
                  borderRadius: 14,
                  padding: '18px 16px',
                  marginBottom: 14,
                  borderTop: `5px solid ${c.color}`,
                  boxShadow: `0 4px 12px ${c.color}20`
                }}
              >
                {section.split('\n').map(function(line, i) {

                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />

                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <div
                        key={i}
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: c.color,
                          margin: '12px 0 6px'
                        }}
                      >
                        {line.replace(/\*\*/g, '')}
                      </div>
                    )
                  }

                  if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          padding: '4px 0',
                          fontSize: 14,
                          color: '#374151',
                          lineHeight: 1.6
                        }}
                      >
                        <span style={{ color: c.color }}>•</span>
                        <span>{line.replace(/^[*\-•]\s*/, '')}</span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: 14,
                        color: '#374151',
                        lineHeight: 1.8,
                        marginBottom: 4
                      }}
                    >
                      {line}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        <div>הדוח בהכנה</div>
      )}
    </div>
  )
}

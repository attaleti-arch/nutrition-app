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
  'יושבני': 1.2,
  'קל': 1.375,
  'בינוני': 1.55,
  'פעיל': 1.725,
  'מאוד פעיל': 1.9
}

function calcTargets(client) {
  if (!client || !client.weight || !client.height || !client.age) return null

  var bmr = client.gender === 'זכר'
    ? 10 * client.weight + 6.25 * client.height - 5 * client.age + 5
    : 10 * client.weight + 6.25 * client.height - 5 * client.age - 161

  var tdee = bmr * (ACTIVITY_MULT[client.activity] || 1.55)

  var adjust =
    client.goal === 'ירידה במשקל'
      ? -400
      : client.goal === 'עלייה במסה'
      ? 300
      : 0

  var calories = Math.round(tdee + adjust)
  var split = GOALS_SPLIT[client.goal] || GOALS_SPLIT['ירידה במשקל']

  return {
    calories,
    protein: Math.round((calories * split.protein / 100) / 4),
    carbs: Math.round((calories * split.carbs / 100) / 4),
    fat: Math.round((calories * split.fat / 100) / 9),
    proteinPct: split.protein,
    carbsPct: split.carbs,
    fatPct: split.fat,
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
  if (log.checks)
    Object.keys(log.checks).forEach(function(id) {
      if (log.checks[id]) add(id)
    })

  if (log.carb_sel) add(log.carb_sel)
  if (log.prot_sel) add(log.prot_sel)
  if (log.fat_sel) add(log.fat_sel)
  if (log.veggie_sel) add(log.veggie_sel)
  if (log.benayim_sel) add(log.benayim_sel)
  if (log.had_benayim) add('benayim')

  total.calories +=
    (log.boker_extra_cal || 0) +
    (log.lunch_extra_cal || 0) +
    (log.erev_extra_cal || 0)

  var totalCal = total.protein * 4 + total.fat * 9

  total.proteinPct =
    totalCal > 0
      ? Math.round((total.protein * 4 / totalCal) * 100)
      : 0

  total.fatPct =
    totalCal > 0
      ? Math.round((total.fat * 9 / totalCal) * 100)
      : 0

  total.carbsPct = Math.max(
    0,
    100 - total.proteinPct - total.fatPct
  )

  return total
}

function BloodTestBar({ test }) {
  const rawPct =
    ((test.result - test.min) /
      (test.max - test.min)) *
    100

  const percentage = Math.min(
    100,
    Math.max(0, rawPct)
  )

  return (
    <div
      style={{
        marginBottom: 14,
        background: '#fff',
        padding: 14,
        borderRadius: 12,
        border: '1.5px solid #fecaca',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 700,
          color: '#dc2626',
        }}
      >
        <span>{test.test_name}</span>
        <span>{test.result}</span>
      </div>

      <div
        style={{
          height: 8,
          background: '#f3f4f6',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: percentage + '%',
            height: '100%',
            background: '#dc2626',
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: '#dc2626',
          fontWeight: 600,
        }}
      >
        ⚠ חריגה מהטווח התקין
      </div>
    </div>
  )
}
export default function ReportPage() {
  const [client, setClient] = useState(null)
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [nutritionData, setNutritionData] = useState({})
  const [bloodTests, setBloodTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(function() {
    var params = new URLSearchParams(window.location.search)
    var clientPassword = params.get('client')
    var preview = params.get('preview')

    if (preview) setIsPreview(true)
    if (!clientPassword) {
      setLoading(false)
      return
    }

    async function load() {
      var { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('password', clientPassword)
        .maybeSingle()

      var { data: profileData } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('client_password', clientPassword)
        .maybeSingle()

      var { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('client_name', clientPassword)
        .order('log_date', { ascending: false })
        .limit(14)

      var { data: nd } = await supabase
        .from('nutrition_data')
        .select('*')

      var nutritionMap = {}
      if (nd) {
        nd.forEach(function(item) {
          nutritionMap[item.id] = item
        })
      }

      var { data: labsData } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('client_id', clientData?.id)

      setClient(clientData)
      setProfile(profileData)
      setLogs(logsData || [])
      setNutritionData(nutritionMap)
      setBloodTests(labsData || [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading)
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f0e8'
      }}>
        טוען...
      </div>
    )

  if (!client)
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        לא נמצא דוח
      </div>
    )

  const abnormalTests = bloodTests.filter(function(t) {
    if (t.min == null || t.max == null) return false
    return t.result < t.min || t.result > t.max
  })

  var targets = calcTargets(client)
  var recentLogs = logs.slice(0, 7)

  var avgNutrition = recentLogs.length > 0
    ? (function() {
        var totals = recentLogs.map(function(l) {
          return calcNutrition(l, nutritionData)
        })

        return {
          calories:
            totals.reduce(function(s, n) { return s + n.calories }, 0) / totals.length,
          protein:
            totals.reduce(function(s, n) { return s + n.protein }, 0) / totals.length,
          fat:
            totals.reduce(function(s, n) { return s + n.fat }, 0) / totals.length,
          proteinPct:
            Math.round(totals.reduce(function(s, n) { return s + n.proteinPct }, 0) / totals.length),
          fatPct:
            Math.round(totals.reduce(function(s, n) { return s + n.fatPct }, 0) / totals.length),
          carbsPct:
            Math.round(totals.reduce(function(s, n) { return s + n.carbsPct }, 0) / totals.length),
        }
      })()
    : null

  var reportText = profile?.ai_report || ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f0e8',
      direction: 'rtl',
      fontFamily: 'sans-serif'
    }}>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          button { display: none !important; }
        }
      `}</style>

      {/* כפתור PDF */}
      <div style={{ textAlign: 'center', padding: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            background: '#3a7a6e',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          📄 הורדה כ‑PDF
        </button>
      </div>

      {/* בדיקות דם חריגות בלבד */}
      {abnormalTests.length > 0 && (
        <div style={{
          background: '#fef2f2',
          padding: 20,
          margin: 16,
          borderRadius: 16,
          border: '1.5px solid #fecaca'
        }}>
          <div style={{
            fontWeight: 800,
            color: '#dc2626',
            marginBottom: 12
          }}>
            ⚠ בדיקות דם הדורשות התייחסות
          </div>

          {abnormalTests.map(function(t, i) {
            return <BloodTestBar key={i} test={t} />
          })}
        </div>
      )}

      {/* ניתוח טקסט עם אנימציה */}
      {reportText && (
        <div style={{ padding: 20 }}>
          {reportText.split(/\\n\\s*--\\s*\\n/).map(function(section, index) {
            return (
              <div
                key={index}
                style={{
                  background: '#fff',
                  padding: 20,
                  marginBottom: 16,
                  borderRadius: 16,
                  animation: 'fadeInUp 0.6s ease forwards',
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0
                }}
              >
                {section}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

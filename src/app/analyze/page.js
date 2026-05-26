'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PROT_NAMES = {
  p1: '200 גרם דג לבן', p2: '100 גרם סלמון', p3: '150 גרם טופו',
  p4: '100 גרם סינטה / 120 גרם פרגית', p5: '140 גרם ירך עוף',
  p6: 'המבורגר צמחוני', p7: 'דג שמן / סלמון', p8: '3 ביצים / אומלט'
}
const CARB_NAMES = {
  c1: '150 גרם אורז / קינואה', c2: '200 גרם בורגול', c3: '110 גרם פתיתים',
  c4: '170 גרם תפוחי אדמה / בטטה', c5: '150 גרם כרובית / ברוקולי'
}

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
    proteinPct: split.protein,
    carbsPct: split.carbs,
    fatPct: split.fat,
  }
}

function calcNutrition(log, nutritionData) {
  var total = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
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
  if (log.had_benayim) add('benayim')
  var totalCal = total.protein * 4 + total.fat * 9
  total.proteinPct = totalCal > 0 ? Math.round((total.protein * 4 / totalCal) * 100) : 0
  total.fatPct = totalCal > 0 ? Math.round((total.fat * 9 / totalCal) * 100) : 0
  total.carbsPct = 100 - total.proteinPct - total.fatPct
  return total
}

function MacroPieChart({ actual, target, title }) {
  var actualData = [
    { name: 'חלבון', value: actual.proteinPct, color: '#16a34a' },
    { name: 'שומן', value: actual.fatPct, color: '#9333ea' },
    { name: 'פחמימות', value: Math.max(0, actual.carbsPct), color: '#f97316' },
  ]
  var targetData = target ? [
    { name: 'חלבון', value: target.proteinPct, color: '#16a34a' },
    { name: 'שומן', value: target.fatPct, color: '#9333ea' },
    { name: 'פחמימות', value: target.carbsPct, color: '#f97316' },
  ] : null

  return (
    <div style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#111' }}>{title}</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>בפועל</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={actualData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                {actualData.map(function(entry, i) { return <Cell key={i} fill={entry.color} stroke="none" /> })}
              </Pie>
              <Tooltip formatter={function(v) { return v + '%' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, color: '#555' }}>{Math.round(actual.calories)} קל</div>
        </div>
        {targetData && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>יעד אישי</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={targetData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {targetData.map(function(entry, i) { return <Cell key={i} fill={entry.color} stroke="none" /> })}
                </Pie>
                <Tooltip formatter={function(v) { return v + '%' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, color: '#555' }}>{target.calories} קל יעד</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        {[{ l: 'חלבון', c: '#16a34a' }, { l: 'שומן', c: '#9333ea' }, { l: 'פחמימות', c: '#f97316' }].map(function(i) {
          return (
            <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
              <span style={{ fontSize: 12, color: '#555' }}>{i.l}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NutritionBar({ label, value, max, color }) {
  var pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: '#555' }}>{label}</span>
        <span style={{ fontWeight: 700, color: color }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99 }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [nutritionData, setNutritionData] = useState({})

  useEffect(function() {
    async function loadNutrition() {
      var { data } = await supabase.from('nutrition_data').select('*')
      var nd = {}
      if (data) data.forEach(function(item) { nd[item.id] = item })
      setNutritionData(nd)
    }
    loadNutrition()
  }, [])

  const login = async () => {
    if (pin !== 'Esterika26') return
    setAuth(true)
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  const loadLogs = async (client) => {
    setSelected(client)
    setSelectedClient(client)
    setAnalysis('')
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('client_name', client.password)
      .order('log_date', { ascending: false })
      .limit(7)
    setLogs(data || [])
  }

  const analyze = async () => {
    if (!logs.length || !selected) return
    setLoading(true)
    var targets = calcTargets(selectedClient)
    const summary = logs.map(function(l) {
      var nut = calcNutrition(l, nutritionData)
      return 'תאריך: ' + l.log_date +
        ' | קלוריות: ' + Math.round(nut.calories) +
        (targets ? ' (יעד: ' + targets.calories + ')' : '') +
        ' | חלבון: ' + Math.round(nut.protein) + 'g' +
        (targets ? ' (יעד: ' + targets.protein + 'g)' : '') +
        ' | שומן: ' + Math.round(nut.fat) + 'g' +
        (targets ? ' (יעד: ' + targets.fat + 'g)' : '') +
        ' | סיבים: ' + Math.round(nut.fiber) + 'g' +
        ' | מים: ' + (l.water || 0) + ' כוסות' +
        ' | צעדים: ' + (l.steps || 0) +
        ' | פחמימה: ' + (CARB_NAMES[l.carb_sel] || 'לא נבחר') +
        ' | חלבון נבחר: ' + (PROT_NAMES[l.prot_sel] || 'לא נבחר') +
        ' | חטיף בוקר: ' + (l.had_snack ? 'כן' : 'לא') +
        ' | ביניים: ' + (l.had_benayim ? 'כן' : 'לא') +
        ' | בוקר נוסף: ' + (l.boker_free || '') +
        ' | צהריים נוסף: ' + (l.lunch_free || '') +
        ' | ערב נוסף: ' + (l.erev_free || '') +
        ' | הערה: ' + (l.note || '')
    }).join('\n')

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected.name, logs: summary })
    })
    const data = await res.json()
    setAnalysis(data.result)
    setLoading(false)
  }

  if (!auth) return (
    <div style={{padding:40,textAlign:'center',direction:'rtl',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f0fdf4'}}>
      <div style={{fontSize:32,marginBottom:8}}>🥗</div>
      <h2 style={{marginBottom:20,color:'#0f4c2a'}}>ניתוח תזונה AI</h2>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        placeholder="סיסמה..."
        style={{padding:12,fontSize:16,borderRadius:12,border:'2px solid #e5e7eb',width:220,textAlign:'center',marginBottom:12,outline:'none'}} />
      <button onClick={login} style={{padding:'12px 32px',borderRadius:12,background:'#0f4c2a',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:16}}>כניסה</button>
    </div>
  )

  var targets = calcTargets(selectedClient)

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',direction:'rtl'}}>
      <div style={{background:'linear-gradient(135deg,#0f4c2a,#16a34a)',padding:'20px 24px',color:'#fff'}}>
        <div style={{fontSize:11,color:'#86efac'}}>בין הראש לצלחת</div>
        <div style={{fontSize:22,fontWeight:900}}>🤖 ניתוח תזונה AI</div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
          <div style={{fontWeight:700,marginBottom:10}}>בחרי לקוח:</div>
          {clients.map(c => (
            <button key={c.id} onClick={() => loadLogs(c)} style={{
              display:'block',width:'100%',textAlign:'right',
              padding:'10px 14px',marginBottom:6,borderRadius:10,
              border:'2px solid ' + (selected?.id === c.id ? '#0f4c2a' : '#e5e7eb'),
              background: selected?.id === c.id ? '#dcfce7' : '#fff',
              cursor:'pointer',fontWeight:600,fontSize:15
            }}>
              {c.name}
              {c.goal && <span style={{fontSize:12,color:'#9ca3af',marginRight:8}}>— {c.goal}</span>}
            </button>
          ))}
        </div>

        {selected && logs.length > 0 && (
          <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
            <div style={{fontWeight:700,marginBottom:12}}>📅 {logs.length} רשומות אחרונות:</div>
            {logs.map(function(l) {
              var nut = calcNutrition(l, nutritionData)
              return (
                <div key={l.id} style={{marginBottom:20,paddingBottom:20,borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:'#111'}}>{l.log_date}</div>
                  <MacroPieChart actual={nut} target={targets} title="" />
                  <NutritionBar label="קלוריות" value={nut.calories} max={targets ? targets.calories : 2000} color="#f97316" />
                  <NutritionBar label="חלבון (g)" value={nut.protein} max={targets ? targets.protein : 100} color="#16a34a" />
                  <NutritionBar label="שומן (g)" value={nut.fat} max={targets ? targets.fat : 70} color="#9333ea" />
                  <NutritionBar label="סיבים (g)" value={nut.fiber} max={30} color="#0284c7" />
                  <div style={{fontSize:12,color:'#9ca3af',marginTop:6}}>
                    💧 {l.water || 0}/8 כוסות | 🚶 {l.steps || 0} צעדים
                  </div>
                </div>
              )
            })}
            <button onClick={analyze} disabled={loading} style={{
              width:'100%',padding:14,borderRadius:12,marginTop:4,
              background: loading ? '#9ca3af' : '#0f4c2a',
              color:'#fff',border:'none',cursor: loading ? 'default' : 'pointer',
              fontWeight:700,fontSize:16
            }}>
              {loading ? '⏳ מנתחת...' : '🤖 נתחי עם AI'}
            </button>
          </div>
        )}

        {selected && logs.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:30}}>אין רשומות עדיין</div>
        )}

        {analysis && (
          <div style={{background:'#fff',borderRadius:20,padding:20,border:'1.5px solid #f0f0f0',fontSize:15,lineHeight:1.8,whiteSpace:'pre-wrap'}}>
            {analysis}
          </div>
        )}
      </div>
    </div>
  )
}

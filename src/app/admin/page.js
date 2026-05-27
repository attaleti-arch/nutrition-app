'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}
const ACTIVITY_MULT = {
  'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9
}
const PROT_NAMES = {
  p1: 'דג לבן', p2: 'סלמון', p3: 'טופו', p4: 'סינטה/פרגית',
  p5: 'ירך עוף/הודו', p6: 'המבורגר צמחוני', p7: 'דג שמן', p8: 'ביצים', p9: 'טונה/סרדינים'
}
const CARB_NAMES = {
  c1: 'אורז/קינואה', c2: 'בורגול/כוסמת', c3: 'פתיתים/קוסקוס',
  c4: 'תפוחי אדמה/בטטה', c5: 'כרובית/ברוקולי', c6: 'עדשים/חומוס', c7: 'שעועית'
}

const DOCTOR_TESTS = [
  { key: 'blood_count', label: 'ספירת דם מלאה' },
  { key: 'cholesterol_full', label: 'ברור כולסטרול — LDL, HDL וכולסטרול כולל בצום' },
  { key: 'triglycerides', label: 'שומנים (טריגליצרידים) בצום' },
  { key: 'glucose', label: 'סוכר בדם בצום' },
  { key: 'hba1c', label: 'המוגלובין A1C' },
  { key: 'anemia', label: 'ברור אנמיה — חומצה פולית, B12, ברזל, פריטין, טרנספרין' },
  { key: 'vitamin_d', label: 'ויטמין D' },
  { key: 'minerals', label: 'סידן, אבץ ומגנזיום' },
  { key: 'blood_chemistry', label: 'כימיה של הדם' },
  { key: 'food_sensitivity', label: 'רגישות למזון — לקטוז, גלוטן, צליאק' },
  { key: 'liver_kidney', label: 'תפקודי כבד וכליה' },
  { key: 'thyroid', label: 'תפקודי בלוטת התריס — TSH, T3, T4' },
  { key: 'hormones', label: 'פרופיל הורמונאלי — הורמוני מין' },
  { key: 'inflammation', label: 'מדדי דלקת — שקיעת דם ESR, CRP' },
  { key: 'homocysteine', label: 'רמות הומוציסטאין, B12, B6, חומצה פולית' },
  { key: 'blood_type', label: 'סוג דם' },
  { key: 'insulin', label: 'אינסולין בצום' },
  { key: 'urine', label: 'בדיקת שתן כללית ולתרבית' },
]

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
  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>בפועל</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={actualData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} dataKey="value" paddingAngle={3}>
                {actualData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
              </Pie>
              <Tooltip formatter={function(v) { return v + '%' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{Math.round(actual.calories)} קל</div>
        </div>
        {targetData && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>יעד</div>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={targetData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} dataKey="value" paddingAngle={3}>
                  {targetData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
                </Pie>
                <Tooltip formatter={function(v) { return v + '%' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{target.calories} קל יעד</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
        {[{ l: 'חלבון', c: '#16a34a' }, { l: 'שומן', c: '#9333ea' }, { l: 'פחמימות', c: '#f97316' }].map(function(i) {
          return <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: i.c }} /><span style={{ fontSize: 11, color: '#555' }}>{i.l}</span></div>
        })}
      </div>
    </div>
  )
}

function NutritionBar({ label, value, max, color }) {
  var pct = Math.min(100, Math.round((value / (max || 1)) * 100))
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color: '#555' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99 }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type, rows }) {
  if (type === 'boolean') {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onChange(true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === true ? '#0f4c2a' : '#e5e7eb'), background: value === true ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === true ? '#0f4c2a' : '#555' }}>כן</button>
          <button onClick={() => onChange(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === false ? '#ef4444' : '#e5e7eb'), background: value === false ? '#fef2f2' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === false ? '#ef4444' : '#555' }}>לא</button>
        </div>
      </div>
    )
  }
  if (rows) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
      </div>
    )
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <input type={type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
    </div>
  )
}

function QSection({ title, icon, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? '#f0fdf4' : '#fff', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
        <span style={{ color: '#16a34a', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '4px 18px 16px' }}>{children}</div>}
    </div>
  )
}

const BLOOD_TESTS = [
  { key: 'glucose', label: 'סוכר בדם בצום', unit: 'mg/dL', normal: '70-100' },
  { key: 'hba1c', label: 'המוגלובין A1C', unit: '%', normal: '<5.7' },
  { key: 'cholesterol', label: 'כולסטרול כללי', unit: 'mg/dL', normal: '<200' },
  { key: 'hdl', label: 'כולסטרול טוב HDL', unit: 'mg/dL', normal: '>60' },
  { key: 'ldl', label: 'כולסטרול רע LDL', unit: 'mg/dL', normal: '<100' },
  { key: 'triglycerides', label: 'טריגליצרידים בצום', unit: 'mg/dL', normal: '<150' },
  { key: 'hemoglobin', label: 'המוגלובין', unit: 'g/dL', normal: 'נשים: 12-16' },
  { key: 'ferritin', label: 'פריטין (ברזל)', unit: 'ng/mL', normal: '12-150' },
  { key: 'iron', label: 'ברזל בדם', unit: 'μg/dL', normal: '60-170' },
  { key: 'transferrin', label: 'טרנספרין', unit: 'mg/dL', normal: '200-360' },
  { key: 'folic_acid', label: 'חומצה פולית', unit: 'ng/mL', normal: '3-17' },
  { key: 'vitamin_b12', label: 'ויטמין B12', unit: 'pg/mL', normal: '200-900' },
  { key: 'vitamin_b6', label: 'ויטמין B6', unit: 'ng/mL', normal: '5-50' },
  { key: 'vitamin_d', label: 'ויטמין D', unit: 'ng/mL', normal: '30-100' },
  { key: 'calcium', label: 'סידן', unit: 'mg/dL', normal: '8.5-10.5' },
  { key: 'zinc', label: 'אבץ', unit: 'μg/dL', normal: '70-120' },
  { key: 'magnesium', label: 'מגנזיום', unit: 'mg/dL', normal: '1.7-2.2' },
  { key: 'tsh', label: 'בלוטת התריס TSH', unit: 'mIU/L', normal: '0.4-4.0' },
  { key: 't3', label: 'T3', unit: 'pg/mL', normal: '2.3-4.2' },
  { key: 't4', label: 'T4', unit: 'ng/dL', normal: '0.8-1.8' },
  { key: 'crp', label: 'דלקת CRP', unit: 'mg/L', normal: '<1.0' },
  { key: 'esr', label: 'שקיעת דם ESR', unit: 'mm/hr', normal: 'נשים: <20' },
  { key: 'homocysteine', label: 'הומוציסטאין', unit: 'μmol/L', normal: '<15' },
  { key: 'alt', label: 'תפקוד כבד ALT', unit: 'U/L', normal: '<35' },
  { key: 'ast', label: 'תפקוד כבד AST', unit: 'U/L', normal: '<40' },
  { key: 'creatinine', label: 'קריאטינין (כליות)', unit: 'mg/dL', normal: '0.6-1.2' },
  { key: 'urea', label: 'אוריאה', unit: 'mg/dL', normal: '7-20' },
  { key: 'uric_acid', label: 'חומצה אורית', unit: 'mg/dL', normal: 'נשים: 2.4-6.0' },
  { key: 'estrogen', label: 'אסטרוגן', unit: 'pg/mL', normal: 'תלוי מחזור' },
  { key: 'progesterone', label: 'פרוגסטרון', unit: 'ng/mL', normal: 'תלוי מחזור' },
  { key: 'testosterone', label: 'טסטוסטרון', unit: 'ng/dL', normal: 'נשים: 15-70' },
  { key: 'insulin', label: 'אינסולין בצום', unit: 'μU/mL', normal: '2-25' },
  { key: 'lactose_sensitivity', label: 'רגישות ללקטוז', unit: '', normal: 'שלילי' },
  { key: 'gluten_sensitivity', label: 'רגישות לגלוטן', unit: '', normal: 'שלילי' },
  { key: 'celiac', label: 'צליאק', unit: '', normal: 'שלילי' },
  { key: 'blood_type', label: 'סוג דם', unit: '', normal: '' },
  { key: 'wbc', label: 'ספירת דם — כדוריות לבנות WBC', unit: 'K/μL', normal: '4.5-11.0' },
  { key: 'rbc', label: 'ספירת דם — כדוריות אדומות RBC', unit: 'M/μL', normal: 'נשים: 4.0-5.2' },
  { key: 'platelets', label: 'טסיות דם', unit: 'K/μL', normal: '150-400' },
  { key: 'urine_general', label: 'בדיקת שתן כללית', unit: '', normal: 'תקין' },
  { key: 'urine_culture', label: 'בדיקת שתן לתרבית', unit: '', normal: 'שלילי' },
]

function NutritionRow({ item, onSave }) {
  const [vals, setVals] = useState(item)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '8px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{item.name}</div>
      {['calories', 'protein', 'fat', 'fiber'].map(function(field) {
        return <input key={field} type="number" value={vals[field] || 0} onChange={function(e) { setVals(function(v) { return { ...v, [field]: Number(e.target.value) } }) }} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
      })}
      <button onClick={async function() { setSaving(true); await onSave(vals); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }} style={{ padding: '6px 10px', borderRadius: 8, background: saved ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
        {saving ? '...' : saved ? '✓' : 'שמור'}
      </button>
    </div>
  )
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [profile, setProfile] = useState({})
  const [nutritionItems, setNutritionItems] = useState([])
  const [nutritionData, setNutritionData] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('logs')
  const [scanLoading, setScanLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [filterMode, setFilterMode] = useState('week')
  const [feedback, setFeedback] = useState({})
  const [savingFeedback, setSavingFeedback] = useState(null)
  const [sentFeedback, setSentFeedback] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [patientId, setPatientId] = useState('')
  const [selectedTests, setSelectedTests] = useState({})
  const [newClient, setNewClient] = useState({ name: '', last_name: '', password: '', phone: '', age: '', weight: '', height: '', goal: 'ירידה במשקל', activity: 'בינוני', gender: 'נקבה' })
  const [addingClient, setAddingClient] = useState(false)
  const [clientAdded, setClientAdded] = useState('')

  const login = () => { if (pin === 'Esterika26') setAuth(true) }

  useEffect(function() { if (auth) { loadClients(); loadNutritionData() } }, [auth])

  async function loadNutritionData() {
    var { data } = await supabase.from('nutrition_data').select('*')
    var nd = {}
    if (data) data.forEach(function(item) { nd[item.id] = item })
    setNutritionData(nd)
  }

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  async function loadProfile(client) {
    setSelectedClient(client)
    setProfile({})
    setTab('logs')
    setAiAnalysis('')
    setLogs([])
    setFilteredLogs([])
    setPatientId('')
    setSelectedTests({})
    const { data } = await supabase.from('client_profiles').select('*').eq('client_password', client.password).maybeSingle()
    if (data) setProfile(data)
    else setProfile({ client_password: client.password, blood_tests: {} })
    const { data: nd } = await supabase.from('nutrition_data').select('*').order('id')
    setNutritionItems(nd || [])
    const { data: logsData } = await supabase.from('daily_logs').select('*').eq('client_name', client.password).order('log_date', { ascending: false }).limit(30)
    setLogs(logsData || [])
    applyFilter(logsData || [], 'week', '', '')
  }

  function applyFilter(allLogs, mode, from, to) {
    if (mode === 'today') {
      var today = new Date().toLocaleDateString('sv-SE')
      setFilteredLogs(allLogs.filter(function(l) { return l.log_date === today }))
    } else if (mode === 'week') {
      var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      setFilteredLogs(allLogs.filter(function(l) { return l.log_date >= weekAgo.toLocaleDateString('sv-SE') }))
    } else if (mode === 'custom' && from && to) {
      setFilteredLogs(allLogs.filter(function(l) { return l.log_date >= from && l.log_date <= to }))
    } else {
      setFilteredLogs(allLogs)
    }
  }

  useEffect(function() { applyFilter(logs, filterMode, dateFrom, dateTo) }, [logs, filterMode, dateFrom, dateTo])

  function updateProfile(field, value) { setProfile(p => ({ ...p, [field]: value })) }
  function updateBloodTest(key, value) { setProfile(p => ({ ...p, blood_tests: { ...(p.blood_tests || {}), [key]: value } })) }
  function toggleTest(key) { setSelectedTests(t => ({ ...t, [key]: !t[key] })) }
  function selectAllTests() { var all = {}; DOCTOR_TESTS.forEach(t => { all[t.key] = true }); setSelectedTests(all) }
  function clearAllTests() { setSelectedTests({}) }

  function openDoctorLetter() {
    if (!selectedClient) return
    var today = new Date().toLocaleDateString('he-IL')
    var fullName = (selectedClient.name || '') + ' ' + (selectedClient.last_name || '')
    var id = patientId || '___________'
    var tests = DOCTOR_TESTS.filter(t => selectedTests[t.key]).map(t => '<tr><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #f0f0f0;">❑ ' + t.label + '</td></tr>').join('')
    if (!tests) { alert('בחרי לפחות בדיקה אחת'); return }

    var html = '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;direction:rtl;padding:40px;color:#222;max-width:700px;margin:0 auto}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #0f4c2a;padding-bottom:20px}.logo{height:80px;margin-bottom:10px}.name{font-size:22px;font-weight:bold;color:#0f4c2a}.title{font-size:13px;color:#666}table{width:100%;border-collapse:collapse;margin:16px 0}.signature{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px}p{line-height:1.8;font-size:15px}</style></head><body>' +
      '<div class="header">' +
      '<img class="logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAnOElEQVR42u2dd3wU1drHn3POtG1phITe7AkoXkRAxQBSQge5u4ogKGpQJCCEEkSY7EVpGnq5YMEG6K7SpAQBQwRFFGxAvKAgHUJI2Wybes77RxKNKN573+v7XsD5fj75sMvOnpk5c37zlPPMWQALCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLi/8nGANk9YKFxe9jicTC4rfIzR1js3rhygBbXfDfdqd8hDEZ+3w+AgCwdvOcjOtaNNyzYoUsMQaIMYby82XOcrss/uRCkfH8zfPF9dtzD3/+3Qq2Zuu8wQAAPp+b1NzG6inLglzzATirshYfbfMu2b/3+VfyPvjbbQh5aX1q1jeY3iAYCpkYaBsAQE7no9zpTWPHBrY/8/mR9co9jAHKz5c5qyctgVybkTcChjwekzFAwLTz9eo5HouvhT7esWPGbQJ1nGeMVXAiTwymHwcAdjPbtqJ+QylX04zbFZMdQwhYx45ew+pJSyDXJAfz5IQfPlmShBCwAr7z9COHAxvq1LHFYBaZ3qfP8AjHSUvDAeNsubPW8h82ZrdqmkAGhi+ESsuZy33bgNmnc8eMseXnL0u03C1LINeWa1UVS0iamlnXPFt0etOEj/qXbkz4aFfagJMnlftNk3sFAKBfpzF/K/qhOPXxex4P8gBlQc3++IEiaHtDzxnr8vJeGtR24HVFKgvv2LmzSUxlEG8F7/+nFt/qgv+/vmYM4PhOWUSRyGCnQFoKF0pzYgYtv1i9weq8xQ0JxS6ECEKImWeo/ezoHg9XVH++eWvu4Ng4sUVpIPxK764Tv2eMIYQQs7rWEsg1gc/nIx6Px6x+/86Hy9uaVO0KlN6GGI4lhNMwQwoDhDDhdJPpNgADqGmeJgg+PXSy9H3vcG8EAMDHfMSDfm7LwhLINSEOny/XhmP5kYBQb0B8EUU4LxINHhAoOTFQ/eQi8vh/GvSbN88XQwZLprxwI2DamWB2J0bkeyWqvTSo9zPfMyZjBF4GCCwrYgnkKo09GEMIEAAC9s7WhQ9ymMtkCL6JRvVlQ3qP+ubfE9kiJ58oDqIMBum6vv7B9BG5P+3DcrUsgVyV4qgauG9umP064cWGjOJnBvfMPFC9jSzLuEMq2F1YeUrCkFiuqH6d4eMuTLMFSXKVhzTfvQ/P2bF583yxR4/RKgDAW5vnx3DAzTaMaGzk3JEhw4cv1y2RWAK5ysQBKAdkBDmAm7WybwWAH4f2mfj4z9ZAFpq5+FrHCkvKmzRxLiSIFQlU/yyiqcMIZo0B45ccNvvZsEqnh3TyWIeBz3936T7e2vhSNgDcV3r0RK/SUQl6DuQwSySWQK6OmKMqiH5nyyKfycxzg3qMHs0YQ1veHuWK4cmzRLDXI0RgAZWtdrFI1pZCezev10vXvTLMVZvY69/96KJ/AADsX5OzQqfkI0aVFgLR4jRqlgeC0YXpw5aeAgBYnbdwIgGuuSf9qYcvTQJYWAK5ogPylZvmjUZAejzUM7Nbfr7MwXHgQChZTxDaa6oJczo+6i0HAPjkzadfQIgl3vXwkuE129njy36Aw8RTGokbEmPTriMoGMJMb68xPIwK9oFntdQij8djvvfh8tWmYWx7oMeI1yyRWAK54l0rhAB8G2cnqxRvU0Jq58cH3nARcg6xXc2NBygzb+3gmTnpYN7MaQ0S7A+cKQ6+ntpz8vTdK5+ZiZF4g6Hrk+4dOufIXt/ELMLxbcDQn0iIq5OWFGd7ozRilDXqMLLZ5+tyHjUZNGjXP2eaz+cjYfuF2hzTVkF5oN/gwTlBhBAAWJmtPwJrJv0PZudOmQAAo5hkYgxbn3hoctGWLec45PVSDut9XSK4tr8+6lbKYb+imfaUGxq8cOjDOQ/fM2heto1zzbJz8OzB98a+y1GWsL/4wqA7PLMCiYn196gm/pbwtjcBAOxJ9dczYCYAQErKIfJor5HnEeA85oy7HyHEZFkm1pWwLMiVm7kCgFWb5u01dPOZh/tl7QHIQbt8Si6P9SSe5z9XDP523YTtX56Of//BtPh7zxWXF5/54cs7BJ4l6qZYWicxmZw+fzJO5NltmmKQQCg69ZGpHxwa2jc2bkivXtnBKAuVKXGvNGld++LOnQA5OTnme9tfbWlq+pgHez41hDEZI+Sl1tWwLMiVJw6E2FtbFtQHxhwkon+HEGL5q8qfoKZWq517zqA7+s2af/eA+x7HhI/LysqK1r9j2NZTR7+9H3PcPRwnHgam33zm3LE0hrmjAnE+QTjulbgYx4srZ/SMf7Tfg3vbt7prYoeWt0yLQUVDO3b0GjkAFCHEHHq4EBOc4MvLTUDIS60arT8G67mCP5AcyEEAwEA3Gphg0sFHlMAgAACEump6eEb+2rlxhEaHINRxAQAs2rUyOx5FTeNC8GSH3iN99wAwWDN/4MVYB1kdVGBNl+HLAwCwZdPSR4dAONitcVLcjYZuV1W1nDgleGLT0iFh//nC12VZjvToMVpdtXFRgDH+egD4PCdHRgBeKw6xLMiVByGYIeB+yiQJgjMoCon1O/YfU84R86bPP8hZ+sW6ySt4pyPrnsdfDAJl5etyH+gPAIAEZ2sNxX5lArkXAGDj4kfGUcQf4InpiHXGUE3XiEYJaXHLHdel3XHHwriGibleb6U7hQBXmJTGAgDk5FjXwRLIlWdBKu/YBneKEI5b1zIuBgCAAnoZMWXytlefanZXvylPq0h8trRCGakbxsbtvqmjJbtjAhKkqWuXPPZQ/yeX5wKG3WoEnl8zd8BA04z06v3k8ukOm7OD05mIOVGC2PgkFJfQSJdEO2AaTaneP6VUQZQqlcdiYQnkSst4IMQYY+ihfplnMeJLDd5+EwDAvX+d9glidJpk42bu8Y+dTiIlg5Nr2acJxFwgIfRJj6dWFDpc8b0EjD3rFgxc1H3Y0hkOEkzFFIaeF492WTN/kCchIXHw6YsX4VTRCa6o5BycOneU33/gy6Pl5RXZjDEEAEBNDVNGi34hVgsrBrmS2LkzhwCAwUDfqzPaAwD2+nyy0N7j/UCW5U1dmwc7YkwaGhRf1E296B738/sAADo/MvcMAPRbO9cz44P5f91sGmY55l3PJERvfgUhdvbw6VN3LHr7zbNd7r2vtqaZ2M7z8M5np49s3Lg/wiYgtG/fMv4fJ8OizUCnqsVqXQ1LIFccxcWFDACAmVoeRWwSAEDt2h3owYMgFBammne7PTuqt9313hT/Ll/2JIDISmaaEiFSA612rynhA4s3YV78FoliFq/St1rf2VV18nRy1w7usnrtHnls99oZAzARf9z43NiIzycL4M7RD69beivCXKnHMypqzaZbLtYVi9vtowAAxMZ9b1Jaa8UKWerYsaPRvLlX83g85oYNyxLfe29RY8YAnaP4UQSmDVM8mwGfw3H4fla8fbYQ1/A08La7Adg3/Ua9vT0aCbXjCcQz0zj68Tvj7sZG+TisBy7IsozLyuoxhBDDBKVjxm2pPIZDlvWwLMiVjabqiBABH3NE6DsbFvRzOqWbFINKwYgahzj0IgADjweFAGBqze9t3rxZFJUt8xNj+M4leuy0At/4ORcvFoZOXuDekXihFgFzPGZsZNsB3tP5+TLXseNw/b0PXruBgS65+w/fJcvWJKFlQa5g/H4/ZowhkXO04LB03OvxagSb5yiwcmrqX4VwyeSH+mWeraqXQvly5aqJjAHatyyD79Gjh/ru/E8zo+FgBQscvTfNM3ssQtLnsc7YiGiL2Xv3A3P6t/Xk7vf5fKRjR6/x5tYXHaoefBwTtIwxhnJyrODc4gqmeglR/9alK/1blvb9rW0uM8uNfD432bcsg5eZjDcsdLfbvMBTsSF3YNqv91G5Qsqyt+bUfW31rImvr5p9K0Dlw1fWFfhjscoR/kCqa6BeWTO9ncQJCwQlePchNxiQA9ChA+Di4lTm8Xgo/IuVtvkrnmxr6PR9k8H49OHLVx30yUKqO0fPyclBTZu6bjcFdItp6jszHs4+bQXmlkCuCuvh8XjMlRte2qgq6qphnsmroLL4BF1OFFXl8WzZxM6xSXXjXuScsdcRQaI8sIOFB4/ltmzxFzMaLlqvqZF3+oxePcfncxO320+XL58ZM3x4dsDqdStIv5oiEAAA4DnyoxRjG7Dug3lUiypbPJ7sQNXN6FciQQiYLMu4YelexRSFOxrdeeft50MI7Eawc6rD9vjxIwfvrW3X2hMcu2f9fA/t6/HNY7KMh3urxCEzXNzTf0O0NFDcKP2JUgaAkPUsiBWkX4l4KpfsQZ4eY0ZRw1wpiNw9sTHi+3u3Ta+1b1kG93sxQo+FeapWEu157uuvD8cQDQKqDkREzgSXsKnH6DzNjmrdy4uuzHVLht2Eqmqvftw276GSzn//wsVr/6Ai7gEAsDPfehbEcrGuIvZ/MPmz4qg5ON0z84ff206WAXu9QF8e1Sa56V9unsqcsR2igYqozVTViij/XXmITKqfZHvANI2WPZ9c/vjxj5YNqBPDvycKCIpLw+URFJvS+N6HzwMwaxbdEsiVz759y/hg8Cyrf7F4sWRziCaVPitR8OY7PN6Tl1uip1ok1dZ9xdA04dE3CpS1i4a21MORDMTjdS5HzPD04S8POLf75a/r1Im/rfxi4NtINPp0/Y4jd1sPSlku1lXDHa2GGx07es2vWYcRiEJ/RvXrLzgTiioH8W/e4VFqqhsBAOxbKScyxuDRNwqUfDmN6z/yja8BYD5mNNNUyjUAQDplrxaVVAz6/EjpXfU7jtydny9zljgsripYVcxx2Ddy/OmNEz/+x/tZrRkDxC6JRap/UAcA4Dvf+D4H3ps8gfl8pHq+o3pl+C2LHvpy48KBm6urdy0sF+vqF4nPTZDHbx7fMP5xXdVGfsXOtnJDZb6rdu0UVP1jOMsyMvj2XROGg2k2tAnajCb95v+cwvW7MfL4zU2LBp81DTSuzzNvrVqb6xkQnxjX3TAMp66F/2FqrCCym33s8futuRBLIFeRQBhDkJODvrtHjBejFZ9c12fWzTWzsJ/6cm317SUPEGo8qVNWL0pJ55T7Zx5hsoxzACA1tRB5PH5z/Xz3DADu7r6jV9+7cekjyxo1TMgQXDGA7LGQaCew7+PPDr//1eEWdev2Mr1eLwMr1WsJ5GpBlmWcmpqKWnF7CnjMduvItgoTXI+n6r2gK60oFr+jRHzTJFhXFTpeA3VcWYKztNq6fLDgwVxdi7S/f9yGO9fO7jWv5W03jg5y8ZRhgpxOAZ3/8eTFM8cvdvFMWPU1k2VcnQa2sARy1QjE6/XSg29kNHI6RS/hxASG+DJg2j6lIrDuxodfOV297bfr5CcNTTv6F8+MbRsWDL0ZIDKXIXxCZfwspJnD7CTaSZDEWFdyg2aIE6LBkpJdR7468NyIBXsOXpIFs7AEcq3EKT4CtQ8hf3Eha0Jv6FGKa32inNnbSxDEZ0OqsZUQ6QiA3pxSbpt7zOtr0tLSuIduC9ULFgcj41YfuVhThFZvWlzVloT53ITJMmY+H8nPl7kaGSlUOdOOYNOCB17f9/bD7IMFD23wzR32yPoFj90ty5Up+ep/f45xZGxV8f7fYdVi/T+KAwAAefwmA0DAgHVEwAC8lQNdlhHyemnewoHrbJLQ4sxFs+vxo6Ufj16Yp17SErjdhSQlJYXl5OQwhJBlNSwX6+oURGFqKko5dIjVdH1qukKyLON69UA6e7ZC8nrnlq2f536aUDPri39oqd7lGyOb52eKp4MltzhI7IkYZ2Rocbny/rAp756quR+3z0fA7we/3/8vl9FbWAL5r+F2u4n/krmIYbPGuyIRe1M9clF4/8XF+2bMyI5vgEva7wjUPh3EUkumRsIkLG56JOXoR1GVTvxr1qp8AICswV0cLVskZTWqLfULhSOh8xXGgN3RZvVAlFzUgB/e8HrPXyoWv9tNwarFsgRy5UXaDNUcmP2fm3gbMPYXRllDgeM4DqOzLFixs3tieazLQZ6KqvqJrYfOzH26e+t5ReeLfHVttm2nIyV7guXhTmLtZjQSLHnMaSNNJGymEowSglF18azxa9++dVLWDbrDeSdi0IgaVNKpUc5Meoin6NNVM2eWXU6kFpZA/tv9yAAAuo4bPYTH+A5OFM4jk33FR/W9/rlzS+956qn4eCd/9/VQHu7UTD9dURp9tk687c5WzW9OKdh35Ou+Y1fevm7eQ1v63nZD7zc/PeBJTqp3512335pO9dBNSlhjcXaEdnzxzRs9R696ZPTooXHz579RDrKMPbp+J+NYG8ThmzHCxczAr73r9R63slqWQK4cywEAncaOrcfxeAmjbJ8GyssFLy05DwDQedSoRoLLNgYhbKjh8FfFpYHNf4073bLN9Ulv3digToPj54u1WslN1F1ffts61mVLi2rGcbvEN2t/511PJzml5qFg2DApRXGxMfSLA18VjV9zOqXJTden8TzXTCJk/7JpMz6pdK/chBy5uY9uwAhNVZd+MGP2Gksk/znWwzX/ORg6dmS3dEp7EwD8H87OXXTi0y9CabLM3dK6dVMmkOc5Tlq+cdrQd26LfO8MfLE22Ldz2oHrGtSKOVNcTuPiEhjHc1JZILhrUPa7K+9qfbMSI2q1bmuc/DSYvKozSjAnGjYJC4d/+H6dcvrUhi6NIfCPUMwe0S60adGmtT32vq5FrYtrs8Xy375r3O7uPEy4vze5o/Wu12bOvCjLMi4oKLBikv/1xbX4z6hcZgdxEl/fYXcVAgCkyLJQ+aHmoKrqCp08eRTOfn9Hcp062vXNmgsXK6KjvzlWtFpyJpqKpvB2pKC68U4ZAKhoE7h1eXu2fPbV1wWKUioyQyV2kYmff3Pw2NcnAtMb3HBjQtTZsOkjbeql/n3q86sk4I8kpaaynVXXMm/GjGKO58HhkuKsrJblYl0xWasek7PTEcaLQKeTNs2c6a/+vPOoEfdxhIywxbqOYASfNaSRU/O8874EAMgf0bhOKDY2Malxiwll5WXfdotunveO0bVuRdhhZMxbW7R2Wue7GHCNeUlyvbvj41VJtwzV6zgCjSa+sOLw/E2bxN2hkOGvsZJJ5wkTbkE8ms8zdGTz9JkjLRfLEsgVlcFKz8pqDTz3AmBECNDtYKLNm2bN+gYAoNeU7NaiaGunMmgE0UiMrqhhEwsnEG87H4noAXtCXEV9Lmg3ERfiAYBSon4fdF4sKaO6akbpkBs5kjOhaRFCv1zap9fYsYl8fHw3wKxvVNGampry+rZZLy0GWcZgicMSyJVCzbt1l6ysewWJewAJYntTEJyYoJ2GoecrgYofOV0PE8ZRCoZNJMRpB+TiRVEQJQlTzEcJQlTAWMe6HsZqKICUSEgj2IxIcbRY05wmpXUMqicLonAzsbk6mbpeVyDoKwxsg3nq7Psbly+PWJbDEsiVK5KcHFY9H+IeM8YWTkoYTwA9rYTDUWYapcxkZYxShRIcAU5QgBAFIVCxQQ3D0BBlJscYIoghxAkc4XheIhgLiIFgqBpHGbMDsAY2p72pZtCt4fLAxE/mzTt0qctnXQ1LIFe0UHYC4AJv5fMcKWkpzuRb7u5EEf4L4bl4IgiMcUQjHDERRYbBKjFMkzFKKQOgBCGCEEIYADAGjkOYYEJEAKRRah4tu1CS/9mrr/4AUFVuAgD+f2PVRgtLIFdE/7p9PlwzkO6SlZXEYdzI5KCBxHO1qa7XUhXDyXjObjKKmMkYRsAIQbqhmyHCkSDHoSIBc2dNE522Hz16otpCuH0+4j90iFmxhsXVLxS3m/xRZemtMjL4VhkZvNWtlgW5JvtclmVUWFiILqSkIACApMLKX6VKSUlhXgCQAaCwsBCB2w0XDh1CSamprKoqmMmyjKoDcLfbLfj9fs3qUosr5WaC/pff+8Nimyo3rWmPSROWdn9m1JMAgMBaBsiyIH+uuMWNLxxKQUmpqeyn+KVqXuOe0SPaCIJtlcRzo1rz0hYvAFgxiMV/nbS0NC49M1P8d28sbd1tbf/yTthl20WyLOO7xo93dcqeUJw2dvQjVS6WVUv3f8yfqRYLud1uUuWOoOoB5q6xqqHb5yPwcyCN3D4fqQ6GubZtXtMd0lsgy7hVRgb3i20ZQzUD8DRZ5oAxlD5pfJr9pg6H2ox6LBlkGafJMldzf7+y5qgyRZs2fvTAzt4pi7o8N+mvVe0Rr9dLY+3SC6IolhTMmf96q2XLfgrSayYA3D4fqSEclCbLP68qX3UMl3HJUM1zr/6OLMsYarz+neO3XKxrlksedvqtfuqak/MF4nB063NT2/+T/vypnS6TJg1mNuktV6AieW1u7oXf3T8AtPV44p0pN64DBnUpxp8KvDiElV3st/WleeuHynJcqcgXqRWhJ1VRfKt6juV3ApZ/Vmpy2R/1+QP665rhml+0obrsIj0z8zrT5ZoHHB+LTD0RCGGC3V5ClejSzQitHpSZGVMS63oJRCGFqlptk1FKePEwDoZeyMvN/QIhVIJ4sXP61Cl7KaUCZfCDHghMcVBajpKTNiNDGb5x2swvgDHUccKEaQioiCndBLwAQYHf2uXZiTpI9jCLRl7ePmPWqhqDDMk5OWjnzp2Y3NXmI1M1oqe+/qb5D3l5apcpz/VmwNUDACjStIcJQZxkmu996PUanTMyYqXE2Otq8fbC09HQA4SXniQCV5sJ/DGjtOSF7V5vQV95dFzEdDyBMb4fGEtkCCIYow3w/Y8v5q1cWQGMITknB3m9XtrtmWdSqSAsFoLB/kpMTBNHrGtuvKqnnw4EBmCXcxQDasOED4ESmf8hQu/+WURyzbtYXq+XAWMoapphkeO+RQS3p7rxLjPMbMbod0KtxFXdn504QEtIUChjrdSomkpNYxLTqRfzQgOcVDv//qysxmYoNJIGgwPUqDLPVLWFjJA2fIxzY5FhlDCemMwZuz5thNsJCDHE8/cjSeqonD//WfT8xR5KJDpdU43ZjMFxIS5+ZdqIES0BISZXujzE6/VS6Z52o3hBak5PHOr9Q16e2n7MmGdM3bCHQ6H3AQB0Sh9Rw+EPN7z4YvA+ecpLXJPGJ6ggbSwuKekBgL3UND82lOgMSsEmJtfdmZ6VlRIu1XszxoYaqr5Gi0ZkqhvvI8kxjjRPzU/PHBQDALCzagxI8a5mYlJSGuJ5F+FxYy42Nk0xjNocAd3U9JcjZRVPG4a+T6pT95307OyugBD7M7hbf4Zlf1haTg5XsGTJ+Z6Ts/MJkSZeh/GCpdOnlwHAB92mTk2ngB/xe73vd5s6hSFdL9g+Y/YaAIDHJk3KP+Nyng9xXJ/ts2YtBIDvqxvtM336dYpJxu1fvlzvnJHRGdWrdww7m7zd5sEHhxOOuwWZ5ogdb7yhAMCW6u/0zsrabwgJQ3iH1AgAvt4JgJMKC5nb7RbKKZuEopFpBas3XkzPmfoUZWxusPiCe8/fl13o/+yzdRWb9Be9IjAkbfy4PAB0J1OjGYJq7DhSVBRMPXRoo7+wsHo+5NX0HLnUwHhy/PniIbBj57s1PoOek7LWkITkA4qYPBQQWmjLzCQAYGCOUygzTU6SaCga1SOlZYxomrQ1d56vRl/u6pKT0xcTPBQAPrxw6BCyBHINuVqfM9aQiAIp1Sqcbre7IiUlhX1q6CUMIREAAIt8AsborNvtJuB2Q9yJE6FjZaWmzS7UrqqvEgAACrxexWRmNzDpfgBA25e/HGg7PKO7Lan2XlfzlDZaacXUgjmOZbIs48LCQnSqQQPhszlzFGPy5PswY9hhwlfVx+X3+81Ojz2WSBCupWvquc7ZE1cDJp3MSLD7niXL8gAAhajeHzQUAI5rKUq2TiU/HLp+/1v+k9VtFFYlBkL16qH9w4frTFOPI4Lq+v1+s+ffpj7fx+54TD11tr0SF3d0k9d7MP25yecIL9wKAADXV91FKEWmbhA9GgXOITEwDcNUlPI0WeZspaUEACCakGCamnaGIkgGAJSUmsosgVw7rhbtNWVKBQPGdMmG11TVM3WTp1IGlevZ6rpuGrrJ/H6/CX4/yLLM7A6H4bQJnHfsBJqxbJm5fPhwvcMzz/RkDFqxULhbZaDL4LNlyz7vOHliGpGc23WengLw0sJCN/H7fBQQirbds8eGenafQaPRd9bPmXMqTZa5DgA0edK4u1lM3MMKL5gh0xzOdG37j3m7rj/86afBrtnjXoid+dLUgCANoIa5CxCkMF3/qKY4qgPuAq/XBADmBiCqw34jVbUXAQBhjNYbgLKRQG4t8HoP9xk/3gUOW6IeDH0DAABVPwxnGAZoDIECEGPTaQGOBm7bvHBhcVX7PyUE0uUpdgTsWwBglgW5hugjj68X0c2WnKojO1Wi1f/P8zwPVZYBDCoh06ye64CjoRBiiQkiwdgGAHDy4EHc/W/y44DIy2pZ6Qs7cud+OFSWpVJNu5FyjBd1OB0NR2fHNm664r5nJ1L/9Flvuj0eUjo281bijFltauqZ4JmDGVUpVOr1etkDU8ZLlBrfM+A5joMl22bNfRUAoPPUZ3dripJ4DCAnURDuYUb0IcQgiXc4ltw3ceIwux2fImG1BVNLXls//43yNFnmCrxeoyw7O5PXTSyFo0sBgCHM3WUGK3Qzon4CAKAI+HkuqkRxWWAlAKBoQoIJAMAMoETAINk5sm1WbhgAvgMAaJ+RUVd0OBJ102QCzzsQwTcLDN7u+dRT8fbCwor/KBtmCeTKSOF2QIjun/LsQikm5j6luHjm27m5F6oHFNO0bwliKgCAgNARDdHD1WlSFUBXykoPh6PCMQAAm8veg4q2KVokOnRH7tw3gTFUOi6zri65/AjzYpQ3KGU0oIfCP3CAKl2Y2rVtRLC/Qk36Sdk3BzL3b9wY+ZSt/ykD9O60F3cAwI4uz01qIrjiXumeM2UwxqSpwWi06NDhdrUnje9pRsK8Whb4aPfSpYFuU59L5EVxmKlppziC1pfFNQmBLOMCr9ccOnSodFqL9gkHg323LF58oe/ooXGgqQ/yAJ6tixef7Z+V1VqhcG80WNEpf+nSMpBlnJRaWQeGMGY84YDDmAEAcssy7/d6NdFpf06Ic3UluqZTg4q6YZ7iJHEYOKSj/qX+tdbzJ9cIvTIy7P2zspIumQcAAMDVE2tut1uoOckGAJCeni5Wvx4qy5IM8PMEWhVuWRbcubm2obIsuceMsaX98saDaszA19wvVO2TpMkyBwDQbWJWz+7ylOe7TJo4GAB4AIDuz2Uf6DZx/PLqbf9ZnCX/nJlEbp+bZLRqVT2hiHplZNgvnXupbrO3PLlTt2l/M9KysprXPD+3200yMzNFtywLGRkZfKtWrfiUlBTBGlHXcLD+n7bxL6U3L5mtdvt85HdKSeC3ZrfdbjfpOmbUgF5yhh2qihKrZ8bdPh+53HFceo6XCqvm++rX6dnZXbu/8AK768knb/qj+sniKnO1frqDXzIYaw6G33z9zz6vsgpV7yvbv1yFbY1Sl19YFVnGbrebtMrI4H+nHORyAxf99Pdz+wh+u9IX/eJYqtrrNXZsYpexYx+5vobFhEsrmKvLTqrP0+La4hJX5xfuDUBlQSJUpUzThg6Vql2wS78vyzLuJcv2moOuS1aW4zIDFwMAqm77V1bipzW0LmOt5BHOysH8K1ftn3730mPpM2bkEwAAvceMeqzvxIktLj3vyx+DW/izCuKaP+nqIPK+zBHDXIm12kXDoX0iM47omhELki3dNFlEj4TXMWa4OCLFCJJISs8Xf5bYqN6gSEXF5ywSMTEv2KjA1bPFxbVgUXW3XnFxd2xS/aFKVCmynzzz6qkYiK2d0ODRqKEDiUY2mrzYGwzlC1M3k02bqy021QIxJq4P0rTvmap8CBTqbl26fFOf8WMHSbGxadGy8r1MVw8jypIiiqKBqRbydntnQbAXczypbwKxhwMX1zoS4p+MVkTyPly8bFuXkU92ctRKHMxU7VsjGj6GMA4ElRBvJ+KdBAtvG6A2twmiyCiVGKAT6+cs/LTX6JHPbZy38IWeE8cNsDsd7bRw5IASDJZRihpgia/gwIwyAl+AAXdtnr9k9X1PPjGAcZzJ2x29eWaeMJToBwhzjcHQjmKeJG+at3T7tb6CyrXvZ7rdAACQEBur4aiyVldVlVJIJ4QANozvgZkrBUlKczlcN2xftGQ1pWaDOKeUCBfLF+um3saZVOuYYJcaCpIUMkJhPzVpIm+Pvf7Uj6fmc4Srr6WkuOJQrF0vu/CugIkOksRxvFCKeVs7KtgoT/CPsfHJX2LT+NaFhQJBtPckkq0BAADHkbAWCGwgPIpwNrGT4HSEcGxMGo5LmMQ4gijB162ZPXeRaeqSGBMDrCiQI3FCNwCAGJurgtP1naauHcUcx6mMdeJERzskiSUmT1MxL9ZFvK0Rw6i+ZuqxAAAYsWDG8OHcptm57wWLy7wapbdrBG6wi+JKnnB1kN2RBMQxl3KcHQDAZpcaO5w2QxKEXaZpfklEsQWVpF5cTJwsSPbAn8GCXPsC8Vcucqhrus0AXeMoYKTBWi0Q/RgoSrTzXJADbFLGjK5jMjsC5lvqgtAvzNFkglEUmSyORwLhGJI4jE01qgYQx/WPiYtrbFIaTAbQDIHcqgnOtphBEY+5eIyBJxxHBY4zmWEKqqK4VEVHOmOawRgxq+63UUWLiWoqDiuKrmiaqlGzlUDwEQASpSb/IRctWQEASFXVKBg0niUn20GSCACAhvUYlRoSAIBJaRnmuF2iIErYEfcWxdyQqKJT1dA4jMhHkfLv8mVZxpRwrKxuXeR2uwmRyKMAZr7ICYbBcQ0YNWMJA5uqqSfCEeU8AIBRVPoKAXQOgV6bF/hinvBtCDW/VHQ9YET0kwBVtW7XMNy1rw8/BQAUUcJIdPAHQNEjDBnf8g6+GULm1+HTJWd0u7DXBEO38fYGxMa9G9U0HSguQoR9pip6S4xIMVCdM3npIDGVqBJlZ02dnQM9+lXZiVOGHiMeYYD4CmaASFEqiBLBprYLMa6YgHFWKy+/TgPji6iqnwXCdmOMygEAQoFyTDnxawfS4xEvnOMQsTNdORaKRPLBILHb3njrRwAAqmm7KWOxWDQHqgY9CwCgR9V6DON9nErLTTCaiQ5nUwpQpFw82xlJzuKooq1H1LwN2eBkwRsFSpI7iZAG9WwpAMZeQXBiTQtsmb9kXfqYMWk61e7HiuFjVIkzytVXKUBLAIC8lSsrOo98qg4hwhcCCx2nRNqOTX1/uCS8I0pIMgAUgSwjuMZFYnENxYjuMWMu9wQj6jEiow38e+lbK1P1Z+EXKdiqi3/pU3Ny1d9PacxL/7/q+3LNzy9Ns17aRnXKt+q9LMu4+hh+cUyX7ONX6dWqbarnLWq089M+akx4khrH97vp4l+c86/Pq+bTkpeetyUei2vyJmFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhAf8DxndN7V43erwAAAAASUVORK5CYII=" />' +
      '<div class="name">אתי אטל</div>' +
      '<div class="title">יועצת בריאות ותזונה התנהגותית</div>' +
      '<div class="title">052-333-6766 | Attal.eti@gmail.com</div>' +
      '</div>' +
      '<p style="text-align:right;color:#666;font-size:14px;">' + today + '</p>' +
      '<p>לכבוד רופא המשפחה</p>' +
      '<p><strong>הנדון: המלצה לביצוע בדיקות מעבדה</strong></p>' +
      '<p>' + fullName.trim() + ' (ת.ז: ' + id + ') הינו/ה המטופל/ת שלי.<br/>בכדי שאוכל להמשיך את הטיפול התזונתי, אבקש לבצע את הבדיקות הבאות:</p>' +
      '<table>' + tests + '</table>' +
      '<div class="signature">' +
      '<p>בתודה מראש,</p><br/>' +
      '<p><strong>אתי אטל</strong><br/>יועצת בריאות ותזונה התנהגותית<br/>052-333-6766 | Attal.eti@gmail.com</p>' +
      '</div>' +
      '</body></html>'

    var win = window.open('', '_blank')
    win.document.write(html + '<div style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:14px 30px;background:#0f4c2a;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">🖨️ שמור / הדפס PDF</button></div>')
    win.document.close()
  }


  async function addClient() {
    if (!newClient.name || !newClient.password) { alert('שם וסיסמה הם שדות חובה'); return }
    setAddingClient(true)
    const { error } = await supabase.from('clients').insert([{
      name: newClient.name,
      last_name: newClient.last_name,
      password: newClient.password,
      phone: newClient.phone,
      age: newClient.age ? parseInt(newClient.age) : null,
      weight: newClient.weight ? parseFloat(newClient.weight) : null,
      height: newClient.height ? parseFloat(newClient.height) : null,
      goal: newClient.goal,
      activity: newClient.activity,
      gender: newClient.gender,
    }])
    setAddingClient(false)
    if (error) { alert('שגיאה: ' + error.message); return }
    setClientAdded('✅ ' + newClient.name + ' נוספה בהצלחה!')
    setNewClient({ name: '', last_name: '', password: '', phone: '', age: '', weight: '', height: '', goal: 'ירידה במשקל', activity: 'בינוני', gender: 'נקבה' })
    setTimeout(() => setClientAdded(''), 4000)
    loadClients()
  }

  async function saveProfile() {
    setSaving(true)
    var payload = { ...profile, client_password: selectedClient.password, updated_at: new Date().toISOString() }
    await supabase.from('client_profiles').upsert(payload, { onConflict: 'client_password' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  async function saveFeedback(log) {
    setSavingFeedback(log.id)
    await supabase.from('daily_logs').update({ trainer_feedback: feedback[log.id] }).eq('id', log.id)
    setSavingFeedback(null); setSentFeedback(log.id); setTimeout(() => setSentFeedback(null), 4000)
    const { data } = await supabase.from('daily_logs').select('*').eq('client_name', selectedClient.password).order('log_date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  function openWhatsApp(log) {
    var phone = selectedClient.phone
    if (!phone) { alert('אין מספר טלפון למטופל זה'); return }
    var fb = feedback[log.id] || log.trainer_feedback || ''
    var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמשוב מאתי על ' + log.log_date + ':\n\n' + fb + '\n\nכניסה ליומן: https://project-l990h.vercel.app'
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
  }

  async function runProfileAnalysis() {
    setAiLoading(true); setAiAnalysis('')
    const res = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedClient.name, mode: 'profile', profile: { ...profile, ...selectedClient } })
    })
    const data = await res.json()
    setAiAnalysis(data.result); setAiLoading(false)
  }

  async function runLogsAnalysis() {
    if (!filteredLogs.length) return
    setAiLoading(true); setAiAnalysis('')
    var targets = calcTargets(selectedClient)
    var summary = filteredLogs.map(function(l) {
      var nut = calcNutrition(l, nutritionData)
      return 'תאריך: ' + l.log_date +
        ' | קלוריות: ' + Math.round(nut.calories) + (targets ? ' (יעד: ' + targets.calories + ')' : '') +
        ' | חלבון: ' + Math.round(nut.protein) + 'g | שומן: ' + Math.round(nut.fat) + 'g' +
        ' | מים: ' + (l.water || 0) + ' | צעדים: ' + (l.steps || 0) +
        ' | הערה: ' + (l.note || '')
    }).join('\n')
    const res = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedClient.name, logs: summary })
    })
    const data = await res.json()
    setAiAnalysis(data.result); setAiLoading(false)
  }

  async function scanBloodTests(file) {
    setScanLoading(true)
    try {
      var base64 = await new Promise(function(res, rej) {
        var r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('Read failed')); r.readAsDataURL(file)
      })
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }, { type: 'text', text: 'זהו דף בדיקות דם. חלץ את הערכים ותחזיר JSON בלבד עם כל המפתחות הבאים:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"iron":null,"transferrin":null,"folic_acid":null,"vitamin_b12":null,"vitamin_b6":null,"vitamin_d":null,"calcium":null,"zinc":null,"magnesium":null,"tsh":null,"t3":null,"t4":null,"crp":null,"esr":null,"homocysteine":null,"alt":null,"ast":null,"creatinine":null,"urea":null,"uric_acid":null,"estrogen":null,"progesterone":null,"testosterone":null,"insulin":null,"wbc":null,"rbc":null,"platelets":null}\nהחזר רק מספרים ללא יחידות.' }] }] })
      })
      var data = await response.json()
      var parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim())
      var newTests = Object.assign({}, profile.blood_tests || {})
      Object.keys(parsed).forEach(function(k) { if (parsed[k] !== null) newTests[k] = String(parsed[k]) })
      setProfile(p => ({ ...p, blood_tests: newTests }))
    } catch(e) { alert('שגיאה בסריקה: ' + e.message) }
    setScanLoading(false)
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', direction: 'rtl' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 300, textAlign: 'center', boxShadow: '0 8px 40px #0000000f' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>ניהול מטופלים</div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="סיסמה..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
        <button onClick={login} style={{ width: '100%', padding: 12, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>כניסה</button>
      </div>
    </div>
  )

  var targets = selectedClient ? calcTargets(selectedClient) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ ניהול מטופלים</div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, border: '1.5px solid #f0f0f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>בחרי מטופל:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => loadProfile(c)} style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid ' + (selectedClient?.id === c.id ? '#0f4c2a' : '#e5e7eb'), background: selectedClient?.id === c.id ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: selectedClient?.id === c.id ? '#0f4c2a' : '#333' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {selectedClient && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { k: 'logs', l: '📅 יומן' },
                { k: 'questionnaire', l: '📋 שאלון' },
                { k: 'blood', l: '🩸 בדיקות' },
                { k: 'doctor', l: '📄 מכתב' },
                { k: 'nutrition', l: '🥗 תזונה' },
                { k: 'ai', l: '🧠 AI' },
                { k: 'newclient', l: '➕ לקוח' }
              ].map(function(t) {
                return <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'), background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: tab === t.k ? '#0f4c2a' : '#555', minWidth: 50 }}>{t.l}</button>
              })}
            </div>

            {tab === 'logs' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>📅 סינון:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {[{ k: 'today', l: 'היום' }, { k: 'week', l: 'שבוע' }, { k: 'all', l: 'הכל' }, { k: 'custom', l: 'מותאם' }].map(function(m) {
                      return <button key={m.k} onClick={() => setFilterMode(m.k)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '2px solid ' + (filterMode === m.k ? '#0f4c2a' : '#e5e7eb'), background: filterMode === m.k ? '#dcfce7' : '#fafafa', color: filterMode === m.k ? '#0f4c2a' : '#555' }}>{m.l}</button>
                    })}
                  </div>
                  {filterMode === 'custom' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                      <span style={{ color: '#9ca3af' }}>עד</span>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>מציג {filteredLogs.length} רשומות</div>
                </div>

                {filteredLogs.map(function(log) {
                  var nut = calcNutrition(log, nutritionData)
                  return (
                    <div key={log.id} style={{ background: '#fff', borderRadius: 18, marginBottom: 12, border: '1.5px solid #f0f0f0', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{log.log_date}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {log.trainer_feedback && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', borderRadius: 8, padding: '2px 8px' }}>✓ נענה</span>}
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>💧{log.water || 0} 🚶{log.steps || 0}</span>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <MacroPieChart actual={nut} target={targets} />
                        <NutritionBar label="קלוריות" value={nut.calories} max={targets ? targets.calories : 2000} color="#f97316" />
                        <NutritionBar label="חלבון (g)" value={nut.protein} max={targets ? targets.protein : 100} color="#16a34a" />
                        <NutritionBar label="שומן (g)" value={nut.fat} max={targets ? targets.fat : 70} color="#9333ea" />
                        {log.note && <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: 10, fontSize: 13, color: '#78350f', marginTop: 8 }}>💬 {log.note}</div>}
                        <textarea value={feedback[log.id] != null ? feedback[log.id] : (log.trainer_feedback || '')} onChange={e => setFeedback(f => ({ ...f, [log.id]: e.target.value }))} placeholder="כתבי משוב..." rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 10 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => saveFeedback(log)} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            {savingFeedback === log.id ? '⏳...' : '✉️ שמרי משוב'}
                          </button>
                          {sentFeedback === log.id && selectedClient.phone && (
                            <button onClick={() => openWhatsApp(log)} style={{ padding: '10px 14px', borderRadius: 10, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>📱 WA</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredLogs.length > 0 && (
                  <button onClick={runLogsAnalysis} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                    {aiLoading ? '⏳ מנתח...' : '🤖 נתחי עם AI'}
                  </button>
                )}
                {aiAnalysis && tab === 'logs' && (
                  <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: 12 }}>{aiAnalysis}</div>
                )}
              </div>
            )}

            {tab === 'doctor' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <img src="/logo.png" alt="אתי אטל" style={{ height: 80, objectFit: 'contain' }} />
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#0f4c2a', marginTop: 6 }}>אתי אטל</div>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>יועצת בריאות ותזונה התנהגותית</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>052-333-6766 | Attal.eti@gmail.com</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>📄 מכתב לרופא המשפחה</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>בחרי את הבדיקות הנדרשות ושלחי ב-WhatsApp</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>תעודת זהות מטופל/ת</div>
                    <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="הזיני ת.ז..." style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={selectAllTests} style={{ flex: 1, padding: '8px', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #16a34a', color: '#0f4c2a', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✅ בחרי הכל</button>
                    <button onClick={clearAllTests} style={{ flex: 1, padding: '8px', borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>❌ נקי הכל</button>
                  </div>
                  {DOCTOR_TESTS.map(function(test) {
                    return (
                      <div key={test.key} onClick={() => toggleTest(test.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid ' + (selectedTests[test.key] ? '#0f4c2a' : '#d1d5db'), background: selectedTests[test.key] ? '#0f4c2a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selectedTests[test.key] && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: '#222', flex: 1, textAlign: 'right' }}>{test.label}</span>
                      </div>
                    )
                  })}
                </div>
                <button onClick={openDoctorLetter} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  📄 פתחי מכתב לרופא
                </button>
                {selectedClient.phone && (
                  <button onClick={() => {
                    var phone = selectedClient.phone
                    var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמצורף מכתב לרופא המשפחה.\n\nכניסה ליומן: https://project-l990h.vercel.app'
                    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                  }} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                    📱 שלחי ב-WhatsApp
                  </button>
                )}
              </div>
            )}

            {tab === 'questionnaire' && (
              <>
                <QSection title="פרטים כלליים ורפואיים" icon="👤">
                  <Field label="איכות שינה" value={profile.sleep_quality} onChange={v => updateProfile('sleep_quality', v)} rows={2} />
                  <Field label="בעיות שינה" value={profile.sleep_issues} onChange={v => updateProfile('sleep_issues', v)} rows={2} />
                  <Field label="שעת קימה" value={profile.wake_time} onChange={v => updateProfile('wake_time', v)} />
                  <Field label="שעת שינה" value={profile.sleep_time} onChange={v => updateProfile('sleep_time', v)} />
                  <Field label="פעילות מעיים" value={profile.digestion} onChange={v => updateProfile('digestion', v)} rows={2} />
                  <Field label="מעשן/ת?" value={profile.smoking} onChange={v => updateProfile('smoking', v)} type="boolean" />
                  <Field label="מחזור חודשי" value={profile.menstrual_cycle} onChange={v => updateProfile('menstrual_cycle', v)} rows={1} />
                  <Field label="ימי דימום" value={profile.menstrual_days} onChange={v => updateProfile('menstrual_days', parseInt(v))} type="number" />
                  <Field label="תרופות / תוספים" value={profile.medications} onChange={v => updateProfile('medications', v)} rows={2} />
                  <Field label="מטפלים / תרפיסטים" value={profile.therapists} onChange={v => updateProfile('therapists', v)} rows={2} />
                  <Field label="היסטוריה רפואית" value={profile.medical_history} onChange={v => updateProfile('medical_history', v)} rows={3} />
                  <Field label="בריאות הורים" value={profile.family_history} onChange={v => updateProfile('family_history', v)} rows={2} />
                </QSection>
                <QSection title="הרגלי תזונה" icon="🍽️">
                  <Field label="הגבלות תזונה" value={profile.diet_restrictions} onChange={v => updateProfile('diet_restrictions', v)} />
                  <Field label="ארוחת בוקר" value={profile.breakfast_habits} onChange={v => updateProfile('breakfast_habits', v)} rows={2} />
                  <Field label="ארוחת צהריים" value={profile.lunch_habits} onChange={v => updateProfile('lunch_habits', v)} rows={2} />
                  <Field label="ארוחת ערב" value={profile.dinner_habits} onChange={v => updateProfile('dinner_habits', v)} rows={2} />
                  <Field label="ביניים / נשנושים" value={profile.snack_habits} onChange={v => updateProfile('snack_habits', v)} rows={2} />
                  <Field label="רגישויות למזון" value={profile.food_sensitivities} onChange={v => updateProfile('food_sensitivities', v)} rows={2} />
                  <Field label="מזונות שנמנעים" value={profile.avoided_foods} onChange={v => updateProfile('avoided_foods', v)} rows={2} />
                  <Field label="מבשל/ת בבית?" value={profile.cooks_at_home} onChange={v => updateProfile('cooks_at_home', v)} type="boolean" />
                  <Field label="פעמים במסעדה בשבוע" value={profile.restaurants_per_week} onChange={v => updateProfile('restaurants_per_week', parseInt(v))} type="number" />
                </QSection>
                <QSection title="אורח חיים ורגש" icon="🧠">
                  <Field label="כמות מים ביום" value={profile.water_intake} onChange={v => updateProfile('water_intake', v)} />
                  <Field label="קפה ביום" value={profile.coffee_intake} onChange={v => updateProfile('coffee_intake', v)} />
                  <Field label="אלכוהול" value={profile.alcohol_intake} onChange={v => updateProfile('alcohol_intake', v)} />
                  <Field label="אכילה רגשית" value={profile.emotional_eating} onChange={v => updateProfile('emotional_eating', v)} rows={2} />
                  <Field label="שעות עבודה" value={profile.work_hours} onChange={v => updateProfile('work_hours', v)} />
                  <Field label="רמת לחץ (1-10)" value={profile.stress_level} onChange={v => updateProfile('stress_level', parseInt(v))} type="number" />
                  <Field label="רמת אנרגיה (1-10)" value={profile.energy_level} onChange={v => updateProfile('energy_level', parseInt(v))} type="number" />
                  <Field label="הערות מצב רוח" value={profile.mood_notes} onChange={v => updateProfile('mood_notes', v)} rows={2} />
                </QSection>
                <QSection title="פעילות גופנית" icon="🏃">
                  <Field label="סוג פעילות ותדירות" value={profile.exercise_type} onChange={v => updateProfile('exercise_type', v)} rows={2} />
                  <Field label="כאבים" value={profile.pain_issues} onChange={v => updateProfile('pain_issues', v)} rows={2} />
                </QSection>
                <QSection title="מטרות ו-NLP" icon="🎯">
                  <Field label="מה רוצה להשיג?" value={profile.main_goal} onChange={v => updateProfile('main_goal', v)} rows={3} />
                  <Field label="מה מעכב?" value={profile.goal_obstacles} onChange={v => updateProfile('goal_obstacles', v)} rows={2} />
                  <Field label="מוטיבציה (1-10)" value={profile.goal_motivation} onChange={v => updateProfile('goal_motivation', parseInt(v))} type="number" />
                  <Field label="איך תיראה ההצלחה?" value={profile.success_vision} onChange={v => updateProfile('success_vision', v)} rows={3} />
                  <Field label="מה חשוב לך?" value={profile.important_values} onChange={v => updateProfile('important_values', v)} rows={2} />
                  <Field label="אירועים חיוביים" value={profile.positive_memories} onChange={v => updateProfile('positive_memories', v)} rows={3} />
                </QSection>
                <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 14, marginTop: 4, background: saved ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                  {saving ? '⏳ שומר...' : saved ? '✅ נשמר!' : '💾 שמרי פרופיל'}
                </button>
              </>
            )}

            {tab === 'blood' && (
              <>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>📸 סריקת בדיקות דם עם AI</div>
                  <input type="file" accept="image/*" onChange={e => e.target.files[0] && scanBloodTests(e.target.files[0])} style={{ display: 'none' }} id="scan-input" />
                  <label htmlFor="scan-input" style={{ display: 'block', padding: 12, borderRadius: 10, background: '#f0fdf4', border: '2px dashed #16a34a', textAlign: 'center', cursor: 'pointer', fontWeight: 700, color: '#0f4c2a' }}>
                    {scanLoading ? '⏳ סורק...' : '📸 העלי תמונה של בדיקות דם'}
                  </label>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🩸 ערכי בדיקות דם</div>
                  <Field label="תאריך הבדיקות" value={profile.blood_tests_date} onChange={v => updateProfile('blood_tests_date', v)} type="date" />
                  {BLOOD_TESTS.map(function(test) {
                    var val = (profile.blood_tests || {})[test.key] || ''
                    return (
                      <div key={test.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{test.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>תקין: {test.normal} {test.unit}</div>
                        </div>
                        <input type={['lactose_sensitivity','gluten_sensitivity','celiac','blood_type','urine_general','urine_culture'].includes(test.key) ? 'text' : 'number'} value={val} onChange={e => updateBloodTest(test.key, e.target.value)} placeholder="ערך" style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, textAlign: 'center', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>{test.unit}</div>
                      </div>
                    )
                  })}
                </div>
                <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 14, marginTop: 16, background: saved ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                  {saving ? '⏳ שומר...' : saved ? '✅ נשמר!' : '💾 שמרי בדיקות'}
                </button>
              </>
            )}

            {tab === 'nutrition' && (
              <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '10px 16px', background: '#f8fafc', fontWeight: 700, fontSize: 13, color: '#555', borderBottom: '1.5px solid #f0f0f0' }}>
                  <div>פריט</div>
                  <div style={{ textAlign: 'center' }}>קלוריות</div>
                  <div style={{ textAlign: 'center' }}>חלבון</div>
                  <div style={{ textAlign: 'center' }}>שומן</div>
                  <div style={{ textAlign: 'center' }}>סיבים</div>
                  <div></div>
                </div>
                {nutritionItems.map(function(item) {
                  return <NutritionRow key={item.id} item={item} onSave={async function(updated) {
                    await supabase.from('nutrition_data').upsert(updated, { onConflict: 'id' })
                    const { data } = await supabase.from('nutrition_data').select('*').order('id')
                    setNutritionItems(data || [])
                  }} />
                })}
              </div>
            )}

            {tab === 'ai' && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>🧠 ניתוח AI מלא</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>ניתוח משלב: NLP, מעגל שינוי, רמות לוגיות, בדיקות דם, תזונה וספורט</div>
                <button onClick={runProfileAnalysis} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: aiLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                  {aiLoading ? '⏳ מנתח...' : '🧠 הפעילי ניתוח מלא'}
                </button>
                {aiAnalysis && (
                  <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333', background: '#f8fafc', borderRadius: 14, padding: 16 }}>{aiAnalysis}</div>
                )}
              </div>
            )}

            {tab === 'newclient' && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>➕ הוספת לקוחה חדשה</div>
                {clientAdded && <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontWeight: 700 }}>{clientAdded}</div>}
                <Field label="שם פרטי *" value={newClient.name} onChange={v => setNewClient(c => ({...c, name: v}))} />
                <Field label="שם משפחה" value={newClient.last_name} onChange={v => setNewClient(c => ({...c, last_name: v}))} />
                <Field label="סיסמה *" value={newClient.password} onChange={v => setNewClient(c => ({...c, password: v}))} />
                <Field label="טלפון" value={newClient.phone} onChange={v => setNewClient(c => ({...c, phone: v}))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}><Field label="גיל" value={newClient.age} onChange={v => setNewClient(c => ({...c, age: v}))} type="number" /></div>
                  <div style={{ flex: 1 }}><Field label="משקל (ק״ג)" value={newClient.weight} onChange={v => setNewClient(c => ({...c, weight: v}))} type="number" /></div>
                  <div style={{ flex: 1 }}><Field label="גובה (ס״מ)" value={newClient.height} onChange={v => setNewClient(c => ({...c, height: v}))} type="number" /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מגדר</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['נקבה', 'זכר'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, gender: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.gender === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.gender === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: newClient.gender === g ? '#0f4c2a' : '#555' }}>{g}</button>)}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['ירידה במשקל', 'שמירה על משקל', 'עלייה במסה'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, goal: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.goal === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.goal === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.goal === g ? '#0f4c2a' : '#555', minWidth: 100 }}>{g}</button>)}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, activity: g}))} style={{ padding: '6px 10px', borderRadius: 10, border: '2px solid ' + (newClient.activity === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.activity === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.activity === g ? '#0f4c2a' : '#555' }}>{g}</button>)}
                  </div>
                </div>
                <button onClick={addClient} disabled={addingClient} style={{ width: '100%', padding: 14, borderRadius: 12, background: addingClient ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                  {addingClient ? '⏳ מוסיפה...' : '➕ הוסיפי לקוחה'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

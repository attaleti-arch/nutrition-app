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
  const [newClient, setNewClient] = useState({ name: '', last_name: '', password: '', phone: '', age: '', weight: '', height: '', goal: '', activity: '', gender: '' })
  const [addingClient, setAddingClient] = useState(false)
  const [clientAdded, setClientAdded] = useState('')
  const [foodDiary, setFoodDiary] = useState('')
  const [editableAnalysis, setEditableAnalysis] = useState('')
  const [sendingToClient, setSendingToClient] = useState(false)
  const [sentToClient, setSentToClient] = useState(false)

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
    var id = selectedClient.id_number || patientId || '___________'
    var tests = DOCTOR_TESTS.filter(t => selectedTests[t.key]).map(t => '<tr><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #f0f0f0;">❑ ' + t.label + '</td></tr>').join('')
    if (!tests) { alert('בחרי לפחות בדיקה אחת'); return }

    var html = '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;direction:rtl;padding:40px;color:#222;max-width:700px;margin:0 auto}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #0f4c2a;padding-bottom:20px}.logo{height:80px;margin-bottom:10px}.name{font-size:22px;font-weight:bold;color:#0f4c2a}.title{font-size:13px;color:#666}table{width:100%;border-collapse:collapse;margin:16px 0}.signature{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px}p{line-height:1.8;font-size:15px}</style></head><body>' +
      '<div class="header">' +
      '<img class="logo" src="data:image/png;base64,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" />' +
      '<div class="name">אתי אטל</div>' +
      '<div class="title">יועצת בריאות ותזונה התנהגותית</div>' +
      '<div class="title">052-333-6766 | Attal.eti@gmail.com</div>' +
      '</div>' +
      '<p style="text-align:right;color:#666;font-size:14px;">' + today + '</p>' +
      '<p>לכבוד רופא המשפחה</p>' +
      '<p><strong>הנדון: המלצה לביצוע בדיקות מעבדה</strong></p>' +
      '<p>' + fullName.trim() + ' (ת.ז: ' + id + ') הינו/ה הלקוח/ה שלי.<br/>בכדי שאוכל להמשיך את הליווי הבריאותי, אבקש לבצע את הבדיקות הבאות:</p>' +
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
      id_number: newClient.id_number || null,
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


  function openReport(feedbackText, client) {
    var logoB64 = "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"
    var html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f0e8; color: #2d2d2d; direction: rtl; }
  .page { max-width: 780px; margin: 0 auto; padding: 30px 20px 60px; }
  .header { text-align: center; padding: 30px 20px; background: white; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
  .header img { height: 100px; margin-bottom: 12px; }
  .header h1 { font-size: 22px; color: #4a9b8e; font-weight: 800; margin-bottom: 4px; }
  .header p { font-size: 14px; color: #8a8a8a; }
  .client-name { font-size: 18px; color: #c4956a; font-weight: 700; margin-top: 8px; }
  .section { background: white; border-radius: 18px; padding: 22px 24px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
  .section-title { font-size: 16px; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .section-body { font-size: 14px; line-height: 1.9; color: #444; white-space: pre-wrap; }
  .highlight { background: #f0fdf8; border-right: 4px solid #4a9b8e; padding: 12px 16px; border-radius: 10px; margin: 10px 0; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin: 3px; }
  .badge-green { background: #e8f5f2; color: #4a9b8e; }
  .badge-gold { background: #fdf3e7; color: #c4956a; }
  .badge-red { background: #fef2f2; color: #e55; }
  .footer { text-align: center; padding: 20px; color: #aaa; font-size: 12px; margin-top: 20px; }
  .divider { height: 1px; background: #f0ebe0; margin: 20px 0; }
  h2 { color: #4a9b8e; }
  strong { color: #4a9b8e; }
  @media print { body { background: white; } .page { padding: 10px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="data:image/png;base64,${logoB64}" alt="בין הראש לצלחת" />
    <h1>בין הראש לצלחת</h1>
    <p>אתי אטל | יועצת בריאות ותזונה התנהגותית</p>
    <div class="client-name">הדוח האישי של ${client?.name || ''}</div>
    <p style="color:#aaa;font-size:12px;margin-top:6px;">${new Date().toLocaleDateString('he-IL')}</p>
  </div>

  <div class="section">
    <div class="section-body">${feedbackText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br/>')}</div>
  </div>

  <div class="footer">
    <img src="data:image/png;base64,${logoB64}" style="height:40px;opacity:0.4;margin-bottom:8px;" /><br/>
    בין הראש לצלחת · אתי אטל · 052-333-6766<br/>
    <button onclick="window.print()" style="margin-top:12px;padding:10px 24px;background:#4a9b8e;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ שמרי / הדפסי</button>
  </div>
</div>
</body>
</html>`
    var win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
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
    // התראה ללקוחה
    if (selectedClient.phone) {
      var phone = selectedClient.phone.replace(/^0/, '972')
      var msg = 'היי ' + selectedClient.name + '! 🌿\nיש לך משוב חדש מאתי ליומן ' + log.log_date + '\nכנסי לאפליקציה: https://project-l990h.vercel.app'
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
    }
  }

  function openWhatsApp(log) {
    var phone = selectedClient.phone
    if (!phone) { alert('אין מספר טלפון למטופל זה'); return }
    var fb = feedback[log.id] || log.trainer_feedback || ''
    var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמשוב מאתי על ' + log.log_date + ':\n\n' + fb + '\n\nכניסה ליומן: https://project-l990h.vercel.app'
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
  }

  async function runProfileAnalysis() {
    setAiLoading(true); setAiAnalysis(''); setEditableAnalysis('')
    const res = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selectedClient.name,
        mode: 'profile',
        profile: { ...profile, ...selectedClient },
        foodDiary: foodDiary,
      })
    })
    const data = await res.json()
    setAiAnalysis(data.result)
    setEditableAnalysis(data.result)
    setAiLoading(false)
  }

  async function sendAnalysisToClient() {
    if (!editableAnalysis || !selectedClient) return
    setSendingToClient(true)
    const today = new Date().toLocaleDateString('sv-SE')
    await supabase.from('daily_logs').upsert({
      client_name: selectedClient.password,
      log_date: today,
      trainer_feedback: editableAnalysis,
      report_approved: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_name,log_date' })
    setSendingToClient(false)
    setSentToClient(true)
    setTimeout(() => setSentToClient(false), 4000)
    if (selectedClient.phone) {
      var phone = selectedClient.phone.replace(/^0/, '972')
      var msg = 'היי ' + selectedClient.name + '! 🌿

הכנתי לך ניתוח אישי מיוחד — כנסי לאפליקציה לקראו:
https://project-l990h.vercel.app'
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
    }
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
              <div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🧠 ניתוח AI מקיף</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>משלב: שאלון 360 + בדיקות דם + רמות לוגיות NLP + 5 ימי אכילה</div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#0f4c2a' }}>🍽️ 5 ימי אכילה חופשיים (לפני התהליך)</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>הדביקי כאן תיאור של 5 ימי אכילה רגילים — ללא פורמט מיוחד</div>
                    <textarea
                      value={foodDiary}
                      onChange={e => setFoodDiary(e.target.value)}
                      placeholder={'יום 1:
בוקר: קפה שחור, כריך גבינה צהובה
צהריים: פסטה עם רוטב עגבניות
ערב: עוף עם אורז

יום 2:
...'}
                      rows={8}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7 }}
                    />
                  </div>

                  <button onClick={runProfileAnalysis} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: aiLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: 16 }}>
                    {aiLoading ? '⏳ מנתחת... (עד דקה)' : '🧠 הפעילי ניתוח מקיף'}
                  </button>
                </div>

                {editableAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#0f4c2a' }}>✏️ ניתוח — ערכי לפני שליחה</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>את יכולה לערוך, להוסיף או למחוק לפני שהלקוחה רואה</div>
                    <textarea
                      value={editableAnalysis}
                      onChange={e => setEditableAnalysis(e.target.value)}
                      rows={20}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => openReport(editableAnalysis, selectedClient)} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        👁️ תצוגה מקדימה
                      </button>
                      <button onClick={sendAnalysisToClient} disabled={sendingToClient} style={{ flex: 2, padding: 14, borderRadius: 12, background: sentToClient ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        {sendingToClient ? '⏳ שולחת...' : sentToClient ? '✅ נשלח ללקוחה!' : '📤 שלחי ללקוחה'}
                      </button>
                    </div>
                  </div>
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
                <Field label="תעודת זהות" value={newClient.id_number} onChange={v => setNewClient(c => ({...c, id_number: v}))} />
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

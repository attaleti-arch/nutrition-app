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
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>בפועל</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={actualData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} dataKey="value" paddingAngle={3} labelLine={false} label={renderLabel}>
                {actualData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{Math.round(actual.calories)} קל</div>
        </div>
        {targetData && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>יעד</div>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={targetData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} dataKey="value" paddingAngle={3} labelLine={false} label={renderLabel}>
                  {targetData.map(function(e, i) { return <Cell key={i} fill={e.color} stroke="none" /> })}
                </Pie>
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
  const [bloodText, setBloodText] = useState('')
  const [bloodScanLoading, setBloodScanLoading] = useState(false)
  const [extraBloodNotes, setExtraBloodNotes] = useState('')
  const [editableAnalysis, setEditableAnalysis] = useState('')
  const [sendingToClient, setSendingToClient] = useState(false)
  const [sentToClient, setSentToClient] = useState(false)
  // ── משוב יומי: preview ועריכה ──
  const [dailyPreview, setDailyPreview] = useState('')
  const [dailyEditing, setDailyEditing] = useState(false)
  const [dailyTargetLog, setDailyTargetLog] = useState(null)
  const [sendingDaily, setSendingDaily] = useState(false)
  const [sentDaily, setSentDaily] = useState(null)
  // ── חדש: מלאי ומזווה ──
  const [inventory, setInventory] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [addingItem, setAddingItem] = useState(false)

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
    setInventory([])
    const { data } = await supabase.from('client_profiles').select('*').eq('client_password', client.password).maybeSingle()
    if (data) {
      setProfile(data)
      setFoodDiary(data.food_diary || '')
      setExtraBloodNotes(data.extra_blood_notes || '')
      if (data.ai_report) {
        setAiAnalysis(data.ai_report)
        setEditableAnalysis(data.ai_report)
      }
    }
    else setProfile({ client_password: client.password, blood_tests: {} })
    const { data: nd } = await supabase.from('nutrition_data').select('*').order('id')
    setNutritionItems(nd || [])
    const { data: logsData } = await supabase.from('daily_logs').select('*').eq('client_name', client.password).order('log_date', { ascending: false }).limit(30)
    setLogs(logsData || [])
    applyFilter(logsData || [], 'week', '', '')
    // ── טעינת מלאי ──
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    setInventory(inventoryData || [])
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

  // ── פונקציות מלאי חדשות ──
  async function updateClientData(field, value) {
    if (!selectedClient) return
    const { error } = await supabase.from('clients').update({ [field]: value }).eq('id', selectedClient.id)
    if (!error) setSelectedClient(prev => ({ ...prev, [field]: value }))
  }

  async function addItemToInventory() {
    if (!newItemName.trim() || !selectedClient) return
    setAddingItem(true)
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([{ client_id: selectedClient.id, name: newItemName.trim(), category: 'pantry', status: 'missing' }])
      .select()
    if (!error && data) { setInventory(prev => [data[0], ...prev]); setNewItemName('') }
    setAddingItem(false)
  }

  async function deleteItem(itemId) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
    if (!error) setInventory(prev => prev.filter(item => item.id !== itemId))
  }

  async function toggleItemStatus(itemId, currentStatus) {
    const newStatus = currentStatus === 'missing' ? 'pantry' : 'missing'
    const { error } = await supabase.from('inventory_items').update({ status: newStatus }).eq('id', itemId)
    if (!error) setInventory(prev => prev.map(item => item.id === itemId ? { ...item, status: newStatus } : item))
  }

  function openDoctorLetter() {
    if (!selectedClient) return
    var today = new Date().toLocaleDateString('he-IL')
    var fullName = (selectedClient.name || '') + ' ' + (selectedClient.last_name || '')
    var id = selectedClient.id_number || patientId || '___________'
    var tests = DOCTOR_TESTS.filter(t => selectedTests[t.key]).map(t => '<tr><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #f0f0f0;">&#10061; ' + t.label + '</td></tr>').join('')
    if (!tests) { alert('בחרי לפחות בדיקה אחת'); return }
    var html = '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;direction:rtl;padding:40px;color:#222;max-width:700px;margin:0 auto}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #0f4c2a;padding-bottom:20px}.logo{height:80px;margin-bottom:10px}.name{font-size:22px;font-weight:bold;color:#0f4c2a}.title{font-size:13px;color:#666}table{width:100%;border-collapse:collapse;margin:16px 0}.signature{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px}p{line-height:1.8;font-size:15px}</style></head><body>'
      + '<div class="header"><img class="logo" src="/logo.png" alt="logo" /><div class="name">אתי אטל</div><div class="title">יועצת בריאות ותזונה התנהגותית</div><div class="title">052-333-6766 | Attal.eti@gmail.com</div></div>'
      + '<p style="text-align:right;color:#666;font-size:14px;">' + today + '</p>'
      + '<p>לכבוד רופא המשפחה</p>'
      + '<p><strong>הנדון: המלצה לביצוע בדיקות מעבדה</strong></p>'
      + '<p>' + fullName.trim() + ' (ת.ז: ' + id + ') הינו/ה הלקוח/ה שלי.<br/>בכדי שאוכל להמשיך את הליווי הבריאותי, אבקש לבצע את הבדיקות הבאות:</p>'
      + '<table>' + tests + '</table>'
      + '<div class="signature"><p>בתודה מראש,</p><br/><p><strong>אתי אטל</strong><br/>יועצת בריאות ותזונה התנהגותית<br/>052-333-6766 | Attal.eti@gmail.com</p></div>'
      + '</body></html>'
    var win = window.open('', '_blank')
    win.document.write(html + '<div style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:14px 30px;background:#0f4c2a;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">הדפס / שמור PDF</button></div>')
    win.document.close()
  }

  async function addClient() {
    if (!newClient.name || !newClient.password) { alert('שם וסיסמה הם שדות חובה'); return }
    setAddingClient(true)
    const { error } = await supabase.from('clients').insert([{
      name: newClient.name, last_name: newClient.last_name, password: newClient.password,
      phone: newClient.phone, id_number: newClient.id_number || null,
      age: newClient.age ? parseInt(newClient.age) : null,
      weight: newClient.weight ? parseFloat(newClient.weight) : null,
      height: newClient.height ? parseFloat(newClient.height) : null,
      goal: newClient.goal, activity: newClient.activity, gender: newClient.gender,
    }])
    setAddingClient(false)
    if (error) { alert('שגיאה: ' + error.message); return }
    setClientAdded('✅ ' + newClient.name + ' נוספה בהצלחה!')
    setNewClient({ name: '', last_name: '', password: '', phone: '', age: '', weight: '', height: '', goal: 'ירידה במשקל', activity: 'בינוני', gender: 'נקבה' })
    setTimeout(() => setClientAdded(''), 4000)
    loadClients()
  }

  async function extractBloodFromText() {
    if (!bloodText.trim()) return
    setBloodScanLoading(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'blood', bloodText: bloodText }) })
      const data = await res.json()
      var parsed = JSON.parse(data.result.replace(/```json|```/g, '').trim())
      var newTests = Object.assign({}, profile.blood_tests || {})
      Object.keys(parsed).forEach(function(k) { if (parsed[k] !== null && parsed[k] !== '') newTests[k] = String(parsed[k]) })
      setProfile(p => ({ ...p, blood_tests: newTests }))
      if (data.extra && data.extra.trim()) { setExtraBloodNotes(data.extra.trim()); alert('✅ הערכים חולצו! נמצאו גם ערכים חריגים נוספים שנשמרו אוטומטית. בדקי ושמרי.') }
      else alert('✅ הערכים חולצו בהצלחה! בדקי את השדות ושמרי.')
      setBloodText('')
    } catch(e) { alert('שגיאה: ' + e.message) }
    setBloodScanLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    var payload = { ...profile, food_diary: foodDiary, extra_blood_notes: extraBloodNotes, client_password: selectedClient.password, updated_at: new Date().toISOString() }
    await supabase.from('client_profiles').upsert(payload, { onConflict: 'client_password' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  // ── תוקן: שמירת משוב כותבת לרשומת היום עם report_approved כדי שהלקוחה תראה ──
  async function saveFeedback(log) {
    setSavingFeedback(log.id)
    const text = feedback[log.id] != null ? feedback[log.id] : (log.trainer_feedback || '')
    await supabase.from('daily_logs').update({ trainer_feedback: text, report_approved: true }).eq('id', log.id)
    setSavingFeedback(null); setSentFeedback(log.id); setTimeout(() => setSentFeedback(null), 4000)
    const { data } = await supabase.from('daily_logs').select('*').eq('client_name', selectedClient.password).order('log_date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  function openWhatsApp(log) {
    var phone = selectedClient.phone
    if (!phone) { alert('אין מספר טלפון למטופל זה'); return }
    phone = phone.replace(/^0/, '972')
    var fb = feedback[log.id] || log.trainer_feedback || ''
    var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמשוב חדש מאתי מחכה לך באפליקציה 💚\nהיכנסי לצפייה: https://project-l990h.vercel.app'
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
  }

  async function runProfileAnalysis() {
    setAiLoading(true); setAiAnalysis(''); setEditableAnalysis('')
    try {
      if (extraBloodNotes) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, extra_blood_notes: extraBloodNotes, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
      if (foodDiary && foodDiary.trim()) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, food_diary: foodDiary, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
      var profileData = {}
      var allowedKeys = ['sleep_quality','sleep_issues','wake_time','sleep_time','digestion','smoking','menstrual_cycle','menstrual_days','medications','therapists','medical_history','family_history','diet_restrictions','breakfast_habits','lunch_habits','dinner_habits','snack_habits','food_sensitivities','avoided_foods','cooks_at_home','restaurants_per_week','water_intake','coffee_intake','alcohol_intake','emotional_eating','work_hours','stress_level','energy_level','mood_notes','exercise_type','pain_issues','main_goal','goal_obstacles','goal_motivation','success_vision','important_values','positive_memories','blood_tests','extra_blood_notes']
      allowedKeys.forEach(function(k) { if (profile[k] !== undefined) profileData[k] = profile[k] })
      var clientData = { age: selectedClient.age, weight: selectedClient.weight, height: selectedClient.height, gender: selectedClient.gender, activity: selectedClient.activity, goal: selectedClient.goal, target_weight: selectedClient.target_weight }
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedClient.name, mode: 'profile', profile: { ...profileData, ...clientData, extra_blood_notes: extraBloodNotes }, foodDiary: foodDiary || '' }) })
      if (!res.ok) throw new Error('שגיאת שרת: ' + res.status)
      const data = await res.json()
      if (data.error) { alert('שגיאה: ' + data.error) } else {
        setAiAnalysis(data.result); setEditableAnalysis(data.result)
        await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, ai_report: data.result, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
      }
    } catch(err) { console.error('Analysis error:', err); alert('שגיאה בניתוח: ' + err.message) }
    setAiLoading(false)
  }

  async function sendAnalysisToClient() {
    if (!editableAnalysis || !selectedClient) return
    setSendingToClient(true)
    const today = new Date().toLocaleDateString('sv-SE')
    await supabase.from('daily_logs').upsert({ client_name: selectedClient.password, log_date: today, trainer_feedback: editableAnalysis, report_approved: true, updated_at: new Date().toISOString() }, { onConflict: 'client_name,log_date' })
    setSendingToClient(false); setSentToClient(true); setTimeout(() => setSentToClient(false), 4000)
  }

  async function runLogsAnalysis(targetLog) {
    if (!filteredLogs.length) return
    setAiLoading(true); setAiAnalysis(''); setDailyPreview(''); setDailyEditing(false); setDailyTargetLog(targetLog || null)
    var targets = calcTargets(selectedClient)
    var summary = filteredLogs.map(function(l) {
      var nut = calcNutrition(l, nutritionData)
      var scanExtra = ''
      if (l.scan_calories > 0) {
        scanExtra = ' | 📸 צילום צלחת: ' + l.scan_calories + ' קל'
        if (l.scan_protein > 0) scanExtra += ', חלבון ' + l.scan_protein + 'g'
        if (l.scan_fat > 0) scanExtra += ', שומן ' + l.scan_fat + 'g'
        if (l.scan_carbs > 0) scanExtra += ', פחמימה ' + l.scan_carbs + 'g'
        if (l.scan_desc) scanExtra += ' (' + l.scan_desc + ')'
      }
      return 'תאריך: ' + l.log_date
        + ' | קלוריות: ' + Math.round(nut.calories) + (targets ? ' (יעד: ' + targets.calories + ')' : '')
        + ' | חלבון: ' + Math.round(nut.protein) + 'g (יעד: ' + (targets ? targets.protein : '?') + 'g)'
        + ' | שומן: ' + Math.round(nut.fat) + 'g'
        + ' | מים: ' + (l.water || 0) + ' כוסות'
        + ' | צעדים: ' + (l.steps || 0)
        + scanExtra
        + ' | הערה: ' + (l.note || '')
    }).join('\n')
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selectedClient.name,
        gender: selectedClient.gender || 'נקבה',
        logs: summary,
        nlpSummary: filteredLogs.map(function(l) {
          var m = l.nlp_metrics || {}
          if (!m.stress && !m.fatigue && !m.hunger && !m.mood) return null
          return l.log_date + ': לחץ ' + (m.stress||0) + '/5, עייפות ' + (m.fatigue||0) + '/5, רעב ' + (m.hunger||0) + '/5, מצב רוח: ' + (m.mood||'לא צוין')
        }).filter(Boolean).join(' | ')
      })
    })
    const data = await res.json()
    setDailyPreview(data.result)
    setDailyEditing(true)
    setAiLoading(false)
  }

  async function sendDailyFeedback() {
    if (!dailyPreview || !dailyTargetLog) return
    setSendingDaily(true)
    await supabase.from('daily_logs')
      .update({ trainer_feedback: dailyPreview, report_approved: true })
      .eq('id', dailyTargetLog.id)
    setSendingDaily(false)
    setSentDaily(dailyTargetLog.id)
    setDailyEditing(false)
    setDailyPreview('')
    setDailyTargetLog(null)
    setTimeout(() => setSentDaily(null), 4000)
    const { data } = await supabase.from('daily_logs').select('*').eq('client_name', selectedClient.password).order('log_date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  async function scanBloodTests(file) {
    setScanLoading(true)
    try {
      var base64 = await new Promise(function(res, rej) {
        var r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })
      // ── שולח דרך השרת — API key מוגן ──
      var response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bloodImage', imageBase64: base64, mediaType: file.type })
      })
      var data = await response.json()
      var parsed = JSON.parse(data.result.replace(/```json|```/g, '').trim())
      var newTests = Object.assign({}, profile.blood_tests || {})
      Object.keys(parsed).forEach(function(k) { if (parsed[k] !== null) newTests[k] = String(parsed[k]) })
      setProfile(p => ({ ...p, blood_tests: newTests }))
      if (data.extra && data.extra.trim()) {
        setExtraBloodNotes(data.extra.trim())
        alert('✅ הערכים חולצו! נמצאו גם ערכים חריגים נוספים.')
      } else {
        alert('✅ הערכים חולצו בהצלחה! בדקי את השדות ושמרי.')
      }
    } catch(e) { alert('שגיאה בסריקה: ' + e.message) }
    setScanLoading(false)
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', direction: 'rtl' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 300, textAlign: 'center', boxShadow: '0 8px 40px #0000000f' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>הלקוחות שלי</div>
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
        <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ הלקוחות שלי</div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, border: '1.5px solid #f0f0f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>בחרי לקוח:</div>
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
                { k: 'report', l: '📊 דוח' },
                { k: 'stage', l: '🏆 שלב' },
                { k: 'newclient', l: '➕ לקוח' },
                { k: 'pantry', l: '🛒 מזווה' },
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
                        <textarea value={feedback[log.id] != null ? feedback[log.id] : (log.trainer_feedback || '')} onChange={e => setFeedback(f => ({ ...f, [log.id]: e.target.value }))} placeholder="כתבי משוב..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 10 }} />
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>💡 המשוב יופיע ללקוחה כ<strong>כרטיס מעוצב</strong> עם הלוגו שלך</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => saveFeedback(log)} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            {savingFeedback === log.id ? '⏳...' : sentFeedback === log.id ? '✅ נשלח!' : '💚 שלחי משוב ללקוחה'}
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
                  <button onClick={() => runLogsAnalysis(filteredLogs[0])} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                    {aiLoading ? '⏳ מנתח ומכין דוח...' : '🤖 הפק דוח ביצועים עם AI'}
                  </button>
                )}

                {/* ── Preview + עריכה לפני שליחה ── */}
                {dailyEditing && dailyPreview && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #16a34a', overflow: 'hidden', marginTop: 12 }}>
                    {/* כותרת Preview */}
                    <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src="/logo.png" alt="לוגו" style={{ height: 36, width: 36, borderRadius: 99, objectFit: 'cover', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>👁️ תצוגה מקדימה — כך יראה הלקוח/ה</div>
                        <div style={{ fontSize: 11, color: '#86efac' }}>ערכי את הטקסט ואז אשרי לשליחה</div>
                      </div>
                    </div>

                    {/* עורך טקסט */}
                    <div style={{ padding: 16 }}>
                      <textarea
                        value={dailyPreview}
                        onChange={e => setDailyPreview(e.target.value)}
                        rows={14}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }}
                      />
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>ערכי חופשי — שינויים כאן לא ישפיעו על ה-AI בפעם הבאה</div>
                    </div>

                    {/* כפתורי פעולה */}
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button
                        onClick={() => { setDailyEditing(false); setDailyPreview(''); setDailyTargetLog(null) }}
                        style={{ flex: 1, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                      >
                        ✕ ביטול
                      </button>
                      <button
                        onClick={sendDailyFeedback}
                        disabled={sendingDaily}
                        style={{ flex: 2, padding: 12, borderRadius: 10, background: sendingDaily ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                      >
                        {sendingDaily ? '⏳ שולח...' : '✅ אשרי ושלחי ללקוח/ה'}
                      </button>
                      {dailyTargetLog && selectedClient?.phone && (
                        <button
                          onClick={() => {
                            var phone = selectedClient.phone.replace(/^0/, '972')
                            var msg = 'היי ' + selectedClient.name + '! 🌿\nדוח הביצועים שלך מחכה באפליקציה 💚\nhttps://project-l990h.vercel.app'
                            window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                          }}
                          style={{ padding: '12px 14px', borderRadius: 10, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                        >
                          📱
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {sentDaily && <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 12, padding: '12px 16px', marginTop: 8, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>✅ הדוח נשלח ללקוח/ה בהצלחה!</div>}
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
                <button onClick={openDoctorLetter} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>📄 פתחי מכתב לרופא</button>
                {selectedClient.phone && (
                  <button onClick={() => { var phone = selectedClient.phone.replace(/^0/,'972'); var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמצורף מכתב לרופא המשפחה.\n\nכניסה ליומן: https://project-l990h.vercel.app'; window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank') }} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                    📱 שלחי ב-WhatsApp
                  </button>
                )}
              </div>
            )}

            {tab === 'stage' && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#0f4c2a' }}>🏆 שלב הלקוחה בתוכנית</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>שינוי השלב יפתח/יסגור תכנים באפליקציית הלקוחה</div>
                {[
                  { stage: 1, title: 'שלב 1 — הניצוץ', desc: 'מודעות ואיזון קליני. יומן + NLP בסיסי.', color: '#f97316', bg: '#fff7ed' },
                  { stage: 2, title: 'שלב 2 — העוגן', desc: 'עיצוב סביבה. נפתח: מדריך מזווה + רשימת קניות.', color: '#0d9488', bg: '#f0fdfa' },
                  { stage: 3, title: 'שלב 3 — החופש', desc: 'דרך חיים. נפתח: ספר מתכונים + נשנושים.', color: '#9333ea', bg: '#faf5ff' },
                ].map(function(s) {
                  const isActive = (selectedClient.current_stage || 1) === s.stage
                  return (
                    <div key={s.stage} onClick={async function() { await supabase.from('clients').update({ current_stage: s.stage }).eq('id', selectedClient.id); setSelectedClient(c => ({ ...c, current_stage: s.stage })) }} style={{ padding: 16, borderRadius: 14, border: '2px solid ' + (isActive ? s.color : '#e5e7eb'), background: isActive ? s.bg : '#fafafa', cursor: 'pointer', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: '2px solid ' + (isActive ? s.color : '#d1d5db'), background: isActive ? s.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isActive && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: isActive ? s.color : '#333' }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.desc}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: 8, padding: 12, background: '#f0fdf4', borderRadius: 10, fontSize: 12, color: '#166534' }}>
                  💡 השלב הנוכחי: <strong>שלב {selectedClient.current_stage || 1}</strong> — נשמר אוטומטית בלחיצה
                </div>
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
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 הדבקת טקסט מבדיקות דם</div>
                  <textarea value={bloodText} onChange={e => setBloodText(e.target.value)} placeholder="הדביקי כאן את תוצאות הבדיקות כטקסט חופשי..." rows={5} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginBottom: 8 }} />
                  <button onClick={extractBloodFromText} disabled={bloodScanLoading || !bloodText.trim()} style={{ width: '100%', padding: 12, borderRadius: 10, background: bloodScanLoading ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                    {bloodScanLoading ? '⏳ מחלץ ערכים...' : '🤖 חלצי ערכים אוטומטית'}
                  </button>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ ערכים חריגים נוספים (לא בטופס)</div>
                  <textarea value={extraBloodNotes} onChange={e => setExtraBloodNotes(e.target.value)} onBlur={async e => { if (selectedClient) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, extra_blood_notes: e.target.value, updated_at: new Date().toISOString() }, { onConflict: 'client_password' }) }} placeholder="לדוגמה: IgG 2328 (גבוה), FLC Kappa 30.87..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>נשמר אוטומטית בעזיבת השדה</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🩸 ערכי בדיקות דם</div>
                  <Field label="תאריך הבדיקות" value={profile.blood_tests_date} onChange={v => updateProfile('blood_tests_date', v)} type="date" />
                  {BLOOD_TESTS.map(function(test) {
                    var val = (profile.blood_tests || {})[test.key] || ''
                    return (
                      <div key={test.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div><div style={{ fontSize: 13, fontWeight: 600 }}>{test.label}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>תקין: {test.normal} {test.unit}</div></div>
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
                  <div>פריט</div><div style={{ textAlign: 'center' }}>קלוריות</div><div style={{ textAlign: 'center' }}>חלבון</div><div style={{ textAlign: 'center' }}>שומן</div><div style={{ textAlign: 'center' }}>סיבים</div><div></div>
                </div>
                {nutritionItems.map(function(item) {
                  return <NutritionRow key={item.id} item={item} onSave={async function(updated) { await supabase.from('nutrition_data').upsert(updated, { onConflict: 'id' }); const { data } = await supabase.from('nutrition_data').select('*').order('id'); setNutritionItems(data || []) }} />
                })}
              </div>
            )}

            {tab === 'ai' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🧠 ניתוח AI מקיף</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>משלב: שאלון 360 + בדיקות דם + NLP + ימי אכילה</div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#0f4c2a' }}>🍽️ 3 ימי אכילה אופייניים</div>
                    <textarea value={foodDiary} onChange={e => setFoodDiary(e.target.value)} placeholder='הזיני כאן תיאור של 3 ימי אכילה רגילים...' rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7 }} />
                  </div>
                  <button onClick={runProfileAnalysis} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: aiLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: 16 }}>
                    {aiLoading ? '⏳ מנתחת... (עד דקה)' : '🧠 הפעילי ניתוח מקיף'}
                  </button>
                </div>
                {editableAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#0f4c2a' }}>✏️ ערכי לפני שליחה</div>
                    <textarea value={editableAnalysis} onChange={e => setEditableAnalysis(e.target.value)} rows={20} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => window.open('/report?client=' + selectedClient.password + '&preview=true', '_blank')} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>👁️ תצוגה מקדימה</button>
                      <button onClick={sendAnalysisToClient} disabled={sendingToClient} style={{ flex: 2, padding: 14, borderRadius: 12, background: sentToClient ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        {sendingToClient ? '⏳ שולחת...' : sentToClient ? '✅ נשמר!' : '📤 שמרי ואשרי'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'report' && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#0f4c2a' }}>📊 הדוח השמור של {selectedClient.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>הדוח נשמר אוטומטית בכל ניתוח AI — לא מתאפס</div>
                {editableAnalysis ? (
                  <>
                    <textarea value={editableAnalysis} onChange={e => setEditableAnalysis(e.target.value)} rows={20} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => window.open('/report?client=' + selectedClient.password + '&preview=true', '_blank')} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>👁️ תצוגה מקדימה</button>
                      <button onClick={sendAnalysisToClient} disabled={sendingToClient} style={{ flex: 2, padding: 14, borderRadius: 12, background: sentToClient ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        {sendingToClient ? '⏳ שולחת...' : sentToClient ? '✅ נשמר!' : '📤 שמרי ואשרי'}
                      </button>
                    </div>
                    {selectedClient.phone && (
                      <button onClick={() => { var phone = selectedClient.phone.replace(/^0/,'972'); var msg = 'היי ' + selectedClient.name + '! 🌿\n\nהדוח האישי שלך מוכן — לחצי כאן לצפייה:\nhttps://project-l990h.vercel.app/report?client=' + selectedClient.password; window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank') }} style={{ width: '100%', padding: 14, borderRadius: 12, marginTop: 8, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        📱 שלחי ללקוחה בוואטסאפ
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
                    <div>עדיין לא הופק ניתוח AI עבור {selectedClient.name}</div>
                    <button onClick={() => setTab('ai')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>עברי לטאב AI</button>
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
                  <div style={{ display: 'flex', gap: 8 }}>{['נקבה', 'זכר'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, gender: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.gender === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.gender === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: newClient.gender === g ? '#0f4c2a' : '#555' }}>{g}</button>)}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['ירידה במשקל', 'שמירה על משקל', 'עלייה במסה'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, goal: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.goal === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.goal === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.goal === g ? '#0f4c2a' : '#555', minWidth: 100 }}>{g}</button>)}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, activity: g}))} style={{ padding: '6px 10px', borderRadius: 10, border: '2px solid ' + (newClient.activity === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.activity === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.activity === g ? '#0f4c2a' : '#555' }}>{g}</button>)}</div>
                </div>
                <button onClick={addClient} disabled={addingClient} style={{ width: '100%', padding: 14, borderRadius: 12, background: addingClient ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                  {addingClient ? '⏳ מוסיפה...' : '➕ הוסיפי לקוחה'}
                </button>
              </div>
            )}

            {tab === 'pantry' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#0f4c2a' }}>🎥 וידאו אישי למטופלת</div>
                  <input value={selectedClient.video_url || ''} onChange={e => setSelectedClient(prev => ({ ...prev, video_url: e.target.value }))} onBlur={e => updateClientData('video_url', e.target.value)} placeholder="הכניסי קישור YouTube או Vimeo..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                  {selectedClient.video_url && (
                    <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden' }}>
                      <iframe src={selectedClient.video_url.replace('watch?v=', 'embed/')} width="100%" height="200" frameBorder="0" allowFullScreen style={{ borderRadius: 12, display: 'block' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>נשמר אוטומטית בעזיבת השדה</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#0f4c2a' }}>📝 הנחיות מזווה</div>
                  <textarea value={selectedClient.pantry_notes || ''} onChange={e => setSelectedClient(prev => ({ ...prev, pantry_notes: e.target.value }))} onBlur={e => updateClientData('pantry_notes', e.target.value)} placeholder="כתבי הנחיות מזווה אישיות למטופלת..." style={{ width: '100%', height: 200, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7 }} />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>נשמר אוטומטית בעזיבת השדה</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: '#0f4c2a' }}>🛒 ניהול מלאי וקניות</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItemToInventory()} placeholder="שם המוצר (לדוגמה: עדשים)" style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    <button onClick={addItemToInventory} disabled={addingItem || !newItemName.trim()} style={{ padding: '10px 18px', borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                      {addingItem ? '⏳' : '+ הוסיפי'}
                    </button>
                  </div>
                  {inventory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>עדיין אין פריטים — הוסיפי מוצר ראשון 👆</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, color: '#555', fontWeight: 700 }}>מוצר</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13, color: '#555', fontWeight: 700 }}>סטטוס</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13, color: '#555', fontWeight: 700 }}>פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontSize: 14, color: '#222' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button onClick={() => toggleItemStatus(item.id, item.status)} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: item.status === 'missing' ? '#fef2f2' : '#dcfce7', color: item.status === 'missing' ? '#ef4444' : '#16a34a' }}>
                                {item.status === 'missing' ? '❌ חסר' : '✅ קיים'}
                              </button>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button onClick={() => deleteItem(item.id)} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', fontWeight: 700 }}>מחק</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import WelcomeDocument from '../WelcomeDocument'

const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}
const ACTIVITY_MULT = {
  'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9
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
  var total = { calories: 0, protein: 0, fat: 0, fiber: 0, carbs: 0 }
  function add(id) {
    var item = nutritionData[id]
    if (item) { total.calories += item.calories || 0; total.protein += item.protein || 0; total.fat += item.fat || 0; total.fiber += item.fiber || 0; total.carbs += item.carbs || 0 }
  }
  if (log.had_snack) add('snack')
  if (log.checks) Object.keys(log.checks).forEach(function(id) { if (log.checks[id]) add(id) })
  if (log.carb_sel) add(log.carb_sel)
  if (log.prot_sel) add(log.prot_sel)
  if (log.prot_checks) Object.keys(log.prot_checks).forEach(function(id) { if (log.prot_checks[id]) add(id) })
  if (log.fat_sel) add(log.fat_sel)
  if (log.veggie_sel) add(log.veggie_sel)
  if (log.benayim_sel) add(log.benayim_sel)
  if (log.had_benayim) add('benayim')
  total.calories += (log.boker_extra_cal || 0) + (log.lunch_extra_cal || 0) + (log.erev_extra_cal || 0)
  total.protein += (log.boker_extra_prot || 0) + (log.lunch_extra_prot || 0) + (log.erev_extra_prot || 0)
  if (log.scan_calories) { total.calories += log.scan_calories; total.protein += (log.scan_protein || 0); total.fat += (log.scan_fat || 0) }
  var totalCal = total.protein * 4 + total.fat * 9 + total.carbs * 4
  total.proteinPct = totalCal > 0 ? Math.round((total.protein * 4 / totalCal) * 100) : 0
  total.fatPct = totalCal > 0 ? Math.round((total.fat * 9 / totalCal) * 100) : 0
  total.carbsPct = totalCal > 0 ? Math.round((total.carbs * 4 / totalCal) * 100) : 0
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
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800}>{value}%</text>
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

const VISIT_CHECKLIST = [
  { section: '🥫 מזווה', items: [
    { id: 'white_sugar', label: 'סוכר לבן' },
    { id: 'biscuits', label: 'ביסקוויטים / עוגיות קנויות' },
    { id: 'sweet_cereal', label: 'דגני בוקר ממותקים' },
    { id: 'white_pasta', label: 'פסטה / אורז לבן' },
    { id: 'ww_flour', label: 'קמח כוסמין / מלא' },
    { id: 'oats', label: 'שיבולת שועל' },
    { id: 'legumes', label: 'קטניות (עדשים / חומוס / שעועית)' },
    { id: 'olive_oil', label: 'שמן זית' },
    { id: 'tahini_raw', label: 'טחינה גולמית' },
    { id: 'nuts', label: 'אגוזים / שקדים טבעיים' },
    { id: 'brown_rice', label: 'אורז מלא / קינואה' },
    { id: 'canned_tomato', label: 'עגבניות / רסק משומר' },
  ]},
  { section: '🧊 מקרר', items: [
    { id: 'eggs', label: 'ביצים' },
    { id: 'cottage', label: 'קוטג׳ / גבינה לבנה 5%' },
    { id: 'greek_yogurt', label: 'יוגורט יווני 0%' },
    { id: 'labneh', label: 'לאבנה' },
    { id: 'fresh_veggies', label: 'ירקות טריים' },
    { id: 'fruit_juice', label: 'מיצי פירות קנויים' },
    { id: 'sweet_yogurt', label: 'יוגורטים ממותקים' },
    { id: 'sausages', label: 'נקניקיות / מוצרים מעובדים' },
  ]},
  { section: '❄️ מקפיא', items: [
    { id: 'frozen_chicken', label: 'עוף / הודו' },
    { id: 'frozen_fish', label: 'דגים' },
    { id: 'frozen_veggies', label: 'ירקות קפואים' },
    { id: 'frozen_ready', label: 'ארוחות מוכנות קנויות' },
  ]},
]

const VISIT_STATUS = {
  green: { emoji: '✅', label: 'מצוין', bg: '#dcfce7', border: '#16a34a' },
  yellow: { emoji: '🟡', label: 'לאזן', bg: '#fef9c3', border: '#ca8a04' },
  red: { emoji: '🔴', label: 'להוציא', bg: '#fee2e2', border: '#ef4444' },
}

function renderMd(text) {
  if (!text) return { __html: '' }
  const SECTION_COLORS = [
    { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
    { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
    { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
    { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
    { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
    { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
    { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
  ]
  const SESSION_COLOR = { bg: '#f0fdf4', border: '#0f4c2a', title: '#0f4c2a' }
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code style="background:rgba(0,0,0,0.07);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')

  // פרסור לבלוקים לפי ## headers
  const blocks = []
  let cur = null
  for (const line of text.split('\n')) {
    if (/^---+$/.test(line.trim())) continue
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim()
      const m = title.match(/^(\d+)\./)
      const color = m ? (SECTION_COLORS[parseInt(m[1]) - 1] || SESSION_COLOR) : SESSION_COLOR
      cur = { color, title, lines: [] }
      blocks.push(cur)
    } else {
      if (!cur) { cur = { color: SESSION_COLOR, title: null, lines: [] }; blocks.push(cur) }
      cur.lines.push(line)
    }
  }

  const renderLines = (lines, accent) => {
    const out = []
    let blanks = 0
    for (const line of lines) {
      if (line.trim() === '') { blanks++; if (blanks === 1) out.push('<div style="height:4px"></div>'); continue }
      blanks = 0
      if (line.startsWith('### ')) { out.push(`<div style="font-size:13px;font-weight:700;color:${accent};margin:8px 0 3px">${inl(line.slice(4))}</div>`); continue }
      if (line.startsWith('#### ')) { out.push(`<div style="font-size:12px;font-weight:600;color:#6b7280;margin:5px 0 2px">${inl(line.slice(5))}</div>`); continue }
      if (/^\|.+\|$/.test(line)) { out.push(`<div style="font-family:monospace;font-size:11px;background:rgba(0,0,0,0.04);padding:3px 6px;margin:1px 0;border-radius:4px">${esc(line)}</div>`); continue }
      if (line.startsWith('- ') || line.startsWith('• ')) { out.push(`<div style="display:flex;gap:6px;margin:2px 0"><span style="color:${accent};flex-shrink:0;font-weight:700">•</span><span>${inl(line.slice(2))}</span></div>`); continue }
      const nm = line.match(/^(\d+)\.\s(.+)/)
      if (nm) { out.push(`<div style="display:flex;gap:6px;margin:2px 0"><span style="color:${accent};font-weight:700;flex-shrink:0">${nm[1]}.</span><span>${inl(nm[2])}</span></div>`); continue }
      out.push(`<div style="margin:2px 0;line-height:1.7">${inl(line)}</div>`)
    }
    return out.join('')
  }

  const html = blocks.map(b =>
    `<div style="background:${b.color.bg};border:1.5px solid ${b.color.border};border-radius:12px;padding:14px 16px;margin-bottom:10px">` +
    (b.title ? `<div style="font-size:15px;font-weight:800;color:${b.color.title};margin-bottom:8px">${inl(b.title)}</div>` : '') +
    renderLines(b.lines, b.color.border) +
    '</div>'
  ).join('')
  return { __html: html }
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
  const [newClient, setNewClient] = useState({ name: '', last_name: '', password: '', phone: '', id_number: '', age: '', weight: '', height: '', goal: '', activity: '', gender: '' })
  const [clientTrack, setClientTrack] = useState('') // 'self' | 'child' | 'both'
  const [childData, setChildData] = useState({ name: '', age: '', weight: '', height: '', gender: '', password: '' })
  const [addingClient, setAddingClient] = useState(false)
  const [clientAdded, setClientAdded] = useState('')
  const [foodDiary, setFoodDiary] = useState('')
  const [bloodText, setBloodText] = useState('')
  const [bloodScanLoading, setBloodScanLoading] = useState(false)
  const [extraBloodNotes, setExtraBloodNotes] = useState('')
  const [editableAnalysis, setEditableAnalysis] = useState('')
  const [sendingToClient, setSendingToClient] = useState(false)
  const [sentToClient, setSentToClient] = useState(false)
  const [dailyPreview, setDailyPreview] = useState('')
  const [logDetails, setLogDetails] = useState(null)
  const [savingLogEdit, setSavingLogEdit] = useState(false)
  const [dailyEditing, setDailyEditing] = useState(false)
  const [dailyTargetLog, setDailyTargetLog] = useState(null)
  const [sendingDaily, setSendingDaily] = useState(false)
  const [sentDaily, setSentDaily] = useState(null)
  const [inventory, setInventory] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [visitFindings, setVisitFindings] = useState({})
  const [visitNotes, setVisitNotes] = useState('')
  const [previewDoc, setPreviewDoc] = useState(false)
  const [previewReport, setPreviewReport] = useState(false)
  const [togglingDoc, setTogglingDoc] = useState(false)
  const [journeyAnswers, setJourneyAnswers] = useState({
    goal_reason: '', goal_what: '', goal_context: '', goal_why: '', goal_proof: '',
    vision_see: '', vision_hear: '', vision_feel: '',
    ecology_keep: '', ecology_harmony: '', ecology_who: '',
    belief_hard: '', belief_when: '',
    resources_has: '', resources_past: '',
    vaccine_moment: '', vaccine_action: '', vaccine_anchor: '',
    first_step: ''
  })
  const [journeyAnalysis, setJourneyAnalysis] = useState('')
  const [journeyLoading, setJourneyLoading] = useState(false)
  const [journeySaving, setJourneySaving] = useState(false)
  const [journeySaved, setJourneySaved] = useState(false)
  const journeyAnswersRef = useRef({})
  const [sessionNotes, setSessionNotes] = useState('')
  const [journeyDocLoading, setJourneyDocLoading] = useState(false)
  const [journeyDocSent, setJourneyDocSent] = useState(false)

  // ── 👨‍👩‍👧 הורה-ילד state ──
  const [childNotes, setChildNotes] = useState({
    child_self: '', state_of_mind: '', family_dynamics: '', parent_model: '', triggers_social: ''
  })
  const [childAnalysis, setChildAnalysis] = useState('')
  const [childLoading, setChildLoading] = useState(false)
  const [childEditing, setChildEditing] = useState(false)
  const [childFeedback, setChildFeedback] = useState('')
  const [childFeedbackLoading, setChildFeedbackLoading] = useState(false)
  const [childFeedbackSaved, setChildFeedbackSaved] = useState(false)
  const [sendingChildFeedback, setSendingChildFeedback] = useState(false)
  const [childFeedbackSent, setChildFeedbackSent] = useState(false)

  // ── 🩺 הגוף מדבר state ──
  const [bodyNotes, setBodyNotes] = useState({
    body_signals: '', body_history: '', emotion_body: '', energy_sleep: '', hunger_satiety: '', already_knows: '', main_complaint: ''
  })
  const [bodyAnalysis, setBodyAnalysis] = useState('')
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyEditing, setBodyEditing] = useState(false)
  const [bodyFeedback, setBodyFeedback] = useState('')
  const [bodyFeedbackLoading, setBodyFeedbackLoading] = useState(false)
  const [bodyFeedbackSaved, setBodyFeedbackSaved] = useState(false)
  const [sendingBodyFeedback, setSendingBodyFeedback] = useState(false)
  const [bodyFeedbackSent, setBodyFeedbackSent] = useState(false)

  // ── ✅ Agent Instructions state ──
  const [agentInstructions, setAgentInstructions] = useState('')
  const [generatingInstructions, setGeneratingInstructions] = useState(false)
  const [savedInstructions, setSavedInstructions] = useState(false)

  // ── 🌱 שורשים state ──
  const [rootsNotes, setRootsNotes] = useState({
    home_background: '', family_identity: '', today_patterns: '', forward_passing: '', beliefs_motivation: '', resources: ''
  })
  const [rootsAnalysis, setRootsAnalysis] = useState('')
  const [rootsLoading, setRootsLoading] = useState(false)
  const [rootsEditing, setRootsEditing] = useState(false)
  const [rootsFeedback, setRootsFeedback] = useState('')
  const [rootsFeedbackLoading, setRootsFeedbackLoading] = useState(false)
  const [rootsFeedbackSaved, setRootsFeedbackSaved] = useState(false)
  const [rootsFeedbackSent, setRootsFeedbackSent] = useState(false)
  const [sendingRootsFeedback, setSendingRootsFeedback] = useState(false)
  const [rootsViewMode, setRootsViewMode] = useState('view')
  const [bodyViewMode, setBodyViewMode] = useState('view')
  const sessionDataRef = useRef({})

  // ── ✅ Plate Calculator state ──
  const [calculatingPlate, setCalculatingPlate] = useState(false)
  const [plateResult, setPlateResult] = useState(null)

  async function calcPlate() {
    if (!selectedClient?.password) return
    setCalculatingPlate(true)
    setPlateResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'calcPlate', clientPassword: selectedClient.password })
      })
      const data = await res.json()
      if (data.result) setPlateResult(data.result)
    } catch(e) { alert('שגיאה בחישוב') }
    setCalculatingPlate(false)
  }

  const login = () => { if (pin === 'Esterika26') setAuth(true) }

  useEffect(function() { journeyAnswersRef.current = journeyAnswers }, [journeyAnswers])

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
    setProfile({})
    setTab('logs')
    setAiAnalysis('')
    setLogs([])
    setFilteredLogs([])
    setPatientId('')
    setSelectedTests({})
    setInventory([])
    setPreviewDoc(false)
    setJourneyAnswers({ goal_reason: '', goal_what: '', goal_context: '', goal_why: '', goal_proof: '', vision_see: '', vision_hear: '', vision_feel: '', ecology_keep: '', ecology_harmony: '', ecology_who: '', belief_hard: '', belief_when: '', resources_has: '', resources_past: '', vaccine_moment: '', vaccine_action: '', vaccine_anchor: '', first_step: '' })
    setJourneyAnalysis('')
    setJourneySaved(false)

    // ✅ תמיד טוען נתונים טריים מה-DB — מונע באג של welcome_doc_enabled שמתאפס
    const { data: freshClient } = await supabase.from('clients').select('*').eq('id', client.id).maybeSingle()
    const activeClient = freshClient || client
    setSelectedClient(activeClient)
    setAgentInstructions(activeClient.agent_instructions || '')

    const { data } = await supabase.from('client_profiles').select('*').eq('client_password', client.password).maybeSingle()
    if (data) {
      setProfile(data)
      setFoodDiary(data.food_diary || '')
      setExtraBloodNotes(data.extra_blood_notes || '')
      if (data.ai_report) { setAiAnalysis(data.ai_report); setEditableAnalysis(data.ai_report) }
      if (data.roots_feedback) setRootsFeedback(data.roots_feedback)
      if (data.body_feedback) setBodyFeedback(data.body_feedback)
    } else setProfile({ client_password: client.password, blood_tests: {} })

    // טעינה מ-sessions_data (Supabase) — fallback ל-localStorage
    const pw = client.password
    const sd = data?.sessions_data || {}
    sessionDataRef.current = sd
    const lsLoad = (key, isJson) => { try { const v = localStorage.getItem('sd_' + key + '_' + pw); return v ? (isJson ? JSON.parse(v) : v) : null } catch(e) { return null } }
    // journey — עמודות ייעודיות (עדיפות), fallback ל-sessions_data ול-localStorage
    const jA = (data?.journey_answers && Object.keys(data.journey_answers).length > 0) ? data.journey_answers : (sd.journey_answers || lsLoad('journey_answers', true)); if (jA) setJourneyAnswers(prev => ({ ...prev, ...jA }))
    const jAn = (data?.journey_analysis && data.journey_analysis.length > 0) ? data.journey_analysis : (sd.journey_analysis || lsLoad('journey_analysis', false)); if (jAn) setJourneyAnalysis(jAn)
    const sN = sd.session_notes || lsLoad('session_notes', false); if (sN) setSessionNotes(sN)
    const rN = sd.roots_notes || lsLoad('roots_notes', true); if (rN) setRootsNotes(n => ({ ...n, ...rN }))
    const rAn = sd.roots_analysis || lsLoad('roots_analysis', false); if (rAn) { setRootsAnalysis(rAn); setRootsEditing(true); setRootsViewMode('view') }
    const bN = sd.body_notes || lsLoad('body_notes', true); if (bN) setBodyNotes(n => ({ ...n, ...bN }))
    const bAn = sd.body_analysis || lsLoad('body_analysis', false); if (bAn) { setBodyAnalysis(bAn); setBodyEditing(true); setBodyViewMode('view') }
    const { data: nd } = await supabase.from('nutrition_data').select('*').order('id')
    setNutritionItems(nd || [])
    const { data: logsData } = await supabase.from('daily_logs').select('*').eq('client_name', client.password).order('log_date', { ascending: false }).limit(30)
    setLogs(logsData || [])
    applyFilter(logsData || [], 'week', '', '')
    const { data: inventoryData } = await supabase.from('inventory_items').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
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

  async function updateClientData(field, value) {
    if (!selectedClient) return
    const { error } = await supabase.from('clients').update({ [field]: value }).eq('id', selectedClient.id)
    if (!error) setSelectedClient(prev => ({ ...prev, [field]: value }))
  }

  function saveSessionKey(key, value) {
    if (!selectedClient?.password) return
    // ref — תמיד עדכני, אין stale closure
    sessionDataRef.current = { ...sessionDataRef.current, [key]: value }
    const merged = sessionDataRef.current
    // localStorage — גיבוי מיידי
    try { localStorage.setItem('sd_' + key + '_' + selectedClient.password, typeof value === 'string' ? value : JSON.stringify(value)) } catch(e) {}
    // Supabase sessions_data — שמירה בענן
    setProfile(p => ({ ...p, sessions_data: merged }))
    supabase.from('client_profiles').upsert({ client_password: selectedClient.password, sessions_data: merged }, { onConflict: 'client_password' }).then(() => {}).catch(() => {})
  }

  function saveJourney(answers, analysis) {
    if (!selectedClient?.password) return
    const pw = selectedClient.password
    const upsertData = { client_password: pw }
    if (answers !== undefined) {
      upsertData.journey_answers = answers
      try { localStorage.setItem('sd_journey_answers_' + pw, JSON.stringify(answers)) } catch(e) {}
    }
    if (analysis !== undefined) {
      upsertData.journey_analysis = analysis
      try { localStorage.setItem('sd_journey_analysis_' + pw, analysis) } catch(e) {}
    }
    supabase.from('client_profiles').upsert(upsertData, { onConflict: 'client_password' }).then(({ error }) => { if (error) console.error('saveJourney error:', error) }).catch((e) => console.error('saveJourney catch:', e))
  }

  async function handleSaveJourney() {
    if (!selectedClient?.password) return
    setJourneySaving(true)
    const pw = selectedClient.password
    const answers = journeyAnswersRef.current
    const upsertData = { client_password: pw, journey_answers: answers }
    if (journeyAnalysis) upsertData.journey_analysis = journeyAnalysis
    try { localStorage.setItem('sd_journey_answers_' + pw, JSON.stringify(answers)) } catch(e) {}
    const { error } = await supabase.from('client_profiles').upsert(upsertData, { onConflict: 'client_password' })
    if (error) { console.error('handleSaveJourney error:', error); alert('שגיאה בשמירה: ' + error.message) }
    setJourneySaving(false)
    setJourneySaved(true)
    setTimeout(() => setJourneySaved(false), 3000)
  }

  // ── ✅ פונקציות Agent Instructions ──
  async function generateAgentInstructions() {
    if (!selectedClient) return
    setGeneratingInstructions(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'agentInstructions',
          clientPassword: selectedClient.password
        })
      })
      const data = await res.json()
      if (data.result) {
        setAgentInstructions(data.result)
        setSelectedClient(prev => ({ ...prev, agent_instructions: data.result, agent_instructions_updated_at: new Date().toISOString() }))
      }
    } catch(e) { alert('שגיאה: ' + e.message) }
    setGeneratingInstructions(false)
  }

  async function saveAgentInstructions() {
    if (!selectedClient) return
    await supabase.from('clients').update({
      agent_instructions: agentInstructions,
      agent_instructions_updated_at: new Date().toISOString()
    }).eq('id', selectedClient.id)
    setSelectedClient(prev => ({ ...prev, agent_instructions: agentInstructions }))
    setSavedInstructions(true)
    setTimeout(() => setSavedInstructions(false), 3000)
  }

  async function refreshWelcomeDoc() {
    if (!selectedClient) return
    if (!window.confirm('למחוק את המסמך הקיים ולייצר חדש?')) return
    setTogglingDoc(true)
    await supabase.from('client_profiles').update({
      welcome_doc_json: null,
      welcome_doc_generated_at: null
    }).eq('client_password', selectedClient.password)
    setTogglingDoc(false)
    alert('✅ המסמך נמחק — בפתיחה הבאה ייווצר חדש')
  }

  async function toggleWelcomeDoc() {
    if (!selectedClient) return
    setTogglingDoc(true)
    const newVal = !selectedClient.welcome_doc_enabled
    await supabase.from('clients').update({ welcome_doc_enabled: newVal }).eq('id', selectedClient.id)
    setSelectedClient(prev => ({ ...prev, welcome_doc_enabled: newVal }))
    setTogglingDoc(false)
  }

  async function addItemToInventory() {
    if (!newItemName.trim() || !selectedClient) return
    setAddingItem(true)
    const { data, error } = await supabase.from('inventory_items').insert([{ client_id: selectedClient.id, name: newItemName.trim(), category: 'pantry', status: 'missing' }]).select()
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
      welcome_doc_enabled: false,
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
      if (data.extra && data.extra.trim()) { setExtraBloodNotes(data.extra.trim()); alert('✅ הערכים חולצו! נמצאו גם ערכים חריגים נוספים.') }
      else alert('✅ הערכים חולצו! בדקי ושמרי.')
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
    var msg = 'היי ' + selectedClient.name + '! 🌿\n\nמשוב חדש מאתי מחכה לך באפליקציה 💚\nהיכנסי לצפייה: https://project-l990h.vercel.app'
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
  }

  async function runProfileAnalysis() {
    setAiLoading(true); setAiAnalysis(''); setEditableAnalysis('')
    try {
      if (extraBloodNotes) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, extra_blood_notes: extraBloodNotes, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
      if (foodDiary && foodDiary.trim()) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, food_diary: foodDiary, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
      var profileData = {}
      var allowedKeys = ['sleep_quality','sleep_issues','wake_time','sleep_time','digestion','smoking','menstrual_cycle','menstrual_days','medications','therapists','medical_history','family_history','diet_restrictions','breakfast_habits','lunch_habits','dinner_habits','snack_habits','food_sensitivities','avoided_foods','cooks_at_home','restaurants_per_week','water_intake','coffee_intake','alcohol_intake','emotional_eating','work_hours','stress_level','energy_level','mood_notes','exercise_type','pain_issues','main_goal','goal_obstacles','goal_motivation','success_vision','important_values','positive_memories','blood_tests','extra_blood_notes','home_counter','home_shopping','home_never','home_fridge','home_children','home_family_meals','body_stomach','body_after_eating','body_food_link','body_headaches','body_fatigue','child_name','child_age','child_eating','child_eating_when','child_blood','child_mood','child_stress','child_calm','child_anxiety','child_food_comfort','family_atmosphere','siblings_rules','child_safe_person','family_meals_vibe','parent_food_model','parent_sport','home_junk','siblings_food_diff','child_eat_with','child_social_eating','child_friend','child_bedtime','child_screen_eat']
      allowedKeys.forEach(function(k) { if (profile[k] !== undefined) profileData[k] = profile[k] })
      var clientData = { age: selectedClient.age, weight: selectedClient.weight, height: selectedClient.height, gender: selectedClient.gender, activity: selectedClient.activity, goal: selectedClient.goal, target_weight: selectedClient.target_weight }

      // ניתוח מותאם לילד
      if (selectedClient.is_child) {
        const childPrompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית. כתבי ניתוח מקיף לילד/ה ' + selectedClient.name + ' בגיל ' + (selectedClient.age || 'לא ידוע') + '.\n\n' +
          'נתונים:\n' +
          'משקל: ' + (selectedClient.weight || 'לא ידוע') + ' ק"ג | גובה: ' + (selectedClient.height || 'לא ידוע') + ' ס"מ\n' +
          'אכילה: ' + (profileData.child_eating || 'לא מולא') + '\n' +
          'מתי אוכל הכי הרבה: ' + (profileData.child_eating_when || 'לא מולא') + '\n' +
          'מצב רוח: ' + (profileData.child_mood || 'לא מולא') + '\n' +
          'מה מלחיץ: ' + (profileData.child_stress || 'לא מולא') + '\n' +
          'מה מרגיע: ' + (profileData.child_calm || 'לא מולא') + '\n' +
          'חרדה/חברתי: ' + (profileData.child_anxiety || 'לא מולא') + '\n' +
          'אוכל כמקום בטוח: ' + (profileData.child_food_comfort || 'לא מולא') + '\n' +
          'אווירה בבית: ' + (profileData.family_atmosphere || 'לא מולא') + '\n' +
          'אחים: ' + (profileData.siblings_rules || 'לא מולא') + '\n' +
          'מודל הורי: ' + (profileData.parent_food_model || 'לא מולא') + '\n' +
          'ג\u05f3אנק בבית: ' + (profileData.home_junk || 'לא מולא') + '\n' +
          'עם מי אוכל: ' + (profileData.child_eat_with || 'לא מולא') + '\n' +
          'אירועים חברתיים: ' + (profileData.child_social_eating || 'לא מולא') + '\n' +
          'לפני שינה: ' + (profileData.child_bedtime || 'לא מולא') + '\n' +
          'מסך+אכילה: ' + (profileData.child_screen_eat || 'לא מולא') + '\n' +
          'בדיקות דם: ' + JSON.stringify(profileData.blood_tests || {}) + '\n' +
          'ערכים חריגים: ' + (extraBloodNotes || 'אין') + '\n\n' +
          'כתבי ניתוח מעמיק לאתי. עברית, מקצועי. כלול:\n' +
          '**✨ תמונת הילד — מי הוא**\nמה מאפיין אותו, כוחות, דפוסים.\n\n--\n\n' +
          '**🔍 מה קורה סביב האוכל**\nדפוסי אכילה, טריגרים, קשר רגשי לאוכל.\n\n--\n\n' +
          '**🩺 מה אומרות הבדיקות**\nלכל ערך חריג — שם + ערך + משמעות + המלצה.\n\n--\n\n' +
          '**🏠 הדינמיקה הביתית**\nמה בבית תורם לדפוס? מה צריך לשנות?\n\n--\n\n' +
          '**🎯 המלצות פרקטיות**\n5-6 צעדים קונקרטיים להורה — מה לשנות מחר.'
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedClient.name, mode: 'rootsAnalysis', prompt: childPrompt }) })
        if (!res.ok) throw new Error('שגיאת שרת: ' + res.status)
        const data = await res.json()
        if (data.result) {
          setAiAnalysis(data.result); setEditableAnalysis(data.result)
          await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, ai_report: data.result, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
        }
      } else {
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedClient.name, mode: 'profile', profile: { ...profileData, ...clientData, extra_blood_notes: extraBloodNotes }, foodDiary: foodDiary || '' }) })
        if (!res.ok) throw new Error('שגיאת שרת: ' + res.status)
        const data = await res.json()
        if (data.error) { alert('שגיאה: ' + data.error) } else {
          setAiAnalysis(data.result); setEditableAnalysis(data.result)
          await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, ai_report: data.result, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
        }
      }
    } catch(err) { alert('שגיאה בניתוח: ' + err.message) }
    setAiLoading(false)
  }

  async function sendAnalysisToClient() {
    if (!editableAnalysis || !selectedClient) return
    setSendingToClient(true)
    await supabase.from('client_profiles').update({ ai_report: editableAnalysis, report_sent_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
    setSendingToClient(false); setSentToClient(true); setTimeout(() => setSentToClient(false), 4000)
    if (selectedClient.phone) {
      var phone = selectedClient.phone.replace(/^0/, '972')
      var msg = 'היי ' + selectedClient.name + '! 🌿\n\nהניתוח האישי שלך מוכן — היכנסי לאפליקציה לצפייה 💚\nhttps://project-l990h.vercel.app'
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
    }
  }

  async function runLogsAnalysis(targetLog) {
    if (!filteredLogs.length) return
    setAiLoading(true); setAiAnalysis(''); setDailyPreview(''); setDailyEditing(false)

    // קבע אילו לוגים לנתח ומה סוג הדוח
    var logsToAnalyze, reportType, dateLabel
    if (filterMode === 'today') {
      logsToAnalyze = filteredLogs
      reportType = 'daily'
      dateLabel = filteredLogs[0]?.log_date || new Date().toLocaleDateString('sv-SE')
      setDailyTargetLog(filteredLogs[0] || null)
    } else if (filterMode === 'custom' && dateFrom && dateTo) {
      logsToAnalyze = filteredLogs
      reportType = 'range'
      dateLabel = dateFrom + ' עד ' + dateTo
      setDailyTargetLog(null)
    } else {
      logsToAnalyze = filteredLogs
      reportType = 'weekly'
      dateLabel = 'שבוע אחרון'
      setDailyTargetLog(null)
    }

    var targets = calcTargets(selectedClient)
    var summary = logsToAnalyze.map(function(l) {
      var nut = calcNutrition(l, nutritionData)
      var scanExtra = ''
      if (l.scan_calories > 0) { scanExtra = ' | 📸 צילום: ' + l.scan_calories + ' קל'; if (l.scan_desc) scanExtra += ' (' + l.scan_desc + ')' }
      return 'תאריך: ' + l.log_date + ' | קלוריות: ' + Math.round(nut.calories) + (targets ? ' (יעד: ' + targets.calories + ')' : '') + ' | חלבון: ' + Math.round(nut.protein) + 'g' + (targets ? ' (יעד: ' + targets.protein + 'g)' : '') + ' | שומן: ' + Math.round(nut.fat) + 'g | פחמימות: ' + Math.round(nut.carbs) + 'g | מים: ' + (l.water || 0) + ' ליטר | צעדים: ' + (l.steps || 0) + scanExtra + (l.note ? ' | הערה: ' + l.note : '')
    }).join('\n')

    const res = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'logsReport',
        name: selectedClient.name,
        gender: selectedClient.gender || 'נקבה',
        reportType,
        dateLabel,
        logs: summary,
        nlpSummary: logsToAnalyze.map(function(l) {
          var m = l.nlp_metrics || {}
          if (!m.stress && !m.fatigue && !m.hunger && !m.mood) return null
          return l.log_date + ': לחץ ' + (m.stress||0) + '/5, עייפות ' + (m.fatigue||0) + '/5, רעב ' + (m.hunger||0) + '/5, מצב רוח: ' + (m.mood||'לא צוין')
        }).filter(Boolean).join(' | ')
      })
    })
    const data = await res.json()
    setDailyPreview(data.result); setDailyEditing(true); setAiLoading(false)
  }

  async function sendDailyFeedback() {
    if (!dailyPreview) return
    setSendingDaily(true)
    // שמור ב-client_profiles כדי שהלקוחה תראה תמיד
    await supabase.from('client_profiles').update({
      ai_report: dailyPreview,
      report_sent_at: new Date().toISOString()
    }).eq('client_password', selectedClient.password)
    // גם שמור על הלוג הספציפי אם קיים
    if (dailyTargetLog) {
      await supabase.from('daily_logs').update({ trainer_feedback: dailyPreview, report_approved: true }).eq('id', dailyTargetLog.id)
    }
    setSendingDaily(false); setSentDaily('done'); setDailyEditing(false)
    setTimeout(() => setSentDaily(null), 4000)
    const { data } = await supabase.from('daily_logs').select('*').eq('client_name', selectedClient.password).order('log_date', { ascending: false }).limit(30)
    setLogs(data || [])
    // פתח וואטסאפ אוטומטית
    if (selectedClient.phone) {
      var phone = selectedClient.phone.replace(/^0/, '972')
      var msg = 'היי ' + selectedClient.name + '! 🌿\n\nהדוח שלך מוכן — היכנסי לאפליקציה לצפייה 💚\nhttps://project-l990h.vercel.app'
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
    }
    setDailyPreview(''); setDailyTargetLog(null)
  }

  async function scanBloodTests(file) {
    setScanLoading(true)
    try {
      var base64 = await new Promise(function(res, rej) { var r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('Read failed')); r.readAsDataURL(file) })
      var response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'bloodImage', imageBase64: base64, mediaType: file.type }) })
      var data = await response.json()
      var parsed = JSON.parse(data.result.replace(/```json|```/g, '').trim())
      var newTests = Object.assign({}, profile.blood_tests || {})
      Object.keys(parsed).forEach(function(k) { if (parsed[k] !== null) newTests[k] = String(parsed[k]) })
      setProfile(p => ({ ...p, blood_tests: newTests }))
      if (data.extra && data.extra.trim()) { setExtraBloodNotes(data.extra.trim()); alert('✅ הערכים חולצו! נמצאו גם ערכים חריגים נוספים.') }
      else alert('✅ הערכים חולצו! בדקי ושמרי.')
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

      {previewDoc && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999, overflowY: 'auto' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10000 }}>
            <button onClick={() => setPreviewDoc(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10000 }}>
            <button onClick={() => setPreviewDoc(false)} style={{ padding: '10px 20px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✕ סגרי תצוגה מקדימה</button>
          </div>
          <WelcomeDocument clientPassword={selectedClient.password} clientName={selectedClient.name + ' ' + (selectedClient.last_name || '')} onContinue={() => setPreviewDoc(false)} />
        </div>
      )}

      {previewReport && editableAnalysis && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10000 }}>
            <button onClick={() => setPreviewReport(false)} style={{ padding: '10px 20px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✕ סגרי תצוגה מקדימה</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '70px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'cover', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>הדוח האישי שלך 💚</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{selectedClient?.name} · אתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const rawSections = editableAnalysis.split(/\n\s*--\s*\n/)
              const SECTION_COLORS = [
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
                { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
              ]
              return rawSections.map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const isBoldTitle = /^\*\*.*\*\*/.test(firstLine)
                const title = isBoldTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = isBoldTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '16px 18px', marginBottom: 12, border: `1.5px solid ${c.border}40`, boxShadow: `0 2px 8px ${c.border}15` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}30`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ הלקוחות שלי</div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, border: '1.5px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>בחרי לקוח:</div>
            <button onClick={() => { setSelectedClient(null); setTab('newclient') }} style={{ padding: '8px 16px', borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>➕ הוסיפי לקוח</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clients.filter(c => !c.is_child).map(parent => {
              const children = clients.filter(ch => ch.parent_id === parent.id)
              return (
                <div key={parent.id}>
                  <button onClick={() => loadProfile(parent)} style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '2px solid ' + (selectedClient?.id === parent.id ? '#0f4c2a' : '#e5e7eb'), background: selectedClient?.id === parent.id ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: selectedClient?.id === parent.id ? '#0f4c2a' : '#333', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{parent.client_track === 'child' ? '👤' : parent.client_track === 'both' ? '👨‍👩‍👧' : '👤'}</span>
                    <span>{parent.name} {parent.last_name || ''}</span>
                    {parent.client_track && <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 'auto' }}>{parent.client_track === 'self' ? 'עצמי' : parent.client_track === 'child' ? 'עבור ילד' : 'שניהם'}</span>}
                  </button>
                  {children.length > 0 && children.map(ch => (
                    <button key={ch.id} onClick={() => loadProfile(ch)} style={{ width: '100%', padding: '8px 16px 8px 32px', borderRadius: 10, border: '2px solid ' + (selectedClient?.id === ch.id ? '#7c3aed' : '#e9d5ff'), background: selectedClient?.id === ch.id ? '#faf5ff' : '#fdfbff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: selectedClient?.id === ch.id ? '#7c3aed' : '#7c3aed', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginRight: 16 }}>
                      <span>└ 👶</span>
                      <span>{ch.name}</span>
                      <span style={{ fontSize: 11, color: '#a78bfa', marginRight: 'auto' }}>גיל {ch.age || '?'}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {selectedClient && (
          <>
            <div style={{ background: '#fff', borderRadius: 18, padding: '12px 16px', marginBottom: 8, border: '1.5px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>🎯 מסלול לקוח</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: selectedClient.client_track === 'both' || selectedClient.client_track === 'child' ? 12 : 0 }}>
                {[{ k: 'self', l: '👤 עצמי' }, { k: 'child', l: '👶 עבור ילד' }, { k: 'both', l: '👨‍👩‍👧 שניהם' }].map(t => (
                  <button key={t.k} onClick={async () => {
                    await supabase.from('clients').update({ client_track: t.k }).eq('id', selectedClient.id)
                    setSelectedClient(c => ({ ...c, client_track: t.k }))
                  }} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '2px solid ' + (selectedClient.client_track === t.k ? '#0f4c2a' : '#e5e7eb'), background: selectedClient.client_track === t.k ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: selectedClient.client_track === t.k ? '#0f4c2a' : '#555' }}>{t.l}</button>
                ))}
              </div>
              {(selectedClient.client_track === 'both' || selectedClient.client_track === 'child') && (
                <div style={{ background: '#faf5ff', borderRadius: 12, padding: 12, border: '1.5px solid #e9d5ff' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 8 }}>👶 הוסיפי ילד</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder="שם הילד *" id="quick_child_name" style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, textAlign: 'right', outline: 'none' }} />
                    <input placeholder="גיל" id="quick_child_age" type="number" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder='משקל (ק"ג)' id="quick_child_weight" type="number" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                    <input placeholder='גובה (ס"מ)' id="quick_child_height" type="number" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {['בן', 'בת'].map(g => (
                      <button key={g} id={'quick_gender_' + g} onClick={e => { document.querySelectorAll('[id^=quick_gender_]').forEach(b => { b.style.background = '#faf5ff'; b.style.color = '#7c3aed'; b.style.borderColor = '#e9d5ff' }); e.target.style.background = '#7c3aed'; e.target.style.color = '#fff'; e.target.style.borderColor = '#7c3aed' }} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, cursor: 'pointer', background: '#faf5ff', color: '#7c3aed', fontWeight: 700 }}>{g}</button>
                    ))}
                    <input placeholder="סיסמה (ברירת מחדל: כמו ההורה)" id="quick_child_password" style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e9d5ff', fontSize: 13, textAlign: 'right', outline: 'none' }} />
                  </div>
                  <button onClick={async () => {
                    const name = document.getElementById('quick_child_name').value
                    if (!name) { alert('שם הילד חובה'); return }
                    const age = document.getElementById('quick_child_age').value
                    const weight = document.getElementById('quick_child_weight').value
                    const height = document.getElementById('quick_child_height').value
                    const password = document.getElementById('quick_child_password').value || (selectedClient.password + '_child_' + Date.now().toString(36))
                    const genderBn = document.getElementById('quick_gender_בן')
                    const gender = genderBn && genderBn.style.background === 'rgb(124, 58, 237)' ? 'זכר' : 'נקבה'
                    await supabase.from('clients').insert({ name, age: age ? parseInt(age) : null, weight: weight ? parseFloat(weight) : null, height: height ? parseFloat(height) : null, gender, password, parent_id: selectedClient.id, is_child: true, created_at: new Date().toISOString() })
                    loadClients()
                    document.getElementById('quick_child_name').value = ''
                    document.getElementById('quick_child_age').value = ''
                    document.getElementById('quick_child_weight').value = ''
                    document.getElementById('quick_child_height').value = ''
                    document.getElementById('quick_child_password').value = ''
                    alert('✅ הילד נוסף!')
                  }} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>➕ הוסיפי ילד</button>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 18, padding: '12px 16px', marginBottom: 12, border: '1.5px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{selectedClient.name} {selectedClient.last_name || ''}</div>
                <button onClick={async () => {
                if (!window.confirm('למחוק את ' + selectedClient.name + '? פעולה זו לא ניתנת לביטול.')) return
                await supabase.from('daily_logs').delete().eq('client_name', selectedClient.password)
                await supabase.from('client_profiles').delete().eq('client_password', selectedClient.password)
                await supabase.from('clients').delete().eq('id', selectedClient.id)
                setSelectedClient(null)
                loadClients()
              }} style={{ padding: '8px 16px', borderRadius: 10, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🗑️ מחקי לקוח</button>
              </div>
              {/* עריכת נתוני לקוח */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <input type="text" placeholder="סיסמה" defaultValue={selectedClient.password || ''} key={selectedClient.id + '_pw'} onBlur={async e => { const v = e.target.value.trim(); if (v && v !== selectedClient.password) { await updateClientData('password', v); setSelectedClient(c => ({...c, password: v})) } }} style={{ flex: 2, minWidth: 100, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 13, textAlign: 'center', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="number" placeholder="גיל" value={selectedClient.age || ''} onChange={e => setSelectedClient(c => ({...c, age: e.target.value}))} onBlur={e => updateClientData('age', e.target.value ? parseInt(e.target.value) : null)} style={{ flex: 1, minWidth: 60, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                <input type="number" placeholder='משקל' value={selectedClient.weight || ''} onChange={e => setSelectedClient(c => ({...c, weight: e.target.value}))} onBlur={e => updateClientData('weight', e.target.value ? parseFloat(e.target.value) : null)} style={{ flex: 1, minWidth: 60, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                <input type="number" placeholder='גובה' value={selectedClient.height || ''} onChange={e => setSelectedClient(c => ({...c, height: e.target.value}))} onBlur={e => updateClientData('height', e.target.value ? parseFloat(e.target.value) : null)} style={{ flex: 1, minWidth: 60, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                <select value={selectedClient.gender || ''} onChange={async e => { await updateClientData('gender', e.target.value); setSelectedClient(c => ({...c, gender: e.target.value})) }} style={{ flex: 1, minWidth: 70, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 13, outline: 'none' }}>
                  <option value="">מגדר</option>
                  <option value="נקבה">נקבה</option>
                  <option value="זכר">זכר</option>
                  <option value="בן">בן</option>
                  <option value="בת">בת</option>
                </select>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 18, padding: '14px 18px', marginBottom: 16, border: '1.5px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a', marginBottom: 2 }}>🌿 מסמך פתיחה אישי</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {selectedClient.welcome_doc_enabled ? '✅ פעיל — הלקוחה יכולה לפתוח' : '🔒 כבוי — הכפתור אפור אצלה'}
                </div>
              </div>
              <button onClick={refreshWelcomeDoc} disabled={togglingDoc} style={{ padding: '10px 14px', borderRadius: 12, background: '#fff7ed', color: '#f97316', border: '1.5px solid #fed7aa', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🔄 רענן</button>
              <button onClick={() => setPreviewDoc(true)} style={{ padding: '10px 16px', borderRadius: 12, background: '#eff6ff', color: '#0284c7', border: '1.5px solid #93c5fd', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>👁️ תצוגה מקדימה</button>
              <button onClick={toggleWelcomeDoc} disabled={togglingDoc} style={{ padding: '10px 18px', borderRadius: 12, background: selectedClient.welcome_doc_enabled ? '#dcfce7' : '#f3f4f6', color: selectedClient.welcome_doc_enabled ? '#0f4c2a' : '#6b7280', border: '2px solid ' + (selectedClient.welcome_doc_enabled ? '#16a34a' : '#d1d5db'), cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {togglingDoc ? '⏳' : selectedClient.welcome_doc_enabled ? '✅ הפעיל' : '🔒 כבוי'}
              </button>
            </div>

            {/* טאבים מקובצים */}
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* קבוצה 1 — מעקב */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 4, paddingRight: 4 }}>📊 מעקב</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[{ k: 'logs', l: '📅 יומן' }, { k: 'report', l: '📊 דוח' }, { k: 'stage', l: '🏆 שלב' }].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'), background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: tab === t.k ? '#0f4c2a' : '#555', minWidth: 50 }}>{t.l}</button>
                  ))}
                </div>
              </div>

              {/* קבוצה 2 — פרופיל */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 4, paddingRight: 4 }}>📋 פרופיל</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[{ k: 'questionnaire', l: '📋 שאלון' }, { k: 'blood', l: '🩸 בדיקות' }, { k: 'nutrition', l: '🥗 תזונה' }, { k: 'doctor', l: '📄 מכתב' }].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'), background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: tab === t.k ? '#0f4c2a' : '#555', minWidth: 50 }}>{t.l}</button>
                  ))}
                </div>
              </div>

              {/* קבוצה 3 — מפגשים */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 4, paddingRight: 4 }}>🧠 מפגשים</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { k: 'ai', l: '🧠 AI' },
                    { k: 'journey', l: '🧭 מטרה' },
                    { k: 'roots', l: '🌱 שורשים' },
                    { k: 'body', l: '🩺 גוף מדבר' },
                    ...(selectedClient?.client_track === 'child' || selectedClient?.client_track === 'both' ? [{ k: 'child', l: '👨‍👩‍👧 הורה-ילד' }] : [])
                  ].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'), background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: tab === t.k ? '#0f4c2a' : '#555', minWidth: 50 }}>{t.l}</button>
                  ))}
                </div>
              </div>

              {/* קבוצה 4 — ניהול */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 4, paddingRight: 4 }}>⚙️ ניהול</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[{ k: 'pantry', l: '🛒 מזווה' }, { k: 'newclient', l: '➕ לקוח' }].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'), background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: tab === t.k ? '#0f4c2a' : '#555', minWidth: 50 }}>{t.l}</button>
                  ))}
                </div>
              </div>

            </div>

            {logDetails && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => { if(e.target === e.currentTarget) setLogDetails(null) }}>
                <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: 20, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', direction: 'rtl' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f4c2a' }}>🔍 פרטי יומן — {logDetails.log_date}</div>
                    <button onClick={() => setLogDetails(null)} style={{ padding: '6px 14px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕ סגרי</button>
                  </div>

                  {(() => {
                    const allIds = []
                    if (logDetails.checks) Object.keys(logDetails.checks).filter(id => logDetails.checks[id]).forEach(id => allIds.push(id))
                    if (logDetails.prot_checks) Object.keys(logDetails.prot_checks).filter(id => logDetails.prot_checks[id]).forEach(id => allIds.push(id))
                    if (logDetails.carb_sel) allIds.push(logDetails.carb_sel)
                    if (logDetails.fat_sel) allIds.push(logDetails.fat_sel)
                    if (logDetails.veggie_sel) allIds.push(logDetails.veggie_sel)
                    if (logDetails.benayim_sel) allIds.push(logDetails.benayim_sel)
                    if (!allIds.length) return null
                    return (
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8 }}>✅ פריטים שסומנו</div>
                        {allIds.map((id, i) => {
                          const item = nutritionData[id]
                          return (
                            <div key={id + i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <span style={{ color: '#9ca3af', fontSize: 11 }}>{item ? Math.round(item.calories) + ' קל | ' + Math.round(item.protein||0) + 'g חלבון | ' + Math.round(item.fat||0) + 'g שומן | ' + Math.round(item.carbs||0) + 'g פחמימה' : 'אין נתונים'}</span>
                              <span style={{ fontWeight: 600 }}>{item ? item.name : id}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f4c2a', marginBottom: 10 }}>✏️ עריכה</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>💧 מים (ליטר)</div>
                        <input type="number" step="0.1" value={logDetails.water || ''} onChange={e => setLogDetails(d => ({...d, water: parseFloat(e.target.value)||0}))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>🚶 צעדים</div>
                        <input type="number" value={logDetails.steps || ''} onChange={e => setLogDetails(d => ({...d, steps: parseInt(e.target.value)||0}))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>⚡ קלוריות נוספות (אחר)</div>
                        <input type="number" value={logDetails.boker_extra_cal || ''} onChange={e => setLogDetails(d => ({...d, boker_extra_cal: parseInt(e.target.value)||0}))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>💪 חלבון נוסף (g)</div>
                        <input type="number" value={logDetails.boker_extra_prot || ''} onChange={e => setLogDetails(d => ({...d, boker_extra_prot: parseInt(e.target.value)||0}))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>📝 פרטים נוספים (אחר)</div>
                      <textarea value={logDetails.boker_free || ''} onChange={e => setLogDetails(d => ({...d, boker_free: e.target.value}))} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box', resize: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>💬 הערה ליומן</div>
                      <textarea value={logDetails.note || ''} onChange={e => setLogDetails(d => ({...d, note: e.target.value}))} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box', resize: 'none' }} />
                    </div>
                  </div>

                  <button onClick={async () => {
                    setSavingLogEdit(true)
                    await supabase.from('daily_logs').update({
                      water: logDetails.water,
                      steps: logDetails.steps,
                      boker_extra_cal: logDetails.boker_extra_cal || 0,
                      boker_extra_prot: logDetails.boker_extra_prot || 0,
                      boker_free: logDetails.boker_free || '',
                      note: logDetails.note || ''
                    }).eq('id', logDetails.id)
                    const { data } = await supabase.from('daily_logs').select('*').eq('client_name', selectedClient.password).order('log_date', { ascending: false }).limit(30)
                    setLogs(data || [])
                    setSavingLogEdit(false)
                    setLogDetails(null)
                  }} disabled={savingLogEdit} style={{ width: '100%', padding: 14, borderRadius: 12, background: savingLogEdit ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                    {savingLogEdit ? '⏳ שומר...' : '💾 שמרי שינויים'}
                  </button>
                </div>
              </div>
            )}


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
                          <button onClick={() => setLogDetails({...log})} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', fontWeight: 700 }}>🔍 פרטים</button>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <MacroPieChart actual={nut} target={targets} />
                        <NutritionBar label="קלוריות" value={nut.calories} max={targets ? targets.calories : 2000} color="#f97316" />
                        <NutritionBar label="חלבון (g)" value={nut.protein} max={targets ? targets.protein : 100} color="#16a34a" />
                        <NutritionBar label="שומן (g)" value={nut.fat} max={targets ? targets.fat : 70} color="#9333ea" />
                        {log.note && <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: 10, fontSize: 13, color: '#78350f', marginTop: 8 }}>💬 {log.note}</div>}
                        <textarea value={feedback[log.id] != null ? feedback[log.id] : (log.trainer_feedback || '')} onChange={e => setFeedback(f => ({ ...f, [log.id]: e.target.value }))} placeholder="כתבי משוב..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 10 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={async () => {
                            await saveFeedback(log)
                            openWhatsApp(log)
                          }} style={{ flex: 1, padding: 10, borderRadius: 10, background: savingFeedback === log.id ? '#9ca3af' : sentFeedback === log.id ? '#16a34a' : '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            {savingFeedback === log.id ? '⏳ שומר...' : sentFeedback === log.id ? '✅ נשלח בוואטסאפ!' : '📱 שלחי משוב בוואטסאפ'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredLogs.length > 0 && (
                  <button onClick={() => runLogsAnalysis(filteredLogs[0])} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                    {aiLoading ? '⏳ מנתח...' : '🤖 הפק דוח ביצועים עם AI'}
                  </button>
                )}
                {dailyEditing && dailyPreview && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #16a34a', overflow: 'hidden', marginTop: 12 }}>
                    <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/logo.png" alt="לוגו" style={{ height: 36, width: 36, borderRadius: 99, objectFit: 'cover', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>👁️ תצוגה מקדימה</div>
                          <div style={{ fontSize: 11, color: '#86efac' }}>ערכי ואז אשרי לשליחה</div>
                        </div>
                      </div>
                      <button onClick={() => { setDailyEditing(false); setDailyPreview(''); setDailyTargetLog(null) }} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ סגרי</button>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={dailyPreview} onChange={e => setDailyPreview(e.target.value)} rows={14} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={() => { setDailyEditing(false); setDailyPreview(''); setDailyTargetLog(null) }} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ ביטול</button>
                      <button onClick={sendDailyFeedback} disabled={sendingDaily} style={{ flex: 2, padding: 12, borderRadius: 10, background: sendingDaily ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {sendingDaily ? '⏳ שולח...' : '✅ אשרי ושלחי ללקוח/ה'}
                      </button>
                    </div>
                  </div>
                )}
                {sentDaily && <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 12, padding: '12px 16px', marginTop: 8, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>✅ הדוח נשלח!</div>}
              </div>
            )}


            {tab === 'doctor' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => setTab('logs')} style={{ padding: '8px 18px', borderRadius: 10, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ סגרי</button>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <img src="/logo.png" alt="אתי אטל" style={{ height: 80, objectFit: 'contain' }} />
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#0f4c2a', marginTop: 6 }}>אתי אטל</div>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>יועצת בריאות ותזונה התנהגותית</div>
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
              </div>
            )}

            {tab === 'questionnaire' && (
              <>
                {selectedClient?.is_child ? (
                  <>
                    <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 14, padding: '12px 16px', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>👶 שאלון 360 — {selectedClient.name}</div>
                      <div style={{ fontSize: 12, color: '#e9d5ff', marginTop: 2 }}>שאלון מותאם לילד — נפרד מהורה</div>
                    </div>
                    <QSection title="הילד — פרטים ובריאות" icon="👦">
                      <Field label="גיל" value={profile.child_age} onChange={v => updateProfile('child_age', v)} type="number" />
                      <Field label="מה אוכל / מה מסרב?" value={profile.child_eating} onChange={v => updateProfile('child_eating', v)} rows={3} />
                      <Field label="מתי אוכל הכי הרבה ולמה?" value={profile.child_eating_when} onChange={v => updateProfile('child_eating_when', v)} rows={2} />
                      <Field label="כאבי בטן / תחושות גוף?" value={profile.body_stomach} onChange={v => updateProfile('body_stomach', v)} rows={2} />
                      <Field label="שינה — איכות ושעות?" value={profile.sleep_quality} onChange={v => updateProfile('sleep_quality', v)} rows={2} />
                      <Field label="תרופות / אלרגיות?" value={profile.medications} onChange={v => updateProfile('medications', v)} rows={2} />
                    </QSection>
                    <QSection title="הסטייט אוף מיינד" icon="🧠">
                      <Field label="מצב רוח בסיסי" value={profile.child_mood} onChange={v => updateProfile('child_mood', v)} rows={2} />
                      <Field label="מה מלחיץ / מציף אותו?" value={profile.child_stress} onChange={v => updateProfile('child_stress', v)} rows={2} />
                      <Field label="מה עוזר לו להירגע?" value={profile.child_calm} onChange={v => updateProfile('child_calm', v)} rows={2} />
                      <Field label="חרדה / קושי חברתי?" value={profile.child_anxiety} onChange={v => updateProfile('child_anxiety', v)} rows={2} />
                      <Field label="האם אוכל = מקום בטוח?" value={profile.child_food_comfort} onChange={v => updateProfile('child_food_comfort', v)} rows={2} />
                    </QSection>
                    <QSection title="דינמיקה משפחתית" icon="🏠">
                      <Field label="אווירה בבית" value={profile.family_atmosphere} onChange={v => updateProfile('family_atmosphere', v)} rows={2} />
                      <Field label="אחים — אותם חוקים?" value={profile.siblings_rules} onChange={v => updateProfile('siblings_rules', v)} rows={2} />
                      <Field label="מי האדם הבטוח?" value={profile.child_safe_person} onChange={v => updateProfile('child_safe_person', v)} rows={1} />
                      <Field label="ארוחות משותפות — אווירה?" value={profile.family_meals_vibe} onChange={v => updateProfile('family_meals_vibe', v)} rows={2} />
                    </QSection>
                    <QSection title="ההורה כמודל" icon="👁️">
                      <Field label="מה הילד רואה את ההורה אוכל?" value={profile.parent_food_model} onChange={v => updateProfile('parent_food_model', v)} rows={2} />
                      <Field label="האם ההורים עושים ספורט?" value={profile.parent_sport} onChange={v => updateProfile('parent_sport', v)} rows={1} />
                      <Field label="כמה ג׳אנק / מזון מעובד בבית?" value={profile.home_junk} onChange={v => updateProfile('home_junk', v)} rows={2} />
                      <Field label="הבדלים בין אחים?" value={profile.siblings_food_diff} onChange={v => updateProfile('siblings_food_diff', v)} rows={2} />
                    </QSection>
                    <QSection title="טריגרים וחברתי" icon="⚡">
                      <Field label="עם מי נוח לו לאכול?" value={profile.child_eat_with} onChange={v => updateProfile('child_eat_with', v)} rows={2} />
                      <Field label="בבופה / אירועים — מה קורה?" value={profile.child_social_eating} onChange={v => updateProfile('child_social_eating', v)} rows={2} />
                      <Field label="יש חבר בטוח?" value={profile.child_friend} onChange={v => updateProfile('child_friend', v)} rows={2} />
                      <Field label="לפני שינה — מאריך / אוכל?" value={profile.child_bedtime} onChange={v => updateProfile('child_bedtime', v)} rows={2} />
                      <Field label="מסך + אכילה?" value={profile.child_screen_eat} onChange={v => updateProfile('child_screen_eat', v)} rows={2} />
                    </QSection>
                    <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 14, marginTop: 4, background: saved ? '#16a34a' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                      {saving ? '⏳ שומר...' : saved ? '✅ נשמר!' : '💾 שמרי פרופיל ילד'}
                    </button>
                  </>
                ) : (
                <>
                <QSection title="פרטים כלליים ורפואיים" icon="👤">
                  <Field label="איכות שינה" value={profile.sleep_quality} onChange={v => updateProfile('sleep_quality', v)} rows={2} />
                  <Field label="בעיות שינה" value={profile.sleep_issues} onChange={v => updateProfile('sleep_issues', v)} rows={2} />
                  <Field label="שעת קימה" value={profile.wake_time} onChange={v => updateProfile('wake_time', v)} />
                  <Field label="שעת שינה" value={profile.sleep_time} onChange={v => updateProfile('sleep_time', v)} />
                  <Field label="פעילות מעיים" value={profile.digestion} onChange={v => updateProfile('digestion', v)} rows={2} />
                  <Field label="מעשן/ת?" value={profile.smoking} onChange={v => updateProfile('smoking', v)} type="boolean" />
                  <Field label="מחזור חודשי" value={profile.menstrual_cycle} onChange={v => updateProfile('menstrual_cycle', v)} rows={1} />
                  <Field label="תרופות / תוספים" value={profile.medications} onChange={v => updateProfile('medications', v)} rows={2} />
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
                  <Field label="מבשל/ת בבית?" value={profile.cooks_at_home} onChange={v => updateProfile('cooks_at_home', v)} type="boolean" />
                </QSection>
                <QSection title="אורח חיים ורגש" icon="🧠">
                  <Field label="כמות מים ביום" value={profile.water_intake} onChange={v => updateProfile('water_intake', v)} />
                  <Field label="קפה ביום" value={profile.coffee_intake} onChange={v => updateProfile('coffee_intake', v)} />
                  <Field label="אכילה רגשית" value={profile.emotional_eating} onChange={v => updateProfile('emotional_eating', v)} rows={2} />
                  <Field label="רמת לחץ (1-10)" value={profile.stress_level} onChange={v => updateProfile('stress_level', parseInt(v))} type="number" />
                  <Field label="רמת אנרגיה (1-10)" value={profile.energy_level} onChange={v => updateProfile('energy_level', parseInt(v))} type="number" />
                </QSection>
                <QSection title="פעילות גופנית" icon="🏃">
                  <Field label="סוג פעילות ותדירות" value={profile.exercise_type} onChange={v => updateProfile('exercise_type', v)} rows={2} />
                  <Field label="כאבים" value={profile.pain_issues} onChange={v => updateProfile('pain_issues', v)} rows={2} />
                </QSection>
                <QSection title="הסביבה הביתית" icon="🏠">
                  <Field label="מה תמיד נמצא על השיש / בהישג יד?" value={profile.home_counter} onChange={v => updateProfile('home_counter', v)} rows={2} />
                  <Field label="מי קונה את האוכל בבית ולפי מה?" value={profile.home_shopping} onChange={v => updateProfile('home_shopping', v)} rows={2} />
                  <Field label="מה אף פעם לא נכנס הביתה?" value={profile.home_never} onChange={v => updateProfile('home_never', v)} rows={2} />
                  <Field label="איך נראה המקרר בדרך כלל?" value={profile.home_fridge} onChange={v => updateProfile('home_fridge', v)} rows={2} />
                  <Field label="ילדים בבית? גילאים?" value={profile.home_children} onChange={v => updateProfile('home_children', v)} />
                  <Field label="ארוחות משותפות — כמה פעמים בשבוע?" value={profile.home_family_meals} onChange={v => updateProfile('home_family_meals', v)} />
                </QSection>
                <QSection title="הגוף מדבר" icon="🩺">
                  <Field label="כאבי בטן חוזרים? מתי מופיעים?" value={profile.body_stomach} onChange={v => updateProfile('body_stomach', v)} rows={2} />
                  <Field label="תחושות אחרי אכילה (נפיחות / עייפות / בחילה)?" value={profile.body_after_eating} onChange={v => updateProfile('body_after_eating', v)} rows={2} />
                  <Field label="קשר בין מזון מסוים לתחושה גרועה?" value={profile.body_food_link} onChange={v => updateProfile('body_food_link', v)} rows={2} />
                  <Field label="כאבי ראש חוזרים? תדירות?" value={profile.body_headaches} onChange={v => updateProfile('body_headaches', v)} />
                  <Field label="עייפות לאחר ארוחות?" value={profile.body_fatigue} onChange={v => updateProfile('body_fatigue', v)} rows={2} />
                </QSection>
                <QSection title="מטרות ו-NLP" icon="🎯">
                  <Field label="מה רוצה להשיג?" value={profile.main_goal} onChange={v => updateProfile('main_goal', v)} rows={3} />
                  <Field label="מה מעכב?" value={profile.goal_obstacles} onChange={v => updateProfile('goal_obstacles', v)} rows={2} />
                  <Field label="איך תיראה ההצלחה?" value={profile.success_vision} onChange={v => updateProfile('success_vision', v)} rows={3} />
                  <Field label="מה חשוב לך?" value={profile.important_values} onChange={v => updateProfile('important_values', v)} rows={2} />
                </QSection>


                <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 14, marginTop: 4, background: saved ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                  {saving ? '⏳ שומר...' : saved ? '✅ נשמר!' : '💾 שמרי פרופיל'}
                </button>
                </>
                )}
              </>
            )}

            {tab === 'blood' && (
              <>
                {selectedClient?.is_child ? (
                  <>
                    <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 14, padding: '12px 16px', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>🩸 בדיקות דם — {selectedClient.name}</div>
                      <div style={{ fontSize: 12, color: '#e9d5ff', marginTop: 2 }}>פרופיל בדיקות מותאם לילדים</div>
                    </div>

                    {/* סריקה */}
                    <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #e9d5ff' }}>
                      <div style={{ fontWeight: 700, marginBottom: 10, color: '#7c3aed' }}>📸 סריקת בדיקות דם עם AI</div>
                      <input type="file" accept="image/*" onChange={e => e.target.files[0] && scanBloodTests(e.target.files[0])} style={{ display: 'none' }} id="scan-input-child" />
                      <label htmlFor="scan-input-child" style={{ display: 'block', padding: 12, borderRadius: 10, background: '#faf5ff', border: '2px dashed #7c3aed', textAlign: 'center', cursor: 'pointer', fontWeight: 700, color: '#7c3aed' }}>
                        {scanLoading ? '⏳ סורק...' : '📸 העלי תמונה של בדיקות דם'}
                      </label>
                    </div>

                    {/* בדיקות לפי קטגוריות */}
                    {[
                      { title: '🍬 פרופיל סוכר', color: '#d97706', bg: '#fffbeb', tests: [
                        { key: 'glucose', label: 'גלוקוז בצום', normal: '70-100 mg/dL' },
                        { key: 'hba1c', label: 'HbA1c', normal: 'מתחת ל-5.7%' },
                        { key: 'insulin', label: 'אינסולין', normal: '2-20 מיקרויחידות/מL' },
                      ]},
                      { title: '🫀 פרופיל שומנים', color: '#e53e3e', bg: '#fff5f5', tests: [
                        { key: 'cholesterol', label: 'כולסטרול כללי', normal: 'מתחת ל-170 mg/dL' },
                        { key: 'ldl', label: 'LDL (רע)', normal: 'מתחת ל-110 mg/dL' },
                        { key: 'hdl', label: 'HDL (טוב)', normal: 'מעל 40 mg/dL' },
                        { key: 'triglycerides', label: 'טריגליצרידים', normal: 'מתחת ל-150 mg/dL' },
                      ]},
                      { title: '🫀 תפקודי כבד וכליות', color: '#0d9488', bg: '#f0fdfa', tests: [
                        { key: 'alt', label: 'ALT (כבד)', normal: '7-40 U/L' },
                        { key: 'ast', label: 'AST (כבד)', normal: '10-40 U/L' },
                        { key: 'creatinine', label: 'קריאטינין (כליות)', normal: '0.5-1.0 mg/dL' },
                      ]},
                      { title: '⚖️ איזון הורמונלי', color: '#7c3aed', bg: '#faf5ff', tests: [
                        { key: 'tsh', label: 'TSH (בלוטת התריס)', normal: '0.5-4.5 mIU/L' },
                      ]},
                      { title: '💊 מדדי חסר', color: '#2563eb', bg: '#eff6ff', tests: [
                        { key: 'vitamin_d', label: 'ויטמין D', normal: '30-100 ng/mL' },
                        { key: 'iron', label: 'ברזל', normal: '50-120 mcg/dL' },
                        { key: 'ferritin', label: 'פריטין', normal: '15-120 ng/mL' },
                        { key: 'vitamin_b12', label: 'ויטמין B12', normal: '200-900 pg/mL' },
                        { key: 'folic_acid', label: 'חומצה פולית', normal: '4-20 ng/mL' },
                      ]},
                      { title: '🔬 מדדים כלליים', color: '#6b7280', bg: '#f9fafb', tests: [
                        { key: 'wbc', label: 'WBC (ספירת דם לבנה)', normal: '4,500-11,000' },
                        { key: 'hemoglobin', label: 'המוגלובין', normal: 'ילד: 11.5-13.5 | ילדה: 11.5-13.5 g/dL' },
                        { key: 'rbc', label: 'RBC (כדוריות דם אדומות)', normal: '3.8-5.2 מיליון' },
                        { key: 'platelets', label: 'טסיות', normal: '150,000-400,000' },
                      ]},
                    ].map(({ title, color, bg, tests }) => (
                      <div key={title} style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 12, paddingBottom: 8, borderBottom: '1.5px solid ' + bg }}>{title}</div>
                        {tests.map(({ key, label, normal }) => (
                          <div key={key} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 600 }}>{label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({normal})</span></div>
                            <input type="number" step="0.01" value={(profile.blood_tests || {})[key] || ''} onChange={async e => {
                              const newBlood = { ...(profile.blood_tests || {}), [key]: e.target.value }
                              setProfile(p => ({ ...p, blood_tests: newBlood }))
                              await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, blood_tests: newBlood, updated_at: new Date().toISOString() }, { onConflict: 'client_password' })
                            }} placeholder="הזיני ערך..." style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                          </div>
                        ))}
                      </div>
                    ))}

                    <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #e9d5ff' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, color: '#7c3aed' }}>⚠️ ערכים חריגים נוספים</div>
                      <textarea value={extraBloodNotes} onChange={e => setExtraBloodNotes(e.target.value)} onBlur={async e => { if (selectedClient) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, extra_blood_notes: e.target.value, updated_at: new Date().toISOString() }, { onConflict: 'client_password' }) }} placeholder="ערכים חריגים נוספים..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  </>
                ) : (
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
                  <textarea value={bloodText} onChange={e => setBloodText(e.target.value)} placeholder="הדביקי כאן את תוצאות הבדיקות..." rows={5} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginBottom: 8 }} />
                  <button onClick={extractBloodFromText} disabled={bloodScanLoading || !bloodText.trim()} style={{ width: '100%', padding: 12, borderRadius: 10, background: bloodScanLoading ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                    {bloodScanLoading ? '⏳ מחלץ ערכים...' : '🤖 חלצי ערכים אוטומטית'}
                  </button>
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ ערכים חריגים נוספים</div>
                  <textarea value={extraBloodNotes} onChange={e => setExtraBloodNotes(e.target.value)} onBlur={async e => { if (selectedClient) await supabase.from('client_profiles').upsert({ client_password: selectedClient.password, extra_blood_notes: e.target.value, updated_at: new Date().toISOString() }, { onConflict: 'client_password' }) }} placeholder="לדוגמה: IgG 2328 (גבוה)..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🩸 ערכי בדיקות דם</div>
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
                  {selectedClient?.is_child ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#7c3aed' }}>👶 ניתוח AI — {selectedClient.name}</div>
                      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>משלב: שאלון ילד + בדיקות דם + דינמיקה משפחתית</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🧠 ניתוח AI מקיף</div>
                      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>משלב: שאלון 360 + בדיקות דם + NLP + ימי אכילה</div>
                      <textarea value={foodDiary} onChange={e => setFoodDiary(e.target.value)} placeholder='3 ימי אכילה אופייניים...' rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, marginBottom: 12 }} />
                    </>
                  )}
                  <button onClick={runProfileAnalysis} disabled={aiLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: aiLoading ? '#9ca3af' : selectedClient?.is_child ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: aiLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: 16 }}>
                    {aiLoading ? '⏳ מנתחת... (עד דקה)' : selectedClient?.is_child ? '👶 הפעילי ניתוח לילד' : '🧠 הפעילי ניתוח מקיף'}
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
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#0f4c2a' }}>📊 הדוח השמור</div>
                {editableAnalysis ? (
                  <>
                    <textarea value={editableAnalysis} onChange={e => setEditableAnalysis(e.target.value)} rows={20} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => window.open('/report?client=' + selectedClient.password + '&preview=true', '_blank')} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>👁️ תצוגה מקדימה</button>
                      <button onClick={sendAnalysisToClient} disabled={sendingToClient} style={{ flex: 2, padding: 14, borderRadius: 12, background: sentToClient ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        {sendingToClient ? '⏳ שולחת...' : sentToClient ? '✅ נשמר!' : '📤 שמרי ואשרי'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
                    <div>עדיין לא הופק ניתוח AI</div>
                    <button onClick={() => setTab('ai')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>עברי לטאב AI</button>
                  </div>
                )}
              </div>
            )}

            {tab === 'newclient' && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>➕ הוספת לקוח/ה חדש/ה</div>
                {clientAdded && <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontWeight: 700 }}>{clientAdded}</div>}

                {/* בחירת מסלול */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 8, fontWeight: 700 }}>🎯 התהליך הוא עבור:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { k: 'self', l: '👤 עבור עצמו/ה בלבד', desc: 'תהליך אישי — ללא ילדים או עם ילדים ללא בעיית משקל' },
                      { k: 'child', l: '👶 עבור הילד בלבד', desc: 'ההורה עובר תהליך כדי לשנות את הבית עבור הילד' },
                      { k: 'both', l: '👨‍👩‍👧 שניהם — הורה + ילד', desc: 'תהליך אישי + פרופיל ילד מקושר' },
                    ].map(t => (
                      <button key={t.k} onClick={() => setClientTrack(t.k)} style={{ padding: '12px 16px', borderRadius: 12, border: '2px solid ' + (clientTrack === t.k ? '#0f4c2a' : '#e5e7eb'), background: clientTrack === t.k ? '#dcfce7' : '#fafafa', cursor: 'pointer', textAlign: 'right', transition: 'all 0.15s' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: clientTrack === t.k ? '#0f4c2a' : '#333' }}>{t.l}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* פרטי לקוח */}
                {clientTrack && (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f4c2a', marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #e5e7eb' }}>
                      {clientTrack === 'child' ? '👤 פרטי ההורה' : '👤 פרטי הלקוח/ה'}
                    </div>
                    <Field label="שם פרטי *" value={newClient.name} onChange={v => setNewClient(c => ({...c, name: v}))} />
                    <Field label="שם משפחה" value={newClient.last_name} onChange={v => setNewClient(c => ({...c, last_name: v}))} />
                    <Field label="סיסמה *" value={newClient.password} onChange={v => setNewClient(c => ({...c, password: v}))} />
                    <Field label="טלפון" value={newClient.phone} onChange={v => setNewClient(c => ({...c, phone: v}))} />
                    <Field label="תעודת זהות" value={newClient.id_number} onChange={v => setNewClient(c => ({...c, id_number: v}))} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}><Field label="גיל" value={newClient.age} onChange={v => setNewClient(c => ({...c, age: v}))} type="number" /></div>
                      <div style={{ flex: 1 }}><Field label='משקל (ק"ג)' value={newClient.weight} onChange={v => setNewClient(c => ({...c, weight: v}))} type="number" /></div>
                      <div style={{ flex: 1 }}><Field label='גובה (ס"מ)' value={newClient.height} onChange={v => setNewClient(c => ({...c, height: v}))} type="number" /></div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מגדר</div>
                      <div style={{ display: 'flex', gap: 8 }}>{['נקבה', 'זכר'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, gender: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.gender === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.gender === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: newClient.gender === g ? '#0f4c2a' : '#555' }}>{g}</button>)}</div>
                    </div>
                    {clientTrack !== 'child' && (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['ירידה במשקל', 'שמירה על משקל', 'עלייה במסה'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, goal: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (newClient.goal === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.goal === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.goal === g ? '#0f4c2a' : '#555', minWidth: 100 }}>{g}</button>)}</div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל'].map(g => <button key={g} onClick={() => setNewClient(c => ({...c, activity: g}))} style={{ padding: '6px 10px', borderRadius: 10, border: '2px solid ' + (newClient.activity === g ? '#0f4c2a' : '#e5e7eb'), background: newClient.activity === g ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: newClient.activity === g ? '#0f4c2a' : '#555' }}>{g}</button>)}</div>
                        </div>
                      </>
                    )}

                    {/* פרטי ילד */}
                    {(clientTrack === 'child' || clientTrack === 'both') && (
                      <div style={{ background: '#faf5ff', borderRadius: 14, padding: 16, marginBottom: 16, border: '1.5px solid #e9d5ff' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed', marginBottom: 10 }}>👶 פרטי הילד</div>
                        <Field label="שם הילד *" value={childData.name} onChange={v => setChildData(c => ({...c, name: v}))} />
                        <Field label="סיסמה (אופציונלי — ברירת מחדל: סיסמת ההורה)" value={childData.password} onChange={v => setChildData(c => ({...c, password: v}))} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}><Field label="גיל" value={childData.age} onChange={v => setChildData(c => ({...c, age: v}))} type="number" /></div>
                          <div style={{ flex: 1 }}><Field label='משקל (ק"ג)' value={childData.weight} onChange={v => setChildData(c => ({...c, weight: v}))} type="number" /></div>
                          <div style={{ flex: 1 }}><Field label='גובה (ס"מ)' value={childData.height} onChange={v => setChildData(c => ({...c, height: v}))} type="number" /></div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 600 }}>מגדר</div>
                          <div style={{ display: 'flex', gap: 8 }}>{['בן', 'בת'].map(g => <button key={g} onClick={() => setChildData(c => ({...c, gender: g}))} style={{ flex: 1, padding: 8, borderRadius: 10, border: '2px solid ' + (childData.gender === g ? '#7c3aed' : '#e5e7eb'), background: childData.gender === g ? '#faf5ff' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: childData.gender === g ? '#7c3aed' : '#555' }}>{g}</button>)}</div>
                        </div>
                      </div>
                    )}

                    <button onClick={async () => {
                      if (!newClient.name || !newClient.password) { alert('שם וסיסמה הם שדות חובה'); return }
                      if ((clientTrack === 'child' || clientTrack === 'both') && !childData.name) { alert('שם הילד הוא שדה חובה'); return }
                      setAddingClient(true)
                      try {
                        const { data: parentData, error } = await supabase.from('clients').insert({
                          name: newClient.name, last_name: newClient.last_name, password: newClient.password,
                          phone: newClient.phone, id_number: newClient.id_number || null,
                          age: newClient.age ? parseInt(newClient.age) : null,
                          weight: newClient.weight ? parseFloat(newClient.weight) : null,
                          height: newClient.height ? parseFloat(newClient.height) : null,
                          goal: newClient.goal || 'ירידה במשקל', activity: newClient.activity, gender: newClient.gender,
                          client_track: clientTrack,
                          created_at: new Date().toISOString()
                        }).select().single()
                        if (error) throw error

                        // הוסף ילד אם צריך
                        if ((clientTrack === 'child' || clientTrack === 'both') && childData.name) {
                          await supabase.from('clients').insert({
                            name: childData.name, password: childData.password || newClient.password,
                            age: childData.age ? parseInt(childData.age) : null,
                            weight: childData.weight ? parseFloat(childData.weight) : null,
                            height: childData.height ? parseFloat(childData.height) : null,
                            gender: childData.gender,
                            parent_id: parentData.id,
                            is_child: true,
                            created_at: new Date().toISOString()
                          })
                        }

                        setClientAdded('✅ ' + newClient.name + ' נוסף/ה בהצלחה!' + ((clientTrack === 'child' || clientTrack === 'both') && childData.name ? ' + ילד: ' + childData.name : ''))
                        setNewClient({ name: '', last_name: '', password: '', phone: '', id_number: '', age: '', weight: '', height: '', goal: '', activity: '', gender: '' })
                        setChildData({ name: '', age: '', weight: '', height: '', gender: '', password: '' })
                        setClientTrack('')
                        loadClients()
                      } catch(e) { alert('שגיאה: ' + e.message) }
                      setAddingClient(false)
                    }} disabled={addingClient || !clientTrack} style={{ width: '100%', padding: 14, borderRadius: 12, background: addingClient ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
                      {addingClient ? '⏳ מוסיף/ה...' : '➕ הוסיפי לקוח/ה'}
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === 'pantry' && (
              <div>

                {/* ✅ צ׳קליסט ביקור בית */}
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '2px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setVisitOpen(v => !v)}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f4c2a' }}>🏠 צ׳קליסט ביקור בית — {selectedClient?.name}</div>
                    <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{visitOpen ? '▲ סגרי' : '▼ פתחי'}</span>
                  </div>
                  {!visitOpen && Object.keys(visitFindings).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                      {Object.values(visitFindings).filter(v => v === 'red').length} להוציא · {Object.values(visitFindings).filter(v => v === 'green').length} מצוין
                    </div>
                  )}
                  {visitOpen && (
                    <div style={{ marginTop: 14 }}>
                      {VISIT_CHECKLIST.map(section => (
                        <div key={section.section} style={{ marginBottom: 16 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottom: '1.5px solid #f3f4f6' }}>{section.section}</div>
                          {section.items.map(item => {
                            const status = visitFindings[item.id] || null
                            return (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                                <div style={{ fontSize: 13, color: status ? VISIT_STATUS[status]?.border : '#374151', fontWeight: status ? 700 : 400 }}>{item.label}</div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {Object.entries(VISIT_STATUS).map(([s, v]) => (
                                    <button key={s} onClick={() => setVisitFindings(f => ({ ...f, [item.id]: f[item.id] === s ? null : s }))}
                                      style={{ width: 34, height: 28, borderRadius: 8, border: '1.5px solid ' + (status === s ? v.border : '#e5e7eb'), background: status === s ? v.bg : '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>
                                      {v.emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                      <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)}
                        placeholder="הערות חופשיות מהביקור — סביבה, הרגלים, מה ראית..." rows={3}
                        style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', textAlign: 'right', lineHeight: 1.6 }} />
                      <button onClick={() => {
                        const lines = ['📋 סיכום ביקור בית — ' + selectedClient?.name + ':\n']
                        VISIT_CHECKLIST.forEach(section => {
                          const reds = section.items.filter(i => visitFindings[i.id] === 'red').map(i => i.label)
                          const yellows = section.items.filter(i => visitFindings[i.id] === 'yellow').map(i => i.label)
                          const greens = section.items.filter(i => visitFindings[i.id] === 'green').map(i => i.label)
                          if (reds.length || yellows.length || greens.length) {
                            lines.push(section.section)
                            if (reds.length) lines.push('🔴 להוציא: ' + reds.join(', '))
                            if (yellows.length) lines.push('🟡 לאזן: ' + yellows.join(', '))
                            if (greens.length) lines.push('✅ מצוין: ' + greens.join(', '))
                            lines.push('')
                          }
                        })
                        if (visitNotes.trim()) lines.push('📝 הערות: ' + visitNotes.trim())
                        const summary = lines.join('\n')
                        setSelectedClient(prev => ({ ...prev, pantry_notes: summary }))
                        updateClientData('pantry_notes', summary)
                        setVisitOpen(false)
                      }} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 10, background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
                        💾 סכמי וסגרי ← שמרי להנחיות מזווה
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#0f4c2a' }}>🎥 וידאו אישי למטופלת</div>
                  <input value={selectedClient.video_url || ''} onChange={e => setSelectedClient(prev => ({ ...prev, video_url: e.target.value }))} onBlur={e => updateClientData('video_url', e.target.value)} placeholder="קישור YouTube או Vimeo..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                  {selectedClient.video_url && <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden' }}><iframe src={selectedClient.video_url.replace('watch?v=', 'embed/')} width="100%" height="200" frameBorder="0" allowFullScreen style={{ borderRadius: 12, display: 'block' }} /></div>}
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#0f4c2a' }}>📝 הנחיות מזווה</div>
                  <textarea value={selectedClient.pantry_notes || ''} onChange={e => setSelectedClient(prev => ({ ...prev, pantry_notes: e.target.value }))} onBlur={e => updateClientData('pantry_notes', e.target.value)} placeholder="כתבי הנחיות מזווה אישיות..." style={{ width: '100%', height: 200, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7 }} />
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: '#0f4c2a' }}>🛒 ניהול מלאי וקניות</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItemToInventory()} placeholder="שם המוצר" style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    <button onClick={addItemToInventory} disabled={addingItem || !newItemName.trim()} style={{ padding: '10px 18px', borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{addingItem ? '⏳' : '+ הוסיפי'}</button>
                  </div>
                  {inventory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>עדיין אין פריטים</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

            {tab === 'journey' && (
              <div style={{ direction: 'rtl' }}>

                {/* ── ✅ פאנל הנחיות Agent — בראש הטאב ── */}
                <div style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 16, border: '2px solid #4a9b8e' }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#3a7a6e', marginBottom: 4 }}>
                    🤖 הנחיות Agent — {selectedClient?.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                    מה שכתוב כאן נשלח לכל שיחה עם ה-Agent. עדכני אם המצב הרפואי משתנה.
                  </div>
                  <textarea
                    value={agentInstructions}
                    onChange={e => setAgentInstructions(e.target.value)}
                    rows={8}
                    placeholder="לחצי על 'צרי אוטומטית' כדי לזקק מהדוחות..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif', direction: 'rtl' }}
                  />
                  {selectedClient?.agent_instructions_updated_at && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'left' }}>
                      עודכן: {new Date(selectedClient.agent_instructions_updated_at).toLocaleDateString('he-IL')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={generateAgentInstructions}
                      disabled={generatingInstructions}
                      style={{ flex: 2, padding: 12, borderRadius: 12, background: generatingInstructions ? '#9ca3af' : 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', color: '#fff', border: 'none', cursor: generatingInstructions ? 'default' : 'pointer', fontWeight: 700, fontSize: 13 }}
                    >
                      {generatingInstructions ? '⏳ מזקק מהדוחות...' : '🤖 צרי אוטומטית מהדוחות'}
                    </button>
                    <button
                      onClick={saveAgentInstructions}
                      style={{ flex: 1, padding: 12, borderRadius: 12, background: savedInstructions ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    >
                      {savedInstructions ? '✅ נשמר!' : '💾 שמרי'}
                    </button>
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg,#7c3aed15,#faf5ff)', borderRadius: 18, padding: '16px 18px', marginBottom: 16, border: '1.5px solid #e9d5ff' }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: '#7c3aed', marginBottom: 4 }}>🧭 מסע המטרה</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>מלאי יחד עם הלקוחה בפגישה הראשונה</div>
                </div>

                {/* ── 🧮 חישוב הרכב צלחת ── */}
                <div style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 16, border: '2px solid #f97316' }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#c2410c', marginBottom: 4 }}>
                    🧮 הרכב צלחת אישי — {selectedClient?.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                    Sonnet קורא את הדוחות ומחשב הרכב מותאם לפי מחלות רקע ומטרה
                  </div>
                  {plateResult && (
                    <div style={{ background: '#fff7ed', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '1px solid #fed7aa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        {[
                          { label: '💪 חלבון', val: plateResult.protein, color: '#16a34a' },
                          { label: '🍞 פחמימה', val: plateResult.carbs, color: '#f97316' },
                          { label: '🫒 שומן', val: plateResult.fat, color: '#0284c7' },
                          { label: '🥦 ירקות', val: plateResult.veggies, color: '#0d9488' },
                        ].map(p => (
                          <div key={p.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 10, padding: '8px 4px', border: '1.5px solid #fed7aa' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{p.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{p.val}%</div>
                          </div>
                        ))}
                      </div>
                      {plateResult.reasoning && (
                        <div style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>💡 {plateResult.reasoning}</div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={calcPlate}
                    disabled={calculatingPlate}
                    style={{ width: '100%', padding: 12, borderRadius: 12, background: calculatingPlate ? '#9ca3af' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', cursor: calculatingPlate ? 'default' : 'pointer', fontWeight: 700, fontSize: 13 }}
                  >
                    {calculatingPlate ? '⏳ מחשב...' : '🧮 חשבי הרכב צלחת אישי'}
                  </button>
                </div>

                <div style={{ background: '#fffbeb', borderRadius: 14, padding: '12px 16px', marginBottom: 16, border: '1.5px solid #fcd34d' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 6 }}>💡 הנחיות ניסוח — לשמור בראש</div>
                  <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8 }}>
                    • <strong>בחיוב בלבד</strong> — "אני רוצה להרגיש..." ולא "אני לא רוצה להיות..."<br/>
                    • <strong>בזמן הווה</strong> — "אני חשה", "אני בוחרת", "אני יודעת"<br/>
                    • <strong>בשליטתה</strong> — תלוי בה ולא באחרים<br/>
                    • אם אומרת שלילי — שאלי: "את זה את לא רוצה — מה כן?"<br/>
                    • אם בורחת מסבל — שאלי: "לאן את הולכת? מה במקום?"
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f4c2a', marginBottom: 12 }}>🌱 חלק 1 — הגדרת המטרה</div>
                  {[
                    { key: 'goal_reason', label: 'מה הביא אותך לכאן?', hint: 'שאלה פתוחה — הקשיבי, אל תמהרי קדימה' },
                    { key: 'goal_what', label: 'מה את רוצה? איך את רוצה להשתנות?', hint: 'בחיוב, ספציפית, בשליטתה. אם שלילי — "מה כן?"' },
                    { key: 'goal_context', label: 'באיזה הקשר? מתי? עם מי? איפה?', hint: 'מדייקת את המטרה לסיטואציה אמיתית' },
                    { key: 'goal_why', label: 'למה זה חשוב לך?', hint: 'אם בורחת מסבל — "לאן? מה במקום?"' },
                    { key: 'goal_proof', label: 'איך תדעי שהגעת? מה תהיה ההוכחה?', hint: 'מה היא תראה/תרגיש/תשמע כשתצליח?' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#7c3aed', marginBottom: 4, fontStyle: 'italic' }}>💜 {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0284c7', marginBottom: 12 }}>✨ חלק 2 — החזון הסנסורי</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, fontStyle: 'italic' }}>דמייני את הבוקר שהשינוי כבר קרה — בלשון הווה, מפורט ככל האפשר</div>
                  {[
                    { key: 'vision_see', label: 'מה את רואה סביבך כשאת פוקחת עיניים?', hint: 'פרטים ויזואליים — מה בדיוק?' },
                    { key: 'vision_hear', label: 'מה את שומעת? מה אומרים לך? מה את אומרת לעצמך?', hint: 'קולות, מילים, משפטים' },
                    { key: 'vision_feel', label: 'מהי התחושה הגופנית המדויקת? איפה היא בגוף?', hint: 'קלה, יציבה, חמה — ספציפי' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#0284c7', marginBottom: 4, fontStyle: 'italic' }}>💙 {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0d9488', marginBottom: 12 }}>🌿 חלק 3 — הרמוניה ואיזון</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, fontStyle: 'italic' }}>אם עולה התנגדות — שאלי: "מה הכוונה החיובית? איך לשמור עליה בדרך החדשה?"</div>
                  {[
                    { key: 'ecology_keep', label: 'כשתשיגי את המטרה — האם תפסידי משהו שחשוב לך?', hint: 'רווח משני — מה המצב הנוכחי נותן לה?' },
                    { key: 'ecology_harmony', label: 'איך תשמרי על מה שחשוב לך בתוך השינוי?', hint: 'עדכני את המטרה אם עלתה התנגדות' },
                    { key: 'ecology_who', label: 'במי תלויה השגת המטרה?', hint: 'חשוב — התוצאה חייבת להיות בשליטתה' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#0d9488', marginBottom: 4, fontStyle: 'italic' }}>💚 {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#dc2626', marginBottom: 12 }}>🔍 חלק 4 — חשיפת היתד</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, fontStyle: 'italic' }}>הקשיבי למילים: "תמיד", "אף פעם", "חייבת", "אי אפשר", "כי..."</div>
                  {[
                    { key: 'belief_hard', label: 'מה גורם לך להרגיש שזה קשה או בלתי אפשרי?', hint: 'ציטוט מדויק — מה המשפט שעולה לה?' },
                    { key: 'belief_when', label: 'מתי החלטת שזה המצב?', hint: 'מחפשת את שורש האמונה — גיל? אירוע?' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 4, fontStyle: 'italic' }}>❤️ {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#d97706', marginBottom: 12 }}>💎 חלק 5 — ארגז הכלים שלה</div>
                  {[
                    { key: 'resources_has', label: 'אילו משאבים כבר יש לה? (יכולות, אנשים, ידע)', hint: 'מה היא כבר עושה טוב? מה עזר לה בעבר?' },
                    { key: 'resources_past', label: 'זכרי רגע שהיית מרוצה מעצמך — מה היה שם? מה עשית?', hint: 'מחלצת עוגני כוח מהעבר' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#d97706', marginBottom: 4, fontStyle: 'italic' }}>🧡 {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 16, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#7c3aed', marginBottom: 12 }}>🛡️ חלק 6 — החיסונים וההתחייבות</div>
                  {[
                    { key: 'vaccine_moment', label: 'מהו הרגע הכי קשה ביום — מתי הכי קשה לשמור על המטרה?', hint: 'ספציפי — שעה? סיטואציה? אחרי מה?' },
                    { key: 'vaccine_action', label: 'מהי הפעולה הקטנה שמתחייבת לעשות גם ביום הכי קשה?', hint: 'קטנה ומציאותית — לא מושלמת, רק אפשרית' },
                    { key: 'vaccine_anchor', label: 'איזה משפט תגידי לעצמך ברגעים של עומס?', hint: 'בשפתה שלה — לא סיסמה, אלא משפט שמרגיש אמיתי' },
                    { key: 'first_step', label: 'מהו הצעד הראשון שמתחייבת לשבוע הקרוב?', hint: 'מחויבות קונקרטית — מה? מתי? איך?' },
                  ].map(q => (
                    <div key={q.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#222', marginBottom: 2, fontWeight: 700 }}>{q.label}</div>
                      {q.hint && <div style={{ fontSize: 11, color: '#7c3aed', marginBottom: 4, fontStyle: 'italic' }}>💜 {q.hint}</div>}
                      <textarea value={journeyAnswers[q.key]} onChange={e => setJourneyAnswers(a => ({ ...a, [q.key]: e.target.value }))} onBlur={() => saveJourney(journeyAnswers, undefined)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <button onClick={handleSaveJourney} disabled={journeySaving} style={{ width: '100%', padding: 13, borderRadius: 12, background: journeySaved ? '#16a34a' : journeySaving ? '#9ca3af' : '#0f4c2a', color: '#fff', border: 'none', cursor: journeySaving ? 'default' : 'pointer', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                  {journeySaving ? '⏳ שומר...' : journeySaved ? '✅ נשמר!' : '💾 שמרי תשובות'}
                </button>

                <button onClick={async () => {
                  setJourneyLoading(true); setJourneyAnalysis('')
                  const profileSummary = `מחלות: ${profile.medical_history || 'לא צוין'} | תרופות: ${profile.medications || 'לא צוין'} | אכילה רגשית: ${profile.emotional_eating || 'לא צוין'} | מה מעכב: ${profile.goal_obstacles || 'לא צוין'}`
                  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'outcomeDoc', answers: journeyAnswers, clientName: selectedClient.name, clientProfile: profileSummary, outputType: 'analysis' }) })
                  const data = await res.json()
                  const jResult = data.result || ''
                  setJourneyAnalysis(jResult)
                  saveJourney(journeyAnswers, jResult)
                  setJourneyLoading(false)
                }} disabled={journeyLoading} style={{ width: '100%', padding: 14, borderRadius: 12, background: journeyLoading ? '#9ca3af' : 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                  {journeyLoading ? '⏳ מנתח...' : '🔍 הפק ניתוח לפגישה (לעיניך בלבד)'}
                </button>

                {journeyAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, padding: '18px', marginBottom: 16, border: '2px solid #7c3aed' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#7c3aed', marginBottom: 12 }}>🔍 ניתוח לפגישה — לעיניך בלבד</div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.9, textAlign: 'right', direction: 'rtl' }} dangerouslySetInnerHTML={renderMd(journeyAnalysis)} />
                  </div>
                )}

                {journeyAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, padding: '18px', border: '1.5px solid #e9d5ff' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#7c3aed', marginBottom: 8 }}>📝 מה גילינו בפגישה 2</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>הוסיפי בקצרה מה השתנה, מה פירקנו, מה האמונה החדשה</div>
                    <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} onBlur={() => saveSessionKey('session_notes', sessionNotes)} rows={4} placeholder="לדוגמה: פירקנו את האמונה שאין לה כוח רצון. גילינו שהלופ קורה בערב אחרי שהילדים נרדמים. בחרנו יחד את משפט העוגן..." style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, marginBottom: 12 }} />
                    <button onClick={async () => {
                      setJourneyDocLoading(true)
                      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'outcomeDoc', answers: journeyAnswers, clientName: selectedClient.name, sessionNotes, outputType: 'clientDoc' }) })
                      const data = await res.json()
                      if (data.result) {
                        await supabase.from('clients').update({ outcome_doc: data.result }).eq('id', selectedClient.id)
                        setSelectedClient(prev => ({ ...prev, outcome_doc: data.result }))
                        setJourneyDocSent(true)
                        setTimeout(() => setJourneyDocSent(false), 4000)
                      }
                      setJourneyDocLoading(false)
                    }} disabled={journeyDocLoading || !sessionNotes.trim()} style={{ width: '100%', padding: 14, borderRadius: 12, background: journeyDocSent ? '#16a34a' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                      {journeyDocLoading ? '⏳ מפיק...' : journeyDocSent ? '✅ נשלח אליה!' : '🧭 הפק מסמך ושלחי אליה'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'roots' && (
              <div style={{ direction: 'rtl' }}>

                {/* כותרת */}
                <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#1a6b3a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>🌱 שאלון השורשים — {selectedClient?.name}</div>
                  <div style={{ fontSize: 12, color: '#86efac' }}>הזיני הערות מהזום המקדים לפי קבוצות השאלות</div>
                </div>

                {/* 6 קבוצות שאלות */}
                {[
                  { key: 'home_background', icon: '🏠', title: 'הבית שגדלת בו', placeholder: 'מה היה האוכל בבית? כללים? אווירה בשולחן? מה נשאר?' },
                  { key: 'family_identity', icon: '👁️', title: 'זהות וגוף בתוך המשפחה', placeholder: 'איך הרגישה בגוף שלה בתוך המשפחה? היה מישהו שנראה אחרת? משפט שנשאר?' },
                  { key: 'today_patterns', icon: '🔄', title: 'מה עושים היום', placeholder: 'מה מזהה שמגיע מהבית? מה נשבעה שלא תעשה? מה קורה כשלחוצה?' },
                  { key: 'forward_passing', icon: '➡️', title: 'מה עובר הלאה', placeholder: 'מה הצופה בארוחה היה רואה? מה מקווה שהילד לא ייקח? איך הילד מדבר על גוף?' },
                  { key: 'beliefs_motivation', icon: '💡', title: 'אמונות ומוטיבציה', placeholder: 'מה קורה אחרי שבועיים-שלושה? מתי נופלת? מה הסיפור אחרי כישלון? מה מניע בהתחלה? מה מכבה?' },
                  { key: 'resources', icon: '✨', title: 'משאבים וכוחות', placeholder: 'מה כבר עושה טוב? מתי הצליחה? מה עזר?' },
                ].map(({ key, icon, title, placeholder }) => (
                  <div key={key} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: '1.5px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f4c2a', marginBottom: 8 }}>{icon} {title}</div>
                    <textarea
                      value={rootsNotes[key]}
                      onChange={e => setRootsNotes(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => saveSessionKey('roots_notes', rootsNotes)}
                      placeholder={placeholder}
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }}
                    />
                  </div>
                ))}

                {/* כפתור ניתוח */}
                <button onClick={async () => {
                  setRootsLoading(true); setRootsAnalysis(''); setRootsEditing(false)
                  const notesText = Object.entries(rootsNotes).map(([k,v]) => {
                    const labels = { home_background: 'הבית שגדלה בו', family_identity: 'זהות וגוף במשפחה', today_patterns: 'דפוסים היום', forward_passing: 'מה עובר הלאה', beliefs_motivation: 'אמונות ומוטיבציה', resources: 'משאבים' }
                    return v.trim() ? labels[k] + ':\n' + v : ''
                  }).filter(Boolean).join('\n\n')
                  const prompt = 'אתה עוזר לאתי אטל — יועצת בריאות ותזונה התנהגותית — להתכונן לפגישת שורשים עם לקוחה.\n\n' +
                    'הערות מהזום המקדים:\n' + notesText + '\n\n' +
                    'נתוני הלקוחה: ' + (selectedClient?.name||'') + ', גיל ' + (selectedClient?.age||'לא ידוע') + ', מטרה: ' + (selectedClient?.goal||'לא ידוע') + ', מסלול: ' + (selectedClient?.client_track === 'child' ? 'עבור ילד' : selectedClient?.client_track === 'both' ? 'שניהם' : 'עצמי') + '\n\n' +
                    'הפק ניתוח מעמיק לאתי לקראת הפגישה הפיזית. כתוב בעברית, גוף שלישי נקבה. כלול:\n\n' +
                    '**1. תמונת הבית שגדלה בו**\nמה עיצב את הקשר שלה עם אוכל ועם הגוף. ציטט ישירות מהדברים.\n\n' +
                    '**2. פצע הזהות הגופנית**\nאיך חוותה את עצמה בתוך המשפחה — שייכות / נבדלות / השוואה. מה זה עשה לדימוי העצמי.\n\n' +
                    '**3. אמונות מגבילות שזוהו**\nרשימה ממוקדת. לכל אמונה — מה היא, מאיפה היא מגיעה, ואיך היא מתבטאת היום.\n\n' +
                    '**4. דפוסי מוטיבציה**\nמה מניע, מה מכבה, מה קורה אחרי כישלון. סוג המוטיבציה — חיצונית / פנימית.\n\n' +
                    ((selectedClient?.client_track === 'child' || selectedClient?.client_track === 'both')
                      ? '**5. הגלגל הדורי — חובה לכלול**\nהלקוחה היא הורה. ציין בדיוק: מה הועבר אליה מהדור הקודם ← מה היא כרגע מעבירה לילד/ה שלה ← מה ניתן לעצור. זה לב הפגישה עבורה.\n\n'
                      : '**5. דפוסים בין-דוריים**\nכלול רק אם עלה בתשובות קשר לדינמיקות בין-דוריות. אם לא — השמט לחלוטין.\n\n') +
                    '**6. מבנה מוצע לפגישה**\nסדר הנושאים + זמן משוער לכל נושא + על מה לשים דגש. כולל שאלת פתיחה מומלצת.\n\n' +
                    '**7. צעדים פרקטיים לשינוי**\nלפחות 6-8 צעדים קונקרטיים שאפשר לעשות מהיום — מותאמים ספציפית לה.\n\n' +
                    '**8. שאלות המשך אם משהו חסר**\n2-3 שאלות שכדאי לשאול בפגישה אם הנושא לא כוסה מספיק.'

                  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient.name }) })
                  const data = await res.json()
                  if (data.result) {
                    setRootsAnalysis(data.result); setRootsEditing(true); setRootsViewMode('view')
                    saveSessionKey('roots_notes', rootsNotes)
                    saveSessionKey('roots_analysis', data.result)
                  }
                  setRootsLoading(false)
                }} disabled={rootsLoading || !Object.values(rootsNotes).some(v => v.trim())} style={{ width: '100%', padding: 16, borderRadius: 14, background: rootsLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
                  {rootsLoading ? '⏳ מנתח...' : '🌱 הפק ניתוח AI לפגישה'}
                </button>

                {/* תצוגה מקדימה + עריכה */}
                {rootsEditing && rootsAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #0f4c2a', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>🔍 ניתוח לפגישה — לעיניך בלבד</div>
                        <div style={{ fontSize: 11, color: '#86efac' }}>{rootsViewMode === 'view' ? 'לחצי ✏️ לעריכה' : 'ערכי → onBlur שומר אוטומטית'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setRootsViewMode(m => m === 'view' ? 'edit' : 'view')} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{rootsViewMode === 'view' ? '✏️ ערכי' : '👁️ צפי'}</button>
                        <button onClick={() => { setRootsEditing(false); setRootsAnalysis(''); saveSessionKey('roots_analysis', '') }} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      {rootsViewMode === 'view'
                        ? <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.8, textAlign: 'right', direction: 'rtl' }} dangerouslySetInnerHTML={renderMd(rootsAnalysis)} />
                        : <textarea value={rootsAnalysis} onChange={e => setRootsAnalysis(e.target.value)} onBlur={() => saveSessionKey('roots_analysis', rootsAnalysis)} rows={22} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                      }
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        setRootsLoading(true)
                        const prompt = 'עדכני את הניתוח הבא לפי הגרסה הערוכה שניתנה. שמרי על אותו מבנה אבל שלבי את התוספות בצורה טבעית:\n\n' + rootsAnalysis
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient.name }) })
                        const data = await res.json()
                        if (data.result) { setRootsAnalysis(data.result); setRootsViewMode('view'); saveSessionKey('roots_analysis', data.result) }
                        setRootsLoading(false)
                      }} disabled={rootsLoading} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {rootsLoading ? '⏳...' : '🔄 עבדי מחדש'}
                      </button>
                      <button onClick={async () => {
                        setRootsFeedbackLoading(true)
                        const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית. צרי משוב חם, מעצים ואישי ל' + (selectedClient?.name||'') + ' לאחר פגישת השורשים.\n\n' +
                          'על בסיס הניתוח הבא:\n' + rootsAnalysis + '\n\n' +
                          'כתבי מסמך משוב ללקוחה בעברית, גוף שני נקבה, חיובי ומלא תקווה. מבנה:\n\n' +
                          '🌱 מה גילינו יחד\n[2-3 משפטים — תובנות מרכזיות שעלו, בשפתה]\n\n' +
                          '💫 הכוחות שלך\n[2 משפטים — מה את כבר עושה טוב שאולי לא ראית]\n\n' +
                          '🔓 מה משתחרר\n[1-2 משפטים — אמונה שהתחילה להשתנות]\n\n' +
                          '🌿 3 צעדים שמתחילים מהיום\n[3 צעדים קטנים וספציפיים — כתובים בחום ובאמונה בה]\n\n' +
                          '💚 מילה אחרונה\n[משפט אחד — חם, אישי, מעצים]\n\n' +
                          'ללא מבוא. ללא כותרת ראשית. ישר לתוכן.'
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient.name }) })
                        const data = await res.json()
                        if (data.result) setRootsFeedback(data.result)
                        setRootsFeedbackLoading(false)
                      }} disabled={rootsFeedbackLoading} style={{ flex: 2, padding: 12, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {rootsFeedbackLoading ? '⏳ מפיק...' : '📝 הפקי טיוטת משוב ללקוחה'}
                      </button>
                    </div>
                  </div>
                )}

                {/* משוב ללקוחה */}
                {rootsFeedback && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #c4956a', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#c4956a,#e8c9a0)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>💚 משוב ללקוחה — אחרי הפגישה</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>הוסיפי מה שעלה בפגישה → שמרי → שלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={rootsFeedback} onChange={e => setRootsFeedback(e.target.value)} rows={14} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        const { error } = await supabase.from('client_profiles').update({ roots_feedback: rootsFeedback, roots_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        if (!error) { setRootsFeedbackSaved(true); setTimeout(() => setRootsFeedbackSaved(false), 3000) }
                      }} style={{ flex: 1, padding: 12, borderRadius: 10, background: rootsFeedbackSaved ? '#16a34a' : '#f8f4ef', color: rootsFeedbackSaved ? '#fff' : '#0f4c2a', border: '1.5px solid #c4956a', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {rootsFeedbackSaved ? '✅ נשמר!' : '💾 שמרי'}
                      </button>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setSendingRootsFeedback(true)
                        await supabase.from('client_profiles').update({ roots_feedback: rootsFeedback, roots_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! 🌱\n\nהמשוב האישי שלך מפגישת השורשים מוכן — היכנסי לאפליקציה לצפייה 💚\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setSendingRootsFeedback(false); setRootsFeedbackSent(true); setTimeout(() => setRootsFeedbackSent(false), 4000)
                      }} disabled={sendingRootsFeedback} style={{ flex: 2, padding: 12, borderRadius: 10, background: rootsFeedbackSent ? '#16a34a' : '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {sendingRootsFeedback ? '⏳...' : rootsFeedbackSent ? '✅ נשלח!' : '📱 שמרי ושלחי בוואטסאפ'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {tab === 'body' && (
              <div style={{ direction: 'rtl' }}>

                <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#1a6b3a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>🩺 הגוף מדבר — {selectedClient?.name}</div>
                  <div style={{ fontSize: 12, color: '#86efac' }}>הזיני הערות מהזום המקדים — AI יבנה ניתוח אישי מחובר לשאלון 360</div>
                </div>

                {/* שאלות הזום */}
                {[
                  { key: 'body_signals', icon: '👁️', title: 'מה הגוף אומר היום', placeholder: 'איך הגוף מרגיש יום יום? יש שעה שטוב יותר / פחות? שמה לב לקשר בין אכילה לתחושה?' },
                  { key: 'body_history', icon: '📖', title: 'ההיסטוריה של הגוף', placeholder: 'יש תקופה שהרגישה הכי טוב? מה היה שם שונה? יש מזון שאחריו טוב/פחות טוב?' },
                  { key: 'emotion_body', icon: '💔', title: 'הקשר בין רגש לגוף', placeholder: 'כשלחוצה — מה קורה עם האכילה? יש אכילה אוטומטית? מה אחריה?' },
                  { key: 'energy_sleep', icon: '😴', title: 'אנרגיה ושינה', placeholder: 'איך האנרגיה לאורך היום? ירידות — מתי? כמה שעות שינה? קימה — קלה או קשה?' },
                  { key: 'hunger_satiety', icon: '🍽️', title: 'רעב ושובע', placeholder: 'איך יודעת שרעבה? איך יודעת שבעה? מרגישה הבדל בין רעב פיזי לרגשי?' },
                  { key: 'already_knows', icon: '💡', title: 'מה היא כבר יודעת', placeholder: 'יש משהו שחושדת שהגוף מנסה לומר ועדיין לא הקשיבה? אם הגוף יכול לדבר — מה הוא מבקש?' },
                  { key: 'main_complaint', icon: '🎯', title: 'מה הגוף שלה צועק עליו', placeholder: 'מה היא הכי רוצה לפתור? מה מפריע לה — גופנית, אנרגטית, ויזואלית?' },
                ].map(({ key, icon, title, placeholder }) => (
                  <div key={key} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: '1.5px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f4c2a', marginBottom: 8 }}>{icon} {title}</div>
                    <textarea value={bodyNotes[key]} onChange={e => setBodyNotes(prev => ({ ...prev, [key]: e.target.value }))} onBlur={() => saveSessionKey('body_notes', bodyNotes)} placeholder={placeholder} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }} />
                  </div>
                ))}

                <button onClick={async () => {
                  setBodyLoading(true); setBodyAnalysis(''); setBodyEditing(false)
                  const notesText = Object.entries(bodyNotes).map(([k,v]) => {
                    const labels = { body_signals: 'מה הגוף אומר היום', body_history: 'היסטוריה של הגוף', emotion_body: 'קשר רגש-גוף', energy_sleep: 'אנרגיה ושינה', hunger_satiety: 'רעב ושובע', already_knows: 'מה היא כבר יודעת', main_complaint: 'מה הגוף שלה צועק עליו' }
                    return v.trim() ? labels[k] + ':\n' + v : ''
                  }).filter(Boolean).join('\n\n')

                  const profile360 = selectedClient ? (
                    'שינה: ' + (selectedClient.sleep_quality||'לא ידוע') +
                    ' | לחץ: ' + (selectedClient.stress_level||'לא ידוע') +
                    ' | אנרגיה: ' + (selectedClient.energy_level||'לא ידוע') +
                    ' | אכילה רגשית: ' + (selectedClient.emotional_eating||'לא ידוע') +
                    ' | בוקר: ' + (selectedClient.breakfast_habits||'לא ידוע') +
                    ' | מים: ' + (selectedClient.water_intake||'לא ידוע') +
                    ' | כאבי בטן: ' + (selectedClient.body_stomach||'לא ידוע') +
                    ' | תחושות אחרי אכילה: ' + (selectedClient.body_after_eating||'לא ידוע') +
                    ' | קשר מזון-תחושה: ' + (selectedClient.body_food_link||'לא ידוע') +
                    ' | כאבי ראש: ' + (selectedClient.body_headaches||'לא ידוע') +
                    ' | עייפות אחרי ארוחות: ' + (selectedClient.body_fatigue||'לא ידוע')
                  ) : ''

                  const TOPICS = '12 נושאי חובה שיש לשלב כשרלוונטי:\n' +
                    '1. סוכר ואינסולין — עודף סוכר שאינסולין לא מכניס לתא הופך לשומן. קפיצה ונפילה. חשק למתוק = נפילת סוכר. פרוקטוז (מיצים/פירות מרוכזים) → כבד → ישירות שומן קרביים.\n' +
                    '2. חלבון — בלי מספיק: הגוף מפרק שריר. פחות שריר = מטבוליזם איטי = קשה לרדת.\n' +
                    '3. שומן בריא vs. לא בריא — שמן זית/אבוקדו/אומגה 3 vs. שמן מעובד/טרנס. שומן לא משמין — הסוג הלא נכון משמין. אלכוהול: מכבה שריפת שומן + מנתב קלוריות ישירות לאחסון בטני.\n' +
                    '4. פחמימות — מהירות (קפיצת סוכר) vs. מורכבות (אנרגיה יציבה). GI נמוך = שובע ממושך.\n' +
                    '5. סיבים — מזון לחיידקי המעי, שובע, ויסות סוכר, מניעת עצירות.\n' +
                    '6. ויטמינים ומינרלים — תת תזונה בעודף משקל: B12, ברזל, ויטמין D, מגנזיום. חסר = עייפות, קושי בירידה.\n' +
                    '7. הפסקות בין ארוחות — אינסולין גבוה כל הזמן = הגוף לא שורף שומן. צריך חלון.\n' +
                    '8. סטרס וקורטיזול — קורטיזול מעלה סוכר → מעלה אינסולין → מאחסן שומן בבטן. השמנה בטנית = צומת: גירעון קלורי הוא הבסיס, קורטיזול+פרוקטוז+אלכוהול+פחמימות מהירות מכוונים ספציפית לאזור הבטן.\n' +
                    '9. שינה — חוסר שינה: גרלין עולה (רעב) + לפטין יורד (שובע). לילה של 5 שעות = 300 קלוריות נוספות ביום אחרי.\n' +
                    '10. 3 מוחות + ENS — קורטקס, אוטומטי, ENS (500M נוירונים). 90% סרוטונין במעי. עצב הואגוס דו-כיווני.\n' +
                    '11. פסיכוסומטי — כל רגש יש לו ביטוי פיזי. מחקר שוודי: חרם → פי 1.3 מחלת מעי דלקתית גם 20 שנה אחרי. טריגרים שנוצרים.\n' +
                    '12. מיקרוביום ורירית המעי — הליקובקטר פילורי: 50% מהאוכלוסייה נשאים, 15-20% מתבטא. רירית עדינה — סטרס/מזון מעובד פוגעים בה.'

                  const prompt = 'אתה עוזר לאתי אטל — יועצת בריאות ותזונה התנהגותית — להכין ניתוח מעמיק לפגישת הגוף מדבר.\n\n' +
                    'שם הלקוחה: ' + (selectedClient?.name||'') + '\n\n' +
                    'נתוני שאלון 360:\n' + profile360 + '\n\n' +
                    'הערות מהזום המקדים:\n' + notesText + '\n\n' +
                    TOPICS + '\n\n' +
                    'גישת הניתוח: הגוף אינו אויב — הוא שפה. כל סימפטום הוא הודעה, לא כשל. לכל דפוס שזיהית — שאל: מה הגוף שלה מנסה לשמור? על מה הוא מגן? הסבר תמיד מתחיל מ"הגוף עושה זאת כי..." ולא "יש לה בעיה עם...".\n\n' +
                    'הפק ניתוח מעמיק לאתי. כתוב בעברית, מקצועי וישיר. המבנה:\n\n' +
                    '**מה הגוף שלה אומר — תרגום**\n' +
                    'בחר את 2-3 הסימפטומים/דפוסים הבולטים ביותר שעלו. לכל אחד:\n' +
                    '• [מה היא חוותה — בלשונה]\n' +
                    '• [מה הגוף עושה ולמה — לא "מה הבעיה" אלא "מה הגוף מנסה לשמור"]\n' +
                    '• [ההודעה הרגשית שמאחורי הסימפטום]\n\n' +
                    '**ניתוח סיבתי — אם ציינה תלונה ספציפית**\n' +
                    'אם עלתה תלונה ספציפית (השמנה בטנית, נפיחות, עייפות כרונית, ריבאונד) — פרק את כל הגורמים הרלוונטיים לנתוניה. לכל גורם:\n' +
                    '• [מנגנון — מה הגוף עושה ולמה]\n' +
                    '• [האם נתוניה תומכים בכך — כן/לא]\n' +
                    '• [צעד קונקרטי אחד לטיפול]\n' +
                    'אל תסתפק בסיבה אחת. השמנה בטנית לדוגמה: גירעון קלורי + קורטיזול + פרוקטוז + אלכוהול + שינה — כל אחד בנפרד.\n\n' +
                    '**ידע שמשלים את התמונה — רק מה שרלוונטי לה**\n' +
                    'מתוך 12 הנושאים — בחר אך ורק את אלה שמסבירים ישירות סימפטום שהיא ציינה. אל תכלול נושאים שלא עלו ממנה.\n\n' +
                    '**מבנה מוצע לשעה הפיזית**\n' +
                    'סדר הנושאים + זמן + שאלת פתיחה מומלצת + רגעי חיבור אישי.\n\n' +
                    '**משפטי חיבור אישי מוכנים**\n' +
                    'לפחות 4-5 משפטים שמחברים בין מה שאמרה לבין הידע. לדוגמה: "ענית שאחרי האוכל חייבת מתוק — זו לא חולשה. זו נפילת הסוכר שהמוח שלך תפס כהרגל."\n\n' +
                    '**צעדים פרקטיים מותאמים אליה**\n' +
                    'לפחות 6 צעדים קונקרטיים שאפשר להתחיל מחר — מבוססים על מה שזוהה.\n\n' +
                    '**שאלות שכדאי לשאול בפגישה**\n' +
                    '2-3 שאלות אם נושא לא כוסה מספיק בזום.'

                  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                  const data = await res.json()
                  if (data.result) {
                    setBodyAnalysis(data.result); setBodyEditing(true); setBodyViewMode('view')
                    saveSessionKey('body_notes', bodyNotes)
                    saveSessionKey('body_analysis', data.result)
                  }
                  setBodyLoading(false)
                }} disabled={bodyLoading || !Object.values(bodyNotes).some(v => v.trim())} style={{ width: '100%', padding: 16, borderRadius: 14, background: bodyLoading ? '#9ca3af' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
                  {bodyLoading ? '⏳ מנתח...' : '🩺 הפק ניתוח AI לפגישה'}
                </button>

                {bodyEditing && bodyAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #0f4c2a', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>🔍 ניתוח לפגישה — לעיניך בלבד</div>
                        <div style={{ fontSize: 11, color: '#86efac' }}>{bodyViewMode === 'view' ? 'לחצי ✏️ לעריכה' : 'ערכי → onBlur שומר אוטומטית'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setBodyViewMode(m => m === 'view' ? 'edit' : 'view')} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{bodyViewMode === 'view' ? '✏️ ערכי' : '👁️ צפי'}</button>
                        <button onClick={() => { setBodyEditing(false); setBodyAnalysis(''); saveSessionKey('body_analysis', '') }} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      {bodyViewMode === 'view'
                        ? <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.8, textAlign: 'right', direction: 'rtl' }} dangerouslySetInnerHTML={renderMd(bodyAnalysis)} />
                        : <textarea value={bodyAnalysis} onChange={e => setBodyAnalysis(e.target.value)} onBlur={() => saveSessionKey('body_analysis', bodyAnalysis)} rows={22} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                      }
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        setBodyLoading(true)
                        const prompt = 'עדכני את הניתוח הבא לפי הגרסה הערוכה. שמרי על אותו מבנה אבל שלבי את התוספות בצורה טבעית:\n\n' + bodyAnalysis
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        const data = await res.json()
                        if (data.result) { setBodyAnalysis(data.result); setBodyViewMode('view'); saveSessionKey('body_analysis', data.result) }
                        setBodyLoading(false)
                      }} disabled={bodyLoading} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {bodyLoading ? '⏳...' : '🔄 עבדי מחדש'}
                      </button>
                      <button onClick={async () => {
                        setBodyFeedbackLoading(true)
                        const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית. צרי משוב חם, מעצים ואישי ל' + (selectedClient?.name||'') + ' לאחר פגישת הגוף מדבר.\n\n' +
                          'על בסיס הניתוח:\n' + bodyAnalysis + '\n\n' +
                          'כתבי מסמך משוב בעברית, גוף שני נקבה, חיובי ומעצים. מבנה:\n\n' +
                          '🩺 מה הגוף שלך אמר לנו היום\n[2-3 משפטים — תובנות מרכזיות בשפתה, לא ז\u05e8גון רפואי]\n\n' +
                          '✨ מה גילינו יחד\n[דפוסים ספציפיים שזוהו — מחוברים לה, לא כלליים]\n\n' +
                          '💪 הכוחות שכבר יש לך\n[2 משפטים — מה היא כבר עושה טוב]\n\n' +
                          '🌿 3 דברים שמתחילים מחר\n[קונקרטיים, ריאליסטיים, בחום]\n\n' +
                          '💚 מילה אחרונה\n[משפט אחד — אישי, מעצים, בשפתה]\n\n' +
                          'ללא מבוא. ללא כותרת ראשית. ישר לתוכן. שפה של אדם — לא של רופא.'
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        const data = await res.json()
                        if (data.result) setBodyFeedback(data.result)
                        setBodyFeedbackLoading(false)
                      }} disabled={bodyFeedbackLoading} style={{ flex: 2, padding: 12, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {bodyFeedbackLoading ? '⏳ מפיק...' : '📝 הפקי טיוטת משוב ללקוחה'}
                      </button>
                    </div>
                  </div>
                )}

                {bodyFeedback && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #0d9488', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>💚 משוב ללקוחה — אחרי הפגישה</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>הוסיפי מה שעלה בפגישה → שמרי → שלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={bodyFeedback} onChange={e => setBodyFeedback(e.target.value)} rows={14} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        const { error } = await supabase.from('client_profiles').update({ body_feedback: bodyFeedback, body_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        if (!error) { setBodyFeedbackSaved(true); setTimeout(() => setBodyFeedbackSaved(false), 3000) }
                      }} style={{ flex: 1, padding: 12, borderRadius: 10, background: bodyFeedbackSaved ? '#16a34a' : '#f0fdfa', color: bodyFeedbackSaved ? '#fff' : '#0d9488', border: '1.5px solid #0d9488', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {bodyFeedbackSaved ? '✅ נשמר!' : '💾 שמרי'}
                      </button>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setSendingBodyFeedback(true)
                        await supabase.from('client_profiles').update({ body_feedback: bodyFeedback, body_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! 🩺\n\nהמשוב האישי שלך מפגישת הגוף מדבר מוכן — היכנסי לאפליקציה לצפייה 💚\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setSendingBodyFeedback(false); setBodyFeedbackSent(true); setTimeout(() => setBodyFeedbackSent(false), 4000)
                      }} disabled={sendingBodyFeedback} style={{ flex: 2, padding: 12, borderRadius: 10, background: bodyFeedbackSent ? '#16a34a' : '#0d9488', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {sendingBodyFeedback ? '⏳...' : bodyFeedbackSent ? '✅ נשלח!' : '📱 שמרי ושלחי בוואטסאפ'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {tab === 'child' && (
              <div style={{ direction: 'rtl' }}>

                <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>👨‍👩‍👧 הורה-ילד — {selectedClient?.name}</div>
                  <div style={{ fontSize: 12, color: '#e9d5ff' }}>הזיני הערות מהזום המקדים — AI יבנה מערך מפגש מלא ומסמך להורה</div>
                </div>

                {[
                  { key: 'child_self', icon: '👦', title: 'הילד עצמו', placeholder: 'מי הוא? מה אוכל/מסרב? מתי אוכל הכי הרבה ולמה? יום רגיל?' },
                  { key: 'state_of_mind', icon: '🧠', title: 'הסטייט אוף מיינד', placeholder: 'מה מצב הרוח הבסיסי? מה מלחיץ אותו? מה עוזר להירגע? האם אוכל = מקום בטוח? חרדה / קושי חברתי?' },
                  { key: 'family_dynamics', icon: '🏠', title: 'הדינמיקה המשפחתית', placeholder: 'אווירה בבית — שקט / מתחים? אחים — אותם חוקים? מי האדם הבטוח? ארוחות משותפות?' },
                  { key: 'parent_model', icon: '👁️', title: 'ההורה כמודל', placeholder: 'מה הוא רואה את ההורה אוכל? האם ההורים עושים ספורט? כמה ג\u05f3אנק בבית ומי קונה? הבדלים בין אחים?' },
                  { key: 'triggers_social', icon: '⚡', title: 'טריגרים, סיטואציות וחברתי', placeholder: 'עם מי נוח לו לאכול? בבופה / אירועים — מה קורה? יש חבר בטוח? לפני שינה — מאריך / אוכל? מסך + אוכל?' },
                ].map(({ key, icon, title, placeholder }) => (
                  <div key={key} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: '1.5px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed', marginBottom: 8 }}>{icon} {title}</div>
                    <textarea value={childNotes[key]} onChange={e => setChildNotes(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }} />
                  </div>
                ))}

                <button onClick={async () => {
                  setChildLoading(true); setChildAnalysis(''); setChildEditing(false)
                  const notesText = Object.entries(childNotes).map(([k,v]) => {
                    const labels = { child_self: 'הילד עצמו', state_of_mind: 'סטייט אוף מיינד', family_dynamics: 'דינמיקה משפחתית', parent_model: 'ההורה כמודל', triggers_social: 'טריגרים וחברתי' }
                    return v.trim() ? labels[k] + ':\n' + v : ''
                  }).filter(Boolean).join('\n\n')

                  const prompt = 'אתה עוזר לאתי אטל — יועצת בריאות ותזונה התנהגותית — להכין מערך מפגש עם הורה לגבי הילד שלו.\n\n' +
                    'שם ההורה: ' + (selectedClient?.name||'') + '\n\n' +
                    'הערות מהזום המקדים:\n' + notesText + '\n\n' +
                    'הפק ניתוח מעמיק ומערך מפגש לאתי. כתוב בעברית, מקצועי וישיר.\n\n' +
                    '**1. תמונת הילד — מי הוא**\n' +
                    'סיכום מי הילד, מה מאפיין אותו, מה הכוחות שלו. ציטט ישירות מהדברים.\n\n' +
                    '**2. הדפוסים שזוהו**\n' +
                    'לכל דפוס: מה קורה בפועל + מה מאחורי זה (רגשי/סביבתי/חברתי) + מה זה אומר לתהליך.\n' +
                    'אין הגבלה לכמות — כלול את כולם.\n\n' +
                    '**3. הדינמיקה המשפחתית — מה צריך לשנות**\n' +
                    'מה בבית תומך בבעיה? מה ניתן לשנות מיד? מה דורש עבודה עמוקה יותר?\n\n' +
                    '**4. ההורה כגורם**\n' +
                    'מה ההורה תורם לדפוס — בלי להאשים. מה הוא יכול לשנות בעצמו?\n\n' +
                    '**5. מבנה מוצע למפגש הפיזי**\n' +
                    'סדר נושאים + זמן משוער + שאלת פתיחה + רגעי חיבור אישי.\n\n' +
                    '**6. צעדים פרקטיים לשינוי ביתי**\n' +
                    'לפחות 6-8 צעדים קונקרטיים שההורה יכול להתחיל מחר — מותאמים ספציפית למשפחה.\n\n' +
                    '**7. שאלות המשך לפגישה**\n' +
                    '2-3 שאלות אם נושא לא כוסה מספיק.'

                  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                  const data = await res.json()
                  if (data.result) { setChildAnalysis(data.result); setChildEditing(true) }
                  setChildLoading(false)
                }} disabled={childLoading || !Object.values(childNotes).some(v => v.trim())} style={{ width: '100%', padding: 16, borderRadius: 14, background: childLoading ? '#9ca3af' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
                  {childLoading ? '⏳ מנתח...' : '👨‍👩‍👧 הפק מערך מפגש AI'}
                </button>

                {childEditing && childAnalysis && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #7c3aed', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>📋 מערך מפגש — לעיניך בלבד</div>
                        <div style={{ fontSize: 11, color: '#e9d5ff' }}>ערכי והוסיפי — ואז עבדי מחדש או הפיקי מסמך להורה</div>
                      </div>
                      <button onClick={() => { setChildEditing(false); setChildAnalysis('') }} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ סגרי</button>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={childAnalysis} onChange={e => setChildAnalysis(e.target.value)} rows={22} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        setChildLoading(true)
                        const prompt = 'עדכני את הניתוח הבא לפי הגרסה הערוכה. שמרי על אותו מבנה אבל שלבי את התוספות בצורה טבעית:\n\n' + childAnalysis
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        const data = await res.json()
                        if (data.result) setChildAnalysis(data.result)
                        setChildLoading(false)
                      }} disabled={childLoading} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #e9d5ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {childLoading ? '⏳...' : '🔄 עבדי מחדש'}
                      </button>
                      <button onClick={async () => {
                        setChildFeedbackLoading(true)
                        const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית. צרי מסמך סיכום חם ומעשי להורה ' + (selectedClient?.name||'') + ' לאחר פגישת הורה-ילד.\n\n' +
                          'על בסיס הניתוח:\n' + childAnalysis + '\n\n' +
                          'כתבי מסמך בעברית, גוף שני, חיובי ומעצים. מבנה:\n\n' +
                          '🌟 מה ראינו יחד\n[2-3 משפטים — תובנות על הילד, בשפה חיובית]\n\n' +
                          '💚 הכוחות של הילד שלך\n[2 משפטים — מה חיובי שראינו]\n\n' +
                          '🏠 מה משתנה בבית — מהיום\n[4-5 צעדים יומיומיים קונקרטיים וריאליסטיים]\n\n' +
                          '🌿 מה לשים לב אליו בשבוע הקרוב\n[2-3 נקודות תצפית — לא שיפוט]\n\n' +
                          '💬 משפט לסיום\n[חם, מעצים, מחזק את ההורה]\n\n' +
                          'ללא מבוא. ללא כותרת ראשית. שפה של אדם — לא של מטפל.'
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        const data = await res.json()
                        if (data.result) setChildFeedback(data.result)
                        setChildFeedbackLoading(false)
                      }} disabled={childFeedbackLoading} style={{ flex: 2, padding: 12, borderRadius: 10, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {childFeedbackLoading ? '⏳ מפיק...' : '📝 הפיקי מסמך להורה'}
                      </button>
                    </div>
                  </div>
                )}

                {childFeedback && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #7c3aed', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>💚 מסמך סיכום להורה — אחרי הפגישה</div>
                      <div style={{ fontSize: 11, color: '#e9d5ff' }}>הוסיפי מה שעלה בפגישה → שמרי → שלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={childFeedback} onChange={e => setChildFeedback(e.target.value)} rows={14} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        const { error } = await supabase.from('client_profiles').update({ child_feedback: childFeedback, child_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        if (!error) { setChildFeedbackSaved(true); setTimeout(() => setChildFeedbackSaved(false), 3000) }
                      }} style={{ flex: 1, padding: 12, borderRadius: 10, background: childFeedbackSaved ? '#16a34a' : '#faf5ff', color: childFeedbackSaved ? '#fff' : '#7c3aed', border: '1.5px solid #7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {childFeedbackSaved ? '✅ נשמר!' : '💾 שמרי'}
                      </button>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setSendingChildFeedback(true)
                        await supabase.from('client_profiles').update({ child_feedback: childFeedback, child_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! 👨‍👩‍👧\n\nמסמך הסיכום מהפגישה שלנו מוכן — היכנסי לאפליקציה לצפייה 💚\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setSendingChildFeedback(false); setChildFeedbackSent(true); setTimeout(() => setChildFeedbackSent(false), 4000)
                      }} disabled={sendingChildFeedback} style={{ flex: 2, padding: 12, borderRadius: 10, background: childFeedbackSent ? '#16a34a' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {sendingChildFeedback ? '⏳...' : childFeedbackSent ? '✅ נשלח!' : '📱 שמרי ושלחי בוואטסאפ'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

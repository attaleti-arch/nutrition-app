'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  orange: '#f97316', orangeLight: '#fff7ed',
  purple: '#9333ea', purpleLight: '#faf5ff',
  blue: '#0284c7', blueLight: '#eff6ff',
  amber: '#d97706', amberLight: '#fffbeb',
  teal: '#0d9488', tealLight: '#f0fdfa',
}

const DIET_TYPES = [
  { key: 'regular', label: 'אוכלת הכל', icon: '🍗' },
  { key: 'vegetarian', label: 'צמחונית', icon: '🥚' },
  { key: 'vegan', label: 'טבעונית', icon: '🌱' },
  { key: 'keto', label: 'קיטו', icon: '🥑' },
]

const RESTRICTIONS = [
  { key: 'no_gluten', label: 'ללא גלוטן', icon: '🌾' },
  { key: 'no_lactose', label: 'ללא לקטוז', icon: '🥛' },
  { key: 'no_nuts', label: 'ללא אגוזים', icon: '🥜' },
  { key: 'no_eggs', label: 'ללא ביצים', icon: '🥚' },
  { key: 'no_fish', label: 'ללא דגים', icon: '🐟' },
  { key: 'no_sugar', label: 'ללא סוכר מוסף', icon: '🍬' },
]

const ACTIVITY_LEVELS = ['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל']
const ACTIVITY_MULT = { 'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9 }
const GOALS_LIST = ['ירידה במשקל', 'שמירה על משקל', 'עלייה במסה']
const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}

const PLAN = {
  bokerSnack: 'לפני: נס קפה + חטיף בריאות עד 99 קל',
  boker: [
    { id: 'b1', text: 'משקה חלבון', tags: [] },
    { id: 'b2', text: 'חטיף חלבון', tags: [] },
    { id: 'b3', text: 'מעדן פרו + פרי / ברנפלקס 10 גרם', tags: ['vegan'] },
    { id: 'b4', text: '3 פריכיות + 3 כפיות קוטג + חצי כפית דבש', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b5', text: 'חצי גביע קוטג / גבינה לבנה + ירקות', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b6', text: 'פיתה בוסמין / 4 פריכיות / 2 פרוסות לחם שיפון', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'b7', text: 'ביצים קשות / חביתה', tags: [], hide: ['vegan', 'no_eggs'] },
    { id: 'b8', text: 'אבוקדו + ירקות', tags: ['vegan', 'keto'] },
    { id: 'b9', text: 'שיבולת שועל + חלב / משקה צמחי', hide: ['keto'], tags: ['vegetarian'] },
  ],
  carbOptions: [
    { id: 'c1', text: '150 גרם אורז מלא / קינואה', hide: ['keto', 'no_gluten'] },
    { id: 'c2', text: '200 גרם בורגול / כוסמת', hide: ['keto', 'no_gluten'] },
    { id: 'c3', text: '110 גרם פתיתים / קוסקוס', hide: ['keto', 'no_gluten'] },
    { id: 'c4', text: '170 גרם תפוחי אדמה / בטטה', hide: ['keto'] },
    { id: 'c5', text: '150 גרם כרובית / ברוקולי (קיטו)', tags: ['keto'] },
    { id: 'c6', text: '150 גרם עדשים / חומוס מבושל', tags: ['vegan'] },
    { id: 'c7', text: '100 גרם שעועית לבנה / אדומה', tags: ['vegan'] },
  ],
  protOptions: [
    { id: 'p1', text: '200 גרם דג לבן', hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p2', text: '100 גרם סלמון', hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p3', text: '150 גרם טופו', tags: ['vegan'] },
    { id: 'p4', text: '100 גרם סינטה / 120 גרם פרגית', hide: ['vegan', 'vegetarian', 'keto'] },
    { id: 'p5', text: '140 גרם ירך עוף / 100 גרם הודו טחון', hide: ['vegan', 'vegetarian'] },
    { id: 'p6', text: '2 המבורגר צמחוני 99 קל', tags: ['vegan'] },
    { id: 'p7', text: '200 גרם דג שמן / סלמון (קיטו)', tags: ['keto'], hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p8', text: '3 ביצים / אומלט', hide: ['vegan', 'no_eggs'] },
    { id: 'p9', text: '100 גרם טונה / סרדינים', hide: ['vegan', 'vegetarian', 'no_fish'] },
  ],
  fatOptions: [
    { id: 'f1', text: 'כף שמן זית', tags: ['vegan', 'keto'] },
    { id: 'f2', text: '2 כפות טחינה גולמית', tags: ['vegan'] },
    { id: 'f3', text: '50 גרם אבוקדו (רבע)', tags: ['vegan', 'keto'] },
    { id: 'f4', text: 'חופן אגוזי מלך / שקדים (30 גרם)', tags: ['vegan', 'keto'], hide: ['no_nuts'] },
    { id: 'f5', text: '30 גרם גבינה צהובה 5%', hide: ['vegan', 'no_lactose'] },
    { id: 'f6', text: 'כף חמאת שקדים', tags: ['vegan', 'keto'], hide: ['no_nuts'] },
  ],
  veggieOptions: [
    { id: 'v1', text: 'סלט טרי — מלפפון, עגבנייה, לימון + מלח' },
    { id: 'v2', text: 'ירקות קלויים בתנור (זוקיני, פלפל, חציל, ברוקולי)' },
    { id: 'v3', text: 'ירקות מאודים (ברוקולי, כרובית, גזר)' },
    { id: 'v4', text: 'סלט עלים ירוקים (תרד, רוקט, חסה)' },
  ],
  erev: [
    { id: 'e1', text: 'גביע קוטג 3% / גבינה לבנה 5%', hide: ['vegan', 'no_lactose'] },
    { id: 'e2', text: '50 גרם ברנפלקס + 150 מל חלב / משקה צמחי', hide: ['keto'] },
    { id: 'e3', text: '5 דפי אורז + ממרח', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'e4', text: 'פיתה / 4 פריכיות / 2 פרוסות לחם שיפון', hide: ['keto', 'no_gluten'] },
    { id: 'e5', text: 'סלט ירקות + טחינה / שמן זית', tags: ['vegan', 'keto'] },
    { id: 'e6', text: 'יוגורט יווני 0% + פירות יער', hide: ['vegan', 'no_lactose', 'keto'] },
    { id: 'e7', text: '2 ביצים קשות + ירקות', hide: ['vegan', 'no_eggs'] },
    { id: 'e8', text: '100 גרם עדשים מבושלות + ירקות', tags: ['vegan'] },
  ],
  benayimOptions: [
    { id: 'ben1', text: 'פרי עונתי (תפוח / אגס / קיווי)' },
    { id: 'ben2', text: 'חופן אגוזים / שקדים (5-6 יחידות)' },
    { id: 'ben3', text: 'חטיף בריאות / חטיף חלבון עד 150 קל' },
    { id: 'ben4', text: 'יוגורט 0% + פרי', hide: ['vegan', 'no_lactose'] },
  ],
  rules: [
    { icon: '💧', text: 'לפחות 2-3 ליטר מים ביום' },
    { icon: '☕', text: 'עד 2 קפה ביום' },
    { icon: '🥦', text: 'חצי צלחת = ירקות תמיד!' },
    { icon: '🔄', text: 'ניתן להחליף בין הארוחות - לא להוסיף' },
    { icon: '🍳', text: 'בישול בתרסיס שמן בלבד!' },
    { icon: '😴', text: '7 שעות שינה לפחות' },
    { icon: '🚶', text: '10,000 צעדים ביום' },
  ],
}

function calcBMR(weight, height, age, gender) {
  if (!weight || !height || !age) return 0
  return gender === 'נקבה'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5
}

function calcTargets(weight, height, age, gender, activity, goal) {
  var bmr = calcBMR(weight, height, age, gender)
  if (!bmr) return null
  var tdee = bmr * (ACTIVITY_MULT[activity] || 1.55)
  var adjust = goal === 'ירידה במשקל' ? -400 : goal === 'עלייה במסה' ? 300 : 0
  var calories = Math.round(tdee + adjust)
  var split = GOALS_SPLIT[goal] || GOALS_SPLIT['ירידה במשקל']
  return {
    calories,
    protein: Math.round((calories * split.protein / 100) / 4),
    carbs: Math.round((calories * split.carbs / 100) / 4),
    fat: Math.round((calories * split.fat / 100) / 9),
  }
}

function shouldHide(item, dietType, restrictions) {
  if (!item.hide) return false
  for (var i = 0; i < item.hide.length; i++) {
    var h = item.hide[i]
    if (h === dietType) return true
    if (restrictions && restrictions[h]) return true
  }
  return false
}

function Section({ title, icon, accent, light, children, defaultOpen, badge }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
      <button onClick={function() { setOpen(function(o) { return !o }) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? light : '#fff', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
        {badge && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>{badge}</span>}
        <span style={{ color: accent, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '4px 18px 16px' }}>{children}</div>}
    </div>
  )
}

function CheckRow({ id, text, accent, checked, onToggle }) {
  return (
    <div onClick={function() { onToggle(id) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 0.45 : 1 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checked ? accent : '#d1d5db'), background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: '#222', textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function RadioRow({ id, text, accent, selected, onSelect }) {
  const active = selected === id
  return (
    <div onClick={function() { onSelect(active ? null : id) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
      <div style={{ width: 18, height: 18, borderRadius: 99, border: '2px solid ' + (active ? accent : '#d1d5db'), background: active ? accent : '#fff', flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: active ? accent : '#222', fontWeight: active ? 700 : 400, flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function FreeText({ value, onChange, placeholder }) {
  return (
    <textarea value={value} onChange={function(e) { onChange(e.target.value) }} placeholder={placeholder || 'הוסיפי פרטים נוספים...'} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 8, color: '#555' }} />
  )
}

function ExtraCal({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <input type="number" value={value || ''} onChange={function(e) { onChange(Number(e.target.value) || 0) }} placeholder="קלוריות נוספות..." style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>קל</span>
    </div>
  )
}

function YesNo({ value, onChange, labelYes, labelNo, accent }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={function() { onChange(true) }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === true ? accent : '#e5e7eb'), background: value === true ? accent : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === true ? '#fff' : '#555' }}>{labelYes}</button>
      <button onClick={function() { onChange(false) }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === false ? '#ef4444' : '#e5e7eb'), background: value === false ? '#fef2f2' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === false ? '#ef4444' : '#555' }}>{labelNo}</button>
    </div>
  )
}
export default function PlanApp({ clientName, userPassword }) {
 const displayName = clientName || userPassword || ''
 const dbKey = userPassword || clientName || ''
 const today = new Date().toLocaleDateString('he-IL')
 const todayKey = new Date().toLocaleDateString('sv-SE')

 const [dietType, setDietType] = useState(null)
 const [restrictions, setRestrictions] = useState({})
 const [setupDone, setSetupDone] = useState(false)
 const [profileDone, setProfileDone] = useState(false)
 const [checks, setChecks] = useState({})
 const [carbSel, setCarbSel] = useState(null)
 const [protSel, setProtSel] = useState(null)
 const [fatSel, setFatSel] = useState(null)
 const [veggieSel, setVeggieSel] = useState(null)
 const [lunchOpt, setLunchOpt] = useState(null)
 const [benayimSel, setBenayimSel] = useState(null)
 const [hadSnack, setHadSnack] = useState(null)
 const [hadBenayim, setHadBenayim] = useState(null)
 const [water, setWater] = useState(0)
 const [steps, setSteps] = useState('')
 const [note, setNote] = useState('')
 const [bokerFree, setBokerFree] = useState('')
 const [lunchFree, setLunchFree] = useState('')
 const [erevFree, setErevFree] = useState('')
 const [bokerExtraCal, setBokerExtraCal] = useState(0)
 const [lunchExtraCal, setLunchExtraCal] = useState(0)
 const [erevExtraCal, setErevExtraCal] = useState(0)
 const [feedback, setFeedback] = useState(null)
 const [saving, setSaving] = useState(false)
 const [saved, setSaved] = useState(false)
 const [nutritionData, setNutritionData] = useState({})

 const [userWeight, setUserWeight] = useState('')
 const [userHeight, setUserHeight] = useState('')
 const [userAge, setUserAge] = useState('')
 const [userGender, setUserGender] = useState('נקבה')
 const [userActivity, setUserActivity] = useState('בינוני')
 const [userGoal, setUserGoal] = useState('ירידה במשקל')
 const [userTargetWeight, setUserTargetWeight] = useState('')

 useEffect(function() {
   async function loadNutrition() {
     var { data } = await supabase.from('nutrition_data').select('*')
     var nd = {}
     if (data) data.forEach(function(item) { nd[item.id] = item })
     setNutritionData(nd)
   }
   loadNutrition()
 }, [])

 useEffect(function() {
   async function load() {
     var client = await supabase.from('clients').select('*').eq('password', dbKey).maybeSingle()
     if (client.data) {
       if (client.data.weight) { setUserWeight(String(client.data.weight)); setProfileDone(true) }
       if (client.data.height) setUserHeight(String(client.data.height))
       if (client.data.age) setUserAge(String(client.data.age))
       if (client.data.gender) setUserGender(client.data.gender)
       if (client.data.activity) setUserActivity(client.data.activity)
       if (client.data.goal) setUserGoal(client.data.goal)
       if (client.data.target_weight) setUserTargetWeight(String(client.data.target_weight))
     }
     var r = await supabase.from('daily_logs').select('*').eq('client_name', dbKey).order('log_date', { ascending: false }).limit(1).maybeSingle()
     if (r.data) {
       if (r.data.diet_type) { setDietType(r.data.diet_type); setSetupDone(true) }
       if (r.data.restrictions) setRestrictions(r.data.restrictions)
     }
     var todayLog = await supabase.from('daily_logs').select('*').eq('client_name', dbKey).eq('log_date', todayKey).maybeSingle()
     if (todayLog.data) {
       setChecks(todayLog.data.checks || {})
       setCarbSel(todayLog.data.carb_sel)
       setProtSel(todayLog.data.prot_sel)
       setFatSel(todayLog.data.fat_sel)
       setVeggieSel(todayLog.data.veggie_sel)
       setLunchOpt(todayLog.data.lunch_opt)
       setBenayimSel(todayLog.data.benayim_sel)
       setWater(todayLog.data.water || 0)
       setSteps(todayLog.data.steps || '')
       setNote(todayLog.data.note || '')
       setBokerFree(todayLog.data.boker_free || '')
       setLunchFree(todayLog.data.lunch_free || '')
       setErevFree(todayLog.data.erev_free || '')
       setBokerExtraCal(todayLog.data.boker_extra_cal || 0)
       setLunchExtraCal(todayLog.data.lunch_extra_cal || 0)
       setErevExtraCal(todayLog.data.erev_extra_cal || 0)
       setHadSnack(todayLog.data.had_snack ?? null)
       setHadBenayim(todayLog.data.had_benayim ?? null)
       setFeedback(todayLog.data.trainer_feedback)
     }
   }
   if (dbKey) load()
 }, [dbKey, todayKey])

 function calcEatenCalories() {
   var total = 0
   function add(id) {
     var item = nutritionData[id]
     if (item) total += item.calories || 0
   }
   if (hadSnack) add('snack')
   if (checks) Object.keys(checks).forEach(function(id) { if (checks[id]) add(id) })
   if (carbSel) add(carbSel)
   if (protSel) add(protSel)
   if (fatSel) add(fatSel)
   if (veggieSel) add(veggieSel)
   if (benayimSel) add(benayimSel)
   if (hadBenayim) add('benayim')
   total += (bokerExtraCal || 0) + (lunchExtraCal || 0) + (erevExtraCal || 0)
   return total
 }

 const saveProfile = async function() {
   if (!userWeight || !userHeight || !userAge) return
   await supabase.from('clients').update({
     weight: parseFloat(userWeight),
     height: parseFloat(userHeight),
     age: parseInt(userAge),
     gender: userGender,
     activity: userActivity,
     goal: userGoal,
     target_weight: userTargetWeight ? parseFloat(userTargetWeight) : null,
   }).eq('password', dbKey)
   setProfileDone(true)
 }

 const resetDay = async function() {
   if (!window.confirm('לאפס את כל הנתונים של היום?')) return
   await supabase.from('daily_logs').delete().eq('client_name', dbKey).eq('log_date', todayKey)
   setChecks({}); setCarbSel(null); setProtSel(null); setFatSel(null)
   setVeggieSel(null); setBenayimSel(null); setLunchOpt(null)
   setWater(0); setSteps(''); setNote('')
   setBokerFree(''); setLunchFree(''); setErevFree('')
   setBokerExtraCal(0); setLunchExtraCal(0); setErevExtraCal(0)
   setHadSnack(null); setHadBenayim(null)
   16px 18px', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10, textAlign: 'right' }}>הערה יומית לאתי</div>
          <textarea value={note} onChange={function(e) { setNote(e.target.value) }} placeholder="כתבי כאן איך הרגשת היום, קשיים, שאלות..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 16, borderRadius: 16, background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>
          {saving ? 'שומרת...' : saved ? 'נשמר! אתי תראה את זה' : 'שמרי את היום שלי'}
        </button>

        <button onClick={resetDay} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 8, background: 'transparent', border: '1px solid #fca5a5', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
          🔄 אפסי את היום
        </button>

        <button onClick={function() { setSetupDone(false) }} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
          עדכני העדפות תזונה
        </button>

        <button onClick={function() { setProfileDone(false) }} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
          עדכני פרטים אישיים
        </button>
      </div>
    </div>
  )
}

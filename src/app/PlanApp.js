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

function YesNo({ value, onChange, labelYes, labelNo, accent }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={function() { onChange(true) }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === true ? accent : '#e5e7eb'), background: value === true ? accent : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === true ? '#fff' : '#555' }}>{labelYes}</button>
      <button onClick={function() { onChange(false) }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === false ? '#ef4444' : '#e5e7eb'), background: value === false ? '#fef2f2' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === false ? '#ef4444' : '#555' }}>{labelNo}</button>
    </div>
  )
}

function CalorieMeter({ eaten, target }) {
  if (!target) return null
  var pct = Math.min(100, Math.round((eaten / target) * 100))
  var color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#16a34a'
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', marginBottom: 10, border: '1.5px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: color }}>{Math.round(eaten)} קל</span>
        <span style={{ color: '#9ca3af' }}>יעד: {target} קל</span>
      </div>
      <div style={{ height: 10, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11, color: color, marginTop: 4, textAlign: 'center', fontWeight: 700 }}>
        {pct >= 100 ? '✅ הגעת ליעד הקלורי היומי!' : 'נשאר ' + (target - Math.round(eaten)) + ' קל'}
      </div>
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

  const toggleRestriction = function(key) {
    setRestrictions(function(r) { var n = Object.assign({}, r); n[key] = !n[key]; return n })
  }

  const toggleCheck = function(id) {
    setChecks(function(c) { var n = Object.assign({}, c); n[id] = !n[id]; return n })
  }

  const handleSave = async function() {
    setSaving(true)
    var payload = {
      client_name: dbKey,
      log_date: todayKey,
      checks: checks,
      carb_sel: carbSel,
      prot_sel: protSel,
      fat_sel: fatSel,
      veggie_sel: veggieSel,
      lunch_opt: lunchOpt,
      benayim_sel: benayimSel,
      water: water,
      steps: steps,
      note: note,
      boker_free: bokerFree,
      lunch_free: lunchFree,
      erev_free: erevFree,
      had_snack: hadSnack,
      had_benayim: hadBenayim,
      diet_type: dietType,
      restrictions: restrictions,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
    if (error) { console.error('שגיאה:', error.message) }
    setSaving(false)
    setSaved(true)
    setTimeout(function() { setSaved(false) }, 3000)
  }

  const targets = calcTargets(parseFloat(userWeight), parseFloat(userHeight), parseInt(userAge), userGender, userActivity, userGoal)
  const eatenCalories = calcEatenCalories()

  const filteredBoker = PLAN.boker.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredProt = PLAN.protOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredErev = PLAN.erev.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredCarbs = PLAN.carbOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredFat = PLAN.fatOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredBenayim = PLAN.benayimOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })

  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalItems = filteredBoker.length + filteredErev.length

  if (!setupDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>היי {displayName.split(' ')[0]}!</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>בואי נתאים את התפריט עבורך</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>סוג תזונה (בחרי אחת):</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIET_TYPES.map(function(d) {
              return (
                <button key={d.key} onClick={function() { setDietType(d.key) }} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (dietType === d.key ? C.greenMid : '#e5e7eb'), background: dietType === d.key ? C.greenLight : '#fafafa', color: dietType === d.key ? C.greenDark : '#333' }}>
                  {d.icon} {d.label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>הגבלות נוספות:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RESTRICTIONS.map(function(r) {
              return (
                <button key={r.key} onClick={function() { toggleRestriction(r.key) }} style={{ padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (restrictions[r.key] ? C.blue : '#e5e7eb'), background: restrictions[r.key] ? C.blueLight : '#fafafa', color: restrictions[r.key] ? C.blue : '#333' }}>
                  {r.icon} {r.label} {restrictions[r.key] ? '✓' : ''}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={function() { if (dietType) setSetupDone(true) }} disabled={!dietType} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: dietType ? C.greenMid : '#e5e7eb', color: dietType ? '#fff' : '#9ca3af', border: 'none', cursor: dietType ? 'pointer' : 'default', width: '100%', maxWidth: 340 }}>
          בואי נתחיל!
        </button>
      </div>
    )
  }

  if (!profileDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>פרטים אישיים 📊</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>כדי לחשב את היעד הקלורי שלך</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'משקל נוכחי (ק"ג)', val: userWeight, set: setUserWeight, ph: '70' },
              { label: 'גובה (ס"מ)', val: userHeight, set: setUserHeight, ph: '165' },
              { label: 'גיל', val: userAge, set: setUserAge, ph: '30' },
              { label: 'משקל יעד (ק"ג)', val: userTargetWeight, set: setUserTargetWeight, ph: '60' },
            ].map(function(f) {
              return (
                <div key={f.label}>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                  <input type="number" value={f.val} onChange={function(e) { f.set(e.target.value) }} placeholder={f.ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )
            })}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מין</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['נקבה', 'זכר'].map(function(g) {
                return <button key={g} onClick={function() { setUserGender(g) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '2px solid ' + (userGender === g ? C.greenMid : '#e5e7eb'), background: userGender === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: userGender === g ? C.greenDark : '#555' }}>{g}</button>
              })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ACTIVITY_LEVELS.map(function(a) {
                return <button key={a} onClick={function() { setUserActivity(a) }} style={{ padding: '8px 12px', borderRadius: 99, border: '2px solid ' + (userActivity === a ? C.greenMid : '#e5e7eb'), background: userActivity === a ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: userActivity === a ? C.greenDark : '#555' }}>{a}</button>
              })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {GOALS_LIST.map(function(g) {
                return <button key={g} onClick={function() { setUserGoal(g) }} style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid ' + (userGoal === g ? C.greenMid : '#e5e7eb'), background: userGoal === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: userGoal === g ? C.greenDark : '#555', textAlign: 'right' }}>{g}</button>
              })}
            </div>
          </div>
        </div>
        <button onClick={saveProfile} disabled={!userWeight || !userHeight || !userAge} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: (userWeight && userHeight && userAge) ? C.greenMid : '#e5e7eb', color: (userWeight && userHeight && userAge) ? '#fff' : '#9ca3af', border: 'none', cursor: 'pointer', width: '100%', maxWidth: 340 }}>
          שמרי פרטים
        </button>
        <button onClick={function() { setProfileDone(true) }} style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
          דלגי בינתיים
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '24px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#86efac', marginBottom: 2 }}>בין הראש לצלחת · אתי אטל</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>היי {displayName.split(' ')[0]}!</div>
          <div style={{ fontSize: 12, color: '#bbf7d0', marginTop: 2 }}>{today}</div>
          {targets && (
            <div style={{ marginTop: 10, background: '#ffffff20', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#86efac', marginBottom: 6 }}>
                <span>🔥 {Math.round(eatenCalories)} קל אכלת</span>
                <span>יעד: {targets.calories} קל</span>
              </div>
              <div style={{ height: 8, background: '#ffffff20', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, Math.round((eatenCalories / targets.calories) * 100)) + '%', height: '100%', background: eatenCalories >= targets.calories ? '#fbbf24' : '#4ade80', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>
                {eatenCalories >= targets.calories ? '✅ הגעת ליעד!' : 'נשאר ' + (targets.calories - Math.round(eatenCalories)) + ' קל'}
              </div>
            </div>
          )}
          <div style={{ marginTop: 8, background: '#ffffff15', borderRadius: 10, height: 6, overflow: 'hidden' }}>
            <div style={{ width: Math.round((checkedCount / totalItems) * 100) + '%', height: '100%', background: '#4ade80', borderRadius: 10 }} />
          </div>
          <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>{checkedCount}/{totalItems} פריטים סומנו היום</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 14px 80px' }}>
        {feedback && (
          <div style={{ background: '#fefce8', border: '2px solid #fbbf24', borderRadius: 14, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>משוב מאתי:</div>
            <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.7 }}>{feedback}</div>
          </div>
        )}

        <Section title="ארוחת בוקר" icon="☀️" accent={C.orange} light={C.orangeLight} defaultOpen={true}>
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0 4px', textAlign: 'right' }}>{PLAN.bokerSnack}</div>
          <YesNo value={hadSnack} onChange={setHadSnack} labelYes="✅ אכלתי חטיף" labelNo="❌ דילגתי" accent={C.orange} />
          {filteredBoker.map(function(item) {
            return <CheckRow key={item.id} id={item.id} text={item.text} accent={C.orange} checked={!!checks[item.id]} onToggle={toggleCheck} />
          })}
          <FreeText value={bokerFree} onChange={setBokerFree} placeholder="אכלתי גם / פרטים נוספים על הבוקר..." />
        </Section>

        <Section title="ארוחת צהריים" icon="🌞" accent={C.greenMid} light={C.greenLight}>
          <div style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
            {[{ k: 'A', l: '🍽️ מרכיבי הארוחה' }, { k: 'B', l: '🫒 רטבים ונלווים' }].map(function(opt) {
              return (
                <button key={opt.k} onClick={function() { setLunchOpt(lunchOpt === opt.k ? null : opt.k) }} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '2px solid ' + (lunchOpt === opt.k ? C.greenMid : '#e5e7eb'), background: lunchOpt === opt.k ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: lunchOpt === opt.k ? C.greenDark : '#555' }}>
                  {opt.l}
                </button>
              )
            })}
          </div>
          {lunchOpt === 'A' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>פחמימה:</div>
              {filteredCarbs.map(function(o) { return <RadioRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} selected={carbSel} onSelect={setCarbSel} /> })}
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '10px 0 2px', textAlign: 'right' }}>חלבון:</div>
              {filteredProt.map(function(o) { return <RadioRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} selected={protSel} onSelect={setProtSel} /> })}
            </div>
          )}
          {lunchOpt === 'B' && (
  <div>
    <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>רטבים ותוספות (ניתן לסמן כמה):</div>
    {filteredFat.map(function(o) { return <CheckRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} checked={!!checks[o.id]} onToggle={toggleCheck} /> })}
  </div>
)}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות (חובה!):</div>
          {PLAN.veggieOptions.map(function(o) { return <RadioRow key={o.id} id={o.id} text={o.text} accent={C.teal} selected={veggieSel} onSelect={setVeggieSel} /> })}
          <FreeText value={lunchFree} onChange={setLunchFree} placeholder="אכלתי גם / פרטים נוספים על הצהריים..." />
        </Section>

        <Section title="ביניים" icon="🌤" accent={C.blue} light={C.blueLight}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.blue, padding: '8px 0 4px', textAlign: 'right' }}>בחרי ביניים:</div>
          {filteredBenayim.map(function(o) { return <RadioRow key={o.id} id={o.id} text={o.text} accent={C.blue} selected={benayimSel} onSelect={setBenayimSel} /> })}
          <YesNo value={hadBenayim} onChange={setHadBenayim} labelYes="✅ אכלתי ביניים" labelNo="❌ דילגתי" accent={C.blue} />
        </Section>

        <Section title="ארוחת ערב" icon="🌙" accent={C.purple} light={C.purpleLight}>
          {filteredErev.map(function(item) {
            return <CheckRow key={item.id} id={item.id} text={item.text} accent={C.purple} checked={!!checks[item.id]} onToggle={toggleCheck} />
          })}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות לערב:</div>
          {PLAN.veggieOptions.map(function(o) {
            return (
              <div key={o.id + '_e'} onClick={function() { toggleCheck(o.id + '_erev') }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checks[o.id + '_erev'] ? 0.45 : 1 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checks[o.id + '_erev'] ? C.teal : '#d1d5db'), background: checks[o.id + '_erev'] ? C.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checks[o.id + '_erev'] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, color: '#222', textDecoration: checks[o.id + '_erev'] ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{o.text}</span>
              </div>
            )
          })}
          <FreeText value={erevFree} onChange={setErevFree} placeholder="אכלתי גם / פרטים נוספים על הערב..." />
        </Section>

        <Section title="מעקב שתייה" icon="💧" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 8, textAlign: 'right' }}>{water}/8 כוסות</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: 8 }).map(function(_, i) {
                return <button key={i} onClick={function() { setWater(i < water ? i : i + 1) }} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer', border: '2px solid ' + (i < water ? C.blue : '#e5e7eb'), background: i < water ? C.blueLight : '#fafafa' }}>💧</button>
              })}
            </div>
          </div>
        </Section>

        <Section title="מעקב צעדים" icon="🚶" accent={C.purple} light={C.purpleLight}>
          <div style={{ padding: '10px 0' }}>
            <input type="number" value={steps} onChange={function(e) { setSteps(e.target.value) }} placeholder="הכניסי מספר צעדים..." style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
            <div style={{ marginTop: 8, height: 8, background: '#f3f4f6', borderRadius: 99 }}>
              <div style={{ width: Math.min(100, Math.round((parseInt(steps) || 0) / 10000 * 100)) + '%', height: '100%', background: C.purple, borderRadius: 99 }} />
            </div>
          </div>
        </Section>

        <Section title="כללים חשובים" icon="📋" accent={C.amber} light={C.amberLight}>
          <div style={{ paddingTop: 8 }}>
            {PLAN.rules.map(function(r, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < PLAN.rules.length - 1 ? '1px solid #fef3c7' : 'none' }}>
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <span style={{ fontSize: 13.5, color: '#333', lineHeight: 1.6, flex: 1, textAlign: 'right' }}>{r.text}</span>
                </div>
              )
            })}
          </div>
        </Section>

        <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10, textAlign: 'right' }}>הערה יומית לאתי</div>
          <textarea value={note} onChange={function(e) { setNote(e.target.value) }} placeholder="כתבי כאן איך הרגשת היום, קשיים, שאלות..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 16, borderRadius: 16, background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>
          {saving ? 'שומרת...' : saved ? 'נשמר! אתי תראה את זה' : 'שמרי את היום שלי'}
        </button>

        <button onClick={function() { setSetupDone(false) }} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 8, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
          עדכני העדפות תזונה
        </button>
        <button onClick={function() { setProfileDone(false) }} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
          עדכני פרטים אישיים
        </button>
      </div>
    </div>
  )
}

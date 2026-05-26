'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  orange: '#f97316', orangeLight: '#fff7ed',
  purple: '#9333ea', purpleLight: '#faf5ff',
  blue: '#0284c7', blueLight: '#eff6ff',
  amber: '#d97706', amberLight: '#fffbeb',
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

const PLAN = {
  bokerSnack: 'לפני: נס קפה + חטיף בריאות עד 99 קל',
  boker: [
    { id: 'b1', text: 'משקה חלבון', tags: [] },
    { id: 'b2', text: 'חטיף חלבון', tags: [] },
    { id: 'b3', text: 'מעדן פרו + פרי / ברנפלקס 10 גרם', tags: ['vegan'] },
    { id: 'b4', text: '3 פריכיות + 3 כפיות קוטג + חצי כפית דבש', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b5', text: 'חצי גביע קוטג / גבינה לבנה + ירקות', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b6', text: 'פיתה בוסמין / 4 פריכיות / 2 פרוסות לחם קל', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'b7', text: 'ביצים קשות / חביתה', tags: [], hide: ['vegan', 'no_eggs'] },
    { id: 'b8', text: 'אבוקדו + ירקות', tags: ['vegan', 'keto'] },
  ],
  carbOptions: [
    { id: 'c1', text: '150 גרם אורז / קינואה', hide: ['keto', 'no_gluten'] },
    { id: 'c2', text: '200 גרם בורגול / אטריות שעועית', hide: ['keto', 'no_gluten'] },
    { id: 'c3', text: '110 גרם פתיתים / קוסקוס', hide: ['keto', 'no_gluten'] },
    { id: 'c4', text: '170 גרם תפוחי אדמה / בטטה', hide: ['keto'] },
    { id: 'c5', text: '150 גרם כרובית / ברוקולי (קיטו)', tags: ['keto'] },
  ],
  protOptions: [
    { id: 'p1', text: '200 גרם דג לבן', hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p2', text: '100 גרם סלמון', hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p3', text: '150 גרם טופו', tags: ['vegan'] },
    { id: 'p4', text: '100 גרם סינטה / 120 גרם פרגית', hide: ['vegan', 'vegetarian', 'keto'] },
    { id: 'p5', text: '140 גרם ירך עוף / 100 גרם בשר טחון', hide: ['vegan', 'vegetarian'] },
    { id: 'p6', text: '2 המבורגר צמחוני 99 קל', tags: ['vegan'] },
    { id: 'p7', text: '200 גרם דג שמן / סלמון (קיטו)', tags: ['keto'], hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p8', text: '3 ביצים / אומלט', hide: ['vegan', 'no_eggs'] },
  ],
  fatOptions: [
    { id: 'f1', text: '10 גרם שמן זית', tags: ['vegan', 'keto'] },
    { id: 'f2', text: '10 גרם טחינה', tags: ['vegan'] },
    { id: 'f3', text: '50 גרם אבוקדו', tags: ['vegan', 'keto'] },
    { id: 'f4', text: '30 גרם אגוזים / שקדים', tags: ['vegan', 'keto'], hide: ['no_nuts'] },
    { id: 'f5', text: '30 גרם גבינה צהובה', hide: ['vegan', 'no_lactose'] },
  ],
  erev: [
    { id: 'e1', text: 'גביע קוטג 3% / גבינה לבנה + ירקות', hide: ['vegan', 'no_lactose'] },
    { id: 'e2', text: '50 גרם ברנפלקס + 150 מל חלב', hide: ['vegan', 'no_lactose', 'keto'] },
    { id: 'e3', text: '5 דפי אורז', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'e4', text: 'פיתה / 4 פריכיות / 2 פרוסות לחם קל', hide: ['keto', 'no_gluten'] },
    { id: 'e5', text: 'סלט ירקות + טחינה / שמן זית', tags: ['vegan', 'keto'] },
    { id: 'e6', text: 'יוגורט יווני + פירות יער', hide: ['vegan', 'no_lactose', 'keto'] },
  ],
  rules: [
    { icon: '💧', text: 'לפחות 2-3 ליטר מים ביום' },
    { icon: '☕', text: 'עד 2 קפה ביום' },
    { icon: '🥦', text: 'עד 400 גרם ירקות ביום' },
    { icon: '🔄', text: 'ניתן להחליף בין הארוחות - לא להוסיף שום דבר' },
    { icon: '🍳', text: 'בישול בתרסיס שמן בלבד!' },
    { icon: '😴', text: '7 שעות שינה לפחות' },
    { icon: '🚶', text: '10,000 צעדים ביום' },
  ],
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

function Section({ title, icon, accent, light, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
      <button onClick={function() { setOpen(function(o) { return !o }) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? light : '#fff', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
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
    <textarea
      value={value}
      onChange={function(e) { onChange(e.target.value) }}
      placeholder={placeholder || 'הוסיפי פרטים נוספים...'}
      rows={2}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 8, color: '#555' }}
    />
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
  const [checks, setChecks] = useState({})
  const [carbSel, setCarbSel] = useState(null)
  const [protSel, setProtSel] = useState(null)
  const [fatSel, setFatSel] = useState(null)
  const [lunchOpt, setLunchOpt] = useState(null)
  const [water, setWater] = useState(0)
  const [steps, setSteps] = useState('')
  const [note, setNote] = useState('')
  const [bokerFree, setBokerFree] = useState('')
  const [lunchFree, setLunchFree] = useState('')
  const [erevFree, setErevFree] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(function() {
    async function load() {
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
        setLunchOpt(todayLog.data.lunch_opt)
        setWater(todayLog.data.water || 0)
        setSteps(todayLog.data.steps || '')
        setNote(todayLog.data.note || '')
        setBokerFree(todayLog.data.boker_free || '')
        setLunchFree(todayLog.data.lunch_free || '')
        setErevFree(todayLog.data.erev_free || '')
        setFeedback(todayLog.data.trainer_feedback)
      }
    }
    if (dbKey) load()
  }, [dbKey, todayKey])

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
      lunch_opt: lunchOpt,
      water: water,
      steps: steps,
      note: note,
      boker_free: bokerFree,
      lunch_free: lunchFree,
      erev_free: erevFree,
      diet_type: dietType,
      restrictions: restrictions,
      updated_at: new Date().toISOString(),
    }
   const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
if (error) { alert('שגיאה: ' + error.message) } else { alert('נשמר!') }
    setSaving(false)
    setSaved(true)
    setTimeout(function() { setSaved(false) }, 3000)
  }

  const filteredBoker = PLAN.boker.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredProt = PLAN.protOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredErev = PLAN.erev.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredCarbs = PLAN.carbOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })
  const filteredFat = PLAN.fatOptions.filter(function(i) { return !shouldHide(i, dietType, restrictions) })

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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '24px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#86efac', marginBottom: 2 }}>בין הראש לצלחת · אתי אטל</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>היי {displayName.split(' ')[0]}!</div>
          <div style={{ fontSize: 12, color: '#bbf7d0', marginTop: 2 }}>{today}</div>
          <div style={{ marginTop: 14, background: '#ffffff20', borderRadius: 10, height: 8, overflow: 'hidden' }}>
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
          {filteredBoker.map(function(item) {
            return <CheckRow key={item.id} id={item.id} text={item.text} accent={C.orange} checked={!!checks[item.id]} onToggle={toggleCheck} />
          })}
          <FreeText value={bokerFree} onChange={setBokerFree} placeholder="אכלתי גם / פרטים נוספים על הבוקר..." />
        </Section>

        <Section title="ארוחת צהריים" icon="🌞" accent={C.greenMid} light={C.greenLight}>
          <div style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
            {['A', 'B'].map(function(opt) {
              return (
                <button key={opt} onClick={function() { setLunchOpt(lunchOpt === opt ? null : opt) }} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '2px solid ' + (lunchOpt === opt ? C.greenMid : '#e5e7eb'), background: lunchOpt === opt ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: lunchOpt === opt ? C.greenDark : '#555' }}>
                  {opt === 'A' ? 'אופציה A' : 'אופציה B'}
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
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>שומן:</div>
              {filteredFat.map(function(o) { return <RadioRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} selected={fatSel} onSelect={setFatSel} /> })}
            </div>
          )}
          <FreeText value={lunchFree} onChange={setLunchFree} placeholder="אכלתי גם / פרטים נוספים על הצהריים..." />
        </Section>

        <Section title="ביניים" icon="🌤" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0', fontSize: 14, color: '#333', lineHeight: 1.8, textAlign: 'right' }}>קפה + 150 קלוריות חופשיות</div>
        </Section>

        <Section title="ארוחת ערב" icon="🌙" accent={C.purple} light={C.purpleLight}>
          {filteredErev.map(function(item) {
            return <CheckRow key={item.id} id={item.id} text={item.text} accent={C.purple} checked={!!checks[item.id]} onToggle={toggleCheck} />
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

        <Section title="מעקב צעדים" icon="🚶‍♀️" accent={C.purple} light={C.purpleLight}>
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
      </div>
    </div>
  )
}

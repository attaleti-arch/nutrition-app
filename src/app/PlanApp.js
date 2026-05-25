'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
const NAMES = {'Esterika26':'אתי','Riki1':'ריקי','Rucha2':'רוחה'}

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  orange: '#f97316', orangeLight: '#fff7ed',
  purple: '#9333ea', purpleLight: '#faf5ff',
  blue: '#0284c7', blueLight: '#eff6ff',
  amber: '#d97706', amberLight: '#fffbeb',
}

const PLAN = {
  bokerSnack: 'לפני: נס קפה + חטיף בריאות עד 99 קל',
  boker: [
    { id: 'b1', text: 'משקה חלבון' },
    { id: 'b2', text: 'חטיף חלבון' },
    { id: 'b3', text: 'מעדן פרו + פרי / ברנפלקס 10 גרם' },
    { id: 'b4', text: '3 פריכיות + 3 כפיות קוטג׳ + חצי כפית דבש' },
    { id: 'b5', text: 'חצי גביע קוטג׳ / גבינה לבנה + ירקות' },
    { id: 'b6', text: 'פיתה בוסמין / 4 פריכיות / 2 פרוסות לחם קל / 5 פתית שוודי' },
  ],
  bokerExtra: '+ ביצה + חלבון / טונה במים / 2 פרוסות גבינה צהובה 9% / 100 גרם פסטרמה 1-2%',
  carbOptions: [
    { id: 'c1', text: '150 גרם אורז / קינואה 🌱' },
    { id: 'c2', text: '200 גרם בורגול / אטריות שעועית 🌱' },
    { id: 'c3', text: '110 גרם פתיתים / קוסקוס 🌱' },
    { id: 'c4', text: '170 גרם תפוחי אדמה / בטטה 🌱' },
  ],
  protOptions: [
    { id: 'p1', text: '200 גרם דג לבן 🐟' },
    { id: 'p2', text: '100 גרם סלמון 🐟' },
    { id: 'p3', text: '150 גרם טופו 🌱' },
    { id: 'p4', text: '100 גרם סינטה / 120 גרם פרגית 🍗' },
    { id: 'p5', text: '140 גרם ירך עוף / 100 גרם בשר טחון 🍗' },
    { id: 'p6', text: '2 שניצל תירס / 2 המבורגר צמחוני 99 קל 🌱' },
  ],
  fatOptions: [
    { id: 'f1', text: '10 גרם שמן זית 🌱' },
    { id: 'f2', text: '10 גרם טחינה 🌱' },
    { id: 'f3', text: '350 גרם אבוקדו 🌱' },
  ],
  erev: [
    { id: 'e1', text: 'גביע קוטג׳ 3% / גבינה לבנה + ירקות' },
    { id: 'e2', text: '50 גרם ברנפלקס ללא תוספת סוכר + 150 מ״ל חלב' },
    { id: 'e3', text: '5 דפי אורז' },
    { id: 'e4', text: 'פיתה בוסמין / 4 פריכיות / 2 פרוסות לחם קל / 5 פתית שוודי' },
  ],
  erevExtra: '+ ביצה + חלבון / טונה במים / 2 פרוסות גבינה צהובה 9% / 100 גרם פסטרמה 1-2%',
  rules: [
    { icon: '💧', text: 'לפחות 2-3 ליטר מים ביום' },
    { icon: '☕', text: 'עד 2 קפה ביום' },
    { icon: '🥦', text: 'עד 400 גרם ירקות ביום' },
    { icon: '🔄', text: 'ניתן להחליף בין הארוחות – לא להוסיף שום דבר' },
    { icon: '🍳', text: 'בישול בתרסיס שמן בלבד!' },
    { icon: '😴', text: '7 שעות שינה לפחות' },
    { icon: '🚶', text: '10,000 צעדים ביום' },
  ],
}

function Section({ title, icon, accent, light, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${open ? accent : '#f0f0f0'}`, boxShadow: open ? `0 4px 20px ${accent}20` : '0 2px 8px #0000000a', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? light : '#fff', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
        <span style={{ color: accent, fontSize: 18, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', display: 'inline-block' }}>⌄</span>
      </button>
      {open && <div style={{ padding: '4px 18px 16px', borderTop: `1px solid ${light}` }}>{children}</div>}
    </div>
  )
}

function CheckRow({ id, text, accent, checked, onToggle }) {
  return (
    <div onClick={() => onToggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 0.45 : 1 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? accent : '#d1d5db'}`, background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: '#222', textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function RadioRow({ id, text, accent, selected, onSelect }) {
  const active = selected === id
  return (
    <div onClick={() => onSelect(active ? null : id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
      <div style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${active ? accent : '#d1d5db'}`, background: active ? accent : '#fff', flexShrink: 0, transition: 'all 0.15s' }} />
      <span style={{ fontSize: 14, color: active ? accent : '#222', fontWeight: active ? 700 : 400, flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function NoteBox({ text, accent, light }) {
  return (
    <div style={{ margin: '10px 0 0', padding: '10px 14px', background: light, borderRadius: 10, borderRight: `3px solid ${accent}`, fontSize: 13, color: '#444', lineHeight: 1.7 }}>{text}</div>
  )
}

export default function PlanApp({ clientName: raw }) {
const NAMES = {'Esterika26':'אתי','Riki1':'ריקי','Rucha2':'רוחה'}
const clientName = NAMES[raw] || raw
  const today = new Date().toLocaleDateString('he-IL')
  const todayKey = new Date().toISOString().split('T')[0]

  const [checks, setChecks] = useState({})
  const [carbSel, setCarbSel] = useState(null)
  const [protSel, setProtSel] = useState(null)
  const [fatSel, setFatSel] = useState(null)
  const [lunchOpt, setLunchOpt] = useState(null) // 'A' or 'B'
  const [water, setWater] = useState(0)
  const [steps, setSteps] = useState('')
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load today's data
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('client_name', clientName)
        .eq('log_date', todayKey)
        .single()
      if (data) {
        setChecks(data.checks || {})
        setCarbSel(data.carb_sel)
        setProtSel(data.prot_sel)
        setFatSel(data.fat_sel)
        setLunchOpt(data.lunch_opt)
        setWater(data.water || 0)
        setSteps(data.steps || '')
        setNote(data.note || '')
        setFeedback(data.trainer_feedback)
      }
    }
    if (clientName) load()
  }, [clientName, todayKey])

  const toggleCheck = (id) => setChecks(c => ({ ...c, [id]: !c[id] }))

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      client_name: clientName,
      log_date: todayKey,
      checks,
      carb_sel: carbSel,
      prot_sel: protSel,
      fat_sel: fatSel,
      lunch_opt: lunchOpt,
      water,
      steps,
      note,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalItems = PLAN.boker.length + PLAN.erev.length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '24px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#86efac', marginBottom: 2 }}>בין הראש לצלחת · אתי אטל</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>היי {clientName.split(' ')[0]}! 👋</div>
          <div style={{ fontSize: 12, color: '#bbf7d0', marginTop: 2 }}>{today}</div>
          {/* Progress */}
          <div style={{ marginTop: 14, background: '#ffffff20', borderRadius: 10, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((checkedCount / totalItems) * 100)}%`, height: '100%', background: '#4ade80', borderRadius: 10, transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>{checkedCount}/{totalItems} פריטים סומנו היום</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 14px 80px' }}>

        {/* Feedback from trainer */}
        {feedback && (
          <div style={{ background: '#fefce8', border: '2px solid #fbbf24', borderRadius: 14, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>💬 משוב מאתי:</div>
            <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.7 }}>{feedback}</div>
          </div>
        )}

        {/* BOKER */}
        <Section title="ארוחת בוקר" icon="☀️" accent={C.orange} light={C.orangeLight} defaultOpen>
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0 4px', textAlign: 'right' }}>{PLAN.bokerSnack}</div>
          {PLAN.boker.map(item => (
            <CheckRow key={item.id} {...item} accent={C.orange} checked={!!checks[item.id]} onToggle={toggleCheck} />
          ))}
          <NoteBox text={PLAN.bokerExtra} accent={C.orange} light={C.orangeLight} />
        </Section>

        {/* TZAHARAYIM */}
        <Section title="ארוחת צהריים" icon="🌞" accent={C.greenMid} light={C.greenLight}>
          <div style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
            {['A', 'B'].map(opt => (
              <button key={opt} onClick={() => setLunchOpt(lunchOpt === opt ? null : opt)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 12,
                border: `2px solid ${lunchOpt === opt ? C.greenMid : '#e5e7eb'}`,
                background: lunchOpt === opt ? C.greenLight : '#fafafa',
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
                color: lunchOpt === opt ? C.greenDark : '#555',
              }}>
                {opt === 'A' ? '🌾 אופציה A – דגנים + חלבון' : '🫒 אופציה B – שמן / טחינה'}
              </button>
            ))}
          </div>

          {lunchOpt === 'A' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>פחמימה – בחרי אחת:</div>
              {PLAN.carbOptions.map(o => <RadioRow key={o.id} {...o} accent={C.greenMid} selected={carbSel} onSelect={setCarbSel} />)}
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '10px 0 2px', textAlign: 'right' }}>חלבון – בחרי אחת:</div>
              {PLAN.protOptions.map(o => <RadioRow key={o.id} {...o} accent={C.greenMid} selected={protSel} onSelect={setProtSel} />)}
              <NoteBox text="+ 50 גרם שעועית ירוקה" accent={C.greenMid} light={C.greenLight} />
            </>
          )}
          {lunchOpt === 'B' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>בחרי אחת:</div>
              {PLAN.fatOptions.map(o => <RadioRow key={o.id} {...o} accent={C.greenMid} selected={fatSel} onSelect={setFatSel} />)}
              <NoteBox text="+ 50 גרם שעועית ירוקה" accent={C.greenMid} light={C.greenLight} />
            </>
          )}
        </Section>

        {/* BEINAYIM */}
        <Section title="ביניים" icon="🌤" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0', fontSize: 14, color: '#333', lineHeight: 1.8, textAlign: 'right' }}>
            קפה + 150 קלוריות חופשיות:<br />
            <span style={{ color: C.blue, fontWeight: 600 }}>חטיף בריאות / פרי / שקית נשנוש / יוגורט</span>
          </div>
        </Section>

        {/* EREV */}
        <Section title="ארוחת ערב" icon="🌙" accent={C.purple} light={C.purpleLight}>
          {PLAN.erev.map(item => (
            <CheckRow key={item.id} {...item} accent={C.purple} checked={!!checks[item.id]} onToggle={toggleCheck} />
          ))}
          <NoteBox text={PLAN.erevExtra} accent={C.purple} light={C.purpleLight} />
        </Section>

        {/* WATER */}
        <Section title="מעקב שתייה" icon="💧" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 8, textAlign: 'right' }}>{water}/8 כוסות · יעד 2-3 ליטר</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <button key={i} onClick={() => setWater(i < water ? i : i + 1)} style={{
                  width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer',
                  border: `2px solid ${i < water ? C.blue : '#e5e7eb'}`,
                  background: i < water ? C.blueLight : '#fafafa',
                }}>💧</button>
              ))}
            </div>
            {water >= 8 && <div style={{ marginTop: 8, color: C.blue, fontWeight: 700, fontSize: 13 }}>🎉 כל הכבוד! הגעת ליעד!</div>}
          </div>
        </Section>

        {/* STEPS */}
        <Section title="מעקב צעדים" icon="🚶‍♀️" accent={C.purple} light={C.purpleLight}>
          <div style={{ padding: '10px 0' }}>
            <input type="number" value={steps} onChange={e => setSteps(e.target.value)}
              placeholder="הכניסי מספר צעדים..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
            <div style={{ marginTop: 8, height: 8, background: '#f3f4f6', borderRadius: 99 }}>
              <div style={{ width: `${Math.min(100, Math.round((parseInt(steps)||0)/10000*100))}%`, height: '100%', background: C.purple, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>{Math.min(100,Math.round((parseInt(steps)||0)/10000*100))}% מהיעד</div>
          </div>
        </Section>

        {/* RULES */}
        <Section title="כללים חשובים" icon="📋" accent={C.amber} light={C.amberLight}>
          <div style={{ paddingTop: 8 }}>
            {PLAN.rules.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < PLAN.rules.length-1 ? '1px solid #fef3c7' : 'none' }}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                <span style={{ fontSize: 13.5, color: '#333', lineHeight: 1.6, flex: 1, textAlign: 'right' }}>{r.text}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* DAILY NOTE */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10, textAlign: 'right' }}>📝 הערה יומית לאתי</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="כתבי כאן איך הרגשת היום, קשיים, שאלות..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'Heebo, sans-serif', textAlign: 'right', boxSizing: 'border-box' }}
          />
        </div>

        {/* SAVE BUTTON */}
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: 16, borderRadius: 16,
          background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f4c2a,#16a34a)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 17,
          boxShadow: '0 4px 20px #16a34a44', transition: 'all 0.2s',
        }}>
          {saving ? '⏳ שומרת...' : saved ? '✅ נשמר! אתי תראה את זה' : '💾 שמרי את היום שלי'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 16 }}>
          כל התכנים בלעדיים · © בין הראש לצלחת · אתי אטל
        </div>
      </div>
    </div>
  )
}

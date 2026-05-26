'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

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

function Section({ title, icon, children }) {
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
  { key: 'glucose', label: 'סוכר בצום', unit: 'mg/dL', normal: '70-100' },
  { key: 'hba1c', label: 'המוגלובין מסוכרר HbA1c', unit: '%', normal: '<5.7' },
  { key: 'cholesterol', label: 'כולסטרול כללי', unit: 'mg/dL', normal: '<200' },
  { key: 'hdl', label: 'כולסטרול טוב HDL', unit: 'mg/dL', normal: '>60' },
  { key: 'ldl', label: 'כולסטרול רע LDL', unit: 'mg/dL', normal: '<100' },
  { key: 'triglycerides', label: 'טריגליצרידים', unit: 'mg/dL', normal: '<150' },
  { key: 'hemoglobin', label: 'המוגלובין', unit: 'g/dL', normal: 'נשים: 12-16' },
  { key: 'ferritin', label: 'פריטין (ברזל)', unit: 'ng/mL', normal: '12-150' },
  { key: 'vitamin_d', label: 'ויטמין D', unit: 'ng/mL', normal: '30-100' },
  { key: 'vitamin_b12', label: 'ויטמין B12', unit: 'pg/mL', normal: '200-900' },
  { key: 'tsh', label: 'בלוטת התריס TSH', unit: 'mIU/L', normal: '0.4-4.0' },
  { key: 'crp', label: 'דלקת CRP', unit: 'mg/L', normal: '<1.0' },
]

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [profile, setProfile] = useState({})
  const [nutritionItems, setNutritionItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('questionnaire')
  const [scanLoading, setScanLoading] = useState(false)

  const login = () => { if (pin === 'Esterika26') setAuth(true) }

  useEffect(function() {
    if (auth) loadClients()
  }, [auth])

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  async function loadProfile(client) {
    setSelectedClient(client)
    setProfile({})
    const { data } = await supabase.from('client_profiles').select('*').eq('client_password', client.password).maybeSingle()
    if (data) setProfile(data)
    else setProfile({ client_password: client.password, blood_tests: {} })

    const { data: nd } = await supabase.from('nutrition_data').select('*').order('id')
    setNutritionItems(nd || [])
  }

  function updateProfile(field, value) {
    setProfile(p => ({ ...p, [field]: value }))
  }

  function updateBloodTest(key, value) {
    setProfile(p => ({ ...p, blood_tests: { ...(p.blood_tests || {}), [key]: value } }))
  }

  async function saveProfile() {
    setSaving(true)
    var payload = { ...profile, client_password: selectedClient.password, updated_at: new Date().toISOString() }
    await supabase.from('client_profiles').upsert(payload, { onConflict: 'client_password' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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

      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
              { type: 'text', text: 'זהו דף בדיקות דם. חלץ את הערכים הבאים אם קיימים ותחזיר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_d":null,"vitamin_b12":null,"tsh":null,"crp":null}\nהחזר רק את המספרים ללא יחידות. אם ערך לא קיים השאר null.' }
            ]
          }]
        })
      })

      var data = await response.json()
      var text = data.content[0].text
      var clean = text.replace(/```json|```/g, '').trim()
      var parsed = JSON.parse(clean)
      var newTests = Object.assign({}, profile.blood_tests || {})
      Object.keys(parsed).forEach(function(k) { if (parsed[k] !== null) newTests[k] = String(parsed[k]) })
      setProfile(p => ({ ...p, blood_tests: newTests }))
    } catch(e) {
      alert('שגיאה בסריקה: ' + e.message)
    }
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ ניהול מטופלים</div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, border: '1.5px solid #f0f0f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>בחרי מטופל:</div>
          {clients.map(c => (
            <button key={c.id} onClick={() => loadProfile(c)} style={{
              display: 'block', width: '100%', textAlign: 'right',
              padding: '10px 14px', marginBottom: 6, borderRadius: 10,
              border: '2px solid ' + (selectedClient?.id === c.id ? '#0f4c2a' : '#e5e7eb'),
              background: selectedClient?.id === c.id ? '#dcfce7' : '#fff',
              cursor: 'pointer', fontWeight: 600, fontSize: 15
            }}>
              {c.name}
              {c.goal && <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>— {c.goal}</span>}
            </button>
          ))}
        </div>

        {selectedClient && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ k: 'questionnaire', l: '📋 שאלון 360' }, { k: 'blood', l: '🩸 בדיקות דם' }, { k: 'nutrition', l: '🥗 ערכי תזונה' }].map(function(t) {
                return (
                  <button key={t.k} onClick={() => setTab(t.k)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, border: '2px solid ' + (tab === t.k ? '#0f4c2a' : '#e5e7eb'),
                    background: tab === t.k ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    color: tab === t.k ? '#0f4c2a' : '#555'
                  }}>{t.l}</button>
                )
              })}
            </div>

            {tab === 'questionnaire' && (
              <>
                <Section title="פרטים כלליים ורפואיים" icon="👤">
                  <Field label="איכות שינה" value={profile.sleep_quality} onChange={v => updateProfile('sleep_quality', v)} rows={2} />
                  <Field label="בעיות שינה / התעוררות" value={profile.sleep_issues} onChange={v => updateProfile('sleep_issues', v)} rows={2} />
                  <Field label="פעילות מעיים (עצירות/שלשול)" value={profile.digestion} onChange={v => updateProfile('digestion', v)} rows={2} />
                  <Field label="מעשן/ת?" value={profile.smoking} onChange={v => updateProfile('smoking', v)} type="boolean" />
                  <Field label="תרופות / תוספי תזונה" value={profile.medications} onChange={v => updateProfile('medications', v)} rows={2} />
                  <Field label="מטפלים / תרפיסטים" value={profile.therapists} onChange={v => updateProfile('therapists', v)} rows={2} />
                  <Field label="היסטוריה רפואית (מחלות, אשפוזים, פציעות)" value={profile.medical_history} onChange={v => updateProfile('medical_history', v)} rows={3} />
                  <Field label="בריאות הורים (סכרת, לחץ דם, כולסטרול)" value={profile.family_history} onChange={v => updateProfile('family_history', v)} rows={2} />
                </Section>

                <Section title="הרגלי תזונה" icon="🍽️">
                  <Field label="ארוחת בוקר רגילה" value={profile.breakfast_habits} onChange={v => updateProfile('breakfast_habits', v)} rows={2} />
                  <Field label="ארוחת צהריים רגילה" value={profile.lunch_habits} onChange={v => updateProfile('lunch_habits', v)} rows={2} />
                  <Field label="ארוחת ערב רגילה" value={profile.dinner_habits} onChange={v => updateProfile('dinner_habits', v)} rows={2} />
                  <Field label="ביניים / נשנושים" value={profile.snack_habits} onChange={v => updateProfile('snack_habits', v)} rows={2} />
                  <Field label="רגישויות למזון" value={profile.food_sensitivities} onChange={v => updateProfile('food_sensitivities', v)} rows={2} />
                  <Field label="מבשל/ת בבית?" value={profile.cooks_at_home} onChange={v => updateProfile('cooks_at_home', v)} type="boolean" />
                  <Field label="כמה פעמים בשבוע במסעדה?" value={profile.restaurants_per_week} onChange={v => updateProfile('restaurants_per_week', v)} type="number" />
                  <Field label="ירקות/פירות שנמנע/ת מהם" value={profile.avoided_foods} onChange={v => updateProfile('avoided_foods', v)} rows={2} />
                </Section>

                <Section title="פעילות גופנית" icon="🏃">
                  <Field label="סוג פעילות גופנית ותדירות" value={profile.exercise_type} onChange={v => updateProfile('exercise_type', v)} rows={2} />
                  <Field label="כאבים המפריעים לתפקוד" value={profile.pain_issues} onChange={v => updateProfile('pain_issues', v)} rows={2} />
                </Section>

                <Section title="מטרות ו-NLP" icon="🎯">
                  <Field label="מה רוצה להשיג?" value={profile.main_goal} onChange={v => updateProfile('main_goal', v)} rows={3} />
                  <Field label="מה מעכב מלהשיג את זה?" value={profile.goal_obstacles} onChange={v => updateProfile('goal_obstacles', v)} rows={2} />
                  <Field label="מ-1 עד 10 כמה רוצה להשיג את המטרה?" value={profile.goal_motivation} onChange={v => updateProfile('goal_motivation', parseInt(v))} type="number" />
                  <Field label="איך תיראה ההצלחה?" value={profile.success_vision} onChange={v => updateProfile('success_vision', v)} rows={3} />
                  <Field label="מה חשוב לך?" value={profile.important_values} onChange={v => updateProfile('important_values', v)} rows={2} />
                  <Field label="אירועים חיוביים בולטים" value={profile.positive_memories} onChange={v => updateProfile('positive_memories', v)} rows={3} />
                </Section>
              </>
            )}

            {tab === 'blood' && (
              <>
                <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>📸 סריקת בדיקות דם עם AI</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>העלי תמונה/סריקה של הבדיקות — ה-AI ימלא את הערכים אוטומטית</div>
                  <input type="file" accept="image/*,application/pdf" onChange={e => e.target.files[0] && scanBloodTests(e.target.files[0])}
                    style={{ display: 'none' }} id="scan-input" />
                  <label htmlFor="scan-input" style={{ display: 'block', padding: 12, borderRadius: 10, background: '#f0fdf4', border: '2px dashed #16a34a', textAlign: 'center', cursor: 'pointer', fontWeight: 700, color: '#0f4c2a' }}>
                    {scanLoading ? '⏳ סורק...' : '📸 העלי תמונה של בדיקות דם'}
                  </label>
                </div>

                <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1.5px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>🩸 ערכי בדיקות דם</div>
                  <Field label="תאריך הבדיקות" value={profile.blood_tests_date} onChange={v => updateProfile('blood_tests_date', v)} type="date" />
                  {BLOOD_TESTS.map(function(test) {
                    var val = (profile.blood_tests || {})[test.key] || ''
                    return (
                      <div key={test.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{test.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>תקין: {test.normal} {test.unit}</div>
                        </div>
                        <input type="number" value={val} onChange={e => updateBloodTest(test.key, e.target.value)}
                          placeholder="ערך"
                          style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, textAlign: 'center', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>{test.unit}</div>
                      </div>
                    )
                  })}
                </div>
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
                  return (
                    <NutritionRow key={item.id} item={item} onSave={async function(updated) {
                      await supabase.from('nutrition_data').upsert(updated, { onConflict: 'id' })
                      const { data } = await supabase.from('nutrition_data').select('*').order('id')
                      setNutritionItems(data || [])
                    }} />
                  )
                })}
              </div>
            )}

            <button onClick={saveProfile} disabled={saving || tab === 'nutrition'} style={{
              width: '100%', padding: 14, borderRadius: 14, marginTop: 16,
              background: saved ? '#16a34a' : tab === 'nutrition' ? '#e5e7eb' : '#0f4c2a',
              color: tab === 'nutrition' ? '#9ca3af' : '#fff',
              border: 'none', cursor: tab === 'nutrition' ? 'default' : 'pointer', fontWeight: 700, fontSize: 16
            }}>
              {saving ? '⏳ שומר...' : saved ? '✅ נשמר!' : tab === 'nutrition' ? 'שמור בכל שורה בנפרד' : '💾 שמרי פרופיל'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function NutritionRow({ item, onSave }) {
  const [vals, setVals] = useState(item)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '8px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{item.name}</div>
      {['calories', 'protein', 'fat', 'fiber'].map(function(field) {
        return (
          <input key={field} type="number" value={vals[field] || 0}
            onChange={function(e) { setVals(function(v) { return { ...v, [field]: Number(e.target.value) } }) }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
        )
      })}
      <button onClick={async function() { setSaving(true); await onSave(vals); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        style={{ padding: '6px 10px', borderRadius: 8, background: saved ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
        {saving ? '...' : saved ? '✓' : 'שמור'}
      </button>
    </div>
  )
}

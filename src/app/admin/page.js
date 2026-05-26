'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  const login = () => {
    if (pin === 'Esterika26') setAuth(true)
  }

  useEffect(function() {
    if (auth) loadItems()
  }, [auth])

  async function loadItems() {
    const { data } = await supabase.from('nutrition_data').select('*').order('id')
    setItems(data || [])
  }

  async function saveItem(item) {
    setSaving(item.id)
    await supabase.from('nutrition_data').upsert(item, { onConflict: 'id' })
    setSaving(null)
    setSaved(item.id)
    setTimeout(() => setSaved(null), 2000)
  }

  function updateItem(id, field, value) {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', direction: 'rtl' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 300, textAlign: 'center', boxShadow: '0 8px 40px #0000000f' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>ניהול ערכי תזונה</div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="סיסמה..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
        <button onClick={login} style={{ width: '100%', padding: 12, borderRadius: 10, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>כניסה</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ ניהול ערכי תזונה</div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '10px 16px', background: '#f8fafc', fontWeight: 700, fontSize: 13, color: '#555', borderBottom: '1.5px solid #f0f0f0' }}>
            <div>פריט</div>
            <div style={{ textAlign: 'center' }}>קלוריות</div>
            <div style={{ textAlign: 'center' }}>חלבון</div>
            <div style={{ textAlign: 'center' }}>שומן</div>
            <div style={{ textAlign: 'center' }}>סיבים</div>
            <div></div>
          </div>

          {items.map(function(item) {
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '8px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{item.name}</div>
                {['calories', 'protein', 'fat', 'fiber'].map(function(field) {
                  return (
                    <input key={field} type="number" value={item[field] || 0}
                      onChange={function(e) { updateItem(item.id, field, Number(e.target.value)) }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
                  )
                })}
                <button onClick={function() { saveItem(item) }}
                  style={{ padding: '6px 10px', borderRadius: 8, background: saved === item.id ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {saving === item.id ? '...' : saved === item.id ? '✓' : 'שמור'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

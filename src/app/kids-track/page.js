'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

// מעקב מאמן הדרקון — עמוד למאמנת (אתי): מקלידים את קוד המשפחה
// ורואים את 14 הימים האחרונים של הילד.

const CHECK_LABELS = [
  { k: 'lp', label: 'חלבון צהריים', emoji: '🍗' },
  { k: 'lv', label: 'ירק צהריים', emoji: '🥦' },
  { k: 'lc', label: 'פחמימה', emoji: '🍚' },
  { k: 'dp', label: 'חלבון ערב', emoji: '🥚' },
  { k: 'dv', label: 'ירק ערב', emoji: '🥕' },
]

export default function KidsTrack() {
  const [code, setCode] = useState('')
  const [rows, setRows] = useState(null)
  const [parentName, setParentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    const c = code.trim()
    if (!c) return
    setLoading(true)
    setError('')
    try {
      const clientRes0 = await supabase.from('clients').select('name, password').ilike('password', c).limit(1)
      const clientRow = clientRes0.data && clientRes0.data[0]
      const canonical = clientRow?.password || c
      const logsRes = await supabase.from('daily_logs').select('log_date, checks')
        .eq('client_name', 'kid:' + canonical)
        .order('log_date', { ascending: false })
        .limit(14)
      const clientRes = { data: clientRow }
      if (!logsRes.data || logsRes.data.length === 0) {
        setRows([])
        setError('אין עדיין נתונים לקוד הזה — או שהילד עוד לא חיבר את קוד המשפחה באפליקציה')
      } else {
        setRows(logsRes.data)
      }
      setParentName(clientRes.data?.name || '')
    } catch (e) {
      setError('שגיאה בטעינה — נסי שוב')
    } finally {
      setLoading(false)
    }
  }

  const latest = rows && rows.length > 0 ? rows[0].checks : null

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, sans-serif', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>🐉 מעקב מאמן הדרקון</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>הקלידי את קוד המשפחה (הסיסמה של הלקוחה) לצפייה בהתקדמות הילד</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="קוד משפחה..."
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none' }} />
          <button onClick={fetchData} disabled={loading}
            style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            {loading ? '...' : 'הצגה'}
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', fontSize: 13.5, color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

        {latest && (
          <div style={{ background: 'linear-gradient(135deg,#e0f2fe,#f0fdf4)', borderRadius: 18, padding: '16px 20px', marginBottom: 16, border: '1.5px solid #bae6fd' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0c4a6e' }}>
              הדרקון "{latest.dragon_name}" {parentName && `· משפחת ${parentName}`}
            </div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>
              🌱 {latest.growth_days} ימי גדילה · 📸 {latest.photos || 0} תמונות באלבום
            </div>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '86px repeat(5, 1fr) 60px 54px', background: '#f1f5f9', padding: '10px 8px', fontSize: 10.5, fontWeight: 800, color: '#475569', gap: 2, alignItems: 'center' }}>
              <div>תאריך</div>
              {CHECK_LABELS.map(c => <div key={c.k} style={{ textAlign: 'center' }}>{c.emoji}</div>)}
              <div style={{ textAlign: 'center' }}>צעדים</div>
              <div style={{ textAlign: 'center' }}>גדל?</div>
            </div>
            {rows.map(r => {
              const c = r.checks || {}
              const ch = c.checks || {}
              return (
                <div key={r.log_date} style={{ display: 'grid', gridTemplateColumns: '86px repeat(5, 1fr) 60px 54px', padding: '10px 8px', fontSize: 12, borderTop: '1px solid #f1f5f9', gap: 2, alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>{r.log_date?.slice(5)}</div>
                  {CHECK_LABELS.map(cl => (
                    <div key={cl.k} style={{ textAlign: 'center', fontSize: 14 }}>
                      {ch[cl.k] ? '✅' : <span style={{ opacity: 0.25 }}>—</span>}
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', fontWeight: 700, color: (c.steps || 0) >= 7500 ? '#16a34a' : '#64748b' }}>
                    {(c.steps || 0) > 0 ? (c.steps >= 1000 ? (c.steps / 1000).toFixed(1) + 'K' : c.steps) : '—'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 14 }}>{c.grew ? '🎉' : ''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function AnalyzePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (pin !== 'Esterika26') return
    setAuth(true)
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  const loadLogs = async (idx) => {
    eq('client_name', client.password)
    if (!client) return
    setSelected(client)
    setAnalysis('')
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('client_name', client.name) // ✅ תוקן
      .order('log_date', { ascending: false })
      .limit(7)
    setLogs(data || [])
  }

  const analyze = async () => {
    if (!logs.length || !selected) return
    setLoading(true)
    const summary = logs.map(l => 'Date: ' + l.log_date + ', Note: ' + (l.note || '')).join('\n')
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected.name, logs: summary })
    })
    const data = await res.json()
    setAnalysis(data.result)
    setLoading(false)
  }

  if (!auth) return (
    <div style={{padding:40,textAlign:'center',direction:'rtl'}}>
      <h2>AI Analysis</h2>
      <input
        type="password"
        value={pin}
        onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        placeholder="password"
        style={{padding:10,fontSize:16,display:'block',width:'200px',margin:'10px auto'}}
      />
      <button onClick={login} style={{padding:'10px 20px',fontSize:16}}>Enter</button>
    </div>
  )

  // ✅ תוקן — return עם JSX מלא
  return (
    <div style={{padding:24,direction:'rtl',maxWidth:600,margin:'0 auto'}}>
      <h2 style={{marginBottom:16}}>🤖 ניתוח לקוחות</h2>

      {/* רשימת לקוחות */}
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:700,marginBottom:8}}>בחרי לקוח:</div>
        {clients.length === 0 && <div style={{color:'#9ca3af'}}>אין לקוחות</div>}
        {clients.map((c, i) => (
          <button
            key={c.id}
            onClick={() => loadLogs(i)}
            style={{
              display:'block',width:'100%',textAlign:'right',
              padding:'10px 14px',marginBottom:6,borderRadius:10,
              border: selected?.id === c.id ? '2px solid #0f4c2a' : '1.5px solid #e5e7eb',
              background: selected?.id === c.id ? '#dcfce7' : '#fff',
              cursor:'pointer',fontWeight:600,fontSize:15
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* לוגים */}
      {selected && (
        <div style={{marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:8}}>7 רשומות אחרונות של {selected.name}:</div>
          {logs.length === 0
            ? <div style={{color:'#9ca3af'}}>אין רשומות</div>
            : logs.map(l => (
                <div key={l.id} style={{background:'#f8fafc',borderRadius:10,padding:'8px 12px',marginBottom:6,fontSize:14}}>
                  <span style={{fontWeight:600}}>{l.log_date}</span>
                  {l.note && <span style={{color:'#6b7280'}}> — {l.note}</span>}
                </div>
              ))
          }
          <button
            onClick={analyze}
            disabled={loading || logs.length === 0}
            style={{
              width:'100%',padding:12,borderRadius:10,marginTop:8,
              background: loading ? '#9ca3af' : '#0f4c2a',
              color:'#fff',border:'none',cursor: loading ? 'default' : 'pointer',
              fontWeight:700,fontSize:15
            }}
          >
            {loading ? '⏳ מנתח...' : '🤖 נתחי עם AI'}
          </button>
        </div>
      )}

      {/* תוצאת ניתוח */}
      {analysis && (
        <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:14,padding:16,fontSize:15,lineHeight:1.7,whiteSpace:'pre-wrap'}}>
          {analysis}
        </div>
      )}
    </div>
  )
}

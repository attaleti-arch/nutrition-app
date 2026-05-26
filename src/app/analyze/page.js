'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

const PROT_NAMES = {
  p1: '200 גרם דג לבן', p2: '100 גרם סלמון', p3: '150 גרם טופו',
  p4: '100 גרם סינטה / 120 גרם פרגית', p5: '140 גרם ירך עוף',
  p6: 'המבורגר צמחוני', p7: 'דג שמן / סלמון', p8: '3 ביצים / אומלט'
}
const CARB_NAMES = {
  c1: '150 גרם אורז / קינואה', c2: '200 גרם בורגול', c3: '110 גרם פתיתים',
  c4: '170 גרם תפוחי אדמה / בטטה', c5: '150 גרם כרובית / ברוקולי'
}

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

  const loadLogs = async (client) => {
    setSelected(client)
    setAnalysis('')
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('client_name', client.password)
      .order('log_date', { ascending: false })
      .limit(7)
    setLogs(data || [])
  }

  const analyze = async () => {
    if (!logs.length || !selected) return
    setLoading(true)
    const summary = logs.map(function(l) {
      return 'תאריך: ' + l.log_date +
        ' | מים: ' + (l.water || 0) + ' כוסות' +
        ' | צעדים: ' + (l.steps || 0) +
        ' | פחמימה: ' + (CARB_NAMES[l.carb_sel] || l.carb_sel || 'לא נבחר') +
        ' | חלבון: ' + (PROT_NAMES[l.prot_sel] || l.prot_sel || 'לא נבחר') +
        ' | בוקר נוסף: ' + (l.boker_free || '') +
        ' | צהריים נוסף: ' + (l.lunch_free || '') +
        ' | ערב נוסף: ' + (l.erev_free || '') +
        ' | הערה: ' + (l.note || '')
    }).join('\n')

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
    <div style={{padding:40,textAlign:'center',direction:'rtl',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f0fdf4'}}>
      <div style={{fontSize:32,marginBottom:8}}>🥗</div>
      <h2 style={{marginBottom:20,color:'#0f4c2a'}}>ניתוח תזונה AI</h2>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        placeholder="סיסמה..."
        style={{padding:12,fontSize:16,borderRadius:12,border:'2px solid #e5e7eb',width:220,textAlign:'center',marginBottom:12,outline:'none'}} />
      <button onClick={login} style={{padding:'12px 32px',borderRadius:12,background:'#0f4c2a',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:16}}>כניסה</button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',direction:'rtl'}}>
      <div style={{background:'linear-gradient(135deg,#0f4c2a,#16a34a)',padding:'20px 24px',color:'#fff'}}>
        <div style={{fontSize:11,color:'#86efac'}}>בין הראש לצלחת</div>
        <div style={{fontSize:22,fontWeight:900}}>🤖 ניתוח תזונה AI</div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
          <div style={{fontWeight:700,marginBottom:10}}>בחרי לקוח:</div>
          {clients.map(c => (
            <button key={c.id} onClick={() => loadLogs(c)} style={{
              display:'block',width:'100%',textAlign:'right',
              padding:'10px 14px',marginBottom:6,borderRadius:10,
              border:'2px solid ' + (selected?.id === c.id ? '#0f4c2a' : '#e5e7eb'),
              background: selected?.id === c.id ? '#dcfce7' : '#fff',
              cursor:'pointer',fontWeight:600,fontSize:15
            }}>
              {c.name}
            </button>
          ))}
        </div>

        {selected && logs.length > 0 && (
          <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
            <div style={{fontWeight:700,marginBottom:8}}>📅 {logs.length} רשומות אחרונות:</div>
            {logs.map(l => (
              <div key={l.id} style={{padding:'6px 0',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#666'}}>
                {l.log_date} — מים: {l.water || 0} | צעדים: {l.steps || 0} | {PROT_NAMES[l.prot_sel] || 'אין חלבון'}
              </div>
            ))}
            <button onClick={analyze} disabled={loading} style={{
              width:'100%',padding:14,borderRadius:12,marginTop:12,
              background: loading ? '#9ca3af' : '#0f4c2a',
              color:'#fff',border:'none',cursor: loading ? 'default' : 'pointer',
              fontWeight:700,fontSize:16
            }}>
              {loading ? '⏳ מנתחת...' : '🤖 נתחי עם AI'}
            </button>
          </div>
        )}

        {selected && logs.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:30}}>אין רשומות עדיין</div>
        )}

        {analysis && (
          <div style={{background:'#fff',borderRadius:20,padding:20,border:'1.5px solid #f0f0f0',fontSize:15,lineHeight:1.8,whiteSpace:'pre-wrap'}}>
            {analysis}
          </div>
        )}
      </div>
    </div>
  )
}

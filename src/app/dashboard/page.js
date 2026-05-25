'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState(false)
  const [logs, setLogs] = useState([])
  const [feedback, setFeedback] = useState({})
  const [saving, setSaving] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function doLogin() {
    if (!password) return
    const { data, error } = await supabase
      .from('clients')
      .select('name')
      .eq('password', password)
      .single()

    if (data) {
      setAuth(true)
    } else if (password === 'Esterika26') {
      setAuth(true)
    } else {
      alert('סיסמה שגויה')
    }
  }

  async function loadLogs() {
    setLoading(true)
    setError(null)

    // ✅ תיקון 1: מוסיפים console.log לאבחון
    console.log('טוענת רשומות...')

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .order('log_date', { ascending: false })  // ✅ תיקון 2: מיון לפי תאריך הרשומה
      .limit(100)

    console.log('תוצאה:', data, 'שגיאה:', error)

    if (error) {
      setError('שגיאה בטעינת רשומות: ' + error.message)
      console.error('Supabase error:', error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { if (auth) loadLogs() }, [auth])

  async function saveFeedback(log) {
    setSaving(log.id)
    const { error } = await supabase
      .from('daily_logs')
      .update({ trainer_feedback: feedback[log.id] })
      .eq('id', log.id)
    
    if (error) alert('שגיאה בשמירה: ' + error.message)
    setSaving(null)
    loadLogs()
  }

  if (!auth) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}}>
      <div style={{background:'#fff',borderRadius:20,padding:32,boxShadow:'0 8px 40px #0000000f',width:300,textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:12}}>🔐</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:20}}>דשבורד מאמנת</div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="סיסמה..."
          style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:15,textAlign:'center',outline:'none',boxSizing:'border-box',marginBottom:10}}
        />
        <button onClick={doLogin} style={{width:'100%',padding:12,borderRadius:10,background:'#0f4c2a',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:15}}>
          כניסה
        </button>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',direction:'rtl'}}>
      <div style={{background:'linear-gradient(135deg,#0f4c2a,#16a34a)',padding:'20px 24px',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,color:'#86efac'}}>בין הראש לצלחת</div>
          <div style={{fontSize:22,fontWeight:900}}>דשבורד מאמנת</div>
        </div>
        <button onClick={loadLogs} style={{background:'#ffffff20',border:'1px solid #ffffff44',borderRadius:10,color:'#fff',padding:'8px 14px',cursor:'pointer',fontSize:13}}>
          🔄 רענן
        </button>
      </div>

      <div style={{maxWidth:700,margin:'0 auto',padding:'20px 16px'}}>

        {/* ✅ תיקון 3: הצגת שגיאות */}
        {error && (
          <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,padding:'12px 16px',marginBottom:16,color:'#991b1b',fontSize:14}}>
            ⚠️ {error}
            <div style={{marginTop:8,fontSize:12,color:'#b91c1c'}}>
              בדקי ב-Supabase: Table Editor → daily_logs → RLS Policies
            </div>
          </div>
        )}

        {loading && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:40}}>
            ⏳ טוענת רשומות...
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:40,background:'#fff',borderRadius:18,border:'1.5px solid #f0f0f0'}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{fontWeight:600,marginBottom:4}}>אין רשומות</div>
            <div style={{fontSize:13}}>ייתכן שבעיית הרשאות RLS ב-Supabase</div>
          </div>
        )}

        {logs.map(log => (
          <div key={log.id} style={{background:'#fff',borderRadius:18,marginBottom:12,border:'1.5px solid #f0f0f0',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #f3f4f6'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                {log.client_name?.[0] || '?'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16}}>{log.client_name}</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{log.log_date}</div>
              </div>
              {log.trainer_feedback && (
                <div style={{fontSize:11,background:'#dcfce7',color:'#166534',borderRadius:8,padding:'2px 8px'}}>✓ נענה</div>
              )}
            </div>
            {log.note && (
              <div style={{padding:'8px 18px',fontSize:13,color:'#78350f',background:'#fffbeb'}}>
                💬 {log.note}
              </div>
            )}
            <div style={{padding:'12px 18px'}}>
              <textarea
                value={feedback[log.id] != null ? feedback[log.id] : (log.trainer_feedback || '')}
                onChange={e => setFeedback(f => ({...f, [log.id]: e.target.value}))}
                placeholder="כתבי משוב..."
                rows={2}
                style={{width:'100%',padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:14,resize:'none',outline:'none',textAlign:'right',boxSizing:'border-box',marginBottom:8}}
              />
              <button
                onClick={() => saveFeedback(log)}
                style={{width:'100%',padding:10,borderRadius:10,background:'#0f4c2a',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}
              >
                {saving === log.id ? '⏳ שומר...' : '✉️ שלחי משוב'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

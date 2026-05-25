'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function AnalyzePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState('')
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (pin !== 'Esterika26') return
    setAuth(true)
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  const loadLogs = async (name) => {
    setSelected(name)
    setAnalysis('')
    const { data } = await supabase.from('daily_logs').select('*')..eq('client_name', clients.find(c=>c.name===name)?.password || name)
    setLogs(data || [])
  }

  const analyze = async () => {
    if (!logs.length) return
    setLoading(true)
    const summary = logs.map(l => 'Date: ' + l.log_date + ', Note: ' + (l.note || '')).join('\n')
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected, logs: summary })
    })
    const data = await res.json()
    setAnalysis(data.result)
    setLoading(false)
  }

  if (!auth) return (
    <div style={{padding:40,textAlign:'center',direction:'rtl'}}>
      <h2>AI Analysis</h2>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="password" style={{padding:10,fontSize:16,display:'block',width:'200px',margin:'10px auto'}}/>
      <button onClick={login} style={{padding:'10px 20px',fontSize:16}}>Enter</button>
    </div>
  )

  return (
    <div style={{padding:24,direction:'rtl',maxWidth:600,margin:'0 auto'}}>
      <h2>AI Nutrition Analysis</h2>
      <select value={selected} onChange={e=>loadLogs(e.target.value)} style={{padding:10,fontSize:16,width:'100%',marginBottom:16}}>
        <option value="">Select client</option>
        {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
      {logs.length > 0 && (
        <div>
          <p>{logs.length} days found</p>
          <button onClick={analyze} disabled={loading} style={{padding:'12px 24px',fontSize:16,background:'#3D8B63',color:'white',border:'none',borderRadius:10,cursor:'pointer',width:'100%'}}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      )}
      {analysis && (
        <div style={{marginTop:24,padding:20,background:'#f0faf4',borderRadius:12,whiteSpace:'pre-wrap'}}>
          {analysis}
        </div>
      )}
    </div>
  )
}

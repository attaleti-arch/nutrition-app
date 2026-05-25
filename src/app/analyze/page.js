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
        style={{padding:10,fontSize:16,display:'block',width:'200px',margin

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')

  useEffect(() => {
    if (auth) {
      supabase.from('clients').select('*').then(({ data }) => setClients(data || []))
    }
  }, [auth])

  const addClient = async () => {
    if (!newName || !newPass) return
    await supabase.from('clients').insert({ name: newName, password: newPass })
    setNewName('')
    setNewPass('')
    supabase.from('clients').select('*').then(({ data }) => setClients(data || []))
  }

  if (!auth) {
    return (
      <div style={{ padding: 40, textAlign: 'center', direction: 'rtl' }}>
        <h2>עמוד מנהלת</h2>
        <input
          type="password"
          placeholder="סיסמה"
          value={pin}
          onChange={e => setPin(e.target.value)}
          style={{ padding: 10, fontSize: 16, marginBottom: 10, display: 'block', width: '100%' }}
        />
        <button onClick={() => pin === 'Esterika26' && setAuth(true)} style={{ padding: 10, fontSize: 16 }}>
          כניסה
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, direction: 'rtl' }}>
      <h2>לקוחות</h2>
      <input placeholder="שם" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: 8, marginLeft: 8 }} />
      <input placeholder="סיסמה" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ padding: 8, marginLeft: 8 }} />
      <button onClick={addClient} style={{ padding: 8 }}>הוסיפי</button>
      <ul>
        {clients.map(c => (
          <li key={c.id}>{c.name} - {c.password}</li>
        ))}
      </ul>
    </div>
  )
}

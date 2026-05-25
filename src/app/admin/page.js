'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')
  const [msg, setMsg] = useState('')

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at')
    setClients(data || [])
  }

  useEffect(() => { if (auth) loadClients() }, [auth])


    if (!newName || !newPass) return
    await supabase.from('clients').insert({ name: newName, password: newPass })
    setMsg('נוספה! ' + newName)
    setNewName('')
    setNewPass('')
    loadClients()
  }

  const deleteClient = async (id, name) => {
    await supabase.from('clients').delete().eq('id', id)
    setMsg(name + ' נמחקה')
    loadClients()
  }

  if (!auth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', direction:'rtl' }}>
      <div style={{ background:'#fff', padding:40, borderRadius:20, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', textAlign:'center' }}>
        <div style={{ fontSize:40 }}>🔐</div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:20 }}>עמוד מנהלת</div>
        <input
          type="password"
          placeholder="סיסמת מנהלת"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pin === 'Esterika26' && setAuth(true)}
          style={{ padding:'10px 16px', borderRadius:10, border:'1.5px solid #ddd', fontSize:16, width:'100%', marginBottom:12, boxSizing:'border-box' }}
        />
        <button
          onClick={() => pin === 'Esterika26' && setAuth(true)}
          style={{ width:'100%', padding:12, background:'#3D8B63', color:'#fff', border:'none', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}
        >
          כניסה
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', direction:'rtl', padding:24 }}>
      <div style={{ maxWidth:500, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,#3D8B63,#5BAF84)', padding:'20px 24px', borderRadius:16, color:'#fff', marginBottom:24 }}>
          <div style={{ fontSize:12, opacity:0.8 }}>בין הראש לצלחת</div>
          <div style={{ fontSize:22, fontWeight:800 }}>עמוד מנהלת</div>
        </div>

        {msg && (
          <div style={{ background:'#EBF6F0', padding:12, borderRadius:10, marginBottom:16, color:'#3D8B63', fontWeight:600 }}>
            {msg}
          </div>
        )}

        <div style={{ background:'#fff', borderRadius:16, padding:20, marginBottom:20, border:'1.5px solid #EDE8E0' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>הוספת לקוחה חדשה</div>
          <input
            placeholder="שם מלא"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #ddd', fontSize:15, marginBottom:10, boxSizing:'border-box' }}
          />
          <input
            placeholder="סיסמה (לדוגמה: Sara3)"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #ddd', fontSize:15, marginBottom:12, boxSizing:'border-box' }}
          />
          <button
            onClick={addClient}
            style={{ width:'100%', padding:12, background:'#3D8B63', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}
          >
            הוסיפי לקוחה
          </button>
        </div>

        <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1.5px solid #EDE8E0' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>לקוחות ({clients.length})</div>
          {clients.length === 0 && (
            <div style={{ color:'#999', textAlign:'center' }}>אין לקוחות עדיין</div>
          )}
          {clients.map(c => (
            <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #EDE8E0' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{c.name}</div>
                <div style={{ fontSize:12, color:'#999' }}>סיסמה: {c.password}</div>
              </div>
              <button
                onClick={() => deleteClient(c.id, c.name)}
                style={{ background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13 }}
              >
                מחקי
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

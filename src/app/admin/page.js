'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [list, setList] = useState([])
  const [msg, setMsg] = useState('')

  const login = () => {
    if (pin === 'Esterika26') {
      setAuth(true)
      load()
    }
  }

  const load = () => {
    supabase.from('clients').select('*').then(r => setList(r.data || []))
  }

  const add = () => {
    if (!name || !pass) return
    supabase.from('clients').insert([{ name, password: pass }]).then(() => {
      setMsg('נוספה: ' + name)
      setName('')
      setPass('')
      load()
    })
  }

  if (!auth) return (
    <div style={{padding:40,textAlign:'center',direction:'rtl'}}>
      <h2>מנהלת</h2>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="סיסמה" style={{padding:10,fontSize:16,display:'block',width:'200px',margin:'10px auto'}}/>
      <button onClick={login} style={{padding:'10px 20px',fontSize:16}}>כניסה</button>
    </div>
  )

  return (
    <div style={{padding:24,direction:'rtl',maxWidth:400,margin:'0 auto'}}>
      <h2>הוספת לקוחה</h2>
      {msg && <p style={{color:'green'}}>{msg}</p>}
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="שם" style={{padding:8,display:'block',width:'100%',marginBottom:8}}/>
      <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="סיסמה" style={{padding:8,display:'block',width:'100%',marginBottom:8}}/>
      <button onClick={add} style={{padding:'10px 20px',fontSize:16,background:'green',color:'white',border:'none',cursor:'pointer'}}>הוסיפי</button>
      <h3>לקוחות:</h3>
      {list.map(c=><div key={c.id} style={{padding:8,borderBottom:'1px solid #ddd'}}>{c.name} — {c.password}</div>)}
    </div>
  )
}

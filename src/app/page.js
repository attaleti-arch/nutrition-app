'use client'
import { useState } from 'react'
import { supabase } from './supabase'
import PlanApp from './PlanApp'

export default function Home() {
  const [password, setPassword] = useState('')
  const [clientName, setClientName] = useState('')
  const [started, setStarted] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    if (!password.trim()) return
    const { data } = await supabase.from('clients').select('name').eq('password', password.trim()).single()
    if (data) {
      setClientName(data.name)
      setStarted(true)
    } else {
      setError('סיסמה לא נמצאה, נסי שוב')
    }
  }

  if (started) return <PlanApp clientName={clientName} />

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#f0fdf4,#eff6ff)',padding:24}}>
      <div style={{fontSize:28,fontWeight:900,marginBottom:20}}>בין הראש לצלחת</div>
      <div style={{fontSize:14,color:'#6b7280',marginBottom:30}}>אתי אטל - תוכנית תזונה אישית</div>
      <input value={password} onChange={function(e){setPassword(e.target.value);setError('')}}
        onKeyDown={function(e){if(e.key==='Enter') handleStart()}}
        placeholder="הכניסי את הסיסמה שלך..."
        style={{padding:'12px 16px',borderRadius:12,fontSize:16,border:'2px solid #e5e7eb',width:280,textAlign:'right',marginBottom:12,outline:'none'}} />
      {error && <div style={{color:'red',marginBottom:8,fontSize:14}}>{error}</div>}
      <button onClick={handleStart}
        style={{padding:'13px 40px',borderRadius:12,background:password.trim()?'#16a34a':'#e5e7eb',color:password.trim()?'#fff':'#9ca3af',border:'none',cursor:'pointer',fontSize:16,fontWeight:700}}>
        {password.trim() ? 'בואי נתחיל!' : 'הכניסי סיסמה להמשך'}
      </button>
    </div>
  )
}

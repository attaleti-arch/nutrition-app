'use client'
import { useState } from 'react'
import PlanApp from './PlanApp'

export default function Home() {
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  if (started) return <PlanApp clientName={name} />
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#f0fdf4,#eff6ff)',padding:24}}>
      <div style={{fontSize:28,fontWeight:900,marginBottom:20}}>בין הראש לצלחת</div>
      <div style={{fontSize:14,color:'#6b7280',marginBottom:30}}>אתי אטל · תוכנית תזונה אישית</div>
      <input value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&name.trim()&&setStarted(true)}
        placeholder="שם מלא..."
        style={{padding:'12px 16px',borderRadius:12,fontSize:16,border:'2px solid #e5e7eb',width:280,textAlign:'right',marginBottom:12,outline:'none'}} />
      <button onClick={()=>name.trim()&&setStarted(true)}
        style={{padding:'13px 40px',borderRadius:12,background:name.trim()?'#16a34a':'#e5e7eb',color:name.trim()?'#fff':'#9ca3af',border:'none',cursor:'pointer',fontSize:16,fontWeight:700}}>
        {name.trim()?`בואי נתחיל! 💪`:'הכניסי שם להמשך'}
      </button>
    </div>
  )
}

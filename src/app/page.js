'use client' 
import { useState } from 'react'
import PlanApp from './PlanApp'

export default function Home() {
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  if (started) return <PlanApp clientName={name} />
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div>
        <h1>בין הראש לצלחת</h1>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="שמך..." />
        <button onClick={()=>name&&setStarted(true)}>התחילי</button>
      </div>
    </div>
  )
}

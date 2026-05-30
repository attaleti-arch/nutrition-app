'use client'
import { useState } from 'react'

export default function PlanApp({ clientName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState(1)

  const sendMessage = async () => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, history: messages }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'user', content: input }, { role: 'assistant', content: data.reply }])
    setInput('')
  }

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0f4c2a' }}>שלום {clientName}</h1>
      
      {/* אזור הוידאו - כאן תוכלי להוסיף את הלינק לוידאו מהאדמין */}
      <div style={{ background: '#eee', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 20 }}>
        [וידאו הסבר למטופלת]
      </div>

      {/* אזור המזווה ורשימות */}
      <div style={{ background: '#fff7ed', padding: 20, borderRadius: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18 }}>המזווה המתוכנן שלי</h2>
        <ul>
          <li>קטניות ודגנים מלאים</li>
          <li>ירקות שורש טריים</li>
        </ul>
      </div>

      {/* אזור הצ'אט */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 20 }}>
        {messages.map((m, i) => <p key={i}><b>{m.role === 'user' ? 'אני:' : 'קלוד:'}</b> {m.content}</p>)}
        <input value={input} onChange={(e) => setInput(e.target.value)} style={{ width: '70%' }} />
        <button onClick={sendMessage}>שלחי</button>
      </div>
    </div>
  )
}

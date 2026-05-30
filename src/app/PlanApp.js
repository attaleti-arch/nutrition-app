'use client'
import { useState } from 'react'

export default function PlanApp({ clientName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const sendMessage = async () => {
    // כאן אנחנו קוראים לנתיב ה-API שיצרנו למעלה
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input, history: messages }),
    })
    const data = await res.json()
    setMessages([...messages, { role: 'user', content: input }, { role: 'assistant', content: data.reply }])
    setInput('')
  }

  return (
    <div style={{ padding: 20, direction: 'rtl' }}>
      <h1>שלום {clientName}</h1>
      {/* כאן תוכלי להציג את הממשק שבנינו */}
    </div>
  )
}

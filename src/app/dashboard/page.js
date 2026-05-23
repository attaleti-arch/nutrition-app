'use client'
import { useState } from 'react'
import PlanApp from '../PlanApp'

export default function Home() {
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)

  if (started) return <PlanApp clientName={name} />

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#f0fdf4 0%,#faf5ff 50%,#eff6ff 100%)',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 14px',
          background: 'linear-gradient(135deg,#16a34a,#9333ea)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, boxShadow: '0 8px 24px #16a34a33',
        }}>🥗</div>
        <div style={{ fontWeight: 900, fontSize: 24, color: '#111' }}>בין הראש לצלחת</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>אתי אטל · תוכנית תזונה אישית</div>
      </div>

      <div style={{
        background: '#fff', borderRadius: 22, padding: '32px 28px',
        boxShadow: '0 8px 40px #0000000f', width: '100%', maxWidth: 380,
        border: '1.5px solid #f0fdf4',
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#111', marginBottom: 6 }}>שלום! מה שמך?</div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 18 }}>הכניסי את שמך כדי להתחיל</div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && setStarted(true)}
          placeholder="שם מלא..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 16,
            border: '2px solid #e5e7eb', fontFamily: 'Heebo, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => name.trim() && setStarted(true)}
          disabled={!name.trim()}
          style={{
            width: '100%', marginTop: 14, padding: 13, borderRadius: 12,
            background: name.trim() ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#e5e7eb',
            color: name.trim() ? '#fff' : '#9ca3af', border: 'none',
            cursor: name.trim() ? 'pointer' : 'default',
            fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 16,
            boxShadow: name.trim() ? '0 4px 16px #16a34a44' : 'none',
          }}
        >
          {name.trim() ? `בואי נתחיל, ${name.trim().split(' ')[0]}! 💪` : 'הכניסי שם להמשך'}
        </button>
      </div>
      <div style={{ marginTop: 20, fontSize: 11, color: '#d1d5db' }}>
        כל התכנים בלעדיים · © בין הראש לצלחת
      </div>
    </div>
  )
}

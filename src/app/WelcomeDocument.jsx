'use client'
import { useState, useEffect } from 'react'

function LoadingSteps() {
  const [step, setStep] = useState(0)
  const steps = [
    'מנתחת בדיקות דם...',
    'בונה פרוטוקול תזונתי...',
    'מכינה המלצות אישיות...',
    'כמעט מוכן! 🌿'
  ]
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 6000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ fontSize: 13, color: '#9ca3af', transition: 'opacity 0.3s' }}>
      {steps[step]}
    </div>
  )
}

function SmartPlate({ protein, carbs, fat, veggies }) {
  const p = protein || 30
  const c = carbs || 20
  const f = fat || 15
  const v = veggies || 50

  const segments = [
    { label: 'ירקות', pct: v, color: '#4a9b8e', emoji: '🥦' },
    { label: 'חלבון', pct: p, color: '#c4956a', emoji: '🍗' },
    { label: 'פחמימה', pct: c, color: '#e8b84b', emoji: '🌾' },
    { label: 'שומן', pct: f, color: '#7ab87a', emoji: '🫒' },
  ]

  function polarToCartesian(cx, cy, r, angle) {
    const rad = (angle - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arcPath(cx, cy, r, startAngle, endAngle) {
    const s = polarToCartesian(cx, cy, r, startAngle)
    const e = polarToCartesian(cx, cy, r, endAngle)
    const large = endAngle - startAngle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`
  }

  let currentAngle = 0
  const paths = segments.map(seg => {
    const sweep = (seg.pct / 100) * 360
    const path = arcPath(100, 100, 88, currentAngle, currentAngle + sweep)
    const midAngle = currentAngle + sweep / 2
    const labelPos = polarToCartesian(100, 100, 58, midAngle)
    currentAngle += sweep
    return { ...seg, path, labelPos }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', transform: 'translateY(6px) scale(0.95)', filter: 'blur(8px)' }} />
        <svg width="220" height="220" viewBox="0 0 200 200" style={{ position: 'relative', zIndex: 1 }}>
          <circle cx="100" cy="100" r="96" fill="#f8f4ef" stroke="#e8e0d5" strokeWidth="2" />
          <circle cx="100" cy="100" r="88" fill="white" />
          {paths.map((seg, i) => (
            <g key={i}>
              <path d={seg.path} fill={seg.color} opacity="0.85" />
              <text x={seg.labelPos.x} y={seg.labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="18" style={{ userSelect: 'none' }}>{seg.emoji}</text>
            </g>
          ))}
          <circle cx="100" cy="100" r="28" fill="white" stroke="#f0ebe3" strokeWidth="2" />
          <text x="100" y="97" textAnchor="middle" fontSize="9" fill="#9aa" fontWeight="600" fontFamily="sans-serif">הצלחת</text>
          <text x="100" y="108" textAnchor="middle" fontSize="9" fill="#9aa" fontWeight="600" fontFamily="sans-serif">החכמה</text>
          <circle cx="100" cy="100" r="96" fill="none" stroke="#e8e0d5" strokeWidth="2" />
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', width: '100%', maxWidth: 280 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{seg.emoji} {seg.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: seg.color, marginRight: 'auto' }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#e8f5f2)', borderRadius: 12, padding: '10px 16px', width: '100%', maxWidth: 280, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#4a9b8e', fontWeight: 700, marginBottom: 4 }}>סדר אכילה מומלץ</div>
        <div style={{ fontSize: 13, color: '#333' }}>חלבון + ירקות → שומן → פחמימה</div>
      </div>
    </div>
  )
}

function MedicalCard({ title, icon, physio, eat, avoid, exercise, color, light }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${color}30`, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: `linear-gradient(135deg,${color}15,${light})`, padding: '14px 18px', borderBottom: `1px solid ${color}20` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>{title}</div>
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        {physio && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>מה קורה בגוף</div><div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>{physio}</div></div>}
        {eat && eat.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✅ חשוב לשלב יום-יום</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {eat.map((item, i) => <span key={i} style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', borderRadius: 20, padding: '3px 10px', border: '1px solid #bbf7d0', fontWeight: 500 }}>{item}</span>)}
            </div>
          </div>
        )}
        {avoid && avoid.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ רצוי להימנע</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {avoid.map((item, i) => <span key={i} style={{ fontSize: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 20, padding: '3px 10px', border: '1px solid #fecaca', fontWeight: 500 }}>{item}</span>)}
            </div>
          </div>
        )}
        {exercise && <div style={{ background: `${color}10`, borderRadius: 10, padding: '10px 14px' }}><div style={{ fontSize: 11, fontWeight: 700, color: color, marginBottom: 4 }}>🏃 המלצות כושר</div><div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{exercise}</div></div>}
      </div>
    </div>
  )
}

function BloodDeficitCard({ name, value, normal, meaning, recommendation, icon }) {
  return (
    <div style={{ background: '#fffbeb', borderRadius: 14, border: '1.5px solid #fcd34d', padding: '12px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>{name}</div>
          {value && <div style={{ fontSize: 11, color: '#b45309' }}>נמדד: {value} | תקין: {normal}</div>}
        </div>
      </div>
      {meaning && <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6, marginBottom: 6 }}>{meaning}</div>}
      {recommendation && <div style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '6px 10px', fontWeight: 500 }}>💚 {recommendation}</div>}
    </div>
  )
}

function DefaultDocument({ clientName, onClose }) {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'sans-serif', maxWidth: 520, margin: '0 auto', padding: '0 14px 100px' }}>
      <div style={{ background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', borderRadius: '0 0 24px 24px', padding: '28px 24px 32px', marginBottom: 20, color: '#fff', textAlign: 'center' }}>
        <img src="/logo.png" alt="אתי אטל" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)', marginBottom: 12, background: '#fff' }} />
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>מסמך הפתיחה שלך 🌿</div>
        <div style={{ fontSize: 13, color: '#b2dfdb' }}>היי {clientName ? clientName.split(' ')[0] : ''}! ברוכה הבאה לתוכנית</div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#80cbc4' }}>שיטת אתי אטל · בין הראש לצלחת</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f0f0f0', padding: '20px 18px', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 4, textAlign: 'center' }}>🍽️ הצלחת החכמה של אתי</div>
        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>תותאם אישית אחרי השאלון</div>
        <SmartPlate protein={30} carbs={20} fat={15} veggies={50} />
      </div>
      <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', marginBottom: 12 }}>✨ עקרונות הליבה</div>
        {[
          { icon: '🥦', text: 'חצי צלחת ירקות — תמיד ובכל ארוחה' },
          { icon: '🍗', text: 'חלבון בכל ארוחה — מונע רעב ושומר שריר' },
          { icon: '🫒', text: 'שומן טוב מהצומח — שמן זית, אבוקדו, טחינה' },
          { icon: '🌾', text: 'פחמימה מורכבת בלבד — בטטה, קינואה, אורז מלא' },
          { icon: '💧', text: '2-3 ליטר מים ביום' },
          { icon: '🚶', text: '10,000 צעדים — הבסיס של הכל' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>{item.text}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#e8f5f2)', borderRadius: 16, border: '1.5px solid #86efac', padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🌿</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#166534', marginBottom: 6 }}>המסמך האישי שלך בדרך!</div>
        <div style={{ fontSize: 13, color: '#4b7c59', lineHeight: 1.7 }}>לאחר מילוי שאלון 360 ובדיקות הדם — יוצר עבורך מסמך מותאם אישית.</div>
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #f0f0f0', zIndex: 100 }}>
        <button onClick={onClose} style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'block', padding: '15px', borderRadius: 16, background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, boxShadow: '0 4px 20px rgba(74,155,142,0.4)' }}>
          הבנתי! נתחיל 🚀
        </button>
      </div>
    </div>
  )
}

export default function WelcomeDocument({ clientPassword, clientName, onContinue }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    generateDocument()
  }, [clientPassword])

  async function generateDocument() {
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'welcomeDoc', clientPassword, clientName })
      })
      const result = await res.json()
      if (result.data) setData(result.data)
      else setData(null)
    } catch (e) {
      setData(null)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9b8e,#3a7a6e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🌿</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#3a7a6e' }}>מכינה את המסמך האישי שלך...</div>
      <LoadingSteps />
    </div>
  )

  if (!data) return <DefaultDocument clientName={clientName} onClose={onContinue} />

  const { plate, medicalCards, bloodDeficits, greeting, name } = data

  return (
    <div style={{ direction: 'rtl', fontFamily: 'sans-serif', maxWidth: 520, margin: '0 auto', padding: '0 14px 100px' }}>
      <div style={{ background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', borderRadius: '0 0 24px 24px', padding: '28px 24px 32px', marginBottom: 20, color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <img src="/logo.png" alt="אתי אטל" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)', marginBottom: 12, background: '#fff' }} />
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>מסמך הפתיחה שלך 🌿</div>
        <div style={{ fontSize: 13, color: '#b2dfdb', lineHeight: 1.6 }}>{greeting || `היי ${name || clientName}!`}</div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#80cbc4' }}>שיטת אתי אטל · מבוסס שאלון 360 ובדיקות דם</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f0f0f0', padding: '20px 18px', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 4, textAlign: 'center' }}>🍽️ הצלחת החכמה שלך</div>
        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>מותאמת אישית לפי המצב הרפואי שלך</div>
        <SmartPlate protein={plate?.protein} carbs={plate?.carbs} fat={plate?.fat} veggies={plate?.veggies} />
      </div>

      {bloodDeficits && bloodDeficits.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 12 }}>🩸 מה אומרות הבדיקות</div>
          {bloodDeficits.map((def, i) => <BloodDeficitCard key={i} {...def} />)}
        </div>
      )}

      {medicalCards && medicalCards.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 12 }}>💊 פרוטוקול אישי לפי המצב הרפואי</div>
          {medicalCards.map((card, i) => <MedicalCard key={i} {...card} />)}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #f0f0f0', zIndex: 100 }}>
        <button onClick={onContinue} style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'block', padding: '15px', borderRadius: 16, background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 16, boxShadow: '0 4px 20px rgba(74,155,142,0.4)' }}>
          הבנתי! נתחיל 🚀
        </button>
      </div>
    </div>
  )
}

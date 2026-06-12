'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const BG  = ['#f0fdf4','#eff6ff','#fffbeb','#fef2f2','#faf5ff','#f0fdfa','#fff7ed']
const BD  = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0d9488','#f97316']
const TC  = ['#15803d','#1d4ed8','#b45309','#b91c1c','#6d28d9','#0f766e','#c2410c']

const JOURNEY_SECTIONS = [
  { title: '🌱 חלק 1 — הגדרת המטרה', questions: [
    { label: 'מה הביא אותך לכאן?', key: 'goal_reason' },
    { label: 'מה את רוצה? איך את רוצה להשתנות?', key: 'goal_what' },
    { label: 'באיזה הקשר? מתי? עם מי? איפה?', key: 'goal_context' },
    { label: 'למה זה חשוב לך?', key: 'goal_why' },
    { label: 'איך תדעי שהגעת?', key: 'goal_proof' },
  ]},
  { title: '✨ חלק 2 — החזון הסנסורי', questions: [
    { label: 'מה את רואה סביבך כשאת פוקחת עיניים?', key: 'vision_see' },
    { label: 'מה את שומעת?', key: 'vision_hear' },
    { label: 'מהי התחושה הגופנית המדויקת?', key: 'vision_feel' },
  ]},
  { title: '🌿 חלק 3 — הרמוניה ואיזון', questions: [
    { label: 'כשתשיגי את המטרה — האם תפסידי משהו?', key: 'ecology_keep' },
    { label: 'איך תשמרי על מה שחשוב לך בתוך השינוי?', key: 'ecology_harmony' },
    { label: 'במי תלויה השגת המטרה?', key: 'ecology_who' },
  ]},
  { title: '🔍 חלק 4 — חשיפת היתד', questions: [
    { label: 'מה גורם לך להרגיש שזה קשה?', key: 'belief_hard' },
    { label: 'מתי החלטת שזה המצב?', key: 'belief_when' },
  ]},
  { title: '💎 חלק 5 — ארגז הכלים', questions: [
    { label: 'אילו משאבים כבר יש לך?', key: 'resources_has' },
    { label: 'רגע שהיית מרוצה מעצמך — מה היה שם?', key: 'resources_past' },
  ]},
  { title: '🛡️ חלק 6 — החיסונים וההתחייבות', questions: [
    { label: 'הרגע הכי קשה ביום', key: 'vaccine_moment' },
    { label: 'הפעולה הקטנה שמתחייבת', key: 'vaccine_action' },
    { label: 'משפט העוגן', key: 'vaccine_anchor' },
    { label: 'הצעד הראשון לשבוע הקרוב', key: 'first_step' },
  ]},
]

function renderAnalysis(text) {
  if (!text) return null
  const blocks = []
  let current = null
  text.split('\n').forEach(line => {
    if (/^##\s/.test(line)) {
      if (current) blocks.push(current)
      current = { title: line.replace(/^##\s*/, '').trim(), lines: [] }
    } else if (current && !/^---$/.test(line)) {
      current.lines.push(line)
    }
  })
  if (current) blocks.push(current)
  return blocks.map((b, i) => (
    <div key={i} style={{ background: BG[i % BG.length], border: `1.5px solid ${BD[i % BD.length]}`, borderRadius: 14, padding: '16px 20px', marginBottom: 14, pageBreakInside: 'avoid' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: TC[i % TC.length], marginBottom: 10 }}>{b.title}</div>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.9, direction: 'rtl' }}>
        {b.lines.map((line, j) => {
          if (!line.trim()) return <br key={j} />
          const parts = line.split(/\*\*(.+?)\*\*/g)
          return <div key={j}>{parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}</div>
        })}
      </div>
    </div>
  ))
}

export default function PrintPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientPw = params.get('client')
    const type = params.get('type') || 'journey'
    if (!clientPw) { setError('חסר פרמטר client'); setLoading(false); return }

    async function load() {
      const { data: client } = await supabase.from('clients').select('*').eq('password', clientPw).maybeSingle()
      const { data: profile } = await supabase.from('client_profiles').select('*').eq('client_password', clientPw).maybeSingle()
      if (!client) { setError('לקוח לא נמצא'); setLoading(false); return }
      setData({ client, profile, type })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#6b7280' }}>⏳ טוען...</div>
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>
  if (!data) return null

  const { client, profile, type } = data
  const ja = profile?.journey_answers || {}
  const analysis = profile?.journey_analysis || ''
  const date = new Date().toLocaleDateString('he-IL')

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Arial, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 15mm; }
      `}</style>

      {/* Print bar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0f4c2a', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {type === 'journey' ? '🧭 מסע המטרה' : type} — {client.name} {client.last_name || ''}
        </div>
        <button onClick={() => window.print()} style={{ padding: '8px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          🖨️ הדפס / שמור PDF
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0f4c2a', marginBottom: 4 }}>בין הראש לצלחת</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>אתי אטל — תוכנית תזונה אישית</div>
        </div>

        {/* Client header */}
        <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', borderRadius: 16, padding: '20px 28px', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{client.name} {client.last_name || ''}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>📅 {date} | 🧭 שאלון מסע המטרה</div>
        </div>

        {/* Questions & Answers */}
        {type === 'journey' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20 }}>שאלות ותשובות</div>
            {JOURNEY_SECTIONS.map((sec, si) => {
              const hasAnswers = sec.questions.some(q => ja[q.key])
              if (!hasAnswers) return null
              return (
                <div key={si} style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', marginBottom: 18, border: `1.5px solid ${BD[si % BD.length]}`, pageBreakInside: 'avoid' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: TC[si % TC.length], marginBottom: 14 }}>{sec.title}</div>
                  {sec.questions.map(q => {
                    if (!ja[q.key]) return null
                    return (
                      <div key={q.key} style={{ marginBottom: 14, paddingRight: 12, borderRight: `3px solid ${BD[si % BD.length]}` }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 5 }}>{q.label}</div>
                        <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.8 }}>{ja[q.key]}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {analysis && (
              <>
                <div className="page-break" style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20, marginTop: 32 }}>
                  ניתוח לפגישה
                </div>
                {renderAnalysis(analysis)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

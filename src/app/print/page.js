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

const ROOTS_LABELS = {
  home_background: 'הבית שגדלת בו',
  family_identity: 'זהות וגוף במשפחה',
  today_patterns: 'דפוסים היום',
  forward_passing: 'מה עובר הלאה',
  beliefs_motivation: 'אמונות ומוטיבציה',
  resources: 'משאבים וכוחות',
}

const BODY_LABELS = {
  body_signals: 'מה הגוף אומר היום',
  body_history: 'היסטוריה של הגוף',
  emotion_body: 'קשר רגש-גוף',
  energy_sleep: 'אנרגיה ושינה',
  hunger_satiety: 'רעב ושובע',
  already_knows: 'מה היא כבר יודעת',
  main_complaint: 'מה הגוף שלה צועק עליו',
}

const CHILD_LABELS = {
  child_self: 'הילד עצמו',
  state_of_mind: 'סטייט אוף מיינד',
  family_dynamics: 'דינמיקה משפחתית',
  parent_model: 'ההורה כמודל',
  triggers_social: 'טריגרים וחברתי',
}

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

function renderNotes(notes, labels, color) {
  if (!notes || typeof notes !== 'object') return null
  return Object.entries(labels).map(([key, label], i) => {
    const value = notes[key]
    if (!value) return null
    return (
      <div key={key} style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', marginBottom: 18, border: `1.5px solid ${BD[i % BD.length]}`, pageBreakInside: 'avoid' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: TC[i % TC.length], marginBottom: 10 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.8, paddingRight: 12, borderRight: `3px solid ${BD[i % BD.length]}` }}>{value}</div>
      </div>
    )
  })
}

export default function PrintPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editedAnalysis, setEditedAnalysis] = useState('')
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [savedAnalysis, setSavedAnalysis] = useState(false)
  const [sendingToClient, setSendingToClient] = useState(false)
  const [sentToClient, setSentToClient] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientPw = params.get('client')
    const type = params.get('type') || 'journey'
    if (!clientPw) { setError('חסר פרמטר client'); setLoading(false); return }

    async function load() {
      const { data: client } = await supabase.from('clients').select('*').eq('password', clientPw).maybeSingle()
      const { data: profile } = await supabase.from('client_profiles').select('*').eq('client_password', clientPw).maybeSingle()
      if (!client) { setError('לקוח לא נמצא'); setLoading(false); return }
      setData({ client, profile, type, sd: profile?.sessions_data || {} })
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!data) return
    const { type, sd, profile } = data
    const src = type === 'journey' ? (profile?.journey_analysis || '')
      : type === 'roots' ? (sd.roots_analysis || '')
      : type === 'body' ? (sd.body_analysis || '')
      : type === 'child' ? (sd.child_analysis || '')
      : ''
    setEditedAnalysis(src)
  }, [data])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#6b7280' }}>⏳ טוען...</div>
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>
  if (!data) return null

  const { client, profile, type, sd } = data

  async function saveAnalysis() {
    setSavingAnalysis(true)
    if (type === 'journey') {
      await supabase.from('client_profiles').update({ journey_analysis: editedAnalysis }).eq('client_password', client.password)
    } else {
      const newSd = { ...sd, [type + '_analysis']: editedAnalysis }
      await supabase.from('client_profiles').update({ sessions_data: newSd }).eq('client_password', client.password)
    }
    setSavingAnalysis(false); setSavedAnalysis(true); setTimeout(() => setSavedAnalysis(false), 3000)
  }

  async function sendToClient() {
    setSendingToClient(true)
    if (type === 'journey') {
      await supabase.from('clients').update({ outcome_doc: editedAnalysis }).eq('id', client.id)
    } else {
      await supabase.from('client_profiles').update({ [type + '_feedback']: editedAnalysis, [type + '_feedback_at']: new Date().toISOString() }).eq('client_password', client.password)
    }
    setSendingToClient(false); setSentToClient(true); setTimeout(() => setSentToClient(false), 3000)
  }
  const ja = profile?.journey_answers || {}
  const analysis = profile?.journey_analysis || ''
  const date = new Date().toLocaleDateString('he-IL')

  const typeTitle = type === 'journey' ? '🧭 מסע המטרה'
    : type === 'roots' ? '🌱 שאלון השורשים'
    : type === 'body' ? '🩺 הגוף מדבר'
    : type === 'child' ? '👨‍👩‍👧 הורה-ילד'
    : type

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
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0f4c2a', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {typeTitle} — {client.name} {client.last_name || ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🖨️ הדפס / שמור PDF
          </button>
          <button onClick={() => setEditMode(e => !e)} style={{ padding: '8px 14px', background: editMode ? '#f59e0b' : '#1e6b3f', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {editMode ? '👁️ תצוגה' : '✏️ ערכי'}
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 14px', background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ✕ סגור
          </button>
        </div>
      </div>

      {editMode && (
        <div className="no-print" style={{ background: '#fffbeb', borderBottom: '2px solid #f59e0b', padding: '10px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={saveAnalysis} disabled={savingAnalysis} style={{ padding: '8px 18px', background: savedAnalysis ? '#16a34a' : '#0f4c2a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {savingAnalysis ? '⏳...' : savedAnalysis ? '✅ נשמר!' : '💾 שמרי שינויים'}
          </button>
          <button onClick={sendToClient} disabled={sendingToClient} style={{ padding: '8px 18px', background: sentToClient ? '#16a34a' : '#c4956a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {sendingToClient ? '⏳...' : sentToClient ? '✅ נשלח ללקוחה!' : '📤 שלחי ללקוחה'}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0f4c2a', marginBottom: 4 }}>בין הראש לצלחת</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>אתי אטל — תוכנית תזונה אישית</div>
        </div>

        {/* Client header */}
        <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', borderRadius: 16, padding: '20px 28px', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{client.name} {client.last_name || ''}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>📅 {date} | {typeTitle}</div>
        </div>

        {/* Journey */}
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

            {(analysis || editedAnalysis) && (
              <>
                <div className="page-break" style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20, marginTop: 32 }}>
                  ניתוח לפגישה
                </div>
                {editMode
                  ? <textarea value={editedAnalysis} onChange={e => setEditedAnalysis(e.target.value)} rows={30} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #f59e0b', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', background: '#fffbeb' }} />
                  : renderAnalysis(editedAnalysis || analysis)
                }
              </>
            )}
          </>
        )}

        {/* Roots */}
        {type === 'roots' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20 }}>הערות פגישה</div>
            {renderNotes(sd.roots_notes, ROOTS_LABELS, '#0f4c2a')}
            {(sd.roots_analysis || editedAnalysis) && (
              <>
                <div className="page-break" style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20, marginTop: 32 }}>
                  ניתוח לפגישה
                </div>
                {editMode
                  ? <textarea value={editedAnalysis} onChange={e => setEditedAnalysis(e.target.value)} rows={30} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #f59e0b', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', background: '#fffbeb' }} />
                  : renderAnalysis(editedAnalysis || sd.roots_analysis)
                }
              </>
            )}
          </>
        )}

        {/* Body */}
        {type === 'body' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20 }}>הערות פגישה</div>
            {renderNotes(sd.body_notes, BODY_LABELS, '#0f4c2a')}
            {(sd.body_analysis || editedAnalysis) && (
              <>
                <div className="page-break" style={{ fontSize: 18, fontWeight: 900, color: '#0f4c2a', borderBottom: '2px solid #dcfce7', paddingBottom: 8, marginBottom: 20, marginTop: 32 }}>
                  ניתוח לפגישה
                </div>
                {editMode
                  ? <textarea value={editedAnalysis} onChange={e => setEditedAnalysis(e.target.value)} rows={30} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #f59e0b', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', background: '#fffbeb' }} />
                  : renderAnalysis(editedAnalysis || sd.body_analysis)
                }
              </>
            )}
          </>
        )}

        {/* Child */}
        {type === 'child' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', borderBottom: '2px solid #e9d5ff', paddingBottom: 8, marginBottom: 20 }}>הערות פגישה</div>
            {renderNotes(sd.child_notes, CHILD_LABELS, '#7c3aed')}
            {(sd.child_analysis || editedAnalysis) && (
              <>
                <div className="page-break" style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', borderBottom: '2px solid #e9d5ff', paddingBottom: 8, marginBottom: 20, marginTop: 32 }}>
                  ניתוח לפגישה
                </div>
                {editMode
                  ? <textarea value={editedAnalysis} onChange={e => setEditedAnalysis(e.target.value)} rows={30} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #f59e0b', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', background: '#fffbeb' }} />
                  : renderAnalysis(editedAnalysis || sd.child_analysis)
                }
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

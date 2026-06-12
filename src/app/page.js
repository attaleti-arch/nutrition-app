'use client'
import { useState } from 'react'
import { supabase } from './supabase'
import PlanApp from './PlanApp'

const TERMS_TEXT = `ברוכה הבאה למסע — בין הראש לצלחת

מה המסע הזה נותן לך?
"בין הראש לצלחת" הוא תהליך ליווי אישי לשינוי הרגלי אכילה, דפוסי חשיבה ומערכת היחסים שלך עם אוכל ועם הגוף. התהליך כולל כלים התנהגותיים, עבודה על דפוסים רגשיים, ובניית שגרה שמחזיקה לאורך זמן — בצורה שמתאימה לחיים האמיתיים שלך.

מה קיבלת כאן?
ליווי מותאם אישית מאתי אטל, יועצת לבריאות ותזונה התנהגותית — שמביאה כלים, ידע ותמיכה לדרך. הכל בנוי סביב השינוי שרלוונטי לך, לא על פרוטוקול אחיד.

הגבול שחשוב לדעת
הכלים וההמלצות שתקבלי אינם מחליפים ייעוץ מרופא, תזונאי קליני, או כל גורם רפואי מורשה. אם יש בעיה רפואית פעילה — חשוב להיוועץ בגורם מקצועי לפני ובמהלך התהליך. במצב חירום — מד"א 101.

הפרטיות שלך
כל המידע שלך מאובטח ולא יועבר לשום גורם חיצוני.`

export default function Home() {
  const [password, setPassword] = useState('')
  const [clientName, setClientName] = useState('')
  const [started, setStarted] = useState(false)
  const [error, setError] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const [pendingPassword, setPendingPassword] = useState('')
  const [pendingName, setPendingName] = useState('')

  async function handleStart() {
    if (!password.trim()) return
    const { data } = await supabase.from('clients').select('name').eq('password', password.trim()).single()
    if (data) {
      const accepted = localStorage.getItem('terms_accepted_' + password.trim())
      if (accepted) {
        setClientName(data.name)
        setStarted(true)
      } else {
        setPendingPassword(password.trim())
        setPendingName(data.name)
        setShowTerms(true)
      }
    } else {
      setError('סיסמה לא נמצאה, נסי שוב')
    }
  }

  function acceptTerms() {
    localStorage.setItem('terms_accepted_' + pendingPassword, '1')
    setClientName(pendingName)
    setPassword(pendingPassword)
    setShowTerms(false)
    setStarted(true)
  }

  if (started) return <PlanApp clientName={clientName} userPassword={pendingPassword || password} />

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#f0fdf4,#eff6ff)',padding:24,direction:'rtl'}}>

      {showTerms && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#fff',borderRadius:20,maxWidth:480,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{background:'linear-gradient(135deg,#0f4c2a,#16a34a)',padding:'18px 24px',color:'#fff'}}>
              <div style={{fontWeight:900,fontSize:17}}>לפני שמתחילים — בין הראש לצלחת</div>
              <div style={{fontSize:12,opacity:0.85,marginTop:4}}>רגע קצר לפני הכניסה</div>
            </div>
            <div style={{overflowY:'auto',padding:'20px 24px',flex:1}}>
              {TERMS_TEXT.split('\n\n').map((p, i) => (
                <p key={i} style={{fontSize:14,color:'#374151',lineHeight:1.8,marginBottom:12,direction:'rtl',textAlign:'right'}}>{p}</p>
              ))}
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid #f0f0f0',display:'flex',gap:10}}>
              <button onClick={acceptTerms} style={{flex:2,padding:'12px 0',borderRadius:12,background:'#16a34a',color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:15}}>
                קראתי ואני מסכימ/ה — כניסה
              </button>
              <button onClick={() => setShowTerms(false)} style={{flex:1,padding:'12px 0',borderRadius:12,background:'#f3f4f6',color:'#6b7280',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

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

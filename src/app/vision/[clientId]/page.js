'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function VisionPage() {
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('clients')
      .select('name, last_name, vision_paragraph, vision_image_url, vision_audio_url, vision_goal_text')
      .eq('id', clientId)
      .single()
      .then(({ data }) => { setClient(data); setLoading(false) })
  }, [clientId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const s = document.getElementById('stars')
    if (!s) return
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      el.className = 'star'
      const size = Math.random() * 2.5 + 0.5
      el.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;animation-delay:${Math.random()*5}s`
      s.appendChild(el)
    }
  }, [loading])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1e1b4b 40%,#2d1b69 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#c7d2fe', fontSize: 18, fontFamily: 'Georgia, serif' }}>✨ טוענת...</div>
    </div>
  )

  if (!client) return (
    <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: 16 }}>הדף לא נמצא</div>
    </div>
  )

  const name = client.name + (client.last_name ? ' ' + client.last_name : '')
  const date = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: linear-gradient(160deg,#0f0c29,#1e1b4b 40%,#2d1b69 100%); }
        .star {
          position: fixed; border-radius: 50%;
          background: rgba(199,210,254,0.6);
          animation: twinkle var(--d) ease-in-out infinite alternate;
        }
        @keyframes twinkle { from { opacity:0.2; transform:scale(1); } to { opacity:1; transform:scale(1.4); } }
        audio { width:100%; border-radius:8px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1e1b4b 40%,#2d1b69 100%)', fontFamily: "'Frank Ruhl Libre', Georgia, serif", color: '#e0e7ff', direction: 'rtl', paddingBottom: 60 }}>

        <div id="stars" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>

          {/* כותרת */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 28, filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.7))', marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 12, letterSpacing: 3, color: '#818cf8', textTransform: 'uppercase', marginBottom: 10 }}>הויזואליזציה שלי</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#c7d2fe', lineHeight: 1.3, marginBottom: 6 }}>{name}</h1>
            <div style={{ fontSize: 13, color: '#6366f1' }}>{date}</div>
          </div>

          <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg,transparent,#818cf8,transparent)', margin: '0 auto 28px' }} />

          {/* תמונה */}
          {client.vision_image_url && (
            <div style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 28, boxShadow: '0 0 60px rgba(99,102,241,0.4),0 20px 40px rgba(0,0,0,0.5)', border: '1.5px solid rgba(129,140,248,0.3)' }}>
              <img src={client.vision_image_url} alt="ויזואליזציה" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          {/* פסקה */}
          {client.vision_paragraph && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(129,140,248,0.25)', borderRadius: 20, padding: '28px 24px', marginBottom: 24, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#818cf8', textTransform: 'uppercase', marginBottom: 16 }}>דמיון מודרך 🔮</div>
              <p style={{ fontSize: 18, lineHeight: 2, color: '#e0e7ff', fontWeight: 300 }}
                dangerouslySetInnerHTML={{ __html: client.vision_paragraph.replace(/\n/g, '<br/>') }} />
            </div>
          )}

          {/* אודיו */}
          {client.vision_audio_url && (
            <div style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(129,140,248,0.3)', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 10, letterSpacing: 1 }}>🎧 הודעה אישית בשבילך</div>
              <audio controls src={client.vision_audio_url} />
            </div>
          )}

          {/* פוטר */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#c7d2fe', marginBottom: 4 }}>{name}</div>
            {client.vision_goal_text && (
              <div style={{ fontSize: 14, color: '#818cf8' }}>🎯 יעד: {client.vision_goal_text} ק״ג</div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

const W = 1080
const H = 1350
const BG = '#18221a'
const GOLD = '#c8a455'

async function loadHeebo() {
  try {
    const faces = [
      new FontFace('Heebo', 'url(https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P_v6ZUCbLRAHxK1EiSysd0mm_00.woff2)', { weight: '900' }),
      new FontFace('Heebo', 'url(https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P_v6ZUCbLRAHxK1EiSysd0mm_00.woff2)', { weight: '600' }),
    ]
    const loaded = await Promise.allSettled(faces.map(f => f.load()))
    loaded.forEach(r => { if (r.status === 'fulfilled') document.fonts.add(r.value) })
    await document.fonts.ready
  } catch (e) { /* fallback to system font */ }
}

function autoFontSize(ctx, text, maxWidth, startSize, minSize = 40) {
  let size = startSize
  while (size > minSize) {
    ctx.font = `900 ${size}px Heebo, 'Arial Black', Arial`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 4
  }
  return size
}

async function renderSlide(canvas, { photoUrl, lines, subtitle }) {
  const ctx = canvas.getContext('2d')
  canvas.width = W
  canvas.height = H

  // 1. Dark background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // 2. Photo with solid dark cover on top (hides any baked-in text)
  if (photoUrl) {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = photoUrl
    })

    // cover-fit crop
    const ir = img.width / img.height
    const cr = W / H
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2 }
    else { sh = img.width / cr; sy = (img.height - sh) * 0.35 }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)

    // dark overlay
    ctx.fillStyle = 'rgba(14,22,12,0.62)'
    ctx.fillRect(0, 0, W, H)

    // SOLID cover for top 30% — kills any baked-in watermark text
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H * 0.30)

    // gradient fade from solid to transparent (smooth transition)
    const gTop = ctx.createLinearGradient(0, H * 0.30, 0, H * 0.44)
    gTop.addColorStop(0, 'rgba(24,34,26,1)')
    gTop.addColorStop(1, 'rgba(24,34,26,0)')
    ctx.fillStyle = gTop
    ctx.fillRect(0, H * 0.30, W, H * 0.14)

    // SOLID cover for bottom 12% — kills NotebookLM watermark
    ctx.fillStyle = BG
    ctx.fillRect(0, H * 0.88, W, H * 0.12)

    const gBot = ctx.createLinearGradient(0, H * 0.82, 0, H * 0.88)
    gBot.addColorStop(0, 'rgba(24,34,26,0)')
    gBot.addColorStop(1, 'rgba(24,34,26,1)')
    ctx.fillStyle = gBot
    ctx.fillRect(0, H * 0.82, W, H * 0.06)
  }

  // 3. Headline — auto-size each line to fit, then use same size for both
  await loadHeebo()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'

  const maxTextW = W * 0.88
  const filteredLines = lines.filter(l => l.trim())

  // Find unified font size: smallest that fits all lines
  let fontSize = 200
  for (const line of filteredLines) {
    const s = autoFontSize(ctx, line, maxTextW, 200)
    if (s < fontSize) fontSize = s
  }

  ctx.font = `900 ${fontSize}px Heebo, 'Arial Black', Arial`
  ctx.fillStyle = GOLD
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 18

  const lineH = fontSize * 1.15
  const totalH = filteredLines.length * lineH
  // Position: center of lower 65% of slide
  const centerY = H * 0.72
  const startY = centerY - totalH / 2 + lineH * 0.85

  filteredLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * lineH)
  })

  // 4. Subtitle
  ctx.shadowBlur = 0
  if (subtitle.trim()) {
    const subSize = autoFontSize(ctx, subtitle, maxTextW * 0.85, 60, 28)
    ctx.font = `600 ${subSize}px Heebo, Arial`
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.fillText(subtitle, W / 2, startY + filteredLines.length * lineH + 60)
  }
}

export default function SlideGenerator() {
  const [headline, setHeadline] = useState('יום קשה?\nמגיע לך פינוק')
  const [subtitle, setSubtitle] = useState('(רמז: לא באמת)')
  const [photoUrl, setPhotoUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef(null)

  const generate = useCallback(async () => {
    setGenerating(true)
    try {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas
      const lines = headline.split('\n')
      await renderSlide(canvas, { photoUrl, lines, subtitle })
      setResultUrl(canvas.toDataURL('image/jpeg', 0.94))
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }, [headline, subtitle, photoUrl])

  useEffect(() => { generate() }, [generate])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(URL.createObjectURL(file))
  }

  const download = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = 'slide.jpg'
    a.click()
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 16, direction: 'rtl',
    boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
    background: '#fafafa',
  }

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: '#1e293b' }}>
        ✨ בונה שקפים
      </h2>

      {/* Photo upload */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        תמונת רקע (אופציונלי)
      </label>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '12px 16px', borderRadius: 12, border: '2px dashed #cbd5e1',
        marginBottom: 18, color: '#475569', fontSize: 14,
        background: photoUrl ? '#f0fdf4' : '#f8fafc',
      }}>
        <span style={{ fontSize: 22 }}>📷</span>
        <span>{photoUrl ? '✓ תמונה נבחרה — לחצי להחלפה' : 'לחצי לבחירת תמונה'}</span>
        <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </label>

      {/* Headline */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        כותרת — שורה חדשה = Enter
      </label>
      <textarea value={headline} onChange={e => setHeadline(e.target.value)} rows={3}
        style={{ ...inp, resize: 'none', lineHeight: 1.5, marginBottom: 14 }} />

      {/* Subtitle */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        כיתוב קטן (אופציונלי)
      </label>
      <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
        style={{ ...inp, marginBottom: 22 }} />

      {/* Generate button */}
      <button onClick={generate} disabled={generating}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: generating ? '#94a3b8' : '#18221a', color: '#c8a455',
          fontSize: 16, fontWeight: 800, cursor: generating ? 'default' : 'pointer',
          marginBottom: 20,
        }}>
        {generating ? 'מייצר...' : '🎨 צור שקף'}
      </button>

      {/* Preview + download */}
      {resultUrl && !generating && (
        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>
            📱 בנייד: לחיצה ארוכה על התמונה ← שמור תמונה
          </p>
          <img src={resultUrl} alt="slide"
            style={{ width: '100%', borderRadius: 14, display: 'block', boxShadow: '0 6px 30px rgba(0,0,0,0.18)' }} />
          <button onClick={download}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: '#15803d', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              marginTop: 14,
            }}>
            ⬇️ הורד PNG
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

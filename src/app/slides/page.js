'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

const W = 1080
const H = 1350

const BG_OPTIONS = [
  { name: 'כהה מאוד', val: '#18221a' },
  { name: 'ירוק עמוק', val: '#2d3c27' },
  { name: 'ירוק חי', val: '#3a4e2c' },
  { name: 'ירוק בהיר', val: '#7a8a68' },
]
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

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function fitFontSize(ctx, text, maxWidth, startSize, minSize = 36) {
  let size = startSize
  while (size > minSize) {
    ctx.font = `900 ${size}px Heebo, 'Arial Black', Arial`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 4
  }
  return size
}

async function renderSlide(canvas, opts) {
  const { photoUrl, lines, subtitle, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleColor } = opts
  const ctx = canvas.getContext('2d')
  canvas.width = W
  canvas.height = H

  const [br, bg_, bb] = hexToRgb(bgColor)

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  if (photoUrl) {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = photoUrl
    })

    const ir = img.width / img.height
    const cr = W / H
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2 }
    else { sh = img.width / cr; sy = (img.height - sh) * 0.35 }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)

    // adjustable dark overlay
    ctx.fillStyle = `rgba(${Math.round(br * 0.5)},${Math.round(bg_ * 0.5)},${Math.round(bb * 0.5)},${overlayOpacity})`
    ctx.fillRect(0, 0, W, H)

    if (coverEdges) {
      // solid cover top 28% (hides baked-in text) + fade
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, W, H * 0.28)
      const gTop = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.42)
      gTop.addColorStop(0, `rgba(${br},${bg_},${bb},1)`)
      gTop.addColorStop(1, `rgba(${br},${bg_},${bb},0)`)
      ctx.fillStyle = gTop
      ctx.fillRect(0, H * 0.28, W, H * 0.14)

      // solid cover bottom 12% + fade
      ctx.fillStyle = bgColor
      ctx.fillRect(0, H * 0.88, W, H * 0.12)
      const gBot = ctx.createLinearGradient(0, H * 0.82, 0, H * 0.88)
      gBot.addColorStop(0, `rgba(${br},${bg_},${bb},0)`)
      gBot.addColorStop(1, `rgba(${br},${bg_},${bb},1)`)
      ctx.fillStyle = gBot
      ctx.fillRect(0, H * 0.82, W, H * 0.06)
    }
  }

  await loadHeebo()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'

  const maxTextW = W * 0.88
  const filteredLines = lines.filter(l => l.trim())

  // base size from scale slider, shrunk if a line overflows
  let fontSize = Math.round(200 * titleScale)
  for (const line of filteredLines) {
    const s = fitFontSize(ctx, line, maxTextW, fontSize)
    if (s < fontSize) fontSize = s
  }

  ctx.font = `900 ${fontSize}px Heebo, 'Arial Black', Arial`
  ctx.fillStyle = titleColor
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 18

  const lineH = fontSize * 1.15
  const subSize = subtitle.trim() ? Math.round(54 * subScale) : 0
  const blockH = filteredLines.length * lineH + (subSize ? subSize + 55 : 0)

  // posY: 0 = top, 1 = bottom; center of text block maps into usable band
  const margin = 90
  const centerY = margin + blockH / 2 + (H - 2 * margin - blockH) * posY
  const startY = centerY - blockH / 2 + lineH * 0.85

  filteredLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * lineH)
  })

  ctx.shadowBlur = 0
  if (subSize) {
    let s = subSize
    ctx.font = `600 ${s}px Heebo, Arial`
    while (s > 24 && ctx.measureText(subtitle).width > maxTextW * 0.9) {
      s -= 2
      ctx.font = `600 ${s}px Heebo, Arial`
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 10
    ctx.fillText(subtitle, W / 2, startY + filteredLines.length * lineH + 40)
    ctx.shadowBlur = 0
  }
}

function Slider({ label, value, onChange, min, max, step }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
        <span>{label}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#3a5c3a' }} />
    </div>
  )
}

export default function SlideGenerator() {
  const [headline, setHeadline] = useState('יום קשה?\nמגיע לך פינוק')
  const [subtitle, setSubtitle] = useState('(רמז: לא באמת)')
  const [photoUrl, setPhotoUrl] = useState(null)
  const [bgColor, setBgColor] = useState('#18221a')
  const [overlayOpacity, setOverlayOpacity] = useState(0.55)
  const [coverEdges, setCoverEdges] = useState(true)
  const [posY, setPosY] = useState(0.75)
  const [titleScale, setTitleScale] = useState(1)
  const [subScale, setSubScale] = useState(1)
  const [titleGold, setTitleGold] = useState(true)
  const [resultUrl, setResultUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef(null)
  const debounceRef = useRef(null)

  const generate = useCallback(async () => {
    setGenerating(true)
    try {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas
      await renderSlide(canvas, {
        photoUrl,
        lines: headline.split('\n'),
        subtitle,
        bgColor,
        overlayOpacity,
        coverEdges,
        posY,
        titleScale,
        subScale,
        titleColor: titleGold ? GOLD : '#ffffff',
      })
      setResultUrl(canvas.toDataURL('image/jpeg', 0.94))
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }, [headline, subtitle, photoUrl, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleGold])

  // live preview with a small debounce so sliders feel smooth
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(generate, 150)
    return () => clearTimeout(debounceRef.current)
  }, [generate])

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
        marginBottom: 8, color: '#475569', fontSize: 14,
        background: photoUrl ? '#f0fdf4' : '#f8fafc',
      }}>
        <span style={{ fontSize: 22 }}>📷</span>
        <span>{photoUrl ? '✓ תמונה נבחרה — לחצי להחלפה' : 'לחצי לבחירת תמונה'}</span>
        <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </label>
      {photoUrl && (
        <button onClick={() => { URL.revokeObjectURL(photoUrl); setPhotoUrl(null) }}
          style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0 }}>
          ✕ הסרת התמונה
        </button>
      )}

      {/* Headline */}
      <label style={{ display: 'block', margin: '10px 0 6px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        כותרת — שורה חדשה = Enter
      </label>
      <textarea value={headline} onChange={e => setHeadline(e.target.value)} rows={3}
        style={{ ...inp, resize: 'none', lineHeight: 1.5, marginBottom: 14 }} />

      {/* Subtitle */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        כיתוב קטן (אופציונלי)
      </label>
      <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
        style={{ ...inp, marginBottom: 18 }} />

      {/* Background color */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        גוון רקע
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {BG_OPTIONS.map(o => (
          <button key={o.val} onClick={() => setBgColor(o.val)}
            style={{
              flex: 1, height: 52, borderRadius: 10, cursor: 'pointer',
              background: o.val,
              border: bgColor === o.val ? '3px solid #c8a455' : '2px solid #e2e8f0',
              color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
            }}>
            {o.name}
          </button>
        ))}
      </div>

      {/* Title color toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button onClick={() => setTitleGold(true)}
          style={{ flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: titleGold ? '2px solid #c8a455' : '1.5px solid #e2e8f0', background: titleGold ? '#fdf6e3' : '#fafafa', color: '#8a6d1f' }}>
          כותרת זהב
        </button>
        <button onClick={() => setTitleGold(false)}
          style={{ flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: !titleGold ? '2px solid #64748b' : '1.5px solid #e2e8f0', background: !titleGold ? '#f1f5f9' : '#fafafa', color: '#334155' }}>
          כותרת לבנה
        </button>
      </div>

      {/* Sliders */}
      {photoUrl && (
        <>
          <Slider label={`שקיפות ההחשכה על התמונה — ${Math.round(overlayOpacity * 100)}%`}
            value={overlayOpacity} onChange={setOverlayOpacity} min={0} max={0.9} step={0.05} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={coverEdges} onChange={e => setCoverEdges(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#3a5c3a' }} />
            כיסוי מלא למעלה ולמטה (מסתיר כיתוב צרוב בתמונה)
          </label>
        </>
      )}
      <Slider label="מיקום הכותרת — למעלה ⟵ למטה"
        value={posY} onChange={setPosY} min={0} max={1} step={0.05} />
      <Slider label={`גודל כותרת — ${Math.round(titleScale * 100)}%`}
        value={titleScale} onChange={setTitleScale} min={0.5} max={1.3} step={0.05} />
      <Slider label={`גודל כיתוב קטן — ${Math.round(subScale * 100)}%`}
        value={subScale} onChange={setSubScale} min={0.6} max={1.6} step={0.05} />

      {/* Preview + download */}
      {resultUrl && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>
            📱 בנייד: לחיצה ארוכה על התמונה ← שמור תמונה
          </p>
          <img src={resultUrl} alt="slide"
            style={{ width: '100%', borderRadius: 14, display: 'block', boxShadow: '0 6px 30px rgba(0,0,0,0.18)', opacity: generating ? 0.6 : 1, transition: 'opacity 0.15s' }} />
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

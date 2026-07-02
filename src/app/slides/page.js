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

// Draw the photo cover-fitted to the 4:5 canvas, with user pan (px, py in
// -1..1, fraction of the free crop range) and zoom (>= 1).
function drawPhoto(ctx, img, zoom, px, py) {
  const s0 = Math.max(W / img.width, H / img.height)
  const s = s0 * zoom
  const dw = img.width * s
  const dh = img.height * s
  const freeX = Math.max(0, (dw - W) / 2)
  const freeY = Math.max(0, (dh - H) / 2)
  const dx = (W - dw) / 2 + px * freeX
  const dy = (H - dh) / 2 + py * freeY
  ctx.drawImage(img, dx, dy, dw, dh)
}

async function renderSlide(canvas, opts) {
  const { photoImg, lines, subtitle, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleColor, zoom, px, py } = opts
  const ctx = canvas.getContext('2d')
  canvas.width = W
  canvas.height = H

  const [br, bg_, bb] = hexToRgb(bgColor)

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  if (photoImg) {
    drawPhoto(ctx, photoImg, zoom, px, py)

    // green tint overlay — the chosen shade at the chosen opacity
    ctx.fillStyle = `rgba(${br},${bg_},${bb},${overlayOpacity})`
    ctx.fillRect(0, 0, W, H)

    if (coverEdges) {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, W, H * 0.28)
      const gTop = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.42)
      gTop.addColorStop(0, `rgba(${br},${bg_},${bb},1)`)
      gTop.addColorStop(1, `rgba(${br},${bg_},${bb},0)`)
      ctx.fillStyle = gTop
      ctx.fillRect(0, H * 0.28, W, H * 0.14)

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
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#3a5c3a' }} />
    </div>
  )
}

export default function SlideGenerator() {
  const [headline, setHeadline] = useState('יום קשה?\nמגיע לך פינוק')
  const [subtitle, setSubtitle] = useState('(רמז: לא באמת)')
  const [photoImg, setPhotoImg] = useState(null)
  const [bgColor, setBgColor] = useState('#18221a')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [coverEdges, setCoverEdges] = useState(false)
  const [posY, setPosY] = useState(0.75)
  const [titleScale, setTitleScale] = useState(1)
  const [subScale, setSubScale] = useState(1)
  const [titleGold, setTitleGold] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [px, setPx] = useState(0)
  const [py, setPy] = useState(0)
  const [resultUrl, setResultUrl] = useState(null)
  const canvasRef = useRef(null)
  const debounceRef = useRef(null)
  const previewRef = useRef(null)
  const dragRef = useRef(null)

  const generate = useCallback(async () => {
    try {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas
      await renderSlide(canvas, {
        photoImg,
        lines: headline.split('\n'),
        subtitle,
        bgColor,
        overlayOpacity,
        coverEdges,
        posY,
        titleScale,
        subScale,
        titleColor: titleGold ? GOLD : '#ffffff',
        zoom, px, py,
      })
      setResultUrl(canvas.toDataURL('image/jpeg', 0.94))
    } catch (e) {
      console.error(e)
    }
  }, [headline, subtitle, photoImg, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleGold, zoom, px, py])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(generate, 100)
    return () => clearTimeout(debounceRef.current)
  }, [generate])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setPhotoImg(img)
      setZoom(1); setPx(0); setPy(0)
    }
    img.src = url
  }

  // drag to pan the photo on the preview
  const onPointerDown = (e) => {
    if (!photoImg) return
    e.preventDefault()
    const pts = dragRef.current?.pointers || new Map()
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragRef.current = { pointers: pts, startPx: px, startPy: py, startZoom: zoom, startDist: null }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d || !photoImg || !d.pointers.has(e.pointerId)) return
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...d.pointers.values()]
    const el = previewRef.current
    if (!el) return
    if (pts.length >= 2) {
      // pinch zoom
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (d.startDist == null) { d.startDist = dist; d.startZoom = zoom; return }
      const z = Math.min(3, Math.max(1, d.startZoom * (dist / d.startDist)))
      setZoom(z)
    } else if (pts.length === 1 && d.start == null) {
      if (!d.startPt) { d.startPt = { ...pts[0] }; return }
      const rect = el.getBoundingClientRect()
      // convert screen px to pan fraction: free crop range depends on zoom
      const s0 = Math.max(W / photoImg.width, H / photoImg.height)
      const s = s0 * zoom
      const freeX = Math.max(1, (photoImg.width * s - W) / 2)
      const freeY = Math.max(1, (photoImg.height * s - H) / 2)
      const scale = W / rect.width
      const dxCanvas = (pts[0].x - d.startPt.x) * scale
      const dyCanvas = (pts[0].y - d.startPt.y) * scale
      setPx(Math.min(1, Math.max(-1, d.startPx + dxCanvas / freeX)))
      setPy(Math.min(1, Math.max(-1, d.startPy + dyCanvas / freeY)))
    }
  }
  const onPointerUp = (e) => {
    const d = dragRef.current
    if (d) {
      d.pointers.delete(e.pointerId)
      if (d.pointers.size === 0) dragRef.current = null
      else { d.startDist = null; d.startPt = null; d.startPx = px; d.startPy = py }
    }
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
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '12px 16px', borderRadius: 12, border: '2px dashed #cbd5e1',
        marginBottom: 8, color: '#475569', fontSize: 14,
        background: photoImg ? '#f0fdf4' : '#f8fafc',
      }}>
        <span style={{ fontSize: 22 }}>📷</span>
        <span>{photoImg ? '✓ תמונה נבחרה — לחצי להחלפה' : 'תמונת רקע — לחצי לבחירה (אופציונלי)'}</span>
        <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </label>
      {photoImg && (
        <button onClick={() => { setPhotoImg(null); setZoom(1); setPx(0); setPy(0) }}
          style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0 }}>
          ✕ הסרת התמונה
        </button>
      )}

      {/* Live preview — drag to position, pinch to zoom */}
      {resultUrl && (
        <div style={{ marginBottom: 16 }}>
          {photoImg && (
            <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: '4px 0 8px', fontWeight: 600 }}>
              👆 גררי את התמונה למיקום · צביטה להגדלה
            </p>
          )}
          <img ref={previewRef} src={resultUrl} alt="slide"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            style={{ width: '100%', borderRadius: 14, display: 'block', boxShadow: '0 6px 30px rgba(0,0,0,0.18)', touchAction: photoImg ? 'none' : 'auto', cursor: photoImg ? 'grab' : 'default', userSelect: 'none' }} />
        </div>
      )}

      {photoImg && (
        <>
          <Slider label={`הגדלת התמונה — ${Math.round(zoom * 100)}%`}
            value={zoom} onChange={setZoom} min={1} max={3} step={0.05} />
          <Slider label={`שקיפות שכבת הצבע — ${Math.round(overlayOpacity * 100)}%`}
            value={overlayOpacity} onChange={setOverlayOpacity} min={0} max={0.9} step={0.05} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={coverEdges} onChange={e => setCoverEdges(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#3a5c3a' }} />
            כיסוי אטום למעלה ולמטה (מסתיר כיתוב צרוב בתמונה)
          </label>
        </>
      )}

      {/* Background / tint color */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        {photoImg ? 'גוון שכבת הצבע על התמונה' : 'גוון רקע'}
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
        style={{ ...inp, marginBottom: 18 }} />

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

      <Slider label="מיקום הכותרת — למעלה ⟵ למטה"
        value={posY} onChange={setPosY} min={0} max={1} step={0.05} />
      <Slider label={`גודל כותרת — ${Math.round(titleScale * 100)}%`}
        value={titleScale} onChange={setTitleScale} min={0.5} max={1.3} step={0.05} />
      <Slider label={`גודל כיתוב קטן — ${Math.round(subScale * 100)}%`}
        value={subScale} onChange={setSubScale} min={0.6} max={1.6} step={0.05} />

      {resultUrl && (
        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: '10px 0' }}>
            📱 בנייד: לחיצה ארוכה על התמונה למעלה ← שמור תמונה, או:
          </p>
          <button onClick={download}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: '#15803d', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
            ⬇️ הורד תמונה (4:5)
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

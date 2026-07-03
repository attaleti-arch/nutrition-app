'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

const FORMATS = [
  { key: 'post', label: 'פוסט 4:5', sub: 'אינסטגרם · פייסבוק', w: 1080, h: 1350 },
  { key: 'story', label: 'סטוריז 9:16', sub: 'רילס · טיקטוק', w: 1080, h: 1920 },
  { key: 'square', label: 'מרובע 1:1', sub: 'פיד', w: 1080, h: 1080 },
  { key: 'wide', label: 'רוחבי 16:9', sub: 'cover לסרטונים', w: 1920, h: 1080 },
]
let W = 1080
let H = 1350

const BG_OPTIONS = [
  { name: 'כהה מאוד', val: '#18221a', dark: true },
  { name: 'ירוק עמוק', val: '#2d3c27', dark: true },
  { name: 'ירוק חי', val: '#3a4e2c', dark: true },
  { name: 'ירוק בהיר', val: '#7a8a68', dark: true },
  { name: 'קרם בהיר', val: '#f5ede0', dark: false },
  { name: 'קרם כהה', val: '#e8d9c4', dark: false },
  { name: 'זהב', val: '#c8a83c', dark: false },
  { name: 'ירוק האפליקציה', val: '#3a5c3a', dark: true },
]
const LOGO_COLORS = [
  { key: 'light', label: 'זהב בהיר', val: '#d4b26a' },
  { key: 'rich', label: 'זהב עשיר', val: '#c8a83c' },
  { key: 'white', label: 'לבן', val: '#f2ede2' },
]
const TITLE_COLORS = [
  { key: 'gold', label: 'זהב', val: '#c8a455' },
  { key: 'white', label: 'לבן', val: '#ffffff' },
  { key: 'black', label: 'שחור', val: '#1a1a1a' },
]

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

// Photo cover-fit transform for the 4:5 canvas. Returns draw params so the
// same math can be inverted for brush → source-pixel mapping.
function photoTransform(srcW, srcH, zoom, px, py) {
  const s0 = Math.max(W / srcW, H / srcH)
  const s = s0 * zoom
  const dw = srcW * s
  const dh = srcH * s
  const freeX = Math.max(0, (dw - W) / 2)
  const freeY = Math.max(0, (dh - H) / 2)
  const dx = (W - dw) / 2 + px * freeX
  const dy = (H - dh) / 2 + py * freeY
  return { s, dx, dy, dw, dh, freeX, freeY }
}

// Diffusion inpainting: fills masked pixels from their surroundings.
// Operates in-place on the edited photo canvas, in source-pixel space.
function inpaintRegion(editCtx, srcW, srcH, strokes, radius) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of strokes) {
    minX = Math.min(minX, p.x - radius); maxX = Math.max(maxX, p.x + radius)
    minY = Math.min(minY, p.y - radius); maxY = Math.max(maxY, p.y + radius)
  }
  const pad = Math.ceil(radius) + 14
  const x0 = Math.max(0, Math.floor(minX - pad))
  const y0 = Math.max(0, Math.floor(minY - pad))
  const x1 = Math.min(srcW, Math.ceil(maxX + pad))
  const y1 = Math.min(srcH, Math.ceil(maxY + pad))
  const rw = x1 - x0, rh = y1 - y0
  if (rw <= 2 || rh <= 2) return

  const imgData = editCtx.getImageData(x0, y0, rw, rh)
  const d = imgData.data
  const n = rw * rh
  const mask = new Uint8Array(n)
  const r2 = radius * radius
  for (const p of strokes) {
    const cx = p.x - x0, cy = p.y - y0
    const xa = Math.max(0, Math.floor(cx - radius)), xb = Math.min(rw - 1, Math.ceil(cx + radius))
    const ya = Math.max(0, Math.floor(cy - radius)), yb = Math.min(rh - 1, Math.ceil(cy + radius))
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        const ddx = x - cx, ddy = y - cy
        if (ddx * ddx + ddy * ddy <= r2) mask[y * rw + x] = 1
      }
    }
  }

  // channel buffers
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  for (let i = 0; i < n; i++) {
    ch[0][i] = d[i * 4]; ch[1][i] = d[i * 4 + 1]; ch[2][i] = d[i * 4 + 2]
  }

  // init masked pixels: grow inward from the unmasked border
  const filled = new Uint8Array(n)
  for (let i = 0; i < n; i++) filled[i] = mask[i] ? 0 : 1
  let remaining = 1
  let guard = 0
  while (remaining && guard++ < 600) {
    remaining = 0
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const i = y * rw + x
        if (filled[i]) continue
        let sum0 = 0, sum1 = 0, sum2 = 0, cnt = 0
        if (x > 0 && filled[i - 1]) { sum0 += ch[0][i - 1]; sum1 += ch[1][i - 1]; sum2 += ch[2][i - 1]; cnt++ }
        if (x < rw - 1 && filled[i + 1]) { sum0 += ch[0][i + 1]; sum1 += ch[1][i + 1]; sum2 += ch[2][i + 1]; cnt++ }
        if (y > 0 && filled[i - rw]) { sum0 += ch[0][i - rw]; sum1 += ch[1][i - rw]; sum2 += ch[2][i - rw]; cnt++ }
        if (y < rh - 1 && filled[i + rw]) { sum0 += ch[0][i + rw]; sum1 += ch[1][i + rw]; sum2 += ch[2][i + rw]; cnt++ }
        if (cnt) {
          ch[0][i] = sum0 / cnt; ch[1][i] = sum1 / cnt; ch[2][i] = sum2 / cnt
          filled[i] = 2 // filled this round
        } else {
          remaining = 1
        }
      }
    }
    for (let i = 0; i < n; i++) if (filled[i] === 2) filled[i] = 1
  }

  // smooth: Jacobi diffusion over masked pixels only
  const tmp = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  for (let it = 0; it < 40; it++) {
    for (let c = 0; c < 3; c++) tmp[c].set(ch[c])
    for (let y = 1; y < rh - 1; y++) {
      for (let x = 1; x < rw - 1; x++) {
        const i = y * rw + x
        if (!mask[i]) continue
        for (let c = 0; c < 3; c++) {
          ch[c][i] = (tmp[c][i - 1] + tmp[c][i + 1] + tmp[c][i - rw] + tmp[c][i + rw]) / 4
        }
      }
    }
  }

  // faint noise so the healed area doesn't look plastic-smooth
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue
    const noise = (Math.random() - 0.5) * 6
    d[i * 4] = Math.max(0, Math.min(255, ch[0][i] + noise))
    d[i * 4 + 1] = Math.max(0, Math.min(255, ch[1][i] + noise))
    d[i * 4 + 2] = Math.max(0, Math.min(255, ch[2][i] + noise))
  }
  editCtx.putImageData(imgData, x0, y0)
}

async function renderSlide(canvas, opts) {
  const { photoSrc, lines, subtitle, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleColor, zoom, px, py, patchOn, patchY, patchH, logoImg, logoOn, logoColor, logoScale, format } = opts
  W = format.w
  H = format.h
  const ctx = canvas.getContext('2d')
  canvas.width = W
  canvas.height = H

  const [br, bg_, bb] = hexToRgb(bgColor)

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  if (photoSrc) {
    const t = photoTransform(photoSrc.width, photoSrc.height, zoom, px, py)
    ctx.drawImage(photoSrc, t.dx, t.dy, t.dw, t.dh)

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

  if (patchOn) {
    const ph = H * patchH
    const pyTop = (H - ph) * patchY
    const soft = 26
    const g = ctx.createLinearGradient(0, pyTop - soft, 0, pyTop)
    g.addColorStop(0, `rgba(${br},${bg_},${bb},0)`)
    g.addColorStop(1, `rgba(${br},${bg_},${bb},1)`)
    ctx.fillStyle = g
    ctx.fillRect(0, pyTop - soft, W, soft)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, pyTop, W, ph)
    const g2 = ctx.createLinearGradient(0, pyTop + ph, 0, pyTop + ph + soft)
    g2.addColorStop(0, `rgba(${br},${bg_},${bb},1)`)
    g2.addColorStop(1, `rgba(${br},${bg_},${bb},0)`)
    ctx.fillStyle = g2
    ctx.fillRect(0, pyTop + ph, W, soft)
  }

  await loadHeebo()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'

  const maxTextW = W * 0.88
  const filteredLines = lines.filter(l => l.trim())

  const S = Math.min(W, H) / 1080  // proportion anchor across formats
  let fontSize = Math.round(200 * titleScale * S)
  for (const line of filteredLines) {
    const s = fitFontSize(ctx, line, maxTextW, fontSize)
    if (s < fontSize) fontSize = s
  }

  ctx.font = `900 ${fontSize}px Heebo, 'Arial Black', Arial`
  ctx.fillStyle = titleColor
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 18

  const lineH = fontSize * 1.15
  const subSize = subtitle.trim() ? Math.round(54 * subScale * S) : 0
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
    const subDark = titleColor === '#1a1a1a'
    ctx.fillStyle = subDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.9)'
    ctx.shadowColor = subDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 10
    ctx.fillText(subtitle, W / 2, startY + filteredLines.length * lineH + 40)
    ctx.shadowBlur = 0
  }

  // logo watermark — bottom center, tinted, semi-transparent
  if (logoOn && logoImg) {
    const lw = Math.round(132 * logoScale * S)
    const lh = lw * (logoImg.height / logoImg.width)
    const off = document.createElement('canvas')
    off.width = logoImg.width; off.height = logoImg.height
    const octx = off.getContext('2d')
    octx.drawImage(logoImg, 0, 0)
    octx.globalCompositeOperation = 'source-in'
    octx.fillStyle = logoColor
    octx.fillRect(0, 0, off.width, off.height)
    ctx.globalAlpha = 0.92
    ctx.drawImage(off, (W - lw) / 2, H - lh - 34, lw, lh)
    ctx.globalAlpha = 1
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
  const [format, setFormat] = useState(FORMATS[0])
  const [headline, setHeadline] = useState('יום קשה?\nמגיע לך פינוק')
  const [subtitle, setSubtitle] = useState('(רמז: לא באמת)')
  const [photoImg, setPhotoImg] = useState(null)
  const [editVersion, setEditVersion] = useState(0)
  const [bgColor, setBgColor] = useState('#18221a')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [coverEdges, setCoverEdges] = useState(false)
  const [posY, setPosY] = useState(0.75)
  const [titleScale, setTitleScale] = useState(1)
  const [subScale, setSubScale] = useState(1)
  const [titleColorKey, setTitleColorKey] = useState('gold')
  const [patchOn, setPatchOn] = useState(false)
  const [patchY, setPatchY] = useState(0.05)
  const [patchH, setPatchH] = useState(0.14)
  const [zoom, setZoom] = useState(1)
  const [px, setPx] = useState(0)
  const [py, setPy] = useState(0)
  const [logoOn, setLogoOn] = useState(true)
  const [logoColorKey, setLogoColorKey] = useState('light')
  const [logoScale, setLogoScale] = useState(1)
  const [logoReady, setLogoReady] = useState(false)
  const logoRef = useRef(null)
  const [eraseMode, setEraseMode] = useState(false)
  const [brushSize, setBrushSize] = useState(55)
  const [healing, setHealing] = useState(false)
  const [resultUrl, setResultUrl] = useState(null)
  const canvasRef = useRef(null)
  const debounceRef = useRef(null)
  const previewRef = useRef(null)
  const overlayRef = useRef(null)
  const dragRef = useRef(null)
  const editRef = useRef(null)   // offscreen canvas holding the healed photo
  const strokeRef = useRef(null)

  const photoSrc = editRef.current?.canvas || photoImg

  useEffect(() => {
    const img = new Image()
    img.onload = () => { logoRef.current = img; setLogoReady(true) }
    img.src = '/logo-gold.png'
  }, [])

  const generate = useCallback(async () => {
    try {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas
      await renderSlide(canvas, {
        photoSrc: editRef.current?.canvas || photoImg,
        lines: headline.split('\n'),
        subtitle,
        bgColor,
        overlayOpacity,
        coverEdges,
        posY,
        titleScale,
        subScale,
        titleColor: TITLE_COLORS.find(c => c.key === titleColorKey).val,
        zoom, px, py, patchOn, patchY, patchH,
        logoImg: logoRef.current, logoOn,
        logoColor: LOGO_COLORS.find(c => c.key === logoColorKey).val,
        logoScale,
        format,
      })
      setResultUrl(canvas.toDataURL('image/jpeg', 0.94))
    } catch (e) {
      console.error(e)
    }
  }, [headline, subtitle, photoImg, editVersion, bgColor, overlayOpacity, coverEdges, posY, titleScale, subScale, titleColorKey, zoom, px, py, patchOn, patchY, patchH, logoOn, logoColorKey, logoScale, logoReady, format])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(generate, 100)
    return () => clearTimeout(debounceRef.current)
  }, [generate])

  const buildEditCanvas = (img) => {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    c.getContext('2d').drawImage(img, 0, 0)
    editRef.current = { canvas: c, ctx: c.getContext('2d') }
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      buildEditCanvas(img)
      setPhotoImg(img)
      setZoom(1); setPx(0); setPy(0); setEraseMode(false)
      setEditVersion(v => v + 1)
    }
    img.src = url
  }

  const resetHeal = () => {
    if (photoImg) {
      buildEditCanvas(photoImg)
      setEditVersion(v => v + 1)
    }
  }

  // ---- preview pointer logic: pan/pinch OR erase brush ----
  const previewToCanvas = (e) => {
    const rect = previewRef.current.getBoundingClientRect()
    return {
      cx: (e.clientX - rect.left) * (W / rect.width),
      cy: (e.clientY - rect.top) * (H / rect.height),
      rect,
    }
  }

  const canvasToSource = (cx, cy) => {
    const src = editRef.current?.canvas || photoImg
    const t = photoTransform(src.width, src.height, zoom, px, py)
    return { x: (cx - t.dx) / t.s, y: (cy - t.dy) / t.s, s: t.s }
  }

  const drawBrushFeedback = (e) => {
    const ov = overlayRef.current
    const prev = previewRef.current
    if (!ov || !prev) return
    const rect = prev.getBoundingClientRect()
    if (ov.width !== Math.round(rect.width)) {
      ov.width = Math.round(rect.width)
      ov.height = Math.round(rect.height)
    }
    const octx = ov.getContext('2d')
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const r = (brushSize / W) * rect.width
    octx.fillStyle = 'rgba(239,68,68,0.4)'
    octx.beginPath()
    octx.arc(x, y, r, 0, Math.PI * 2)
    octx.fill()
  }

  const onPointerDown = (e) => {
    if (!photoImg) return
    e.preventDefault()
    if (eraseMode) {
      strokeRef.current = { points: [], id: e.pointerId }
      const { cx, cy } = previewToCanvas(e)
      const p = canvasToSource(cx, cy)
      strokeRef.current.points.push(p)
      drawBrushFeedback(e)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    const pts = dragRef.current?.pointers || new Map()
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragRef.current = { pointers: pts, startPx: px, startPy: py, startZoom: zoom, startDist: null }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (eraseMode) {
      const st = strokeRef.current
      if (!st || st.id !== e.pointerId) return
      const { cx, cy } = previewToCanvas(e)
      st.points.push(canvasToSource(cx, cy))
      drawBrushFeedback(e)
      return
    }
    const d = dragRef.current
    if (!d || !photoImg || !d.pointers.has(e.pointerId)) return
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...d.pointers.values()]
    const el = previewRef.current
    if (!el) return
    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (d.startDist == null) { d.startDist = dist; d.startZoom = zoom; return }
      const z = Math.min(3, Math.max(1, d.startZoom * (dist / d.startDist)))
      setZoom(z)
    } else if (pts.length === 1) {
      if (!d.startPt) { d.startPt = { ...pts[0] }; return }
      const rect = el.getBoundingClientRect()
      const src = editRef.current?.canvas || photoImg
      const t = photoTransform(src.width, src.height, zoom, px, py)
      const freeX = Math.max(1, t.freeX)
      const freeY = Math.max(1, t.freeY)
      const scale = W / rect.width
      const dxCanvas = (pts[0].x - d.startPt.x) * scale
      const dyCanvas = (pts[0].y - d.startPt.y) * scale
      setPx(Math.min(1, Math.max(-1, d.startPx + dxCanvas / freeX)))
      setPy(Math.min(1, Math.max(-1, d.startPy + dyCanvas / freeY)))
    }
  }

  const onPointerUp = (e) => {
    if (eraseMode) {
      const st = strokeRef.current
      if (!st || st.id !== e.pointerId) return
      strokeRef.current = null
      const ov = overlayRef.current
      if (ov) ov.getContext('2d').clearRect(0, 0, ov.width, ov.height)
      if (st.points.length && editRef.current) {
        setHealing(true)
        // let the UI paint the "healing" state before the heavy loop
        setTimeout(() => {
          const src = editRef.current.canvas
          const rSrc = brushSize / st.points[0].s
          inpaintRegion(editRef.current.ctx, src.width, src.height, st.points, rSrc)
          setHealing(false)
          setEditVersion(v => v + 1)
        }, 30)
      }
      return
    }
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
    a.download = `slide-${format.key}.jpg`
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
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14, color: '#1e293b' }}>
        ✨ בונה שקפים
      </h2>

      {/* בורר פורמט */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
        {FORMATS.map(f => (
          <button key={f.key} onClick={() => setFormat(f)}
            style={{
              padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
              border: format.key === f.key ? '2.5px solid #3a5c3a' : '1.5px solid #e2e8f0',
              background: format.key === f.key ? '#f0fdf4' : '#fafafa',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
            <span style={{
              width: f.w >= f.h ? 26 : Math.round(26 * f.w / f.h),
              height: f.h >= f.w ? 26 : Math.round(26 * f.h / f.w),
              border: '2px solid ' + (format.key === f.key ? '#3a5c3a' : '#94a3b8'),
              borderRadius: 4, display: 'block',
            }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: format.key === f.key ? '#15803d' : '#475569' }}>{f.label}</span>
            <span style={{ fontSize: 8.5, color: '#94a3b8' }}>{f.sub}</span>
          </button>
        ))}
      </div>

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
        <button onClick={() => { setPhotoImg(null); editRef.current = null; setZoom(1); setPx(0); setPy(0); setEraseMode(false); setEditVersion(v => v + 1) }}
          style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0 }}>
          ✕ הסרת התמונה
        </button>
      )}

      {/* Live preview */}
      {resultUrl && (
        <div style={{ marginBottom: 16 }}>
          {photoImg && (
            <p style={{ fontSize: 12, color: eraseMode ? '#dc2626' : '#64748b', textAlign: 'center', margin: '4px 0 8px', fontWeight: 600 }}>
              {eraseMode
                ? (healing ? '🩹 מרפא את האזור...' : '🩹 צבעי עם האצבע על מה שרוצים למחוק')
                : '👆 גררי את התמונה למיקום · צביטה להגדלה'}
            </p>
          )}
          <div style={{ position: 'relative' }}>
            <img ref={previewRef} src={resultUrl} alt="slide"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              style={{ width: '100%', borderRadius: 14, display: 'block', boxShadow: '0 6px 30px rgba(0,0,0,0.18)', touchAction: photoImg ? 'none' : 'auto', cursor: photoImg ? (eraseMode ? 'crosshair' : 'grab') : 'default', userSelect: 'none', opacity: healing ? 0.7 : 1 }} />
            <canvas ref={overlayRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 14 }} />
          </div>
        </div>
      )}

      {photoImg && (
        <>
          {/* Erase brush */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setEraseMode(!eraseMode)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: eraseMode ? '2.5px solid #dc2626' : '1.5px solid #e2e8f0', background: eraseMode ? '#fef2f2' : '#fafafa', color: eraseMode ? '#dc2626' : '#334155' }}>
              🩹 {eraseMode ? 'מברשת מחיקה פעילה — לחצי לסיום' : 'מברשת מחיקה (כמו AirBrush)'}
            </button>
            <button onClick={resetHeal}
              style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: '1.5px solid #e2e8f0', background: '#fafafa', color: '#64748b' }}>
              ↺ ביטול
            </button>
          </div>
          {eraseMode && (
            <Slider label={`גודל מברשת — ${brushSize}`}
              value={brushSize} onChange={setBrushSize} min={20} max={140} step={5} />
          )}

          <Slider label={`הגדלת התמונה — ${Math.round(zoom * 100)}%`}
            value={zoom} onChange={setZoom} min={1} max={3} step={0.05} />
          <Slider label={`שקיפות שכבת הצבע — ${Math.round(overlayOpacity * 100)}%`}
            value={overlayOpacity} onChange={setOverlayOpacity} min={0} max={0.9} step={0.05} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={coverEdges} onChange={e => setCoverEdges(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#3a5c3a' }} />
            כיסוי אטום למעלה ולמטה (מסתיר כיתוב צרוב בתמונה)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={patchOn} onChange={e => setPatchOn(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#3a5c3a' }} />
            טלאי הסתרה — פס בצבע הרקע למחיקת כיתוב צרוב
          </label>
          {patchOn && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px 2px', marginBottom: 14 }}>
              <Slider label="מיקום הטלאי — למעלה ⟵ למטה"
                value={patchY} onChange={setPatchY} min={0} max={1} step={0.02} />
              <Slider label={`גובה הטלאי — ${Math.round(patchH * 100)}%`}
                value={patchH} onChange={setPatchH} min={0.05} max={0.45} step={0.01} />
            </div>
          )}
        </>
      )}

      {/* Background / tint color */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        {photoImg ? 'גוון שכבת הצבע על התמונה' : 'גוון רקע'}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
        {BG_OPTIONS.map(o => (
          <button key={o.val} onClick={() => setBgColor(o.val)}
            style={{
              height: 52, borderRadius: 10, cursor: 'pointer',
              background: o.val,
              border: bgColor === o.val ? '3px solid #c8a455' : '2px solid #e2e8f0',
              color: o.dark ? 'rgba(255,255,255,0.85)' : 'rgba(40,40,40,0.75)',
              fontSize: 10, fontWeight: 700,
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

      {/* Title color */}
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        צבע כותרת
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {TITLE_COLORS.map(c => (
          <button key={c.key} onClick={() => setTitleColorKey(c.key)}
            style={{ flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: titleColorKey === c.key ? '2.5px solid #3a5c3a' : '1.5px solid #e2e8f0', background: '#fafafa', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: c.val, border: '1px solid #cbd5e1', display: 'inline-block' }} />
            {c.label}
          </button>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={logoOn} onChange={e => setLogoOn(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#3a5c3a' }} />
        לוגו קטן בתחתית השקף
      </label>
      {logoOn && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {LOGO_COLORS.map(c => (
            <button key={c.key} onClick={() => setLogoColorKey(c.key)}
              style={{ flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12, border: logoColorKey === c.key ? '2.5px solid #3a5c3a' : '1.5px solid #e2e8f0', background: '#fafafa', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.val, border: '1px solid #cbd5e1', display: 'inline-block' }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
      {logoOn && (
        <Slider label={`גודל לוגו — ${Math.round(logoScale * 100)}%`}
          value={logoScale} onChange={setLogoScale} min={0.5} max={2.2} step={0.1} />
      )}

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
            ⬇️ הורד תמונה ({format.label})
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

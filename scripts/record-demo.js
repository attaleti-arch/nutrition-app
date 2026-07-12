/**
 * record-demo.js — Playwright video tour of the nutrition app demo page
 *
 * Usage:
 *   1. Start dev server: npm run dev
 *   2. Run script:       node scripts/record-demo.js
 *
 * Output: ./demo-videos/demo-tour.webm  (convert to mp4 with ffmpeg)
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const VIDEO_DIR = path.resolve(__dirname, '../demo-videos')
const BASE_URL = process.env.DEMO_URL || 'http://localhost:3000'
const VIEWPORT = { width: 390, height: 844 } // iPhone 14 Pro

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function smoothScroll(page, targetY, steps = 20) {
  const current = await page.evaluate(() => window.scrollY)
  const delta = (targetY - current) / steps
  for (let i = 0; i < steps; i++) {
    await page.evaluate(d => window.scrollBy(0, d), delta)
    await sleep(40)
  }
}

async function main() {
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true })

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'he-IL',
    recordVideo: {
      dir: VIDEO_DIR,
      size: VIEWPORT,
    },
  })

  const page = await context.newPage()

  console.log('📹 מתחיל הקלטה...')
  await page.goto(BASE_URL + '/demo', { waitUntil: 'networkidle' })
  await sleep(1500)

  // ── Scene 1: Header + calorie bar (4s) ──────────────────────────────
  console.log('🎬 סצנה 1: Header וסרגל קלוריות')
  await sleep(4000)

  // ── Scene 2: Macro bars (2s) ──────────────────────────────────────
  console.log('🎬 סצנה 2: מאקרו בארס')
  await smoothScroll(page, 280)
  await sleep(2500)

  // ── Scene 3: Scroll through diary (breakfast → lunch) ──────────────
  console.log('🎬 סצנה 3: יומן — בוקר')
  await smoothScroll(page, 500)
  await sleep(2000)

  // tap a checkbox
  const checkItems = await page.locator('button').filter({ hasText: 'קוטג׳' }).all()
  if (checkItems.length) {
    await checkItems[0].click()
    await sleep(600)
    await checkItems[0].click()
    await sleep(800)
  }

  console.log('🎬 סצנה 4: יומן — צהריים')
  await smoothScroll(page, 900)
  await sleep(2500)

  // ── Scene 5: Scroll to daily stats ─────────────────────────────────
  console.log('🎬 סצנה 5: מעקב יומי')
  await smoothScroll(page, 1300)
  await sleep(2000)

  // ── Scene 6: Back to top, switch to Guides tab ────────────────────
  console.log('🎬 סצנה 6: לשונית מדריכים')
  await smoothScroll(page, 0)
  await sleep(800)

  await page.locator('button', { hasText: 'מדריכים' }).click()
  await sleep(1200)

  await smoothScroll(page, 300)
  await sleep(2000)
  await smoothScroll(page, 700)
  await sleep(2000)

  // ── Scene 7: Streak banner at bottom of guides ────────────────────
  console.log('🎬 סצנה 7: רצף ואחיזה')
  await smoothScroll(page, 1200)
  await sleep(2500)

  // ── Scene 8: Agent tab ────────────────────────────────────────────
  console.log('🎬 סצנה 8: לשונית Agent')
  await smoothScroll(page, 0)
  await sleep(600)

  await page.locator('button', { hasText: 'Agent' }).click()
  await sleep(1500)

  // scroll to see conversation
  await smoothScroll(page, 200)
  await sleep(2500)
  await smoothScroll(page, 500)
  await sleep(2000)

  // type a demo message
  const input = page.locator('input[placeholder]').last()
  await input.click()
  await sleep(400)
  await input.type('מה הכי חשוב בירידה במשקל?', { delay: 60 })
  await sleep(800)
  await page.keyboard.press('Enter')
  await sleep(2000)

  // wait for "response"
  await sleep(1800)

  // ── Scene 9: End — back to header ──────────────────────────────────
  console.log('🎬 סצנה 9: סיום')
  await smoothScroll(page, 0)
  await sleep(3000)

  // ── Finish ─────────────────────────────────────────────────────────
  await context.close()
  await browser.close()

  // rename video
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'))
  if (files.length) {
    const latest = files
      .map(f => ({ f, t: fs.statSync(path.join(VIDEO_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0].f
    const dest = path.join(VIDEO_DIR, 'demo-tour.webm')
    if (dest !== path.join(VIDEO_DIR, latest)) {
      fs.renameSync(path.join(VIDEO_DIR, latest), dest)
    }
    console.log('\n✅ סיום! הסרטון נשמר ב:', dest)
    console.log('📦 להמרה ל-mp4:')
    console.log('   ffmpeg -i demo-videos/demo-tour.webm -c:v libx264 -crf 18 demo-videos/demo-tour.mp4')
  } else {
    console.log('⚠️  לא נמצא קובץ וידאו ב:', VIDEO_DIR)
  }
}

main().catch(err => { console.error('❌ שגיאה:', err); process.exit(1) })

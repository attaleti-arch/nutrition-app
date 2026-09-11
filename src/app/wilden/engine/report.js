'use client'

// ─── כשמשהו נשבר אצל ילד ברחוב ───
// "נימי נתפס אבל המסך נעשה לבן ואז error." אין קונסולה בטלפון של ילד, ואין
// דרך לשחזר מהמעבדה כל מה שקורה שם: מצלמה, חיישנים, וידאו ו-WebGL ביחד.
// לכן השגיאה נשלחת אלינו: מה נשבר, איפה בקוד, ובאיזה מצב היה המשחק.
//
// מה לא נשלח: מיקום, מסלול, בית, שם. רק שם המצב, מספר התחנה, מזהה היצור
// והדפדפן. זה מספיק כדי לתקן, וזה לא עוקב אחרי אף אחד.

const MAX = 5                      // מספיק כדי להבין, בלי להציף
let sent = 0
let getState = null

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : undefined)

export function report(err, extra = {}) {
  if (sent >= MAX) return
  sent++
  let snap = {}
  try {
    const g = getState?.()
    if (g) snap = { state: g.state, stop: g.run?.stop ?? null, creature: g.run?.target?.creature || g.run?.creature || null,
      stops: g.run?.stops?.length ?? null, resolved: !!g.run?.resolved, walks: g.progress?.walks ?? null }
  } catch (e) { /* */ }
  const body = {
    msg: clip(err?.message || String(err || 'unknown'), 300),
    stack: clip(err?.stack, 1200),
    where: clip(extra.where, 40),
    info: clip(extra.info, 500),
    ua: clip(typeof navigator !== 'undefined' ? navigator.userAgent : '', 200),
    build: process.env.NEXT_PUBLIC_BUILD || 'dev',
    ...snap,
  }
  try {
    // keepalive: גם אם המסך נסגר מיד אחרי, הדיווח יוצא.
    fetch('/wilden/api/log', { method: 'POST', keepalive: true,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
  } catch (e) { /* */ }
}

// שגיאות שלא עוברות דרך גבול שגיאה של React: אירועים, טיימרים, הבטחות.
export function installReporter(readState) {
  if (typeof window === 'undefined' || window.__wildenReport) return
  window.__wildenReport = true
  getState = readState || null
  window.addEventListener('error', e => report(e.error || new Error(e.message), { where: 'window' }))
  window.addEventListener('unhandledrejection', e => report(e.reason || new Error('rejection'), { where: 'promise' }))
}

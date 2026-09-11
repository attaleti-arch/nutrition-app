// ─── יומן שגיאות מהטלפון ───
// מה שנשלח מ-engine/report נכתב ללוג של Vercel, ומשם אפשר לקרוא אותו.
// אין כאן בסיס נתונים ואין קובץ: שורה אחת בלוג, וזהו.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  let b = {}
  try { b = await req.json() } catch (e) { /* גוף פגום — עדיין רושמים מה שיש */ }
  const s = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').slice(0, n) : v ?? '')
  console.error(
    `wilden client error | ${s(b.msg, 300)} | where=${s(b.where, 40)} state=${s(b.state, 30)} ` +
    `creature=${s(b.creature, 20)} stop=${b.stop ?? '-'}/${b.stops ?? '-'} resolved=${b.resolved ? 1 : 0} ` +
    `walks=${b.walks ?? '-'} build=${s(b.build, 20)}\n  ua: ${s(b.ua, 200)}\n  stack: ${s(b.stack, 1200)}` +
    (b.info ? `\n  tree: ${s(b.info, 500)}` : '')
  )
  return new Response(null, { status: 204 })
}

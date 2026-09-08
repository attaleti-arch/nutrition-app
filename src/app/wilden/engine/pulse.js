// ─── חם/קר בדופק ───
// כמו גלאי מתכות: מרווח ארוך בין רעידות כשרחוק, קצר כשקרוב.
// טהור — ה-hook (hooks/usePulse.js) רק מפעיל את הרעידה בזמן.
export function pulsePeriod(dist, { near = 250, far = 1900, perM = 130, base = 200 } = {}) {
  if (dist == null || !Number.isFinite(dist)) return null
  return Math.max(near, Math.min(far, base + dist * perM))
}

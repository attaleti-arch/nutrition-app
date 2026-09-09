// ─── הישגים ───
// "הבן שלי אומר שחסר achievements." תג על כל פעם ראשונה, ועל כל מדרגה.
// הכול נגזר מ-progress — אין מצב נפרד לתגים, אז הם לא יכולים להתפספס
// ולא להיעלם במיזוג בין טלפונים. earned(progress) מחזיר את מי שהושג;
// newlyEarned(before, after) — מה נפתח במסע הזה, למסך הסיום.

import { AVAILABLE } from './coins.js'
import { countAtStage } from './stages.js'

export const BADGES = [
  { id: 'first-walk', icon: '🚶', name: 'המסע הראשון', desc: 'יצאתם וחזרתם.', of: p => p.walks || 0, need: 1 },
  { id: 'first-catch', icon: '🎯', name: 'התפיסה הראשונה', desc: 'יצור אחד בבית.', of: p => (p.creatures || []).length, need: 1 },
  { id: 'three-creatures', icon: '🐾', name: 'שלושה בבית', desc: 'שלושה יצורים שונים.', of: p => (p.creatures || []).length, need: 3 },
  { id: 'all-eight', icon: '👑', name: 'כל היצורים', desc: 'כל יצור בעולם נתפס לפחות פעם אחת.', of: p => AVAILABLE.filter(id => (p.creatures || []).includes(id)).length, need: AVAILABLE.length },
  { id: 'walks-5', icon: '🥾', name: '5 מסעות', desc: 'חמישה מסעות הושלמו.', of: p => p.walks || 0, need: 5 },
  { id: 'walks-10', icon: '🏔️', name: '10 מסעות', desc: 'עשרה מסעות.', of: p => p.walks || 0, need: 10 },
  { id: 'walks-25', icon: '🌍', name: '25 מסעות', desc: 'עשרים וחמישה מסעות. זה כבר הרגל.', of: p => p.walks || 0, need: 25 },
  { id: 'week-4', icon: '📅', name: 'ארבעה בשבוע', desc: 'ארבעה מסעות בשבוע אחד — הלוח של הבן שלה.', of: p => walksInWeek(p), need: 4 },
  { id: 'km-10', icon: '🛤️', name: '10 ק״מ ברגליים', desc: 'עשרה קילומטרים הליכה.', of: p => Math.floor((p.metersTotal || 0) / 1000), need: 10 },
  { id: 'km-25', icon: '🧭', name: '25 ק״מ', desc: 'עשרים וחמישה קילומטרים.', of: p => Math.floor((p.metersTotal || 0) / 1000), need: 25 },
  { id: 'km-50', icon: '🗺️', name: '50 ק״מ', desc: 'חמישים קילומטרים. חצי מרתון ועוד.', of: p => Math.floor((p.metersTotal || 0) / 1000), need: 50 },
  { id: 'gold-first', icon: '🥇', name: 'קפיצה לזהב', desc: 'מטבע זהב ראשון.', of: p => p.golds || 0, need: 1 },
  { id: 'gold-5', icon: '💰', name: 'חמישה זהובים', desc: 'חמישה מטבעות זהב.', of: p => p.golds || 0, need: 5 },
  { id: 'jump-30', icon: '🦘', name: 'קפיצה של 30 ס״מ', desc: 'הטלפון מדד קפיצה של 30 ס״מ ומעלה.', of: p => p.bestJumpCm || 0, need: 30 },
  { id: 'run-first', icon: '🏃', name: 'ריצת המטבעות', desc: 'ריצה ראשונה של 20 שניות.', of: p => p.runs || 0, need: 1 },
  { id: 'run-12', icon: '⚡', name: '12 בריצה אחת', desc: 'שנים-עשר מטבעות בריצה אחת.', of: p => p.bestRun || 0, need: 12 },
  { id: 'coins-100', icon: '🪙', name: '100 מטבעות', desc: 'מאה מטבעות נאספו בסך הכול.', of: p => p.coinsEarned || 0, need: 100 },
  { id: 'coins-500', icon: '🏦', name: '500 מטבעות', desc: 'חמש מאות.', of: p => p.coinsEarned || 0, need: 500 },
  { id: 'hatch-first', icon: '🥚', name: 'הביצה בקעה', desc: 'יצור בצבע נדיר.', of: p => (p.variants || []).length, need: 1 },
  { id: 'hatch-3', icon: '🌈', name: 'שלושה צבעים', desc: 'שלושה יצורים בצבעים נדירים.', of: p => (p.variants || []).length, need: 3 },
  { id: 'grown-first', icon: '🌱', name: 'הוא גדל', desc: 'יצור אחד הגיע לשלב הבוגר — שלוש תפיסות.', of: p => countAtStage(p, 2), need: 1 },
  { id: 'grown-3', icon: '🌳', name: 'שלושה בוגרים', desc: 'שלושה יצורים בשלב הבוגר.', of: p => countAtStage(p, 2), need: 3 },
  { id: 'legend-first', icon: '✦', name: 'אגדי', desc: 'יצור אחד הגיע לשלב האגדי — שבע תפיסות.', of: p => countAtStage(p, 3), need: 1 },
  { id: 'guardian', icon: '🗿', name: 'השומר התעורר', desc: 'הבקשה הראשונה של השומר.', of: p => (p.quests || []).length, need: 1 },
  { id: 'world', icon: '🏰', name: 'העולם נבנה', desc: 'כל הבקשות של השומר.', of: p => (p.quests || []).length, need: 5 },
]

export const badgeById = id => BADGES.find(b => b.id === id) || null

// כמה מסעות בשבעת הימים האחרונים לפי walkDays (מפתחות יום, YYYY-MM-DD).
export function walksInWeek(p, today = null) {
  const days = p?.walkDays || []
  if (!days.length) return 0
  const last = today || days[days.length - 1]
  const t = Date.parse(last + 'T12:00:00Z')
  if (Number.isNaN(t)) return 0
  return days.filter(d => { const x = Date.parse(d + 'T12:00:00Z'); return !Number.isNaN(x) && t - x >= 0 && t - x < 7 * 86400000 }).length
}

export const hasBadge = (p, b) => b.of(p) >= b.need

export function earned(p) {
  return BADGES.filter(b => hasBadge(p, b)).map(b => b.id)
}

export function newlyEarned(before, after) {
  const was = new Set(earned(before || {}))
  return earned(after).filter(id => !was.has(id))
}

// לרשימה: [{ ...badge, done, have }]
export function badgeList(p) {
  return BADGES.map(b => ({ id: b.id, icon: b.icon, name: b.name, desc: b.desc, need: b.need, have: Math.min(b.need, b.of(p)), done: hasBadge(p, b) }))
}

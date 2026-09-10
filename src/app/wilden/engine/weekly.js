// ─── הבונוס השבועי ───
// "רצף יומי" רך: רצף שנשבר כשמפספסים יום הוא סיבה להפסיק, במיוחד לילד
// שרק מתחיל. במקום זה — שבוע: שלושה מסעות בין ראשון לשבת נותנים ביצה
// (או מטבעות, אם כבר יש ביצה על הביקון). המונה מתאפס ביום ראשון ולא
// "נשבר" — יום שפוספס לא מוחק כלום.
//
// טהור. ימים הם מפתחות YYYY-MM-DD (persist.dayKey), כמו walkDays.

import { tr } from '../i18n/index.js'

export const WEEKLY_GOAL = 3
export const WEEKLY_COINS = 40

// יום ראשון של השבוע שבו נמצא היום הזה.
export function weekStart(day) {
  const t = Date.parse(day + 'T12:00:00Z')
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

// כמה מסעות בשבוע של היום הזה.
export function walksInWeekOf(progress, day) {
  const ws = weekStart(day)
  if (!ws) return 0
  return (progress?.walkDays || []).filter(d => weekStart(d) === ws).length
}

// מגיע בונוס? הגיעו ליעד השבוע, ועוד לא קיבלו אותו השבוע.
export function weeklyBonusDue(progress, day) {
  const ws = weekStart(day)
  if (!ws) return false
  return walksInWeekOf(progress, day) >= WEEKLY_GOAL && progress?.weeklyBonus !== ws
}

// נותנים: ביצה אם אין, אחרת מטבעות. מחזיר { progress, gift: 'egg' | 'coins' | null }.
export function grantWeekly(progress, day, t = null) {
  if (!weeklyBonusDue(progress, day)) return { progress, gift: null }
  const ws = weekStart(day)
  if (!progress.egg) {
    return { progress: { ...progress, weeklyBonus: ws, egg: { boughtAt: t, gift: true } }, gift: 'egg' }
  }
  return { progress: { ...progress, weeklyBonus: ws, coins: (progress.coins || 0) + WEEKLY_COINS }, gift: 'coins' }
}

// למסך הבית: { have, need, done, gift }
export function weeklyStatus(progress, day) {
  const have = walksInWeekOf(progress, day)
  const done = progress?.weeklyBonus === weekStart(day)
  return { have: Math.min(have, WEEKLY_GOAL), need: WEEKLY_GOAL, done, gift: progress?.egg ? 'coins' : 'egg' }
}

// ─── סיכום להורה ───
// בסוף כל הליכה: מרחק, דקות, וצעדים משוערים (צעד של ילד ≈ 0.55 מ').
// בלי קלוריות — הילדים האלה שומעים על משקל מספיק.
export const KID_STRIDE_M = 0.55
export function walkSummary({ walked = 0, startedAt = null, t = null } = {}) {
  const meters = Math.max(0, Math.round(walked || 0))
  const ms = startedAt != null && t != null ? Math.max(0, t - startedAt) : 0
  const minutes = Math.round(ms / 60000)
  const steps = Math.round(meters / KID_STRIDE_M / 50) * 50
  return { meters, minutes, steps }
}
export const km = m => (m >= 1000 ? `${(m / 1000).toFixed(1)} ${tr('ק״מ')}` : `${m} ${tr('מ׳')}`)

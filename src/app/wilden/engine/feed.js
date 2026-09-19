// ─── להאכיל את בן הלוויה ───
// "למה שהילד ישתוקק לעוד דבש?" — כי דבש הוא אוכל, וזה מה שמבדיל אותו
// משאר המשאבים. אבן, מים ורוח בונים את העולם; דבש מאכיל את היצור שלך
// ומגדל אותו.
//
// וזה סוגר את השרשרת שילד יכול להגיד בקול:
//   קטפתי פרחים → האני עשתה מהם דבש → האכלתי את נימי → נימי גדלה.
// ארבעה שלבים, כולם קורים ברגליים, וכולם נגמרים במשהו שרואים.
//
// ── את מי מאכילים ──
// "מעולה לבן הלוויה." רק אותו: זה מחזק את הקשר איתו, וזה נותן סיבה
// אמיתית להחליף בן לוויה — כל אחד גדל רק כשהוא זה שיוצא איתך.
//
// ── וכמה ──
// מסע טוב נותן 3 עד 5 צנצנות, ושלוש צנצנות הן נקודת צמיחה. גור→בוגר
// דורש שלוש נקודות, כלומר בערך שישה מסעות של האכלה בלבד — ולצד זה
// ממשיכות לרוץ התפיסות וההליכה המשותפת, שגם הן נקודות. ההאכלה מאיצה,
// היא לא הדרך היחידה.
//
// טהור. progress.fed — { [id]: כמה צנצנות אכל }.

export const JARS_PER_POINT = 3

export const jarsOf = (progress, id) => (id && progress?.fed?.[id]) || 0
// כמה נקודות צמיחה יצאו ממה שאכל
export const fedCredits = (progress, id) => Math.floor(jarsOf(progress, id) / JARS_PER_POINT)
// כמה צנצנות נשארו עד הנקודה הבאה — לפס שזז בכל האכלה
export const towardNext = (progress, id) => jarsOf(progress, id) % JARS_PER_POINT

export const honeyOf = progress => progress?.res?.honey || 0

// מאכילים רק את בן הלוויה, ורק אם יש צנצנת.
export function canFeed(progress, id = progress?.buddy) {
  if (!id || progress?.buddy !== id) return false
  if (!(progress?.creatures || []).includes(id)) return false
  return honeyOf(progress) > 0
}

export function feed(progress, id = progress?.buddy) {
  if (!canFeed(progress, id)) return progress
  return {
    ...progress,
    res: { ...(progress.res || {}), honey: honeyOf(progress) - 1 },
    fed: { ...(progress.fed || {}), [id]: jarsOf(progress, id) + 1 },
  }
}

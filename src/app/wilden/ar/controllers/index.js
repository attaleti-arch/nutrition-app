// ─── מרשם ה-controllers ───
// לכל יצור כוריאוגרפיה משלו. ה-controller הוא לוגיקה טהורה — פאזות,
// יעדים וטקסט — ו-Stage רק מצייר אותו. כך אפשר לבדוק מפגש שלם בלי
// מצלמה ובלי חיישנים, וכך אפשר לכתוב את הנותרים בלי לגעת ב-AR.
//
// מאז המרדף כולם על אותו שלד (chase.js) עם סגנון בריחה לפי האופי.
// nimi.js (קריאת שביל העקבות) ו-flyer.js נשארים כבקרים חלופיים.

import { makeChase } from './chase.js'
import { makeStatue } from './statue.js'

const run = makeChase({ id: 'tracks-true-or-false', target: 'creature', style: 'run' })
const buzz = makeChase({ id: 'buzz', target: 'creature', style: 'fly', copy: {
  FAR: { line: 'משהו מזמזם. מהרו אליו לפני שהוא עף!', sub: 'הרימו את הטלפון ורוצו!' },
  FLEE: { line: 'הוא עף!', sub: 'חפשו אותו באוויר ורוצו שוב!' },
  NEAR: { line: 'הוא מרחף מולכם.', sub: 'לחצו במסך כדי לתפוס!' },
} })
const gust = makeChase({ id: 'gust', target: 'creature', style: 'fly', copy: {
  FAR: { line: 'משהו מרשרש למעלה. מהרו לפני שהוא עף!', sub: 'הרימו את הטלפון ורוצו!' },
  FLEE: { line: 'משב רוח! הוא עף!', sub: 'חפשו אותו גבוה ורוצו שוב!' },
  NEAR: { line: 'הוא מרחף מולכם.', sub: 'לחצו במסך כדי לתפוס!' },
} })
const shadow = makeChase({ id: 'shadow', target: 'creature', style: 'shadow' })
const stomp = makeChase({ id: 'stomp', target: 'creature', style: 'stomp' })
// נוגה: לא רצה — נמוגה לאור ומופיעה במקום אחר. הפס שנשאר הוא שביל האור.
const glow = makeChase({ id: 'glow', target: 'creature', style: 'run', copy: {
  FAR: { line: 'משהו זוהר שם. התקרבו בשקט.', sub: 'רוצו אליה!' },
  FLEE: { line: 'היא נמוגה לאור!', sub: 'עקבו אחרי הניצוצות ורוצו שוב!' },
  NEAR: { line: 'היא נעצרה. האור שלה מולכם.', sub: 'לחצו במסך כדי לתפוס אותה!' },
} })

// ויספר: הפועל ההפוך. לא רצים אליו — עומדים, והוא בא.
const statue = makeStatue({ id: 'statue' })
// "גם לדודו לא רצים." שושו יצא מאותה רוח, ובקליפ שלו הוא עושה בדיוק את
// זה — הולך אל המצלמה. אותה מכניקה, אופי אחר: ויספר ביישן ומקשיב, שושו
// סקרן ומרחרח. אותן מילים היו הופכות את שניהם לאותו יצור.
const statueDrake = makeStatue({ id: 'statue-drake', copy: {
  FAR: { line: 'אל תזוזו — הוא סקרן.', sub: 'הוא מתקרב רק כשעומדים בשקט.' },
  MOVED: { line: 'זזתם, והוא נרתע.', sub: 'שוב. פסל.' },
  NEAR: { line: 'הוא מולכם ומרחרח.', sub: 'עוד רגע אחד בלי לזוז…' },
  DONE: { line: 'הוא בחר לבוא איתכם.', sub: '' },
} })

const REGISTRY = { 'tracks-true-or-false': run, buzz, gust, shadow, stomp, glow, statue, 'statue-drake': statueDrake }

export function controllerFor(creature) {
  return REGISTRY[creature?.controller] || null
}

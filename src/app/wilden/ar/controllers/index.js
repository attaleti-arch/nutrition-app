// ─── מרשם ה-controllers ───
// לכל יצור כוריאוגרפיה משלו. ה-controller הוא לוגיקה טהורה — פאזות,
// יעדים וטקסט — ו-Stage רק מצייר אותו. כך אפשר לבדוק מפגש שלם בלי
// מצלמה ובלי חיישנים, וכך אפשר לכתוב את שבעת הנותרים בלי לגעת ב-AR.

import nimi from './nimi'

const REGISTRY = { 'tracks-true-or-false': nimi }

export function controllerFor(creature) {
  return REGISTRY[creature?.controller] || null
}

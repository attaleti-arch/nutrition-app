// ─── התנועה של כל יצור, כשהוא עומד ───
// "אני ממש אשמח שהחיות ינועו במרחב ולא סתם יהיו שם… נניח בולדר ממש גוש
// לא זז."
//
// היושב כאן ולא בתוך מסך אחד, כי אותו יצור עומד בשני מקומות: בעולם
// הבית (ui/HomeWorld) וברחוב, במפגש עצמו (ar/Figure). בשניהם הוא היה
// קפוא מאותה סיבה בדיוק — הנחנו ש-WebP מונפש כבר זז מספיק. לבולדר,
// שהוא סלע, זה פשוט לא נכון.
//
// הכול במקום: סיבוב וקנה מידה סביב הרגליים, בלי הזזה אופקית. המקומות
// בעולם הבית צפופים במכוון (content/spots.js), ויש בדיקה שמוודאת שאף
// שתי דמויות לא נוגעות — תנועה במרחב הייתה שוברת אותה.

export const IDLE = {
  bolder: 'wildenLumber 7s',      // גוש אבן: מעביר משקל לאט, ונושם
  kraag: 'wildenLumber 9.5s',     // אותו דבר, כבד ואיטי יותר
  nimi: 'wildenPerk 6.5s',        // גור: עומד, ופתאום קפיצה קטנה
  gali: 'wildenSlosh 4.2s',       // מים: מתנדנדת כמו נוזל
  lumi: 'wildenFlicker 3.4s',     // אור: מרצד ועולה קצת
  tzel: 'wildenCreep 5s',         // צל: נמתח ומתכווץ על הקרקע
  noga: 'wildenSway 5.5s',        // מתנדנדת ברוח
  whisper: 'wildenBreathe2 4.6s', // ביישן: רק נושם
  drake: 'wildenSway 4s',         // דרקון קטן: מתנדנד על הרגליים
  dabashon: 'wildenFlutter 2.8s', // דבורה: מרפרפת
  ruchi: 'wildenFlutter 3.4s',    // ציפור רוח: רפרוף רחב יותר
}

// air בעולם הבית כבר מרחף על הכפתור עצמו — שם לא מכפילים.
export const idleFor = (id, skip = false) =>
  (skip ? null : `${IDLE[id] || 'wildenBreathe2 5.2s'} ease-in-out infinite`)

// הקיפריימים. מוזרקים פעם אחת בכל מסך שמשתמש בהם.
export const IDLE_CSS = `
@keyframes wildenLumber { 0%,100% { transform: translateY(0) rotate(0deg) scale(1,1) } 28% { transform: translateY(-0.7%) rotate(-0.55deg) scale(1.006,0.995) } 62% { transform: translateY(0) rotate(0.5deg) scale(0.996,1.006) } }
@keyframes wildenPerk { 0%,70%,100% { transform: translateY(0) scale(1,1) } 76% { transform: translateY(0) scale(1.05,0.94) } 84% { transform: translateY(-5.5%) scale(0.97,1.04) } 92% { transform: translateY(0) scale(1.02,0.98) } }
@keyframes wildenSlosh { 0%,100% { transform: skewX(0deg) scale(1,1) } 50% { transform: skewX(1.7deg) scale(0.985,1.025) } }
@keyframes wildenFlicker { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-2.6%) scale(1.022) } }
@keyframes wildenCreep { 0%,100% { transform: scale(1,1) translateY(0) } 50% { transform: scale(1.03,0.965) translateY(1.1%) } }
@keyframes wildenSway { 0%,100% { transform: rotate(-1.3deg) } 50% { transform: rotate(1.3deg) } }
@keyframes wildenBreathe2 { 0%,100% { transform: scale(1,1) } 50% { transform: scale(1.012,0.99) } }
@keyframes wildenFlutter { 0%,100% { transform: translateY(0) rotate(-0.8deg) } 50% { transform: translateY(-2.2%) rotate(0.8deg) } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }
`

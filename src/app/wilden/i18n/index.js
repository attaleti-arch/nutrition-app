'use client'
import { DE } from './de.js'

// ─── שפה ───
// "אבל הכל יהיה בעברית לא?" — חבר באוסטריה רוצה לנסות עם הילד. אין מסך
// בחירת שפה: הטלפון יודע באיזו שפה הוא מוגדר, והדפדפן מוסר את זה. טלפון
// גרמני מקבל גרמנית, טלפון עברי עברית, אותו קישור. ו-🌐 ליד השם להחלפה ידנית.
//
// המנגנון הכי פשוט שיש: הטקסט העברי הוא המפתח. tr('העולם שלך נשבר.') מחזיר
// את הגרמנית אם יש, ואת העברית אם אין — אז מחרוזת שלא תורגמה עדיין לא
// שוברת כלום, פשוט נשארת בעברית. הנתונים (יצורים, בקשות, תגים) נשארים
// בעברית בקוד, והתרגום קורה בתצוגה.

const KEY = 'wilden_lang_v1'
export const LANGS = ['he', 'de']
let lang = 'he'

export function detectLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (LANGS.includes(saved)) return saved
  } catch (e) { /* */ }
  try {
    const n = (navigator.language || '').toLowerCase()
    if (n.startsWith('de')) return 'de'
  } catch (e) { /* */ }
  return 'he'
}

export const getLang = () => lang
export function setLang(l) {
  if (!LANGS.includes(l)) return
  lang = l
  try { localStorage.setItem(KEY, l) } catch (e) { /* */ }
}
export const isRtl = () => lang === 'he'
export const dirOf = () => (lang === 'he' ? 'rtl' : 'ltr')

// תרגום: המפתח הוא העברית. vars: {n: 3} מחליף {n} בטקסט.
export function tr(he, vars) {
  let s = lang === 'de' ? (DE[he] ?? he) : he
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]))
  return s
}

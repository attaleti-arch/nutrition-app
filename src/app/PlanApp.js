'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import WelcomeDocument from './WelcomeDocument'

const C = {
  greenDark: '#0f4c2a', greenMid: '#16a34a', greenLight: '#dcfce7',
  orange: '#f97316', orangeLight: '#fff7ed',
  purple: '#9333ea', purpleLight: '#faf5ff',
  blue: '#0284c7', blueLight: '#eff6ff',
  amber: '#d97706', amberLight: '#fffbeb',
  teal: '#0d9488', tealLight: '#f0fdfa',
  agent: '#4a9b8e', agentLight: '#e8f5f2',
}

const DIET_TYPES = [
  { key: 'regular', label: 'אוכלת הכל', icon: '🍗' },
  { key: 'vegetarian', label: 'צמחונית', icon: '🥚' },
  { key: 'vegan', label: 'טבעונית', icon: '🌱' },
  { key: 'keto', label: 'קיטו', icon: '🥑' },
]

const RESTRICTIONS = [
  { key: 'no_gluten', label: 'ללא גלוטן', icon: '🌾' },
  { key: 'no_lactose', label: 'ללא לקטוז', icon: '🥛' },
  { key: 'no_nuts', label: 'ללא אגוזים', icon: '🥜' },
  { key: 'no_eggs', label: 'ללא ביצים', icon: '🥚' },
  { key: 'no_fish', label: 'ללא דגים', icon: '🐟' },
  { key: 'no_sugar', label: 'ללא סוכר מוסף', icon: '🍬' },
]

const SPORT_OPTIONS = [
  { key: 'yoga', label: 'יוגה', icon: '🧘' },
  { key: 'swim', label: 'שחייה', icon: '🏊' },
  { key: 'bike', label: 'אופניים', icon: '🚴' },
  { key: 'gym', label: 'כושר', icon: '🏋️' },
  { key: 'run', label: 'ריצה', icon: '🏃' },
  { key: 'dance', label: 'ריקוד', icon: '💃' },
  { key: 'pilates', label: 'פילאטיס', icon: '🤸' },
  { key: 'other', label: 'אחר', icon: '⚡' },
]

const ACTIVITY_LEVELS = ['יושבני', 'קל', 'בינוני', 'פעיל', 'מאוד פעיל']
const ACTIVITY_MULT = { 'יושבני': 1.2, 'קל': 1.375, 'בינוני': 1.55, 'פעיל': 1.725, 'מאוד פעיל': 1.9 }
const GOALS_LIST = ['ירידה במשקל', 'חיטוב', 'שמירה על משקל', 'עלייה במסה']
// ✅ חלבון לפי גרם/ק"ג משקל גוף (לא % מהקלוריות) — חיטוב מעט גבוה יותר (דגש שריר)
const PROTEIN_G_PER_KG = {
  'ירידה במשקל': 1.5,
  'חיטוב': 1.8,
  'שמירה על משקל': 1.5,
  'עלייה במסה': 1.5,
}
// ✅ תקרה: לא יותר מ-34% מהקלוריות היומיות — מונע יעד חלבון קיצוני ללקוחות כבדות יותר בדיאטה אגרסיבית
const PROTEIN_CAL_PCT_CAP = 34
const GOALS_SPLIT = {
  'ירידה במשקל': { protein: 35, carbs: 35, fat: 30 },
  'חיטוב': { protein: 40, carbs: 30, fat: 30 },
  'שמירה על משקל': { protein: 30, carbs: 40, fat: 30 },
  'עלייה במסה': { protein: 30, carbs: 50, fat: 20 },
}

const BONUS_RECIPES = [
  { title: 'כדורי אנרגיה מעוררים', cal: '85 קל ליחידה', ingredients: 'תמרים, אגוזי מלך, קקאו איכותי, מעט קוקוס' },
  { title: 'מאפי חלבון אקספרס', cal: '140 קל למאפה', ingredients: 'גבינה לבנה 5%, ביצה, קמח כוסמין, שום שמיר' },
  { title: 'שייק ירוק מרענן ומאזן', cal: '180 קל למנה', ingredients: 'חופן תרד, חצי תפוח ירוק, משקה שקדים, מנת חלבון' }
]

const PLAN = {
  bokerSnack: 'לפני: נס קפה + חטיף בריאות עד 99 קל',
  bokerProtein: [
    { id: 'b1', text: 'משקה / חטיף חלבון', tags: [] },
    { id: 'b_pro20', text: 'מעדן פרו 20 גרם חלבון', tags: ['vegan'] },
    { id: 'b_pro25', text: 'מעדן פרו 25 גרם חלבון', tags: ['vegan'] },
    { id: 'b_kotej', text: 'קוטג׳ 5% (חצי חבילה)', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_levana', text: 'גבינה לבנה 5%', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_bulgarit', text: 'גבינה בולגרית 5%', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_tzfat', text: 'גבינה צפתית 5%', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'bnew2', text: 'גבינה צהובה 9% (פרוסה)', tags: ['vegetarian'], hide: ['vegan', 'no_lactose'] },
    { id: 'b7', text: 'ביצים קשות / חביתה', tags: [], hide: ['vegan', 'no_eggs'], calPerSlice: 70, recQty: 1, unit: 'ביצים', protPerUnit: 6.5 },
    { id: 'b_eggwhite', text: 'חלבון ביצה בלבד (ללא חלמון)', tags: [], hide: ['vegan', 'no_eggs'], calPerSlice: 17, recQty: 1, unit: 'חלבונים', protPerUnit: 3.25 },
    { id: 'b_tuna_full', text: 'טונה — חבילה שלמה', tags: [], hide: ['vegan', 'vegetarian'] },
    { id: 'b_tuna_half', text: 'טונה — חצי חבילה', tags: [], hide: ['vegan', 'vegetarian'] },
  ],
  bokerCarbs: [
    { id: 'b4', text: 'פריכית דגנים מלאים', tags: ['vegan'], hide: ['keto', 'no_gluten'], calPerSlice: 30, recQty: 1, unit: 'פריכיות' },
    { id: 'b6', text: 'פיתה כוסמין', tags: ['vegan'], hide: ['keto', 'no_gluten'] },
    { id: 'b_bread1', text: 'פרוסת לחם שיפון / כוסמין / מלא / מחמצת', tags: ['vegan'], hide: ['keto', 'no_gluten'], calPerSlice: 80, recQty: 1 },
    { id: 'bc_gf1', text: 'פרוסת לחם ללא גלוטן', tags: ['vegan'], hide: ['keto'], calPerSlice: 80, recQty: 1 },
  ],
  bokerExtra: [
    { id: 'b8q', text: '¼ אבוקדו', tags: ['vegan', 'keto'] },
    { id: 'b8', text: '½ אבוקדו', tags: ['vegan', 'keto'] },
    { id: 'b9', text: 'שיבולת שועל + חלב / משקה צמחי', hide: ['keto', 'no_gluten'], tags: ['vegetarian'] },
  ],
  carbOptions: [
    { id: 'c1', text: 'אורז מלא / קינואה', hide: ['keto'] },
    { id: 'c2', text: 'בורגול / כוסמין / קוסקוס', hide: ['keto', 'no_gluten'] },
    { id: 'c4', text: 'תפוחי אדמה / בטטה', hide: ['keto'] },
    { id: 'c5', text: 'ירקות אנטיפסטי קלויים (קישוא, חציל, בטטה)', tags: ['vegan'] },
    { id: 'c6', text: 'עדשים / חומוס מבושל', tags: ['vegan'] },
    { id: 'c7', text: 'שעועית לבנה / אדומה', tags: ['vegan'] },
    { id: 'c_gf1', text: 'כוסמת מבושלת', tags: ['vegan'], hide: ['keto'] },
    { id: 'c_gf2', text: 'פסטה מאורז / תירס', tags: ['vegan'], hide: ['keto'] },
    { id: 'c8', text: 'אפונה מבושלת / קפואה', tags: ['vegan'] },
  ],
  protOptions: [
    { id: 'p1', text: 'דג לבן (אמנון / בקלה)', hide: ['vegan', 'no_fish'] },
    { id: 'p2', text: 'סלמון', hide: ['vegan', 'no_fish'] },
    { id: 'b_tuna_full', text: 'טונה — חבילה שלמה', hide: ['vegan', 'no_fish'] },
    { id: 'b_tuna_half', text: 'טונה — חצי חבילה', hide: ['vegan', 'no_fish'] },
    { id: 'p10', text: 'חזה עוף', hide: ['vegan', 'vegetarian'] },
    { id: 'p5', text: 'ירך עוף או פרגית ללא עור', hide: ['vegan', 'vegetarian'] },
    { id: 'p_shawarma', text: 'שווארמה עוף ביתית', hide: ['vegan', 'vegetarian'] },
    { id: 'p_beef_meatballs', text: 'קציצות בקר ברוטב, לא מטוגנות', hide: ['vegan', 'vegetarian'] },
    { id: 'p_fish_meatballs', text: 'קציצות דגים לבנים ברוטב, לא מטוגנות', hide: ['vegan', 'vegetarian', 'no_fish'] },
    { id: 'p3', text: 'טופו', tags: ['vegan'] },
    { id: 'p8', text: '2 ביצים / חביתה', hide: ['vegan', 'no_eggs'] },
    { id: 'p_eggwhite', text: 'חלבון ביצה בלבד (ללא חלמון)', hide: ['vegan', 'no_eggs'] },
    { id: 'p11', text: 'מג׳דרה (עדשים + אורז)', tags: ['vegan'] },
    { id: 'p6', text: '2 המבורגר צמחוני', tags: ['vegan'] },
    { id: 'p13', text: 'גרגירי חומוס מבושל', tags: ['vegan'] },
    { id: 'p14', text: 'עדשים מבושלות', tags: ['vegan'] },
    { id: 'p15', text: 'שעועית לבנה / פול מבושל', tags: ['vegan'] },
    { id: 'p16', text: 'אדממה', tags: ['vegan'] },
    { id: 'b_kotej', text: 'קוטג׳ 5% (חצי חבילה)', hide: ['vegan', 'no_lactose'] },
    { id: 'b_gvina_levana', text: 'גבינה לבנה 5%', hide: ['vegan', 'no_lactose'] },
    { id: 'b_pro20', text: 'מעדן פרו 20 גרם חלבון', tags: ['vegan'] },
    { id: 'b_pro25', text: 'מעדן פרו 25 גרם חלבון', tags: ['vegan'] },
  ],
  fatOptions: [
    { id: 'f1', text: 'כף שמן זית', tags: ['vegan', 'keto'] },
    { id: 'f2', text: '2 כפות טחינה גולמית', tags: ['vegan'] },
    { id: 'f4', text: 'חופן אגוזי מלך / שקדים (30 גרם)', tags: ['vegan', 'keto'], hide: ['no_nuts'] },
    { id: 'f6', text: '2 כפות חמאת שקדים / בוטנים טבעית', tags: ['vegan'], hide: ['no_nuts'] },
    { id: 'f8', text: 'כף סילאן טבעי', tags: ['vegan'], hide: ['keto'] },
    { id: 'f9', text: 'כף צ׳יה', tags: ['vegan', 'keto'] },
  ],
  veggieOptions: [
    { id: 'v1', text: 'סלט טרי — מלפפון, עגבנייה, לימון + מלח' },
    { id: 'v2', text: 'ירקות קלויים בתנור, 150 גרם (זוקיני, פלפל, חציל, ברוקולי)' },
    { id: 'v3', text: 'ירקות מאודים (ברוקולי, כרובית, גזר)' },
    { id: 'v4', text: 'סלט עלים ירוקים (תרד, רוקט, חסה)' },
    { id: 'v5', text: 'שעועית ירוקה מוקפצת בשמן קל, 150 גרם' },
    { id: 'v6', text: 'סלט ירקות גדול (כ-1 ליטר, חישוב גס)' },
  ],
  erev: [
    { id: 'b_kotej_erev', text: 'קוטג׳ 5% (חצי חבילה)', hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_levana_erev', text: 'גבינה לבנה 5%', hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_bulgarit_erev', text: 'גבינה בולגרית 5%', hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_gvina_tzfat_erev', text: 'גבינה צפתית 5%', hide: ['vegan', 'no_lactose'], gramQty: true },
    { id: 'b_tuna_full_erev', text: 'טונה — חבילה שלמה', tags: [], hide: ['vegan', 'vegetarian'] },
    { id: 'b_tuna_half_erev', text: 'טונה — חצי חבילה', tags: [], hide: ['vegan', 'vegetarian'] },
    { id: 'e2', text: '50 גרם ברנפלקס + חלב / משקה צמחי', hide: ['keto', 'no_gluten'] },
    { id: 'e4', text: 'פיתה / 4 פריכיות', hide: ['keto', 'no_gluten'] },
    { id: 'b_pro20_erev', text: 'מעדן פרו 20 גרם חלבון', tags: ['vegan'] },
    { id: 'b_pro25_erev', text: 'מעדן פרו 25 גרם חלבון', tags: ['vegan'] },
    { id: 'e7', text: 'ביצה קשה', hide: ['vegan', 'no_eggs'], calPerSlice: 70, recQty: 1, unit: 'ביצים', protPerUnit: 6.5 },
    { id: 'e_eggwhite', text: 'חלבון ביצה בלבד (ללא חלמון)', hide: ['vegan', 'no_eggs'], calPerSlice: 17, recQty: 1, unit: 'חלבונים', protPerUnit: 3.25 },
    { id: 'enew1', text: 'שקשוקה 2 ביצים', tags: [], hide: ['vegan', 'no_eggs'] },
    { id: 'e_bread1', text: 'פרוסת לחם שיפון / כוסמין / מלא / מחמצת', tags: [], hide: ['keto', 'no_gluten'], calPerSlice: 80, recQty: 1 },
  ],
  benayimOptions: [
    { id: 'ben1', text: 'פרי עונתי (תפוח / אגס / קיווי)' },
    { id: 'ben2', text: 'חופן אגוזים / שקדים (5-6 יחידות)' },
    { id: 'ben3', text: 'חטיף בריאות / חלבון עד 150 קל' },
    { id: 'ben4', text: 'יוגורט 0% + פרי', hide: ['vegan', 'no_lactose'] },
  ],
  rules: [
    { icon: '💧', text: 'לפחות 2-3 ליטר מים ביום' },
    { icon: '☕', text: 'עד 2 קפה ביום' },
    { icon: '🥦', text: 'חצי צלחת = ירקות תמיד!' },
    { icon: '🔄', text: 'ניתן להחליף בין הארוחות - לא להוסיף' },
    { icon: '🍳', text: 'בישול בתרסיס שמן בלבד!' },
    { icon: '😴', text: '7 שעות שינה לפחות' },
    { icon: '🚶', text: '10,000 צעדים ביום' },
  ],
}

const SLICE_ITEMS = {}
PLAN.bokerCarbs.concat(PLAN.erev).concat(PLAN.bokerProtein).forEach(function(it) { if (it.calPerSlice) SLICE_ITEMS[it.id] = it })

// ✅ פריטי חלבון לארוחת צהריים שנמדדים ביחידות (ביצים) ולא בגרמים — בלי שורת nutrition_data
const UNIT_PROTEIN_ITEMS = {
  p8: { calPerUnit: 70, proteinPerUnit: 6.5, defaultQty: 2, unitLabel: 'יח\'', recLabel: 'ביצים' },
  p_eggwhite: { calPerUnit: 17, proteinPerUnit: 3.25, defaultQty: 1, unitLabel: 'יח\'', recLabel: 'חלבונים' },
}

// ✅ גיבוי קשיח לפריטים שהשורה שלהם בטבלת nutrition_data בשרת חסרה/מאופסת —
// נטען רק כשהשרת לא מחזיר ערך תקין, כדי שלא יוצג "0 קל" ללקוחה. אם וכאשר השורה האמיתית תתעדכן
// בשרת עם calories תקין, הגיבוי הזה מפסיק להידרס אוטומטית (ראו loadNutrition).
const NUTRITION_FALLBACK = {
  b_gvina_levana: { calories: 98, base_qty: 100, protein: 9, fat: 5, carbs: 4.3 },
  b_gvina_bulgarit: { calories: 130, base_qty: 100, protein: 17, fat: 5, carbs: 1 },
  b_gvina_tzfat: { calories: 125, base_qty: 100, protein: 15, fat: 5, carbs: 5 },
  c8: { calories: 80, base_qty: 100, protein: 5.5, fat: 0.3, carbs: 14 },
}

// ✅ ירקות "פשוטים" (סלט/חתוכים/מאודים/עלים) בלי שמן בהכנה — שומן צריך להיות אפס,
// השמן נספר בנפרד (למשל "+ כף שמן זית"). לא נוגע בפריטים שהשמן הוא חלק מההכנה עצמה
// (v2 קלויים בתנור, v5 מוקפץ בשמן, c5 אנטיפסטי קלוי) — אלה ממשיכים לפי הערך האמיתי בשרת.
const ZERO_FAT_VEGGIE_IDS = ['b_veggie1', 'v1', 'v3', 'v4', 'v6']

// ✅ "המלצה חכמה לפי צלחת" — לכל פריט יש שני ערכים נפרדים שלא מתערבבים:
// recQty = ההמלצה המוצגת (מה שנותר מתקציב הגרמים של המאקרו הרלוונטי — חלבון/פחמימה — כדי להגיע ליעד, בלי קשר אם הפריט מסומן)
// qty/calDisplay = מה שבאמת נחשב בפועל: הכמות שהוקלדה, ואם לא הוקלדה כמות — ברירת המחדל היא 100 גרם קבועים (לא ההמלצה!)
// ⚠️ התקציב וההמלצה מחושבים בגרמים של המאקרו עצמו (macroKey: 'protein'/'carbs'), לא בקלוריות הכוללות של המאכל —
// כי לכל מאכל יחס קלוריות-למאקרו שונה (חזה עוף "רזה" לעומת ירך עוף "שמן"), וחישוב לפי קלוריות כוללות היה מטעה
// ומספק פחות (או יותר) גרמים בפועל מהמטרה האמיתית. ה-קל המוצג ("≈ X קל") הוא עדיין לפי cal100, רק לתצוגה.
// הסדר הקובע מי "תופס" מהתקציב לפני מי הוא סדר הסימון בפועל (checkOrder), לא סדר הרשימה.
// פריטים ביחידות (ביצה/חלבון ביצה) שומרים על כמות יחידות קבועה גם בהמלצה וגם בחישוב.
function buildBudgetRows(items, checksMap, qtyMap, checkOrder, budget, nutritionData, unitMap, macroKey) {
  function rowFor(id, remaining) {
    const item = nutritionData[id]
    const unitItem = unitMap ? unitMap[id] : null
    const cal100 = item?.base_qty > 0 ? Math.round((item.calories || 0) / item.base_qty * 100) : (item?.calories || 0)
    const macro100 = item?.base_qty > 0 ? Math.round((item[macroKey] || 0) / item.base_qty * 100) : (item?.[macroKey] || 0)
    // ✅ תקרת מנה שפויה: הנוסחה ממליצה כמה גרם מהפריט ימלאו את כל תקציב המאקרו שנותר —
    // בפריטים דלי-מאקרו (בטטה ואנטיפסטי: רוב ירקות) זה נתן 600+ גרם. מנה מוגבלת ל-250 גרם.
    const recRaw = unitItem ? unitItem.defaultQty : (macro100 > 0 ? Math.max(0, Math.round((remaining / macro100) * 100)) : 0)
    const recQty = unitItem ? recRaw : Math.min(recRaw, 250)
    const qty = unitItem ? (qtyMap[id] || unitItem.defaultQty) : (qtyMap[id] || 100)
    const calDisplay = unitItem ? Math.round(qty * unitItem.calPerUnit) : (cal100 > 0 ? Math.round(cal100 * qty / 100) : 0)
    const macroDisplay = unitItem ? Math.round(qty * (unitItem.proteinPerUnit || 0)) : (macro100 > 0 ? Math.round(macro100 * qty / 100) : 0)
    return { item, unitItem, cal100, recQty, qty, calDisplay, macroDisplay }
  }
  const computed = {}
  let remaining = budget
  checkOrder.forEach(id => {
    if (!checksMap[id]) return // הוסר סימון אחרי שנכנס ל-checkOrder
    const row = rowFor(id, remaining)
    computed[id] = row
    remaining -= row.macroDisplay
  })
  return items.map(o => {
    const isChecked = !!checksMap[o.id]
    if (isChecked && computed[o.id]) {
      return { o, isChecked, ...computed[o.id] }
    }
    // לא מסומן — ההמלצה משקפת את מה שנותר אחרי כל מה שבאמת כבר סומן (בלי קשר למיקום ברשימה)
    return { o, isChecked, ...rowFor(o.id, remaining) }
  })
}

// ✅ ירקות הערב נשמרים ב-checks עם סיומת '_erev' (כדי לא להתנגש עם בחירת הצהריים) — להסיר לפני חיפוש בנתוני תזונה
function nutritionId(id) {
  if (id === 'b8q') return 'f3' // ¼ אבוקדו לבוקר משתמש באותה שורת תזונה כמו "50 גרם אבוקדו (רבע)" בשומנים — אין צורך בשורה כפולה
  return id.endsWith('_erev') ? id.slice(0, -5) : id
}

// ✅ פריטים בלי כמות מפורשת בטקסט (כמו "קוטג׳ / גבינה לבנה 5%") — מציגים את כמות הבסיס מ-nutrition_data כדי שהחישוב יהיה שקוף
function withBaseQty(text, item) {
  if (!item || !item.base_qty || /\d\s*(גרם|g\)|מ"ל|מ״ל|מל)|חבילה/.test(text)) return text
  return text + ' (' + item.base_qty + ' גרם)'
}

const AGENT_SYSTEM_PROMPT = `אתה "עוזר החירום" של תוכנית "בין הראש לצלחת" – מבוסס שיטת אתי אטל.

## זהותך
אתה עוזר תזונתי קליני חם, מעצים ומקצועי. לא רופא — מלווה תזונתי שמדבר בשפה חיובית ומחזיר כוח ללקוחה.

## 🚨 כלל חירום — מוחלט
כאב חד בחזה / קוצר נשימה / נפיחות פתאומית / אובדן הכרה / ירידת סוכר קיצונית / כאב בטן עז → עצור הכול:
"🚨 זה נשמע כמו מצב חירום רפואי. פני בדחיפות למיון או התקשרי ל-101. אל תישארי לבד."

## 🍽️ הצלחת החכמה (שיטת אתי)
- 50% ירקות מגוונים — הבסיס תמיד
- 25-40% חלבון איכותי: דגים שמנים, עוף/הודו, ביצים, קטניות, טופו
- 15-25% פחמימה מורכבת GI נמוך: בטטה, קינואה, כוסמת, בורגול, אורז מלא
- 10-20% שומן מהצומח: שמן זית, אבוקדו, טחינה גולמית
- סדר אכילה: חלבון וירק קודם → פחמימה אחרונה

## 📋 6 פרוטוקולים קליניים
1. מטבולי (סוכרת, אינסולין): 40% חלבון | 30% שומן | 30% פחמימה. חלבון לפני פחמימה. פעילות: כוח + אירובי. תוספים: מגנזיום, כרום, אומגה 3.
2. קרדיולוגי (לב, כולסטרול, לחץ דם): 30% חלבון רזה | 20% שומן (אומגה 3) | 50% ירקות. ללא נתרן מיותר. פעילות: אירובי מתון בלבד. לא HIIT. תוספים: CoQ10, אומגה 3.
3. אונקולוגי: 50% חלבון | 30% שומן | 20% פחמימה מבושלת. מניעת קכקסיה. להימנע מסוכר. פעילות: תנועה מתונה.
4. בלוטת תריס (כולל כריתה): סלניום (2 אגוזי ברזיל/יום), אבץ, יוד. לא HIIT. לבותירוקסין על קיבה ריקה.
5. עיכול (קרוהן, קוליטיס, IBS, צליאק): מזון מבושל/מאודה בלבד בדלקת. 5-6 ארוחות קטנות. פרוביוטיקה. פעילות: יוגה ופילאטיס.
6. כליות וגאוט: 15-20% חלבון | הידרציה 2.5-3 ליטר | הימנעות מפורינים בגאוט.

## 🧠 גישת NLP (אתי אטל)
- "מה כן לאכול" — לא "מה אסור"
- כל כישלון = משוב. "מה למדת מהמעידה הזו?"
- "אנרגיה זורמת למקום שבו תשומת הלב מתמקדת"
- זהי רגש מאחורי אכילה רגשית → הצעי חלופה
- "תוכנית אכילה" — לא "דיאטה"

## 🏋️ תזונת ספורט
- לפני אימון (120 דק'): 250 קל', 70% פחמימות, 10-15% חלבון
- ממש לפני (10-45 דק'): בננה / 2 תמרים / לחם לבן + דבש
- אחרי אימון: 600-900 קל', 40-60% פחמימות, 20-30% חלבון

## 🚫 גבולות
- ייעוץ תזונתי בלבד. לא אבחנות, לא הפסקת תרופות.
- תמיד עני — אל תשאירי את הלקוחה ריקה. גם כשיש מגבלה, תני חלופה חיובית.
- ספק רפואי → "התייעצי עם הרופא המטפל, ובינתיים..."

## 🚩 דגלים אדומים — הפניה מיידית
זהי ופעלי מיד במצבים הבאים:

**מצוקה נפשית:** ביטויים כמו "אין לי כוח להמשיך", "אני לא שווה", "רוצה להיעלם" → אמרי: "את לא לבד. מה שאת מרגישה חשוב. אני ממליצה לדבר עכשיו עם מישהו — 1201 (ער"ן) זמין 24/7."

**סימנים רפואיים חריגים:** כאב מתמשך, ירידה פתאומית במשקל, דימום, חולשה קיצונית → אמרי: "זה נשמע כמו משהו שחשוב לבדוק עם רופא — לא כי משהו בטוח רע, אלא כי את מגיעה לבדיקה."

**בקשות לאבחנה:** "האם יש לי סוכרת / הפרעת אכילה?" → אמרי: "אני לא יכולה לאבחן — רק רופא יכול. אבל אני יכולה לעזור לך להבין מה לשאול אותו."

**כלל על:** אני כלי תומך-החלטה חם ומקצועי. אני לא מחליפה רופא או דיאטנית קלינית — אבל תמיד כאן איתך.

## 💬 סגנון
- עברית חמה, קצרה, חיובית
- תמיד מסיימת במשהו מעשי אחד לעשות עכשיו`

const AGENT_QUICK = [
  "🍽️ איך בונה צלחת חכמה?",
  "🏋️ מה לאכול לפני אימון?",
  "🩸 תזונה לאיזון סוכר",
  "🫀 תזונה לבריאות הלב",
  "🦋 בלוטת תריס — מה לאכול?",
  "😔 אכלתי ריגשית — מה עכשיו?",
]

function AgentChat({ clientName, gender, clientProfile }) {
  const fem = gender !== 'זכר'
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `שלום${clientName ? ' ' + clientName.split(' ')[0] : ''}! 🌿\nאני **עוזר החירום** של "בין הראש לצלחת"\nמבוסס **שיטת אתי אטל**.\n\nכאן איתך 24/7 לכל שאלה תזונתית 💚\n\n⚠️ כאב חזה / קוצר נשימה / נפיחות פתאומית → פני מיד למיון!`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ✅ buildClientContext — הנחיות Agent קודמות לכל
  function buildClientContext() {
    if (!clientProfile) return ''

    // ✅ אם יש הנחיות Agent — הן נשלחות ראשונות ומחליפות את הכל
    if (clientProfile.agent_instructions) {
      const extras = []
      if (clientProfile.goal) extras.push('מטרה: ' + clientProfile.goal)
      if (clientProfile.weight) extras.push('משקל: ' + clientProfile.weight + 'ק"ג')
      if (clientProfile.age) extras.push('גיל: ' + clientProfile.age)
      if (clientProfile.gender) extras.push('מגדר: ' + clientProfile.gender)
      return clientProfile.agent_instructions +
        (extras.length ? '\n\nנתונים נוספים: ' + extras.join(' | ') : '')
    }

    // fallback — אם אין הנחיות Agent עדיין
    const parts = []
    if (clientProfile.goal) parts.push('מטרה: ' + clientProfile.goal)
    if (clientProfile.weight) parts.push('משקל: ' + clientProfile.weight + 'ק"ג')
    if (clientProfile.age) parts.push('גיל: ' + clientProfile.age)
    if (clientProfile.medical_history) parts.push('מחלות רקע: ' + clientProfile.medical_history)
    if (clientProfile.medications) parts.push('תרופות: ' + clientProfile.medications)
    if (clientProfile.outcome_doc) parts.push('מסע המטרה שלה:\n' + clientProfile.outcome_doc)
    return parts.length ? parts.join(' | ') : ''
  }

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')
    setShowQuick(false)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'agent',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          clientProfile: buildClientContext(),
        }),
      })
      const data = await res.json()
      const reply = data.result || 'מצטערת, נסי שוב.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בחיבור. בדקי את האינטרנט ונסי שוב.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function fmt(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/🚨([^\n]*)/g, '<span style="color:#dc2626;font-weight:700">🚨$1</span>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', borderRadius: '16px 16px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌿</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Agent חירום 24/7</div>
          <div style={{ fontSize: 11, color: '#b2dfdb' }}>בין הראש לצלחת · שיטת אתי אטל</div>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: '#ffffff20', borderRadius: 20, padding: '4px 10px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>פעיל</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8f4ef', border: '1px solid #e8f5f2', borderTop: 'none' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, animation: 'fadeUp 0.25s ease' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: '0 2px 6px rgba(74,155,142,0.3)' }}>🌿</div>
            )}
            <div
              style={msg.role === 'user' ? {
                background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff',
                borderRadius: '18px 18px 4px 18px', padding: '11px 15px', maxWidth: '78%',
                fontSize: 14, lineHeight: 1.7, boxShadow: '0 2px 10px rgba(15,76,42,0.25)',
              } : {
                background: '#fff', color: '#1a1a1a',
                borderRadius: '18px 18px 18px 4px', padding: '11px 15px', maxWidth: '82%',
                fontSize: 14, lineHeight: 1.7, border: '1px solid rgba(74,155,142,0.12)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}
              dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
            />
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌿</div>
            <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '14px 16px', border: '1px solid rgba(74,155,142,0.12)', display: 'flex', gap: 5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4a9b8e', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {showQuick && (
        <div style={{ padding: '8px 14px', background: '#f8f4ef', borderLeft: '1px solid #e8f5f2', borderRight: '1px solid #e8f5f2' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>שאלות נפוצות:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AGENT_QUICK.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{ padding: '5px 11px', borderRadius: 20, border: '1.5px solid rgba(74,155,142,0.3)', background: '#fff', color: '#3a7a6e', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '10px 14px 14px', background: '#fff', borderRadius: '0 0 16px 16px', border: '1px solid #e8f5f2', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={fem ? 'שאלי כל שאלה תזונתית...' : 'שאל כל שאלה תזונתית...'}
            rows={1} disabled={loading}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1.5px solid rgba(74,155,142,0.25)', fontSize: 14, fontFamily: 'inherit', direction: 'rtl', resize: 'none', outline: 'none', background: '#f8f4ef', maxHeight: 90, overflow: 'auto', lineHeight: 1.5 }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: '50%', background: !input.trim() || loading ? '#e5e7eb' : 'linear-gradient(135deg,#3a7a6e,#4a9b8e)', color: !input.trim() || loading ? '#9ca3af' : '#fff', border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(180deg)', flexShrink: 0, transition: 'all 0.2s', boxShadow: !input.trim() || loading ? 'none' : '0 3px 10px rgba(74,155,142,0.4)' }}>
            ➤
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 6, marginBottom: 0 }}>⚠️ לתסמינים דחופים פני למיון · ייעוץ תזונתי בלבד</p>
      </div>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

function calcBMR(weight, height, age, gender) {
  if (!weight || !height || !age) return 0
  return gender === 'נקבה'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5
}

function calcTargets(weight, height, age, gender, activity, goal) {
  var bmr = calcBMR(weight, height, age, gender)
  if (!bmr) return null
  var tdee = bmr * (ACTIVITY_MULT[activity] || 1.55)
  var lossDeficit = weight > 80 ? -825 : weight >= 70 ? -660 : -550
  var adjust = goal === 'ירידה במשקל' ? lossDeficit : goal === 'חיטוב' ? -330 : goal === 'עלייה במסה' ? 300 : 0
  var calories = Math.max(1200, Math.round(tdee + adjust))
  var split = GOALS_SPLIT[goal] || GOALS_SPLIT['ירידה במשקל']
  var gPerKg = PROTEIN_G_PER_KG[goal] || PROTEIN_G_PER_KG['ירידה במשקל']
  var protein = Math.min(Math.round(weight * gPerKg), Math.round(calories * PROTEIN_CAL_PCT_CAP / 100 / 4))
  var remainCal = Math.max(0, calories - protein * 4)
  var carbFatTotal = split.carbs + split.fat
  return {
    calories,
    protein,
    carbs: Math.round(remainCal * (split.carbs / carbFatTotal) / 4),
    fat: Math.round(remainCal * (split.fat / carbFatTotal) / 9),
  }
}

function shouldHide(item, dietType, restrictions) {
  if (!item.hide) return false
  for (var i = 0; i < item.hide.length; i++) {
    var h = item.hide[i]
    if (h === dietType) return true
    if (restrictions && restrictions[h]) return true
  }
  return false
}

// ✅ 100% = הגעת ליעד היומי. מתחת — עדיין בונים; מעל — חרגת
function plateBarColor(pct) {
  if (pct === 0) return '#d1d5db'
  if (pct < 70) return '#94a3b8'
  if (pct <= 110) return '#16a34a'
  if (pct <= 130) return '#ca8a04'
  return '#ef4444'
}

function CircularRing({ pct, color, emoji, size = 46 }) {
  const r = (size - 7) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(100, pct) / 100) * circ
  const label = pct >= 95 && pct <= 110 ? '✓' : pct > 0 ? pct + '%' : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5.5} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5.5}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.55s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color, lineHeight: 1 }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 14 }}>{emoji}</div>
    </div>
  )
}

function FloatingPlateBars({ bars }) {
  return (
    <div style={{ position: 'fixed', left: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 60, background: 'rgba(255,255,255,0.95)', borderRadius: 18, padding: '10px 7px', boxShadow: '0 4px 18px rgba(0,0,0,0.13)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map(b => (
        <CircularRing key={b.label} pct={b.pct} color={b.color} emoji={b.emoji} />
      ))}
    </div>
  )
}

// ✅ הצלחת החיה — צלחת לימודית בסגנון "הצלחת הבריאה": מקטעים עם שמות,
// גדלים לפי החלוקה האישית (welcome_doc_json.plate) אם קיימת.
// לפני אכילה המקטע לבן; הצבע מתקדם בתוך המקטע ביחס להתקדמות עד 100%;
// חריגה מעל 100% מסומנת במקטע אדום יחסי לגודל החריגה + האחוז.
function LivePlate({ bars, split }) {
  const get = k => (bars.find(b => b.label === k) || { pct: 0 }).pct
  const CX = 110, CY = 102, R = 90
  const raw = {
    veggies: split && split.veggies > 0 ? split.veggies : 45,
    protein: split && split.protein > 0 ? split.protein : 30,
    carbs: split && split.carbs > 0 ? split.carbs : 25,
  }
  const sum = raw.veggies + raw.protein + raw.carbs
  const SECTORS = [
    { key: 'protein', name: 'חלבונים', color: '#ef8b3a', emojis: ['🍗', '🐟', '🥚', '🥩'] },
    { key: 'carbs', name: 'פחמימות', color: '#d9a83c', emojis: ['🍞', '🍚', '🥔', '🌽'] },
    { key: 'veggies', name: 'ירקות', color: '#7cb342', emojis: ['🍅', '🥦', '🥒', '🥬', '🥕', '🫑'] },
  ]
  function slicePath(r, a0, a1) {
    const x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0)
    const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1)
    const large = a1 - a0 > Math.PI ? 1 : 0
    return `M ${CX} ${CY} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
  }
  let angle = -Math.PI / 2
  const rendered = SECTORS.map(sec => {
    const frac = raw[sec.key] / sum
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const pct = get(sec.key)
    const span = a1 - a0
    const mid = (a0 + a1) / 2
    // הצבע מתקדם עם כיוון השעון בתוך המקטע, ביחס להתקדמות עד 100%
    const fillEnd = a0 + span * Math.min(100, pct) / 100
    // חריגה: מקטע אדום מסוף המקטע אחורה, יחסי לגודל החריגה (100% חריגה = כל המקטע)
    const overFrac = pct > 100 ? Math.min(1, (pct - 100) / 100) : 0
    const nSlots = sec.emojis.length
    const eSpan = span * 0.72
    const slots = sec.emojis.map((e, i) => {
      const t = nSlots === 1 ? 0.5 : i / (nSlots - 1)
      const a = mid - eSpan / 2 + eSpan * t
      const r = i % 2 === 0 ? R * 0.52 : R * 0.72
      return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), e }
    })
    const count = pct <= 0 ? 0 : Math.max(1, Math.min(nSlots, Math.round(Math.min(110, pct) / 100 * nSlots)))
    return { ...sec, a0, a1, span, mid, pct, fillEnd, overFrac, slots, count }
  })
  const fatPct = get('fat')
  const fatOver = fatPct > 100
  const allDone = rendered.every(s => s.pct >= 95 && s.pct <= 110) && fatPct >= 95 && fatPct <= 110
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={224} height={206} viewBox="0 0 220 202">
        <ellipse cx={CX} cy={193} rx={80} ry={7} fill="rgba(0,0,0,0.08)" />
        <circle cx={CX} cy={CY} r={R + 4} fill="#fff" stroke="#e5e0d5" strokeWidth={2} />
        {/* שלב 1: בסיס לבן + מילוי צבע מתקדם לכל מקטע */}
        {rendered.map(sec => (
          <g key={sec.key}>
            {/* החלק הריק — לבן, בתוך קו המתאר הצבעוני של המקטע */}
            <path d={slicePath(R, sec.a0, sec.a1)} fill="#fffefb" />
            {/* הצבע שמתקדם עד 100% — מילוי מלא, בלי שקיפות, שיהיה ברור */}
            {sec.pct > 0 && (
              <path d={slicePath(R, sec.a0, sec.fillEnd)} fill={sec.color} />
            )}
            {/* חריגה — אדום יחסי מסוף המקטע */}
            {sec.overFrac > 0 && (
              <path d={slicePath(R, sec.a1 - sec.span * sec.overFrac, sec.a1)} fill="#ef4444" />
            )}
            {sec.slots.slice(0, sec.count).map((sl, i) => (
              <text key={i} x={sl.x} y={sl.y + 6} textAnchor="middle" fontSize={19}>{sl.e}</text>
            ))}
          </g>
        ))}
        {/* שלב 2: קווי מתאר צבעוניים עבים — החלוקה ברורה גם כשהמקטע ריק */}
        {rendered.map(sec => (
          <path key={sec.key + '-outline'} d={slicePath(R, sec.a0, sec.a1)}
            fill="none" stroke={sec.color} strokeWidth={3.5} strokeLinejoin="round" />
        ))}
        {/* שמות מקטעים + אחוז חריגה באדום כשקיימת */}
        {rendered.map(sec => {
          const lx = CX + R * 0.86 * Math.cos(sec.mid)
          const ly = CY + R * 0.86 * Math.sin(sec.mid)
          return (
            <g key={sec.key + '-label'}>
              <rect x={lx - 27} y={ly - 9} width={54} height={17} rx={8.5}
                fill={sec.pct > 110 ? '#dc2626' : sec.color} opacity={0.95} />
              <text x={lx} y={ly + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">
                {sec.pct > 110 ? `+${sec.pct - 100}%` : sec.name}
              </text>
            </g>
          )
        })}
        {/* שומנים — קערית במרכז */}
        <circle cx={CX} cy={CY} r={24} fill="#fffdf5" stroke={fatOver ? '#ef4444' : '#e8d9a8'} strokeWidth={fatOver ? 2.5 : 2} />
        <circle cx={CX} cy={CY} r={17 * Math.sqrt(Math.min(100, fatPct) / 100) || 0} fill="#f2d55c" opacity={0.85} />
        <text x={CX} y={CY + 1} textAnchor="middle" fontSize="14">🫒</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="7.5" fontWeight="800" fill={fatOver ? '#dc2626' : '#8a6d1f'}>
          {fatOver ? `+${Math.round(fatPct) - 100}%` : 'שומנים'}
        </text>
        {allDone && <text x={192} y={30} textAnchor="middle" fontSize="20">✨</text>}
      </svg>
      {allDone && (
        <div style={{ fontSize: 12.5, color: '#15803d', fontWeight: 800, marginTop: 2 }}>הצלחת מאוזנת — הגוף קיבל הכל 💚</div>
      )}
    </div>
  )
}

// ✅ מסע הפרפר — תחנות הרצף עם פרפר המותג שמתקדם לאורך השביל
function ButterflyJourney({ streak }) {
  const stones = [1, 3, 7, 14, 21, 30]
  const W2 = 300, H2 = 64
  const xs = stones.map((_, i) => 18 + (W2 - 36) * (i / (stones.length - 1)))
  const ys = stones.map((_, i) => (i % 2 === 0 ? 42 : 24))
  // מיקום הפרפר: אינטרפולציה בין התחנות לפי הרצף הנוכחי
  let bx = xs[0], by = ys[0] - 14
  if (streak >= stones[stones.length - 1]) { bx = xs[xs.length - 1]; by = ys[ys.length - 1] - 14 }
  else if (streak > 0) {
    let i = 0
    while (i < stones.length - 1 && streak >= stones[i + 1]) i++
    const t = i < stones.length - 1 ? (streak - stones[i]) / (stones[i + 1] - stones[i]) : 0
    bx = xs[i] + (xs[Math.min(i + 1, xs.length - 1)] - xs[i]) * Math.max(0, t)
    by = ys[i] + (ys[Math.min(i + 1, ys.length - 1)] - ys[i]) * Math.max(0, t) - 14
  }
  let path = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2
    path += ` Q ${mx} ${ys[i - 1]} ${mx} ${(ys[i - 1] + ys[i]) / 2} T ${xs[i]} ${ys[i]}`
  }
  return (
    <div style={{ marginTop: 12 }}>
      <svg width="100%" viewBox={`0 0 ${W2} ${H2}`} style={{ display: 'block' }}>
        <path d={path} fill="none" stroke="#e7d3b0" strokeWidth={2.5} strokeDasharray="1 6" strokeLinecap="round" />
        {stones.map((m, i) => {
          const passed = streak >= m
          return (
            <g key={m}>
              <circle cx={xs[i]} cy={ys[i]} r={passed ? 9 : 7.5}
                fill={passed ? '#c8a83c' : '#fff'} stroke={passed ? '#a8862a' : '#e5e7eb'} strokeWidth={2} />
              <text x={xs[i]} y={ys[i] + 3} textAnchor="middle" fontSize="8" fontWeight="800"
                fill={passed ? '#fff' : '#9ca3af'}>{m}</text>
            </g>
          )
        })}
        <g transform={`translate(${bx}, ${by})`} opacity={streak > 0 ? 1 : 0.45}>
          <g>
            <path d="M0,6 C-7,-3 -14,-2 -14,4 C-14,10 -6,13 0,7 Z" fill="#d9ab43">
              <animateTransform attributeName="transform" type="scale" values="1 1;0.55 1;1 1" dur="0.5s" repeatCount="indefinite" additive="sum" />
            </path>
            <path d="M0,6 C7,-3 14,-2 14,4 C14,10 6,13 0,7 Z" fill="#d9ab43">
              <animateTransform attributeName="transform" type="scale" values="1 1;0.55 1;1 1" dur="0.5s" repeatCount="indefinite" additive="sum" />
            </path>
            <ellipse cx="0" cy="6.5" rx="1.3" ry="4.5" fill="#2e3a26" />
          </g>
        </g>
      </svg>
      <div style={{ fontSize: 10.5, color: '#a16207', textAlign: 'center', marginTop: 2, fontWeight: 600 }}>
        {streak >= 30 ? 'הפרפר הגיע ליעד — 30 יום! 🏆' : streak > 0 ? `הפרפר שלך בדרך — עוד ${stones.find(m => m > streak) - streak} ימים לתחנה הבאה 🦋` : 'הפרפר מחכה שתתחילי את המסע 🦋'}
      </div>
    </div>
  )
}

// ✅ "מה בא לי?" — המלצות לפי חשק + מה שנשאר מהיעד האישי היום. חישוב בלבד, לא נוגע בשמירה.
const CRAVING_BANK = [
  { name: 'יוגורט עם פרי וקינמון', emoji: '🍓', kcal: 130, prot: 6, tags: ['sweet', 'cold', 'light'] },
  { name: 'שייק חלב/שקדים עם תמר וכף חמאת בוטנים', emoji: '🥤', kcal: 220, prot: 10, tags: ['sweet', 'cold'] },
  { name: 'פרי + ריבוע שוקולד מריר', emoji: '🍫', kcal: 150, prot: 2, tags: ['sweet', 'light'] },
  { name: 'גבינה לבנה עם טיפת דבש ואגוזים', emoji: '🍯', kcal: 180, prot: 10, tags: ['sweet'] },
  { name: 'ביצה קשה + ירקות חתוכים', emoji: '🥚', kcal: 95, prot: 7, tags: ['salty', 'light', 'cold'] },
  { name: 'קוטג׳ עם פריכית', emoji: '🧀', kcal: 140, prot: 12, tags: ['salty', 'cold'] },
  { name: 'טונה עם קרקרים וירק', emoji: '🐟', kcal: 190, prot: 20, tags: ['salty', 'cold'] },
  { name: 'חומוס עם מקלות ירקות', emoji: '🥕', kcal: 150, prot: 6, tags: ['salty', 'light', 'cold'] },
  { name: 'מרק ירקות חם', emoji: '🍲', kcal: 100, prot: 3, tags: ['hot', 'light'] },
  { name: 'חביתה מירק קטנה', emoji: '🍳', kcal: 115, prot: 8, tags: ['hot', 'salty'] },
  { name: 'טוסט קל עם גבינה צהובה 9%', emoji: '🥪', kcal: 200, prot: 13, tags: ['hot', 'salty'] },
  { name: 'אדממה מאודה', emoji: '🫛', kcal: 120, prot: 11, tags: ['hot', 'salty', 'light'] },
  { name: 'מקלות ירקות בלי הגבלה', emoji: '🥒', kcal: 40, prot: 1, tags: ['light', 'cold'] },
]

function CravingHelper({ remainingCal, remainingProt, gfn }) {
  const [open, setOpen] = useState(false)
  const [craving, setCraving] = useState(null)
  const chips = [
    { k: 'sweet', l: 'מתוק', i: '🍓' },
    { k: 'salty', l: 'מלוח', i: '🧀' },
    { k: 'hot', l: 'משהו חם', i: '🍲' },
    { k: 'cold', l: 'משהו קר', i: '🥶' },
    { k: 'light', l: 'קליל', i: '🌿' },
    { k: 'any', l: 'אין לי מושג', i: '🤷‍♀️' },
  ]
  const lowBudget = remainingCal < 100
  let picks = []
  if (craving && !lowBudget) {
    picks = CRAVING_BANK
      .filter(it => craving === 'any' || it.tags.includes(craving))
      .filter(it => it.kcal <= remainingCal + 60)
    picks.sort(remainingProt > 15 ? (a, b) => b.prot - a.prot : (a, b) => a.kcal - b.kcal)
    picks = picks.slice(0, 3)
  }
  return (
    <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#faf5ff)', borderRadius: 18, padding: '14px 18px', marginBottom: 14, border: '1.5px solid #f5d0fe' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🤔</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#a21caf' }}>{gfn('לא יודעת מה לאכול?', 'לא יודע מה לאכול?')}</div>
            <div style={{ fontSize: 11, color: '#c026d3' }}>{gfn('ספרי לי מה בא לך — אחשב מה מתאים', 'ספר לי מה בא לך — אחשב מה מתאים')}</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#c026d3', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>◀</div>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {chips.map(c => (
              <button key={c.k} onClick={() => setCraving(c.k)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 20, border: '1.5px solid ' + (craving === c.k ? '#c026d3' : '#f0d9f5'), background: craving === c.k ? '#fae8ff' : '#fff', color: craving === c.k ? '#a21caf' : '#64748b', fontSize: 12, fontWeight: craving === c.k ? 700 : 500, cursor: 'pointer' }}>
                <span>{c.i}</span><span>{c.l}</span>
              </button>
            ))}
          </div>
          {craving && (
            lowBudget ? (
              <div style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#86198f', fontWeight: 600, lineHeight: 1.6 }}>
                היום שלך כמעט מלא 🥰 אם זה רעב אמיתי — ירקות זה תמיד כן. ואם זה משהו אחר — אולי כוס תה חם ורגע {gfn('לעצמך', 'לעצמך')} 🫶🏻
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: '#a21caf', fontWeight: 700, marginBottom: 8 }}>
                  נשארו לך היום בערך {Math.max(0, Math.round(remainingCal))} קל׳{remainingProt > 5 ? ` ו-${Math.round(remainingProt)} גרם חלבון` : ''} — הנה מה שמתאים:
                </div>
                {picks.length === 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#86198f' }}>
                    בתקציב שנשאר הכי מתאים משהו קליל — ירקות חתוכים, מרק צלול או תה 💚
                  </div>
                )}
                {picks.map(it => (
                  <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.8)', borderRadius: 12, padding: '10px 12px', marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{it.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>~{it.kcal} קל׳ · {it.prot} גרם חלבון</div>
                    </div>
                  </div>
                ))}
              </>
            )
          )}
        </div>
      )}
    </div>
  )
}

function Confetti() {
  const colors = ['#16a34a','#f97316','#9333ea','#0284c7','#d97706','#0d9488','#ec4899']
  const pieces = Array.from({ length: 60 }, function(_, i) { return i })
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(function(i) {
        var color = colors[i % colors.length]
        var left = (i * 37 + 13) % 100
        var delay = (i * 0.08) % 2
        var size = 6 + (i % 4) * 3
        return <div key={i} style={{ position: 'absolute', top: -20, left: left + '%', width: size, height: size, background: color, borderRadius: i % 3 === 0 ? '50%' : 2, animation: 'fall ' + (2 + (i % 3) * 0.5) + 's ' + delay + 's ease-in forwards', opacity: 0.9 }} />
      })}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  )
}

function FeedbackCard({ feedback, clientName, logDate, onOpenFull }) {
  const [expanded, setExpanded] = useState(false)
  if (!feedback) return null
  const lines = feedback.split('\n').map(function(l) { return l.trim() }).filter(Boolean)
  const winLines = [], focusLines = [], stepsLines = [], messageLines = []
  var currentSection = 'none'
  lines.forEach(function(line) {
    const l = line.toLowerCase()
    if (l.includes('עבד') || l.includes('הצלחה') || l.includes('ניצחון') || l.includes('שמור')) { currentSection = 'win'; return }
    if (l.includes('דיוק') || l.includes('שיפור') || l.includes('משימ') || l.includes('לחזק')) { currentSection = 'focus'; return }
    if (l.includes('צעד') || l.includes('מחר') || l.includes('שבוע הבא')) { currentSection = 'steps'; return }
    if (l.includes('מסר') || l.includes('💚') || l.includes('בשבילך')) { currentSection = 'message'; return }
    if (line.startsWith('**') || line.startsWith('#') || line.startsWith('---')) return
    const clean = line.replace(/^[*#\-•>\d.]+\s*/, '').trim()
    if (!clean || clean.length < 4) return
    if (currentSection === 'win') winLines.push(clean)
    else if (currentSection === 'focus') focusLines.push(clean)
    else if (currentSection === 'steps') stepsLines.push(clean)
    else if (currentSection === 'message') messageLines.push(clean)
  })
  const hasParsed = winLines.length > 0 || focusLines.length > 0 || stepsLines.length > 0
  return (
    <div style={{ direction: 'rtl', marginBottom: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '16px 18px', marginBottom: 10, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>משוב אישי מאתי 💚</div>
            <div style={{ fontSize: 11, color: '#86efac' }}>{logDate} · אתי אטל</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#bbf7d0', lineHeight: 1.6 }}>היי {clientName ? clientName.split(' ')[0] : ''}! המשוב האישי שלי עבורך 🌿</div>
      </div>
      {hasParsed ? (
        <div>
          {winLines.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>✨</span><span style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>מה עבד — שמרי על זה!</span></div>
              {winLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#dcfce7', borderRadius: 10, marginBottom: 6 }}><span style={{ fontSize: 14, flexShrink: 0 }}>🌟</span><span style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {focusLines.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 18 }}>🎯</span><span style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>משימות לדיוק</span></div>
              {focusLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#fef3c7', borderRadius: 10, marginBottom: 6 }}><span style={{ fontSize: 13, color: '#92400e', flexShrink: 0 }}>→</span><span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {stepsLines.length > 0 && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>🚀</span><span style={{ fontWeight: 800, fontSize: 14, color: '#1e40af' }}>3 צעדים קטנים לשבוע הבא</span></div>
              {stepsLines.map(function(line, i) { return <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#dbeafe', borderRadius: 10, marginBottom: 6 }}><div style={{ width: 22, height: 22, borderRadius: 99, background: '#1e40af', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div><span style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6, flex: 1 }}>{line}</span></div> })}
            </div>
          )}
          {messageLines.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#faf5ff,#f0fdf4)', border: '1.5px solid #d8b4fe', borderRadius: 16, padding: '14px 16px', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>💚</div>
              {messageLines.map(function(line, i) { return <div key={i} style={{ fontSize: 14, color: '#7c3aed', fontWeight: 700, lineHeight: 1.7, fontStyle: 'italic' }}>"{line}"</div> })}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>— אתי אטל</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{expanded ? feedback : feedback.substring(0, 200) + (feedback.length > 200 ? '...' : '')}</div>
          {feedback.length > 200 && <button onClick={function() { setExpanded(!expanded) }} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#16a34a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{expanded ? '▲ פחות' : '▼ קראי הכל'}</button>}
        </div>
      )}
      {onOpenFull && <button onClick={onOpenFull} style={{ width: '100%', padding: 11, borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>📄 פתחי את המשוב המלא</button>}
    </div>
  )
}

function MealScanner({ gender, onAdd, joinedDate }) {
  const [scanning, setScanning] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editCal, setEditCal] = useState(0)
  const [editProtein, setEditProtein] = useState(0)
  const [editFat, setEditFat] = useState(0)
  const [editCarbs, setEditCarbs] = useState(0)
  const inputRef = useRef(null)
  const fem = gender !== 'זכר'
  var daysInApp = joinedDate ? Math.floor((Date.now() - new Date(joinedDate).getTime()) / (1000*60*60*24)) : 99
  var isLocked = daysInApp < 7

  async function handleFile(file) {
    if (!file) return
    setScanning(true); setResult(null)
    try {
      var base64 = await new Promise(function(res, rej) { var r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('שגיאה')); r.readAsDataURL(file) })
      var res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'scanMeal', imageBase64: base64, mediaType: file.type, gender: gender }) })
      var data = await res.json()
      var r2 = data.result
      setResult(r2); setEditDesc(r2.description || ''); setEditCal(r2.total_calories || 0)
      setEditProtein(r2.total_protein || 0); setEditFat(r2.total_fat || 0); setEditCarbs(r2.total_carbs || 0)
      setEditing(true)
    } catch(e) { alert('שגיאה בסריקה') }
    setScanning(false)
  }

  // ✅ חישוב מחדש לפי טקסט מתוקן
  async function recalcByText() {
    if (!editDesc.trim()) return
    setRecalculating(true)
    try {
      var res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'scanMealText', description: editDesc, gender })
      })
      var data = await res.json()
      var r2 = data.result
      if (r2) {
        setEditCal(r2.total_calories || 0)
        setEditProtein(r2.total_protein || 0)
        setEditFat(r2.total_fat || 0)
        setEditCarbs(r2.total_carbs || 0)
      }
    } catch(e) { alert('שגיאה בחישוב') }
    setRecalculating(false)
  }

  if (isLocked) return (
    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#f3f4f6', border: '1.5px dashed #d1d5db', textAlign: 'center' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>📸 צילום צלחת יפתח בעוד {7 - daysInApp} ימים</span>
    </div>
  )
  if (!editing || !result) return (
    <div style={{ marginTop: 10 }}>
      <input type="file" accept="image/*" ref={inputRef} style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      <button onClick={() => inputRef.current?.click()} disabled={scanning} style={{ width: '100%', padding: '10px', borderRadius: 10, background: scanning ? '#9ca3af' : '#eff6ff', color: scanning ? '#fff' : '#0284c7', border: '1.5px dashed #93c5fd', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
        {scanning ? '⏳ מנתח...' : fem ? '📸 צלמי או העלי תמונה — AI יזהה' : '📸 צלם או העלה תמונה — AI יזהה'}
      </button>
    </div>
  )
  return (
    <div style={{ marginTop: 10, background: '#eff6ff', borderRadius: 14, padding: 14, border: '1.5px solid #93c5fd' }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e40af', marginBottom: 8 }}>🤖 AI זיהה — {fem ? 'תקני' : 'תקן'} אם לא מדויק:</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 13, boxSizing: 'border-box', textAlign: 'right' }}
        />
        <button
          onClick={recalcByText}
          disabled={recalculating}
          style={{ padding: '7px 10px', borderRadius: 8, background: recalculating ? '#9ca3af' : '#0284c7', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0 }}
        >
          {recalculating ? '⏳' : '🔄 חשב'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[{ label: '🔥 קל', val: editCal, set: setEditCal }, { label: '💪 חלבון', val: editProtein, set: setEditProtein }, { label: '🍞 פחמימה', val: editCarbs, set: setEditCarbs }, { label: '🫒 שומן', val: editFat, set: setEditFat }].map(function(f) {
          return <div key={f.label} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{f.label}</div><input type="number" value={f.val} onChange={e => f.set(Number(e.target.value) || 0)} style={{ width: '100%', padding: '6px 4px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
        })}
      </div>
      {result.confidence === 'low' && <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⚠️ ביטחון נמוך — תקני או לחצי "חשב" אחרי עריכה</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { onAdd(editCal, editDesc, editProtein, editFat, editCarbs); setEditing(false); setResult(null) }} style={{ flex: 2, padding: 10, borderRadius: 10, background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✅ {fem ? 'הוסיפי' : 'הוסף'} לארוחה</button>
        <button onClick={() => { setEditing(false); setResult(null) }} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#fff', color: '#ef4444', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ ביטול</button>
      </div>
    </div>
  )
}

function Section({ title, icon, accent, light, children, defaultOpen, badge, isLocked, lockMessage, cardBg, cardBorder }) {
  const [open, setOpen] = useState(defaultOpen || false)
  if (isLocked) return (
    <div style={{ background: '#fafafa', borderRadius: 18, overflow: 'hidden', border: '1.5px dashed #d1d5db', marginBottom: 10, opacity: 0.75 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#f3f4f6' }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#6b7280', textAlign: 'right' }}>{title}</span>
        <span style={{ fontSize: 11, background: '#e5e7eb', color: '#4b5563', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>{lockMessage || 'נעול'}</span>
      </div>
    </div>
  )
  return (
    <div style={{ background: cardBg || '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid ' + (cardBorder || '#f0f0f0'), marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? light : (cardBg || '#fff'), border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#111', textAlign: 'right' }}>{title}</span>
        {badge && <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>{badge}</span>}
        <span style={{ color: accent, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '4px 18px 16px' }}>{children}</div>}
    </div>
  )
}

function CheckRow({ id, text, accent, checked, onToggle }) {
  return (
    <div onClick={() => onToggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 0.45 : 1 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checked ? accent : '#d1d5db'), background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: '#222', textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function SliceQtyRow({ item, accent, checked, qty, onToggle, onQtyChange }) {
  const unitLabel = item.unit || 'פרוסות'
  const displayQty = qty || item.recQty
  const calDisplay = Math.round(item.calPerSlice * displayQty)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }} onClick={() => onToggle(item.id)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 1 : 0.85 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checked ? accent : '#d1d5db'), background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: checked ? '#222' : '#222', fontWeight: checked ? 700 : 400, flex: 1, textAlign: 'right' }}>{item.text}</span>
          </div>
        </div>
        {checked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              type="number"
              value={qty || ''}
              onChange={e => onQtyChange(Number(e.target.value) || 0)}
              placeholder={String(item.recQty)}
              style={{ width: 55, padding: '4px 6px', borderRadius: 8, border: '1.5px solid ' + accent, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{unitLabel}</span>
          </div>
        )}
      </div>
      {checked && (
        <div style={{ fontSize: 11, color: accent, textAlign: 'left', paddingBottom: 4 }}>
          ≈ {calDisplay} קל {!qty && <span style={{ color: '#9ca3af' }}>(מומלץ: {item.recQty} {unitLabel})</span>}
        </div>
      )}
    </div>
  )
}

function GramQtyCheckRow({ item, accent, checked, qty, nutritionItem, onToggle, onQtyChange }) {
  const recQty = nutritionItem?.base_qty || 125
  const cal100 = nutritionItem?.base_qty > 0 ? Math.round((nutritionItem.calories || 0) / nutritionItem.base_qty * 100) : (nutritionItem?.calories || 0)
  const displayQty = qty || recQty
  const calDisplay = cal100 > 0 ? Math.round(cal100 * displayQty / 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }} onClick={() => onToggle(item.id)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checked ? 0.45 : 1 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checked ? accent : '#d1d5db'), background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: '#222', textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{item.text}</span>
          </div>
        </div>
        {checked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              type="number"
              value={qty || ''}
              onChange={e => onQtyChange(Number(e.target.value) || 0)}
              placeholder={String(recQty)}
              style={{ width: 55, padding: '4px 6px', borderRadius: 8, border: '1.5px solid ' + accent, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>גר&apos;</span>
          </div>
        )}
      </div>
      {checked && (
        <div style={{ fontSize: 11, color: accent, textAlign: 'left', paddingBottom: 4 }}>
          ≈ {calDisplay} קל {!qty && <span style={{ color: '#9ca3af' }}>(מומלץ: {recQty} גר&apos;)</span>}
        </div>
      )}
    </div>
  )
}

function RadioRow({ id, text, accent, selected, onSelect }) {
  const active = selected === id
  return (
    <div onClick={() => onSelect(active ? null : id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
      <div style={{ width: 18, height: 18, borderRadius: 99, border: '2px solid ' + (active ? accent : '#d1d5db'), background: active ? accent : '#fff', flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: active ? accent : '#222', fontWeight: active ? 700 : 400, flex: 1, textAlign: 'right' }}>{text}</span>
    </div>
  )
}

function FreeText({ value, onChange, placeholder }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'פרטים נוספים...'} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', marginTop: 8, color: '#555' }} />
}

function ExtraCal({ value, onChange, valueProt, onChangeProt }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} placeholder="קלוריות נוספות..." style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>קל</span>
      </div>
      {onChangeProt !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" value={valueProt || ''} onChange={e => onChangeProt(Number(e.target.value) || 0)} placeholder="חלבון נוסף..." style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
          <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>גר</span>
        </div>
      )}
    </div>
  )
}

// ✅ סיכום הסריקות שצולמו היום (AI) — חייב להיות גלוי וניתן לתיקון/מחיקה,
// כי הערכת AI לפעמים שוגה (למשל חבילה שלמה במקום מנה) ועד כה לא היה לזה שום ממשק.
function ScanCorrection({ desc, cal, onChangeCal, prot, onChangeProt, fat, onChangeFat, carbs, onChangeCarbs, onReset }) {
  if (!cal && !prot && !fat && !carbs && !desc) return null
  return (
    <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', textAlign: 'right' }}>📸 מהסריקות היום{desc ? ': ' + desc : ''}</div>
        <button onClick={onReset} style={{ fontSize: 11, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>🗑️ מחק</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        <div><div style={{ fontSize: 10, color: '#9a3412', marginBottom: 2, textAlign: 'center' }}>קל'</div><input type="number" value={cal || 0} onChange={e => onChangeCal(Number(e.target.value) || 0)} style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #fdba74', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
        <div><div style={{ fontSize: 10, color: '#9a3412', marginBottom: 2, textAlign: 'center' }}>חלבון</div><input type="number" value={prot || 0} onChange={e => onChangeProt(Number(e.target.value) || 0)} style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #fdba74', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
        <div><div style={{ fontSize: 10, color: '#9a3412', marginBottom: 2, textAlign: 'center' }}>פחמ'</div><input type="number" value={carbs || 0} onChange={e => onChangeCarbs(Number(e.target.value) || 0)} style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #fdba74', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
        <div><div style={{ fontSize: 10, color: '#9a3412', marginBottom: 2, textAlign: 'center' }}>שומן</div><input type="number" value={fat || 0} onChange={e => onChangeFat(Number(e.target.value) || 0)} style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #fdba74', fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} /></div>
      </div>
    </div>
  )
}

function YesNo({ value, onChange, labelYes, labelNo, accent }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={() => onChange(true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === true ? accent : '#e5e7eb'), background: value === true ? accent : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === true ? '#fff' : '#555' }}>{labelYes}</button>
      <button onClick={() => onChange(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '2px solid ' + (value === false ? '#ef4444' : '#e5e7eb'), background: value === false ? '#fef2f2' : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: value === false ? '#ef4444' : '#555' }}>{labelNo}</button>
    </div>
  )
}

function NlpSelector({ label, value, onChange, max, lowLabel, highLabel, accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: accent, fontWeight: 900 }}>{value || 0}/{max}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: max }).map(function(_, i) {
          const num = i + 1; const isActive = value === num
          return <button key={num} onClick={() => onChange(num)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid ' + (isActive ? accent : '#e5e7eb'), background: isActive ? accent : '#fff', color: isActive ? '#fff' : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{num}</button>
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
        <span>{lowLabel}</span><span>{highLabel}</span>
      </div>
    </div>
  )
}

export default function PlanApp({ clientName, userPassword }) {
  const displayName = clientName || userPassword || ''
  const dbKey = userPassword || clientName || ''
  const today = new Date().toLocaleDateString('he-IL')
  const todayKey = new Date().toLocaleDateString('sv-SE')

  const [currentStage, setCurrentStage] = useState(1)
  const [stageName, setStageName] = useState('שלב הניצוץ · מודעות')
  const [videoUrl, setVideoUrl] = useState('')
  const [pantryNotes, setPantryNotes] = useState('')
  const [showStage2Welcome, setShowStage2Welcome] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showWelcomeDoc, setShowWelcomeDoc] = useState(false)
  const [dietType, setDietType] = useState(null)
  const [restrictions, setRestrictions] = useState({})
  const [setupDone, setSetupDone] = useState(false)
  const [profileDone, setProfileDone] = useState(false)
  const [checks, setChecks] = useState({})
  const [carbChecks, setCarbChecks] = useState({}) // ✅ אפשר כמה פחמימות בו-זמנית, לא בחירה בלעדית
  const [protChecks, setProtChecks] = useState({}) // ✅ כמה חלבונות
  // ✅ סדר הסימון בפועל (לא סדר הרשימה!) — קובע איזה פריט "תפס" מהתקציב לפני איזה, לפי מה שהיא בחרה לסמן ראשון בזמן אמת
  const [carbCheckOrder, setCarbCheckOrder] = useState([])
  const [protCheckOrder, setProtCheckOrder] = useState([])
  // ✅ נדלק רק אחרי שטעינת היומן היומי מהשרת הצליחה (גם אם אין רשומה להיום) — חוסם את השמירה האוטומטית
  // עד שאנחנו בטוחים מה באמת קיים בשרת, כדי שתקלת רשת/שגיאת שרת לא "תאופס" ותימחק נתונים קיימים בפועל
  const [dailyLogLoaded, setDailyLogLoaded] = useState(false)
  // ✅ איזה תאריך נטען/נשמר בפועל — בברירת מחדל היום, אבל אפשר לעבור ל"אתמול" כדי לערוך
  // יומן שהתחיל לפני חצות בלי שהוא "יתאפס" ליום החדש. ראו switchLogDate.
  const [logDate, setLogDate] = useState(todayKey)
  const [carbQty, setCarbQty] = useState({})
  const [protQty, setProtQty] = useState({})
  const [checksQty, setChecksQty] = useState({})
  const [fatSel, setFatSel] = useState(null)
  const [veggieChecks, setVeggieChecks] = useState({}) // ✅ אפשר כמה ירקות בו-זמנית, לא בחירה בלעדית
  const [lunchOpt, setLunchOpt] = useState(null)
  const [benayimSel, setBenayimSel] = useState(null)
  const [hadSnack, setHadSnack] = useState(null)
  const [drinkType, setDrinkType] = useState(null)
  const [drinkCount, setDrinkCount] = useState(0)
  const [hadBenayim, setHadBenayim] = useState(null)
  const [water, setWater] = useState(0)
  const [steps, setSteps] = useState('')
  const [note, setNote] = useState('')
  const [showWAButton, setShowWAButton] = useState(false)
  const [bokerFree, setBokerFree] = useState('')
  const [lunchFree, setLunchFree] = useState('')
  const [erevFree, setErevFree] = useState('')
  const [bokerExtraCal, setBokerExtraCal] = useState(0)
  const [lunchExtraCal, setLunchExtraCal] = useState(0)
  const [erevExtraCal, setErevExtraCal] = useState(0)
  const [bokerExtraProt, setBokerExtraProt] = useState(0)
  const [lunchExtraProt, setLunchExtraProt] = useState(0)
  const [erevExtraProt, setErevExtraProt] = useState(0)
  const [scanCalories, setScanCalories] = useState(0)
  const [scanDesc, setScanDesc] = useState('')
  const [scanProtein, setScanProtein] = useState(0)
  const [scanFat, setScanFat] = useState(0)
  const [scanCarbs, setScanCarbs] = useState(0)
  const [joinedDate, setJoinedDate] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [aiReport, setAiReport] = useState(null)
  const [showAiReport, setShowAiReport] = useState(false)
  const [rootsFeedback, setRootsFeedback] = useState(null)
  const [showRootsFeedback, setShowRootsFeedback] = useState(false)
  const [bodyFeedback, setBodyFeedback] = useState(null)
  const [showBodyFeedback, setShowBodyFeedback] = useState(false)
  const [childFeedback, setChildFeedback] = useState(null)
  const [showChildFeedback, setShowChildFeedback] = useState(false)
  const [reportApproved, setReportApproved] = useState(false)
  const [activeTab, setActiveTab] = useState('diary')
  const [showDocsMenu, setShowDocsMenu] = useState(false)
  const [showInitialReport, setShowInitialReport] = useState(false)
  const [showOutcomeDoc, setShowOutcomeDoc] = useState(false)
  const [showDailyFeedback, setShowDailyFeedback] = useState(false)
  const [guideUrl, setGuideUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveWarnings, setSaveWarnings] = useState([]) // ✅ הודעות "הבנתי" שחייבות אישור — קופצות אוטומטית כשהצריכה נמוכה מ-50% מהיעד
  const [veggieWarnedAt, setVeggieWarnedAt] = useState([]) // ✅ צ'קפוינטים (33/66) שכבר הוצגה בהם הודעה היום
  const [proteinWarnedAt, setProteinWarnedAt] = useState([])
  const [nutritionData, setNutritionData] = useState({})
  const [sportType, setSportType] = useState('')
  const [sportCommitDays, setSportCommitDays] = useState(2)
  const [sportDoneToday, setSportDoneToday] = useState(false)
  const [sportDaysThisWeek, setSportDaysThisWeek] = useState(0)
  const [stressLevel, setStressLevel] = useState(0)
  const [fatigueLevel, setFatigueLevel] = useState(0)
  const [hungerLevel, setHungerLevel] = useState(0)
  const [userMood, setUserMood] = useState(null)
  const [eatReasons, setEatReasons] = useState([])
  const [streak, setStreak] = useState(0)
  const [plateSplit, setPlateSplit] = useState(null)
  const [weeklyDays, setWeeklyDays] = useState(0)
  const [weekDates, setWeekDates] = useState([])
  const [avgStepsWeekly, setAvgStepsWeekly] = useState(0)
  const [suggestedActivity, setSuggestedActivity] = useState(null)
  const [userWeight, setUserWeight] = useState('')
  const [userHeight, setUserHeight] = useState('')
  const [userAge, setUserAge] = useState('')
  const [userGender, setUserGender] = useState('נקבה')
  const [userActivity, setUserActivity] = useState('בינוני')
  const [userGoal, setUserGoal] = useState('ירידה במשקל')
  const [userTargetWeight, setUserTargetWeight] = useState('')
  const [clientData, setClientData] = useState(null)

  const fem = userGender !== 'זכר'
  const gf = (f, m) => fem ? f : m

  // ✅ "אתמול" לפי השעון האמיתי — לא לפי logDate, כדי שהכפתור יציע תמיד את היום שלפני התאריך הנוכחי בפועל
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE')
  const editingYesterday = logDate !== todayKey
  const logDateDisplay = logDate === todayKey ? today : new Date(logDate + 'T12:00:00').toLocaleDateString('he-IL')
  function switchLogDate(targetKey) {
    if (targetKey === logDate) return
    // ⚠️ לחסום שמירה אוטומטית עד שהנתונים של התאריך החדש נטענו בפועל — אחרת השמירה האוטומטית
    // עלולה לכתוב את הנתונים הישנים (עדיין בזיכרון) לתאריך הלא נכון לפני שהטעינה מסתיימת
    setDailyLogLoaded(false)
    setLogDate(targetKey)
  }

  useEffect(function() {
    async function loadNutrition() {
      var { data } = await supabase.from('nutrition_data').select('*')
      var nd = {}
      if (data) data.forEach(item => nd[item.id] = item)
      Object.keys(NUTRITION_FALLBACK).forEach(function(id) {
        if (!nd[id] || !nd[id].calories) nd[id] = Object.assign({ id: id }, NUTRITION_FALLBACK[id])
      })
      ZERO_FAT_VEGGIE_IDS.forEach(function(id) {
        if (nd[id]) nd[id] = Object.assign({}, nd[id], { fat: 0 })
      })
      setNutritionData(nd)
    }
    loadNutrition()
  }, [])

  useEffect(function() {
    async function load() {
      var client = await supabase.from('clients').select('*').eq('password', dbKey).maybeSingle()
      if (client.data) {
        var d = client.data
        setClientData(d)
        const profileRes = await supabase.from('client_profiles').select('welcome_doc_json, ai_report, roots_feedback, body_feedback, child_feedback').eq('client_password', dbKey).maybeSingle()
        if (profileRes.data?.ai_report) {
          setAiReport(profileRes.data.ai_report)
        }
        if (profileRes.data?.welcome_doc_json?.plate) {
          setPlateSplit(profileRes.data.welcome_doc_json.plate)
        }
        if (profileRes.data?.roots_feedback) {
          setRootsFeedback(profileRes.data.roots_feedback)
        }
        if (profileRes.data?.body_feedback) {
          setBodyFeedback(profileRes.data.body_feedback)
        }
        if (profileRes.data?.child_feedback) {
          setChildFeedback(profileRes.data.child_feedback)
        }
        if (d.weight) { setUserWeight(String(d.weight)); setProfileDone(true) }
        if (d.height) setUserHeight(String(d.height))
        if (d.age) setUserAge(String(d.age))
        if (d.gender) setUserGender(d.gender)
        if (d.activity) setUserActivity(d.activity)
        if (d.goal) setUserGoal(d.goal)
        if (d.target_weight) setUserTargetWeight(String(d.target_weight))
        if (d.video_url) setVideoUrl(d.video_url)
        if (d.pantry_notes) setPantryNotes(d.pantry_notes)
        if (d.created_at) setJoinedDate(d.created_at)
        if (d.sport_type) setSportType(d.sport_type)
        if (d.sport_commit_days) setSportCommitDays(d.sport_commit_days)
        if (d.diet_type) { setDietType(d.diet_type); setSetupDone(true) }
        else if (d.weight) { setSetupDone(true) }
        if (d.restrictions) setRestrictions(d.restrictions)
        if (d.current_stage) {
          const stg = d.current_stage
          setCurrentStage(stg)
          if (stg === 1) setStageName('שלב הניצוץ · מודעות')
          if (stg === 2) setStageName('שלב העוגן · עיצוב סביבה')
          if (stg === 3) setStageName('שלב החופש · דרך חיים')
          var seenKey = 'stage2seen_' + dbKey
          if (stg >= 2 && !localStorage.getItem(seenKey)) {
            setShowStage2Welcome(true); setShowConfetti(true)
            localStorage.setItem(seenKey, '1')
            setTimeout(() => setShowConfetti(false), 4000)
          }
        }
      }

      var todayLog = await supabase.from('daily_logs').select('*').eq('client_name', dbKey).eq('log_date', logDate).maybeSingle()
      if (todayLog.error) {
        // ⚠️ שגיאת שרת/רשת בטעינת היומן — בשום אופן לא לאפס את הנתונים בזיכרון בעקבות זה, ולא להדליק dailyLogLoaded,
        // כי זה היה חוסם את השמירה האוטומטית מלהריץ "מעל" נתונים קיימים בשרת מתוך מצב מאופס בטעות
        console.error('❌ נכשלה טעינת היומן היומי, לא מאפסים נתונים קיימים:', todayLog.error.message)
      } else if (todayLog.data) {
        var t = todayLog.data
        var loadedCarbChecks = t.carb_checks || (t.carb_sel ? { [t.carb_sel]: true } : {})
        var loadedProtChecks = t.prot_checks || {}
        setChecks(t.checks || {}); setCarbChecks(loadedCarbChecks); setProtChecks(loadedProtChecks); setFatSel(t.fat_sel)
        setCarbCheckOrder(Object.keys(loadedCarbChecks).filter(id => loadedCarbChecks[id]))
        setProtCheckOrder(Object.keys(loadedProtChecks).filter(id => loadedProtChecks[id]))
        setCarbQty(t.carb_qty || {}); setProtQty(t.prot_qty || {}); setChecksQty(t.checks_qty || {})
        setVeggieChecks(t.veggie_checks || (t.veggie_sel ? { [t.veggie_sel]: true } : {})); setLunchOpt(t.lunch_opt); setBenayimSel(t.benayim_sel)
        setVeggieWarnedAt([]); setProteinWarnedAt([]); setSaveWarnings([])
        setWater(t.water || 0); setSteps(t.steps || ''); setNote(t.note || '')
        setBokerFree(t.boker_free || ''); setLunchFree(t.lunch_free || ''); setErevFree(t.erev_free || '')
        setBokerExtraCal(t.boker_extra_cal || 0); setLunchExtraCal(t.lunch_extra_cal || 0); setErevExtraCal(t.erev_extra_cal || 0)
        setBokerExtraProt(t.boker_extra_prot || 0); setLunchExtraProt(t.lunch_extra_prot || 0); setErevExtraProt(t.erev_extra_prot || 0)
        setHadSnack(t.had_snack ?? null); setHadBenayim(t.had_benayim ?? null); setDrinkType(t.drink_type || null); setDrinkCount(t.drink_count || 0)
        setSportDoneToday(t.sport_done_today || false)
        var dayOfWeek = new Date().getDay()
        setSportDaysThisWeek(dayOfWeek === 0 ? 0 : (t.sport_days_week || 0))
        setScanCalories(t.scan_calories || 0); setScanDesc(t.scan_desc || '')
        setScanProtein(t.scan_protein || 0); setScanFat(t.scan_fat || 0); setScanCarbs(t.scan_carbs || 0)
        setFeedback(t.trainer_feedback || null); setReportApproved(t.report_approved || false)
        if (t.nlp_metrics) { var m = t.nlp_metrics; setStressLevel(m.stress || 0); setFatigueLevel(m.fatigue || 0); setHungerLevel(m.hunger || 0); setUserMood(m.mood || null); setEatReasons(m.eat_reasons || []) }
        setDailyLogLoaded(true)
      } else {
        // ✅ אין רשומה ליום הזה (כניסה ראשונה, או שהיום התגלגל לתאריך חדש באמצע הפעלה) — לוודא שלא נשאר מידע מהיום הקודם בזיכרון
        setChecks({}); setCarbChecks({}); setProtChecks({}); setCarbCheckOrder([]); setProtCheckOrder([]); setFatSel(null)
        setCarbQty({}); setProtQty({}); setChecksQty({})
        setVeggieChecks({}); setLunchOpt(null); setBenayimSel(null)
        setVeggieWarnedAt([]); setProteinWarnedAt([]); setSaveWarnings([])
        setWater(0); setSteps(''); setNote('')
        setBokerFree(''); setLunchFree(''); setErevFree('')
        setBokerExtraCal(0); setLunchExtraCal(0); setErevExtraCal(0)
        setBokerExtraProt(0); setLunchExtraProt(0); setErevExtraProt(0)
        setHadSnack(null); setHadBenayim(null); setDrinkType(null); setDrinkCount(0)
        setSportDoneToday(false)
        setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0)
        setFeedback(null); setReportApproved(false)
        setStressLevel(0); setFatigueLevel(0); setHungerLevel(0); setUserMood(null); setEatReasons([])
        setDailyLogLoaded(true)
      }

      // חישוב רצף, שבוע, וממוצע צעדים
      var { data: recentLogs } = await supabase.from('daily_logs').select('log_date, steps').eq('client_name', dbKey).order('log_date', { ascending: false }).limit(90)
      if (recentLogs && recentLogs.length > 0) {
        var loggedDates = new Set(recentLogs.map(function(l) { return l.log_date }))
        var streakCount = 0
        var checkD = new Date()
        if (!loggedDates.has(checkD.toLocaleDateString('sv-SE'))) checkD.setDate(checkD.getDate() - 1)
        while (loggedDates.has(checkD.toLocaleDateString('sv-SE'))) {
          streakCount++; checkD.setDate(checkD.getDate() - 1)
        }
        setStreak(streakCount)
        var today2 = new Date()
        var dow = today2.getDay()
        var wkDays = []
        for (var i = 0; i <= 6; i++) {
          var d3 = new Date(today2); d3.setDate(today2.getDate() - dow + i)
          wkDays.push({ date: d3.toLocaleDateString('sv-SE'), logged: loggedDates.has(d3.toLocaleDateString('sv-SE')) })
        }
        setWeekDates(wkDays)
        setWeeklyDays(wkDays.filter(function(d) { return d.logged }).length)
        // ממוצע צעדים מ-14 ימים אחרונים (לפחות 5 ימים עם נתוני צעדים)
        var stepsLogs = recentLogs.filter(function(l) { return l.steps && parseInt(l.steps) > 0 }).slice(0, 14)
        if (stepsLogs.length >= 5) {
          var avgS = Math.round(stepsLogs.reduce(function(s, l) { return s + parseInt(l.steps) }, 0) / stepsLogs.length)
          setAvgStepsWeekly(avgS)
          var inferred = avgS < 4000 ? 'יושבני' : avgS < 7000 ? 'קל' : avgS < 10000 ? 'בינוני' : avgS < 13000 ? 'פעיל' : 'מאוד פעיל'
          setSuggestedActivity(inferred)
        }
      }
    }
    if (dbKey) load()
  }, [dbKey, logDate])

  // בדיקה תקופתית למשוב יומי חדש (כל 60 שניות) — בודקת על התאריך שנמצא בעריכה כרגע, לא בהכרח היום בפועל
  useEffect(() => {
    if (!dbKey || !logDate) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('daily_logs').select('trainer_feedback, report_approved').eq('client_name', dbKey).eq('log_date', logDate).maybeSingle()
      if (data && data.report_approved && data.trainer_feedback) {
        setFeedback(data.trainer_feedback)
        setReportApproved(true)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [dbKey, logDate])

  // בדיקה תקופתית לניתוח AI מקיף חדש (כל 90 שניות)
  useEffect(() => {
    if (!dbKey) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('client_profiles').select('ai_report').eq('client_password', dbKey).maybeSingle()
      if (data?.ai_report) setAiReport(data.ai_report)
    }, 90000)
    return () => clearInterval(interval)
  }, [dbKey])

  const autoSaveRef = useRef(null)
  const pendingSaveRef = useRef(null)
  useEffect(() => {
    // ⚠️ dailyLogLoaded חייב להיות true לפני שמירה אוטומטית — בלעדיו אפשר "לשמור" מצב ריק/בררת-מחדל
    // מעל נתונים אמיתיים שכבר קיימים בשרת, אם טעינת היומן היומי עדיין באוויר או נכשלה
    if (!dbKey || !logDate || !profileDone || !dailyLogLoaded) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    var payload = {
      client_name: dbKey, log_date: logDate, checks,
      carb_checks: carbChecks, prot_checks: protChecks, fat_sel: fatSel, veggie_checks: veggieChecks, lunch_opt: lunchOpt, benayim_sel: benayimSel,
      carb_qty: carbQty, prot_qty: protQty, checks_qty: checksQty,
      water, steps, note, boker_free: bokerFree, lunch_free: lunchFree, erev_free: erevFree,
      boker_extra_cal: bokerExtraCal || 0, lunch_extra_cal: lunchExtraCal || 0, erev_extra_cal: erevExtraCal || 0,
      boker_extra_prot: bokerExtraProt || 0, lunch_extra_prot: lunchExtraProt || 0, erev_extra_prot: erevExtraProt || 0,
      had_snack: hadSnack, had_benayim: hadBenayim, drink_type: drinkType, drink_count: drinkCount || 0,
      sport_done_today: sportDoneToday, sport_days_week: sportDaysThisWeek,
      scan_calories: scanCalories || 0, scan_desc: scanDesc || '', scan_protein: scanProtein || 0, scan_fat: scanFat || 0, scan_carbs: scanCarbs || 0,
      diet_type: dietType, restrictions,
      nlp_metrics: { stress: stressLevel, fatigue: fatigueLevel, hunger: hungerLevel, mood: userMood, eat_reasons: eatReasons },
      updated_at: new Date().toISOString(),
    }
    pendingSaveRef.current = payload
    autoSaveRef.current = setTimeout(async () => {
      const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
      if (error) console.error('❌ autosave failed:', error.message, error)
      pendingSaveRef.current = null
    }, 3000)
    return () => clearTimeout(autoSaveRef.current)
  }, [checks, carbChecks, protChecks, carbQty, protQty, checksQty, fatSel, veggieChecks, lunchOpt, benayimSel, water, steps, note, bokerFree, lunchFree, erevFree, bokerExtraCal, lunchExtraCal, erevExtraCal, hadSnack, hadBenayim, sportDoneToday, sportDaysThisWeek, scanCalories, scanDesc, scanProtein, scanFat, scanCarbs, stressLevel, fatigueLevel, hungerLevel, userMood, eatReasons, drinkType, drinkCount, dailyLogLoaded, logDate])

  // ⚠️ אם המשתמשת עוזבת את הדף בתוך חלון ה-debounce (סוגרת טאב / עוברת אפליקציה בנייד / נועלת מסך) —
  // unmount של רכיב React לא בהכרח קורה (בדפדפן בנייד הדף פשוט מוקפא/נהרג בלי לקרוא ל-cleanup),
  // אז צריך להאזין ל-visibilitychange/pagehide ולשמור מיד את מה שממתין, לא לסמוך רק על unmount
  useEffect(() => {
    function flushPending() {
      if (!pendingSaveRef.current) return
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      var payload = pendingSaveRef.current
      pendingSaveRef.current = null
      // ⚠️ ה-query builder של supabase-js הוא "עצלן" — הוא לא שולח בקשת רשת בפועל אלא אם קוראים ל-.then()/await עליו.
      // קריאה "יבשה" בלי await (כמו שהיה כאן קודם) פשוט לא שולחת כלום לשרת בכלל.
      supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' }).then(() => {}, () => {})
    }
    function handleVisibility() { if (document.visibilityState === 'hidden') flushPending() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', flushPending)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', flushPending)
      flushPending()
    }
  }, [])

  useEffect(() => {
    function handleGuideClose(e) {
      if (e.data === 'closeGuide') setGuideUrl(null)
    }
    window.addEventListener('message', handleGuideClose)
    return () => window.removeEventListener('message', handleGuideClose)
  }, [])

  function calcEatenCalories() {
    var total = 0
    function add(id, qtyOverride) {
      var item = nutritionData[id]
      if (item) {
        if (qtyOverride && item.base_qty && item.base_qty > 0) {
          total += (item.calories || 0) * (qtyOverride / item.base_qty)
        } else {
          total += item.calories || 0
        }
      }
    }
    if (hadSnack) add('snack')
    if (checks) Object.keys(checks).forEach(id => {
      if (!checks[id]) return
      if (SLICE_ITEMS[id]) { total += Math.round(SLICE_ITEMS[id].calPerSlice * (carbQty[id] || SLICE_ITEMS[id].recQty)) }
      else { add(nutritionId(id), checksQty[id]) }
    })
    // ✅ אם לא הוקלדה כמות בפועל — נחשב 100 גרם (ברירת המחדל האחידה), לא ההמלצה האישית המוצגת
    Object.keys(carbChecks).forEach(id => { if (carbChecks[id]) add(id, carbQty[id] || 100) })
    // ✅ מחשב כל החלבונות שנבחרו
    Object.keys(protChecks).forEach(id => {
      if (protChecks[id]) {
        if (UNIT_PROTEIN_ITEMS[id]) {
          const u = UNIT_PROTEIN_ITEMS[id]
          total += Math.round((protQty[id] || u.defaultQty) * u.calPerUnit)
        } else {
          add(id, protQty[id] || 100)
        }
      }
    })
    if (fatSel) add(fatSel)
    Object.keys(veggieChecks).forEach(id => { if (veggieChecks[id]) add(id) })
    if (hadBenayim && benayimSel) add(benayimSel)
    total += (bokerExtraCal || 0) + (lunchExtraCal || 0) + (erevExtraCal || 0) + (scanCalories || 0)
    const DRINK_CALS = { wine: 120, beer: 150, cocktail: 200 }
    if (drinkType && drinkCount > 0) total += (DRINK_CALS[drinkType] || 0) * drinkCount
    return total
  }

  function calcExtraProt() {
    return (bokerExtraProt || 0) + (lunchExtraProt || 0) + (erevExtraProt || 0)
  }

  function calcEatenProtein() {
    var total = 0
    function addNP(id, qtyOverride) {
      var item = nutritionData[id]
      if (!item) return
      if (qtyOverride && item.base_qty && item.base_qty > 0) total += (item.protein || 0) * (qtyOverride / item.base_qty)
      else total += item.protein || 0
    }
    // ✅ אותו חישוב בדיוק כמו קלוריות/שומן/פחמימה — חלבון מגיע מ-nutritionData בלבד, בלי טבלת ערכים נפרדת
    if (checks) Object.keys(checks).forEach(function(id) {
      if (!checks[id]) return
      if (SLICE_ITEMS[id]) {
        if (SLICE_ITEMS[id].protPerUnit) total += Math.round((carbQty[id] || SLICE_ITEMS[id].recQty) * SLICE_ITEMS[id].protPerUnit)
        return
      }
      addNP(nutritionId(id), checksQty[id])
    })
    Object.keys(protChecks).forEach(function(id) {
      if (!protChecks[id]) return
      if (UNIT_PROTEIN_ITEMS[id]) { const u = UNIT_PROTEIN_ITEMS[id]; total += Math.round((protQty[id] || u.defaultQty) * u.proteinPerUnit); return }
      addNP(id, protQty[id] || 100)
    })
    Object.keys(carbChecks).forEach(function(id) { if (carbChecks[id]) addNP(id, carbQty[id] || 100) })
    if (fatSel) addNP(fatSel)
    Object.keys(veggieChecks).forEach(function(id) { if (veggieChecks[id]) addNP(id) })
    if (hadBenayim && benayimSel) addNP(benayimSel)
    total += calcExtraProt()
    total += (scanProtein || 0)
    if (hadSnack) addNP('snack')
    return total
  }

  function calcEatenFat() {
    var total = 0
    function add(id, qtyOverride) {
      var item = nutritionData[id]
      if (item) {
        if (qtyOverride && item.base_qty && item.base_qty > 0) total += (item.fat || 0) * (qtyOverride / item.base_qty)
        else total += item.fat || 0
      }
    }
    if (hadSnack) add('snack')
    if (checks) Object.keys(checks).forEach(id => { if (checks[id] && !SLICE_ITEMS[id]) add(nutritionId(id), checksQty[id]) })
    Object.keys(carbChecks).forEach(id => { if (carbChecks[id]) add(id, carbQty[id] || 100) })
    Object.keys(protChecks).forEach(id => { if (protChecks[id] && !UNIT_PROTEIN_ITEMS[id]) add(id, protQty[id] || 100) })
    if (fatSel) add(fatSel)
    Object.keys(veggieChecks).forEach(id => { if (veggieChecks[id]) add(id) })
    if (hadBenayim && benayimSel) add(benayimSel)
    total += (scanFat || 0)
    return total
  }

  function calcEatenCarbs() {
    var total = 0
    function add(id, qtyOverride) {
      var item = nutritionData[id]
      if (item) {
        if (qtyOverride && item.base_qty && item.base_qty > 0) total += (item.carbs || 0) * (qtyOverride / item.base_qty)
        else total += item.carbs || 0
      }
    }
    if (hadSnack) add('snack')
    if (checks) Object.keys(checks).forEach(id => {
      if (!checks[id]) return
      if (SLICE_ITEMS[id]) { if (!SLICE_ITEMS[id].protPerUnit) total += Math.round(SLICE_ITEMS[id].calPerSlice * (carbQty[id] || SLICE_ITEMS[id].recQty) / 4) }
      else { add(nutritionId(id), checksQty[id]) }
    })
    Object.keys(carbChecks).forEach(id => { if (carbChecks[id]) add(id, carbQty[id] || 100) })
    Object.keys(protChecks).forEach(id => { if (protChecks[id] && !UNIT_PROTEIN_ITEMS[id]) add(id, protQty[id] || 100) })
    if (fatSel) add(fatSel)
    Object.keys(veggieChecks).forEach(id => { if (veggieChecks[id]) add(id) })
    if (hadBenayim && benayimSel) add(benayimSel)
    total += (scanCarbs || 0)
    return total
  }

  function calcVeggieMealsCount() {
    var count = 0
    if (checks['b_veggie1']) count++
    if (Object.values(veggieChecks).some(Boolean)) count++
    if (PLAN.veggieOptions.some(o => checks[o.id + '_erev'])) count++
    return count
  }

  const saveProfile = async function() {
    if (!userWeight || !userHeight || !userAge) return
    await supabase.from('clients').update({
      weight: parseFloat(userWeight),
      height: parseFloat(userHeight),
      age: parseInt(userAge),
      gender: userGender,
      activity: userActivity,
      goal: userGoal,
      target_weight: userTargetWeight ? parseFloat(userTargetWeight) : null,
      sport_type: sportType,
      sport_commit_days: sportCommitDays,
      diet_type: dietType,
      restrictions: restrictions,
    }).eq('password', dbKey)
    setProfileDone(true)
  }

  const resetDay = async function() {
    if (!window.confirm(editingYesterday ? 'לאפס את כל הנתונים של אתמול?' : 'לאפס את כל הנתונים של היום?')) return
    await supabase.from('daily_logs').delete().eq('client_name', dbKey).eq('log_date', logDate)
    setChecks({}); setCarbChecks({}); setProtChecks({}); setCarbCheckOrder([]); setProtCheckOrder([]); setCarbQty({}); setProtQty({}); setChecksQty({}); setFatSel(null); setVeggieChecks({}); setBenayimSel(null); setLunchOpt(null)
    setWater(0); setSteps(''); setNote(''); setBokerFree(''); setLunchFree(''); setErevFree('')
    setBokerExtraCal(0); setLunchExtraCal(0); setErevExtraCal(0)
    setBokerExtraProt(0); setLunchExtraProt(0); setErevExtraProt(0)
    setHadSnack(null); setHadBenayim(null); setDrinkType(null); setDrinkCount(0); setSportDoneToday(false)
    setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0)
    setStressLevel(0); setFatigueLevel(0); setHungerLevel(0); setUserMood(null); setEatReasons([])
    setFeedback(null); setReportApproved(false)
  }

  const handleSave = async function() {
    setSaving(true)
    var payload = {
      client_name: dbKey, log_date: logDate, checks,
      carb_checks: carbChecks, prot_checks: protChecks, fat_sel: fatSel, veggie_checks: veggieChecks, lunch_opt: lunchOpt, benayim_sel: benayimSel,
      carb_qty: carbQty, prot_qty: protQty, checks_qty: checksQty,
      water, steps, note, boker_free: bokerFree, lunch_free: lunchFree, erev_free: erevFree,
      boker_extra_cal: bokerExtraCal || 0, lunch_extra_cal: lunchExtraCal || 0, erev_extra_cal: erevExtraCal || 0,
      boker_extra_prot: bokerExtraProt || 0, lunch_extra_prot: lunchExtraProt || 0, erev_extra_prot: erevExtraProt || 0,
      had_snack: hadSnack, had_benayim: hadBenayim, drink_type: drinkType, drink_count: drinkCount || 0,
      sport_done_today: sportDoneToday, sport_days_week: sportDaysThisWeek,
      scan_calories: scanCalories || 0, scan_desc: scanDesc || '', scan_protein: scanProtein || 0, scan_fat: scanFat || 0, scan_carbs: scanCarbs || 0,
      diet_type: dietType, restrictions,
      nlp_metrics: { stress: stressLevel, fatigue: fatigueLevel, hunger: hungerLevel, mood: userMood, eat_reasons: eatReasons },
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'client_name,log_date' })
    if (error) {
      console.error('שגיאה בשמירה:', error.message)
      alert('שגיאה בשמירה: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setSaved(true)
    setShowWAButton(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const targets = calcTargets(parseFloat(userWeight), parseFloat(userHeight), parseInt(userAge), userGender, userActivity, userGoal)
  const eatenCalories = calcEatenCalories()
  const eatenProtein = calcEatenProtein()
  const eatenFat = calcEatenFat()
  const eatenCarbs = calcEatenCarbs()
  const veggieMealsCount = calcVeggieMealsCount()
  // ✅ כל פס = % מהיעד היומי האישי שנאכל בפועל (100% = הגעת ליעד, מעל 100% = חרגת)
  // ✅ clientPlate ("הצלחת החכמה") הוא חלוקת שטח צלחת לתצוגה ויזואלית בלבד (כולל "ירקות", שלא נספרות בקלוריות) —
  // לא אחוז קלוריות, ולכן אסור להשתמש בו לחישוב יעד גרמים (זה גרם ליעד שומן זעיר וחריגה מדומה של מאות אחוזים).
  // יעדי הגרמים תמיד מגיעים מהפיצול הקלורי הסטנדרטי שב-targets.
  const targetProteinG = targets ? targets.protein : 0
  const targetCarbsG = targets ? targets.carbs : 0
  const targetFatG = targets ? targets.fat : 0
  const proteinTargetPct = targetProteinG > 0 ? Math.round((eatenProtein / targetProteinG) * 100) : 0
  const carbsTargetPct = targetCarbsG > 0 ? Math.round((eatenCarbs / targetCarbsG) * 100) : 0
  const fatTargetPct = targetFatG > 0 ? Math.round((eatenFat / targetFatG) * 100) : 0
  const veggiesTargetPct = Math.round((veggieMealsCount / 3) * 100)
  const plateBars = [
    { label: 'protein', emoji: '💪', pct: proteinTargetPct, color: plateBarColor(proteinTargetPct) },
    { label: 'carbs', emoji: '🍞', pct: carbsTargetPct, color: plateBarColor(carbsTargetPct) },
    { label: 'fat', emoji: '🫒', pct: fatTargetPct, color: plateBarColor(fatTargetPct) },
    { label: 'veggies', emoji: '🥦', pct: veggiesTargetPct, color: plateBarColor(veggiesTargetPct) },
  ]
  // ✅ נקודות בדיקה לפי התקדמות קלורית — לא ברגע שמתחילים להזין (מעט מידי נתונים), אלא בשליש ובשני-שליש מהיעד הקלורי
  const calorieTargetPct = targets && targets.calories > 0 ? (eatenCalories / targets.calories) * 100 : 0
  const warnCheckpoint = calorieTargetPct >= 66 ? 66 : (calorieTargetPct >= 33 ? 33 : 0)
  // ✅ בצ'קפוינט הראשון (שליש) רוב היום עדיין לפנינו (לרוב לפני ארוחת הצהריים) — מתריעים רק על אפס מוחלט, לא על מתחת ל-50%.
  // בצ'קפוינט השני (שני-שליש) יש כבר מספיק נתונים — חוזרים לרף הרגיל של מתחת ל-50% מהיעד.
  const warnThreshold = warnCheckpoint === 33 ? 1 : 50
  // ✅ קופץ אוטומטית (עד פעמיים ביום לכל מדד, בכל צ'קפוינט) כשהצריכה נמוכה מהרף — לא בחירה מודעת מתוך הלשונית, אלא מודעות כוללת
  useEffect(() => {
    if (!profileDone || !targets || !warnCheckpoint) return
    var newWarnings = []
    if (!veggieWarnedAt.includes(warnCheckpoint) && veggiesTargetPct < warnThreshold) newWarnings.push(warnCheckpoint === 33 ? '🥦 שמתי לב שלא צרכת ירקות עדיין. חשוב מאוד לגוף לצרוך את כל המרכיבים התזונתיים, יש להקפיד לאזן.' : '🥦 שים לב, התזונה היומית שלך מכילה כמות ירקות נמוכה (מתחת ל-50% מהיעד). אנא דאג/י לאזן.')
    if (!proteinWarnedAt.includes(warnCheckpoint) && proteinTargetPct < warnThreshold) newWarnings.push(warnCheckpoint === 33 ? '💪 שמתי לב שלא צרכת חלבון עדיין. חשוב מאוד לגוף לצרוך את כל המרכיבים התזונתיים, יש להקפיד לאזן.' : '💪 שים לב, התזונה היומית שלך לא מכילה כמות מספקת של חלבון (מתחת ל-50% מהיעד). אנא דאג/י לאזן.')
    if (newWarnings.length) {
      setSaveWarnings(w => [...w, ...newWarnings])
      if (veggiesTargetPct < warnThreshold) setVeggieWarnedAt(c => [...c, warnCheckpoint])
      if (proteinTargetPct < warnThreshold) setProteinWarnedAt(c => [...c, warnCheckpoint])
    }
  }, [profileDone, targets, warnCheckpoint, veggiesTargetPct, proteinTargetPct, veggieWarnedAt, proteinWarnedAt])
  const filteredBokerProtein = PLAN.bokerProtein.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredBokerCarbs = PLAN.bokerCarbs.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredBokerExtra = PLAN.bokerExtra.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredProt = PLAN.protOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredErev = PLAN.erev.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredCarbs = PLAN.carbOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredFat = PLAN.fatOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const filteredBenayim = PLAN.benayimOptions.filter(i => !shouldHide(i, dietType, restrictions))
  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalItems = filteredBokerProtein.length + filteredBokerCarbs.length + filteredBokerExtra.length + filteredErev.length
  // ✅ תקציב חלבון/פחמימה לארוחת צהריים לפי הצלחת האישית — בגרמים של המאקרו עצמו (לא קלוריות כוללות),
  // כי לכל מאכל יחס קלוריות-למאקרו אחר, ותקציב לפי קלוריות היה מספק כמות גרמים שלא תואמת בפועל ליעד הגרמים.
  // מחושב פעם אחת ומשמש גם את מד ההשלמה וגם את רשימת הפריטים.
  const lunchProtBudget = targets ? Math.round(targets.protein / 2) : 0
  const lunchCarbBudget = targets ? Math.round(targets.carbs / 2) : 0
  const lunchProtRows = buildBudgetRows(filteredProt, protChecks, protQty, protCheckOrder, lunchProtBudget, nutritionData, UNIT_PROTEIN_ITEMS, 'protein')
  const lunchCarbRows = buildBudgetRows(filteredCarbs, carbChecks, carbQty, carbCheckOrder, lunchCarbBudget, nutritionData, null, 'carbs')

  if (!setupDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>היי {displayName.split(' ')[0]}!</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>{gf('בואי', 'בוא')} נתאים את התפריט</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>סוג תזונה:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIET_TYPES.map(d => <button key={d.key} onClick={() => setDietType(d.key)} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (dietType === d.key ? C.greenMid : '#e5e7eb'), background: dietType === d.key ? C.greenLight : '#fafafa', color: dietType === d.key ? C.greenDark : '#333' }}>{d.icon} {d.label}</button>)}
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'right' }}>הגבלות:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RESTRICTIONS.map(r => <button key={r.key} onClick={() => setRestrictions(prev => { var n = {...prev}; n[r.key] = !n[r.key]; return n })} style={{ padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'right', border: '2px solid ' + (restrictions[r.key] ? C.blue : '#e5e7eb'), background: restrictions[r.key] ? C.blueLight : '#fafafa', color: restrictions[r.key] ? C.blue : '#333' }}>{r.icon} {r.label} {restrictions[r.key] ? '✓' : ''}</button>)}
          </div>
        </div>
        <button onClick={async () => {
          if (!dietType) return
          await supabase.from('clients').update({ diet_type: dietType, restrictions }).eq('password', dbKey)
          setSetupDone(true)
        }} disabled={!dietType} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: dietType ? C.greenMid : '#e5e7eb', color: dietType ? '#fff' : '#9ca3af', border: 'none', cursor: 'pointer', width: '100%', maxWidth: 340 }}>
          {gf('בואי', 'בוא')} נתחיל!
        </button>
      </div>
    )
  }

  if (!profileDone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24, direction: 'rtl' }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>פרטים אישיים 📊</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>כדי לחשב את היעד הקלורי שלך</div>
        <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[{ label: 'משקל (ק"ג)', val: userWeight, set: setUserWeight, ph: '70' }, { label: 'גובה (ס"מ)', val: userHeight, set: setUserHeight, ph: '165' }, { label: 'גיל', val: userAge, set: setUserAge, ph: '30' }, { label: 'משקל יעד (ק"ג)', val: userTargetWeight, set: setUserTargetWeight, ph: '60' }].map(f => (
              <div key={f.label}><div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 600 }}>{f.label}</div><input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מין</div>
            <div style={{ display: 'flex', gap: 8 }}>{['נקבה', 'זכר'].map(g => <button key={g} onClick={() => setUserGender(g)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '2px solid ' + (userGender === g ? C.greenMid : '#e5e7eb'), background: userGender === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: userGender === g ? C.greenDark : '#555' }}>{g}</button>)}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>רמת פעילות</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ACTIVITY_LEVELS.map(a => <button key={a} onClick={() => setUserActivity(a)} style={{ padding: '8px 12px', borderRadius: 99, border: '2px solid ' + (userActivity === a ? C.greenMid : '#e5e7eb'), background: userActivity === a ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: userActivity === a ? C.greenDark : '#555' }}>{a}</button>)}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600 }}>מטרה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{GOALS_LIST.map(g => <button key={g} onClick={() => setUserGoal(g)} style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid ' + (userGoal === g ? C.greenMid : '#e5e7eb'), background: userGoal === g ? C.greenLight : '#fafafa', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: userGoal === g ? C.greenDark : '#555', textAlign: 'right' }}>{g}</button>)}</div>
          </div>
        </div>
        <button onClick={saveProfile} disabled={!userWeight || !userHeight || !userAge} style={{ padding: '14px 40px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: (userWeight && userHeight && userAge) ? C.greenMid : '#e5e7eb', color: (userWeight && userHeight && userAge) ? '#fff' : '#9ca3af', border: 'none', cursor: 'pointer', width: '100%', maxWidth: 340 }}>{gf('שמרי', 'שמור')} פרטים</button>
        <button onClick={() => setProfileDone(true)} style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>{gf('דלגי', 'דלג')} בינתיים</button>
      </div>
    )
  }

  if (showStage2Welcome) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#fff' }}>
        {showConfetti && <Confetti />}
        <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 28, textAlign: 'center', marginBottom: 8 }}>{gf('ברוכה הבאה', 'ברוך הבא')} לשלב 2!</div>
        <div style={{ fontSize: 16, color: '#bbf7d0', textAlign: 'center', marginBottom: 24, lineHeight: 1.7 }}>שלב העוגן · עיצוב הסביבה 🏡<br/>עברת על הבסיס — עכשיו הופכים אותו לדרך חיים</div>
        {videoUrl && (<div style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 8px 40px #0000004a' }}><iframe src={videoUrl.replace('watch?v=', 'embed/')} width="100%" height="220" frameBorder="0" allowFullScreen style={{ display: 'block' }} /></div>)}
        <div style={{ background: '#ffffff20', borderRadius: 16, padding: 16, width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#86efac' }}>מה חדש בשלב הזה:</div>
          {['🏃 ספורט נוסף על ההליכות — בחירה שלך', '🥫 מדריך מזווה ומקרר — מוכן לך כאן', '📸 צילום צלחת — AI יזהה מה אכלת', '🤖 Agent חירום 24/7 — שאלי כל שאלה תזונתית'].map((t, i) => (<div key={i} style={{ fontSize: 14, color: '#fff', padding: '6px 0', borderBottom: i < 3 ? '1px solid #ffffff15' : 'none' }}>{t}</div>))}
        </div>
        <button onClick={() => setShowStage2Welcome(false)} style={{ padding: '16px 40px', borderRadius: 16, background: '#fff', color: '#0f4c2a', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>{gf('בואי', 'בוא')} נתחיל! 🚀</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg,#faf5ff 0%,#f0fdf4 45%,#fff7ed 100%) fixed', direction: 'rtl' }}>
      {showConfetti && <Confetti />}

      {saveWarnings.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            {saveWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: 15, color: '#222', fontWeight: 600, lineHeight: 1.6, marginBottom: i < saveWarnings.length - 1 ? 14 : 20 }}>{w}</div>
            ))}
            <button onClick={() => setSaveWarnings([])} style={{ width: '100%', padding: '14px', borderRadius: 14, background: C.greenMid, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}>הבנתי</button>
          </div>
        </div>
      )}

      {activeTab === 'diary' && profileDone && targets && (
        <FloatingPlateBars bars={plateBars} />
      )}

      {/* ✅ בר קלוריות וחלבון צף */}
      {activeTab === 'diary' && profileDone && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#fff', borderTop: '1px solid #e5e7eb',
          padding: '8px 16px 20px', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', marginBottom: 4 }}>
                  <span>🔥 {Math.round(eatenCalories)} קל</span>
                  <span style={{ color: eatenCalories >= targets.calories ? '#f97316' : '#16a34a', fontWeight: 700 }}>
                    {eatenCalories >= targets.calories ? 'עשית את זה! הזנת את הגוף בדיוק במה שהוא צריך ✅' : `נשאר ${targets.calories - Math.round(eatenCalories)} קל`}
                  </span>
                  <span>{targets.calories} קל</span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: Math.min(100, Math.round((eatenCalories / targets.calories) * 100)) + '%',
                    height: '100%',
                    background: eatenCalories >= targets.calories ? '#f97316' : '#16a34a',
                    borderRadius: 99, transition: 'width 0.3s'
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: eatenCalories >= targets.calories ? '#f97316' : '#0f4c2a', flexShrink: 0 }}>
                {Math.min(100, Math.round((eatenCalories / targets.calories) * 100))}%
              </div>
            </div>
            {targets && eatenProtein > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: eatenProtein >= targets.protein ? '#16a34a' : '#6b7280', fontWeight: 700 }}>
                  {eatenProtein >= targets.protein ? 'חלבון ✅ שריר, אנרגיה, שובע — הגוף שלך אומר תודה ☺️ 💪' : `🥩 ${Math.round(eatenProtein)}g / ${targets.protein}g חלבון`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', padding: '24px 18px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#86efac' }}>בין הראש לצלחת · אתי אטל</div>
            <div style={{ fontSize: 11, background: '#ffffff25', color: '#fff', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>🏆 {stageName}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>היי {displayName.split(' ')[0]}!</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div style={{ fontSize: 12, color: '#bbf7d0' }}>{logDateDisplay}{editingYesterday ? ' (אתמול)' : ''}</div>
            {editingYesterday ? (
              <button onClick={() => switchLogDate(todayKey)} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, border: 'none', background: '#ffffff30', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>↩ חזרה להיום</button>
            ) : (
              <button onClick={() => switchLogDate(yesterdayKey)} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, border: 'none', background: '#ffffff20', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>✏️ {gf('ערכי', 'ערוך')} את אתמול</button>
            )}
          </div>
          {targets && (
            <div style={{ marginTop: 10, background: '#ffffff20', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#86efac', marginBottom: 6 }}>
                <span>🔥 {Math.round(eatenCalories)} קל אכל{gf('ת', '')}</span>
                <span>יעד: {targets.calories} קל</span>
              </div>
              <div style={{ position: 'relative', height: 18, background: '#ffffff20', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, Math.round((eatenCalories / targets.calories) * 100)) + '%', height: '100%', background: eatenCalories >= targets.calories ? '#fbbf24' : '#4ade80', borderRadius: 99, transition: 'width 0.3s' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {Math.min(100, Math.round((eatenCalories / targets.calories) * 100))}%
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>{eatenCalories >= targets.calories ? '✅ הגעת ליעד!' : 'נשאר ' + (targets.calories - Math.round(eatenCalories)) + ' קל'}</div>
            </div>
          )}
          <div style={{ marginTop: 8, background: '#ffffff15', borderRadius: 10, height: 6, overflow: 'hidden' }}>
            <div style={{ width: Math.round((checkedCount / totalItems) * 100) + '%', height: '100%', background: '#4ade80', borderRadius: 10 }} />
          </div>
          <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>{checkedCount}/{totalItems} פריטים סומנו היום</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('diary')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'diary' ? '#16a34a' : '#e5e7eb'), background: activeTab === 'diary' ? '#dcfce7' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'diary' ? '#0f4c2a' : '#555' }}>
            📅 היומן
          </button>
          {currentStage >= 2 && (
            <button onClick={() => setActiveTab('guides')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'guides' ? C.teal : '#e5e7eb'), background: activeTab === 'guides' ? C.tealLight : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'guides' ? C.teal : '#555' }}>
              🏡 מדריכים
            </button>
          )}
          <button onClick={() => setActiveTab('agent')} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (activeTab === 'agent' ? C.agent : '#e5e7eb'), background: activeTab === 'agent' ? C.agentLight : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: activeTab === 'agent' ? C.agent : '#555', position: 'relative' }}>
            🤖 Agent
            <span style={{ position: 'absolute', top: 4, left: 4, width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />
          </button>
          <button onClick={() => setShowDocsMenu(!showDocsMenu)} style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (showDocsMenu ? '#7c3aed' : '#e5e7eb'), background: showDocsMenu ? '#faf5ff' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: showDocsMenu ? '#7c3aed' : '#555', position: 'relative' }}>
            📂 המסמכים
          </button>
        </div>

        {showDocsMenu && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e9d5ff', padding: '12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientData?.welcome_doc_enabled ? (
              <button onClick={() => { setShowWelcomeDoc(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#e8f5f2,#f0fdf4)', border: '1.5px solid #4a9b8e', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#3a7a6e', textAlign: 'right' }}>
                🌿 מסמך הפתיחה שלי — תזונה ומחלות
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🔒 מסמך הפתיחה — יפתח בקרוב
              </div>
            )}
            {feedback ? (
              <button onClick={() => window.open('/report?client=' + dbKey, '_blank')} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1.5px solid #0284c7', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#0f4c2a', textAlign: 'right' }}>
                📊 הניתוח האישי שלי — 360 ובדיקות דם
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                📊 הניתוח האישי — יתווסף לאחר הפגישה הראשונה
              </div>
            )}
            {rootsFeedback ? (
              <button onClick={() => { setShowRootsFeedback(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#fdf8f4,#fef3e8)', border: '1.5px solid #c4956a', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#92683a', textAlign: 'right' }}>
                🌱 המשוב האישי שלי — פגישת השורשים
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🌱 פגישת השורשים — יתווסף לאחר הפגישה
              </div>
            )}
            {bodyFeedback ? (
              <button onClick={() => { setShowBodyFeedback(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#f0fdfa,#e6faf8)', border: '1.5px solid #0d9488', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#0f766e', textAlign: 'right' }}>
                🩺 המשוב האישי שלי — הגוף מדבר
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🩺 הגוף מדבר — יתווסף לאחר הפגישה
              </div>
            )}
            {clientData?.outcome_doc ? (
              <button onClick={() => { setShowOutcomeDoc(true); setShowDocsMenu(false) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#faf5ff,#eff6ff)', border: '1.5px solid #7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#7c3aed', textAlign: 'right' }}>
                🧭 המטרה שלי — מסע התוצאה
              </button>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f3f4f6', border: '1.5px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
                🧭 המטרה שלי — יתווסף לאחר פגישה 2
              </div>
            )}
          </div>
        )}
      </div>

      {showAiReport && aiReport && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowAiReport(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>הניתוח האישי שלך 🧠</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{displayName.split(' ')[0]} · מאתי אטל</div>
                </div>
              </div>
            </div>
            {aiReport.split(/\n\s*--\s*\n/).filter(Boolean).map((section, i) => {
              const lines = section.trim().split('\n')
              const title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
              const body = lines.slice(1).join('\n').trim()
              const colors = ['#f0fdf4','#eff6ff','#fffbeb','#fef2f2','#faf5ff','#f0fdfa','#fff7ed']
              const borders = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0d9488','#f97316']
              const titleColors = ['#15803d','#1d4ed8','#b45309','#b91c1c','#6d28d9','#0f766e','#c2410c']
              return (
                <div key={i} style={{ background: colors[i % colors.length], borderRadius: 16, padding: '18px 20px', marginBottom: 14, border: '1.5px solid ' + borders[i % borders.length] }}>
                  {title && <div style={{ fontWeight: 800, fontSize: 15, color: titleColors[i % titleColors.length], marginBottom: 8 }}>{title}</div>}
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{body}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {showChildFeedback && childFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#faf5ff', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowChildFeedback(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 36 }}>👨‍👩‍👧</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב האישי שלך — הורה-ילד</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{displayName.split(' ')[0]} · מאתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const SECTION_COLORS = [
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f5f3ff', border: '#8b5cf6', title: '#7c3aed' },
                { bg: '#ede9fe', border: '#a78bfa', title: '#6d28d9' },
                { bg: '#f0f9ff', border: '#0ea5e9', title: '#0369a1' },
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
              ]
              return childFeedback.split(/\n\s*---\s*\n/).map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const hasTitle = firstLine.includes('**')
                const title = hasTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = hasTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: `1.5px solid ${c.border}`, boxShadow: `0 2px 8px rgba(124,58,237,0.12)` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}60`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}
      {showBodyFeedback && bodyFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f0fdfa', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowBodyFeedback(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0d9488', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 36 }}>🩺</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב האישי שלך — הגוף מדבר</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{displayName.split(' ')[0]} · מאתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const SECTION_COLORS = [
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
                { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
                { bg: '#fdf4ff', border: '#a21caf', title: '#86198f' },
              ]
              return bodyFeedback.split(/\n\s*---\s*\n/).map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const hasTitle = firstLine.includes('**')
                const title = hasTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = hasTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: `1.5px solid ${c.border}60`, boxShadow: `0 2px 8px ${c.border}20` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}40`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}
      {showRootsFeedback && rootsFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8f4ef', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowRootsFeedback(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#c4956a,#e8c9a0)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 36 }}>🌱</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב האישי שלך — פגישת השורשים</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{displayName.split(' ')[0]} · מאתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const SECTION_COLORS = [
                { bg: '#fff7ed', border: '#c4956a', title: '#92400e' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef9f0', border: '#e8a87c', title: '#9a4520' },
                { bg: '#fef3c7', border: '#f59e0b', title: '#d97706' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
              ]
              return rootsFeedback.split(/\n\s*---\s*\n/).map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const hasTitle = firstLine.includes('**')
                const title = hasTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = hasTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: `1.5px solid ${c.border}`, boxShadow: `0 2px 8px rgba(196,149,106,0.15)` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}60`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}
      {showDailyFeedback && feedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowDailyFeedback(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב האישי שלך 💚</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{displayName.split(' ')[0]} · {today} · אתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const rawSections = feedback.split(/\n\s*--\s*\n/)
              const SECTION_COLORS = [
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
                { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
                { bg: '#fdf4ff', border: '#a21caf', title: '#86198f' },
              ]
              return rawSections.map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const isBoldTitle = /^\*\*.*\*\*/.test(firstLine)
                const title = isBoldTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = isBoldTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 12, border: `1.5px solid ${c.border}40`, boxShadow: `0 2px 8px ${c.border}15` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}30`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}

      {guideUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#0f4c2a', color: '#fff', flexShrink: 0 }}>
            <button onClick={() => setGuideUrl(null)} style={{ padding: '7px 16px', borderRadius: 8, background: '#fff', color: '#0f4c2a', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>✕ סגרי</button>
            <img src="/logo.png" alt="בין הראש לצלחת" style={{ height: 32, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display='none' }} />
          </div>
          <iframe src={guideUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="מדריך" />
        </div>
      )}

      {showWelcomeDoc && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto' }}>
          <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 201 }}>
            <button onClick={() => setShowWelcomeDoc(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <WelcomeDocument clientPassword={dbKey} clientName={displayName} onContinue={() => setShowWelcomeDoc(false)} />
        </div>
      )}

      {showInitialReport && feedback && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowInitialReport(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#0f4c2a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #86efac', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>הניתוח האישי שלך 💚</div>
                  <div style={{ fontSize: 11, color: '#86efac' }}>{displayName.split(' ')[0]} · אתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const rawSections = feedback.split(/\n\s*--\s*\n/)
              const SECTION_COLORS = [
                { bg: '#f0fdf4', border: '#16a34a', title: '#15803d' },
                { bg: '#eff6ff', border: '#2563eb', title: '#1d4ed8' },
                { bg: '#fffbeb', border: '#d97706', title: '#b45309' },
                { bg: '#fef2f2', border: '#dc2626', title: '#b91c1c' },
                { bg: '#faf5ff', border: '#7c3aed', title: '#6d28d9' },
                { bg: '#f0fdfa', border: '#0d9488', title: '#0f766e' },
                { bg: '#fff7ed', border: '#f97316', title: '#c2410c' },
              ]
              return rawSections.map((section, i) => {
                const trimmed = section.trim()
                if (!trimmed) return null
                const lines = trimmed.split('\n')
                const firstLine = lines[0].trim()
                const isBoldTitle = /^\*\*.*\*\*/.test(firstLine)
                const title = isBoldTitle ? firstLine.replace(/\*\*/g, '').trim() : ''
                const body = isBoldTitle ? lines.slice(1).join('\n').trim() : trimmed
                const c = SECTION_COLORS[i % SECTION_COLORS.length]
                if (!body && !title) return null
                return (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '16px 18px', marginBottom: 12, border: `1.5px solid ${c.border}40`, boxShadow: `0 2px 8px ${c.border}15` }}>
                    {title && <div style={{ fontWeight: 900, fontSize: 15, color: c.title, marginBottom: 10, borderBottom: `2px solid ${c.border}30`, paddingBottom: 8 }}>{title}</div>}
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.9, textAlign: 'right' }}
                      dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </div>
                )
              }).filter(Boolean)
            })()}
          </div>
        </div>
      )}

      {showOutcomeDoc && clientData?.outcome_doc && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 201 }}>
            <button onClick={() => setShowOutcomeDoc(false)} style={{ padding: '10px 18px', borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕ סגרי</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 40px' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', borderRadius: 18, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo.png" alt="אתי אטל" style={{ height: 44, width: 44, borderRadius: 99, objectFit: 'contain', border: '2px solid #e9d5ff', background: '#fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>המטרה שלך — מסע התוצאה 🧭</div>
                  <div style={{ fontSize: 11, color: '#e9d5ff' }}>{displayName.split(' ')[0]} · אתי אטל</div>
                </div>
              </div>
            </div>
            {(() => {
              const BG = ['#f0fdf4','#eff6ff','#fffbeb','#fef2f2','#faf5ff','#f0fdfa','#fff7ed']
              const BD = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0d9488','#f97316']
              const TC = ['#15803d','#1d4ed8','#b45309','#b91c1c','#6d28d9','#0f766e','#c2410c']
              const renderLine = (line, accent) => {
                const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                if (line.startsWith('- ') || line.startsWith('• ')) return <div key={line} style={{ display:'flex', gap:6, margin:'2px 0' }}><span style={{ color:accent, fontWeight:700, flexShrink:0 }}>•</span><span dangerouslySetInnerHTML={{ __html: inl(line.slice(2)) }} /></div>
                if (line.trim() === '') return <div key={line + Math.random()} style={{ height:4 }} />
                return <div key={line} style={{ margin:'2px 0', lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: inl(line) }} />
              }
              return clientData.outcome_doc.split(/\n\s*---\s*\n/).filter(Boolean).map((section, i) => {
                const lines = section.trim().split('\n')
                const firstLine = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
                const rest = lines.slice(1)
                return (
                  <div key={i} style={{ background: BG[i % BG.length], borderRadius: 16, padding: '18px 20px', marginBottom: 12, border: '1.5px solid ' + BD[i % BD.length] }}>
                    {firstLine && <div style={{ fontWeight: 800, fontSize: 15, color: TC[i % TC.length], marginBottom: 8 }}>{firstLine}</div>}
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{rest.map(l => renderLine(l, BD[i % BD.length]))}</div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 14px 80px' }}>
          <AgentChat clientName={displayName} gender={userGender} clientProfile={clientData} />
        </div>
      )}

      {activeTab === 'guides' && currentStage >= 2 && (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 14px 80px' }}>
          {videoUrl && (
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #f0f0f0', marginBottom: 12 }}>
              <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', fontWeight: 800, fontSize: 15 }}>🎬 ברכת פתיחה מאתי</div>
              <iframe src={videoUrl.replace('watch?v=', 'embed/')} width="100%" height="200" frameBorder="0" allowFullScreen style={{ display: 'block' }} />
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: C.tealLight, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🛒</span>
              <div><div style={{ fontWeight: 800, fontSize: 15, color: C.teal }}>מדריך קניות חכם</div><div style={{ fontSize: 12, color: '#9ca3af' }}>רשימה מלאה עם טיפים וצ׳קבוקסים</div></div>
            </div>
            <div style={{ padding: 14 }}><button onClick={() => setGuideUrl('/shopping_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.teal, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך 🛒</button></div>
          </div>
          {pantryNotes ? (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff7ed', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🏡</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.orange }}>מדריך המזווה שלי</div><div style={{ fontSize: 12, color: '#9ca3af' }}>הנחיות אישיות מהפגישה שלנו בבית</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 12 }}>{pantryNotes}</div>
                <button onClick={() => setGuideUrl('/pantry_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.orange, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך המלא 🏡</button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff7ed', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🏡</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.orange }}>מדריך המזווה והמקרר</div><div style={{ fontSize: 12, color: '#9ca3af' }}>איך לארגן את המטבח לתמיכה בדרך שלך</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <button onClick={() => setGuideUrl('/pantry_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.orange, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את המדריך 🏡</button>
              </div>
            </div>
          )}
          {currentStage >= 3 && (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: C.purpleLight, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📚</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: C.purple }}>חוברת המתכונים של אתי</div><div style={{ fontSize: 12, color: '#9ca3af' }}>20 מתכונים · ללא קמח · ללא סוכר · חלבון גבוה</div></div>
              </div>
              <div style={{ padding: 14 }}><button onClick={() => setGuideUrl('/recipes_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: C.purple, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את החוברת 📚</button></div>
            </div>
          )}
          {currentStage >= 3 && (clientData?.client_track === 'child' || clientData?.client_track === 'both') && (
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f0f0f0', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fbeef2', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🎨</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: '#d9678a' }}>חוברת הארוחות המצוירות</div><div style={{ fontSize: 12, color: '#9ca3af' }}>רעיונות לארוחות מצוירות לילדים</div></div>
              </div>
              <div style={{ padding: 14 }}><button onClick={() => setGuideUrl('/food_art_guide.html')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, background: '#d9678a', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>פתחי את החוברת 🎨</button></div>
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 14px 120px', display: activeTab === 'diary' ? 'block' : 'none' }}>
        {aiReport && (
          <div style={{ background: 'linear-gradient(135deg,#0f4c2a,#1a6b3a)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, color: '#fff', cursor: 'pointer' }} onClick={() => setShowAiReport(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>🧠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>הניתוח האישי שלך מוכן!</div>
                <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>מאתי · לחצי לצפייה מלאה</div>
              </div>
              <div style={{ fontSize: 22 }}>←</div>
            </div>
          </div>
        )}
        {bodyFeedback && (
          <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, color: '#fff', cursor: 'pointer' }} onClick={() => setShowBodyFeedback(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>🩺</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב מפגישת הגוף מדבר</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>מאתי · לחצי לצפייה מלאה</div>
              </div>
              <div style={{ fontSize: 22 }}>←</div>
            </div>
          </div>
        )}
        {childFeedback && (
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, color: '#fff', cursor: 'pointer' }} onClick={() => setShowChildFeedback(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>👨‍👩‍👧</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב מפגישת הורה-ילד</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>מאתי · לחצי לצפייה מלאה</div>
              </div>
              <div style={{ fontSize: 22 }}>←</div>
            </div>
          </div>
        )}
        {rootsFeedback && (
          <div style={{ background: 'linear-gradient(135deg,#c4956a,#e8c9a0)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, color: '#fff', cursor: 'pointer' }} onClick={() => setShowRootsFeedback(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>🌱</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>המשוב מפגישת השורשים שלך</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>מאתי · לחצי לצפייה מלאה</div>
              </div>
              <div style={{ fontSize: 22 }}>←</div>
            </div>
          </div>
        )}
        {feedback && <FeedbackCard feedback={feedback} clientName={displayName} logDate={logDateDisplay} onOpenFull={() => setShowDailyFeedback(true)} />}

        {/* ✅ הצלחת החיה — ויזואליזציה של אותם אחוזי יעד אישיים */}
        {targets && (
          <div style={{ background: '#fff', borderRadius: 18, padding: '14px 18px 10px', marginBottom: 14, border: '1.5px solid #f0f0f0' }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 4, textAlign: 'center' }}>🍽️ הצלחת שלך היום</div>
            <LivePlate bars={plateBars} split={plateSplit} />
          </div>
        )}

        {/* ✅ מה בא לי? — המלצה לפי חשק ומה שנשאר מהיעד */}
        {targets && (
          <CravingHelper remainingCal={targets.calories - eatenCalories} remainingProt={targets.protein - eatenProtein} gfn={gf} />
        )}

        {/* ✅ כרטיס רצף ושבוע */}
        {weekDates.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius: 18, padding: '14px 18px', marginBottom: 14, border: '1.5px solid #fed7aa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {streak >= 2 ? (
                  <>
                    <span style={{ fontSize: 22 }}>🔥</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 14, color: '#c2410c' }}>{streak} ימים ברצף!</div>
                      <div style={{ fontSize: 11, color: '#9a3412' }}>המשיכי כך</div>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 22 }}>📅</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>שבוע זה</div>
                      <div style={{ fontSize: 11, color: '#a16207' }}>{weeklyDays} {weeklyDays === 1 ? 'יום' : 'ימים'} מתועדים</div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>{weeklyDays}/7</div>
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {weekDates.map(function(day, i) {
                const labels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
                const isToday = day.date === todayKey
                return (
                  <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: day.logged ? '#16a34a' : isToday ? '#fed7aa' : '#f3f4f6', border: isToday ? '2px solid #f97316' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {day.logged && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 9, color: isToday ? '#f97316' : '#9ca3af', fontWeight: isToday ? 800 : 400 }}>{labels[i]}</div>
                  </div>
                )
              })}
            </div>
            {(() => {
              const msg = streak === 1 ? 'יום ראשון — התחלת. זה הצעד הכי חשוב ❤️'
                : streak === 3 ? '3 ימים ברצף! כל הכבוד — את מזינה את הגוף שלך בטוב ✨ המשיכי ככה'
                : streak === 5 ? '5 ימים! את ממש בדרך הנכונה — הגוף שלך מרגיש את זה 💚'
                : streak === 7 ? 'שבוע שלם 🔥 זה לא מובן מאליו, זו בחירה שאת עושה כל יום. גאה בך!'
                : streak === 14 ? 'שבועיים ברצף — את לא בדיאטה, את בונה הרגל חדש לגמרי ומזמינה בריאות לחיים 💪'
                : streak === 21 ? '21 יום! הרגל חדש נוצר 🌱 הגוף שלך כבר מצפה לזה'
                : streak === 30 ? '30 יום! חודש שלם של בחירות בריאות — זה שינוי אמיתי 🏆'
                : weeklyDays === 3 ? 'מילאת 3 ימים השבוע — ממש מרגישה אותך מתחילה להתבסס 🙏'
                : weeklyDays === 5 ? '5 מתוך 7 — שבוע חזק! כל הכבוד על ההתמדה 🌟'
                : weeklyDays === 7 ? 'שבוע מושלם! 7/7 💚 הגוף שלך קיבל את כל מה שהוא צריך'
                : null
              return msg ? (
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.65)', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#92400e', textAlign: 'right', lineHeight: 1.5 }}>{msg}</div>
              ) : null
            })()}
            <ButterflyJourney streak={streak} />
          </div>
        )}

        {/* ✅ הצעת עדכון רמת פעילות לפי צעדים אמיתיים */}
        {suggestedActivity && suggestedActivity !== userActivity && avgStepsWeekly > 0 &&
          !localStorage.getItem('activitySuggestDismiss_' + dbKey + '_' + suggestedActivity) && targets && (
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: 18, padding: '14px 18px', marginBottom: 14, border: '1.5px solid #93c5fd' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>👟</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1d4ed8' }}>פעילות בפועל vs. הצהרה</div>
              </div>
              <button onClick={() => { localStorage.setItem('activitySuggestDismiss_' + dbKey + '_' + suggestedActivity, '1'); setSuggestedActivity(null) }} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#93c5fd', padding: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6, marginBottom: 10 }}>
              לפי הצעדים שתיעדת ב-14 ימים אחרונים,<br />
              הממוצע שלך הוא <strong>{avgStepsWeekly.toLocaleString()} צעדים/יום</strong>.<br />
              זה מתאים לרמת פעילות: <strong>{suggestedActivity}</strong>
              {' '}(הגדרת: <strong>{userActivity}</strong>).
            </div>
            {(() => {
              var suggested = calcTargets(parseFloat(userWeight), parseFloat(userHeight), parseInt(userAge), userGender, suggestedActivity, userGoal)
              var diff = suggested ? suggested.calories - targets.calories : 0
              return suggested ? (
                <div style={{ fontSize: 12, color: '#3b82f6', marginBottom: 12, background: '#dbeafe', borderRadius: 8, padding: '6px 10px' }}>
                  עדכון יחליף את היעד: <strong>{targets.calories} קל</strong> → <strong>{suggested.calories} קל</strong>
                  {' '}({diff > 0 ? '+' : ''}{diff} קל)
                </div>
              ) : null
            })()}
            <button onClick={async () => {
              await supabase.from('clients').update({ activity: suggestedActivity }).eq('password', dbKey)
              setUserActivity(suggestedActivity)
              localStorage.setItem('activitySuggestDismiss_' + dbKey + '_' + suggestedActivity, '1')
              setSuggestedActivity(null)
            }} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
              עדכוני ל"{suggestedActivity}" 👟
            </button>
          </div>
        )}

        <div style={{ background: '#faf5ff', borderRadius: 18, padding: 18, border: '1.5px solid #ddd6fe', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#6d28d9', marginBottom: 12, textAlign: 'right' }}>🧠 מודעות והקשבה לגוף</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>מה מצב הרוח שלך היום?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ k: 'calm', l: gf('😌 רגועה', '😌 רגוע') }, { k: 'stressed', l: '🤯 בסטרס' }, { k: 'tired', l: gf('🥱 עייפה', '🥱 עייף') }, { k: 'bored', l: gf('😐 משועממת', '😐 משועמם') }].map(m => {
                const isSel = userMood === m.k
                return <button key={m.k} onClick={() => setUserMood(m.k)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid ' + (isSel ? C.greenMid : '#e5e7eb'), background: isSel ? C.greenLight : '#fafafa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{m.l}</button>
              })}
            </div>
          </div>
          <NlpSelector label="לחץ וסטרס:" value={stressLevel} onChange={setStressLevel} max={5} lowLabel={gf('רגועה', 'רגוע')} highLabel="עומס" accent="#ef4444" />
          <NlpSelector label="עייפות:" value={fatigueLevel} onChange={setFatigueLevel} max={5} lowLabel={gf('אנרגטית', 'אנרגטי')} highLabel={gf('סחוטה', 'סחוט')} accent={C.orange} />
          <NlpSelector label="רעב ממוצע:" value={hungerLevel} onChange={setHungerLevel} max={5} lowLabel={gf('שבעה', 'שבע')} highLabel="רעב קיצוני" accent={C.blue} />
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8, textAlign: 'right' }}>למה {gf('אכלת', 'אכלת')} היום? (אפשר לסמן כמה)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              {[{ k: 'hungry', l: 'רעב אמיתי', i: '🍽️' }, { k: 'tired', l: gf('עייפה', 'עייף'), i: '😴' }, { k: 'stressed', l: gf('לחוצה', 'לחוץ'), i: '😤' }, { k: 'bored', l: gf('שעמום', 'שעמום'), i: '🥱' }, { k: 'social', l: 'חברתי', i: '👥' }, { k: 'habit', l: 'הרגל', i: '🔄' }].map(r => {
                const active = eatReasons.includes(r.k)
                return (
                  <button key={r.k} onClick={() => setEatReasons(active ? eatReasons.filter(k => k !== r.k) : [...eatReasons, r.k])}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 20, border: '1.5px solid ' + (active ? C.greenMid : '#e2e8f0'), background: active ? C.greenLight : '#fafafa', color: active ? C.greenDark : '#64748b', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span>{r.i}</span><span>{r.l}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {currentStage >= 2 && (
          <div style={{ background: '#f0fdf4', borderRadius: 18, padding: 18, border: '1.5px solid #bbf7d0', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginBottom: 12, textAlign: 'right' }}>🏃 ספורט שבועי</div>
            {!sportType ? (
              <>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>{gf('בחרי', 'בחר')} פעילות נוספת על ההליכות:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {SPORT_OPTIONS.map(s => (<button key={s.key} onClick={async () => { setSportType(s.key); await supabase.from('clients').update({ sport_type: s.key }).eq('password', dbKey) }} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fafafa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{s.icon} {s.label}</button>))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div><span style={{ fontSize: 22 }}>{SPORT_OPTIONS.find(s => s.key === sportType)?.icon || '⚡'}</span><span style={{ fontWeight: 700, fontSize: 14, marginRight: 6, color: C.purple }}>{SPORT_OPTIONS.find(s => s.key === sportType)?.label || sportType}</span></div>
                  <button onClick={() => setSportType('')} style={{ fontSize: 11, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }}>שנה</button>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>מחויבות שבועית:</div>
                  <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4].map(n => (<button key={n} onClick={async () => { setSportCommitDays(n); await supabase.from('clients').update({ sport_commit_days: n }).eq('password', dbKey) }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '2px solid ' + (sportCommitDays === n ? C.purple : '#e5e7eb'), background: sportCommitDays === n ? C.purpleLight : '#fff', color: sportCommitDays === n ? C.purple : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{n}×</button>))}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>פעמים בשבוע בנוסף על ההליכות</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: sportDoneToday ? '#faf5ff' : '#fafafa', borderRadius: 12, padding: '12px 14px' }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>אימון היום</div><div style={{ fontSize: 11, color: '#9ca3af' }}>השבוע: {sportDaysThisWeek}/{sportCommitDays} אימונים</div></div>
                  <button onClick={() => { var done = !sportDoneToday; setSportDoneToday(done); setSportDaysThisWeek(w => Math.max(0, Math.min(w + (done ? 1 : -1), sportCommitDays))) }} style={{ padding: '8px 16px', borderRadius: 10, background: sportDoneToday ? C.purple : '#fff', color: sportDoneToday ? '#fff' : C.purple, border: '2px solid ' + C.purple, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{sportDoneToday ? '✅ בוצע!' : '+ סמן אימון'}</button>
                </div>
                {sportDaysThisWeek >= sportCommitDays && (<div style={{ marginTop: 8, background: C.purpleLight, borderRadius: 10, padding: '8px 12px', textAlign: 'center', fontSize: 13, color: C.purple, fontWeight: 700 }}>🏆 {gf('השלמת', 'השלמת')} את המחויבות השבועית! מדהים!</div>)}
              </>
            )}
          </div>
        )}

        <Section title="ארוחת בוקר" icon="☀️" accent={C.orange} light={C.orangeLight} defaultOpen={true} cardBg="#fffdf8" cardBorder="#fed7aa">
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0 4px', textAlign: 'right' }}>{PLAN.bokerSnack}</div>
          <YesNo value={hadSnack} onChange={setHadSnack} labelYes="✅ אכלתי חטיף" labelNo="❌ דילגתי" accent={C.orange} />
          {filteredBokerProtein.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, marginBottom: 4, marginTop: 4, textAlign: 'right' }}>🥛 חלבון</div>
              {filteredBokerProtein.map(item => item.gramQty
                ? <GramQtyCheckRow key={item.id} item={item} accent={C.orange} checked={!!checks[item.id]} qty={checksQty[item.id]} nutritionItem={nutritionData[nutritionId(item.id)]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} onQtyChange={v => setChecksQty(q => ({ ...q, [item.id]: v }))} />
                : item.calPerSlice
                ? <SliceQtyRow key={item.id} item={item} accent={C.orange} checked={!!checks[item.id]} qty={carbQty[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} onQtyChange={v => setCarbQty(q => ({ ...q, [item.id]: v }))} />
                : <CheckRow key={item.id} id={item.id} text={withBaseQty(item.text, nutritionData[nutritionId(item.id)])} accent={C.orange} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
            </>
          )}
          {filteredBokerCarbs.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4, marginTop: 8, textAlign: 'right' }}>🍞 פחמימה</div>
              {filteredBokerCarbs.map(item => item.calPerSlice
                ? <SliceQtyRow key={item.id} item={item} accent={C.orange} checked={!!checks[item.id]} qty={carbQty[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} onQtyChange={v => setCarbQty(q => ({ ...q, [item.id]: v }))} />
                : <CheckRow key={item.id} id={item.id} text={withBaseQty(item.text, nutritionData[nutritionId(item.id)])} accent={C.orange} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
            </>
          )}
          {filteredBokerExtra.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 4, marginTop: 8, textAlign: 'right' }}>🌿 נוסף</div>
              {filteredBokerExtra.map(item => <CheckRow key={item.id} id={item.id} text={withBaseQty(item.text, nutritionData[nutritionId(item.id)])} accent={C.orange} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
            </>
          )}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות לבוקר:</div>
          <CheckRow id="b_veggie1" text="סלט או ירקות חתוכים" accent={C.teal} checked={!!checks['b_veggie1']} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />
          <CheckRow id="b_veggie1_oil" text="+ כף שמן זית על הסלט" accent={C.teal} checked={!!checks['b_veggie1_oil']} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />
          <FreeText value={bokerFree} onChange={setBokerFree} placeholder="אכלתי גם / פרטים נוספים..." />
          <ExtraCal value={bokerExtraCal} onChange={setBokerExtraCal} valueProt={bokerExtraProt} onChangeProt={setBokerExtraProt} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
          <ScanCorrection desc={scanDesc} cal={scanCalories} onChangeCal={setScanCalories} prot={scanProtein} onChangeProt={setScanProtein} fat={scanFat} onChangeFat={setScanFat} carbs={scanCarbs} onChangeCarbs={setScanCarbs} onReset={() => { setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0) }} />
        </Section>

        <Section title="ארוחת צהריים" icon="🌞" accent={C.greenMid} light={C.greenLight} cardBg="#fffdf8" cardBorder="#fed7aa">
          <div style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
            {[{ k: 'A', l: '🍽️ מרכיבי הארוחה' }, { k: 'B', l: '🫒 רטבים ונלווים' }].map(opt => (<button key={opt.k} onClick={() => setLunchOpt(lunchOpt === opt.k ? null : opt.k)} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '2px solid ' + (lunchOpt === opt.k ? C.greenMid : '#e5e7eb'), background: lunchOpt === opt.k ? C.greenLight : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: lunchOpt === opt.k ? C.greenDark : '#555' }}>{opt.l}</button>))}
          </div>
          {lunchOpt === 'A' && (
            <div>
              {/* ── מד השלמה חי ── */}
              {(() => {
                if (!targets) return null
                // ✅ סכום כל החלבונות/הפחמימות שנבחרו — מתוך אותה רשימת lunchProtRows/lunchCarbRows שמזינה גם את הצ'קליסט, כדי שהמד והרשימה לא יסתרו זה את זה
                // ⚠️ בגרמים של המאקרו עצמו (macroDisplay), לא בקלוריות — אחרת המד "מתמלא" לפי קלוריות המאכל ולא לפי גרמי החלבון/פחמימה שבאמת הגיעו
                const protGramActual = lunchProtRows.filter(r => r.isChecked).reduce((sum, r) => sum + r.macroDisplay, 0) + calcExtraProt()
                const carbGramActual = lunchCarbRows.filter(r => r.isChecked).reduce((sum, r) => sum + r.macroDisplay, 0)
                const hasProtein = lunchProtRows.some(r => r.isChecked)
                const hasCarbs = lunchCarbRows.some(r => r.isChecked)
                const protRemain = hasProtein ? Math.max(0, lunchProtBudget - protGramActual) : lunchProtBudget
                const carbRemain = hasCarbs ? Math.max(0, lunchCarbBudget - carbGramActual) : lunchCarbBudget

                return (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '10px 14px', marginBottom: 10, border: '1px solid #86efac' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>🎯 יעד הצהריים שלך</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>חלבון: {protGramActual}/{lunchProtBudget} גר'</div>
                        <div style={{ height: 6, background: '#dcfce7', borderRadius: 99 }}>
                          <div style={{ width: Math.min(100, lunchProtBudget > 0 ? (protGramActual/lunchProtBudget)*100 : 0) + '%', height: '100%', background: '#16a34a', borderRadius: 99, transition: 'width 0.3s' }} />
                        </div>
                        {protRemain > 0 && hasProtein && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>נשאר {protRemain} גר' חלבון</div>}
                        {protRemain === 0 && hasProtein && <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>✅ הגעת ליעד!</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>פחמימה: {carbGramActual}/{lunchCarbBudget} גר'</div>
                        <div style={{ height: 6, background: '#dcfce7', borderRadius: 99 }}>
                          <div style={{ width: Math.min(100, lunchCarbBudget > 0 ? (carbGramActual/lunchCarbBudget)*100 : 0) + '%', height: '100%', background: '#f97316', borderRadius: 99, transition: 'width 0.3s' }} />
                        </div>
                        {carbRemain > 0 && hasCarbs && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>נשאר {carbRemain} גר' פחמימה</div>}
                        {carbRemain === 0 && hasCarbs && <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>✅ הגעת ליעד!</div>}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>פחמימה:</div>
              {lunchCarbRows.map(({ o, isChecked, recQty, calDisplay }) => {
                return (
                  <div key={o.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }} onClick={() => { setCarbChecks(c => ({ ...c, [o.id]: !c[o.id] })); setCarbCheckOrder(ord => carbChecks[o.id] ? ord.filter(x => x !== o.id) : [...ord, o.id]) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: isChecked ? 1 : 0.85 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (isChecked ? C.greenMid : '#d1d5db'), background: isChecked ? C.greenMid : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isChecked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: isChecked ? C.greenDark : '#222', fontWeight: isChecked ? 700 : 400, flex: 1, textAlign: 'right' }}>{o.text}</span>
                        </div>
                      </div>
                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <input
                            type="number"
                            value={carbQty[o.id] || ''}
                            onChange={e => setCarbQty(q => ({ ...q, [o.id]: Number(e.target.value) || 0 }))}
                            placeholder={String(recQty)}
                            style={{ width: 60, padding: '4px 6px', borderRadius: 8, border: '1.5px solid ' + C.greenMid, fontSize: 12, textAlign: 'center', outline: 'none' }}
                          />
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>גר'</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.greenMid, textAlign: 'left', paddingBottom: 4 }}>
                      {isChecked ? (<>≈ {calDisplay} קל {!carbQty[o.id] && <span style={{ color: '#9ca3af' }}>(מומלץ: {recQty} גר')</span>}</>) : (<span style={{ color: '#9ca3af' }}>מומלץ: {recQty} גר'</span>)}
                    </div>
                  </div>
                )
              })}

              <div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '10px 0 2px', textAlign: 'right' }}>חלבון:</div>
              {lunchProtRows.map(({ o, unitItem, isChecked, recQty, calDisplay }) => {
                return (
                  <div key={o.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }} onClick={() => { setProtChecks(p => ({ ...p, [o.id]: !p[o.id] })); setProtCheckOrder(ord => protChecks[o.id] ? ord.filter(x => x !== o.id) : [...ord, o.id]) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: isChecked ? 1 : 0.85 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (isChecked ? C.greenMid : '#d1d5db'), background: isChecked ? C.greenMid : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isChecked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: isChecked ? C.greenDark : '#222', fontWeight: isChecked ? 700 : 400, flex: 1, textAlign: 'right' }}>{o.text}</span>
                        </div>
                      </div>
                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <input
                            type="number"
                            value={protQty[o.id] || ''}
                            onChange={e => setProtQty(q => ({ ...q, [o.id]: Number(e.target.value) || 0 }))}
                            placeholder={String(recQty)}
                            style={{ width: 55, padding: '4px 6px', borderRadius: 8, border: '1.5px solid ' + C.greenMid, fontSize: 12, textAlign: 'center', outline: 'none' }}
                          />
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{unitItem ? unitItem.unitLabel : 'גר\''}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.greenMid, textAlign: 'left', paddingBottom: 4 }}>
                      {isChecked ? (<>≈ {calDisplay} קל {!protQty[o.id] && <span style={{ color: '#9ca3af' }}>(מומלץ: {recQty} {unitItem ? unitItem.recLabel : 'גר\''})</span>}</>) : (<span style={{ color: '#9ca3af' }}>מומלץ: {recQty} {unitItem ? unitItem.recLabel : 'גר\''}</span>)}
                    </div>
                  </div>
                )
              })}

              {/* תזכורת חלבון */}
              {Object.values(carbChecks).some(Boolean) && !Object.values(protChecks).some(Boolean) && (
                <div style={{ marginTop: 10, background: '#fff7ed', borderRadius: 10, padding: '10px 14px', border: '1.5px solid #fed7aa', fontSize: 13, color: '#92400e' }}>
                  💪 זכרי להוסיף חלבון — זה מה ששומר אותך שבעה עד הערב
                </div>
              )}
            </div>
          )}
          {lunchOpt === 'B' && (<div><div style={{ fontWeight: 700, fontSize: 12, color: C.greenMid, padding: '6px 0 2px', textAlign: 'right' }}>רטבים ותוספות:</div>{filteredFat.map(o => <CheckRow key={o.id} id={o.id} text={o.text} accent={C.greenMid} checked={!!checks[o.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}</div>)}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות (חובה!):</div>
          {PLAN.veggieOptions.map(o => <CheckRow key={o.id} id={o.id} text={o.text} accent={C.teal} checked={!!veggieChecks[o.id]} onToggle={id => setVeggieChecks(v => ({ ...v, [id]: !v[id] }))} />)}
          <FreeText value={lunchFree} onChange={setLunchFree} placeholder="פרטים נוספים על הצהריים..." />
          <ExtraCal value={lunchExtraCal} onChange={setLunchExtraCal} valueProt={lunchExtraProt} onChangeProt={setLunchExtraProt} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
          <ScanCorrection desc={scanDesc} cal={scanCalories} onChangeCal={setScanCalories} prot={scanProtein} onChangeProt={setScanProtein} fat={scanFat} onChangeFat={setScanFat} carbs={scanCarbs} onChangeCarbs={setScanCarbs} onReset={() => { setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0) }} />
        </Section>

        <Section title="ביניים" icon="🌤" accent={C.blue} light={C.blueLight}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.blue, padding: '8px 0 4px', textAlign: 'right' }}>בחר/י:</div>
          {filteredBenayim.map(o => <RadioRow key={o.id} id={o.id} text={o.text} accent={C.blue} selected={benayimSel} onSelect={setBenayimSel} />)}
          <YesNo value={hadBenayim} onChange={setHadBenayim} labelYes="✅ אכלתי" labelNo="❌ דילגתי" accent={C.blue} />
        </Section>

        <Section title="🍷 משקאות אלכוהוליים" icon="🍷" accent={'#7c3aed'} light={'#faf5ff'}>
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: '1px solid #fcd34d', fontSize: 13, color: '#92400e', lineHeight: 1.7, textAlign: 'right' }}>
            🍷 אלכוהול מכיל קלוריות ריקות — ללא ערך תזונתי. בתהליך שמירה על משקל מומלץ להגביל עד כמה שאפשר. אם בחרת לשתות — כדאי שתדעי מה זה עולה מתוך היעד היומי שלך.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { id: 'wine', label: '🍷 יין', sub: '120 קל לכוס' },
              { id: 'beer', label: '🍺 בירה', sub: '150 קל לבקבוק' },
              { id: 'cocktail', label: '🍹 קוקטייל', sub: '200 קל לכוס' },
            ].map(d => (
              <button key={d.id} onClick={() => setDrinkType(drinkType === d.id ? null : d.id)} style={{ flex: 1, minWidth: 80, padding: '10px 6px', borderRadius: 12, border: '2px solid ' + (drinkType === d.id ? '#7c3aed' : '#e5e7eb'), background: drinkType === d.id ? '#faf5ff' : '#fafafa', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: drinkType === d.id ? '#7c3aed' : '#333' }}>{d.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{d.sub}</div>
              </button>
            ))}
          </div>
          {drinkType && (
            <div style={{ background: '#faf5ff', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e9d5ff' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textAlign: 'right' }}>כמה כוסות / בקבוקים?</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setDrinkCount(drinkCount === n ? 0 : n)} style={{ width: 44, height: 44, borderRadius: 99, border: '2px solid ' + (drinkCount === n ? '#7c3aed' : '#e5e7eb'), background: drinkCount === n ? '#7c3aed' : '#fff', color: drinkCount === n ? '#fff' : '#555', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>{n}</button>
                ))}
              </div>
              {drinkCount > 0 && (() => {
                const DRINK_CALS = { wine: 120, beer: 150, cocktail: 200 }
                const totalDrinkCal = (DRINK_CALS[drinkType] || 0) * drinkCount
                return (
                  <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>{totalDrinkCal} קל</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>מתוך היעד היומי שלך נוצלו על משקה</div>
                  </div>
                )
              })()}
            </div>
          )}
        </Section>

        <Section title="ארוחת ערב" icon="🌙" accent={C.purple} light={C.purpleLight} cardBg="#fffdf8" cardBorder="#fed7aa">
          {filteredErev.map(item => item.gramQty
            ? <GramQtyCheckRow key={item.id} item={item} accent={C.purple} checked={!!checks[item.id]} qty={checksQty[item.id]} nutritionItem={nutritionData[nutritionId(item.id)]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} onQtyChange={v => setChecksQty(q => ({ ...q, [item.id]: v }))} />
            : item.calPerSlice
            ? <SliceQtyRow key={item.id} item={item} accent={C.purple} checked={!!checks[item.id]} qty={carbQty[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} onQtyChange={v => setCarbQty(q => ({ ...q, [item.id]: v }))} />
            : <CheckRow key={item.id} id={item.id} text={withBaseQty(item.text, nutritionData[nutritionId(item.id)])} accent={C.purple} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
          <div style={{ fontWeight: 700, fontSize: 12, color: C.teal, padding: '10px 0 2px', textAlign: 'right' }}>🥗 ירקות לערב:</div>
          {PLAN.veggieOptions.map(o => (<div key={o.id + '_e'} onClick={() => setChecks(c => { var n = {...c}; n[o.id + '_erev'] = !n[o.id + '_erev']; return n })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', opacity: checks[o.id + '_erev'] ? 0.45 : 1 }}><div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (checks[o.id + '_erev'] ? C.teal : '#d1d5db'), background: checks[o.id + '_erev'] ? C.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{checks[o.id + '_erev'] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}</div><span style={{ fontSize: 14, color: '#222', textDecoration: checks[o.id + '_erev'] ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>{o.text}</span></div>))}
          <CheckRow id="b_veggie1_oil_erev" text="+ כף שמן זית על הסלט" accent={C.teal} checked={!!checks['b_veggie1_oil_erev']} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />
          <FreeText value={erevFree} onChange={setErevFree} placeholder="פרטים נוספים על הערב..." />
          <ExtraCal value={erevExtraCal} onChange={setErevExtraCal} valueProt={erevExtraProt} onChangeProt={setErevExtraProt} />
          <MealScanner gender={userGender} onAdd={(cal, desc, prot, fat, carbs) => { setScanCalories(c => c + cal); setScanDesc(desc); setScanProtein(p => p + (prot||0)); setScanFat(f => f + (fat||0)); setScanCarbs(c => c + (carbs||0)) }} joinedDate={joinedDate} />
          <ScanCorrection desc={scanDesc} cal={scanCalories} onChangeCal={setScanCalories} prot={scanProtein} onChangeProt={setScanProtein} fat={scanFat} onChangeFat={setScanFat} carbs={scanCarbs} onChangeCarbs={setScanCarbs} onReset={() => { setScanCalories(0); setScanDesc(''); setScanProtein(0); setScanFat(0); setScanCarbs(0) }} />
        </Section>

        <Section title="🥫 המזווה ועוגני ההתארגנות" icon="🛒" accent={C.teal} light={C.tealLight} isLocked={currentStage < 2} lockMessage="ייפתח לאחר פגישת המזווה שלנו! 🔒">
          <div style={{ paddingTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 4 }}>💡 עוגן שבועי — מקרר מנצח:</div>
            <div style={{ fontSize: 13, color: '#444', background: C.tealLight, padding: 10, borderRadius: 10, lineHeight: 1.6, marginBottom: 12 }}>{gf('הקפידי', 'הקפד')} שבכל סופ"ש יהיו לך לפחות 3 מקורות חלבון מבושלים במקרר וירקות שטופים וחתוכים.</div>
            {[{ id: 'shop1', text: 'הכנתי קיטים מראש למקפיא' }, { id: 'shop2', text: 'חתכתי ירקות ושמתי בגובה העיניים במקרר' }, { id: 'shop3', text: 'יש קופסת הצלה מוכנה במקרר' }, { id: 'shop4', text: 'קניתי מקורות חלבון לשבוע' }].map(item => <CheckRow key={item.id} id={item.id} text={item.text} accent={C.teal} checked={!!checks[item.id]} onToggle={id => setChecks(c => { var n = {...c}; n[id] = !n[id]; return n })} />)}
          </div>
        </Section>

        <Section title="🧁 ספר המתכונים של אתי" icon="✨" accent={C.purple} light={C.purpleLight} isLocked={currentStage < 3} lockMessage="ייפתח לאחר סדנת הנשנושים! 🔒">
          <div style={{ paddingTop: 6 }}>
            {BONUS_RECIPES.map(function(rec, idx) {
              return (<div key={idx} style={{ background: '#fff', padding: 10, borderRadius: 10, border: '1px solid #e9d5ff', marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><span style={{ fontWeight: 700, fontSize: 13, color: C.purple }}>{rec.title}</span><span style={{ fontSize: 11, background: C.purpleLight, color: C.purple, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{rec.cal}</span></div><div style={{ fontSize: 12, color: '#666' }}><span style={{ fontWeight: 600 }}>רכיבים:</span> {rec.ingredients}</div></div>)
            })}
          </div>
        </Section>

        <Section title="מעקב שתייה" icon="💧" accent={C.blue} light={C.blueLight}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 10, textAlign: 'right' }}>
              {water === 0 ? 'עדיין לא שתית 💧' : water === 0.5 ? '0.5 ליטר ✅' : water === 1 ? 'ליטר אחד ✅' : water === 1.5 ? 'ליטר וחצי ✅' : '2 ליטר 🏆'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0.5, 1, 1.5, 2].map(l => (
                <button key={l} onClick={() => setWater(l === water ? 0 : l)} style={{
                  flex: 1, padding: '12px 4px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  border: '2px solid ' + (water >= l ? C.blue : '#e5e7eb'),
                  background: water >= l ? C.blueLight : '#fafafa',
                  color: water >= l ? C.blue : '#555'
                }}>
                  💧{l}L
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, height: 6, background: '#f3f4f6', borderRadius: 99 }}>
              <div style={{ width: Math.min(100, (water / 2) * 100) + '%', height: '100%', background: C.blue, borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>יעד: 1.5-2 ליטר ביום</div>
          </div>
        </Section>

        <Section title="מעקב צעדים" icon="🚶" accent={C.purple} light={C.purpleLight}>
          <div style={{ padding: '10px 0' }}>
            <input type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="מספר צעדים..." style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
            <div style={{ marginTop: 8, height: 8, background: '#f3f4f6', borderRadius: 99 }}>
              <div style={{ width: Math.min(100, Math.round((parseInt(steps) || 0) / 10000 * 100)) + '%', height: '100%', background: C.purple, borderRadius: 99 }} />
            </div>
          </div>
        </Section>

        <Section title="כללים חשובים" icon="📋" accent={C.amber} light={C.amberLight}>
          <div style={{ paddingTop: 8 }}>
            {PLAN.rules.map(function(r, i) { return (<div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < PLAN.rules.length - 1 ? '1px solid #fef3c7' : 'none' }}><span style={{ fontSize: 18 }}>{r.icon}</span><span style={{ fontSize: 13.5, color: '#333', lineHeight: 1.6, flex: 1, textAlign: 'right' }}>{r.text}</span></div>) })}
          </div>
        </Section>

        <div style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', border: '1.5px solid #f0f0f0', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10, textAlign: 'right' }}>הערה יומית לאתי</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={gf('כתבי כאן איך הרגשת היום...', 'כתוב כאן איך הרגשת היום...')} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 16, borderRadius: 16, background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f4c2a,#16a34a)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 17 }}>
          {saving ? 'שומר...' : saved ? '✅ נשמר!' : gf('שמרי', 'שמור') + ' את היום שלי'}
        </button>
        {showWAButton && (
          <a href={'https://wa.me/972523336766?text=' + encodeURIComponent('יומן חדש! 🌿\n' + (displayName || dbKey) + ' מילאה את היומן היום.\nhttps://project-l990h.vercel.app/admin')}
            target="_blank" rel="noopener noreferrer"
            onClick={() => setShowWAButton(false)}
            style={{ display: 'block', width: '100%', padding: 12, borderRadius: 14, marginTop: 8, background: '#25D366', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            📱 שלחי הודעה לאתי
          </a>
        )}
        <button onClick={resetDay} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 8, background: 'transparent', border: '1px solid #fca5a5', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>🔄 {gf('אפסי', 'אפס')} את היום</button>
        <button onClick={() => setSetupDone(false)} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>{gf('עדכני', 'עדכן')} העדפות תזונה</button>
        <button onClick={() => setProfileDone(false)} style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6, background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>{gf('עדכני', 'עדכן')} פרטים אישיים</button>
      </div>
    </div>
  )
}

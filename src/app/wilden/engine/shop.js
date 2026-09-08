// ─── החנות ───
// "חייב להיות אלמנט של חנות." המטבעות נאספים בדרך, ועד עכשיו לא היה מה
// לעשות איתם חוץ מביצה ויצור שלישי. עכשיו: כובעים ומשקפיים ליצורים
// שנתפסו, וחולצה וכובע לדמות של הילד במפה.
//
// טהור. הפריטים הם ציורים (SVG ב-ui/Wear.js) — אין קבצים, אין אמן.
// קונים פעם אחת; פריט שנקנה אפשר ללבוש על כל יצור, ועל הילד. מי לובש מה
// נשמר ב-progress.wear: { [creatureId]: { head, face }, kid: { head, shirt } }.

export const SLOT = { HEAD: 'head', FACE: 'face', SHIRT: 'shirt' }

export const ITEMS = [
  { id: 'cap', slot: SLOT.HEAD, name: 'כובע מצחייה', price: 25 },
  { id: 'party', slot: SLOT.HEAD, name: 'כובע מסיבה', price: 20 },
  { id: 'flower', slot: SLOT.HEAD, name: 'פרח', price: 15 },
  { id: 'bow', slot: SLOT.HEAD, name: 'פפיון', price: 20 },
  { id: 'wizard', slot: SLOT.HEAD, name: 'כובע קוסם', price: 45 },
  { id: 'crown', slot: SLOT.HEAD, name: 'כתר', price: 70 },
  { id: 'shades', slot: SLOT.FACE, name: 'משקפי שמש', price: 30 },
  { id: 'glasses', slot: SLOT.FACE, name: 'משקפיים עגולים', price: 25 },
  // חולצות — רק לילד במפה. הירוקה היא מה שיש מההתחלה.
  { id: 'shirt-red', slot: SLOT.SHIRT, name: 'חולצה אדומה', price: 10, color: '#D9534F', dark: '#A33C39' },
  { id: 'shirt-blue', slot: SLOT.SHIRT, name: 'חולצה כחולה', price: 10, color: '#3E86D6', dark: '#2A5F9C' },
  { id: 'shirt-yellow', slot: SLOT.SHIRT, name: 'חולצה צהובה', price: 10, color: '#F2C641', dark: '#B8922A' },
  { id: 'shirt-purple', slot: SLOT.SHIRT, name: 'חולצה סגולה', price: 10, color: '#9B6BD6', dark: '#6D479C' },
]

export const itemById = id => ITEMS.find(i => i.id === id) || null
export const KID = 'kid'

// איפה הכובע יושב על כל יצור: אחוזים מתיבת הדמות (x מהרוחב, y מהגובה),
// וגובה הפריט כאחוז מגובה הדמות. נמדד על הפריים הראשון של הקליפ החי —
// הפריים המלא, כולל השוליים השקופים, כי זו התיבה שהדפדפן נותן ל-<img>.
// הדמויות נושמות וזזות, אז זה "בערך" — כמו כובע על ילד שקופץ.
export const ANCHORS = {
  nimi: { head: { x: 55, y: 31, h: 12 }, face: { x: 56, y: 44, h: 7 } },
  dabashon: { head: { x: 60, y: 26, h: 12 }, face: { x: 61, y: 37, h: 7 } },
  bolder: { head: { x: 54, y: 13, h: 10 }, face: { x: 55, y: 17, h: 5 } },
  ruchi: { head: { x: 67, y: 35, h: 8 }, face: { x: 68, y: 41, h: 5 } },
  lumi: { head: { x: 65, y: 33, h: 7 }, face: { x: 66, y: 38, h: 5 } },
  gali: { head: { x: 53, y: 30, h: 11 }, face: { x: 54, y: 42, h: 7 } },
  tzel: { head: { x: 62, y: 34, h: 10 }, face: { x: 63, y: 44, h: 6 } },
  kraag: { head: { x: 62, y: 14, h: 12 }, face: { x: 62, y: 26, h: 8 } },
  noga: { head: { x: 60, y: 29, h: 11 }, face: { x: 61, y: 40, h: 6 } },
}

export const owns = (progress, id) => (progress?.owned || []).includes(id)

export function canBuy(progress, id) {
  const it = itemById(id)
  if (!it || owns(progress, id)) return false
  return (progress?.coins || 0) >= it.price
}

// קנייה: מטבעות יורדים, הפריט נכנס לרשימה. לא לובש עדיין — זה בנפרד.
export function buy(progress, id) {
  if (!canBuy(progress, id)) return progress
  const it = itemById(id)
  return { ...progress, coins: (progress.coins || 0) - it.price, owned: [...(progress.owned || []), id] }
}

// מה לובש מי. who: מזהה יצור, או KID. id ריק = להוריד.
// חולצה — רק לילד. יצור לא לובש מה שלא נקנה.
export function equip(progress, who, slot, id) {
  if (!who || !slot) return progress
  if (id != null) {
    const it = itemById(id)
    if (!it || it.slot !== slot || !owns(progress, id)) return progress
    if (slot === SLOT.SHIRT && who !== KID) return progress
  }
  const wear = { ...(progress.wear || {}) }
  const cur = { ...(wear[who] || {}) }
  if (id == null) delete cur[slot]; else cur[slot] = id
  if (Object.keys(cur).length) wear[who] = cur; else delete wear[who]
  return { ...progress, wear }
}

export const wearOf = (progress, who) => progress?.wear?.[who] || {}

// מי לובש את הפריט הזה עכשיו (רשימת who).
export function wornBy(progress, id) {
  return Object.entries(progress?.wear || {}).filter(([, w]) => Object.values(w).includes(id)).map(([who]) => who)
}

// מיזוג בין טלפונים: מה שנקנה נקנה (איחוד); מה שלובשים — של הבסיס, ומי
// שהבסיס לא הלביש, מהצד השני.
export function mergeWear(base, other) {
  const owned = [...new Set([...(base?.owned || []), ...(other?.owned || [])])]
  const wear = { ...(other?.wear || {}), ...(base?.wear || {}) }
  return { owned, wear }
}

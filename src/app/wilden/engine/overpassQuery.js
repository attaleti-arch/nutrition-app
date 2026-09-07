// ─── שאילתת Overpass ───
// קובץ טהור בלי 'use client', כי גם הדפדפן וגם ה-API route בשרת בונים
// את אותה שאילתה. עותק אחד, ולא שניים שנפרדים בשקט.

// דרכים שילד הולך בהן. אין כאן כבישים מהירים, ראשיים או עורקיים — לא כי
// אין שם מדרכה, אלא כי אנחנו לא שולחים ילד לעמוד ליד כביש סואן.
export const WALKABLE = 'residential|living_street|pedestrian|footway|path|unclassified|service|steps'

// שטחים שנקודה בתוכם נפסלת, גם אם עובר בהם שביל רשום.
// leisure=park ו-playground לא נמצאים כאן בכוונה — גן ציבורי הוא מקום
// מצוין ליצור. רשימה מצומצמת בכוונה: כל תגית היא עוד סריקה בשרת.
export const FORBIDDEN_TAGS = [
  '[landuse~"^(cemetery|industrial|military|quarry|landfill|farmland|orchard|vineyard|forest|meadow|allotments)$"]',
  '[natural~"^(water|wood|scrub|wetland|grassland)$"]',
  '[amenity=grave_yard]',
  '[aeroway]',
]

export const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// שתי שאילתות נפרדות, לא אחת כבדה. הרחובות הם מה שחייבים; המצולעים
// (שדות, תעשייה, בית קברות) הם שכבת בטיחות שרצה במקביל בתקציב זמן קצר,
// ואם לא הגיעה — יוצאים בלי. שאילתה משולבת עם רלציות על רדיוס של 1.7 ק"מ
// לקחה ל-Overpass יותר מ-20 שניות מהטלפון שלה, וכל מסע נפל לחלופי.
export function buildQuery(lat, lng, radius, part = 'streets') {
  const R = Math.round(radius * 1.1)
  const around = `(around:${R},${lat},${lng})`
  if (part === 'blocked') {
    const forbidden = FORBIDDEN_TAGS.map(t => `way${around}${t};`).join('')
    return `[out:json][timeout:12];(${forbidden});out geom;`
  }
  return `[out:json][timeout:25];(` +
    `way${around}[highway~"^(${WALKABLE})$"][foot!=no][access!=private];` +
    `);out geom;`
}

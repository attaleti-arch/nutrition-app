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

export function buildQuery(lat, lng, radius) {
  const R = Math.round(radius * 1.2)
  const around = `(around:${R},${lat},${lng})`
  const forbidden = FORBIDDEN_TAGS
    .flatMap(t => [`way${around}${t};`, `relation${around}${t};`])
    .join('')
  return `[out:json][timeout:20];(` +
    `way${around}[highway~"^(${WALKABLE})$"][foot!=no][access!=private];` +
    forbidden +
    `);out geom;`
}

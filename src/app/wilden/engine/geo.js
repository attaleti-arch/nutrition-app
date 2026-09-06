// ─── גאומטריה על פני כדור ───
// טהור לגמרי: בלי React, בלי DOM, בלי רשת. כל מה שהמנוע צריך כדי לדעת
// איפה הילד, לאן הוא הולך וכמה הוא כבר הלך.

const EARTH = 6371000
const rad = d => (d * Math.PI) / 180
const deg = r => (r * 180) / Math.PI

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH * Math.asin(Math.sqrt(s))
}

// כיוון מ-a ל-b במעלות, 0 = צפון. זה מה שמסובב את החץ של הביקון.
export function bearing(a, b) {
  const dLng = rad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export function destination(from, bearingDeg, distM) {
  const d = distM / EARTH
  const br = rad(bearingDeg)
  const lat1 = rad(from.lat)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  )
  const lng2 =
    rad(from.lng) +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )
  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 }
}

// ── סינון קפיצות GPS ──
// זה הקוד היקר ביותר בפרויקט הקודם, והוא עובר לכאן כמו שהוא.
// מתחת ל-6 מ' זה רעש של המקלט כשעומדים במקום; מעל 120 מ' בין שתי
// דגימות זו קפיצה של הטלפון ולא הליכה. בלי שני הסֵפים האלה ילד "הולך"
// חמישים מטר בלי לזוז, והיצורים נתפסים לבד.
export const STEP_MIN = 6
export const STEP_MAX = 120

export function stepBetween(prev, next) {
  if (!prev) return 0
  const d = haversine(prev, next)
  return d > STEP_MIN && d < STEP_MAX ? d : 0
}

// ── צבירת מרחק הליכה ──
// זה הבאג שהרג את כל המסע הראשון בשטח, והוא עדין:
//
// הסינון פוסל צעד קטן מ-6 מ' כרעש מקלט. אבל אם נקודת הייחוס מתקדמת בכל
// דגימה, אז בהליכה רגילה — כמטר וחצי בין דגימה לדגימה — *כל* צעד נופל
// מתחת לסף. הילד הולך חצי קילומטר והמונה נשאר על אפס, הביקון תקוע על
// "נקלט אות חלש", ושום דבר בעולם לא קורה.
//
// התיקון: נקודת הייחוס זזה רק כשהצעד נספר. הצעדים הקטנים מצטברים
// ביניהם עד שהם חוצים את הסף יחד — ורעש של מכשיר שעומד במקום עדיין
// נפסל, כי הוא לא מצטבר לכיוון אחד.
export function advanceWalk(ref, pos) {
  if (!ref) return { ref: pos, add: 0, moved: 0 }
  const d = haversine(ref, pos)
  if (d >= STEP_MAX) return { ref: pos, add: 0, moved: d }   // קפיצה, לא הליכה
  if (d > STEP_MIN) return { ref: pos, add: d, moved: d }
  return { ref, add: 0, moved: d }                            // עוד לא מספיק. ממתינים.
}

// אורך מצטבר של מסלול, ומיקום נקודה לפי מרחק לאורכו. שניהם משמשים
// למקם יעד "קדימה על המסלול שהילד כבר הולך בו".
export function pathLength(path) {
  let s = 0
  for (let i = 1; i < path.length; i++) s += haversine(path[i - 1], path[i])
  return s
}

// מחזיר { point, index } במרחק metersAlong לאורך המסלול. אם המרחק גדול
// מאורך המסלול — מחזיר את הנקודה האחרונה.
export function pointAlong(path, metersAlong) {
  if (!path || path.length === 0) return null
  if (path.length === 1) return { point: path[0], index: 0 }
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const seg = haversine(path[i - 1], path[i])
    if (acc + seg >= metersAlong) {
      const t = seg === 0 ? 0 : (metersAlong - acc) / seg
      return {
        point: {
          lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * t,
          lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * t,
        },
        index: i,
      }
    }
    acc += seg
  }
  return { point: path[path.length - 1], index: path.length - 1 }
}

// ── איפה הילד נמצא על המסלול ──
// מטיל את המיקום על הקטע הקרוב ביותר ומחזיר כמה מטרים לאורך המסלול הוא
// הגיע, ובאיזה מרחק הוא מהמסלול עצמו. זה מה שמאפשר resume אחרי שהילד
// סגר את הטלפון וזז — במקום להחזיר אותו לנקודה של אתמול, המנוע מוצא
// איפה הוא עכשיו ומודד קדימה משם.
//
// ההטלה נעשית במטרים מקומיים סביב הנקודה, ולא על קואורדינטות גולמיות:
// חיסור של ערכי קו־אורך גדולים מאבד דיוק בדיוק בקנה מידה שמעניין אותנו.
export function progressAlong(path, pos) {
  if (!path || path.length < 2) return { along: 0, offPath: 0, index: 0 }
  const mPerLat = 111320
  const mPerLng = 111320 * Math.cos(rad(pos.lat))
  const X = p => (p.lng - pos.lng) * mPerLng
  const Y = p => (p.lat - pos.lat) * mPerLat

  let acc = 0
  let best = { along: 0, offPath: Infinity, index: 0 }
  for (let i = 1; i < path.length; i++) {
    const ax = X(path[i - 1]), ay = Y(path[i - 1])
    const bx = X(path[i]), by = Y(path[i])
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
    const px = ax + t * dx, py = ay + t * dy
    const off = Math.hypot(px, py)
    const seg = haversine(path[i - 1], path[i])
    if (off < best.offPath) best = { along: acc + t * seg, offPath: off, index: i - 1 }
    acc += seg
  }
  return best
}

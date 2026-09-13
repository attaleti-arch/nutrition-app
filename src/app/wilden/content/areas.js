// ─── העולם הוא רצועה, לא מלבן ───
// "אין אפשרות שהעולם יהיה פנורמי ואפשר להזיז ממקום למקום? כדי שלא הכל
// יהיה דחוס."
//
// צודקת: תשע דמויות, השומר, השואב וארבעה מבנים על מלבן 3:4 אחד — זה
// צפוף, וכל דמות חדשה מחמירה. מהיום העולם הוא רצועה של מקומות, ומחליקים
// ביניהם הצידה. כל מקום הוא תפאורה 3:4 משלו, עם הדמויות ששייכות לו.
//
// למה מקומות ולא תמונה אחת ארוכה: תפאורה נוצרת ב-GPT בפריים אחד, ושתי
// תמונות רחבות לא מתחברות בתפר בלי להיראות כמו תפר. שני מקומות שונים
// לא צריכים להתחבר — הם מקומות שונים. וזה גם נותן לעולם מבנה: מה
// שמאחורי השער הוא באמת מקום אחר.
//
// להוסיף מקום = להוסיף רשומה כאן ולתת area לדמויות שעוברות אליו. שום
// לוגיקה אחרת לא משתנה. מקום בלי תפאורה פשוט לא קיים — אין "בקרוב".
//
//   id      — המזהה שדמות מצביעה עליו (spots.js: area)
//   name    — מה שכתוב על הנקודה למעלה
//   bg      — התפאורה. חובה; בלי קובץ אין מקום.
//   video   — אותה תפאורה נושמת (אופציונלי)
//   healed  — התמונה אחרי שהעולם נרפא, ועולה בהדרגה מעליה (אופציונלי)
//   hd      — סטיל חד לזום (אופציונלי)
//   needs   — דגל מ-worldState שחייב להיות דלוק כדי שהמקום ייפתח
//             (למשל gateOpen). בלי needs — פתוח מההתחלה.

export const AREAS = [
  {
    id: 'ruin',
    name: 'החורבה',
    bg: '/world/broken.jpg',
    video: '/world/broken.mp4',
    hd: '/world/broken-hd.jpg',
    healed: '/world/healed.jpg',
    healedVideo: '/world/healed.mp4',
    healedHd: '/world/healed-hd.jpg',
  },
  // המקום הבא — מה שמאחורי השער — יושב כאן ברגע שהתפאורה שלו תגיע:
  // { id: 'gate', name: 'מעבר לשער', bg: '/world/gate.jpg', needs: 'gateOpen' },
]

export const DEFAULT_AREA = AREAS[0].id
export const areaById = id => AREAS.find(a => a.id === id) || null
export const areaIndex = id => Math.max(0, AREAS.findIndex(a => a.id === id))

// מקום פתוח: יש לו תפאורה, וגם הדגל שהוא מחכה לו דלוק. (worldState נכנס
// מבחוץ כדי שהקובץ יישאר נתונים, בלי תלות במנוע.)
export const areaOpen = (a, world = {}) => !!a?.bg && (!a.needs || !!world[a.needs])
export const openAreas = (world = {}) => AREAS.filter(a => areaOpen(a, world))

// לאיזה מקום שייכת דמות. ברירת מחדל: החורבה — כך שדמות בלי area לא
// נעלמת מהעולם לעולם.
export const areaOfSpot = spot => (spot?.area && areaById(spot.area) ? spot.area : DEFAULT_AREA)

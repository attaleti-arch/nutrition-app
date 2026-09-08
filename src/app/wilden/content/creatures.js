// ─── מרשם היצורים ───
// הקוד קורא רק מכאן. אף פעם לא שם קובץ ואף פעם לא שם קליפ ישירות.
//
// כשהנכסים האמיתיים יגיעו מהאמן, זה הקובץ היחיד שמשתנה. אם הוא מוסר
// קליפ בשם Idle_01 במקום IDLE — משנים מילה אחת כאן, ואף שורת לוגיקה
// לא נוגעת בזה. זו כל ההגנה מפני כתיבה מחדש.
//
// ── שפה ברורה על מה יש ומה אין ──
// model  — מודל תלת-ממדי (GLB) של הדמות הזאת. null = עדיין אין. הבמה
//          נופלת לספרייט בעצמה. אף פעם לא שמים כאן מודל של יצור אחר
//          "בינתיים": זה בדיוק איך שילד מקבל כדור ירוק במקום נימי.
// sprites — גזירות דו-ממדיות מגיליון הדמויות. מה שמוצג היום.
// clip    — סרטון קצר (MP4, 9:16, ~5 שניות) שמתנגן אחרי התפיסה. null = אין
//          עדיין, ואז אין מסך קליפ בכלל. אף פעם לא סרטון של יצור אחר.
// live    — אותו קליפ בלי הרקע, כ-WebP מונפש שקוף. זו הדמות החיה ב-AR:
//          כשיש live, הבמה מציגה אותו במקום המודל התלת-ממדי הקפוא.
//          "עם כל התלת-ממד זה לא מרגיש דמות" — זה התיקון, באפס כסף.
//
// כשה-GLB של נימי יגיע: שמים אותו ב-/public/creatures/nimi/nimi.glb,
// משנים את model לנתיב הזה, ומעדכנים את שמות הקליפים ב-clips לשמות
// שבקובץ. אף שורת לוגיקה לא נוגעת בזה.

export const AR_MODE = {
  GROUND: 'ground',       // עומד על הקרקע לפי מישור משוער
  SKY: 'sky',             // בשמיים לפי זווית גובה. רוחי.
  SCENERY: 'scenery',     // חלק מהנוף. קראג במסעות 1–9: בלי ריג בכלל.
}

const CLIPS = {
  idle: 'IDLE', move: 'MOVE', alert: 'ALERT', hide: 'HIDE',
  appear: 'APPEAR', interact: 'INTERACT', catch: 'CATCH',
  celebrate: 'CELEBRATE', sleep: 'SLEEP',
}

export const CREATURES = {
  nimi: {
    id: 'nimi', name: 'נימי',
    // המודל שלה, מ-Meshy (Image to 3D) מתוך הרינדור של נימי. המקור 24MB
    // ומיליון משולשים; כאן גרסה ל-טלפון: 60K משולשים, טקסטורות 1K ב-WebP,
    // 1.9MB. בלי אנימציות עדיין — הוא עומד ומסתובב עם הטלפון, לא הולך.
    model: '/creatures/nimi/nimi.glb',
    ios: null,
    clip: '/creatures/nimi/caught.mp4',
    live: '/creatures/nimi/live.webp',
    sprites: { hero: '/creatures/nimi/hero.png', peek: '/creatures/nimi/peek.png' },
    heightM: 0.45,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,                          // עקבות אמיתיות + מזויפות. טרם הופק.
    clips: { ...CLIPS, special: 'SNIFF' },
    verb: 'TRACK',
  },
  dabashon: {
    id: 'dabashon', name: 'דבשון',
    // המודל שלה מ-Meshy, מוקטן לטלפון (68K משולשים, 1K WebP, 3.1MB). בלי
    // אנימציות: מרחף בקוד. הוא דבורה — באוויר, לא על הרצפה.
    model: '/creatures/dabashon/dabashon.glb',
    ios: null,
    clip: '/creatures/dabashon/caught.mp4',
    live: '/creatures/dabashon/live.webp',
    sprites: null,                        // אין עדיין גזירה דו-ממדית
    heightM: 0.40,
    arMode: AR_MODE.SKY,
    controller: 'buzz',
    decal: null,
    clips: { ...CLIPS, special: 'HONEY' },
    verb: 'HONEY',
    brings: 'דבש',
  },
  bolder: {
    id: 'bolder', name: 'בולדר',
    // הבן שלה: "בולדי נשמע כמו איש קירח". מעכשיו בולדר. הבנאי: גולם אבן
    // עם חורבה על הגב, טחב וזהב. המודל שלה מ-Meshy (19.2MB → 1.7MB, 60K
    // משולשים). על הרצפה, גדול, עקבות אבן. "מישהו כאן ידע לבנות" — זה הוא.
    model: '/creatures/bolder/bolder.glb',
    ios: null,
    clip: null,
    live: null,
    sprites: null,
    heightM: 0.80,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',   // 'missing-piece' (הרכבה) עוד לא נכתב
    decal: null,
    clips: { ...CLIPS, special: 'BUILD' },
    verb: 'BUILD',
    brings: 'אבן',
  },
  ruchi: {
    id: 'ruchi', name: 'רוחי',
    // ציפור רוח, כחול-זהב. המודל שלה מ-Meshy (19.5MB → 1.9MB, 60K משולשים,
    // 1K WebP). באוויר, גבוה יותר מדבשון.
    model: '/creatures/ruchi/ruchi.glb',
    ios: null,
    clip: null,
    live: null,
    sprites: null,
    heightM: 0.45,
    arMode: AR_MODE.SKY,
    controller: 'gust',
    decal: null,
    clips: { ...CLIPS, special: 'GLIDE' },
    verb: 'GLIDE',
    brings: 'רוח',
  },
  lumi: {
    id: 'lumi', name: 'לומי',
    // שועל-אור עם זנב נוצות. המודל שלה מ-Meshy (18.4MB → 2.2MB). על הרצפה,
    // עקבות כמו נימי.
    model: '/creatures/lumi/lumi.glb',
    ios: null,
    clip: null,
    live: null,
    sprites: null,
    heightM: 0.55,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,
    clips: { ...CLIPS, special: 'GLOW' },
    verb: 'GLOW',
    brings: 'ניצוץ',
  },
  gali: {
    id: 'gali', name: 'גלי',
    // יצור מים, כולו גל. המודל שלה מ-Meshy (16.9MB → 1.6MB). על הרצפה,
    // עקבות רטובות.
    model: '/creatures/gali/gali.glb',
    ios: null,
    clip: null,
    live: null,
    sprites: null,
    heightM: 0.50,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,
    clips: { ...CLIPS, special: 'SPLASH' },
    verb: 'SPLASH',
    brings: 'מים',
  },
  tzel: {
    id: 'tzel', name: 'צל',
    // שועל צללים סגול, הזנב זוהר. המודל שלה מ-Meshy (16.3MB → 1.8MB). על
    // הרצפה, עקבות. הצל שלו הוא מה שהוא משאיר.
    model: '/creatures/tzel/tzel.glb',
    ios: null,
    // הקליפ שלה מ-Runway: נמס לצל שטוח, מחליק הצידה, וקם. רקע ירוק-אפור
    // (#3D4C3D) כי הוא כהה מדי לרקע הכהה — נגזר לשקוף כאן.
    clip: '/creatures/tzel/caught.mp4',
    live: '/creatures/tzel/live.webp',
    sprites: null,
    heightM: 0.50,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,
    clips: { ...CLIPS, special: 'VANISH' },
    verb: 'VANISH',
    brings: 'צללים',
  },
  kraag: {
    id: 'kraag', name: 'קראג',
    // המודל שלה מ-Meshy (19.6MB → 1.8MB). בקאנון המקורי קראג הוא "חורבה
    // חיה" שמתעוררת רק במסע 10 בגובה 2.2 מ'. היא שלחה את המודל שלו עכשיו,
    // עם תוכנית של שישה יצורים — אז הוא נכנס לסבב כיצור קטן, על הרצפה,
    // עם עקבות אבן. ההתעוררות הגדולה נשארת לסיפור, כשנגיע לשם.
    model: '/creatures/kraag/kraag.glb',
    ios: null,
    clip: '/creatures/kraag/caught.mp4',
    live: '/creatures/kraag/live.webp',
    sprites: null,
    heightM: 0.70,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,
    clips: { ...CLIPS, special: 'CARRY' },
    verb: 'CARRY',
    brings: 'אבנים',
  },
}

export const creatureById = id => CREATURES[id] || null

// היצור מוכן להצגה רק אם יש לו מודל. קראג במכוון בלי — הוא נוף עד
// מסע 10, ושכבת ה-AR צריכה לדעת את זה בלי להתרסק.
export const hasModel = id => !!CREATURES[id]?.model

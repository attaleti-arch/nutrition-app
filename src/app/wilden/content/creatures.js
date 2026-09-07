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
    sprites: null,                        // אין עדיין גזירה דו-ממדית
    heightM: 0.40,
    arMode: AR_MODE.SKY,
    controller: 'buzz',
    decal: null,
    clips: { ...CLIPS, special: 'HONEY' },
    verb: 'HONEY',
    brings: 'דבש',
  },
  boldi: {
    id: 'boldi', name: 'בולדי',
    model: null,                          // אין עדיין. לא מציבים יצור אחר במקומו.
    ios: null,
    sprites: null,                        // הגיליון של בולדי עוד לא נגזר
    heightM: 0.70,
    arMode: AR_MODE.GROUND,
    controller: 'missing-piece',
    decal: null,
    clips: { ...CLIPS, special: 'BUILD' },
    verb: 'BUILD',
  },
  kraag: {
    id: 'kraag', name: 'קראג',
    // המודל שלה מ-Meshy (19.6MB → 1.8MB). בקאנון המקורי קראג הוא "חורבה
    // חיה" שמתעוררת רק במסע 10 בגובה 2.2 מ'. היא שלחה את המודל שלו עכשיו,
    // עם תוכנית של שישה יצורים — אז הוא נכנס לסבב כיצור קטן, על הרצפה,
    // עם עקבות אבן. ההתעוררות הגדולה נשארת לסיפור, כשנגיע לשם.
    model: '/creatures/kraag/kraag.glb',
    ios: null,
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

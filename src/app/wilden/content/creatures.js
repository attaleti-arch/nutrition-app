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
  appear: 'APPEAR', interact: 'INTERACT', befriend: 'BEFRIEND',
  celebrate: 'CELEBRATE', sleep: 'SLEEP',
}

export const CREATURES = {
  nimi: {
    id: 'nimi', name: 'נימי',
    model: null,                          // מחכה ל-nimi.glb האמיתי
    ios: null,
    sprites: { hero: '/creatures/nimi/hero.png', peek: '/creatures/nimi/peek.png' },
    heightM: 0.45,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,                          // עקבות אמיתיות + מזויפות. טרם הופק.
    clips: { ...CLIPS, special: 'SNIFF' },
    verb: 'TRACK',
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
    model: null,                          // חורבה חיה. סטטי במסעות 1–9.
    ios: null,
    heightM: 2.20,
    arMode: AR_MODE.SCENERY,
    controller: 'awaken',
    decal: null,
    clips: { ...CLIPS, special: 'CARRY' },
    verb: 'CARRY',
  },
}

export const creatureById = id => CREATURES[id] || null

// היצור מוכן להצגה רק אם יש לו מודל. קראג במכוון בלי — הוא נוף עד
// מסע 10, ושכבת ה-AR צריכה לדעת את זה בלי להתרסק.
export const hasModel = id => !!CREATURES[id]?.model

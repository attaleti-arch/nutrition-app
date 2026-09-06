// ─── מרשם היצורים ───
// הקוד קורא רק מכאן. אף פעם לא שם קובץ ואף פעם לא שם קליפ ישירות.
//
// כשהנכסים האמיתיים יגיעו מהאמן, זה הקובץ היחיד שמשתנה. אם הוא מוסר
// קליפ בשם Idle_01 במקום IDLE — משנים מילה אחת כאן, ואף שורת לוגיקה
// לא נוגעת בזה. זו כל ההגנה מפני כתיבה מחדש.
//
// כרגע model מצביע על ה-GLB הזמניים כדי שאפשר יהיה לבדוק את הצינור
// לפני שמזמינים משהו.

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
    model: '/monsters3d/anafon.glb',     // placeholder
    ios: '/monsters3d/anafon.usdz',
    heightM: 0.45,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,                          // עקבות אמיתיות + מזויפות. טרם הופק.
    clips: { ...CLIPS, special: 'SNIFF' },
    verb: 'TRACK',
  },
  boldi: {
    id: 'boldi', name: 'בולדי',
    model: '/monsters3d/avnon.glb',
    ios: '/monsters3d/avnon.usdz',
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

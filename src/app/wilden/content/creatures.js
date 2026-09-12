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
// poster  — פריים אחד מתוך live, חתוך לדמות. זו התמונה של הספר: 27 צורות
//           על מסך אחד הן 30 מגה של קליפים מונפשים, וחצי מגה של פוסטרים.
//           הקליפ החי נשאר לעמוד של היצור, אחד בכל פעם.
// live    — אותו קליפ בלי הרקע, כ-WebP מונפש שקוף. זו הדמות החיה ב-AR:
//          כשיש live, הבמה מציגה אותו במקום המודל התלת-ממדי הקפוא.
//          "עם כל התלת-ממד זה לא מרגיש דמות" — זה התיקון, באפס כסף.
//
// stages — הדמות של כל שלב התפתחות (ראה engine/stages.js):
//          stages: { 2: { live, clip, model }, 3: { ... } }. שלב בלי רשומה
//          מקבל את הדמות הבסיסית, גדולה יותר, עם הילה — עד שהחומר יגיע.
// gender — 'f' לנקבות (האני, גלי, נוגה): "גדלה", "הבוגרת". ברירת מחדל זכר.
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
    poster: '/creatures/nimi/poster.webp',
    sprites: { hero: '/creatures/nimi/hero.png', peek: '/creatures/nimi/peek.png' },
    // ── שלבים ── הדמות של כל שלב (ראה engine/stages.js). anchors: איפה
    // הכובע יושב על הדמות הזאת. אין שלב 3 עדיין — הילה וגודל עד שיגיע.
    stages: {
      2: { live: '/creatures/nimi/s2/live.webp', clip: '/creatures/nimi/s2/caught.mp4', poster: '/creatures/nimi/s2/poster.webp',
        anchors: { head: { x: 62, y: 17, h: 9 }, face: { x: 63, y: 24, h: 6 } } },
    },
    // ── צבעים מהביצה עם דמות משלהם ── (ראה engine/egg.js, stages.lookOf)
    // "זוהר": הקליפ הראשון של נימי המפותח — זנב פלאף, סימנים בטורקיז.
    variants: {
      glow: { live: '/creatures/nimi/glow/live.webp', clip: '/creatures/nimi/glow/caught.mp4',
        poster: '/creatures/nimi/glow/poster.webp',
        anchors: { head: { x: 61, y: 23, h: 9 }, face: { x: 62, y: 32, h: 5 } } },
    },
    heightM: 0.45,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,                          // עקבות אמיתיות + מזויפות. טרם הופק.
    clips: { ...CLIPS, special: 'SNIFF' },
    verb: 'TRACK',
  },
  dabashon: {
    // "דבשון שם כבד." הבן שלה והחברים. מעכשיו האני — כמו דבש. המזהה נשאר,
    // כדי שמי שכבר תפס אותה לא יאבד כלום.
    id: 'dabashon', name: 'האני', gender: 'f',
    // המודל שלה מ-Meshy, מוקטן לטלפון (68K משולשים, 1K WebP, 3.1MB). בלי
    // אנימציות: מרחף בקוד. הוא דבורה — באוויר, לא על הרצפה.
    model: '/creatures/dabashon/dabashon.glb',
    ios: null,
    clip: '/creatures/dabashon/caught.mp4',
    live: '/creatures/dabashon/live.webp',
    poster: '/creatures/dabashon/poster.webp',
    sprites: null,                        // אין עדיין גזירה דו-ממדית
    stages: {
      2: { live: '/creatures/dabashon/s2/live.webp', clip: '/creatures/dabashon/s2/caught.mp4', poster: '/creatures/dabashon/s2/poster.webp',
        anchors: { head: { x: 54, y: 24, h: 7 }, face: { x: 55, y: 30, h: 5 } } },
    },
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
    // הקליפ שלה מ-Runway: מרים רגל כבדה ורוקע, הקווים הזהובים מהבהבים, מהנהן.
    clip: '/creatures/bolder/caught.mp4',
    live: '/creatures/bolder/live.webp',
    poster: '/creatures/bolder/poster.webp',
    // הקליפ השני שלה: הוא רוקע ומתפוצץ באור, ברקים, אבנים עפות, עשן. זה
    // רגע הבריחה שלו במרדף — מוצג פעם אחת במקום שבו עמד, ואז הוא מאחוריכם.
    burst: '/creatures/bolder/burst.webp',
    sprites: null,
    stages: {
      2: { live: '/creatures/bolder/s2/live.webp', clip: '/creatures/bolder/s2/caught.mp4', poster: '/creatures/bolder/s2/poster.webp',
        anchors: { head: { x: 57, y: 24, h: 7 }, face: { x: 58, y: 30, h: 5 } } },
    },
    heightM: 0.80,
    arMode: AR_MODE.GROUND,
    controller: 'stomp',                  // לא בורח: רוקע, נעלם באבק, ומאחוריכם
    decal: null,
    clips: { ...CLIPS, special: 'BUILD' },
    verb: 'BUILD',
    brings: 'אבן',
  },
  ruchi: {
    id: 'ruchi', name: 'רוחי',
    stages: {
      2: { live: '/creatures/ruchi/s2/live.webp', clip: '/creatures/ruchi/s2/caught.mp4', poster: '/creatures/ruchi/s2/poster.webp',
        anchors: { head: { x: 56, y: 29, h: 6 }, face: { x: 56, y: 35, h: 3 } } },
    },
    // ציפור רוח, כחול-זהב. המודל שלה מ-Meshy (19.5MB → 1.9MB, 60K משולשים,
    // 1K WebP). באוויר, גבוה יותר מדבשון.
    model: '/creatures/ruchi/ruchi.glb',
    ios: null,
    // הקליפ שלה מ-Runway: פורש כנפיים, מנפנף, עולה קצת וצף חזרה.
    clip: '/creatures/ruchi/caught.mp4',
    live: '/creatures/ruchi/live.webp',
    poster: '/creatures/ruchi/poster.webp',
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
    stages: {
      2: { live: '/creatures/lumi/s2/live.webp', clip: '/creatures/lumi/s2/caught.mp4', poster: '/creatures/lumi/s2/poster.webp',
        anchors: { head: { x: 65, y: 27, h: 7 }, face: { x: 66, y: 33, h: 4 } } },
    },
    // שועל-אור עם זנב נוצות. המודל שלה מ-Meshy (18.4MB → 2.2MB). על הרצפה,
    // עקבות כמו נימי.
    model: '/creatures/lumi/lumi.glb',
    ios: null,
    // הקליפ שלה מ-Runway: עומד במקום, הזנב נדלק והאור מתפשט על הגוף.
    // ההשתקפות על הרצפה נחתכת בגזירה (מתחת לכפות).
    clip: '/creatures/lumi/caught.mp4',
    live: '/creatures/lumi/live.webp',
    poster: '/creatures/lumi/poster.webp',
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
    id: 'gali', name: 'גלי', gender: 'f',
    stages: {
      2: { live: '/creatures/gali/s2/live.webp', clip: '/creatures/gali/s2/caught.mp4', poster: '/creatures/gali/s2/poster.webp',
        anchors: { head: { x: 51, y: 22, h: 8 }, face: { x: 51, y: 29, h: 5 } } },
    },
    // יצור מים, כולו גל. המודל שלה מ-Meshy (16.9MB → 1.6MB). על הרצפה,
    // עקבות רטובות.
    model: '/creatures/gali/gali.glb',
    ios: null,
    // הקליפ שלה מ-Runway: מתפרק לטבעת מים מסתחררת, ומתגבש חזרה. 12 שניות.
    clip: '/creatures/gali/caught.mp4',
    live: '/creatures/gali/live.webp',
    poster: '/creatures/gali/poster.webp',
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
    // שלב 2: שועל שחור על רקע כמעט שחור — נחתך לפי גוון (הרקע ירקרק, הוא
    // אפור-סגול) ובהירות, לא לפי צבע. לפעם הבאה: רקע בהיר יותר לצל.
    stages: {
      2: { live: '/creatures/tzel/s2/live.webp', clip: '/creatures/tzel/s2/caught.mp4', poster: '/creatures/tzel/s2/poster.webp',
        anchors: { head: { x: 62, y: 29, h: 8 }, face: { x: 63, y: 37, h: 4 } } },
    },
    // שועל צללים סגול, הזנב זוהר. המודל שלה מ-Meshy (16.3MB → 1.8MB). על
    // הרצפה, עקבות. הצל שלו הוא מה שהוא משאיר.
    model: '/creatures/tzel/tzel.glb',
    ios: null,
    // הקליפ שלה מ-Runway: נמס לצל שטוח, מחליק הצידה, וקם. רקע ירוק-אפור
    // (#3D4C3D) כי הוא כהה מדי לרקע הכהה — נגזר לשקוף כאן.
    clip: '/creatures/tzel/caught.mp4',
    live: '/creatures/tzel/live.webp',
    poster: '/creatures/tzel/poster.webp',
    sprites: null,
    heightM: 0.50,
    arMode: AR_MODE.GROUND,
    controller: 'shadow',                 // רק הצל שלו מחליק על הרצפה, עד שקם
    decal: null,
    clips: { ...CLIPS, special: 'VANISH' },
    verb: 'VANISH',
    brings: 'צללים',
  },
  kraag: {
    id: 'kraag', name: 'קראג',
    stages: {
      2: { live: '/creatures/kraag/s2/live.webp', clip: '/creatures/kraag/s2/caught.mp4', poster: '/creatures/kraag/s2/poster.webp',
        anchors: { head: { x: 64, y: 26, h: 6 }, face: { x: 65, y: 32, h: 3 } } },
    },
    // המודל שלה מ-Meshy (19.6MB → 1.8MB). בקאנון המקורי קראג הוא "חורבה
    // חיה" שמתעוררת רק במסע 10 בגובה 2.2 מ'. היא שלחה את המודל שלו עכשיו,
    // עם תוכנית של שישה יצורים — אז הוא נכנס לסבב כיצור קטן, על הרצפה,
    // עם עקבות אבן. ההתעוררות הגדולה נשארת לסיפור, כשנגיע לשם.
    model: '/creatures/kraag/kraag.glb',
    ios: null,
    clip: '/creatures/kraag/caught.mp4',
    live: '/creatures/kraag/live.webp',
    poster: '/creatures/kraag/poster.webp',
    sprites: null,
    heightM: 0.70,
    arMode: AR_MODE.GROUND,
    controller: 'tracks-true-or-false',
    decal: null,
    clips: { ...CLIPS, special: 'CARRY' },
    verb: 'CARRY',
    brings: 'אבנים',
  },
  noga: {
    id: 'noga', name: 'נוגה', gender: 'f',
    stages: {
      2: { live: '/creatures/noga/s2/live.webp', clip: '/creatures/noga/s2/caught.mp4', poster: '/creatures/noga/s2/poster.webp',
        anchors: { head: { x: 61, y: 31, h: 9 }, face: { x: 62, y: 38, h: 5 } } },
    },
    // "כל הילדים אמרו לי ש-8 יצורים זה לא מספיק." התשיעית: איילת אור —
    // קרניים של עלים זוהרים, זנב של עלי כותרת. המודל שלה מ-Meshy
    // (19.1MB → 2.5MB, 60K משולשים, WebP 1K). הקליפ שלה מ-Runway: עומדת,
    // ממצמצת, מסובבת את הראש, האוזניים זעות, הזוהר נושם. על הרצפה, שקטה.
    model: '/creatures/noga/noga.glb',
    ios: null,
    clip: '/creatures/noga/caught.mp4',
    live: '/creatures/noga/live.webp',
    poster: '/creatures/noga/poster.webp',
    sprites: null,
    heightM: 0.55,
    arMode: AR_MODE.GROUND,
    controller: 'glow',                   // נמוגה לאור ומופיעה במקום אחר
    decal: null,
    clips: { ...CLIPS, special: 'SHINE' },
    verb: 'SHINE',
    brings: 'אור',
  },
}

export const creatureById = id => CREATURES[id] || null

// ── כמה גדול על המסך ──
// heightM ישב במרשם מהיום הראשון ואף אחד לא קרא אותו: כולם יצאו באותו
// גובה, ובולדר, "גדול מול הילד", היה בגודל של נימי. הבמה מכפילה בזה את
// הגובה שלה. 0.5 מ' = 1. בולדר 1.6, קראג 1.4, נימי 0.9, דבשון 0.8.
export const REF_HEIGHT_M = 0.5
// התקרה 2.4 — בולדר האגדי (0.8 × 1.6) עדיין נכנס למסך.
export const sizeOf = c => Math.min(2.4, Math.max(0.7, (c?.heightM || REF_HEIGHT_M) / REF_HEIGHT_M))

// היצור מוכן להצגה רק אם יש לו מודל. קראג במכוון בלי — הוא נוף עד
// מסע 10, ושכבת ה-AR צריכה לדעת את זה בלי להתרסק.
export const hasModel = id => !!CREATURES[id]?.model

'use client'
import { tr, dirOf } from '../i18n'
import { WIND_NAME } from '../engine/wind'
import { ROUTE_KM } from '../engine/plan'
import { TANK_MAX } from '../engine/tank'

// ─── איך משחקים ───
// "חסר הוראות והסברים. כל מה שמופיע בפתיח מספר את הסיפור, לא את
// השאיבה. הפנס מספיק ברור."
//
// היא צודקת, וזו בדיוק ההבחנה: הפתיחה היא סיפור, החנות מסבירה את עצמה
// (פנס = פותח את צל), אבל מה שנולד מאז — השאיבה, הבריחה, משחק הפסל,
// ביצת הלב — קיים רק ברגע שבו הוא קורה, ובשטח אין זמן לקרוא.
//
// אז: דף אחד, קצר, שמחולק כמו החוויה עצמה — בדרך / בבית / להורה. כל
// שורה היא פעולה שהילד עושה, לא תכונה של המערכת. מה שכתוב כאן חייב
// להישאר נכון: כל מספר כאן מגיע מהמנוע (ROUTE_KM, TANK_MAX), ולא מוקלד.

const OUT = [
  ['🗺️', 'המסלול', 'יוצא מהבית שלכם וחוזר אליו. הביקון למעלה אומר כמה נשאר ולאן לפנות — והמפה מראה את כל הדרך.'],
  ['🐾', 'לתפוס יצור', 'כשמגיעים לסימן — עוצרים, והמצלמה נפתחת. רצים אליו: כל צעד מקרב. הוא בורח פעמיים, ובשלישית נעצר. אז לוחצים עליו.'],
  ['🪙', 'מטבעות', 'נאספים תוך כדי הליכה. מטבע זהב נמצא גבוה — צריך לקפוץ בשבילו.'],
  ['🏃', 'ריצת מטבעות', 'עשרים שניות של ריצה אמיתית. כל מה שנאסף נכנס לארנק.'],
  ['🌀', '{wind}', 'רוח. אם יש שואב — לוחצים ושואבים אותו. אם אין — הוא קופץ בהפתעה, ואז רצים: המשחק סופר צעדים, לא לחיצות.'],
  ['💔', 'אם לא הספקתם לברוח', '{wind} חוטף את בן הלוויה, והוא לא בבית עד שתשאבו את הרוח שמחזיקה אותו. היא מסומנת על המפה.'],
  ['🗿', 'ויספר ושושו', 'לשניהם לא רצים — הם יצאו מתוך הרוח, והם באים מעצמם: עומדים כמו פסל, וכל תזוזה מרחיקה אותם צעד.'],
]

const HOME = [
  ['🏛️', 'השומר', 'מבקש משאבים שהיצורים מביאים. כל בקשה שנסגרת בונה משהו שרואים: מים בכד, ניצנים בעץ, שער שנפתח.'],
  ['🌬️', 'השואב', 'מה שנשאב בחוץ מחכה במיכל הזכוכית שלו. כשיש בו {n} — ביצת הלב מופיעה עליו.'],
  ['❤️', 'ביצת הלב', 'לא נפתחת בלחיצה. היא בוקעת אחרי מסע שלם איתה — ואז {n} גובטבו יוצאים טובי לב, ואחד מהם יוצא איתכם ומבריח את הפרא הבא.'],
  ['🥚', 'ביצה רגילה', 'נקנית בחנות, מתחממת מההליכה, ובוקעת ליצור בצבע נדיר.'],
  ['🛍️', 'החנות', 'מפתחות (פנס, משקפת, מכוש) פותחים יצורים שאי אפשר לתפוס בלעדיהם. חד-פעמיים נשרפים במסע הבא.'],
  ['🧭', 'מקומות', 'העולם הוא רצועה. החיצים בקצה התמונה מעבירים בין החורבה לחצר.'],
]

export function Guide({ onClose }) {
  const wind = tr(WIND_NAME)
  const km = `${ROUTE_KM[0]}–${ROUTE_KM[ROUTE_KM.length - 1]}`
  const row = ([icon, name, desc], i) => (
    <div key={i} style={G.row}>
      <span style={G.icon}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={G.name}>{tr(name, { wind })}</p>
        <p style={G.desc}>{tr(desc, { wind, n: TANK_MAX })}</p>
      </div>
    </div>
  )
  return (
    <div style={G.wrap} dir={dirOf()}>
      <div style={G.top}>
        <h2 style={G.h2}>{tr('איך משחקים')}</h2>
        <button onClick={onClose} style={G.close}>{tr('סגור')}</button>
      </div>
      <p style={G.lead}>{tr('המשחק כולו קורה בחוץ. מה שכאן זה רק מה שכדאי לדעת לפני שיוצאים.')}</p>

      <p style={G.sec}>{tr('בדרך')}</p>
      {OUT.map(row)}

      <p style={G.sec}>{tr('בבית')}</p>
      {HOME.map(row)}

      <p style={G.sec}>{tr('להורה')}</p>
      <div style={G.row}>
        <span style={G.icon}>📏</span>
        <div style={{ flex: 1 }}>
          <p style={G.name}>{tr('אורך המסלול')}</p>
          <p style={G.desc}>{tr('אתם בוחרים במסך הבית, {km} ק״מ. מהאורך נגזר מה יהיה בדרך — כמה יצורים, ריצה אחת או שתיים.', { km })}</p>
        </div>
      </div>
      <div style={G.row}>
        <span style={G.icon}>📋</span>
        <div style={{ flex: 1 }}>
          <p style={G.name}>{tr('בסוף כל מסע')}</p>
          <p style={G.desc}>{tr('מופיע סיכום: מרחק, דקות בחוץ, וכמה צעדים בערך. הוא להורה, לא לילד.')}</p>
        </div>
      </div>
      <div style={G.row}>
        <span style={G.icon}>🔑</span>
        <div style={{ flex: 1 }}>
          <p style={G.name}>{tr('הקוד')}</p>
          <p style={G.desc}>{tr('חמש אותיות למעלה במסך הבית. הן מחזירות את העולם בכל טלפון — שמרו אותן.')}</p>
        </div>
      </div>

      <p style={G.foot}>{tr('וילדן בפיילוט. אם משהו לא ברור בשטח — זה באג אצלנו, לא אצלכם.')}</p>
    </div>
  )
}

const G = {
  wrap: { position: 'fixed', inset: 0, zIndex: 2800, background: '#0F150F', color: '#E9E5D8', overflowY: 'auto', padding: '18px 16px 40px', fontFamily: 'inherit' },
  top: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'sticky', top: 0, background: '#0F150F', padding: '6px 0', zIndex: 2 },
  h2: { margin: 0, fontSize: 24, fontWeight: 900, flex: 1 },
  close: { padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(233,229,216,.3)', background: 'transparent', color: '#E9E5D8', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  lead: { margin: '0 0 16px', fontSize: 14, color: '#9BA495', lineHeight: 1.5 },
  sec: { margin: '18px 0 8px', fontSize: 12.5, fontWeight: 900, letterSpacing: '.08em', color: '#E5A342' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, background: '#161E17', border: '1px solid #2B382B', borderRadius: 14, padding: '11px 12px', marginBottom: 8 },
  icon: { fontSize: 26, width: 34, textAlign: 'center', lineHeight: 1.2 },
  name: { margin: 0, fontSize: 16, fontWeight: 900 },
  desc: { margin: '3px 0 0', fontSize: 14, lineHeight: 1.55, color: '#C7CDC2' },
  foot: { margin: '20px 0 0', fontSize: 13, color: '#767F71', lineHeight: 1.5, textAlign: 'center' },
}

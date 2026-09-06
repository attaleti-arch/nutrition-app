'use client'
import { Monster } from '../monsters'
import { Avatar } from '../avatars'

// ─── הדף להורים ───
// זה הדף שהורה קורא לפני שהוא נותן לילד שלו לצאת לרחוב עם טלפון. הוא
// צריך לענות על שלוש שאלות לפני כל דבר אחר: מה זה, מה נשמר עליי, ומה
// הכללים. רק אחר כך מה עושים.

const C = {
  cream: '#F3EDE1', card: '#FBF7EE', ink: '#22271E', soft: '#5A6154',
  olive: '#3F5C53', dusk: '#2E3A55', signal: '#B4661A', line: '#DCD2BE',
}

export default function ParentsPage() {
  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.cream, color: C.ink,
      fontFamily: '"Heebo", system-ui, -apple-system, sans-serif', lineHeight: 1.75 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '34px 20px 80px' }}>

        <p style={s.eyebrow}>פיילוט · להורים</p>
        <h1 style={s.h1}>ציד היצורים</h1>
        <p style={s.lede}>
          משחק שהילד משחק <b>בחוץ</b>. הוא יוצא מהבית, מסתובב בשכונה, אוסף יצורים,
          וחוזר הביתה דרך פורטל שמעביר את מה שאסף אל עולם שהוא בונה לאורך שבועיים.
        </p>

        <div style={s.row}>
          <Monster id="anafon" size={62} /><Monster id="puch" size={62} />
          <Monster id="nitznitz" size={62} /><Avatar id="nova" size={54} />
        </div>

        <div style={s.frame}>
          <h2 style={s.h2}>מה שחשוב לדעת קודם</h2>
          <p style={{ margin: 0 }}>
            <b>המשחק אף פעם לא מדבר על כושר, צעדים, קלוריות או "צריך לזוז".</b> הילד
            לא יודע שזה מה שנבדק, ואנחנו מבקשים שגם לא תספרו לו. אנחנו רוצים לדעת אם
            הוא <b>רוצה</b> לצאת — לא אם הוא מסכים.
          </p>
        </div>

        <h2 style={s.h2}>הפרטיות — מה נשמר ומה לא</h2>
        <div style={s.two}>
          <div style={{ ...s.half, borderColor: '#C6D3BE' }}>
            <p style={s.k}>נשמר</p>
            <p style={s.v}>היצורים שנאספו · חומרים · מבנים · מספר מסעות · שם פרטי שהילד בחר</p>
          </div>
          <div style={{ ...s.half, borderColor: '#E0C3AE' }}>
            <p style={s.k}>לא נשמר. אף פעם</p>
            <p style={s.v}><b>המיקום. המסלול. כתובת הבית.</b> אלה נשארים בטלפון בלבד ולא נשלחים לשום מקום.</p>
          </div>
        </div>
        <p style={s.note}>
          המשחק בונה מסלול סביב המקום שבו הילד עומד, אבל הקואורדינטות לא עוזבות את
          המכשיר. אין הרשמה, אין אימייל, אין סיסמה.
        </p>

        <h2 style={s.h2}>שלושה כללי בטיחות</h2>
        <ol style={s.rules}>
          <li><b>רק עם מבוגר.</b> בגרסה הזאת הילד לא יוצא לבד.</li>
          <li>
            <b>עברו על המסלול לפני שיוצאים.</b> המשחק בונה אותו על רחובות ושבילים
            אמיתיים ומרחיק אותו משדות, בתי קברות ואזורי תעשייה — אבל הוא לא מכיר את
            השכונה שלכם. אם משהו לא מתאים, יש כפתור <b>״מסלול אחר״</b>.
          </li>
          <li><b>הטלפון לא צריך להיות מול העיניים.</b> ככל שמתקרבים ליצור הטיקים מהירים יותר — אפשר ללכת עם הראש למעלה.</li>
        </ol>

        <h2 style={s.h2}>הכנה — פעם אחת, לפני היציאה הראשונה</h2>
        <ol style={s.steps}>
          <li><b>לאשר מיקום</b> כשהדפדפן שואל. בלי זה המשחק לא יעבוד.</li>
          <li><b>לכבות מצב שקט.</b> באייפון המתג בצד משתיק גם את המשחק, ורוב הרמזים הם צליל.</li>
          <li><b>להאריך נעילת מסך אוטומטית</b> (הגדרות ← תצוגה ← 5 דקות). כשהמסך ננעל, המעקב נעצר.</li>
          <li><b>לשמור את הקוד בן חמש האותיות</b> שמופיע במסך הפתיחה. הוא מחזיר את כל העולם אם הטלפון מתחלף או הנתונים נמחקים.</li>
        </ol>

        <h2 style={s.h2}>איך זה עובד ביום־יום</h2>
        <p>
          הילד לוחץ <b>״צא למסע״</b> — ולא בוחר כמה זמן ללכת. אחרי כחצי שעה הוא חוזר
          הביתה והמסע הושלם. <b>זו הצלחה מלאה.</b> אבל באותו רגע יכול להופיע משהו —
          עקבות, רעש, אור — ואז יש לו בחירה: לחזור דרך הפורטל, או ללכת לראות.
        </p>
        <p style={s.note}>
          זו הנקודה שמעניינת אותנו יותר מכל. <b>לא כמה זמן הוא הלך, אלא כמה פעמים הוא
          בחר להמשיך.</b>
        </p>

        <div style={s.frame}>
          <h2 style={{ ...s.h2, marginTop: 0 }}>מה נבקש מכם בסוף</h2>
          <p style={{ margin: '0 0 12px' }}>
            אחרי שבועיים — כמה שורות. ומה שהכי יעזור לנו הוא לא ציון, אלא רגע:
          </p>
          <p style={s.quote}>״ביום הרביעי הוא שאל מתי אפשר לצאת, כי חסרים לו עוד שני קרשים לבית.״</p>
          <p style={{ margin: '12px 0 0', color: C.soft, fontSize: 15 }}>
            אם קרה משהו כזה — ספרו לנו. ואם לא קרה, זה בדיוק אותה מידה של עזרה.
          </p>
        </div>

        <a href="/hunt" style={s.cta}>לפתוח את המשחק 🐾</a>

        <p style={s.fine}>
          זו גרסת פיילוט. דברים ישתנו תוך כדי, וייתכנו תקלות — אם משהו נתקע, יש כפתור
          <b> ״לעצור״</b> בזמן ההליכה שמחזיר להתחלה בלי לאבד את מה שנאסף בימים קודמים.
        </p>
        <p style={s.sign}>אתי רפאלה זיתון · יועצת בריאות במגמת תזונה התנהגותית</p>
      </div>
    </div>
  )
}

const s = {
  eyebrow: { fontSize: 12.5, fontWeight: 700, letterSpacing: '.12em', color: C.signal, margin: '0 0 10px' },
  h1: { fontSize: 38, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 },
  lede: { fontSize: 18, color: C.soft, margin: '0 0 22px' },
  row: {
    display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center',
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
    padding: '16px 10px', marginBottom: 30,
  },
  h2: { fontSize: 21, fontWeight: 800, margin: '32px 0 10px', lineHeight: 1.3 },
  frame: {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
    padding: '20px 20px', margin: '26px 0',
  },
  two: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  half: {
    flex: '1 1 210px', background: C.card, border: '1.5px solid', borderRadius: 14, padding: '16px 18px',
  },
  k: { fontSize: 12.5, fontWeight: 800, letterSpacing: '.06em', color: C.soft, margin: '0 0 6px' },
  v: { margin: 0, fontSize: 15.5, lineHeight: 1.65 },
  note: {
    marginTop: 14, paddingInlineStart: 14, borderInlineStart: `2px solid ${C.olive}`,
    color: C.soft, fontSize: 15.5,
  },
  rules: { margin: '0', paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  steps: { margin: '0', paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  quote: {
    margin: 0, fontSize: 18, lineHeight: 1.55, fontWeight: 500,
    paddingInlineStart: 14, borderInlineStart: `3px solid ${C.signal}`,
  },
  cta: {
    display: 'block', textAlign: 'center', marginTop: 34, padding: '16px 18px',
    borderRadius: 14, background: C.olive, color: C.cream,
    fontSize: 18, fontWeight: 800, textDecoration: 'none',
  },
  fine: { marginTop: 22, fontSize: 14.5, color: C.soft },
  sign: { marginTop: 26, fontSize: 14, color: C.soft, textAlign: 'center' },
}

import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BLOOD_NAMES = {
  glucose:'סוכר בצום',hba1c:'המוגלובין A1C',cholesterol:'כולסטרול כללי',
  hdl:'HDL טוב',ldl:'LDL רע',triglycerides:'טריגליצרידים',
  hemoglobin:'המוגלובין',ferritin:'פריטין',iron:'ברזל',
  folic_acid:'חומצה פולית',vitamin_b12:'ויטמין B12',vitamin_d:'ויטמין D',
  calcium:'סידן',zinc:'אבץ',magnesium:'מגנזיום',
  tsh:'TSH',t3:'T3',t4:'T4',crp:'CRP דלקת',esr:'שקיעת דם',
  homocysteine:'הומוציסטאין',alt:'ALT כבד',ast:'AST כבד',
  creatinine:'קריאטינין',urea:'אוריאה',uric_acid:'חומצה אורית',
  estrogen:'אסטרוגן',progesterone:'פרוגסטרון',testosterone:'טסטוסטרון',
  insulin:'אינסולין',wbc:'WBC',rbc:'RBC',platelets:'טסיות',
  blood_type:'סוג דם',lactose_sensitivity:'רגישות לקטוז',
  gluten_sensitivity:'רגישות גלוטן',celiac:'צליאק'
}

const BLOOD_RANGES = {
  glucose:[70,100],hba1c:[0,5.7],cholesterol:[0,200],hdl:[60,999],
  ldl:[0,100],triglycerides:[0,150],hemoglobin:[12,16],ferritin:[12,150],
  iron:[60,170],vitamin_b12:[200,900],vitamin_d:[30,100],tsh:[0.4,4.0],
  crp:[0,1.0],insulin:[2,25],zinc:[70,120],magnesium:[1.7,2.2]
}

// ── System prompt מלא ל-Agent (מבוסס שיטת אתי אטל + NLP שירלי) ──
const AGENT_SYSTEM = `אתה "עוזר החירום" של תוכנית "בין הראש לצלחת" – מבוסס שיטת אתי אטל ו-NLP של שירלי.

## זהותך
אתה עוזר תזונתי קליני חם, מעצים ומקצועי. לא רופא — מלווה תזונתי שמדבר בשפה חיובית ומחזיר כוח ללקוחה. כל תשובה משקפת את הפילוסופיה של אתי: לא "אסור" — אלא "כדאי ומזין".

## 🚨 כלל חירום — מוחלט ואי-ניתן לעקיפה
אם יש תלונה על: כאב חד בחזה / קוצר נשימה / נפיחות פתאומית / אובדן הכרה / ירידת סוכר קיצונית / כאב בטן עז ופתאומי / דפיקות לב מהירות חריגות — עצור הכול וכתוב:
"🚨 זה נשמע כמו מצב חירום רפואי. פני בדחיפות למיון או התקשרי ל-101. אל תישארי לבד."
לאחר מכן אל תחזרי לייעוץ תזונתי באותה שיחה עד שהיא מאשרת שהיא בטוחה.

## 🍽️ הצלחת החכמה — עקרונות ברזל (שיטת אתי)
- **50%** ירקות מגוונים (ירוקים, צבעוניים, עלים) — הבסיס תמיד
- **25-40%** חלבון איכותי: דגים שמנים (סלמון, מקרל, סרדין), עוף/הודו, ביצים, קטניות, טופו, טמפה
- **15-25%** פחמימה מורכבת GI נמוך: בטטה, קינואה, כוסמת, בורגול, אורז מלא, כוסמין
- **10-20%** שומן מהצומח: שמן זית, אבוקדו, טחינה גולמית, אגוזי מלך, זרעי פשתן
- **סדר אכילה:** חלבון וירק קודם → פחמימה אחרונה (מורידה spike גליקמי)
- **הידרציה:** 35 מ"ל × משקל גוף = יעד יומי

## 📋 6 פרוטוקולים קליניים (שיטת אתי — מורחבת)

### 1. פרוטוקול מטבולי (סוכרת סוג 2, תנגודת אינסולין, השמנה)
הרכב: 40% חלבון | 30% שומן | 30% פחמימה
- חלבון חייב להקדים פחמימה בכל ארוחה
- להימנע: לחם לבן, אורז לבן, סוכר, מיצים, פחמימות ריקות
- לשלב חומץ תפוחים (כפית בכוס מים) לפני ארוחה גדולה
- ירקות מומלצים: ברוקולי, כרובית, קייל, תרד, פלפלים
- פעילות: 150 דק' אירובי + 2-3 אימוני כוח בשבוע
- תוספים כדאיים: מגנזיום, כרום, אומגה 3, ברברין

### 2. פרוטוקול קרדיולוגי (לב, כולסטרול, לחץ דם)
הרכב: 30% חלבון רזה | 20% שומן בריא | 50% ירקות + סיבים מסיסים
- אומגה 3: דגים שמנים 3× בשבוע (סלמון, מקרל, סרדין, הרינג) / זרעי פשתן טחונים
- סיבים מסיסים: שיבולת שועל, תפוח, שעועית, גזר, קינואה
- הימנעות מוחלטת: שומן טרנס, מזון מעובד, נתרן מיותר (פחות מ-1500 מ"ג/יום)
- שום וכורכום — נוגדי דלקת, מורידים לחץ דם ו-LDL
- פעילות: אירובי מתון 150 דק'/שבוע בלבד. לא קפיצות, לא אימון כוח עצים. לא HIIT.
- אחרי אירוע לבבי: התייעצות קרדיולוג לפני כל שינוי
- תוספים: CoQ10, אומגה 3, ויטמין D, מגנזיום

### 3. פרוטוקול אונקולוגי (במהלך טיפול / לאחריו)
הרכב: 50% חלבון | 30% שומן | 20% פחמימה מבושלת
- מניעת קכקסיה: 1.5-2 גרם חלבון לק"ג. עדיפות #1.
- חלבונים קלים: ביצים, יוגורט, גבינה, דגים, עוף מבושל רך
- להימנע מסוכר — מזין תאי גידול. סטביה/אריתריטול במקום.
- ירקות נוגדי חמצון: ברוקולי (סולפורפן), כורכום (קורקומין), עגבניות (ליקופן), אוכמניות
- פעילות: הליכות קלות, מתיחות. להקשיב לגוף.
- תוספים: ויטמין D3, אומגה 3, ג'ינג'ר לבחילות, פרוביוטיקה

### 4. פרוטוקול בלוטת תריס (תת/יתר פעילות, כולל כריתה)
הרכב: 30% חלבון | 30% שומן | 40% ירק + פחמימה מורכבת
- סלניום חיוני: 2 אגוזי ברזיל/יום, דגים, ביצים (המרת T4→T3)
- אבץ: בשר, זרעי דלעת, קטניות
- יוד: דגים, אצות במידה, מלח ים
- להימנע: סויה בכמות גדולה, גלוטן (אם השימוטו), ירקות צולבים חיים (בישול מפחית גויטרוגנים)
- פעילות: יוגה, פילאטיס, הליכות. לא HIIT בשום אופן.
- לבותירוקסין: על קיבה ריקה, לא סידן/ברזל/קפה שעה לאחר מכן
- תוספים: סלניום 200mcg, ויטמין D3, מגנזיום, B12

### 5. פרוטוקול עיכול (קרוהן, קוליטיס, IBS, צליאק)
הרכב: 30% חלבון | 20% שומן | 50% פחמימה מורכבת רכה
- כל האוכל מבושל/מאודה בזמן דלקת — ירקות חיים מחמירים
- סיבים מסיסים בלבד: שיבולת שועל, בטטה מבושלת, גזר מבושל
- להימנע: גלוטן (בצליאק), חלב (לקטוז), מטוגן, קפה, אלכוהול
- מרק עצמות: מרפא רירית המעי
- אכילה: 5-6 ארוחות קטנות במקום 3 גדולות
- פרוביוטיקה: יוגורט עיזים, קפיר, קימצ'י (כשבריאים)
- פעילות: יוגה ופילאטיס בלבד
- תוספים: L-glutamine, ויטמין D, B12, ברזל, אבץ

### 6. פרוטוקול כליות וגאוט
הרכב: 15-20% חלבון | 35% שומן | 50% פחמימה איכותית
- הגבלת חלבון: לא יותר מ-0.8 גרם לק"ג. חלבון מהצומח עדיף.
- הידרציה: 2.5-3 ליטר מים ביום
- גאוט: הימנעות מפורינים — בשר אדום, איברים, אנשובי, מאכלי ים, בירה
- להוריד חומצה אורית: דובדבנים, מיץ לימון, מוצרי חלב דלי שומן
- פעילות: הליכות מתונות בלבד
- תוספים: ויטמין C, מגנזיום, B-complex

## 🧠 גישת NLP (שירלי)
- "מה כן לאכול" — לא "מה אסור"
- כוונה חיובית: לכל הרגל אכילה יש סיבה — לא שיפוט, הבנה
- "אנרגיה זורמת למקום שבו תשומת הלב מתמקדת" — הכי קטן שהצליחה היום?
- כישלון = משוב. "מה למדת מהמעידה הזו?"
- שפת שינוי: "תוכנית אכילה" לא "דיאטה". "בחרתי" לא "אסור לי"
- כוח רצון הוא משאב מוגבל — עצבי סביבה, לא ענישה עצמית
- זהי רגש מאחורי אכילה רגשית: עייפות? בדידות? לחץ? → הצעי חלופה
- מודל השינוי: הרהור → הכנה → פעולה → שימור. אל תדלגי שלבים.

## 🏋️ תזונת ספורט
- לפני אימון (120 דק'): 250 קל', 70% פחמימות (מורכבות + פשוטות), 10-15% חלבון. להימנע: שומן כבד, מלח
- ממש לפני (10-45 דק'): בננה / 2 תמרים / לחם לבן + דבש
- אחרי אימון (עד 120 דק'): 600-900 קל', 40-60% פחמימות GI נמוך, 20-30% חלבון, 15-20% שומן
- נוזלים: 35 מ"ל × ק"ג. אימון → הוסיפי 500-750 מ"ל
- חסרים שכיחים בנשים ספורטאיות: ברזל, B12, סידן, אבץ, מגנזיום

## 🔬 מתודולוגיית ניתוח פערים (שיטת אתי)
1. בדיקות דם — זיהוי חסרים: ברזל, פריטין, B12, D, TSH, אינסולין בצום
2. השוואה לשגרה — האם ההרכב תואם לפרוטוקול הקליני?
3. תיקון נקודתי — הוסיפי רכיב אחד חסר, אל תחליפי הכול

## 🚫 גבולות ברורים
- ייעוץ תזונתי ואורח חיים בלבד
- לא אבחנות רפואיות, לא הוראות להפסיק תרופות
- ספק בכל שינוי משמעותי → "התייעצי עם הרופא המטפל"

## 💬 סגנון תשובה
- עברית חמה, ברורה, חיובית
- משפטים קצרים — לא מרצה, משוחח
- תמיד מסיימת במשהו מעשי אחד לעשות עכשיו
- מציינת: "מבוסס שיטת אתי אטל" כשרלוונטי`

function formatBlood(blood_tests, extraNotes) {
  if (!blood_tests) return 'לא הוזנו'
  const entries = Object.entries(blood_tests).filter(([k,v]) => v && v !== '')
  if (!entries.length) return 'לא הוזנו'
  const abnormal = [], normal = []
  entries.forEach(([k,v]) => {
    const name = BLOOD_NAMES[k] || k
    const range = BLOOD_RANGES[k]
    const val = parseFloat(v)
    if (range && !isNaN(val)) {
      if (val < range[0] || val > range[1]) abnormal.push(name + ': ' + v + ' (חריג)')
      else normal.push(name + ': ' + v)
    } else normal.push(name + ': ' + v)
  })
  let r = ''
  if (abnormal.length) r += 'חריגות: ' + abnormal.join(' | ')
  if (normal.length) r += (r ? ' | תקינות: ' : 'תקינות: ') + normal.slice(0,5).join(' | ')
  if (extraNotes && extraNotes.trim()) r += ' | ערכים חריגים נוספים: ' + extraNotes.trim()
  return r || 'לא הוזנו'
}

function s(val, fb) {
  if (!val) return fb || 'לא צוין'
  return String(val).substring(0, 100)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    // ── סריקת בדיקות דם (תמונה) ──
    if (mode === 'bloodImage' && body.imageBase64) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: body.mediaType || 'image/jpeg', data: body.imageBase64 } },
          { type: 'text', text: 'זהו דף בדיקות דם. חלץ את הערכים ותחזיר JSON בלבד (null אם לא קיים):\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"iron":null,"folic_acid":null,"vitamin_b12":null,"vitamin_b6":null,"vitamin_d":null,"calcium":null,"zinc":null,"magnesium":null,"tsh":null,"t3":null,"t4":null,"crp":null,"esr":null,"homocysteine":null,"alt":null,"ast":null,"creatinine":null,"urea":null,"uric_acid":null,"estrogen":null,"progesterone":null,"testosterone":null,"insulin":null,"wbc":null,"rbc":null,"platelets":null,"extra_abnormals":""}\nמספרים בלבד ללא יחידות. extra_abnormals: ערכים חריגים שאינם בשדות האחרים.' }
        ]}]
      })
      try {
        const text = msg.content[0].text.replace(/```json|```/g,'').trim()
        const parsed = JSON.parse(text)
        const extra = parsed.extra_abnormals || ''
        delete parsed.extra_abnormals
        return Response.json({ result: JSON.stringify(parsed), extra })
      } catch(e) { return Response.json({ result: msg.content[0].text, extra: '' }) }
    }

    // ── חילוץ בדיקות דם (טקסט) ──
    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null,"zinc":null,"magnesium":null,"insulin":null,"extra_abnormals":""}\nב-extra_abnormals: ערכים חריגים שאינם בשאר השדות. מספרים בלבד.\nטקסט: ' + String(body.bloodText).substring(0, 2000) }]
      })
      try {
        const text = msg.content[0].text.replace(/```json|```/g,'').trim()
        const parsed = JSON.parse(text)
        const extra = parsed.extra_abnormals || ''
        delete parsed.extra_abnormals
        return Response.json({ result: JSON.stringify(parsed), extra })
      } catch(e) { return Response.json({ result: msg.content[0].text, extra: '' }) }
    }

    // ── סריקת צלחת (תמונה) — משודרג עם fat + carbs ──
    if (mode === 'scanMeal' && body.imageBase64) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: body.mediaType || 'image/jpeg', data: body.imageBase64 } },
          { type: 'text', text: 'זוהי תמונה של ארוחה. נתח והחזר JSON בלבד:\n{\n  "description": "תיאור קצר בעברית",\n  "items": [{"name": "שם המאכל", "amount": "כמות", "calories": 0, "protein": 0, "fat": 0, "carbs": 0}],\n  "total_calories": 0,\n  "total_protein": 0,\n  "total_fat": 0,\n  "total_carbs": 0,\n  "confidence": "high/medium/low"\n}\nהחזר אומדן מדויק לכל ערך תזונתי.' }
        ]}]
      })
      try {
        const parsed = JSON.parse(msg.content[0].text.replace(/```json|```/g,'').trim())
        return Response.json({ result: parsed })
      } catch(e) {
        return Response.json({ result: { description: 'לא הצלחתי לזהות', items: [], total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0, confidence: 'low' } })
      }
    }

    // ── Agent חירום 24/7 — שודרג ל-Sonnet + system prompt מלא ──
    if (mode === 'agent') {
      const messages = body.messages || []
      // תמיכה גם בקריאה ישנה (שאלה בודדת) וגם בהיסטוריה מלאה
      const apiMessages = messages.length > 0
        ? messages
        : [{ role: 'user', content: body.question || '' }]

      // הוסף פרופיל לקוחה כהקשר אם קיים
      const clientContext = body.clientProfile
        ? '\n\n[פרופיל הלקוחה: ' + body.clientProfile + ']'
        : ''

      const systemWithContext = AGENT_SYSTEM + clientContext

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: systemWithContext,
        messages: apiMessages,
      })
      return Response.json({ result: msg.content[0].text })
    }

    // ── משוב יומן (logs) ──
    if (logs && !mode) {
      const gender = body.gender || 'נקבה'
      const isMale = gender === 'זכר'
      const genderNote = isMale
        ? 'הלקוח הוא גבר. גוף שני זכר בלבד.'
        : 'הלקוחה היא אישה. גוף שני נקבה בלבד.'
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content:
          'אתה אתי אטל — יועצת תזונה התנהגותית. כתוב משוב קצר ל-' + name + ' בעברית.\n'
          + genderNote + '\n'
          + 'בסס על נתונים אמיתיים בלבד. ציין מספרים ספציפיים.\n'
          + (body.nlpSummary ? 'NLP: ' + body.nlpSummary + '\n' : '')
          + 'יומן: ' + String(logs).substring(0, 900) + '\n\n'
          + '**✨ מה עבד השבוע** — הצלחה אחת ספציפית.\n\n'
          + '**🎯 משימות לדיוק** — מה היה בפועל מול היעד + הסבר פיזיולוגי.\n\n'
          + '**🚀 3 צעדים קטנים** — ספציפיים עם מספרים.\n\n'
          + '**💚 מסר** — משפט אחד מעצים.'
        }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // ── ניתוח פרופיל מלא (AI) ──
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''
      const athleteSection = isAthlete
        ? '**⚡ חלון ההזדמנויות הספורטיבי**\nתזונה לפני/אחרי אימון. מניעת קטבוליזם. חלבון ספציפי לסוג האימון.'
        : '**⚡ תמיכה במטבוליזם ובאנרגיה**\nפחמימות עודפות + חלבון נמוך = קפיצות אינסולין. הגוף מפרק שריר. BMR נמוך. חיבר לנתונים.'
      const bloodSection = '**🩺 מה אומרות הבדיקות**\nלכל ערך חריג: שם + ערך + טווח + הסבר + המלצה. אם דורש רופא — ציינו.'
      const baseData = 'נתונים על ' + name + ':\n'
        + 'גיל ' + s(p.age,'?') + ' | משקל ' + s(p.weight,'?') + ' | מטרה: ' + s(p.goal,'?') + ' | פעילות: ' + s(p.exercise_type,'לא') + '\n'
        + 'שינה: ' + s(p.sleep_quality,'?') + ' | קימה: ' + s(p.wake_time,'?') + ' | לחץ: ' + s(p.stress_level,'?') + '/10\n'
        + 'בוקר: ' + s(p.breakfast_habits,'?') + ' | קפה: ' + s(p.coffee_intake,'?') + ' | מים: ' + s(p.water_intake,'?') + '\n'
        + 'אכילה רגשית: ' + s(p.emotional_eating,'?') + ' | מה מעכב: ' + s(p.goal_obstacles,'?') + '\n'
        + 'מה רוצה: ' + s(p.main_goal,'?') + ' | מה חשוב: ' + s(p.important_values,'?') + '\n'
        + 'רפואי: ' + s(p.medical_history,'אין') + ' | תרופות: ' + s(p.medications,'אין') + '\n'
        + 'בדיקות: ' + bloodText + '\n'
        + (extraBlood ? extraBlood + '\n' : '')
        + (diary ? 'אכילה (3 ימים): ' + diary + '\n' : '')
      const systemPrompt = 'אתה אתי אטל - יועצת בריאות ותזונה התנהגותית בגישת NLP.\n'
        + 'כתבי ניתוח אישי חם ועמוק ל-' + name + ' בעברית, גוף שני נקבה.\n'
        + 'סגנון: אינטימי, מחבק. ללא טבלאות. עברית תקנית. אל תמציאי. אל תכתבי כותרת בהתחלה.\n'
        + 'כל סעיף 3-4 משפטים (בדיקות עד 6). אל תחזרי על ערכי מעבדה — רק פרשנות התנהגותית.\n\n'
      const [msg1, msg2] = await Promise.all([
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים:\n\n**✨ הקווים הזוהרים שלך**\n**🔍 מה באמת קורה**\n' + athleteSection }]
        }),
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים:\n\n' + bloodSection + '\n\n**🥗 המלצות תזונה ותוספים**\n\n**🎯 3 צעדים למחר** (ממוספרים, ריאליסטיים' + stepsNote + ')' }]
        })
      ])
      return Response.json({ result: msg1.content[0].text + '\n\n' + msg2.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('Error:', err.message)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

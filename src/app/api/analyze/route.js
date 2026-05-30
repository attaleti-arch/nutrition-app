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

function formatBlood(blood_tests, extraNotes) {
  if (!blood_tests) return 'לא הוזנו'
  const entries = Object.entries(blood_tests).filter(([k,v]) => v && v !== '')
  if (!entries.length) return 'לא הוזנו'
  const abnormal = []
  const normal = []
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

    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null,"zinc":null,"magnesium":null,"insulin":null,"extra_abnormals":""}\nב-extra_abnormals: כתוב כטקסט את כל הערכים החריגים שאינם בשאר השדות (IgG, FLC, גמא וכו) עם הערך והטווח הרגיל. מספרים בלבד בשאר השדות.\nטקסט: ' + String(body.bloodText).substring(0, 2000) }]
      })
      try {
        const text = msg.content[0].text.replace(/```json|```/g,'').trim()
        const parsed = JSON.parse(text)
        const extra = parsed.extra_abnormals || ''
        delete parsed.extra_abnormals
        return Response.json({ result: JSON.stringify(parsed), extra })
      } catch(e) {
        return Response.json({ result: msg.content[0].text, extra: '' })
      }
    }

    // שלב ג': הפקת משוב שבועי מעוצב ואותנטי (כולל גרף ויזואלי מבוסס נתונים)
    if (logs && !mode) {
      const nlpSummary = body.nlpSummary || ''
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ 
          role: 'user', 
          content: 'אתה אתי אטל — יועצת בריאות, מומחית לתזונה התנהגותית ו-NLP Master. כתבי משוב שבועי חם, חכם, קצר ומעצים ל-' + name + ' בעברית, גוף שני נקבה בלבד (את, שלך, עשית - ללא בלבול מגדר, ללא פניות בזכר).\n'
          + 'סגנון: בוטיק, אינטימי, מחבק, גובה העיניים, ללא שפה ארגונית מנוכרת.\n'
          + (nlpSummary ? 'מדדי NLP השבוע (מתח, עייפות וכו\'): ' + nlpSummary + '\n' : '') 
          + 'נתוני יומן אכילה השבוע בפועל מול יעדים: ' + String(logs).substring(0, 1400) + '\n\n'
          + 'בני את המשוב בדיוק במבנה הבא (השתמשי בכותרות ובקווים המפרידים):\n\n'
          + '# 📋 המשוב השבועי שלך, ' + name + ' 💚\n\n'
          + '--- \n\n'
          + '### 📊 תמונת המצב השבועית: יעד מול ביצוע\n'
          + '> **איך לקרוא את הגרף?** הקו המקווקו מייצג את יעד המודל האישי שלך, והגרף המלא מראה איפה היית בפועל השבוע.\n\n'
          + 'בני כאן גרף טקסטואלי נקי (בתוך בלוק קוד של סימני `) שמציג את אחוזי הביצוע של המטופלת עבור המדדים שהוזנו ביומן (כגון קלוריות, חלבון, מים, צעדים). דוגמה למבנה: \n'
          + 'קלוריות    [████████████░░░░] 74% (חוסר של 540 קלוריות)\n'
          + 'חלבון      [████████████████] 100% (עמידה מלאה ביעד!)\n\n'
          + '--- \n\n'
          + '## 🔍 מה באמת קורה (הראש והצלחת)\n'
          + 'כתבי פסקה אחת ממוקדת בת 3-4 משפטים. חברי בין הנתונים הפיזיולוגיים היבשים (אכילה, מים) לבין המצב המנטלי, רמות הסטרס והעייפות שלה (למשל, זיהוי אכילה רגשית הפוכה או צמצום מתוך מתח). תני לה הוקרה וקרדיט אמיתי וספציפי על מה שכן עבד השבוע.\n\n'
          + '--- \n\n'
          + '## 🎯 3 צעדים קטנים למחר\n'
          + 'כתבי 3 פעולות ממוקדות, ריאליסטיות, קצרות ופשוטות לביצוע שיעזרו לה לאזן את השבוע הבא, מנוסחות בחום ובגוף שני נקבה בלבד (לדוגמה: 💧 עוגן מים יומיומי...).\n\n'
          + '--- \n\n'
          + '## 💚 מסר בשבילך\n'
          + '> משפט השראה חם, אישי ומעצים שמתכתב עם השבוע שעברה.'
        }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''

      const athleteSection = isAthlete
        ? '**\u26a1 חלון ההזדמנויות הספורטיבי**\nתזונה לפני/אחרי אימון. מניעת קטבוליזם. חלבון. ספציפי לסוג האימון שלה.'
        : '**\u26a1 תמיכה במטבוליזם ובאנרגיה**\nפחמימות עודפות + חלבון נמוך = קפיצות אינסולין שנועלות שריפת שומן. הגוף מפרק שריר גם בלי ספורט. BMR נמוך. התקפי רעב. חיבר לנתונים.'

      const bloodSection = '**\ud83e\ude78 מה אומרות הבדיקות**\n'
        + 'לכל ערך חריג: שם + ערך + טווח רצוי + הסבר + המלצה (תזונה/תוסף/רופא). כולל הבדיקות החריגות הנוספות אם קיימות. אם ערך דורש רופא — ציינו.'

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
        + 'סגנון: אינטימי, מחבק - כמו שיחה עם חברה. ללא טבלאות.\n'
        + 'חובה: עברית תקנית. "את" לא "אתת". "כולסטרול" לא "קוליסטרול". אל תמציאי פרטים. אל תכתבי כותרת ראשית בתחילת התשובה — התחילי ישר עם הסעיף הראשון. כתבי HDL לא BDL. כללים: (1) כל סעיף 3-4 משפטים בלבד, למעט סעיף הבדיקות שיכול להגיע ל-6 משפטים. (2) אל תחזרי על ערכי מעבדה שבטבלה — רק פרשנות התנהגותית. (3) כל משפט חייב להיות שלם וסגור. (4) אם יש ערכים חריגים נוספים (IgG, FLC וכו) חובה להזכיר אותם בסעיף הבדיקות.\n\n'

      const [msg1, msg2] = await Promise.all([
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים בלבד:\n\n**\u2728 הקווים הזוהרים שלך**\n**\ud83d\udd0d מה באמת קורה**\n' + athleteSection }]
        }),
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים בלבד:\n\n' + bloodSection + '\n\n**\ud83e\udd57 המלצות תזונה ותוספים**\n\n**\ud83c\udfaf 3 צעדים למחר** (ממוספרים, ריאליסטיים' + stepsNote + ')' }]
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

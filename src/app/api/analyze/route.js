import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// כאן נמצא קישור הלוגו הירוק והיפה שלך - הוא יופיע אוטומטית בראש המשובים והדוחות
const LOGO_URL = 'https://i.ibb.co/ykK6yXG/eti-logo.png'; 

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

    // 1. חילוץ ערכי בדיקות דם מטקסט חופשי (מצב blood)
    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
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

    // 2. הפקת משוב שבועי/יומי משודרג ובטוח ל-JSON (מצב logs)
    if (logs && !mode) {
      const nlpSummary = body.nlpSummary || ''
      const msg = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1000,
        messages: [{ 
          role: 'user', 
          content: 'אתה אתי אטל — יועצת בריאות, מומחית לתזונה התנהגותית ו-NLP Master. כתבי משוב חם, חכם, קצר ומעצים ל-' + name + ' בעברית, גוף שני נקבה בלבד (את, שלך, עשית - ללא שגיאות מגדר, ללא פניות בזכר).\n'
          + 'סגנון: בוטיק, אינטימי, מחבק, גובה העיניים, ללא שפה ארגונית מנוכרת.\n'
          + 'פתחי את המשוב עם הלוגו שלך בצורה הממורכזת הבאה בדיוק: <div align="center"><img src="' + LOGO_URL + '" width="180" style="max-width:100%; height:auto; margin-bottom: 20px;" /></div>\n\n'
          + (nlpSummary ? 'מדדי NLP (מתח, עייפות וכו\'): ' + nlpSummary + '\n' : '') 
          + 'נתוני יומן אכילה בפועל מול יעדים: ' + String(logs).substring(0, 1400) + '\n\n'
          + 'בני את המשוב בדיוק במבנה הבא (השתמשי בכותרות ובקווים המפרידים):\n\n'
          + '# 📋 המשוב השבועי שלך, ' + name + ' 💚\n\n'
          + '--- \n\n'
          + '### 📊 תמונת המצב: יעד מול ביצוע\n'
          + '> **איך לקרוא את הגרף?** הקו המקווקו מייצג את יעד המודל האישי שלך, והגרף המלא מראה איפה היית בפועל השבוע.\n\n'
          + 'בני כאן גרף טקסטואלי נקי (בתוך בלוק קוד של סימני `) שמציג את אחוזי הביצוע באמצעות אמוג\'ים של ריבועים צבעוניים. השתמשי בריבועים ירוקים 🟩 לביצוע, וריבועים לבנים ⬜ לחלק הנותר (סך הכל 10 ריבועים בכל שורה). דוגמה מדויקת למבנה: \n'
          + 'קלוריות    [🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜] 60%\n'
          + 'חלבון      [🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩] 100% (עמידה מלאה ביעד!)\n\n'
          + '--- \n\n'
          + '## 🔍 מה באמת קורה (הראש והצלחת)\n'
          + 'כתבי פסקה אחת ממוקדת בת 3-4 משפטים. חברי בין הנתונים הפיזיולוגיים היבשים (אכילה, מים) לבין המצב המנטלי, רמות הסטרס והעייפות שלה (למשל, זיהוי אכילה רגשית הפוכה או צמצום מתוך מתח). תני לה הוקרה וקרדיט אמיתי וספציפי על מה שכן עבד.\n\n'
          + '--- \n\n'
          + '## 🎯 3 צעדים קטנים למחר\n'
          + 'כתבי 3 פעולות ממוקדות, ריאליסטיות, קצרות ופשוטות לביצוע שיעזרו לה לאזן את הימים הבאים, מנוסחות בחום ובגוף שני נקבה בלבד (לדוגמה: 💧 עוגן מים יומיומי...).\n\n'
          + '--- \n\n'
          + '## 💚 מסר בשבילך\n'
          + '> משפט השראה חם, אישי ומעצים שמתכתב עם מה שעברה.'
        }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // 3. ניתוח פרופיל עמוק חגיגי (מצב profile)
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''

      const athleteSection = isAthlete
        ? '**⚡ חלון ההזדמנויות הספורטיבי והמנטלי**\nהחיבור בין דלק לגוף לביצועים ומוטיבציה. חלבון ותמיכה במניעת קטבוליזם.'
        : '**⚡ תמיכה במטבוליזם וניהול דחפים**\nאיך פחמימות עודפות וחלבון נמוך משפיעים על קפיצות אינסולין ועל תחושת השובע והשליטה.';

      const bloodSection = '**🩸 מה אומרות הבדיקות**\n'
        + 'פרשנות חמה לערכים חריגים, חיבור לתחושות היומיומיות והמלצות פרקטיות.';

      const baseData = 'נתונים על ' + name + ':\n'
        + 'גיל ' + s(p.age,'?') + ' | משקל ' + s(p.weight,'?') + ' | מטרה: ' + s(p.goal,'?') + '\n'
        + 'לחץ: ' + s(p.stress_level,'?') + '/10 | אכילה רגשית: ' + s(p.emotional_eating,'?') + '\n'
        + 'ערכים חשובים: ' + s(p.important_values,'?') + '\n'
        + 'בדיקות: ' + bloodText + '\n'

      const systemPrompt = 'אתה אתי אטל - יועצת בריאות NLP Master.\n'
        + 'פתחי את הדו"ח עם הלוגו שלך ממורכז: <div align="center"><img src="' + LOGO_URL + '" width="200" style="max-width:100%; height:auto;" /></div>\n\n'
        + 'כתבי ניתוח חם ועמוק ל-' + name + ' בעברית (גוף שני נקבה). סגנון בוטיק יוקרתי, אינטימי ומחבק.\n'
        + 'חובה: עברית תקנית. לא להמציא פרטים. התחילי ישר מהלוגו והסעיף הראשון.\n\n'

      const [msg1, msg2] = await Promise.all([
        client.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים:\n\n**✨ הקווים הזוהרים שלך**\n**🔍 מה באמת קורה**\n' + athleteSection }]
        }),
        client.messages.create({
          model: 'claude-3-5-sonnet-latest',
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

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

    // ── חילוץ בדיקות דם ──
    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null,"zinc":null,"magnesium":null,"insulin":null,"extra_abnormals":""}\nב-extra_abnormals: כתוב כטקסט את כל הערכים החריגים שאינם בשאר השדות עם הערך והטווח הרגיל. מספרים בלבד בשאר השדות.\nטקסט: ' + String(body.bloodText).substring(0, 2000) }]
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

    // ── משוב יומי/שבועי — פרקטי, מכוון, עם נתונים אמיתיים ──
    if (logs && !mode) {
      const nlpSummary = body.nlpSummary || ''
      const gender = body.gender || 'נקבה'
      const isMale = gender === 'זכר'
      // כינוי מגדרי נכון
      const pronoun = isMale ? 'אתה' : 'את'
      const genderNote = isMale
        ? 'הלקוח הוא גבר. השתמש בגוף שני זכר בלבד: אתה, שלך, אכלת, שתית, הלכת. אסור לכתוב "את" או "אכלתי".'
        : 'הלקוחה היא אישה. השתמש בגוף שני נקבה בלבד: את, שלך, אכלת, שתית, הלכת. אסור לכתוב "אתה".'

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content:
          'אתה אתי אטל — יועצת תזונה התנהגותית. כתוב משוב קצר, פרקטי ומכוון ל-' + name + ' בעברית.\n'
          + genderNote + '\n'
          + 'חשוב: בסס את המשוב על הנתונים האמיתיים שלהלן. אל תמציא. ציין מספרים ספציפיים.\n'
          + (nlpSummary ? 'מדדי NLP: ' + nlpSummary + '\n' : '')
          + 'נתוני יומן: ' + String(logs).substring(0, 900) + '\n\n'
          + 'כתוב בדיוק 4 חלקים:\n\n'
          + '**✨ מה עבד השבוע**\n'
          + 'משפט אחד ספציפי על הצלחה אמיתית מהנתונים (לדוגמה: "הגעת ל-X צעדים ביום Y" או "שתית X כוסות מים").\n\n'
          + '**🎯 משימות לדיוק**\n'
          + 'ציין בדיוק מה היה בפועל מול היעד (לדוגמה: "אכלת 500 קל מתוך יעד של 1800 — זה פחות מ-30% מהיעד"). '
          + 'הסבר בקצרה מה קורה פיזיולוגית כשאוכלים כך, ומה הבחירה הטובה יותר.\n\n'
          + '**🚀 3 צעדים קטנים**\n'
          + 'שלושה צעדים פרקטיים וספציפיים לשבוע הבא, עם מספרים ברורים (לדוגמה: "הוסף 200 קל לארוחת הבוקר", "שתה 6 כוסות מים ביום").\n\n'
          + '**💚 מסר**\n'
          + 'משפט אחד קצר ומעצים.'
        }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // ── ניתוח פרופיל 360 (דוח מקיף) — לא נוגעים ──
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''

      const athleteSection = isAthlete
        ? '**⚡ חלון ההזדמנויות הספורטיבי**\nתזונה לפני/אחרי אימון. מניעת קטבוליזם. חלבון. ספציפי לסוג האימון שלה.'
        : '**⚡ תמיכה במטבוליזם ובאנרגיה**\nפחמימות עודפות + חלבון נמוך = קפיצות אינסולין שנועלות שריפת שומן. הגוף מפרק שריר גם בלי ספורט. BMR נמוך. התקפי רעב. חיבר לנתונים.'

      const bloodSection = '**🩺 מה אומרות הבדיקות**\n'
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
        + 'חובה: עברית תקנית. אל תמציאי פרטים. אל תכתבי כותרת ראשית בתחילת התשובה. כללים: (1) כל סעיף 3-4 משפטים בלבד, למעט סעיף הבדיקות שיכול להגיע ל-6 משפטים. (2) אל תחזרי על ערכי מעבדה — רק פרשנות התנהגותית. (3) כל משפט חייב להיות שלם וסגור. (4) אם יש ערכים חריגים נוספים חובה להזכיר אותם בסעיף הבדיקות.\n\n'

      const [msg1, msg2] = await Promise.all([
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים בלבד:\n\n**✨ הקווים הזוהרים שלך**\n**🔍 מה באמת קורה**\n' + athleteSection }]
        }),
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים בלבד:\n\n' + bloodSection + '\n\n**🥗 המלצות תזונה ותוספים**\n\n**🎯 3 צעדים למחר** (ממוספרים, ריאליסטיים' + stepsNote + ')' }]
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

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

    // 1. מצב ניתוח בדיקות דם גולמיות (הפקת JSON)
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

    // 2. מצב משוב שבועי על יומני אכילה (תוקן שגיאת הסינטקס)
    if (logs && !mode) {
      const nlpSummary = body.nlpSummary || ''
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: 'אתה אתי אטל — יועצת בריאות NLP. משוב שבועי חם ומעצים ל-' + name + ' בעברית.\n' + (nlpSummary ? 'מדדי NLP השבוע: ' + nlpSummary + '\n' : '') + 'יומן: ' + String(logs).substring(0, 1400) + '\n\nכתוב 5 סעיפים:\n**📊 סיכום** — מה קרה השבוע\n**✅ הצלחות** — מה עבד, תן קרדיט אמיתי\n**⚡ קשיים** — אם היה לחץ/עייפות גבוהים, חבר לאכילה הרגשית\n**🎯 3 צעדים** — פרקטיים ומותאמים למצב הרגשי\n**💚 מסר** — משפט אחד חם ומעצים' }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // 3. מצב ניתוח פרופיל מעמיק ראשוני (שולב ה-System Prompt החדש וההנחיות ההתנהגותיות)
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''

      const athleteSection = isAthlete
        ? '**⚡ חלון ההזדמנויות הספורטיבי והמנטלי**\nהחיבור בין דלק לגוף לבין מוטיבציה ואימונים. חלון הזדמנויות לתזונה, לצד ניהול מחשבות מעכבות בזמן מאמץ. פוקוס על חלבון ותמיכה במניעת קטבוליזם, מתוך מקום של הוקרה לגוף זז.'
        : '**⚡ תמיכה במטבוליזם, אנרגיה וניהול דחפים**\nפחמימות עודפות + חלבון נמוך = קפיצות אינסולין שנועלות שריפת שומן. חיבור פיזיולוגי ישיר ל"רעב רגשי" וקפיצות אנרגיה. איך הגוף מפרק שריר כשאין מספיק חלבון ואיך זה משפיע על תחושת השליטה והחוסן המנטלי.'

      const bloodSection = '**🩸 מה אומרות הבדיקות (ומערכת היחסים עם הגוף)**\n'
        + 'לכל ערך חריג: שם + ערך + טווח רצוי + הסבר פיזיולוגי פשוט + המלצה פרקטית (תזונה/תוסף/רופא). חברי את הממצאים הפיזיים לתחושות היומיומיות שלה (עייפות, מתח, שובע). אם ערך דורש רופא — ציינו. התייחסות לערכים חריגים נוספים אם קיימות.'

      const baseData = 'נתונים על ' + name + ':\n'
        + 'גיל ' + s(p.age,'?') + ' | משקל ' + s(p.weight,'?') + ' | מטרה: ' + s(p.goal,'?') + ' | פעילות: ' + s(p.exercise_type,'לא') + '\n'
        + 'שינה: ' + s(p.sleep_quality,'?') + ' | קימה: ' + s(p.wake_time,'?') + ' | לחץ: ' + s(p.stress_level,'?') + '/10\n'
        + 'בוקר: ' + s(p.breakfast_habits,'?') + ' | קפה: ' + s(p.coffee_intake,'?') + ' | מים: ' + s(p.water_intake,'?') + '\n'
        + 'אכילה רגשית: ' + s(p.emotional_eating,'?') + ' | מה מעכב: ' + s(p.goal_obstacles,'?') + '\n'
        + 'מה רוצה: ' + s(p.main_goal,'?') + ' | מה חשוב (ערכים מובילים): ' + s(p.important_values,'?') + '\n'
        + 'רפואי: ' + s(p.medical_history,'אין') + ' | תרופות: ' + s(p.medications,'אין') + '\n'
        + 'בדיקות: ' + bloodText + '\n'
        + (extraBlood ? extraBlood + '\n' : '')
        + (diary ? 'אכילה (3 ימים): ' + diary + '\n' : '')

      const systemPrompt = 'אתה אתי אטל - יועצת בריאות, מומחית לתזונה התנהגותית ו-NLP Master.\n'
        + 'כתבי ניתוח אישי, חם, עמוק ומעצים ל-' + name + ' בעברית, גוף שני נקבה.\n'
        + 'סגנון: פרימיום-בוטיק, אינטימי, מחבק, אותנטי, כמו שיחה פתוחה בגובה העיניים (ללא פורמליות ארגונית או טבלאות).\n'
        + 'דגש על תזונה התנהגותית: חברי תמיד בין המצב הפיזיולוגי (ערכי בדיקות דם, יומן אכילה) לבין המצב הרגשי, רמות הלחץ, ודפוסי החשיבה (לארגן את הראש לפני שמארגנים את הצלחת).\n'
        + 'חובה: עברית תקנית בלבד. אל תמציאי פרטים. אל תכתבי כותרת ראשית בתחילת התשובה — התחילי ישר עם הסעיף הראשון. כללים: (1) כל סעיף 3-4 משפטים בלבד, למעט סעיף הבדיקות שיכול להגיע ל-6 משפטים. (2) אל תחזרי על ערכי מעבדה יבשים — תני להם פרשנות התנהגותית וגופנית. (3) כל משפט חייב להיות שלם וסגור. (4) השתמשי בערכים החשובים לה ובחסמים המנטליים שהיא ציינה כדי ליצור חיבור רגשי חזק.\n\n'

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

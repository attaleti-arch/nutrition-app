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

// בדיקות שחשובות לבריאות ומשקל
const IMPORTANT_BLOOD = ['glucose','hba1c','cholesterol','hdl','ldl','triglycerides','hemoglobin','ferritin','iron','vitamin_b12','vitamin_d','tsh','crp','insulin','zinc','magnesium']

const BLOOD_RANGES = {
  glucose: [70,100], hba1c: [0,5.7], cholesterol: [0,200], hdl: [60,999],
  ldl: [0,100], triglycerides: [0,150], hemoglobin: [12,16], ferritin: [12,150],
  iron: [60,170], vitamin_b12: [200,900], vitamin_d: [30,100], tsh: [0.4,4.0],
  crp: [0,1.0], insulin: [2,25], zinc: [70,120], magnesium: [1.7,2.2]
}

function formatBlood(blood_tests) {
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
      const isNorm = val >= range[0] && val <= range[1]
      if (!isNorm) abnormal.push(`${name}: ${v} ⚠️`)
      else if (IMPORTANT_BLOOD.includes(k)) normal.push(`${name}: ${v} ✓`)
    } else {
      normal.push(`${name}: ${v}`)
    }
  })

  let result = ''
  if (abnormal.length) result += 'חריגות: ' + abnormal.join(' | ')
  if (normal.length) result += (result ? '\nתקינות חשובות: ' : 'תקינות: ') + normal.join(' | ')
  return result || 'לא הוזנו'
}

function s(val, fb) {
  if (!val) return fb || 'לא צוין'
  return String(val).substring(0, 150)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null,"zinc":null,"magnesium":null,"insulin":null}\nמספרים בלבד. טקסט: ' + String(body.bloodText).substring(0, 2000) }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (logs && !mode) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: 'אתה אתי אטל — יועצת בריאות NLP. משוב שבועי קצר ל-' + name + ' בעברית.\nיומן: ' + String(logs).substring(0, 1500) + '\n**📊 סיכום** | **✅ הצלחות** | **⚡ קשיים** | **🎯 3 צעדים** | **💚 מסר**' }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests)
      const diary = foodDiary ? String(foodDiary).substring(0, 600) : ''

      const instruction = `אתה אתי אטל — יועצת בריאות ותזונה התנהגותית בגישת NLP.
כתבי ניתוח אישי עמוק ל-${name} בעברית, גוף שני נקבה.
סגנון: חם, אינטימי, מחבק — כמו שיחה עם חברה שמבינה. לא רשמי.
כתבי פסקאות קצרות וזורמות (3-4 משפטים לסעיף).
חובה: כתבי רק על מה שקיים בנתונים. אל תמציאי ציטוטים שלא נאמרו. ללא טבלאות.`

      const baseData = `נתונים על ${name}:
גיל ${s(p.age,'?')} | משקל ${s(p.weight,'?')} | מטרה: ${s(p.goal,'?')} | פעילות: ${s(p.exercise_type,'לא')}
שינה: ${s(p.sleep_quality,'?')} | קימה: ${s(p.wake_time,'?')} | לחץ: ${s(p.stress_level,'?')}/10
בוקר: ${s(p.breakfast_habits,'?')} | קפה: ${s(p.coffee_intake,'?')} | מים: ${s(p.water_intake,'?')}
אכילה רגשית: ${s(p.emotional_eating,'?')} | מה מעכב: ${s(p.goal_obstacles,'?')}
מה רוצה: ${s(p.main_goal,'?')} | מה חשוב: ${s(p.important_values,'?')}
תרופות: ${s(p.medications,'אין')} | רפואי: ${s(p.medical_history,'אין')}
בדיקות דם: ${bloodText}
${diary ? 'אכילה: ' + diary : ''}`

      // חלק א — NLP ורגש
      const part1Promise = client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${instruction}

${baseData}

כתבי 2 סעיפים בלבד, כל אחד 2 משפטים ממוקדים:

**🌟 הקווים הזוהרים שלך**
העצמה אמיתית על חוזקות ספציפיות שעולות מהנתונים.

**🔍 מה באמת קורה — הגשר הטיפולי**
${isAthlete ? 'הסבירי את הלופ כעוגן רגשי לפיצוי על עייפות/שקט — לא חוסר רצון.' : 'הסבירי את הלופ כהרגל/שעמום/נפילת אנרגיה — לא חוסר רצון.'}
אמונות מגבילות: הוסיפי רק אם יש ציטוט מפורש מהשדות goal_obstacles או emotional_eating. אסור להמציא ציטוטים. אם אין — אל תכתבי את הסעיף הזה בכלל.` }]
      })

      // חלק ב — תזונה ופעולה
      const part2Promise = client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${instruction}

${baseData}

כתבי 4 סעיפים בלבד, כל אחד 2 משפטים ממוקדים:

**⚡ ${isAthlete ? 'חלון ההזדמנויות הספורטיבי' : 'תמיכה במטבוליזם ובאנרגיה היומית'}**
${isAthlete ? 'תזונה לפני/אחרי אימון, מניעת קטבוליזם, חלבון.' : 'קצב חילוף חומרים נמוך, גירעון חלבוני, התקפי רעב.'}

**🩸 מה אומרות הבדיקות**
התמקדי רק בערכים החריגים (מסומנים ⚠️). פרשי בשפה פשוטה וחיבר לאורח החיים. אם אין חריגות — משפט אחד חיובי.

**🥗 המלצות תזונה ותוספים**
המלצות אוכל ותוספים ספציפיים לפרופיל שלה — משולב בסעיף אחד.

**🎯 3 צעדים למחר**
1. [צעד קטן וספציפי]
2. [צעד קטן וספציפי]
3. [צעד קטן וספציפי — ${isSedentary ? '7,000 צעדים יומיים להתחלה' : 'מותאם לה'}]` }]
      })

      const [part1, part2] = await Promise.all([part1Promise, part2Promise])
      const combined = part1.content[0].text + '\n\n' + part2.content[0].text

      return Response.json({ result: combined })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('API Error:', err.message)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

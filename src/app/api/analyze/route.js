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

function formatBlood(blood_tests) {
  if (!blood_tests) return 'לא הוזנו'
  const entries = Object.entries(blood_tests).filter(([k,v]) => v && v !== '')
  if (!entries.length) return 'לא הוזנו'
  return entries.map(([k,v]) => (BLOOD_NAMES[k]||k) + ': ' + v).join(' | ')
}

function safe(val, fallback) {
  if (!val) return fallback || 'לא צוין'
  const s = String(val)
  return s.length > 200 ? s.substring(0, 200) + '...' : s
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null}\nמספרים בלבד. טקסט: ' + String(body.bloodText).substring(0, 2000) }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (logs && !mode) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: 'אתה אתי אטל — יועצת בריאות NLP. משוב שבועי קצר ל-' + name + ' בעברית. ללא טבלאות.\nיומן: ' + String(logs).substring(0, 2000) + '\n**📊 סיכום** | **✅ הצלחות** | **⚡ קשיים** | **🎯 3 צעדים** | **💚 מסר**' }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests)
      const diary = foodDiary ? String(foodDiary).substring(0, 800) : ''

      const content = `אתה אתי אטל — יועצת בריאות NLP. ניתוח אישי ל-${name} בעברית, גוף שני נקבה, חם ואישי. costume-made. ללא טבלאות. כל סעיף 2-3 משפטים. כתבי רק על מה שקיים בנתונים.

נתונים:
גיל ${safe(p.age,'?')} | משקל ${safe(p.weight,'?')} | מטרה: ${safe(p.goal,'?')} | פעילות: ${safe(p.exercise_type,'לא')}
שינה: ${safe(p.sleep_quality,'?')} | קימה: ${safe(p.wake_time,'?')} | לחץ: ${safe(p.stress_level,'?')}/10
בוקר: ${safe(p.breakfast_habits,'?')} | קפה: ${safe(p.coffee_intake,'?')} | מים: ${safe(p.water_intake,'?')}
אכילה רגשית: ${safe(p.emotional_eating,'?')} | מה מעכב: ${safe(p.goal_obstacles,'?')}
תרופות: ${safe(p.medications,'אין')} | רפואי: ${safe(p.medical_history,'אין')}
בדיקות: ${bloodText}
${diary ? 'אכילה: ' + diary : ''}

סעיפים:
**🌟 הקווים הזוהרים שלך**
**🔍 מה באמת קורה**
**🧠 אמונות מגבילות** (רק אם עולות מהנתונים)
**⚡ ${isAthlete ? 'חלון ההזדמנויות הספורטיבי' : 'תמיכה במטבוליזם ובאנרגיה'}**
**🩸 מה אומרות הבדיקות** (רק ערכים חריגים)
**🥗 המלצות תזונה**
**💊 תוספים לשקול**
**🎯 3 צעדים למחר** (ממוספרים${isSedentary ? ', כלול 7000 צעדים' : ''})
**💚 מסר אישי**`

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: content }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('API Error:', err.message)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

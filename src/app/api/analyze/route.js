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
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null}\nמספרים בלבד. טקסט: ' + String(body.bloodText).substring(0, 2000) }]
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

      const baseData = `נתונים על ${name}:
גיל ${s(p.age,'?')} | משקל ${s(p.weight,'?')} | מטרה: ${s(p.goal,'?')} | פעילות: ${s(p.exercise_type,'לא')}
שינה: ${s(p.sleep_quality,'?')} | קימה: ${s(p.wake_time,'?')} | לחץ: ${s(p.stress_level,'?')}/10
בוקר: ${s(p.breakfast_habits,'?')} | קפה: ${s(p.coffee_intake,'?')} | מים: ${s(p.water_intake,'?')}
אכילה רגשית: ${s(p.emotional_eating,'?')} | מה מעכב: ${s(p.goal_obstacles,'?')}
תרופות: ${s(p.medications,'אין')} | רפואי: ${s(p.medical_history,'אין')}
בדיקות: ${bloodText}
${diary ? 'אכילה: ' + diary : ''}`

      const instruction = 'אתה אתי אטל — יועצת בריאות NLP. ניתוח ל-' + name + ' בעברית, גוף שני נקבה, חם ואישי. costume-made. ללא טבלאות. כתבי רק על מה שקיים בנתונים.'

      // חלק א' — NLP ורגש
      const part1Promise = client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: instruction + '\n\n' + baseData + '\n\nכתבי את הסעיפים הבאים בלבד (כל אחד 2-3 משפטים):\n**🌟 הקווים הזוהרים שלך**\n**🔍 מה באמת קורה — הגשר הטיפולי**\n**🧠 אמונות מגבילות** (רק אם עולות מהנתונים)\n**⚡ ' + (isAthlete ? 'חלון ההזדמנויות הספורטיבי' : 'תמיכה במטבוליזם ובאנרגיה') + '**' }]
      })

      // חלק ב' — תזונה ופעולה
      const part2Promise = client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: instruction + '\n\n' + baseData + '\n\nכתבי את הסעיפים הבאים בלבד (כל אחד 2-3 משפטים):\n**🩸 מה אומרות הבדיקות** (רק ערכים חריגים, בשפה פשוטה)\n**🥗 המלצות תזונה אישיות**\n**💊 תוספים לשקול**\n**🎯 3 צעדים למחר** (ממוספרים' + (isSedentary ? ', כולל 7000 צעדים' : '') + ')\n**💚 מסר אישי**' }]
      })

      // הרץ את שניהם במקביל
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

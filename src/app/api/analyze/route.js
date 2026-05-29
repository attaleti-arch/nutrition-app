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
  return entries.map(([k,v]) => (BLOOD_NAMES[k]||k) + ': ' + v).join('\n')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `חלץ ערכי בדיקות דם. החזר JSON בלבד ללא הסברים:
{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null}
מספרים בלבד ללא יחידות. טקסט: ${body.bloodText}` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (logs && !mode) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: `אתה אתי אטל — יועצת בריאות NLP. משוב שבועי קצר ל-${name} בעברית. ללא טבלאות.
יומן: ${logs}
**📊 סיכום** | **✅ הצלחות** | **⚡ קשיים** | **🎯 3 צעדים** | **💚 מסר**` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(p.exercise_type))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests)

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `אתה אתי אטל — יועצת בריאות NLP. ניתוח אישי עמוק ל-${name} בעברית, גוף שני נקבה, חם ואישי. costume-made. ללא טבלאות markdown — פסקאות בלבד.

נתונים:
גיל ${p.age||'?'} | משקל ${p.weight||'?'} | מטרה: ${p.goal||'?'} | פעילות: ${p.exercise_type||'לא'}
שינה: ${p.sleep_quality||'?'} | קימה: ${p.wake_time||'?'} | לחץ: ${p.stress_level||'?'}/10
בוקר: ${p.breakfast_habits||'?'} | קפה: ${p.coffee_intake||'?'} | מים: ${p.water_intake||'?'}
אכילה רגשית: ${p.emotional_eating||'?'} | מה מעכב: ${p.goal_obstacles||'?'}
תרופות: ${p.medications||'אין'} | רפואי: ${p.medical_history||'אין'}

בדיקות דם:
${bloodText}

${foodDiary ? '5 ימי אכילה:\n' + foodDiary : ''}

כתבי עם הסעיפים (כל אחד בפסקאות, ללא טבלאות):

**🌟 הקווים הזוהרים שלך**
2-3 חוזקות ספציפיות מהנתונים

**🔍 מה באמת קורה — הגשר הטיפולי**
${isAthlete ? 'הלופ של קפה/מתוק כעוגן רגשי לעייפות — לא חוסר רצון. מנגנון הישרדות.' : 'הלופ מהרגל, שעמום, או נפילת אנרגיה — לא חוסר רצון.'}
הסבירי מה הצורך הרגשי האמיתי שמסתתר שם.

**🧠 אמונות מגבילות שזיהיתי**
ספציפיות לה

**⚡ ${isAthlete ? 'חלון ההזדמנויות הספורטיבי' : 'תמיכה במטבוליזם ובאנרגיה היומית'}**
${isAthlete ? 'חלון ההזדמנויות לפני/אחרי אימון. סכנת קטבוליזם מחוסר חלבון. ספציפי לסוג האימון שלה.' : 'חוסר חלבון מאט את ה-BMR (קצב חילוף חומרים במנוחה). גורם להתקפי רעב, עייפות, וחוסר ריכוז.'}

**🩸 מה אומרות הבדיקות**
פרשי כל ערך חריג בשפה פשוטה בפסקאות. חיבר לאורח החיים.

**🥗 המלצות תזונה אישיות**
ספציפיות לפרופיל שלה

**💊 תוספים ובדיקות לשקול**

**🎯 תוכנית פעולה — 3 צעדים למחר**
1. [צעד ראשון קטן ומעשי]
2. [צעד שני קטן ומעשי]
3. [צעד שלישי קטן ומעשי]
${isSedentary ? 'כלול: 7,000 צעדים יומיים (לא 10,000 עדיין) + תרגיל ליבה אחד בבית.' : ''}
3 בלבד. ריאליסטיים. לא מציפים.

**💚 מסר אישי — נחיתה רכה**
חם, מעצים, מרגיע. שתרגיש שרואים אותה ומאמינים בה.` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('Error:', err)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BLOOD_NAMES = {
  glucose:'סוכר בצום',hba1c:'המוגלובין A1C',cholesterol:'כולסטרול כללי',
  hdl:'HDL טוב',ldl:'LDL רע',triglycerides:'טריגליצרידים',
  hemoglobin:'המוגלובין',ferritin:'פריטין',iron:'ברזל',transferrin:'טרנספרין',
  folic_acid:'חומצה פולית',vitamin_b12:'ויטמין B12',vitamin_b6:'ויטמין B6',
  vitamin_d:'ויטמין D',calcium:'סידן',zinc:'אבץ',magnesium:'מגנזיום',
  tsh:'TSH',t3:'T3',t4:'T4',crp:'CRP דלקת',esr:'שקיעת דם ESR',
  homocysteine:'הומוציסטאין',alt:'ALT כבד',ast:'AST כבד',
  creatinine:'קריאטינין כליות',urea:'אוריאה',uric_acid:'חומצה אורית',
  estrogen:'אסטרוגן',progesterone:'פרוגסטרון',testosterone:'טסטוסטרון',
  insulin:'אינסולין בצום',wbc:'כדוריות לבנות WBC',rbc:'כדוריות אדומות RBC',
  platelets:'טסיות',blood_type:'סוג דם',
  lactose_sensitivity:'רגישות לקטוז',gluten_sensitivity:'רגישות גלוטן',celiac:'צליאק',
  urine_general:'שתן כללי',urine_culture:'תרבית שתן'
}

function formatBloodTests(blood_tests) {
  if (!blood_tests) return 'לא הוזנו'
  const entries = Object.entries(blood_tests).filter(([k,v]) => v && v !== '' && v !== null)
  if (!entries.length) return 'לא הוזנו'
  return entries.map(([k,v]) => (BLOOD_NAMES[k] || k) + ': ' + v).join('\n')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `חלץ ערכי בדיקות דם. החזר JSON בלבד:
{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null}
מספרים בלבד. טקסט: ${body.bloodText}` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (logs && !mode) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `אתה אתי אטל — יועצת בריאות NLP. כתבי משוב שבועי קצר וחם ל-${name} בעברית.
יומן: ${logs}
סעיפים: **📊 סיכום** | **✅ הצלחות** | **⚡ קשיים** | **🎯 3 צעדים** | **💚 מסר**` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(p.exercise_type)
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBloodTests(p.blood_tests)

      const prompt = `אתה אתי אטל — יועצת בריאות NLP. כתבי ניתוח אישי עמוק ל-${name} בעברית, גוף שני נקבה, חם ואישי. costume-made.

חשוב: אל תשתמשי בטבלאות markdown (ללא |). כתבי הכל כפסקאות טקסט רגיל בלבד.

נתונים:
גיל ${p.age} | משקל ${p.weight} | מטרה: ${p.goal} | פעילות: ${p.exercise_type || 'לא'}
שינה: ${p.sleep_quality} | קימה: ${p.wake_time || 'לא צוין'} | לחץ: ${p.stress_level}/10 | אנרגיה: ${p.energy_level}/10
בוקר: ${p.breakfast_habits} | צהריים: ${p.lunch_habits} | ערב: ${p.dinner_habits}
קפה: ${p.coffee_intake} | מים: ${p.water_intake} | אלכוהול: ${p.alcohol_intake || 'לא'}
אכילה רגשית: ${p.emotional_eating} | מה מעכב: ${p.goal_obstacles}
תרופות: ${p.medications || 'אין'} | רפואי: ${p.medical_history || 'אין'}
הורים: ${p.family_history || 'לא צוין'}

בדיקות דם:
${bloodText}

${foodDiary ? '5 ימי אכילה:\n' + foodDiary : ''}

כתבי ניתוח עם הסעיפים:

**🌟 הקווים הזוהרים שלך**
2-3 חוזקות אמיתיות וספציפיות

**🔍 מה באמת קורה — הגשר הטיפולי**
${isAthlete ? 'הלופ כעוגן רגשי לעייפות — לא חוסר רצון. חיבר NLP לתזונה.' : 'הלופ מהרגל ונפילת אנרגיה — לא חוסר רצון. חיבר NLP לתזונה.'}

**🧠 אמונות מגבילות שזיהיתי**
ספציפיות לה מהתשובות

**⚡ ההשפעה הפיזיולוגית**
${isAthlete ? 'קטבוליזם, חלון אימון, חוסר חלבון' : 'חילוף חומרים, התקפי רעב, אנרגיה יומית'}

**🩸 מה אומרות הבדיקות**
פרשי כל ערך חריג בשפה פשוטה — פסקאות בלבד, ללא טבלאות וללא קווים אנכיים. חיבר כל ערך לאורח החיים שלה.

**🥗 המלצות תזונה אישיות**
ספציפיות לפרופיל שלה

**💊 תוספים ובדיקות לשקול**
על בסיס כל הנתונים

**🎯 תוכנית פעולה — 3 צעדים קטנים למחר בבוקר**
כתבי בדיוק 3 משימות קטנות, ספציפיות וריאליסטיות. ממוספרות 1, 2, 3.
${isAthlete ? 'התמקדי בתזונה סביב אימון: לפני, אחרי, חלבון, הידרציה.' : isSedentary ? 'שינויים קטנים בארוחות + 7,000 צעדים יומיים (לא 10,000 עדיין) + תרגיל ליבה אחד בבית.' : 'שינויים קטנים ומעשיים המותאמים לשגרה שלה.'}
חשוב מאוד: 3 בלבד. לא יותר. לא מציפות.

**💚 מסר אישי ממני — נחיתה רכה**
סיימי עם מסר חם, מעצים ומרגיע. הורידי את מפלס החרדה — היא מבינה הרבה עכשיו, ו-3 הצעדים הם כל מה שצריך לעשות מחר. שתרגיש שמישהי באמת רואה אותה ומאמינה בה.`

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('Error:', err)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

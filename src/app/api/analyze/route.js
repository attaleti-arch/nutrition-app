import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    // Blood text extraction
    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: `חלץ ערכי בדיקות דם מהטקסט והחזר JSON בלבד:
{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"iron":null,"vitamin_b12":null,"vitamin_d":null,"calcium":null,"tsh":null,"crp":null,"alt":null,"ast":null,"creatinine":null,"insulin":null,"wbc":null,"rbc":null,"platelets":null}
החזר מספרים בלבד ללא יחידות.
טקסט: ${body.bloodText}` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // Weekly logs analysis
    if (logs && !mode) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `אתה אתי אטל — יועצת בריאות ותזונה התנהגותית.
נתחי את יומן ${name} וכתבי משוב שבועי חם ואישי בעברית.

יומן:
${logs}

כתבי עם הסעיפים:
**📊 סיכום השבוע**
**✅ מה עשית נהדר**
**⚡ איפה נתקעת**
**🎯 3 דברים לשבוע הבא**
**💚 מסר אישי**` }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // Full profile analysis
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר|פעיל/.test(p.exercise_type)
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'

      const prompt = `אתה אתי אטל — יועצת בריאות ותזונה התנהגותית בגישת NLP.
כתבי ניתוח אישי עמוק ל-${name} בעברית, בגוף שני נקבה, חם ואישי.

נתונים:
גיל: ${p.age} | משקל: ${p.weight} | גובה: ${p.height} | מטרה: ${p.goal}
שינה: ${p.sleep_quality} | קימה: ${p.wake_time} | לחץ: ${p.stress_level}/10
פעילות: ${p.exercise_type || 'לא צוין'} | רמת פעילות: ${p.activity}
בוקר: ${p.breakfast_habits} | צהריים: ${p.lunch_habits} | ערב: ${p.dinner_habits}
מים: ${p.water_intake} | קפה: ${p.coffee_intake} | אכילה רגשית: ${p.emotional_eating}
מה רוצה: ${p.main_goal} | מה מעכב: ${p.goal_obstacles}
מוטיבציה: ${p.goal_motivation}/10 | ערכים: ${p.important_values}
תרופות: ${p.medications || 'אין'} | רפואי: ${p.medical_history || 'אין'}
בדיקות דם: ${JSON.stringify(p.blood_tests || {})}
${foodDiary ? `5 ימי אכילה:\n${foodDiary}` : ''}

כתבי ניתוח עם הסעיפים הבאים:

**🌟 הקווים הזוהרים שלך**
[2-3 חוזקות ספציפיות שרואים בנתונים]

**🔍 מה באמת קורה — הגשר הטיפולי**
[${isAthlete ? 'הלופ של הקפה/מתוק כעוגן רגשי לעייפות — לא חוסר רצון' : 'הלופ של המתוק/קפה מהרגל או נפילת אנרגיה — לא חוסר רצון'}]

**🧠 האמונות המגבילות שזיהיתי**
[אמונות ספציפיות מהתשובות]

**⚡ ההשפעה הפיזיולוגית**
[${isAthlete ? 'חלון הזדמנויות חסום — תזונה סביב אימון, קטבוליזם' : 'חילוף חומרים, התקפי רעב, אנרגיה יומית'}]

**🩸 מה אומרות הבדיקות**
[פרשנות פשוטה של ערכים חריגים]

**🥗 המלצות תזונה אישיות**
[ספציפיות לה]

**💊 תוספים ובדיקות לשקול**

**🎯 3 צעדים ראשונים למחר**
[${isSedentary ? 'התחילי ב-7,000 צעדים + 6 תרגילי ליבה בבית' : isAthlete ? 'תזונה סביב אימון' : '3 שינויים קטנים ומעשיים'}]

**💚 מסר אישי ממני**
[חם, אמיתי, מעצים]`

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים לניתוח' })

  } catch(err) {
    console.error('API Error:', err)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

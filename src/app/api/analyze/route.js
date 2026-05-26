import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { name, logs } = await request.json()

  const prompt = 'אתה מאמן תזונה ואורח חיים דיגיטלי חם, מעצים ומקצועי באפליקציית "בין הראש לצלחת".\n\nתפקידך לנתח את נתוני התזונה של ' + name + ' ולספק פידבק קצר, מעורר השראה ופרקטי.\n\nחוקים חשובים לסגנון:\n- ללא טבלאות או גרפים טקסטואליים\n- ללא שפה שיפוטית: אין "קריטי", "בעיה", "נכשל", "יום רעב"\n- ללא סימני אזהרה: אין 🚨 🔴 ⚠️\n- קצר, סרוק, קל לקריאה במובייל\n- תמיכה מנטלית לצד פרקטיקה תזונתית\n- אם יש נתוני יעד קלורי — השווה בצורה חיובית\n\nמבנה הפלט (הצמד למבנה זה בלבד):\n\n# 🌟 נקודות אור\n(2-3 שורות מפרגנות על מה שעבד: עקביות, צעדים, בחירות טובות)\n\n---\n\n# 🎯 איך נדייק את הצלחת?\n(מה כדאי להוסיף בצורה חיובית — התייחס לחלבון, שומנים איכותיים, מים. אם יש פער מהיעד הקלורי — הסבר בצורה תומכת ולא שיפוטית)\n\n---\n\n# 💡 3 רעיונות קטנים למחר\n(3 טיפים פרקטיים וקלים: שדרוג בוקר, חטיף חלבון, מים)\n\nיומן תזונה:\n' + logs

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  return Response.json({ result: message.content[0].text })
}

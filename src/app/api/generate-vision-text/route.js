import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { clientName, location, clothing, seeText, hearText, feelText, currentWeight, targetWeight } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY לא מוגדר' }, { status: 500 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const locationMap = { beach: 'חוף ים', park: 'פרדס', city: 'עיר' }
    const clothingMap = { jeans: "ג'ינס וחולצה מחמיאה", dress: 'שמלה זורמת', professional: 'לבוש מקצועי' }

    const locationHe = locationMap[location] || location
    const clothingHe = clothingMap[clothing] || clothing
    const weightDiff = currentWeight && targetWeight ? Math.round(Math.abs(parseFloat(currentWeight) - parseFloat(targetWeight))) : null

    const systemPrompt = `אתה עוזר מומחה לכתיבה יצירתית, דמיון מודרך ואימון NLP לשינוי הרגלים. תפקידך להפוך תשובות של לקוחה על חזון העתיד שלה לפסקה עוצמתית, רגשית ומפורטת בגוף ראשון.

הנחיות עבודה:
1. השתמש בטון רך, מעצים, סוחף ומלא ביטחון.
2. שלב את כל הפרטים שהלקוחה מספקת — מיקום, לבוש, חושים, רגש.
3. הקפד על שפה חושית (ריחות, מגע, אור, צלילים, טמפרטורה) — חוויה חיה ומוחשית.
4. כתוב בגוף ראשון נקבה בעברית.
5. הפסקה — 5 עד 8 משפטים, עוצמתית ותמציתית.
6. סיים תמיד במשפט שמחזק: זו אני, זאת האמת שלי.
7. אל תוסיף כותרת, רק את הפסקה.`

    const userPrompt = `צרי פסקת ויזואליזציה עוצמתית (Future Pacing) עבור ${clientName || 'הלקוחה'}:

📍 מיקום: ${locationHe}
👗 לבוש: ${clothingHe}
${seeText ? `👁️ מה היא רואה: ${seeText}` : ''}
${hearText ? `👂 מה היא שומעת: ${hearText}` : ''}
${feelText ? `💫 מה היא מרגישה: ${feelText}` : ''}
${weightDiff ? `⚖️ הפרש משקל: מינוס ${weightDiff} ק״ג מהיום` : ''}

כתבי פסקה אחת עוצמתית בגוף ראשון נקבה.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const paragraph = message.content[0].text.trim()
    return Response.json({ paragraph })
  } catch (err) {
    console.error('generate-vision-text error:', err)
    return Response.json({ error: err.message || 'שגיאה ביצירת פסקה' }, { status: 500 })
  }
}

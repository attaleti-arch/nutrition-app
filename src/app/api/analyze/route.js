import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { name, logs } = await request.json()
  
  const prompt = 'אתה דיאטנית מומחית. נתחי את יומן התזונה של ' + name + ' ותני פידבק מפורט בעברית.\n\nכתבי:\n1. מה אכל/ה טוב - מה עבד השבוע\n2. איך נראית הצלחת - הרכב הארוחות בפועל\n3. מה לשפר - המלצות ספציפיות ומעשיות\n4. עידוד אישי - משפט מחזק\n\nיומן תזונה:\n' + logs

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  return Response.json({ result: message.content[0].text })
}

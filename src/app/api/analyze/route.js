import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// הגדרת הלקוח מול Anthropic
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const body = await req.json()
    const { message, history } = body

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [...history, { role: 'user', content: message }],
    })

    return Response.json({ reply: response.content[0].text })
  } catch (error) {
    return Response.json({ error: 'שגיאה בתקשורת עם השרת' }, { status: 500 })
  }
}

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { name, logs } = await request.json()
  
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `אתה דיאטנית מומחית. נתחי את יומן האכילה של ${name} ותני המלצות תזונתיות קצרות

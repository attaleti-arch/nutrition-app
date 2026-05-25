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
        content: 'You are a nutrition expert. Analyze the food diary of ' + name + ' and give short practical recommendations in Hebrew.\n\nFood diary:\n' + logs
      }
    ]
  })

  return Response.json({ result: message.content[0].text })
}

import OpenAI from 'openai'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { paragraph } = await req.json()
    if (!paragraph) return Response.json({ error: 'חסרה פסקה' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY לא מוגדר' }, { status: 500 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: paragraph,
      speed: 0.88,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('generate-vision-audio error:', err)
    return Response.json({ error: err.message || 'שגיאה ביצירת אודיו' }, { status: 500 })
  }
}

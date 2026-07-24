import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(req) {
  try {
    const { paragraph, clientId } = await req.json()
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

    // Upload to Supabase Storage and persist URL on the client row
    let permanentUrl = null
    if (clientId) {
      try {
        const supabase = getSupabase()
        const fileName = `vision_audio_${clientId}_${Date.now()}.mp3`
        const { error: uploadError } = await supabase.storage
          .from('vision-audio')
          .upload(fileName, buffer, { contentType: 'audio/mpeg', upsert: false })
        if (!uploadError) {
          const { data } = supabase.storage.from('vision-audio').getPublicUrl(fileName)
          permanentUrl = data.publicUrl
          await supabase.from('clients').update({ vision_audio_url: permanentUrl }).eq('id', clientId)
        }
      } catch (e) {
        console.error('Audio storage failed:', e.message)
      }
    }

    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
    }
    if (permanentUrl) headers['X-Audio-Url'] = permanentUrl

    return new Response(buffer, { headers })
  } catch (err) {
    console.error('generate-vision-audio error:', err)
    return Response.json({ error: err.message || 'שגיאה ביצירת אודיו' }, { status: 500 })
  }
}

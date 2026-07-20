import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

export async function POST(req) {
  try {
    const { base64, clientId, mimeType } = await req.json()
    if (!base64 || !clientId) return Response.json({ error: 'חסרים פרמטרים' }, { status: 400 })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY לא מוגדר' }, { status: 500 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const byteString = atob(base64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)

    const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'
    const fileName = `vision_voice_${clientId}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('vision-audio')
      .upload(fileName, bytes.buffer, { contentType: mimeType || 'audio/webm', upsert: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: pub } = supabase.storage.from('vision-audio').getPublicUrl(fileName)
    const url = pub.publicUrl

    await supabase.from('clients').update({ vision_audio_url: url }).eq('id', clientId)

    return Response.json({ url })
  } catch (err) {
    console.error('upload-voice-recording error:', err)
    return Response.json({ error: err.message || 'שגיאה בהעלאה' }, { status: 500 })
  }
}

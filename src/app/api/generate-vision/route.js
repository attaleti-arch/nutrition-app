import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(req) {
  try {
    const { clientId, clientName, location, clothing, freetext, goalText } = await req.json()

    if (!clientId) return Response.json({ error: 'חסר מזהה לקוחה' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY לא מוגדר — הוסיפי את המפתח בהגדרות הסביבה' }, { status: 500 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = getSupabase()

    const locationMap = {
      beach: 'on a sunny beach with the sea in the background',
      park: 'in a green citrus grove orchard with trees',
      city: 'in a vibrant city street with warm light',
      other: 'in a beautiful natural setting'
    }
    const clothingMap = {
      jeans: 'wearing stylish slim-fit jeans and a fitted top',
      dress: 'wearing an elegant flowy dress',
      professional: 'wearing smart professional attire',
      other: 'wearing comfortable stylish clothes'
    }

    const locationDesc = locationMap[location] || locationMap.city
    const clothingDesc = clothingMap[clothing] || clothingMap.jeans
    const extraDetails = freetext ? `. Additional details: ${freetext}` : ''

    const prompt = `A confident, radiant Israeli woman ${locationDesc}, ${clothingDesc}. She looks healthy, happy, and glowing — at her ideal weight after achieving her wellness goal. Her posture is upright and confident, with a natural warm smile. The lighting is soft and flattering, golden-hour light. Professional lifestyle photography style, warm tones, photorealistic${extraDetails}. No text in image.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = response.data[0].url

    // Download and upload to Supabase Storage for permanent storage
    const imgResponse = await fetch(imageUrl)
    const imgBuffer = await imgResponse.arrayBuffer()
    const fileName = `vision_${clientId}_${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('vision-images')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })

    let permanentUrl = imageUrl
    let warning = null

    if (uploadError) {
      // Bucket doesn't exist — use temp URL, still save to DB
      warning = 'אחסון קבוע נכשל — השתמש ב-URL זמני. צרי bucket בשם vision-images בסופאבייס Storage.'
    } else {
      const { data: publicUrlData } = supabase.storage.from('vision-images').getPublicUrl(fileName)
      permanentUrl = publicUrlData.publicUrl
    }

    await supabase.from('clients').update({
      vision_image_url: permanentUrl,
      vision_prompt: prompt,
      vision_goal_text: goalText || '',
      vision_revealed: false
    }).eq('id', clientId)

    return Response.json({ imageUrl: permanentUrl, prompt, ...(warning ? { warning } : {}) })
  } catch (err) {
    console.error('generate-vision error:', err)
    return Response.json({ error: err.message || 'שגיאה ביצירת תמונה' }, { status: 500 })
  }
}

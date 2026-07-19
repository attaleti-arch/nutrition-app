import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(req) {
  try {
    const { clientId, clientName, location, clothing, seeText, hearText, feelText, currentWeight, targetWeight, photoBase64 } = await req.json()

    if (!clientId) return Response.json({ error: 'חסר מזהה לקוחה' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY לא מוגדר' }, { status: 500 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = getSupabase()

    const locationMap = {
      beach: 'on a sunny beach at golden hour with soft sea breeze and warm sand',
      park: 'in a lush green citrus grove orchard with dappled sunlight',
      city: 'on a vibrant city street with warm afternoon light and energy',
      other: 'in a beautiful natural setting with soft warm light',
    }
    const clothingMap = {
      jeans: 'wearing comfortable relaxed jeans and a loose casual top',
      dress: 'wearing a comfortable flowy everyday dress',
      professional: 'wearing relaxed professional attire',
      other: 'wearing comfortable everyday clothes',
    }

    let personDescription = 'A confident, radiant Israeli woman'

    // Use Claude vision to analyze the uploaded photo
    if (photoBase64 && process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        // Detect media type — default jpeg
        const mediaType = photoBase64.startsWith('/9j') ? 'image/jpeg' : photoBase64.startsWith('iVBORw') ? 'image/png' : 'image/jpeg'
        const visionRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBase64 } },
              { type: 'text', text: 'Describe this person for a photorealistic image generation prompt. Focus only on: hair color and length/style, eye color, skin tone, approximate age. Write exactly 1 sentence in English starting with "A woman with". Be specific and concise.' }
            ]
          }]
        })
        personDescription = visionRes.content[0].text.trim().replace(/^["']|["']$/g, '')
      } catch (e) {
        console.error('Photo analysis failed, using default description:', e.message)
      }
    }

    const locationDesc = locationMap[location] || `in ${location} with beautiful natural light`
    const clothingDesc = clothingMap[clothing] || `wearing ${clothing}`
    const sceneDetails = [seeText, hearText, feelText].filter(Boolean).slice(0, 2).join('. ')

    const weightDiff = currentWeight && targetWeight
      ? Math.abs(parseFloat(currentWeight) - parseFloat(targetWeight))
      : null

    let bodyNote
    if (weightDiff !== null && weightDiff <= 7) {
      // מטרת חיטוב — הפרש קטן, דגש על טונוס ואנרגיה
      bodyNote = 'Body looks naturally toned and fit — same realistic body type as herself, slightly lighter, with visible vitality and muscle tone. Not dramatically thinner, just healthy and strong.'
    } else if (weightDiff !== null && weightDiff <= 15) {
      // ירידה בינונית — קצת יותר קלה, אותו מבנה
      bodyNote = 'Body looks naturally lighter and healthier — same realistic body frame and proportions as herself, but more energetic and comfortable. Subtle, believable change.'
    } else {
      // ירידה משמעותית או לא ידוע — שמור על מבנה הגוף, אנרגיה
      bodyNote = 'Realistic natural body — same body type and proportions as herself. Do not alter her body shape dramatically. She radiates health and energy.'
    }

    const prompt = `${personDescription} ${locationDesc}, ${clothingDesc}. ${bodyNote} She looks healthy, energetic, happy and deeply confident. Natural upright posture, genuine warm smile, inner radiance. No revealing or tight clothing. Soft golden-hour lighting. Professional lifestyle photography, warm photorealistic tones.${sceneDetails ? ' ' + sceneDetails + '.' : ''} No text in image. Realistic, achievable, empowering.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = response.data[0].url

    // Download and upload to Supabase Storage
    let permanentUrl = imageUrl
    let warning = null
    try {
      const imgResponse = await fetch(imageUrl)
      const imgBuffer = await imgResponse.arrayBuffer()
      const fileName = `vision_${clientId}_${Date.now()}.png`
      const { error: uploadError } = await supabase.storage
        .from('vision-images')
        .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('vision-images').getPublicUrl(fileName)
        permanentUrl = publicUrlData.publicUrl
      } else {
        warning = 'צרי bucket בשם vision-images ב-Supabase Storage לאחסון קבוע'
      }
    } catch (e) {
      warning = 'אחסון קבוע נכשל — התמונה זמנית בלבד'
    }

    await supabase.from('clients').update({
      vision_image_url: permanentUrl,
      vision_prompt: prompt,
      vision_goal_text: targetWeight || '',
    }).eq('id', clientId)

    return Response.json({ imageUrl: permanentUrl, prompt, ...(warning ? { warning } : {}) })
  } catch (err) {
    console.error('generate-vision error:', err)
    return Response.json({ error: err.message || 'שגיאה ביצירת תמונה' }, { status: 500 })
  }
}

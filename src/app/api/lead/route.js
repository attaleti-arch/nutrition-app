import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request) {
  const body = await request.json()
  const name = (body.name || '').trim()
  const phone = (body.phone || '').trim()
  const email = (body.email || '').trim()
  const message = (body.message || '').trim()

  if (!name || !phone) {
    return Response.json({ error: 'שם וטלפון הם שדות חובה' }, { status: 400 })
  }

  const { error } = await supabase.from('leads').insert({ name, phone, email, message })
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}

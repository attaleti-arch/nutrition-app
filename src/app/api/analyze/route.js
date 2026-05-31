import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BLOOD_NAMES = {
  glucose:'סוכר בצום',hba1c:'המוגלובין A1C',cholesterol:'כולסטרול כללי',
  hdl:'HDL טוב',ldl:'LDL רע',triglycerides:'טריגליצרידים',
  hemoglobin:'המוגלובין',ferritin:'פריטין',iron:'ברזל',
  folic_acid:'חומצה פולית',vitamin_b12:'ויטמין B12',vitamin_d:'ויטמין D',
  calcium:'סידן',zinc:'אבץ',magnesium:'מגנזיום',
  tsh:'TSH',t3:'T3',t4:'T4',crp:'CRP דלקת',esr:'שקיעת דם',
  homocysteine:'הומוציסטאין',alt:'ALT כבד',ast:'AST כבד',
  creatinine:'קריאטינין',urea:'אוריאה',uric_acid:'חומצה אורית',
  estrogen:'אסטרוגן',progesterone:'פרוגסטרון',testosterone:'טסטוסטרון',
  insulin:'אינסולין',wbc:'WBC',rbc:'RBC',platelets:'טסיות',
  blood_type:'סוג דם',lactose_sensitivity:'רגישות לקטוז',
  gluten_sensitivity:'רגישות גלוטן',celiac:'צליאק'
}

const BLOOD_RANGES = {
  glucose:[70,100],hba1c:[0,5.7],cholesterol:[0,200],hdl:[60,999],
  ldl:[0,100],triglycerides:[0,150],hemoglobin:[12,16],ferritin:[12,150],
  iron:[60,170],vitamin_b12:[200,900],vitamin_d:[30,100],tsh:[0.4,4.0],
  crp:[0,1.0],insulin:[2,25],zinc:[70,120],magnesium:[1.7,2.2],
  calcium:[8.5,10.5],alt:[0,35],ast:[0,40],creatinine:[0.6,1.2],uric_acid:[2.4,6.0]
}

const AGENT_SYSTEM = `אתה "עוזר החירום" של תוכנית "בין הראש לצלחת" – מבוסס שיטת אתי אטל ו-NLP של שירלי.

## זהותך
אתה עוזר תזונתי קליני חם, מעצים ומקצועי. לא רופא — מלווה תזונתי שמדבר בשפה חיובית.

## 🚨 כלל חירום — מוחלט
כאב חד בחזה / קוצר נשימה / נפיחות פתאומית / אובדן הכרה / ירידת סוכר קיצונית / כאב בטן עז → עצור הכול:
"🚨 זה נשמע כמו מצב חירום רפואי. פני בדחיפות למיון או התקשרי ל-101. אל תישארי לבד."

## 🍽️ הצלחת החכמה (שיטת אתי)
- 50% ירקות מגוונים
- 25-40% חלבון איכותי: דגים שמנים, עוף/הודו, ביצים, קטניות, טופו
- 15-25% פחמימה מורכבת GI נמוך: בטטה, קינואה, כוסמת, בורגול, אורז מלא
- 10-20% שומן מהצומח: שמן זית, אבוקדו, טחינה גולמית
- סדר אכילה: חלבון וירק קודם → פחמימה אחרונה

## 📋 6 פרוטוקולים קליניים
1. מטבולי (סוכרת, אינסולין): 40% חלבון | 30% שומן | 30% פחמימה. חלבון לפני פחמימה. פעילות: כוח + אירובי. תוספים: מגנזיום, כרום, אומגה 3.
2. קרדיולוגי (לב, כולסטרול, לחץ דם): 30% חלבון רזה | 20% שומן (אומגה 3) | 50% ירקות. ללא נתרן מיותר. פעילות: אירובי מתון בלבד. לא HIIT.
3. אונקולוגי: 50% חלבון | 30% שומן | 20% פחמימה מבושלת. מניעת קכקסיה. להימנע מסוכר. פעילות: תנועה מתונה.
4. בלוטת תריס (כולל כריתה): סלניום (2 אגוזי ברזיל/יום), אבץ, יוד. לא HIIT. לבותירוקסין על קיבה ריקה.
5. עיכול (קרוהן, קוליטיס, IBS, צליאק): מזון מבושל/מאודה בלבד בדלקת. 5-6 ארוחות קטנות. פרוביוטיקה. פעילות: יוגה ופילאטיס.
6. כליות וגאוט: 15-20% חלבון | הידרציה 2.5-3 ליטר | הימנעות מפורינים בגאוט.

## 🧠 גישת NLP (שירלי)
- "מה כן לאכול" — לא "מה אסור"
- כל כישלון = משוב. "מה למדת מהמעידה הזו?"
- "אנרגיה זורמת למקום שבו תשומת הלב מתמקדת"
- זהי רגש מאחורי אכילה רגשית → הצעי חלופה

## 🏋️ תזונת ספורט
- לפני אימון (120 דק'): 250 קל', 70% פחמימות, 10-15% חלבון
- ממש לפני (10-45 דק'): בננה / 2 תמרים / לחם לבן + דבש
- אחרי אימון: 600-900 קל', 40-60% פחמימות, 20-30% חלבון

## 🚫 גבולות
- ייעוץ תזונתי בלבד. לא אבחנות, לא הפסקת תרופות.
- ספק → "התייעצי עם הרופא המטפל"`

function formatBlood(blood_tests, extraNotes) {
  if (!blood_tests) return 'לא הוזנו'
  const entries = Object.entries(blood_tests).filter(([k,v]) => v && v !== '')
  if (!entries.length) return 'לא הוזנו'
  const abnormal = [], normal = []
  entries.forEach(([k,v]) => {
    const name = BLOOD_NAMES[k] || k
    const range = BLOOD_RANGES[k]
    const val = parseFloat(v)
    if (range && !isNaN(val)) {
      if (val < range[0] || val > range[1]) abnormal.push(name + ': ' + v + ' (חריג)')
      else normal.push(name + ': ' + v)
    } else normal.push(name + ': ' + v)
  })
  let r = ''
  if (abnormal.length) r += 'חריגות: ' + abnormal.join(' | ')
  if (normal.length) r += (r ? ' | תקינות: ' : 'תקינות: ') + normal.slice(0,5).join(' | ')
  if (extraNotes && extraNotes.trim()) r += ' | ערכים חריגים נוספים: ' + extraNotes.trim()
  return r || 'לא הוזנו'
}

function s(val, fb) {
  if (!val) return fb || 'לא צוין'
  return String(val).substring(0, 100)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, logs, mode, profile, foodDiary } = body

    // ── סריקת בדיקות דם (תמונה) ──
    if (mode === 'bloodImage' && body.imageBase64) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: body.mediaType || 'image/jpeg', data: body.imageBase64 } },
          { type: 'text', text: 'זהו דף בדיקות דם. חלץ את הערכים ותחזיר JSON בלבד (null אם לא קיים):\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"iron":null,"folic_acid":null,"vitamin_b12":null,"vitamin_b6":null,"vitamin_d":null,"calcium":null,"zinc":null,"magnesium":null,"tsh":null,"t3":null,"t4":null,"crp":null,"esr":null,"homocysteine":null,"alt":null,"ast":null,"creatinine":null,"urea":null,"uric_acid":null,"estrogen":null,"progesterone":null,"testosterone":null,"insulin":null,"wbc":null,"rbc":null,"platelets":null,"extra_abnormals":""}\nמספרים בלבד ללא יחידות. extra_abnormals: ערכים חריגים שאינם בשדות האחרים.' }
        ]}]
      })
      try {
        const text = msg.content[0].text.replace(/```json|```/g,'').trim()
        const parsed = JSON.parse(text)
        const extra = parsed.extra_abnormals || ''
        delete parsed.extra_abnormals
        return Response.json({ result: JSON.stringify(parsed), extra })
      } catch(e) { return Response.json({ result: msg.content[0].text, extra: '' }) }
    }

    // ── חילוץ בדיקות דם (טקסט) ──
    if (mode === 'blood' && body.bloodText) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: 'חלץ ערכי בדיקות דם. החזר JSON בלבד:\n{"glucose":null,"hba1c":null,"cholesterol":null,"hdl":null,"ldl":null,"triglycerides":null,"hemoglobin":null,"ferritin":null,"vitamin_b12":null,"vitamin_d":null,"tsh":null,"crp":null,"alt":null,"creatinine":null,"zinc":null,"magnesium":null,"insulin":null,"extra_abnormals":""}\nב-extra_abnormals: ערכים חריגים שאינם בשאר השדות. מספרים בלבד.\nטקסט: ' + String(body.bloodText).substring(0, 2000) }]
      })
      try {
        const text = msg.content[0].text.replace(/```json|```/g,'').trim()
        const parsed = JSON.parse(text)
        const extra = parsed.extra_abnormals || ''
        delete parsed.extra_abnormals
        return Response.json({ result: JSON.stringify(parsed), extra })
      } catch(e) { return Response.json({ result: msg.content[0].text, extra: '' }) }
    }

    // ── סריקת צלחת (תמונה) ──
    if (mode === 'scanMeal' && body.imageBase64) {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: body.mediaType || 'image/jpeg', data: body.imageBase64 } },
          { type: 'text', text: 'זוהי תמונה של ארוחה. נתח והחזר JSON בלבד:\n{\n  "description": "תיאור קצר בעברית",\n  "items": [{"name": "שם המאכל", "amount": "כמות", "calories": 0, "protein": 0, "fat": 0, "carbs": 0}],\n  "total_calories": 0,\n  "total_protein": 0,\n  "total_fat": 0,\n  "total_carbs": 0,\n  "confidence": "high/medium/low"\n}' }
        ]}]
      })
      try {
        const parsed = JSON.parse(msg.content[0].text.replace(/```json|```/g,'').trim())
        return Response.json({ result: parsed })
      } catch(e) {
        return Response.json({ result: { description: 'לא הצלחתי לזהות', items: [], total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0, confidence: 'low' } })
      }
    }

    // ── Agent חירום 24/7 ──
    if (mode === 'agent') {
      const messages = body.messages || []
      const apiMessages = messages.length > 0
        ? messages
        : [{ role: 'user', content: body.question || '' }]
      const clientContext = body.clientProfile
        ? '\n\n[פרופיל הלקוחה: ' + body.clientProfile + ']'
        : ''
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: AGENT_SYSTEM + clientContext,
        messages: apiMessages,
      })
      return Response.json({ result: msg.content[0].text })
    }

    // ── מסמך פתיחה אישי ──
    if (mode === 'welcomeDoc' && body.clientPassword) {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const [clientRes, profileRes] = await Promise.all([
        sb.from('clients').select('*').eq('password', body.clientPassword).maybeSingle(),
        sb.from('client_profiles').select('*').eq('client_password', body.clientPassword).maybeSingle(),
      ])

      const cl = clientRes.data || {}
      const pr = profileRes.data || {}
      const bloodTests = pr.blood_tests || {}
      const extraBlood = pr.extra_blood_notes || ''
      const clientName = body.clientName || cl.name || ''

      const abnormals = []
      Object.entries(bloodTests).forEach(([k, v]) => {
        if (!v || v === '') return
        const range = BLOOD_RANGES[k]
        const val = parseFloat(v)
        if (range && !isNaN(val) && (val < range[0] || val > range[1])) {
          abnormals.push({
            key: k,
            name: BLOOD_NAMES[k] || k,
            value: v,
            low: range[0],
            high: range[1],
            isLow: val < range[0]
          })
        }
      })

      const bloodSummary = abnormals.map(a =>
        `${a.name}: ${a.value} (${a.isLow ? 'נמוך מ-' + a.low : 'גבוה מ-' + a.high}, תקין: ${a.low}-${a.high})`
      ).join(' | ')

      const medicalHistory = pr.medical_history || cl.medical_history || ''
      const medications = pr.medications || ''
      const goal = cl.goal || 'ירידה במשקל'
      const activity = pr.exercise_type || cl.activity || ''
      const stressLevel = pr.stress_level || ''
      const emotionalEating = pr.emotional_eating || ''

      const prompt = `אתה אתי אטל — יועצת בריאות ותזונה התנהגותית. בנה מסמך פתיחה אישי עבור ${clientName}.

נתוני הלקוחה:
- שם: ${clientName}
- מטרה: ${goal}
- מחלות רקע / היסטוריה רפואית: ${medicalHistory || 'לא צוין'}
- תרופות: ${medications || 'לא צוין'}
- פעילות גופנית: ${activity || 'לא צוין'}
- רמת לחץ: ${stressLevel || 'לא צוין'}/10
- אכילה רגשית: ${emotionalEating || 'לא צוין'}
- בדיקות דם חריגות: ${bloodSummary || 'לא נמצאו חריגות'}
- ערכים חריגים נוספים: ${extraBlood || 'אין'}

החזר JSON בלבד, ללא backticks, במבנה הבא:
{
  "greeting": "משפט פתיחה חם ואישי ל${clientName} — 2 משפטים",
  "plate": {
    "veggies": 50,
    "protein": 30,
    "carbs": 20,
    "fat": 15
  },
  "bloodDeficits": [
    {
      "name": "שם הערך",
      "value": "הערך שנמדד",
      "normal": "טווח תקין",
      "icon": "אמוג'י מתאים",
      "meaning": "מה זה אומר פיזיולוגית — 2 משפטים בלבד",
      "recommendation": "מה לאכול / מה לקחת"
    }
  ],
  "medicalCards": [
    {
      "title": "שם המצב",
      "icon": "אמוג'י",
      "color": "#hex",
      "light": "#hex_בהיר",
      "physio": "הסבר קצר — 2 משפטים",
      "eat": ["מאכל 1", "מאכל 2", "עד 6"],
      "avoid": ["דבר 1", "דבר 2", "עד 4"],
      "exercise": "המלצות כושר ספציפיות"
    }
  ]
}

כללים חשובים:
- plate: התאם את האחוזים לפרוטוקול הקליני לפי המחלות. סכום חייב להיות 100.
- bloodDeficits: רק ערכים שבאמת חריגים. אם אין — מערך ריק [].
- medicalCards: לפי מחלות הרקע בלבד. אם אין מחלות — כרטיס אחד "ירידה במשקל בריאה".
- אירוע מוחי/כריש → exercise: מתיחות, הליכות, שחייה מתונה. לא קפיצות.
- מחלת לב → exercise: אירובי מתון 50-70% דופק, לא HIIT, לא אימוני כוח עצימים.
- בלוטת תריס → exercise: יוגה, פילאטיס, הליכות. לא HIIT.
- עיכול → exercise: יוגה, פילאטיס.
- סוכרת/אינסולין → plate: veggies=50, protein=25, carbs=15, fat=10 (סכום=100).
- צבעים לדוגמה: לב="#e53e3e" light="#fff5f5", סוכרת="#d97706" light="#fffbeb", תריס="#0d9488" light="#f0fdfa", עיכול="#7c3aed" light="#faf5ff", כליות="#2563eb" light="#eff6ff", אונקולוגי="#059669" light="#ecfdf5"`

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })

      try {
        const text = msg.content[0].text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(text)
        return Response.json({ data: { ...parsed, name: clientName } })
      } catch(e) {
        console.error('welcomeDoc parse error:', e.message)
        return Response.json({ error: 'שגיאה בניתוח התוצאה' }, { status: 500 })
      }
    }

    // ── משוב יומן ──
    if (logs && !mode) {
      const gender = body.gender || 'נקבה'
      const isMale = gender === 'זכר'
      const genderNote = isMale
        ? 'הלקוח הוא גבר. גוף שני זכר בלבד.'
        : 'הלקוחה היא אישה. גוף שני נקבה בלבד.'
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content:
          'אתה אתי אטל — יועצת תזונה התנהגותית. כתוב משוב קצר ל-' + name + ' בעברית.\n'
          + genderNote + '\n'
          + 'בסס על נתונים אמיתיים בלבד. ציין מספרים ספציפיים.\n'
          + (body.nlpSummary ? 'NLP: ' + body.nlpSummary + '\n' : '')
          + 'יומן: ' + String(logs).substring(0, 900) + '\n\n'
          + '**✨ מה עבד השבוע** — הצלחה אחת ספציפית.\n\n'
          + '**🎯 משימות לדיוק** — מה היה בפועל מול היעד + הסבר פיזיולוגי.\n\n'
          + '**🚀 3 צעדים קטנים** — ספציפיים עם מספרים.\n\n'
          + '**💚 מסר** — משפט אחד מעצים.'
        }]
      })
      return Response.json({ result: msg.content[0].text })
    }

    // ── ניתוח פרופיל מלא ──
    if (mode === 'profile' && profile) {
      const p = profile
      const isAthlete = !!(p.exercise_type && /ריצ|כוח|אימון|ספורט|כושר/.test(String(p.exercise_type)))
      const isSedentary = p.activity === 'יושבני' || p.activity === 'קל'
      const bloodText = formatBlood(p.blood_tests, p.extra_blood_notes)
      const diary = foodDiary ? String(foodDiary).substring(0, 400) : ''
      const extraBlood = p.extra_blood_notes ? '⚠️ חובה לציין בסעיף הבדיקות: ' + p.extra_blood_notes : ''
      const stepsNote = isSedentary ? ', כולל 7,000 צעדים יומיים' : ''
      const athleteSection = isAthlete
        ? '**⚡ חלון ההזדמנויות הספורטיבי**\nתזונה לפני/אחרי אימון. מניעת קטבוליזם. חלבון ספציפי לסוג האימון.'
        : '**⚡ תמיכה במטבוליזם ובאנרגיה**\nפחמימות עודפות + חלבון נמוך = קפיצות אינסולין. הגוף מפרק שריר. BMR נמוך.'
      const bloodSection = '**🩺 מה אומרות הבדיקות**\nלכל ערך חריג: שם + ערך + טווח + הסבר + המלצה. אם דורש רופא — ציינו.'
      const baseData = 'נתונים על ' + name + ':\n'
        + 'גיל ' + s(p.age,'?') + ' | משקל ' + s(p.weight,'?') + ' | מטרה: ' + s(p.goal,'?') + ' | פעילות: ' + s(p.exercise_type,'לא') + '\n'
        + 'שינה: ' + s(p.sleep_quality,'?') + ' | קימה: ' + s(p.wake_time,'?') + ' | לחץ: ' + s(p.stress_level,'?') + '/10\n'
        + 'בוקר: ' + s(p.breakfast_habits,'?') + ' | קפה: ' + s(p.coffee_intake,'?') + ' | מים: ' + s(p.water_intake,'?') + '\n'
        + 'אכילה רגשית: ' + s(p.emotional_eating,'?') + ' | מה מעכב: ' + s(p.goal_obstacles,'?') + '\n'
        + 'מה רוצה: ' + s(p.main_goal,'?') + ' | מה חשוב: ' + s(p.important_values,'?') + '\n'
        + 'רפואי: ' + s(p.medical_history,'אין') + ' | תרופות: ' + s(p.medications,'אין') + '\n'
        + 'בדיקות: ' + bloodText + '\n'
        + (extraBlood ? extraBlood + '\n' : '')
        + (diary ? 'אכילה (3 ימים): ' + diary + '\n' : '')
      const systemPrompt = 'אתה אתי אטל - יועצת בריאות ותזונה התנהגותית בגישת NLP.\n'
        + 'כתבי ניתוח אישי חם ועמוק ל-' + name + ' בעברית, גוף שני נקבה.\n'
        + 'סגנון: אינטימי, מחבק. ללא טבלאות. עברית תקנית. אל תמציאי.\n'
        + 'כל סעיף 3-4 משפטים (בדיקות עד 6).\n\n'
      const [msg1, msg2] = await Promise.all([
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים:\n\n**✨ הקווים הזוהרים שלך**\n**🔍 מה באמת קורה**\n' + athleteSection }]
        }),
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt + baseData + '\nכתבי 3 סעיפים:\n\n' + bloodSection + '\n\n**🥗 המלצות תזונה ותוספים**\n\n**🎯 3 צעדים למחר** (ממוספרים, ריאליסטיים' + stepsNote + ')' }]
        })
      ])
      return Response.json({ result: msg1.content[0].text + '\n\n' + msg2.content[0].text })
    }

    return Response.json({ result: 'לא התקבלו נתונים' })
  } catch(err) {
    console.error('Error:', err.message)
    return Response.json({ result: 'שגיאה: ' + err.message }, { status: 500 })
  }
}

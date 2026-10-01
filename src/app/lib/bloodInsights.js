// ידע תזונתי על בדיקות דם — מקור אחד לכל האפליקציה.
// עד עכשיו הטווחים היו משוכפלים בשלושה קבצים ונטו לסטות זה מזה.

export const BLOOD_NAMES = {
  glucose: 'סוכר בצום', hba1c: 'המוגלובין A1C', cholesterol: 'כולסטרול כללי',
  hdl: 'HDL טוב', ldl: 'LDL רע', triglycerides: 'טריגליצרידים',
  hemoglobin: 'המוגלובין', ferritin: 'פריטין', iron: 'ברזל',
  folic_acid: 'חומצה פולית', vitamin_b12: 'ויטמין B12', vitamin_d: 'ויטמין D',
  calcium: 'סידן', zinc: 'אבץ', magnesium: 'מגנזיום',
  tsh: 'TSH', t3: 'T3', t4: 'T4', crp: 'CRP דלקת', esr: 'שקיעת דם',
  homocysteine: 'הומוציסטאין', alt: 'ALT כבד', ast: 'AST כבד',
  ggt: 'GGT כבד', alp: 'ALP זרחתית בסיסית', bilirubin: 'בילירובין',
  creatinine: 'קריאטינין', urea: 'אוריאה', uric_acid: 'חומצה אורית',
  estrogen: 'אסטרוגן', progesterone: 'פרוגסטרון', testosterone: 'טסטוסטרון',
  insulin: 'אינסולין', wbc: 'WBC', rbc: 'RBC', platelets: 'טסיות',
  blood_type: 'סוג דם', lactose_sensitivity: 'רגישות לקטוז',
  gluten_sensitivity: 'רגישות גלוטן', celiac: 'צליאק'
}

export const BLOOD_RANGES = {
  glucose: [70, 100], hba1c: [0, 5.7], cholesterol: [0, 200], hdl: [50, 999],
  ldl: [0, 100], triglycerides: [0, 150], hemoglobin: [12, 16], ferritin: [12, 150],
  iron: [60, 170], vitamin_b12: [200, 900], vitamin_d: [30, 100], tsh: [0.4, 4.0],
  crp: [0, 1.0], insulin: [2, 25], zinc: [70, 120], magnesium: [1.7, 2.2],
  calcium: [8.5, 10.5], alt: [0, 35], ast: [0, 40], ggt: [0, 38], alp: [40, 130],
  bilirubin: [0, 1.2], creatinine: [0.6, 1.2], uric_acid: [2.4, 6.0],
  homocysteine: [0, 15], folic_acid: [3, 20]
}

// לכל מדד חריג: מה זה אומר, מה עושים תזונתית, ומה לשאול בשיחה.
export const MARKER_INSIGHTS = {
  glucose: {
    high: {
      meaning: 'סוכר צום גבוה מעיד על עמידות מתפתחת לאינסולין.',
      nutrition: ['סדר אכילה: חלבון וירק קודם, פחמימה אחרונה', 'פחמימה מורכבת בלבד, בכמות מדודה', 'לא להשאיר ארוחה בלי חלבון'],
      ask: 'איך נראה הבוקר שלך — קפה בלבד, או ארוחה?'
    },
    low: {
      meaning: 'סוכר צום נמוך מתיישב עם נפילות אנרגיה ועם חשק מתוק בערב.',
      nutrition: ['ארוחות קבועות, בלי פערים ארוכים', 'חלבון בכל ארוחה', 'לא לדלג על בוקר'],
      ask: 'מתי ביום את מרגישה את הנפילה הכי חזק?'
    }
  },
  hba1c: {
    high: {
      meaning: 'ממוצע הסוכר בשלושת החודשים האחרונים מוגבר. זה לא יום בודד.',
      nutrition: ['צמצום סוכר מוסף ומשקאות ממותקים', 'פחמימה מורכבת GI נמוך', 'תנועה אחרי הארוחה הגדולה'],
      ask: 'מה את שותה במהלך היום חוץ ממים?'
    }
  },
  insulin: {
    high: {
      meaning: 'אינסולין גבוה בצום מופיע לפני שהסוכר עצמו עולה. זה הסימן המוקדם.',
      nutrition: ['חלבון לפני פחמימה', 'צמצום נשנושים בין הארוחות', 'שומן איכותי בכל ארוחה כדי להאט ספיגה'],
      ask: 'כמה פעמים ביום את אוכלת, כולל ביסים בדרך?'
    }
  },
  triglycerides: {
    high: {
      meaning: 'טריגליצרידים מושפעים יותר מסוכר ומפחמימות מעובדות מאשר משומן במזון.',
      nutrition: ['להוריד סוכר מוסף, מיצים ואלכוהול לפני הכול', 'דגים שמנים פעמיים בשבוע', 'פחמימה מורכבת במקום לבנה'],
      ask: 'מיצים, משקאות ממותקים או אלכוהול — כמה בשבוע?'
    }
  },
  hdl: {
    low: {
      meaning: 'HDL נמוך הוא חלק מהתמונה המטבולית, ועולה לאט יותר משאר המדדים.',
      nutrition: ['שמן זית, אבוקדו, אגוזים', 'דגים שמנים', 'פעילות אירובית סדירה — משפיעה כאן יותר מהתזונה'],
      ask: 'כמה תנועה יש לך בשבוע, גם הליכות?'
    }
  },
  ldl: {
    high: {
      meaning: 'LDL מוגבר מגיב לסיבים מסיסים ולהחלפת שומן רווי בשומן מהצומח.',
      nutrition: ['שיבולת שועל וקטניות — סיבים מסיסים', 'שומן מהצומח במקום חמאה ושמנת', 'ירקות בכל ארוחה'],
      ask: 'כמה קטניות נכנסות לשבוע שלך?'
    }
  },
  cholesterol: {
    high: {
      meaning: 'כולסטרול כללי לבדו אומר מעט. הפילוח ל-HDL, LDL וטריגליצרידים הוא מה שחשוב.',
      nutrition: ['סיבים מסיסים', 'שומן מהצומח', 'לבדוק את הפילוח ולא את המספר הכללי'],
      ask: 'יש לך את הפילוח המלא או רק את הכללי?'
    }
  },
  alt: {
    high: {
      meaning: 'ALT מוגבר הוא לרוב הביטוי הראשון של כבד שומני.',
      nutrition: ['פחות סוכר מוסף ופחמימות מעובדות', 'תבנית ים-תיכונית', 'ירידה הדרגתית ולא מהירה'],
      ask: 'היו תקופות של ירידה מהירה ועלייה חזרה?'
    }
  },
  ast: {
    high: {
      meaning: 'AST מוגבר מופיע גם מפעילות גופנית עצימה ולא רק מהכבד.',
      nutrition: ['אותו כיוון כמו ALT', 'לוודא שלא נמדד יום אחרי אימון כוח חזק'],
      ask: 'הייתה פעילות גופנית חזקה ביומיים שלפני הבדיקה?'
    }
  },
  ggt: {
    high: {
      meaning: 'GGT עולה ישירות מאלכוהול, ובנפרד גם מכבד שומני.',
      nutrition: ['לצמצם אלכוהול', 'להוריד סוכר מוסף ומשקאות ממותקים', 'קפה לא צריך להימנע ממנו'],
      ask: 'כמה אלכוהול בשבוע, כולל כוס יין בשישי?'
    }
  },
  alp: {
    high: {
      meaning: 'ALP מוגבר יחד עם GGT מכוון לדרכי המרה. לבדו הוא יכול להיות מהעצם.',
      nutrition: ['אין כיוון תזונתי ייחודי לפני שיודעים מה המקור'],
      ask: 'יש כאבי בטן ימנית עליונה אחרי ארוחות שמנות?'
    }
  },
  bilirubin: {
    high: {
      meaning: 'בילירובין מוגבר קל הוא לרוב ג׳ילברט, תופעה שפירה שמתעצמת בצום.',
      nutrition: ['לא להישאר שעות ארוכות בלי אוכל', 'שתייה מספקת'],
      ask: 'שמת לב שזה מחמיר בימים שאת כמעט לא אוכלת?'
    }
  },
  vitamin_d: {
    low: {
      meaning: 'ויטמין D נמוך נפוץ מאוד, ומשפיע על עייפות, מצב רוח וספיגת סידן.',
      nutrition: ['תוסף לפי הרופא, ותמיד עם ארוחה שיש בה שומן', 'דגים שמנים, ביצים', 'חשיפה קצרה לשמש'],
      ask: 'את לוקחת את התוסף על בטן ריקה או עם אוכל?'
    }
  },
  ferritin: {
    low: {
      meaning: 'פריטין נמוך הוא מאגר ברזל ריק, והוא מקדים ירידה בהמוגלובין.',
      nutrition: ['ברזל מהחי נספג הכי טוב', 'ויטמין C באותה ארוחה', 'לא קפה ותה עם הארוחה — הם חוסמים ספיגה'],
      ask: 'יש מחזור כבד או ממושך?'
    },
    high: {
      meaning: 'פריטין גבוה הוא גם חלבון דלקת, ולא בהכרח עודף ברזל.',
      nutrition: ['לבדוק מול CRP לפני שמסיקים'],
      ask: 'יש דלקת או מחלה פעילה בתקופה האחרונה?'
    }
  },
  iron: { low: { meaning: 'ברזל בודד משתנה מיום ליום. פריטין אמין יותר.', nutrition: ['ברזל עם ויטמין C', 'להפריד מקפה ותה'], ask: 'נבדק גם פריטין?' } },
  hemoglobin: {
    low: {
      meaning: 'המוגלובין נמוך הוא כבר אנמיה, לא רק מאגר ריק.',
      nutrition: ['ברזל, B12 וחומצה פולית יחד', 'ויטמין C בארוחה'],
      ask: 'יש עייפות, קוצר נשימה במאמץ או סחרחורות?'
    }
  },
  vitamin_b12: {
    low: {
      meaning: 'B12 נמוך שכיח בתזונה צמחונית, אחרי גיל 50 ובנטילת מטפורמין.',
      nutrition: ['תוסף לפי הרופא', 'מוצרי חלב, ביצים, דגים'],
      ask: 'את צמחונית או טבעונית? לוקחת מטפורמין?'
    }
  },
  folic_acid: { low: { meaning: 'חומצה פולית נמוכה מופיעה עם צריכה נמוכה של ירקות עליים.', nutrition: ['עלים ירוקים, קטניות, אבוקדו'], ask: 'כמה ירוק עלים נכנס לשבוע?' } },
  magnesium: {
    low: {
      meaning: 'מגנזיום נמוך מתיישב עם התכווצויות, שינה לא טובה וחשק למתוק.',
      nutrition: ['אגוזים, זרעים, קטניות, עלים ירוקים', 'שוקולד מריר באיכות טובה'],
      ask: 'יש התכווצויות ברגליים או קושי להירדם?'
    }
  },
  zinc: { low: { meaning: 'אבץ נמוך משפיע על חוש הטעם, על החיסון ועל ריפוי.', nutrition: ['בשר, קטניות, גרעיני דלעת'], ask: 'יש ירידה בחוש הטעם או פצעים שמחלימים לאט?' } },
  calcium: { low: { meaning: 'סידן בדם נשמר קבוע, ולכן ערך נמוך מצריך בדיקה ולא רק תזונה.', nutrition: ['מוצרי חלב, טחינה, שקדים, סרדינים', 'יחד עם ויטמין D'], ask: 'יש הימנעות ממוצרי חלב?' } },
  tsh: {
    high: {
      meaning: 'TSH גבוה מכוון לתת-פעילות של בלוטת התריס, שמאטה ירידה במשקל.',
      nutrition: ['סלניום — שני אגוזי ברזיל ליום', 'אבץ ויוד', 'אלטרוקסין על קיבה ריקה, בהפרדה מסידן וברזל'],
      ask: 'מתי את לוקחת את התרופה ביחס לאוכל ולתוספים?'
    },
    low: { meaning: 'TSH נמוך מכוון לפעילות יתר.', nutrition: ['להימנע מתוספי יוד עד בירור'], ask: 'יש דפיקות לב, רעד או ירידה לא מוסברת במשקל?' }
  },
  crp: {
    high: {
      meaning: 'CRP מוגבר הוא דלקת. גם דלקת נמוכה וכרונית מקשה על ירידה במשקל.',
      nutrition: ['תבנית ים-תיכונית', 'דגים שמנים, שמן זית, ירקות בצבעים', 'צמצום מעובד וסוכר'],
      ask: 'יש כאבים, מחלה פעילה או תקופה של לחץ גבוה?'
    }
  },
  homocysteine: { high: { meaning: 'הומוציסטאין מוגבר קשור לרוב לחסר ב-B12, B6 וחומצה פולית.', nutrition: ['עלים ירוקים, קטניות', 'B12 לפי בדיקה'], ask: 'נבדקו B12 וחומצה פולית?' } },
  uric_acid: {
    high: {
      meaning: 'חומצה אורית גבוהה מושפעת מפרוקטוז ומאלכוהול לא פחות מבשר.',
      nutrition: ['להוריד משקאות ממותקים ובירה', 'שתייה מרובה', 'לצמצם בשר אדום ופירות ים'],
      ask: 'היו התקפי כאב בבוהן או במפרק?'
    }
  },
  creatinine: { high: { meaning: 'קריאטינין גבוה מצריך בדיקת תפקוד כליות לפני כל שינוי בחלבון.', nutrition: ['לא להעלות חלבון עד בירור', 'הידרציה'], ask: 'יש רקע כלייתי במשפחה או לחץ דם?' } }
}

const num = v => {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

const hasText = (txt, words) => {
  const t = String(txt || '').toLowerCase()
  return words.some(w => t.includes(w))
}

// כל ערך חריג, עם הזווית התזונתית שלו
export function abnormalMarkers(bloodTests) {
  const out = []
  Object.entries(bloodTests || {}).forEach(([k, v]) => {
    const range = BLOOD_RANGES[k]
    const val = num(v)
    if (!range || val === null) return
    const isLow = val < range[0]
    const isHigh = val > range[1]
    if (!isLow && !isHigh) return
    const insight = (MARKER_INSIGHTS[k] || {})[isLow ? 'low' : 'high'] || null
    out.push({
      key: k,
      name: BLOOD_NAMES[k] || k,
      value: v,
      low: range[0],
      high: range[1],
      isLow,
      direction: isLow ? 'נמוך' : 'גבוה',
      meaning: insight ? insight.meaning : '',
      nutrition: insight ? insight.nutrition : [],
      ask: insight ? insight.ask : ''
    })
  })
  return out
}

// הצירופים. מחושבים כאן ולא על ידי המודל, כדי שאותם ערכים יתנו תמיד אותה תוצאה.
export function detectPatterns(bloodTests, ctx = {}) {
  const b = bloodTests || {}
  const tg = num(b.triglycerides), alt = num(b.alt), ast = num(b.ast)
  const ggt = num(b.ggt), hdl = num(b.hdl), glucose = num(b.glucose)
  const a1c = num(b.hba1c), insulin = num(b.insulin), alp = num(b.alp)
  const patterns = []

  const metabolic = []
  if (tg !== null && tg > 150) metabolic.push('טריגליצרידים ' + tg)
  if (alt !== null && alt > 35) metabolic.push('ALT ' + alt)
  if (ggt !== null && ggt > 38) metabolic.push('GGT ' + ggt)
  if (hdl !== null && hdl < 50) metabolic.push('HDL ' + hdl)
  if (glucose !== null && glucose >= 100) metabolic.push('גלוקוז ' + glucose)
  if (a1c !== null && a1c >= 5.7) metabolic.push('HbA1c ' + a1c)
  if (insulin !== null && insulin > 15) metabolic.push('אינסולין ' + insulin)

  const liverUp = (alt !== null && alt > 35) || (ggt !== null && ggt > 38) || (ast !== null && ast > 40)
  if (metabolic.length >= 3 && liverUp) {
    patterns.push({
      id: 'metabolic_liver',
      title: 'תמונה מטבולית — שווה בירור כבד שומני',
      markers: metabolic,
      referral: true,
      direction: 'סוכר מוסף, משקאות ממותקים ופחמימות מעובדות הם הכיוון המרכזי. תבנית ים-תיכונית, ירידה הדרגתית, וצמצום אלכוהול.',
      talk: 'זו הנקודה שבה שווה לשלוח לבירור, ובמקביל להתחיל בשינוי התזונתי. לא לחכות לתשובה מהרופא כדי להתחיל.'
    })
  } else if (metabolic.length >= 3) {
    patterns.push({
      id: 'metabolic_cluster',
      title: 'צירוף מטבולי ללא עליית אנזימי כבד',
      markers: metabolic,
      referral: false,
      direction: 'סדר אכילה, צמצום סוכר מוסף ופחמימות מעובדות, תוספת סיבים מסיסים בהדרגה.',
      talk: 'התמונה המטבולית כבר כאן אבל הכבד עדיין נקי. זה בדיוק החלון שבו העבודה הכי משתלמת.'
    })
  }

  if (ggt !== null && ggt > 38 && !patterns.length) {
    patterns.push({
      id: 'ggt_isolated',
      title: 'GGT מוגבר',
      markers: ['GGT ' + ggt].concat(alp !== null && alp > 130 ? ['ALP ' + alp] : []),
      referral: true,
      direction: 'סוכר מוסף, משקאות ממותקים ואלכוהול מעלים GGT ישירות. זה הכיוון הראשון לבדוק.',
      talk: 'לשאול על אלכוהול בעדינות ובלי האשמה — כולל כוס יין קבועה בשישי, שרבות לא סופרות.'
    })
  }

  const med = [ctx.medicalHistory, ctx.digestion, ctx.medications].join(' ')
  const removed = hasText(med, ['כריתת כיס מרה', 'הסרת כיס מרה', 'ללא כיס מרה', 'כולציסטקטומיה', 'אחרי ניתוח כיס מרה'])
  const stones = hasText(med, ['אבני מרה', 'אבנים בכיס המרה', 'כיס מרה'])
  if (removed) {
    patterns.push({
      id: 'gallbladder_removed',
      title: 'אחרי כריתת כיס מרה',
      markers: [],
      referral: false,
      direction: 'המרה מטפטפת כל היום ולא מגיעה במנה גדולה, לכן שומן מתון ומפוזר על פני כל הארוחות ולא מרוכז באחת. סיבים וקטניות מוסיפים בהדרגה.',
      talk: 'לשאול איזו ארוחה הכי קשה לה מאז הניתוח. זה בדרך כלל מצביע על הארוחה שבה השומן מרוכז.'
    })
  } else if (stones) {
    patterns.push({
      id: 'gallbladder_present',
      title: 'כיס מרה — אבנים או רקע',
      markers: [],
      referral: false,
      direction: 'שומן מתון בכל ארוחה הוא מה שמרוקן את כיס המרה. תפריט דל שומן מאוד והפסקות צום ארוכות משאירים אותו עומד ומעלים סיכון לאבנים. ירידה הדרגתית ולא מהירה.',
      talk: 'כאן דווקא צריך להיזהר מתפריט דל שומן מדי ומירידה מהירה. שניהם מגדילים סיכון לאבנים.'
    })
  }

  return patterns
}

// בדיקה חוצה-פרופיל: ארוחות קלות שהפכו לכמעט צום
export function fastingFlag(profile) {
  const p = profile || {}
  const breakfast = String(p.breakfast_habits || '')
  const dinner = String(p.dinner_habits || '')
  const emptyish = ['לא אוכלת', 'רק קפה', 'קפה בלבד', 'מדלגת', 'לא אוכל', 'כלום', 'צמה', 'צום']
  const hits = []
  if (hasText(breakfast, emptyish)) hits.push('בוקר')
  if (hasText(dinner, emptyish)) hits.push('ערב')
  if (!hits.length) return null
  return {
    title: 'ארוחות קלות שהפכו לכמעט צום',
    where: hits.join(' ו'),
    talk: 'הפסקות ארוכות בלי אוכל משאירות את המרה עומדת. גם בגישה של ארוחה עיקרית אחת, הקלות צריכות לכלול קצת שומן ולא רק ירק.'
  }
}

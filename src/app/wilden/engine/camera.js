// ─── המצלמה: למה היא לא נפתחה ───
// טהור. הדפדפן זורק שגיאות בשמות שונים (ספארי, כרום, אנדרואיד ישן), וכאן
// כולן הופכות לסיבה אחת עם משפט אחד שאומר להורה מה לעשות — ולא "המצלמה
// לא זמינה" שלא אומר כלום.

export const CAM_REASON = {
  NO_MEDIA: 'no-media',       // אין navigator.mediaDevices — דפדפן של וואטסאפ/אפליקציה
  INSECURE: 'insecure',       // http ולא https
  DENIED: 'denied',           // ההורה סירב, או שהאתר חסום בהגדרות
  NOT_FOUND: 'not-found',     // אין מצלמה
  BUSY: 'busy',               // אפליקציה אחרת מחזיקה אותה
  TIMEOUT: 'timeout',         // הבקשה לא נענתה בכלל
  OTHER: 'other',
}

export function reasonOf(err, env = {}) {
  if (!err) return CAM_REASON.OTHER
  const msg = typeof err === 'string' ? err : err.message || ''
  if (msg === 'no-media' || msg === 'no-camera') {
    return env.secure === false ? CAM_REASON.INSECURE : CAM_REASON.NO_MEDIA
  }
  if (msg === 'timeout') return CAM_REASON.TIMEOUT
  const name = err.name || ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return CAM_REASON.DENIED
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return CAM_REASON.NOT_FOUND
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return CAM_REASON.BUSY
    default:
      return CAM_REASON.OTHER
  }
}

// ── מה אומרים להורה ──
// כל סיבה — משפט אחד ופעולה אחת. אפשר לנסות שוב מתוך לחיצה בכל המקרים
// חוץ מדפדפן בלי מצלמה בכלל.
export const CAM_TEXT = {
  [CAM_REASON.NO_MEDIA]: {
    t: 'הדפדפן הזה לא נותן גישה למצלמה.',
    how: 'אם פתחתם את הקישור מוואטסאפ או מאפליקציה אחרת — פתחו אותו בספארי (באייפון) או בכרום (באנדרואיד).',
    retry: false,
  },
  [CAM_REASON.INSECURE]: {
    t: 'המצלמה עובדת רק בכתובת מאובטחת.',
    how: 'ודאו שהכתובת מתחילה ב-https.',
    retry: false,
  },
  [CAM_REASON.DENIED]: {
    t: 'המצלמה חסומה לאתר הזה.',
    how: 'באייפון: לחצו על aA בשורת הכתובת ← הגדרות אתר ← מצלמה ← אפשר. באנדרואיד: המנעול בשורת הכתובת ← הרשאות ← מצלמה.',
    retry: true,
  },
  [CAM_REASON.NOT_FOUND]: {
    t: 'לא נמצאה מצלמה בטלפון הזה.',
    how: 'ממשיכים בלי מצלמה — היצור יופיע על רקע מצויר.',
    retry: true,
  },
  [CAM_REASON.BUSY]: {
    t: 'המצלמה תפוסה על ידי אפליקציה אחרת.',
    how: 'סגרו את האפליקציה שמשתמשת במצלמה ונסו שוב.',
    retry: true,
  },
  [CAM_REASON.TIMEOUT]: {
    t: 'המצלמה לא ענתה.',
    how: 'נסו שוב. אם זה חוזר — סגרו את הלשונית ופתחו את הקישור מחדש.',
    retry: true,
  },
  [CAM_REASON.OTHER]: {
    t: 'המצלמה לא נפתחה.',
    how: 'נסו שוב, או סגרו את הלשונית ופתחו את הקישור מחדש.',
    retry: true,
  },
}

export const camText = reason => CAM_TEXT[reason] || CAM_TEXT[CAM_REASON.OTHER]

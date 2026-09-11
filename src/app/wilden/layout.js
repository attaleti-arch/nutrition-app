// ─── איך המשחק נראה כשהוא לא פתוח ───
// "במקום הלוגו בין הראש לצלחת תופיע כריכת המשחק, זה מרגיש לא נכון": הקישור
// יושב באתר של התזונה, ולכן ירש ממנו הכול — השם בכרטיסייה, האייקון שנשמר
// למסך הבית, והתמונה שוואטסאפ מראה כששולחים את הקישור. לילד שמקבל קישור
// למשחק זה נראה כמו אפליקציה של הורים.
//
// המסלול /wilden מקבל כאן זהות משלו. ב-Next כל שכבה מחליפה את מה שמעליה,
// אז מספיק להגדיר כאן, והאתר עצמו נשאר כמו שהוא.
//
// התמונות (public/wilden) חתוכות מהתמונות שלה: השער עם האור, והשומר לידו.

const base =
  process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || 'http://localhost:3000'

const TITLE = 'WILDEN'
const DESC = 'יוצאים החוצה, הולכים ברחובות אמיתיים, ותופסים את היצורים שהעולם איבד.'

export const metadata = {
  metadataBase: new URL(base),
  title: TITLE,
  description: DESC,
  manifest: '/wilden/manifest.json',
  icons: {
    icon: [
      { url: '/wilden/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/wilden/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/wilden/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // השם מתחת לאייקון כשמוסיפים למסך הבית באייפון
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: 'black-translucent' },
  openGraph: { type: 'website', title: TITLE, description: DESC, images: [{ url: '/wilden/cover.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/wilden/cover.jpg'] },
}

export const viewport = { themeColor: '#0F150F' }

export default function WildenLayout({ children }) {
  return children
}

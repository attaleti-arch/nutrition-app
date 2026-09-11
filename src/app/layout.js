// האייקון והמניפסט עברו מ-<head> ל-metadata, כדי שמסלול שרוצה זהות משלו
// (למשל /wilden) יוכל להחליף אותם בשכבה שלו. האתר עצמו לא משתנה.
export const metadata = {
  title: 'תוכנית תזונה | בין הראש לצלחת',
  description: 'אתי רפאלה זיתון',
  manifest: '/manifest.json',
  icons: { apple: '/logo-full.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{margin:0,padding:0,fontFamily:'Arial,sans-serif',direction:'rtl',background:'#fafafc'}}>
        {children}
      </body>
    </html>
  )
}

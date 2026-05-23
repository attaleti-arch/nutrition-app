import './globals.css'

export const metadata = {
  title: 'תוכנית תזונה | בין הראש לצלחת',
  description: 'אתי אטל – תוכנית תזונה אישית',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}

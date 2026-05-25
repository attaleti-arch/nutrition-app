export const metadata = {
  title: 'תוכנית תזונה | בין הראש לצלחת',
  description: 'אתי אטל',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{margin:0,padding:0,fontFamily:'Arial,sans-serif',direction:'rtl',background:'#f8fafc'}}>
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  title: 'תוכנית תזונה | בין הראש לצלחת',
  description: 'אתי אטל',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/logo-full.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{margin:0,padding:0,fontFamily:'Arial,sans-serif',direction:'rtl',background:'#fafafc'}}>
        {children}
      </body>
    </html>
  )
}

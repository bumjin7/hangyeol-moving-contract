import PWARegister from './PWARegister'

export const metadata = {
  title: '한결이사 계약서',
  description: '한결이사 이사 견적 및 계약서 작성 앱',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport = {
  themeColor: '#0b6fa4',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}

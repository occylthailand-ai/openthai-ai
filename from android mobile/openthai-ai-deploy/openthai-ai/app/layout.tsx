import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Openthai.ai — Multilingual Commerce Platform',
  description: 'AI-powered platform for Thai OTOP sellers to reach global markets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0, background: '#090704' }}>{children}</body>
    </html>
  )
}

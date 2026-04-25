import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc',
  description: '\ucd08\ub4f1\ud559\uc0dd\uc744 \uc704\ud55c \uc785\ubc95 \uc2dc\ubbac\ub808\uc774\uc158 \uac8c\uc784',
  manifest: '/manifest-student.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

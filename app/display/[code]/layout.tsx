import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '\uacf5\uac1c \ub514\uc2a4\ud50c\ub808\uc774 - \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc',
  manifest: '/manifest-display.json',
}

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-deep font-display overflow-hidden">
      {children}
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '\ud559\uc0dd \ud654\uba74 - \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc',
  manifest: '/manifest-student.json',
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream font-sans">
      {children}
    </div>
  )
}

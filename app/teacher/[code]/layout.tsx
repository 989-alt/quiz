import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '\uad50\uc0ac \ucf58\uc194 - \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc',
  manifest: '/manifest-teacher.json',
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-navy font-sans">
      <nav className="bg-slate-deep border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-title-2">\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc</span>
        <span className="text-mint text-sm">\uad50\uc0ac \ucf58\uc194</span>
      </nav>
      {children}
    </div>
  )
}

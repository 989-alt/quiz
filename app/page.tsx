import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-headline font-display font-bold text-navy">
          {'\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc'}
        </h1>
        <p className="text-title-2 text-neutral">
          {'\ucd08\ub4f1\ud559\uc0dd\uc744 \uc704\ud55c \uc785\ubc95 \uc2dc\ubbac\ub808\uc774\uc158 \uac8c\uc784'}
        </p>

        <div className="grid grid-cols-1 gap-4 mt-8">
          <Link
            href="/student/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-mint hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">{'\ud559\uc0dd \ud654\uba74'}</h2>
            <p className="text-neutral text-sm">{'\ubaa8\ubc14\uc77c/\ud0dc\ube14\ub9bf\uc6a9 \ud559\uc0dd \uc778\ud130\ud398\uc774\uc2a4'}</p>
          </Link>

          <Link
            href="/teacher/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-party-ruling hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">{'\uad50\uc0ac \ucf58\uc194'}</h2>
            <p className="text-neutral text-sm">{'\ub370\uc2a4\ud06c\ud1b1\uc6a9 \uad50\uc0ac \uad00\ub9ac \ud654\uba74'}</p>
          </Link>

          <Link
            href="/display/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-party-opposition hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">{'\uacf5\uac1c \ub514\uc2a4\ud50c\ub808\uc774'}</h2>
            <p className="text-neutral text-sm">{'TV/\ud504\ub85c\uc81d\ud130\uc6a9 \uc804\uccb4\ud654\uba74 \ub514\uc2a4\ud50c\ub808\uc774'}</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

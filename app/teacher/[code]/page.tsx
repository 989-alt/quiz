interface PageProps {
  params: { code: string }
}

export default function TeacherPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-deep rounded-card border border-white/10 p-8 text-center">
        <p className="text-mint text-sm mb-2">\uc138\uc158 \ucf54\ub4dc</p>
        <h2 className="text-title-1 font-bold text-white mb-4">{params.code.toUpperCase()}</h2>
        <p className="text-title-2 text-neutral">\uad50\uc0ac \ucf58\uc194 - \uc900\ube44 \uc911</p>
      </div>
    </main>
  )
}

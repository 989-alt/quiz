interface PageProps {
  params: { code: string }
}

export default function StudentPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-card shadow-sm p-6 text-center">
        <p className="text-neutral text-sm mb-2">{'\uc138\uc158 \ucf54\ub4dc'}</p>
        <h2 className="text-title-1 font-bold text-navy mb-4">{params.code.toUpperCase()}</h2>
        <p className="text-title-2 text-neutral">{'\ud559\uc0dd \ud654\uba74 - \uc900\ube44 \uc911'}</p>
      </div>
    </main>
  )
}

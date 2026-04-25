interface PageProps {
  params: { code: string }
}

export default function DisplayPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-slate-deep flex flex-col items-center justify-center">
      <div className="text-center">
        <p className="text-mint text-title-2 mb-4">\uc138\uc158 \ucf54\ub4dc</p>
        <h1 className="text-display-l font-bold text-white mb-6">{params.code.toUpperCase()}</h1>
        <p className="text-headline text-neutral">\uacf5\uac1c \ub514\uc2a4\ud50c\ub808\uc774 - \uc900\ube44 \uc911</p>
      </div>
    </main>
  )
}

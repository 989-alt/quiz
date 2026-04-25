interface PageProps {
  params: { code: string }
}

export default function StudentPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-card shadow-sm p-6 text-center">
        <p className="text-neutral text-sm mb-2">세션 코드</p>
        <h2 className="text-title-1 font-bold text-navy mb-4">{params.code.toUpperCase()}</h2>
        <p className="text-title-2 text-neutral">학생 화면 - 준비 중</p>
      </div>
    </main>
  )
}

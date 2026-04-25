import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-headline font-display font-bold text-navy">
          민주공화국 24시
        </h1>
        <p className="text-title-2 text-neutral">
          초등학생을 위한 입법 시뮬레이션 게임
        </p>

        <div className="grid grid-cols-1 gap-4 mt-8">
          <Link
            href="/student/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-mint hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">학생 화면</h2>
            <p className="text-neutral text-sm">모바일/태블릿용 학생 인터페이스</p>
          </Link>

          <Link
            href="/teacher/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-party-ruling hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">교사 콘솔</h2>
            <p className="text-neutral text-sm">데스크톱용 교사 관리 화면</p>
          </Link>

          <Link
            href="/display/demo"
            className="block p-6 bg-white rounded-card border border-gray-200 hover:border-party-opposition hover:shadow-md transition-all"
          >
            <h2 className="text-title-1 font-semibold text-navy mb-2">공개 디스플레이</h2>
            <p className="text-neutral text-sm">TV/프로젝터용 전체화면 디스플레이</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

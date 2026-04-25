'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/lib/store/sessionStore'

export default function TeacherLandingPage() {
  const router = useRouter()
  const initDeviceToken = useSessionStore((s) => s.initDeviceToken)
  const setSession = useSessionStore((s) => s.setSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const teacherId = initDeviceToken()
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '\uc138\uc158 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      setSession(data.session)
      router.push(`/teacher/${data.session.class_code}`)
    } catch {
      setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-deep rounded-card border border-white/10 p-8 text-center space-y-6">
        <div>
          <h1 className="text-headline font-bold text-white mb-2">
            \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc
          </h1>
          <p className="text-neutral text-sm">\uad50\uc0ac \ucf58\uc194</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 rounded-md px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 bg-mint text-navy font-semibold rounded-lg hover:bg-mint/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-title-2"
        >
          {loading ? '\uc138\uc158 \uc0dd\uc131 \uc911...' : '\uc0c8 \uc138\uc158 \ub9cc\ub4e4\uae30'}
        </button>
      </div>
    </main>
  )
}

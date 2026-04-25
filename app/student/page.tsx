'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validateClassCode } from '@/lib/classCode'

export default function StudentLandingPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleJoin() {
    const upper = code.trim().toUpperCase()
    if (!validateClassCode(upper)) {
      setError('\uc720\ud6a8\ud55c \ucf54\ub4dc \ud615\uc2dd\uc774 \uc544\ub2d9\ub2c8\ub2e4. (ABC-123)')
      return
    }
    router.push(`/student/${upper}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-card shadow-sm p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-headline font-bold text-navy mb-2">
            \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc
          </h1>
          <p className="text-neutral text-sm">\ud559\uc0dd \uc785\uc7a5</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-navy">
            \uc138\uc158 \ucf54\ub4dc \uc785\ub825
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="ABC-123"
            maxLength={7}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-title-1 font-mono tracking-widest focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <button
          onClick={handleJoin}
          className="w-full py-4 bg-navy text-white font-semibold rounded-lg hover:bg-navy/90 transition-colors text-title-2"
        >
          \uc785\uc7a5\ud558\uae30
        </button>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useSessionChannel } from '@/lib/hooks/useSessionChannel'
import type { Player, Session } from '@/lib/types'

interface PageProps {
  params: { code: string }
}

export default function TeacherPage({ params }: PageProps) {
  const code = params.code.toUpperCase()
  const { setSession, setPlayers, players, session, initDeviceToken, deviceToken } =
    useSessionStore()

  const [loading, setLoading] = useState(true)
  const [startLoading, setStartLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useSessionChannel(code)

  // Bootstrap session on mount
  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await fetch(`/api/sessions/${code}`)
        if (!res.ok) {
          setError('\uc138\uc158\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.')
          return
        }
        const data = await res.json()
        setSession(data.session as Session)
        setPlayers(data.players as Player[])
      } catch {
        setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const teacherId = deviceToken ?? initDeviceToken()

  const pendingPlayers = players.filter((p) => !p.is_online)
  const approvedPlayers = players.filter((p) => p.is_online)

  async function handleApprove(playerId: string, action: 'approve' | 'reject') {
    setApproveLoading(playerId)
    try {
      await fetch(`/api/sessions/${code}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teacherId, action }),
      })
    } catch {
      // silent — realtime will refresh
    } finally {
      setApproveLoading(null)
    }
  }

  async function handleStart() {
    setStartLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '\uc2dc\uc791\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      setSession(data.session as Session)
    } catch {
      setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setStartLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint border-t-transparent" />
      </main>
    )
  }

  const isWaiting = !session || session.status === 'waiting'
  const canStart = approvedPlayers.length >= 2

  return (
    <main className="min-h-screen bg-navy flex flex-col items-start p-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-deep rounded-card border border-white/10 p-6 flex items-center justify-between">
          <div>
            <p className="text-mint text-sm">\uc138\uc158 \ucf54\ub4dc</p>
            <h2 className="text-title-1 font-bold text-white font-mono">{code}</h2>
          </div>
          <div className="text-right">
            <p className="text-neutral text-sm">\uc2b9\uc778\ub41c \ud559\uc0dd</p>
            <p className="text-white text-title-1 font-bold">{approvedPlayers.length} / 10</p>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Pending queue */}
        {isWaiting && (
          <div className="bg-slate-deep rounded-card border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-semibold">
              \uc785\uc7a5 \ub300\uae30 ({pendingPlayers.length})
            </h3>
            {pendingPlayers.length === 0 ? (
              <p className="text-neutral text-sm">\ub300\uae30 \uc911\uc778 \ud559\uc0dd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</p>
            ) : (
              <ul className="space-y-2">
                {pendingPlayers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between bg-navy rounded-lg px-4 py-3"
                  >
                    <span className="text-white font-medium">{p.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(p.id, 'approve')}
                        disabled={approveLoading === p.id}
                        className="px-3 py-1 bg-mint text-navy text-sm font-semibold rounded hover:bg-mint/90 disabled:opacity-50 transition-colors"
                      >
                        \uc2b9\uc778
                      </button>
                      <button
                        onClick={() => handleApprove(p.id, 'reject')}
                        disabled={approveLoading === p.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        \uac70\uc808
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Approved players */}
        {isWaiting && approvedPlayers.length > 0 && (
          <div className="bg-slate-deep rounded-card border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-semibold">
              \uc785\uc7a5 \uc644\ub8cc ({approvedPlayers.length})
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {approvedPlayers.map((p) => (
                <li key={p.id} className="bg-navy rounded-lg px-4 py-2">
                  <span className="text-white text-sm">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Start button */}
        {isWaiting && (
          <button
            onClick={handleStart}
            disabled={!canStart || startLoading}
            className="w-full py-4 bg-party-ruling text-white font-bold rounded-lg hover:bg-party-ruling/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-title-2"
          >
            {startLoading
              ? '\uc2dc\uc791 \uc911...'
              : canStart
              ? `\uc138\uc158 \uc2dc\uc791 (${approvedPlayers.length}\uba85)`
              : '\ud559\uc0dd 2\uba85 \uc774\uc0c1 \uc2b9\uc778 \ud544\uc694'}
          </button>
        )}

        {/* Game in progress */}
        {!isWaiting && (
          <div className="bg-slate-deep rounded-card border border-white/10 p-8 text-center">
            <p className="text-mint text-sm mb-2">\ud604\uc7ac \ub2e8\uacc4</p>
            <p className="text-white text-title-1 font-bold">
              {session?.status?.toUpperCase()}
            </p>
            <p className="text-neutral text-sm mt-4">
              \ub2e8\uacc4 \uc81c\uc5b4\ub294 T05\uc5d0\uc11c \uad6c\ud604 \uc608\uc815
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

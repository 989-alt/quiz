'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useSessionChannel } from '@/lib/hooks/useSessionChannel'
import type { Player } from '@/lib/types'

interface PageProps {
  params: { code: string }
}

type JoinState = 'entry' | 'pending' | 'role_reveal' | 'playing'

export default function StudentPage({ params }: PageProps) {
  const code = params.code.toUpperCase()
  const [joinState, setJoinState] = useState<JoinState>('entry')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { initDeviceToken, setCurrentPlayer, setPlayers, currentPlayer, players, session } =
    useSessionStore()

  useSessionChannel(code)

  // Watch for approval
  useEffect(() => {
    if (joinState !== 'pending' || !currentPlayer) return
    const updated = players.find((p) => p.id === currentPlayer.id)
    if (updated?.is_online) {
      setCurrentPlayer(updated)
      setJoinState('role_reveal')
    }
  }, [players, currentPlayer, joinState, setCurrentPlayer])

  // Watch for game start
  useEffect(() => {
    if (joinState === 'role_reveal' && session?.status?.startsWith('stage')) {
      setJoinState('playing')
    }
  }, [session, joinState])

  async function handleJoin() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('\uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const deviceToken = initDeviceToken()
      const res = await fetch(`/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, deviceToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '\uc785\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      // Bootstrap session data
      const sessionRes = await fetch(`/api/sessions/${code}`)
      const sessionData = await sessionRes.json()
      if (sessionData.players) setPlayers(sessionData.players as Player[])

      const me = sessionData.players?.find((p: Player) => p.id === data.playerId)
      if (me) setCurrentPlayer(me)

      setJoinState('pending')
    } catch {
      setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setLoading(false)
    }
  }

  if (joinState === 'entry') {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-card shadow-sm p-8 space-y-6">
          <div className="text-center">
            <p className="text-neutral text-sm mb-1">\uc138\uc158 \ucf54\ub4dc</p>
            <h2 className="text-title-1 font-bold text-navy">{code}</h2>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-navy">\uc774\ub984 \uc785\ub825</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="\ub098\uc758 \uc774\ub984"
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-title-2 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 bg-navy text-white font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-colors text-title-2"
          >
            {loading ? '\uc785\uc7a5 \uc2e0\uccad \uc911...' : '\uc785\uc7a5 \uc2e0\uccad'}
          </button>
        </div>
      </main>
    )
  }

  if (joinState === 'pending') {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-card shadow-sm p-8 text-center space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint border-t-transparent mx-auto" />
          <div>
            <h2 className="text-title-1 font-bold text-navy mb-2">\uc2b9\uc778 \ub300\uae30 \uc911</h2>
            <p className="text-neutral text-sm">
              \uad50\uc0ac\ub2d8\uc774 \uc785\uc7a5\uc744 \uc2b9\uc778\ud560 \ub54c\uae4c\uc9c0 \uae30\ub2e4\ub824\uc8fc\uc138\uc694.
            </p>
          </div>
          <p className="text-mint font-mono text-sm">{name}</p>
        </div>
      </main>
    )
  }

  if (joinState === 'role_reveal' && currentPlayer) {
    const partyLabel =
      currentPlayer.party === '\uc5ec'
        ? '\uc5ec\ub2f9 (\uc9d1\uad8c\uc5ec\ub2f9)'
        : currentPlayer.party === '\uc57c'
        ? '\uc57c\ub2f9 (\uc81c1\uc57c\ub2f9)'
        : '\ubb34\uc18c\uc18d'

    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-card shadow-sm p-8 text-center space-y-4">
          <h2 className="text-title-1 font-bold text-navy">\uc5ed\ud560 \ubc30\uc815!</h2>
          <div className="bg-navy rounded-lg p-6 space-y-2">
            <p className="text-mint text-sm">\uc774\ub984</p>
            <p className="text-white text-title-1 font-bold">{currentPlayer.name}</p>
            <p className="text-mint text-sm mt-3">\uc815\ub2f9</p>
            <p className="text-white font-semibold">{partyLabel}</p>
            <p className="text-mint text-sm mt-2">\uc120\uac70\uad6c</p>
            <p className="text-white">{currentPlayer.district}</p>
            <p className="text-mint text-sm mt-2">\uacf5\uc57d \ucf54\ub4dc</p>
            <p className="text-white font-mono">{currentPlayer.pledge_code}</p>
          </div>
          <p className="text-neutral text-sm">\uad50\uc0ac\ub2d8\uc774 \uac8c\uc784\uc744 \uc2dc\uc791\ud560 \ub54c\uae4c\uc9c0 \uae30\ub2e4\ub824\uc8fc\uc138\uc694.</p>
        </div>
      </main>
    )
  }

  // playing state
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-card shadow-sm p-6 text-center">
        <p className="text-neutral text-sm mb-2">\uc138\uc158 \ucf54\ub4dc</p>
        <h2 className="text-title-1 font-bold text-navy mb-4">{code}</h2>
        <p className="text-title-2 text-neutral">\uac8c\uc784 \uc9c4\ud589 \uc911 - T05\uc5d0\uc11c \uad6c\ud604 \uc608\uc815</p>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useGameActor } from '@/lib/hooks/useGameActor'
import { StageIndicator } from '@/components/layout/StageIndicator'
import { Timer } from '@/components/ui/Timer'
import type { Player, Bill, VoteChoice } from '@/lib/types'
import type { GameContext } from '@/lib/machines/gameMachine'
import type { StageNumber } from '@/types'

interface PageProps {
  params: { code: string }
}

type JoinState = 'entry' | 'pending' | 'role_reveal' | 'playing'

const PARTY_BG: Record<string, string> = {
  '\uc5ec': 'bg-party-ruling',
  '\uc57c': 'bg-party-opposition',
  '\ubb34': 'bg-party-independent',
}

const PARTY_SHORT: Record<string, string> = {
  '\uc5ec': '\uc5ec\ub2f9',
  '\uc57c': '\uc57c\ub2f9',
  '\ubb34': '\ubb34\uc18c\uc18d',
}

const PARTY_LABEL: Record<string, string> = {
  '\uc5ec': '\uc5ec\ub2f9 (\uc9d1\uad8c\uc5ec\ub2f9)',
  '\uc57c': '\uc57c\ub2f9 (\uc81c1\uc57c\ub2f9)',
  '\ubb34': '\ubb34\uc18c\uc18d',
}

const AREA_BADGE: Record<string, string> = {
  '\uad50\uc721': 'bg-blue-100 text-blue-700',
  '\ud658\uacbd': 'bg-green-100 text-green-700',
  '\uacbd\uc81c': 'bg-orange-100 text-orange-700',
}

const STAGE_NUM: Record<string, StageNumber> = {
  stage1: 1, stage2: 2, stage3: 3, stage4: 4, stage5: 5,
}

// ── Hooks ─────────────────────────────────────────────────

function useCountdown(endsAt?: string | null): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!endsAt) { setSeconds(0); return }
    const tick = () =>
      setSeconds(Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return seconds
}

// ── Helpers ───────────────────────────────────────────────

function pledgeMatchArea(pledgeCode: string | null, area: string): boolean {
  if (!pledgeCode) return false
  const map: Record<string, string> = {
    EDU: '\uad50\uc721',
    ENV: '\ud658\uacbd',
    ECO: '\uacbd\uc81c',
  }
  return map[pledgeCode.slice(0, 3)] === area
}

// ── Stage 1: 법안 발의 ────────────────────────────────────

function Stage1Content({ bills, player }: { bills: Bill[]; player: Player }) {
  return (
    <div className="space-y-4">
      <div className="bg-navy rounded-xl p-4 text-white space-y-3">
        <p className="text-mint text-xs font-semibold uppercase tracking-wide">\ub0b4 \uc5ed\ud560</p>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
              PARTY_BG[player.party ?? '\ubb34'] ?? 'bg-party-independent'
            }`}
          >
            {PARTY_SHORT[player.party ?? '\ubb34']}
          </span>
          <span className="text-title-2 font-bold">{player.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-mint text-xs">\uc120\uac70\uad6c</p>
            <p className="font-semibold">{player.district ?? '-'}</p>
          </div>
          <div>
            <p className="text-mint text-xs">\uacf5\uc57d</p>
            <p className="font-semibold font-mono">{player.pledge_code ?? '-'}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">
          \ubc95\uc548 \ubaa9\ub85d ({bills.length})
        </h3>
        {bills.length === 0 ? (
          <p className="text-neutral text-sm text-center py-8">
            \ubc95\uc548 \ub4f1\ub85d \ub300\uae30 \uc911...
          </p>
        ) : (
          <div className="space-y-2">
            {bills.map((bill) => {
              const isMatch = pledgeMatchArea(player.pledge_code, bill.area)
              return (
                <div
                  key={bill.id}
                  className={`bg-white rounded-lg p-3 border ${
                    isMatch ? 'border-mint shadow-sm' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-neutral">{bill.bill_code}</span>
                        {bill.important && (
                          <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                            \uc911\uc694
                          </span>
                        )}
                        {isMatch && (
                          <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-semibold">
                            \ub0b4 \uacf5\uc57d
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-navy text-sm">{bill.title}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        AREA_BADGE[bill.area] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {bill.area}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stage 2: 위원회 심사 ──────────────────────────────────

function Stage2Content({ bills, player }: { bills: Bill[]; player: Player }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral">
        \ub2f9\uc2e0\uc758 \uc120\uac70\uad6c\uc640 \uacf5\uc57d\uc5d0 \uc5f0\uad00\ub41c \ubc95\uc548\uc744 \uc8fc\ubaa9\ud558\uc138\uc694.
      </p>
      {bills.length === 0 ? (
        <p className="text-neutral text-sm text-center py-8">\ubc95\uc548 \ub85c\ub529 \uc911...</p>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const isMatch = pledgeMatchArea(player.pledge_code, bill.area)
            return (
              <div
                key={bill.id}
                className={`bg-white rounded-xl p-4 border ${
                  isMatch ? 'border-mint' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs text-neutral">{bill.bill_code}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      AREA_BADGE[bill.area] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {bill.area}
                  </span>
                  {isMatch && (
                    <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-semibold ml-auto">
                      \ub0b4 \uacf5\uc57d \uc5f0\uad00
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-navy mb-2">{bill.title}</h4>
                <p className="text-sm text-neutral leading-relaxed line-clamp-4">{bill.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Stage 3: 본회의 토론 ──────────────────────────────────

type SpeechStatus = 'idle' | 'pending' | 'approved' | 'speaking' | 'done'

function Stage3Content({ code, deviceToken }: { code: string; deviceToken: string | null }) {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRequest() {
    if (!deviceToken) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${code}/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '\uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      setStatus((data.status as SpeechStatus) ?? 'pending')
    } catch {
      setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: '\ub300\uae30 \uc911', color: 'text-yellow-700', bg: 'bg-yellow-50' },
    approved: { label: '\uc2b9\uc778\ub428', color: 'text-green-700', bg: 'bg-green-50' },
    speaking: { label: '\ubc1c\uc5b8 \uc911', color: 'text-blue-700', bg: 'bg-blue-50' },
    done: { label: '\ubc1c\uc5b8 \uc644\ub8cc', color: 'text-neutral', bg: 'bg-gray-50' },
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 border border-gray-100 text-center space-y-4">
        <div>
          <p className="text-navy font-bold text-title-2 mb-1">\ubc1c\uc5b8 \uc2e0\uccad</p>
          <p className="text-neutral text-sm">
            \ubc1c\uc5b8\uc744 \ud558\uace0 \uc2f6\uc73c\uba74 \uc2e0\uccad \ubc84\ud2bc\uc744 \ub20c\ub7ec\uc8fc\uc138\uc694.
          </p>
        </div>

        {status === 'idle' ? (
          <button
            onClick={handleRequest}
            disabled={loading}
            className="w-full py-4 bg-navy text-white font-bold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors text-title-2"
          >
            {loading ? '\uc2e0\uccad \uc911...' : '\ubc1c\uc5b8 \uc2e0\uccad'}
          </button>
        ) : (
          <div className={`rounded-xl p-4 ${STATUS_CONFIG[status]?.bg ?? 'bg-gray-50'}`}>
            <p className={`font-bold text-title-2 ${STATUS_CONFIG[status]?.color ?? 'text-navy'}`}>
              {STATUS_CONFIG[status]?.label ?? status}
            </p>
            <p className="text-neutral text-sm mt-1">
              \uad50\uc0ac\ub2d8\uc774 \ubc1c\uc5b8 \uae30\ud68c\ub97c \uc5f4\uc5b4\ub4dc\ub9bd\ub2c8\ub2e4.
            </p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-sm text-neutral leading-relaxed">
          \ud1a0\ub860 \ub2e8\uacc4\uc5d0\uc11c\ub294 \ubc1c\uc758\ub41c \ubc95\uc548\uc5d0 \ub300\ud55c \uc758\uacac\uc744 \ub098\ub204\uc5b4\uc8fc\uc138\uc694.
          \ubc1c\uc5b8\uc774 \uc2b9\uc778\ub418\uba74 \uc810\uc218\uc5d0 \ubc18\uc601\ub429\ub2c8\ub2e4.
        </p>
      </div>
    </div>
  )
}

// ── Stage 4 & 5: 표결 ─────────────────────────────────────

const VOTE_CHOICES: { value: VoteChoice; label: string; active: string; idle: string }[] = [
  {
    value: '\ucc2c',
    label: '\ucc2c\uc131',
    active: 'bg-green-500 text-white border-green-500',
    idle: 'border-green-500 text-green-600 hover:bg-green-50',
  },
  {
    value: '\ubc18',
    label: '\ubc18\ub300',
    active: 'bg-red-500 text-white border-red-500',
    idle: 'border-red-400 text-red-600 hover:bg-red-50',
  },
  {
    value: '\uae30\uad8c',
    label: '\uae30\uad8c',
    active: 'bg-gray-400 text-white border-gray-400',
    idle: 'border-gray-300 text-neutral hover:bg-gray-50',
  },
]

function VoteContent({
  code,
  bills,
  stage,
  deviceToken,
}: {
  code: string
  bills: Bill[]
  stage: 4 | 5
  deviceToken: string | null
}) {
  const [votes, setVotes] = useState<Record<string, VoteChoice>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function handleVote(billId: string, choice: VoteChoice) {
    if (!deviceToken || loading[billId]) return
    setLoading((prev) => ({ ...prev, [billId]: true }))
    try {
      const res = await fetch(`/api/sessions/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, choice, stage, deviceToken }),
      })
      if (res.ok) {
        setVotes((prev) => ({ ...prev, [billId]: choice }))
      }
    } finally {
      setLoading((prev) => ({ ...prev, [billId]: false }))
    }
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral">
          {stage === 5
            ? '\uc7ac\uc758\uacb0 \ub300\uc0c1 \ubc95\uc548\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.'
            : '\ubc95\uc548 \ub85c\ub529 \uc911...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral">
        {stage === 4
          ? '\uac01 \ubc95\uc548\uc5d0 \ucc2c\uc131 / \ubc18\ub300 / \uae30\uad8c \uc911 \ud558\ub098\ub97c \uc120\ud0dd\ud558\uc138\uc694.'
          : '\uc7ac\uc758\uacb0 \ub300\uc0c1 \ubc95\uc548\uc5d0 \ub2e4\uc2dc \ud22c\ud45c\ud558\uc138\uc694.'}
      </p>
      {bills.map((bill) => {
        const myVote = votes[bill.id]
        const isLoading = loading[bill.id]
        return (
          <div key={bill.id} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-neutral">{bill.bill_code}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      AREA_BADGE[bill.area] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {bill.area}
                  </span>
                </div>
                <p className="font-bold text-navy">{bill.title}</p>
              </div>
              {myVote && (
                <span className="text-xs px-2 py-1 bg-navy/10 text-navy rounded font-semibold shrink-0">
                  \ud22c\ud45c\uc644\ub8cc
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {VOTE_CHOICES.map(({ value, label, active, idle }) => (
                <button
                  key={value}
                  onClick={() => handleVote(bill.id, value)}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-sm transition-all disabled:opacity-50 ${
                    myVote === value ? active : idle
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Ended ─────────────────────────────────────────────────

function EndedContent({ player }: { player: Player }) {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="text-5xl">{'\uD83C\uDFC6'}</div>
      <h2 className="text-title-1 font-bold text-navy">\uac8c\uc784 \uc885\ub8cc</h2>
      <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-3">
        <p className="text-neutral text-sm">\ucd5c\uc885 \uc810\uc218</p>
        <p className="text-4xl font-bold text-navy">{player.score}\uc810</p>
        {player.rank != null && (
          <>
            <p className="text-neutral text-sm">\uc21c\uc704</p>
            <p className="text-title-1 font-semibold text-mint">{player.rank}\uc704</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Playing Screen ─────────────────────────────────────────

function PlayingScreen({
  code,
  currentPlayer,
  stageValue,
  context,
  deviceToken,
  stageEndsAt,
}: {
  code: string
  currentPlayer: Player | null
  stageValue: string
  context: GameContext
  deviceToken: string | null
  stageEndsAt?: string | null
}) {
  const timerSeconds = useCountdown(stageEndsAt)
  const stageNum = STAGE_NUM[stageValue]

  if (!currentPlayer) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-neutral">\uc5f0\uacb0 \uc911...</p>
      </main>
    )
  }

  const partyBg = PARTY_BG[currentPlayer.party ?? '\ubb34'] ?? 'bg-party-independent'
  const partyShort = PARTY_SHORT[currentPlayer.party ?? '\ubb34']

  const stage5Bills = context.bills.filter((b) => b.recall_used && b.stage5_result === null)

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white shadow-sm px-4 py-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${partyBg}`}>
            {partyShort}
          </span>
          <span className="font-semibold text-navy text-sm">{currentPlayer.name}</span>
          <span className="text-neutral text-xs hidden sm:block">{currentPlayer.district}</span>
          <div className="ml-auto flex items-center gap-2">
            {stageNum && stageEndsAt && (
              <Timer seconds={timerSeconds} className="text-lg" />
            )}
            <span className="text-xs bg-navy/10 text-navy rounded px-2 py-0.5 font-mono font-semibold">
              {currentPlayer.score}\uc810
            </span>
          </div>
        </div>
        {stageNum && (
          <div className="overflow-x-auto -mx-1 px-1">
            <StageIndicator
              currentStage={stageNum}
              className="scale-[0.82] origin-left min-w-max"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        {stageValue === 'stage1' && (
          <Stage1Content bills={context.bills} player={currentPlayer} />
        )}
        {stageValue === 'stage2' && (
          <Stage2Content bills={context.bills} player={currentPlayer} />
        )}
        {stageValue === 'stage3' && (
          <Stage3Content code={code} deviceToken={deviceToken} />
        )}
        {stageValue === 'stage4' && (
          <VoteContent
            code={code}
            bills={context.bills}
            stage={4}
            deviceToken={deviceToken}
          />
        )}
        {stageValue === 'stage5' && (
          <VoteContent
            code={code}
            bills={stage5Bills}
            stage={5}
            deviceToken={deviceToken}
          />
        )}
        {stageValue === 'ended' && <EndedContent player={currentPlayer} />}
      </div>
    </main>
  )
}

// ── Main Page ──────────────────────────────────────────────

export default function StudentPage({ params }: PageProps) {
  const code = params.code.toUpperCase()
  const [joinState, setJoinState] = useState<JoinState>('entry')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    initDeviceToken,
    setCurrentPlayer,
    setPlayers,
    setSession,
    currentPlayer,
    players,
    session,
    deviceToken,
  } = useSessionStore()

  // Replaces useSessionChannel — handles Realtime + XState in one hook
  const { stageValue, context } = useGameActor(code)

  // Detect approval
  useEffect(() => {
    if (joinState !== 'pending' || !currentPlayer) return
    const updated = players.find((p) => p.id === currentPlayer.id)
    if (updated?.is_online) {
      setCurrentPlayer(updated)
      setJoinState('role_reveal')
    }
  }, [players, currentPlayer, joinState, setCurrentPlayer])

  // role_reveal → playing when teacher starts the game
  useEffect(() => {
    if (joinState === 'role_reveal' && stageValue !== 'waiting' && stageValue !== 'ended') {
      setJoinState('playing')
    }
  }, [stageValue, joinState])

  async function handleJoin() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('\uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const token = initDeviceToken()
      const res = await fetch(`/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, deviceToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '\uc785\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      const sessionRes = await fetch(`/api/sessions/${code}`)
      const sessionData = await sessionRes.json()
      if (sessionData.players) setPlayers(sessionData.players as Player[])
      if (sessionData.session) setSession(sessionData.session)
      const me = sessionData.players?.find((p: Player) => p.id === data.playerId)
      if (me) setCurrentPlayer(me)
      setJoinState('pending')
    } catch {
      setError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setLoading(false)
    }
  }

  // ── Entry ──
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
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="\ub098\uc758 \uc774\ub984"
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-title-2 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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

  // ── Pending ──
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

  // ── Role reveal ──
  if (joinState === 'role_reveal' && currentPlayer) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-card shadow-sm p-8 text-center space-y-4">
          <h2 className="text-title-1 font-bold text-navy">\uc5ed\ud560 \ubc30\uc815!</h2>
          <div className="bg-navy rounded-xl p-6 space-y-2 text-left">
            <p className="text-mint text-xs">\uc774\ub984</p>
            <p className="text-white text-title-2 font-bold">{currentPlayer.name}</p>
            <p className="text-mint text-xs mt-3">\uc815\ub2f9</p>
            <p className="text-white font-semibold">
              {PARTY_LABEL[currentPlayer.party ?? '\ubb34'] ?? '\ubb34\uc18c\uc18d'}
            </p>
            <p className="text-mint text-xs mt-2">\uc120\uac70\uad6c</p>
            <p className="text-white">{currentPlayer.district}</p>
            <p className="text-mint text-xs mt-2">\uacf5\uc57d \ucf54\ub4dc</p>
            <p className="text-white font-mono">{currentPlayer.pledge_code}</p>
          </div>
          <p className="text-neutral text-sm">
            \uad50\uc0ac\ub2d8\uc774 \uac8c\uc784\uc744 \uc2dc\uc791\ud560 \ub54c\uae4c\uc9c0 \uae30\ub2e4\ub824\uc8fc\uc138\uc694.
          </p>
        </div>
      </main>
    )
  }

  // ── Playing ──
  return (
    <PlayingScreen
      code={code}
      currentPlayer={currentPlayer}
      stageValue={stageValue}
      context={context}
      deviceToken={deviceToken}
      stageEndsAt={session?.stage_ends_at}
    />
  )
}

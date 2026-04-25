'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useGameActor } from '@/lib/hooks/useGameActor'
import { StageIndicator } from '@/components/layout/StageIndicator'
import { Timer } from '@/components/ui/Timer'
import { STAGE_LABELS } from '@/lib/machines/gameMachine'
import type { Player, Session, SpeechRequest } from '@/lib/types'
import type { StageNumber } from '@/types'

interface PageProps {
  params: { code: string }
}

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

const STAGE_NUM: Record<string, StageNumber> = {
  stage1: 1, stage2: 2, stage3: 3, stage4: 4, stage5: 5,
}

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

export default function TeacherPage({ params }: PageProps) {
  const code = params.code.toUpperCase()
  const {
    setSession, setPlayers, players, session, initDeviceToken, deviceToken,
  } = useSessionStore()

  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [startLoading, setStartLoading] = useState(false)
  const [stageLoading, setStageLoading] = useState(false)
  const [startError, setStartError] = useState('')

  const { stageValue, context, send } = useGameActor(code)
  const timerSeconds = useCountdown(session?.stage_ends_at)

  const teacherId = deviceToken ?? initDeviceToken()

  // Bootstrap session on mount
  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await fetch(`/api/sessions/${code}`)
        if (!res.ok) {
          setLoadError('\uc138\uc158\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.')
          return
        }
        const data = await res.json()
        setSession(data.session as Session)
        setPlayers(data.players as Player[])
        // Sync XState if session already in progress
        if (data.session?.status && data.session.status !== 'waiting') {
          send({ type: 'SYNC', status: data.session.status, session: data.session })
        }
      } catch {
        setLoadError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function handleApprove(playerId: string, action: 'approve' | 'reject') {
    setApproveLoading(playerId)
    try {
      await fetch(`/api/sessions/${code}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teacherId, action }),
      })
    } finally {
      setApproveLoading(null)
    }
  }

  async function handleStart() {
    setStartLoading(true)
    setStartError('')
    try {
      const res = await fetch(`/api/sessions/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStartError(data.error ?? '\uc2dc\uc791\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
        return
      }
      setSession(data.session as Session)
    } catch {
      setStartError('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setStartLoading(false)
    }
  }

  async function handleStage(action: 'next' | 'prev' | 'adjust', adjustMinutes?: -1 | 1) {
    setStageLoading(true)
    try {
      await fetch(`/api/sessions/${code}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action, adjustMinutes }),
      })
    } finally {
      setStageLoading(false)
    }
  }

  async function handleSpeech(speechRequestId: string, action: 'approve' | 'reject' | 'done') {
    await fetch(`/api/sessions/${code}/speech`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, speechRequestId, action }),
    })
  }

  async function handleRecall(billId: string) {
    await fetch(`/api/sessions/${code}/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId, teacherId }),
    })
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint border-t-transparent" />
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-navy flex items-center justify-center p-4">
        <p className="text-red-400">{loadError}</p>
      </main>
    )
  }

  const isWaiting = !session || session.status === 'waiting'
  const isEnded = session?.status === 'ended'
  const isPlaying = !isWaiting && !isEnded

  const pendingPlayers = players.filter((p) => !p.is_online)
  const approvedPlayers = players.filter((p) => p.is_online)
  const canStart = approvedPlayers.length >= 2

  const stageNum = STAGE_NUM[stageValue]
  const stageLabel = STAGE_LABELS[stageValue] ?? stageValue

  // Player name lookup for speech queue
  const playerNameMap = new Map(context.players.map((p) => [p.id, p.name]))

  // ── Waiting ──
  if (isWaiting) {
    return (
      <main className="min-h-screen bg-navy flex flex-col p-6">
        <div className="w-full max-w-4xl mx-auto space-y-6">
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

          {startError && (
            <p className="text-red-400 text-sm bg-red-900/20 rounded-md px-3 py-2">{startError}</p>
          )}

          {/* Pending approvals */}
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

          {approvedPlayers.length > 0 && (
            <div className="bg-slate-deep rounded-card border border-white/10 p-6 space-y-3">
              <h3 className="text-white font-semibold">
                \uc785\uc7a5 \uc644\ub8cc ({approvedPlayers.length})
              </h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {approvedPlayers.map((p) => (
                  <li key={p.id} className="bg-navy rounded-lg px-4 py-2">
                    <span className="text-white text-sm">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
        </div>
      </main>
    )
  }

  // ── Ended ──
  if (isEnded) {
    const sorted = [...context.players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    return (
      <main className="min-h-screen bg-navy flex flex-col p-6">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-deep rounded-card border border-white/10 p-6 text-center">
            <p className="text-mint text-sm mb-1">\uc138\uc158 \uc885\ub8cc</p>
            <h2 className="text-title-1 font-bold text-white">{code}</h2>
          </div>
          <div className="bg-slate-deep rounded-card border border-white/10 p-6 text-center">
            <a
              href={`/api/sessions/${code}/pdf?teacherId=${teacherId}`}
              download
              className="inline-block px-6 py-3 bg-mint text-navy font-bold rounded-lg hover:bg-mint/90 transition-colors"
            >
              \ud68c\uc758\ub85d PDF \ub2e4\uc6b4\ub85c\ub4dc
            </a>
          </div>

          <div className="bg-slate-deep rounded-card border border-white/10 p-6 space-y-3">
            <h3 className="text-white font-semibold">\ucd5c\uc885 \uc21c\uc704</h3>
            <ol className="space-y-2">
              {sorted.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 bg-navy rounded-lg px-4 py-3"
                >
                  <span className="text-mint font-bold text-lg w-6 text-center">{p.rank ?? i + 1}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-white text-xs font-bold ${
                      PARTY_BG[p.party ?? '\ubb34'] ?? 'bg-party-independent'
                    }`}
                  >
                    {PARTY_SHORT[p.party ?? '\ubb34']}
                  </span>
                  <span className="text-white flex-1 font-medium">{p.name}</span>
                  <span className="text-mint font-mono font-semibold">{p.score}\uc810</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    )
  }

  // ── Playing ──
  return (
    <main className="min-h-screen bg-navy flex flex-col">
      {/* Sticky header */}
      <header className="bg-slate-deep border-b border-white/10 px-6 py-3 sticky top-0 z-10">
        <div className="w-full max-w-4xl mx-auto flex items-center gap-4">
          <div>
            <p className="text-mint text-xs">{code}</p>
            <p className="text-white font-bold text-sm">{stageLabel}</p>
          </div>
          {stageNum && (
            <div className="hidden sm:block flex-1 overflow-x-auto">
              <StageIndicator
                currentStage={stageNum}
                className="scale-[0.75] origin-left min-w-max"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Timer seconds={timerSeconds} className="text-xl font-mono" />
            <span className="text-neutral text-sm">{context.players.length}\uba85</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-4xl mx-auto space-y-6">

          {/* Stage controls */}
          <div className="bg-slate-deep rounded-card border border-white/10 p-4">
            <p className="text-mint text-xs mb-3">\ub2e8\uacc4 \uc81c\uc5b4</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleStage('prev')}
                disabled={stageLoading || session?.current_stage === 1}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
              >
                \u2190 \uc774\uc804
              </button>
              <button
                onClick={() => handleStage('next')}
                disabled={stageLoading}
                className="px-4 py-2 bg-mint text-navy rounded-lg hover:bg-mint/90 disabled:opacity-50 transition-colors text-sm font-bold"
              >
                \ub2e4\uc74c \u2192
              </button>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleStage('adjust', -1)}
                  disabled={stageLoading}
                  className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors text-sm"
                >
                  -1\ubd84
                </button>
                <button
                  onClick={() => handleStage('adjust', 1)}
                  disabled={stageLoading}
                  className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors text-sm"
                >
                  +1\ubd84
                </button>
              </div>
              {stageLoading && (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-mint border-t-transparent self-center ml-2" />
              )}
            </div>
          </div>

          {/* Player grid */}
          <div className="bg-slate-deep rounded-card border border-white/10 p-4 space-y-3">
            <h3 className="text-white font-semibold">
              \ud559\uc0dd \ud604\ud669 ({context.players.length}\uba85)
            </h3>
            {context.players.length === 0 ? (
              <p className="text-neutral text-sm">\ud559\uc0dd \ub370\uc774\ud130 \ub85c\ub529 \uc911...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[...context.players]
                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                  .map((p) => {
                    const partyBg = PARTY_BG[p.party ?? '\ubb34'] ?? 'bg-party-independent'
                    const partyShort = PARTY_SHORT[p.party ?? '\ubb34']
                    return (
                      <div
                        key={p.id}
                        className="bg-navy rounded-lg p-3 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-white text-xs font-bold ${partyBg}`}>
                            {partyShort}
                          </span>
                          {p.rank != null && (
                            <span className="text-mint text-xs font-mono">{p.rank}\uc704</span>
                          )}
                        </div>
                        <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                        <p className="text-neutral text-xs truncate">{p.district ?? ''}</p>
                        <p className="text-mint font-mono font-bold text-sm">{p.score}\uc810</p>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Bills panel (stage5 only) — shows stage4 results + recall designation */}
          {stageValue === 'stage5' && context.bills.length > 0 && (
            <div className="bg-slate-deep rounded-card border border-white/10 p-4 space-y-3">
              <h3 className="text-white font-semibold">\ubc95\uc548 \ud45c\uacb0 \uacb0\uacfc / \uc7ac\uc758\uacb0 \uc9c0\uc815</h3>
              <ul className="space-y-2">
                {context.bills.map((bill) => {
                  const RESULT_LABEL: Record<string, string> = {
                    PASS: '\uac00\uacb0',
                    FAIL: '\ubd80\uacb0',
                    INVALID_QUORUM: '\uc815\uc871\uc218 \ubbf8\ub2ec',
                  }
                  const RESULT_COLOR: Record<string, string> = {
                    PASS: 'text-green-400',
                    FAIL: 'text-red-400',
                    INVALID_QUORUM: 'text-yellow-400',
                  }
                  const result = bill.stage4_result
                  return (
                    <li
                      key={bill.id}
                      className="flex items-center gap-3 bg-navy rounded-lg px-4 py-3"
                    >
                      <span className="text-xs text-neutral font-mono w-8">{bill.bill_code}</span>
                      <span className="text-white text-sm flex-1 truncate">{bill.title}</span>
                      {result ? (
                        <span className={`text-xs font-bold ${RESULT_COLOR[result] ?? 'text-neutral'}`}>
                          {RESULT_LABEL[result] ?? result}
                        </span>
                      ) : (
                        <span className="text-neutral text-xs">\ubbf8\uc9c4\ud589</span>
                      )}
                      {result === 'FAIL' && !bill.recall_used && (
                        <button
                          onClick={() => handleRecall(bill.id)}
                          className="px-2.5 py-1 bg-yellow-500 text-black text-xs font-bold rounded hover:bg-yellow-400 transition-colors ml-1"
                        >
                          \uc7ac\uc758\uacb0 \uc9c0\uc815
                        </button>
                      )}
                      {bill.recall_used && (
                        <span className="px-2 py-0.5 bg-yellow-900/40 text-yellow-400 text-xs font-semibold rounded">
                          \uc7ac\uc758\uacb0 \uc608\uc815
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Speech queue (stage3 only) */}
          {stageValue === 'stage3' && (
            <div className="bg-slate-deep rounded-card border border-white/10 p-4 space-y-3">
              <h3 className="text-white font-semibold">\ubc1c\uc5b8 \ub300\uae30\uc5f4</h3>
              {context.speechQueue.length === 0 ? (
                <p className="text-neutral text-sm">\ubc1c\uc5b8 \uc2e0\uccad\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</p>
              ) : (
                <ul className="space-y-2">
                  {context.speechQueue.map((req) => {
                    const name = playerNameMap.get(req.player_id) ?? req.player_id
                    const STATUS_LABEL: Record<string, string> = {
                      pending: '\ub300\uae30\uc911',
                      approved: '\uc2b9\uc778\ub428',
                      speaking: '\ubc1c\uc5b8\uc911',
                    }
                    const STATUS_COLOR: Record<string, string> = {
                      pending: 'text-yellow-400',
                      approved: 'text-green-400',
                      speaking: 'text-mint',
                    }
                    return (
                      <li
                        key={req.id}
                        className="flex items-center gap-3 bg-navy rounded-lg px-4 py-3"
                      >
                        <span className="text-white font-medium flex-1">{name}</span>
                        <span className={`text-xs font-semibold ${STATUS_COLOR[req.status] ?? 'text-neutral'}`}>
                          {STATUS_LABEL[req.status] ?? req.status}
                        </span>
                        <div className="flex gap-1.5">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleSpeech(req.id, 'approve')}
                                className="px-2.5 py-1 bg-mint text-navy text-xs font-bold rounded hover:bg-mint/90 transition-colors"
                              >
                                \uc2b9\uc778
                              </button>
                              <button
                                onClick={() => handleSpeech(req.id, 'reject')}
                                className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-500 transition-colors"
                              >
                                \uac70\uc808
                              </button>
                            </>
                          )}
                          {(req.status === 'approved' || req.status === 'speaking') && (
                            <button
                              onClick={() => handleSpeech(req.id, 'done')}
                              className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded hover:bg-white/30 transition-colors"
                            >
                              \uc644\ub8cc
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}

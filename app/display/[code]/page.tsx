'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useGameActor } from '@/lib/hooks/useGameActor'
import { StageIndicator } from '@/components/layout/StageIndicator'
import { Timer } from '@/components/ui/Timer'
import { STAGE_LABELS } from '@/lib/machines/gameMachine'
import type { Player, Bill, Session } from '@/lib/types'
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

const AREA_BADGE: Record<string, string> = {
  '\uad50\uc721': 'bg-blue-900/50 text-blue-200',
  '\ud658\uacbd': 'bg-green-900/50 text-green-200',
  '\uacbd\uc81c': 'bg-orange-900/50 text-orange-200',
}

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  PASS: { label: '\uac00\uacb0', color: 'text-green-400' },
  FAIL: { label: '\ubd80\uacb0', color: 'text-red-400' },
  INVALID_QUORUM: { label: '\uc815\uc871\uc218 \ubbf8\ub2ec', color: 'text-yellow-400' },
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

// ── Waiting state ─────────────────────────────────────────

function WaitingView({ code, players }: { code: string; players: Player[] }) {
  const approved = players.filter((p) => p.is_online)
  const pending = players.filter((p) => !p.is_online)

  return (
    <main className="min-h-screen bg-slate-deep flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl text-center space-y-8">
        <div>
          <p className="text-mint text-xl font-semibold mb-2">\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc</p>
          <p className="text-neutral text-base mb-4">\ud559\uc0dd\ub4e4\uc740 \uc544\ub798 \ucf54\ub4dc\ub97c \uc785\ub825\ud558\uc138\uc694</p>
          <div className="inline-block bg-navy rounded-2xl px-12 py-6">
            <p className="text-white/60 text-sm mb-1">\uc138\uc158 \ucf54\ub4dc</p>
            <h1 className="text-display-l font-bold text-white font-mono tracking-widest">{code}</h1>
          </div>
        </div>

        {players.length > 0 && (
          <div className="space-y-4">
            {approved.length > 0 && (
              <div>
                <p className="text-mint text-sm mb-2">\uc785\uc7a5 \uc644\ub8cc ({approved.length}\uba85)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {approved.map((p) => (
                    <span key={p.id} className="bg-navy text-white px-4 py-2 rounded-full text-sm font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <p className="text-neutral text-sm mb-2">\uc2b9\uc778 \ub300\uae30 ({pending.length}\uba85)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {pending.map((p) => (
                    <span key={p.id} className="border border-white/20 text-neutral px-4 py-2 rounded-full text-sm">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-white/30 text-sm">\uad50\uc0ac\ub2d8\uc758 \uc2dc\uc791\uc744 \uae30\ub2e4\ub9ac\ub294 \uc911...</p>
      </div>
    </main>
  )
}

// ── Bill card ─────────────────────────────────────────────

function BillCard({ bill, showResult }: { bill: Bill; showResult?: boolean }) {
  const result = bill.stage4_result ?? null
  const resultCfg = result ? RESULT_CONFIG[result] : null

  return (
    <div className="bg-navy/50 rounded-xl p-4 border border-white/10 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-white/50 text-sm">{bill.bill_code}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AREA_BADGE[bill.area] ?? 'bg-white/10 text-white/60'}`}>
          {bill.area}
        </span>
        {bill.important && (
          <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-semibold">
            \uc911\uc694
          </span>
        )}
        {showResult && resultCfg && (
          <span className={`text-sm font-bold ml-auto ${resultCfg.color}`}>
            {resultCfg.label}
          </span>
        )}
        {showResult && !resultCfg && (
          <span className="text-white/40 text-sm ml-auto">\ud22c\ud45c \uc9c4\ud589 \uc911</span>
        )}
      </div>
      <p className="text-white font-semibold text-base">{bill.title}</p>
    </div>
  )
}

// ── Score sidebar ─────────────────────────────────────────

function ScoreSidebar({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  return (
    <div className="bg-navy/30 rounded-xl border border-white/10 p-4 space-y-2 h-full">
      <h3 className="text-mint text-sm font-semibold mb-3">\uc810\uc218 \ud604\ud669</h3>
      {sorted.length === 0 ? (
        <p className="text-white/30 text-sm">\ub370\uc774\ud130 \ub85c\ub529 \uc911...</p>
      ) : (
        <ol className="space-y-1.5">
          {sorted.map((p, i) => {
            const partyBg = PARTY_BG[p.party ?? '\ubb34'] ?? 'bg-party-independent'
            return (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-white/40 text-xs w-4 text-right">{p.rank ?? i + 1}</span>
                <span className={`px-1.5 py-0.5 rounded text-white text-xs font-bold shrink-0 ${partyBg}`}>
                  {PARTY_SHORT[p.party ?? '\ubb34']}
                </span>
                <span className="text-white text-sm flex-1 truncate">{p.name}</span>
                <span className="text-mint font-mono text-sm font-semibold">{p.score}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ── Playing state ─────────────────────────────────────────

function PlayingView({
  code,
  stageValue,
  bills,
  players,
  speechQueue,
  stageEndsAt,
}: {
  code: string
  stageValue: string
  bills: Bill[]
  players: Player[]
  speechQueue: { id: string; player_id: string; status: string }[]
  stageEndsAt?: string | null
}) {
  const timerSeconds = useCountdown(stageEndsAt)
  const stageNum = STAGE_NUM[stageValue]
  const stageLabel = STAGE_LABELS[stageValue] ?? stageValue

  const playerNameMap = new Map(players.map((p) => [p.id, p.name]))
  const isVoting = stageValue === 'stage4' || stageValue === 'stage5'
  const stage5Bills = bills.filter((b) => b.recall_used && b.stage5_result === null)
  const displayBills = stageValue === 'stage5' ? stage5Bills : bills

  return (
    <main className="min-h-screen bg-slate-deep flex flex-col">
      {/* Stage header */}
      <header className="bg-navy/80 border-b border-white/10 px-8 py-4">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <p className="text-mint text-xs">{code}</p>
            <p className="text-white font-bold text-xl">{stageLabel}</p>
          </div>
          {stageNum && (
            <div className="flex-1 hidden lg:block">
              <StageIndicator currentStage={stageNum} />
            </div>
          )}
          <div className="ml-auto">
            <Timer seconds={timerSeconds} className="text-4xl" />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {/* Left: bills */}
        <div className="col-span-2 p-6 overflow-y-auto border-r border-white/10">
          <h2 className="text-white/60 text-sm font-semibold mb-4 uppercase tracking-wider">
            \ubc95\uc548 \ubaa9\ub85d ({displayBills.length})
          </h2>
          {displayBills.length === 0 ? (
            <p className="text-white/30 text-center py-12">\ubc95\uc548 \ub4f1\ub85d \ub300\uae30 \uc911...</p>
          ) : (
            <div className="space-y-3">
              {displayBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} showResult={isVoting} />
              ))}
            </div>
          )}

          {/* Speech queue (stage3) */}
          {stageValue === 'stage3' && speechQueue.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-mint text-sm font-semibold mb-3">\ubc1c\uc5b8 \ub300\uae30\uc5f4</h3>
              <div className="flex gap-3 flex-wrap">
                {speechQueue.map((req) => {
                  const name = playerNameMap.get(req.player_id) ?? '?'
                  const STATUS: Record<string, { label: string; cls: string }> = {
                    pending: { label: '\ub300\uae30', cls: 'border-white/30 text-white/50' },
                    approved: { label: '\uc608\uc815', cls: 'border-green-500 text-green-400' },
                    speaking: { label: '\ubc1c\uc5b8\uc911', cls: 'border-mint text-mint' },
                  }
                  const s = STATUS[req.status] ?? STATUS.pending
                  return (
                    <span key={req.id} className={`border rounded-full px-4 py-1.5 text-sm font-medium ${s.cls}`}>
                      {name} <span className="opacity-60 text-xs ml-1">{s.label}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: scores */}
        <div className="p-6 overflow-y-auto">
          <ScoreSidebar players={players} />
        </div>
      </div>
    </main>
  )
}

// ── Ended state ───────────────────────────────────────────

function EndedView({ bills, players }: { bills: Bill[]; players: Player[] }) {
  const sorted = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  return (
    <main className="min-h-screen bg-slate-deep flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-3">{'\uD83C\uDFC6'}</div>
          <h1 className="text-display-l font-bold text-white">\uac8c\uc784 \uc885\ub8cc</h1>
          <p className="text-mint text-lg mt-1">\ucd5c\uc885 \uacb0\uacfc</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Rankings */}
          <div className="bg-navy/50 rounded-2xl border border-white/10 p-6 space-y-3">
            <h2 className="text-mint text-base font-semibold">\ucd5c\uc885 \uc21c\uc704</h2>
            <ol className="space-y-2">
              {sorted.map((p, i) => {
                const partyBg = PARTY_BG[p.party ?? '\ubb34'] ?? 'bg-party-independent'
                const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : null
                return (
                  <li key={p.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                    <span className="text-xl w-8 text-center">{medal ?? `${p.rank ?? i + 1}`}</span>
                    <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${partyBg}`}>
                      {PARTY_SHORT[p.party ?? '\ubb34']}
                    </span>
                    <span className="text-white font-semibold flex-1">{p.name}</span>
                    <span className="text-mint font-mono font-bold text-lg">{p.score}\uc810</span>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Bill results */}
          <div className="bg-navy/50 rounded-2xl border border-white/10 p-6 space-y-3">
            <h2 className="text-mint text-base font-semibold">\ubc95\uc548 \ucc98\ub9ac \uacb0\uacfc</h2>
            <div className="space-y-2">
              {bills.map((bill) => {
                const result = bill.final_result ?? bill.stage4_result
                const cfg = result ? RESULT_CONFIG[result] : null
                return (
                  <div key={bill.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                    <span className="font-mono text-white/40 text-xs">{bill.bill_code}</span>
                    <span className="text-white text-sm flex-1">{bill.title}</span>
                    {cfg ? (
                      <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                    ) : (
                      <span className="text-white/30 text-sm">-</span>
                    )}
                  </div>
                )
              })}
              {bills.length === 0 && (
                <p className="text-white/30 text-sm">\ubc95\uc548 \uc5c6\uc74c</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function DisplayPage({ params }: PageProps) {
  const code = params.code.toUpperCase()
  const { setSession, setPlayers, session, players } = useSessionStore()
  const { stageValue, context, send } = useGameActor(code)

  // Bootstrap session on mount
  useEffect(() => {
    fetch(`/api/sessions/${code}`)
      .then((r) => r.json())
      .then((data: { session?: Session; players?: Player[] }) => {
        if (data.session) setSession(data.session)
        if (data.players) setPlayers(data.players)
        if (data.session?.status && data.session.status !== 'waiting') {
          send({ type: 'SYNC', status: data.session.status, session: data.session })
        }
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const isWaiting = stageValue === 'waiting' || !session || session.status === 'waiting'
  const isEnded = stageValue === 'ended' || session?.status === 'ended'

  if (isEnded) {
    return <EndedView bills={context.bills} players={context.players} />
  }

  if (isWaiting) {
    return <WaitingView code={code} players={players} />
  }

  return (
    <PlayingView
      code={code}
      stageValue={stageValue}
      bills={context.bills}
      players={context.players.length > 0 ? context.players : players}
      speechQueue={context.speechQueue}
      stageEndsAt={context.session?.stage_ends_at ?? session?.stage_ends_at}
    />
  )
}

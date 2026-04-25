'use client'

// ============================================================
// useGameActor — 3-way sync: Supabase Realtime ↔ Zustand ↔ XState
// Replaces useSessionChannel for pages that need stage-aware UI.
// ============================================================

import { useEffect, useRef } from 'react'
import { useMachine } from '@xstate/react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store/sessionStore'
import { gameMachine } from '@/lib/machines/gameMachine'
import type { Session, Player, Bill } from '@/lib/types'

export function useGameActor(classCode: string) {
  const { session, players, setSession, setPlayers, updatePlayerScore } =
    useSessionStore()

  const [state, send] = useMachine(gameMachine)
  // Stable send ref so effects don't re-run when send is captured in closure
  const sendRef = useRef(send)
  sendRef.current = send

  // ── Bootstrap from server state on mount ──────────────────
  useEffect(() => {
    if (!session?.status || session.status === 'waiting') return
    sendRef.current({ type: 'SYNC', status: session.status, session })
    if (players.length > 0) {
      sendRef.current({ type: 'PLAYERS_UPDATED', players })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount

  // ── Load bills when game is active ───────────────────────
  useEffect(() => {
    const status = session?.status
    if (!status || status === 'waiting' || status === 'ended') return
    if (!classCode) return

    fetch(`/api/sessions/${classCode}/bills`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.bills)) {
          sendRef.current({ type: 'BILLS_LOADED', bills: data.bills as Bill[] })
        }
      })
      .catch(console.error)
  }, [classCode, session?.status])

  // ── Load speech queue in stage3 ───────────────────────────
  useEffect(() => {
    if (session?.status !== 'stage3' || !classCode) return

    fetch(`/api/sessions/${classCode}/speech`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.queue)) {
          sendRef.current({ type: 'SPEECH_QUEUE_UPDATED', queue: data.queue })
        }
      })
      .catch(console.error)
  }, [classCode, session?.status])

  // ── Supabase Realtime → XState + Zustand ─────────────────
  useEffect(() => {
    if (!classCode) return

    const supabase = createClient()
    const channel = supabase.channel(`session:${classCode}`)

    const refetch = (extra?: (data: { session?: Session; players?: Player[] }) => void) =>
      fetch(`/api/sessions/${classCode}`)
        .then((r) => r.json())
        .then((data: { session?: Session; players?: Player[] }) => {
          if (data.players) {
            setPlayers(data.players)
            sendRef.current({ type: 'PLAYERS_UPDATED', players: data.players })
          }
          if (data.session) setSession(data.session)
          extra?.(data)
        })
        .catch(console.error)

    channel
      .on('broadcast', { event: 'STAGE_CHANGE' }, ({ payload }) => {
        const s = payload?.session as Session | undefined
        if (!s) return
        setSession(s)
        sendRef.current({
          type: 'STAGE_CHANGE',
          session: s,
          stage: s.current_stage,
          status: s.status,
        })
      })
      .on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
        const s = payload?.session as Session | undefined
        if (!s) return
        setSession(s)
        refetch((data) => {
          if (data.players && s) {
            sendRef.current({ type: 'GAME_START', session: s, players: data.players })
          }
        })
      })
      .on('broadcast', { event: 'PLAYER_JOIN' }, ({ payload }) => {
        if (payload?.playerId) refetch()
      })
      .on('broadcast', { event: 'PLAYER_APPROVE' }, ({ payload }) => {
        if (payload?.playerId !== undefined) refetch()
      })
      .on('broadcast', { event: 'SCORE_UPDATE' }, ({ payload }) => {
        const { playerId, score, rank } = payload ?? {}
        if (playerId !== undefined && score !== undefined && rank !== undefined) {
          updatePlayerScore(playerId as string, score as number, rank as number)
          sendRef.current({
            type: 'SCORE_UPDATED',
            playerId: playerId as string,
            score: score as number,
            rank: rank as number,
          })
        }
      })
      .on('broadcast', { event: 'SPEECH_REQUEST' }, () => {
        if (!classCode) return
        fetch(`/api/sessions/${classCode}/speech`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data.queue)) {
              sendRef.current({ type: 'SPEECH_QUEUE_UPDATED', queue: data.queue })
            }
          })
          .catch(console.error)
      })
      .on('broadcast', { event: 'SPEECH_QUEUE_UPDATED' }, ({ payload }) => {
        if (Array.isArray(payload?.queue)) {
          sendRef.current({ type: 'SPEECH_QUEUE_UPDATED', queue: payload.queue })
        }
      })
      .on('broadcast', { event: 'BILLS_UPDATED' }, () => {
        fetch(`/api/sessions/${classCode}/bills`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data.bills)) {
              sendRef.current({ type: 'BILLS_LOADED', bills: data.bills as Bill[] })
            }
          })
          .catch(console.error)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classCode, setSession, setPlayers, updatePlayerScore])

  return {
    state,
    send,
    context: state.context,
    // Convenience derived values
    stageValue: state.value as string,
    isWaiting: state.matches('waiting'),
    isPlaying:
      state.matches('stage1') ||
      state.matches('stage2') ||
      state.matches('stage3') ||
      state.matches('stage4') ||
      state.matches('stage5'),
    isEnded: state.matches('ended'),
    currentStage: state.context.session?.current_stage ?? 0,
  }
}

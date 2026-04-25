'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store/sessionStore'
import type { Session, Player } from '@/lib/types'

export function useSessionChannel(classCode: string) {
  const { setSession, setPlayers, players, updatePlayerScore } = useSessionStore()

  useEffect(() => {
    if (!classCode) return

    const supabase = createClient()
    const channel = supabase.channel(`session:${classCode}`)

    channel
      .on('broadcast', { event: 'STAGE_CHANGE' }, ({ payload }) => {
        if (payload?.session) {
          setSession(payload.session as Session)
        }
      })
      .on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
        if (payload?.session) {
          setSession(payload.session as Session)
        }
      })
      .on('broadcast', { event: 'PLAYER_JOIN' }, ({ payload }) => {
        // Refetch players from API when a new player joins
        if (payload?.playerId) {
          fetch(`/api/sessions/${classCode}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.players) setPlayers(data.players as Player[])
            })
            .catch(console.error)
        }
      })
      .on('broadcast', { event: 'PLAYER_APPROVE' }, ({ payload }) => {
        if (payload?.playerId !== undefined) {
          // Refetch to get updated is_online status
          fetch(`/api/sessions/${classCode}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.players) setPlayers(data.players as Player[])
              if (data.session) setSession(data.session as Session)
            })
            .catch(console.error)
        }
      })
      .on('broadcast', { event: 'SCORE_UPDATE' }, ({ payload }) => {
        if (payload?.playerId && payload?.score !== undefined && payload?.rank !== undefined) {
          updatePlayerScore(payload.playerId as string, payload.score as number, payload.rank as number)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classCode, setSession, setPlayers, updatePlayerScore])
}

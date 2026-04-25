'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, Player } from '@/lib/types'

interface SessionStore {
  // Session state
  session: Session | null
  players: Player[]
  currentPlayer: Player | null
  deviceToken: string | null

  // Actions
  setSession: (session: Session) => void
  setPlayers: (players: Player[]) => void
  setCurrentPlayer: (player: Player | null) => void
  initDeviceToken: () => string
  updatePlayerScore: (playerId: string, score: number, rank: number) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      players: [],
      currentPlayer: null,
      deviceToken: null,

      setSession: (session: Session) => set({ session }),

      setPlayers: (players: Player[]) => {
        set({ players })
        // Keep currentPlayer in sync
        const current = get().currentPlayer
        if (current) {
          const updated = players.find((p) => p.id === current.id)
          if (updated) set({ currentPlayer: updated })
        }
      },

      setCurrentPlayer: (player: Player | null) => set({ currentPlayer: player }),

      initDeviceToken: () => {
        const existing = get().deviceToken
        if (existing) return existing

        const token = crypto.randomUUID()
        set({ deviceToken: token })
        return token
      },

      updatePlayerScore: (playerId: string, score: number, rank: number) => {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score, rank } : p
          ),
          currentPlayer:
            state.currentPlayer?.id === playerId
              ? { ...state.currentPlayer, score, rank }
              : state.currentPlayer,
        }))
      },
    }),
    {
      name: 'democratic-republic-session',
      partialize: (state) => ({ deviceToken: state.deviceToken }),
    }
  )
)

// ============================================================
// XState v5 Game State Machine for 민주공화국 24시
// Stage flow: waiting → stage1 → stage2 → stage3 → stage4 → stage5 → ended
// Server is authoritative; STAGE_CHANGE events drive transitions.
// Korean strings use \uXXXX escapes per project rule.
// ============================================================

import { createMachine, assign } from 'xstate'
import type { Session, Player, Bill, SpeechRequest } from '@/lib/types'

// ── Context ──────────────────────────────────────────────

export interface GameContext {
  session: Session | null
  players: Player[]
  bills: Bill[]
  activeBillId: string | null
  speechQueue: SpeechRequest[]
}

// ── Events ───────────────────────────────────────────────

export type GameEvent =
  | { type: 'GAME_START'; session: Session; players: Player[] }
  | { type: 'STAGE_CHANGE'; session: Session; stage: number; status: string }
  | { type: 'PLAYERS_UPDATED'; players: Player[] }
  | { type: 'BILLS_LOADED'; bills: Bill[] }
  | { type: 'SCORE_UPDATED'; playerId: string; score: number; rank: number }
  | { type: 'SPEECH_QUEUE_UPDATED'; queue: SpeechRequest[] }
  | { type: 'SELECT_BILL'; billId: string }
  | { type: 'SYNC'; status: string; session: Session }

// ── Machine ───────────────────────────────────────────────

export const gameMachine = createMachine({
  id: 'democraticRepublic',
  initial: 'waiting',
  types: {} as {
    context: GameContext
    events: GameEvent
  },
  context: {
    session: null,
    players: [],
    bills: [],
    activeBillId: null,
    speechQueue: [],
  },

  // Global events apply in every state
  on: {
    PLAYERS_UPDATED: {
      actions: assign({
        players: ({ event }) => (event as Extract<GameEvent, { type: 'PLAYERS_UPDATED' }>).players,
      }),
    },
    BILLS_LOADED: {
      actions: assign({
        bills: ({ event }) => (event as Extract<GameEvent, { type: 'BILLS_LOADED' }>).bills,
      }),
    },
    SCORE_UPDATED: {
      actions: assign({
        players: ({ context, event }) => {
          const e = event as Extract<GameEvent, { type: 'SCORE_UPDATED' }>
          return context.players.map((p) =>
            p.id === e.playerId ? { ...p, score: e.score, rank: e.rank } : p
          )
        },
      }),
    },
    SPEECH_QUEUE_UPDATED: {
      actions: assign({
        speechQueue: ({ event }) =>
          (event as Extract<GameEvent, { type: 'SPEECH_QUEUE_UPDATED' }>).queue,
      }),
    },
    SELECT_BILL: {
      actions: assign({
        activeBillId: ({ event }) =>
          (event as Extract<GameEvent, { type: 'SELECT_BILL' }>).billId,
      }),
    },
    // Jump to server-authoritative state (used on page refresh)
    SYNC: [
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'stage1',
        target: '.stage1',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'stage2',
        target: '.stage2',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'stage3',
        target: '.stage3',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'stage4',
        target: '.stage4',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'stage5',
        target: '.stage5',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        guard: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).status === 'ended',
        target: '.ended',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
      {
        target: '.waiting',
        actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'SYNC' }>).session }),
      },
    ],
  },

  states: {
    // ── 대기실 ──────────────────────────────────────────
    waiting: {
      on: {
        GAME_START: {
          target: 'stage1',
          actions: assign({
            session: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_START' }>).session,
            players: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_START' }>).players,
          }),
        },
      },
    },

    // ── 1단계: 발의 ─────────────────────────────────────
    stage1: {
      on: {
        STAGE_CHANGE: [
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 2,
            target: 'stage2',
            actions: assign({
              session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session,
              activeBillId: () => null,
            }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).status === 'ended',
            target: 'ended',
            actions: assign({
              session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session,
            }),
          },
        ],
      },
    },

    // ── 2단계: 검토 ─────────────────────────────────────
    stage2: {
      on: {
        STAGE_CHANGE: [
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 1,
            target: 'stage1',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 3,
            target: 'stage3',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).status === 'ended',
            target: 'ended',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session }),
          },
        ],
      },
    },

    // ── 3단계: 토론 ─────────────────────────────────────
    stage3: {
      on: {
        STAGE_CHANGE: [
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 2,
            target: 'stage2',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 4,
            target: 'stage4',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).status === 'ended',
            target: 'ended',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session }),
          },
        ],
      },
    },

    // ── 4단계: 1차 표결 ──────────────────────────────────
    stage4: {
      on: {
        STAGE_CHANGE: [
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 3,
            target: 'stage3',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 5,
            target: 'stage5',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).status === 'ended',
            target: 'ended',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session }),
          },
        ],
      },
    },

    // ── 5단계: 재의결 ─────────────────────────────────────
    stage5: {
      on: {
        STAGE_CHANGE: [
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).stage === 4,
            target: 'stage4',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session, activeBillId: () => null }),
          },
          {
            guard: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).status === 'ended',
            target: 'ended',
            actions: assign({ session: ({ event }) => (event as Extract<GameEvent, { type: 'STAGE_CHANGE' }>).session }),
          },
        ],
      },
    },

    // ── 종료 ────────────────────────────────────────────
    ended: {
      type: 'final',
    },
  },
})

// ── Derived helpers (used by UI) ─────────────────────────

export const STAGE_LABELS: Record<string, string> = {
  waiting: '\ub300\uae30\uc2e4',
  stage1: '1\ub2e8\uacc4 \ubc1c\uc758',
  stage2: '2\ub2e8\uacc4 \uac80\ud1a0',
  stage3: '3\ub2e8\uacc4 \ud1a0\ub860',
  stage4: '4\ub2e8\uacc4 \ud45c\uacb0',
  stage5: '5\ub2e8\uacc4 \uc7ac\uc758\uacb0',
  ended: '\uc885\ub8cc',
}

export function isVotingStage(status: string): boolean {
  return status === 'stage4' || status === 'stage5'
}

export function isDebateStage(status: string): boolean {
  return status === 'stage3'
}

export function canChat(status: string): boolean {
  return status !== 'waiting' && status !== 'ended'
}

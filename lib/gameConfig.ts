// ============================================================
// Game configuration constants
// Korean strings use \uXXXX escapes per project rule
// ============================================================

import type { PledgeDifficulty } from '@/lib/types'
import DISTRICTS_JSON from '@/lib/data/districts.json'

// Stage durations in minutes
export const STAGE_DURATIONS: Record<number, number> = {
  1: 5,
  2: 10,
  3: 10,
  4: 8,
  5: 7,
}

// 6 event card definitions (match event_logs.event_type CHECK)
export const EVENT_CARDS = [
  {
    type: 'mass_protest',
    label: '\ubbfc\uc911 \ubd09\uae30',
    description: '\ud2b9\uc815 \ubc95\uc548\uc5d0 \ub300\ud55c \ubc18\ub300 \uc5ec\ub860\uc774 \ud3ed\ubc1c\ud569\ub2c8\ub2e4. \ud574\ub2f9 \ubc95\uc548 \ucc2c\uc131 \uc758\uc6d0\uc740 \uc810\uc218\uac00 \uac10\uc18c\ud569\ub2c8\ub2e4.',
    scoreImpact: -15,
  },
  {
    type: 'press_scoop',
    label: '\uc5b8\ub860 \ud2b9\uc885',
    description: '\ud2b9\uc815 \uc758\uc6d0\uc758 \ube44\ub9ac\uac00 \ud3ed\ub85c\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ud574\ub2f9 \uc758\uc6d0\uc740 \uc810\uc218 \ud39c\ub110\ud2f0\ub97c \ubc1b\uc2b5\ub2c8\ub2e4.',
    scoreImpact: -20,
  },
  {
    type: 'poll_reveal',
    label: '\uc5ec\ub860\uc870\uc0ac \uacf5\uac1c',
    description: '\uc8fc\uc694 \uc815\ub2f9\uc758 \uc9c0\uc9c0\uc728\uc774 \uacf5\uac1c\ub429\ub2c8\ub2e4. \uc9c0\uc9c0\uc728 1\uc704 \uc815\ub2f9 \uc758\uc6d0\ub4e4\uc740 \ubcf4\ub108\uc2a4 \uc810\uc218\ub97c \ubc1b\uc2b5\ub2c8\ub2e4.',
    scoreImpact: 15,
  },
  {
    type: 'party_change',
    label: '\uc815\ub2f9 \uc774\ud0c8',
    description: '\ud2b9\uc815 \uc758\uc6d0\uc774 \uc18c\uc18d \uc815\ub2f9\uc744 \ub5a0\ub098 \ubb34\uc18c\uc18d\uc774 \ub429\ub2c8\ub2e4. \ud56d\ud6c4 \uc5ec\ud300 \ud22c\ud45c\uc5d0 \uc601\ud5a5\uc744 \ubbf8\uce69\ub2c8\ub2e4.',
    scoreImpact: 0,
  },
  {
    type: 'speaker_direct',
    label: '\uc758\uc7a5 \uc9c1\uad8c \uc0c1\uc815',
    description: '\uc758\uc7a5\uc774 \ud2b9\uc815 \ubc95\uc548\uc744 \uc9c1\uad8c \uc0c1\uc815\ud569\ub2c8\ub2e4. \ub2e4\uc74c \ud1a0\ub860 \uc5c6\uc774 \uc989\uc2dc \ud45c\uacb0\ub85c \ub118\uc5b4\uac11\ub2c8\ub2e4.',
    scoreImpact: 0,
  },
  {
    type: 'disaster',
    label: '\uc7ac\ub09c \ubc1c\uc0dd',
    description: '\ud2b9\uc815 \uc9c0\uc5ed\uc5d0 \uc7ac\ub09c\uc774 \ubc1c\uc0dd\ud569\ub2c8\ub2e4. \ud574\ub2f9 \uc9c0\uc5ed\uad6c \uc758\uc6d0\uc740 \ubc95\uc548 \ucc2c\uc131 \uc2dc \ucd94\uac00 \uc810\uc218\ub97c \ubc1b\uc2b5\ub2c8\ub2e4.',
    scoreImpact: 25,
  },
] as const

export type EventCardType = typeof EVENT_CARDS[number]['type']

// Specialty mapping by pledge_code prefix
const SPECIALTY_MAP: Record<string, string> = {
  'EDU': '\uad50\uc721\uc804\ubb38\uac00',
  'ECO': '\uacbd\uc81c\uc804\ubb38\uac00',
  'ENV': '\ud658\uacbd\ud65c\ub3d9\uac00',
}

export function specialtyFromPledge(pledgeCode: string): string {
  const prefix = pledgeCode.split('-')[0]
  return SPECIALTY_MAP[prefix] ?? '\uc77c\ubc18'
}

// Ordered pledge codes assigned to players 1-10 at game start (backward compat)
export const PLAYER_PLEDGE_CODES = [
  'EDU-01', 'EDU-02', 'EDU-03',
  'ECO-01', 'ECO-02', 'ECO-03',
  'ENV-01', 'ENV-02',
  'ECO-04', 'ENV-03',
] as const

// All 30 pledge codes (EDU/ENV/ECO × 10)
export const ALL_PLEDGE_CODES = [
  'EDU-01', 'EDU-02', 'EDU-03', 'EDU-04', 'EDU-05',
  'EDU-06', 'EDU-07', 'EDU-08', 'EDU-09', 'EDU-10',
  'ENV-01', 'ENV-02', 'ENV-03', 'ENV-04', 'ENV-05',
  'ENV-06', 'ENV-07', 'ENV-08', 'ENV-09', 'ENV-10',
  'ECO-01', 'ECO-02', 'ECO-03', 'ECO-04', 'ECO-05',
  'ECO-06', 'ECO-07', 'ECO-08', 'ECO-09', 'ECO-10',
] as const

// pledge_difficulty assigned by player index (cycles easy→medium→hard)
export const PLEDGE_DIFFICULTIES: PledgeDifficulty[] = ['easy', 'medium', 'hard']

// All 30 districts from JSON (source of truth)
export const ALL_DISTRICTS: readonly string[] = DISTRICTS_JSON

// 10 districts for backward compatibility (first 10 of ALL_DISTRICTS)
export const DISTRICTS = ALL_DISTRICTS.slice(0, 10) as string[]

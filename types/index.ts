// \uc720\ub2c8\ucf54\ub4dc \uc774\uc2a4\ucf00\uc774\ud504 \ud544\uc218: JS/TS \ud30c\uc77c \ub0b4 \ud55c\uad6d\uc5b4 \ub9ac\ud130\ub7f4 \uae08\uc9c0
// Party: \uc5ec=\uc5ec\ub2f9, \uc57c=\uc57c\ub2f9, \ubb34=\ubb34\uc18c\uc18d
export type Party = '\uc5ec' | '\uc57c' | '\ubb34'

// \uc2a4\ud14c\uc774\uc9c0 \ubc88\ud638: 1~5
export type StageNumber = 1 | 2 | 3 | 4 | 5

// \ubc95\uc548 \ubd84\uc57c: \uad50\uc721|\ud658\uacbd|\uacbd\uc81c
export type BillArea = '\uad50\uc721' | '\ud658\uacbd' | '\uacbd\uc81c'

// \ud22c\ud45c \uc120\ud0dd: \ucc2c|\ubc18|\uae30\uad8c
export type VoteChoice = '\ucc2c' | '\ubc18' | '\uae30\uad8c'

// \uacf5\uc57d \ub09c\uc774\ub3c4
export type PledgeDifficulty = 'easy' | 'medium' | 'hard'

// \uc138\uc158 \uc0c1\ud0dc (\uc2a4\ud14c\uc774\uc9c0 \uae30\ubc18)
export type SessionStatus =
  | 'waiting'
  | 'active'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'ended'

// \ubc95\uc548 \ud22c\ud45c/\uc7ac\uc758\uacb0 \uacb0\uacfc
export type BillResult = 'PASS' | 'FAIL' | 'INVALID_QUORUM'

// \uc810\uc218 \uc774\ubca4\ud2b8 \ud0c0\uc785
// 1=bill_pass 2=pledge_match 3=district_align 4=district_conflict
// 5=co_propose 6=recall_success 7=speech 8=event_bonus 9=abstain 10=participation
export type ScoreEventType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

// \ucc44\ud305 \uc2a4\ucf54\ud504
export type ChatScope = 'party' | 'direct' | 'system'

// \ubc1c\uc5b8 \uc694\uccad \uc0c1\ud0dc
export type SpeechStatus = 'pending' | 'approved' | 'speaking' | 'done' | 'rejected'

// \uc7ac\uc758\uacb0 \uc694\uad6c \uc0c1\ud0dc
export type RecallStatus = 'pending' | 'active' | 'passed' | 'failed' | 'expired'

// \uc138\uc158 \uc810\uc218 \uac00\uc911\uce58 \uc124\uc815
export interface SessionWeights {
  bill_pass_party: number
  pledge_match: number
  district_align: number
  district_conflict: number
  co_propose: number
  recall_success: number
  speech: number
  event_bonus: number
  participation: number
}

// sessions \ud14c\uc774\ube14
export interface Session {
  id: string
  class_code: string
  teacher_id: string
  status: SessionStatus
  current_stage: number
  stage_ends_at: string | null
  started_at: string | null
  ended_at: string | null
  weights: SessionWeights
  settings: Record<string, unknown>
  created_at: string
}

// players \ud14c\uc774\ube14
export interface Player {
  id: string
  session_id: string
  name: string
  party: Party
  district: string
  specialty: string
  pledge_code: string
  pledge_difficulty: PledgeDifficulty
  score: number
  rank: number | null
  device_token: string
  is_online: boolean
  joined_at: string
}

// bills \ud14c\uc774\ube14
export interface Bill {
  id: string
  session_id: string
  bill_code: string
  area: BillArea
  title: string
  body: string
  important: boolean
  proposer_id: string | null
  co_proposer_ids: string[]
  proposer_party: Party | null
  stage4_result: BillResult | null
  stage5_result: BillResult | null
  final_result: BillResult | null
  recall_used: boolean
  display_order: number
  created_at: string
}

// votes \ud14c\uc774\ube14
export interface Vote {
  id: string
  bill_id: string
  player_id: string
  session_id: string
  choice: VoteChoice
  stage: 4 | 5
  created_at: string
}

// score_events \ud14c\uc774\ube14 (append-only)
export interface ScoreEvent {
  id: string
  session_id: string
  player_id: string | null
  party: Party | null
  event_type: ScoreEventType
  delta: number
  reason: string
  weight: number
  created_at: string
}

// chats \ud14c\uc774\ube14
export interface Chat {
  id: string
  session_id: string
  scope: ChatScope
  from_player_id: string
  to_player_id: string | null
  party: Party | null
  text: string
  profanity_checked: boolean
  approved_by_teacher: boolean | null
  stage: number | null
  created_at: string
}

// speech_requests \ud14c\uc774\ube14
export interface SpeechRequest {
  id: string
  session_id: string
  bill_id: string | null
  player_id: string
  status: SpeechStatus
  started_at: string | null
  ended_at: string | null
  duration_sec: number | null
  created_at: string
}

// recall_requests \ud14c\uc774\ube14
export interface RecallRequest {
  id: string
  session_id: string
  bill_id: string
  requester_party: Party
  co_requester_ids: string[]
  amendment_text: string | null
  status: RecallStatus
  result: 'PASS' | 'FAIL' | null
  created_at: string
}

// event_logs \ud14c\uc774\ube14
export type GameEventType =
  | 'mass_protest'
  | 'press_scoop'
  | 'poll_reveal'
  | 'party_change'
  | 'speaker_direct'
  | 'disaster'

export interface EventLog {
  id: string
  session_id: string
  event_type: GameEventType
  payload: Record<string, unknown>
  triggered_by: string | null
  triggered_at: string
}

// bill_district_effects \ucc38\uc870 \ud14c\uc774\ube14
export interface BillDistrictEffect {
  bill_code: string
  district: string
  delta: number
}

// judge_bill() \ud568\uc218 \ubc18\ud658\uac12
export interface JudgeBillResult {
  result: BillResult
  passed: boolean
  attended: number
  yes_count: number
}

// ============================================================
// Domain Types for 민주공화국 24시
// Korean string literals use \uXXXX escapes per project rule
// ============================================================

export type Party = '\uc5ec' | '\uc57c' | '\ubb34'
export type BillArea = '\uad50\uc721' | '\ud658\uacbd' | '\uacbd\uc81c'
export type PledgeDifficulty = 'easy' | 'medium' | 'hard'
export type VoteChoice = '\ucc2c' | '\ubc18' | '\uae30\uad8c'
export type StageNumber = 1 | 2 | 3 | 4 | 5
export type BillResult = 'PASS' | 'FAIL' | 'INVALID_QUORUM'

export interface Session {
  id: string
  class_code: string
  teacher_id: string
  status: 'waiting' | 'active' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'ended'
  current_stage: number
  weights: SessionWeights
  settings: Record<string, unknown>
  started_at?: string
  stage_ends_at?: string
  ended_at?: string
  created_at?: string
}

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

export interface Player {
  id: string
  session_id: string
  name: string
  party: Party | null
  district: string | null
  specialty: string | null
  pledge_code: string | null
  pledge_difficulty: PledgeDifficulty | null
  score: number
  rank: number | null
  is_online: boolean
  joined_at?: string
}

export interface BillTemplate {
  bill_code: string
  area: BillArea
  title: string
  body: string
  important: boolean
  proposer_party: Party | null
  display_order: number
}

export interface Bill extends BillTemplate {
  id: string
  session_id: string
  proposer_id: string | null
  co_proposer_ids: string[]
  stage4_result: BillResult | null
  stage5_result: BillResult | null
  final_result: BillResult | null
  recall_used: boolean
  created_at?: string
}

export interface PledgeDefinition {
  code: string
  label: string
  description: string
  area: BillArea | '\uc0ac\ud68c'
  target_bill_codes: string[]
}

export interface Vote {
  id: string
  bill_id: string
  player_id: string
  session_id: string
  choice: VoteChoice
  stage: 4 | 5
  created_at?: string
}

export interface ScoreEvent {
  id: string
  session_id: string
  player_id: string | null
  party: Party | null
  event_type: number
  delta: number
  reason: string
  weight: number
  created_at?: string
}

export interface Chat {
  id: string
  session_id: string
  scope: 'party' | 'direct' | 'system'
  from_player_id: string
  to_player_id: string | null
  party: Party | null
  text: string
  stage: StageNumber | null
  created_at?: string
}

export interface SpeechRequest {
  id: string
  session_id: string
  bill_id: string | null
  player_id: string
  status: 'pending' | 'approved' | 'speaking' | 'done' | 'rejected'
  started_at?: string
  ended_at?: string
  duration_sec?: number
  created_at?: string
}

export interface RecallRequest {
  id: string
  session_id: string
  bill_id: string
  requester_party: Party
  co_requester_ids: string[]
  amendment_text?: string
  status: 'pending' | 'active' | 'passed' | 'failed' | 'expired'
  result: 'PASS' | 'FAIL' | null
  created_at?: string
}

export interface BillDistrictEffect {
  bill_code: string
  district: string
  delta: number
}

export interface JudgeBillResult {
  result: BillResult
  passed: boolean
  attended: number
  yes_count: number
}

// \uc720\ub2c8\ucf54\ub4dc \uc774\uc2a4\ucf00\uc774\ud504 \ud544\uc218: \uc131\ub2a5/\ub2c8\uc640 \ud55c\uad6d\uc5b4\ub294 \ubaa8\ub450 \uadf8\ub300\ub85c
// Party: \uc5ec=\uc5ec\ub2f9, \uc57c=\uc57c\ub2f9, \ubb34=\ubb34\uc18c\uc18d
export type Party = '\uc5ec' | '\uc57c' | '\ubb34'

export type StageNumber = 1 | 2 | 3 | 4 | 5

// BillArea: \uad50\uc721|\ud658\uacbd|\uacbd\uc81c
export type BillArea = '\uad50\uc721' | '\ud658\uacbd' | '\uacbd\uc81c'

// VoteChoice: \ucc2c|\ubc18|\uae30\uad8c
export type VoteChoice = '\ucc2c' | '\ubc18' | '\uae30\uad8c'

// BillImportance: \uc77c\ubc18|\uc911\uc694|\uae34\uae09
export type BillImportance = '\uc77c\ubc18' | '\uc911\uc694' | '\uae34\uae09'

// SessionStatus
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished'

export interface Session {
  id: string
  code: string
  teacher_id: string
  status: SessionStatus
  current_stage: StageNumber
  current_bill_id: string | null
  timer_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  session_id: string
  name: string
  party: Party
  role: string
  score: number
  seat_number: number
  is_online: boolean
  joined_at: string
}

export interface Bill {
  id: string
  session_id: string
  area: BillArea
  importance: BillImportance
  title: string
  summary: string
  proposer_id: string
  proposer_party: Party
  status: 'draft' | 'committee' | 'floor' | 'passed' | 'rejected'
  yea_count: number
  nay_count: number
  abstain_count: number
  created_at: string
}

export interface Vote {
  id: string
  session_id: string
  bill_id: string
  player_id: string
  choice: VoteChoice
  created_at: string
}

export interface ScoreEvent {
  id: string
  session_id: string
  player_id: string
  delta: number
  reason: string
  stage: StageNumber
  created_at: string
}

export interface Chat {
  id: string
  session_id: string
  player_id: string
  player_name: string
  party: Party
  message: string
  created_at: string
}

export interface SpeechRequest {
  id: string
  session_id: string
  player_id: string
  player_name: string
  party: Party
  status: 'pending' | 'approved' | 'rejected' | 'done'
  created_at: string
}

export interface RecallRequest {
  id: string
  session_id: string
  target_player_id: string
  requester_id: string
  signatures: string[]
  required_signatures: number
  status: 'open' | 'passed' | 'failed'
  created_at: string
}

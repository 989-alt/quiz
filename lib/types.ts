export interface Session {
  id: string
  class_code: string
  teacher_id: string
  status: 'waiting' | 'active' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'ended'
  current_stage: number
  weights: Record<string, number>
  settings: Record<string, unknown>
  started_at?: string
  stage_ends_at?: string
  created_at?: string
}

export interface Player {
  id: string
  session_id: string
  name: string
  party: string
  district: string
  specialty: string
  pledge_code: string
  pledge_difficulty: number
  score: number
  rank: number
  device_token: string
  is_online: boolean
  created_at?: string
}

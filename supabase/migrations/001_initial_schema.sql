-- ============================================================
-- 001_initial_schema.sql
-- 민주공화국 24시 - 초기 DB 스키마
-- ============================================================

-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 2. TABLES
-- ============================================================

-- 2-1. sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code TEXT NOT NULL UNIQUE,
  teacher_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','active','stage1','stage2','stage3','stage4','stage5','ended')),
  current_stage INTEGER DEFAULT 0 CHECK (current_stage BETWEEN 0 AND 5),
  stage_ends_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  weights JSONB NOT NULL DEFAULT '{
    "bill_pass_party": 30,
    "pledge_match": 50,
    "district_align": 20,
    "district_conflict": -10,
    "co_propose": 10,
    "recall_success": 40,
    "speech": 5,
    "event_bonus": 15,
    "participation": 10
  }',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-2. players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party TEXT NOT NULL CHECK (party IN ('여','야','무')),
  district TEXT NOT NULL,
  specialty TEXT NOT NULL,
  pledge_code TEXT NOT NULL,
  pledge_difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (pledge_difficulty IN ('easy','medium','hard')),
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  device_token TEXT NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, name)
);

-- 2-3. bills
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bill_code TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('교육','환경','경제')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  important BOOLEAN NOT NULL DEFAULT false,
  proposer_id UUID REFERENCES players(id),
  co_proposer_ids UUID[] NOT NULL DEFAULT '{}',
  proposer_party TEXT CHECK (proposer_party IN ('여','야','무')),
  stage4_result TEXT CHECK (stage4_result IN ('PASS','FAIL','INVALID_QUORUM')),
  stage5_result TEXT CHECK (stage5_result IN ('PASS','FAIL','INVALID_QUORUM')),
  final_result TEXT CHECK (final_result IN ('PASS','FAIL','INVALID_QUORUM')),
  recall_used BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-4. votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('찬','반','기권')),
  stage INTEGER NOT NULL CHECK (stage IN (4, 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bill_id, player_id, stage)
);

-- 2-5. score_events (append-only)
-- event_type: 1=bill_pass 2=pledge_match 3=district_align 4=district_conflict
--             5=co_propose 6=recall_success 7=speech 8=event_bonus 9=abstain 10=participation
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  party TEXT CHECK (party IN ('여','야','무')),
  event_type INTEGER NOT NULL CHECK (event_type BETWEEN 1 AND 10),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-6. chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('party','direct','system')),
  from_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  party TEXT CHECK (party IN ('여','야','무')),
  text TEXT NOT NULL,
  profanity_checked BOOLEAN NOT NULL DEFAULT false,
  approved_by_teacher BOOLEAN,
  stage INTEGER CHECK (stage BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-7. speech_requests
CREATE TABLE speech_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','speaking','done','rejected')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-8. recall_requests
CREATE TABLE recall_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  requester_party TEXT NOT NULL CHECK (requester_party IN ('여','야','무')),
  co_requester_ids UUID[] NOT NULL DEFAULT '{}',
  amendment_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','passed','failed','expired')),
  result TEXT CHECK (result IN ('PASS','FAIL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, bill_id)
);

-- 2-9. event_logs
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  triggered_by UUID REFERENCES players(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2-10. bill_district_effects (reference table, populated by seed T04)
CREATE TABLE bill_district_effects (
  bill_code TEXT NOT NULL,
  district TEXT NOT NULL,
  delta INTEGER NOT NULL,
  PRIMARY KEY (bill_code, district)
);


-- 3. INDEXES
-- ============================================================
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_players_device_token ON players(device_token);
CREATE INDEX idx_bills_session ON bills(session_id);
CREATE INDEX idx_votes_bill ON votes(bill_id);
CREATE INDEX idx_votes_player ON votes(player_id);
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_score_events_session ON score_events(session_id);
CREATE INDEX idx_score_events_player ON score_events(player_id);
CREATE INDEX idx_chats_session_scope ON chats(session_id, scope);
CREATE INDEX idx_speech_requests_session ON speech_requests(session_id, status);


-- 4. RLS ENABLE
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_district_effects ENABLE ROW LEVEL SECURITY;


-- 4. RLS POLICIES
-- ============================================================

-- sessions: 종료되지 않은 세션은 anon 읽기 허용
CREATE POLICY "sessions_public_read" ON sessions
  FOR SELECT TO anon
  USING (status != 'ended');

-- players: 활성 세션 내 플레이어 anon 읽기 허용
CREATE POLICY "players_public_read" ON players
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = players.session_id AND s.status != 'ended'
    )
  );

-- bills: 활성 세션 법안 anon 읽기 허용
CREATE POLICY "bills_public_read" ON bills
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = bills.session_id AND s.status != 'ended'
    )
  );

-- votes: 활성 세션 투표 anon 읽기 허용 (표시판 집계용)
CREATE POLICY "votes_public_read" ON votes
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = votes.session_id AND s.status != 'ended'
    )
  );

-- score_events: 활성 세션 점수 이벤트 anon 읽기 허용
CREATE POLICY "score_events_public_read" ON score_events
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = score_events.session_id AND s.status != 'ended'
    )
  );

-- chats: anon 읽기 명시적 거부 (비공개)
CREATE POLICY "chats_no_anon" ON chats
  FOR SELECT TO anon
  USING (false);

-- speech_requests: 활성 세션 발언 요청 anon 읽기 허용
CREATE POLICY "speech_requests_public_read" ON speech_requests
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = speech_requests.session_id AND s.status != 'ended'
    )
  );

-- recall_requests: 활성 세션 재의결 요구 anon 읽기 허용
CREATE POLICY "recall_requests_public_read" ON recall_requests
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = recall_requests.session_id AND s.status != 'ended'
    )
  );

-- event_logs: 활성 세션 이벤트 로그 anon 읽기 허용
CREATE POLICY "event_logs_public_read" ON event_logs
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = event_logs.session_id AND s.status != 'ended'
    )
  );

-- bill_district_effects: 참조 테이블, anon 전체 읽기 허용
CREATE POLICY "bill_district_effects_public_read" ON bill_district_effects
  FOR SELECT TO anon USING (true);


-- 5. FUNCTIONS
-- ============================================================

-- 5-1. 플레이어 점수 재계산 함수
-- score_events 로그에서 SUM(delta * weight) 를 계산해 players.score 갱신 후 순위 업데이트
CREATE OR REPLACE FUNCTION recalculate_player_scores(p_session_id UUID)
RETURNS void AS $$
  UPDATE players p
  SET score = (
    SELECT COALESCE(SUM(se.delta * se.weight), 0)::INTEGER
    FROM score_events se
    WHERE se.player_id = p.id
      AND se.session_id = p_session_id
  ),
  rank = NULL
  WHERE p.session_id = p_session_id;

  WITH ranked AS (
    SELECT id, RANK() OVER (ORDER BY score DESC) AS new_rank
    FROM players
    WHERE session_id = p_session_id
  )
  UPDATE players p
  SET rank = r.new_rank
  FROM ranked r
  WHERE p.id = r.id;
$$ LANGUAGE sql;

-- 5-2. 법안 가결/부결 판정 함수
-- p_stage: 4 (1차 본회의), 5 (재의결)
-- important=true 이면 2/3 특별다수 (10명 기준 7표 이상)
-- 정족수: 출석(찬+반) 6명 미만이면 INVALID_QUORUM
CREATE OR REPLACE FUNCTION judge_bill(
  p_bill_id UUID,
  p_stage INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_bill bills%ROWTYPE;
  v_attended INTEGER;
  v_yes_count INTEGER;
  v_result TEXT;
BEGIN
  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id;

  SELECT
    COUNT(*) FILTER (WHERE choice IN ('찬','반')) INTO v_attended
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  SELECT
    COUNT(*) FILTER (WHERE choice = '찬') INTO v_yes_count
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  IF v_attended < 6 THEN
    v_result := 'INVALID_QUORUM';
  ELSIF v_bill.important THEN
    -- 중요 법안: 2/3 특별다수 (7표 이상)
    v_result := CASE WHEN v_yes_count >= 7 THEN 'PASS' ELSE 'FAIL' END;
  ELSE
    -- 일반 법안: 출석 과반
    v_result := CASE WHEN v_yes_count > v_attended / 2.0 THEN 'PASS' ELSE 'FAIL' END;
  END IF;

  RETURN jsonb_build_object(
    'result',     v_result,
    'passed',     v_result = 'PASS',
    'attended',   v_attended,
    'yes_count',  v_yes_count
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 002_security_fixes.sql
-- 보안 패치 및 함수 개선
--
-- [아키텍처 결정] 모든 쓰기(INSERT/UPDATE/DELETE)는
-- Next.js API 라우트에서 service_role 키로만 수행.
-- service_role은 RLS를 우회하므로 anon INSERT 정책 불필요.
-- anon 키 = 공용 화면(display) 실시간 읽기 전용.
-- ============================================================


-- 1. players.device_token 컬럼 anon 노출 차단
-- ============================================================
-- device_token은 학생 신원 인증 토큰. anon SELECT에서 제외.
-- 1-1. anon의 players 전체 SELECT 권한 회수
REVOKE SELECT ON players FROM anon;
-- 1-2. device_token 제외한 안전 컬럼만 재부여
GRANT SELECT (
  id, session_id, name, party, district, specialty,
  pledge_code, pledge_difficulty, score, rank,
  is_online, joined_at
) ON players TO anon;


-- 2. chats scope + to_player_id 일관성 CHECK 추가
-- ============================================================
ALTER TABLE chats ADD CONSTRAINT chats_scope_consistency CHECK (
  (scope = 'direct' AND to_player_id IS NOT NULL AND party IS NULL) OR
  (scope = 'party'  AND to_player_id IS NULL      AND party IS NOT NULL) OR
  (scope = 'system' AND to_player_id IS NULL      AND party IS NULL)
);


-- 3. speech_requests 동시 pending 방지 partial unique index
-- ============================================================
CREATE UNIQUE INDEX idx_speech_one_active
  ON speech_requests(session_id, player_id, bill_id)
  WHERE status IN ('pending','approved','speaking');


-- 4. score_events weight precision 확장
-- ============================================================
ALTER TABLE score_events ALTER COLUMN weight TYPE NUMERIC(6,2);


-- 5. score_events 복합 인덱스 개선
-- ============================================================
DROP INDEX IF EXISTS idx_score_events_session;
DROP INDEX IF EXISTS idx_score_events_player;
CREATE INDEX idx_score_events_session_player ON score_events(session_id, player_id, created_at DESC);


-- 6. recalculate_player_scores — 단일 CTE로 race condition 수정
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_player_scores(p_session_id UUID)
RETURNS void AS $$
  -- 단일 CTE: SUM과 RANK를 같은 스냅샷 기준으로 계산
  WITH agg AS (
    SELECT
      player_id,
      COALESCE(SUM(delta * weight), 0)::INTEGER AS new_score
    FROM score_events
    WHERE session_id = p_session_id
    GROUP BY player_id
  ),
  ranked AS (
    SELECT
      p.id,
      COALESCE(a.new_score, 0) AS s,
      RANK() OVER (ORDER BY COALESCE(a.new_score, 0) DESC) AS r
    FROM players p
    LEFT JOIN agg a ON a.player_id = p.id
    WHERE p.session_id = p_session_id
  )
  UPDATE players p
  SET score = r.s,
      rank  = r.r
  FROM ranked r
  WHERE p.id = r.id;
$$ LANGUAGE sql;


-- 7. judge_bill — NOT FOUND 처리 추가
-- ============================================================
CREATE OR REPLACE FUNCTION judge_bill(
  p_bill_id UUID,
  p_stage   INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_bill      bills%ROWTYPE;
  v_attended  INTEGER;
  v_yes_count INTEGER;
  v_result    TEXT;
BEGIN
  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'judge_bill: bill not found (id=%)', p_bill_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE choice IN ('찬','반')) INTO v_attended
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  SELECT
    COUNT(*) FILTER (WHERE choice = '찬') INTO v_yes_count
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  -- 정족수: 재적 10명 기준 출석(찬+반) 6명 미만 → 유회
  IF v_attended < 6 THEN
    v_result := 'INVALID_QUORUM';
  ELSIF v_bill.important THEN
    -- 중요 법안: 재적 2/3 이상 찬성 (10명 기준 7표)
    v_result := CASE WHEN v_yes_count >= 7 THEN 'PASS' ELSE 'FAIL' END;
  ELSE
    -- 일반 법안: 출석 과반 찬성
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


-- 8. event_logs CHECK 명시
-- ============================================================
ALTER TABLE event_logs ADD CONSTRAINT event_logs_type_check
  CHECK (event_type IN (
    'mass_protest', 'press_scoop', 'poll_reveal',
    'party_change', 'speaker_direct', 'disaster'
  ));

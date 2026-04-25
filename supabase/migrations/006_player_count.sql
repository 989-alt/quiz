-- 006_player_count.sql
-- sessions에 player_count 컬럼 추가 + judge_bill 동적 정족수 업데이트

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS player_count INT NOT NULL DEFAULT 10
  CONSTRAINT player_count_range CHECK (player_count >= 10 AND player_count <= 30);

-- judge_bill 함수를 동적 정족수로 교체
CREATE OR REPLACE FUNCTION judge_bill(
  p_bill_id UUID,
  p_stage INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_bill           bills%ROWTYPE;
  v_session        sessions%ROWTYPE;
  v_attended       INTEGER;
  v_yes_count      INTEGER;
  v_quorum_min     INTEGER;
  v_supermajority  INTEGER;
  v_result         TEXT;
BEGIN
  SELECT * INTO v_bill    FROM bills    WHERE id = p_bill_id;
  SELECT * INTO v_session FROM sessions WHERE id = v_bill.session_id;

  -- 동적 정족수: 참석 과반 / 중요법안은 2/3 특별다수
  v_quorum_min    := CEIL(v_session.player_count::NUMERIC * 0.5);
  v_supermajority := CEIL(v_session.player_count::NUMERIC * 2.0 / 3.0);

  SELECT
    COUNT(*) FILTER (WHERE choice IN ('찬', '반'))
  INTO v_attended
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  SELECT
    COUNT(*) FILTER (WHERE choice = '찬')
  INTO v_yes_count
  FROM votes
  WHERE bill_id = p_bill_id AND stage = p_stage;

  IF v_attended < v_quorum_min THEN
    v_result := 'INVALID_QUORUM';
  ELSIF v_bill.important THEN
    v_result := CASE WHEN v_yes_count >= v_supermajority THEN 'PASS' ELSE 'FAIL' END;
  ELSE
    v_result := CASE WHEN v_yes_count > v_attended / 2.0 THEN 'PASS' ELSE 'FAIL' END;
  END IF;

  RETURN jsonb_build_object(
    'result',    v_result,
    'passed',    v_result = 'PASS',
    'attended',  v_attended,
    'yes_count', v_yes_count,
    'quorum',    v_quorum_min,
    'supermajority', v_supermajority
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 003_nullable_role_columns.sql
-- 역할 컬럼 nullable 전환
--
-- 학생 join 시 party/district/specialty/pledge_code/pledge_difficulty 미결정.
-- game start(T04) 시 배정하므로 NOT NULL 제약 해제.
-- PG에서 NULL은 CHECK 조건을 UNKNOWN으로 평가 → 위반 아님.
-- ============================================================

ALTER TABLE players
  ALTER COLUMN party             DROP NOT NULL,
  ALTER COLUMN district          DROP NOT NULL,
  ALTER COLUMN specialty         DROP NOT NULL,
  ALTER COLUMN pledge_code       DROP NOT NULL,
  ALTER COLUMN pledge_difficulty DROP NOT NULL;

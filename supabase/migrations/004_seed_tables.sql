-- ============================================================
-- 004_seed_tables.sql
-- 게임 참조 테이블 정의
-- bill_templates: 세션 시작 시 bills 테이블로 복사되는 법안 원본
-- pledge_definitions: 공약 코드 설명 (클라이언트 표시용)
-- ============================================================


-- 1. bill_templates
-- ============================================================
CREATE TABLE bill_templates (
  bill_code      TEXT PRIMARY KEY,
  area           TEXT NOT NULL CHECK (area IN ('교육','환경','경제')),
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  important      BOOLEAN NOT NULL DEFAULT false,
  proposer_party TEXT CHECK (proposer_party IN ('여','야','무')),
  display_order  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE bill_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bill_templates_public_read" ON bill_templates
  FOR SELECT TO anon USING (true);


-- 2. pledge_definitions
-- ============================================================
CREATE TABLE pledge_definitions (
  code              TEXT PRIMARY KEY,
  label             TEXT NOT NULL,
  description       TEXT NOT NULL,
  area              TEXT NOT NULL CHECK (area IN ('교육','환경','경제','사회')),
  target_bill_codes TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE pledge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pledge_definitions_public_read" ON pledge_definitions
  FOR SELECT TO anon USING (true);

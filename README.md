# 민주공화국 24시

초등 5–6학년 대상 입법 시뮬레이션 게임 MVP (교사 1명 + 학생 10명)

---

## 빠른 시작

### 1. 의존성 설치

```bash
pnpm install
```

### 2. Supabase 프로젝트 준비

[supabase.com](https://supabase.com)에서 새 프로젝트를 만든 뒤 **Project Settings > API**에서 URL과 키를 복사합니다.

```bash
cp .env.local.example .env.local
# .env.local 열어서 세 값 채우기
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. 마이그레이션 실행

Supabase Dashboard > **SQL Editor**에서 아래 파일을 순서대로 실행합니다.

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `supabase/migrations/001_extensions.sql` | pgcrypto, uuid |
| 2 | `supabase/migrations/002_sessions.sql` | sessions 테이블 |
| 3 | `supabase/migrations/003_players.sql` | players 테이블 |
| 4 | `supabase/migrations/004_seed_tables.sql` | bills, pledges, 이벤트 로그 |
| 5 | `supabase/migrations/005_seed_data.sql` | 법안 10종, 공약 15종, 지역구 이해관계 |

> Supabase CLI가 있다면: `supabase db push`

### 4. 개발 서버 실행

```bash
pnpm dev
```

`http://localhost:3000` 접속 후 교사 화면에서 게임을 시작합니다.

---

## 화면 구성

| URL | 역할 |
|-----|------|
| `/` | 홈 (교사 코드 입력 / 학생 참가) |
| `/teacher/[code]` | 교사 제어판 (단계 진행, 이벤트 카드, PDF 다운로드) |
| `/student/[code]` | 학생 화면 (공약, 투표, 점수 실시간) |
| `/display/[code]` | TV/빔프로젝터용 공용 진행 화면 |

---

## 데모 시나리오 (교사 1명 + 학생 3명 + TV)

1. **교사 기기** → `/teacher` 접속 → 새 세션 생성 → 클래스 코드 `ABCD` 발급
2. **TV/빔** → `/display/ABCD` 접속 (전체 화면)
3. **학생 기기 1–3** → `/student/ABCD` 접속 → 이름 입력
4. 교사가 **"게임 시작"** 클릭 → 1단계(역할 배정) 자동 진행
5. 단계별 교사가 **"다음 단계"** 클릭 → 학생 화면과 TV가 Realtime으로 동기화
6. 4단계 종료 후 자동 표결 → 5단계에서 재의결 지정 가능
7. 종료 후 교사 화면에서 **"의사록 PDF 다운로드"**

---

## 제한 사항 (MVP)

- 최대 10명 동시 참여 (플레이어 슬롯 고정)
- 이벤트 카드는 교사가 수동 발동 (자동 랜덤 미구현)
- PDF 폰트: NanumGothic CDN 의존 (오프라인 환경에서 로컬 폰트 경로 변경 필요)
- Supabase 무료 티어: 동시 접속 200개 제한

---

## 기술 스택

- **Next.js 14** (App Router) + TypeScript strict
- **Supabase** (Postgres + Realtime broadcast + RLS)
- **Zustand** 전역 상태 + **XState v5** 게임 단계 FSM
- **Framer Motion** UI 트랜지션
- **@react-pdf/renderer v4** 의사록 PDF 생성
- **next-pwa** PWA 지원 (오프라인 캐시)

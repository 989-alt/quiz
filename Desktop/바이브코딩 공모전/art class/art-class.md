📄 PRD: 커스텀 미술 도안 생성기 (AI Art Class Workspace) v1.0
1. 제품 개요 (Product Overview)
제품 비전: 교사가 원하는 주제, 난이도, 분할 크기를 입력하면 즉각적으로 수업용 흑백 선화 도안을 생성하고, AI와의 상호작용을 통해 디테일을 완성해 나가는 '개인화된 미술 교보재 워크스페이스'.

타겟 유저: 초중고 미술 교사 및 학부모 (PC 웹 환경 한정, 모바일 미지원).

핵심 가치 (Killer Feature): 구글 검색으로는 찾을 수 없는 '맞춤형 종횡비/난이도' 제공 및 '대화형 반복 수정(Quick Edit)'을 통한 도안 최적화.

2. 시스템 아키텍처 (System Architecture)
프론트엔드: React.js 기반 Serverless SPA (Single Page Application).

인프라: GitHub Pages 호스팅 (서버 유지비 제로).

AI 모델: Gemini Nano Banana (텍스트-투-이미지, 이미지 편집, 고해상도 렌더링).

데이터 보안: BYOK(Bring Your Own Key) 방식. API 키 및 히스토리 스택은 서버 전송 없이 브라우저 localStorage 및 메모리에서만 관리.

3. 핵심 기능 명세 (Core Features)
3.1. BYOK 및 온보딩 (API Key Management)
기능: 사용자가 직접 발급받은 API 키를 입력하여 서비스를 이용.

보안: 입력된 키는 브라우저 내부에만 저장되며, 화면에 평문으로 노출되지 않음 (Masking 처리).

에러 핸들링: API 키가 없거나 유효하지 않을 경우, 생성을 차단하고 키 설정 페이지로 유도.

3.2. 동적 입력 폼 & 안전 필터 (Dynamic Form & Safety)
모드 선택: * 자유 주제 (협동화/정물화): 교사가 원하는 텍스트를 직접 입력 (예: "사과 바구니").

만다라 모드: 자유 입력 차단, 안전 프리셋 드롭다운(우주, 자연, 꽃, 눈 등) 제공으로 프롬프트 충돌 원천 방지.

난이도 제어: 하/중/상 3단계. (백그라운드에서 프롬프트 복잡도로 치환됨).

분할 그리드(NxM) 선택: 교사가 N(가로) x M(세로) 조각 수를 선택하면, AI 모델 요청 시 해당 비율(Aspect Ratio)을 동적 계산하여 반영.

안전 필터 에러: AI 정책 위반 단어 입력 시 크레딧 차감 없이 "⚠️ 안전 정책 위반" Toast 알림 노출.

3.3. AI 생성 & UI 상태 관리 (Generation & UI State)
스켈레톤 로딩 (Skeleton UI): 생성 버튼 클릭 시 10~15초의 지연 시간을 보완하기 위해 캔버스 영역에 스켈레톤 UI 노출.

동적 진행 메시지: 로딩 중 "AI가 밑그림을 스케치하는 중..." -> "펜 터치를 다듬는 중..." 형태의 상태 텍스트 전환 애니메이션.

다중 클릭 방지: 생성 중에는 모든 입력 폼과 버튼 disabled 처리.

3.4. Quick Edit & 히스토리 스택 (Iterative Refinement)
기능: 생성된 도안 하단에 [선 굵게], [디테일 단순화], [배경 패턴 추가] 등의 칩(Chip) 버튼 제공. (Nano Banana의 Image+Text-to-Image 기능 활용).

히스토리 스택 (Undo): * OOM(Out of Memory) 방지를 위해 최대 저장 깊이(Max Depth)는 3회로 제한.

3회를 초과하면 가장 오래된 이미지 데이터 파기.

[↩️ 이전으로 되돌리기] 버튼을 통해 즉각적인 롤백 지원.

과금 투명성 고지: 수정 UI 상단에 붉은색 텍스트로 "⚠️ 빠른 수정 기능은 추가 API 크레딧을 소모합니다." 명시.

3.5. 벡터화 및 무여백 PDF 출력 (Export Module)
해상도 한계 돌파: 생성된 Raster 이미지를 다운로드 직전 프론트엔드(imagetracerjs 등)에서 SVG(Vector)로 변환하여 선 깨짐 방지.

분할 및 출력: 선택된 N x M 그리드에 맞춰 수학적으로 캔버스를 자른 뒤, jsPDF를 활용해 A4 사이즈(210x297mm) (x:0, y:0) 좌표에 여백 없이 삽입하여 다중 페이지 PDF로 다운로드 제공.

4. 비기능 요구사항 (Non-Functional Requirements)
성능 (Performance): 히스토리 스택의 Base64 이미지 데이터는 최대 3개로 유지하여 브라우저 메모리 20MB 이하 점유 보장.

호환성 (Compatibility): 모바일 브라우저 대응 제외. 최신 Chrome, Edge, Safari (PC 버전) 기준 최적화.
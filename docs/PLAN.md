<!-- 작성: 2026-11-12 12:43 KST -->

# AI 공감 다이어리 작업 계획

오늘 있었던 일을 한 줄로 쓰면 AI가 감정을 분석하고 공감·위로 메시지를 돌려주는 일기 앱을 만드는 단계별 계획입니다.
`.claude/agents`의 에이전트 5개가 역할을 나눠 맡습니다.

> **진행 규칙:** 한 단계가 끝나면 확인 결과를 보고하고 멈춥니다. 사용자가 "계획의 N단계를 진행해줘."라고 할 때만 다음 단계로 넘어갑니다.

## 진행 현황

단계가 시작되거나 끝날 때마다 이 표의 상태를 고칩니다. (상태: 대기 / 진행 중 / 완료)

| 단계 | 내용 | 담당 | 상태 | 태그 |
|---|---|---|---|---|
| 0단계 | PRD | product-manager | 완료 | `DIARY_00_02` (작업 계획과 PRD) |
| 1단계 | 뼈대 | backend-developer | 완료 (구글 로그인 실제 확인은 3단계) | `DIARY_01_01` (1단계 뼈대) |
| 2단계 | 백엔드·AI·화면 동시 진행 | backend-developer, ai-integration-specialist, frontend-developer | 완료 | `DIARY_02_01` (2단계 병렬 구현) |
| 3단계 | 통합 | backend-developer 외 | 완료 (사용자 요청 변경: 줄바꿈 허용, 강도 5단계, 기록 화면 개편) | `DIARY_03_01` (3단계 통합) |
| 4단계 | QA | qa-engineer | 대기 | `DIARY_04_01` (4단계 QA) |
| 5단계 | 배포 | backend-developer, product-manager, qa-engineer | 대기 | 없음 |
| 반추 | CLAUDE.md·README 정리 | 본 대화의 클로드 | 대기 | `DIARY_05_01` (반추와 문서) |

---

## 요구사항 요약

| 항목 | 내용 |
|---|---|
| 사용자 | 구글 계정으로 로그인한 사용자(Auth.js). 자기 일기만 볼 수 있다 |
| 기능 | 한 줄 일기 쓰기, 감정 분석과 공감 메시지, 지난 기록 보기, 위기 표현 시 전문 상담 연락처 안내 |
| 기술 | Next.js(App Router, TypeScript), Supabase Postgres(`DATABASE_URL`)의 새 `diary` 스키마 |
| AI | OpenRouter. 1순위 `nvidia/nemotron-3-ultra-550b-a55b:free` → 응답 없음·오류 시 2순위 `nvidia/nemotron-3.5-super-vl:free`. 키는 `OPENROUTER_API_KEY` |
| 배포 | GitHub `hannah0326/ai-empathy-diary-ch7` → Vercel |
| 느낌 | 따뜻하고 편안한 일기장 화면 |

## 꼭 지킬 규칙

- **다른 스키마는 건드리지 않는다.** 모든 SQL은 `diary.` 스키마 이름을 붙여 쓰고, 마이그레이션은 `diary` 스키마 안의 객체만 만든다. 다른 스키마를 바꾸거나 지우는 SQL, 스키마 전체를 맞추는 자동 동기화 명령(`db push` 같은)은 쓰지 않는다.
- **자기 일기만 보인다.** 모든 조회·수정·삭제 쿼리는 로그인한 사용자의 ID 조건을 서버에서 붙인다. 화면에서 보낸 사용자 ID는 믿지 않는다.
- **비밀값 보호.** `.env`는 열거나 출력하지 않고 변수 이름만 쓴다. API 키는 서버 코드에서만 읽는다.
- **위기 안내는 AI에만 맡기지 않는다.** 서버의 키워드 검사와 AI 판단 중 하나라도 위기로 보면 안내하고, AI가 실패해도 키워드 검사는 항상 돈다. 상담 연락처는 AI가 만들지 않고 코드에 고정된 내용을 보여준다.

## 환경 변수 (이름만)

| 이름 | 용도 | 준비 |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres 연결 | `.env`에 있음 |
| `OPENROUTER_API_KEY` | OpenRouter 호출 | `.env`에 있음 |
| `AUTH_SECRET` | Auth.js 세션 암호화 | 1단계에서 사용자가 생성해 `.env`에 추가 |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | 구글 로그인 | 사용자가 Google Cloud Console에서 OAuth 클라이언트를 만들어 `.env`에 추가 |

`.env.example`에는 위 이름만 값 없이 적어 저장소에 올립니다.

## 담당과 작업 영역

2단계에서 세 에이전트가 동시에 일하므로, 서로 같은 파일을 고치지 않게 폴더를 나눕니다.

| 에이전트 | 모델 | 맡는 폴더 |
|---|---|---|
| product-manager | sonnet | `docs/` |
| backend-developer | sonnet | `app/api/`, `lib/db/`, `lib/crisis/`, `db/migrations/`, `auth.ts` |
| ai-integration-specialist | sonnet | `lib/ai/` |
| frontend-developer | sonnet | `app/`의 화면(`app/api/` 제외), `components/`, 스타일 |
| qa-engineer | haiku | `tests/`, `docs/QA_REPORT.md` |

공통 계약 파일 `lib/types.ts`는 1단계에서 확정하고, 2단계에서는 바꾸지 않습니다. 바꿔야 하면 멈추고 보고합니다.

---

## 0단계: PRD

**담당:** product-manager

**할 일**
- `docs/PRD.md` 작성: 목표, 사용자 스토리, 기능 우선순위(필수 / 있으면 좋음 / 나중에), 범위 밖 항목, 위험 요소.
- 화면 목록과 흐름: 로그인 → 일기 쓰기 → 결과(감정·공감 메시지) → 지난 기록.
- 일기 규칙 정하기: 글자 수 제한(예: 200자), 하루 여러 번 쓰기 허용 여부, 수정·삭제 허용 여부.
- 감정 분류 목록 정하기(예: 기쁨, 슬픔, 불안, 화남, 지침, 평온 등)와 강도 표현 방식.
- 위기 대응 정책: 위기로 볼 표현의 기준, 안내 문구, 상담 연락처 목록(예: 자살예방상담전화 109, 정신건강위기상담 1577-0199, 청소년상담 1388, 긴급 112·119). 연락처는 공식 출처로 다시 확인해 출처를 적는다.
- 열린 질문 정리. 특히 아래는 사용자 결정이 필요하다.
  - 무료 모델은 제공사가 입력을 기록하거나 학습에 쓸 수 있다. 민감한 일기를 무료 모델에 보내도 되는지, 이용 안내에 알릴지.
  - 두 모델이 모두 실패했을 때 일기만 저장하고 나중에 다시 분석할지.

**끝났는지 확인하는 법**
- [ ] `docs/PRD.md`에 위 항목이 모두 있다.
- [ ] 기능마다 "완료 기준"이 한 줄 이상 적혀 있다.
- [ ] 상담 연락처마다 확인한 출처가 적혀 있다.
- [ ] 열린 질문에 사용자가 답했고, 그 답이 PRD에 반영됐다.
- [ ] 사용자가 PRD를 승인했다.

---

## 1단계: 뼈대

**담당:** backend-developer (주), frontend-developer, ai-integration-specialist (계약 검토)

**할 일**
- Next.js(App Router, TypeScript) 프로젝트 생성, ESLint, 테스트 도구(Vitest) 설정.
- `.env.example` 작성(이름만), `.gitignore`에 `.env` 제외가 그대로인지 확인.
- Auth.js 구글 로그인 설정. 세션은 JWT 방식으로 하고 일기의 주인은 구글 계정 고유 ID로 구분한다(인증용 표를 따로 만들지 않아 DB가 단순해진다).
- 로그인하지 않은 사용자는 일기 화면과 API에 접근하지 못하게 막는다.
- DB 연결 모듈(`lib/db/`). Vercel 서버리스 환경을 고려해 Supabase 연결 풀러 주소를 쓰는지 사용자에게 확인한다(값은 출력하지 않음).
- 첫 마이그레이션 `db/migrations/001_diary_schema.sql`: `CREATE SCHEMA IF NOT EXISTS diary`와 `diary.entries` 표(일기 ID, 사용자 ID, 내용, 감정, 감정 강도, 공감 메시지, 위기 여부, 사용한 모델, 작성 시각), 사용자 ID·작성 시각 인덱스.
- 마이그레이션 실행 스크립트(`npm run db:migrate`): `diary` 스키마 SQL만 실행한다.
- 공통 계약 `lib/types.ts`와 `docs/API.md` 확정
  - `POST /api/entries`: 일기 저장 + 분석 결과 반환
  - `GET /api/entries`: 내 일기 목록(최신순, 페이지 나눔)
  - `GET /api/entries/[id]`: 내 일기 하나
  - AI 함수 형태: `analyzeDiary(text) → { emotion, intensity, message, crisis, model }`
- 빈 화면 틀: 로그인 페이지, 일기 쓰기 페이지, 기록 페이지.

**사용자가 할 일**
- Google Cloud Console에서 OAuth 클라이언트 생성, 리디렉션 주소 `http://localhost:3000/api/auth/callback/google` 등록.
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`을 `.env`에 추가.

**끝났는지 확인하는 법**
- [ ] `npm run build`와 `npm run lint`가 오류 없이 끝난다.
- [ ] `npm run dev` 후 구글 로그인과 로그아웃이 된다.
- [ ] 로그인하지 않고 `/api/entries`를 부르면 401이 돌아온다.
- [ ] 마이그레이션 전후로 `diary`가 아닌 스키마의 표 목록과 개수가 같다(`information_schema.tables` 비교 결과를 보고).
- [ ] `diary.entries` 표가 만들어졌다.
- [ ] `lib/types.ts`와 `docs/API.md`를 세 개발 에이전트가 검토했고 사용자가 승인했다.

---

## 2단계: 백엔드·AI·화면 동시 진행

세 에이전트가 1단계의 계약(`lib/types.ts`, `docs/API.md`)만 보고 각자 폴더에서 동시에 작업합니다.

### backend-developer
- 일기 API 세 개 구현. 모든 쿼리에 로그인 사용자 ID 조건을 붙인다.
- 입력 검증: 빈 일기, 글자 수 초과, 잘못된 ID.
- 위기 키워드 검사 모듈 `lib/crisis/`(자해, 극단적 선택 등 PRD의 기준). AI 결과와 합쳐 하나라도 위기면 `crisis: true`.
- AI 모듈은 계약대로 부르되, 2단계 동안은 가짜 응답으로 시험한다.
- 두 모델이 모두 실패해도 일기는 저장하고, 분석 실패 상태를 돌려준다(PRD 결정에 따름).
- 단위 테스트: 남의 일기 조회 차단, 입력 검증, 위기 판단 합치기.

### ai-integration-specialist
- `lib/ai/`에 OpenRouter 호출 구현(`https://openrouter.ai/api/v1/chat/completions`).
- 1순위 모델 호출 → 시간 초과(예: 20초), 오류 응답, 빈 응답, 형식이 맞지 않는 응답이면 2순위 모델로 넘어간다. 어느 모델이 답했는지 결과에 기록한다.
- 시작할 때 두 모델 이름이 OpenRouter 모델 목록에 실제로 있는지 확인하고 결과를 보고한다.
- 프롬프트: 감정 분류(PRD 목록 중 하나), 강도, 따뜻한 공감·위로 메시지(2~4문장, 진단·충고 대신 공감), 위기 여부를 JSON으로 받는다.
- 일기 내용 속 지시문에 휘둘리지 않게 프롬프트를 짠다(프롬프트 인젝션 대비).
- 테스트용 일기 10개 이상(평범한 날, 기쁜 날, 힘든 날, 위기 표현 포함)으로 결과를 확인하고 `docs/PROMPT.md`에 프롬프트와 결과를 기록한다.

### frontend-developer
- 따뜻하고 편안한 일기장 느낌: 부드러운 종이색 배경, 따뜻한 색, 읽기 편한 한글 글꼴, 넉넉한 여백.
- 일기 쓰기 화면: 한 줄 입력, 남은 글자 수, 보내는 동안 기다림 표시.
- 결과 화면: 감정과 강도, 공감 메시지. `crisis`가 참이면 상담 연락처 카드를 눈에 잘 띄게 보여주고 전화 링크(`tel:`)를 단다.
- 기록 화면: 날짜별 목록과 감정 표시.
- 로딩, 빈 기록, 오류, AI 분석 실패 상태를 모두 화면으로 만든다.
- 반응형(휴대폰 우선)과 웹 접근성(키보드 조작, 대체 텍스트, 색 대비).
- 2단계 동안은 계약 형태의 가짜 데이터로 화면을 만든다.

**끝났는지 확인하는 법**
- [ ] 세 에이전트 모두 자기 폴더 밖의 파일을 바꾸지 않았다(`git diff --stat`으로 확인).
- [ ] `npm run build`, `npm run lint`, `npm test`가 모두 통과한다.
- [ ] 백엔드: 다른 사용자의 일기 ID로 조회하면 404가 돌아오는 테스트가 있고 통과한다.
- [ ] AI: 1순위 모델이 실패하는 상황(가짜 오류, 시간 초과)에서 2순위 모델로 넘어가는 테스트가 통과한다.
- [ ] AI: 실제 두 모델로 테스트 일기를 돌린 결과가 `docs/PROMPT.md`에 있다.
- [ ] 위기 표현이 든 테스트 일기는 AI 결과와 상관없이 모두 `crisis: true`가 된다.
- [ ] 화면: 휴대폰 너비(375px)와 데스크톱에서 모든 화면이 깨지지 않는다(스크린샷 첨부).

---

## 3단계: 통합

**담당:** backend-developer (주), frontend-developer, ai-integration-specialist

**할 일**
- 가짜 응답·가짜 데이터를 걷어내고 화면 → API → AI → DB를 실제로 연결한다.
- 전체 흐름 점검: 로그인 → 일기 쓰기 → 감정·공감 메시지 → 기록에서 다시 보기.
- 통합하며 나온 계약 차이를 고치고 `docs/API.md`를 최신으로 맞춘다.

**끝났는지 확인하는 법**
- [ ] `npm run dev`에서 위 전체 흐름이 실제 구글 계정, 실제 DB, 실제 AI로 동작한다.
- [ ] 쓴 일기가 `diary.entries`에 저장되고 새로고침 후 기록 화면에 보인다.
- [ ] 위기 표현 일기를 쓰면 공감 메시지와 상담 연락처가 함께 보인다.
- [ ] 1순위 모델 이름을 일부러 틀리게 바꿔도 2순위 모델 답이 나온다(확인 후 원래대로).
- [ ] `npm run build`, `npm test`가 통과한다.

---

## 4단계: QA

**담당:** qa-engineer (발견한 문제는 해당 개발 에이전트가 고침)

**할 일**
- PRD의 기능별 완료 기준대로 기능 시험.
- 오류 처리 시험: 빈 입력, 글자 수 초과, 로그인 만료, AI 시간 초과, 두 모델 모두 실패, DB 연결 실패.
- 보안 시험: 다른 계정으로 남의 일기 ID 조회, 로그인 없이 API 호출, 브라우저로 내려가는 코드에 API 키가 없는지.
- 위기 대응 시험: 다양한 위기 표현(돌려 말하기 포함)과 평범한 문장(오탐)을 넣어 결과 확인.
- 화면 시험: 휴대폰·데스크톱, 키보드만으로 조작, 색 대비.
- 코드 리뷰와 `docs/QA_REPORT.md` 작성(심각도, 위치, 재현 방법, 예상·실제 결과, 고칠 방법).

**끝났는지 확인하는 법**
- [ ] `docs/QA_REPORT.md`가 있고, 치명·높음 문제가 모두 고쳐져 다시 시험해 통과했다.
- [ ] 계정 두 개로 시험해 서로의 일기가 보이지 않는다.
- [ ] 빌드 결과물(`.next/static`)에서 `OPENROUTER_API_KEY` 값이나 이름이 검색되지 않는다.
- [ ] 다른 스키마의 표 목록과 개수가 1단계 기록과 같다.
- [ ] `npm run build`, `npm run lint`, `npm test`가 모두 통과한다.

---

## 5단계: 배포

**담당:** backend-developer (주), product-manager (출시 점검), qa-engineer (배포 후 확인)

**할 일**
- GitHub `ai-empathy-diary-ch7`의 `main`에 올린다.
- Vercel에 저장소를 연결한다.
- Vercel 환경 변수에 `DATABASE_URL`, `OPENROUTER_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`을 넣는다(사용자가 직접 입력).
- Google OAuth 클라이언트에 배포 주소의 리디렉션 주소(`https://<배포주소>/api/auth/callback/google`)를 추가한다(사용자가 직접).
- 배포는 Vercel과 구글 설정만 바꾸므로 커밋과 태그가 없다. `README.md`와 `CLAUDE.md` 정리는 배포 뒤 반추에서 한다.

**끝났는지 확인하는 법**
- [ ] Vercel 빌드가 성공한다.
- [ ] 배포 주소에서 구글 로그인 → 일기 쓰기 → 공감 메시지 → 기록 보기가 된다.
- [ ] 배포 주소에서 위기 표현 일기에 상담 연락처가 나온다.
- [ ] 저장소에 `.env`가 없다(GitHub 파일 목록으로 확인).
- [ ] product-manager가 PRD의 필수 기능을 모두 확인했다.

---

## 진행 방법

1. 사용자가 "계획의 N단계를 진행해줘."라고 하면 해당 단계 담당 에이전트에게 일을 맡긴다. 2단계는 세 에이전트를 동시에 돌린다.
2. 단계가 끝나면 "끝났는지 확인하는 법"의 결과를 표로 보고하고, 진행 현황 표의 상태를 고친 뒤 멈춘다.
3. 커밋은 사용자가 커밋 문장을 보낼 때만 한다. 바뀐 내용을 내용별로 나눠 커밋하고, 마지막 커밋에 진행 현황 표의 태그를 붙여 `main` 브랜치와 태그를 함께 올린다.
4. 이 작업 계획은 0단계의 PRD와 함께 커밋한다(`DIARY_00_02`).
5. 배포 뒤 반추에서 이번 개발에서 정한 규칙을 `CLAUDE.md`에 정리하고, 사용자 설명과 개발자 설명, 배포 주소를 담은 `README.md`를 쓴다(`DIARY_05_01`).

> 참고: `.claude/agents`의 에이전트는 이 폴더에서 새로 연 세션부터 불러 쓸 수 있습니다.

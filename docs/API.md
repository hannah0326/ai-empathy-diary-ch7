<!-- 작성: 2026-11-19 11:00 KST -->

# API 계약

AI 공감 다이어리의 서버 API 형식입니다. 타입 정의는 `lib/types.ts`가 기준이며, 이 문서와 어긋나면 안 됩니다.
2단계에서는 이 계약을 바꾸지 않습니다. 바꿔야 하면 멈추고 보고합니다.

## 공통 규칙

- 본문은 JSON(`Content-Type: application/json`), 문자 인코딩은 UTF-8입니다.
- **로그인 필요.** 세션(Auth.js JWT 쿠키)이 없으면 모든 `/api/entries` 경로가 `401`을 돌려줍니다.
- **사용자 ID는 서버가 세션에서만 얻습니다**(구글 계정 고유 ID `sub`). 요청 본문·쿼리·헤더로 받은 사용자 ID는 쓰지 않습니다. 응답에도 사용자 ID를 싣지 않습니다.
- 모든 응답에 `Cache-Control: no-store`를 붙입니다(개인 정보).
- 일기 내용은 글자로만 다룹니다. 화면은 HTML로 해석하지 않고 출력합니다.
- 시각은 ISO 8601 UTC 문자열(`2026-11-19T01:02:03.000Z`)로 주고받습니다. 화면에서 KST로 표시하고, "하루" 계산(상한)은 KST 기준입니다.

## 오류 형식

모든 오류는 같은 모양입니다. `message`는 화면에 그대로 보여줄 수 있는 한국어 문장입니다.

```json
{ "error": { "code": "validation_error", "message": "일기는 200자까지 쓸 수 있어요." } }
```

| 상태 | `code` | 언제 |
|---|---|---|
| 401 | `unauthorized` | 로그인하지 않았거나 세션을 확인할 수 없음 |
| 400 | `invalid_json` | 요청 본문이 JSON이 아님 |
| 400 | `validation_error` | 빈 일기, 200자 초과, 문자열이 아닌 값, 잘못된 일기 ID(UUID 아님), 잘못된 커서 |
| 404 | `not_found` | 일기가 없거나 **남의 일기**(둘을 구분하지 않음) |
| 429 | `daily_limit_exceeded` | 하루(KST) 20건 상한 초과 |
| 501 | `not_implemented` | 1단계 뼈대. 2단계에서 사라짐 |
| 500 | `internal_error` | 서버 오류. 내부 정보(쿼리, 주소, 키)는 싣지 않음 |

검사 순서: 로그인(401) → 형식 검증(400) → 처리(404, 429, 500).

## 일기 객체 `Entry`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "오늘 발표를 무사히 마쳤다",
  "emotion": "기쁨",
  "intensity": 2,
  "message": "발표를 잘 마치셨다니 정말 뿌듯하시겠어요. ...",
  "crisis": false,
  "analysisStatus": "done",
  "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "createdAt": "2026-11-19T01:02:03.000Z"
}
```

| 필드 | 형식 | 설명 |
|---|---|---|
| `id` | UUID 문자열 | 일기 ID |
| `content` | 문자열 | 1~200자, 한 줄 |
| `emotion` | `기쁨` `설렘` `평온` `슬픔` `외로움` `불안` `화남` `지침` 중 하나, 또는 `null` | 분석이 `done`일 때만 값이 있음 |
| `intensity` | `1` `2` `3` 또는 `null` | 1 약함, 2 보통, 3 강함. `done`일 때만 값이 있음 |
| `message` | 문자열 또는 `null` | 공감 메시지 2~4문장. `done`일 때만 값이 있음 |
| `crisis` | 불리언 | 서버 키워드 검사 OR AI 판단. **분석이 실패해도** 키워드 결과가 반영됨. 참이면 화면이 연락처 카드를 보여줌 |
| `analysisStatus` | `pending` `done` `failed` | 분석 대기(저장만 됨) / 성공 / 두 모델 모두 실패 |
| `model` | 문자열 또는 `null` | 실제로 답한 모델 이름. `done`일 때만 값이 있음 |
| `createdAt` | ISO 문자열 | 작성 시각 |

`analysisStatus`가 `failed`이면 화면은 "분석을 하지 못했어요. 일기는 저장됐어요"를 보여줍니다(다시 분석은 F8, 나중에). 위기(`crisis`)가 참이면 감정 값과 상관없이 상담 연락처 카드를 보여줍니다. 연락처는 코드에 고정된 내용이며 API로 내려주지 않습니다.

---

## POST /api/entries — 일기 저장 + 분석 결과 반환

요청

```json
{ "content": "오늘 발표를 무사히 마쳤다" }
```

- `content`: 문자열. 줄 바꿈은 공백으로 바꾸고 앞뒤 공백을 지운 뒤 1자 이상, 200자 이하(글자 단위)여야 합니다.

성공: **201**

```json
{ "entry": { "...": "Entry 객체" } }
```

- 분석이 성공하면 `analysisStatus: "done"`, 두 모델이 모두 실패하면 `analysisStatus: "failed"`로 **같은 201**을 돌려줍니다(일기는 저장됨).
- 오류: 401, 400(`invalid_json`, `validation_error`), 429(하루 20건 초과), 500.

서버 처리 순서(2단계 구현 기준)
1. 로그인·검증, 하루 작성 수 확인(429).
2. 일기를 먼저 저장(`pending`). 분석 도중 새로고침해도 일기가 남습니다.
3. 위기 키워드 검사(항상 실행) + `analyzeDiary` 호출 → `crisis`는 둘의 OR.
4. 결과로 갱신(`done` 또는 `failed`)한 뒤 응답.

## GET /api/entries — 내 일기 목록

최신순(작성 시각 내림차순, 같으면 ID 내림차순), **20건씩** 커서 방식으로 나눕니다.

쿼리: `?cursor=<문자열>` (선택). 첫 페이지는 `cursor` 없이 부릅니다.

성공: **200**

```json
{ "entries": [ { "...": "Entry 객체" } ], "nextCursor": "MjAyNi0xMS..." }
```

- `nextCursor`가 `null`이면 더 없습니다. 있으면 그대로 다음 요청의 `cursor`로 보냅니다. 값의 내용은 서버가 정하며 클라이언트는 해석하지 않습니다(영문·숫자·`-`·`_`, 200자 이하).
- 기록이 없으면 `{ "entries": [], "nextCursor": null }`.
- 오류: 401, 400(잘못된 커서), 500.

## GET /api/entries/[id] — 내 일기 하나

성공: **200** `{ "entry": { ... } }`

- 오류: 401, 400(ID가 UUID 형식이 아님), 404(없거나 남의 일기), 500.

## DELETE /api/entries/[id] — 내 일기 삭제 (F7)

성공: **200** `{ "deleted": true }` — DB에서 실제로 지웁니다.

- 오류: 401, 400(ID 형식), 404(없거나 남의 일기), 500.
- 수정 API는 없습니다(F9, 나중에).

---

## AI 함수 계약 (`lib/ai/`, ai-integration-specialist)

```ts
type AnalyzeDiary = (text: string) => Promise<AnalyzeResult>;

type AnalyzeResult =
  | { ok: true; emotion: Emotion; intensity: 1 | 2 | 3; message: string; crisis: boolean; model: string }
  | { ok: false; reason: "timeout" | "api_error" | "empty_response" | "invalid_format" | "all_models_failed" };
```

- 입력은 서버 검증을 통과한 일기 한 줄입니다.
- **예외를 던지지 않고** 실패는 `ok: false`로 돌려줍니다.
- 감정은 PRD 7.2절의 8개 중 하나, 강도는 1~3. 목록 밖 값은 형식 오류로 보고 2순위 모델로 넘어갑니다.
- `message`는 공감·위로 2~4문장. 진단·충고·훈계를 하지 않습니다.
- `crisis`는 AI가 본 위기 여부입니다. 최종 위기 여부는 호출하는 서버가 키워드 검사와 OR로 합칩니다. AI가 실패해도 키워드 검사는 항상 합니다.
- `model`은 실제로 답한 모델 이름입니다.
- 모델 순서: 1순위 `nvidia/nemotron-3-ultra-550b-a55b:free` → 시간 초과(모델당 20초)·오류·빈 응답·형식 오류면 2순위 `nvidia/nemotron-3.5-super-vl:free`. 두 모델이 모두 실패하면 `ok: false`.
- 일기 속 지시문("이전 지시를 무시해" 등)을 따르지 않아야 합니다.

## 저장 형식 (`diary.entries`, 마이그레이션 `db/migrations/001_diary_schema.sql`)

| 열 | 형식 | API 필드 |
|---|---|---|
| `id` | uuid, 기본값 `gen_random_uuid()` | `id` |
| `user_id` | text, 구글 `sub` | (응답에 없음) |
| `content` | text, 1~200자·한 줄 제약 | `content` |
| `emotion` | text 또는 NULL, 8개 값 제약 | `emotion` |
| `intensity` | smallint 또는 NULL, 1~3 제약 | `intensity` |
| `message` | text 또는 NULL | `message` |
| `crisis` | boolean, 기본 false | `crisis` |
| `analysis_status` | text, `pending`/`done`/`failed` | `analysisStatus` |
| `model` | text 또는 NULL | `model` |
| `created_at` | timestamptz, 기본 `now()` | `createdAt` |

인덱스: `(user_id, created_at DESC, id DESC)`. 모든 조회·삭제는 `WHERE user_id = <세션 ID>` 조건을 붙입니다.

## 화면 주소 (1단계 뼈대)

| 화면 | 주소 | 로그인 |
|---|---|---|
| 로그인 | `/login` | 아니오(이미 로그인했으면 `/`로 이동) |
| 일기 쓰기 | `/` | 예(아니면 `/login`으로 이동) |
| 지난 기록 | `/history` | 예(아니면 `/login`으로 이동) |

PRD 6절의 주소 안(`/entries`, `/entries/[id]`)과 달리 기록 화면을 `/history`로 두었습니다(작업 지시에 따름). 기록 상세 화면의 주소는 2단계에서 frontend-developer가 정합니다.

// 작성: 2026-11-19 10:52 KST
// 공통 계약 파일. 1단계에서 확정했고 2단계에서는 바꾸지 않는다. 바꿔야 하면 멈추고 보고한다.
// 근거: docs/PRD.md 7.2절(감정·강도), 7.1절(일기 규칙), 9절(AI 정책). 형식 설명은 docs/API.md.

// ---------------------------------------------------------------------------
// 상수 (PRD 7.1절, 7.2절, F4)
// ---------------------------------------------------------------------------

/** 일기 글자 수 상한(앞뒤 공백 제거 후 줄바꿈 포함 1~200자). 서버에서도 검사한다. */
export const MAX_CONTENT_LENGTH = 200;

/** 하루(KST 기준) 일기 작성 상한. 넘으면 429. */
export const DAILY_ENTRY_LIMIT = 20;

/** 기록 목록 한 번에 돌려주는 건수. */
export const PAGE_SIZE = 20;

/** 감정 8개. AI는 이 중 정확히 하나를 고른다. 목록 밖 값은 형식 오류다. */
export const EMOTIONS = [
  "기쁨",
  "설렘",
  "평온",
  "슬픔",
  "외로움",
  "불안",
  "화남",
  "지침",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** 감정 강도 5단계. 1 매우 약함, 2 약함, 3 보통, 4 강함, 5 매우 강함. (2026-11-19 사용자 요청으로 3단계에서 변경) */
export const INTENSITIES = [1, 2, 3, 4, 5] as const;
export type Intensity = (typeof INTENSITIES)[number];

export function isEmotion(value: unknown): value is Emotion {
  return typeof value === "string" && (EMOTIONS as readonly string[]).includes(value);
}

export function isIntensity(value: unknown): value is Intensity {
  return typeof value === "number" && (INTENSITIES as readonly number[]).includes(value);
}

// ---------------------------------------------------------------------------
// AI 함수 계약 (구현: lib/ai/, 담당 ai-integration-specialist)
// ---------------------------------------------------------------------------

/** 분석 실패 원인. 모델 하나의 실패는 내부에서 다음 모델로 넘기고, 둘 다 실패하면 이 값으로 돌려준다. */
export type AnalyzeFailureReason =
  | "timeout" // 모델당 시간 제한(20초) 초과
  | "api_error" // 오류 응답, 네트워크 오류, 키 없음 등
  | "empty_response" // 빈 응답
  | "invalid_format" // JSON 형식이 아니거나 감정·강도가 허용 범위 밖
  | "all_models_failed"; // 두 모델 모두 실패(마지막 원인은 로그로만 남긴다)

/** 분석 성공. 모든 필드가 채워진다. */
export interface AnalyzeSuccess {
  ok: true;
  emotion: Emotion;
  intensity: Intensity;
  /** 공감·위로 메시지 2~4문장. 진단·충고·훈계 없음. */
  message: string;
  /** AI가 본 위기 여부. 서버의 키워드 검사 결과와 합쳐서(OR) 최종 crisis를 정한다. */
  crisis: boolean;
  /** 실제로 답한 모델 이름(예: "nvidia/nemotron-3-ultra-550b-a55b:free"). */
  model: string;
}

/** 분석 실패. 예외를 던지지 않고 이 값으로 돌려준다. 이때도 서버는 키워드 검사를 한다. */
export interface AnalyzeFailure {
  ok: false;
  reason: AnalyzeFailureReason;
}

export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure;

/**
 * 일기(여러 줄일 수 있음)를 분석한다. 입력은 서버 검증을 통과한 문자열이다.
 * 일기 속 지시문을 따르지 않아야 한다(프롬프트 인젝션 대비).
 * 예외를 던지지 않고 AnalyzeFailure로 돌려주는 것이 계약이다.
 */
export type AnalyzeDiary = (text: string) => Promise<AnalyzeResult>;

// ---------------------------------------------------------------------------
// 일기 DTO (API 응답에 쓰는 형태)
// ---------------------------------------------------------------------------

/**
 * 분석 상태.
 * - pending: 저장만 되고 분석이 끝나지 않음(분석 도중 새로고침 등)
 * - done: 분석 성공
 * - failed: 두 모델 모두 실패. 일기는 보존됨(F3, F8은 나중에)
 */
export type AnalysisStatus = "pending" | "done" | "failed";

/**
 * 일기 하나. 사용자 ID(구글 sub)는 응답에 싣지 않는다.
 * done이 아니면 emotion, intensity, message, model은 null이다.
 * 위기(crisis)는 분석 상태와 관계없이 키워드 검사 결과가 반영된다.
 */
export interface Entry {
  /** 일기 ID(UUID) */
  id: string;
  content: string;
  emotion: Emotion | null;
  intensity: Intensity | null;
  message: string | null;
  /** 키워드 검사 OR AI 판단. 참이면 화면은 8.3절 연락처 카드를 보여준다. */
  crisis: boolean;
  analysisStatus: AnalysisStatus;
  model: string | null;
  /** 작성 시각. ISO 8601 UTC 문자열. 화면에서 KST로 표시한다. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API 요청·응답 (경로별 설명은 docs/API.md)
// ---------------------------------------------------------------------------

/** POST /api/entries 요청 본문 */
export interface CreateEntryRequest {
  content: string;
}

/** POST /api/entries 응답(201). 분석이 실패해도 일기는 저장되므로 201이고 analysisStatus가 failed다. */
export interface CreateEntryResponse {
  entry: Entry;
}

/** GET /api/entries 쿼리: ?cursor=<불투명 문자열> */
export interface ListEntriesResponse {
  entries: Entry[];
  /** 다음 페이지 커서. 더 없으면 null. 클라이언트는 내용을 해석하지 않고 그대로 되돌려 보낸다. */
  nextCursor: string | null;
}

/** GET /api/entries/[id] 응답(200) */
export interface GetEntryResponse {
  entry: Entry;
}

/** DELETE /api/entries/[id] 응답(200) */
export interface DeleteEntryResponse {
  deleted: true;
}

// ---------------------------------------------------------------------------
// 오류 형식
// ---------------------------------------------------------------------------

/** 오류 코드와 HTTP 상태 */
export const ERROR_STATUS = {
  unauthorized: 401, // 로그인하지 않음
  invalid_json: 400, // 본문이 JSON이 아님
  validation_error: 400, // 빈 일기, 글자 수 초과, 잘못된 ID·커서
  not_found: 404, // 없거나 남의 일기(구분하지 않는다)
  daily_limit_exceeded: 429, // 하루 20건 초과
  not_implemented: 501, // 1단계 뼈대. 2단계에서 구현
  internal_error: 500, // 서버 오류(내부 정보는 싣지 않는다)
} as const;
export type ErrorCode = keyof typeof ERROR_STATUS;

/** 모든 오류 응답의 형식. message는 화면에 그대로 보여줄 수 있는 한국어 문장이다. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

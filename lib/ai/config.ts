// 작성: 2026-11-19 11:35 KST
// AI 연동 설정값. 모델 이름과 시간 예산을 한 곳에 모아 쉽게 바꿀 수 있게 한다.
// 서버 전용: 이 폴더의 코드는 서버(API 라우트 등)에서만 불러온다. 브라우저 코드에서 import하지 않는다.
// (`server-only` 패키지는 설치돼 있지 않아 쓰지 않는다. OPENROUTER_API_KEY는 analyze.ts에서만 읽는다.)

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const CHAT_COMPLETIONS_URL = `${OPENROUTER_BASE_URL}/chat/completions`;
export const MODELS_URL = `${OPENROUTER_BASE_URL}/models`;

export interface ModelConfig {
  /** OpenRouter 모델 id */
  id: string;
  /**
   * true면 response_format(JSON 스키마)을 요청한다.
   * 1단계 계약 검토 결과: 1순위 :free는 response_format 미지원, 2순위는 지원.
   * 미지원 모델에는 프롬프트로만 JSON을 요구하고 관대한 파서로 처리한다.
   */
  supportsResponseFormat: boolean;
}

/** 호출 순서대로. 같은 모델을 재시도하지 않는다. */
export const MODELS: readonly ModelConfig[] = [
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", supportsResponseFormat: false },
  { id: "nvidia/nemotron-3.5-super-vl:free", supportsResponseFormat: true },
];

/** 모델 하나당 최대 대기 시간(ms). PRD 9절. */
export const PER_MODEL_TIMEOUT_MS = 20_000;

/** 전체 마감(ms). 1순위 20초 + 2순위 20초 + 여유 약 2초. 2순위는 남은 시간 안에서만 호출한다. */
export const TOTAL_DEADLINE_MS = 42_000;

/** 남은 시간이 이보다 짧으면 다음 모델을 부르지 않는다(응답이 올 가능성이 낮다). */
export const MIN_REMAINING_MS = 3_000;

/** 추론 모델이 생각에 토큰을 쓰므로 넉넉히 둔다. 출력 JSON 자체는 300토큰 안팎이다. */
export const MAX_TOKENS = 4_000;

/** 응답 다양성. 분류는 안정적이어야 하고 메시지는 너무 기계적이지 않아야 한다. */
export const TEMPERATURE = 0.6;

/** 공감 메시지 최대 길이(글자). */
export const MAX_MESSAGE_LENGTH = 600;

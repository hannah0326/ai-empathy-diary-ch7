// 작성: 2026-11-19 11:35 KST
// analyzeDiary 구현: OpenRouter 호출, 모델 전환, 응답 검증.
// 서버 전용. 키(OPENROUTER_API_KEY)는 이 파일에서만 읽고, 로그·오류 메시지에 헤더나 키를 싣지 않는다.
import type { AnalyzeDiary, AnalyzeFailureReason, AnalyzeResult } from "../types";
import {
  CHAT_COMPLETIONS_URL,
  MAX_TOKENS,
  MIN_REMAINING_MS,
  MODELS,
  PER_MODEL_TIMEOUT_MS,
  TEMPERATURE,
  TOTAL_DEADLINE_MS,
  type ModelConfig,
} from "./config";
import { parseAnalysis } from "./parse";
import { RESPONSE_FORMAT, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/** 시험에서 바꿔 끼울 수 있는 의존성. 운영에서는 기본값을 쓴다. */
export interface AnalyzeOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  models?: readonly ModelConfig[];
  perModelTimeoutMs?: number;
  totalDeadlineMs?: number;
  /** 모델 한 번 호출이 끝날 때마다 부른다(모델, 결과, 걸린 시간). 시험·로그용. */
  onAttempt?: (info: AttemptInfo) => void;
}

export interface AttemptInfo {
  model: string;
  ok: boolean;
  reason?: AnalyzeFailureReason;
  elapsedMs: number;
  /** 실패 때 HTTP 상태(있으면). 헤더·본문은 싣지 않는다. */
  status?: number;
}

type CallOutcome =
  | { ok: true; result: Extract<AnalyzeResult, { ok: true }>; status?: number }
  | { ok: false; reason: AnalyzeFailureReason; status?: number };

function isAbortLike(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

async function callModel(
  model: ModelConfig,
  text: string,
  timeoutMs: number,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<CallOutcome> {
  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(text) },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    // 추론 모델의 생각 분량을 줄여 속도를 높인다(지원하지 않는 모델은 무시한다).
    reasoning: { effort: "low" },
  };
  if (model.supportsResponseFormat) body.response_format = RESPONSE_FORMAT;

  let res: Response;
  try {
    res = await fetchImpl(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return { ok: false, reason: isAbortLike(e) ? "timeout" : "api_error" };
  }

  if (!res.ok) return { ok: false, reason: "api_error", status: res.status };

  let json: unknown;
  try {
    // 본문 읽기도 같은 시간 제한(signal)에 묶여 있다.
    json = await res.json();
  } catch (e) {
    return { ok: false, reason: isAbortLike(e) ? "timeout" : "invalid_format" };
  }

  // OpenRouter는 200으로 {error:{...}}를 돌려주기도 한다.
  const obj = json as {
    error?: unknown;
    choices?: Array<{ message?: { content?: unknown }; error?: unknown }>;
  } | null;
  if (!obj || typeof obj !== "object") return { ok: false, reason: "invalid_format" };
  if (obj.error) return { ok: false, reason: "api_error" };
  const choice = Array.isArray(obj.choices) ? obj.choices[0] : undefined;
  if (!choice) return { ok: false, reason: "empty_response" };
  if (choice.error) return { ok: false, reason: "api_error" };

  const parsed = parseAnalysis(choice.message?.content);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, result: { ok: true, ...parsed.value, model: model.id } };
}

/**
 * 시험용으로 의존성을 받는 본체. 예외를 던지지 않고 AnalyzeResult로 돌려준다.
 * 1순위 → 2순위 순서, 같은 모델 재시도 없음, 전체 마감 안에서만 다음 모델을 부른다.
 */
export async function analyzeDiaryWith(
  text: string,
  opts: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[ai] OPENROUTER_API_KEY가 설정되지 않았습니다.");
    return { ok: false, reason: "api_error" };
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const models = opts.models ?? MODELS;
  const perModel = opts.perModelTimeoutMs ?? PER_MODEL_TIMEOUT_MS;
  const deadline = Date.now() + (opts.totalDeadlineMs ?? TOTAL_DEADLINE_MS);

  let lastReason: AnalyzeFailureReason = "api_error";
  for (let i = 0; i < models.length; i++) {
    const remaining = deadline - Date.now();
    // 첫 모델은 항상 시도한다. 이후 모델은 남은 시간이 충분할 때만.
    if (i > 0 && remaining < Math.min(MIN_REMAINING_MS, perModel)) break;
    const timeoutMs = Math.max(1, Math.min(perModel, remaining));

    const started = Date.now();
    let outcome: CallOutcome;
    try {
      outcome = await callModel(models[i], text, timeoutMs, apiKey, fetchImpl);
    } catch {
      outcome = { ok: false, reason: "api_error" };
    }
    const elapsedMs = Date.now() - started;
    const info: AttemptInfo = outcome.ok
      ? { model: models[i].id, ok: true, elapsedMs }
      : { model: models[i].id, ok: false, reason: outcome.reason, elapsedMs, status: outcome.status };
    console.info(
      `[ai] model=${info.model} ok=${info.ok}${info.reason ? ` reason=${info.reason}` : ""}${
        info.status ? ` status=${info.status}` : ""
      } ms=${elapsedMs}`,
    );
    opts.onAttempt?.(info);

    if (outcome.ok) return outcome.result;
    lastReason = outcome.reason;
  }

  console.warn(`[ai] 모든 모델 실패. 마지막 원인=${lastReason}`);
  return { ok: false, reason: "all_models_failed" };
}

/** 계약 함수. docs/API.md와 lib/types.ts의 AnalyzeDiary 형태. */
export const analyzeDiary: AnalyzeDiary = (text) => analyzeDiaryWith(text);

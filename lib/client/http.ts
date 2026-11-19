// 작성: 2026-11-19 11:41 KST
// 실제 서버 API(/api/entries)를 부르는 구현. 3단계에서 lib/client/index.ts의 스위치로 켠다.
// 응답이 JSON이 아니어도(프록시 오류 페이지 등) 화면이 깨지지 않게 안전하게 읽는다.
import { isEmotion, isIntensity, type Entry } from "@/lib/types";
import type { ApiFailureKind, ApiResult, EntriesClient } from "./types";

/**
 * 화면 쪽 대기 한도. 서버는 모델당 20초씩 최대 약 45초까지 걸릴 수 있어서 그보다 여유 있게 잡는다.
 * 한도를 넘어도 일기는 서버에 이미 저장(pending)돼 있다.
 */
const CREATE_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 20_000;

const GENERIC_MESSAGES: Record<ApiFailureKind, string> = {
  unauthorized: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  daily_limit: "오늘 쓸 수 있는 일기를 모두 썼어요. 내일 다시 만나요.",
  validation: "입력한 내용을 확인해 주세요.",
  not_found: "일기를 찾을 수 없어요.",
  server: "서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.",
  network: "연결이 끊겼어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
  timeout: "응답이 늦어지고 있어요.",
  bad_response: "서버 응답을 이해하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** 서버가 준 값이 Entry 모양인지 확인한다(모양이 다르면 bad_response로 처리). */
export function isEntry(v: unknown): v is Entry {
  if (!isRecord(v)) return false;
  const statusOk =
    v.analysisStatus === "pending" || v.analysisStatus === "done" || v.analysisStatus === "failed";
  return (
    typeof v.id === "string" &&
    typeof v.content === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.crisis === "boolean" &&
    statusOk &&
    (v.emotion === null || isEmotion(v.emotion)) &&
    (v.intensity === null || isIntensity(v.intensity)) &&
    (v.message === null || typeof v.message === "string") &&
    (v.model === null || typeof v.model === "string")
  );
}

function failure<T>(kind: ApiFailureKind, message?: string): ApiResult<T> {
  return { ok: false, kind, message: message || GENERIC_MESSAGES[kind] };
}

function kindFromStatus(status: number): ApiFailureKind {
  if (status === 401) return "unauthorized";
  if (status === 429) return "daily_limit";
  if (status === 404) return "not_found";
  if (status === 400) return "validation";
  return "server";
}

async function request<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  validate: (json: unknown) => T | null,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return failure(timedOut ? "timeout" : "network");
  }

  // 본문을 글자로 받은 뒤 JSON 해석을 시도한다(JSON이 아닌 응답 폴백).
  let json: unknown = null;
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const kind = kindFromStatus(res.status);
    // 서버가 준 한국어 메시지는 검증·상한·없음에서만 그대로 쓴다. 서버 오류의 세부 내용은 보이지 않는다.
    const serverMessage =
      isRecord(json) && isRecord(json.error) && typeof json.error.message === "string"
        ? json.error.message
        : undefined;
    const useServerMessage = kind === "validation" || kind === "daily_limit" || kind === "not_found";
    // JSON이 아니면서 401도 아닌 오류 응답은 bad_response에 가깝다.
    const nonJsonServerError = json === null && kind === "server";
    return failure(nonJsonServerError ? "bad_response" : kind, useServerMessage ? serverMessage : undefined);
  }

  const data = validate(json);
  if (data === null) return failure("bad_response");
  return { ok: true, data };
}

const jsonHeaders = { "Content-Type": "application/json" };

export const httpClient: EntriesClient = {
  createEntry(content) {
    return request(
      "/api/entries",
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ content }) },
      CREATE_TIMEOUT_MS,
      (j) => (isRecord(j) && isEntry(j.entry) ? { entry: j.entry } : null),
    );
  },

  listEntries(cursor) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return request(
      `/api/entries${query}`,
      { method: "GET" },
      DEFAULT_TIMEOUT_MS,
      (j) => {
        if (!isRecord(j) || !Array.isArray(j.entries) || !j.entries.every(isEntry)) return null;
        if (j.nextCursor !== null && typeof j.nextCursor !== "string") return null;
        return { entries: j.entries, nextCursor: j.nextCursor };
      },
    );
  },

  getEntry(id) {
    return request(
      `/api/entries/${encodeURIComponent(id)}`,
      { method: "GET" },
      DEFAULT_TIMEOUT_MS,
      (j) => (isRecord(j) && isEntry(j.entry) ? { entry: j.entry } : null),
    );
  },

  async deleteEntry(id) {
    const result = await request(
      `/api/entries/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      DEFAULT_TIMEOUT_MS,
      (j) => (isRecord(j) && j.deleted === true ? ({ deleted: true } as const) : null),
    );
    // 이미 지워졌거나 없는 일기(404)는 목적을 이룬 것이므로 성공으로 본다.
    if (!result.ok && result.kind === "not_found") {
      return { ok: true, data: { deleted: true } };
    }
    return result;
  },
};

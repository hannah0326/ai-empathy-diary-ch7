// 작성: 2026-11-19 10:52 KST (2단계 구현: 2026-11-19 13:05 KST)
// GET /api/entries (내 일기 목록), POST /api/entries (일기 저장 + 분석 결과 반환)
import {
  errorResponse,
  getSessionUserId,
  jsonResponse,
  unauthorizedResponse,
} from "@/lib/api";
import { dbErrorKind } from "@/lib/db";
import { entryService } from "@/lib/entries/runtime";
import type { CreateEntryResponse, ListEntriesResponse } from "@/lib/types";
import { isValidCursor, validateContent } from "@/lib/validation";

// AI 분석은 모델당 최대 20초, 두 모델이면 40초 가까이 걸릴 수 있다.
// 서버리스 함수의 기본 제한 시간에 걸려 중간에 끊기지 않도록 60초까지 허용한다.
export const maxDuration = 60;

function internalError(error: unknown): Response {
  // 오류 종류만 남긴다(메시지에 접속 주소 등이 섞일 수 있다).
  console.error("[entries] 서버 오류:", dbErrorKind(error));
  return errorResponse("internal_error", "잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.");
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && !isValidCursor(cursor)) {
    return errorResponse("validation_error", "커서 형식이 올바르지 않아요.");
  }

  try {
    const result = await entryService.list(userId, cursor);
    if (!result.ok) {
      return errorResponse("validation_error", "커서 형식이 올바르지 않아요.");
    }
    const body: ListEntriesResponse = { entries: result.entries, nextCursor: result.nextCursor };
    return jsonResponse(body);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "요청 본문이 올바른 JSON이 아니에요.");
  }

  const content = validateContent(
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).content
      : undefined,
  );
  if (!content.ok) {
    return errorResponse("validation_error", content.message);
  }

  try {
    const result = await entryService.create(userId, content.content);
    if (!result.ok) {
      return errorResponse(
        "daily_limit_exceeded",
        "오늘은 일기를 20번까지 쓸 수 있어요. 내일 또 만나요.",
      );
    }
    const response: CreateEntryResponse = { entry: result.entry };
    return jsonResponse(response, 201);
  } catch (error) {
    return internalError(error);
  }
}

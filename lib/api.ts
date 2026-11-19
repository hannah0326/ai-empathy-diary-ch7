// 작성: 2026-11-19 10:52 KST
// API 경로 공통 도우미: 오류 응답 형식과 로그인 검사.
import { auth } from "@/auth";
import { ERROR_STATUS, type ApiErrorBody, type ErrorCode } from "@/lib/types";

/** docs/API.md의 오류 형식으로 응답한다. */
export function errorResponse(code: ErrorCode, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, {
    status: ERROR_STATUS[code],
    headers: { "Cache-Control": "no-store" },
  });
}

/** 성공 응답. 일기는 개인 정보이므로 캐시하지 않는다. */
export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * 현재 로그인한 사용자의 ID(구글 계정 고유 ID `sub`)를 돌려준다. 없으면 null.
 * 세션 확인 중 오류(예: AUTH_SECRET 누락)가 나면 로그인하지 않은 것으로 보고 막는다(안전한 쪽으로 실패).
 * 사용자 ID는 반드시 이 함수로만 얻는다. 요청 본문·쿼리의 사용자 ID는 믿지 않는다.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (error) {
    // 오류 이름만 남긴다(세부 내용에 설정값이 섞일 수 있음).
    console.error("[auth] 세션 확인 실패:", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

export function unauthorizedResponse(): Response {
  return errorResponse("unauthorized", "로그인이 필요해요.");
}

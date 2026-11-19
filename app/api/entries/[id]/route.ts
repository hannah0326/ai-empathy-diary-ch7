// 작성: 2026-11-19 10:52 KST (2단계 구현: 2026-11-19 13:05 KST)
// GET /api/entries/[id] (내 일기 하나), DELETE /api/entries/[id] (내 일기 삭제, F7)
// 없는 일기와 남의 일기는 구분하지 않고 404로 돌려준다.
import {
  errorResponse,
  getSessionUserId,
  jsonResponse,
  unauthorizedResponse,
} from "@/lib/api";
import { dbErrorKind } from "@/lib/db";
import { entryService } from "@/lib/entries/runtime";
import type { DeleteEntryResponse, GetEntryResponse } from "@/lib/types";
import { isValidEntryId } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function internalError(error: unknown): Response {
  console.error("[entries] 서버 오류:", dbErrorKind(error));
  return errorResponse("internal_error", "잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.");
}

const notFound = () => errorResponse("not_found", "일기를 찾을 수 없어요.");

export async function GET(_request: Request, { params }: Context) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!isValidEntryId(id)) {
    return errorResponse("validation_error", "일기 ID 형식이 올바르지 않아요.");
  }

  try {
    const entry = await entryService.get(userId, id);
    if (!entry) return notFound();
    const body: GetEntryResponse = { entry };
    return jsonResponse(body);
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!isValidEntryId(id)) {
    return errorResponse("validation_error", "일기 ID 형식이 올바르지 않아요.");
  }

  try {
    const deleted = await entryService.remove(userId, id);
    if (!deleted) return notFound();
    const body: DeleteEntryResponse = { deleted: true };
    return jsonResponse(body);
  } catch (error) {
    return internalError(error);
  }
}

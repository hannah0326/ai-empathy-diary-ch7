// 작성: 2026-11-19 10:52 KST
// GET /api/entries/[id] (내 일기 하나), DELETE /api/entries/[id] (내 일기 삭제, F7)
// 1단계 뼈대: 로그인 검사(401)와 ID 형식 검증(400)까지만 한다. 본 기능은 2단계에서 구현한다.
import {
  errorResponse,
  getSessionUserId,
  unauthorizedResponse,
} from "@/lib/api";
import { isValidEntryId } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!isValidEntryId(id)) {
    return errorResponse("validation_error", "일기 ID 형식이 올바르지 않아요.");
  }

  // TODO(2단계, backend-developer): `WHERE id = ${id} AND user_id = ${userId}`로 조회한다.
  //  없거나 남의 일기면 구분 없이 404 not_found.
  return errorResponse("not_implemented", "아직 구현되지 않았어요.");
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!isValidEntryId(id)) {
    return errorResponse("validation_error", "일기 ID 형식이 올바르지 않아요.");
  }

  // TODO(2단계, backend-developer): `DELETE ... WHERE id = ${id} AND user_id = ${userId}`.
  //  지워진 행이 없으면 404 not_found, 있으면 200 { deleted: true }.
  return errorResponse("not_implemented", "아직 구현되지 않았어요.");
}

// 작성: 2026-11-19 10:52 KST
// GET /api/entries (내 일기 목록), POST /api/entries (일기 저장 + 분석 결과 반환)
// 1단계 뼈대: 로그인 검사(401)와 입력 검증(400)까지만 한다. 본 기능은 2단계에서 구현한다.
import {
  errorResponse,
  getSessionUserId,
  unauthorizedResponse,
} from "@/lib/api";
import { isValidCursor, validateContent } from "@/lib/validation";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && !isValidCursor(cursor)) {
    return errorResponse("validation_error", "커서 형식이 올바르지 않아요.");
  }

  // TODO(2단계, backend-developer): lib/db로 `diary.entries`를 조회한다.
  //  - 반드시 `WHERE user_id = ${userId}` 조건을 붙인다(세션의 ID만 사용).
  //  - created_at DESC, id DESC 순으로 PAGE_SIZE건. 다음 페이지용 nextCursor 계산.
  return errorResponse("not_implemented", "아직 구현되지 않았어요.");
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

  // TODO(2단계, backend-developer):
  //  1) 하루(KST) 작성 수가 DAILY_ENTRY_LIMIT 이상이면 429 daily_limit_exceeded.
  //  2) 일기를 먼저 저장한다(analysis_status = 'pending'). 분석 중 새로고침해도 일기가 남는다.
  //  3) lib/crisis 키워드 검사는 항상 실행하고, analyzeDiary(content.content)(lib/ai) 결과와 OR로 합친다.
  //  4) 분석 성공이면 done, 두 모델 모두 실패면 failed로 갱신하고 201 { entry }를 돌려준다.
  return errorResponse("not_implemented", "아직 구현되지 않았어요.");
}

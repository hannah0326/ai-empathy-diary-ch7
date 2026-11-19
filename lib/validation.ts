// 작성: 2026-11-19 10:52 KST
// 입력 검증 함수 모음. 모든 외부 입력은 여기서 검사한다.
import { MAX_CONTENT_LENGTH } from "@/lib/types";

export type ContentCheck =
  | { ok: true; content: string }
  | { ok: false; message: string };

/**
 * 일기 내용을 검사하고 정리한다(PRD 7.1절).
 * - 문자열이 아니면 거절
 * - 줄바꿈은 허용한다. CRLF와 CR은 LF로 바꿔 저장하고, 앞뒤 공백·줄바꿈은 지운다
 * - 정리 후 비어 있으면 거절, 줄바꿈 포함 200자(글자 단위) 초과면 거절
 */
export function validateContent(input: unknown): ContentCheck {
  if (typeof input !== "string") {
    return { ok: false, message: "일기 내용은 글자로 보내 주세요." };
  }
  const content = input.replace(/\r\n?/g, "\n").trim();
  if (content.length === 0) {
    return { ok: false, message: "일기를 적어 주세요." };
  }
  // 이모지 등을 한 글자로 세기 위해 코드 포인트 단위로 센다.
  if (Array.from(content).length > MAX_CONTENT_LENGTH) {
    return {
      ok: false,
      message: `일기는 ${MAX_CONTENT_LENGTH}자까지 쓸 수 있어요.`,
    };
  }
  return { ok: true, content };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 일기 ID(UUID) 형식 검사. 형식이 틀리면 DB에 묻지 않고 400으로 돌려준다. */
export function isValidEntryId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/** 커서는 서버가 만든 불투명 문자열이다. 길이와 문자 종류만 1차로 거른다(해석은 2단계). */
export function isValidCursor(cursor: unknown): cursor is string {
  return (
    typeof cursor === "string" &&
    cursor.length > 0 &&
    cursor.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(cursor)
  );
}

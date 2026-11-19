// 작성: 2026-11-19 13:05 KST
// 목록 커서: (작성 시각, ID)를 base64url로 감싼 불투명 문자열. 클라이언트는 해석하지 않는다.
// 작성 시각은 DB의 마이크로초 정밀도를 잃지 않도록 문자열 그대로 담는다.
export interface CursorPosition {
  /** DB가 준 UTC 시각 문자열(예: 2026-11-19T01:02:03.123456Z) */
  createdAt: string;
  id: string;
}

const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(`${position.createdAt}|${position.id}`, "utf8").toString("base64url");
}

/** 형식이 틀리면 null. 값은 SQL에 매개변수로만 넘기지만 형식도 한 번 더 확인한다. */
export function decodeCursor(cursor: string): CursorPosition | null {
  const text = Buffer.from(cursor, "base64url").toString("utf8");
  const [createdAt, id, ...rest] = text.split("|");
  if (rest.length > 0 || !createdAt || !id) return null;
  if (!TS_RE.test(createdAt) || !UUID_RE.test(id)) return null;
  return { createdAt, id };
}

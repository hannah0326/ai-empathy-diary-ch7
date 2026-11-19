// 작성: 2026-11-19 11:40 KST
// 화면용 API 호출 모듈의 공통 형태. 계약(lib/types.ts, docs/API.md)을 그대로 따른다.
import type { CreateEntryResponse, Entry, ListEntriesResponse } from "@/lib/types";

/** 화면이 구분해서 보여줘야 하는 실패 종류 */
export type ApiFailureKind =
  | "unauthorized" // 401: 로그인 만료 → /login, 쓰던 글 보존
  | "daily_limit" // 429: 하루 20건 상한
  | "validation" // 400: 빈 일기, 글자 수 초과 등
  | "not_found" // 404
  | "server" // 500 등 서버 오류
  | "network" // 연결 실패
  | "timeout" // 화면 쪽 대기 한도 초과(일기는 저장됐을 수 있음)
  | "bad_response"; // JSON이 아닌 응답, 모양이 다른 응답

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiFailureKind; message: string };

/** 화면이 쓰는 일기 API. 실제 구현(http.ts)과 가짜 구현(mock.ts)이 같은 모양이다. */
export interface EntriesClient {
  createEntry(content: string): Promise<ApiResult<CreateEntryResponse>>;
  listEntries(cursor?: string | null): Promise<ApiResult<ListEntriesResponse>>;
  getEntry(id: string): Promise<ApiResult<{ entry: Entry }>>;
  /** 삭제. 404(이미 없음)는 성공으로 처리해서 돌려준다. */
  deleteEntry(id: string): Promise<ApiResult<{ deleted: true }>>;
}

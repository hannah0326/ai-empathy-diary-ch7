// 작성: 2026-11-19 11:45 KST
// 화면이 쓰는 일기 API 진입점.
//
// 3단계 통합: 화면은 실제 /api/entries를 부른다(USE_MOCK_API=false).
// 가짜 데이터(mock)는 /dev/preview 미리보기가 createMockClient를 직접 가져다 쓴다.
import { httpClient } from "./http";
import { createMockClient } from "./mock";
import type { EntriesClient } from "./types";

export const USE_MOCK_API = false;

export const entriesClient: EntriesClient = USE_MOCK_API ? createMockClient() : httpClient;

export type { ApiFailureKind, ApiResult, EntriesClient } from "./types";

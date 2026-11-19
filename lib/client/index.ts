// 작성: 2026-11-19 11:45 KST
// 화면이 쓰는 일기 API 진입점.
//
// ★ 3단계 스위치 ★
// 2단계에는 가짜 데이터(mock)를 쓴다. 3단계 통합에서 아래 USE_MOCK_API를 false로 바꾸면
// 모든 화면이 실제 /api/entries를 부른다. 이 한 줄만 바꾸면 된다.
import { httpClient } from "./http";
import { createMockClient } from "./mock";
import type { EntriesClient } from "./types";

export const USE_MOCK_API = true; // ← 3단계에서 false로

export const entriesClient: EntriesClient = USE_MOCK_API ? createMockClient() : httpClient;

export type { ApiFailureKind, ApiResult, EntriesClient } from "./types";

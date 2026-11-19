// 작성: 2026-11-19 13:05 KST
// 일기 서비스: 저장 흐름(pending → 분석 → done/failed), 위기 합치기, 하루 상한, 조회·삭제.
// 저장소와 분석 함수를 주입받으므로 시험에서 가짜로 바꿀 수 있다.
import { detectCrisisKeyword, mergeCrisis } from "@/lib/crisis";
import { DAILY_ENTRY_LIMIT, PAGE_SIZE, type AnalyzeDiary, type Entry } from "@/lib/types";
import { decodeCursor, encodeCursor, type CursorPosition } from "./cursor";
import { startOfKstDay } from "./kst";
import type { AnalysisPatch, EntryRepository, EntryRow } from "./repository";

export interface EntryServiceDeps {
  repo: EntryRepository;
  analyze: AnalyzeDiary;
  /** 시험에서 시각을 고정하기 위한 주입. 기본은 현재 시각. */
  now?: () => Date;
}

export type CreateResult = { ok: true; entry: Entry } | { ok: false; reason: "daily_limit" };
export type ListResult =
  | { ok: true; entries: Entry[]; nextCursor: string | null }
  | { ok: false; reason: "invalid_cursor" };

/** 저장소 행 → API 응답 Entry. 사용자 ID는 행에 없다. */
export function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    content: row.content,
    emotion: row.emotion,
    intensity: row.intensity,
    message: row.message,
    crisis: row.crisis,
    analysisStatus: row.analysisStatus,
    model: row.model,
    createdAt: new Date(row.createdAtRaw).toISOString(),
  };
}

function failedPatch(keywordCrisis: boolean): AnalysisPatch {
  return {
    analysisStatus: "failed",
    emotion: null,
    intensity: null,
    message: null,
    crisis: keywordCrisis,
    model: null,
  };
}

export function createEntryService(deps: EntryServiceDeps) {
  const { repo, analyze } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    /** content는 validateContent를 통과한 값이어야 한다. */
    async create(userId: string, content: string): Promise<CreateResult> {
      // 키워드 검사는 AI와 관계없이 항상 먼저 돈다. 분석이 중단돼 pending으로 남아도 위기 여부는 저장돼 있다.
      const keywordCrisis = detectCrisisKeyword(content);

      const pending = await repo.insertPendingIfUnderLimit({
        userId,
        content,
        crisis: keywordCrisis,
        since: startOfKstDay(now()),
        limit: DAILY_ENTRY_LIMIT,
      });
      if (!pending) return { ok: false, reason: "daily_limit" };

      let patch: AnalysisPatch;
      try {
        const result = await analyze(content);
        patch = result.ok
          ? {
              analysisStatus: "done",
              emotion: result.emotion,
              intensity: result.intensity,
              message: result.message,
              crisis: mergeCrisis(keywordCrisis, result.crisis),
              model: result.model,
            }
          : failedPatch(keywordCrisis);
      } catch (error) {
        // 계약상 던지지 않지만, 던져도 일기는 남기고 failed로 처리한다. 일기 내용은 로그에 남기지 않는다.
        console.error("[entries] 분석 함수 예외:", error instanceof Error ? error.name : "unknown");
        patch = failedPatch(keywordCrisis);
      }

      const updated = await repo.updateAnalysis(userId, pending.id, patch);
      // 갱신 직전에 삭제된 경우 등: 저장 시점의 행에 결과를 덮어 돌려준다.
      return { ok: true, entry: toEntry(updated ?? { ...pending, ...patch }) };
    },

    async list(userId: string, cursor: string | null): Promise<ListResult> {
      let position: CursorPosition | null = null;
      if (cursor !== null) {
        position = decodeCursor(cursor);
        if (!position) return { ok: false, reason: "invalid_cursor" };
      }
      // 한 건 더 읽어 다음 페이지가 있는지 안다.
      const rows = await repo.list(userId, position, PAGE_SIZE + 1);
      const page = rows.slice(0, PAGE_SIZE);
      const last = page[page.length - 1];
      const nextCursor =
        rows.length > PAGE_SIZE && last
          ? encodeCursor({ createdAt: last.createdAtRaw, id: last.id })
          : null;
      return { ok: true, entries: page.map(toEntry), nextCursor };
    },

    async get(userId: string, id: string): Promise<Entry | null> {
      const row = await repo.get(userId, id);
      return row ? toEntry(row) : null;
    },

    async remove(userId: string, id: string): Promise<boolean> {
      return repo.delete(userId, id);
    },
  };
}

export type EntryService = ReturnType<typeof createEntryService>;

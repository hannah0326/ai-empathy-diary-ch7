// 작성: 2026-11-19 13:05 KST
// 일기 저장소 계층. 모든 SQL은 `diary.` 스키마 이름을 붙이고, 모든 쿼리에 user_id 조건을 건다.
// 서비스·시험은 EntryRepository 인터페이스만 보므로 시험에서는 가짜 저장소로 바꿀 수 있다.
import { getDb } from "@/lib/db";
import type { AnalysisStatus, Emotion, Intensity } from "@/lib/types";

/** 저장소 행 한 줄(사용자 ID는 담지 않는다). */
export interface EntryRow {
  id: string;
  content: string;
  emotion: Emotion | null;
  intensity: Intensity | null;
  message: string | null;
  crisis: boolean;
  analysisStatus: AnalysisStatus;
  model: string | null;
  /** UTC 시각 문자열(마이크로초 정밀도). 커서에 쓴다. */
  createdAtRaw: string;
}

export interface AnalysisPatch {
  analysisStatus: "done" | "failed";
  emotion: Emotion | null;
  intensity: Intensity | null;
  message: string | null;
  crisis: boolean;
  model: string | null;
}

export interface EntryRepository {
  /**
   * 하루 상한을 넘지 않을 때만 pending 일기를 저장한다(상한 확인과 저장을 한 문장으로).
   * since 이후 작성 건수가 limit 이상이면 null.
   */
  insertPendingIfUnderLimit(input: {
    userId: string;
    content: string;
    crisis: boolean;
    since: Date;
    limit: number;
  }): Promise<EntryRow | null>;
  /** 분석 결과로 갱신한다. 갱신된 행이 없으면 null. */
  updateAnalysis(userId: string, id: string, patch: AnalysisPatch): Promise<EntryRow | null>;
  /** 최신순(작성 시각, ID 내림차순)으로 limit건. cursor가 있으면 그 뒤부터. */
  list(
    userId: string,
    cursor: { createdAt: string; id: string } | null,
    limit: number,
  ): Promise<EntryRow[]>;
  get(userId: string, id: string): Promise<EntryRow | null>;
  /** 지워졌으면 true, 없거나 남의 일기면 false. */
  delete(userId: string, id: string): Promise<boolean>;
}

/** postgres.js 결과 행(열 이름 그대로). 시각은 SQL에서 마이크로초 문자열로 바꿔 받는다. */
interface RawRow {
  id: string;
  content: string;
  emotion: Emotion | null;
  intensity: number | null;
  message: string | null;
  crisis: boolean;
  analysis_status: AnalysisStatus;
  model: string | null;
  created_at_raw: string;
}

function toRow(raw: RawRow): EntryRow {
  return {
    id: raw.id,
    content: raw.content,
    emotion: raw.emotion,
    intensity: raw.intensity as Intensity | null,
    message: raw.message,
    crisis: raw.crisis,
    analysisStatus: raw.analysis_status,
    model: raw.model,
    createdAtRaw: raw.created_at_raw,
  };
}

export function createPostgresRepository(): EntryRepository {
  return {
    async insertPendingIfUnderLimit({ userId, content, crisis, since, limit }) {
      const sql = getDb();
      const rows = await sql<RawRow[]>`
        INSERT INTO diary.entries (user_id, content, crisis, analysis_status)
        SELECT ${userId}, ${content}, ${crisis}, 'pending'
        WHERE (
          SELECT count(*) FROM diary.entries
          WHERE user_id = ${userId} AND created_at >= ${since.toISOString()}::timestamptz
        ) < ${limit}
        RETURNING id, content, emotion, intensity, message, crisis, analysis_status, model,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_raw
      `;
      return rows.length > 0 ? toRow(rows[0]) : null;
    },

    async updateAnalysis(userId, id, patch) {
      const sql = getDb();
      const rows = await sql<RawRow[]>`
        UPDATE diary.entries
        SET analysis_status = ${patch.analysisStatus},
            emotion = ${patch.emotion},
            intensity = ${patch.intensity},
            message = ${patch.message},
            crisis = ${patch.crisis},
            model = ${patch.model}
        WHERE id = ${id}::uuid AND user_id = ${userId}
        RETURNING id, content, emotion, intensity, message, crisis, analysis_status, model,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_raw
      `;
      return rows.length > 0 ? toRow(rows[0]) : null;
    },

    async list(userId, cursor, limit) {
      const sql = getDb();
      const rows = cursor
        ? await sql<RawRow[]>`
            SELECT id, content, emotion, intensity, message, crisis, analysis_status, model,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_raw
            FROM diary.entries
            WHERE user_id = ${userId}
              AND (created_at, id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)
            ORDER BY created_at DESC, id DESC
            LIMIT ${limit}
          `
        : await sql<RawRow[]>`
            SELECT id, content, emotion, intensity, message, crisis, analysis_status, model,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_raw
            FROM diary.entries
            WHERE user_id = ${userId}
            ORDER BY created_at DESC, id DESC
            LIMIT ${limit}
          `;
      return rows.map(toRow);
    },

    async get(userId, id) {
      const sql = getDb();
      const rows = await sql<RawRow[]>`
        SELECT id, content, emotion, intensity, message, crisis, analysis_status, model,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_raw
        FROM diary.entries
        WHERE id = ${id}::uuid AND user_id = ${userId}
      `;
      return rows.length > 0 ? toRow(rows[0]) : null;
    },

    async delete(userId, id) {
      const sql = getDb();
      const rows = await sql`
        DELETE FROM diary.entries
        WHERE id = ${id}::uuid AND user_id = ${userId}
        RETURNING id
      `;
      return rows.length > 0;
    },
  };
}

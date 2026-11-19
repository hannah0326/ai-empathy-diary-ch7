// 작성: 2026-11-19 13:20 KST
// 시험용 메모리 저장소. 실제 DB를 쓰지 않는다. 사용자 ID 조건·하루 상한·커서 페이지를 흉내 낸다.
import type { AnalysisPatch, EntryRepository, EntryRow } from "@/lib/entries/repository";

interface StoredRow extends EntryRow {
  userId: string;
  createdAt: Date;
}

export function createFakeRepo(clock: () => Date = () => new Date()) {
  const rows: StoredRow[] = [];
  let seq = 0;

  const newId = () => {
    seq += 1;
    return `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  };
  const strip = ({ userId: _u, createdAt: _c, ...row }: StoredRow): EntryRow => {
    void _u;
    void _c;
    return row;
  };
  // 최신순 정렬 키(작성 시각, ID 내림차순)
  const sorted = (userId: string) =>
    rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));

  const repo: EntryRepository = {
    async insertPendingIfUnderLimit({ userId, content, crisis, since, limit }) {
      const count = rows.filter((r) => r.userId === userId && r.createdAt >= since).length;
      if (count >= limit) return null;
      const createdAt = clock();
      const row: StoredRow = {
        id: newId(),
        userId,
        content,
        emotion: null,
        intensity: null,
        message: null,
        crisis,
        analysisStatus: "pending",
        model: null,
        createdAt,
        createdAtRaw: createdAt.toISOString(),
      };
      rows.push(row);
      return strip(row);
    },
    async updateAnalysis(userId, id, patch: AnalysisPatch) {
      const row = rows.find((r) => r.id === id && r.userId === userId);
      if (!row) return null;
      Object.assign(row, patch);
      return strip(row);
    },
    async list(userId, cursor, limit) {
      let list = sorted(userId);
      if (cursor) {
        const at = new Date(cursor.createdAt).getTime();
        list = list.filter(
          (r) => r.createdAt.getTime() < at || (r.createdAt.getTime() === at && r.id < cursor.id),
        );
      }
      return list.slice(0, limit).map(strip);
    },
    async get(userId, id) {
      const row = rows.find((r) => r.id === id && r.userId === userId);
      return row ? strip(row) : null;
    },
    async delete(userId, id) {
      const index = rows.findIndex((r) => r.id === id && r.userId === userId);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },
  };

  return { repo, rows };
}

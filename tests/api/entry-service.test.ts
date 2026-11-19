// 작성: 2026-11-19 13:20 KST
// 일기 서비스 시험: 저장 흐름, 위기 합치기, failed 흐름, 하루 상한(KST), 커서 페이지, 사용자 분리.
import { describe, expect, it, vi } from "vitest";
import { createEntryService } from "@/lib/entries/service";
import { startOfKstDay } from "@/lib/entries/kst";
import { fakeAnalyzeDiary } from "@/lib/entries/fake-analyze";
import { DAILY_ENTRY_LIMIT, PAGE_SIZE, type AnalyzeDiary } from "@/lib/types";
import { createFakeRepo } from "./fake-repo";

const okResult = (crisis: boolean): Awaited<ReturnType<AnalyzeDiary>> => ({
  ok: true,
  emotion: "슬픔",
  intensity: 3,
  message: "힘든 하루였군요.",
  crisis,
  model: "m1",
});

describe("저장 흐름과 위기 합치기", () => {
  it("분석 성공이면 done으로 저장하고 결과를 돌려준다", async () => {
    const { repo, rows } = createFakeRepo();
    const service = createEntryService({ repo, analyze: async () => okResult(false) });
    const res = await service.create("u1", "오늘은 평범했다");
    expect(res.ok && res.entry.analysisStatus).toBe("done");
    expect(res.ok && res.entry.emotion).toBe("슬픔");
    expect(rows[0].analysisStatus).toBe("done");
  });

  it("분석을 부르는 시점에는 이미 pending으로 저장돼 있다", async () => {
    const { repo, rows } = createFakeRepo();
    let statusDuringAnalysis = "";
    const service = createEntryService({
      repo,
      analyze: async () => {
        statusDuringAnalysis = rows[0]?.analysisStatus ?? "none";
        return okResult(false);
      },
    });
    await service.create("u1", "저장 먼저");
    expect(statusDuringAnalysis).toBe("pending");
  });

  it("AI만 위기로 봐도 crisis: true", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({ repo, analyze: async () => okResult(true) });
    const res = await service.create("u1", "평범한 문장");
    expect(res.ok && res.entry.crisis).toBe(true);
  });

  it("키워드만 위기로 봐도 crisis: true (AI는 false)", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({ repo, analyze: async () => okResult(false) });
    const res = await service.create("u1", "죽고 싶다");
    expect(res.ok && res.entry.crisis).toBe(true);
  });

  it("AI가 실패해도 키워드 위기면 crisis: true, 상태는 failed", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({
      repo,
      analyze: async () => ({ ok: false, reason: "all_models_failed" }),
    });
    const res = await service.create("u1", "사라지고 싶다");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.entry.analysisStatus).toBe("failed");
      expect(res.entry.crisis).toBe(true);
    }
  });

  it("관용 표현은 위기가 아니다", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({ repo, analyze: async () => okResult(false) });
    const res = await service.create("u1", "배고파 죽겠다");
    expect(res.ok && res.entry.crisis).toBe(false);
  });
});

describe("failed 흐름", () => {
  it("두 모델 모두 실패해도 일기는 남고 failed, 결과 칸은 null", async () => {
    const { repo, rows } = createFakeRepo();
    const service = createEntryService({
      repo,
      analyze: async () => ({ ok: false, reason: "all_models_failed" }),
    });
    const res = await service.create("u1", "오늘 일기");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.entry).toMatchObject({
        analysisStatus: "failed",
        emotion: null,
        intensity: null,
        message: null,
        model: null,
        crisis: false,
      });
    }
    expect(rows).toHaveLength(1);
  });

  it("분석 함수가 예외를 던져도 일기는 남고 failed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { repo, rows } = createFakeRepo();
    const service = createEntryService({
      repo,
      analyze: async () => {
        throw new Error("boom");
      },
    });
    const res = await service.create("u1", "오늘 일기");
    expect(res.ok && res.entry.analysisStatus).toBe("failed");
    expect(rows).toHaveLength(1);
    spy.mockRestore();
  });

  it("가짜 분석 함수는 [분석실패]가 있으면 실패, 아니면 성공", async () => {
    expect((await fakeAnalyzeDiary("[분석실패] 시험")).ok).toBe(false);
    expect((await fakeAnalyzeDiary("평범")).ok).toBe(true);
  });
});

describe("하루 상한(KST)", () => {
  it("startOfKstDay: KST 자정(UTC 15:00)이 경계", () => {
    // 2026-11-19 14:59 UTC = 23:59 KST(19일) → 시작은 18일 15:00 UTC
    expect(startOfKstDay(new Date("2026-11-19T14:59:00Z")).toISOString()).toBe("2026-11-18T15:00:00.000Z");
    // 15:00 UTC = 20일 00:00 KST → 시작은 같은 시각
    expect(startOfKstDay(new Date("2026-11-19T15:00:00Z")).toISOString()).toBe("2026-11-19T15:00:00.000Z");
  });

  it("20건까지는 되고 21번째는 daily_limit", async () => {
    const now = new Date("2026-11-19T03:00:00Z");
    const { repo, rows } = createFakeRepo(() => now);
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary, now: () => now });
    for (let i = 0; i < DAILY_ENTRY_LIMIT; i += 1) {
      expect((await service.create("u1", `일기 ${i}`)).ok).toBe(true);
    }
    expect(await service.create("u1", "하나 더")).toEqual({ ok: false, reason: "daily_limit" });
    expect(rows).toHaveLength(DAILY_ENTRY_LIMIT);
    // 다른 사용자는 영향 없다.
    expect((await service.create("u2", "내 일기")).ok).toBe(true);
  });

  it("KST 자정이 지나면 다시 쓸 수 있다", async () => {
    let now = new Date("2026-11-19T14:00:00Z"); // 23:00 KST
    const { repo } = createFakeRepo(() => now);
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary, now: () => now });
    for (let i = 0; i < DAILY_ENTRY_LIMIT; i += 1) await service.create("u1", `일기 ${i}`);
    expect((await service.create("u1", "막힘")).ok).toBe(false);
    now = new Date("2026-11-19T15:01:00Z"); // 00:01 KST, 다음 날
    expect((await service.create("u1", "새 날")).ok).toBe(true);
  });
});

describe("목록 커서와 사용자 분리", () => {
  it("20건씩 최신순으로 끊고 커서로 이어 읽는다", async () => {
    let tick = 0;
    const { repo } = createFakeRepo(() => new Date(Date.UTC(2026, 10, 1, 0, 0, tick++)));
    // 상한을 넘지 않게 저장소에 직접 넣는다(날짜를 며칠로 나눠 서비스 상한과 무관하게).
    for (let i = 0; i < 25; i += 1) {
      await repo.insertPendingIfUnderLimit({
        userId: "u1",
        content: `일기 ${i}`,
        crisis: false,
        since: new Date(0),
        limit: 1000,
      });
    }
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary });
    const first = await service.list("u1", null);
    expect(first.ok && first.entries).toHaveLength(PAGE_SIZE);
    expect(first.ok && first.entries[0].content).toBe("일기 24");
    const cursor = first.ok ? first.nextCursor : null;
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);

    const second = await service.list("u1", cursor);
    expect(second.ok && second.entries).toHaveLength(5);
    expect(second.ok && second.nextCursor).toBeNull();
    expect(second.ok && second.entries[0].content).toBe("일기 4");
  });

  it("해석할 수 없는 커서는 invalid_cursor", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary });
    expect(await service.list("u1", "abc")).toEqual({ ok: false, reason: "invalid_cursor" });
  });

  it("남의 일기는 조회·삭제 모두 안 된다", async () => {
    const { repo, rows } = createFakeRepo();
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary });
    const created = await service.create("u1", "내 일기");
    const id = created.ok ? created.entry.id : "";
    expect(await service.get("u2", id)).toBeNull();
    expect(await service.remove("u2", id)).toBe(false);
    expect(rows).toHaveLength(1);
    expect((await service.list("u2", null)).ok && (await service.list("u2", null))).toMatchObject({ entries: [] });
    expect(await service.remove("u1", id)).toBe(true);
  });

  it("응답 Entry에는 사용자 ID가 없다", async () => {
    const { repo } = createFakeRepo();
    const service = createEntryService({ repo, analyze: fakeAnalyzeDiary });
    const created = await service.create("google-sub-secret", "내 일기");
    expect(JSON.stringify(created)).not.toContain("google-sub-secret");
  });
});

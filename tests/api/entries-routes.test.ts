// 작성: 2026-11-19 13:20 KST
// 라우트 시험: 저장소만 가짜로 바꾼 서비스를 끼워 넣고 HTTP 계약(상태 코드·형식)을 확인한다.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEntryService } from "@/lib/entries/service";
import { fakeAnalyzeDiary } from "@/lib/entries/fake-analyze";
import { DAILY_ENTRY_LIMIT } from "@/lib/types";
import { createFakeRepo } from "./fake-repo";

const authState = vi.hoisted(() => ({ userId: null as string | null }));
const serviceHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/auth", () => ({
  auth: async () => (authState.userId ? { user: { id: authState.userId } } : null),
}));
// 라우트가 쓰는 서비스를 시험용으로 바꾼다. 실제 DB 저장소는 만들어지지 않는다.
vi.mock("@/lib/entries/runtime", () => ({
  get entryService() {
    return serviceHolder.current;
  },
}));

import { DELETE, GET as GET_ONE } from "@/app/api/entries/[id]/route";
import { GET, POST } from "@/app/api/entries/route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (content: unknown) =>
  new Request("http://localhost/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
const anyReq = new Request("http://localhost/api/entries/x");
const MISSING_ID = "123e4567-e89b-12d3-a456-426614174000";

function setup(analyze = fakeAnalyzeDiary) {
  const fake = createFakeRepo();
  serviceHolder.current = createEntryService({ repo: fake.repo, analyze });
  return fake;
}

beforeEach(() => {
  authState.userId = "user-A";
  setup();
});

describe("로그인 없으면 401", () => {
  it("모든 경로", async () => {
    authState.userId = null;
    expect((await GET(new Request("http://localhost/api/entries"))).status).toBe(401);
    expect((await POST(post("안녕"))).status).toBe(401);
    expect((await GET_ONE(anyReq, ctx(MISSING_ID))).status).toBe(401);
    expect((await DELETE(anyReq, ctx(MISSING_ID))).status).toBe(401);
  });
});

describe("POST /api/entries", () => {
  it("성공하면 201과 done 일기, no-store 헤더", async () => {
    const res = await POST(post("오늘은 좋은 하루였다"));
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { entry } = await res.json();
    expect(entry).toMatchObject({ content: "오늘은 좋은 하루였다", analysisStatus: "done", crisis: false });
    expect(entry).not.toHaveProperty("userId");
    expect(entry).not.toHaveProperty("user_id");
  });

  it("두 모델이 모두 실패하면 201과 failed", async () => {
    const res = await POST(post("[분석실패] 테스트"));
    expect(res.status).toBe(201);
    expect((await res.json()).entry).toMatchObject({ analysisStatus: "failed", emotion: null });
  });

  it("AI 실패 + 키워드 위기면 201, failed, crisis true", async () => {
    setup(async () => ({ ok: false, reason: "all_models_failed" }));
    const res = await POST(post("죽고 싶다"));
    expect(res.status).toBe(201);
    expect((await res.json()).entry).toMatchObject({ analysisStatus: "failed", crisis: true });
  });

  it("입력 검증: 빈 값·201자·문자열 아님·JSON 아님", async () => {
    for (const content of ["   ", "가".repeat(201), 123, null]) {
      const res = await POST(post(content));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("validation_error");
    }
    const bad = await POST(
      new Request("http://localhost/api/entries", { method: "POST", body: "not json" }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_json");
  });

  it("하루 상한을 넘으면 429 daily_limit_exceeded", async () => {
    for (let i = 0; i < DAILY_ENTRY_LIMIT; i += 1) {
      expect((await POST(post(`일기 ${i}`))).status).toBe(201);
    }
    const res = await POST(post("하나 더"));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("daily_limit_exceeded");
  });

  it("저장소 오류는 500 internal_error이고 내부 정보를 싣지 않는다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    serviceHolder.current = createEntryService({
      repo: {
        ...createFakeRepo().repo,
        insertPendingIfUnderLimit: async () => {
          throw new Error("connect postgres://secret-host/db");
        },
      },
      analyze: fakeAnalyzeDiary,
    });
    const res = await POST(post("안녕"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret-host");
    spy.mockRestore();
  });
});

describe("GET /api/entries 와 [id]", () => {
  it("내 일기만 최신순으로 보인다", async () => {
    await POST(post("첫째"));
    await POST(post("둘째"));
    authState.userId = "user-B";
    await POST(post("B의 일기"));
    authState.userId = "user-A";
    const res = await GET(new Request("http://localhost/api/entries"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries.map((e: { content: string }) => e.content)).toEqual(["둘째", "첫째"]);
    expect(body.nextCursor).toBeNull();
  });

  it("남의 일기 ID 조회는 404, 삭제도 404이며 일기는 그대로", async () => {
    const created = await (await POST(post("A의 일기"))).json();
    const id = created.entry.id as string;

    authState.userId = "user-B";
    const get = await GET_ONE(anyReq, ctx(id));
    expect(get.status).toBe(404);
    expect((await get.json()).error.code).toBe("not_found");
    expect((await DELETE(anyReq, ctx(id))).status).toBe(404);

    authState.userId = "user-A";
    expect((await GET_ONE(anyReq, ctx(id))).status).toBe(200);
  });

  it("없는 ID도 같은 404, 형식이 틀린 ID·커서는 400", async () => {
    expect((await GET_ONE(anyReq, ctx(MISSING_ID))).status).toBe(404);
    expect((await DELETE(anyReq, ctx(MISSING_ID))).status).toBe(404);
    expect((await GET_ONE(anyReq, ctx("nope"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/entries?cursor=a%20b"))).status).toBe(400);
    // 문자는 맞지만 서버가 만든 커서가 아님
    expect((await GET(new Request("http://localhost/api/entries?cursor=abc"))).status).toBe(400);
  });

  it("내 일기 삭제는 200이고 다시 조회하면 404", async () => {
    const created = await (await POST(post("지울 일기"))).json();
    const id = created.entry.id as string;
    const del = await DELETE(anyReq, ctx(id));
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ deleted: true });
    expect((await GET_ONE(anyReq, ctx(id))).status).toBe(404);
  });
});

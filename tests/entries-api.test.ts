// 작성: 2026-11-19 10:52 KST
// 1단계 뼈대 시험: 로그인 검사(401)와 입력 검증(400), 그 뒤 501(2단계 TODO).
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
// 오류 시험용: vi.fn이 던지면 vitest가 시험 실패로 세므로 일반 함수에서 던진다.
let authShouldThrow = false;
vi.mock("@/auth", () => ({
  auth: async () => {
    if (authShouldThrow) throw new Error("MissingSecret");
    return authMock();
  },
}));

import { DELETE, GET as GET_ONE } from "@/app/api/entries/[id]/route";
import { GET, POST } from "@/app/api/entries/route";

const VALID_ID = "123e4567-e89b-12d3-a456-426614174000";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: string) =>
  new Request("http://localhost/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

describe("로그인하지 않은 요청은 401", () => {
  beforeEach(() => {
    authShouldThrow = false;
    authMock.mockResolvedValue(null);
  });

  it("GET /api/entries", async () => {
    const res = await GET(new Request("http://localhost/api/entries"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "로그인이 필요해요." } });
  });

  it("POST /api/entries", async () => {
    expect((await POST(post('{"content":"안녕"}'))).status).toBe(401);
  });

  it("GET·DELETE /api/entries/[id]", async () => {
    const req = new Request("http://localhost/api/entries/x");
    expect((await GET_ONE(req, ctx(VALID_ID))).status).toBe(401);
    expect((await DELETE(req, ctx(VALID_ID))).status).toBe(401);
  });

  it("세션 확인 중 오류가 나도 401로 막는다", async () => {
    authShouldThrow = true;
    expect((await GET(new Request("http://localhost/api/entries"))).status).toBe(401);
  });

  it("사용자 ID가 없는 세션도 401", async () => {
    authMock.mockResolvedValue({ user: { name: "x" } });
    expect((await GET(new Request("http://localhost/api/entries"))).status).toBe(401);
  });
});

describe("로그인한 요청의 입력 검증", () => {
  beforeEach(() => authMock.mockResolvedValue({ user: { id: "google-sub-1" } }));

  it("본문이 JSON이 아니면 400 invalid_json", async () => {
    const res = await POST(post("not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });

  it("빈 일기·200자 초과는 400 validation_error", async () => {
    for (const body of ['{"content":"   "}', `{"content":"${"가".repeat(201)}"}`, "{}", "null"]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("validation_error");
    }
  });

  it("잘못된 ID·커서는 400", async () => {
    const req = new Request("http://localhost/api/entries/x");
    expect((await GET_ONE(req, ctx("not-a-uuid"))).status).toBe(400);
    expect((await DELETE(req, ctx("not-a-uuid"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/entries?cursor=a%20b"))).status).toBe(400);
  });

  it("검증을 통과하면 2단계 전까지 501", async () => {
    expect((await POST(post('{"content":"좋은 하루"}'))).status).toBe(501);
    expect((await GET(new Request("http://localhost/api/entries"))).status).toBe(501);
    const req = new Request("http://localhost/api/entries/x");
    expect((await GET_ONE(req, ctx(VALID_ID))).status).toBe(501);
    expect((await DELETE(req, ctx(VALID_ID))).status).toBe(501);
  });
});


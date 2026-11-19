// 작성: 2026-11-19 14:10 KST
// 실제 저장소(diary.entries)와 실제 AI를 붙여 보는 통합 시험. 기본 `npm test`에는 포함되지 않는다.
// 사용: npm run db:smoke            (DB만: 저장·목록·조회·남의 일기 차단·삭제)
//       npm run db:smoke -- --ai    (추가로 실제 OpenRouter를 2회 호출: 일반 1 + 위기 1)
// 시험용 사용자 ID 두 개만 쓰고, 끝나면(실패해도) 그 사용자의 행을 모두 지운다. diary 외 스키마는 건드리지 않는다.
// 접속 주소·키는 출력하지 않는다.
import { register } from "node:module";

register("./ai-loader.mjs", import.meta.url);
const { getDb } = await import("../lib/db/index.ts");
const { createPostgresRepository } = await import("../lib/entries/repository.ts");
const { createEntryService } = await import("../lib/entries/service.ts");
const { analyzeDiary } = await import("../lib/ai/index.ts");

const USER_A = "smoke-test-a";
const USER_B = "smoke-test-b";
const runAi = process.argv.includes("--ai");

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "통과" : "실패"}  ${name}${detail ? ` (${detail})` : ""}`);
}

async function cleanup() {
  const sql = getDb();
  await sql`DELETE FROM diary.entries WHERE user_id IN (${USER_A}, ${USER_B})`;
  const left = await sql`SELECT count(*)::int AS n FROM diary.entries WHERE user_id IN (${USER_A}, ${USER_B})`;
  return left[0].n;
}

let exitCode = 0;
try {
  // 이전 시험이 중간에 끊겼을 때 남은 행을 먼저 치운다.
  await cleanup();
  const repo = createPostgresRepository();
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  // 1) 저장소: 저장 → 갱신 → 목록(커서) → 조회 → 남의 일기 차단 → 삭제
  const ids = [];
  for (let i = 1; i <= 5; i++) {
    const row = await repo.insertPendingIfUnderLimit({ userId: USER_A, content: `시험 일기 ${i}`, crisis: false, since, limit: 100 });
    if (row) ids.push(row.id);
  }
  const bRow = await repo.insertPendingIfUnderLimit({ userId: USER_B, content: "B의 시험 일기", crisis: false, since, limit: 100 });
  check("저장: A 5건, B 1건", ids.length === 5 && bRow !== null);

  const limited = await repo.insertPendingIfUnderLimit({ userId: USER_A, content: "상한 시험", crisis: false, since, limit: 5 });
  check("하루 상한: 이미 5건이면 limit 5에서 null", limited === null);

  const upd = await repo.updateAnalysis(USER_A, ids[0], {
    analysisStatus: "done", emotion: "평온", intensity: 2, message: "시험 메시지", crisis: false, model: "smoke-model",
  });
  check("갱신: 내 일기는 done으로 바뀜", upd?.analysisStatus === "done" && upd.emotion === "평온" && upd.model === "smoke-model");
  const crossUpd = await repo.updateAnalysis(USER_B, ids[1], {
    analysisStatus: "failed", emotion: null, intensity: null, message: null, crisis: false, model: null,
  });
  check("갱신: 남의 일기는 null(바뀌지 않음)", crossUpd === null);

  const page1 = await repo.list(USER_A, null, 2);
  const last = page1[page1.length - 1];
  const page2 = await repo.list(USER_A, { createdAt: last.createdAtRaw, id: last.id }, 2);
  const page3 = await repo.list(USER_A, { createdAt: page2[1].createdAtRaw, id: page2[1].id }, 2);
  const seen = [...page1, ...page2, ...page3].map((r) => r.id);
  check("목록(커서): 2+2+1건, 중복 없음, 최신순", page1.length === 2 && page2.length === 2 && page3.length === 1 && new Set(seen).size === 5);
  const times = [...page1, ...page2, ...page3].map((r) => r.createdAtRaw);
  check("목록: 작성 시각 내림차순", times.every((t, i) => i === 0 || times[i - 1] >= t));
  check("목록: B의 일기가 섞이지 않음", !seen.includes(bRow.id));

  check("조회: 내 일기", (await repo.get(USER_A, ids[2]))?.content === "시험 일기 3");
  check("조회: 남의 일기는 null", (await repo.get(USER_B, ids[2])) === null);
  check("삭제: 남의 일기는 false", (await repo.delete(USER_B, ids[2])) === false);
  check("삭제 후에도 A의 일기가 남아 있음", (await repo.get(USER_A, ids[2])) !== null);
  check("삭제: 내 일기는 true", (await repo.delete(USER_A, ids[2])) === true);
  check("삭제 확인: 다시 조회하면 null", (await repo.get(USER_A, ids[2])) === null);

  // 2) 서비스 + 실제 AI (--ai일 때만, OpenRouter 2회)
  if (runAi) {
    const service = createEntryService({ repo, analyze: analyzeDiary });
    for (const [label, text, expectCrisis] of [
      ["일반", "오늘 발표를 무사히 마쳐서 속이 후련하다.", false],
      ["위기", "요즘 너무 힘들어서 죽고 싶다는 생각만 든다.", true],
    ]) {
      const t0 = Date.now();
      const r = await service.create(USER_A, text);
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      if (!r.ok) { check(`AI 흐름(${label}): 저장`, false, r.reason); continue; }
      const e = r.entry;
      console.log(`  ${label}: 상태=${e.analysisStatus} 감정=${e.emotion} 강도=${e.intensity} 모델=${e.model} 위기=${e.crisis} 메시지길이=${e.message?.length ?? 0} ${sec}초`);
      const stored = await service.get(USER_A, e.id);
      check(
        `AI 흐름(${label}): done 저장, 감정·메시지·모델 기록`,
        e.analysisStatus === "done" && !!e.emotion && !!e.message && !!e.model && stored?.analysisStatus === "done" && stored.model === e.model,
      );
      check(`AI 흐름(${label}): crisis=${expectCrisis}`, e.crisis === expectCrisis && stored?.crisis === expectCrisis);
    }
  }
} catch (error) {
  exitCode = 1;
  console.error("시험 중 예외:", error && typeof error === "object" && "code" in error ? error.code : error instanceof Error ? error.name : "unknown");
} finally {
  try {
    const left = await cleanup();
    console.log(`정리: 시험 행 남은 수 = ${left}`);
    if (left !== 0) exitCode = 1;
  } catch {
    console.error("정리 실패: smoke-test-a/b 행을 직접 확인해 주세요.");
    exitCode = 1;
  }
  await getDb().end({ timeout: 5 });
}
if (results.some((ok) => !ok)) exitCode = 1;
console.log(exitCode === 0 ? "전체 통과" : "실패 있음");
process.exitCode = exitCode;

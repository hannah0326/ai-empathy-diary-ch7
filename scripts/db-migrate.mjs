// 작성: 2026-11-19 10:52 KST
// 마이그레이션 실행기: db/migrations/*.sql 중 diary.schema_migrations에 기록되지 않은 것만
// 파일 이름 순서대로, 파일마다 하나의 트랜잭션 안에서 실행하고 기록한다.
// DB를 바꾸는 명령이므로 사용자 승인 뒤에만 실행한다: npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connect, errorKind, fail } from "./_db.mjs";

const dir = path.resolve("db", "migrations");

// 안전장치: diary가 아닌 스키마를 건드릴 법한 SQL은 실행 전에 거절한다(주석은 제외하고 검사).
function assertDiaryOnly(file, text) {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  if (/\bdrop\s+schema\b/i.test(code) || /\b(public|auth|storage|extensions|realtime|graphql|vault)\s*\./i.test(code)) {
    fail(`${file}: diary 외 스키마를 건드릴 수 있는 SQL이 있어 실행하지 않아요.`);
  }
}

const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
const sql = connect();

try {
  // 기록 표는 diary 스키마 안에만 만든다.
  await sql.unsafe("CREATE SCHEMA IF NOT EXISTS diary");
  await sql.unsafe(
    "CREATE TABLE IF NOT EXISTS diary.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );

  const applied = new Set((await sql`SELECT name FROM diary.schema_migrations`).map((r) => r.name));
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("적용할 새 마이그레이션이 없어요.");
  }

  for (const file of pending) {
    const text = await readFile(path.join(dir, file), "utf8");
    assertDiaryOnly(file, text);
    await sql.begin(async (tx) => {
      // 이름 없이 만든 객체가 있어도 diary에 생기도록 검색 경로를 diary로 묶는다(이 트랜잭션 안에서만).
      await tx.unsafe("SET LOCAL search_path TO diary, pg_catalog");
      await tx.unsafe(text);
      await tx`INSERT INTO diary.schema_migrations (name) VALUES (${file})`;
    });
    console.log(`적용 완료: ${file}`);
  }
} catch (error) {
  fail(`마이그레이션 실패(트랜잭션은 되돌려졌어요). 오류 종류: ${errorKind(error)}. 주소는 출력하지 않아요.`);
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}

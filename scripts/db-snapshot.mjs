// 작성: 2026-11-19 10:52 KST
// 읽기 전용 스냅샷: diary가 아닌 모든 스키마의 (스키마, 표 이름) 목록과 스키마별 개수를 저장한다.
// 사용: npm run db:snapshot -- <이름>   → db/snapshots/<이름>.json
// 마이그레이션 전후에 찍어 `npm run db:compare`로 비교한다(PRD N5).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { connect, errorKind, fail } from "./_db.mjs";

const name = process.argv[2];
if (!name || !/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith(".")) {
  fail("사용법: npm run db:snapshot -- <이름>  (이름은 영문·숫자·.-_ 만 가능)");
}

const sql = connect();
try {
  // 읽기 전용 트랜잭션: 실수로라도 데이터를 바꿀 수 없다.
  const rows = await sql.begin("read only", (tx) =>
    tx`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema <> 'diary'
      ORDER BY table_schema, table_name
    `,
  );

  const schemas = {};
  for (const { table_schema, table_name } of rows) {
    schemas[table_schema] ??= { count: 0, tables: [] };
    schemas[table_schema].count += 1;
    schemas[table_schema].tables.push(table_name);
  }

  const snapshot = {
    name,
    takenAt: new Date().toISOString(),
    totalTables: rows.length,
    schemas,
  };

  const dir = path.resolve("db", "snapshots");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  // 출력에는 개수 요약만 남긴다.
  console.log(`스냅샷 저장: db/snapshots/${name}.json (diary 제외 표 ${rows.length}개)`);
  for (const [schema, info] of Object.entries(schemas)) {
    console.log(`  ${schema}: ${info.count}개`);
  }
} catch (error) {
  fail(`스냅샷 실패: 데이터베이스 연결 또는 조회 오류(종류: ${errorKind(error)}). 주소는 출력하지 않아요.`);
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}

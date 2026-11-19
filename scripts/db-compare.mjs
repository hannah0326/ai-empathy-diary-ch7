// 작성: 2026-11-19 10:52 KST
// 두 스냅샷을 비교해 diary 외 스키마의 표 목록·개수가 같은지 보고한다.
// 사용: npm run db:compare -- <전 이름> <후 이름>   (예: before-001 after-001)
// DB에 연결하지 않고 파일만 읽는다.
import { readFile } from "node:fs/promises";
import path from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [beforeName, afterName] = process.argv.slice(2);
if (!beforeName || !afterName) {
  fail("사용법: npm run db:compare -- <전 이름> <후 이름>  (예: before-001 after-001)");
}

async function load(name) {
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith(".")) {
    fail(`스냅샷 이름이 올바르지 않아요: ${name}`);
  }
  try {
    return JSON.parse(await readFile(path.resolve("db", "snapshots", `${name}.json`), "utf8"));
  } catch {
    return fail(`스냅샷을 읽지 못했어요: db/snapshots/${name}.json`);
  }
}

const before = await load(beforeName);
const after = await load(afterName);

const diffs = [];
const schemaNames = new Set([...Object.keys(before.schemas), ...Object.keys(after.schemas)]);
for (const schema of [...schemaNames].sort()) {
  const b = before.schemas[schema]?.tables ?? [];
  const a = after.schemas[schema]?.tables ?? [];
  const bSet = new Set(b);
  const aSet = new Set(a);
  const removed = b.filter((t) => !aSet.has(t));
  const added = a.filter((t) => !bSet.has(t));
  if (b.length !== a.length || removed.length || added.length) {
    diffs.push({ schema, before: b.length, after: a.length, removed, added });
  }
}

console.log(`비교: ${beforeName} (표 ${before.totalTables}개) ↔ ${afterName} (표 ${after.totalTables}개), diary 제외`);
for (const schema of [...schemaNames].sort()) {
  const b = before.schemas[schema]?.count ?? 0;
  const a = after.schemas[schema]?.count ?? 0;
  console.log(`  ${schema}: ${b} → ${a}`);
}

if (diffs.length === 0) {
  console.log("결과: 같음 (diary 외 스키마의 표 목록과 개수가 변하지 않았어요)");
} else {
  console.log("결과: 다름");
  for (const d of diffs) {
    console.log(`  - ${d.schema}: 사라짐 ${d.removed.length}개, 새로 생김 ${d.added.length}개`);
  }
  process.exit(2);
}

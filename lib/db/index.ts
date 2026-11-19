// 작성: 2026-11-19 10:52 KST
// DB 연결 모듈 (postgres.js). 연결 주소는 환경 변수 DATABASE_URL에서만 읽는다.
// 모든 SQL은 `diary.` 스키마 이름을 붙여 쓴다(다른 스키마는 건드리지 않는다).
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// 개발 서버의 핫 리로드 때 연결이 계속 늘지 않도록 전역에 하나만 둔다.
const globalForDb = globalThis as unknown as { __diarySql?: Sql };

/** 연결을 처음 쓰는 시점에 만든다(import만으로는 연결하지 않는다 — 빌드 중 연결 방지). */
export function getDb(): Sql {
  if (globalForDb.__diarySql) return globalForDb.__diarySql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 환경 변수가 설정되어 있지 않아요.");
  }

  const sql = postgres(url, {
    // Supabase Transaction pooler(포트 6543)는 요청마다 다른 서버 연결에 배정하므로
    // 연결에 묶인 prepared statement를 쓸 수 없다. 끄지 않으면 "prepared statement does not exist" 오류가 난다.
    prepare: false,
    // Vercel 서버리스는 함수 인스턴스마다 프로세스가 따로 뜬다. 인스턴스당 연결을 1개로 제한해
    // 인스턴스가 늘어도 풀러의 연결 한도를 넘지 않게 한다. 로컬 개발은 여유 있게 둔다.
    max: process.env.VERCEL ? 1 : 5,
    // 쓰지 않는 연결은 빨리 닫고(초), 연결이 안 될 때는 오래 매달리지 않는다(초).
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase는 TLS 연결을 요구한다.
    ssl: "require",
    // 서버 알림 메시지(NOTICE)는 로그에 남기지 않는다.
    onnotice: () => {},
  });

  globalForDb.__diarySql = sql;
  return sql;
}

/**
 * 연결·쿼리 오류를 로그에 남길 때 쓰는 안전한 요약.
 * 오류 메시지에는 접속 주소(호스트 등)가 섞일 수 있으므로 코드나 이름만 돌려준다.
 */
export function dbErrorKind(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "unknown";
}

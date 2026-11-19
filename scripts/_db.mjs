// 작성: 2026-11-19 10:52 KST
// DB 스크립트 공통 도우미. 접속 주소(DATABASE_URL)는 환경 변수에서만 읽고 어디에도 출력하지 않는다.
import postgres from "postgres";

/** 연결을 만든다. 환경 변수가 없으면 이름만 알리고 끝낸다. */
export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    fail("DATABASE_URL 환경 변수가 없어요. .env에 설정했는지 확인해 주세요.");
  }
  return postgres(url, {
    prepare: false, // Transaction pooler(6543) 호환. lib/db/index.ts의 설명 참고
    max: 1,
    connect_timeout: 10,
    ssl: "require",
    onnotice: () => {},
  });
}

/** 오류 메시지에는 접속 주소가 섞일 수 있어 코드나 이름만 돌려준다. */
export function errorKind(error) {
  if (error && typeof error === "object") {
    if (typeof error.code === "string") return error.code;
    if (typeof error.name === "string") return error.name;
  }
  return "unknown";
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}

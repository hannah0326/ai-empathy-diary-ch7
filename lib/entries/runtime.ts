// 작성: 2026-11-19 13:05 KST (3단계: 실제 AI 연결 2026-11-19)
// 라우트가 쓰는 실제 서비스 한 벌: Postgres 저장소 + 실제 AI 분석 함수.
// DB 연결은 첫 쿼리 때 만들어지므로 import만으로는 연결하지 않는다.
import { createPostgresRepository } from "./repository";
import { analyzeDiary } from "@/lib/ai";
import { createEntryService } from "./service";

// 분석 함수는 lib/ai의 실제 OpenRouter 구현이다(서버에서만 import). 가짜 분석 함수(fake-analyze.ts)는 시험에서만 쓴다.
export const entryService = createEntryService({
  repo: createPostgresRepository(),
  analyze: analyzeDiary,
});
